// Issue a short-lived SIGNED upload URL for Supabase Storage. The browser then PUTs the
// file straight to Supabase with that URL — bypassing Vercel's request-size limit (which
// was rejecting videos >~4.5MB) AND Storage RLS (no 403). Admin-only.

const SB_URL = process.env.SUPABASE_URL || "https://ehdtctlhfbvflgfdjhkc.supabase.co";
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHRjdGxoZmJ2ZmxnZmRqaGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcxNTgsImV4cCI6MjA5ODcxMzE1OH0.WH_q6ZwT2I6c3YaYqylQK9ZmBdxklXO_xmW4PbFZTm0";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "product-images";

async function isAdmin(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  const ur = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` },
  });
  if (!ur.ok) return false;
  const user = await ur.json();
  if (!user?.id) return false;
  const pr = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_SVC}` },
  });
  if (!pr.ok) return false;
  const rows = await pr.json();
  return Array.isArray(rows) && rows[0]?.role === "admin";
}

export async function POST(request) {
  if (!SB_SVC) return Response.json({ error: "Server misconfigured: no service key" }, { status: 500 });
  if (!(await isAdmin(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch {}
  const ext = String(body.ext || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const name = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const r = await fetch(`${SB_URL}/storage/v1/object/upload/sign/${BUCKET}/${name}`, {
    method: "POST",
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json" },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    return Response.json({ error: "Could not sign: " + t.slice(0, 160) }, { status: 502 });
  }
  const d = await r.json();
  // REST returns { url: "/object/upload/sign/<bucket>/<path>?token=..." }
  const signedUrl = d.url ? `${SB_URL}/storage/v1${d.url}` : null;
  if (!signedUrl) return Response.json({ error: "No signed url" }, { status: 502 });

  return Response.json({
    signedUrl,
    publicUrl: `${SB_URL}/storage/v1/object/public/${BUCKET}/${name}`,
  });
}
