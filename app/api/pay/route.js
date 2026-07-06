// Server-side creation of NOWPayments invoices.
// The NOWPAYMENTS_API_KEY lives ONLY here (process.env), never in the browser.
// The client calls POST /api/pay with a channelId; the price is looked up on the
// server so a tampered client can't create an invoice for an arbitrary amount.

const SB_URL = process.env.SUPABASE_URL || "https://ehdtctlhfbvflgfdjhkc.supabase.co";
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHRjdGxoZmJ2ZmxnZmRqaGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcxNTgsImV4cCI6MjA5ODcxMzE1OH0.WH_q6ZwT2I6c3YaYqylQK9ZmBdxklXO_xmW4PbFZTm0";
const NOWPAY = process.env.NOWPAYMENTS_API_KEY;

export async function POST(request) {
  if (!NOWPAY) {
    return Response.json(
      { error: "Server misconfigured: NOWPAYMENTS_API_KEY is not set" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = Number(body.channelId);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "Missing or invalid channelId" }, { status: 400 });
  }

  // Look up the real channel (price + name) server-side. channels are public (RLS off),
  // so the anon key is enough here — no service key needed.
  const cr = await fetch(
    `${SB_URL}/rest/v1/channels?id=eq.${id}&select=id,name,price`,
    { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } }
  );
  const rows = await cr.json().catch(() => []);
  const ch = Array.isArray(rows) ? rows[0] : null;
  if (!ch) {
    return Response.json({ error: "Channel not found" }, { status: 404 });
  }

  const inv = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: { "x-api-key": NOWPAY, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: ch.price,
      price_currency: "usd",
      order_id: `ch_${ch.id}_${Date.now()}`,
      order_description: `Order #${ch.id}`,
    }),
  });
  const d = await inv.json().catch(() => null);

  if (d && d.invoice_url) {
    return Response.json({ invoice_url: d.invoice_url });
  }
  return Response.json({ error: "Payment provider error" }, { status: 502 });
}
