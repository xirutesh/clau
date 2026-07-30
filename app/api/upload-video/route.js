// Upload a VIDEO file to Supabase Storage via the server, using the service_role key
// (which bypasses Storage RLS — no policy/403 issues). The client streams the raw file
// as the request body (no base64), so large-ish videos work. Admin-only.

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

  const u = new URL(request.url);
  const ext = (u.searchParams.get("ext") || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const contentType = request.headers.get("content-type") || "video/mp4";

  let bytes;
  try {
    bytes = Buffer.from(await request.arrayBuffer());
  } catch {
    return Response.json({ error: "Could not read file" }, { status: 400 });
  }
  if (!bytes.length) return Response.json({ error: "Empty file" }, { status: 400 });

  const name = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: {
      apikey: SB_ANON,
      Authorization: `Bearer ${SB_SVC}`,
      "Content-Type": contentType,
      "x-upsert": "true",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: bytes,
  });
  if (!up.ok) {
    const t = await up.text().catch(() => "");
    return Response.json({ error: t.slice(0, 200) || "Storage rejected the file" }, { status: up.status });
  }
  return Response.json({ url: `${SB_URL}/storage/v1/object/public/${BUCKET}/${name}` });
}
