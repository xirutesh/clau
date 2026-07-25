// On-site support tickets. A visitor (no login needed) submits a message from the
// info pages; we store it and notify the owner on Telegram. The owner reads and
// closes them from the admin panel (Tickets tab).
//
// Secrets live only here (process.env): service role key + Telegram bot token.

const SB_URL = process.env.SUPABASE_URL || "https://ehdtctlhfbvflgfdjhkc.supabase.co";
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHRjdGxoZmJ2ZmxnZmRqaGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcxNTgsImV4cCI6MjA5ODcxMzE1OH0.WH_q6ZwT2I6c3YaYqylQK9ZmBdxklXO_xmW4PbFZTm0";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

// Whitelisted ticket types -> human-readable subject.
const TYPES = { legal: "Legal / 2257", removal: "Content Removal", support: "Support" };

function svcHeaders(extra) {
  return { apikey: SB_ANON, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json", ...extra };
}

async function notifyTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return; // not configured
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text }),
    });
  } catch {}
}

export async function POST(request) {
  if (!SB_SVC) {
    return Response.json({ error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = TYPES[body.type] ? body.type : "support";
  const subject = TYPES[type];
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 200) : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 10) return Response.json({ error: "Please write a longer message" }, { status: 400 });
  if (message.length > 4000) return Response.json({ error: "Message too long" }, { status: 400 });

  const ins = await fetch(`${SB_URL}/rest/v1/tickets`, {
    method: "POST",
    headers: svcHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ type, subject, contact, message, status: "open" }),
  });
  if (!ins.ok) return Response.json({ error: "Could not save ticket" }, { status: 502 });

  await notifyTelegram(
    `🎫 New ticket — ${subject}\n\n` +
      `Contact: ${contact || "(none provided)"}\n\n` +
      `${message}\n\n` +
      `Open the admin panel (Tickets) to review and close it.`
  );

  return Response.json({ ok: true });
}
