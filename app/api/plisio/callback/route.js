// Plisio callback (webhook) — avisa al grupo cuando entra un pago crypto.
// Verifica la firma HMAC-SHA1 (verify_hash) para rechazar avisos falsos.
//
// IMPORTANTE: /api/pay crea la factura con callback_url terminado en "?json=true".
// Sin ese parametro Plisio manda los datos serializados al estilo PHP y la firma
// no se puede reproducir en JS. Con json=true llega JSON y todo cuadra.
//
// Solo notifica (no hay entrega automatica todavia). El aviso lo manda el bot
// que esta en el grupo.

import crypto from "crypto";

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // bot en el grupo
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
const PLISIO_KEY = process.env.PLISIO_API_KEY;   // la misma Secret Key firma los callbacks

// Plisio firma con HMAC-SHA1 el JSON del cuerpo SIN el campo verify_hash.
// Las claves NO se reordenan: se firma en el orden en que llegan.
function validHash(data) {
  if (!PLISIO_KEY || !data || !data.verify_hash) return false;
  const { verify_hash, ...rest } = data;
  const expected = crypto
    .createHmac("sha1", PLISIO_KEY)
    .update(JSON.stringify(rest))
    .digest("hex");
  const got = Buffer.from(String(verify_hash));
  const exp = Buffer.from(expected);
  return got.length === exp.length && crypto.timingSafeEqual(got, exp);
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
  // Plisio puede mandar JSON (con ?json=true) o form-encoded. Aceptamos ambos,
  // pero solo el JSON trae la firma en un formato verificable.
  const raw = await request.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = Object.fromEntries(new URLSearchParams(raw));
  }

  // Sin key configurada no se puede verificar nada: se ignora en vez de confiar.
  if (!PLISIO_KEY) return Response.json({ ok: true });
  if (!validHash(data)) return new Response("bad signature", { status: 401 });

  // Solo pedidos DE ESTE sitio (order_number "ch_..."), por si la cuenta se
  // llegara a compartir con otro proyecto.
  const isOurs = String(data.order_number || "").startsWith("ch_");
  const status = String(data.status || "");

  if (isOurs && status === "completed") {
    await notify(
      `💰 XIRUTE — New crypto sale!\n\n` +
        `${data.order_name || data.order_number || ""}\n` +
        `Amount: $${data.source_amount || "?"} ${String(data.source_currency || "USD").toUpperCase()}\n` +
        `Paid: ${data.amount || "?"} ${String(data.currency || "").toUpperCase()}\n` +
        `Status: ${status}`
    );
  }

  // Plisio espera 200 para dar el aviso por entregado.
  return Response.json({ ok: true });
}
