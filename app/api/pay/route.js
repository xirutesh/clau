// Server-side creation of crypto payment invoices.
// The provider is picked by whichever key is configured: Plisio when
// PLISIO_API_KEY is set, otherwise NOWPayments. That way the switch happens from
// Vercel's env vars alone — no code change, no downtime.
//
// API keys live ONLY here (process.env), never in the browser. The price is
// looked up on the server so a tampered client can't invoice an arbitrary amount.

const SB_URL = process.env.SUPABASE_URL || "https://ehdtctlhfbvflgfdjhkc.supabase.co";
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHRjdGxoZmJ2ZmxnZmRqaGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcxNTgsImV4cCI6MjA5ODcxMzE1OH0.WH_q6ZwT2I6c3YaYqylQK9ZmBdxklXO_xmW4PbFZTm0";
const NOWPAY = process.env.NOWPAYMENTS_API_KEY;
const PLISIO = process.env.PLISIO_API_KEY;
const SITE_URL = process.env.SITE_URL || "https://clau-five.vercel.app";

// Plisio takes GET query params and answers { status, data: { invoice_url } }.
// The "?json=true" on callback_url is REQUIRED: without it Plisio posts the
// webhook PHP-serialized and its HMAC-SHA1 signature can't be verified in JS.
async function plisioInvoice(ch, orderNumber) {
  const qs = new URLSearchParams({
    api_key: PLISIO,
    order_name: `Order #${ch.id}`,
    order_number: orderNumber,
    source_currency: "USD",
    source_amount: String(ch.price),
    callback_url: `${SITE_URL}/api/plisio/callback?json=true`,
    success_invoice_url: SITE_URL,
    fail_invoice_url: SITE_URL,
    expire_min: "60",
  });
  const r = await fetch(`https://api.plisio.net/api/v1/invoices/new?${qs}`);
  const d = await r.json().catch(() => null);
  return d && d.status === "success" ? d.data?.invoice_url || null : null;
}

async function nowPaymentsInvoice(ch, orderNumber) {
  const r = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: { "x-api-key": NOWPAY, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: ch.price,
      price_currency: "usd",
      order_id: orderNumber,
      order_description: `Order #${ch.id}`,
      ipn_callback_url: `${SITE_URL}/api/nowpayments/ipn`,
    }),
  });
  const d = await r.json().catch(() => null);
  return d?.invoice_url || null;
}

export async function POST(request) {
  if (!PLISIO && !NOWPAY) {
    return Response.json(
      { error: "Server misconfigured: set PLISIO_API_KEY or NOWPAYMENTS_API_KEY" },
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

  // Look up the real channel (price + name) server-side. channels have a public
  // SELECT policy (RLS on), so the anon key is enough here — no service key needed.
  const cr = await fetch(
    `${SB_URL}/rest/v1/channels?id=eq.${id}&select=id,name,price`,
    { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } }
  );
  const rows = await cr.json().catch(() => []);
  const ch = Array.isArray(rows) ? rows[0] : null;
  if (!ch) {
    return Response.json({ error: "Channel not found" }, { status: 404 });
  }

  // The "ch_" prefix is what each webhook uses to tell our orders from any other
  // project sharing the same payment account.
  const orderNumber = `ch_${ch.id}_${Date.now()}`;
  const invoiceUrl = PLISIO
    ? await plisioInvoice(ch, orderNumber)
    : await nowPaymentsInvoice(ch, orderNumber);

  if (invoiceUrl) return Response.json({ invoice_url: invoiceUrl });
  return Response.json({ error: "Payment provider error" }, { status: 502 });
}
