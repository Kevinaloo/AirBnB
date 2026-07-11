// api/payhero.js — PayHero M-Pesa proxy for Vercel
// Env vars needed: PAYHERO_USERNAME, PAYHERO_PASSWORD, PAYHERO_CHANNEL_ID

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const user    = process.env.PAYHERO_USERNAME;
  const pass    = process.env.PAYHERO_PASSWORD;
  const channel = process.env.PAYHERO_CHANNEL_ID;

  if (!user || !pass || !channel) {
    return new Response(JSON.stringify({ error: "PayHero credentials not configured in Vercel environment variables." }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }); }

  const { action, amount, phone, reference } = body || {};

  // STK Push
  if (action === "push") {
    const siteUrl = process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const res = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
      body: JSON.stringify({
        amount: Number(amount),
        phone_number: String(phone),
        channel_id: Number(channel),
        provider: "m-pesa",
        external_reference: reference,
        callback_url: siteUrl ? `${siteUrl}/api/payhero-callback` : "https://softcash.co.ke/banking-side/mpesa-callback.php",
      }),
    });
    const data = await res.json().catch(() => ({}));
    console.log("[payhero push]", res.status, JSON.stringify(data));
    return new Response(JSON.stringify(data), { status: res.status, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Status check — use external_reference (correct PayHero param)
  if (action === "status") {
    const res = await fetch(
      `https://backend.payhero.co.ke/api/v2/transaction-status?external_reference=${encodeURIComponent(reference)}`,
      { headers: { "Authorization": `Basic ${auth}` } }
    );
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
}
