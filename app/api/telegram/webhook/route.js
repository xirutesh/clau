// Telegram bot webhook — handles Telegram Stars payments (currency XTR).
// Flow: user opens t.me/<bot>?start=<channelId>_<userId> -> bot sends an invoice
// in Stars -> user pays -> Telegram calls this webhook:
//   1) pre_checkout_query  -> must be answered within 10s or the payment aborts
//   2) message.successful_payment -> deliver access + record + notify owner
//
// No VPS needed: Telegram pushes updates here (serverless). Secured with a secret
// token that Telegram echoes in the X-Telegram-Bot-Api-Secret-Token header.

const SB_URL = process.env.SUPABASE_URL || "https://ehdtctlhfbvflgfdjhkc.supabase.co";
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHRjdGxoZmJ2ZmxnZmRqaGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcxNTgsImV4cCI6MjA5ODcxMzE1OH0.WH_q6ZwT2I6c3YaYqylQK9ZmBdxklXO_xmW4PbFZTm0";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Notifications bot (in the owner group). Payments bot (the one the buyer interacts with).
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const STARS_TOKEN = process.env.TELEGRAM_STARS_BOT_TOKEN || TG_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID; // owner group (for notifications)
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

function svcHeaders(extra) {
  return { apikey: SB_ANON, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json", ...extra };
}
function anonHeaders() {
  return { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` };
}
function tgWith(token, method, body) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
// The Stars/payments bot talks to the buyer (invoice, pre-checkout, delivery).
function tg(method, body) {
  return tgWith(STARS_TOKEN, method, body);
}

// payload = "<channelId>_<userId>" (userId may be empty)
function parsePayload(p) {
  const s = String(p || "");
  const i = s.indexOf("_");
  if (i === -1) return { channelId: Number(s), userId: "" };
  return { channelId: Number(s.slice(0, i)), userId: s.slice(i + 1) };
}

async function getChannel(id) {
  const r = await fetch(`${SB_URL}/rest/v1/channels?id=eq.${id}&select=id,name,price,delivery_link`, { headers: anonHeaders() });
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] : null;
}
async function getConfig() {
  const r = await fetch(`${SB_URL}/rest/v1/site_config?id=eq.1&select=stars_per_usd,global_delivery_link`, { headers: anonHeaders() });
  const rows = await r.json().catch(() => []);
  return (Array.isArray(rows) && rows[0]) || {};
}

// /start <payload> -> send a Stars invoice for that channel
async function handleStart(msg, payload) {
  const { channelId, userId } = parsePayload(payload);
  const chatId = msg.chat.id;
  const backMsg = '👋 To buy a product, go back to the website, open a channel and tap "Telegram Stars".';
  if (!payload || !Number.isFinite(channelId) || channelId <= 0) {
    await tg("sendMessage", { chat_id: chatId, text: backMsg });
    return;
  }
  const ch = await getChannel(channelId);
  if (!ch) {
    await tg("sendMessage", { chat_id: chatId, text: backMsg });
    return;
  }
  const cfg = await getConfig();
  const rate = Number(cfg.stars_per_usd) || 50;
  const stars = Math.max(1, Math.round((Number(ch.price) || 0) * rate));
  await tg("sendInvoice", {
    chat_id: chatId,
    title: `Order #${ch.id}`,
    description: "1 month access",
    payload: `${ch.id}_${userId}`,
    provider_token: "", // empty = Telegram Stars
    currency: "XTR",
    prices: [{ label: `Order #${ch.id}`, amount: stars }],
  });
}

// successful_payment -> deliver + record + notify
async function handleSuccess(msg) {
  const sp = msg.successful_payment;
  const { channelId, userId } = parsePayload(sp.invoice_payload);
  const ch = (await getChannel(channelId)) || {};
  const cfg = await getConfig();
  const link = ch.delivery_link || cfg.global_delivery_link || "";
  const chatId = msg.chat.id;

  // Deliver to the buyer in Telegram
  await tg("sendMessage", {
    chat_id: chatId,
    text: link
      ? `✅ Payment received! Here is your access:\n${link}`
      : `✅ Payment received! Your access will be delivered shortly.`,
  });

  // Mark delivered on the website account (if we know it) + record the payment
  if (SB_SVC) {
    if (userId && link) {
      await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers: svcHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify({ delivery_link: link }),
      }).catch(() => {});
    }
    let username = "";
    if (userId) {
      const pr = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${userId}&select=username`, { headers: svcHeaders() });
      const pRows = await pr.json().catch(() => []);
      username = (Array.isArray(pRows) && pRows[0]?.username) || "";
    }
    if (!username) username = msg.from?.username || msg.from?.first_name || "telegram";
    await fetch(`${SB_URL}/rest/v1/gift_submissions`, {
      method: "POST",
      headers: svcHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        channel_id: ch.id || channelId,
        channel_name: ch.name || null,
        price: ch.price || null,
        user_id: userId || null,
        username,
        method: "Telegram Stars",
        code: sp.telegram_payment_charge_id || null,
        photo: null,
        status: "accepted",
      }),
    }).catch(() => {});
  }

  // Notify the owner group — with the notifications bot (the one that's in the group).
  if (TG_CHAT && TG_TOKEN) {
    await tgWith(TG_TOKEN, "sendMessage", {
      chat_id: TG_CHAT,
      text:
        `⭐ Telegram Stars payment\n\n` +
        `Channel: ${ch.name || "#" + channelId}\n` +
        `Stars: ${sp.total_amount}\n` +
        `Buyer: ${msg.from?.username ? "@" + msg.from.username : msg.from?.first_name || "?"}`,
    });
  }
}

export async function POST(request) {
  if (WEBHOOK_SECRET) {
    const got = request.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });
  }
  if (!STARS_TOKEN) return Response.json({ ok: true });

  let update;
  try {
    update = await request.json();
  } catch {
    return Response.json({ ok: true });
  }

  try {
    // 1) Pre-checkout — MUST answer within 10s or Telegram aborts the payment.
    if (update.pre_checkout_query) {
      await tg("answerPreCheckoutQuery", { pre_checkout_query_id: update.pre_checkout_query.id, ok: true });
      return Response.json({ ok: true });
    }
    const msg = update.message;
    if (msg && msg.successful_payment) {
      await handleSuccess(msg);
      return Response.json({ ok: true });
    }
    if (msg && typeof msg.text === "string" && msg.text.startsWith("/start")) {
      const payload = msg.text.split(" ")[1] || "";
      await handleStart(msg, payload);
      return Response.json({ ok: true });
    }
  } catch {
    // Never 500 back to Telegram (it would retry endlessly); we log nothing here.
  }
  return Response.json({ ok: true });
}
