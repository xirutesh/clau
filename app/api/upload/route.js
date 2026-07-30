// Upload a product image to Supabase Storage (bucket "product-images") and return
// its public URL. The client sends the already-processed image as a base64 data URL;
// we store it as a real file so the DB only ever holds a short URL (not megabytes of
// base64). Admin-only. The service_role key lives ONLY here (never ships to browser).

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

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return Response.json({ error: "Missing or invalid image" }, { status: 400 });
  const contentType = m[1] || "image/jpeg";
  const bytes = Buffer.from(m[2], "base64");
  if (!bytes.length) return Response.json({ error: "Empty image" }, { status: 400 });

  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

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
    // Most common cause: the "product-images" bucket doesn't exist yet.
    return Response.json({ error: "Upload failed: " + t.slice(0, 200) }, { status: 502 });
  }

  const url = `${SB_URL}/storage/v1/object/public/${BUCKET}/${name}`;
  return Response.json({ url });
}
