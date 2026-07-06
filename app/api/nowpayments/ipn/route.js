// NOWPayments IPN (Instant Payment Notification) — notifica al grupo cuando entra
// un pago crypto. NOWPayments hace POST aquí cuando cambia el estado del pago.
// Verifica la firma HMAC-SHA512 (si hay IPN secret configurado) para rechazar avisos falsos.
//
// Solo notifica (no entrega automática). El aviso lo manda el bot de notificaciones
// (@godyhyvssbot), que está en el grupo.

import crypto from "crypto";

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // bot en el grupo
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

// NOWPayments firma el JSON con las claves ordenadas (ksort recursivo) + HMAC-SHA512.
function sortObject(o) {
  if (Array.isArray(o)) return o.map(sortObject);
  if (o && typeof o === "object") {
    return Object.keys(o).sort().reduce((a, k) => { a[k] = sortObject(o[k]); return a; }, {});
  }
  return o;
}

async function notify(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text }),
    });
  } catch {}
}

export async function POST(request) {
  const raw = await request.text();
  let data;
  try { data = JSON.parse(raw); } catch { return Response.json({ ok: true }); }

  // Verificar firma si hay IPN secret. Sin secret -> se acepta igual (menos seguro).
  if (IPN_SECRET) {
    const sig = request.headers.get("x-nowpayments-sig") || "";
    const expected = crypto.createHmac("sha512", IPN_SECRET)
      .update(JSON.stringify(sortObject(data))).digest("hex");
    const ok = sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) return new Response("bad signature", { status: 401 });
  }

  // Notificar solo cuando el pago está realmente cobrado.
  const status = String(data.payment_status || "");
  if (status === "finished" || status === "confirmed" || status === "partially_paid") {
    await notify(
      `💰 New crypto sale!\n\n` +
      `${data.order_description || data.order_id || ""}\n` +
      `Amount: $${data.price_amount} ${String(data.price_currency || "").toUpperCase()}\n` +
      `Paid: ${data.actually_paid || data.pay_amount} ${String(data.pay_currency || "").toUpperCase()}\n` +
      `Status: ${status}`
    );
  }

  return Response.json({ ok: true });
}
