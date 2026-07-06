// Server-side proxy for privileged Supabase operations.
// The service_role key lives ONLY here (process.env) and never ships to the browser.
// The client calls POST /api/db instead of hitting Supabase directly with the key.
//
// Body shapes:
//   { method:"GET"|"POST"|"PATCH"|"DELETE", table, query, data }  -> REST proxy
//   { op:"confirm-email", userId }                                -> auto-confirm a new user
//
// NOTE (pending security item #3): this proxy does NOT yet validate that the caller
// is an admin. It removes the key from the browser (item #1), but any client can still
// call it — same effective capability as before. Add server-side admin auth next.

const SB_URL = process.env.SUPABASE_URL || "https://ehdtctlhfbvflgfdjhkc.supabase.co";
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHRjdGxoZmJ2ZmxnZmRqaGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcxNTgsImV4cCI6MjA5ODcxMzE1OH0.WH_q6ZwT2I6c3YaYqylQK9ZmBdxklXO_xmW4PbFZTm0";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_TABLES = new Set(["channels", "profiles", "site_config"]);
const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

function svcHeaders(extra) {
  return {
    apikey: SB_ANON,
    Authorization: `Bearer ${SB_SVC}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// Pass the upstream Supabase response straight through (body + status) so the
// existing client logic (r.ok, r.json(), r.message) keeps working unchanged.
function passthrough(r, text) {
  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}

function keysSubsetOf(data, allowed) {
  if (!data || typeof data !== "object") return false;
  const keys = Object.keys(data);
  return keys.length > 0 && keys.every((k) => allowed.includes(k));
}

// Operations allowed WITHOUT an admin session (visitors + the signup flow).
// Kept deliberately narrow so nothing destructive slips through unauthenticated.
function isPublicOp({ method, table, query, data }) {
  // Home stats: count of user profiles.
  if (method === "GET" && table === "profiles" && query === "select=id") return true;
  // Visitor opening a product: +1 view (and nothing but views).
  if (method === "PATCH" && table === "channels" && keysSubsetOf(data, ["views"])) return true;
  // Registration: set the new account's username (and nothing else).
  if (method === "PATCH" && table === "profiles" && keysSubsetOf(data, ["username"])) return true;
  return false;
}

// Verify the caller holds a valid Supabase session whose profile role is 'admin'.
async function isAdmin(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  // 1) token must be a valid, non-expired Supabase session
  const ur = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` },
  });
  if (!ur.ok) return false;
  const user = await ur.json();
  if (!user?.id) return false;
  // 2) that user's profile role must be admin (checked with the service key)
  const pr = await fetch(
    `${SB_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: svcHeaders() }
  );
  if (!pr.ok) return false;
  const rows = await pr.json();
  return Array.isArray(rows) && rows[0]?.role === "admin";
}

export async function POST(request) {
  if (!SB_SVC) {
    return Response.json(
      { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Auto-confirm a freshly-created user (fake @siteusers.com emails can't self-confirm).
  if (body.op === "confirm-email") {
    if (!body.userId) return Response.json({ error: "Missing userId" }, { status: 400 });
    const r = await fetch(`${SB_URL}/auth/v1/admin/users/${body.userId}`, {
      method: "PUT",
      headers: svcHeaders(),
      body: JSON.stringify({ email_confirm: true }),
    });
    return passthrough(r, await r.text());
  }

  const { method, table, query = "", data } = body;
  if (!ALLOWED_METHODS.has(method))
    return Response.json({ error: "Method not allowed" }, { status: 400 });
  if (!ALLOWED_TABLES.has(table))
    return Response.json({ error: "Table not allowed" }, { status: 400 });

  // Everything that isn't an explicitly public op requires a valid admin session.
  // 401 signals the client to refresh an expired token and retry once.
  if (!isPublicOp({ method, table, query, data }) && !(await isAdmin(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const opts = {
    method,
    headers: svcHeaders(
      method === "POST" || method === "PATCH" ? { Prefer: "return=representation" } : {}
    ),
  };
  if (data !== undefined) opts.body = JSON.stringify(data);

  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, opts);
  return passthrough(r, await r.text());
}
