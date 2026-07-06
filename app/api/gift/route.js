// Manual payment (Gift Card) submissions.
// A logged-in user submits a code + a photo of the card. We store it and notify
// the owner on Telegram. The owner accepts/rejects from the admin panel.
//
// Secrets live only here (process.env): service role key + Telegram bot token.

const SB_URL = process.env.SUPABASE_URL || "https://ehdtctlhfbvflgfdjhkc.supabase.co";
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHRjdGxoZmJ2ZmxnZmRqaGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcxNTgsImV4cCI6MjA5ODcxMzE1OH0.WH_q6ZwT2I6c3YaYqylQK9ZmBdxklXO_xmW4PbFZTm0";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

// ~3MB of base64 keeps us safely under Vercel's request body limit.
const MAX_PHOTO_CHARS = 4_000_000;

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

// Fire-and-forget: never let a Telegram failure break the submission.
async function notifyTelegram({ photo, caption }) {
  if (!TG_TOKEN || !TG_CHAT) return; // not configured yet
  try {
    if (photo && photo.startsWith("data:")) {
      const bytes = Buffer.from(photo.split(",")[1] || "", "base64");
      const form = new FormData();
      form.append("chat_id", TG_CHAT);
      form.append("caption", caption);
      form.append("photo", new Blob([bytes]), "proof.jpg");
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, { method: "POST", body: form });
    } else {
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TG_CHAT, text: caption }),
      });
    }
  } catch {}
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

  const id = Number(body.channelId);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const photo = typeof body.photo === "string" ? body.photo : "";
  if (!Number.isFinite(id)) return Response.json({ error: "Invalid channelId" }, { status: 400 });
  if (!code) return Response.json({ error: "Missing code" }, { status: 400 });
  if (!photo) return Response.json({ error: "Missing photo" }, { status: 400 });
  if (photo.length > MAX_PHOTO_CHARS) return Response.json({ error: "Photo too large (max ~3MB)" }, { status: 413 });

  // Channel price/name looked up server-side (don't trust the client).
  const cr = await fetch(`${SB_URL}/rest/v1/channels?id=eq.${id}&select=id,name,price`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
  });
  const chRows = await cr.json().catch(() => []);
  const ch = Array.isArray(chRows) ? chRows[0] : null;
  if (!ch) return Response.json({ error: "Channel not found" }, { status: 404 });

  // Username from the profile (service role bypasses RLS).
  const pr = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${user.id}&select=username`, { headers: svcHeaders() });
  const pRows = await pr.json().catch(() => []);
  const username = (Array.isArray(pRows) && pRows[0]?.username) || "user";

  const ins = await fetch(`${SB_URL}/rest/v1/gift_submissions`, {
    method: "POST",
    headers: svcHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({
      channel_id: ch.id,
      channel_name: ch.name,
      price: ch.price,
      user_id: user.id,
      username,
      method: "Gift Card",
      code,
      photo,
      status: "pending",
    }),
  });
  if (!ins.ok) {
    return Response.json({ error: "Could not save submission" }, { status: 502 });
  }

  await notifyTelegram({
    photo,
    caption:
      `🎁 New Gift Card payment\n\n` +
      `User: ${username}\n` +
      `Channel: ${ch.name}\n` +
      `Price: $${ch.price}\n` +
      `Code: ${code}\n\n` +
      `Review it in the admin panel (Payments) to Accept or Reject.`,
  });

  return Response.json({ ok: true });
}
