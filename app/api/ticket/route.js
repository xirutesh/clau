// On-site support tickets. A LOGGED-IN user opens a ticket (message only — the
// identity comes from their session), and can see their own tickets + status.
// We store it and notify the owner on Telegram. The owner reads/closes them from
// the admin panel (Tickets tab).
//
// Secrets live only here (process.env): service role key + Telegram bot token.

const SB_URL = process.env.SUPABASE_URL || "https://ehdtctlhfbvflgfdjhkc.supabase.co";
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHRjdGxoZmJ2ZmxnZmRqaGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcxNTgsImV4cCI6MjA5ODcxMzE1OH0.WH_q6ZwT2I6c3YaYqylQK9ZmBdxklXO_xmW4PbFZTm0";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

const TYPES = { legal: "Legal / 2257", removal: "Content Removal", support: "Support" };

function svcHeaders(extra) {
  return { apikey: SB_ANON, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json", ...extra };
}

async function verifyUser(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const r = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u?.id ? u : null;
}

async function notifyTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text }),
    });
  } catch {}
}

// The user's own tickets (so the info page can show their history + status).
export async function GET(request) {
  if (!SB_SVC) return Response.json([]);
  const user = await verifyUser(request);
  if (!user) return Response.json([]); // not logged in -> empty, not an error
  const r = await fetch(
    `${SB_URL}/rest/v1/tickets?user_id=eq.${user.id}&select=id,type,subject,message,status,created_at&order=created_at.desc`,
    { headers: svcHeaders() }
  );
  const rows = await r.json().catch(() => []);
  return Response.json(Array.isArray(rows) ? rows : []);
}

export async function POST(request) {
  if (!SB_SVC) {
    return Response.json({ error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 500 });
  }

  const user = await verifyUser(request);
  if (!user) return Response.json({ error: "You must be logged in" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = TYPES[body.type] ? body.type : "support";
  const subject = TYPES[type];
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 10) return Response.json({ error: "Please write a longer message" }, { status: 400 });
  if (message.length > 4000) return Response.json({ error: "Message too long" }, { status: 400 });

  // Username from the profile (service role bypasses RLS).
  const pr = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${user.id}&select=username`, { headers: svcHeaders() });
  const pRows = await pr.json().catch(() => []);
  const username = (Array.isArray(pRows) && pRows[0]?.username) || "user";

  const ins = await fetch(`${SB_URL}/rest/v1/tickets`, {
    method: "POST",
    headers: svcHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ type, subject, message, user_id: user.id, username, status: "open" }),
  });
  if (!ins.ok) return Response.json({ error: "Could not save ticket" }, { status: 502 });

  await notifyTelegram(
    `🎫 New ticket — ${subject}\n\n` +
      `User: ${username}\n\n` +
      `${message}\n\n` +
      `Open the admin panel (Tickets) to review and close it.`
  );

  return Response.json({ ok: true });
}
