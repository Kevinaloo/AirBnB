// ═══════════════════════════════════════════════════════════════════
// BRAND / TENANT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
// This is the ONLY file you need to edit to re-skin this platform for
// a new client. Everything here flows into the nav, footer, AI
// concierge, booking refs, calendar exports, and database key prefix.
//
// Per-client SECRETS (Supabase URL/key, PayHero, Groq API key) do NOT
// go here — those stay in each client's own Netlify environment
// variables, since every client should run their own Supabase project
// and their own M-Pesa/PayHero account.
// ═══════════════════════════════════════════════════════════════════

export const BRAND = {
  // ── Identity ──────────────────────────────────────────────────
  // Full business name as shown in nav/footer. Keep it as two parts
  // (name + accent) — name is the main word, nameAccent is italic & gradient.
  // Leave nameAccent "" to use the full name in a single style.
  name: "Bridge",
  nameAccent: "Homes",
  fullName: "Bridge Homes",

  // ── Logo ────────────────────────────────────────────────────────
  // Set to a URL for an image logo, leave "" to use the text logo.
  // When set, the nav renders <img> instead of the typed name.
  logoUrl: "",
  logoHeight: 36,

  // ── Location ──────────────────────────────────────────────────
  city: "Nairobi",
  country: "Kenya",
  timezone: "Africa/Nairobi",
  // Fallback map center used when a precise pin isn't available yet
  // (e.g. a freshly-imported listing before the host confirms it).
  defaultLat: -1.2921,
  defaultLng: 36.8219,

  // ── Identifiers (mechanical — safe to leave unless renaming) ───
  // Lowercase, no spaces. Used as the Supabase kv_store key prefix,
  // so changing this on an EXISTING deployment will orphan old data.
  // Fine to set freely on a fresh client deployment.
  slug: "shikaz",
  // Booking reference prefix, e.g. "SHK-A1B2C3"
  refPrefix: "SHK",
  // Used in .ics UID domain and PRODID — cosmetic, no spaces.
  icsDomain: "shikazhomes",

  // ── Default contact info ────────────────────────────────────────
  // These are just the starting values — the host can overwrite all
  // of them from the Host Portal → Site Content admin panel without
  // touching code. Set placeholders here for a fresh client.
  whatsapp: "254745802200",
  whatsappDisplay: "+254 745 802 200",
  email: "hello@shikazhomes.co.ke",
  phone: "+254 745 802 200",

  // ── AI Concierge ─────────────────────────────────────────────
  conciergeName: "Amara",
  // Full system prompt for the Groq-powered concierge chat widget.
  // The Nairobi-specific venue/restaurant/nightlife knowledge below
  // is what makes the concierge feel "local" — for a client in a
  // different city, rewrite the venue lists (sections 3-7) with that
  // city's actual restaurants, malls, attractions, and update the
  // Bolt/Uber deep-link city slug near the bottom.
  conciergeSystemPrompt: ({ name, conciergeName, city, country }) => `You are ${conciergeName}, the exclusive AI concierge for ${name} — a premium short-stay property company based in ${city}, ${country}.

Your personality: warm, knowledgeable, sophisticated but never stuffy. You speak like a well-connected ${city} local who knows every corner of the city. You use occasional Swahili words naturally (karibu, asante, sawa, pole pole, hakuna matata). You are helpful, proactive, and always steer people toward wonderful experiences.

Your capabilities:
1. RIDES — Help guests book Bolt or Uber rides. Give them the deep-link URLs to open the app with destination pre-filled. Always quote typical ${city} fare ranges.
2. FOOD DELIVERY — Help with Bolt Food or Uber Eats orders. Suggest popular ${city} restaurants/cuisines for delivery. Give app deep-link URLs.
3. TOURS & ACTIVITIES — Suggest tours, day trips, safaris, cultural experiences near ${city}. Include: Nairobi National Park, Karen Blixen Museum, Giraffe Centre, Bomas of Kenya, Maasai Mara day trips, Hell's Gate, Lake Naivasha, Karura Forest walks, cycling tours, cooking classes, matatu art tours.
4. NIGHTLIFE — Suggest top ${city} clubs, bars, rooftop spots: Alchemist Bar (Westlands), B-Club, Galileo Lounge, The Terrace at Sankara, Mercury Lounge, Black Diamond, Havana Bar, Trademark Hotel, K1 Klub House.
5. RESTAURANTS — Suggest great ${city} dining: Carnivore, Tamarind, The Talisman (Karen), Java House, Artcaffe, Cultiva, About Thyme, Furusato Japanese, Mediterraneo, Mediteraneo Gigiri, Sarova Stanley restaurants, Tribe Hotel restaurant.
6. SHOPPING — Village Market, Westgate, Two Rivers Mall, Sarit Centre, The Junction, Yaya Centre, Maasai Market (Tuesdays at Village Market).
7. WELLNESS — Karura Forest, Ngong Hills hikes, Uhuru Gardens, Nairobi Arboretum.

Deep-link formats to use:
- Bolt ride: https://bolt.eu/en/cities/${city.toLowerCase()}/?destination=[DESTINATION]
- Uber ride: https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=[DESTINATION]+${city}
- Bolt Food: https://food.bolt.eu/ (then suggest searching restaurant name)
- Uber Eats: https://www.ubereats.com/ke/
- Google Maps directions: https://www.google.com/maps/dir/?api=1&destination=[LAT],[LNG]

When suggesting rides always mention both Bolt and Uber options. When mentioning food delivery mention both Bolt Food and Uber Eats.

Formatting rules:
- Use short paragraphs, never walls of text
- Use emojis naturally but not excessively
- When providing links, format them clearly
- For ride bookings, always ask for or confirm the destination first
- Always be aware the guest is staying in ${city} at a ${name} property
- If asked about booking a ${name} property, refer them to the listings on the site
- Keep responses concise — 3-5 sentences max unless listing multiple options
- End responses with a helpful follow-up question when natural`,

  // ── Meta / SEO ──────────────────────────────────────────────────
  metaTitle: "Shikaz Homes — Nairobi Short Stays",
  metaDescription: "Luxury short-stay apartments in Nairobi's finest neighbourhoods. Westlands, Kilimani, Karen and more.",

  // ── Emergency (SOS button) ──────────────────────────────────────
  // These always display in the SOS panel regardless of GPS/API
  // results — they're the numbers that work even if geolocation is
  // denied or the Places lookup fails. Verified against Kenyan
  // government and Red Cross sources as of mid-2026; re-verify if you
  // localize this for a different country.
  emergencyNumbers: [
    { label: "Police / Fire / Ambulance (national)", number: "999" },
    { label: "Police / Fire / Ambulance (alt.)", number: "112" },
    { label: "Kenya Red Cross Ambulance", number: "1199" },
  ],

  // ── Ride booking (Bolt) ──────────────────────────────────────────
  // Used to build the "Get a ride here" button's fallback link when
  // the Bolt app deep link doesn't open (app not installed, or the
  // guest is on desktop). Must match a slug from https://bolt.eu/en/cities/
  boltCitySlug: "nairobi",
};

// Convenience: pre-built system prompt string using the values above.
// Import CONCIERGE_SYSTEM_PROMPT directly if you don't need to
// recompute it dynamically.
export const CONCIERGE_SYSTEM_PROMPT = BRAND.conciergeSystemPrompt(BRAND);
