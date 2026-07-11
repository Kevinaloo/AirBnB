// netlify/functions/reservation-reminders.js
// Runs once a day and sends two kinds of automatic WhatsApp updates:
//   1. A check-in reminder to guests whose stay starts tomorrow
//   2. A thank-you / review request to guests whose stay ended yesterday
// This is the "automatic updates during the reservation" piece that goes
// beyond the instant booking-confirmation message (which is sent directly
// from the booking flow in App.jsx, not from here).
//
// Required Netlify environment variables:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID are read by whatsapp.js,
//    which this function calls internally via the site's own /api/whatsapp
//    endpoint — process.env.URL is provided automatically by Netlify.)

import { createClient } from "@supabase/supabase-js";
import { BRAND } from "../src/brand.config.js";

const toKey = (d) => d.toISOString().slice(0, 10);

async function sendWhatsApp(siteUrl, to, message) {
  if (!to) return;
  try {
    const res = await fetch(`${siteUrl}/api/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message }),
    });
    if (!res.ok) console.warn("[reminders] send failed:", await res.text());
  } catch (err) {
    console.warn("[reminders] send error:", err.message);
  }
}

export default async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.URL);
  if (!supabaseUrl || !serviceKey || !siteUrl) {
    console.error("[reminders] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / site URL");
    return new Response(JSON.stringify({ error: "Not configured" }), { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const getKV = async (key, fallback) => {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).single();
    return error || !data ? fallback : JSON.parse(data.value);
  };
  const setKV = async (key, value) => {
    await supabase.from("kv_store").upsert({ key, value: JSON.stringify(value) }, { onConflict: "key" });
  };

  const bookings = await getKV(`${BRAND.slug}:bookings`, []);
  const siteContent = await getKV(`${BRAND.slug}:site_content`, {});
  const hostWhatsapp = siteContent?.whatsapp;

  const tomorrow = toKey(new Date(Date.now() + 86400000));
  const yesterday = toKey(new Date(Date.now() - 86400000));

  let changed = false;
  const sent = [];

  for (const booking of bookings) {
    if (booking.checkIn === tomorrow && !booking.reminderSent) {
      const listingName = booking.listing?.name || "your stay";
      const guestMsg = [
        `Karibu! 🌟 Your stay at *${listingName}* starts tomorrow, ${booking.checkIn}.`,
        booking.listing?.locationNote ? `📍 Getting in: ${booking.listing.locationNote}` : null,
        `Ref: ${booking.ref}`,
        "",
        "Reply here anytime if you need anything before you arrive.",
      ].filter(Boolean).join("\n");
      await sendWhatsApp(siteUrl, booking.phone, guestMsg);
      if (hostWhatsapp) {
        await sendWhatsApp(siteUrl, hostWhatsapp, `📅 Reminder: ${booking.name} checks in tomorrow at ${listingName} (${booking.ref}).`);
      }
      booking.reminderSent = true;
      changed = true;
      sent.push({ ref: booking.ref, type: "check-in reminder" });
    }

    if (booking.checkOut === yesterday && !booking.thankYouSent) {
      const guestMsg = [
        `Thank you for staying with ${BRAND.fullName}! We hope ${booking.listing?.name || "your stay"} was everything you needed. 🙏`,
        "",
        "If you have a moment, we'd love a quick review — and we'd be delighted to host you again.",
      ].join("\n");
      await sendWhatsApp(siteUrl, booking.phone, guestMsg);
      booking.thankYouSent = true;
      changed = true;
      sent.push({ ref: booking.ref, type: "checkout thank-you" });
    }
  }

  if (changed) await setKV(`${BRAND.slug}:bookings`, bookings);

  console.log("[reminders] sent:", JSON.stringify(sent));
  return new Response(JSON.stringify({ ok: true, sent }), { status: 200 });
};

