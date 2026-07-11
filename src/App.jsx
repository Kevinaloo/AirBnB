import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabase.js";
import { BRAND, CONCIERGE_SYSTEM_PROMPT } from "./brand.config.js";

// ─── DESIGN TOKENS ────────────────────────────────────────────────
// "Breezy Premium" — coral + turquoise + warm white
// Bright, international, never seen in African short-stay before.
const C = {
  // Core brand
  primary:    "#FF6B6B",           // vivid coral-red — energy, warmth, memorable
  primaryDark:"#E85555",           // coral hover state
  primaryDim: "rgba(255,107,107,0.10)",
  teal:       "#4ECDC4",           // fresh turquoise — trust, premium, coastal
  tealDark:   "#38B2AC",
  tealDim:    "rgba(78,205,196,0.12)",
  // Accent / CTA
  gold:       "#FF6B6B",           // mapped so existing CTA refs stay coral
  goldLight:  "#FF8E8E",
  goldDim:    "rgba(255,107,107,0.10)",
  // Backgrounds
  obsidian:   "#FFFFFF",           // page bg — pure white
  ink:        "#F8F9FF",           // section alt — icy blue-white
  card:       "#FFFFFF",
  cardHover:  "#FAFCFF",
  bgWarm:     "#FFF5F3",           // warm blush tint for hero sections
  bgCool:     "#F0FFFE",           // aqua tint for alternate sections
  // Borders
  border:     "#E8ECF4",
  borderHover:"#C5D0E6",
  // Text
  cream:      "#1A1A2E",           // near-navy — richer than plain black
  muted:      "#6B7280",
  mutedLight: "#9CA3AF",
  white:      "#FFFFFF",
  light:      "#F8F9FF",
  // Navigation (bright white nav instead of dark)
  navBg:      "rgba(255,255,255,0.97)",
  navText:    "#1A1A2E",
  navMuted:   "#6B7280",
  // Semantic
  success:    "#10B981",
  successDim: "rgba(16,185,129,0.10)",
  error:      "#EF4444",
  booked:     "rgba(239,68,68,0.06)",
  blockedText:"#EF4444",
  // Kept for legacy refs
  sage:       "#1A1A2E",
  sageLight:  "#374151",
};

// ─── HELPERS ──────────────────────────────────────────────────────
const fmt = n => n?.toLocaleString() ?? "—";
const fmtDate = d => d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";
const toKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const nightsBetween = (a,b) => {
  if (!a||!b) return 0;
  return Math.round((new Date(b)-new Date(a))/(1000*60*60*24));
};
const addDays = (dateStr, n) => {
  const d = new Date(dateStr+"T00:00:00"); d.setDate(d.getDate()+n); return toKey(d);
};
const genRef = () => `${BRAND.refPrefix}-`+ Math.random().toString(36).slice(2,8).toUpperCase();
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ─── DEFAULT DATA ─────────────────────────────────────────────────
const DEFAULT_LISTINGS = [
  { id:"lst-001", name:"The Westlands Penthouse", neighborhood:"Westlands", city:BRAND.city,
    tagline:"Sweeping city views from the 18th floor", type:"Penthouse Suite",
    bedrooms:2, bathrooms:2, guests:4, sqm:110, pricePerNight:8500, cleaningFee:1500,
    rating:4.97, reviewCount:84, badge:"Guest Favourite", available:true,
    amenities:["WiFi","Smart TV","Netflix","Kitchen","Gym Access","Rooftop Pool","Parking","24/7 Security","City View","Air Conditioning"],
    photos:["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=85","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=85","https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=1200&q=85","https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=85","https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=85"],
    description:`Wake up above the city in this spectacular penthouse apartment. Floor-to-ceiling glass wraps the living space, framing a panorama of ${BRAND.city}'s skyline at golden hour. The open-plan kitchen is fully equipped, the master suite has a walk-in wardrobe, and residents enjoy rooftop pool and gym access.\n\nPerfect for corporate travellers and couples seeking an elevated stay.`,
    houseRules:["No smoking","No parties","Check-in 2PM","Checkout 11AM"],
    bookedDates:["2026-06-03","2026-06-04","2026-06-05","2026-06-12","2026-06-13"],
    lat:-1.2676,lng:36.8119,locationNote:"15th floor of Westlands Square. Use the south entrance on Mpaka Road. Parking in basement B2." },
  { id:"lst-002", name:"Kilimani Garden Studio", neighborhood:"Kilimani", city:BRAND.city,
    tagline:"Leafy calm in the heart of the city", type:"Studio",
    bedrooms:1, bathrooms:1, guests:2, sqm:45, pricePerNight:3200, cleaningFee:800,
    rating:4.91, reviewCount:132, badge:"Popular", available:true,
    amenities:["WiFi","Smart TV","Netflix","Kitchenette","Garden Access","Secure Parking","Security"],
    photos:["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=85","https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=85","https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=85","https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=85"],
    description:`A beautifully designed studio tucked behind lush gardens in Kilimani — one of ${BRAND.city}'s most coveted addresses. Minimalist interiors with warm wood tones, a queen bed, and a fully-fitted kitchenette. Walk to Java, Carrefour and the best cafes in under 5 minutes.\n\nIdeal for solo travellers or couples on short business or leisure stays.`,
    houseRules:["No smoking","No parties","Check-in 2PM","Checkout 11AM"],
    bookedDates:["2026-06-08","2026-06-09","2026-06-20","2026-06-21","2026-06-22"],
    lat:-1.2921,lng:36.7863,locationNote:`Off Argwings Kodhek Road. Gate is green — ring the bell and mention ${BRAND.fullName}. Parking within compound.` },
  { id:"lst-003", name:"Lavington Family Retreat", neighborhood:"Lavington", city:BRAND.city,
    tagline:"Space, comfort & a garden for the whole family", type:"2-Bedroom Apartment",
    bedrooms:2, bathrooms:2, guests:5, sqm:130, pricePerNight:11000, cleaningFee:2000,
    rating:4.94, reviewCount:57, badge:"New", available:true,
    amenities:["WiFi","Smart TV","Full Kitchen","Washing Machine","Kids Play Area","Private Garden","Parking","Security","Netflix","Air Conditioning"],
    photos:["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=85","https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=1200&q=85","https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&q=85","https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&q=85"],
    description:`${BRAND.city}'s most family-friendly short stay. This generous 2-bedroom apartment sits in a quiet compound in Lavington, with a private garden, fully equipped kitchen, and laundry. Space for everyone — adults and children alike.\n\nClose to Lavington Mall, international schools, and a short drive from the CBD.`,
    houseRules:["No smoking","Quiet hours 10PM–7AM","Check-in 2PM","Checkout 11AM"],
    bookedDates:["2026-06-15","2026-06-16","2026-06-17","2026-06-28","2026-06-29"],
    lat:-1.2780,lng:36.7627,locationNote:"Off James Gichuru Road, second compound on the left. Blue gate with a mango tree. Free parking inside." },
  { id:"lst-004", name:"Parklands Executive Suite", neighborhood:"Parklands", city:BRAND.city,
    tagline:"Corporate-grade comfort in a quiet enclave", type:"1-Bedroom Suite",
    bedrooms:1, bathrooms:1, guests:2, sqm:65, pricePerNight:5500, cleaningFee:1000,
    rating:4.88, reviewCount:96, badge:"Business Pick", available:true,
    amenities:["WiFi","Workspace","Smart TV","Kitchen","Gym","Pool","Parking","Security","Iron & Board"],
    photos:["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85","https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=85","https://images.unsplash.com/photo-1591088398332-8a7791972843?w=1200&q=85","https://images.unsplash.com/photo-1574643156929-51fa098b0394?w=1200&q=85"],
    description:`Purpose-built for the business traveller who refuses to compromise. A crisp, modern 1-bedroom suite with a dedicated workspace, high-speed fibre WiFi, and a fully equipped kitchen. The building has a pool and gym — unwind after a long day in ${BRAND.city}.\n\nClose to Aga Khan Hospital, UN offices, and Westlands business district.`,
    houseRules:["No smoking","No parties","Check-in 2PM","Checkout 11AM"],
    bookedDates:["2026-06-02","2026-06-10","2026-06-11","2026-06-25"],
    lat:-1.2593,lng:36.8219,locationNote:"Apollo Centre, 3rd Parklands Avenue. Check in at the reception desk — they'll direct you to the suite. Visitor parking available." },
  { id:"lst-005", name:"Riverside Loft", neighborhood:"Riverside", city:BRAND.city,
    tagline:`Industrial chic meets ${BRAND.city}'s creative quarter`, type:"Loft Studio",
    bedrooms:1, bathrooms:1, guests:2, sqm:60, pricePerNight:4800, cleaningFee:1000,
    rating:4.93, reviewCount:43, badge:"Design Pick", available:true,
    amenities:["WiFi","Smart TV","Kitchenette","Art Collection","River View","Secure Access","Netflix"],
    photos:["https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=85","https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=85","https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200&q=85","https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=1200&q=85"],
    description:`A double-height loft in the creative Riverside neighbourhood. Exposed concrete, warm pendant lighting, and curated local art make this a truly memorable space. The bed sits on a mezzanine above an open living area with river-facing windows.\n\nFive minutes from ${BRAND.city}'s best restaurants and gallery spaces.`,
    houseRules:["No smoking","No parties","Respect art pieces","Check-in 2PM","Checkout 11AM"],
    bookedDates:["2026-06-06","2026-06-07","2026-06-18","2026-06-19"],
    lat:-1.2872,lng:36.7981,locationNote:"Riverside Drive, cream building opposite the Muthaiga roundabout side. Apartment is on the 2nd floor, unit 2C. Intercom at gate." },
  { id:"lst-006", name:"Karen Countryside Villa", neighborhood:"Karen", city:BRAND.city,
    tagline:"A private villa among acacia and bougainvillea", type:"3-Bedroom Villa",
    bedrooms:3, bathrooms:3, guests:7, sqm:280, pricePerNight:22000, cleaningFee:4000,
    rating:4.99, reviewCount:28, badge:"Luxury", available:true,
    amenities:["WiFi","Smart TV","Full Kitchen","Private Pool","BBQ","Gardener","Housekeeper","Parking x4","Generator","Air Conditioning","Netflix","Fireplace"],
    photos:["https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=85","https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=85","https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=85","https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=85","https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=1200&q=85"],
    description:`The crown jewel of ${BRAND.fullName}. Set on half an acre in Karen, this three-bedroom villa offers absolute privacy, a heated private pool, outdoor BBQ and a fully staffed experience. Mornings begin with garden breakfasts and sunsets end by the fireplace.\n\nIdeal for families, special celebrations, and executives seeking a genuine retreat.`,
    houseRules:["No loud music after 10PM","Max 7 guests","No smoking indoors","Check-in 3PM","Checkout 11AM"],
    bookedDates:["2026-06-01","2026-06-14","2026-06-30"],
    lat:-1.3500,lng:36.7100,locationNote:`Off Karen Road, past the Karen Blixen Museum — brown timber gate, look for the ${BRAND.fullName} sign. Caretaker on site to welcome you.` },
];

const BADGE_STYLE = {
  "Guest Favourite":{ bg:"rgba(255,107,107,0.12)", color:"#E85555",   border:"1px solid rgba(255,107,107,0.35)" },
  "Popular":        { bg:"rgba(78,205,196,0.12)",  color:"#38B2AC",   border:"1px solid rgba(78,205,196,0.35)"  },
  "New":            { bg:"rgba(99,179,237,0.12)",  color:"#3182CE",   border:"1px solid rgba(99,179,237,0.35)"  },
  "Business Pick":  { bg:"rgba(167,139,250,0.12)", color:"#7C3AED",   border:"1px solid rgba(167,139,250,0.35)" },
  "Design Pick":    { bg:"rgba(251,146,60,0.12)",  color:"#EA580C",   border:"1px solid rgba(251,146,60,0.35)"  },
  "Luxury":         { bg:"rgba(236,201,75,0.15)",  color:"#B7791F",   border:"1px solid rgba(236,201,75,0.4)"   },
};

async function loadListings() {
  try {
    const { data, error } = await supabase
      .from("kv_store").select("value").eq("key",`${BRAND.slug}:listings`).single();
    // If key doesn't exist yet (fresh deployment) → show demo listings
    if (error?.code === "PGRST116" || !data) return DEFAULT_LISTINGS;
    // If key exists but value is empty array → host deleted all, respect that
    const parsed = JSON.parse(data.value);
    return Array.isArray(parsed) ? parsed : DEFAULT_LISTINGS;
  } catch { return DEFAULT_LISTINGS; }
}
async function saveListings(d) {
  const { error } = await supabase.from("kv_store").upsert(
    { key:`${BRAND.slug}:listings`, value:JSON.stringify(d) }, { onConflict:"key" }
  );
  if (error) { console.error("[Supabase] saveListings:", error.message); throw error; }
}

// Test Supabase connectivity — returns null on success or an error message
async function testSupabase() {
  try {
    const { error } = await supabase.from("kv_store").select("key").limit(1);
    if (error) return error.message;
    return null;
  } catch(e) { return e.message || "Connection failed"; }
}
async function loadBookings() {
  try {
    const { data, error } = await supabase
      .from("kv_store").select("value").eq("key",`${BRAND.slug}:bookings`).single();
    if (error || !data) return [];
    return JSON.parse(data.value);
  } catch { return []; }
}
async function saveBookings(d) {
  const { error } = await supabase.from("kv_store").upsert(
    { key:`${BRAND.slug}:bookings`, value:JSON.stringify(d) }, { onConflict:"key" }
  );
  if (error) { console.error("[Supabase] saveBookings:", error.message); throw error; }
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────
const GS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400;1,9..144,600&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans','DM Sans',sans-serif;background:#FFFFFF;color:#1A1A2E;overflow-x:hidden}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#F8F9FF}::-webkit-scrollbar-thumb{background:rgba(255,107,107,0.4);border-radius:4px}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}
@keyframes slideUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
@keyframes rippleOut{0%{transform:scale(0.6);opacity:0.8}100%{transform:scale(2.2);opacity:0}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes rotateSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes drawLine{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 12px rgba(255,107,107,0.35)}50%{box-shadow:0 0 28px rgba(255,107,107,0.65),0 0 50px rgba(255,107,107,0.25)}}
@keyframes tealGlow{0%,100%{box-shadow:0 0 12px rgba(78,205,196,0.35)}50%{box-shadow:0 0 28px rgba(78,205,196,0.65)}}
@keyframes popIn{0%{opacity:0;transform:scale(0.7) translateY(40px)}70%{transform:scale(1.03) translateY(-3px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes bounceIn{0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(0.95)}100%{transform:scale(1);opacity:1}}
@keyframes slideInLeft{from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(120px) rotate(720deg);opacity:0}}
@keyframes heartBeat{0%,100%{transform:scale(1)}14%{transform:scale(1.3)}28%{transform:scale(1)}42%{transform:scale(1.15)}70%{transform:scale(1)}}
@keyframes typingDot{0%,60%,100%{transform:translateY(0);opacity:0.4}30%{transform:translateY(-6px);opacity:1}}
@keyframes conciergeOpen{0%{opacity:0;transform:scale(0.88) translateY(16px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes conciergeRing{0%{transform:scale(1);opacity:0.5}100%{transform:scale(1.8);opacity:0}}
@keyframes splashOrb{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(20px,-15px) scale(1.1)}66%{transform:translate(-15px,10px) scale(0.92)}}
@keyframes splashShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes splashParticle{0%{transform:translateY(0) translateX(0) scale(1);opacity:0.9}100%{transform:translateY(-100px) translateX(var(--dx,0px)) scale(0);opacity:0}}
@keyframes scanline{0%{top:0%}100%{top:100%}}
@keyframes floatUp{0%{opacity:0;transform:translateY(0)}10%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translateY(-80px)}}
@keyframes starTwinkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.6)}}
@keyframes disco{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes swing{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
@keyframes drip{0%{transform:scaleY(0);transform-origin:top}100%{transform:scaleY(1);transform-origin:top}}
@keyframes ribbonSlide{0%{transform:translateX(-110%)}100%{transform:translateX(0)}}
@keyframes flagWave{0%,100%{transform:skewX(0deg)}25%{transform:skewX(-2deg)}75%{transform:skewX(2deg)}}
@keyframes popOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0.85) translateY(30px)}}
`;

// ─── SPLASH SCREEN ────────────────────────────────────────────────

async function loadSplashConfig() {
  try {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key",`${BRAND.slug}:splash`).single();
    return (error || !data) ? null : JSON.parse(data.value);
  } catch { return null; }
}
async function saveSplashConfig(cfg) {
  await supabase.from("kv_store").upsert({ key:`${BRAND.slug}:splash`, value: JSON.stringify(cfg) },{ onConflict:"key" });
}

function SplashScreen({ onDone, config, photos = [] }) {
  const title   = config?.title   || BRAND.name;
  const accent  = config?.accent  || BRAND.nameAccent;
  const tagline = config?.tagline || `Premium stays · ${BRAND.city}`;
  const [phase, setPhase] = useState(0);
  const [photoIdx, setPhotoIdx] = useState(0);
  const splashPhotos = photos.slice(0, 5);

  useEffect(()=>{
    const t0=setTimeout(()=>setPhase(1),300);
    const t1=setTimeout(()=>setPhase(2),800);
    const t2=setTimeout(()=>setPhase(3),1400);
    const t3=setTimeout(()=>setPhase(4),2300);
    const t4=setTimeout(()=>onDone(),3000);
    return()=>{ [t0,t1,t2,t3,t4].forEach(clearTimeout); };
  },[]);

  // 5 photos in 3 seconds = 600ms per photo
  useEffect(()=>{
    if (splashPhotos.length <= 1) return;
    const iv = setInterval(()=>setPhotoIdx(i=>(i+1)%splashPhotos.length), 600);
    return ()=>clearInterval(iv);
  },[splashPhotos.length]);

  const titleLetters  = title.split("").map((ch,i)=>({ch,isAccent:false,i}));
  const accentLetters = accent.split("").map((ch,i)=>({ch,isAccent:true,i:titleLetters.length+i}));
  const allLetters    = [...titleLetters,...accentLetters];

  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"#FFFFFF",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",opacity:phase>=4?0:1,transition:phase>=4?"opacity 0.65s cubic-bezier(0.4,0,0.2,1)":"none",pointerEvents:"none",overflow:"hidden"}}>

      {/* ── PHOTO SLIDESHOW BACKGROUND ── */}
      {splashPhotos.length>0&&(
        <>
          {splashPhotos.map((src,i)=>(
            <div key={i} style={{
              position:"absolute",inset:0,
              backgroundImage:`url(${src})`,
              backgroundSize:"cover",
              backgroundPosition:"center",
              opacity:i===photoIdx?1:0,
              transition:"opacity 0.5s ease",
            }}/>
          ))}
          {/* Soft vignette overlay — just enough contrast for text, not covering the photo */}
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.35) 55%, rgba(0,0,0,0.1) 100%)"}}/>
          {/* Photo counter dots */}
          {splashPhotos.length>1&&(
            <div style={{position:"absolute",bottom:"4rem",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"5px",zIndex:2}}>
              {splashPhotos.map((_,i)=>(
                <div key={i} style={{width:i===photoIdx?"18px":"5px",height:"5px",borderRadius:"3px",background:i===photoIdx?C.primary:"rgba(255,255,255,0.5)",transition:"all 0.4s ease",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
              ))}
            </div>
          )}
        </>
      )}

      {/* Background orbs */}
      <div style={{position:"absolute",top:"10%",left:"5%",width:"320px",height:"320px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,107,107,0.08),transparent 65%)",animation:"splashOrb 7s ease-in-out infinite"}}/>
      <div style={{position:"absolute",bottom:"10%",right:"5%",width:"260px",height:"260px",borderRadius:"50%",background:"radial-gradient(circle,rgba(78,205,196,0.1),transparent 65%)",animation:"splashOrb 9s ease-in-out infinite reverse"}}/>

      {/* Dot grid */}
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 1px 1px,rgba(78,205,196,0.07) 1px,transparent 0)",backgroundSize:"28px 28px"}}/>

      {/* Ripple rings */}
      {phase>=1&&[0,1,2].map(i=>(
        <div key={i} style={{position:"absolute",width:`${180+i*100}px`,height:`${180+i*100}px`,borderRadius:"50%",border:`${2-i*0.4}px solid rgba(255,107,107,${0.22-i*0.06})`,animation:"rippleOut 1.8s ease-out forwards",animationDelay:`${i*0.2}s`,pointerEvents:"none"}}/>
      ))}

      {/* Central circle */}
      <div style={{width:phase>=2?"52px":"68px",height:phase>=2?"52px":"68px",borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.teal})`,boxShadow:`0 0 ${phase>=2?"14px":"30px"} rgba(255,107,107,${phase>=2?"0.25":"0.45"})`,transition:"all 0.6s cubic-bezier(0.34,1.56,0.64,1)",marginBottom:"1.8rem",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",zIndex:2}}>
        <div style={{width:"16px",height:"16px",borderRadius:"50%",background:"rgba(255,255,255,0.92)"}}/>
      </div>

      {/* Name letters */}
      <div style={{display:"flex",justifyContent:"center",alignItems:"baseline",gap:"0.01em",overflow:"hidden",marginBottom:"0.5rem",position:"relative",zIndex:2}}>
        {allLetters.map(({ch,isAccent,i})=>(
          <span key={i} style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(2.8rem,8vw,5.2rem)",fontWeight:isAccent?300:600,fontStyle:isAccent?"italic":"normal",lineHeight:1,display:"inline-block",color:isAccent?C.primary:C.cream,opacity:phase>=2?1:0,transform:phase>=2?"translateY(0) scale(1)":"translateY(28px) scale(0.88)",filter:phase>=2?"blur(0)":"blur(5px)",transition:`opacity 0.5s ease ${i*0.055}s,transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i*0.055}s,filter 0.4s ease ${i*0.055}s`,background:isAccent?`linear-gradient(135deg,${C.primary},${C.teal})`:"none",WebkitBackgroundClip:isAccent?"text":undefined,WebkitTextFillColor:isAccent?"transparent":undefined,backgroundSize:isAccent?"200% auto":undefined,animation:isAccent&&phase>=2?"splashShimmer 2s linear infinite":undefined}}>
            {ch===" "?"\u00A0":ch}
          </span>
        ))}
      </div>

      {/* Teal underline sweep */}
      <div style={{height:"2px",width:phase>=2?"160px":"0px",background:`linear-gradient(90deg,transparent,${C.teal},${C.primary},transparent)`,borderRadius:"2px",transition:"width 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.4s",marginBottom:"1rem",boxShadow:`0 0 8px rgba(78,205,196,0.5)`,position:"relative",zIndex:2}}/>

      {/* Tagline */}
      <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"clamp(0.62rem,1.3vw,0.78rem)",letterSpacing:"0.3em",textTransform:"uppercase",color:C.muted,fontWeight:500,opacity:phase>=3?1:0,transform:phase>=3?"translateY(0)":"translateY(8px)",transition:"all 0.5s ease",position:"relative",zIndex:2}}>{tagline}</div>

      {/* Particles */}
      {phase>=3&&[{left:"28%",delay:"0s",dx:"-18px",color:C.primary},{left:"44%",delay:"0.1s",dx:"6px",color:C.teal},{left:"56%",delay:"0.05s",dx:"-6px",color:C.primary},{left:"70%",delay:"0.15s",dx:"16px",color:C.teal}].map((p,i)=>(
        <div key={i} style={{position:"absolute",bottom:"38%",left:p.left,width:"4px",height:"4px",borderRadius:"50%",background:p.color,"--dx":p.dx,animation:`splashParticle 1.4s ease-out ${p.delay} forwards`,opacity:0}}/>
      ))}

      {/* Progress bar */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"3px",background:C.border}}>
        <div style={{height:"100%",background:`linear-gradient(90deg,${C.teal},${C.primary})`,width:phase>=4?"100%":phase>=3?"75%":phase>=2?"45%":phase>=1?"18%":"0%",transition:"width 0.7s cubic-bezier(0.4,0,0.2,1)",boxShadow:`0 0 10px rgba(255,107,107,0.5)`}}/>
      </div>
    </div>
  );
}

function SplashConfigPanel({ onSaved }) {
  const [cfg,setCfg]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);
  const [preview,setPreview]=useState(false);

  useEffect(()=>{
    loadSplashConfig().then(c=>{
      setCfg(c||{title:BRAND.name,accent:BRAND.nameAccent,tagline:`Premium stays · ${BRAND.city}`,enabled:true});
      setLoading(false);
    });
  },[]);

  const save=async()=>{
    setSaving(true);
    await saveSplashConfig(cfg);
    if(onSaved) onSaved(cfg);
    setMsg({type:"success",text:"Loading screen updated."});
    setSaving(false);
    setTimeout(()=>setMsg(null),3000);
  };

  const inp={width:"100%",background:"#F8F9FF",border:`1px solid ${C.border}`,borderRadius:"6px",padding:"0.75rem 1rem",color:C.cream,fontSize:"0.88rem",outline:"none",boxSizing:"border-box"};

  if(loading) return <div style={{color:C.muted,fontSize:"0.82rem",padding:"1rem 0"}}>Loading…</div>;

  return (
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",marginBottom:"1.5rem",maxWidth:"520px",boxShadow:"0 2px 12px rgba(26,26,46,0.06)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.2rem"}}>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:"1.1rem",color:C.cream,fontWeight:400}}>Loading Screen</div>
        <button onClick={()=>setPreview(true)} style={{background:C.primaryDim,border:`1px solid rgba(255,107,107,0.3)`,borderRadius:"5px",color:C.primary,fontSize:"0.72rem",fontWeight:600,padding:"0.4rem 0.9rem",cursor:"pointer"}}>▶ Preview</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1.2rem",padding:"0.7rem 1rem",background:cfg.enabled?"rgba(16,185,129,0.05)":"rgba(239,68,68,0.05)",border:`1px solid ${cfg.enabled?"rgba(16,185,129,0.2)":"rgba(239,68,68,0.15)"}`,borderRadius:"6px"}}>
        <div onClick={()=>setCfg(c=>({...c,enabled:!c.enabled}))} style={{width:"38px",height:"20px",borderRadius:"10px",background:cfg.enabled?C.teal:"rgba(0,0,0,0.15)",position:"relative",transition:"background 0.2s",cursor:"pointer",flexShrink:0}}>
          <div style={{position:"absolute",top:"2px",left:cfg.enabled?"20px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
        </div>
        <span style={{fontSize:"0.82rem",color:C.cream,fontWeight:500}}>Show loading screen to visitors</span>
      </div>
      {[{lbl:"Brand Name (main text)",key:"title",ph:BRAND.name},{lbl:"Accent Word (gradient italic)",key:"accent",ph:BRAND.nameAccent},{lbl:"Tagline (below name)",key:"tagline",ph:`Premium stays · ${BRAND.city}`}].map(f=>(
        <div key={f.key} style={{marginBottom:"1rem"}}>
          <label style={{display:"block",fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.35rem"}}>{f.lbl}</label>
          <input value={cfg[f.key]||""} onChange={e=>setCfg(c=>({...c,[f.key]:e.target.value}))} style={inp} placeholder={f.ph} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
      ))}
      {msg&&<div style={{fontSize:"0.78rem",color:msg.type==="error"?C.error:C.success,marginBottom:"0.8rem",padding:"0.5rem 0.8rem",background:msg.type==="error"?"rgba(239,68,68,0.06)":"rgba(16,185,129,0.06)",borderRadius:"4px"}}>{msg.text}</div>}
      <button onClick={save} disabled={saving} style={{background:`linear-gradient(135deg,${C.primary},${C.teal})`,color:"#fff",border:"none",padding:"0.8rem 1.8rem",borderRadius:"6px",fontSize:"0.8rem",fontWeight:600,cursor:"pointer",letterSpacing:"0.1em"}}>{saving?"Saving…":"Save Changes"}</button>
      {preview&&<SplashScreen config={cfg} onDone={()=>setPreview(false)}/>}
    </div>
  );
}


function EmergencySOS({ listing, siteContent }) {
  const [open, setOpen] = useState(false);
  const [geo, setGeo] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle"); // idle|locating|done|denied

  const locate = () => {
    setGeoStatus("locating");
    if (!navigator.geolocation) {
      if (listing?.lat && listing?.lng) { setGeo({lat:listing.lat,lng:listing.lng,fallback:true}); setGeoStatus("done"); }
      else setGeoStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => { setGeo({lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:Math.round(pos.coords.accuracy),fallback:false}); setGeoStatus("done"); },
      ()  => {
        if (listing?.lat && listing?.lng) { setGeo({lat:listing.lat,lng:listing.lng,fallback:true}); setGeoStatus("done"); }
        else setGeoStatus("denied");
      },
      { enableHighAccuracy:true, timeout:12000, maximumAge:0 }
    );
  };

  // Opens Google Maps search centred on user's location — no API key needed
  const mapsSearch = (query) => {
    const base = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    return geo ? `${base}/@${geo.lat},${geo.lng},15z` : base;
  };

  const copyLocation = () => {
    if (geo) navigator.clipboard?.writeText(`${geo.lat.toFixed(6)},${geo.lng.toFixed(6)}`).catch(()=>{});
  };

  const tel  = n => `tel:${String(n||"").replace(/[^\d+]/g,"")}`;
  const wa   = n => `https://wa.me/${String(n||"").replace(/[^\d]/g,"")}`;

  // Host contact — from siteContent (admin-editable) with brand.config fallback
  const hostPhone    = siteContent?.phone    || BRAND.phone;
  const hostWhatsapp = siteContent?.whatsapp || BRAND.whatsapp;

  const card = {background:"#fff",border:"1px solid rgba(0,0,0,0.08)",borderRadius:"8px",padding:"0.9rem 1.1rem",marginBottom:"0.6rem"};
  const mapBtn = {display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.8rem 1rem",borderRadius:"7px",fontWeight:600,fontSize:"0.83rem",textDecoration:"none",marginBottom:"0.5rem",border:"none",cursor:"pointer",width:"100%"};

  return (
    <>
      <button onClick={()=>setOpen(true)} style={{display:"flex",alignItems:"center",gap:"0.4rem",background:"#D32F2F",color:"#fff",border:"none",borderRadius:"20px",padding:"0.4rem 0.85rem",fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.08em",cursor:"pointer",flexShrink:0}}>
        🆘 SOS
      </button>

      {open && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(10,5,5,0.6)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"76px 1rem 1rem",overflowY:"auto"}} onClick={e=>e.target===e.currentTarget&&setOpen(false)}>
          <div style={{background:"#FAFAFA",borderRadius:"14px",width:"100%",maxWidth:"480px",marginBottom:"2rem",boxShadow:"0 32px 80px rgba(0,0,0,0.5)",overflow:"hidden",animation:"popIn 0.3s ease"}}>

            {/* Header */}
            <div style={{background:"#D32F2F",color:"#fff",padding:"1.1rem 1.3rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:"1.05rem"}}>🆘 Emergency Help</div>
                <div style={{fontSize:"0.72rem",opacity:0.88,marginTop:"0.15rem"}}>Call 999 or 112 if in immediate danger</div>
              </div>
              <button onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",width:"28px",height:"28px",borderRadius:"50%",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>

            <div style={{padding:"1.1rem 1.3rem"}}>

              {/* ① HOST CONTACT — shown first */}
              <div style={{marginBottom:"1.1rem"}}>
                <div style={{fontSize:"0.6rem",letterSpacing:"0.18em",textTransform:"uppercase",color:"#D32F2F",marginBottom:"0.5rem",fontWeight:700}}>📞 Contact Your Host</div>
                <div style={{...card,display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
                  <a href={tel(hostPhone)} style={{flex:1,padding:"0.7rem 0.8rem",background:"#D32F2F",color:"#fff",borderRadius:"6px",fontWeight:700,fontSize:"0.8rem",textDecoration:"none",textAlign:"center",minWidth:"120px"}}>📞 Call Host</a>
                  <a href={wa(hostWhatsapp)} target="_blank" rel="noreferrer" style={{flex:1,padding:"0.7rem 0.8rem",background:"#25D366",color:"#fff",borderRadius:"6px",fontWeight:700,fontSize:"0.8rem",textDecoration:"none",textAlign:"center",minWidth:"120px"}}>💬 WhatsApp Host</a>
                </div>
              </div>

              {/* ② NATIONAL EMERGENCY NUMBERS */}
              <div style={{marginBottom:"1.1rem"}}>
                <div style={{fontSize:"0.6rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem",fontWeight:700}}>National Emergency Numbers</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
                  {BRAND.emergencyNumbers.map(e=>(
                    <a key={e.number} href={tel(e.number)} style={{padding:"0.65rem 0.5rem",background:"#fff",border:"1px solid #ffcdd2",borderRadius:"6px",color:"#D32F2F",fontWeight:700,fontSize:"0.75rem",textDecoration:"none",textAlign:"center",display:"block"}}>
                      📞 {e.number}<div style={{fontSize:"0.6rem",fontWeight:400,color:"#888",marginTop:"0.15rem"}}>{e.label}</div>
                    </a>
                  ))}
                </div>
              </div>

              {/* ③ HOST-VERIFIED NEARBY (from listing editor) */}
              {listing&&(listing.nearestHospitalName||listing.nearestPoliceName)&&(
                <div style={{marginBottom:"1.1rem"}}>
                  <div style={{fontSize:"0.6rem",letterSpacing:"0.18em",textTransform:"uppercase",color:"#D32F2F",marginBottom:"0.5rem",fontWeight:700}}>⭐ Host-Recommended Nearby</div>
                  {listing.nearestHospitalName&&(
                    <div style={card}>
                      <div style={{fontWeight:600,fontSize:"0.84rem",color:C.cream}}>🏥 {listing.nearestHospitalName}</div>
                      {listing.nearestHospitalPhone&&<a href={tel(listing.nearestHospitalPhone)} style={{fontSize:"0.78rem",color:"#D32F2F",fontWeight:600,display:"inline-block",marginTop:"0.3rem"}}>📞 {listing.nearestHospitalPhone}</a>}
                    </div>
                  )}
                  {listing.nearestPoliceName&&(
                    <div style={card}>
                      <div style={{fontWeight:600,fontSize:"0.84rem",color:C.cream}}>🚓 {listing.nearestPoliceName}</div>
                      {listing.nearestPolicePhone&&<a href={tel(listing.nearestPolicePhone)} style={{fontSize:"0.78rem",color:"#D32F2F",fontWeight:600,display:"inline-block",marginTop:"0.3rem"}}>📞 {listing.nearestPolicePhone}</a>}
                    </div>
                  )}
                </div>
              )}

              {/* ④ FIND NEARBY ON MAPS (no API key — opens Google Maps) */}
              <div>
                <div style={{fontSize:"0.6rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem",fontWeight:700}}>Find Nearby on Maps</div>
                {geoStatus==="idle"&&(
                  <button onClick={locate} style={{...mapBtn,background:C.teal,color:"#fff",justifyContent:"center"}}>
                    📍 Locate Me First (for accurate results)
                  </button>
                )}
                {geoStatus==="locating"&&<div style={{fontSize:"0.82rem",color:C.muted,padding:"0.5rem 0"}}>Finding your location…</div>}
                {geoStatus==="denied"&&!geo&&(
                  <div style={{fontSize:"0.78rem",color:C.muted,lineHeight:1.6,marginBottom:"0.6rem"}}>
                    Location access denied — maps will open without exact position.
                    <span onClick={locate} style={{color:C.teal,cursor:"pointer",marginLeft:"0.4rem",fontWeight:600}}>Try again</span>
                  </div>
                )}
                {(geoStatus==="done"||geoStatus==="denied")&&(
                  <>
                    {geo&&(
                      <div style={{fontSize:"0.7rem",color:C.muted,marginBottom:"0.7rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span>{geo.fallback?"Using property location":geo.accuracy?`Located ±${geo.accuracy}m`:"Location found"}</span>
                        <button onClick={copyLocation} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:"4px",padding:"0.2rem 0.5rem",fontSize:"0.65rem",cursor:"pointer",color:C.muted}}>Copy coordinates</button>
                      </div>
                    )}
                    <a href={mapsSearch("hospital near me")} target="_blank" rel="noreferrer" style={{...mapBtn,background:"#fff3f3",color:"#C62828",justifyContent:"flex-start",textDecoration:"none"}}>🏥 Find Hospitals Near Me</a>
                    <a href={mapsSearch("police station near me")} target="_blank" rel="noreferrer" style={{...mapBtn,background:"#e8f5e9",color:"#2E7D32",justifyContent:"flex-start",textDecoration:"none"}}>🚓 Find Police Station Near Me</a>
                    <a href={mapsSearch("ambulance service near me")} target="_blank" rel="noreferrer" style={{...mapBtn,background:"#fff8e1",color:"#F57F17",justifyContent:"flex-start",textDecoration:"none"}}>🚑 Find Ambulance Service Near Me</a>
                    <a href={mapsSearch("pharmacy near me")} target="_blank" rel="noreferrer" style={{...mapBtn,background:"#e3f2fd",color:"#1565C0",justifyContent:"flex-start",textDecoration:"none"}}>💊 Find Pharmacy Near Me</a>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}

function Nav({ onNavigate, listing, siteContent }) {
  const [scrolled,setScrolled]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [mobile,setMobile]=useState(window.innerWidth<768);
  useEffect(()=>{
    const onScroll=()=>setScrolled(window.scrollY>60);
    const onResize=()=>setMobile(window.innerWidth<768);
    window.addEventListener("scroll",onScroll);
    window.addEventListener("resize",onResize);
    return()=>{ window.removeEventListener("scroll",onScroll); window.removeEventListener("resize",onResize); };
  },[]);

  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:900,background:scrolled?"rgba(255,255,255,0.98)":"rgba(255,255,255,0.96)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${scrolled?C.border:"rgba(232,236,244,0.6)"}`,transition:"all 0.3s ease",boxShadow:scrolled?"0 2px 20px rgba(26,26,46,0.08)":"none"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1.5rem",height:"64px",maxWidth:"1400px",margin:"0 auto"}}>
        <button onClick={()=>{onNavigate("home");setMenuOpen(false);}} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.45rem",fontWeight:600,color:C.cream,flexShrink:0,letterSpacing:"-0.01em"}}>
          {BRAND.logoUrl
  ? <img src={BRAND.logoUrl} alt={BRAND.fullName} style={{height:BRAND.logoHeight+"px",objectFit:"contain"}}/>
  : <>{BRAND.name}<span style={{background:`linear-gradient(135deg,${C.primary},${C.teal})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontStyle:"italic",fontWeight:300}}>{BRAND.nameAccent}</span></>
}
        </button>

        {/* Desktop links */}
        {!mobile&&(
          <div style={{display:"flex",alignItems:"center",gap:"1.5rem"}}>
            <EmergencySOS listing={listing} siteContent={siteContent}/>
            {["Listings","About","Contact"].map(l=>(
              <button key={l} onClick={()=>onNavigate(l.toLowerCase())} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.75rem",letterSpacing:"0.14em",textTransform:"uppercase",color:C.navMuted,fontWeight:500,transition:"color 0.2s",padding:"0.25rem 0"}} onMouseEnter={e=>e.target.style.color=C.primary} onMouseLeave={e=>e.target.style.color=C.navMuted}>{l}</button>
            ))}
            <button onClick={()=>onNavigate("refer")} style={{background:`linear-gradient(135deg,${C.primary},${C.teal})`,border:"none",cursor:"pointer",fontSize:"0.7rem",letterSpacing:"0.1em",textTransform:"uppercase",color:"#fff",padding:"0.45rem 1rem",borderRadius:"20px",fontWeight:700,transition:"opacity 0.2s",boxShadow:`0 4px 14px rgba(255,107,107,0.3)`}} onMouseEnter={e=>e.currentTarget.style.opacity="0.88"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>💰 Refer & Earn</button>
            <button onClick={()=>onNavigate("admin")} style={{background:"transparent",border:`1.5px solid ${C.border}`,color:C.cream,padding:"0.48rem 1.2rem",fontSize:"0.72rem",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",borderRadius:"20px",cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.color=C.primary;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.cream;}}>Host Login</button>
          </div>
        )}

        {/* Mobile hamburger */}
        {mobile&&(
          <div style={{display:"flex",alignItems:"center",gap:"0.7rem"}}>
            <EmergencySOS listing={listing} siteContent={siteContent}/>
            <button onClick={()=>setMenuOpen(o=>!o)} style={{background:"none",border:"none",color:C.cream,fontSize:"1.5rem",cursor:"pointer",padding:"0.25rem",lineHeight:1}}>
              {menuOpen?"✕":"☰"}
            </button>
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      {mobile&&menuOpen&&(
        <div style={{background:"rgba(255,255,255,0.99)",borderTop:`1px solid ${C.border}`,padding:"1rem 1.5rem 1.5rem",display:"flex",flexDirection:"column",gap:"0.2rem",animation:"fadeIn 0.2s ease",boxShadow:"0 8px 32px rgba(26,26,46,0.1)"}}>
          {["Listings","About","Contact"].map(l=>(
            <button key={l} onClick={()=>{onNavigate(l.toLowerCase());setMenuOpen(false);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.9rem",letterSpacing:"0.12em",textTransform:"uppercase",color:C.navMuted,padding:"0.75rem 0",textAlign:"left",borderBottom:`1px solid ${C.border}`,fontWeight:500,transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color=C.primary} onMouseLeave={e=>e.target.style.color=C.navMuted}>{l}</button>
          ))}
          <button onClick={()=>{onNavigate("mybooking");setMenuOpen(false);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.9rem",letterSpacing:"0.12em",textTransform:"uppercase",color:C.navMuted,padding:"0.75rem 0",textAlign:"left",borderBottom:`1px solid ${C.border}`,fontWeight:500}}>My Booking</button>
          <button onClick={()=>{onNavigate("refer");setMenuOpen(false);}} style={{marginTop:"0.6rem",background:`linear-gradient(135deg,${C.primary},${C.teal})`,color:"#fff",border:"none",padding:"0.9rem 1.5rem",fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",borderRadius:"8px",cursor:"pointer",textAlign:"center"}}>💰 Refer & Earn</button>
          <button onClick={()=>{onNavigate("admin");setMenuOpen(false);}} style={{marginTop:"0.4rem",background:"transparent",border:`1.5px solid ${C.border}`,color:C.cream,padding:"0.75rem 1.5rem",fontSize:"0.82rem",fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",borderRadius:"8px",cursor:"pointer",textAlign:"center"}}>Host Login</button>
        </div>
      )}
    </nav>
  );
}

// ─── AVAILABILITY CALENDAR ────────────────────────────────────────
function AvailCalendar({ bookedDates=[], checkIn, checkOut, onSelect }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayKey = toKey(today);
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth());
  const [hovered,setHovered]=useState(null);

  const booked = new Set(bookedDates);

  const prevM=()=>{ if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextM=()=>{ if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const inRange=(key)=>{
    if(!checkIn||(!checkOut&&!hovered)) return false;
    const end=checkOut||hovered;
    return key>checkIn&&key<end;
  };

  const daysInMonth = new Date(year,month+1,0).getDate();
  const firstDay    = new Date(year,month,1).getDay();
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);

  const handleDay=(d)=>{
    if(!d) return;
    const key=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if(booked.has(key)||key<todayKey) return;
    if(!checkIn||(checkIn&&checkOut)){
      onSelect({checkIn:key,checkOut:null});
    } else {
      if(key<=checkIn){ onSelect({checkIn:key,checkOut:null}); return; }
      // block if booked date in range
      let cur=addDays(checkIn,1);
      while(cur<key){ if(booked.has(cur)){onSelect({checkIn:key,checkOut:null});return;} cur=addDays(cur,1); }
      onSelect({checkIn,checkOut:key});
    }
  };

  return (
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"8px",overflow:"hidden",boxShadow:"0 2px 10px rgba(14,43,31,0.06)"}}>
      {/* Nav */}
      <div style={{background:"#FFFFFF",padding:"1rem 1.2rem",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border}`}}>
        <button onClick={prevM} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#F7F2EA",width:"30px",height:"30px",borderRadius:"4px",cursor:"pointer",fontSize:"1rem",transition:".2s"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color="#F7F2EA"}>‹</button>
        <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1rem",color:"#F7F2EA",fontWeight:500}}>{MONTHS[month]} {year}</span>
        <button onClick={nextM} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#F7F2EA",width:"30px",height:"30px",borderRadius:"4px",cursor:"pointer",fontSize:"1rem",transition:".2s"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color="#F7F2EA"}>›</button>
      </div>
      {/* Day headers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0.7rem 0.8rem 0.2rem"}}>
        {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:"0.6rem",letterSpacing:"0.12em",textTransform:"uppercase",color:C.muted}}>{d}</div>)}
      </div>
      {/* Cells */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px",padding:"0.2rem 0.8rem 0.8rem"}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const key=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const isPast    = key<todayKey;
          const isBooked  = booked.has(key);
          const isCheckIn = key===checkIn;
          const isCheckOut= key===checkOut;
          const isInRange = inRange(key);
          const isToday   = key===todayKey;
          const disabled  = isPast||isBooked;
          let bg="transparent", color=disabled?C.muted:C.mutedLight, border="none", br="4px";
          if(isCheckIn||isCheckOut){ bg=C.gold; color=C.obsidian; br="50%"; }
          else if(isInRange){ bg=C.goldDim; color=C.gold; }
          else if(isBooked){ bg=C.booked; color=C.muted; }
          return (
            <div key={key}
              onClick={()=>handleDay(d)}
              onMouseEnter={()=>{ if(!disabled&&checkIn&&!checkOut) setHovered(key); }}
              onMouseLeave={()=>setHovered(null)}
              style={{position:"relative",minHeight:"34px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:br,background:bg,color,cursor:disabled?"not-allowed":"pointer",transition:"all 0.15s",userSelect:"none"}}
            >
              <span style={{fontSize:"0.75rem",fontWeight:isToday?700:400,color:isToday&&!isCheckIn&&!isCheckOut?C.gold:undefined}}>{d}</span>
              {isBooked&&<span style={{fontSize:"0.42rem",color:C.blockedText,letterSpacing:"0.05em",lineHeight:1}}>booked</span>}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:"1.2rem",padding:"0.6rem 1rem 0.9rem",borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {[{col:C.gold,label:"Selected"},{col:C.goldDim,label:"Your stay"},{col:C.booked,label:"Booked"}].map(l=>(
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:"0.35rem",fontSize:"0.65rem",color:C.muted}}>
            <div style={{width:"10px",height:"10px",borderRadius:"2px",background:l.col,border:`1px solid ${C.border}`}}/>
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PRICE BREAKDOWN ──────────────────────────────────────────────
function PriceBreakdown({ listing, checkIn, checkOut, guests }) {
  const nights = nightsBetween(checkIn, checkOut);
  if (!nights) return null;
  const subtotal = nights * listing.pricePerNight;
  const total    = subtotal + listing.cleaningFee;
  return (
    <div style={{background:"rgba(197,151,58,0.08)",border:`1px solid ${C.border}`,borderRadius:"6px",padding:"1rem 1.2rem",animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.7rem"}}>Price Breakdown</div>
      {[
        [`KES ${fmt(listing.pricePerNight)} × ${nights} night${nights>1?"s":""}`, `KES ${fmt(subtotal)}`],
        ["Cleaning fee", `KES ${fmt(listing.cleaningFee)}`],
      ].map(([l,r])=>(
        <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"0.83rem",color:C.mutedLight,padding:"0.3rem 0"}}><span>{l}</span><span>{r}</span></div>
      ))}
      <div style={{borderTop:`1px solid ${C.border}`,marginTop:"0.5rem",paddingTop:"0.6rem",display:"flex",justifyContent:"space-between",fontSize:"1rem",fontWeight:600,color:C.gold}}>
        <span>Total</span><span>KES {fmt(total)}</span>
      </div>
      <div style={{fontSize:"0.68rem",color:C.muted,marginTop:"0.4rem",textAlign:"right"}}>{fmtDate(checkIn)} → {fmtDate(checkOut)} · {guests} guest{guests>1?"s":""}</div>
    </div>
  );
}

// ─── MPESA PAYMENT MODAL ──────────────────────────────────────────
// PayHero credentials — set these in your .env file
// PayHero credentials are handled server-side in netlify/functions/payhero.js.
// Do NOT add VITE_PAYHERO_* vars — they would appear in the browser bundle,
// exposing direct M-Pesa channel access to anyone who reads the page source.

async function phStkPush({ phone, amount, ref }) {
  const res = await fetch("/api/payhero", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "push", amount, phone, reference: ref }),
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `PayHero ${res.status}`);
  return data;
}

async function phCheckStatus(reference) {
  const res = await fetch("/api/payhero", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "status", reference }),
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data?.error || `Status check failed (${res.status})`);
  return data;
}

// ─── WHATSAPP NOTIFICATIONS ───────────────────────────────────────
// Fire-and-forget by design: a failed WhatsApp send should never block
// or roll back a booking/payment. Every call site wraps this in a
// try/catch (or relies on this swallowing its own errors) and just
// logs to the console on failure.
async function sendWhatsApp({ to, message, templateName, templateParams }) {
  if (!to) return { ok:false, error:"No recipient number" };
  try {
    const res = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message, templateName, templateParams }),
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) console.warn("[WhatsApp] send failed:", data?.error || res.status);
    return data;
  } catch (err) {
    console.warn("[WhatsApp] send error:", err.message);
    return { ok:false, error: err.message };
  }
}

// Shared receipt block used inside both the guest and host messages.
function buildReceiptLines(booking, listing) {
  const paid = booking.isDeposit ? booking.depositAmount : booking.total;
  const lines = [
    `🧾 *Receipt — ${booking.ref}*`,
    `${listing?.name || "Property"}`,
    `📅 ${fmtDate(booking.checkIn)} → ${fmtDate(booking.checkOut)} (${booking.nights} night${booking.nights!==1?"s":""})`,
    `👥 ${booking.guests || 1} guest${(booking.guests||1)!==1?"s":""}`,
    `💰 KES ${fmt(paid)} paid via M-Pesa`,
  ];
  if (booking.isDeposit && booking.balanceDue > 0) {
    lines.push(`⏳ Balance due before check-in: KES ${fmt(booking.balanceDue)}`);
  }
  lines.push(`🗓 ${new Date().toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}`);
  return lines;
}

function buildGuestConfirmationMessage(booking, listing) {
  return [
    `Karibu, ${booking.name?.split(" ")[0] || "there"}! ✅ Your stay at *${listing?.name || "your property"}* is confirmed.`,
    "",
    ...buildReceiptLines(booking, listing),
    "",
    listing?.locationNote ? `📍 ${listing.locationNote}` : null,
    "",
    `Manage your booking or message us anytime: ${BRAND.fullName}.`,
  ].filter(Boolean).join("\n");
}

function buildHostNewBookingMessage(booking, listing) {
  return [
    `🔔 New booking — ${BRAND.fullName}`,
    "",
    ...buildReceiptLines(booking, listing),
    "",
    `Guest: ${booking.name} · ${booking.phone}`,
    booking.referralCode ? `Referral code used: ${booking.referralCode}` : null,
  ].filter(Boolean).join("\n");
}

function buildBalanceClearedGuestMessage(booking, listing) {
  return [
    `✅ Balance received — you're fully paid up for ${listing?.name || "your stay"}.`,
    "",
    `Ref: ${booking.ref}`,
    `Total paid: KES ${fmt(booking.total)}`,
    `Check-in: ${fmtDate(booking.checkIn)}`,
    "",
    `See you soon!`,
  ].join("\n");
}

function buildBalanceClearedHostMessage(booking, listing) {
  return [
    `💰 Balance cleared — ${booking.ref}`,
    `${listing?.name || "Property"} · ${booking.name}`,
    `Full amount now paid: KES ${fmt(booking.total)}`,
  ].join("\n");
}

function buildCheckInReminderMessage(booking, listing) {
  return [
    `Karibu! 🌟 Your stay at *${listing?.name || "your property"}* starts tomorrow, ${fmtDate(booking.checkIn)}.`,
    "",
    listing?.locationNote ? `📍 Getting in: ${listing.locationNote}` : null,
    `Ref: ${booking.ref}`,
    "",
    `Reply here anytime if you need anything before you arrive.`,
  ].filter(Boolean).join("\n");
}

function buildCheckoutThankYouMessage(booking, listing) {
  return [
    `Thank you for staying with ${BRAND.fullName}! We hope ${listing?.name || "your stay"} was everything you needed. 🙏`,
    "",
    `If you have a moment, we'd love a quick review — and we'd be delighted to host you again.`,
  ].join("\n");
}

// ─── RECEIPT SYSTEM (free — no API needed) ────────────────────────
// Generates receipts as HTML (printable to PDF on any device) and
// WhatsApp-shareable text. No paid APIs required.

function buildReceiptText(booking, siteWhatsapp) {
  const isPaid  = !booking.isDeposit || (booking.balanceDue||0) <= 0;
  const paid    = booking.isDeposit ? (booking.depositAmount||0) : (booking.total||0);
  const balance = booking.balanceDue || 0;
  const lines = [
    `🧾 *${BRAND.fullName} — Booking Receipt*`,
    ``,
    isPaid ? `✅ *PAID IN FULL*` : `⏳ *DEPOSIT PAID — Balance Due on Arrival*`,
    ``,
    `📋 *Ref:* ${booking.ref}`,
    `🏠 *Property:* ${booking.listing?.name || ""}`,
    `👤 *Guest:* ${booking.name}`,
    `📅 *Check-in:* ${fmtDate(booking.checkIn)}`,
    `📅 *Check-out:* ${fmtDate(booking.checkOut)}`,
    `🌙 *Nights:* ${booking.nights}`,
    `👥 *Guests:* ${booking.guests}`,
    ``,
    `💰 *Amount Paid:* KES ${fmt(paid)} (M-Pesa)`,
    !isPaid && balance>0 ? `⚠️ *Balance Due:* KES ${fmt(balance)} — clear on arrival` : `✅ *No remaining balance*`,
    ``,
    `📆 ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}`,
    ``,
    `Thank you for choosing ${BRAND.fullName}! 🙏`,
  ].filter(l=>l!==null);
  return lines.join("\n");
}

function openReceiptPDF(booking) {
  const isPaid  = !booking.isDeposit || (booking.balanceDue||0) <= 0;
  const paid    = booking.isDeposit ? (booking.depositAmount||0) : (booking.total||0);
  const balance = booking.balanceDue || 0;
  const name    = booking.listing?.name || "";
  const dateStr = new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt ${booking.ref}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;background:#f8f9ff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
  .card{background:#fff;border-radius:16px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12)}
  .header{background:linear-gradient(135deg,#FF6B6B,#4ECDC4);color:#fff;padding:24px;text-align:center}
  .brand{font-size:26px;font-weight:700;letter-spacing:-0.5px}
  .brand em{font-style:italic;font-weight:300;opacity:0.9}
  .status{display:inline-block;margin-top:10px;padding:5px 16px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:.5px}
  .full{background:rgba(255,255,255,0.25);color:#fff}
  .deposit{background:rgba(255,255,255,0.2);color:#fff}
  .body{padding:20px}
  .row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
  .row:last-child{border-bottom:none}
  .label{color:#888}
  .val{font-weight:600;color:#1A1A2E;text-align:right}
  .amt{font-size:18px;color:#FF6B6B}
  .notice{border-radius:10px;padding:14px;margin:16px 0;text-align:center;font-size:13px;line-height:1.5}
  .notice.balance{background:#fff3e0;border:1px solid #FFCC80;color:#E65100}
  .notice.clear{background:#e8f5e9;border:1px solid #A5D6A7;color:#2E7D32}
  .footer{text-align:center;padding:16px 20px;background:#f8f9ff;font-size:11px;color:#aaa;line-height:1.6}
  @media print{body{background:#fff}.card{box-shadow:none;border-radius:0;max-width:100%}}
</style>
</head><body>
<div class="card">
  <div class="header">
    <div class="brand">${BRAND.name}<em>${BRAND.nameAccent}</em></div>
    <div style="font-size:12px;opacity:.8;margin-top:4px">Booking Receipt</div>
    <span class="status ${isPaid?"full":"deposit"}">${isPaid?"✓ PAID IN FULL":"⏳ DEPOSIT PAID"}</span>
  </div>
  <div class="body">
    <div class="row"><span class="label">Reference</span><span class="val">${booking.ref}</span></div>
    <div class="row"><span class="label">Property</span><span class="val">${name}</span></div>
    <div class="row"><span class="label">Guest</span><span class="val">${booking.name}</span></div>
    <div class="row"><span class="label">Check-in</span><span class="val">${fmtDate(booking.checkIn)}</span></div>
    <div class="row"><span class="label">Check-out</span><span class="val">${fmtDate(booking.checkOut)}</span></div>
    <div class="row"><span class="label">Nights</span><span class="val">${booking.nights}</span></div>
    <div class="row"><span class="label">Guests</span><span class="val">${booking.guests}</span></div>
    <div class="row"><span class="label">${isPaid?"Total Paid":"Deposit Paid"}</span><span class="val amt">KES ${fmt(paid)}</span></div>
    <div class="row"><span class="label">Payment</span><span class="val">M-Pesa</span></div>
    <div class="row"><span class="label">Date</span><span class="val">${dateStr}</span></div>
    ${!isPaid&&balance>0
      ? `<div class="notice balance"><strong>Balance Due: KES ${fmt(balance)}</strong><br>Please clear this amount on or before check-in</div>`
      : `<div class="notice clear"><strong>✓ No balance remaining</strong><br>You are fully paid up — enjoy your stay!</div>`
    }
  </div>
  <div class="footer">
    ${BRAND.fullName} · ${BRAND.city}, ${BRAND.country}<br>
    Thank you for your booking!
  </div>
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;

  const blob = new Blob([html], { type:"text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  setTimeout(()=>URL.revokeObjectURL(url), 10000);
  return url;
}

function ReceiptButtons({ booking, siteWhatsapp }) {
  const hostNumber = siteWhatsapp || BRAND.whatsapp;
  const receiptText = buildReceiptText(booking, hostNumber);
  const waGuest = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;
  const waHost  = `https://wa.me/${hostNumber}?text=${encodeURIComponent(receiptText)}`;

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.8rem"}}>
      <button
        onClick={()=>openReceiptPDF(booking)}
        style={{padding:"0.7rem 0.5rem",background:"#fff",border:`1.5px solid ${C.teal}`,borderRadius:"7px",color:C.teal,fontSize:"0.72rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.35rem"}}>
        📄 Download Receipt
      </button>
      <a href={waHost} target="_blank" rel="noreferrer"
        style={{padding:"0.7rem 0.5rem",background:"#fff",border:"1.5px solid #25D366",borderRadius:"7px",color:"#25D366",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.35rem",textDecoration:"none"}}>
        📲 Send to Host
      </a>
      <a href={waGuest} target="_blank" rel="noreferrer"
        style={{gridColumn:"1/-1",padding:"0.7rem",background:"rgba(37,211,102,0.07)",border:"1px solid rgba(37,211,102,0.3)",borderRadius:"7px",color:"#1E8449",fontSize:"0.72rem",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.35rem",textDecoration:"none"}}>
        💬 Save Receipt to WhatsApp (send to yourself)
      </a>
    </div>
  );
}

function PaymentModal({ listing, checkIn, checkOut, guests, onClose, onSuccess, customAmount, isDeposit, holidayDiscount }) {
  const nights  = nightsBetween(checkIn,checkOut);
  const baseTotal = nights*listing.pricePerNight + listing.cleaningFee;
  const discountedTotal = holidayDiscount
    ? Math.round(baseTotal * (1 - holidayDiscount/100))
    : baseTotal;
  const discountSaving  = baseTotal - discountedTotal;
  const total   = (isDeposit && customAmount) ? customAmount : discountedTotal;
  const balanceDue = isDeposit ? discountedTotal - total : 0;

  const [step,setStep]=useState("form");
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [err,setErr]=useState("");
  const [statusMsg,setStatusMsg]=useState("");
  const [phRef,setPhRef]=useState(null);
  const bookingRef = useState(()=>genRef())[0];
  const pollRef    = useRef(null);

  // Clean up poll on unmount
  useEffect(()=>()=>{ if(pollRef.current) clearInterval(pollRef.current); },[]);

  const validatePhone=p=>/^(?:254|0)[17]\d{8}$/.test(p.replace(/\s/g,""));
  const normalisePhone=p=>{ const c=p.replace(/\s/g,""); return c.startsWith("0")?"254"+c.slice(1):c; };

  const submit=async()=>{
    if(!name.trim()){ setErr("Please enter your full name."); return; }
    if(!validatePhone(phone)){ setErr("Enter a valid Safaricom number (07xx or 254xx)."); return; }
    setErr(""); setStep("sending");
    try {
      const data = await phStkPush({
        phone: normalisePhone(phone),
        amount: total,
        ref: bookingRef,
      });
      // PayHero returns reference or CheckoutRequestID
      const extRef = data?.reference || data?.CheckoutRequestID || data?.checkout_request_id || bookingRef;
      setPhRef(extRef);
      setStep("waitPin");
      // Start polling after 6 s — give user time to see the prompt and enter PIN
      setTimeout(()=>startPolling(extRef), 6000);
    } catch(e) {
      setErr(`STK push failed: ${e.message}. Check your PayHero credentials and try again.`);
      setStep("form");
    }
  };

  const startPolling=(ref)=>{
    setStep("polling");
    setStatusMsg("Verifying payment…");
    let attempts = 0;
    const MAX = 20; // ~100 s total
    pollRef.current = setInterval(async()=>{
      attempts++;
      try {
        const data = await phCheckStatus(ref);
        const st = (data?.status || "").toUpperCase();
        if(["SUCCESS","COMPLETE","COMPLETED"].includes(st)){
          clearInterval(pollRef.current);
          setStep("success");
        } else if(["FAILED","CANCELLED","CANCELED","REJECTED"].includes(st)){
          clearInterval(pollRef.current);
          setErr(data?.message || "Payment was cancelled or failed. Please try again.");
          setStep("failed");
        } else if(attempts >= MAX){
          clearInterval(pollRef.current);
          setErr(`Verification timed out. If you entered your PIN, contact us with ref: ${bookingRef}`);
          setStep("failed");
        } else {
          setStatusMsg(`Waiting for M-Pesa confirmation… (${attempts}/${MAX})`);
        }
      } catch {
        // network blip — keep polling
      }
    }, 5000);
  };

  const confirmPay=()=>{}; // kept for compat but no longer used

  const handleSuccess=()=>{
    onSuccess({
      ref:bookingRef, name, phone:normalisePhone(phone),
      checkIn, checkOut, guests, listing,
      total, nights,
      isDeposit, depositAmount:isDeposit?total:null,
      balanceDue, holidayDiscount,
    });
    onClose();
  };

  const overlay={position:"fixed",inset:0,background:"rgba(14,43,31,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",backdropFilter:"blur(8px)"};
  const box={background:"#fff",border:`1px solid ${C.border}`,borderRadius:"12px",width:"100%",maxWidth:"480px",padding:"2.2rem",animation:"slideUp 0.35s ease",position:"relative",boxShadow:"0 32px 80px rgba(0,0,0,0.6)",maxHeight:"92vh",overflowY:"auto"};

  return (
    <div style={overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={box}>
        <button onClick={onClose} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:C.muted,fontSize:"1.3rem",cursor:"pointer",lineHeight:1}}>✕</button>

        {/* Header */}
        <div style={{marginBottom:"1.5rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.4rem"}}>
            <div style={{fontSize:"0.65rem",letterSpacing:"0.25em",textTransform:"uppercase",color:"rgba(197,151,58,0.9)"}}>
              {step==="success"?(isDeposit?"Deposit Confirmed":"Booking Confirmed"):step==="failed"?"Payment Failed":(isDeposit?"Hold Dates — Deposit":"Secure Checkout")}
            </div>
            {isDeposit&&<span style={{fontSize:"0.58rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",padding:"0.12rem 0.45rem",background:"rgba(197,151,58,0.12)",color:C.gold,border:`1px solid rgba(197,151,58,0.3)`,borderRadius:"3px"}}>Deposit</span>}
            {holidayDiscount>0&&<span style={{fontSize:"0.58rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",padding:"0.12rem 0.45rem",background:"rgba(76,175,125,0.1)",color:C.success,border:`1px solid rgba(76,175,125,0.3)`,borderRadius:"3px"}}>🎉 {holidayDiscount}% Off</span>}
          </div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.35rem",color:C.cream}}>{listing.name}</div>
          <div style={{fontSize:"0.8rem",color:C.muted,marginTop:"0.2rem"}}>
            {fmtDate(checkIn)} → {fmtDate(checkOut)} · {nights} night{nights>1?"s":""} · {guests} guest{guests>1?"s":""}
          </div>
          {isDeposit&&step==="form"&&(
            <div style={{marginTop:"0.6rem",padding:"0.5rem 0.8rem",background:"rgba(255,107,107,0.06)",border:`1px solid rgba(197,151,58,0.22)`,borderRadius:"4px",fontSize:"0.74rem",color:C.mutedLight,lineHeight:1.6}}>
              Paying <strong style={{color:C.gold}}>KES {fmt(total)}</strong> deposit now · Balance of <strong style={{color:C.gold}}>KES {fmt(balanceDue)}</strong> due at check-in
            </div>
          )}
        </div>

        {/* ── FORM ── */}
        {step==="form"&&(
          <div style={{animation:"fadeIn 0.3s ease"}}>
            {/* Price breakdown with discount */}
            <div style={{background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"6px",padding:"0.9rem 1.1rem",marginBottom:"1.2rem"}}>
              {[
                ["Nightly rate",`KES ${fmt(listing.pricePerNight)} × ${nights}`],
                ["Cleaning fee",`KES ${fmt(listing.cleaningFee)}`],
                ...(holidayDiscount>0?[["Holiday discount",`− KES ${fmt(discountSaving)}`]]:[]),
                ...(isDeposit?[["Deposit now",`KES ${fmt(total)}`],[`Balance at check-in`,`KES ${fmt(balanceDue)}`]]:[["Total",`KES ${fmt(discountedTotal)}`]]),
              ].map(([l,r],i,arr)=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",padding:"0.3rem 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",fontWeight:i===arr.length-1?700:400}}>
                  <span style={{color:l==="Holiday discount"?C.success:C.muted}}>{l}</span>
                  <span style={{color:l==="Holiday discount"?C.success:l.includes("Total")||l.includes("Deposit")||l.includes("Balance")?C.gold:C.cream}}>{r}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:"0.2rem"}}>
              {[{lbl:"Full Name",ph:"Jane Mwangi",val:name,set:setName,type:"text"},{lbl:"M-Pesa Phone",ph:"0712 345 678",val:phone,set:setPhone,type:"tel"}].map(f=>(
                <div key={f.lbl} style={{marginBottom:"0.9rem"}}>
                  <label style={{display:"block",fontSize:"0.65rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.4rem"}}>{f.lbl}</label>
                  <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                    style={{width:"100%",background:"#FDFAF5",border:`1px solid ${C.border}`,borderRadius:"4px",padding:"0.8rem 1rem",color:"#1C1C1C",fontSize:"0.9rem",outline:"none",transition:"border-color 0.2s"}}
                    onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                </div>
              ))}
              {err&&<div style={{fontSize:"0.78rem",color:C.error,marginBottom:"0.8rem",padding:"0.5rem 0.8rem",background:"rgba(224,82,82,0.08)",borderRadius:"4px",border:"1px solid rgba(224,82,82,0.2)"}}>{err}</div>}
              <button onClick={submit} style={{width:"100%",padding:"1rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"6px",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.2s",marginTop:"0.3rem"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>
                Pay KES {fmt(total)} via M-Pesa →
              </button>
              <p style={{textAlign:"center",fontSize:"0.7rem",color:C.muted,marginTop:"0.7rem"}}>🔒 Secured via PayHero · Lipa Na M-Pesa</p>
            </div>
          </div>
        )}

        {/* ── SENDING STK ── */}
        {step==="sending"&&(
          <div style={{textAlign:"center",padding:"2rem 0",animation:"fadeIn 0.3s ease"}}>
            <div style={{width:"50px",height:"50px",border:`3px solid ${C.goldDim}`,borderTop:`3px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.9s linear infinite",margin:"0 auto 1.5rem"}}/>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream,marginBottom:"0.5rem"}}>
              {name?`Sending to ${name.split(" ")[0]}…`:"Sending STK push…"}
            </div>
            <div style={{fontSize:"0.82rem",color:C.muted,lineHeight:1.7}}>
              Connecting to M-Pesa for <strong style={{color:C.gold}}>+{normalisePhone(phone)}</strong><br/>Please wait…
            </div>
          </div>
        )}

        {/* ── WAITING FOR PIN ── */}
        {step==="waitPin"&&(
          <div style={{animation:"fadeIn 0.3s ease"}}>
            <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
              <div style={{fontSize:"3rem",marginBottom:"0.6rem",animation:"heartBeat 1.8s ease infinite"}}>📱</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.2rem",color:C.cream,marginBottom:"0.5rem"}}>Check Your Phone Now</div>
              <div style={{fontSize:"0.85rem",color:C.muted,lineHeight:1.7}}>
                M-Pesa STK push sent to<br/>
                <strong style={{color:C.gold,fontSize:"1rem"}}>+{normalisePhone(phone)}</strong>
              </div>
            </div>
            <div style={{background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"8px",padding:"1rem 1.2rem",marginBottom:"1.2rem"}}>
              {[
                ["Listing",listing.name],
                ["Dates",`${fmtDate(checkIn)} – ${fmtDate(checkOut)}`],
                ["Nights",`${nights} night${nights>1?"s":""}`],
                ...(holidayDiscount>0?[["Holiday discount",`${holidayDiscount}% off (−KES ${fmt(discountSaving)})`]]:[]),
                [isDeposit?"Deposit":"Amount",`KES ${fmt(total)}`],
                ["Reference",bookingRef],
              ].map(([l,r])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",padding:"0.3rem 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{color:l==="Holiday discount"?C.success:C.muted}}>{l}</span>
                  <span style={{color:l==="Amount"||l==="Deposit"||l==="Reference"?C.gold:l==="Holiday discount"?C.success:"#1C1C1C",fontWeight:l==="Amount"||l==="Deposit"?600:400}}>{r}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem",padding:"0.9rem 1rem",background:"rgba(255,107,107,0.06)",border:`1px solid rgba(197,151,58,0.25)`,borderRadius:"6px",marginBottom:"1rem"}}>
              <div style={{width:"12px",height:"12px",borderRadius:"50%",border:`2px solid ${C.goldDim}`,borderTop:`2px solid ${C.gold}`,animation:"spin 0.9s linear infinite",flexShrink:0}}/>
              <div style={{fontSize:"0.78rem",color:C.mutedLight,lineHeight:1.5}}>
                <strong style={{color:C.gold}}>Enter your M-Pesa PIN</strong> on your phone to confirm the payment. This will verify automatically.
              </div>
            </div>
            <p style={{textAlign:"center",fontSize:"0.68rem",color:C.muted}}>
              Didn't get the prompt? <button onClick={()=>{setStep("form");setErr("");}} style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontSize:"0.68rem",textDecoration:"underline"}}>Try again</button>
            </p>
          </div>
        )}

        {/* ── POLLING / VERIFYING ── */}
        {step==="polling"&&(
          <div style={{textAlign:"center",padding:"2.5rem 1rem",animation:"fadeIn 0.3s ease"}}>
            <div style={{width:"56px",height:"56px",border:`3px solid ${C.goldDim}`,borderTop:`3px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.9s linear infinite",margin:"0 auto 1.5rem"}}/>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream,marginBottom:"0.5rem"}}>Verifying Payment…</div>
            <div style={{fontSize:"0.82rem",color:C.muted,marginBottom:"0.3rem"}}>{statusMsg}</div>
            <div style={{fontSize:"0.7rem",color:C.muted,opacity:0.7}}>Ref: {bookingRef}</div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step==="success"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{textAlign:"center",marginBottom:"1.2rem"}}>
              <div style={{width:"56px",height:"56px",background:C.successDim,border:`2px solid ${C.success}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",margin:"0 auto 0.9rem"}}>✓</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.3rem",color:C.cream,marginBottom:"0.3rem"}}>{isDeposit?"Dates Held!":"Booking Confirmed!"}</div>
              <div style={{fontSize:"0.82rem",color:C.muted}}>{isDeposit?"Deposit received · Dates reserved":"Payment received · You're all set!"}</div>
            </div>

            {/* Smart receipt summary */}
            <div style={{background:C.successDim,border:`1px solid rgba(76,175,125,0.25)`,borderRadius:"8px",padding:"1.1rem",marginBottom:"0.6rem"}}>
              {[
                ["Guest",name],["Property",listing.name],
                ["Check-in",fmtDate(checkIn)],["Check-out",fmtDate(checkOut)],
                ["Nights",`${nights}`],["Guests",`${guests}`],
                ...(holidayDiscount>0?[["Holiday Saving",`KES ${fmt(discountSaving)} (${holidayDiscount}% off)`]]:[]),
                [isDeposit?"Deposit Paid":"Total Paid",`KES ${fmt(total)}`],
                ["Booking Ref",bookingRef],
              ].map(([l,r])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"0.79rem",padding:"0.28rem 0",borderBottom:`1px solid rgba(76,175,125,0.15)`}}>
                  <span style={{color:C.muted}}>{l}</span>
                  <span style={{color:l.includes("Paid")||l==="Booking Ref"?C.success:l==="Holiday Saving"?"#4CAF7D":C.cream,fontWeight:l.includes("Paid")||l==="Booking Ref"?600:400}}>{r}</span>
                </div>
              ))}
            </div>

            {/* Balance / paid-in-full notice */}
            {isDeposit&&balanceDue>0
              ? <div style={{padding:"0.7rem 1rem",background:"rgba(255,107,107,0.06)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",marginBottom:"0.7rem",fontSize:"0.76rem",color:C.muted}}>
                  ⚠️ Balance due on arrival: <strong style={{color:C.primary}}>KES {fmt(balanceDue)}</strong>
                </div>
              : <div style={{padding:"0.6rem 1rem",background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"6px",marginBottom:"0.7rem",fontSize:"0.76rem",color:C.success,fontWeight:600}}>
                  ✅ Paid in full — no balance remaining
                </div>
            }

            {/* Receipt & sharing */}
            <ReceiptButtons booking={{ref:bookingRef,name,listing:{name:listing.name,neighborhood:listing.neighborhood},checkIn,checkOut,nights,guests,isDeposit,depositAmount:total,total,balanceDue:isDeposit?balanceDue:0}} siteWhatsapp={null}/>

            {/* Bolt ride */}
            {listing.lat && listing.lng && (
              <div style={{marginBottom:"0.7rem",padding:"0.9rem",background:C.tealDim,border:`1px solid rgba(78,205,196,0.2)`,borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"0.8rem",flexWrap:"wrap"}}>
                <div style={{fontSize:"0.72rem",color:C.teal,fontWeight:600}}>🚗 Need a ride to your stay?</div>
                <button onClick={()=>openBoltRide({destLat:listing.lat,destLng:listing.lng,destAddress:`${listing.name}, ${listing.neighborhood}`})}
                  style={{background:"#34D186",color:"#fff",border:"none",borderRadius:"6px",padding:"0.5rem 1rem",fontSize:"0.74rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                  Book with Bolt
                </button>
              </div>
            )}

            <button onClick={handleSuccess} style={{width:"100%",padding:"0.9rem",background:C.success,color:"#fff",border:"none",borderRadius:"6px",fontSize:"0.82rem",fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer"}}>
              Done — View My Booking
            </button>
          </div>
        )}

        {/* ── FAILED ── */}
        {step==="failed"&&(
          <div style={{textAlign:"center",animation:"fadeIn 0.3s ease"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>⚠️</div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.2rem",color:C.cream,marginBottom:"0.5rem"}}>Payment Unsuccessful</div>
            <div style={{fontSize:"0.83rem",color:C.muted,lineHeight:1.7,marginBottom:"1.5rem"}}>The transaction was not completed. Please check your M-Pesa balance and try again, or contact us on WhatsApp.</div>
            <div style={{display:"flex",gap:"0.8rem"}}>
              <button onClick={()=>setStep("form")} style={{flex:1,padding:"0.9rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"6px",fontSize:"0.8rem",fontWeight:600,cursor:"pointer"}}>Try Again</button>
              <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer" style={{flex:1,padding:"0.9rem",background:"transparent",color:C.success,border:`1px solid ${C.success}`,borderRadius:"6px",fontSize:"0.8rem",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.3rem"}}>WhatsApp</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BOOKING WIDGET ───────────────────────────────────────────────
function BookingWidget({ listing, onBookingMade, activeHoliday, siteContent }) {
  const waNumber = siteContent?.whatsapp || BRAND.whatsapp;
  const [checkIn,setCheckIn]=useState(null);
  const [checkOut,setCheckOut]=useState(null);
  const [guests,setGuests]=useState(1);
  const [showCal,setShowCal]=useState(false);
  const [showModal,setShowModal]=useState(false);
  // Deposit state
  const [showDeposit,setShowDeposit]=useState(false);
  const [depositAmt,setDepositAmt]=useState("");
  const [depositErr,setDepositErr]=useState("");
  const [showDepositModal,setShowDepositModal]=useState(false);

  const nights=nightsBetween(checkIn,checkOut);
  const handleSelect=({checkIn:ci,checkOut:co})=>{ setCheckIn(ci); setCheckOut(co); };
  const handleBookingSuccess=(booking)=>onBookingMade(booking);
  const canBook=checkIn&&checkOut&&nights>0;

  const baseTotal = canBook ? nights*listing.pricePerNight+listing.cleaningFee : 0;
  const holidayDiscount = activeHoliday?.discount || 0;
  const discountedTotal = holidayDiscount ? Math.round(baseTotal*(1-holidayDiscount/100)) : baseTotal;
  const discountSaving  = baseTotal - discountedTotal;

  const openDeposit=()=>{
    if(!canBook){ setShowCal(true); return; }
    setShowDeposit(s=>!s); setDepositErr("");
  };

  const submitDeposit=()=>{
    const v=parseInt(depositAmt.replace(/,/g,""),10);
    if(!depositAmt||isNaN(v)||v<1){ setDepositErr("Please enter a deposit amount of at least KES 1."); return; }
    if(v>=discountedTotal){ setDepositErr(`Enter an amount less than KES ${fmt(discountedTotal)} (the full total). Use "Reserve" above to pay in full.`); return; }
    setDepositErr(""); setShowDepositModal(true);
  };

  return (
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 16px 60px rgba(14,43,31,0.12)",position:"sticky",top:"92px"}}>

      {/* Holiday discount banner */}
      {activeHoliday&&(
        <div style={{marginBottom:"1rem",padding:"0.65rem 0.9rem",background:`linear-gradient(135deg,${activeHoliday.theme?.bg||"#1A1A2E"},rgba(14,43,31,0.95))`,borderRadius:"6px",border:`1px solid ${activeHoliday.theme?.accent||C.gold}44`,display:"flex",alignItems:"center",gap:"0.7rem"}}>
          <span style={{fontSize:"1.2rem"}}>{activeHoliday.emoji}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"0.68rem",fontWeight:700,color:activeHoliday.theme?.accent||C.gold,letterSpacing:"0.05em"}}>{activeHoliday.name} — {holidayDiscount}% Off</div>
            {canBook&&discountSaving>0&&<div style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.6)",marginTop:"0.1rem"}}>You save KES {fmt(discountSaving)} on this booking</div>}
          </div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.3rem",color:activeHoliday.theme?.accent||C.gold,fontWeight:700,flexShrink:0}}>{holidayDiscount}%</div>
        </div>
      )}

      {/* Price */}
      <div style={{marginBottom:"1.2rem",display:"flex",alignItems:"baseline",gap:"0.4rem",flexWrap:"wrap"}}>
        {holidayDiscount>0&&canBook
          ? <>
              <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.3rem",color:C.muted,textDecoration:"line-through"}}>KES {fmt(listing.pricePerNight)}</span>
              <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2rem",color:C.gold}}>KES {fmt(Math.round(listing.pricePerNight*(1-holidayDiscount/100)))}</span>
              <span style={{fontSize:"0.8rem",color:C.muted}}>/night</span>
            </>
          : <>
              <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2rem",color:C.gold}}>KES {fmt(listing.pricePerNight)}</span>
              <span style={{fontSize:"0.8rem",color:C.muted}}>/night</span>
            </>
        }
        <span style={{marginLeft:"auto",fontSize:"0.8rem",color:C.mutedLight}}>★ {listing.rating} ({listing.reviewCount})</span>
      </div>

      {/* Date display pills */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.8rem"}}>
        {[{label:"Check-in",val:checkIn},{label:"Check-out",val:checkOut}].map(f=>(
          <button key={f.label} onClick={()=>setShowCal(true)} style={{padding:"0.7rem 0.8rem",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"5px",textAlign:"left",cursor:"pointer",transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.2rem"}}>{f.label}</div>
            <div style={{fontSize:"0.85rem",color:f.val?C.cream:C.muted}}>{f.val?fmtDate(f.val):"Add date"}</div>
          </button>
        ))}
      </div>

      {/* Guests */}
      <div style={{padding:"0.7rem 0.8rem",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"5px",marginBottom:"0.8rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.2rem"}}>Guests</div>
          <div style={{fontSize:"0.85rem",color:"#1C1C1C"}}>{guests} guest{guests>1?"s":""}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <button onClick={()=>setGuests(g=>Math.max(1,g-1))} style={{width:"26px",height:"26px",borderRadius:"50%",border:`1px solid ${C.border}`,background:"none",color:C.cream,cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
          <span style={{color:"#1C1C1C",fontSize:"0.9rem",minWidth:"18px",textAlign:"center"}}>{guests}</span>
          <button onClick={()=>setGuests(g=>Math.min(listing.guests,g+1))} style={{width:"26px",height:"26px",borderRadius:"50%",border:`1px solid ${C.border}`,background:"none",color:C.cream,cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        </div>
      </div>

      {/* Calendar toggle */}
      <button onClick={()=>setShowCal(s=>!s)} style={{width:"100%",padding:"0.6rem",background:"transparent",border:`1px dashed ${C.border}`,borderRadius:"5px",color:C.muted,fontSize:"0.75rem",cursor:"pointer",marginBottom:"0.8rem",letterSpacing:"0.1em",transition:"all 0.2s"}} onMouseEnter={e=>{e.target.style.borderColor=C.gold;e.target.style.color=C.gold;}} onMouseLeave={e=>{e.target.style.borderColor=C.border;e.target.style.color=C.muted;}}>
        {showCal?"▲ Hide Calendar":"▦ Open Availability Calendar"}
      </button>

      {/* Inline Calendar */}
      {showCal&&(
        <div style={{marginBottom:"0.8rem",animation:"fadeIn 0.25s ease"}}>
          <AvailCalendar bookedDates={listing.bookedDates} checkIn={checkIn} checkOut={checkOut} onSelect={handleSelect}/>
          {checkIn&&checkOut&&(
            <button onClick={()=>setShowCal(false)} style={{width:"100%",marginTop:"0.5rem",padding:"0.5rem",background:C.goldDim,border:`1px solid ${C.border}`,borderRadius:"4px",color:C.gold,fontSize:"0.75rem",cursor:"pointer",letterSpacing:"0.1em"}}>✓ Dates Selected — Close Calendar</button>
          )}
        </div>
      )}

      {/* Price breakdown */}
      {canBook&&(
        <div style={{marginBottom:"0.8rem",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"6px",padding:"0.8rem 1rem"}}>
          {[
            [`${nights} night${nights>1?"s":""} × KES ${fmt(listing.pricePerNight)}`,`KES ${fmt(nights*listing.pricePerNight)}`],
            ["Cleaning fee",`KES ${fmt(listing.cleaningFee)}`],
            ...(holidayDiscount>0?[[`${activeHoliday.name} discount (${holidayDiscount}%)`,`− KES ${fmt(discountSaving)}`]]:[]),
          ].map(([l,r])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"0.79rem",padding:"0.25rem 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{color:l.includes("discount")?C.success:C.muted}}>{l}</span>
              <span style={{color:l.includes("discount")?C.success:C.cream}}>{r}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.85rem",paddingTop:"0.5rem",fontWeight:700}}>
            <span style={{color:C.cream}}>Total</span>
            <span style={{color:C.gold}}>KES {fmt(discountedTotal)}</span>
          </div>
        </div>
      )}

      {/* ── MAIN CTA ── */}
      <button onClick={()=>{ if(canBook) setShowModal(true); else setShowCal(true); }}
        style={{width:"100%",padding:"1.1rem",background:canBook?C.gold:"rgba(212,175,95,0.3)",color:canBook?C.obsidian:"rgba(212,175,95,0.6)",border:"none",borderRadius:"6px",fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",cursor:canBook?"pointer":"default",transition:"all 0.2s"}}
        onMouseEnter={e=>{ if(canBook) e.target.style.background=C.goldLight; }}
        onMouseLeave={e=>{ if(canBook) e.target.style.background=C.gold; }}>
        {canBook?`Reserve · KES ${fmt(discountedTotal)}`:"Select Dates to Reserve"}
      </button>
      <p style={{textAlign:"center",fontSize:"0.7rem",color:C.muted,marginTop:"0.6rem"}}>
        {canBook?"You won't be charged until payment is confirmed":"Free cancellation · No hidden fees"}
      </p>

      {/* ── OR DIVIDER ── */}
      <div style={{display:"flex",alignItems:"center",gap:"0.7rem",margin:"1rem 0"}}>
        <div style={{flex:1,height:"1px",background:C.border}}/>
        <span style={{fontSize:"0.65rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,flexShrink:0}}>or</span>
        <div style={{flex:1,height:"1px",background:C.border}}/>
      </div>

      {/* ── DEPOSIT CTA ── */}
      <button onClick={openDeposit}
        style={{width:"100%",padding:"0.95rem",background:"transparent",border:`1.5px solid ${canBook?C.gold:C.border}`,borderRadius:"6px",fontSize:"0.8rem",fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:canBook?C.gold:C.muted,cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem"}}
        onMouseEnter={e=>{ if(canBook) e.currentTarget.style.background=C.goldDim; }}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        🔒 Pay a Deposit to Hold Dates
      </button>
      <p style={{textAlign:"center",fontSize:"0.68rem",color:C.muted,marginTop:"0.4rem",lineHeight:1.5}}>
        {canBook?"Pay any amount now to secure your dates — balance due at check-in":"Select dates first to pay a deposit"}
      </p>

      {/* ── DEPOSIT INPUT PANEL ── */}
      {showDeposit&&canBook&&(
        <div style={{marginTop:"0.9rem",padding:"1rem 1.1rem",background:"rgba(78,205,196,0.06)",border:`1px solid ${C.border}`,borderRadius:"8px",animation:"fadeIn 0.2s ease"}}>
          <div style={{fontSize:"0.65rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.gold,marginBottom:"0.7rem",fontWeight:600}}>Custom Deposit Amount</div>
          <div style={{fontSize:"0.78rem",color:C.muted,marginBottom:"0.7rem",lineHeight:1.6}}>
            Full total is <strong style={{color:C.gold}}>KES {fmt(discountedTotal)}</strong>{holidayDiscount>0&&<span style={{color:C.success}}> (after {holidayDiscount}% holiday discount)</span>}. Enter any amount — even KES 1 — to hold the dates. Balance is due at check-in.
          </div>
          <div style={{display:"flex",gap:"0.5rem",alignItems:"stretch"}}>
            <div style={{flex:1,position:"relative"}}>
              <span style={{position:"absolute",left:"0.8rem",top:"50%",transform:"translateY(-50%)",fontSize:"0.75rem",color:C.muted,fontWeight:500,pointerEvents:"none"}}>KES</span>
              <input type="number" min="1" max={discountedTotal-1} value={depositAmt}
                onChange={e=>{ setDepositAmt(e.target.value); setDepositErr(""); }}
                placeholder="Any amount, e.g. 5000"
                style={{width:"100%",padding:"0.75rem 0.8rem 0.75rem 2.8rem",background:"#fff",border:`1px solid ${depositErr?C.error:C.border}`,borderRadius:"5px",fontSize:"0.9rem",color:"#1C1C1C",outline:"none"}}
                onFocus={e=>e.target.style.borderColor=C.gold}
                onBlur={e=>e.target.style.borderColor=depositErr?C.error:C.border}/>
            </div>
            <button onClick={submitDeposit}
              style={{padding:"0 1.1rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"5px",fontWeight:700,fontSize:"0.78rem",cursor:"pointer",flexShrink:0}}
              onMouseEnter={e=>e.target.style.background=C.goldLight}
              onMouseLeave={e=>e.target.style.background=C.gold}>Pay</button>
          </div>
          {/* Quick picks */}
          {discountedTotal>0&&(
            <div style={{display:"flex",gap:"0.4rem",marginTop:"0.6rem",flexWrap:"wrap"}}>
              {/* Quick-pick amounts */}
              <button onClick={()=>{ setDepositAmt("1"); setDepositErr(""); }}
                style={{padding:"0.3rem 0.7rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"3px",fontSize:"0.68rem",color:C.muted,cursor:"pointer",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.target.style.borderColor=C.gold;e.target.style.color=C.gold;}}
                onMouseLeave={e=>{e.target.style.borderColor=C.border;e.target.style.color=C.muted;}}>
                KES 1 · Test
              </button>
              {[0.25,0.5,0.75].map(pct=>{
                const suggested=Math.max(1, Math.round(discountedTotal*pct/100)*100);
                if(suggested<=0||suggested>=discountedTotal) return null;
                return (
                  <button key={pct} onClick={()=>{ setDepositAmt(String(suggested)); setDepositErr(""); }}
                    style={{padding:"0.3rem 0.7rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"3px",fontSize:"0.68rem",color:C.muted,cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.target.style.borderColor=C.gold;e.target.style.color=C.gold;}}
                    onMouseLeave={e=>{e.target.style.borderColor=C.border;e.target.style.color=C.muted;}}>
                    {Math.round(pct*100)}% · KES {fmt(suggested)}
                  </button>
                );
              })}
            </div>
          )}
          {depositErr&&<div style={{fontSize:"0.73rem",color:C.error,marginTop:"0.5rem",lineHeight:1.5}}>{depositErr}</div>}
        </div>
      )}

      {/* WhatsApp alternative */}
      <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi! I'd like to book ${listing.name} from ${checkIn||"TBD"} to ${checkOut||"TBD"} for ${guests} guest(s). Please confirm availability.`)}`}
        target="_blank" rel="noreferrer"
        style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",marginTop:"0.8rem",padding:"0.7rem",border:`1px solid rgba(76,175,125,0.3)`,borderRadius:"5px",color:"#4CAF7D",fontSize:"0.75rem",fontWeight:500,textDecoration:"none",transition:"all 0.2s"}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(76,175,125,0.08)"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <span>📱</span> Book via WhatsApp instead
      </a>

      {/* Bolt ride to property */}
      {listing.lat && listing.lng && (
        <button
          onClick={()=>openBoltRide({destLat:listing.lat,destLng:listing.lng,destAddress:`${listing.name}, ${listing.neighborhood}, ${listing.city}`})}
          style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",width:"100%",marginTop:"0.6rem",padding:"0.7rem",background:"rgba(52,209,134,0.08)",border:"1px solid rgba(52,209,134,0.3)",borderRadius:"5px",color:"#34D186",fontSize:"0.75rem",fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(52,209,134,0.14)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(52,209,134,0.08)"}>
          🚗 Get a Bolt ride to this property
        </button>
      )}

      {/* Full payment modal */}
      {showModal&&(
        <PaymentModal listing={listing} checkIn={checkIn} checkOut={checkOut} guests={guests}
          holidayDiscount={holidayDiscount}
          onClose={()=>setShowModal(false)} onSuccess={handleBookingSuccess}/>
      )}

      {/* Deposit payment modal */}
      {showDepositModal&&(
        <PaymentModal listing={listing} checkIn={checkIn} checkOut={checkOut} guests={guests}
          customAmount={parseInt(depositAmt.replace(/,/g,""),10)||0}
          isDeposit={true}
          holidayDiscount={holidayDiscount}
          onClose={()=>setShowDepositModal(false)}
          onSuccess={(booking)=>handleBookingSuccess({...booking,isDeposit:true,depositAmount:parseInt(depositAmt.replace(/,/g,""),10),balanceDue:discountedTotal-parseInt(depositAmt.replace(/,/g,""),10)})}
        />
      )}
    </div>
  );
}

// ─── LISTING CARD ─────────────────────────────────────────────────
function ListingCard({ listing, onClick, activeHoliday }) {
  const [imgIdx,setImgIdx]=useState(0);
  const [hov,setHov]=useState(false);
  const bs=BADGE_STYLE[listing.badge]||BADGE_STYLE["Popular"];
  // Holiday discount takes priority over per-listing discount if both exist
  const holidayDisc = activeHoliday?.discount || 0;
  const listingDisc = listing.discountPercent || 0;
  const disc = holidayDisc || listingDisc;
  const discPrice = disc ? Math.round(listing.pricePerNight*(1-disc/100)) : listing.pricePerNight;
  const t = activeHoliday?.theme;
  const isListingDisc = !holidayDisc && listingDisc > 0;
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);setImgIdx(0);}}
      style={{background:C.card,border:`1px solid ${hov?(disc?( isListingDisc?"rgba(220,38,38,0.5)": t?.accent+"88"):C.borderHover):C.border}`,borderRadius:"8px",overflow:"hidden",cursor:"pointer",transition:"all 0.3s ease",transform:hov?"translateY(-5px)":"translateY(0)",boxShadow:hov?"0 24px 60px rgba(14,43,31,0.18)":"0 4px 20px rgba(14,43,31,0.08)"}}>
      <div style={{position:"relative",height:"220px",overflow:"hidden"}}>
        <img src={listing.photos[imgIdx]} alt={listing.name} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.6s ease",transform:hov?"scale(1.06)":"scale(1)"}}/>
        {listing.photos.length>1&&(
          <div style={{position:"absolute",bottom:"0.75rem",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"4px"}}>
            {listing.photos.map((_,i)=>(
              <div key={i} onMouseEnter={e=>{e.stopPropagation();setImgIdx(i);}} style={{width:i===imgIdx?"18px":"6px",height:"6px",borderRadius:"3px",background:i===imgIdx?C.gold:"rgba(255,255,255,0.6)",transition:"all 0.3s ease",cursor:"pointer"}}/>
            ))}
          </div>
        )}
        <div style={{position:"absolute",top:"0.9rem",left:"0.9rem",...bs,padding:"0.25rem 0.7rem",borderRadius:"3px",fontSize:"0.65rem",fontWeight:600}}>{listing.badge}</div>
        {/* Holiday discount badge */}
        {holidayDisc>0&&(
          <div style={{position:"absolute",bottom:"0.9rem",left:"0.9rem",background:`linear-gradient(135deg,${t?.accent||C.gold},${t?.accent2||C.goldLight})`,color:"#000",padding:"0.28rem 0.65rem",borderRadius:"3px",fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.05em",animation:"glowPulse 2s ease infinite",boxShadow:`0 2px 12px ${t?.accent||C.gold}66`}}>
            {activeHoliday.emoji} {holidayDisc}% OFF
          </div>
        )}
        {/* Per-listing discount badge */}
        {isListingDisc&&(
          <div style={{position:"absolute",bottom:"0.9rem",left:"0.9rem",background:"linear-gradient(135deg,#DC2626,#EF4444)",color:"#fff",padding:"0.28rem 0.65rem",borderRadius:"3px",fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.05em",boxShadow:"0 2px 12px rgba(220,38,38,0.5)",animation:"glowPulse 2s ease infinite"}}>
            🏷 {listingDisc}% OFF{listing.discountLabel?` · ${listing.discountLabel}`:""}
          </div>
        )}
        <div style={{position:"absolute",top:"0.9rem",right:"0.9rem",background:"rgba(14,43,31,0.72)",backdropFilter:"blur(8px)",borderRadius:"3px",padding:"0.25rem 0.6rem",fontSize:"0.62rem",color:listing.available?"#5EB578":C.error,fontWeight:600,display:"flex",alignItems:"center",gap:"0.3rem"}}>
          <span style={{width:"5px",height:"5px",borderRadius:"50%",background:listing.available?"#5EB578":C.error,display:"inline-block"}}/>
          {listing.available?"Available":"Booked"}
        </div>
      </div>
      <div style={{padding:"1.3rem"}}>
        {/* Holiday banner inside card */}
        {holidayDisc>0&&(
          <div style={{marginBottom:"0.8rem",padding:"0.5rem 0.7rem",background:`linear-gradient(135deg,${t?.bg||"#1A1A2E"},rgba(14,43,31,0.9))`,borderRadius:"5px",border:`1px solid ${t?.accent||C.gold}33`,display:"flex",alignItems:"center",gap:"0.6rem"}}>
            <span style={{fontSize:"0.9rem"}}>{activeHoliday.emoji}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"0.65rem",fontWeight:700,color:t?.accent||C.gold,letterSpacing:"0.05em"}}>{activeHoliday.name} Deal — {holidayDisc}% Off</div>
              <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.5)",marginTop:"0.05rem"}}>Discount applied automatically at checkout</div>
            </div>
          </div>
        )}
        {/* Per-listing discount inside card */}
        {isListingDisc&&(
          <div style={{marginBottom:"0.8rem",padding:"0.5rem 0.7rem",background:"linear-gradient(135deg,rgba(220,38,38,0.12),rgba(220,38,38,0.06))",borderRadius:"5px",border:"1px solid rgba(220,38,38,0.2)",display:"flex",alignItems:"center",gap:"0.6rem"}}>
            <span style={{fontSize:"0.9rem"}}>🏷</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"0.65rem",fontWeight:700,color:"#DC2626",letterSpacing:"0.05em"}}>{listing.discountLabel||"Special Offer"} — {listingDisc}% Off</div>
              <div style={{fontSize:"0.6rem",color:"rgba(0,0,0,0.4)",marginTop:"0.05rem"}}>Discount applied automatically at checkout</div>
            </div>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.4rem"}}>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.cream,fontWeight:500,lineHeight:1.2,flex:1}}>{listing.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:"0.25rem",flexShrink:0,marginLeft:"0.8rem"}}>
            <span style={{color:C.gold,fontSize:"0.8rem"}}>★</span>
            <span style={{fontSize:"0.8rem",color:"#1C1C1C",fontWeight:500}}>{listing.rating}</span>
            <span style={{fontSize:"0.72rem",color:C.muted}}>({listing.reviewCount})</span>
          </div>
        </div>
        <div style={{fontSize:"0.78rem",color:C.muted,marginBottom:"0.9rem"}}>{listing.neighborhood} · {listing.type}</div>
        <div style={{display:"flex",gap:"1.2rem",marginBottom:"1rem"}}>
          {[{icon:"🛏",v:`${listing.bedrooms} bed`},{icon:"🚿",v:`${listing.bathrooms} bath`},{icon:"👤",v:`${listing.guests} guests`}].map(m=>(
            <div key={m.v} style={{display:"flex",alignItems:"center",gap:"0.3rem",fontSize:"0.75rem",color:C.mutedLight}}>
              <span style={{fontSize:"0.85rem"}}>{m.icon}</span>{m.v}
            </div>
          ))}
        </div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",flexDirection:"column",gap:"0.1rem"}}>
            {disc>0&&<span style={{fontSize:"0.72rem",color:C.muted,textDecoration:"line-through"}}>KES {fmt(listing.pricePerNight)}</span>}
            <div>
              <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.25rem",color:disc>0?(isListingDisc?"#DC2626":(t?.accent||C.gold)):C.gold,fontWeight:500}}>KES {fmt(discPrice)}</span>
              <span style={{fontSize:"0.73rem",color:C.muted}}> /night</span>
            </div>
          </div>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.gold}}>View →</div>
        </div>
      </div>
    </div>
  );
}

// ─── LISTING PAGE ─────────────────────────────────────────────────

// ─── INTERACTIVE LOCATION MAP ─────────────────────────────────────
// Uses Leaflet.js loaded dynamically — no API key needed.

function useLeaflet() {
  const [L, setL] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const resolve = () => { if (!cancelled && window.L) setL(window.L); };

    if (window.L) { resolve(); return; }

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existing = document.getElementById("leaflet-js");
    if (existing) {
      // Script already injected — poll until window.L appears
      const iv = setInterval(() => { if (window.L) { clearInterval(iv); resolve(); } }, 80);
      return () => { cancelled = true; clearInterval(iv); };
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = resolve;
    script.onerror = () => console.warn("Leaflet failed to load");
    document.head.appendChild(script);

    return () => { cancelled = true; };
  }, []);
  return L;
}

function ListingMap({ lat, lng, name, neighborhood }) {
  const L = useLeaflet();
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const timerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!L || !mapRef.current) return;
    if (instanceRef.current) return; // already mounted

    timerRef.current = setTimeout(() => {
      if (!mapRef.current) return; // unmounted during delay
      try {
        const map = L.map(mapRef.current, {
          center: [lat, lng],
          zoom: 15,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const icon = L.divIcon({
          className: "",
          html: '<div style="background:linear-gradient(135deg,#FF6B6B,#4ECDC4);color:#fff;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 16px rgba(197,151,58,0.5);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;">🏠</span></div>',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -40],
        });

        L.marker([lat, lng], { icon }).addTo(map)
          .bindPopup(
            '<div style="font-family:serif;min-width:140px;text-align:center;padding:4px 0;">' +
            '<div style="font-size:0.95rem;font-weight:600;color:#1A1A2E;margin-bottom:2px;">' + name + '</div>' +
            '<div style="font-size:0.72rem;color:#888;">' + neighborhood + ', ' + BRAND.city + '</div></div>',
            { maxWidth: 200 }
          ).openPopup();

        instanceRef.current = map;
        setReady(true);
      } catch(e) {
        console.warn("Map init error:", e);
      }
    }, 120);

    return () => {
      clearTimeout(timerRef.current);
      if (instanceRef.current) {
        try { instanceRef.current.remove(); } catch(_) {}
        instanceRef.current = null;
      }
    };
  }, [L]);

  return (
    <div style={{position:"relative",borderRadius:"10px",overflow:"hidden",border:`1px solid ${C.border}`,boxShadow:"0 4px 20px rgba(14,43,31,0.08)"}}>
      {!ready && (
        <div style={{height:"380px",background:"#F7F2EA",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.8rem"}}>
          <div style={{width:"36px",height:"36px",border:`3px solid rgba(197,151,58,0.2)`,borderTop:`3px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
          <div style={{fontSize:"0.78rem",color:C.muted}}>Loading map…</div>
        </div>
      )}
      <div ref={mapRef} style={{height:"380px",width:"100%",visibility:ready?"visible":"hidden"}}/>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"28px",pointerEvents:"none",background:"linear-gradient(to top,rgba(253,250,245,0.7),transparent)"}}/>
    </div>
  );
}

// Admin: location picker — click on map to set pin
function LocationPicker({ lat, lng, onChange }) {
  const L = useLeaflet();
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const markerRef = useRef(null);
  const timerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const initLat = lat || -1.2921;
  const initLng = lng || 36.8219;
  const [localLat, setLocalLat] = useState(initLat);
  const [localLng, setLocalLng] = useState(initLng);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!L || !mapRef.current) return;
    if (instanceRef.current) return;

    timerRef.current = setTimeout(() => {
      if (!mapRef.current) return;
      try {
        const map = L.map(mapRef.current, {
          center: [localLat, localLng],
          zoom: 15,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        const markerIcon = L.divIcon({
          className: "",
          html: '<div style="background:linear-gradient(135deg,#FF6B6B,#4ECDC4);color:#fff;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 16px rgba(197,151,58,0.5);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;">📍</span></div>',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });

        const marker = L.marker([localLat, localLng], { icon: markerIcon, draggable: true }).addTo(map);
        markerRef.current = marker;

        const updatePos = (la, lo) => {
          const rLat = Math.round(la * 1e6) / 1e6;
          const rLng = Math.round(lo * 1e6) / 1e6;
          setLocalLat(rLat);
          setLocalLng(rLng);
          onChangeRef.current({ lat: rLat, lng: rLng });
        };

        marker.on("dragend", e => {
          const pos = e.target.getLatLng();
          updatePos(pos.lat, pos.lng);
        });

        map.on("click", e => {
          marker.setLatLng(e.latlng);
          updatePos(e.latlng.lat, e.latlng.lng);
        });

        instanceRef.current = map;
        setReady(true);
      } catch(e) {
        console.warn("LocationPicker init error:", e);
      }
    }, 150);

    return () => {
      clearTimeout(timerRef.current);
      if (instanceRef.current) {
        try { instanceRef.current.remove(); } catch(_) {}
        instanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [L]);

  const setCoord = (field, rawVal) => {
    const v = parseFloat(rawVal);
    if (isNaN(v)) return;
    const newLat = field === "lat" ? v : localLat;
    const newLng = field === "lng" ? v : localLng;
    if (field === "lat") setLocalLat(v);
    else setLocalLng(v);
    onChangeRef.current({ lat: newLat, lng: newLng });
    if (markerRef.current && instanceRef.current) {
      try {
        markerRef.current.setLatLng([newLat, newLng]);
        instanceRef.current.setView([newLat, newLng]);
      } catch(_) {}
    }
  };

  return (
    <div>
      <div style={{position:"relative",borderRadius:"8px",overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:"0.8rem"}}>
        {!ready && (
          <div style={{height:"320px",background:"#F7F2EA",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.6rem"}}>
            <div style={{width:"28px",height:"28px",border:`2px solid rgba(197,151,58,0.2)`,borderTop:`2px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
            <span style={{fontSize:"0.78rem",color:C.muted}}>Loading map…</span>
          </div>
        )}
        <div ref={mapRef} style={{height:"320px",width:"100%",visibility:ready?"visible":"hidden"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem",marginBottom:"0.5rem"}}>
        <div>
          <label style={{display:"block",fontSize:"0.62rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.3rem"}}>Latitude</label>
          <input type="number" step="0.000001" value={localLat}
            onChange={e=>setCoord("lat", e.target.value)}
            style={{...field,fontFamily:"monospace",fontSize:"0.85rem"}} onFocus={fieldFocus} onBlur={fieldBlur}/>
        </div>
        <div>
          <label style={{display:"block",fontSize:"0.62rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.3rem"}}>Longitude</label>
          <input type="number" step="0.000001" value={localLng}
            onChange={e=>setCoord("lng", e.target.value)}
            style={{...field,fontFamily:"monospace",fontSize:"0.85rem"}} onFocus={fieldFocus} onBlur={fieldBlur}/>
        </div>
      </div>
      <div style={{fontSize:"0.72rem",color:C.muted,padding:"0.5rem 0.7rem",background:"rgba(197,151,58,0.06)",borderRadius:"4px",border:`1px solid rgba(197,151,58,0.2)`}}>
        💡 Click anywhere on the map or drag the pin to set the exact location. You can also paste coordinates above.
      </div>
    </div>
  );
}

// ─── BOLT RIDE BOOKING ────────────────────────────────────────────
// Bolt doesn't publish an official rider deep-linking spec the way Uber
// does (developer.uber.com/docs/riders/ride-requests), so the
// pickup/destination prefill below is a best-effort attempt, not a
// guaranteed-documented integration. To make sure the button is never a
// dead end even if Bolt changes or never honoured these parameters, this:
//   1. Copies the destination address to the clipboard immediately
//   2. Attempts the deep link
//   3. Falls back to Bolt's real, working city page after ~1.2s if the
//      deep link didn't take the guest to the app (so they can paste the
//      already-copied address into Bolt's search themselves)
// Test this on a real phone with Bolt installed and adjust as needed —
// see SETUP.md for what to check.
function openBoltRide({ destLat, destLng, destAddress }) {
  const addressText = destAddress ? `${destAddress}` : `${destLat},${destLng}`;
  // Copy address so guest can paste it into Bolt search if needed
  if (navigator.clipboard) navigator.clipboard.writeText(addressText).catch(()=>{});
  // bolttaxi:// is Bolt's actual app URI scheme — opens the app directly if installed
  const appLink = `bolttaxi://request?dropoff_latitude=${destLat}&dropoff_longitude=${destLng}`;
  // Web fallback if app not installed
  const webFallback = `https://bolt.eu/en-ke/`;
  const start = Date.now();
  window.location.href = appLink;
  setTimeout(() => {
    if (Date.now() - start < 3000 && !document.hidden) {
      window.location.href = webFallback;
    }
  }, 1500);
}

function ListingPage({ listing, onBack, onNavigate, onBookingMade, activeHoliday, siteContent }) {
  const [activePhoto,setActivePhoto]=useState(0);
  const [lightbox,setLightbox]=useState(false);
  const bs=BADGE_STYLE[listing.badge]||BADGE_STYLE["Popular"];
  return (
    <div style={{minHeight:"100vh",paddingTop:"72px",background:"#FDFAF5"}}>
      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"1.5rem 1.5rem 0"}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:"0.8rem",letterSpacing:"0.12em",textTransform:"uppercase",display:"flex",alignItems:"center",gap:"0.4rem",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color="rgba(247,242,234,0.6)"}>← All Listings</button>
      </div>
      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"1.5rem 1.5rem 4rem"}}>
        {/* Title */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"0.5rem"}}>
              <span style={{...bs,padding:"0.25rem 0.75rem",borderRadius:"3px",fontSize:"0.65rem",fontWeight:600}}>{listing.badge}</span>
              <span style={{fontSize:"0.75rem",color:C.muted}}>{listing.type} · {listing.neighborhood}, {listing.city}</span>
            </div>
            <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(1.8rem,4vw,3rem)",fontWeight:400,color:C.cream,marginBottom:"0.3rem"}}>{listing.name}</h1>
            <div style={{fontSize:"0.9rem",color:C.muted,fontStyle:"italic"}}>{listing.tagline}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"0.4rem",flexShrink:0}}>
            <span style={{color:C.gold}}>★★★★★</span>
            <span style={{color:"#1C1C1C",fontWeight:500}}>{listing.rating}</span>
            <span style={{color:C.muted,fontSize:"0.85rem"}}>({listing.reviewCount} reviews)</span>
          </div>
        </div>
        {/* Gallery */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"300px 160px",gap:"6px",borderRadius:"8px",overflow:"hidden",marginBottom:"1rem"}}>
          <div style={{gridRow:"1/3",cursor:"pointer",position:"relative"}} onClick={()=>setLightbox(true)}>
            <img src={listing.photos[activePhoto]} alt={listing.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <div style={{position:"absolute",bottom:"1rem",right:"1rem",background:"rgba(14,43,31,0.75)",backdropFilter:"blur(8px)",padding:"0.4rem 0.8rem",borderRadius:"3px",fontSize:"0.7rem",color:"#F7F2EA",letterSpacing:"0.1em"}}>
              View all {listing.photos.length} photos
            </div>
          </div>
          {listing.photos.slice(1,3).map((p,i)=>(
            <div key={i} style={{cursor:"pointer",overflow:"hidden"}} onClick={()=>{setActivePhoto(i+1);setLightbox(true);}}>
              <img src={p} alt="" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.4s"}} onMouseEnter={e=>e.target.style.transform="scale(1.04)"} onMouseLeave={e=>e.target.style.transform="scale(1)"}/>
            </div>
          ))}
        </div>
        {/* Thumbnails */}
        <div style={{display:"flex",gap:"8px",marginBottom:"3rem",overflowX:"auto",paddingBottom:"4px"}}>
          {listing.photos.map((p,i)=>(
            <div key={i} onClick={()=>setActivePhoto(i)} style={{width:"70px",height:"50px",borderRadius:"4px",overflow:"hidden",cursor:"pointer",border:`2px solid ${i===activePhoto?C.gold:"transparent"}`,background:"#F7F2EA",transition:"border-color 0.2s",flexShrink:0}}>
              <img src={p} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            </div>
          ))}
        </div>
        {/* Content + Widget */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:"4rem",alignItems:"start"}}>
          <div>
            {/* Meta */}
            <div style={{display:"flex",gap:"2rem",paddingBottom:"2rem",borderBottom:`1px solid ${C.border}`,marginBottom:"2rem",flexWrap:"wrap",background:"transparent"}}>
              {[{icon:"🛏",l:`${listing.bedrooms} Bedroom${listing.bedrooms>1?"s":""}`},{icon:"🚿",l:`${listing.bathrooms} Bathroom${listing.bathrooms>1?"s":""}`},{icon:"👤",l:`Up to ${listing.guests} Guests`},{icon:"㎡",l:`${listing.sqm} sqm`}].map(m=>(
                <div key={m.l} style={{textAlign:"center"}}>
                  <div style={{fontSize:"1.3rem",marginBottom:"0.3rem"}}>{m.icon}</div>
                  <div style={{fontSize:"0.78rem",color:C.mutedLight}}>{m.l}</div>
                </div>
              ))}
            </div>
            {/* Description */}
            <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.5rem",color:C.cream,marginBottom:"1rem",fontWeight:400}}>About this space</h2>
            {listing.description.split("\n\n").map((p,i)=>(
              <p key={i} style={{fontSize:"0.92rem",color:C.mutedLight,lineHeight:1.85,marginBottom:"1rem",fontWeight:300}}>{p}</p>
            ))}
            {/* Amenities */}
            <div style={{marginTop:"2.5rem"}}>
              <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.5rem",color:C.cream,marginBottom:"1.2rem",fontWeight:400}}>What's included</h2>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"0.6rem"}}>
                {listing.amenities.map(a=>(
                  <div key={a} style={{display:"flex",alignItems:"center",gap:"0.7rem",padding:"0.7rem 1rem",background:"#F7F2EA",borderRadius:"4px",border:`1px solid ${C.border}`}}>
                    <span style={{color:C.gold}}>✓</span>
                    <span style={{fontSize:"0.83rem",color:C.mutedLight}}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Rules */}
            <div style={{marginTop:"2.5rem"}}>
              <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.5rem",color:C.cream,marginBottom:"1rem",fontWeight:400}}>House Rules</h2>
              {listing.houseRules.map(r=>(
                <div key={r} style={{display:"flex",alignItems:"center",gap:"0.8rem",padding:"0.6rem 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{color:C.gold,fontSize:"0.75rem"}}>—</span>
                  <span style={{fontSize:"0.87rem",color:C.muted}}>{r}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Booking widget */}
          <BookingWidget listing={listing} onBookingMade={onBookingMade} activeHoliday={activeHoliday} siteContent={siteContent}/>
        </div>
      </div>

      {/* ── LOCATION ── */}
      {listing.lat && listing.lng && (
        <div style={{maxWidth:"1200px",margin:"0 auto",padding:"0 1.5rem 5rem"}}>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:"3rem"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",marginBottom:"1.8rem"}}>
              <div>
                <div style={{fontSize:"0.65rem",letterSpacing:"0.35em",textTransform:"uppercase",color:C.gold,marginBottom:"0.5rem"}}>Location</div>
                <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.cream,fontWeight:400,marginBottom:"0.3rem"}}>Where you'll be</h2>
                <div style={{fontSize:"0.9rem",color:C.muted}}>{listing.neighborhood}, {listing.city}, Kenya</div>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`}
                target="_blank" rel="noreferrer"
                style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.7rem 1.3rem",background:C.gold,color:C.obsidian,borderRadius:"5px",fontWeight:700,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",textDecoration:"none",transition:"all 0.2s",flexShrink:0}}
                onMouseEnter={e=>e.currentTarget.style.background=C.goldLight}
                onMouseLeave={e=>e.currentTarget.style.background=C.gold}>
                🗺 Get Directions
              </a>
            </div>

            <ListingMap lat={listing.lat} lng={listing.lng} name={listing.name} neighborhood={listing.neighborhood}/>

            {/* Book a ride here, via Bolt */}
            <div style={{marginTop:"1.2rem",padding:"1.1rem 1.4rem",background:C.cream,borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem"}}>
              <div>
                <div style={{fontSize:"0.65rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.gold,marginBottom:"0.3rem",fontWeight:600}}>Need a ride here?</div>
                <p style={{fontSize:"0.85rem",color:"rgba(247,242,234,0.75)",margin:0,lineHeight:1.6}}>We'll open Bolt with this address ready to paste as your destination.</p>
              </div>
              <button
                onClick={()=>openBoltRide({destLat:listing.lat,destLng:listing.lng,destAddress:`${listing.name}, ${listing.neighborhood}, ${listing.city}`})}
                style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.75rem 1.4rem",background:"#34D186",color:C.cream,border:"none",borderRadius:"6px",fontWeight:700,fontSize:"0.8rem",letterSpacing:"0.05em",cursor:"pointer",flexShrink:0}}>
                🚗 Book with Bolt
              </button>
            </div>

            {listing.locationNote && (
              <div style={{marginTop:"1.2rem",padding:"1.1rem 1.4rem",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"8px",display:"flex",gap:"0.9rem",alignItems:"flex-start"}}>
                <span style={{fontSize:"1.1rem",flexShrink:0,marginTop:"0.1rem"}}>📍</span>
                <div>
                  <div style={{fontSize:"0.65rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.gold,marginBottom:"0.3rem",fontWeight:600}}>Finding us</div>
                  <p style={{fontSize:"0.88rem",color:C.mutedLight,lineHeight:1.75,margin:0}}>{listing.locationNote}</p>
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:"1rem",marginTop:"1.2rem",flexWrap:"wrap"}}>
              <a href={`https://maps.apple.com/?daddr=${listing.lat},${listing.lng}`}
                target="_blank" rel="noreferrer"
                style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.55rem 1.1rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"4px",fontSize:"0.75rem",color:C.muted,fontWeight:500,textDecoration:"none",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
                🍎 Apple Maps
              </a>
              <a href={`https://waze.com/ul?ll=${listing.lat},${listing.lng}&navigate=yes`}
                target="_blank" rel="noreferrer"
                style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.55rem 1.1rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"4px",fontSize:"0.75rem",color:C.muted,fontWeight:500,textDecoration:"none",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
                🔵 Open in Waze
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox&&(
        <div onClick={()=>setLightbox(false)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(14,43,31,0.95)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <button onClick={()=>setLightbox(false)} style={{position:"absolute",top:"1.5rem",right:"1.5rem",background:"none",border:"none",color:"#F7F2EA",fontSize:"1.8rem",cursor:"pointer",opacity:0.8}}>✕</button>
          <img src={listing.photos[activePhoto]} alt="" style={{maxWidth:"90vw",maxHeight:"90vh",objectFit:"contain",borderRadius:"4px"}} onClick={e=>e.stopPropagation()}/>
          <div style={{position:"absolute",bottom:"2rem",display:"flex",gap:"0.5rem"}}>
            {listing.photos.map((_,i)=>(
              <button key={i} onClick={e=>{e.stopPropagation();setActivePhoto(i);}} style={{width:i===activePhoto?"22px":"7px",height:"7px",borderRadius:"4px",background:i===activePhoto?C.gold:"rgba(255,255,255,0.4)",border:"none",cursor:"pointer",transition:"all 0.3s"}}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LISTINGS PAGE ────────────────────────────────────────────────
function ListingsPage({ listings, onSelect, promoConfig, activeHoliday, onSelectWithHoliday }) {
  const [filter,setFilter]=useState("All");
  const types=["All","Studio","1-Bedroom","2+ Bedrooms","Villa"];
  const filtered=filter==="All"?listings:listings.filter(l=>
    filter==="Villa"?l.type.toLowerCase().includes("villa"):
    filter==="Studio"?l.type.toLowerCase().includes("studio"):
    filter==="1-Bedroom"?l.bedrooms===1&&!l.type.toLowerCase().includes("studio"):
    filter==="2+ Bedrooms"?l.bedrooms>=2&&!l.type.toLowerCase().includes("villa"):true
  );
  const upcomingForTicker = promoConfig ? getUpcomingHolidays(promoConfig, 6) : [];
  return (
    <div style={{minHeight:"100vh",paddingTop:"72px",background:"#FDFAF5"}}>
      {upcomingForTicker.length > 0 && <PromoTicker holidays={upcomingForTicker}/>}
      <div style={{background:"linear-gradient(180deg,#EEE9E0 0%,#F7F2EA 100%)",padding:"4rem 1.5rem 2rem",borderBottom:`1px solid ${C.border}`}}>
        <div style={{maxWidth:"1200px",margin:"0 auto"}}>
          <div style={{fontSize:"0.68rem",letterSpacing:"0.35em",textTransform:"uppercase",color:C.gold,marginBottom:"0.8rem"}}>Our Portfolio</div>
          <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(2.5rem,5vw,4rem)",fontWeight:400,color:C.cream,marginBottom:"1rem"}}>
            {listings.length} Exceptional <em style={{color:C.gold,fontStyle:"italic"}}>Stays</em>
          </h1>
          <p style={{fontSize:"0.95rem",color:C.muted,maxWidth:"520px",lineHeight:1.8}}>Every listing is personally curated. {BRAND.city}'s best addresses, at your fingertips.</p>
          <div style={{display:"flex",gap:"0.6rem",marginTop:"2rem",flexWrap:"wrap"}}>
            {types.map(t=>(
              <button key={t} onClick={()=>setFilter(t)} style={{padding:"0.5rem 1.2rem",background:filter===t?C.gold:"transparent",color:filter===t?C.obsidian:C.muted,border:`1px solid ${filter===t?C.gold:C.border}`,borderRadius:"2px",cursor:"pointer",fontSize:"0.75rem",fontWeight:500,letterSpacing:"0.08em",transition:"all 0.2s"}}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"2rem 1.5rem 4rem",background:"#FDFAF5"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,320px),1fr))",gap:"1.2rem"}}>
          {filtered.map(l=>(
            <div key={l.id} style={{animation:"fadeUp 0.6s ease both"}}><ListingCard listing={l} onClick={()=>activeHoliday&&onSelectWithHoliday?onSelectWithHoliday(l,activeHoliday):onSelect(l)} activeHoliday={activeHoliday}/></div>
          ))}
        </div>
        {filtered.length===0&&<div style={{textAlign:"center",padding:"6rem 0",color:C.muted,background:"#FDFAF5"}}>No listings match this filter.</div>}
      </div>
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────
function Hero({ listings, onNavigate, heroBadge, heroLine1, heroLine2, heroSubcopy }) {
  // Compute stats dynamically from real listings
  const listingCount = listings?.length || 0;
  const avgRating = listings?.length
    ? (listings.reduce((s,l)=>s+(parseFloat(l.rating)||0),0)/listings.length).toFixed(2)
    : "4.95";
  const areas = listings?.length
    ? new Set(listings.map(l=>l.neighborhood).filter(Boolean)).size
    : 0;
  const heroStats = [
    { n: String(listingCount), l: "Listings" },
    { n: avgRating, l: "Rating" },
    { n: "440+", l: "Guests" },
    { n: String(areas||listingCount), l: "Areas" },
  ];
  heroBadge   = heroBadge   || `${BRAND.city}'s Premier Short Stays`;
  heroLine1   = heroLine1   || "Live Like a";
  heroLine2   = heroLine2   || "Local Legend";
  heroSubcopy = heroSubcopy || `Handpicked apartments, studios and villas across ${BRAND.city}'s finest neighbourhoods.`;
  const [slide,setSlide]=useState(0);
  const [mobile,setMobile]=useState(window.innerWidth<768);
  const photos=listings.map(l=>l.photos[0]);

  useEffect(()=>{
    const t=setInterval(()=>setSlide(s=>(s+1)%photos.length),4500);
    const onResize=()=>setMobile(window.innerWidth<768);
    window.addEventListener("resize",onResize);
    return()=>{ clearInterval(t); window.removeEventListener("resize",onResize); };
  },[photos.length]);

  return (
    <section style={{background:"#FFFFFF",paddingTop:"64px",overflow:"hidden",minHeight:"100vh",display:"flex",flexDirection:"column"}}>

      {/* ── MOBILE layout: stacked ── */}
      {mobile&&(
        <>
          {/* Photo — top half on mobile */}
          <div style={{position:"relative",height:"42vh",flexShrink:0}}>
            {photos.map((src,i)=>(
              <div key={i} style={{position:"absolute",inset:0,backgroundImage:`url(${src})`,backgroundSize:"cover",backgroundPosition:"center",opacity:i===slide?1:0,transition:"opacity 1.4s ease"}}/>
            ))}
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, rgba(14,43,31,0.15) 0%, rgba(14,43,31,0.45) 100%)"}}/>
            {/* Slide dots */}
            <div style={{position:"absolute",bottom:"1rem",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"5px"}}>
              {photos.map((_,i)=>(
                <button key={i} onClick={()=>setSlide(i)} style={{width:i===slide?"20px":"6px",height:"6px",borderRadius:"3px",background:i===slide?C.gold:"rgba(253,250,245,0.5)",border:"none",cursor:"pointer",transition:"all 0.4s ease"}}/>
              ))}
            </div>
          </div>

          {/* Text — below photo on mobile */}
          <div style={{flex:1,padding:"2rem 1.5rem 2.5rem",display:"flex",flexDirection:"column",justifyContent:"center",position:"relative",overflow:"hidden",background:"#1A1A2E"}}>
            <div style={{position:"absolute",top:"-60px",right:"-60px",width:"200px",height:"200px",borderRadius:"50%",background:"rgba(255,107,107,0.06)",pointerEvents:"none"}}/>

            <div style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:"20px",padding:"0.3rem 0.8rem",marginBottom:"1.2rem",alignSelf:"flex-start"}}>
              <span style={{width:"5px",height:"5px",borderRadius:"50%",background:C.gold,display:"inline-block"}}/>
              <span style={{fontSize:"0.6rem",letterSpacing:"0.25em",textTransform:"uppercase",color:C.primary}}>{heroBadge}</span>
            </div>

            <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2.8rem",fontWeight:400,lineHeight:1.05,color:"#F7F2EA",marginBottom:"1rem",animation:"fadeUp 0.6s ease both"}}>
              {heroLine1}<br/><em style={{color:C.primary,fontStyle:"italic"}}>{heroLine2}</em>
            </h1>

            <p style={{fontSize:"0.95rem",color:"rgba(247,242,234,0.7)",lineHeight:1.75,fontWeight:300,marginBottom:"1.8rem",maxWidth:"360px"}}>
              Handpicked apartments, studios and villas across {BRAND.city}'s finest neighbourhoods.
            </p>

            <div style={{display:"flex",gap:"0.7rem",flexWrap:"wrap",marginBottom:"2rem"}}>
              <button onClick={()=>onNavigate("listings")} style={{background:C.gold,color:C.cream,padding:"0.9rem 1.8rem",fontSize:"0.8rem",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",border:"none",borderRadius:"4px",cursor:"pointer",boxShadow:"0 4px 16px rgba(197,151,58,0.4)"}}>
                Explore Stays
              </button>
              <button onClick={()=>onNavigate("about")} style={{background:"transparent",color:"#F7F2EA",padding:"0.9rem 1.4rem",fontSize:"0.8rem",fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",border:"1px solid rgba(247,242,234,0.3)",borderRadius:"4px",cursor:"pointer"}}>
                Our Story
              </button>
            </div>

            {/* Stats row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0",paddingTop:"1.2rem",borderTop:"1px solid rgba(247,242,234,0.1)"}}>
              {heroStats.map(s=>(
                <div key={s.l} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.5rem",color:C.gold,fontWeight:500}}>{s.n}</div>
                  <div style={{fontSize:"0.55rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(247,242,234,0.4)",marginTop:"0.15rem"}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── DESKTOP layout: side-by-side ── */}
      {!mobile&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",flex:1,minHeight:"calc(100vh - 64px)"}}>
          {/* LEFT — text */}
          <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"5rem 4rem 5rem 6rem",position:"relative",overflow:"hidden",background:"#1A1A2E"}}>
            <div style={{position:"absolute",top:"-80px",left:"-80px",width:"320px",height:"320px",borderRadius:"50%",background:"rgba(255,107,107,0.06)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",bottom:"-40px",right:"-60px",width:"200px",height:"200px",borderRadius:"50%",background:"rgba(78,205,196,0.06)",pointerEvents:"none"}}/>

            <div style={{position:"relative",zIndex:1}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:"20px",padding:"0.35rem 1rem",marginBottom:"2rem"}}>
                <span style={{width:"6px",height:"6px",borderRadius:"50%",background:C.gold,display:"inline-block",animation:"pulse 2s ease infinite"}}/>
                <span style={{fontSize:"0.68rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.primary}}>{heroBadge}</span>
              </div>

              <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(3rem,4vw,5.5rem)",fontWeight:400,lineHeight:1.05,color:"#F7F2EA",marginBottom:"1.6rem",animation:"fadeUp 0.8s ease both"}}>
                {heroLine1}<br/><em style={{color:C.primary,fontStyle:"italic"}}>{heroLine2}</em>
              </h1>

              <p style={{fontSize:"1rem",color:"rgba(247,242,234,0.7)",maxWidth:"420px",lineHeight:1.85,fontWeight:300,marginBottom:"2.8rem"}}>
                Handpicked apartments, studios and villas across {BRAND.city}'s finest neighbourhoods. One night or one year.
              </p>

              <div style={{display:"flex",gap:"0.8rem",flexWrap:"wrap",marginBottom:"3.5rem"}}>
                <button onClick={()=>onNavigate("listings")} style={{background:C.gold,color:C.cream,padding:"1rem 2.4rem",fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",border:"none",borderRadius:"4px",cursor:"pointer",transition:"all 0.25s",boxShadow:"0 4px 20px rgba(197,151,58,0.4)"}}
                  onMouseEnter={e=>{e.target.style.background=C.goldLight;e.target.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.target.style.background=C.gold;e.target.style.transform="translateY(0)";}}>
                  Explore Stays
                </button>
                <button onClick={()=>onNavigate("about")} style={{background:"transparent",color:"#F7F2EA",padding:"1rem 2rem",fontSize:"0.82rem",fontWeight:500,letterSpacing:"0.12em",textTransform:"uppercase",border:"1px solid rgba(247,242,234,0.3)",borderRadius:"4px",cursor:"pointer",transition:"all 0.25s"}}
                  onMouseEnter={e=>{e.target.style.borderColor=C.gold;e.target.style.color=C.gold;}}
                  onMouseLeave={e=>{e.target.style.borderColor="rgba(247,242,234,0.3)";e.target.style.color="#F7F2EA";}}>
                  Our Story
                </button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",paddingTop:"2rem",borderTop:"1px solid rgba(247,242,234,0.1)"}}>
                {heroStats.map(s=>(
                  <div key={s.l} style={{textAlign:"center",padding:"0 0.5rem"}}>
                    <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.gold,fontWeight:500}}>{s.n}</div>
                    <div style={{fontSize:"0.6rem",letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(247,242,234,0.45)",marginTop:"0.2rem"}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — photo */}
          <div style={{position:"relative",background:"#1A1A2E",overflow:"hidden"}}>
            {photos.map((src,i)=>(
              <div key={i} style={{position:"absolute",inset:0,backgroundImage:`url(${src})`,backgroundSize:"cover",backgroundPosition:"center",opacity:i===slide?1:0,transition:"opacity 1.4s ease"}}/>
            ))}
            <div style={{position:"absolute",inset:0,background:"rgba(14,43,31,0.1)"}}/>

            {/* Listing card */}
            <div style={{position:"absolute",bottom:"2rem",left:"1.5rem",right:"1.5rem",zIndex:2}}>
              <div style={{background:"rgba(253,250,245,0.94)",backdropFilter:"blur(12px)",borderRadius:"10px",padding:"1rem 1.2rem",boxShadow:"0 8px 32px rgba(14,43,31,0.2)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1rem",color:C.cream,fontWeight:500}}>{listings[slide]?.name}</div>
                    <div style={{fontSize:"0.72rem",color:C.muted,marginTop:"0.15rem"}}>{listings[slide]?.neighborhood} · from KES {fmt(listings[slide]?.pricePerNight)}/night</div>
                  </div>
                  <button onClick={()=>onNavigate("listings")} style={{background:C.cream,color:"#F7F2EA",border:"none",borderRadius:"4px",padding:"0.5rem 1rem",fontSize:"0.7rem",fontWeight:600,cursor:"pointer",letterSpacing:"0.1em",textTransform:"uppercase",transition:"background 0.2s",flexShrink:0,marginLeft:"1rem"}}
                    onMouseEnter={e=>e.target.style.background=C.gold}
                    onMouseLeave={e=>e.target.style.background="#1A1A2E"}>
                    View →
                  </button>
                </div>
              </div>
            </div>

            {/* Slide dots */}
            <div style={{position:"absolute",top:"1.5rem",right:"1.5rem",zIndex:2,display:"flex",flexDirection:"column",gap:"6px"}}>
              {photos.map((_,i)=>(
                <button key={i} onClick={()=>setSlide(i)} style={{width:"7px",height:i===slide?"22px":"7px",borderRadius:"4px",background:i===slide?"#F7F2EA":"rgba(253,250,245,0.4)",border:"none",cursor:"pointer",transition:"all 0.4s ease"}}/>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── BOOKINGS PANEL ───────────────────────────────────────────────
function MyBookingsPanel({ bookings, onClose }) {
  if(!bookings.length) return (
    <div style={{position:"fixed",inset:0,background:"rgba(5,5,10,0.9)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"2.5rem",textAlign:"center",maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:"2rem",marginBottom:"1rem"}}>📋</div>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",color:C.cream,fontSize:"1.2rem",marginBottom:"0.5rem"}}>No bookings yet</div>
        <div style={{color:C.muted,fontSize:"0.85rem",marginBottom:"1.5rem"}}>Your confirmed bookings will appear here.</div>
        <button onClick={onClose} style={{background:C.gold,color:C.obsidian,border:"none",padding:"0.7rem 1.8rem",borderRadius:"4px",cursor:"pointer",fontWeight:600}}>Browse Listings</button>
      </div>
    </div>
  );
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(14,43,31,0.65)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}} onClick={onClose}>
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",width:"100%",maxWidth:"600px",maxHeight:"80vh",overflowY:"auto",animation:"slideUp 0.3s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{position:"sticky",top:0,background:"#fff",padding:"1.5rem 1.8rem",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",color:C.cream,fontSize:"1.3rem"}}>My Bookings</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:"1.3rem",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"1.2rem"}}>
          {bookings.map((b,i)=>(
            <div key={i} style={{background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"7px",padding:"1.2rem",marginBottom:"0.8rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.7rem"}}>
                <div>
                  <div style={{fontFamily:"'Fraunces',Georgia,serif",color:C.cream,fontSize:"1rem"}}>{b.listing?.name}</div>
                  <div style={{fontSize:"0.75rem",color:C.muted,marginTop:"0.2rem"}}>{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)} · {b.nights} night{b.nights>1?"s":""}</div>
                </div>
                <div style={{background:C.successDim,border:"1px solid rgba(76,175,125,0.3)",borderRadius:"4px",padding:"0.2rem 0.6rem",fontSize:"0.65rem",color:C.success,fontWeight:600}}>Confirmed</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",borderTop:`1px solid ${C.border}`,paddingTop:"0.6rem"}}>
                <span style={{color:C.muted}}>Ref: <span style={{color:C.gold,fontWeight:600}}>{b.ref}</span></span>
                <span style={{color:C.gold,fontWeight:600}}>KES {fmt(b.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SIMPLE PAGES ─────────────────────────────────────────────────
function AboutPage({ siteContent }) {
  const sc = siteContent || DEFAULT_SITE_CONTENT;
  const paragraphs = Array.isArray(sc.aboutParagraphs) ? sc.aboutParagraphs : DEFAULT_SITE_CONTENT.aboutParagraphs;
  const [titleWord1, ...titleRest] = sc.aboutHeroTitle.split(" ");
  return (
    <div style={{minHeight:"100vh",paddingTop:"72px",background:C.obsidian}}>
      <div style={{backgroundImage:`url(${sc.aboutHeroImage})`,backgroundSize:"cover",backgroundPosition:"center",height:"50vh",position:"relative"}}>
        <div style={{position:"absolute",inset:0,background:"rgba(14,43,31,0.6)"}}/>
        <div style={{position:"relative",zIndex:1,height:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"3rem 4rem"}}>
          <div style={{fontSize:"0.68rem",letterSpacing:"0.35em",textTransform:"uppercase",color:C.gold,marginBottom:"0.8rem"}}>{sc.aboutHeroSubtitle}</div>
          <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(2.5rem,5vw,4rem)",color:"#F7F2EA",fontWeight:400}}>
            {sc.aboutHeroTitle.split("\n").map((line,i)=>(
              <span key={i}>{i>0&&<br/>}{line}</span>
            ))}
          </h1>
        </div>
      </div>
      <div style={{maxWidth:"800px",margin:"0 auto",padding:"3rem 1.5rem"}}>
        {paragraphs.map((p,i)=>(
          <p key={i} style={{fontSize:"1rem",color:C.mutedLight,lineHeight:1.9,marginBottom:"1.6rem",fontWeight:300}}>{p}</p>
        ))}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"1rem",marginTop:"2rem"}}>
          {[{n:sc.statFounded,l:"Founded"},{n:sc.statGuests,l:"Guests hosted"},{n:sc.statRating,l:"Avg rating"}].map(s=>(
            <div key={s.l} style={{textAlign:"center",padding:"2rem",background:"#fff",border:`1px solid ${C.border}`,borderRadius:"6px",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2.2rem",color:C.gold,marginBottom:"0.4rem"}}>{s.n}</div>
              <div style={{fontSize:"0.72rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.muted}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactPage({ siteContent }) {
  const sc = siteContent || DEFAULT_SITE_CONTENT;
  const items = [
    {icon:"📱",label:"WhatsApp",val:sc.whatsappDisplay||sc.whatsapp,link:`https://wa.me/${sc.whatsapp}`},
    {icon:"✉️",label:"Email",val:sc.email,link:`mailto:${sc.email}`},
    {icon:"📞",label:"Phone",val:sc.phone,link:`tel:${sc.phone}`},
    {icon:"◎",label:"Location",val:sc.location},
    {icon:"⏰",label:"Response",val:sc.responseTime},
  ].filter(i=>i.val&&i.val.trim());
  return (
    <div style={{minHeight:"100vh",paddingTop:"72px",background:C.obsidian}}>
      <div style={{maxWidth:"900px",margin:"0 auto",padding:"3rem 1.5rem",background:"#FDFAF5"}}>
        <div style={{fontSize:"0.68rem",letterSpacing:"0.35em",textTransform:"uppercase",color:C.gold,marginBottom:"0.8rem"}}>Get in Touch</div>
        <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(2.5rem,5vw,4rem)",color:C.cream,fontWeight:400,marginBottom:"1rem"}}>Ready to <em style={{color:C.gold}}>book?</em></h1>
        <p style={{fontSize:"0.95rem",color:C.muted,marginBottom:"3rem",lineHeight:1.8}}>Reach us on WhatsApp for the fastest response, or fill in the form below.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,260px),1fr))",gap:"1.2rem"}}>
          {items.map(c=>(
            <div key={c.label} style={{padding:"1.8rem",background:"#fff",border:`1px solid ${C.border}`,borderRadius:"6px",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}}>
              <div style={{fontSize:"1.6rem",marginBottom:"0.8rem"}}>{c.icon}</div>
              <div style={{fontSize:"0.68rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.muted,marginBottom:"0.3rem"}}>{c.label}</div>
              {c.link
                ? <a href={c.link} target="_blank" rel="noreferrer" style={{color:C.gold,fontSize:"0.95rem",fontWeight:500,wordBreak:"break-all"}}>{c.val}</a>
                : <div style={{color:"#1C1C1C",fontSize:"0.95rem"}}>{c.val}</div>
              }
            </div>
          ))}
        </div>
        {/* WhatsApp CTA */}
        <div style={{marginTop:"3rem",padding:"2rem",background:`linear-gradient(135deg,${C.primary},${C.teal})`,borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem"}}>
          <div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.4rem",color:"#F7F2EA",marginBottom:"0.3rem"}}>Chat with us directly</div>
            <div style={{fontSize:"0.85rem",color:"rgba(247,242,234,0.6)"}}>Average response time: {sc.responseTime}</div>
          </div>
          <a href={`https://wa.me/${sc.whatsapp}?text=${encodeURIComponent(`Hi! I'd like to inquire about a ${BRAND.fullName} booking.`)}`}
            target="_blank" rel="noreferrer"
            style={{display:"inline-flex",alignItems:"center",gap:"0.6rem",padding:"0.9rem 1.8rem",background:"#25D366",color:"#fff",borderRadius:"6px",fontWeight:700,fontSize:"0.82rem",letterSpacing:"0.12em",textTransform:"uppercase",textDecoration:"none",transition:"all 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#1ebe59"}
            onMouseLeave={e=>e.currentTarget.style.background="#25D366"}>
            📱 WhatsApp Us
          </a>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ─── HOLIDAY & PROMO ENGINE ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// ── Kenya Public Holidays + Recurring Promos ──────────────────────
// Each entry: { id, name, emoji, month(1-12), day(1-31), daysAhead,
//   theme, palette, animStyle, defaultDiscount }
const KENYA_HOLIDAYS = [
  { id:"new_year",     name:"New Year",           emoji:"🎆", month:1,  day:1,  daysAhead:3,
    theme:"new_year",   defaultDiscount:15 },
  { id:"valentines",   name:"Valentine's Day",     emoji:"💕", month:2,  day:14, daysAhead:5,
    theme:"valentines", defaultDiscount:10 },
  { id:"good_friday",  name:"Good Friday",         emoji:"✝️", month:4,  day:7,  daysAhead:4,
    theme:"easter",     defaultDiscount:12 },
  { id:"easter",       name:"Easter Weekend",      emoji:"🐣", month:4,  day:9,  daysAhead:4,
    theme:"easter",     defaultDiscount:12 },
  { id:"labour_day",   name:"Labour Day",          emoji:"⚒️", month:5,  day:1,  daysAhead:3,
    theme:"labour",     defaultDiscount:10 },
  { id:"madaraka",     name:"Madaraka Day",        emoji:"🇰🇪", month:6,  day:1,  daysAhead:4,
    theme:"kenya",      defaultDiscount:20 },
  { id:"eid",          name:"Eid Al-Adha",         emoji:"🌙", month:6,  day:17, daysAhead:5,
    theme:"eid",        defaultDiscount:15 },
  { id:"huduma",       name:"Huduma Day",           emoji:"🤝", month:10, day:10, daysAhead:3,
    theme:"kenya",      defaultDiscount:15 },
  { id:"mashujaa",     name:"Mashujaa Day",        emoji:"🦁", month:10, day:20, daysAhead:4,
    theme:"mashujaa",   defaultDiscount:20 },
  { id:"jamhuri",      name:"Jamhuri Day",         emoji:"🇰🇪", month:12, day:12, daysAhead:5,
    theme:"kenya",      defaultDiscount:25 },
  { id:"christmas",    name:"Christmas",           emoji:"🎄", month:12, day:25, daysAhead:7,
    theme:"christmas",  defaultDiscount:15 },
  { id:"boxing_day",   name:"Boxing Day",          emoji:"🎁", month:12, day:26, daysAhead:2,
    theme:"christmas",  defaultDiscount:10 },
  { id:"new_year_eve", name:"New Year's Eve",      emoji:"🥂", month:12, day:31, daysAhead:3,
    theme:"new_year",   defaultDiscount:12 },
];

// Theme palettes for each holiday style
const HOLIDAY_THEMES = {
  new_year:   { bg:"#03020A", accent:"#FFD700", accent2:"#C0C0C0", text:"#FFD700", particles:"🎆🎇✨🥂🍾" },
  valentines: { bg:"#1a0010", accent:"#FF4D6D", accent2:"#FFB3C1", text:"#FF4D6D", particles:"💕💖💗💓💝" },
  easter:     { bg:"#0d1a00", accent:"#7EC845", accent2:"#FFE066", text:"#7EC845", particles:"🐣🌸🌷🐰🥚" },
  labour:     { bg:"#0A0A0A", accent:"#E8C870", accent2:"#FF6B35", text:"#E8C870", particles:"⚒️🔧🏗️💪✊" },
  kenya:      { bg:"#000000", accent:"#006600", accent2:"#CC0000", text:"#FFFFFF", particles:"🇰🇪🦁🌍⚡🎊" },
  eid:        { bg:"#001a0d", accent:"#C5A028", accent2:"#4CAF50", text:"#C5A028", particles:"🌙⭐🕌🌟✨" },
  mashujaa:   { bg:"#0a0000", accent:"#CC0000", accent2:"#006600", text:"#FFFFFF", particles:"🦁⚔️🛡️🌍🔥" },
  christmas:  { bg:"#001400", accent:"#FF3333", accent2:"#FFD700", text:"#FFFFFF", particles:"🎄🎅🎁❄️⛄" },
};

// Supabase load/save for promo config
async function loadPromos() {
  try {
    const { data, error } = await supabase
      .from("kv_store").select("value").eq("key",`${BRAND.slug}:promos`).single();
    if (error || !data) return {};
    return JSON.parse(data.value);
  } catch { return {}; }
}
async function savePromos(d) {
  const { error } = await supabase.from("kv_store").upsert(
    { key:`${BRAND.slug}:promos`, value:JSON.stringify(d) }, { onConflict:"key" }
  );
  if (error) console.error("[Supabase] savePromos:", error.message);
}

// Find active holiday for today
function getActiveHoliday(promoConfig) {
  const now = new Date();
  const m = now.getMonth()+1;
  const d = now.getDate();
  for (const h of KENYA_HOLIDAYS) {
    // Check if we are within daysAhead window before the holiday
    const hDate = new Date(now.getFullYear(), h.month-1, h.day);
    const diffDays = Math.ceil((hDate - now) / (1000*60*60*24));
    if (diffDays >= 0 && diffDays <= h.daysAhead) {
      const cfg = promoConfig[h.id];
      if (cfg?.disabled) return null;
      const discount = cfg?.discount ?? h.defaultDiscount;
      const customMsg = cfg?.message ?? null;
      return { ...h, discount, customMsg, theme: HOLIDAY_THEMES[h.theme] || HOLIDAY_THEMES.kenya };
    }
  }
  return null;
}

// ── Particle Canvas helpers ─────────────────────────────────────────
function FloatingEmoji({ emoji, style }) {
  return (
    <div style={{
      position:"absolute", fontSize:"1.4rem", pointerEvents:"none", userSelect:"none",
      animation:`floatUp ${2+Math.random()*3}s ease-in ${Math.random()*2}s both`,
      ...style
    }}>{emoji}</div>
  );
}

function Confetti({ count=18, colors }) {
  const pieces = Array.from({length:count}, (_,i) => ({
    id:i,
    x: Math.random()*100,
    delay: Math.random()*1.5,
    dur: 1.2+Math.random()*1.5,
    color: colors[i % colors.length],
    size: 6+Math.random()*8,
    shape: Math.random()>0.5?"circle":"square",
  }));
  return (
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
      {pieces.map(p=>(
        <div key={p.id} style={{
          position:"absolute", left:`${p.x}%`, top:"-20px",
          width:`${p.size}px`, height:`${p.size}px`,
          background:p.color,
          borderRadius:p.shape==="circle"?"50%":"2px",
          animation:`confettiFall ${p.dur}s ease-in ${p.delay}s both`,
          opacity:0.85,
        }}/>
      ))}
    </div>
  );
}

// ── NEW YEAR POPUP ─────────────────────────────────────────────────
function NewYearPopup({ holiday, onClose, onBook }) {
  const t = holiday.theme;
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ setTimeout(()=>setVisible(true),80); },[]);
  const particles = t.particles.split("").filter(c=>c.trim());
  return (
    <div style={{position:"fixed",inset:0,zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(3,2,10,0.92)",backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",width:"min(480px,92vw)",overflow:"hidden",borderRadius:"16px",
        background:`linear-gradient(160deg,${t.bg} 0%,#0d0520 100%)`,
        border:`1px solid ${t.accent}44`,
        boxShadow:`0 0 80px ${t.accent}33, 0 40px 120px rgba(0,0,0,0.8)`,
        animation:visible?"popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both":"none",
        padding:"0",
      }}>
        <Confetti count={22} colors={[t.accent,t.accent2,"#fff","#FFB3FF","#80FFFF"]}/>
        {/* Firework rings */}
        {[0,1,2].map(i=>(
          <div key={i} style={{
            position:"absolute", borderRadius:"50%",
            border:`2px solid ${i===0?t.accent:i===1?t.accent2:"#fff"}`,
            width:`${140+i*60}px`, height:`${140+i*60}px`,
            top:"50%", left:"50%", transform:"translate(-50%,-50%)",
            animation:`firework ${1.5+i*0.3}s ease-out ${i*0.2}s infinite`,
            opacity:0.15,
          }}/>
        ))}
        <div style={{position:"relative",zIndex:1,padding:"2.5rem 2rem 2rem",textAlign:"center"}}>
          <div style={{fontSize:"3.5rem",marginBottom:"0.2rem",filter:"drop-shadow(0 0 20px gold)"}}>🎆</div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2.2rem",color:t.accent,fontWeight:600,lineHeight:1.1,marginBottom:"0.4rem",textShadow:`0 0 30px ${t.accent}88`}}>
            Happy New Year!
          </div>
          <div style={{fontSize:"0.7rem",letterSpacing:"0.4em",textTransform:"uppercase",color:t.accent2,marginBottom:"1.2rem"}}>
            {new Date().getFullYear()} Celebrations
          </div>
          {holiday.customMsg
            ? <p style={{fontSize:"0.9rem",color:"rgba(255,255,255,0.8)",lineHeight:1.7,marginBottom:"1.4rem"}}>{holiday.customMsg}</p>
            : <p style={{fontSize:"0.9rem",color:"rgba(255,255,255,0.8)",lineHeight:1.7,marginBottom:"1.4rem"}}>Ring in the New Year in style. Book your {BRAND.city} stay now and celebrate with <strong style={{color:t.accent}}>{holiday.discount}% off</strong> — exclusive New Year rates.</p>
          }
          <div style={{background:`linear-gradient(135deg,${t.accent}22,${t.accent2}11)`,border:`1px solid ${t.accent}55`,borderRadius:"10px",padding:"1rem 1.5rem",marginBottom:"1.5rem",animation:"glowPulse 2s ease infinite"}}>
            <div style={{fontSize:"0.6rem",letterSpacing:"0.3em",textTransform:"uppercase",color:t.accent2,marginBottom:"0.3rem"}}>New Year Offer</div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2.5rem",color:t.accent,fontWeight:700}}>{holiday.discount}% OFF</div>
            <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.5)",marginTop:"0.2rem"}}>Use code: <strong style={{color:t.accent2,letterSpacing:"0.1em"}}>NEWYEAR{new Date().getFullYear()}</strong></div>
          </div>
          <button onClick={onBook} style={{width:"100%",padding:"1rem",background:`linear-gradient(135deg,${t.accent},${t.accent2})`,color:"#000",border:"none",borderRadius:"8px",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",marginBottom:"0.8rem"}}>
            🥂 Claim My New Year Deal
          </button>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:"0.75rem",cursor:"pointer",letterSpacing:"0.1em"}}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ── VALENTINES POPUP ───────────────────────────────────────────────
function ValentinesPopup({ holiday, onClose, onBook }) {
  const t = holiday.theme;
  const [visible, setVisible] = useState(false);
  const [hearts, setHearts] = useState([]);
  useEffect(()=>{
    setTimeout(()=>setVisible(true),80);
    const h = Array.from({length:12},(_,i)=>({ id:i, x:Math.random()*100, delay:Math.random()*2, size:1+Math.random()*1.5 }));
    setHearts(h);
  },[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(26,0,16,0.93)",backdropFilter:"blur(10px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",width:"min(440px,92vw)",borderRadius:"20px",overflow:"hidden",
        background:`linear-gradient(135deg,#1a0010 0%,#2d0020 50%,#1a0010 100%)`,
        border:`2px solid ${t.accent}66`,
        boxShadow:`0 0 60px ${t.accent}44, 0 40px 100px rgba(0,0,0,0.8)`,
        animation:visible?"popIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both":"none",
      }}>
        {/* Floating hearts background */}
        <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
          {hearts.map(h=>(
            <div key={h.id} style={{
              position:"absolute",left:`${h.x}%`,bottom:"-20px",
              fontSize:`${h.size}rem`,
              animation:`floatUp ${3+Math.random()*2}s ease-in ${h.delay}s infinite`,
              opacity:0.35,
            }}>💕</div>
          ))}
        </div>
        {/* Ribbon */}
        <div style={{
          position:"absolute",top:"1.2rem",right:"-2rem",
          background:`linear-gradient(135deg,${t.accent},#c0003c)`,
          padding:"0.35rem 3rem",
          fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:"#fff",
          transform:"rotate(35deg)",
          boxShadow:"0 4px 12px rgba(0,0,0,0.4)",
        }}>Limited</div>
        <div style={{position:"relative",zIndex:1,padding:"2.5rem 2rem 2rem",textAlign:"center"}}>
          <div style={{fontSize:"3rem",marginBottom:"0.3rem",animation:"heartBeat 1.5s ease infinite"}}>💖</div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2rem",color:t.accent,fontWeight:600,marginBottom:"0.3rem",textShadow:`0 0 25px ${t.accent}77`}}>
            Love is in the Air
          </div>
          <div style={{fontSize:"0.7rem",letterSpacing:"0.3em",textTransform:"uppercase",color:t.accent2,marginBottom:"1.2rem"}}>
            Valentine's Day · {holiday.name}
          </div>
          {holiday.customMsg
            ? <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.75)",lineHeight:1.7,marginBottom:"1.4rem"}}>{holiday.customMsg}</p>
            : <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.75)",lineHeight:1.7,marginBottom:"1.4rem"}}>Surprise your partner with a romantic {BRAND.city} escape. Our curated stays are perfect for couples — candles, views, and memories included.</p>
          }
          <div style={{
            display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",
            background:"rgba(255,77,109,0.1)",border:`1px solid ${t.accent}44`,borderRadius:"12px",
            padding:"1rem 1.5rem",marginBottom:"1.4rem",
          }}>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2.8rem",color:t.accent,lineHeight:1}}>{holiday.discount}%</div>
              <div style={{fontSize:"0.65rem",color:t.accent2,letterSpacing:"0.2em",textTransform:"uppercase"}}>Discount</div>
            </div>
            <div style={{width:"1px",height:"50px",background:`${t.accent}33`}}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"1.5rem"}}>💕</div>
              <div style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.5)",marginTop:"0.2rem"}}>For couples</div>
            </div>
          </div>
          <button onClick={onBook} style={{width:"100%",padding:"1rem",background:`linear-gradient(135deg,${t.accent},#c0003c)`,color:"#fff",border:"none",borderRadius:"10px",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",marginBottom:"0.7rem",boxShadow:`0 8px 24px ${t.accent}55`}}>
            💕 Book a Romantic Stay
          </button>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.35)",fontSize:"0.75rem",cursor:"pointer"}}>Skip for now</button>
        </div>
      </div>
    </div>
  );
}

// ── KENYA NATIONAL DAY POPUP (Madaraka / Jamhuri / Huduma / Mashujaa) ──
function KenyaDayPopup({ holiday, onClose, onBook }) {
  const t = holiday.theme;
  const isMashujaa = holiday.id === "mashujaa";
  const [visible, setVisible] = useState(false);
  const [scanPos, setScanPos] = useState(0);
  useEffect(()=>{
    setTimeout(()=>setVisible(true),80);
    const interval = setInterval(()=>setScanPos(p=>(p+2)%100),30);
    return ()=>clearInterval(interval);
  },[]);
  const flagColors = ["#006600","#CC0000","#000000","#FFFFFF"];
  return (
    <div style={{position:"fixed",inset:0,zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.92)",backdropFilter:"blur(10px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",width:"min(500px,92vw)",borderRadius:"16px",overflow:"hidden",
        background:"linear-gradient(170deg,#000 0%,#001a00 60%,#1a0000 100%)",
        border:"2px solid transparent",
        backgroundClip:"padding-box",
        boxShadow:"0 0 0 2px #006600, 0 0 0 4px #CC0000, 0 0 80px rgba(0,102,0,0.4)",
        animation:visible?"bounceIn 0.7s ease both":"none",
      }}>
        {/* Kenya flag stripe across top */}
        <div style={{display:"flex",height:"8px"}}>
          {["#006600","#FFFFFF","#CC0000","#000000","#CC0000","#FFFFFF","#006600"].map((c,i)=>(
            <div key={i} style={{flex:1,background:c}}/>
          ))}
        </div>
        {/* Scan line effect */}
        <div style={{position:"absolute",top:`${scanPos}%`,left:0,right:0,height:"2px",background:"linear-gradient(90deg,transparent,rgba(0,102,0,0.4),transparent)",pointerEvents:"none",zIndex:2,transition:"top 0.03s linear"}}/>
        <div style={{position:"relative",zIndex:1,padding:"2rem 2rem 1.8rem",textAlign:"center"}}>
          {/* Maasai shield emoji big */}
          <div style={{fontSize:"4rem",marginBottom:"0.3rem",filter:"drop-shadow(0 0 20px rgba(204,0,0,0.6))",animation:isMashujaa?"swing 2s ease infinite":"none"}}>
            {isMashujaa?"🛡️":"🇰🇪"}
          </div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2rem",color:"#FFFFFF",fontWeight:600,marginBottom:"0.2rem",letterSpacing:"0.02em"}}>
            {holiday.name}
          </div>
          <div style={{fontSize:"0.68rem",letterSpacing:"0.4em",textTransform:"uppercase",color:"#006600",marginBottom:"0.3rem"}}>
            Kenya Public Holiday
          </div>
          {/* Harambee divider */}
          <div style={{display:"flex",alignItems:"center",gap:"0.8rem",margin:"1rem 0"}}>
            <div style={{flex:1,height:"1px",background:"linear-gradient(90deg,transparent,#CC0000)"}}/>
            <span style={{fontSize:"0.65rem",letterSpacing:"0.25em",color:"#CC0000",textTransform:"uppercase"}}>Harambee</span>
            <div style={{flex:1,height:"1px",background:"linear-gradient(90deg,#006600,transparent)"}}/>
          </div>
          {holiday.customMsg
            ? <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.8)",lineHeight:1.7,marginBottom:"1.4rem"}}>{holiday.customMsg}</p>
            : <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.8)",lineHeight:1.7,marginBottom:"1.4rem"}}>
                Celebrate {BRAND.country} in the heart of {BRAND.city}. Book a premium {BRAND.fullName} stay this holiday weekend and enjoy a <strong style={{color:"#FFD700"}}>{holiday.discount}% patriot discount</strong>.
              </p>
          }
          {/* Discount block */}
          <div style={{background:"rgba(0,102,0,0.2)",border:"1px solid rgba(0,102,0,0.5)",borderRadius:"10px",padding:"1.2rem",marginBottom:"1.4rem",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,bottom:0,width:"4px",background:"linear-gradient(180deg,#006600,#CC0000,#000)"}}/>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"3rem",color:"#FFD700",fontWeight:700,lineHeight:1}}>{holiday.discount}%</div>
            <div style={{fontSize:"0.65rem",letterSpacing:"0.25em",color:"rgba(255,255,255,0.6)",textTransform:"uppercase"}}>Holiday Discount</div>
          </div>
          <div style={{display:"flex",gap:"0.7rem"}}>
            <button onClick={onBook} style={{flex:1,padding:"1rem",background:"linear-gradient(135deg,#006600,#004400)",color:"#fff",border:"none",borderRadius:"8px",fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 8px 20px rgba(0,102,0,0.5)"}}>
              {holiday.emoji} Claim Offer
            </button>
            <button onClick={onClose} style={{padding:"1rem 1.4rem",background:"transparent",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"8px",fontSize:"0.82rem",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>✕</button>
          </div>
        </div>
        {/* Flag stripe across bottom */}
        <div style={{display:"flex",height:"8px"}}>
          {["#000000","#FFFFFF","#CC0000","#006600","#CC0000","#FFFFFF","#000000"].map((c,i)=>(
            <div key={i} style={{flex:1,background:c}}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── EID POPUP ─────────────────────────────────────────────────────
function EidPopup({ holiday, onClose, onBook }) {
  const t = holiday.theme;
  const [visible, setVisible] = useState(false);
  const [rotation, setRotation] = useState(0);
  useEffect(()=>{
    setTimeout(()=>setVisible(true),80);
    const iv = setInterval(()=>setRotation(r=>r+0.5),30);
    return ()=>clearInterval(iv);
  },[]);
  const stars = Array.from({length:12},(_,i)=>({ id:i, angle: (i/12)*360, dist:120+Math.random()*30 }));
  return (
    <div style={{position:"fixed",inset:0,zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,10,5,0.94)",backdropFilter:"blur(12px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",width:"min(460px,92vw)",borderRadius:"20px",overflow:"hidden",
        background:"linear-gradient(160deg,#001a0d 0%,#00260f 50%,#0a1500 100%)",
        border:`1px solid ${t.accent}55`,
        boxShadow:`0 0 100px ${t.accent}22, 0 40px 120px rgba(0,0,0,0.9)`,
        animation:visible?"popIn 0.65s cubic-bezier(0.34,1.56,0.64,1) both":"none",
      }}>
        {/* Rotating star field */}
        <div style={{position:"absolute",width:"300px",height:"300px",top:"50%",left:"50%",transform:`translate(-50%,-50%) rotate(${rotation}deg)`,pointerEvents:"none",opacity:0.15}}>
          {stars.map(s=>{
            const rad = (s.angle*Math.PI)/180;
            return <div key={s.id} style={{position:"absolute",left:`${50+Math.cos(rad)*s.dist/3}%`,top:`${50+Math.sin(rad)*s.dist/3}%`,fontSize:"0.6rem",animation:`starTwinkle ${1+Math.random()}s ease infinite ${Math.random()}s`}}>⭐</div>;
          })}
        </div>
        <div style={{position:"relative",zIndex:1,padding:"2.5rem 2rem 2rem",textAlign:"center"}}>
          <div style={{fontSize:"3.5rem",marginBottom:"0.2rem"}}>🌙</div>
          <div style={{fontSize:"0.65rem",letterSpacing:"0.5em",textTransform:"uppercase",color:t.accent2,marginBottom:"0.4rem"}}>Eid Mubarak</div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2.2rem",color:t.accent,fontWeight:600,marginBottom:"0.3rem"}}>
            Blessed Holiday Offer
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:"0.5rem",marginBottom:"1.2rem"}}>
            {"⭐🌟✨⭐🌟".split("").filter(c=>c.trim()).map((e,i)=>(
              <span key={i} style={{animation:`starTwinkle ${1+i*0.2}s ease infinite ${i*0.1}s`,display:"inline-block"}}>{e}</span>
            ))}
          </div>
          {holiday.customMsg
            ? <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.75)",lineHeight:1.7,marginBottom:"1.4rem"}}>{holiday.customMsg}</p>
            : <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.75)",lineHeight:1.7,marginBottom:"1.4rem"}}>
                Celebrate Eid with loved ones in a beautiful {BRAND.city} home. Space, comfort, and warmth — ideal for family gatherings. Enjoy <strong style={{color:t.accent}}>{holiday.discount}% off</strong> this Eid season.
              </p>
          }
          <div style={{
            position:"relative",borderRadius:"12px",padding:"1.2rem 1.5rem",marginBottom:"1.4rem",
            background:`linear-gradient(135deg,${t.accent}22,transparent)`,
            border:`1px solid ${t.accent}44`,
          }}>
            <div style={{position:"absolute",top:"-1px",left:"50%",transform:"translateX(-50%)",padding:"0.15rem 1rem",background:`linear-gradient(135deg,${t.accent},${t.accent2})`,borderRadius:"0 0 8px 8px",fontSize:"0.6rem",fontWeight:700,color:"#000",letterSpacing:"0.15em",textTransform:"uppercase"}}>Eid Special</div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"3rem",color:t.accent,fontWeight:700,lineHeight:1,marginTop:"0.5rem"}}>{holiday.discount}%</div>
            <div style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.5)",letterSpacing:"0.2em",textTransform:"uppercase"}}>Off your stay</div>
          </div>
          <button onClick={onBook} style={{width:"100%",padding:"1rem",background:`linear-gradient(135deg,${t.accent},#8b7022)`,color:"#000",border:"none",borderRadius:"10px",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",marginBottom:"0.7rem"}}>
            🌙 Book Eid Stay
          </button>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:"0.75rem",cursor:"pointer"}}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── CHRISTMAS POPUP ────────────────────────────────────────────────
function ChristmasPopup({ holiday, onClose, onBook }) {
  const t = holiday.theme;
  const [visible, setVisible] = useState(false);
  const snowflakes = Array.from({length:16},(_,i)=>({ id:i, x:Math.random()*100, delay:Math.random()*3, size:0.8+Math.random()*0.8, dur:3+Math.random()*3 }));
  useEffect(()=>{ setTimeout(()=>setVisible(true),80); },[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,20,0,0.93)",backdropFilter:"blur(10px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",width:"min(460px,92vw)",borderRadius:"20px",overflow:"hidden",
        background:"linear-gradient(160deg,#001400 0%,#002800 60%,#001400 100%)",
        border:`1px solid ${t.accent}44`,
        boxShadow:`0 0 60px rgba(255,51,51,0.2), 0 0 120px rgba(0,100,0,0.2), 0 40px 100px rgba(0,0,0,0.9)`,
        animation:visible?"slideInLeft 0.5s cubic-bezier(0.22,1,0.36,1) both":"none",
      }}>
        {/* Snowflakes */}
        <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
          {snowflakes.map(s=>(
            <div key={s.id} style={{position:"absolute",left:`${s.x}%`,top:"-10px",fontSize:`${s.size}rem`,color:"#fff",opacity:0.4,animation:`confettiFall ${s.dur}s linear ${s.delay}s infinite`}}>❄️</div>
          ))}
        </div>
        <div style={{position:"relative",zIndex:1,padding:"2.5rem 2rem 2rem",textAlign:"center"}}>
          <div style={{fontSize:"3.5rem",marginBottom:"0.2rem",filter:"drop-shadow(0 0 15px rgba(255,215,0,0.6))"}}>🎄</div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2.3rem",color:"#FFFFFF",fontWeight:600,marginBottom:"0.2rem"}}>
            Season&apos;s Greetings
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",marginBottom:"1.2rem"}}>
            <div style={{flex:1,height:"1px",background:"linear-gradient(90deg,transparent,#FF3333)"}}/>
            <span style={{fontSize:"0.65rem",letterSpacing:"0.3em",color:t.accent2,textTransform:"uppercase"}}>Christmas Special</span>
            <div style={{flex:1,height:"1px",background:"linear-gradient(90deg,#006600,transparent)"}}/>
          </div>
          {holiday.customMsg
            ? <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.8)",lineHeight:1.7,marginBottom:"1.4rem"}}>{holiday.customMsg}</p>
            : <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.8)",lineHeight:1.7,marginBottom:"1.4rem"}}>
                Spend Christmas in a beautiful {BRAND.city} home. Fireplace evenings, family dinners, and festive memories — all at <strong style={{color:t.accent2}}>{holiday.discount}% off</strong>.
              </p>
          }
          {/* Ornament discount display */}
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"1.5rem",marginBottom:"1.5rem"}}>
            <div style={{fontSize:"1.5rem",animation:"swing 1.5s ease infinite"}}>🎁</div>
            <div style={{
              width:"110px",height:"110px",borderRadius:"50%",
              background:"radial-gradient(circle at 35% 35%,#FF6666,#CC0000)",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              boxShadow:"0 0 0 3px #FFD700, 0 0 30px rgba(204,0,0,0.5)",
              border:"4px solid #FFD700",
            }}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2.2rem",color:"#fff",lineHeight:1,fontWeight:700}}>{holiday.discount}%</div>
              <div style={{fontSize:"0.55rem",color:"rgba(255,255,255,0.7)",letterSpacing:"0.2em",textTransform:"uppercase"}}>off</div>
            </div>
            <div style={{fontSize:"1.5rem",animation:"swing 1.5s ease 0.5s infinite"}}>🎄</div>
          </div>
          <button onClick={onBook} style={{width:"100%",padding:"1rem",background:"linear-gradient(135deg,#CC0000,#880000)",color:"#fff",border:"2px solid #FFD700",borderRadius:"10px",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",marginBottom:"0.7rem",boxShadow:"0 8px 24px rgba(204,0,0,0.4)"}}>
            🎅 Book Christmas Stay
          </button>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:"0.75rem",cursor:"pointer"}}>No thanks</button>
        </div>
      </div>
    </div>
  );
}

// ── GENERIC / EASTER / LABOUR POPUP ───────────────────────────────
function GenericHolidayPopup({ holiday, onClose, onBook }) {
  const t = holiday.theme;
  const [visible, setVisible] = useState(false);
  const particles = t.particles ? t.particles.split("").filter(c=>c.trim()) : ["🎊","✨"];
  useEffect(()=>{ setTimeout(()=>setVisible(true),80); },[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.88)",backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",width:"min(460px,92vw)",borderRadius:"16px",overflow:"hidden",
        background:`linear-gradient(160deg,${t.bg} 0%,${t.bg}dd 100%)`,
        border:`1px solid ${t.accent}44`,
        boxShadow:`0 0 60px ${t.accent}22, 0 40px 100px rgba(0,0,0,0.8)`,
        animation:visible?"popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both":"none",
      }}>
        <Confetti count={16} colors={[t.accent,t.accent2,"#fff"]}/>
        {/* Diagonal accent bar */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:"4px",background:`linear-gradient(90deg,${t.accent},${t.accent2},${t.accent})`}}/>
        <div style={{position:"relative",zIndex:1,padding:"2.5rem 2rem 2rem",textAlign:"center"}}>
          <div style={{fontSize:"3.5rem",marginBottom:"0.3rem",filter:`drop-shadow(0 0 20px ${t.accent}88)`}}>{holiday.emoji}</div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2rem",color:t.accent,fontWeight:600,marginBottom:"0.3rem"}}>
            {holiday.name}
          </div>
          <div style={{fontSize:"0.65rem",letterSpacing:"0.35em",textTransform:"uppercase",color:t.accent2,marginBottom:"1.2rem"}}>
            Holiday Special Offer
          </div>
          {holiday.customMsg
            ? <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.75)",lineHeight:1.7,marginBottom:"1.4rem"}}>{holiday.customMsg}</p>
            : <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.75)",lineHeight:1.7,marginBottom:"1.4rem"}}>
                Celebrate {holiday.name} with a premium {BRAND.city} stay. Enjoy <strong style={{color:t.accent}}>{holiday.discount}% off</strong> all listings this holiday season.
              </p>
          }
          <div style={{
            background:`${t.accent}18`,border:`1px solid ${t.accent}44`,borderRadius:"12px",
            padding:"1.2rem 1.5rem",marginBottom:"1.4rem",
          }}>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"3rem",color:t.accent,fontWeight:700,lineHeight:1}}>{holiday.discount}%</div>
            <div style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.5)",letterSpacing:"0.2em",textTransform:"uppercase",marginTop:"0.2rem"}}>Off your booking</div>
          </div>
          <button onClick={onBook} style={{width:"100%",padding:"1rem",background:`linear-gradient(135deg,${t.accent},${t.accent2})`,color:"#000",border:"none",borderRadius:"8px",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",marginBottom:"0.7rem"}}>
            {holiday.emoji} Claim Holiday Deal
          </button>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.35)",fontSize:"0.75rem",cursor:"pointer"}}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}

// ── POPUP DISPATCHER ───────────────────────────────────────────────
function HolidayPopup({ holiday, onClose, onBook }) {
  if (!holiday) return null;
  const props = { holiday, onClose, onBook };
  switch(holiday.theme?.bg) {
    case HOLIDAY_THEMES.new_year.bg:    return <NewYearPopup {...props}/>;
    case HOLIDAY_THEMES.valentines.bg:  return <ValentinesPopup {...props}/>;
    case HOLIDAY_THEMES.christmas.bg:   return <ChristmasPopup {...props}/>;
    case HOLIDAY_THEMES.kenya.bg:
    case HOLIDAY_THEMES.mashujaa.bg:    return <KenyaDayPopup {...props}/>;
    case HOLIDAY_THEMES.eid.bg:         return <EidPopup {...props}/>;
    default:                            return <GenericHolidayPopup {...props}/>;
  }
}

// ── PROMO BANNER (slim persistent strip) ──────────────────────────
function PromoBanner({ holiday, onOpen }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(()=>{ setTimeout(()=>setVisible(true),2000); },[]);
  if (!holiday || dismissed) return null;
  const t = holiday.theme;
  return (
    <div style={{
      position:"fixed",bottom:0,left:0,right:0,zIndex:8000,
      background:`linear-gradient(90deg,${t.bg},${t.accent}33,${t.bg})`,
      borderTop:`2px solid ${t.accent}88`,
      padding:"0.7rem 1.5rem",
      display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem",
      transform:visible?"translateY(0)":"translateY(100%)",
      transition:"transform 0.5s cubic-bezier(0.22,1,0.36,1)",
      backdropFilter:"blur(10px)",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:"0.8rem",flexShrink:0}}>
        <span style={{fontSize:"1.2rem",animation:"heartBeat 2s ease infinite"}}>{holiday.emoji}</span>
        <div>
          <span style={{fontSize:"0.78rem",fontWeight:700,color:t.accent,letterSpacing:"0.05em"}}>{holiday.name}: </span>
          <span style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.8)"}}>
            {holiday.discount}% off all stays
          </span>
        </div>
      </div>
      <div style={{display:"flex",gap:"0.6rem",alignItems:"center",flexShrink:0}}>
        <button onClick={onOpen} style={{padding:"0.4rem 1rem",background:t.accent,color:"#000",border:"none",borderRadius:"4px",fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer"}}>
          View Deal
        </button>
        <button onClick={()=>setDismissed(true)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:"1rem",lineHeight:1}}>✕</button>
      </div>
    </div>
  );
}

// ── ADMIN: PROMOS MANAGER ──────────────────────────────────────────
function PromosManager({ promoConfig, onSave }) {
  const [local, setLocal] = useState(()=>{
    const base = {};
    KENYA_HOLIDAYS.forEach(h=>{ base[h.id] = { discount: h.defaultDiscount, disabled:false, message:"", ...(promoConfig[h.id]||{}) }; });
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (id, field, val) => setLocal(prev=>({ ...prev, [id]:{ ...prev[id], [field]:val }}));

  const handleSave = async () => {
    setSaving(true);
    await onSave(local);
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),2500);
  };

  return (
    <div>
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:"0.65rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.gold,marginBottom:"0.4rem"}}>Promotions</div>
        <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.cream,fontWeight:400}}>Holiday & Promo Manager</h2>
        <p style={{fontSize:"0.85rem",color:C.muted,marginTop:"0.5rem",lineHeight:1.6}}>Configure discounts and messages for Kenya public holidays. Popups auto-appear on your site in the days leading up to each holiday.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,380px),1fr))",gap:"1rem"}}>
        {KENYA_HOLIDAYS.map(h=>{
          const cfg = local[h.id] || {};
          const theme = HOLIDAY_THEMES[h.theme] || HOLIDAY_THEMES.kenya;
          const isActive = (()=>{
            const now = new Date(); const hDate = new Date(now.getFullYear(),h.month-1,h.day);
            const diff = Math.ceil((hDate-now)/(1000*60*60*24));
            return diff>=0 && diff<=h.daysAhead;
          })();
          return (
            <div key={h.id} style={{
              background:"#fff",border:`1px solid ${isActive?theme.accent+"66":C.border}`,
              borderRadius:"10px",overflow:"hidden",
              boxShadow:isActive?`0 4px 20px ${theme.accent}22`:"0 2px 8px rgba(14,43,31,0.05)",
              transition:"all 0.2s",
            }}>
              {/* Holiday header bar */}
              <div style={{
                padding:"0.9rem 1.2rem",
                background:isActive?`linear-gradient(135deg,${theme.bg},${theme.accent}22)`:"#F7F2EA",
                borderBottom:`1px solid ${C.border}`,
                display:"flex",alignItems:"center",justifyContent:"space-between",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:"0.7rem"}}>
                  <span style={{fontSize:"1.4rem"}}>{h.emoji}</span>
                  <div>
                    <div style={{fontWeight:600,color:isActive?theme.accent:"#1A1A2E",fontSize:"0.9rem"}}>{h.name}</div>
                    <div style={{fontSize:"0.65rem",color:C.muted}}>
                      {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][h.month-1]} {h.day} · {h.daysAhead}d window
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
                  {isActive&&<span style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.1em",padding:"0.15rem 0.5rem",background:theme.accent+"33",color:theme.accent,border:`1px solid ${theme.accent}55`,borderRadius:"3px",textTransform:"uppercase"}}>Active Now</span>}
                  {/* Toggle */}
                  <button onClick={()=>update(h.id,"disabled",!cfg.disabled)}
                    style={{width:"38px",height:"20px",borderRadius:"10px",border:"none",cursor:"pointer",
                      background:cfg.disabled?"#ddd":"#16A34A",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                    <div style={{position:"absolute",top:"2px",left:cfg.disabled?"2px":"20px",width:"16px",height:"16px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.25)"}}/>
                  </button>
                </div>
              </div>

              {!cfg.disabled && (
                <div style={{padding:"1rem 1.2rem",display:"flex",flexDirection:"column",gap:"0.8rem"}}>
                  {/* Discount */}
                  <div>
                    <label style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.4rem"}}>
                      <span style={{fontSize:"0.7rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted}}>Discount %</span>
                      <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.gold,fontWeight:600}}>{cfg.discount}%</span>
                    </label>
                    <input type="range" min="5" max="50" value={cfg.discount||h.defaultDiscount}
                      onChange={e=>update(h.id,"discount",Number(e.target.value))}
                      style={{width:"100%",accentColor:C.gold}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.62rem",color:C.muted,marginTop:"0.2rem"}}>
                      <span>5%</span><span>50%</span>
                    </div>
                  </div>
                  {/* Custom message */}
                  <div>
                    <label style={{fontSize:"0.7rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,display:"block",marginBottom:"0.4rem"}}>Custom Message (optional)</label>
                    <textarea value={cfg.message||""} onChange={e=>update(h.id,"message",e.target.value)}
                      placeholder={`Leave blank to use default ${h.name} message…`}
                      rows={2}
                      style={{width:"100%",padding:"0.6rem 0.8rem",border:`1px solid ${C.border}`,borderRadius:"5px",fontSize:"0.8rem",resize:"vertical",fontFamily:"inherit",outline:"none",background:"#FDFAF5",color:"#1C1C1C"}}
                      onFocus={e=>e.target.style.borderColor=C.gold}
                      onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>
                </div>
              )}
              {cfg.disabled && (
                <div style={{padding:"0.8rem 1.2rem",fontSize:"0.78rem",color:C.muted,fontStyle:"italic"}}>Popup disabled for this holiday</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{position:"sticky",bottom:"1rem",marginTop:"2rem",textAlign:"right"}}>
        <button onClick={handleSave} disabled={saving}
          style={{padding:"0.9rem 2.5rem",background:saved?"#16A34A":C.gold,color:saved?"#fff":"#1A1A2E",border:"none",borderRadius:"6px",fontWeight:700,fontSize:"0.82rem",letterSpacing:"0.12em",textTransform:"uppercase",cursor:saving?"not-allowed":"pointer",transition:"all 0.3s",boxShadow:"0 4px 16px rgba(197,151,58,0.3)"}}>
          {saving?"Saving…":saved?"✓ Saved!":"Save All Changes"}
        </button>
      </div>
    </div>
  );
}


// ─── UPCOMING HOLIDAYS PROMO SECTION ─────────────────────────────
// Research-backed windows: urgency peaks 14-21 days out, early birds
// book 30-60 days out for major holidays (Jamhuri, Christmas, NYE).
// Impulse bookings cluster 3-7 days before short holidays (Labour, Huduma).
function getUpcomingHolidays(promoConfig, count=6) {
  const now = new Date();
  const results = [];

  // Check both this year and next year to handle year-wrap
  for (const h of KENYA_HOLIDAYS) {
    for (const yearOffset of [0, 1]) {
      const hDate = new Date(now.getFullYear() + yearOffset, h.month - 1, h.day);
      const daysUntil = Math.ceil((hDate - now) / (1000*60*60*24));

      // Show holidays 3 to 90 days away (sweet spot per booking research)
      if (daysUntil < 3 || daysUntil > 90) continue;

      const cfg = promoConfig?.[h.id] || {};
      if (cfg.disabled) continue;

      const discount = cfg.discount ?? h.defaultDiscount;
      const theme = HOLIDAY_THEMES[h.theme] || HOLIDAY_THEMES.kenya;

      // Urgency tiers (drives copy + visual treatment)
      let urgency = "plan";        // 30-90 days
      if (daysUntil <= 7)  urgency = "urgent";  // last week
      else if (daysUntil <= 14) urgency = "soon";    // 1-2 weeks
      else if (daysUntil <= 21) urgency = "coming";  // 3 weeks

      results.push({ ...h, discount, theme, daysUntil, urgency, hDate, customMsg: cfg.message || "" });
    }
  }

  // Sort by proximity, deduplicate by id
  const seen = new Set();
  return results
    .sort((a,b) => a.daysUntil - b.daysUntil)
    .filter(h => { if(seen.has(h.id)) return false; seen.add(h.id); return true; })
    .slice(0, count);
}

const URGENCY = {
  urgent: { label:"This Week",   color:"#EF4444", bg:"rgba(239,68,68,0.12)",  border:"rgba(239,68,68,0.3)"  },
  soon:   { label:"Coming Soon", color:"#F59E0B", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.3)" },
  coming: { label:"Mark It",     color:C.gold,    bg:"rgba(197,151,58,0.12)", border:"rgba(197,151,58,0.3)" },
  plan:   { label:"Plan Ahead",  color:C.sage,    bg:"rgba(76,175,125,0.1)",  border:"rgba(76,175,125,0.25)"},
};

function CountdownPips({ days }) {
  // Visual dot-bar countdown — max 30 dots
  const MAX = Math.min(days, 30);
  const filled = Math.max(1, MAX);
  return (
    <div style={{display:"flex",gap:"2px",flexWrap:"wrap",marginTop:"0.5rem"}}>
      {Array.from({length:30}).map((_,i) => (
        <div key={i} style={{
          width:"5px", height:"5px", borderRadius:"50%",
          background: i < filled ? C.gold : "rgba(197,151,58,0.15)",
          transition:"background 0.3s",
        }}/>
      ))}
    </div>
  );
}

// Individual promo card — style varies by position in grid
function UpcomingHolidayCard({ holiday, index, onBook, isHero }) {
  const t = holiday.theme;
  const urg = URGENCY[holiday.urgency];
  const [hovered, setHovered] = useState(false);

  const daysLabel = holiday.daysUntil === 1 ? "Tomorrow!" :
                    holiday.daysUntil <= 7  ? `In ${holiday.daysUntil} days` :
                    holiday.daysUntil <= 14 ? `${holiday.daysUntil} days away` :
                    holiday.daysUntil <= 30 ? `${holiday.daysUntil} days away` :
                    `${Math.round(holiday.daysUntil/7)} weeks away`;

  const urgencyCopy = {
    urgent: ["Last chance rates", "Book before prices rise", "Filling up fast"],
    soon:   ["Early access deal", "Secure your dates now", "Best rooms going"],
    coming: ["Lock in this discount", "Smart early booking", "Best deal window"],
    plan:   ["Plan & save big", "Early bird price", "Most availability"],
  }[holiday.urgency];
  const tagline = urgencyCopy[index % urgencyCopy.length];

  if (isHero) {
    // Large hero card (first item)
    return (
      <div
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        style={{
          position:"relative", borderRadius:"14px", overflow:"hidden",
          background:`linear-gradient(145deg, ${t.bg} 0%, #0a1a0a 100%)`,
          border:`1px solid ${t.accent}44`,
          boxShadow: hovered ? `0 24px 80px ${t.accent}33, 0 0 0 1px ${t.accent}55` : `0 8px 32px rgba(0,0,0,0.3)`,
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
          transition:"all 0.35s cubic-bezier(0.22,1,0.36,1)",
          cursor:"pointer", gridColumn:"1 / -1",
        }}
        onClick={onBook}
      >
        {/* Animated gradient shimmer */}
        <div style={{
          position:"absolute", inset:0, opacity: hovered ? 0.18 : 0.08,
          background:`radial-gradient(ellipse at 20% 50%, ${t.accent} 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${t.accent2} 0%, transparent 50%)`,
          transition:"opacity 0.35s",
          pointerEvents:"none",
        }}/>

        {/* Diagonal stripe accent */}
        <div style={{position:"absolute",top:0,right:0,width:"200px",height:"200px",overflow:"hidden",pointerEvents:"none"}}>
          <div style={{position:"absolute",top:"30px",right:"-50px",width:"200px",background:`linear-gradient(135deg,${t.accent},${t.accent2})`,padding:"0.5rem 3rem",fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.25em",textTransform:"uppercase",color:"#000",transform:"rotate(35deg)",whiteSpace:"nowrap"}}>
            {holiday.discount}% OFF
          </div>
        </div>

        <div style={{position:"relative",zIndex:1,padding:"2.5rem 2.5rem 2rem",display:"grid",gridTemplateColumns:"1fr auto",gap:"2rem",alignItems:"center"}}>
          <div>
            {/* Urgency badge */}
            <div style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.25rem 0.75rem",background:urg.bg,border:`1px solid ${urg.border}`,borderRadius:"20px",marginBottom:"1rem"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:urg.color,animation:"glowPulse 1.5s ease infinite"}}/>
              <span style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:urg.color}}>{urg.label} · {daysLabel}</span>
            </div>

            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(1.6rem,3vw,2.4rem)",color:"#fff",fontWeight:600,lineHeight:1.1,marginBottom:"0.6rem"}}>
              {holiday.emoji} {holiday.name}
            </div>
            <div style={{fontSize:"0.85rem",color:"rgba(255,255,255,0.6)",marginBottom:"1.2rem",lineHeight:1.6}}>
              {holiday.customMsg || `${tagline} — enjoy ${holiday.discount}% off all ${BRAND.fullName} listings for ${holiday.name}.`}
            </div>
            <div style={{display:"flex",gap:"0.7rem",alignItems:"center",flexWrap:"wrap"}}>
              <button onClick={e=>{e.stopPropagation();onBook();}} style={{
                padding:"0.8rem 1.8rem",background:`linear-gradient(135deg,${t.accent},${t.accent2})`,
                color:"#000",border:"none",borderRadius:"6px",fontSize:"0.8rem",fontWeight:700,
                letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",
                boxShadow:`0 8px 24px ${t.accent}44`,transition:"transform 0.15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                Book with {holiday.discount}% Off →
              </button>
              <div style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.4)"}}>
                {holiday.hDate.toLocaleDateString("en-KE",{day:"numeric",month:"long",year:"numeric"})}
              </div>
            </div>
          </div>

          {/* Big discount number */}
          <div style={{textAlign:"center",flexShrink:0}}>
            <div style={{
              fontFamily:"'Fraunces',Georgia,serif",
              fontSize:"clamp(4rem,8vw,6rem)",
              color:t.accent,fontWeight:700,lineHeight:0.9,
              textShadow:`0 0 60px ${t.accent}66`,
              transform: hovered ? "scale(1.06)" : "scale(1)",
              transition:"transform 0.35s",
            }}>{holiday.discount}%</div>
            <div style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.4)",letterSpacing:"0.2em",textTransform:"uppercase",marginTop:"0.3rem"}}>discount</div>
            <CountdownPips days={holiday.daysUntil}/>
          </div>
        </div>
      </div>
    );
  }

  // Regular grid card
  return (
    <div
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      onClick={onBook}
      style={{
        position:"relative",borderRadius:"12px",overflow:"hidden",cursor:"pointer",
        background:"#fff",
        border:`1px solid ${hovered ? t.accent+"88" : C.border}`,
        boxShadow: hovered ? `0 12px 40px ${t.accent}22, 0 0 0 1px ${t.accent}44` : "0 2px 12px rgba(14,43,31,0.06)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition:"all 0.3s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Coloured top bar with gradient */}
      <div style={{height:"5px",background:`linear-gradient(90deg,${t.accent},${t.accent2},${t.accent})`}}/>

      {/* Dark header with emoji */}
      <div style={{
        background:`linear-gradient(135deg,${t.bg} 0%,${t.bg}cc 100%)`,
        padding:"1.4rem 1.2rem 1.2rem",
        position:"relative",overflow:"hidden",
        minHeight:"90px",display:"flex",alignItems:"center",gap:"1rem",
      }}>
        <div style={{position:"absolute",right:"-10px",bottom:"-10px",fontSize:"4rem",opacity:0.12,transform:"rotate(-10deg)",userSelect:"none"}}>{holiday.emoji}</div>
        <div style={{fontSize:"2.2rem",filter:`drop-shadow(0 0 12px ${t.accent}88)`,flexShrink:0}}>{holiday.emoji}</div>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:"#fff",fontWeight:500,lineHeight:1.2}}>{holiday.name}</div>
          <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.5)",marginTop:"0.2rem"}}>
            {holiday.hDate.toLocaleDateString("en-KE",{day:"numeric",month:"long"})}
          </div>
        </div>
        {/* Discount badge top-right */}
        <div style={{
          position:"absolute",top:"0.8rem",right:"0.8rem",
          background:`linear-gradient(135deg,${t.accent},${t.accent2})`,
          borderRadius:"20px",padding:"0.2rem 0.65rem",
          fontSize:"0.72rem",fontWeight:700,color:"#000",
          boxShadow:`0 4px 12px ${t.accent}44`,
        }}>{holiday.discount}% off</div>
      </div>

      <div style={{padding:"1rem 1.2rem 1.2rem"}}>
        {/* Urgency row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.7rem"}}>
          <span style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:urg.color,padding:"0.15rem 0.5rem",background:urg.bg,border:`1px solid ${urg.border}`,borderRadius:"3px"}}>
            {urg.label}
          </span>
          <span style={{fontSize:"0.75rem",color:C.muted,fontWeight:500}}>{daysLabel}</span>
        </div>

        <div style={{fontSize:"0.8rem",color:C.muted,lineHeight:1.6,marginBottom:"0.9rem"}}>
          {holiday.customMsg || tagline}
        </div>

        <CountdownPips days={holiday.daysUntil}/>

        <button
          onClick={e=>{e.stopPropagation();onBook();}}
          style={{
            width:"100%",marginTop:"0.9rem",padding:"0.7rem",
            background: hovered ? `linear-gradient(135deg,${t.accent},${t.accent2})` : "transparent",
            color: hovered ? "#000" : t.accent,
            border:`1px solid ${t.accent}66`,borderRadius:"5px",
            fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",
            cursor:"pointer",transition:"all 0.25s",
          }}
        >
          {hovered ? `Book Now →` : `View Deal →`}
        </button>
      </div>
    </div>
  );
}

// Marquee ticker strip — for quick-glance awareness
function PromoTicker({ holidays }) {
  if (!holidays.length) return null;
  const items = [...holidays, ...holidays]; // duplicate for seamless loop
  return (
    <div style={{
      background:`linear-gradient(90deg,${C.primary},${C.teal},${C.primary})`,
      borderTop:`1px solid rgba(197,151,58,0.2)`,
      borderBottom:`1px solid rgba(197,151,58,0.2)`,
      overflow:"hidden",padding:"0.55rem 0",
    }}>
      <div style={{display:"flex",gap:"0",animation:"tickerScroll 30s linear infinite",width:"max-content"}}>
        {items.map((h,i) => (
          <div key={i} style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0 2.5rem",borderRight:"1px solid rgba(197,151,58,0.15)",flexShrink:0}}>
            <span style={{fontSize:"0.9rem"}}>{h.emoji}</span>
            <span style={{fontSize:"0.7rem",fontWeight:600,color:h.theme.accent,letterSpacing:"0.05em"}}>{h.name}</span>
            <span style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.5)"}}>·</span>
            <span style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.7)"}}>{h.discount}% off</span>
            <span style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.35)"}}>·</span>
            <span style={{fontSize:"0.67rem",color:"rgba(255,255,255,0.45)"}}>
              {h.daysUntil <= 7 ? `${h.daysUntil}d left` : h.daysUntil <= 30 ? `${h.daysUntil} days` : `${Math.round(h.daysUntil/7)}w away`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Full upcoming promos section — injected into HomePage
function UpcomingPromosSection({ promoConfig, onNavigate, listings, onSelectWithHoliday }) {
  const upcoming = getUpcomingHolidays(promoConfig, 6);
  if (!upcoming.length) return null;

  const hero = upcoming[0];
  const rest = upcoming.slice(1);

  // Pick first available listing to send user to, carrying the holiday discount
  const goBook = (holiday) => {
    const target = listings && listings.find(l=>l.available);
    if(target && onSelectWithHoliday) {
      onSelectWithHoliday(target, holiday);
    } else {
      onNavigate("listings");
    }
  };

  return (
    <section style={{padding:"5rem 1.5rem",background:"linear-gradient(180deg,#F7F2EA 0%,#FDFAF5 100%)",position:"relative",overflow:"hidden"}}>
      {/* Subtle background pattern */}
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 1px 1px, rgba(197,151,58,0.08) 1px, transparent 0)",backgroundSize:"32px 32px",pointerEvents:"none"}}/>

      <div style={{maxWidth:"1200px",margin:"0 auto",position:"relative"}}>
        {/* Section header */}
        <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:"0.7rem",marginBottom:"0.9rem"}}>
            <div style={{width:"32px",height:"1px",background:C.gold}}/>
            <div style={{fontSize:"0.65rem",letterSpacing:"0.4em",textTransform:"uppercase",color:C.gold}}>Holiday Deals</div>
            <div style={{width:"32px",height:"1px",background:C.gold}}/>
          </div>
          <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(1.9rem,4vw,3rem)",color:C.cream,fontWeight:400,marginBottom:"0.7rem"}}>
            Upcoming <em style={{color:C.gold,fontStyle:"italic"}}>Offers</em> & Holidays
          </h2>
          <p style={{fontSize:"0.9rem",color:C.muted,maxWidth:"480px",margin:"0 auto",lineHeight:1.8}}>
            Kenya's public holidays are the best time to book — lock in exclusive rates before they fill up.
          </p>
        </div>

        {/* Hero card full-width */}
        <div style={{marginBottom:"1.2rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr"}}>
            <UpcomingHolidayCard holiday={hero} index={0} isHero={true} onBook={()=>goBook(hero)}/>
          </div>
        </div>

        {/* Rest in responsive grid */}
        {rest.length > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,300px),1fr))",gap:"1rem",marginBottom:"2.5rem"}}>
            {rest.map((h,i) => (
              <UpcomingHolidayCard key={h.id} holiday={h} index={i} isHero={false} onBook={()=>goBook(h)}/>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{textAlign:"center",marginTop:"2rem"}}>
          <button onClick={()=>onNavigate("listings")}
            style={{background:"transparent",color:C.gold,border:`1px solid rgba(197,151,58,0.4)`,padding:"0.9rem 2.5rem",fontSize:"0.78rem",fontWeight:600,letterSpacing:"0.2em",textTransform:"uppercase",borderRadius:"4px",cursor:"pointer",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=C.goldDim;e.currentTarget.style.borderColor=C.gold;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="rgba(197,151,58,0.4)";}}>
            Browse All Listings →
          </button>
        </div>
      </div>
    </section>
  );
}


// ─── SITE CONTENT (About & Contact) ──────────────────────────────
const DEFAULT_SITE_CONTENT = {
  // Contact
  whatsapp: BRAND.whatsapp,
  whatsappDisplay: BRAND.whatsappDisplay,
  email: BRAND.email,
  phone: BRAND.phone,
  location: `${BRAND.city}, ${BRAND.country}`,
  responseTime: "Within 1 hour",
  // About
  aboutHeroTitle: `Redefining the ${BRAND.city} stay`,
  aboutHeroSubtitle: "Our Story",
  aboutHeroImage: "https://images.unsplash.com/photo-1580139861541-0f79bb4e9b30?w=1600&q=80",
  aboutParagraphs: [
    `${BRAND.fullName} was born from a simple belief: visitors to ${BRAND.city} deserve more than a generic hotel room. They deserve a home — one with character, comfort, and a genuine sense of place.`,
    "We curate each property personally, inspecting for quality of furniture, internet reliability, security, and that indefinable sense of \"this just feels right\".",
    "Whether you're a solo professional on a two-week contract, a family relocating between schools, or a couple celebrating an anniversary — we have a space that will feel like yours from the moment you walk in.",
    `${BRAND.city} is extraordinary. We think your stay should be too.`,
  ],
  statFounded: "2020",
  statGuests: "440+",
  statRating: "4.95",
};

// Any brand names a previous deployment may have baked into editable content.
// Kept here so a rename cleanly propagates through host-edited site copy.
const STALE_BRAND_NAMES = ["MARKNEXX Homes","MARKNEXX","Marknexx","marknexx","Bridge Homes","Bridge"];
function scrubBrand(value) {
  if (typeof value === "string") {
    let out = value;
    for (const stale of STALE_BRAND_NAMES) out = out.split(stale).join(BRAND.fullName);
    // Correct the earlier contact-email typo if it was saved into content.
    out = out.split("ireneonsarigo@gmail.com").join("ireneonsarigo85@gmail.com");
    return out;
  }
  if (Array.isArray(value)) return value.map(scrubBrand);
  if (value && typeof value === "object") {
    const o = {};
    for (const k of Object.keys(value)) o[k] = scrubBrand(value[k]);
    return o;
  }
  return value;
}

async function loadSiteContent() {
  try {
    const { data, error } = await supabase
      .from("kv_store").select("value").eq("key",`${BRAND.slug}:site_content`).single();
    if (error || !data) return DEFAULT_SITE_CONTENT;
    const stored = JSON.parse(data.value);
    const cleaned = scrubBrand(stored);
    // If scrubbing changed anything, persist the correction once so it sticks.
    if (JSON.stringify(cleaned) !== JSON.stringify(stored)) {
      supabase.from("kv_store").upsert(
        { key:`${BRAND.slug}:site_content`, value:JSON.stringify(cleaned) }, { onConflict:"key" }
      ).then(()=>{}, ()=>{});
    }
    return { ...DEFAULT_SITE_CONTENT, ...cleaned };
  } catch { return DEFAULT_SITE_CONTENT; }
}

async function saveSiteContent(d) {
  const { error } = await supabase.from("kv_store").upsert(
    { key:`${BRAND.slug}:site_content`, value:JSON.stringify(d) }, { onConflict:"key" }
  );
  if (error) console.error("[Supabase] saveSiteContent:", error.message);
}


// ─── ADMIN: SITE CONTENT MANAGER ─────────────────────────────────
function SiteContentManager({ siteContent, onSave }) {
  const [draft, setDraft] = useState(() => ({
    ...DEFAULT_SITE_CONTENT, ...(siteContent || {})
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [tab, setTab]       = useState("contact"); // "contact" | "about" | "branding"

  // Sync if parent siteContent changes (e.g. loaded async)
  useEffect(() => {
    if (siteContent) setDraft(d => ({ ...d, ...siteContent }));
  }, [siteContent]);

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const setParagraph = (i, val) => {
    const paras = [...(draft.aboutParagraphs || DEFAULT_SITE_CONTENT.aboutParagraphs)];
    paras[i] = val;
    set("aboutParagraphs", paras);
  };
  const addParagraph    = () => set("aboutParagraphs", [...(draft.aboutParagraphs||[]), ""]);
  const removeParagraph = (i) => set("aboutParagraphs", (draft.aboutParagraphs||[]).filter((_,idx)=>idx!==i));

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const F = ({ label, children, hint }) => (
    <div style={{marginBottom:"1.1rem"}}>
      <label style={{display:"block",fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.4rem"}}>{label}</label>
      {children}
      {hint && <div style={{fontSize:"0.68rem",color:C.muted,marginTop:"0.3rem"}}>{hint}</div>}
    </div>
  );

  const inp = {
    width:"100%",padding:"0.75rem 0.9rem",border:`1px solid ${C.border}`,borderRadius:"5px",
    fontSize:"0.88rem",background:"#fff",color:"#1C1C1C",outline:"none",transition:"border-color 0.2s",
  };

  return (
    <div>
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:"0.65rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.gold,marginBottom:"0.4rem"}}>Site Content</div>
        <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.cream,fontWeight:400}}>About & Contact</h2>
        <p style={{fontSize:"0.85rem",color:C.muted,marginTop:"0.4rem"}}>Changes are saved to the database and appear live on the site immediately.</p>
      </div>

      {/* Tab switcher */}
      <div style={{display:"flex",gap:"0",marginBottom:"2rem",border:`1px solid ${C.border}`,borderRadius:"6px",overflow:"hidden",maxWidth:"520px"}}>
        {[{id:"contact",icon:"📞",label:"Contact"},{id:"about",icon:"📖",label:"About"},{id:"branding",icon:"🎨",label:"Branding"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"0.75rem 0.8rem",background:tab===t.id?C.primary:"transparent",color:tab===t.id?"#fff":C.muted,border:"none",cursor:"pointer",fontSize:"0.75rem",fontWeight:tab===t.id?700:400,letterSpacing:"0.06em",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.35rem"}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTACT TAB ── */}
      {tab==="contact"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,420px),1fr))",gap:"1.5rem"}}>

          {/* WhatsApp */}
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1.2rem"}}>
              <span style={{fontSize:"1.4rem"}}>📱</span>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.05rem",color:C.cream,fontWeight:500}}>WhatsApp</div>
            </div>
            <F label="Number (digits only, with country code)" hint="e.g. 254745802200 — used for wa.me links">
              <input value={draft.whatsapp||""} onChange={e=>set("whatsapp",e.target.value.replace(/\D/g,""))}
                placeholder="254745802200" style={inp}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
            </F>
            <F label="Display format" hint="Shown to visitors">
              <input value={draft.whatsappDisplay||""} onChange={e=>set("whatsappDisplay",e.target.value)}
                placeholder="+254 745 802 200" style={inp}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
            </F>
          </div>

          {/* Email & Phone */}
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1.2rem"}}>
              <span style={{fontSize:"1.4rem"}}>✉️</span>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.05rem",color:C.cream,fontWeight:500}}>Email & Phone</div>
            </div>
            <F label="Email address">
              <input value={draft.email||""} onChange={e=>set("email",e.target.value)}
                placeholder={BRAND.email} type="email" style={inp}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
            </F>
            <F label="Phone number (displayed + tel: link)">
              <input value={draft.phone||""} onChange={e=>set("phone",e.target.value)}
                placeholder="+254 745 802 200" style={inp}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
            </F>
          </div>

          {/* Location & Response */}
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1.2rem"}}>
              <span style={{fontSize:"1.4rem"}}>◎</span>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.05rem",color:C.cream,fontWeight:500}}>Location & Response</div>
            </div>
            <F label="Location (shown on contact page)">
              <input value={draft.location||""} onChange={e=>set("location",e.target.value)}
                placeholder={`${BRAND.city}, ${BRAND.country}`} style={inp}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
            </F>
            <F label="Response time">
              <input value={draft.responseTime||""} onChange={e=>set("responseTime",e.target.value)}
                placeholder="Within 1 hour" style={inp}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
            </F>
          </div>

          {/* Live preview */}
          <div style={{background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
            <div style={{fontSize:"0.65rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.gold,marginBottom:"1rem",fontWeight:600}}>Live Preview</div>
            {[
              {icon:"📱",label:"WhatsApp",val:draft.whatsappDisplay||draft.whatsapp,link:`https://wa.me/${draft.whatsapp}`},
              {icon:"✉️",label:"Email",val:draft.email,link:`mailto:${draft.email}`},
              {icon:"📞",label:"Phone",val:draft.phone},
              {icon:"◎",label:"Location",val:draft.location},
              {icon:"⏰",label:"Response",val:draft.responseTime},
            ].filter(i=>i.val).map(i=>(
              <div key={i.label} style={{display:"flex",gap:"0.7rem",alignItems:"flex-start",padding:"0.55rem 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:"0.9rem",flexShrink:0,marginTop:"0.05rem"}}>{i.icon}</span>
                <div>
                  <div style={{fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted}}>{i.label}</div>
                  <div style={{fontSize:"0.83rem",color:i.link?C.gold:"#1C1C1C",fontWeight:i.link?500:400,wordBreak:"break-all"}}>{i.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ABOUT TAB ── */}
      {tab==="about"&&(
        <div style={{display:"grid",gap:"1.5rem"}}>

          {/* Hero */}
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.05rem",color:C.cream,marginBottom:"1.2rem",fontWeight:500}}>Hero Section</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              <F label="Subtitle / eyebrow text">
                <input value={draft.aboutHeroSubtitle||""} onChange={e=>set("aboutHeroSubtitle",e.target.value)}
                  placeholder="Our Story" style={inp}
                  onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
              </F>
              <F label="Hero title">
                <input value={draft.aboutHeroTitle||""} onChange={e=>set("aboutHeroTitle",e.target.value)}
                  placeholder={`Redefining the ${BRAND.city} stay`} style={inp}
                  onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
              </F>
            </div>
            <F label="Hero background image URL" hint="Paste a full image URL — recommended 1600px wide">
              <div style={{display:"flex",gap:"0.6rem"}}>
                <input value={draft.aboutHeroImage||""} onChange={e=>set("aboutHeroImage",e.target.value)}
                  placeholder="https://images.unsplash.com/…" style={{...inp,flex:1}}
                  onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                {draft.aboutHeroImage&&(
                  <div style={{width:"80px",height:"44px",borderRadius:"4px",overflow:"hidden",flexShrink:0,border:`1px solid ${C.border}`}}>
                    <img src={draft.aboutHeroImage} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}
                      onError={e=>e.target.style.display="none"}/>
                  </div>
                )}
              </div>
            </F>
          </div>

          {/* Stats */}
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.05rem",color:C.cream,marginBottom:"1.2rem",fontWeight:500}}>Statistics</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem"}}>
              {[{k:"statFounded",label:"Founded (year)"},{k:"statGuests",label:"Guests hosted"},{k:"statRating",label:"Avg rating"}].map(s=>(
                <F key={s.k} label={s.label}>
                  <input value={draft[s.k]||""} onChange={e=>set(s.k,e.target.value)} style={inp}
                    onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                </F>
              ))}
            </div>
          </div>

          {/* Paragraphs */}
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.2rem"}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.05rem",color:C.cream,fontWeight:500}}>About Text</div>
              <button onClick={addParagraph}
                style={{padding:"0.4rem 0.9rem",background:C.goldDim,border:`1px solid ${C.border}`,borderRadius:"4px",fontSize:"0.72rem",color:C.gold,cursor:"pointer",fontWeight:600,letterSpacing:"0.08em",transition:"all 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                + Add Paragraph
              </button>
            </div>
            {(draft.aboutParagraphs||DEFAULT_SITE_CONTENT.aboutParagraphs).map((p,i)=>(
              <div key={i} style={{marginBottom:"0.9rem",position:"relative"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.3rem"}}>
                  <label style={{fontSize:"0.62rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted}}>Paragraph {i+1}</label>
                  <button onClick={()=>removeParagraph(i)}
                    style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"0.8rem",padding:"0.1rem 0.3rem",transition:"color 0.15s"}}
                    onMouseEnter={e=>e.target.style.color=C.error}
                    onMouseLeave={e=>e.target.style.color=C.muted}>✕</button>
                </div>
                <textarea value={p} onChange={e=>setParagraph(i,e.target.value)} rows={3}
                  style={{...inp,resize:"vertical",lineHeight:1.6,fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=C.gold}
                  onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>
            ))}
          </div>

          {/* Live hero preview */}
          <div style={{borderRadius:"10px",overflow:"hidden",border:`1px solid ${C.border}`,height:"200px",position:"relative"}}>
            <img src={draft.aboutHeroImage} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} onError={e=>e.target.style.display="none"}/>
            <div style={{position:"absolute",inset:0,background:"rgba(14,43,31,0.6)",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"1.5rem 2rem"}}>
              <div style={{fontSize:"0.62rem",letterSpacing:"0.35em",textTransform:"uppercase",color:C.gold,marginBottom:"0.5rem"}}>{draft.aboutHeroSubtitle}</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.6rem",color:"#F7F2EA",fontWeight:400}}>{draft.aboutHeroTitle}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── BRANDING TAB ── */}
      {tab==="branding"&&(
        <div style={{display:"grid",gap:"1.5rem",maxWidth:"560px"}}>
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 2px 8px rgba(26,26,46,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1.2rem"}}>
              <span style={{fontSize:"1.4rem"}}>🏷</span>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.05rem",color:C.cream,fontWeight:500}}>Business Name & Logo</div>
            </div>
            <F label="Display Name" hint="Shown in nav and footer. Leave blank to use default.">
              <input value={draft.displayName||""} onChange={e=>set("displayName",e.target.value)} placeholder={BRAND.fullName} style={inp} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
            </F>
            <F label="Logo Image URL" hint="Paste a direct image link (https://...). Leave blank to use the text logo.">
              <input value={draft.logoUrl||""} onChange={e=>set("logoUrl",e.target.value)} placeholder="https://yoursite.com/logo.png" style={inp} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
            </F>
            {draft.logoUrl&&<div style={{marginTop:"0.5rem",padding:"0.8rem",background:C.ink,borderRadius:"6px",display:"flex",alignItems:"center",gap:"1rem"}}><img src={draft.logoUrl} alt="Preview" style={{height:"36px",objectFit:"contain"}} onError={e=>e.target.style.display="none"}/><span style={{fontSize:"0.72rem",color:C.muted}}>Logo preview</span></div>}
          </div>
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 2px 8px rgba(26,26,46,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1.2rem"}}>
              <span style={{fontSize:"1.4rem"}}>✍️</span>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.05rem",color:C.cream,fontWeight:500}}>Hero Section Text</div>
            </div>
            <F label="Location Badge" hint="Small text above the headline"><input value={draft.heroBadge||""} onChange={e=>set("heroBadge",e.target.value)} placeholder={`${BRAND.city}'s Premier Short Stays`} style={inp} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></F>
            <F label="Headline — first line"><input value={draft.heroLine1||""} onChange={e=>set("heroLine1",e.target.value)} placeholder="Live Like a" style={inp} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></F>
            <F label="Headline — second line (coral italic)"><input value={draft.heroLine2||""} onChange={e=>set("heroLine2",e.target.value)} placeholder="Local Legend" style={inp} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></F>
            <F label="Sub-copy"><textarea value={draft.heroSubcopy||""} onChange={e=>set("heroSubcopy",e.target.value)} placeholder={`Handpicked apartments, studios and villas across ${BRAND.city}'s finest neighbourhoods.`} rows={2} style={{...inp,resize:"vertical"}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></F>
          </div>
          <div style={{padding:"0.8rem 1rem",background:C.tealDim,border:"1px solid rgba(78,205,196,0.25)",borderRadius:"6px",fontSize:"0.76rem",color:"#38B2AC",lineHeight:1.6}}>
            💡 Changes here update the live site immediately. For permanent defaults, edit <code>src/brand.config.js</code> in GitHub.
          </div>
        </div>
      )}

      {/* Save bar */}
      <div style={{position:"sticky",bottom:"1rem",marginTop:"2rem",textAlign:"right"}}>
        <button onClick={handleSave} disabled={saving}
          style={{padding:"0.9rem 2.5rem",background:saved?C.success:C.primary,color:"#fff",border:"none",borderRadius:"6px",fontWeight:700,fontSize:"0.82rem",letterSpacing:"0.12em",textTransform:"uppercase",cursor:saving?"not-allowed":"pointer",transition:"all 0.3s",boxShadow:`0 4px 16px rgba(255,107,107,0.3)`}}>
          {saving?"Saving…":saved?"✓ Saved!":"Save Changes"}
        </button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ─── BRIDGE AI CONCIERGE ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// GROQ: tries the server-side proxy first (/api/groq).
// Falls back to direct Groq call using VITE_GROQ_API_KEY if proxy 404s.
// Add VITE_GROQ_API_KEY to Netlify env vars for the fallback to work.
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY ?? "";

// ── Web Push notifications ────────────────────────────────────────
// VAPID public key — set VITE_VAPID_PUBLIC_KEY in Vercel (same value as the
// server's VAPID_PUBLIC_KEY). Without it, the app still works; push is just
// silently disabled.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Ask permission + subscribe this browser to push, tagged as admin or guest.
// Returns true on success. Safe to call repeatedly (idempotent server-side).
async function enablePushNotifications(role = "guest") {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    if (!VAPID_PUBLIC_KEY) { console.warn("[push] VITE_VAPID_PUBLIC_KEY not set"); return false; }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const res = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub, role }),
    });
    return res.ok;
  } catch (e) {
    console.warn("[push] enable failed:", e);
    return false;
  }
}

// Fire a server-side push to a bucket. Fire-and-forget; never blocks UI.
function sendPushNotification({ role = "admin", title, message, url, tag }) {
  try {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, title, message, url, tag }),
    }).catch(() => {});
  } catch {}
}




// Quick-action suggestion chips
const QUICK_ACTIONS = [
  { icon:"🚗", label:"Book a Bolt/Uber" },
  { icon:"🍔", label:"Order food delivery" },
  { icon:"🦁", label:"Nearby tours & safaris" },
  { icon:"🌃", label:"Best nightlife spots" },
  { icon:"🍽️", label:"Restaurant suggestions" },
  { icon:"🛍️", label:"Shopping malls nearby" },
];

async function callGroqRaw(messages, systemPrompt, opts = {}) {
  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages: systemPrompt ? [{ role:"system", content:systemPrompt }, ...messages] : messages,
    max_tokens: opts.maxTokens ?? 600,
    temperature: opts.temperature ?? 0.75,
    stream: false,
  });

  // 1. Try the server-side Netlify proxy first (key never exposed)
  try {
    const proxyRes = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    // Only use proxy response if it actually responded (not 404/502 from missing function)
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return data.choices[0].message.content;
    }
    // 404 = function not deployed yet, fall through to direct call
    if (proxyRes.status !== 404 && proxyRes.status !== 502) {
      const err = await proxyRes.json().catch(()=>({}));
      throw new Error(err?.error || `Proxy error ${proxyRes.status}`);
    }
  } catch(e) {
    // Network error reaching proxy (e.g. function not deployed) — fall through
    if (!e.message.includes("Proxy error")) {
      // genuinely couldn't reach /api/groq — try direct
    } else {
      throw e;
    }
  }

  // 2. Fallback: call Groq directly using VITE_GROQ_API_KEY env var
  if (!GROQ_API_KEY) {
    throw new Error("AI not configured — add GROQ_API_KEY to your Netlify environment variables (see netlify/functions/groq.js).");
  }
  const directRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body,
  });
  if (!directRes.ok) {
    const err = await directRes.json().catch(()=>({}));
    throw new Error(err?.error?.message || `Groq error ${directRes.status}`);
  }
  const data = await directRes.json();
  return data.choices[0].message.content;
}

async function callGroq(messages) {
  return callGroqRaw(messages, CONCIERGE_SYSTEM_PROMPT, { maxTokens:600, temperature:0.75 });
}

// Render message text — convert markdown-ish links and bold to JSX
function MessageContent({ text }) {
  // Split by newlines first
  const lines = text.split("\n").filter((l, i, arr) => !(l.trim() === "" && arr[i-1]?.trim() === ""));
  return (
    <div>
      {lines.map((line, li) => {
        if (!line.trim()) return <br key={li}/>;
        // Parse inline: **bold**, [text](url), bare https URLs
        const parts = [];
        let remaining = line;
        let ki = 0;
        const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s]+)/g;
        const boldRe = /\*\*(.+?)\*\*/g;
        // First pass: links
        let lastIdx = 0;
        let m;
        linkRe.lastIndex = 0;
        const segments = [];
        while ((m = linkRe.exec(remaining)) !== null) {
          if (m.index > lastIdx) segments.push({ type:"text", v: remaining.slice(lastIdx, m.index) });
          const label = m[1] || m[3];
          const url   = m[2] || m[3];
          segments.push({ type:"link", label, url });
          lastIdx = m.index + m[0].length;
        }
        if (lastIdx < remaining.length) segments.push({ type:"text", v: remaining.slice(lastIdx) });

        const rendered = segments.map((seg, si) => {
          if (seg.type === "link") {
            return (
              <a key={si} href={seg.url} target="_blank" rel="noreferrer"
                style={{color:C.gold,textDecoration:"underline",fontWeight:500,wordBreak:"break-all"}}>
                {seg.label.length > 40 ? seg.label.slice(0,38)+"…" : seg.label}
              </a>
            );
          }
          // bold pass
          const boldParts = [];
          let bl = 0, bm;
          boldRe.lastIndex = 0;
          while ((bm = boldRe.exec(seg.v)) !== null) {
            if (bm.index > bl) boldParts.push(seg.v.slice(bl, bm.index));
            boldParts.push(<strong key={bm.index}>{bm[1]}</strong>);
            bl = bm.index + bm[0].length;
          }
          if (bl < seg.v.length) boldParts.push(seg.v.slice(bl));
          return <span key={si}>{boldParts}</span>;
        });

        return <div key={li} style={{marginBottom: li < lines.length-1 ? "0.4rem" : 0}}>{rendered}</div>;
      })}
    </div>
  );
}

function BridgeConcierge({ listing, siteContent }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showChips, setShowChips] = useState(true);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Greeting on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const neighborhood = listing?.neighborhood || BRAND.city;
      const greeting = `Karibu! 🌟 I'm **${BRAND.conciergeName}**, your ${BRAND.fullName} concierge. I'm here to make your ${BRAND.city} stay unforgettable.

You're in **${neighborhood}** — one of the best spots in the city. I can help you book a **Bolt or Uber**, order **food delivery**, find incredible **restaurants**, plan **tours**, or discover the best **nightlife** nearby.

What can I sort out for you?`;
      setMessages([{ role:"assistant", content: greeting }]);
    }
  }, [open]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    setShowChips(false);
    setError("");

    const newMessages = [...messages, { role:"user", content:userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Inject context about current listing if available
      const ctx = listing
        ? `[Context: Guest is staying at "${listing.name}" in ${listing.neighborhood}, ${BRAND.city}. Coordinates: ${listing.lat||"-1.2921"},${listing.lng||"36.8219"}]\n\n`
        : "";
      const msgsForApi = newMessages.map((m, i) =>
        i === 0 && m.role === "user" ? { ...m, content: ctx + m.content } : m
      );
      const reply = await callGroq(msgsForApi);
      setMessages(prev => [...prev, { role:"assistant", content:reply }]);
    } catch(e) {
      setError(e.message.includes("VITE_GROQ") ? e.message : "Samahani — connection hiccup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Typing indicator dots
  const TypingDots = () => (
    <div style={{display:"flex",gap:"4px",alignItems:"center",padding:"4px 0"}}>
      {[0,1,2].map(i=>(
        <div key={i} style={{width:"7px",height:"7px",borderRadius:"50%",background:C.gold,opacity:0.7,
          animation:`typingDot 1.2s ease infinite`,animationDelay:`${i*0.2}s`}}/>
      ))}
    </div>
  );

  return (
    <>
      {/* ── FAB BUTTON ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Open ${BRAND.name} AI Concierge`}
        style={{
          position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:8500,
          width:"60px", height:"60px", borderRadius:"50%", border:"none",
          background:`linear-gradient(135deg,${C.cream} 0%,${C.primary} 80%,${C.gold} 150%)`,
          boxShadow: open
            ? `0 0 0 3px ${C.gold}55, 0 8px 32px rgba(197,151,58,0.5)`
            : `0 4px 24px rgba(14,43,31,0.5), 0 0 0 1px rgba(197,151,58,0.3)`,
          cursor:"pointer",
          transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          transform: open ? "rotate(45deg) scale(1.05)" : "scale(1)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}
        onMouseEnter={e=>!open&&(e.currentTarget.style.transform="scale(1.12)")}
        onMouseLeave={e=>!open&&(e.currentTarget.style.transform="scale(1)")}
      >
        {open
          ? <span style={{fontSize:"1.4rem",color:"#fff"}}>✕</span>
          : <span style={{fontSize:"1.5rem"}}>✨</span>
        }
      </button>

      {/* Pulse ring when closed */}
      {!open && (
        <div style={{
          position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:8499,
          width:"60px", height:"60px", borderRadius:"50%",
          border:`2px solid ${C.gold}`,
          animation:"conciergeRing 2.5s ease-out infinite",
          pointerEvents:"none",
        }}/>
      )}

      {/* ── CHAT PANEL ── */}
      {open && (
        <div style={{
          position:"fixed", bottom:"5.5rem", right:"1.5rem", zIndex:8500,
          width:"min(420px, calc(100vw - 2rem))",
          height:"min(580px, calc(100vh - 8rem))",
          background:"#fff",
          border:`1px solid ${C.border}`,
          borderRadius:"16px",
          boxShadow:"0 32px 80px rgba(14,43,31,0.25), 0 0 0 1px rgba(197,151,58,0.15)",
          display:"flex", flexDirection:"column",
          overflow:"hidden",
          animation:"conciergeOpen 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        }}>

          {/* Header */}
          <div style={{
            background:`linear-gradient(135deg,${C.cream} 0%,${C.teal} 100%)`,
            padding:"1rem 1.2rem",
            flexShrink:0,
            borderBottom:`1px solid rgba(197,151,58,0.2)`,
            position:"relative",
            overflow:"hidden",
          }}>
            {/* Subtle pattern */}
            <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 2px 2px,rgba(197,151,58,0.06) 1px,transparent 0)",backgroundSize:"24px 24px",pointerEvents:"none"}}/>
            <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:"0.9rem"}}>
              <div style={{
                width:"44px",height:"44px",borderRadius:"50%",flexShrink:0,
                background:`linear-gradient(135deg,${C.gold},#8B6914)`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"1.3rem",
                boxShadow:`0 0 0 2px rgba(197,151,58,0.3), 0 4px 12px rgba(197,151,58,0.3)`,
              }}>✨</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1rem",color:"#F7F2EA",fontWeight:500,letterSpacing:"0.01em"}}>{BRAND.conciergeName}</div>
                <div style={{fontSize:"0.65rem",color:"rgba(247,242,234,0.55)",letterSpacing:"0.15em",textTransform:"uppercase"}}>{BRAND.name} Concierge · {BRAND.city}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
                <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#4CAF7D",animation:"glowPulse 2s ease infinite"}}/>
                <span style={{fontSize:"0.62rem",color:"rgba(247,242,234,0.5)",letterSpacing:"0.1em"}}>Online</span>
              </div>
            </div>
            {listing && (
              <div style={{position:"relative",zIndex:1,marginTop:"0.6rem",padding:"0.4rem 0.7rem",background:"rgba(197,151,58,0.1)",border:"1px solid rgba(197,151,58,0.2)",borderRadius:"4px",fontSize:"0.68rem",color:"rgba(247,242,234,0.65)",display:"flex",alignItems:"center",gap:"0.4rem"}}>
                <span>📍</span>
                <span>{listing.neighborhood}, {BRAND.city}</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{
            flex:1, overflowY:"auto", padding:"1rem",
            display:"flex", flexDirection:"column", gap:"0.8rem",
            background:"#FDFAF5",
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display:"flex",
                flexDirection: m.role==="user" ? "row-reverse" : "row",
                alignItems:"flex-end",
                gap:"0.5rem",
                animation:"fadeUp 0.3s ease both",
              }}>
                {m.role==="assistant" && (
                  <div style={{width:"28px",height:"28px",borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},#8B6914)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem",flexShrink:0}}>✨</div>
                )}
                <div style={{
                  maxWidth:"80%",
                  padding:"0.75rem 1rem",
                  borderRadius: m.role==="user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                  background: m.role==="user"
                    ? `linear-gradient(135deg,${C.primary},${C.teal})`
                    : "#fff",
                  color: m.role==="user" ? "#F7F2EA" : "#1C1C1C",
                  fontSize:"0.85rem",
                  lineHeight:1.6,
                  boxShadow: m.role==="user"
                    ? "0 2px 12px rgba(14,43,31,0.2)"
                    : `0 2px 8px rgba(14,43,31,0.06), 0 0 0 1px ${C.border}`,
                }}>
                  {m.role==="assistant"
                    ? <MessageContent text={m.content}/>
                    : m.content
                  }
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{display:"flex",alignItems:"flex-end",gap:"0.5rem",animation:"fadeUp 0.3s ease"}}>
                <div style={{width:"28px",height:"28px",borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},#8B6914)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem"}}>✨</div>
                <div style={{padding:"0.75rem 1rem",borderRadius:"4px 16px 16px 16px",background:"#fff",border:`1px solid ${C.border}`,boxShadow:"0 2px 8px rgba(14,43,31,0.06)"}}>
                  <TypingDots/>
                </div>
              </div>
            )}

            {error && (
              <div style={{textAlign:"center",fontSize:"0.75rem",color:C.error,padding:"0.5rem 1rem",background:"rgba(224,82,82,0.07)",borderRadius:"6px",border:"1px solid rgba(224,82,82,0.2)"}}>{error}</div>
            )}

            {/* Quick action chips */}
            {showChips && messages.length <= 1 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginTop:"0.4rem"}}>
                {QUICK_ACTIONS.map(a=>(
                  <button key={a.label} onClick={()=>send(a.label)}
                    style={{
                      padding:"0.45rem 0.8rem",background:"#fff",
                      border:`1px solid ${C.border}`,borderRadius:"20px",
                      fontSize:"0.72rem",color:C.cream,cursor:"pointer",
                      display:"flex",alignItems:"center",gap:"0.3rem",
                      transition:"all 0.2s",fontWeight:500,
                      boxShadow:"0 1px 4px rgba(14,43,31,0.06)",
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.background=C.goldDim;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="#fff";}}>
                    <span>{a.icon}</span>{a.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{
            padding:"0.8rem 1rem",
            borderTop:`1px solid ${C.border}`,
            background:"#fff",
            flexShrink:0,
          }}>
            <div style={{display:"flex",gap:"0.6rem",alignItems:"flex-end"}}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Ask me anything about ${BRAND.city}…`}
                rows={1}
                style={{
                  flex:1, padding:"0.7rem 0.9rem",
                  border:`1.5px solid ${C.border}`,
                  borderRadius:"10px", fontSize:"0.85rem",
                  outline:"none", resize:"none", lineHeight:1.5,
                  fontFamily:"inherit", color:"#1C1C1C",
                  background:"#FDFAF5",
                  transition:"border-color 0.2s",
                  maxHeight:"80px", overflowY:"auto",
                }}
                onFocus={e=>e.target.style.borderColor=C.gold}
                onBlur={e=>e.target.style.borderColor=C.border}
                onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,80)+"px";}}
              />
              <button onClick={()=>send()} disabled={!input.trim()||loading}
                style={{
                  width:"40px",height:"40px",borderRadius:"10px",flexShrink:0,
                  background: input.trim()&&!loading ? `linear-gradient(135deg,${C.primary},${C.teal})` : "#E5E7EB",
                  border:"none",cursor:input.trim()&&!loading?"pointer":"default",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"1rem",transition:"all 0.2s",
                  boxShadow:input.trim()&&!loading?"0 4px 12px rgba(14,43,31,0.3)":"none",
                }}>
                {loading
                  ? <div style={{width:"14px",height:"14px",border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                  : <span style={{color:input.trim()?"#fff":"#9CA3AF"}}>↑</span>
                }
              </button>
            </div>
            <div style={{marginTop:"0.45rem",fontSize:"0.6rem",color:C.muted,textAlign:"center",letterSpacing:"0.08em"}}>
              Powered by {BRAND.name} AI · {BRAND.city} concierge
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ─── MY BOOKING PAGE ─────────────────────────────────────────────
function MyBookingPage({ bookings, listings, onBookingMade }) {
  const today = toKey(new Date());
  const [phone, setPhone]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr]           = useState("");
  // Balance payment modal state
  const [payingBalance, setPayingBalance] = useState(null); // booking obj

  const normalise = p => {
    const c = p.replace(/[\s\-]/g,"");
    if(/^07\d{8}$/.test(c)) return "254"+c.slice(1);
    if(/^\+254[17]\d{8}$/.test(c)) return c.slice(1);
    return c;
  };
  const validate = p => /^(254|\+?254|0)[17]\d{8}$/.test(p.replace(/[\s\-]/g,""));

  const handleSearch = () => {
    if(!phone.trim()){ setErr("Please enter your phone number."); return; }
    if(!validate(phone)){ setErr("Enter a valid Safaricom number (07xx or 254xx)."); return; }
    setErr(""); setSubmitted(true);
  };

  const handleReset = () => { setPhone(""); setSubmitted(false); setErr(""); };

  // Filter: match phone + checkout hasn't passed
  const myBookings = submitted
    ? bookings.filter(b => {
        const normB = normalise(b.phone||"");
        const normQ = normalise(phone);
        return normB===normQ && b.checkOut && b.checkOut>=today;
      })
    : [];

  // Deposit bookings that still have a balance
  const depositBookings = myBookings.filter(b => b.isDeposit && b.balanceDue > 0);
  const fullBookings    = myBookings.filter(b => !b.isDeposit || b.balanceDue <= 0);

  const statusOf = b => {
    if(b.checkIn<=today && b.checkOut>today) return "active";
    if(b.checkIn>today)  return "upcoming";
    return "past";
  };

  const STATUS_LABEL  = { active:"Checked In", upcoming:"Upcoming", past:"Past" };
  const STATUS_COLOR  = { active:C.success, upcoming:C.gold, past:C.muted };
  const STATUS_BG     = { active:"rgba(22,163,74,0.1)", upcoming:"rgba(197,151,58,0.12)", past:"rgba(107,107,95,0.1)" };
  const STATUS_BORDER = { active:"rgba(22,163,74,0.3)", upcoming:"rgba(197,151,58,0.35)", past:"rgba(107,107,95,0.2)" };

  // Days until check-in
  const daysUntil = b => {
    const d = Math.ceil((new Date(b.checkIn+"-01").setDate(parseInt(b.checkIn.split("-")[2])) - Date.now()) / 86400000);
    const ci = new Date(b.checkIn.replace(/-/g,"/"));
    return Math.ceil((ci - new Date()) / 86400000);
  };

  // Find the listing object for a booking
  const listingFor = b => listings?.find(l => l.id===b.listing?.id) || b.listing;

  return (
    <div style={{minHeight:"100vh",paddingTop:"72px",background:"#FDFAF5"}}>

      {/* ── Hero band ── */}
      <div style={{background:"linear-gradient(135deg,#1A1A2E 0%,#2D3748 100%)",padding:"3.5rem 1.5rem 4rem",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"url(https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1400&q=40)",backgroundSize:"cover",backgroundPosition:"center",opacity:0.07,pointerEvents:"none"}}/>
        <div style={{maxWidth:"640px",margin:"0 auto",textAlign:"center",position:"relative"}}>
          <div style={{fontSize:"0.65rem",letterSpacing:"0.38em",textTransform:"uppercase",color:C.gold,marginBottom:"0.9rem"}}>Booking Lookup</div>
          <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(2rem,5vw,3.2rem)",color:"#F7F2EA",fontWeight:400,marginBottom:"0.8rem",lineHeight:1.2}}>
            Find Your <em style={{color:C.gold,fontStyle:"italic"}}>Reservation</em>
          </h1>
          <p style={{fontSize:"0.92rem",color:"rgba(247,242,234,0.65)",lineHeight:1.8,maxWidth:"420px",margin:"0 auto 2.2rem"}}>
            Enter the phone number you used to book. We'll show your reservations and any outstanding balances.
          </p>

          {/* Search box */}
          <div style={{background:"#fff",borderRadius:"8px",padding:"1.6rem",boxShadow:"0 24px 80px rgba(0,0,0,0.35)"}}>
            {!submitted ? (
              <>
                <label style={{display:"block",fontSize:"0.62rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem",textAlign:"left"}}>M-Pesa / Booking Phone Number</label>
                <div style={{display:"flex",gap:"0.6rem"}}>
                  <input type="tel" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}
                    onKeyDown={e=>e.key==="Enter"&&handleSearch()}
                    placeholder="e.g. 0712 345 678"
                    style={{flex:1,padding:"0.85rem 1rem",border:`1.5px solid ${err?C.error:C.border}`,borderRadius:"5px",fontSize:"1rem",outline:"none",background:"#FDFAF5",color:"#1C1C1C",transition:"border-color 0.2s"}}
                    onFocus={e=>e.target.style.borderColor=C.gold}
                    onBlur={e=>e.target.style.borderColor=err?C.error:C.border}/>
                  <button onClick={handleSearch}
                    style={{padding:"0.85rem 1.6rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"5px",fontWeight:700,fontSize:"0.82rem",letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",flexShrink:0,transition:"background 0.2s"}}
                    onMouseEnter={e=>e.target.style.background=C.goldLight}
                    onMouseLeave={e=>e.target.style.background=C.gold}>Search</button>
                </div>
                {err&&<div style={{fontSize:"0.76rem",color:C.error,marginTop:"0.5rem",textAlign:"left"}}>{err}</div>}
              </>
            ) : (
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"0.6rem"}}>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.2rem"}}>Showing results for</div>
                  <div style={{fontWeight:600,color:C.cream,fontSize:"1rem"}}>+{normalise(phone)}</div>
                </div>
                <button onClick={handleReset}
                  style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:"4px",padding:"0.5rem 1rem",fontSize:"0.75rem",color:C.muted,cursor:"pointer",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
                  ✕ New Search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div style={{maxWidth:"720px",margin:"0 auto",padding:"2.5rem 1.5rem 6rem"}}>

        {/* Empty state */}
        {!submitted&&(
          <div style={{textAlign:"center",paddingTop:"2rem",color:C.muted}}>
            <div style={{fontSize:"3rem",marginBottom:"1rem",opacity:0.35}}>🔍</div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.2rem",color:C.sage,marginBottom:"0.4rem"}}>Your reservations, at a glance</div>
            <div style={{fontSize:"0.85rem",lineHeight:1.8,color:C.muted}}>Enter your phone number above to see upcoming reservations and any outstanding balances.</div>
          </div>
        )}

        {/* No results */}
        {submitted&&myBookings.length===0&&(
          <div style={{textAlign:"center",paddingTop:"1.5rem"}}>
            <div style={{fontSize:"3rem",marginBottom:"1rem",opacity:0.4}}>📭</div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.3rem",color:C.sage,marginBottom:"0.6rem"}}>No reservations found</div>
            <div style={{fontSize:"0.88rem",color:C.muted,lineHeight:1.8,maxWidth:"380px",margin:"0 auto"}}>
              We couldn't find upcoming bookings for that number. Check that it matches the number you used to pay via M-Pesa, or contact us on WhatsApp.
            </div>
            <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",marginTop:"1.5rem",padding:"0.75rem 1.6rem",background:"rgba(76,175,125,0.1)",border:"1px solid rgba(76,175,125,0.3)",borderRadius:"5px",color:"#4CAF7D",fontSize:"0.8rem",fontWeight:600,textDecoration:"none"}}>
              📱 Contact us on WhatsApp
            </a>
          </div>
        )}

        {/* ── OUTSTANDING BALANCES (shown first, prominent) ── */}
        {submitted&&depositBookings.length>0&&(
          <div style={{marginBottom:"2.5rem",animation:"fadeUp 0.5s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1.2rem"}}>
              <div style={{flex:1,height:"1px",background:"rgba(197,151,58,0.3)"}}/>
              <div style={{padding:"0.3rem 0.9rem",background:"rgba(197,151,58,0.1)",border:"1px solid rgba(197,151,58,0.3)",borderRadius:"20px",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:C.gold,flexShrink:0}}>
                💰 Outstanding Balances
              </div>
              <div style={{flex:1,height:"1px",background:"rgba(197,151,58,0.3)"}}/>
            </div>

            {depositBookings.map((b,i)=>{
              const st = statusOf(b);
              const dl = daysUntil(b);
              const urgency = dl<=3?"urgent":dl<=7?"soon":"plan";
              const urgColor = {urgent:C.error,soon:"#F59E0B",plan:C.gold}[urgency];
              return (
                <div key={i} style={{
                  background:"#fff",borderRadius:"12px",overflow:"hidden",
                  border:`2px solid ${C.gold}44`,
                  boxShadow:`0 8px 32px rgba(197,151,58,0.15)`,
                  marginBottom:"1rem",
                  animation:`fadeUp 0.4s ease ${i*0.08}s both`,
                }}>
                  {/* Gold top bar */}
                  <div style={{height:"4px",background:`linear-gradient(90deg,${C.gold},${C.goldLight},${C.gold})`}}/>

                  <div style={{padding:"1.4rem 1.6rem"}}>
                    {/* Header */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"0.6rem",marginBottom:"1rem"}}>
                      <div>
                        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream,marginBottom:"0.2rem"}}>{b.listing?.name}</div>
                        <div style={{fontSize:"0.75rem",color:C.muted}}>{b.listing?.neighborhood}, {BRAND.city}</div>
                      </div>
                      <span style={{fontSize:"0.62rem",fontWeight:700,padding:"0.2rem 0.6rem",background:"rgba(197,151,58,0.12)",color:C.gold,border:`1px solid rgba(197,151,58,0.35)`,borderRadius:"3px",letterSpacing:"0.1em",textTransform:"uppercase",flexShrink:0}}>Deposit Paid</span>
                    </div>

                    {/* Dates */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:"0.6rem",padding:"0.9rem 1rem",background:"#F7F2EA",borderRadius:"6px",marginBottom:"1rem"}}>
                      <div>
                        <div style={{fontSize:"0.58rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.2rem"}}>Check-in</div>
                        <div style={{fontWeight:600,color:C.cream,fontSize:"0.9rem"}}>{fmtDate(b.checkIn)}</div>
                      </div>
                      <div style={{fontSize:"1.2rem",color:C.gold,textAlign:"center"}}>→</div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:"0.58rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.2rem"}}>Check-out</div>
                        <div style={{fontWeight:600,color:C.cream,fontSize:"0.9rem"}}>{fmtDate(b.checkOut)}</div>
                      </div>
                    </div>

                    {/* Payment summary */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem",marginBottom:"1.1rem"}}>
                      {[
                        {label:"Deposit Paid",   val:`KES ${fmt(b.depositAmount||b.total)}`, color:C.success},
                        {label:"Balance Due",    val:`KES ${fmt(b.balanceDue)}`,             color:C.gold},
                        {label:"Full Total",     val:`KES ${fmt((b.depositAmount||b.total)+b.balanceDue)}`, color:"#1C1C1C"},
                      ].map(({label,val,color})=>(
                        <div key={label} style={{padding:"0.7rem 0.8rem",background:"#FDFAF5",borderRadius:"5px",border:`1px solid ${C.border}`,textAlign:"center"}}>
                          <div style={{fontSize:"0.55rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.2rem"}}>{label}</div>
                          <div style={{fontSize:"0.88rem",fontWeight:700,color}}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Urgency nudge */}
                    {dl>0&&(
                      <div style={{padding:"0.6rem 0.9rem",background:`${urgColor}11`,border:`1px solid ${urgColor}33`,borderRadius:"5px",marginBottom:"1rem",fontSize:"0.75rem",color:urgColor,display:"flex",alignItems:"center",gap:"0.5rem"}}>
                        <span>{urgency==="urgent"?"⚠️":urgency==="soon"?"⏰":"📅"}</span>
                        <span>
                          {urgency==="urgent"
                            ? `Check-in in ${dl} day${dl===1?"":"s"} — please settle your balance soon.`
                            : urgency==="soon"
                            ? `${dl} days until check-in — pay your balance to confirm your stay.`
                            : `${dl} days until check-in — pay your balance at your convenience before arrival.`}
                        </span>
                      </div>
                    )}

                    {/* Pay balance CTA */}
                    <button onClick={()=>setPayingBalance(b)}
                      style={{width:"100%",padding:"1rem",background:`linear-gradient(135deg,${C.primary},${C.teal})`,color:"#fff",border:`2px solid ${C.gold}`,borderRadius:"8px",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.25s",boxShadow:`0 4px 16px rgba(197,151,58,0.2)`}}
                      onMouseEnter={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${C.gold},${C.goldLight})`;e.currentTarget.style.color=C.obsidian;}}
                      onMouseLeave={e=>{e.currentTarget.style.background="linear-gradient(135deg,#FF6B6B,#4ECDC4)";e.currentTarget.style.color="#fff";}}>
                      💳 Pay Remaining Balance — KES {fmt(b.balanceDue)}
                    </button>

                    <div style={{textAlign:"center",marginTop:"0.5rem",fontSize:"0.68rem",color:C.muted}}>
                      Ref: <strong style={{color:C.gold,letterSpacing:"0.06em"}}>{b.ref}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CONFIRMED BOOKINGS ── */}
        {submitted&&fullBookings.length>0&&(
          <div style={{animation:"fadeUp 0.5s ease"}}>
            {depositBookings.length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1.2rem"}}>
                <div style={{flex:1,height:"1px",background:C.border}}/>
                <div style={{fontSize:"0.65rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.muted,flexShrink:0}}>Confirmed Bookings</div>
                <div style={{flex:1,height:"1px",background:C.border}}/>
              </div>
            )}
            {!depositBookings.length&&(
              <div style={{fontSize:"0.68rem",letterSpacing:"0.25em",textTransform:"uppercase",color:C.gold,marginBottom:"1.4rem"}}>
                {fullBookings.length} Reservation{fullBookings.length>1?"s":""} Found
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:"1.1rem"}}>
              {fullBookings.map((b,i)=>{
                const st = statusOf(b);
                return (
                  <div key={i} style={{background:"#fff",border:`1px solid ${STATUS_BORDER[st]}`,borderRadius:"10px",overflow:"hidden",boxShadow:"0 4px 20px rgba(14,43,31,0.07)",animation:`fadeUp 0.4s ease ${i*0.07}s both`}}>
                    <div style={{height:"4px",background:STATUS_COLOR[st]}}/>
                    <div style={{padding:"1.4rem 1.6rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem",flexWrap:"wrap",gap:"0.6rem"}}>
                        <div>
                          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream,marginBottom:"0.2rem"}}>{b.listing?.name}</div>
                          <div style={{fontSize:"0.75rem",color:C.muted}}>{b.listing?.neighborhood}, {BRAND.city}</div>
                        </div>
                        <span style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",padding:"0.22rem 0.65rem",background:STATUS_BG[st],color:STATUS_COLOR[st],border:`1px solid ${STATUS_BORDER[st]}`,borderRadius:"3px"}}>
                          {STATUS_LABEL[st]}
                        </span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:"0.6rem",padding:"0.9rem 1rem",background:"#F7F2EA",borderRadius:"6px",marginBottom:"1rem"}}>
                        <div>
                          <div style={{fontSize:"0.58rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.2rem"}}>Check-in</div>
                          <div style={{fontWeight:600,color:C.cream,fontSize:"0.9rem"}}>{fmtDate(b.checkIn)}</div>
                        </div>
                        <div style={{fontSize:"1.2rem",color:C.gold,textAlign:"center"}}>→</div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:"0.58rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.2rem"}}>Check-out</div>
                          <div style={{fontWeight:600,color:C.cream,fontSize:"0.9rem"}}>{fmtDate(b.checkOut)}</div>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"1rem"}}>
                        {[
                          ["Nights",`${b.nights} night${b.nights>1?"s":""}`],
                          ["Guests",`${b.guests} guest${b.guests>1?"s":""}`],
                          ["Total Paid",`KES ${fmt(b.total)}`],
                          ["Booking Ref",b.ref],
                        ].map(([label,val])=>(
                          <div key={label} style={{padding:"0.6rem 0.8rem",background:"#FDFAF5",borderRadius:"5px",border:`1px solid ${C.border}`}}>
                            <div style={{fontSize:"0.58rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.15rem"}}>{label}</div>
                            <div style={{fontSize:"0.88rem",fontWeight:600,color:label==="Total Paid"?C.gold:label==="Booking Ref"?C.success:"#1A1A2E"}}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",justifyContent:"flex-end",paddingTop:"0.6rem",borderTop:`1px solid ${C.border}`}}>
                        <a href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(`Hi, I need help with booking ${b.ref} at ${b.listing?.name}.`)}`}
                          target="_blank" rel="noreferrer"
                          style={{display:"inline-flex",alignItems:"center",gap:"0.35rem",fontSize:"0.72rem",color:"#4CAF7D",fontWeight:600,textDecoration:"none",padding:"0.35rem 0.8rem",border:"1px solid rgba(76,175,125,0.3)",borderRadius:"4px",transition:"all 0.2s"}}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(76,175,125,0.08)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          📱 Need help?
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── BALANCE PAYMENT MODAL ── */}
      {payingBalance&&(
        <BalancePaymentModal
          booking={payingBalance}
          listing={listingFor(payingBalance)}
          onClose={()=>setPayingBalance(null)}
          onSuccess={(updatedBooking)=>{
            setPayingBalance(null);
            if(onBookingMade) onBookingMade(updatedBooking);
          }}
        />
      )}
    </div>
  );
}

// ─── BALANCE PAYMENT MODAL ────────────────────────────────────────
function BalancePaymentModal({ booking, listing, onClose, onSuccess }) {
  const [step,setStep]       = useState("confirm"); // confirm|sending|waitPin|polling|success|failed
  const [err,setErr]         = useState("");
  const [statusMsg,setStatusMsg] = useState("");
  const pollRef = useRef(null);
  const [phRef, setPhRef]   = useState(null);

  const amount = booking.balanceDue;
  const phone  = booking.phone;
  const name   = booking.name;

  useEffect(()=>()=>{ if(pollRef.current) clearInterval(pollRef.current); },[]);

  const normalisePhone = p => {
    const c = p.replace(/[\s\-]/g,"");
    return c.startsWith("0") ? "254"+c.slice(1) : c;
  };

  const payNow = async() => {
    setErr(""); setStep("sending");
    try {
      const data = await phStkPush({
        phone: normalisePhone(phone),
        amount,
        ref: "BAL-"+booking.ref,
      });
      const extRef = data?.reference || data?.CheckoutRequestID || data?.checkout_request_id || ("BAL-"+booking.ref);
      setPhRef(extRef);
      setStep("waitPin");
      setTimeout(()=>startPolling(extRef), 6000);
    } catch(e) {
      setErr(`STK push failed: ${e.message}`);
      setStep("confirm");
    }
  };

  const startPolling = ref => {
    setStep("polling"); setStatusMsg("Verifying payment…");
    let attempts = 0;
    const MAX = 20;
    pollRef.current = setInterval(async()=>{
      attempts++;
      try {
        const data = await phCheckStatus(ref);
        const st = (data?.status||"").toUpperCase();
        if(["SUCCESS","COMPLETE","COMPLETED"].includes(st)){
          clearInterval(pollRef.current);
          setStep("success");
        } else if(["FAILED","CANCELLED","CANCELED","REJECTED"].includes(st)){
          clearInterval(pollRef.current);
          setErr(data?.message||"Payment was not completed. Please try again.");
          setStep("failed");
        } else if(attempts>=MAX){
          clearInterval(pollRef.current);
          setErr(`Verification timed out. If you entered your PIN, contact us with ref: BAL-${booking.ref}`);
          setStep("failed");
        } else {
          setStatusMsg(`Waiting for M-Pesa confirmation… (${attempts}/${MAX})`);
        }
      } catch {}
    }, 5000);
  };

  const overlay = {position:"fixed",inset:0,background:"rgba(14,43,31,0.78)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",backdropFilter:"blur(8px)"};
  const box = {background:"#fff",border:`1px solid ${C.border}`,borderRadius:"12px",width:"100%",maxWidth:"460px",padding:"2.2rem",animation:"slideUp 0.35s ease",position:"relative",boxShadow:"0 32px 80px rgba(0,0,0,0.5)",maxHeight:"92vh",overflowY:"auto"};

  return (
    <div style={overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={box}>
        <button onClick={onClose} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:C.muted,fontSize:"1.3rem",cursor:"pointer"}}>✕</button>

        {/* Header */}
        <div style={{marginBottom:"1.5rem"}}>
          <div style={{fontSize:"0.65rem",letterSpacing:"0.25em",textTransform:"uppercase",color:C.gold,marginBottom:"0.3rem"}}>
            {step==="success"?"Balance Cleared":"Pay Remaining Balance"}
          </div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.3rem",color:C.cream,marginBottom:"0.2rem"}}>{booking.listing?.name}</div>
          <div style={{fontSize:"0.8rem",color:C.muted}}>{fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}</div>
        </div>

        {/* ── CONFIRM ── */}
        {step==="confirm"&&(
          <div style={{animation:"fadeIn 0.3s ease"}}>
            {/* Booking summary */}
            <div style={{background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"8px",padding:"1rem 1.2rem",marginBottom:"1.2rem"}}>
              {[
                ["Guest",name],
                ["Phone",normalisePhone(phone)],
                ["Deposit Paid",`KES ${fmt(booking.depositAmount||booking.total)}`],
                ["Balance Due",`KES ${fmt(amount)}`],
                ["Booking Ref",booking.ref],
              ].map(([l,r])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",padding:"0.3rem 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{color:C.muted}}>{l}</span>
                  <span style={{color:l==="Balance Due"?C.gold:l==="Booking Ref"?C.success:"#1C1C1C",fontWeight:l==="Balance Due"||l==="Booking Ref"?600:400}}>{r}</span>
                </div>
              ))}
            </div>
            <div style={{padding:"0.7rem 1rem",background:"rgba(255,107,107,0.06)",border:`1px solid rgba(197,151,58,0.22)`,borderRadius:"5px",fontSize:"0.78rem",color:C.mutedLight,marginBottom:"1.2rem",lineHeight:1.6}}>
              📱 An M-Pesa STK push will be sent to <strong style={{color:C.gold}}>+{normalisePhone(phone)}</strong> for <strong style={{color:C.gold}}>KES {fmt(amount)}</strong>.
            </div>
            {err&&<div style={{fontSize:"0.75rem",color:C.error,marginBottom:"0.8rem",padding:"0.5rem 0.8rem",background:"rgba(224,82,82,0.08)",borderRadius:"4px"}}>{err}</div>}
            <button onClick={payNow}
              style={{width:"100%",padding:"1rem",background:`linear-gradient(135deg,${C.primary},${C.teal})`,color:"#fff",border:`2px solid ${C.gold}`,borderRadius:"8px",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${C.gold},${C.goldLight})`;e.currentTarget.style.color=C.obsidian;}}
              onMouseLeave={e=>{e.currentTarget.style.background="linear-gradient(135deg,#FF6B6B,#4ECDC4)";e.currentTarget.style.color="#fff";}}>
              💳 Pay KES {fmt(amount)} Now
            </button>
          </div>
        )}

        {/* ── SENDING ── */}
        {step==="sending"&&(
          <div style={{textAlign:"center",padding:"2rem 0"}}>
            <div style={{width:"50px",height:"50px",border:`3px solid ${C.goldDim}`,borderTop:`3px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.9s linear infinite",margin:"0 auto 1.5rem"}}/>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.cream,marginBottom:"0.4rem"}}>Sending STK push…</div>
            <div style={{fontSize:"0.82rem",color:C.muted}}>Connecting to M-Pesa for +{normalisePhone(phone)}</div>
          </div>
        )}

        {/* ── WAIT PIN ── */}
        {step==="waitPin"&&(
          <div style={{animation:"fadeIn 0.3s ease",textAlign:"center"}}>
            <div style={{fontSize:"3rem",marginBottom:"0.7rem",animation:"heartBeat 1.8s ease infinite"}}>📱</div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.2rem",color:C.cream,marginBottom:"0.5rem"}}>Check Your Phone</div>
            <div style={{fontSize:"0.85rem",color:C.muted,lineHeight:1.7,marginBottom:"1.2rem"}}>
              M-Pesa prompt sent to<br/><strong style={{color:C.gold}}>+{normalisePhone(phone)}</strong><br/>Enter your PIN to pay <strong style={{color:C.gold}}>KES {fmt(amount)}</strong>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem",padding:"0.9rem 1rem",background:"rgba(255,107,107,0.06)",border:`1px solid rgba(197,151,58,0.25)`,borderRadius:"6px",fontSize:"0.75rem",color:C.mutedLight,lineHeight:1.5}}>
              <div style={{width:"12px",height:"12px",borderRadius:"50%",border:`2px solid ${C.goldDim}`,borderTop:`2px solid ${C.gold}`,animation:"spin 0.9s linear infinite",flexShrink:0}}/>
              Waiting for PIN confirmation… this verifies automatically.
            </div>
            <button onClick={()=>{setStep("confirm");setErr("");}} style={{marginTop:"1rem",background:"none",border:"none",color:C.muted,fontSize:"0.72rem",cursor:"pointer",textDecoration:"underline"}}>Didn't get it? Try again</button>
          </div>
        )}

        {/* ── POLLING ── */}
        {step==="polling"&&(
          <div style={{textAlign:"center",padding:"2rem 0"}}>
            <div style={{width:"50px",height:"50px",border:`3px solid ${C.goldDim}`,borderTop:`3px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.9s linear infinite",margin:"0 auto 1.5rem"}}/>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.cream,marginBottom:"0.4rem"}}>Verifying Payment…</div>
            <div style={{fontSize:"0.8rem",color:C.muted}}>{statusMsg}</div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step==="success"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{textAlign:"center",marginBottom:"1rem"}}>
              <div style={{width:"60px",height:"60px",background:C.successDim,border:`2px solid ${C.success}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem",margin:"0 auto 0.9rem"}}>✓</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.4rem",color:C.cream,marginBottom:"0.3rem"}}>Balance Cleared! 🎉</div>
              <div style={{fontSize:"0.83rem",color:C.muted,lineHeight:1.6}}>
                <strong style={{color:C.success}}>KES {fmt(amount)}</strong> received — booking fully confirmed.
              </div>
            </div>
            <div style={{background:C.successDim,border:"1px solid rgba(76,175,125,0.25)",borderRadius:"8px",padding:"1rem",marginBottom:"0.6rem"}}>
              {[["Property",booking.listing?.name],["Check-in",fmtDate(booking.checkIn)],["Check-out",fmtDate(booking.checkOut)],["Balance Paid",`KES ${fmt(amount)}`],["Booking Ref",booking.ref]].map(([l,r])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"0.79rem",padding:"0.28rem 0",borderBottom:"1px solid rgba(76,175,125,0.15)"}}>
                  <span style={{color:C.muted}}>{l}</span>
                  <span style={{color:l==="Balance Paid"||l==="Booking Ref"?C.success:C.cream,fontWeight:l==="Balance Paid"||l==="Booking Ref"?600:400}}>{r}</span>
                </div>
              ))}
            </div>
            <div style={{padding:"0.6rem 1rem",background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"6px",marginBottom:"0.7rem",fontSize:"0.76rem",color:C.success,fontWeight:600}}>
              ✅ Paid in full — no balance remaining
            </div>
            <ReceiptButtons booking={{...booking,isDeposit:false,balanceDue:0,total:(booking.depositAmount||booking.total)+amount}} siteWhatsapp={null}/>
            <button onClick={()=>onSuccess({...booking,balanceDue:0,isDeposit:false,total:(booking.depositAmount||booking.total)+amount})}
              style={{width:"100%",padding:"0.9rem",background:C.success,color:"#fff",border:"none",borderRadius:"6px",fontSize:"0.82rem",fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer"}}>
              Done ✓
            </button>
          </div>
        )}

        {/* ── FAILED ── */}
        {step==="failed"&&(
          <div style={{textAlign:"center",animation:"fadeIn 0.3s ease"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>⚠️</div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.2rem",color:C.cream,marginBottom:"0.5rem"}}>Payment Unsuccessful</div>
            <div style={{fontSize:"0.83rem",color:C.muted,lineHeight:1.7,marginBottom:"1rem"}}>{err}</div>
            <div style={{display:"flex",gap:"0.8rem"}}>
              <button onClick={()=>{setStep("confirm");setErr("");}} style={{flex:1,padding:"0.9rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"6px",fontSize:"0.8rem",fontWeight:600,cursor:"pointer"}}>Try Again</button>
              <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer" style={{flex:1,padding:"0.9rem",background:"transparent",color:C.success,border:`1px solid ${C.success}`,borderRadius:"6px",fontSize:"0.8rem",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.3rem",textDecoration:"none"}}>📱 WhatsApp</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ─── REFERRAL & COMMISSION SYSTEM ────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_COMMISSION = { type:"percentage", value:10, minBooking:0, notes:"Commission paid within 7 days of confirmed booking." };

// ── Supabase helpers ──────────────────────────────────────────────
async function loadReferrals() {
  try {
    const { data } = await supabase.from("kv_store").select("value").eq("key",`${BRAND.slug}:referrals`).single();
    return data ? JSON.parse(data.value) : {};
  } catch { return {}; }
}
async function saveReferrals(d) {
  const { error } = await supabase.from("kv_store").upsert({ key:`${BRAND.slug}:referrals`, value:JSON.stringify(d) },{ onConflict:"key" });
  if (error) console.error("[Supabase] saveReferrals:", error.message);
}
async function loadCommissionSettings() {
  try {
    const { data } = await supabase.from("kv_store").select("value").eq("key",`${BRAND.slug}:commission`).single();
    return data ? { ...DEFAULT_COMMISSION, ...JSON.parse(data.value) } : DEFAULT_COMMISSION;
  } catch { return DEFAULT_COMMISSION; }
}
async function saveCommissionSettings(d) {
  const { error } = await supabase.from("kv_store").upsert({ key:`${BRAND.slug}:commission`, value:JSON.stringify(d) },{ onConflict:"key" });
  if (error) console.error("[Supabase] saveCommissionSettings:", error.message);
}

// ── Referral code generator ───────────────────────────────────────
function makeRefCode(name, phone) {
  const slug = name.trim().toUpperCase().replace(/[^A-Z]/g,"").slice(0,6);
  const tail  = phone.replace(/\D/g,"").slice(-4);
  return slug + tail;
}

function calcCommission(bookingTotal, settings) {
  if (!settings || bookingTotal < (settings.minBooking||0)) return 0;
  if (settings.type === "flat") return settings.value;
  return Math.round(bookingTotal * (settings.value/100));
}

// ── REFER & EARN HOMEPAGE SECTION ────────────────────────────────
function ReferAndEarnSection({ onOpenDashboard }) {
  const [name,setName]   = useState("");
  const [phone,setPhone] = useState("");
  const [code,setCode]   = useState("");
  const [copied,setCopied] = useState(false);
  const [err,setErr]     = useState("");
  const [loading,setLoading] = useState(false);
  const [step,setStep]   = useState(0); // 0=hero, 1=form, 2=done

  const validatePhone = p => /^(?:254|0)[17]\d{8}$/.test(p.replace(/[\s-]/g,""));
  const normalise     = p => { const c=p.replace(/[\s-]/g,""); return c.startsWith("0")?"254"+c.slice(1):c; };

  const generate = async() => {
    if(!name.trim()){ setErr("Enter your name."); return; }
    if(!validatePhone(phone)){ setErr("Enter a valid Safaricom number."); return; }
    setErr(""); setLoading(true);
    const normPhone = normalise(phone);
    const refCode   = makeRefCode(name, normPhone);
    const refLink   = `${window.location.origin}?ref=${refCode}`;
    const refs = await loadReferrals();
    if (!refs[refCode]) {
      refs[refCode] = { code:refCode, name:name.trim(), phone:normPhone, createdAt:toKey(new Date()), totalEarned:0, pendingAmount:0, paidAmount:0, bookingRefs:[] };
      await saveReferrals(refs);
    }
    setCode(refLink); setLoading(false); setStep(2);
  };

  const copy = () => {
    navigator.clipboard.writeText(code).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2500); });
  };
  const share = () => {
    if(navigator.share) navigator.share({ title:BRAND.fullName, text:`Book a premium ${BRAND.city} stay with this exclusive link!`, url:code });
    else copy();
  };

  return (
    <section style={{background:"#1A1A2E",padding:"5rem 1.5rem 4rem",position:"relative",overflow:"hidden"}}>
      {/* Animated background */}
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 2px 2px,rgba(197,151,58,0.06) 1px,transparent 0)",backgroundSize:"28px 28px",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"-100px",right:"-100px",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,rgba(197,151,58,0.1),transparent 65%)",pointerEvents:"none",animation:"splashOrb 8s ease-in-out infinite"}}/>
      <div style={{position:"absolute",bottom:"-60px",left:"-60px",width:"350px",height:"350px",borderRadius:"50%",background:"radial-gradient(circle,rgba(76,175,125,0.08),transparent 65%)",pointerEvents:"none",animation:"splashOrb 10s ease-in-out infinite reverse"}}/>

      <div style={{maxWidth:"1000px",margin:"0 auto",position:"relative"}}>

        {/* Section badge */}
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.4rem 1.2rem",background:"rgba(197,151,58,0.12)",border:"1px solid rgba(197,151,58,0.35)",borderRadius:"30px"}}>
            <span style={{fontSize:"1rem"}}>💸</span>
            <span style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.25em",textTransform:"uppercase",color:C.gold}}>Refer & Earn Programme</span>
          </div>
        </div>

        {/* Hero headline */}
        <div style={{textAlign:"center",marginBottom:"1rem"}}>
          <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(2.4rem,5vw,3.8rem)",color:"#F7F2EA",fontWeight:400,lineHeight:1.1,marginBottom:"0.8rem"}}>
            Share the vibe,<br/><em style={{color:C.gold,fontStyle:"italic"}}>bank the commission.</em>
          </h2>
          <p style={{fontSize:"1rem",color:"rgba(247,242,234,0.6)",maxWidth:"540px",margin:"0 auto",lineHeight:1.8}}>
            Every booking that comes through your link puts cash directly into your M-Pesa. No hustle. No waiting. Just share and earn.
          </p>
        </div>

        {/* Stats strip */}
        <div style={{display:"flex",justifyContent:"center",gap:"0",marginBottom:"3.5rem",flexWrap:"wrap"}}>
          {[{v:"Free",l:"to join"},{v:"24hrs",l:"payout time"},{v:"Zero",l:"limits on earnings"},{v:"100%",l:"tracked automatically"}].map((s,i)=>(
            <div key={i} style={{padding:"1.2rem 2rem",borderRight:i<3?"1px solid rgba(197,151,58,0.15)":undefined,textAlign:"center",minWidth:"140px"}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.gold,fontWeight:400}}>{s.v}</div>
              <div style={{fontSize:"0.65rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(247,242,234,0.4)",marginTop:"0.2rem"}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Main panel — 2 col */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,420px),1fr))",gap:"2rem",alignItems:"start"}}>

          {/* Left — how it works */}
          <div>
            <div style={{fontSize:"0.62rem",letterSpacing:"0.25em",textTransform:"uppercase",color:"rgba(247,242,234,0.35)",marginBottom:"1.5rem",fontWeight:600}}>How it works</div>
            {[
              {n:"01",icon:"🔗",t:"Get your link",d:"30 seconds to generate. One link, forever yours."},
              {n:"02",icon:"📲",t:"Share anywhere",d:"WhatsApp, Instagram, TikTok, Twitter — wherever your network lives."},
              {n:"03",icon:"💳",t:"Someone books",d:"Your commission is logged the moment payment clears."},
              {n:"04",icon:"📱",t:"Cash to M-Pesa",d:"Request a payout anytime. Straight to your phone."},
            ].map((s,i)=>(
              <div key={i} style={{display:"flex",gap:"1.2rem",marginBottom:"1.5rem",alignItems:"flex-start"}}>
                <div style={{width:"40px",height:"40px",borderRadius:"50%",background:"rgba(197,151,58,0.1)",border:"1px solid rgba(197,151,58,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0,boxShadow:"0 0 20px rgba(197,151,58,0.1)"}}>
                  {s.icon}
                </div>
                <div style={{paddingTop:"0.15rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.2rem"}}>
                    <span style={{fontSize:"0.58rem",color:"rgba(197,151,58,0.5)",fontFamily:"monospace",letterSpacing:"0.1em"}}>{s.n}</span>
                    <span style={{fontSize:"0.88rem",fontWeight:600,color:"#F7F2EA"}}>{s.t}</span>
                  </div>
                  <div style={{fontSize:"0.78rem",color:"rgba(247,242,234,0.45)",lineHeight:1.6}}>{s.d}</div>
                </div>
              </div>
            ))}
            <button onClick={onOpenDashboard}
              style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",marginTop:"0.5rem",background:"transparent",border:"1px solid rgba(197,151,58,0.35)",color:C.gold,padding:"0.7rem 1.5rem",borderRadius:"6px",fontSize:"0.75rem",fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(197,151,58,0.1)";e.currentTarget.style.borderColor=C.gold;}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="rgba(197,151,58,0.35)";}}>
              📊 View My Earnings →
            </button>
          </div>

          {/* Right — card */}
          <div style={{background:"linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",border:"1px solid rgba(197,151,58,0.25)",borderRadius:"16px",padding:"2rem",backdropFilter:"blur(20px)",boxShadow:"0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"}}>

            {step===0&&(
              <>
                <div style={{textAlign:"center",marginBottom:"1.8rem"}}>
                  <div style={{width:"64px",height:"64px",borderRadius:"50%",background:"linear-gradient(135deg,rgba(197,151,58,0.2),rgba(197,151,58,0.05))",border:"1px solid rgba(197,151,58,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem",margin:"0 auto 1rem",boxShadow:"0 0 30px rgba(197,151,58,0.15)"}}>💰</div>
                  <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.4rem",color:"#F7F2EA",marginBottom:"0.4rem"}}>Start Earning Today</div>
                  <div style={{fontSize:"0.78rem",color:"rgba(247,242,234,0.45)",lineHeight:1.6}}>Free to join. Your own link in 30 seconds.</div>
                </div>
                <button onClick={()=>setStep(1)}
                  style={{width:"100%",padding:"1.1rem",background:`linear-gradient(135deg,${C.gold} 0%,${C.goldLight} 50%,${C.gold} 100%)`,backgroundSize:"200% auto",color:C.obsidian,border:"none",borderRadius:"10px",fontSize:"0.9rem",fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.3s",boxShadow:`0 8px 32px rgba(197,151,58,0.35)`,animation:"splashShimmer 3s linear infinite"}}>
                  ✨ Get My Referral Link
                </button>
                <p style={{textAlign:"center",fontSize:"0.66rem",color:"rgba(247,242,234,0.25)",marginTop:"0.9rem",lineHeight:1.5}}>
                  No sign-up fees. No catches. Just share and earn.
                </p>
              </>
            )}

            {step===1&&(
              <>
                <div style={{marginBottom:"1.2rem"}}>
                  <div style={{fontSize:"0.62rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.gold,marginBottom:"1rem",fontWeight:700}}>Your Details</div>
                  {[
                    {label:"Your Name",ph:"e.g. Kevin Aloo",val:name,set:setName,type:"text"},
                    {label:"Your M-Pesa Number",ph:"e.g. 0712 345 678",val:phone,set:setPhone,type:"tel"},
                  ].map(f=>(
                    <div key={f.label} style={{marginBottom:"0.9rem"}}>
                      <label style={{display:"block",fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(247,242,234,0.4)",marginBottom:"0.4rem"}}>{f.label}</label>
                      <input type={f.type} value={f.val} onChange={e=>{f.set(e.target.value);setErr("");}}
                        placeholder={f.ph}
                        style={{width:"100%",padding:"0.85rem 1rem",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(197,151,58,0.2)",borderRadius:"8px",color:"#F7F2EA",fontSize:"0.9rem",outline:"none",transition:"border-color 0.2s",boxSizing:"border-box"}}
                        onFocus={e=>e.target.style.borderColor=C.gold}
                        onBlur={e=>e.target.style.borderColor="rgba(197,151,58,0.2)"}/>
                    </div>
                  ))}
                  {err&&<div style={{fontSize:"0.75rem",color:"#FF6B6B",marginBottom:"0.7rem",padding:"0.5rem 0.8rem",background:"rgba(255,107,107,0.1)",borderRadius:"5px"}}>{err}</div>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"0.6rem"}}>
                  <button onClick={()=>setStep(0)} style={{padding:"0.9rem 1rem",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"rgba(247,242,234,0.5)",fontSize:"0.8rem",cursor:"pointer"}}>← Back</button>
                  <button onClick={generate} disabled={loading}
                    style={{padding:"0.9rem",background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,color:C.obsidian,border:"none",borderRadius:"8px",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.1em",cursor:loading?"not-allowed":"pointer",transition:"all 0.2s",boxShadow:`0 6px 20px rgba(197,151,58,0.3)`}}>
                    {loading?"Generating…":"✨ Create My Link"}
                  </button>
                </div>
                <p style={{textAlign:"center",fontSize:"0.65rem",color:"rgba(247,242,234,0.25)",marginTop:"0.8rem",lineHeight:1.5}}>Your number is only used to track and pay your commissions.</p>
              </>
            )}

            {step===2&&(
              <div style={{animation:"fadeIn 0.5s ease"}}>
                {/* Success celebration */}
                <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
                  <div style={{fontSize:"3rem",marginBottom:"0.5rem",animation:"bounceIn 0.6s ease"}}>🎉</div>
                  <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.3rem",color:"#F7F2EA",marginBottom:"0.3rem"}}>You're in!</div>
                  <div style={{fontSize:"0.78rem",color:"rgba(247,242,234,0.5)"}}>Share this link. Earn every time someone books.</div>
                </div>
                {/* Link */}
                <div style={{background:"rgba(0,0,0,0.35)",border:"1px solid rgba(197,151,58,0.3)",borderRadius:"10px",padding:"1rem 1.2rem",marginBottom:"1rem",wordBreak:"break-all",fontSize:"0.76rem",color:C.gold,fontFamily:"monospace",lineHeight:1.6}}>
                  {code}
                </div>
                {/* Action buttons */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.7rem",marginBottom:"0.8rem"}}>
                  <button onClick={copy}
                    style={{padding:"0.9rem",background:copied?"rgba(76,175,125,0.2)":"rgba(197,151,58,0.12)",border:`1px solid ${copied?"rgba(76,175,125,0.5)":"rgba(197,151,58,0.3)"}`,borderRadius:"8px",color:copied?C.success:C.gold,fontSize:"0.8rem",fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>
                    {copied?"✓ Copied!":"📋 Copy Link"}
                  </button>
                  <button onClick={share}
                    style={{padding:"0.9rem",background:"rgba(37,211,102,0.12)",border:"1px solid rgba(37,211,102,0.3)",borderRadius:"8px",color:"#25D366",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>
                    📲 Share Now
                  </button>
                </div>
                <button onClick={()=>{setStep(0);setCode("");setName("");setPhone("");}}
                  style={{width:"100%",padding:"0.7rem",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"rgba(247,242,234,0.35)",fontSize:"0.72rem",cursor:"pointer"}}>
                  Generate for a different number
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}


// ── REFERRAL EARNINGS DASHBOARD ───────────────────────────────────
function ReferralDashboard({ onClose, commissionSettings }) {
  const [phone,setPhone]   = useState("");
  const [err,setErr]       = useState("");
  const [loading,setLoading] = useState(false);
  const [referrer,setReferrer] = useState(null);
  const [claiming,setClaiming] = useState(false);
  const [claimSent,setClaimSent] = useState(false);
  const [claimErr,setClaimErr]   = useState("");

  const normalise = p => { const c=p.replace(/[\s-]/g,""); return c.startsWith("0")?"254"+c.slice(1):c; };
  const validatePhone = p => /^(?:254|0)[17]\d{8}$/.test(p.replace(/[\s-]/g,""));

  const lookup = async() => {
    if(!validatePhone(phone)){ setErr("Enter a valid Safaricom number."); return; }
    setErr(""); setLoading(true);
    const refs = await loadReferrals();
    const normPhone = normalise(phone);
    const found = Object.values(refs).find(r=>r.phone===normPhone);
    if(found) setReferrer(found);
    else setErr("No referral account found for this number. Generate your link first.");
    setLoading(false);
  };

  const claimPayout = async() => {
    if(!referrer || referrer.pendingAmount<=0){ setClaimErr("No pending amount to claim."); return; }
    setClaiming(true); setClaimErr("");
    // Save a claim request in Supabase
    const refs = await loadReferrals();
    const code = referrer.code;
    if(refs[code]){
      refs[code].claimRequested = true;
      refs[code].claimRequestedAt = toKey(new Date());
      await saveReferrals(refs);
      setReferrer({...refs[code]});
    }
    setClaimSent(true);
    setClaiming(false);
  };

  const cs = commissionSettings || DEFAULT_COMMISSION;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(14,43,31,0.85)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",backdropFilter:"blur(10px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:"14px",width:"min(520px,96vw)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.5)",animation:"popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",position:"relative"}}>

        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.teal})`,padding:"1.8rem 2rem 1.5rem",borderRadius:"14px 14px 0 0",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 2px 2px,rgba(197,151,58,0.06) 1px,transparent 0)",backgroundSize:"24px 24px",pointerEvents:"none"}}/>
          <button onClick={onClose} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",color:"rgba(247,242,234,0.5)",fontSize:"1.3rem",cursor:"pointer"}}>✕</button>
          <div style={{fontSize:"0.65rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.gold,marginBottom:"0.5rem"}}>Referral Programme</div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.6rem",color:"#F7F2EA",fontWeight:400}}>My Earnings</div>
          <div style={{fontSize:"0.78rem",color:"rgba(247,242,234,0.55)",marginTop:"0.3rem"}}>
            {cs.type==="percentage" ? `You earn ${cs.value}% on every confirmed booking` : `You earn KES ${fmt(cs.value)} per confirmed booking`}
          </div>
        </div>

        <div style={{padding:"2rem"}}>
          {/* Phone lookup */}
          {!referrer ? (
            <>
              <div style={{marginBottom:"1.2rem"}}>
                <label style={{display:"block",fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem"}}>Your M-Pesa Number</label>
                <div style={{display:"flex",gap:"0.6rem"}}>
                  <input type="tel" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}
                    onKeyDown={e=>e.key==="Enter"&&lookup()}
                    placeholder="e.g. 0712 345 678"
                    style={{flex:1,padding:"0.8rem 1rem",border:`1.5px solid ${err?C.error:C.border}`,borderRadius:"5px",fontSize:"0.9rem",outline:"none",background:"#FDFAF5",color:"#1C1C1C",transition:"border-color 0.2s"}}
                    onFocus={e=>e.target.style.borderColor=C.gold}
                    onBlur={e=>e.target.style.borderColor=err?C.error:C.border}/>
                  <button onClick={lookup} disabled={loading}
                    style={{padding:"0.8rem 1.4rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"5px",fontWeight:700,fontSize:"0.82rem",letterSpacing:"0.1em",textTransform:"uppercase",cursor:loading?"not-allowed":"pointer"}}>
                    {loading?"…":"Look Up"}
                  </button>
                </div>
                {err&&<div style={{fontSize:"0.75rem",color:C.error,marginTop:"0.4rem"}}>{err}</div>}
              </div>
              <div style={{padding:"1rem",background:"#F7F2EA",borderRadius:"8px",fontSize:"0.78rem",color:C.muted,lineHeight:1.7}}>
                💡 Enter the same phone number you used when generating your referral link.
              </div>
            </>
          ) : (
            <div style={{animation:"fadeIn 0.35s ease"}}>
              {/* Greeting */}
              <div style={{display:"flex",alignItems:"center",gap:"0.8rem",marginBottom:"1.5rem",padding:"1rem 1.2rem",background:"#F7F2EA",borderRadius:"8px"}}>
                <div style={{width:"44px",height:"44px",borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},#8B6914)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>👤</div>
                <div>
                  <div style={{fontWeight:600,color:C.cream,fontSize:"0.95rem"}}>{referrer.name}</div>
                  <div style={{fontSize:"0.72rem",color:C.muted}}>+{referrer.phone} · Member since {referrer.createdAt}</div>
                </div>
                <button onClick={()=>{setReferrer(null);setPhone("");setClaimSent(false);}} style={{marginLeft:"auto",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"0.72rem",textDecoration:"underline"}}>Switch</button>
              </div>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.7rem",marginBottom:"1.5rem"}}>
                {[
                  {label:"Total Earned",   val:`KES ${fmt(referrer.totalEarned)}`,  color:C.gold,   bg:"rgba(197,151,58,0.08)",  border:"rgba(197,151,58,0.25)"},
                  {label:"Pending Payout", val:`KES ${fmt(referrer.pendingAmount)}`, color:C.success,bg:"rgba(76,175,125,0.08)", border:"rgba(76,175,125,0.25)"},
                  {label:"Paid Out",       val:`KES ${fmt(referrer.paidAmount)}`,    color:C.muted,  bg:"#F7F2EA",               border:C.border},
                ].map(s=>(
                  <div key={s.label} style={{padding:"1rem 0.8rem",background:s.bg,border:`1px solid ${s.border}`,borderRadius:"8px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.2rem",color:s.color,fontWeight:600,lineHeight:1}}>{s.val}</div>
                    <div style={{fontSize:"0.6rem",letterSpacing:"0.12em",textTransform:"uppercase",color:C.muted,marginTop:"0.3rem"}}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Referral count */}
              <div style={{padding:"0.8rem 1.1rem",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"6px",marginBottom:"1.2rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:"0.82rem",color:C.muted}}>Successful referrals</span>
                <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.gold,fontWeight:600}}>{(referrer.bookingRefs||[]).length}</span>
              </div>

              {/* Referral link reminder */}
              <div style={{padding:"0.8rem 1rem",background:"rgba(197,151,58,0.06)",border:"1px solid rgba(197,151,58,0.2)",borderRadius:"6px",marginBottom:"1.5rem"}}>
                <div style={{fontSize:"0.62rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.gold,marginBottom:"0.3rem"}}>Your Referral Link</div>
                <div style={{fontSize:"0.78rem",color:C.muted,wordBreak:"break-all",fontFamily:"monospace"}}>
                  {`${window.location.origin}?ref=${referrer.code}`}
                </div>
                <button onClick={()=>navigator.clipboard.writeText(`${window.location.origin}?ref=${referrer.code}`)}
                  style={{marginTop:"0.5rem",background:"none",border:"none",color:C.gold,fontSize:"0.72rem",cursor:"pointer",fontWeight:600,padding:0}}>
                  📋 Copy link
                </button>
              </div>

              {/* Claim payout */}
              {claimSent ? (
                <div style={{padding:"1.2rem",background:"rgba(76,175,125,0.08)",border:"1px solid rgba(76,175,125,0.25)",borderRadius:"8px",textAlign:"center"}}>
                  <div style={{fontSize:"1.8rem",marginBottom:"0.5rem"}}>✅</div>
                  <div style={{fontWeight:600,color:C.success,marginBottom:"0.3rem"}}>Payout Request Sent!</div>
                  <div style={{fontSize:"0.8rem",color:C.muted,lineHeight:1.6}}>{cs.notes || "Your host has been notified and will send your M-Pesa payout shortly."}</div>
                </div>
              ) : referrer.claimRequested ? (
                <div style={{padding:"1rem",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"8px",textAlign:"center",fontSize:"0.82rem",color:"#F59E0B"}}>
                  ⏳ Payout request pending — your host will process this shortly.
                </div>
              ) : referrer.pendingAmount > 0 ? (
                <>
                  {claimErr&&<div style={{fontSize:"0.75rem",color:C.error,marginBottom:"0.6rem"}}>{claimErr}</div>}
                  <button onClick={claimPayout} disabled={claiming}
                    style={{width:"100%",padding:"1rem",background:`linear-gradient(135deg,${C.primary},${C.teal})`,color:"#fff",border:`2px solid ${C.gold}`,borderRadius:"8px",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",cursor:claiming?"not-allowed":"pointer",transition:"all 0.2s",boxShadow:`0 4px 16px rgba(197,151,58,0.2)`}}
                    onMouseEnter={e=>{if(!claiming){e.currentTarget.style.background=`linear-gradient(135deg,${C.gold},${C.goldLight})`;e.currentTarget.style.color=C.obsidian;}}}
                    onMouseLeave={e=>{if(!claiming){e.currentTarget.style.background="linear-gradient(135deg,#FF6B6B,#4ECDC4)";e.currentTarget.style.color="#fff";}}}>
                    {claiming?"Sending request…":`📱 Claim KES ${fmt(referrer.pendingAmount)} to M-Pesa`}
                  </button>
                  <p style={{textAlign:"center",fontSize:"0.68rem",color:C.muted,marginTop:"0.5rem"}}>{cs.notes}</p>
                </>
              ) : (
                <div style={{padding:"1rem",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"8px",textAlign:"center",fontSize:"0.82rem",color:C.muted}}>
                  No pending balance to claim yet. Keep sharing your link! 🚀
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ADMIN: REFERRAL COMMISSION MANAGER ────────────────────────────
function ReferralManager({ commissionSettings, onSaveSettings, referrals, onUpdateReferrals }) {
  const [settings, setSettings] = useState({ ...DEFAULT_COMMISSION, ...(commissionSettings||{}) });
  const [saving,setSaving]  = useState(false);
  const [saved,setSaved]    = useState(false);
  const [tab,setTab]        = useState("settings"); // settings | referrers | claims

  useEffect(()=>{
    if(commissionSettings) setSettings(s=>({...s,...commissionSettings}));
  },[commissionSettings]);

  const handleSaveSettings = async() => {
    setSaving(true);
    await onSaveSettings(settings);
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2500);
  };

  const handleMarkPaid = async(code) => {
    const updated = { ...referrals };
    if(updated[code]){
      updated[code].paidAmount    = (updated[code].paidAmount||0) + (updated[code].pendingAmount||0);
      updated[code].totalEarned   = (updated[code].totalEarned||0);
      updated[code].pendingAmount  = 0;
      updated[code].claimRequested = false;
      updated[code].lastPaidAt     = toKey(new Date());
    }
    await onUpdateReferrals(updated);
  };

  const handleMarkUnpaid = async(code) => {
    const updated = { ...referrals };
    if(updated[code]) updated[code].claimRequested = false;
    await onUpdateReferrals(updated);
  };

  const allReferrers   = Object.values(referrals||{});
  const pendingClaims  = allReferrers.filter(r=>r.claimRequested && r.pendingAmount>0);
  const activeReferrers = allReferrers.filter(r=>(r.bookingRefs||[]).length>0 || r.totalEarned>0);
  const totalPendingPayout = allReferrers.reduce((s,r)=>s+(r.pendingAmount||0),0);
  const totalPaidOut       = allReferrers.reduce((s,r)=>s+(r.paidAmount||0),0);

  return (
    <div>
      {/* Page header */}
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:"0.65rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.gold,marginBottom:"0.4rem"}}>Referrals</div>
        <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.cream,fontWeight:400}}>Refer & Earn Manager</h2>
        <p style={{fontSize:"0.85rem",color:C.muted,marginTop:"0.4rem"}}>Set commission rates, view active referrers, and process payout claims.</p>
      </div>

      {/* Summary stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"1rem",marginBottom:"2rem"}}>
        {[
          {label:"Total Referrers",   val:allReferrers.length,            color:C.gold},
          {label:"Active Referrers",  val:activeReferrers.length,         color:C.sage},
          {label:"Pending Claims",    val:pendingClaims.length,           color:"#F59E0B"},
          {label:"Pending Payout",    val:`KES ${fmt(totalPendingPayout)}`,color:C.success},
          {label:"Total Paid Out",    val:`KES ${fmt(totalPaidOut)}`,      color:C.muted},
        ].map(s=>(
          <div key={s.label} style={{padding:"1.2rem",background:"#fff",border:`1px solid ${C.border}`,borderRadius:"8px",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.4rem",color:s.color,fontWeight:600}}>{s.val}</div>
            <div style={{fontSize:"0.62rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginTop:"0.2rem"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:"0",marginBottom:"1.8rem",border:`1px solid ${C.border}`,borderRadius:"6px",overflow:"hidden",maxWidth:"480px"}}>
        {[{id:"settings",icon:"⚙️",label:"Commission Settings"},{id:"claims",icon:"💰",label:`Claims${pendingClaims.length>0?" ("+pendingClaims.length+")":""}`},{id:"referrers",icon:"👥",label:"All Referrers"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"0.7rem 0.8rem",background:tab===t.id?C.gold:"transparent",color:tab===t.id?C.obsidian:C.muted,border:"none",cursor:"pointer",fontSize:"0.72rem",fontWeight:tab===t.id?700:400,letterSpacing:"0.06em",transition:"all 0.2s",whiteSpace:"nowrap"}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Settings tab ── */}
      {tab==="settings"&&(
        <div style={{maxWidth:"480px",background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
          <div style={{marginBottom:"1.3rem"}}>
            <label style={{display:"block",fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem"}}>Commission Type</label>
            <div style={{display:"flex",gap:"0.7rem"}}>
              {[{v:"percentage",l:"Percentage of booking"},{v:"flat",l:"Flat amount per booking"}].map(o=>(
                <button key={o.v} onClick={()=>setSettings(s=>({...s,type:o.v}))}
                  style={{flex:1,padding:"0.7rem",background:settings.type===o.v?C.goldDim:"transparent",border:`1.5px solid ${settings.type===o.v?C.gold:C.border}`,borderRadius:"5px",fontSize:"0.78rem",fontWeight:settings.type===o.v?700:400,color:settings.type===o.v?C.gold:"#1C1C1C",cursor:"pointer",transition:"all 0.2s"}}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          <div style={{marginBottom:"1.3rem"}}>
            <label style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
              <span style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted}}>
                {settings.type==="percentage"?"Commission Percentage":"Commission Amount (KES)"}
              </span>
              <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.gold}}>
                {settings.type==="percentage" ? `${settings.value}%` : `KES ${fmt(settings.value)}`}
              </span>
            </label>
            <input type="range" min={settings.type==="percentage"?1:100} max={settings.type==="percentage"?30:5000}
              step={settings.type==="percentage"?1:100}
              value={settings.value}
              onChange={e=>setSettings(s=>({...s,value:Number(e.target.value)}))}
              style={{width:"100%",accentColor:C.gold}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.62rem",color:C.muted,marginTop:"0.2rem"}}>
              <span>{settings.type==="percentage"?"1%":"KES 100"}</span>
              <span>{settings.type==="percentage"?"30%":"KES 5,000"}</span>
            </div>
          </div>

          <div style={{marginBottom:"1.3rem"}}>
            <label style={{display:"block",fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem"}}>Minimum Booking to Qualify (KES)</label>
            <input type="number" min="0" value={settings.minBooking||0}
              onChange={e=>setSettings(s=>({...s,minBooking:Number(e.target.value)}))}
              style={{width:"100%",padding:"0.75rem 0.9rem",border:`1px solid ${C.border}`,borderRadius:"5px",fontSize:"0.88rem",outline:"none",background:"#fff",transition:"border-color 0.2s"}}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.border}/>
            <div style={{fontSize:"0.68rem",color:C.muted,marginTop:"0.3rem"}}>Set to 0 to earn commission on all bookings.</div>
          </div>

          <div style={{marginBottom:"1.3rem"}}>
            <label style={{display:"block",fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem"}}>Payout Note (shown to referrers)</label>
            <textarea value={settings.notes||""} onChange={e=>setSettings(s=>({...s,notes:e.target.value}))}
              rows={2} placeholder="e.g. Commissions paid within 7 days via M-Pesa."
              style={{width:"100%",padding:"0.75rem 0.9rem",border:`1px solid ${C.border}`,borderRadius:"5px",fontSize:"0.82rem",resize:"vertical",fontFamily:"inherit",outline:"none",background:"#fff"}}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>

          {/* Preview */}
          <div style={{padding:"0.9rem 1rem",background:"rgba(197,151,58,0.06)",border:"1px solid rgba(197,151,58,0.2)",borderRadius:"5px",fontSize:"0.78rem",color:C.mutedLight,marginBottom:"1.3rem",lineHeight:1.6}}>
            💡 Referrers earn <strong style={{color:C.gold}}>
              {settings.type==="percentage" ? `${settings.value}%` : `KES ${fmt(settings.value)}`}
            </strong> per confirmed booking{settings.minBooking>0 ? ` over KES ${fmt(settings.minBooking)}` : ""}.
          </div>

          <button onClick={handleSaveSettings} disabled={saving}
            style={{width:"100%",padding:"0.9rem",background:saved?"#16A34A":C.gold,color:saved?"#fff":C.obsidian,border:"none",borderRadius:"6px",fontWeight:700,fontSize:"0.82rem",letterSpacing:"0.12em",textTransform:"uppercase",cursor:saving?"not-allowed":"pointer",transition:"all 0.3s"}}>
            {saving?"Saving…":saved?"✓ Saved!":"Save Commission Settings"}
          </button>
        </div>
      )}

      {/* ── Claims tab ── */}
      {tab==="claims"&&(
        <div>
          {pendingClaims.length===0 ? (
            <div style={{textAlign:"center",padding:"3rem",color:C.muted}}>
              <div style={{fontSize:"2.5rem",marginBottom:"0.8rem",opacity:0.4}}>💸</div>
              <div style={{fontSize:"0.88rem"}}>No pending payout claims right now.</div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>
              {pendingClaims.map(r=>(
                <div key={r.code} style={{background:"#fff",border:`2px solid rgba(197,151,58,0.3)`,borderRadius:"10px",padding:"1.4rem 1.6rem",display:"flex",alignItems:"center",flexWrap:"wrap",gap:"1rem",boxShadow:"0 2px 12px rgba(197,151,58,0.1)"}}>
                  <div style={{flex:1,minWidth:"200px"}}>
                    <div style={{fontWeight:600,color:C.cream,fontSize:"0.95rem",marginBottom:"0.2rem"}}>{r.name}</div>
                    <div style={{fontSize:"0.75rem",color:C.muted}}>+{r.phone} · Code: <strong style={{color:C.gold}}>{r.code}</strong></div>
                    <div style={{fontSize:"0.72rem",color:C.muted,marginTop:"0.2rem"}}>Requested: {r.claimRequestedAt||"—"} · {r.bookingRefs?.length||0} referral{r.bookingRefs?.length!==1?"s":""}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.4rem",color:C.gold,fontWeight:600}}>KES {fmt(r.pendingAmount)}</div>
                    <div style={{fontSize:"0.65rem",color:C.muted}}>pending payout</div>
                  </div>
                  <div style={{display:"flex",gap:"0.6rem",flexShrink:0}}>
                    <button onClick={()=>handleMarkPaid(r.code)}
                      style={{padding:"0.6rem 1.2rem",background:"#16A34A",color:"#fff",border:"none",borderRadius:"5px",fontSize:"0.75rem",fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}
                      onMouseEnter={e=>e.target.style.background="#15803D"}
                      onMouseLeave={e=>e.target.style.background="#16A34A"}>
                      ✓ Mark Paid
                    </button>
                    <button onClick={()=>handleMarkUnpaid(r.code)}
                      style={{padding:"0.6rem 1rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"5px",fontSize:"0.75rem",color:C.muted,cursor:"pointer"}}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── All Referrers tab ── */}
      {tab==="referrers"&&(
        <div>
          {allReferrers.length===0 ? (
            <div style={{textAlign:"center",padding:"3rem",color:C.muted}}>
              <div style={{fontSize:"2.5rem",marginBottom:"0.8rem",opacity:0.4}}>👥</div>
              <div style={{fontSize:"0.88rem"}}>No referrers yet. They sign up on the homepage.</div>
            </div>
          ) : (
            <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.82rem"}}>
                <thead>
                  <tr style={{background:"#F7F2EA",borderBottom:`1px solid ${C.border}`}}>
                    {["Name","Phone","Code","Referrals","Total Earned","Pending","Status"].map(h=>(
                      <th key={h} style={{padding:"0.8rem 1rem",textAlign:"left",fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,fontWeight:600}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allReferrers.map((r,i)=>(
                    <tr key={r.code} style={{borderBottom:i<allReferrers.length-1?`1px solid ${C.border}`:"none",transition:"background 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#FDFAF5"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"0.9rem 1rem",fontWeight:500,color:C.cream}}>{r.name}</td>
                      <td style={{padding:"0.9rem 1rem",color:C.muted}}>+{r.phone}</td>
                      <td style={{padding:"0.9rem 1rem",fontFamily:"monospace",fontSize:"0.75rem",color:C.gold}}>{r.code}</td>
                      <td style={{padding:"0.9rem 1rem",textAlign:"center",color:"#1C1C1C"}}>{(r.bookingRefs||[]).length}</td>
                      <td style={{padding:"0.9rem 1rem",color:C.gold,fontWeight:500}}>KES {fmt(r.totalEarned)}</td>
                      <td style={{padding:"0.9rem 1rem",color:r.pendingAmount>0?C.success:C.muted,fontWeight:r.pendingAmount>0?600:400}}>KES {fmt(r.pendingAmount||0)}</td>
                      <td style={{padding:"0.9rem 1rem"}}>
                        {r.claimRequested
                          ? <span style={{padding:"0.15rem 0.5rem",background:"rgba(245,158,11,0.12)",color:"#F59E0B",borderRadius:"3px",fontSize:"0.65rem",fontWeight:700}}>Claim Pending</span>
                          : r.pendingAmount>0
                          ? <span style={{padding:"0.15rem 0.5rem",background:"rgba(76,175,125,0.1)",color:C.success,borderRadius:"3px",fontSize:"0.65rem",fontWeight:700}}>Active</span>
                          : <span style={{padding:"0.15rem 0.5rem",background:"#F7F2EA",color:C.muted,borderRadius:"3px",fontSize:"0.65rem"}}>No balance</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── REFER & EARN STANDALONE PAGE ────────────────────────────────
function ReferPage({ commissionSettings, onOpenDashboard }) {
  const cs = commissionSettings || DEFAULT_COMMISSION;
  return (
    <div style={{minHeight:"100vh",paddingTop:"72px",background:"#FDFAF5"}}>
      <ReferAndEarnSection onOpenDashboard={onOpenDashboard}/>
      {/* Extra info strip */}
      <div style={{maxWidth:"800px",margin:"0 auto",padding:"3rem 1.5rem 5rem"}}>
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div style={{fontSize:"0.65rem",letterSpacing:"0.35em",textTransform:"uppercase",color:C.gold,marginBottom:"0.5rem"}}>How commissions work</div>
          <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2rem",color:C.cream,fontWeight:400}}>Simple. Transparent. Fast.</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,220px),1fr))",gap:"1rem",marginBottom:"2.5rem"}}>
          {[
            {icon:"💰",title:"Commission Rate",desc:cs.type==="percentage"?`${cs.value}% of each booking total`:`KES ${fmt(cs.value)} per booking`},
            {icon:"📅",title:"Minimum Booking",desc:cs.minBooking>0?`KES ${fmt(cs.minBooking)} minimum to qualify`:"No minimum — earn on every booking"},
            {icon:"📱",title:"How You're Paid",desc:"M-Pesa payout sent directly to your phone within 7 days"},
            {icon:"🔍",title:"Track Earnings",desc:"Check your balance anytime using your phone number"},
          ].map(f=>(
            <div key={f.title} style={{padding:"1.8rem",background:"#fff",border:`1px solid ${C.border}`,borderRadius:"8px",boxShadow:"0 2px 12px rgba(14,43,31,0.05)"}}>
              <div style={{fontSize:"1.8rem",marginBottom:"0.8rem"}}>{f.icon}</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1rem",color:C.cream,marginBottom:"0.5rem",fontWeight:500}}>{f.title}</div>
              <div style={{fontSize:"0.82rem",color:C.muted,lineHeight:1.6}}>{f.desc}</div>
            </div>
          ))}
        </div>
        {cs.notes&&(
          <div style={{padding:"1.2rem 1.5rem",background:"rgba(255,107,107,0.06)",border:"1px solid rgba(197,151,58,0.2)",borderRadius:"8px",fontSize:"0.85rem",color:C.mutedLight,lineHeight:1.7,textAlign:"center"}}>
            📋 {cs.notes}
          </div>
        )}
        <div style={{textAlign:"center",marginTop:"2rem"}}>
          <button onClick={onOpenDashboard}
            style={{padding:"0.9rem 2.5rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"4px",color:C.gold,fontSize:"0.78rem",fontWeight:600,letterSpacing:"0.2em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=C.goldDim;e.currentTarget.style.borderColor=C.gold;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=C.border;}}>
            Check My Earnings →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN AUTH SYSTEM ────────────────────────────────────────────
const HOST_PIN = "1234"; // default only — overwritten once host sets up profile
const MASTER_TOKEN_KEY = "master_dev_token";

async function hashCredential(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function loadHostProfile() {
  try {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key",`${BRAND.slug}:host_profile`).single();
    return (error || !data) ? null : JSON.parse(data.value);
  } catch { return null; }
}
async function saveHostProfile(profile) {
  await supabase.from("kv_store").upsert({ key:`${BRAND.slug}:host_profile`, value: JSON.stringify(profile) },{ onConflict:"key" });
}
async function loadAdminPin() {
  try {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key",`${BRAND.slug}:pin`).single();
    return (error || !data) ? HOST_PIN : data.value;
  } catch { return HOST_PIN; }
}
async function saveAdminPin(p) {
  await supabase.from("kv_store").upsert({ key:`${BRAND.slug}:pin`, value:p },{ onConflict:"key" });
}
function isMasterSessionActive() {
  const token = sessionStorage.getItem(MASTER_TOKEN_KEY);
  if (!token) return false;
  try {
    const raw = atob(token); const parts = raw.split(":");
    return parts[0]==="master" && Date.now() < Number(parts[1]);
  } catch { return false; }
}

// ── Host Profile Setup ────────────────────────────────────────────
function HostProfileSetup({ onComplete }) {
  const [name,setName]=useState(""); const [contact,setContact]=useState("");
  const [authMethod,setAuthMethod]=useState("pin");
  const [credential,setCredential]=useState(""); const [confirm,setConfirm]=useState("");
  const [err,setErr]=useState(""); const [saving,setSaving]=useState(false); const [step,setStep]=useState(1);
  const nextStep=()=>{ if(!name.trim()){setErr("Please enter your name.");return;} if(!contact.trim()){setErr("Please enter your phone or email.");return;} setErr(""); setStep(2); };
  const finish=async()=>{
    if(authMethod==="pin"){ if(!/^\d{4}$/.test(credential)){setErr("PIN must be exactly 4 digits.");return;} }
    else { if(credential.length<6){setErr("Password must be at least 6 characters.");return;} }
    if(credential!==confirm){setErr(`${authMethod==="pin"?"PINs":"Passwords"} don't match.`);return;}
    setSaving(true);
    const hashed=await hashCredential(credential);
    await saveHostProfile({name:name.trim(),contact:contact.trim(),authMethod,credentialHash:hashed,setupAt:new Date().toISOString()});
    if(authMethod==="pin") await saveAdminPin(credential);
    onComplete();
  };
  const inp={width:"100%",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"6px",padding:"0.8rem 1rem",color:"#1C1C1C",fontSize:"0.9rem",outline:"none",boxSizing:"border-box"};
  return (
    <div style={{minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{width:"100%",maxWidth:"420px",animation:"fadeUp 0.5s ease"}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2rem",color:"#F7F2EA"}}>{BRAND.name}<span style={{color:C.gold,fontStyle:"italic"}}>{BRAND.nameAccent}</span></div>
          <div style={{fontSize:"0.65rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.muted,marginTop:"0.3rem"}}>Host Portal — First-Time Setup</div>
        </div>
        <div style={{background:"#fff",borderRadius:"14px",padding:"2.2rem",boxShadow:"0 32px 80px rgba(0,0,0,0.3)"}}>
          <div style={{display:"flex",gap:"0.4rem",marginBottom:"1.8rem"}}>
            {[1,2].map(s=><div key={s} style={{flex:1,height:"3px",borderRadius:"2px",background:step>=s?C.gold:"rgba(14,43,31,0.1)",transition:"all 0.3s"}}/>)}
          </div>
          {step===1&&(<>
            <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
              <div style={{fontSize:"1.8rem",marginBottom:"0.5rem"}}>👋</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.2rem",color:C.cream}}>Welcome to your Host Portal</div>
              <div style={{fontSize:"0.78rem",color:C.muted,marginTop:"0.3rem"}}>Let's set up your account — takes 30 seconds.</div>
            </div>
            <div style={{marginBottom:"1rem"}}>
              <label style={{display:"block",fontSize:"0.65rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.4rem"}}>Your Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} style={inp} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border} placeholder="e.g. Sarah Kamau"/>
            </div>
            <div style={{marginBottom:"1.2rem"}}>
              <label style={{display:"block",fontSize:"0.65rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.4rem"}}>Phone Number or Email</label>
              <input value={contact} onChange={e=>setContact(e.target.value)} style={inp} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border} placeholder="07xx xxx xxx or name@email.com"/>
              <div style={{fontSize:"0.68rem",color:C.muted,marginTop:"0.3rem"}}>Used if you ever need account recovery.</div>
            </div>
            {err&&<div style={{fontSize:"0.78rem",color:C.error,marginBottom:"0.8rem",padding:"0.5rem 0.8rem",background:"rgba(224,82,82,0.08)",borderRadius:"4px"}}>{err}</div>}
            <button onClick={nextStep} style={{width:"100%",background:C.gold,color:C.obsidian,border:"none",padding:"0.9rem",borderRadius:"6px",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",letterSpacing:"0.1em"}}>Continue →</button>
          </>)}
          {step===2&&(<>
            <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
              <div style={{fontSize:"1.8rem",marginBottom:"0.5rem"}}>🔐</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.2rem",color:C.cream}}>Choose your login method</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem",marginBottom:"1.4rem"}}>
              {[{id:"pin",icon:"🔢",label:"4-Digit PIN",sub:"Quick tap"},{id:"password",icon:"🔑",label:"Password",sub:"More secure"}].map(m=>(
                <button key={m.id} onClick={()=>{setAuthMethod(m.id);setCredential("");setConfirm("");setErr("");}} style={{padding:"1rem 0.8rem",background:authMethod===m.id?C.goldDim:"#F7F2EA",border:`2px solid ${authMethod===m.id?C.gold:C.border}`,borderRadius:"8px",cursor:"pointer",transition:"all 0.2s",textAlign:"center"}}>
                  <div style={{fontSize:"1.3rem",marginBottom:"0.3rem"}}>{m.icon}</div>
                  <div style={{fontSize:"0.78rem",fontWeight:600,color:C.cream}}>{m.label}</div>
                  <div style={{fontSize:"0.65rem",color:C.muted}}>{m.sub}</div>
                </button>
              ))}
            </div>
            {authMethod==="pin"?(<>
              <div style={{marginBottom:"1rem"}}>
                <label style={{display:"block",fontSize:"0.65rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.4rem"}}>4-Digit PIN</label>
                <input type="password" inputMode="numeric" maxLength={4} value={credential} onChange={e=>setCredential(e.target.value.replace(/\D/g,"").slice(0,4))} style={{...inp,letterSpacing:"0.5em",textAlign:"center",fontSize:"1.3rem"}} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border} placeholder="••••"/>
              </div>
              <div style={{marginBottom:"1.2rem"}}>
                <label style={{display:"block",fontSize:"0.65rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.4rem"}}>Confirm PIN</label>
                <input type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={e=>setConfirm(e.target.value.replace(/\D/g,"").slice(0,4))} style={{...inp,letterSpacing:"0.5em",textAlign:"center",fontSize:"1.3rem"}} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border} placeholder="••••"/>
              </div>
            </>):(<>
              <div style={{marginBottom:"1rem"}}>
                <label style={{display:"block",fontSize:"0.65rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.4rem"}}>Password</label>
                <input type="password" value={credential} onChange={e=>setCredential(e.target.value)} style={inp} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border} placeholder="Min. 6 characters"/>
              </div>
              <div style={{marginBottom:"1.2rem"}}>
                <label style={{display:"block",fontSize:"0.65rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.4rem"}}>Confirm Password</label>
                <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} style={inp} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border} placeholder="Repeat password"/>
              </div>
            </>)}
            {err&&<div style={{fontSize:"0.78rem",color:C.error,marginBottom:"0.8rem",padding:"0.5rem 0.8rem",background:"rgba(224,82,82,0.08)",borderRadius:"4px"}}>{err}</div>}
            <div style={{display:"flex",gap:"0.6rem"}}>
              <button onClick={()=>{setStep(1);setErr("");}} style={{flex:0,background:"#F7F2EA",color:C.muted,border:`1px solid ${C.border}`,padding:"0.9rem 1.2rem",borderRadius:"6px",fontSize:"0.85rem",cursor:"pointer"}}>← Back</button>
              <button onClick={finish} disabled={saving} style={{flex:1,background:C.gold,color:C.obsidian,border:"none",padding:"0.9rem",borderRadius:"6px",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",letterSpacing:"0.1em"}}>{saving?"Setting up…":"Complete Setup"}</button>
            </div>
            <div style={{fontSize:"0.68rem",color:C.muted,textAlign:"center",marginTop:"1rem",lineHeight:1.5}}>Forgot your {authMethod==="pin"?"PIN":"password"} later? Contact your site administrator.</div>
          </>)}
        </div>
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────
function AdminLogin({ onLogin, profile }) {
  const [credential,setCredential]=useState(""); const [err,setErr]=useState("");
  const [shaking,setShaking]=useState(false); const [loading,setLoading]=useState(false);
  const [showMaster,setShowMaster]=useState(false);
  const [masterPw,setMasterPw]=useState(""); const [masterErr,setMasterErr]=useState(""); const [masterLoading,setMasterLoading]=useState(false);
  const authMethod=profile?.authMethod||"pin"; const isPIN=authMethod==="pin";
  const shake=()=>{setShaking(true);setTimeout(()=>setShaking(false),600);};
  const tryLogin=async(value)=>{
    const cred=value??credential;
    if(isPIN&&cred.length<4) return;
    setLoading(true);
    try {
      const hashed=await hashCredential(cred);
      let ok=false;
      if(profile?.credentialHash){ ok=hashed===profile.credentialHash; }
      else { const stored=await loadAdminPin(); ok=cred===stored; }
      if(ok){ onLogin(); } else { setErr(`Incorrect ${isPIN?"PIN":"password"}. Try again.`); shake(); setCredential(""); }
    } finally { setLoading(false); }
  };
  const pad=(d)=>{ if(credential.length>=4) return; const next=credential+d; setCredential(next); setErr(""); if(next.length===4) tryLogin(next); };
  const del=()=>setCredential(p=>p.slice(0,-1));
  const masterLogin=async()=>{
    setMasterLoading(true); setMasterErr("");
    try {
      const res=await fetch("/api/master-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:masterPw})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok){setMasterErr(data?.error||"Incorrect master password.");setMasterLoading(false);return;}
      sessionStorage.setItem(MASTER_TOKEN_KEY,data.token);
      onLogin();
    } catch{setMasterErr("Could not connect. Try again.");}finally{setMasterLoading(false);}
  };
  const inp={width:"100%",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"6px",padding:"0.85rem 1rem",color:"#1C1C1C",fontSize:"0.9rem",outline:"none",boxSizing:"border-box"};
  return (
    <div style={{minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"url(https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1400&q=60)",backgroundSize:"cover",backgroundPosition:"center",opacity:0.06}}/>
      <div style={{position:"relative",width:"100%",maxWidth:"380px",animation:"fadeUp 0.6s ease"}}>
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"2rem",color:"#F7F2EA"}}>{BRAND.name}<span style={{color:C.gold,fontStyle:"italic"}}>{BRAND.nameAccent}</span></div>
          <div style={{fontSize:"0.68rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.muted,marginTop:"0.25rem"}}>Host Portal</div>
        </div>
        {!showMaster?(
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"14px",padding:"2.2rem",boxShadow:"0 32px 80px rgba(0,0,0,0.3)",animation:shaking?"shake 0.5s ease":"none"}}>
            <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
@keyframes popIn{0%{opacity:0;transform:scale(0.7) translateY(60px)}70%{transform:scale(1.04) translateY(-6px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes popOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0.8) translateY(40px)}}
@keyframes floatUp{0%{opacity:0;transform:translateY(0)}10%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translateY(-80px)}}
@keyframes swing{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(120px) rotate(720deg);opacity:0}}
@keyframes firework{0%{transform:scale(0);opacity:1}100%{transform:scale(1.5);opacity:0}}
@keyframes ribbonSlide{0%{transform:translateX(-110%)}100%{transform:translateX(0)}}
@keyframes heartBeat{0%,100%{transform:scale(1)}14%{transform:scale(1.3)}28%{transform:scale(1)}42%{transform:scale(1.2)}70%{transform:scale(1)}}
@keyframes starTwinkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.6)}}
@keyframes rotateSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes bounceIn{0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(0.95)}100%{transform:scale(1);opacity:1}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(197,151,58,0.4)}50%{box-shadow:0 0 60px rgba(197,151,58,0.9),0 0 100px rgba(197,151,58,0.4)}}
@keyframes slideInLeft{from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes flagWave{0%,100%{transform:skewX(0deg)}25%{transform:skewX(-3deg)}75%{transform:skewX(3deg)}}
@keyframes drip{0%{transform:scaleY(0);transform-origin:top}100%{transform:scaleY(1);transform-origin:top}}
@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes typingDot{0%,60%,100%{transform:translateY(0);opacity:0.5}30%{transform:translateY(-6px);opacity:1}}
@keyframes conciergeRing{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.9);opacity:0}}
@keyframes conciergeOpen{0%{opacity:0;transform:scale(0.85) translateY(20px);transform-origin:bottom right}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes scanline{0%{top:0%}100%{top:100%}}
@keyframes disco{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}`}</style>
            <div style={{textAlign:"center",marginBottom:"1.8rem"}}>
              <div style={{width:"52px",height:"52px",borderRadius:"50%",background:C.goldDim,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",margin:"0 auto 1rem"}}>🔐</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.3rem",color:C.cream,marginBottom:"0.25rem"}}>{profile?`Welcome back${profile.name?", "+profile.name.split(" ")[0]:""}!`:"Welcome back"}</div>
              <div style={{fontSize:"0.78rem",color:C.muted}}>{isPIN?"Enter your 4-digit PIN":"Enter your password"}</div>
            </div>
            {isPIN?(<>
              <div style={{display:"flex",justifyContent:"center",gap:"1rem",marginBottom:"2rem"}}>
                {[0,1,2,3].map(i=><div key={i} style={{width:"14px",height:"14px",borderRadius:"50%",border:`2px solid ${credential.length>i?C.gold:"rgba(14,43,31,0.15)"}`,background:credential.length>i?C.gold:"transparent",transition:"all 0.2s"}}/>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.6rem",marginBottom:"0.8rem"}}>
                {[1,2,3,4,5,6,7,8,9].map(d=>(
                  <button key={d} onClick={()=>pad(String(d))} disabled={loading} style={{padding:"1rem",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"8px",color:"#1C1C1C",fontSize:"1.2rem",fontWeight:500,cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background=C.goldDim;e.currentTarget.style.borderColor=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.background="#F7F2EA";e.currentTarget.style.borderColor=C.border;}}>{d}</button>
                ))}
                <div/>
                <button onClick={()=>pad("0")} disabled={loading} style={{padding:"1rem",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"8px",color:"#1C1C1C",fontSize:"1.2rem",fontWeight:500,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.background=C.goldDim;e.currentTarget.style.borderColor=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.background="#F7F2EA";e.currentTarget.style.borderColor=C.border;}}>0</button>
                <button onClick={del} style={{padding:"1rem",background:"#EEEBE4",border:`1px solid ${C.border}`,borderRadius:"8px",color:C.muted,fontSize:"1.1rem",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.color=C.cream} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>⌫</button>
              </div>
            </>):(
              <div style={{marginBottom:"1.5rem"}}>
                <input type="password" value={credential} onChange={e=>{setCredential(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&tryLogin()} style={inp} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border} placeholder="Enter your password" autoFocus/>
                <button onClick={()=>tryLogin()} disabled={loading} style={{width:"100%",marginTop:"0.9rem",background:C.gold,color:C.obsidian,border:"none",padding:"0.9rem",borderRadius:"6px",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>{loading?"Checking…":"Sign In"}</button>
              </div>
            )}
            {err&&<div style={{textAlign:"center",fontSize:"0.78rem",color:C.error,padding:"0.4rem",animation:"fadeIn 0.2s ease"}}>{err}</div>}
            {loading&&isPIN&&<div style={{textAlign:"center",marginTop:"0.6rem"}}><div style={{width:"20px",height:"20px",border:`2px solid ${C.goldDim}`,borderTop:`2px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}}/></div>}
            <div style={{textAlign:"center",marginTop:"1.5rem"}}>
              <button onClick={()=>{setShowMaster(true);setErr("");}} style={{background:"none",border:"none",fontSize:"0.65rem",color:"rgba(14,43,31,0.25)",cursor:"pointer",letterSpacing:"0.05em"}} onMouseEnter={e=>e.currentTarget.style.color=C.muted} onMouseLeave={e=>e.currentTarget.style.color="rgba(14,43,31,0.25)"}>Developer Access</button>
            </div>
          </div>
        ):(
          <div style={{background:"#fff",borderRadius:"14px",padding:"2.2rem",boxShadow:"0 32px 80px rgba(0,0,0,0.3)"}}>
            <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
              <div style={{fontSize:"1.8rem",marginBottom:"0.5rem"}}>🛠</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.2rem",color:C.cream}}>Developer Access</div>
              <div style={{fontSize:"0.76rem",color:C.muted,marginTop:"0.3rem"}}>Enter the master password for this deployment.</div>
            </div>
            <input type="password" value={masterPw} onChange={e=>{setMasterPw(e.target.value);setMasterErr("");}} onKeyDown={e=>e.key==="Enter"&&masterLogin()} style={inp} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border} placeholder="Master password" autoFocus/>
            {masterErr&&<div style={{fontSize:"0.78rem",color:C.error,marginTop:"0.6rem",padding:"0.5rem 0.8rem",background:"rgba(224,82,82,0.08)",borderRadius:"4px"}}>{masterErr}</div>}
            <div style={{display:"flex",gap:"0.6rem",marginTop:"1rem"}}>
              <button onClick={()=>{setShowMaster(false);setMasterPw("");setMasterErr("");}} style={{flex:0,background:"#F7F2EA",color:C.muted,border:`1px solid ${C.border}`,padding:"0.9rem 1.2rem",borderRadius:"6px",fontSize:"0.85rem",cursor:"pointer"}}>← Back</button>
              <button onClick={masterLogin} disabled={masterLoading} style={{flex:1,background:C.cream,color:"#F7F2EA",border:"none",padding:"0.9rem",borderRadius:"6px",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>{masterLoading?"Verifying…":"Enter"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.5rem 1.8rem",transition:"all 0.2s",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderHover} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"}}>
        <div style={{fontSize:"1.4rem"}}>{icon}</div>
        {sub&&<div style={{fontSize:"0.65rem",padding:"0.2rem 0.5rem",background:C.goldDim,border:`1px solid ${C.border}`,borderRadius:"3px",color:C.gold,letterSpacing:"0.1em"}}>{sub}</div>}
      </div>
      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.9rem",color:color||C.gold,marginBottom:"0.3rem"}}>{value}</div>
      <div style={{fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted}}>{label}</div>
    </div>
  );
}

// ── Mini Calendar for Admin ───────────────────────────────────────
function AdminMiniCalendar({ listing }) {
  const today=new Date(); today.setHours(0,0,0,0);
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth());
  const booked=new Set(listing.bookedDates||[]);
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const todayKey=toKey(today);
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const prevM=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const nextM=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.6rem"}}>
        <button onClick={prevM} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"1rem",padding:"0 0.3rem"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color=C.muted}>‹</button>
        <span style={{fontSize:"0.78rem",color:"#F7F2EA",fontWeight:500}}>{MONTHS[month].slice(0,3)} {year}</span>
        <button onClick={nextM} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"1rem",padding:"0 0.3rem"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color=C.muted}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px"}}>
        {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:"0.55rem",color:C.muted,paddingBottom:"3px"}}>{d}</div>)}
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const key=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const isBooked=booked.has(key);
          const isPast=key<todayKey;
          const isToday=key===todayKey;
          return (
            <div key={key} style={{textAlign:"center",padding:"3px 1px",borderRadius:"3px",fontSize:"0.65rem",background:isBooked?"rgba(224,82,82,0.18)":isToday?C.goldDim:"transparent",color:isBooked?C.error:isToday?C.gold:isPast?C.muted:C.mutedLight,fontWeight:isToday?700:400}}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dashboard Home ────────────────────────────────────────────────
function DashboardHome({ listings, bookings }) {
  const totalRevenue=bookings.reduce((s,b)=>s+(b.total||0),0);
  const totalNights=bookings.reduce((s,b)=>s+(b.nights||0),0);
  const avgNightly=bookings.length?Math.round(totalRevenue/bookings.length):0;
  const occupiedIds=new Set(bookings.map(b=>b.listing?.id));
  const allDatesBooked=listings.flatMap(l=>l.bookedDates||[]);
  const thisMonth=new Date().toISOString().slice(0,7);
  const thisMonthBookings=bookings.filter(b=>b.checkIn&&b.checkIn.startsWith(thisMonth));
  const thisMonthRev=thisMonthBookings.reduce((s,b)=>s+(b.total||0),0);

  return (
    <div>
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:"0.68rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.gold,marginBottom:"0.4rem"}}>Overview</div>
        <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.cream,fontWeight:400}}>Dashboard</h2>
      </div>

      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"1rem",marginBottom:"2.5rem"}}>
        <StatCard icon="💰" label="Total Revenue" value={`KES ${fmt(totalRevenue)}`} sub="All time"/>
        <StatCard icon="📅" label="This Month" value={`KES ${fmt(thisMonthRev)}`} sub={`${thisMonthBookings.length} bookings`} color={C.goldLight}/>
        <StatCard icon="🏠" label="Active Listings" value={listings.length} sub="Live"/>
        <StatCard icon="🌙" label="Nights Booked" value={totalNights} sub="All time"/>
        <StatCard icon="👥" label="Guests Hosted" value={bookings.length} sub="Confirmed"/>
        <StatCard icon="⭐" label="Avg Rating" value="4.95" sub="Across all"/>
      </div>

      {/* Listings occupancy */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.5rem",marginBottom:"2rem",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}}>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.cream,marginBottom:"1.2rem",fontWeight:400}}>Listing Occupancy — June 2026</div>
        <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
          {listings.map(l=>{
            const lBookings=bookings.filter(b=>b.listing?.id===l.id);
            const lNights=lBookings.reduce((s,b)=>s+(b.nights||0),0);
            const pct=Math.min(100,Math.round((lNights/30)*100));
            const lRev=lBookings.reduce((s,b)=>s+(b.total||0),0);
            return (
              <div key={l.id}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",color:C.mutedLight,marginBottom:"0.3rem"}}>
                  <span>{l.name}</span>
                  <span style={{color:C.gold}}>KES {fmt(lRev)} · {lNights}n</span>
                </div>
                <div style={{height:"5px",background:"rgba(255,255,255,0.06)",borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.gold},${C.goldLight})`,borderRadius:"3px",transition:"width 0.8s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent bookings */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.5rem",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}}>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.cream,marginBottom:"1.2rem",fontWeight:400}}>Recent Bookings</div>
        {bookings.length===0?(
          <div style={{textAlign:"center",padding:"2rem",color:C.muted,fontSize:"0.85rem"}}>No bookings yet. When guests book, they'll appear here.</div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:"0.7rem"}}>
            {[...bookings].reverse().slice(0,8).map((b,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.8rem 1rem",background:"#F7F2EA",borderRadius:"6px",border:`1px solid ${C.border}`,flexWrap:"wrap",gap:"0.5rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.8rem"}}>
                  <div style={{width:"34px",height:"34px",borderRadius:"50%",background:C.goldDim,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem",flexShrink:0}}>👤</div>
                  <div>
                    <div style={{fontSize:"0.85rem",color:C.cream,fontWeight:500}}>{b.name||"Guest"}</div>
                    <div style={{fontSize:"0.72rem",color:C.muted}}>{b.listing?.name} · {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:"0.88rem",color:C.gold,fontWeight:600}}>KES {fmt(b.total)}</div>
                  <div style={{fontSize:"0.65rem",color:C.success,marginTop:"0.1rem"}}>✓ Confirmed · {b.ref}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bookings Manager ──────────────────────────────────────────────
function BookingsManager({ bookings, listings }) {
  const [search,setSearch]=useState("");
  const [filterL,setFilterL]=useState("all");
  const filtered=bookings.filter(b=>{
    const matchSearch=!search||(b.name||"").toLowerCase().includes(search.toLowerCase())||(b.ref||"").toLowerCase().includes(search.toLowerCase())||(b.listing?.name||"").toLowerCase().includes(search.toLowerCase());
    const matchL=filterL==="all"||(b.listing?.id===filterL);
    return matchSearch&&matchL;
  });
  const totalRev=filtered.reduce((s,b)=>s+(b.total||0),0);
  return (
    <div>
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:"0.68rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.gold,marginBottom:"0.4rem"}}>Records</div>
        <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.cream,fontWeight:400}}>All Bookings</h2>
      </div>
      {/* Filters */}
      <div style={{display:"flex",gap:"0.8rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search guest, ref, property…"
          style={{flex:1,minWidth:"200px",background:"#fff",border:`1px solid ${C.border}`,borderRadius:"5px",padding:"0.7rem 1rem",color:"#1C1C1C",fontSize:"0.85rem",outline:"none"}}
          onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
        <select value={filterL} onChange={e=>setFilterL(e.target.value)} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"5px",padding:"0.7rem 1rem",color:"#1C1C1C",fontSize:"0.85rem",outline:"none",cursor:"pointer"}}>
          <option value="all">All Properties</option>
          {listings.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      {/* Summary row */}
      <div style={{display:"flex",gap:"1rem",marginBottom:"1.5rem",padding:"0.8rem 1.2rem",background:C.goldDim,border:`1px solid ${C.border}`,borderRadius:"6px",fontSize:"0.8rem",color:C.muted,flexWrap:"wrap"}}>
        <span><span style={{color:C.gold,fontWeight:600}}>{filtered.length}</span> bookings</span>
        <span>·</span>
        <span>Total revenue: <span style={{color:C.gold,fontWeight:600}}>KES {fmt(totalRev)}</span></span>
        <span>·</span>
        <span>Nights: <span style={{color:C.gold,fontWeight:600}}>{filtered.reduce((s,b)=>s+(b.nights||0),0)}</span></span>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"4rem",color:C.muted,background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px"}}>
          {bookings.length===0?"No bookings yet.":"No bookings match your search."}
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:"0.7rem"}}>
          {[...filtered].reverse().map((b,i)=>(
            <div key={i} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"8px",padding:"1.2rem 1.5rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)",display:"flex",gap:"1.5rem",alignItems:"center",flexWrap:"wrap"}}>
              <div style={{width:"40px",height:"40px",borderRadius:"50%",background:C.goldDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",flexShrink:0}}>👤</div>
              <div style={{flex:1,minWidth:"160px"}}>
                <div style={{fontWeight:500,color:C.cream,fontSize:"0.92rem"}}>{b.name||"Guest"}</div>
                <div style={{fontSize:"0.72rem",color:C.muted,marginTop:"0.15rem"}}>📱 {b.phone||"—"} · Ref: <span style={{color:C.gold}}>{b.ref}</span></div>
              </div>
              <div style={{flex:1,minWidth:"160px"}}>
                <div style={{fontSize:"0.85rem",color:C.mutedLight}}>{b.listing?.name}</div>
                <div style={{fontSize:"0.75rem",color:C.muted,marginTop:"0.15rem"}}>{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)} · {b.nights}n · {b.guests} guest{b.guests>1?"s":""}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.gold}}>KES {fmt(b.total)}</div>
                <div style={{fontSize:"0.65rem",color:C.success,marginTop:"0.1rem"}}>✓ Confirmed</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings Panel ────────────────────────────────────────────────
function SettingsPanel({ onLogout, hostProfile, onProfileSaved }) {
  const [currentCred,setCurrentCred]=useState("");
  const [newCred,setNewCred]=useState("");
  const [confirmCred,setConfirmCred]=useState("");
  const [msg,setMsg]=useState(null);
  const [saving,setSaving]=useState(false);

  const authMethod=hostProfile?.authMethod||"pin";
  const isPIN=authMethod==="pin";
  const label=isPIN?"PIN":"Password";

  const changeCred=async()=>{
    setMsg(null);
    if(!hostProfile?.credentialHash){setMsg({type:"error",text:"No profile found. Please contact your administrator."});return;}
    const currentHash=await hashCredential(currentCred);
    if(currentHash!==hostProfile.credentialHash){setMsg({type:"error",text:`Current ${label} is incorrect.`});return;}
    if(isPIN){if(!/^\d{4}$/.test(newCred)){setMsg({type:"error",text:"New PIN must be exactly 4 digits."});return;}}
    else{if(newCred.length<6){setMsg({type:"error",text:"New password must be at least 6 characters."});return;}}
    if(newCred!==confirmCred){setMsg({type:"error",text:`New ${label}s don't match.`});return;}
    setSaving(true);
    const newHash=await hashCredential(newCred);
    const updated={...hostProfile,credentialHash:newHash};
    await saveHostProfile(updated);
    if(isPIN) await saveAdminPin(newCred);
    if(onProfileSaved) onProfileSaved(updated);
    setMsg({type:"success",text:`${label} updated successfully.`});
    setCurrentCred(""); setNewCred(""); setConfirmCred("");
    setSaving(false);
  };

  const inp={width:"100%",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"4px",padding:"0.75rem 1rem",color:"#1C1C1C",fontSize:isPIN?"1.2rem":"0.9rem",letterSpacing:isPIN?"0.5em":"normal",outline:"none",textAlign:isPIN?"center":"left",boxSizing:"border-box"};

  return (
    <div>
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:"0.68rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.gold,marginBottom:"0.4rem"}}>Configuration</div>
        <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.cream,fontWeight:400}}>Settings</h2>
      </div>

      {/* Host profile card */}
      {hostProfile&&(
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.5rem 1.8rem",marginBottom:"1.5rem",maxWidth:"480px",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}}>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.cream,marginBottom:"1rem",fontWeight:400}}>Your Profile</div>
          <div style={{display:"grid",gap:"0.6rem"}}>
            {[{label:"Name",value:hostProfile.name},{label:"Contact",value:hostProfile.contact},{label:"Login method",value:hostProfile.authMethod==="pin"?"4-Digit PIN":"Password"},{label:"Account set up",value:hostProfile.setupAt?new Date(hostProfile.setupAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—"}].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:"0.72rem",letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted}}>{r.label}</span>
                <span style={{fontSize:"0.85rem",color:C.cream,fontWeight:500}}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credential change */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.8rem",marginBottom:"1.5rem",maxWidth:"520px",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}}>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.cream,marginBottom:"1.2rem",fontWeight:400}}>Change {label}</div>
        {[{lbl:`Current ${label}`,val:currentCred,set:setCurrentCred},{lbl:`New ${label}${isPIN?" (4 digits)":""} `,val:newCred,set:setNewCred},{lbl:`Confirm new ${label}`,val:confirmCred,set:setConfirmCred}].map(f=>(
          <div key={f.lbl} style={{marginBottom:"0.9rem"}}>
            <label style={{display:"block",fontSize:"0.65rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.3rem"}}>{f.lbl}</label>
            <input type="password" inputMode={isPIN?"numeric":undefined} maxLength={isPIN?4:undefined} value={f.val} onChange={e=>f.set(isPIN?e.target.value.replace(/\D/g,"").slice(0,4):e.target.value)} style={inp} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
        ))}
        {msg&&<div style={{fontSize:"0.78rem",color:msg.type==="error"?C.error:C.success,padding:"0.5rem 0.8rem",background:msg.type==="error"?"rgba(224,82,82,0.08)":"rgba(76,175,125,0.08)",borderRadius:"4px",marginBottom:"0.8rem"}}>{msg.text}</div>}
        <button onClick={changeCred} disabled={saving} style={{background:C.gold,color:C.obsidian,border:"none",padding:"0.8rem 1.8rem",borderRadius:"5px",fontSize:"0.8rem",fontWeight:600,letterSpacing:"0.12em",cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>{saving?"Saving…":`Update ${label}`}</button>
      </div>

      {/* Loading screen editor */}
      <SplashConfigPanel/>

      {/* Site content hint */}
      <div style={{background:C.goldDim,border:`1px solid rgba(197,151,58,0.35)`,borderRadius:"10px",padding:"1.4rem 1.6rem",marginBottom:"1.5rem",maxWidth:"480px",display:"flex",alignItems:"center",gap:"1rem"}}>
        <span style={{fontSize:"1.5rem",flexShrink:0}}>✏️</span>
        <div style={{flex:1}}>
          <div style={{fontSize:"0.85rem",fontWeight:600,color:C.cream,marginBottom:"0.2rem"}}>Update Contact & About Info</div>
          <div style={{fontSize:"0.75rem",color:C.muted}}>Edit your contact details and About Us content from the Site Content tab.</div>
        </div>
      </div>
      <button onClick={onLogout} style={{background:"rgba(224,82,82,0.1)",color:C.error,border:"1px solid rgba(224,82,82,0.25)",padding:"0.7rem 1.8rem",borderRadius:"5px",fontSize:"0.8rem",fontWeight:500,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(224,82,82,0.18)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(224,82,82,0.1)";}}>Sign Out of Host Portal</button>
    </div>
  );
}

// ── STAGE 4: LISTING EDITOR ───────────────────────────────────────

const ALL_AMENITIES = [
  "WiFi","Fast WiFi","Smart TV","Netflix","Kitchen","Full Kitchen","Kitchenette",
  "Air Conditioning","Heating","Washing Machine","Dryer","Iron & Board",
  "Workspace","Gym Access","Gym","Pool","Rooftop Pool","Private Pool","Hot Tub",
  "Parking","Secure Parking","Parking x4","Garden Access","Private Garden",
  "BBQ","Fireplace","City View","River View","Mountain View",
  "24/7 Security","Security","Generator","Elevator","Pet Friendly",
  "Kids Play Area","Housekeeper","Gardener","Concierge",
  "Coffee Machine","Dishwasher","Microwave","Balcony",
];

const BADGE_OPTIONS = ["Guest Favourite","Popular","New","Business Pick","Design Pick","Luxury"];
const TYPE_OPTIONS  = ["Studio","Loft Studio","1-Bedroom Suite","2-Bedroom Apartment","3-Bedroom Villa","Penthouse Suite","Cottage","Apartment"];

// Shared field style
const field = {
  background:"#F7F2EA", border:`1px solid ${C.border}`,
  borderRadius:"5px", padding:"0.75rem 1rem",
  color:"#1C1C1C", fontSize:"0.88rem", outline:"none", width:"100%",
  transition:"border-color 0.2s",
};
const fieldFocus = e => e.target.style.borderColor = C.gold;
const fieldBlur  = e => e.target.style.borderColor = C.border;

// Section header inside editor
function EditorSection({ title, icon, children }) {
  const [open,setOpen]=useState(true);
  return (
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden",marginBottom:"1.2rem",boxShadow:"0 2px 8px rgba(14,43,31,0.06)"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem 1.4rem",background:open?"#fff":"#FAFAF7",border:"none",cursor:"pointer",color:C.cream,borderBottom:open?`1px solid ${C.border}`:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.7rem"}}>
          <span style={{fontSize:"1rem"}}>{icon}</span>
          <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1rem",fontWeight:500}}>{title}</span>
        </div>
        <span style={{color:C.muted,fontSize:"0.85rem",transition:"transform 0.2s",transform:open?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
      </button>
      {open&&<div style={{padding:"1.4rem"}}>{children}</div>}
    </div>
  );
}

// Label + input wrapper
function Field({ label, children }) {
  return (
    <div style={{marginBottom:"1rem"}}>
      <label style={{display:"block",fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.35rem"}}>{label}</label>
      {children}
    </div>
  );
}

// Toast notification
function Toast({ msg, type, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,2800); return()=>clearTimeout(t); },[]);
  return (
    <div style={{position:"fixed",bottom:"2rem",right:"2rem",zIndex:9999,background:type==="success"?"rgba(22,163,74,0.1)":"rgba(220,38,38,0.08)",border:`1px solid ${type==="success"?"rgba(76,175,125,0.4)":"rgba(224,82,82,0.4)"}`,borderRadius:"8px",padding:"0.9rem 1.4rem",color:type==="success"?C.success:C.error,fontSize:"0.85rem",fontWeight:500,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",animation:"slideUp 0.3s ease",display:"flex",alignItems:"center",gap:"0.6rem"}}>
      <span>{type==="success"?"✓":"✕"}</span>{msg}
    </div>
  );
}

// Confirm dialog
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(14,43,31,0.72)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}} onClick={onCancel}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"2rem",maxWidth:"380px",width:"90%",animation:"slideUp 0.25s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:"1.5rem",marginBottom:"0.8rem",textAlign:"center"}}>⚠️</div>
        <div style={{textAlign:"center",color:"#1C1C1C",fontSize:"0.92rem",lineHeight:1.6,marginBottom:"1.5rem"}}>{message}</div>
        <div style={{display:"flex",gap:"0.8rem"}}>
          <button onClick={onCancel} style={{flex:1,padding:"0.75rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"5px",color:C.muted,cursor:"pointer",fontSize:"0.82rem"}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:1,padding:"0.75rem",background:"rgba(224,82,82,0.15)",border:"1px solid rgba(224,82,82,0.3)",borderRadius:"5px",color:C.error,cursor:"pointer",fontSize:"0.82rem",fontWeight:600}}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Photo Manager ─────────────────────────────────────────────────
function PhotoManager({ photos, onChange }) {
  const [tab,setTab]       = useState("upload"); // "upload" | "url"
  const [newUrl,setNewUrl] = useState("");
  const [preview,setPreview] = useState(null);
  const [err,setErr]       = useState("");
  const [uploading,setUploading] = useState(false);

  const remove  = (i) => onChange(photos.filter((_,idx)=>idx!==i));
  const moveUp  = (i) => { if(i===0) return; const a=[...photos]; [a[i-1],a[i]]=[a[i],a[i-1]]; onChange(a); };
  const moveDown= (i) => { if(i===photos.length-1) return; const a=[...photos]; [a[i],a[i+1]]=[a[i+1],a[i]]; onChange(a); };

  const addUrl = () => {
    if(!newUrl.trim()){ setErr("Enter a URL."); return; }
    if(photos.includes(newUrl.trim())){ setErr("Already added."); return; }
    onChange([...photos, newUrl.trim()]);
    setNewUrl(""); setErr(""); setPreview(null);
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    if(!files.length) return;
    setUploading(true); setErr("");
    const readers = files.map(file => new Promise((res,rej) => {
      if(!file.type.startsWith("image/")){ rej(new Error(`${file.name} is not an image`)); return; }
      if(file.size > 10*1024*1024){ rej(new Error(`${file.name} exceeds 10MB`)); return; }
      const r = new FileReader();
      r.onload = ev => res(ev.target.result);
      r.onerror = () => rej(new Error(`Could not read ${file.name}`));
      r.readAsDataURL(file);
    }));
    Promise.allSettled(readers).then(results => {
      const ok  = results.filter(r=>r.status==="fulfilled").map(r=>r.value);
      const bad = results.filter(r=>r.status==="rejected").map(r=>r.reason.message);
      if(ok.length) onChange([...photos, ...ok]);
      if(bad.length) setErr(bad.join(", "));
      setUploading(false);
      e.target.value = "";
    });
  };

  return (
    <div>
      {/* Photo grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"0.8rem",marginBottom:"1.2rem"}}>
        {photos.map((url,i)=>(
          <div key={i} style={{position:"relative",borderRadius:"6px",overflow:"hidden",border:`2px solid ${i===0?C.gold:C.border}`}}>
            <img src={url} alt="" style={{width:"100%",height:"100px",objectFit:"cover",display:"block"}} onError={e=>e.target.style.display="none"}/>
            {i===0&&<div style={{position:"absolute",top:"0.3rem",left:"0.3rem",background:C.gold,color:C.obsidian,fontSize:"0.55rem",fontWeight:700,letterSpacing:"0.1em",padding:"0.15rem 0.4rem",borderRadius:"2px"}}>COVER</div>}
            <div style={{position:"absolute",bottom:0,left:0,right:0,display:"flex",background:"rgba(14,43,31,0.85)"}}>
              <button onClick={()=>moveUp(i)} disabled={i===0} style={{flex:1,background:"none",border:"none",color:i===0?C.muted:C.mutedLight,cursor:i===0?"default":"pointer",padding:"0.3rem",fontSize:"0.9rem"}} title="Move left">←</button>
              <button onClick={()=>moveDown(i)} disabled={i===photos.length-1} style={{flex:1,background:"none",border:"none",color:i===photos.length-1?C.muted:C.mutedLight,cursor:i===photos.length-1?"default":"pointer",padding:"0.3rem",fontSize:"0.9rem"}} title="Move right">→</button>
              <button onClick={()=>remove(i)} style={{flex:1,background:"none",border:"none",color:C.muted,cursor:"pointer",padding:"0.3rem",fontSize:"0.85rem"}} onMouseEnter={e=>e.target.style.color=C.error} onMouseLeave={e=>e.target.style.color=C.muted} title="Remove">✕</button>
            </div>
          </div>
        ))}
        {photos.length===0&&(
          <div style={{gridColumn:"1/-1",textAlign:"center",padding:"2rem",color:C.muted,fontSize:"0.82rem",border:`1px dashed ${C.border}`,borderRadius:"6px"}}>
            No photos yet — upload from your device or add a URL below.
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{display:"flex",marginBottom:"0.8rem",border:`1px solid ${C.border}`,borderRadius:"6px",overflow:"hidden"}}>
        {[{id:"upload",label:"📁 Upload from Device"},{id:"url",label:"🔗 Add by URL"}].map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setErr("");}}
            style={{flex:1,padding:"0.65rem 0.8rem",background:tab===t.id?C.gold:"transparent",color:tab===t.id?C.obsidian:C.muted,border:"none",cursor:"pointer",fontSize:"0.75rem",fontWeight:tab===t.id?700:400,letterSpacing:"0.06em",transition:"all 0.2s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Upload tab */}
      {tab==="upload"&&(
        <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.6rem",padding:"2rem 1rem",border:`2px dashed ${C.gold}`,borderRadius:"8px",background:"rgba(197,151,58,0.04)",cursor:uploading?"not-allowed":"pointer",transition:"background 0.2s"}}
          onMouseEnter={e=>{if(!uploading) e.currentTarget.style.background="rgba(197,151,58,0.09)";}}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(197,151,58,0.04)"}>
          <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={uploading} style={{display:"none"}}/>
          {uploading
            ? <><div style={{fontSize:"1.4rem"}}>⏳</div><div style={{fontSize:"0.82rem",color:C.muted}}>Processing…</div></>
            : <><div style={{fontSize:"2rem"}}>📷</div>
                <div style={{fontSize:"0.9rem",fontWeight:600,color:C.sage}}>Click to choose photos</div>
                <div style={{fontSize:"0.72rem",color:C.muted,textAlign:"center"}}>JPG, PNG, WEBP · Max 10MB each · Select multiple</div></>
          }
        </label>
      )}

      {/* URL tab */}
      {tab==="url"&&(
        <div>
          <div style={{display:"flex",gap:"0.6rem",marginBottom:"0.5rem"}}>
            <input value={newUrl} onChange={e=>{setNewUrl(e.target.value);setErr("");setPreview(e.target.value.trim()||null);}}
              placeholder="https://images.unsplash.com/…" style={{...field,flex:1}}
              onFocus={fieldFocus} onBlur={fieldBlur} onKeyDown={e=>e.key==="Enter"&&addUrl()}/>
            <button onClick={addUrl} style={{padding:"0.75rem 1.2rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"5px",fontWeight:600,cursor:"pointer",fontSize:"0.82rem",flexShrink:0}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>Add</button>
          </div>
          {preview&&(
            <div style={{borderRadius:"6px",overflow:"hidden",height:"80px",border:`1px solid ${C.border}`,marginTop:"0.4rem"}}>
              <img src={preview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.parentElement.style.display="none"}/>
            </div>
          )}
          <div style={{fontSize:"0.7rem",color:C.muted,marginTop:"0.5rem"}}>Tip: Unsplash URLs (…?w=1200&q=85) give the best quality.</div>
        </div>
      )}

      {err&&<div style={{fontSize:"0.75rem",color:C.error,marginTop:"0.6rem",padding:"0.4rem 0.7rem",background:"rgba(220,38,38,0.07)",borderRadius:"4px",border:"1px solid rgba(220,38,38,0.18)"}}>{err}</div>}
      <div style={{fontSize:"0.7rem",color:C.muted,marginTop:"0.6rem"}}>First photo is the cover image shown on listing cards.</div>
    </div>
  );
}

// ── Amenity Picker ────────────────────────────────────────────────
function AmenityPicker({ selected, onChange }) {
  const [custom,setCustom]=useState("");
  const toggle=(a)=>{
    if(selected.includes(a)) onChange(selected.filter(x=>x!==a));
    else onChange([...selected,a]);
  };
  const addCustom=()=>{
    const v=custom.trim();
    if(!v||selected.includes(v)) return;
    onChange([...selected,v]);
    setCustom("");
  };
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0.45rem",marginBottom:"1rem"}}>
        {ALL_AMENITIES.map(a=>{
          const on=selected.includes(a);
          return (
            <button key={a} onClick={()=>toggle(a)} style={{padding:"0.35rem 0.8rem",background:on?C.goldDim:"#F7F2EA",border:`1px solid ${on?C.gold:C.border}`,borderRadius:"20px",color:on?C.gold:C.muted,fontSize:"0.73rem",cursor:"pointer",transition:"all 0.15s",fontWeight:on?500:400}}>
              {on&&<span style={{marginRight:"0.3rem"}}>✓</span>}{a}
            </button>
          );
        })}
      </div>
      {/* Custom amenity */}
      <div style={{display:"flex",gap:"0.5rem"}}>
        <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Add custom amenity…" style={{...field,flex:1}} onFocus={fieldFocus} onBlur={fieldBlur} onKeyDown={e=>e.key==="Enter"&&addCustom()}/>
        <button onClick={addCustom} style={{padding:"0.65rem 1rem",background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:"5px",color:C.mutedLight,cursor:"pointer",fontSize:"0.8rem",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.mutedLight;}}>+ Add</button>
      </div>
      {/* Custom ones not in master list */}
      {selected.filter(a=>!ALL_AMENITIES.includes(a)).length>0&&(
        <div style={{marginTop:"0.6rem",display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
          {selected.filter(a=>!ALL_AMENITIES.includes(a)).map(a=>(
            <div key={a} style={{display:"flex",alignItems:"center",gap:"0.4rem",padding:"0.3rem 0.7rem",background:C.goldDim,border:`1px solid ${C.border}`,borderRadius:"20px",fontSize:"0.73rem",color:C.gold}}>
              {a}
              <button onClick={()=>onChange(selected.filter(x=>x!==a))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"0.75rem",padding:0,lineHeight:1}} onMouseEnter={e=>e.target.style.color=C.error} onMouseLeave={e=>e.target.style.color=C.muted}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── House Rules Editor ────────────────────────────────────────────
function RulesEditor({ rules, onChange }) {
  const [newRule,setNewRule]=useState("");
  const add=()=>{ const v=newRule.trim(); if(!v) return; onChange([...rules,v]); setNewRule(""); };
  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:"0.45rem",marginBottom:"0.8rem"}}>
        {rules.map((r,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.55rem 0.9rem",background:"#F7F2EA",borderRadius:"5px",border:`1px solid ${C.border}`}}>
            <span style={{color:C.gold,fontSize:"0.75rem"}}>—</span>
            <span style={{flex:1,fontSize:"0.83rem",color:C.mutedLight}}>{r}</span>
            <button onClick={()=>onChange(rules.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"0.8rem",padding:"0 0.2rem",transition:"color 0.15s"}} onMouseEnter={e=>e.target.style.color=C.error} onMouseLeave={e=>e.target.style.color=C.muted}>✕</button>
          </div>
        ))}
        {rules.length===0&&<div style={{fontSize:"0.8rem",color:C.muted,fontStyle:"italic"}}>No rules yet.</div>}
      </div>
      <div style={{display:"flex",gap:"0.5rem"}}>
        <input value={newRule} onChange={e=>setNewRule(e.target.value)} placeholder="e.g. No smoking indoors" style={{...field,flex:1}} onFocus={fieldFocus} onBlur={fieldBlur} onKeyDown={e=>e.key==="Enter"&&add()}/>
        <button onClick={add} style={{padding:"0.65rem 1rem",background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:"5px",color:C.mutedLight,cursor:"pointer",fontSize:"0.8rem",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.mutedLight;}}>+ Add</button>
      </div>
    </div>
  );
}

// ── Calendar Manager (booked dates) ──────────────────────────────
function BookedDateManager({ bookedDates, onChange }) {
  const today=new Date(); today.setHours(0,0,0,0);
  const todayKey=toKey(today);
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth());
  const booked=new Set(bookedDates);
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const prevM=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const nextM=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};
  const toggleDay=(key)=>{
    if(booked.has(key)) onChange(bookedDates.filter(d=>d!==key));
    else onChange([...bookedDates,key].sort());
  };
  const upcoming=bookedDates.filter(d=>d>=todayKey).sort();
  const past=bookedDates.filter(d=>d<todayKey).sort();
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem",alignItems:"start"}}>
        {/* Calendar */}
        <div style={{background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"8px",padding:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.8rem"}}>
            <button onClick={prevM} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"1.1rem"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color=C.muted}>‹</button>
            <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"0.95rem",color:"#F7F2EA"}}>{MONTHS[month]} {year}</span>
            <button onClick={nextM} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"1.1rem"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color=C.muted}>›</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px",marginBottom:"4px"}}>
            {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:"0.6rem",color:C.muted}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px"}}>
            {cells.map((d,i)=>{
              if(!d) return <div key={i}/>;
              const key=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              const isBooked=booked.has(key);
              const isPast=key<todayKey;
              const isToday=key===todayKey;
              return (
                <button key={key} onClick={()=>toggleDay(key)}
                  style={{padding:"4px 2px",borderRadius:"4px",border:"none",cursor:"pointer",fontSize:"0.72rem",background:isBooked?"rgba(224,82,82,0.2)":isToday?C.goldDim:"transparent",color:isBooked?C.error:isToday?C.gold:isPast?"rgba(120,120,140,0.5)":C.mutedLight,fontWeight:isToday||isBooked?600:400,transition:"all 0.15s"}}
                  onMouseEnter={e=>{if(!isBooked)e.target.style.background=C.goldDim; else e.target.style.background="rgba(224,82,82,0.35)";}}
                  onMouseLeave={e=>e.target.style.background=isBooked?"rgba(224,82,82,0.2)":isToday?C.goldDim:"transparent"}>
                  {d}
                </button>
              );
            })}
          </div>
          <div style={{marginTop:"0.8rem",display:"flex",gap:"0.8rem",fontSize:"0.62rem",color:C.muted}}>
            <span style={{display:"flex",alignItems:"center",gap:"0.3rem"}}><span style={{width:"8px",height:"8px",background:"rgba(224,82,82,0.3)",borderRadius:"2px",display:"inline-block"}}/>Blocked</span>
            <span style={{display:"flex",alignItems:"center",gap:"0.3rem"}}><span style={{width:"8px",height:"8px",background:C.goldDim,borderRadius:"2px",display:"inline-block"}}/>Today</span>
          </div>
          <div style={{marginTop:"0.5rem",fontSize:"0.7rem",color:C.muted}}>Click any date to block / unblock it.</div>
        </div>
        {/* List */}
        <div>
          <div style={{marginBottom:"0.8rem"}}>
            <div style={{fontSize:"0.65rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.gold,marginBottom:"0.5rem"}}>Upcoming Blocked ({upcoming.length})</div>
            {upcoming.length===0?<div style={{fontSize:"0.78rem",color:C.muted,fontStyle:"italic"}}>None</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:"0.3rem",maxHeight:"180px",overflowY:"auto"}}>
                {upcoming.map(d=>(
                  <div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.35rem 0.7rem",background:C.ink,borderRadius:"4px",border:`1px solid ${C.border}`}}>
                    <span style={{fontSize:"0.78rem",color:C.mutedLight}}>{fmtDate(d)}</span>
                    <button onClick={()=>onChange(bookedDates.filter(x=>x!==d))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"0.75rem"}} onMouseEnter={e=>e.target.style.color=C.error} onMouseLeave={e=>e.target.style.color=C.muted}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{fontSize:"0.65rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem"}}>Past Blocked ({past.length})</div>
            {past.length===0?<div style={{fontSize:"0.78rem",color:C.muted,fontStyle:"italic"}}>None</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:"0.3rem",maxHeight:"120px",overflowY:"auto",opacity:0.6}}>
                {[...past].reverse().map(d=>(
                  <div key={d} style={{padding:"0.3rem 0.7rem",background:C.ink,borderRadius:"4px",border:`1px solid ${C.border}`,fontSize:"0.75rem",color:C.muted}}>{fmtDate(d)}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Full Listing Editor ───────────────────────────────────────────
function ListingEditor({ listing, onSave, onCancel }) {
  const [draft,setDraft]=useState({...listing});
  const [toast,setToast]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [saving,setSaving]=useState(false);
  const [unsaved,setUnsaved]=useState(false);

  const set=(key,val)=>{ setDraft(d=>({...d,[key]:val})); setUnsaved(true); };

  const handleSave=async()=>{
    setSaving(true);
    await new Promise(r=>setTimeout(r,500));
    onSave(draft);
    setSaving(false);
    setUnsaved(false);
    setToast({msg:"Listing saved successfully!",type:"success"});
  };

  const handleCancel=()=>{
    if(unsaved) setConfirm({msg:"You have unsaved changes. Discard them?",onConfirm:onCancel});
    else onCancel();
  };

  return (
    <div style={{animation:"fadeIn 0.3s ease"}}>
      {/* Editor header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.8rem",flexWrap:"wrap",gap:"1rem"}}>
        <div>
          <button onClick={handleCancel} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",display:"flex",alignItems:"center",gap:"0.4rem",padding:0,marginBottom:"0.5rem"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color=C.muted}>← All Listings</button>
          <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.6rem",color:C.cream,fontWeight:400}}>Editing: <em style={{color:C.gold}}>{listing.name}</em></h2>
          {unsaved&&<div style={{fontSize:"0.7rem",color:"#64A0DC",marginTop:"0.3rem"}}>● Unsaved changes</div>}
        </div>
        <div style={{display:"flex",gap:"0.7rem",alignItems:"center"}}>
          {/* Live toggle */}
          <div style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.5rem 0.9rem",background:C.card,border:`1px solid ${C.border}`,borderRadius:"6px"}}>
            <span style={{fontSize:"0.72rem",color:C.muted}}>Status</span>
            <button onClick={()=>set("available",!draft.available)} style={{width:"38px",height:"20px",borderRadius:"10px",background:draft.available?"rgba(76,175,125,0.3)":"rgba(255,255,255,0.08)",border:`1px solid ${draft.available?"rgba(76,175,125,0.5)":C.border}`,position:"relative",cursor:"pointer",transition:"all 0.25s",padding:0}}>
              <div style={{width:"14px",height:"14px",borderRadius:"50%",background:draft.available?C.success:"rgba(120,120,140,0.6)",position:"absolute",top:"2px",left:draft.available?"21px":"2px",transition:"left 0.25s"}}/>
            </button>
            <span style={{fontSize:"0.72rem",color:draft.available?C.success:C.muted,fontWeight:600}}>{draft.available?"Live":"Paused"}</span>
          </div>
          <button onClick={handleSave} disabled={saving||!unsaved} style={{padding:"0.7rem 1.8rem",background:unsaved?C.gold:"rgba(212,175,95,0.25)",color:unsaved?C.obsidian:"rgba(212,175,95,0.5)",border:"none",borderRadius:"6px",fontWeight:700,fontSize:"0.82rem",letterSpacing:"0.12em",textTransform:"uppercase",cursor:unsaved?"pointer":"default",transition:"all 0.2s",display:"flex",alignItems:"center",gap:"0.5rem"}} onMouseEnter={e=>{if(unsaved)e.currentTarget.style.background=C.goldLight;}} onMouseLeave={e=>{if(unsaved)e.currentTarget.style.background=C.gold;}}>
            {saving?<><div style={{width:"14px",height:"14px",border:`2px solid ${C.obsidian}`,borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Saving…</>:"Save Changes"}
          </button>
        </div>
      </div>

      {/* ── SECTION: Core Info ── */}
      <EditorSection title="Core Information" icon="ℹ️">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          <Field label="Listing Name">
            <input value={draft.name} onChange={e=>set("name",e.target.value)} style={field} onFocus={fieldFocus} onBlur={fieldBlur}/>
          </Field>
          <Field label="Tagline">
            <input value={draft.tagline} onChange={e=>set("tagline",e.target.value)} style={field} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="Short catchy subtitle"/>
          </Field>
          <Field label="Neighbourhood">
            <input value={draft.neighborhood} onChange={e=>set("neighborhood",e.target.value)} style={field} onFocus={fieldFocus} onBlur={fieldBlur}/>
          </Field>
          <Field label="City">
            <input value={draft.city} onChange={e=>set("city",e.target.value)} style={field} onFocus={fieldFocus} onBlur={fieldBlur}/>
          </Field>
          <Field label="Property Type">
            <select value={draft.type} onChange={e=>set("type",e.target.value)} style={{...field,cursor:"pointer"}}>
              {TYPE_OPTIONS.map(t=><option key={t} value={t} style={{background:C.card}}>{t}</option>)}
            </select>
          </Field>
          <Field label="Badge">
            <select value={draft.badge} onChange={e=>set("badge",e.target.value)} style={{...field,cursor:"pointer"}}>
              {BADGE_OPTIONS.map(b=><option key={b} value={b} style={{background:C.card}}>{b}</option>)}
            </select>
          </Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginTop:"0.5rem"}}>
          {[{l:"Bedrooms",k:"bedrooms",min:0,max:10},{l:"Bathrooms",k:"bathrooms",min:1,max:10},{l:"Max Guests",k:"guests",min:1,max:20},{l:"Size (sqm)",k:"sqm",min:10,max:1000}].map(f=>(
            <Field key={f.k} label={f.l}>
              <input type="number" min={f.min} max={f.max} value={draft[f.k]} onChange={e=>set(f.k,Number(e.target.value))} style={field} onFocus={fieldFocus} onBlur={fieldBlur}/>
            </Field>
          ))}
        </div>
      </EditorSection>

      {/* ── SECTION: Pricing ── */}
      <EditorSection title="Pricing" icon="💰">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem"}}>
          <Field label="Price Per Night (KES)">
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:"0.9rem",top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:"0.8rem"}}>KES</span>
              <input type="number" min={0} value={draft.pricePerNight} onChange={e=>set("pricePerNight",Number(e.target.value))} style={{...field,paddingLeft:"3rem"}} onFocus={fieldFocus} onBlur={fieldBlur}/>
            </div>
          </Field>
          <Field label="Cleaning Fee (KES)">
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:"0.9rem",top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:"0.8rem"}}>KES</span>
              <input type="number" min={0} value={draft.cleaningFee} onChange={e=>set("cleaningFee",Number(e.target.value))} style={{...field,paddingLeft:"3rem"}} onFocus={fieldFocus} onBlur={fieldBlur}/>
            </div>
          </Field>
          <Field label="Rating (display)">
            <input type="number" min={1} max={5} step={0.01} value={draft.rating} onChange={e=>set("rating",parseFloat(e.target.value))} style={field} onFocus={fieldFocus} onBlur={fieldBlur}/>
          </Field>
        </div>
        {/* Live pricing preview */}
        <div style={{marginTop:"0.5rem",background:C.goldDim,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"1rem 1.2rem",display:"flex",gap:"2rem",flexWrap:"wrap"}}>
          {[["1 night",draft.pricePerNight+draft.cleaningFee],["3 nights",3*draft.pricePerNight+draft.cleaningFee],["7 nights",7*draft.pricePerNight+draft.cleaningFee],["30 nights",30*draft.pricePerNight+draft.cleaningFee]].map(([l,v])=>(
            <div key={l}>
              <div style={{fontSize:"0.6rem",color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:"0.2rem"}}>{l}</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.05rem",color:C.gold}}>KES {fmt(v)}</div>
            </div>
          ))}
        </div>

        {/* Per-listing discount */}
        <div style={{marginTop:"1.2rem",background:"rgba(220,38,38,0.04)",border:"1px solid rgba(220,38,38,0.15)",borderRadius:"6px",padding:"1.1rem 1.3rem"}}>
          <div style={{fontSize:"0.65rem",letterSpacing:"0.18em",textTransform:"uppercase",color:"#B83232",fontWeight:700,marginBottom:"0.8rem"}}>🏷 Listing Discount (optional)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:"1rem",alignItems:"end"}}>
            <Field label="Discount %  (0 = none)">
              <div style={{position:"relative"}}>
                <input type="number" min={0} max={90} value={draft.discountPercent||0} onChange={e=>set("discountPercent",Math.min(90,Math.max(0,Number(e.target.value))))} style={field} onFocus={fieldFocus} onBlur={fieldBlur}/>
                <span style={{position:"absolute",right:"0.9rem",top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:"0.8rem"}}>%</span>
              </div>
            </Field>
            <Field label="Discount Label (shown on card)">
              <input value={draft.discountLabel||""} onChange={e=>set("discountLabel",e.target.value)} style={field} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="e.g. Early Bird · Limited Offer · Weekend Deal"/>
            </Field>
          </div>
          {(draft.discountPercent>0)&&(
            <div style={{marginTop:"0.7rem",fontSize:"0.76rem",color:"#B83232",background:"rgba(220,38,38,0.06)",borderRadius:"4px",padding:"0.5rem 0.8rem"}}>
              Guests will see <strong>KES {fmt(Math.round(draft.pricePerNight*(1-(draft.discountPercent/100))))} /night</strong> (was KES {fmt(draft.pricePerNight)}) — a {draft.discountPercent}% saving.
              {draft.discountLabel&&<span> Badge: "<strong>{draft.discountLabel}</strong>".</span>}
            </div>
          )}
        </div>
      </EditorSection>

      {/* ── SECTION: Description ── */}
      <EditorSection title="Description" icon="📝">
        <Field label="About This Space">
          <textarea value={draft.description} onChange={e=>set("description",e.target.value)} rows={7} style={{...field,resize:"vertical",lineHeight:1.7}} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="Describe the space in detail. Use two line breaks to separate paragraphs."/>
        </Field>
        <div style={{fontSize:"0.7rem",color:C.muted}}>Separate paragraphs with a blank line. This appears on the listing page.</div>
      </EditorSection>

      {/* ── SECTION: Photos ── */}
      <EditorSection title={`Photos (${draft.photos.length})`} icon="🖼️">
        <PhotoManager photos={draft.photos} onChange={v=>set("photos",v)}/>
      </EditorSection>

      {/* ── SECTION: Amenities ── */}
      <EditorSection title={`Amenities (${draft.amenities.length} selected)`} icon="✦">
        <AmenityPicker selected={draft.amenities} onChange={v=>set("amenities",v)}/>
      </EditorSection>

      {/* ── SECTION: House Rules ── */}
      <EditorSection title="House Rules" icon="📋">
        <RulesEditor rules={draft.houseRules} onChange={v=>set("houseRules",v)}/>
      </EditorSection>

      {/* ── SECTION: Calendar ── */}
      <EditorSection title={`Availability Calendar (${draft.bookedDates.length} blocked dates)`} icon="📅">
        <BookedDateManager bookedDates={draft.bookedDates} onChange={v=>set("bookedDates",v)}/>
      </EditorSection>

      {/* ── SECTION: Location ── */}
      <EditorSection title="Location & Map Pin" icon="📍">
        <div style={{marginBottom:"1rem"}}>
          <p style={{fontSize:"0.83rem",color:C.muted,lineHeight:1.7,marginBottom:"1rem"}}>
            Click on the map or drag the pin to set the exact location guests will see. This appears on the listing page with Google Maps, Apple Maps, and Waze links.
          </p>
          <LocationPicker
            lat={draft.lat || -1.2921}
            lng={draft.lng || 36.8219}
            onChange={({lat,lng})=>{ set("lat",lat); set("lng",lng); }}
          />
        </div>
        <div style={{marginTop:"0.8rem"}}>
          <Field label="Access Note for Guests (shown below the map)">
            <textarea
              value={draft.locationNote || ""}
              onChange={e=>set("locationNote",e.target.value)}
              placeholder={`e.g. Green gate on Argwings Kodhek Road, ring the bell and mention ${BRAND.fullName}. Parking inside compound.`}
              rows={3}
              style={{width:"100%",padding:"0.75rem 0.9rem",border:`1px solid ${C.border}`,borderRadius:"5px",fontSize:"0.85rem",resize:"vertical",fontFamily:"inherit",outline:"none",background:"#fff",color:"#1C1C1C",lineHeight:1.6}}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.border}
            />
          </Field>
          <div style={{fontSize:"0.71rem",color:C.muted,marginTop:"0.4rem"}}>
            Tip: mention landmarks, gate colour, floor number, or parking instructions — anything that helps guests find you quickly.
          </div>
        </div>
        {draft.lat && draft.lng && (
          <div style={{marginTop:"1rem",padding:"0.6rem 0.9rem",background:"rgba(76,175,125,0.08)",border:"1px solid rgba(76,175,125,0.25)",borderRadius:"5px",fontSize:"0.76rem",color:"#4CAF7D",display:"flex",gap:"0.6rem",alignItems:"center"}}>
            <span>✓</span>
            <span>Pin set — <strong>{draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}</strong> · Will show on listing page</span>
          </div>
        )}
      </EditorSection>

      {/* ── SECTION: Emergency Contacts ── */}
      <EditorSection title="Emergency Contacts" icon="🆘">
        <p style={{fontSize:"0.83rem",color:C.muted,lineHeight:1.7,marginBottom:"1rem"}}>
          Guests see these in the site-wide SOS button alongside live results from Google Maps. Because you know this neighbourhood, your picks are shown first and labelled as host-verified — fill these in with a hospital and police station you'd actually send a guest to, not just the technically-nearest one.
        </p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          <Field label="Nearest hospital — name">
            <input value={draft.nearestHospitalName||""} onChange={e=>set("nearestHospitalName",e.target.value)} style={field} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="e.g. Nairobi Hospital, Westlands"/>
          </Field>
          <Field label="Nearest hospital — phone">
            <input value={draft.nearestHospitalPhone||""} onChange={e=>set("nearestHospitalPhone",e.target.value)} style={field} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="e.g. +254702200200"/>
          </Field>
          <Field label="Nearest police station — name">
            <input value={draft.nearestPoliceName||""} onChange={e=>set("nearestPoliceName",e.target.value)} style={field} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="e.g. Parklands Police Station"/>
          </Field>
          <Field label="Nearest police station — phone">
            <input value={draft.nearestPolicePhone||""} onChange={e=>set("nearestPolicePhone",e.target.value)} style={field} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="e.g. 0721233999"/>
          </Field>
        </div>
        <div style={{fontSize:"0.71rem",color:C.muted,marginTop:"0.6rem"}}>
          Leave blank to show only the live Google-powered nearby search and national emergency numbers (999 / 112 / Kenya Red Cross 1199) — both always display regardless of what you fill in here.
        </div>
      </EditorSection>

      {/* Save bar */}
      {unsaved&&(
        <div style={{position:"sticky",bottom:"1.5rem",background:"rgba(14,43,31,0.97)",backdropFilter:"blur(12px)",border:`1px solid ${C.border}`,borderRadius:"8px",padding:"1rem 1.4rem",display:"flex",justifyContent:"space-between",alignItems:"center",animation:"slideUp 0.25s ease",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
          <span style={{fontSize:"0.82rem",color:C.mutedLight}}>You have unsaved changes.</span>
          <div style={{display:"flex",gap:"0.7rem"}}>
            <button onClick={handleCancel} style={{padding:"0.6rem 1.2rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"5px",color:C.muted,cursor:"pointer",fontSize:"0.8rem"}}>Discard</button>
            <button onClick={handleSave} disabled={saving} style={{padding:"0.6rem 1.6rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"5px",fontWeight:700,fontSize:"0.8rem",cursor:"pointer",transition:"background 0.2s"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>{saving?"Saving…":"Save Changes"}</button>
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      {confirm&&<ConfirmDialog message={confirm.msg} onConfirm={()=>{setConfirm(null);confirm.onConfirm();}} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── Listings overview grid (with edit buttons) ────────────────────
// ─── STAGE 6: CREATE & DELETE LISTINGS ───────────────────────────

const BLANK_LISTING = () => ({
  id: "lst-" + Date.now().toString(36),
  name: "",
  neighborhood: "",
  city: BRAND.city,
  tagline: "",
  type: "Studio",
  bedrooms: 1,
  bathrooms: 1,
  guests: 2,
  sqm: 45,
  pricePerNight: 5000,
  cleaningFee: 1000,
  rating: 5.0,
  reviewCount: 0,
  badge: "New",
  available: false,
  amenities: ["WiFi","Smart TV"],
  photos: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=85"],
  description: "",
  houseRules: ["No smoking","Check-in 2PM","Checkout 11AM"],
  bookedDates: [],
  lat: null,
  lng: null,
  locationNote: "",
  discountPercent: 0,   // 0 = no discount; 1-99 = % off shown on card and in booking
  discountLabel: "",    // e.g. "Early Bird", "Weekend Deal", "Limited Offer"
});

// ── Import Listing from URL ───────────────────────────────────────
// Strategy:
//  1. Fetch page HTML server-side via netlify/functions/listing-fetch.js
//     (keeps us off public CORS-proxy services that go down unpredictably,
//     and lets us send a real browser User-Agent for fuller page content)
//  2. Parse og:image, og:title, JSON-LD, meta tags, and <img> tags from raw HTML
//  3. Refine the extracted data with Groq via the secure /api/groq proxy
//     (same one the concierge uses — needs GROQ_API_KEY in Netlify, no
//     extra setup). Falls back to the raw regex-based parsing if AI
//     refinement fails for any reason.
// Photos: pulled from og:image + all large <img> src attributes found in the HTML.

// Fetch page HTML through our own server-side function (see listing-fetch.js)
async function fetchPageHtml(pageUrl) {
  const res = await fetch("/api/listing-fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: pageUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Could not fetch that page (${res.status}).`);
  return data.html || "";
}

// Extract all useful data from raw HTML
function scrapeHtml(html, pageUrl) {
  // ── Meta / og tags ──
  const getMeta = (name) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))
           || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i"));
    return m ? m[1].trim() : "";
  };

  const title       = getMeta("og:title") || getMeta("twitter:title")
                    || (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();
  const description = getMeta("og:description") || getMeta("description") || getMeta("twitter:description");
  const ogImage     = getMeta("og:image") || getMeta("twitter:image");
  const siteName    = getMeta("og:site_name");

  // ── JSON-LD structured data ──
  let jsonld = {};
  try {
    const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of ldMatches) {
      try {
        const obj = JSON.parse(m[1]);
        const items = Array.isArray(obj) ? obj : [obj];
        for (const item of items) {
          if (item["@type"] && ["LodgingBusiness","Apartment","House","Room","VacationRental","Product","Offer","Hotel","HotelRoom","BedAndBreakfast","Resort"].some(t=>item["@type"]?.includes?.(t))) {
            jsonld = { ...jsonld, ...item };
          }
        }
      } catch {}
    }
  } catch {}

  // ── Photos — gather all candidate image URLs ──
  const photos = new Set();
  if (ogImage) photos.add(ogImage);
  // og:image:url variants
  const ogImgUrls = html.matchAll(/property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/gi);
  for (const m of ogImgUrls) photos.add(m[1]);
  // JSON-LD images
  if (jsonld.image) {
    const imgs = Array.isArray(jsonld.image) ? jsonld.image : [jsonld.image];
    imgs.forEach(i => { if (typeof i === "string") photos.add(i); else if (i?.url) photos.add(i.url); });
  }
  // Large <img> tags — src or data-src, filter tiny icons
  const imgTags = html.matchAll(/<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/gi);
  for (const m of imgTags) {
    const src = m[1];
    if (src.startsWith("http") && !src.includes("icon") && !src.includes("logo") && !src.includes("avatar") && src.length > 40) {
      photos.add(src);
    }
  }
  // srcset — grab highest-res variant
  const srcsets = html.matchAll(/srcset=["']([^"']+)["']/gi);
  for (const m of srcsets) {
    const parts = m[1].split(",").map(s=>s.trim().split(/\s+/)[0]);
    parts.forEach(src => {
      if (src.startsWith("http") && src.includes("jpg") || src.includes("jpeg") || src.includes("webp")) {
        photos.add(src);
      }
    });
  }

  // ── Numeric extraction helpers ──
  const findNum = (patterns) => {
    for (const p of patterns) {
      const m = html.match(p);
      if (m) { const n = parseFloat(m[1]); if (!isNaN(n)) return n; }
    }
    return null;
  };

  const bedrooms = jsonld.numberOfRooms
    || findNum([/(\d+)\s*(?:bed(?:room)?s?)/i, /"bedrooms?"\s*:\s*(\d+)/i, /(\d+)\s*BR\b/i]) || 1;
  const bathrooms = findNum([/(\d+(?:\.\d+)?)\s*bath(?:room)?s?/i, /"bathrooms?"\s*:\s*(\d+)/i]) || 1;
  const guests    = findNum([/(\d+)\s*(?:guest|person|people)/i, /"maximumAttendeeCapacity"\s*:\s*(\d+)/i]) || 2;
  const sqm       = findNum([/(\d+)\s*(?:sqm|m²|sq\.?\s*m)/i, /(\d+)\s*square\s*met/i]) || null;
  const rating    = findNum([/(\d+\.\d+)\s*(?:out of\s*5|\/5|\s*stars?)/i, /"ratingValue"\s*:\s*"?(\d+\.?\d*)"?/i]) || null;
  const reviews   = findNum([/(\d[\d,]*)\s*review/i, /"reviewCount"\s*:\s*"?(\d+)"?/i]) || 0;

  // ── Price — try to find a nightly rate ──
  let priceRaw = jsonld.offers?.price || null;
  if (!priceRaw) {
    const pm = html.match(/[\$£€KSh]?\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*night|per\s*night|a\s*night)/i);
    if (pm) priceRaw = pm[1].replace(/,/g,"");
  }
  let priceUSD = priceRaw ? parseFloat(String(priceRaw).replace(/,/g,"")) : null;
  // Detect currency and convert to KES
  const currency = jsonld.offers?.priceCurrency || getMeta("og:price:currency") || "";
  let priceKES = 5000;
  if (priceUSD) {
    if (currency === "KES" || html.includes("KES") || html.includes("KSh")) priceKES = priceUSD;
    else if (currency === "GBP" || html.includes("£")) priceKES = Math.round(priceUSD * 163);
    else if (currency === "EUR" || html.includes("€")) priceKES = Math.round(priceUSD * 140);
    else priceKES = Math.round(priceUSD * 129); // default USD→KES
  }

  // ── Location ──
  const addressObj = jsonld.address || {};
  const neighborhood = addressObj.addressLocality || addressObj.streetAddress
    || getMeta("og:locality")
    || findNum([new RegExp(`(?:in|at)\\s+([A-Z][a-z]+(?:\\s[A-Z][a-z]+)?),?\\s*${BRAND.city}`)])?.[1] || "";
  const city = addressObj.addressRegion || getMeta("og:region") || BRAND.city;
  const lat  = jsonld.geo?.latitude  || null;
  const lng  = jsonld.geo?.longitude || null;

  // ── Amenities — scan for known keywords (word-boundary to avoid false positives,
  // e.g. matching "AC" inside an unrelated word) ──
  const AMENITY_KEYWORDS = ["WiFi","wi-fi","wireless internet","Pool","Gym","Fitness","Parking","Kitchen","Netflix","Smart TV","Air Conditioning","AC","Washing Machine","Laundry","24/7 Security","Generator","Fireplace","BBQ","Garden","Balcony","Workspace","Iron","Coffee Machine","Dishwasher"];
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const amenities = AMENITY_KEYWORDS.filter(a => new RegExp(`\\b${escapeRegex(a)}\\b`,"i").test(html)).map(a=>{
    if(/wi-fi|wireless internet/i.test(a)) return "WiFi";
    if(/^AC$/i.test(a)) return "Air Conditioning";
    return a;
  });
  const uniqueAmenities = [...new Set(amenities)];

  // ── Property type ──
  const typeKeywords = {
    "Studio":["studio"], "Penthouse Suite":["penthouse"], "Loft Studio":["loft"],
    "3-Bedroom Villa":["villa","3 bed","three bed"], "2-Bedroom Apartment":["2 bed","two bed","apartment","flat"],
    "1-Bedroom Suite":["1 bed","one bed","suite"], "Cottage":["cottage","cabin"], "Entire Home":["entire home","whole house"],
  };
  let type = "Studio";
  for (const [t, kws] of Object.entries(typeKeywords)) {
    if (kws.some(k => new RegExp(k,"i").test(html+title))) { type = t; break; }
  }

  return {
    title, description, photos: [...photos].slice(0,12),
    bedrooms: Number(bedrooms)||1, bathrooms: Number(bathrooms)||1,
    guests: Number(guests)||2, sqm: sqm ? Number(sqm) : 50,
    rating: rating ? Number(rating) : null, reviews: Number(reviews)||0,
    priceKES, neighborhood, city, lat, lng, amenities: uniqueAmenities, type,
    siteName,
  };
}

// Optional Groq AI refinement — best effort. Routes through the same secure
// /api/groq proxy the concierge uses, so this works as long as the host has
// set GROQ_API_KEY (no VITE_ prefix) in Netlify, with no separate setup.
// Returns null on any failure so the import always falls back gracefully to
// the raw scraped data rather than blocking the whole import.
async function refineWithGroq(scraped, pageUrl) {
  try {
    const prompt = `You are a property listing data extractor. Based on this scraped data from a short-stay rental listing, return an improved JSON object.

Scraped data:
- Title: ${scraped.title}
- Description (first 800 chars): ${scraped.description?.slice(0,800)||""}
- Site: ${scraped.siteName||pageUrl}
- Bedrooms: ${scraped.bedrooms}, Bathrooms: ${scraped.bathrooms}, Guests: ${scraped.guests}
- Detected price/night (KES): ${scraped.priceKES}
- Location: ${scraped.neighborhood}, ${scraped.city}
- Amenities found: ${scraped.amenities.join(", ")||"none"}
- Type guess: ${scraped.type}

Return ONLY a JSON object (no markdown) with:
{
  "name": "clean listing title",
  "tagline": "catchy subtitle under 65 chars",
  "neighborhood": "specific neighbourhood",
  "city": "city",
  "type": one of ["Studio","1-Bedroom Suite","2-Bedroom Apartment","3-Bedroom Villa","Penthouse Suite","Loft Studio","Cottage","Townhouse","Entire Home","Other"],
  "description": "2-3 paragraph description rewritten for ${BRAND.fullName}",
  "amenities": ["cleaned","list","of","amenities"],
  "houseRules": ["No smoking","Check-in 2PM","Checkout 11AM"],
  "badge": one of ["New","Guest Favourite","Popular","Business Pick","Design Pick","Luxury"],
  "cleaningFeeEstimate": estimated cleaning fee in KES as a number
}`;

    const text = await callGroqRaw([{ role:"user", content: prompt }], null, { maxTokens:1000, temperature:0.3 });
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch { return null; }
}

function buildDraft(scraped, groqResult, pageUrl) {
  const g = groqResult || {};
  // Name: prefer groq, fall back to scraped title, then domain
  const name = g.name || scraped.title || new URL(pageUrl).hostname.replace("www.","");
  // Tagline
  const tagline = g.tagline || scraped.description?.split(/[.!?]/)[0]?.slice(0,65) || "Beautiful property";
  // Photos: already scraped from HTML
  const photos = scraped.photos.length > 0
    ? scraped.photos
    : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=85"];

  return {
    ...BLANK_LISTING(),
    name,
    tagline,
    neighborhood: g.neighborhood || scraped.neighborhood || "",
    city: g.city || scraped.city || BRAND.city,
    type: g.type || scraped.type || "Studio",
    bedrooms: scraped.bedrooms,
    bathrooms: scraped.bathrooms,
    guests: scraped.guests,
    sqm: scraped.sqm || 50,
    pricePerNight: scraped.priceKES || 5000,
    cleaningFee: g.cleaningFeeEstimate || Math.round((scraped.priceKES||5000) * 0.15),
    rating: scraped.rating || 5.0,
    reviewCount: scraped.reviews || 0,
    badge: g.badge || "New",
    description: g.description || scraped.description || "",
    amenities: g.amenities?.length ? g.amenities : (scraped.amenities.length ? scraped.amenities : ["WiFi"]),
    houseRules: g.houseRules?.length ? g.houseRules : ["No smoking","Check-in 2PM","Checkout 11AM"],
    photos,
    lat: scraped.lat ? Number(scraped.lat) : null,
    lng: scraped.lng ? Number(scraped.lng) : null,
    locationNote: "",
    available: false,
  };
}


// ── AI "Paste details" import — the always-works path ─────────────────
// Airbnb & Booking.com block server-side scraping (403 from any datacenter
// IP, Vercel included). Rather than leave the host stuck, this takes whatever
// they paste — the full listing text copied from the OTA page, a rough
// description, or just a few lines — plus any photo URLs, and asks Groq to
// structure it into a complete listing draft. No scraping, no blocks.
async function structureFromText(rawText, photoUrls, pageUrl) {
  const prompt = `You are a property listing data extractor for ${BRAND.fullName}, a premium short-stay company in ${BRAND.city}, ${BRAND.country}.

The host pasted the following raw listing information (copied from an Airbnb/Booking.com page or written by hand). Extract and structure it into a clean listing.

RAW INPUT:
"""
${(rawText || "").slice(0, 6000)}
"""
${pageUrl ? `Source URL: ${pageUrl}` : ""}

Return ONLY a JSON object (no markdown, no commentary) with exactly these keys:
{
  "name": "clean listing title (max 60 chars)",
  "tagline": "catchy subtitle under 65 chars",
  "neighborhood": "specific neighbourhood, or '' if unknown",
  "city": "city name (default '${BRAND.city}')",
  "type": one of ["Studio","1-Bedroom Suite","2-Bedroom Apartment","3-Bedroom Villa","Penthouse Suite","Loft Studio","Cottage","Townhouse","Entire Home","Other"],
  "bedrooms": integer (default 1),
  "bathrooms": integer (default 1),
  "guests": integer max guests (default 2),
  "sqm": integer square metres or null,
  "pricePerNight": integer nightly price in KES. If a price in another currency is given, convert to KES (USD*129, GBP*163, EUR*140). Default 5000 if none found,
  "cleaningFee": integer cleaning fee in KES (estimate ~15% of nightly if not stated),
  "description": "2-3 paragraph polished description written for ${BRAND.fullName}",
  "amenities": ["array","of","amenities found or reasonably implied"],
  "houseRules": ["No smoking","Check-in 2PM","Checkout 11AM"],
  "badge": one of ["New","Guest Favourite","Popular","Business Pick","Design Pick","Luxury"]
}`;

  const text = await callGroqRaw([{ role: "user", content: prompt }], null, {
    maxTokens: 1200,
    temperature: 0.35,
  });
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI could not structure that text. Try adding a bit more detail.");
  const g = JSON.parse(match[0]);

  // Clean + validate photo URLs the host pasted (one per line or comma-sep)
  const photos = (photoUrls || "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .slice(0, 12);

  return {
    ...BLANK_LISTING(),
    name: g.name || "Untitled listing",
    tagline: g.tagline || "",
    neighborhood: g.neighborhood || "",
    city: g.city || BRAND.city,
    type: g.type || "Studio",
    bedrooms: Number(g.bedrooms) || 1,
    bathrooms: Number(g.bathrooms) || 1,
    guests: Number(g.guests) || 2,
    sqm: g.sqm ? Number(g.sqm) : 50,
    pricePerNight: Number(g.pricePerNight) || 5000,
    cleaningFee: Number(g.cleaningFee) || Math.round((Number(g.pricePerNight) || 5000) * 0.15),
    rating: 5.0,
    reviewCount: 0,
    badge: g.badge || "New",
    description: g.description || rawText?.slice(0, 500) || "",
    amenities: Array.isArray(g.amenities) && g.amenities.length ? g.amenities : ["WiFi"],
    houseRules: Array.isArray(g.houseRules) && g.houseRules.length ? g.houseRules : ["No smoking", "Check-in 2PM", "Checkout 11AM"],
    photos: photos.length ? photos : [BLANK_LISTING().photos[0]],
    lat: null,
    lng: null,
    locationNote: "",
    available: false,
  };
}


function ImportListingFromUrl({ onImport, onCancel }) {
  const [tab, setTab] = useState("url");      // "url" | "paste"
  const [url, setUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pastePhotos, setPastePhotos] = useState("");
  const [status, setStatus] = useState("idle"); // idle | fetching | parsing | review | error
  const [statusMsg, setStatusMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [draft, setDraft] = useState(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  // Editable fields in review
  const [editDraft, setEditDraft] = useState(null);
  const setEdit = (k,v) => setEditDraft(d=>({...d,[k]:v}));

  const goToReview = (d) => { setDraft(d); setEditDraft(d); setPhotoIdx(0); setStatus("review"); };

  // ── URL import (works for own-sites & many OTAs; escalates or falls back) ──
  const handleImport = async () => {
    const u = url.trim();
    if (!u) { setErrMsg("Please enter a URL."); return; }
    if (!u.startsWith("http")) { setErrMsg("Please enter a full URL starting with https://"); return; }
    setErrMsg("");
    try {
      setStatus("fetching"); setStatusMsg("Fetching page…");
      const res = await fetch("/api/listing-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = await res.json().catch(() => ({}));

      // Site blocked automated import (Airbnb/Booking from a server IP) →
      // switch to the always-works Paste mode and pre-fill the URL as source.
      if (data.blocked || (!res.ok && !data.html)) {
        setTab("paste");
        setStatus("idle");
        setErrMsg(data.error || "That site blocked automated import. Paste the listing details below instead — it takes 20 seconds and always works.");
        return;
      }
      if (!res.ok) throw new Error(data?.error || `Could not fetch that page (${res.status}).`);

      const html = data.html || "";
      if (!html || html.length < 200) throw new Error("Could not read that page. Try the Paste details tab instead.");

      setStatus("parsing"); setStatusMsg("Extracting listing data…");
      const scraped = scrapeHtml(html, u);
      setStatusMsg("Refining with AI…");
      const groqResult = await refineWithGroq(scraped, u);
      goToReview(buildDraft(scraped, groqResult, u));
    } catch(e) {
      setErrMsg(e.message || "Import failed. Try the Paste details tab.");
      setStatus("error");
    }
  };

  // ── AI Paste import (the always-works path — no scraping) ──
  const handlePaste = async () => {
    const t = pasteText.trim();
    if (t.length < 20) { setErrMsg("Paste at least a sentence or two about the property (or the copied listing text)."); return; }
    setErrMsg("");
    try {
      setStatus("parsing"); setStatusMsg("Building your listing with AI…");
      const d = await structureFromText(t, pastePhotos, url.trim());
      goToReview(d);
    } catch(e) {
      setErrMsg(e.message || "Could not build the listing. Add a little more detail and try again.");
      setStatus("error");
    }
  };

  const handlePublish = () => { setSaving(true); onImport({...editDraft, available:true}); };
  const handleDraft   = () => { setSaving(true); onImport({...editDraft, available:false}); };

  const isLoading = status === "fetching" || status === "parsing";

  const inp = {
    width:"100%", background:"#fff", border:`1px solid ${C.border}`,
    borderRadius:"6px", padding:"0.85rem 1rem", color:"#1C1C1C",
    fontSize:"0.88rem", outline:"none", transition:"border-color 0.2s",
  };
  const tabBtn = (active) => ({
    flex:1, padding:"0.7rem 1rem", background: active?C.gold:"transparent",
    color: active?C.obsidian:C.muted, border:`1px solid ${active?C.gold:C.border}`,
    borderRadius:"7px", fontWeight:700, fontSize:"0.8rem", cursor:"pointer",
    transition:"all 0.2s",
  });

  return (
    <div style={{animation:"fadeIn 0.3s ease"}}>
      {/* Header */}
      <div style={{marginBottom:"1.5rem"}}>
        <button onClick={onCancel} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",padding:0,marginBottom:"0.5rem"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color=C.muted}>← Back to Listings</button>
        <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.7rem",color:C.cream,fontWeight:400}}>Import <em style={{color:C.gold}}>a listing</em></h2>
        <p style={{fontSize:"0.84rem",color:C.muted,marginTop:"0.4rem",lineHeight:1.6}}>
          Import from a URL when the site allows it, or paste the details and let AI build the listing — the paste method always works, even for Airbnb & Booking.com.
        </p>
      </div>

      {/* Mode tabs — hidden while loading / in review */}
      {status !== "fetching" && status !== "parsing" && status !== "review" && (
        <div style={{display:"flex",gap:"0.6rem",marginBottom:"1.2rem"}}>
          <button style={tabBtn(tab==="url")}  onClick={()=>{setTab("url");setErrMsg("");}}>🔗 Import from URL</button>
          <button style={tabBtn(tab==="paste")} onClick={()=>{setTab("paste");setErrMsg("");}}>📋 Paste details (always works)</button>
        </div>
      )}

      {/* ── URL TAB ── */}
      {tab==="url" && status !== "fetching" && status !== "parsing" && status !== "review" && (
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.6rem 2rem",marginBottom:"1.5rem",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}}>
          <div style={{fontSize:"0.62rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem"}}>Property URL</div>
          <div style={{display:"flex",gap:"0.6rem"}}>
            <input value={url} onChange={e=>{setUrl(e.target.value);setErrMsg("");}}
              placeholder="https://www.airbnb.com/rooms/12345678"
              style={inp}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.border}
              onKeyDown={e=>e.key==="Enter"&&handleImport()}/>
            <button onClick={handleImport} style={{padding:"0.85rem 1.5rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"6px",fontWeight:700,fontSize:"0.83rem",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",transition:"background 0.2s"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>🪄 Import</button>
          </div>
          {errMsg && <div style={{marginTop:"0.6rem",padding:"0.6rem 0.9rem",background:"rgba(220,38,38,0.07)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:"5px",fontSize:"0.78rem",color:C.error,lineHeight:1.5}}>{errMsg}</div>}
          <div style={{marginTop:"0.9rem",fontSize:"0.74rem",color:C.muted,lineHeight:1.6}}>
            Works instantly for your own website and many listing sites. Airbnb & Booking.com block server imports — if that happens we'll switch you to Paste mode automatically.
          </div>
        </div>
      )}

      {/* ── PASTE TAB ── */}
      {tab==="paste" && status !== "fetching" && status !== "parsing" && status !== "review" && (
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.6rem 2rem",marginBottom:"1.5rem",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}}>
          <div style={{fontSize:"0.62rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem"}}>Listing details</div>
          <div style={{fontSize:"0.78rem",color:C.muted,lineHeight:1.6,marginBottom:"0.8rem"}}>
            Open the Airbnb / Booking.com page in your browser, select the description &amp; details, copy, and paste here. Or just describe the place in your own words — AI fills in the rest.
          </div>
          <textarea value={pasteText} onChange={e=>{setPasteText(e.target.value);setErrMsg("");}} rows={7}
            placeholder={"e.g. Spacious 2-bedroom apartment in Kilimani, sleeps 4, fully furnished with WiFi, Netflix, secure parking, backup generator. KES 7,500 per night. Walking distance to Yaya Centre..."}
            style={{...inp,resize:"vertical",lineHeight:1.6,fontFamily:"inherit"}}
            onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>

          <div style={{fontSize:"0.62rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.muted,margin:"1.1rem 0 0.4rem"}}>Photo links <span style={{textTransform:"none",letterSpacing:0,color:C.mutedLight}}>— optional, one per line</span></div>
          <textarea value={pastePhotos} onChange={e=>setPastePhotos(e.target.value)} rows={3}
            placeholder={"https://…/photo1.jpg\nhttps://…/photo2.jpg"}
            style={{...inp,resize:"vertical",lineHeight:1.5,fontFamily:"monospace",fontSize:"0.78rem"}}
            onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
          <div style={{marginTop:"0.4rem",fontSize:"0.72rem",color:C.mutedLight,lineHeight:1.5}}>
            Tip: on the listing page, right-click a photo → “Copy image address”. No links? Add photos from your device after saving.
          </div>

          {errMsg && <div style={{marginTop:"0.8rem",padding:"0.6rem 0.9rem",background:"rgba(220,38,38,0.07)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:"5px",fontSize:"0.78rem",color:C.error,lineHeight:1.5}}>{errMsg}</div>}

          <button onClick={handlePaste} style={{marginTop:"1.1rem",width:"100%",padding:"0.9rem 1.5rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"7px",fontWeight:700,fontSize:"0.86rem",cursor:"pointer",transition:"background 0.2s"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>🪄 Build listing with AI</button>
        </div>
      )}


      {/* Loading */}
      {isLoading && (
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"3.5rem 2rem",textAlign:"center",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}}>
          <div style={{width:"48px",height:"48px",border:`3px solid ${C.goldDim}`,borderTop:`3px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.9s linear infinite",margin:"0 auto 1.5rem"}}/>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream,marginBottom:"0.5rem"}}>{statusMsg}</div>
          <div style={{fontSize:"0.8rem",color:C.muted,fontFamily:"monospace",wordBreak:"break-all",maxWidth:"460px",margin:"0 auto",opacity:0.6}}>{url}</div>
        </div>
      )}

      {/* Review */}
      {status === "review" && editDraft && (
        <div style={{animation:"fadeIn 0.3s ease"}}>
          <div style={{background:"rgba(22,163,74,0.08)",border:"1px solid rgba(22,163,74,0.25)",borderRadius:"8px",padding:"0.85rem 1.2rem",marginBottom:"1.5rem",display:"flex",alignItems:"center",gap:"0.7rem"}}>
            <span>✓</span>
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:600,color:C.success}}>Imported {editDraft.photos.length} photo{editDraft.photos.length!==1?"s":""} and listing details</div>
              <div style={{fontSize:"0.74rem",color:C.muted,marginTop:"0.1rem"}}>Review and tweak below, then publish or save as draft. All fields are fully editable after saving too.</div>
            </div>
          </div>

          {/* Photo carousel */}
          {editDraft.photos.length > 0 && (
            <div style={{position:"relative",height:"260px",borderRadius:"10px",overflow:"hidden",marginBottom:"1.5rem",background:"#111"}}>
              {editDraft.photos.map((p,i)=>(
                <img key={i} src={p} alt={`Photo ${i+1}`}
                  style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:i===photoIdx?1:0,transition:"opacity 0.4s ease"}}
                  onError={e=>{ e.target.style.display="none"; }}/>
              ))}
              {/* Prev/next */}
              {editDraft.photos.length > 1 && (<>
                <button onClick={()=>setPhotoIdx(i=>(i-1+editDraft.photos.length)%editDraft.photos.length)} style={{position:"absolute",left:"0.7rem",top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"none",color:"#fff",width:"34px",height:"34px",borderRadius:"50%",cursor:"pointer",fontSize:"1.1rem",backdropFilter:"blur(4px)"}}>‹</button>
                <button onClick={()=>setPhotoIdx(i=>(i+1)%editDraft.photos.length)} style={{position:"absolute",right:"0.7rem",top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"none",color:"#fff",width:"34px",height:"34px",borderRadius:"50%",cursor:"pointer",fontSize:"1.1rem",backdropFilter:"blur(4px)"}}>›</button>
              </>)}
              {/* Counter */}
              <div style={{position:"absolute",bottom:"0.7rem",right:"0.7rem",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",borderRadius:"20px",padding:"0.2rem 0.7rem",fontSize:"0.7rem",color:"#fff"}}>
                {photoIdx+1} / {editDraft.photos.length}
              </div>
              {/* Dot strip */}
              {editDraft.photos.length > 1 && (
                <div style={{position:"absolute",bottom:"0.7rem",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"5px"}}>
                  {editDraft.photos.slice(0,10).map((_,i)=>(
                    <div key={i} onClick={()=>setPhotoIdx(i)} style={{width:"6px",height:"6px",borderRadius:"50%",background:i===photoIdx?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"background 0.2s"}}/>
                  ))}
                </div>
              )}
              {/* Thumbnail strip */}
              <div style={{position:"absolute",bottom:0,left:0,right:0,display:"flex",gap:"3px",padding:"3px",overflowX:"auto",background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)"}}>
                {editDraft.photos.slice(0,8).map((p,i)=>(
                  <img key={i} src={p} alt="" onClick={()=>setPhotoIdx(i)}
                    style={{height:"44px",width:"60px",objectFit:"cover",borderRadius:"3px",cursor:"pointer",opacity:i===photoIdx?1:0.6,border:i===photoIdx?`2px solid ${C.gold}`:"2px solid transparent",transition:"all 0.2s",flexShrink:0}}
                    onError={e=>e.target.style.display="none"}/>
                ))}
              </div>
            </div>
          )}

          {/* Editable fields */}
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.5rem 2rem",marginBottom:"1.2rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
            <div style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.gold,marginBottom:"1.2rem"}}>Listing Details — edit before saving</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              {[{l:"Name",k:"name"},{l:"Tagline",k:"tagline"},{l:"Neighbourhood",k:"neighborhood"},{l:"City",k:"city"}].map(({l,k})=>(
                <div key={k}>
                  <div style={{fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.3rem"}}>{l}</div>
                  <input value={editDraft[k]||""} onChange={e=>setEdit(k,e.target.value)}
                    style={{...inp,padding:"0.6rem 0.8rem",fontSize:"0.84rem"}}
                    onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                </div>
              ))}
              {[{l:"Price / night (KES)",k:"pricePerNight"},{l:"Cleaning Fee (KES)",k:"cleaningFee"},{l:"Bedrooms",k:"bedrooms"},{l:"Bathrooms",k:"bathrooms"},{l:"Max Guests",k:"guests"}].map(({l,k})=>(
                <div key={k}>
                  <div style={{fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.3rem"}}>{l}</div>
                  <input type="number" value={editDraft[k]||0} onChange={e=>setEdit(k,Number(e.target.value))}
                    style={{...inp,padding:"0.6rem 0.8rem",fontSize:"0.84rem"}}
                    onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                </div>
              ))}
            </div>
            {editDraft.description && (
              <div style={{marginTop:"1rem"}}>
                <div style={{fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.3rem"}}>Description</div>
                <textarea value={editDraft.description} onChange={e=>setEdit("description",e.target.value)} rows={4}
                  style={{...inp,resize:"vertical",lineHeight:1.7,fontSize:"0.84rem",padding:"0.6rem 0.8rem"}}
                  onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>
            )}
            {editDraft.amenities.length > 0 && (
              <div style={{marginTop:"1rem"}}>
                <div style={{fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem"}}>Detected Amenities ({editDraft.amenities.length})</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
                  {editDraft.amenities.map(a=>(
                    <span key={a} style={{padding:"0.25rem 0.7rem",background:C.goldDim,border:`1px solid ${C.border}`,borderRadius:"20px",fontSize:"0.73rem",color:C.gold}}>{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Location confirmation — Airbnb/Booking.com almost never expose
              exact coordinates on the public listing page, so this is
              treated as a required step rather than an afterthought. The
              site's SOS button and "book a ride here" feature both depend
              on this being accurate. */}
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"1.5rem 2rem",marginBottom:"1.2rem",boxShadow:"0 2px 8px rgba(14,43,31,0.05)"}}>
            <div style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.gold,marginBottom:"0.6rem"}}>Confirm Exact Location</div>
            <div style={{fontSize:"0.78rem",color:C.muted,lineHeight:1.6,marginBottom:"1rem"}}>
              {editDraft.lat && editDraft.lng
                ? "We found a location for this property — please double-check the pin is on the right building, not just the right block."
                : <span><strong style={{color:"#B8841F"}}>Airbnb and Booking.com don't publish a listing's exact coordinates publicly</strong> — drag the pin below to the real location. This also powers the guest SOS button and ride-booking, so it's worth getting right.</span>}
            </div>
            <LocationPicker
              lat={editDraft.lat || BRAND.defaultLat}
              lng={editDraft.lng || BRAND.defaultLng}
              onChange={({lat,lng})=>{ setEdit("lat",lat); setEdit("lng",lng); }}
            />
          </div>

          <div style={{background:C.goldDim,border:"1px solid rgba(197,151,58,0.35)",borderRadius:"8px",padding:"1rem 1.3rem",marginBottom:"1.4rem"}}>
            <div style={{fontSize:"0.78rem",fontWeight:600,color:C.cream,marginBottom:"0.4rem"}}>⚠ Quick check before publishing</div>
            <div style={{fontSize:"0.76rem",color:"#5A4A2A",lineHeight:1.7}}>
              Nightly price and bedroom/bathroom counts are sometimes hidden behind JavaScript on Airbnb and Booking.com pages, so they can come through wrong or as a rough guess — worth a 10-second glance at the numbers above. The location pin (above) and the photos are the two things most likely to need a manual fix.
            </div>
          </div>

          <div style={{fontSize:"0.76rem",color:C.muted,marginBottom:"1.4rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
            <span style={{color:C.gold}}>ℹ</span> All fields including photos can be edited further from the listing editor after saving.
          </div>

          <div style={{display:"flex",gap:"0.7rem",flexWrap:"wrap"}}>
            <button onClick={()=>{setStatus("idle");setDraft(null);setEditDraft(null);}} style={{padding:"0.75rem 1.2rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"5px",color:C.muted,cursor:"pointer",fontSize:"0.8rem",transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>← Try another URL</button>
            <button onClick={handleDraft} disabled={saving} style={{padding:"0.75rem 1.4rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"5px",color:C.mutedLight,cursor:"pointer",fontSize:"0.8rem",transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>Save as Draft</button>
            <button onClick={handlePublish} disabled={saving} style={{padding:"0.75rem 1.8rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"5px",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",transition:"background 0.2s",display:"flex",alignItems:"center",gap:"0.5rem"}} onMouseEnter={e=>{if(!saving)e.target.style.background=C.goldLight;}} onMouseLeave={e=>e.target.style.background=C.gold}>
              {saving?<><div style={{width:"14px",height:"14px",border:`2px solid ${C.obsidian}`,borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Saving…</>:"Publish Listing"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── New Listing Wizard ────────────────────────────────────────────
function NewListingWizard({ onSave, onCancel }) {
  const [step, setStep] = useState(1); // 1=basics, 2=details, 3=photos, 4=pricing
  const [draft, setDraft] = useState(BLANK_LISTING());
  const [errors, setErrors] = useState({});
  const TOTAL = 4;

  const set = (k, v) => { setDraft(d => ({...d, [k]: v})); setErrors(e => ({...e, [k]: null})); };

  const validateStep = () => {
    const errs = {};
    if (step === 1) {
      if (!draft.name.trim())         errs.name = "Listing name is required";
      if (!draft.neighborhood.trim()) errs.neighborhood = "Neighbourhood is required";
      if (!draft.tagline.trim())      errs.tagline = "Tagline is required";
    }
    if (step === 3) {
      if (draft.photos.length === 0)  errs.photos = "At least one photo is required";
    }
    if (step === 4) {
      if (draft.pricePerNight < 500)  errs.pricePerNight = "Price must be at least KES 500";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, TOTAL)); };
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const handlePublish = () => {
    if (!validateStep()) return;
    onSave({...draft, available: true});
  };
  const handleDraft = () => {
    onSave({...draft, available: false});
  };

  const STEPS = ["Basic Info","Details & Amenities","Photos","Pricing & Publish"];

  const inputStyle = {
    width:"100%", background:"rgba(255,255,255,0.04)",
    border:`1px solid ${C.border}`, borderRadius:"5px",
    padding:"0.78rem 1rem", color:"#1C1C1C", fontSize:"0.88rem", outline:"none",
  };
  const errStyle = {fontSize:"0.72rem", color:C.error, marginTop:"0.25rem"};
  const label = (txt) => (
    <div style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.35rem"}}>{txt}</div>
  );

  return (
    <div style={{animation:"fadeIn 0.3s ease"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"2rem",flexWrap:"wrap"}}>
        <div>
          <button onClick={onCancel} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",padding:0,marginBottom:"0.5rem",display:"flex",alignItems:"center",gap:"0.3rem"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color=C.muted}>
            {"<"} Back to Listings
          </button>
          <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.7rem",color:C.cream,fontWeight:400}}>
            Add New <em style={{color:C.gold}}>Listing</em>
          </h2>
        </div>
      </div>

      {/* Step progress bar */}
      <div style={{display:"flex",gap:"0",marginBottom:"2rem",borderRadius:"6px",overflow:"hidden",border:`1px solid ${C.border}`}}>
        {STEPS.map((s,i)=>{
          const done = step > i+1;
          const active = step === i+1;
          return (
            <div key={s} onClick={()=>{ if(done) setStep(i+1); }} style={{flex:1,padding:"0.65rem 0.5rem",background:active?C.goldDim:done?"rgba(76,175,125,0.1)":C.card,borderRight:i<STEPS.length-1?`1px solid ${C.border}`:"none",cursor:done?"pointer":"default",transition:"all 0.2s",textAlign:"center"}}>
              <div style={{fontSize:"0.6rem",letterSpacing:"0.1em",textTransform:"uppercase",color:active?C.gold:done?C.success:"#9B9B8F",fontWeight:active?600:400}}>
                {done?"✓ ":""}{s}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"2rem",marginBottom:"1.5rem",minHeight:"360px",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}}>

        {/* ── Step 1: Basic Info ── */}
        {step===1&&(
          <div style={{animation:"fadeIn 0.25s ease"}}>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream,marginBottom:"1.5rem",fontWeight:400}}>Tell us about this property</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              <div style={{gridColumn:"1/-1"}}>
                {label("Listing Name *")}
                <input value={draft.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Westlands Skyline Suite" style={inputStyle} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                {errors.name&&<div style={errStyle}>{errors.name}</div>}
              </div>
              <div style={{gridColumn:"1/-1"}}>
                {label("Tagline *")}
                <input value={draft.tagline} onChange={e=>set("tagline",e.target.value)} placeholder="e.g. Stunning views in the heart of the city" style={inputStyle} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                {errors.tagline&&<div style={errStyle}>{errors.tagline}</div>}
              </div>
              <div>
                {label("Neighbourhood *")}
                <input value={draft.neighborhood} onChange={e=>set("neighborhood",e.target.value)} placeholder="e.g. Kilimani" style={inputStyle} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                {errors.neighborhood&&<div style={errStyle}>{errors.neighborhood}</div>}
              </div>
              <div>
                {label("City")}
                <input value={draft.city} onChange={e=>set("city",e.target.value)} style={inputStyle} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>
              <div>
                {label("Property Type")}
                <select value={draft.type} onChange={e=>set("type",e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
                  {TYPE_OPTIONS.map(t=><option key={t} value={t} style={{background:C.card}}>{t}</option>)}
                </select>
              </div>
              <div>
                {label("Badge")}
                <select value={draft.badge} onChange={e=>set("badge",e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
                  {BADGE_OPTIONS.map(b=><option key={b} value={b} style={{background:C.card}}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginTop:"1rem"}}>
              {label("Description")}
              <textarea value={draft.description} onChange={e=>set("description",e.target.value)} rows={4} placeholder="Describe the space — what makes it special, who it's perfect for..." style={{...inputStyle,resize:"vertical",lineHeight:1.7}} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
          </div>
        )}

        {/* ── Step 2: Details & Amenities ── */}
        {step===2&&(
          <div style={{animation:"fadeIn 0.25s ease"}}>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream,marginBottom:"1.5rem",fontWeight:400}}>Space details & what's included</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
              {[{l:"Bedrooms",k:"bedrooms",min:0,max:10},{l:"Bathrooms",k:"bathrooms",min:1,max:10},{l:"Max Guests",k:"guests",min:1,max:20},{l:"Size (sqm)",k:"sqm",min:10,max:2000}].map(f=>(
                <div key={f.k}>
                  {label(f.l)}
                  <div style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
                    <button onClick={()=>set(f.k,Math.max(f.min,draft[f.k]-1))} style={{width:"30px",height:"36px",border:`1px solid ${C.border}`,background:"none",color:C.cream,borderRadius:"4px",cursor:"pointer",fontSize:"1.1rem",transition:"all 0.15s"}} onMouseEnter={e=>{e.target.style.borderColor=C.gold;e.target.style.color=C.gold;}} onMouseLeave={e=>{e.target.style.borderColor=C.border;e.target.style.color=C.cream;}}>-</button>
                    <input type="number" min={f.min} max={f.max} value={draft[f.k]} onChange={e=>set(f.k,Number(e.target.value))} style={{...inputStyle,textAlign:"center",flex:1}} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                    <button onClick={()=>set(f.k,Math.min(f.max,draft[f.k]+1))} style={{width:"30px",height:"36px",border:`1px solid ${C.border}`,background:"none",color:C.cream,borderRadius:"4px",cursor:"pointer",fontSize:"1.1rem",transition:"all 0.15s"}} onMouseEnter={e=>{e.target.style.borderColor=C.gold;e.target.style.color=C.gold;}} onMouseLeave={e=>{e.target.style.borderColor=C.border;e.target.style.color="#F7F2EA";}}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1rem",color:C.cream,marginBottom:"1rem",fontWeight:400}}>Amenities</div>
            <AmenityPicker selected={draft.amenities} onChange={v=>set("amenities",v)}/>
            <div style={{marginTop:"1.5rem"}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1rem",color:C.cream,marginBottom:"0.8rem",fontWeight:400}}>House Rules</div>
              <RulesEditor rules={draft.houseRules} onChange={v=>set("houseRules",v)}/>
            </div>
          </div>
        )}

        {/* ── Step 3: Photos ── */}
        {step===3&&(
          <div style={{animation:"fadeIn 0.25s ease"}}>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream,marginBottom:"0.5rem",fontWeight:400}}>Add photos</div>
            <div style={{fontSize:"0.8rem",color:C.muted,marginBottom:"1.2rem"}}>Add at least one photo. The first photo is used as the cover image on listing cards.</div>
            {errors.photos&&<div style={{...errStyle,marginBottom:"0.8rem",padding:"0.5rem 0.8rem",background:"rgba(224,82,82,0.08)",borderRadius:"4px",border:"1px solid rgba(224,82,82,0.2)"}}>{errors.photos}</div>}
            <PhotoManager photos={draft.photos} onChange={v=>set("photos",v)}/>
          </div>
        )}

        {/* ── Step 4: Pricing & Publish ── */}
        {step===4&&(
          <div style={{animation:"fadeIn 0.25s ease"}}>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream,marginBottom:"1.5rem",fontWeight:400}}>Set your pricing</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.5rem"}}>
              <div>
                {label("Price Per Night (KES) *")}
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:"0.9rem",top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:"0.8rem",pointerEvents:"none"}}>KES</span>
                  <input type="number" min={500} value={draft.pricePerNight} onChange={e=>set("pricePerNight",Number(e.target.value))} style={{...inputStyle,paddingLeft:"3.5rem"}} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                </div>
                {errors.pricePerNight&&<div style={errStyle}>{errors.pricePerNight}</div>}
              </div>
              <div>
                {label("Cleaning Fee (KES)")}
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:"0.9rem",top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:"0.8rem",pointerEvents:"none"}}>KES</span>
                  <input type="number" min={0} value={draft.cleaningFee} onChange={e=>set("cleaningFee",Number(e.target.value))} style={{...inputStyle,paddingLeft:"3.5rem"}} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                </div>
              </div>
            </div>

            {/* Live preview card */}
            <div style={{background:"rgba(197,151,58,0.08)",border:`1px solid ${C.border}`,borderRadius:"8px",padding:"1.2rem",marginBottom:"1.5rem"}}>
              <div style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.8rem"}}>Pricing Preview</div>
              <div style={{display:"flex",gap:"2rem",flexWrap:"wrap"}}>
                {[[1,draft.pricePerNight+draft.cleaningFee],[3,3*draft.pricePerNight+draft.cleaningFee],[7,7*draft.pricePerNight+draft.cleaningFee],[30,30*draft.pricePerNight+draft.cleaningFee]].map(([n,v])=>(
                  <div key={n}>
                    <div style={{fontSize:"0.6rem",color:C.muted,textTransform:"uppercase",letterSpacing:"0.12em"}}>{n} night{n>1?"s":""}</div>
                    <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.gold}}>KES {fmt(v)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Listing summary */}
            <div style={{background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"8px",padding:"1.2rem"}}>
              <div style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.8rem"}}>Listing Summary</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
                {[["Name",draft.name||"—"],["Location",draft.neighborhood||"—"],["Type",draft.type],["Capacity",`${draft.bedrooms}bd · ${draft.bathrooms}ba · ${draft.guests} guests`],["Photos",`${draft.photos.length} photo${draft.photos.length!==1?"s":""}`],["Amenities",`${draft.amenities.length} included`]].map(([l,v])=>(
                  <div key={l} style={{padding:"0.4rem 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",gap:"0.5rem",fontSize:"0.8rem"}}>
                    <span style={{color:C.muted}}>{l}</span>
                    <span style={{color:"#1C1C1C",textAlign:"right",maxWidth:"55%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"1rem"}}>
        <div style={{fontSize:"0.72rem",color:C.muted}}>Step {step} of {TOTAL}</div>
        <div style={{display:"flex",gap:"0.7rem"}}>
          {step>1&&(
            <button onClick={prev} style={{padding:"0.75rem 1.4rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"5px",color:C.muted,cursor:"pointer",fontSize:"0.8rem",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(247,242,234,0.2)";e.currentTarget.style.color="rgba(247,242,234,0.6)";}}>
              Back
            </button>
          )}
          {step<TOTAL&&(
            <button onClick={next} style={{padding:"0.75rem 1.8rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"5px",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",transition:"background 0.2s",letterSpacing:"0.05em"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>
              Continue
            </button>
          )}
          {step===TOTAL&&(
            <div style={{display:"flex",gap:"0.6rem"}}>
              <button onClick={handleDraft} style={{padding:"0.75rem 1.4rem",background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:"5px",color:C.mutedLight,cursor:"pointer",fontSize:"0.8rem",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;}}>
                Save as Draft
              </button>
              <button onClick={handlePublish} style={{padding:"0.75rem 1.8rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"5px",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",transition:"background 0.2s"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>
                Publish Listing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Updated AdminListingCard with delete ──────────────────────────
function AdminListingCard({ listing, bookings, onEdit, onDelete }) {
  const lBookings=bookings.filter(b=>b.listing?.id===listing.id);
  const lRev=lBookings.reduce((s,b)=>s+(b.total||0),0);
  const bookedCount=(listing.bookedDates||[]).length;
  const [hov,setHov]=useState(false);
  const [confirmDel,setConfirmDel]=useState(false);

  return (
    <div style={{background:"#fff",border:`1px solid ${hov?C.borderHover:C.border}`,borderRadius:"10px",overflow:"hidden",transition:"all 0.25s",boxShadow:hov?"0 12px 32px rgba(14,43,31,0.14)":"0 2px 10px rgba(14,43,31,0.07)"}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{height:"140px",overflow:"hidden",position:"relative"}}>
        {listing.photos[0]
          ? <img src={listing.photos[0]} alt={listing.name} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.5s",transform:hov?"scale(1.05)":"scale(1)"}}/>
          : <div style={{width:"100%",height:"100%",background:C.ink,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",color:C.muted}}>🏠</div>
        }
        <div style={{position:"absolute",top:"0.6rem",left:"0.6rem",background:"rgba(14,43,31,0.82)",backdropFilter:"blur(8px)",borderRadius:"4px",padding:"0.2rem 0.5rem",fontSize:"0.62rem",color:listing.available?"#5EB578":C.error,fontWeight:600,letterSpacing:"0.08em"}}>
          {listing.available?"● LIVE":"● PAUSED"}
        </div>
        {/* Delete button — always visible so touch users can reach it */}
        <button onClick={e=>{e.stopPropagation();setConfirmDel(true);}} style={{position:"absolute",top:"0.6rem",right:"0.6rem",background:"rgba(220,38,38,0.85)",backdropFilter:"blur(8px)",border:"none",borderRadius:"5px",padding:"0.3rem 0.7rem",fontSize:"0.65rem",color:"#fff",cursor:"pointer",fontWeight:700,letterSpacing:"0.05em",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(185,28,28,0.95)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(220,38,38,0.85)"}>
          🗑 Delete
        </button>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 40%,rgba(14,43,31,0.45) 100%)",pointerEvents:"none"}}/>
      </div>
      <div style={{padding:"1.1rem"}}>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1rem",color:C.cream,marginBottom:"0.2rem",fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{listing.name||<span style={{color:C.muted,fontStyle:"italic"}}>Untitled listing</span>}</div>
        <div style={{fontSize:"0.72rem",color:C.muted,marginBottom:"0.8rem"}}>{listing.neighborhood||"—"} · {listing.type}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom:"1rem"}}>
          {[{l:"Rate/night",v:`KES ${fmt(listing.pricePerNight)}`},{l:"Revenue",v:`KES ${fmt(lRev)}`},{l:"Nights blocked",v:bookedCount},{l:"Bookings",v:lBookings.length}].map(s=>(
            <div key={s.l} style={{background:"#F7F2EA",borderRadius:"4px",padding:"0.45rem 0.65rem"}}>
              <div style={{fontSize:"0.58rem",color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</div>
              <div style={{fontSize:"0.8rem",color:C.gold,fontWeight:500,marginTop:"0.1rem"}}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:"0.9rem"}}><AdminMiniCalendar listing={listing}/></div>
        <button onClick={onEdit} style={{width:"100%",padding:"0.65rem",background:hov?C.goldDim:"rgba(255,255,255,0.04)",border:`1px solid ${hov?C.gold:C.border}`,borderRadius:"5px",color:hov?C.gold:C.muted,cursor:"pointer",fontSize:"0.78rem",fontWeight:500,letterSpacing:"0.1em",transition:"all 0.2s",textTransform:"uppercase"}}>
          Edit Listing
        </button>
      </div>
      {confirmDel&&(
        <ConfirmDialog
          message={`Permanently delete "${listing.name}"? This cannot be undone.`}
          onConfirm={()=>{setConfirmDel(false);onDelete(listing.id);}}
          onCancel={()=>setConfirmDel(false)}
        />
      )}
    </div>
  );
}

// ── AdminListings with create + delete ───────────────────────────
function AdminListings({ listings, bookings, onUpdate, onCreate, onDelete }) {
  const [mode,setMode]=useState("grid"); // "grid" | "new" | "edit" | "import-url"
  const [editing,setEditing]=useState(null);
  const [toast,setToast]=useState(null);

  const handleSaveEdit=async(updated)=>{
    await onUpdate(updated);
    setMode("grid"); setEditing(null);
    setToast({msg:"Listing updated successfully!",type:"success"});
  };

  const handleCreate=async(newListing)=>{
    await onCreate(newListing);
    setMode("grid");
    setToast({msg:`"${newListing.name}" ${newListing.available?"published!":"saved as draft."}`,type:"success"});
  };

  const handleDelete=async(id)=>{
    await onDelete(id);
    setToast({msg:"Listing deleted.",type:"success"});
  };

  if(mode==="edit"&&editing) return <ListingEditor listing={editing} onSave={handleSaveEdit} onCancel={()=>{setMode("grid");setEditing(null);}}/>;
  if(mode==="new") return <NewListingWizard onSave={handleCreate} onCancel={()=>setMode("grid")}/>;
  if(mode==="import-url") return <ImportListingFromUrl onImport={handleCreate} onCancel={()=>setMode("grid")}/>;

  const live   = listings.filter(l=>l.available);
  const paused = listings.filter(l=>!l.available);

  return (
    <div>
      {/* Header row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"2rem",flexWrap:"wrap",gap:"1rem"}}>
        <div>
          <div style={{fontSize:"0.68rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.gold,marginBottom:"0.4rem"}}>Portfolio</div>
          <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.cream,fontWeight:400}}>All Listings</h2>
          <div style={{display:"flex",gap:"1rem",marginTop:"0.4rem",fontSize:"0.78rem"}}>
            <span style={{color:C.success}}>● {live.length} Live</span>
            <span style={{color:C.muted}}>● {paused.length} Paused</span>
            <span style={{color:C.muted}}>{listings.length} Total</span>
          </div>
        </div>
        <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
          <button onClick={()=>setMode("import-url")} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.8rem 1.4rem",background:"transparent",color:C.sage,border:`1px solid ${C.border}`,borderRadius:"6px",fontWeight:600,fontSize:"0.82rem",cursor:"pointer",transition:"all 0.2s",flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.sage;}}>
            🔗 Import from URL
          </button>
          <button onClick={()=>setMode("new")} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.8rem 1.6rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"6px",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",transition:"background 0.2s",letterSpacing:"0.05em",flexShrink:0}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>
            + New Listing
          </button>
        </div>
      </div>

      {listings.length===0?(
        <div style={{textAlign:"center",padding:"5rem 2rem",background:"#fff",border:`2px dashed ${C.border}`,borderRadius:"12px"}}>
          <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🏠</div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.4rem",color:C.cream,marginBottom:"0.6rem"}}>No listings yet</div>
          <div style={{fontSize:"0.85rem",color:C.muted,marginBottom:"1.5rem"}}>Create a listing manually or import one from Airbnb, Booking.com, and more.</div>
          <div style={{display:"flex",gap:"0.7rem",justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>setMode("import-url")} style={{padding:"0.8rem 1.6rem",background:"transparent",color:C.sage,border:`1px solid ${C.border}`,borderRadius:"6px",fontWeight:600,fontSize:"0.82rem",cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.sage;}}>
              🔗 Import from URL
            </button>
            <button onClick={()=>setMode("new")} style={{padding:"0.8rem 2rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"6px",fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>
              + Add Listing Manually
            </button>
          </div>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1.2rem"}}>
          {listings.map(l=>(
            <AdminListingCard key={l.id} listing={l} bookings={bookings}
              onEdit={()=>{setEditing(l);setMode("edit");}}
              onDelete={handleDelete}
            />
          ))}
          {/* Import from URL card */}
          <button onClick={()=>setMode("import-url")} style={{background:"transparent",border:`2px dashed ${C.border}`,borderRadius:"10px",padding:"2rem",cursor:"pointer",transition:"all 0.25s",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.7rem",minHeight:"280px",color:C.muted}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.sage;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
            <div style={{fontSize:"2rem",lineHeight:1}}>🔗</div>
            <div style={{fontSize:"0.82rem",fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase"}}>Import from URL</div>
            <div style={{fontSize:"0.7rem",color:"inherit",opacity:0.7,textAlign:"center",lineHeight:1.5}}>Airbnb · Booking.com<br/>VRBO · any site</div>
          </button>
          {/* Add new card */}
          <button onClick={()=>setMode("new")} style={{background:"transparent",border:`2px dashed ${C.border}`,borderRadius:"10px",padding:"2rem",cursor:"pointer",transition:"all 0.25s",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.7rem",minHeight:"280px",color:C.muted}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.sage;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
            <div style={{fontSize:"2rem",lineHeight:1}}>+</div>
            <div style={{fontSize:"0.82rem",fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase"}}>Add Manually</div>
          </button>
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}

// ─── STAGE 5: iCAL SYNC ENGINE ───────────────────────────────────

// ── ICS parser ───────────────────────────────────────────────────
function parseICS(text) {
  const events = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const getVal = (key) => {
      const m = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
      return m ? m[1].trim() : null;
    };
    const rawStart = getVal("DTSTART");
    const rawEnd   = getVal("DTEND");
    const summary  = getVal("SUMMARY") || "Blocked";
    const uid      = getVal("UID") || Math.random().toString(36);
    if (!rawStart) continue;
    const parseDate = (s) => {
      // handles YYYYMMDD and YYYYMMDDTHHmmssZ
      const d = s.replace(/T.*/, "");
      return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
    };
    const start = parseDate(rawStart);
    const end   = rawEnd ? parseDate(rawEnd) : start;
    // expand range into individual dates (end date exclusive in iCal)
    const dates = [];
    let cur = start;
    while (cur < end) {
      dates.push(cur);
      cur = addDays(cur, 1);
    }
    if (dates.length === 0) dates.push(start);
    events.push({ uid, summary, start, end, dates });
  }
  return events;
}

// ── ICS generator (export) ────────────────────────────────────────
function generateICS(listing, bookings) {
  const allBookings = bookings.filter(b => b.listing?.id === listing.id);
  const now = new Date().toISOString().replace(/[-:.]/g,"").slice(0,15)+"Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND.icsDomain}//${BRAND.icsDomain} Calendar//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${listing.name} — ${BRAND.fullName}`,
    `X-WR-TIMEZONE:${BRAND.timezone}`,
  ];
  // From confirmed bookings
  for (const b of allBookings) {
    if (!b.checkIn || !b.checkOut) continue;
    const dtStart = b.checkIn.replace(/-/g,"");
    const dtEnd   = b.checkOut.replace(/-/g,"");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.ref}@${BRAND.icsDomain}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:Booked — ${b.name || "Guest"} (${b.ref})`,
      `DESCRIPTION:Guest: ${b.name}\\nPhone: ${b.phone || ""}\\nTotal: KES ${fmt(b.total)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }
  // From manually blocked dates — group consecutive dates into ranges
  const blocked = [...new Set(listing.bookedDates || [])].sort();
  if (blocked.length > 0) {
    // Group into contiguous ranges
    const ranges = [];
    let rangeStart = blocked[0], prev = blocked[0];
    for (let i = 1; i < blocked.length; i++) {
      const expected = addDays(prev, 1);
      if (blocked[i] === expected) { prev = blocked[i]; }
      else { ranges.push([rangeStart, addDays(prev,1)]); rangeStart = blocked[i]; prev = blocked[i]; }
    }
    ranges.push([rangeStart, addDays(prev,1)]);
    for (const [s, e] of ranges) {
      // skip if already covered by a booking
      const coveredByBooking = allBookings.some(b => b.checkIn <= s && b.checkOut >= e);
      if (coveredByBooking) continue;
      lines.push(
        "BEGIN:VEVENT",
        `UID:blocked-${s}-${e}@${BRAND.icsDomain}`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${s.replace(/-/g,"")}`,
        `DTEND;VALUE=DATE:${e.replace(/-/g,"")}`,
        `SUMMARY:Blocked — ${BRAND.fullName}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadICS(filename, content) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Platform configs
const PLATFORMS = [
  { id:"airbnb",     name:"Airbnb",        color:"#FF5A5F", icon:"🏠", hint:"Listing → Availability → Export Calendar" },
  { id:"booking",    name:"Booking.com",   color:"#003580", icon:"🔵", hint:"Extranet → Calendar → iCal Export" },
  { id:"vrbo",       name:"VRBO",          color:"#1B5FB4", icon:"🏡", hint:"Dashboard → Calendars → Export" },
  { id:"tripadvisor",name:"Tripadvisor",   color:"#00A680", icon:"🦉", hint:"Owner Dashboard → Calendar → Export URL" },
  { id:"agoda",      name:"Agoda Homes",   color:"#E5322D", icon:"🔴", hint:"Property → Calendar → Sync" },
  { id:"manual",     name:"Manual / Other",color:"#7A7A8C", icon:"📁", hint:"Any .ics file from any source" },
];

// Storage for sync configs
async function loadSyncConfigs() {
  try {
    const { data, error } = await supabase
      .from("kv_store").select("value").eq("key",`${BRAND.slug}:syncconfigs`).single();
    return (error || !data) ? {} : JSON.parse(data.value);
  } catch { return {}; }
}
async function saveSyncConfigs(d) {
  const { error } = await supabase.from("kv_store").upsert(
    { key:`${BRAND.slug}:syncconfigs`, value:JSON.stringify(d) }, { onConflict:"key" }
  );
  if (error) console.error("[Supabase] saveSyncConfigs:", error.message);
}
async function loadSyncLog() {
  try {
    const { data, error } = await supabase
      .from("kv_store").select("value").eq("key",`${BRAND.slug}:synclog`).single();
    return (error || !data) ? [] : JSON.parse(data.value);
  } catch { return []; }
}
async function saveSyncLog(d) {
  const { error } = await supabase.from("kv_store").upsert(
    { key:`${BRAND.slug}:synclog`, value:JSON.stringify(d) }, { onConflict:"key" }
  );
  if (error) console.error("[Supabase] saveSyncLog:", error.message);
}

// ── Import Modal ──────────────────────────────────────────────────
function ImportModal({ listing, platform, onClose, onImport }) {
  const [tab,setTab]=useState("file"); // file | url | paste
  const [url,setUrl]=useState("");
  const [pasteText,setPasteText]=useState("");
  const [result,setResult]=useState(null); // {events, dates, raw}
  const [status,setStatus]=useState("idle"); // idle | loading | done | error
  const [errMsg,setErrMsg]=useState("");
  const fileRef = useState(null);

  const processICS = (text, source) => {
    try {
      const events = parseICS(text);
      if (events.length === 0) { setErrMsg("No events found in this calendar file."); setStatus("error"); return; }
      const dates = [...new Set(events.flatMap(e => e.dates))];
      setResult({ events, dates, raw: text, source });
      setStatus("done");
    } catch(e) {
      setErrMsg("Could not parse this file. Make sure it is a valid .ics calendar file.");
      setStatus("error");
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".ics") && file.type !== "text/calendar") {
      setErrMsg("Please select a .ics calendar file."); setStatus("error"); return;
    }
    setStatus("loading");
    const reader = new FileReader();
    reader.onload = (ev) => processICS(ev.target.result, file.name);
    reader.readAsText(file);
  };

  const handleUrl = async () => {
    if (!url.trim()) { setErrMsg("Enter a valid calendar URL."); return; }
    setStatus("loading"); setErrMsg("");
    try {
      const res = await fetch(`/api/ics-proxy?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.text) {
        setErrMsg(data?.error || "Could not fetch that calendar URL.");
        setStatus("error");
        return;
      }
      processICS(data.text, url.trim());
    } catch (e) {
      setErrMsg("Network error reaching the calendar proxy. Please try again.");
      setStatus("error");
    }
  };

  const handlePaste = () => {
    if (!pasteText.trim()) { setErrMsg("Paste your .ics content above."); return; }
    setStatus("loading"); setErrMsg("");
    setTimeout(() => processICS(pasteText, "Pasted calendar"), 400);
  };

  const handleApply = (mode) => {
    // mode: "merge" | "replace"
    onImport({ listing, result, mode });
    onClose();
  };

  const p = PLATFORMS.find(p=>p.id===platform) || PLATFORMS[PLATFORMS.length-1];
  const overlay = {position:"fixed",inset:0,background:"rgba(14,43,31,0.72)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",backdropFilter:"blur(8px)"};
  const box = {background:C.card,border:`1px solid ${C.border}`,borderRadius:"12px",width:"100%",maxWidth:"560px",maxHeight:"90vh",overflowY:"auto",animation:"slideUp 0.3s ease",boxShadow:"0 32px 80px rgba(0,0,0,0.6)"};

  return (
    <div style={overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={box}>
        {/* Header */}
        <div style={{padding:"1.5rem 1.8rem",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.card,zIndex:2}}>
          <div>
            <div style={{fontSize:"0.62rem",letterSpacing:"0.25em",textTransform:"uppercase",color:C.gold,marginBottom:"0.3rem"}}>Import Calendar</div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream}}>{listing.name}</div>
            <div style={{fontSize:"0.75rem",color:C.muted,marginTop:"0.1rem",display:"flex",alignItems:"center",gap:"0.4rem"}}>
              <span style={{color:p.color}}>{p.icon}</span>{p.name}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:"1.3rem",cursor:"pointer"}} onMouseEnter={e=>e.target.style.color=C.cream} onMouseLeave={e=>e.target.style.color=C.muted}>✕</button>
        </div>

        <div style={{padding:"1.5rem 1.8rem"}}>
          {/* Instructions */}
          <div style={{background:C.goldDim,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"0.8rem 1rem",marginBottom:"1.2rem",fontSize:"0.78rem",color:C.mutedLight,display:"flex",gap:"0.6rem",alignItems:"flex-start"}}>
            <span style={{color:C.gold,flexShrink:0}}>ℹ</span>
            <span><strong style={{color:C.gold}}>{p.name} tip:</strong> {p.hint}</span>
          </div>

          {/* Tab selector */}
          <div style={{display:"flex",gap:"0.4rem",marginBottom:"1.2rem",background:"#F7F2EA",borderRadius:"6px",padding:"0.3rem"}}>
            {[{id:"file",label:"📁 Upload .ics"},{id:"url",label:"🔗 Calendar URL"},{id:"paste",label:"📋 Paste ICS"}].map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setStatus("idle");setErrMsg("");setResult(null);}} style={{flex:1,padding:"0.5rem 0.6rem",background:tab===t.id?"#fff":"transparent",border:`1px solid ${tab===t.id?C.border:"transparent"}`,borderRadius:"4px",color:tab===t.id?C.cream:C.muted,fontSize:"0.75rem",cursor:"pointer",transition:"all 0.15s",fontWeight:tab===t.id?500:400}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* File upload */}
          {tab==="file"&&(
            <div>
              <label style={{display:"block",border:`2px dashed ${C.border}`,borderRadius:"8px",padding:"2.5rem",textAlign:"center",cursor:"pointer",transition:"border-color 0.2s,background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <input type="file" accept=".ics,text/calendar" onChange={handleFile} style={{display:"none"}}/>
                <div style={{fontSize:"2.2rem",marginBottom:"0.6rem"}}>📅</div>
                <div style={{fontSize:"0.88rem",color:C.cream,marginBottom:"0.3rem"}}>Drop your .ics file here or click to browse</div>
                <div style={{fontSize:"0.72rem",color:C.muted}}>Supports any standard iCalendar (.ics) file</div>
              </label>
            </div>
          )}

          {/* URL */}
          {tab==="url"&&(
            <div>
              <div style={{fontSize:"0.65rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.4rem"}}>Calendar Feed URL</div>
              <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.6rem"}}>
                <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.airbnb.com/calendar/ical/…"
                  style={{flex:1,background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"5px",padding:"0.75rem 1rem",color:"#1C1C1C",fontSize:"0.85rem",outline:"none"}}
                  onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}
                  onKeyDown={e=>e.key==="Enter"&&handleUrl()}/>
                <button onClick={handleUrl} disabled={status==="loading"} style={{padding:"0.75rem 1.2rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"5px",fontWeight:600,fontSize:"0.8rem",cursor:"pointer",flexShrink:0,transition:"background 0.2s"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>
                  {status==="loading"?"…":"Fetch"}
                </button>
              </div>
              <div style={{fontSize:"0.7rem",color:C.muted,lineHeight:1.6}}>
                We fetch this URL on our server (not your browser) so platforms that block cross-site requests still work.
              </div>
            </div>
          )}

          {/* Paste */}
          {tab==="paste"&&(
            <div>
              <div style={{fontSize:"0.65rem",letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:"0.4rem"}}>Paste .ics content</div>
              <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} rows={8} placeholder={"BEGIN:VCALENDAR\nVERSION:2.0\n...\nEND:VCALENDAR"}
                style={{width:"100%",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"5px",padding:"0.75rem 1rem",color:"#1C1C1C",fontSize:"0.78rem",outline:"none",fontFamily:"monospace",resize:"vertical",lineHeight:1.5}}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
              <button onClick={handlePaste} style={{marginTop:"0.6rem",padding:"0.65rem 1.4rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"5px",fontWeight:600,fontSize:"0.8rem",cursor:"pointer"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>Parse Calendar</button>
            </div>
          )}

          {/* Loading */}
          {status==="loading"&&(
            <div style={{textAlign:"center",padding:"1.5rem 0",animation:"fadeIn 0.2s ease"}}>
              <div style={{width:"36px",height:"36px",border:`3px solid ${C.goldDim}`,borderTop:`3px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.9s linear infinite",margin:"0 auto 0.8rem"}}/>
              <div style={{fontSize:"0.83rem",color:C.muted}}>Parsing calendar…</div>
            </div>
          )}

          {/* Error */}
          {status==="error"&&(
            <div style={{marginTop:"0.8rem",padding:"0.75rem 1rem",background:"rgba(224,82,82,0.08)",border:"1px solid rgba(224,82,82,0.2)",borderRadius:"6px",fontSize:"0.8rem",color:C.error}}>
              ✕ {errMsg}
            </div>
          )}

          {/* Results */}
          {status==="done"&&result&&(
            <div style={{marginTop:"1rem",animation:"fadeIn 0.3s ease"}}>
              {/* Summary */}
              <div style={{background:C.successDim,border:"1px solid rgba(76,175,125,0.25)",borderRadius:"8px",padding:"1rem 1.2rem",marginBottom:"1rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.6rem"}}>
                  <span style={{fontSize:"0.78rem",color:C.success,fontWeight:600}}>✓ Calendar parsed successfully</span>
                  <span style={{fontSize:"0.72rem",color:C.muted}}>{result.events.length} event{result.events.length!==1?"s":""} · {result.dates.length} dates</span>
                </div>
                {/* Event list */}
                <div style={{display:"flex",flexDirection:"column",gap:"0.35rem",maxHeight:"180px",overflowY:"auto"}}>
                  {result.events.map((ev,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"0.4rem 0.7rem",background:"rgba(10,10,15,0.3)",borderRadius:"4px",fontSize:"0.75rem"}}>
                      <span style={{color:C.mutedLight,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:"0.5rem"}}>{ev.summary}</span>
                      <span style={{color:C.muted,flexShrink:0}}>{fmtDate(ev.start)} – {fmtDate(ev.end)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* New dates preview */}
              <div style={{fontSize:"0.72rem",color:C.muted,marginBottom:"1rem"}}>
                {result.dates.filter(d=>!(listing.bookedDates||[]).includes(d)).length} new dates will be added to this listing's calendar.
              </div>
              {/* Action buttons */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.7rem"}}>
                <button onClick={()=>handleApply("merge")} style={{padding:"0.85rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"6px",fontWeight:700,fontSize:"0.8rem",cursor:"pointer",transition:"background 0.2s",letterSpacing:"0.05em"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>
                  ⊕ Merge with existing
                </button>
                <button onClick={()=>handleApply("replace")} style={{padding:"0.85rem",background:"rgba(224,82,82,0.12)",color:C.error,border:"1px solid rgba(224,82,82,0.25)",borderRadius:"6px",fontWeight:600,fontSize:"0.8rem",cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(224,82,82,0.2)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(224,82,82,0.12)";}}>
                  ↺ Replace all blocked dates
                </button>
              </div>
              <div style={{fontSize:"0.68rem",color:C.muted,marginTop:"0.5rem",textAlign:"center"}}>
                Merge keeps existing blocks. Replace clears them first.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Per-listing iCal card ─────────────────────────────────────────
function ICalListingRow({ listing, bookings, syncConfigs, onImport, onExport, onRemoveSync, onResync, onListingUpdate }) {
  const [expanded,setExpanded]=useState(false);
  const [showImport,setShowImport]=useState(null); // platform id
  const configs = (syncConfigs[listing.id] || []);
  const lBookings = bookings.filter(b=>b.listing?.id===listing.id);

  return (
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden",marginBottom:"1rem",transition:"all 0.2s",boxShadow:"0 2px 10px rgba(14,43,31,0.06)"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderHover} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
      {/* Row header */}
      <div style={{display:"flex",alignItems:"center",gap:"1rem",padding:"1rem 1.4rem",cursor:"pointer"}} onClick={()=>setExpanded(e=>!e)}>
        <img src={listing.photos[0]} alt="" style={{width:"52px",height:"40px",objectFit:"cover",borderRadius:"5px",flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"0.95rem",color:C.cream,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{listing.name}</div>
          <div style={{fontSize:"0.72rem",color:C.muted,marginTop:"0.1rem"}}>{listing.neighborhood} · {(listing.bookedDates||[]).length} blocked dates · {configs.length} sync{configs.length!==1?"s":""} connected</div>
        </div>
        {/* Export button */}
        <button onClick={e=>{e.stopPropagation();onExport(listing,lBookings);}} style={{padding:"0.4rem 0.9rem",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"4px",color:C.muted,fontSize:"0.72rem",cursor:"pointer",transition:"all 0.2s",flexShrink:0,display:"flex",alignItems:"center",gap:"0.35rem"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
          ↓ Export .ics
        </button>
        <span style={{color:C.muted,fontSize:"0.9rem",transition:"transform 0.2s",transform:expanded?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>▾</span>
      </div>

      {/* Expanded detail */}
      {expanded&&(
        <div style={{borderTop:`1px solid ${C.border}`,padding:"1.2rem 1.4rem",animation:"fadeIn 0.25s ease",background:"#FDFAF5"}}>
          {/* Live export feed URL — this is what OTAs subscribe to for 2-way sync */}
          <div style={{marginBottom:"1.2rem"}}>
            <div style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.5rem"}}>Export — Live Calendar Link</div>
            <div style={{fontSize:"0.72rem",color:C.muted,lineHeight:1.55,marginBottom:"0.6rem"}}>
              Paste this link into Airbnb / Booking.com / VRBO under “Import calendar”. It updates automatically — any date booked or blocked here closes on every connected platform within a few hours. This is the export half of two-way sync.
            </div>
            <div style={{display:"flex",gap:"0.5rem",alignItems:"stretch"}}>
              <input readOnly value={`${window.location.origin}/api/calendar?listing=${listing.id}`} onFocus={e=>e.target.select()}
                style={{flex:1,background:C.ink,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"0.6rem 0.8rem",color:C.cream,fontSize:"0.72rem",fontFamily:"monospace",outline:"none",overflow:"hidden",textOverflow:"ellipsis"}}/>
              <button onClick={()=>{const u=`${window.location.origin}/api/calendar?listing=${listing.id}`;navigator.clipboard?.writeText(u);}} style={{padding:"0.6rem 1rem",background:C.gold,color:C.obsidian,border:"none",borderRadius:"6px",fontWeight:700,fontSize:"0.72rem",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}} onMouseEnter={e=>e.target.style.background=C.goldLight} onMouseLeave={e=>e.target.style.background=C.gold}>Copy link</button>
            </div>
          </div>

          {/* Connected feeds */}
          {configs.length>0&&(
            <div style={{marginBottom:"1.2rem"}}>
              <div style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.6rem"}}>Connected Calendar Feeds</div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.45rem"}}>
                {configs.map((cfg,i)=>{
                  const p=PLATFORMS.find(p=>p.id===cfg.platform)||PLATFORMS[PLATFORMS.length-1];
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"0.7rem",padding:"0.6rem 0.9rem",background:C.ink,borderRadius:"6px",border:`1px solid ${C.border}`}}>
                      <span style={{fontSize:"1rem"}}>{p.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.8rem",color:C.cream,fontWeight:500}}>{p.name}</div>
                        <div style={{fontSize:"0.65rem",color:C.muted,marginTop:"0.1rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cfg.source||"File import"} · Last synced: {cfg.lastSynced?new Date(cfg.lastSynced).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"Never"}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"0.4rem",flexShrink:0}}>
                        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.success}}/>
                        <span style={{fontSize:"0.65rem",color:C.success}}>Active</span>
                      </div>
                      {/^https?:\/\//i.test(cfg.source||"")&&(
                        <button onClick={()=>onResync(listing,i)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:"4px",color:C.muted,cursor:"pointer",fontSize:"0.68rem",padding:"0.25rem 0.5rem",flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=C.gold;e.currentTarget.style.borderColor=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.color=C.muted;e.currentTarget.style.borderColor=C.border;}} title="Fetch latest dates now">↻ Sync now</button>
                      )}
                      <button onClick={()=>onRemoveSync(listing.id,i)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"0.8rem",padding:"0.2rem"}} onMouseEnter={e=>e.target.style.color=C.error} onMouseLeave={e=>e.target.style.color=C.muted} title="Remove">✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Import from platforms */}
          <div style={{marginBottom:"1.2rem"}}>
            <div style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.muted,marginBottom:"0.7rem"}}>Import From Platform</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"0.5rem"}}>
              {PLATFORMS.map(p=>(
                <button key={p.id} onClick={()=>setShowImport(p.id)} style={{padding:"0.6rem 0.8rem",background:"#F7F2EA",border:`1px solid ${C.border}`,borderRadius:"6px",cursor:"pointer",transition:"all 0.2s",textAlign:"left",display:"flex",alignItems:"center",gap:"0.5rem"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=p.color+"88";e.currentTarget.style.background="rgba(197,151,58,0.1)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="#F7F2EA";}}>
                  <span style={{fontSize:"1rem"}}>{p.icon}</span>
                  <span style={{fontSize:"0.73rem",color:C.mutedLight,fontWeight:500}}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{display:"flex",gap:"0.8rem",flexWrap:"wrap"}}>
            {[
              {l:"Blocked dates",v:(listing.bookedDates||[]).length},
              {l:"Future blocked",v:(listing.bookedDates||[]).filter(d=>d>=toKey(new Date())).length},
              {l:"Confirmed bookings",v:lBookings.length},
            ].map(s=>(
              <div key={s.l} style={{padding:"0.5rem 0.9rem",background:C.ink,borderRadius:"5px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:"0.58rem",color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</div>
                <div style={{fontSize:"0.95rem",color:C.gold,fontWeight:600,marginTop:"0.1rem"}}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport&&(
        <ImportModal
          listing={listing}
          platform={showImport}
          onClose={()=>setShowImport(null)}
          onImport={({listing:l,result,mode})=>{
            onImport({listing:l,result,mode,platform:showImport});
            setShowImport(null);
          }}
        />
      )}
    </div>
  );
}

// ── iCal Sync Manager (main panel) ───────────────────────────────
function ICalSyncManager({ listings, bookings, onListingUpdate }) {
  const [syncConfigs,setSyncConfigs]=useState({});
  const [syncLog,setSyncLog]=useState([]);
  const [toast,setToast]=useState(null);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    Promise.all([loadSyncConfigs(),loadSyncLog()]).then(([cfg,log])=>{
      setSyncConfigs(cfg); setSyncLog(log); setLoaded(true);
    });
  },[]);

  const handleExport=(listing,lBookings)=>{
    const ics=generateICS(listing,lBookings);
    downloadICS(`${listing.name.replace(/\s+/g,"-")}-${BRAND.slug}.ics`,ics);
    setToast({msg:`Exported calendar for ${listing.name}`,type:"success"});
  };

  const handleImport=async({listing,result,mode,platform})=>{
    const newDates = result.dates;
    let finalDates;
    if(mode==="replace") {
      finalDates = [...new Set(newDates)].sort();
    } else {
      finalDates = [...new Set([...(listing.bookedDates||[]),...newDates])].sort();
    }
    // Update listing
    const updated = {...listing, bookedDates: finalDates};
    await onListingUpdate(updated);
    // Save sync config
    const p = PLATFORMS.find(p=>p.id===platform)||PLATFORMS[PLATFORMS.length-1];
    const newCfg = {
      platform, source: result.source||"File", lastSynced: new Date().toISOString(),
      eventsCount: result.events.length, datesCount: newDates.length,
    };
    const updatedConfigs = {
      ...syncConfigs,
      [listing.id]: [...(syncConfigs[listing.id]||[]).filter(c=>c.platform!==platform), newCfg],
    };
    setSyncConfigs(updatedConfigs);
    await saveSyncConfigs(updatedConfigs);
    // Log entry
    const logEntry = {
      ts: new Date().toISOString(), listingName: listing.name,
      platform: p.name, events: result.events.length,
      datesAdded: finalDates.length-(listing.bookedDates||[]).length,
      mode,
    };
    const newLog = [logEntry, ...syncLog].slice(0,50);
    setSyncLog(newLog);
    await saveSyncLog(newLog);
    setToast({msg:`Imported ${result.events.length} events → ${listing.name} (${mode})`,type:"success"});
  };

  const handleRemoveSync=async(listingId,idx)=>{
    const updated={...syncConfigs,[listingId]:(syncConfigs[listingId]||[]).filter((_,i)=>i!==idx)};
    setSyncConfigs(updated);
    await saveSyncConfigs(updated);
    setToast({msg:"Sync connection removed.",type:"success"});
  };

  // One-click re-fetch for a previously connected URL feed — no need to
  // reopen the full import modal every time a host wants a fresh pull.
  const handleResync=async(listing,idx)=>{
    const cfg = (syncConfigs[listing.id]||[])[idx];
    if (!cfg) return;
    if (!/^https?:\/\//i.test(cfg.source||"")) {
      setToast({msg:"This feed was added from a file — re-upload it to refresh.",type:"error"});
      return;
    }
    setToast(null);
    try {
      const res = await fetch(`/api/ics-proxy?url=${encodeURIComponent(cfg.source)}`);
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.text) {
        setToast({msg:data?.error||"Sync failed — could not fetch that calendar.",type:"error"});
        return;
      }
      const events = parseICS(data.text);
      const newDates = [...new Set(events.flatMap(e=>e.dates))];
      const finalDates = [...new Set([...(listing.bookedDates||[]),...newDates])].sort();
      await onListingUpdate({...listing, bookedDates: finalDates});
      const updatedConfigs = {
        ...syncConfigs,
        [listing.id]: (syncConfigs[listing.id]||[]).map((c,i)=>i===idx?{...c,lastSynced:new Date().toISOString(),eventsCount:events.length,datesCount:newDates.length}:c),
      };
      setSyncConfigs(updatedConfigs);
      await saveSyncConfigs(updatedConfigs);
      const p = PLATFORMS.find(p=>p.id===cfg.platform)||PLATFORMS[PLATFORMS.length-1];
      const logEntry = { ts:new Date().toISOString(), listingName:listing.name, platform:p.name, events:events.length, datesAdded:finalDates.length-(listing.bookedDates||[]).length, mode:"merge" };
      const newLog=[logEntry,...syncLog].slice(0,50);
      setSyncLog(newLog);
      await saveSyncLog(newLog);
      setToast({msg:`Synced ${listing.name} — ${events.length} events checked.`,type:"success"});
    } catch (e) {
      setToast({msg:"Network error during sync.",type:"error"});
    }
  };

  if(!loaded) return <div style={{textAlign:"center",padding:"4rem",color:C.muted}}>Loading…</div>;

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:"0.68rem",letterSpacing:"0.3em",textTransform:"uppercase",color:C.gold,marginBottom:"0.4rem"}}>Calendar Sync</div>
        <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.8rem",color:C.cream,fontWeight:400}}>iCal Sync</h2>
        <p style={{fontSize:"0.82rem",color:C.muted,marginTop:"0.3rem",lineHeight:1.7,maxWidth:"580px"}}>
          Import blocked dates from Airbnb, Booking.com, VRBO and others. Export your calendar for any platform. Keep all your channels in sync.
        </p>
      </div>

      {/* How it works */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.8rem",marginBottom:"2rem"}}>
        {[
          {icon:"⬇️",title:"Import",desc:"Upload or paste an .ics file from any OTA platform. Blocked dates sync instantly."},
          {icon:"⬆️",title:"Export",desc:"Download your calendar as a .ics file. Add the URL to any platform that supports iCal."},
          {icon:"🔄",title:"Stay in sync",desc:"Re-import whenever you get new bookings on other platforms. Merge or replace at will."},
        ].map(s=>(
          <div key={s.title} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"8px",padding:"1.1rem",boxShadow:"0 2px 8px rgba(14,43,31,0.06)"}}>
            <div style={{fontSize:"1.4rem",marginBottom:"0.5rem"}}>{s.icon}</div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"0.9rem",color:C.cream,marginBottom:"0.3rem",fontWeight:500}}>{s.title}</div>
            <div style={{fontSize:"0.75rem",color:C.muted,lineHeight:1.6}}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Platform badges */}
      <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1.8rem",flexWrap:"wrap"}}>
        <span style={{fontSize:"0.68rem",color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase"}}>Supported:</span>
        {PLATFORMS.filter(p=>p.id!=="manual").map(p=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:"0.35rem",padding:"0.25rem 0.65rem",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:"20px",fontSize:"0.7rem",color:C.mutedLight}}>
            <span>{p.icon}</span>{p.name}
          </div>
        ))}
      </div>

      {/* Per-listing rows */}
      <div>
        {listings.map(l=>(
          <ICalListingRow
            key={l.id}
            listing={l}
            bookings={bookings}
            syncConfigs={syncConfigs}
            onImport={handleImport}
            onExport={handleExport}
            onRemoveSync={handleRemoveSync}
            onResync={handleResync}
            onListingUpdate={onListingUpdate}
          />
        ))}
      </div>

      {/* Sync Log */}
      {syncLog.length>0&&(
        <div style={{marginTop:"2rem"}}>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.1rem",color:C.cream,marginBottom:"1rem",fontWeight:400}}>Sync History</div>
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"8px",overflow:"hidden",boxShadow:"0 4px 16px rgba(14,43,31,0.08)"}}>
            {syncLog.slice(0,12).map((e,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.75rem 1.2rem",borderBottom:i<syncLog.length-1?`1px solid ${C.border}`:"none",flexWrap:"wrap",gap:"0.5rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
                  <div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.success,flexShrink:0}}/>
                  <div>
                    <span style={{fontSize:"0.8rem",color:C.cream}}>{e.listingName}</span>
                    <span style={{fontSize:"0.75rem",color:C.muted,marginLeft:"0.5rem"}}>← {e.platform}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:"1rem",fontSize:"0.72rem",color:C.muted}}>
                  <span>{e.events} events</span>
                  <span style={{color:e.datesAdded>0?C.success:C.muted}}>{e.datesAdded>0?`+${e.datesAdded} dates`:"No new dates"}</span>
                  <span style={{color:C.muted}}>{new Date(e.ts).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}

// ── Admin Shell ───────────────────────────────────────────────────
function AdminDashboard({ listings, bookings, onNavigate, onListingUpdate, onListingCreate, onListingDelete, promoConfig, onPromoSave, siteContent, onSiteContentSave, referrals, commissionSettings, onCommissionSave, onReferralsUpdate, hostProfile, onHostProfileSaved }) {
  const [tab,setTab]=useState("dashboard");
  const [sideOpen,setSideOpen]=useState(true);
  const [pushOn,setPushOn]=useState(typeof Notification!=="undefined" && Notification.permission==="granted");

  // Register this device for admin push alerts (new bookings + cross-platform
  // calendar changes). Prompts once; the host can also toggle it below.
  useEffect(()=>{
    if(typeof Notification!=="undefined" && Notification.permission==="granted"){
      enablePushNotifications("admin").then(ok=>{ if(ok) setPushOn(true); });
    }
  },[]);
  const handleEnablePush=async()=>{
    const ok=await enablePushNotifications("admin");
    setPushOn(ok);
  };

  const tabs=[
    {id:"dashboard",icon:"▦",label:"Dashboard"},
    {id:"bookings",icon:"📅",label:"Bookings"},
    {id:"listings",icon:"🏠",label:"Listings"},
    {id:"promos",icon:"🎉",label:"Promotions"},
    {id:"referrals",icon:"💰",label:"Referrals"},
    {id:"content",icon:"✏️",label:"Site Content"},
    {id:"ical",icon:"🔄",label:"iCal Sync"},
    {id:"settings",icon:"⚙",label:"Settings"},
  ];

  const handleLogout=()=>{ onNavigate("home"); };

  return (
    <div style={{minHeight:"100vh",background:"#FDFAF5",display:"flex",paddingTop:"72px"}}>
      {/* Sidebar */}
      <div style={{width:sideOpen?"230px":"64px",flexShrink:0,background:C.cream,borderRight:"1px solid rgba(197,151,58,0.2)",transition:"width 0.3s ease",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {/* Sidebar header */}
        <div style={{padding:"1.2rem",borderBottom:"1px solid rgba(197,151,58,0.2)",display:"flex",alignItems:"center",justifyContent:"space-between",minWidth:"230px"}}>
          {sideOpen&&<div style={{fontSize:"0.65rem",letterSpacing:"0.25em",textTransform:"uppercase",color:C.gold}}>Host Portal</div>}
          <button onClick={()=>setSideOpen(s=>!s)} style={{background:"none",border:"none",color:"rgba(247,242,234,0.6)",cursor:"pointer",fontSize:"1.1rem",padding:"0.2rem",lineHeight:1,marginLeft:"auto"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color=C.muted}>
            {sideOpen?"◁":"▷"}
          </button>
        </div>
        {/* Nav items */}
        <nav style={{padding:"0.8rem 0",flex:1}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:"0.8rem",padding:"0.8rem 1.2rem",background:tab===t.id?"rgba(197,151,58,0.15)":"transparent",border:"none",borderLeft:`2px solid ${tab===t.id?C.gold:"transparent"}`,color:tab===t.id?C.gold:"rgba(247,242,234,0.65)",cursor:"pointer",transition:"all 0.2s",textAlign:"left",minWidth:"230px",whiteSpace:"nowrap"}} onMouseEnter={e=>{ if(tab!==t.id){ e.currentTarget.style.background="rgba(197,151,58,0.08)"; e.currentTarget.style.color="rgba(247,242,234,0.85)"; }}} onMouseLeave={e=>{ if(tab!==t.id){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.muted; }}}>
              <span style={{fontSize:"1rem",flexShrink:0}}>{t.icon}</span>
              {sideOpen&&<span style={{fontSize:"0.83rem",fontWeight:500,letterSpacing:"0.05em"}}>{t.label}</span>}
            </button>
          ))}
        </nav>
        {/* Bottom: notification toggle + back to site */}
        <div style={{padding:"0.8rem 0.8rem 0"}}>
          <button onClick={handleEnablePush} style={{width:"100%",display:"flex",alignItems:"center",gap:"0.7rem",padding:"0.7rem 1rem",background:pushOn?"rgba(22,163,74,0.12)":"none",border:`1px solid ${pushOn?"rgba(22,163,74,0.4)":"rgba(247,242,234,0.2)"}`,borderRadius:"5px",color:pushOn?C.success:"rgba(247,242,234,0.6)",cursor:"pointer",transition:"all 0.2s",minWidth:"214px",whiteSpace:"nowrap",fontSize:"0.8rem",fontWeight:500}} onMouseEnter={e=>{if(!pushOn){e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}}} onMouseLeave={e=>{if(!pushOn){e.currentTarget.style.borderColor="rgba(247,242,234,0.2)";e.currentTarget.style.color=C.muted;}}}>
            <span style={{flexShrink:0}}>{pushOn?"🔔":"🔕"}</span>
            {sideOpen&&<span>{pushOn?"Alerts on — booking & sync":"Enable booking alerts"}</span>}
          </button>
        </div>
        {/* Bottom: back to site */}
        <div style={{padding:"0.8rem",borderTop:`1px solid ${C.border}`}}>
          <button onClick={()=>onNavigate("home")} style={{width:"100%",display:"flex",alignItems:"center",gap:"0.8rem",padding:"0.7rem 1rem",background:"none",border:"1px solid rgba(247,242,234,0.2)",borderRadius:"5px",color:"rgba(247,242,234,0.6)",cursor:"pointer",transition:"all 0.2s",minWidth:"214px",whiteSpace:"nowrap"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
            <span style={{flexShrink:0}}>←</span>
            {sideOpen&&<span style={{fontSize:"0.78rem"}}>Back to site</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{flex:1,overflowY:"auto",padding:"1.5rem",animation:"fadeIn 0.3s ease",background:"#FDFAF5"}}>
        {tab==="dashboard"&&<DashboardHome listings={listings} bookings={bookings}/>}
        {tab==="bookings" &&<BookingsManager listings={listings} bookings={bookings}/>}
        {tab==="listings" &&<AdminListings listings={listings} bookings={bookings} onUpdate={onListingUpdate} onCreate={onListingCreate} onDelete={onListingDelete}/>}
        {tab==="promos"   &&<PromosManager promoConfig={promoConfig||{}} onSave={onPromoSave}/>}
        {tab==="referrals" &&<ReferralManager commissionSettings={commissionSettings} onSaveSettings={onCommissionSave} referrals={referrals||{}} onUpdateReferrals={onReferralsUpdate}/>}
        {tab==="content"  &&<SiteContentManager siteContent={siteContent} onSave={onSiteContentSave}/>}
        {tab==="ical"     &&<ICalSyncManager listings={listings} bookings={bookings} onListingUpdate={onListingUpdate}/>}
        {tab==="settings"&&<SettingsPanel onLogout={handleLogout} hostProfile={hostProfile} onProfileSaved={onHostProfileSaved}/>}
      </div>
    </div>
  );
}

// ── Admin Root (login gate) ───────────────────────────────────────
function AdminRoot({ listings, bookings, onNavigate, onListingUpdate, onListingCreate, onListingDelete, promoConfig, onPromoSave, siteContent, onSiteContentSave, referrals, commissionSettings, onCommissionSave, onReferralsUpdate }) {
  const [authed,setAuthed]=useState(false);
  const [profile,setProfile]=useState(undefined); // undefined = loading, null = new host, object = set up
  const [hostProfile,setHostProfile]=useState(null);

  useEffect(()=>{
    if(isMasterSessionActive()){ setAuthed(true); setProfile(null); return; }
    loadHostProfile().then(p=>{ setProfile(p); setHostProfile(p); });
  },[]);

  if(profile===undefined) return (
    <div style={{minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:"32px",height:"32px",border:"3px solid rgba(197,151,58,0.3)",borderTop:`3px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );
  if(profile===null && !authed) return <HostProfileSetup onComplete={()=>{ loadHostProfile().then(p=>{setProfile(p);setHostProfile(p);setAuthed(true);}); }}/>;
  if(!authed) return <AdminLogin profile={profile} onLogin={()=>setAuthed(true)}/>;
  return <AdminDashboard listings={listings} bookings={bookings} onNavigate={onNavigate} onListingUpdate={onListingUpdate} onListingCreate={onListingCreate} onListingDelete={onListingDelete} promoConfig={promoConfig} onPromoSave={onPromoSave} siteContent={siteContent} onSiteContentSave={onSiteContentSave} referrals={referrals} commissionSettings={commissionSettings} onCommissionSave={onCommissionSave} onReferralsUpdate={onReferralsUpdate} hostProfile={hostProfile} onHostProfileSaved={p=>{setHostProfile(p);setProfile(p);}}/>;
}

// ─── FOOTER ───────────────────────────────────────────────────────
function Footer({ onNavigate, onMyBookings }) {
  return (
    <footer style={{background:C.cream,borderTop:"1px solid rgba(197,151,58,0.3)",padding:"2rem 1.5rem"}}>
      <div style={{maxWidth:"1200px",margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1.5rem"}}>
        <div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.4rem",color:"#F7F2EA",marginBottom:"0.4rem"}}>{BRAND.name}<span style={{color:C.gold,fontStyle:"italic"}}>{BRAND.nameAccent}</span></div>
          <div style={{fontSize:"0.78rem",color:"rgba(247,242,234,0.6)"}}>Premium short stays · {BRAND.city}, {BRAND.country}</div>
        </div>
        <div style={{display:"flex",gap:"2rem",flexWrap:"wrap"}}>
          {["Listings","About","Contact"].map(l=>(
            <button key={l} onClick={()=>onNavigate(l.toLowerCase())} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.78rem",color:"rgba(247,242,234,0.6)",letterSpacing:"0.12em",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color=C.muted}>{l}</button>
          ))}
          <button onClick={onMyBookings} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.78rem",color:C.muted,letterSpacing:"0.12em",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color=C.muted}>My Bookings</button>
        </div>
        <div style={{fontSize:"0.73rem",color:"rgba(247,242,234,0.4)"}}>© {new Date().getFullYear()} {BRAND.fullName} · All rights reserved</div>
      </div>
    </footer>
  );
}

// ─── HOME PAGE ─────────────────────────────────────────────────────
// ─── DEAL SLIDESHOW ───────────────────────────────────────────────
// Combines holiday discounts + per-listing discounts into one
// cinematic, auto-advancing carousel. Smart routing:
//   holiday deal  → listings page (all apartments)
//   listing deal  → direct to that apartment

function DiscountSlideshow({ promoConfig, listings, activeHoliday, onNavigate, onSelectListing, onSelectWithHoliday }) {
  const [idx, setIdx]   = useState(0);
  const [animDir, setAnimDir] = useState(1); // 1=forward, -1=back
  const [paused, setPaused]   = useState(false);

  // Build slides from all discount sources
  const slides = useMemo(() => {
    const out = [];
    // 1. Active holiday
    if (activeHoliday) {
      out.push({
        type:"holiday",
        id:"active_"+activeHoliday.id,
        title: activeHoliday.name,
        subtitle:`${activeHoliday.discount}% off all stays`,
        emoji: activeHoliday.emoji,
        theme: activeHoliday.theme,
        urgency:"NOW",
        urgencyColor:"#EF4444",
        cta:"Book Now",
        photo: listings[0]?.photos?.[0],
        listing: null, // goes to all listings
        daysUntil: 0,
      });
    }
    // 2. Upcoming holidays (next 90 days)
    const upcoming = getUpcomingHolidays(promoConfig||{}, 4);
    upcoming.forEach(h=>{
      out.push({
        type:"holiday",
        id:h.id,
        title:h.name,
        subtitle:`${h.discount}% off — ${h.daysUntil}d away`,
        emoji:h.emoji,
        theme:h.theme,
        urgencyColor:h.urgency==="urgent"?"#EF4444":h.urgency==="soon"?"#F59E0B":"#10B981",
        urgency:h.urgency==="urgent"?"This Week":h.urgency==="soon"?"Coming Soon":"Plan Ahead",
        cta:"View Deals",
        photo: listings[Math.floor(Math.random()*listings.length)]?.photos?.[0],
        listing:null,
        daysUntil:h.daysUntil,
      });
    });
    // 3. Per-listing discounts
    listings.filter(l=>l.discountPercent>0 && l.available).forEach(l=>{
      out.push({
        type:"listing",
        id:"listing_"+l.id,
        title: l.name,
        subtitle:`${l.discountPercent}% off${l.discountLabel?` · ${l.discountLabel}`:""}`,
        emoji:"🏷",
        theme:{ bg:"#1a1a2e", accent:C.primary, accent2:C.teal, text:"#fff" },
        urgency:"Special Deal",
        urgencyColor:C.primary,
        cta:"View Apartment",
        photo:l.photos?.[0],
        listing:l,
        daysUntil:null,
      });
    });
    return out;
  }, [promoConfig, listings, activeHoliday]);

  const go = useCallback((dir) => {
    setAnimDir(dir);
    setIdx(i=>(i+dir+slides.length)%slides.length);
  },[slides.length]);

  useEffect(()=>{
    if(paused||slides.length<=1) return;
    const iv = setInterval(()=>go(1), 5000);
    return ()=>clearInterval(iv);
  },[paused,go,slides.length]);

  if(slides.length===0) return null;

  const s = slides[idx];
  const t = s.theme;

  const handleCTA = () => {
    if(s.type==="listing" && s.listing) {
      onSelectListing(s.listing);
    } else if(s.type==="holiday" && activeHoliday && s.id.startsWith("active_")) {
      onNavigate("listings");
    } else {
      onNavigate("listings");
    }
  };

  return (
    <section style={{position:"relative",overflow:"hidden",background:C.cream,padding:"0"}}>
      {/* Section label */}
      <div style={{position:"absolute",top:"1.2rem",left:"1.5rem",zIndex:10,display:"flex",alignItems:"center",gap:"0.5rem"}}>
        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.primary,animation:"glowPulse 2s ease infinite"}}/>
        <span style={{fontSize:"0.6rem",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:600}}>Live Deals</span>
      </div>

      {/* Main slide */}
      <div key={s.id} style={{
        minHeight:"360px",
        background: s.photo
          ? `linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.4) 60%, transparent 100%), url(${s.photo}) center/cover no-repeat`
          : `linear-gradient(135deg, ${t.bg}, rgba(26,26,46,0.95))`,
        display:"flex",alignItems:"flex-end",
        animation:`fadeIn 0.5s ease`,
        position:"relative",
      }} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>

        {/* Animated gradient accent */}
        <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 80% 50%, ${t.accent}22 0%, transparent 65%)`,pointerEvents:"none"}}/>

        {/* Slide content */}
        <div style={{position:"relative",zIndex:2,padding:"2rem 1.5rem",width:"100%"}}>
          {/* Urgency badge */}
          <div style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.25rem 0.8rem",background:`${s.urgencyColor}22`,border:`1px solid ${s.urgencyColor}55`,borderRadius:"20px",marginBottom:"0.8rem"}}>
            <span style={{fontSize:"0.9rem"}}>{s.emoji}</span>
            <span style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:s.urgencyColor}}>{s.urgency}</span>
          </div>

          <h3 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(1.6rem,5vw,2.5rem)",color:"#fff",fontWeight:600,lineHeight:1.1,marginBottom:"0.4rem"}}>{s.title}</h3>
          <p style={{fontSize:"1rem",color:t.accent,fontWeight:600,marginBottom:"1.2rem"}}>{s.subtitle}</p>

          <div style={{display:"flex",gap:"0.7rem",alignItems:"center",flexWrap:"wrap"}}>
            <button onClick={handleCTA}
              style={{background:`linear-gradient(135deg,${t.accent},${t.accent2||t.accent})`,color:"#000",border:"none",padding:"0.75rem 1.6rem",borderRadius:"6px",fontWeight:700,fontSize:"0.82rem",letterSpacing:"0.1em",cursor:"pointer",boxShadow:`0 4px 16px ${t.accent}44`,transition:"all 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              {s.cta} →
            </button>
            {s.daysUntil>0 && (
              <span style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.6)"}}>
                {s.daysUntil} days until {s.title}
              </span>
            )}
          </div>
        </div>

        {/* Nav arrows */}
        {slides.length>1&&(
          <>
            <button onClick={()=>go(-1)} style={{position:"absolute",left:"0.8rem",top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.35)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"50%",width:"36px",height:"36px",color:"#fff",fontSize:"1.1rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:5,backdropFilter:"blur(6px)"}}>‹</button>
            <button onClick={()=>go(1)}  style={{position:"absolute",right:"0.8rem",top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.35)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"50%",width:"36px",height:"36px",color:"#fff",fontSize:"1.1rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:5,backdropFilter:"blur(6px)"}}>›</button>
          </>
        )}
      </div>

      {/* Dots */}
      {slides.length>1&&(
        <div style={{display:"flex",justifyContent:"center",gap:"6px",padding:"0.8rem",background:C.cream}}>
          {slides.map((_,i)=>(
            <button key={i} onClick={()=>{setAnimDir(i>idx?1:-1);setIdx(i);}} style={{width:i===idx?"20px":"6px",height:"6px",borderRadius:"3px",border:"none",background:i===idx?C.primary:"rgba(26,26,46,0.2)",cursor:"pointer",padding:0,transition:"all 0.3s ease"}}/>
          ))}
        </div>
      )}

      {/* Slide counter */}
      {slides.length>1&&(
        <div style={{position:"absolute",top:"1.2rem",right:"1.5rem",background:"rgba(0,0,0,0.4)",borderRadius:"10px",padding:"0.2rem 0.6rem",fontSize:"0.65rem",color:"rgba(255,255,255,0.7)",backdropFilter:"blur(4px)",zIndex:10}}>
          {idx+1}/{slides.length}
        </div>
      )}
    </section>
  );
}

// ─── REFERRAL POPUP ───────────────────────────────────────────────
function ReferralPopup({ onClose, onOpen }) {
  return createPortal(
    <div style={{position:"fixed",inset:0,zIndex:99990,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 1.5rem",animation:"fadeIn 0.3s ease"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#1A1A2E",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:"480px",padding:"1.8rem 1.5rem",animation:"slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:"0 -20px 60px rgba(0,0,0,0.4)",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:"1rem",right:"1rem",background:"rgba(255,255,255,0.1)",border:"none",borderRadius:"50%",width:"28px",height:"28px",color:"#fff",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>

        <div style={{display:"flex",gap:"1rem",alignItems:"flex-start",marginBottom:"1.2rem"}}>
          <div style={{width:"52px",height:"52px",borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",flexShrink:0,boxShadow:`0 0 20px rgba(255,107,107,0.3)`}}>💰</div>
          <div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:"#fff",marginBottom:"0.3rem"}}>Earn cash, just by sharing</div>
            <div style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.55)",lineHeight:1.6}}>Share {BRAND.fullName} with your network. Every booking through your link puts money directly into your M-Pesa.</div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem",marginBottom:"1.2rem"}}>
          {[{icon:"🔗",label:"Get a link"},{icon:"📲",label:"Share it"},{icon:"💳",label:"Get paid"}].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,0.06)",borderRadius:"8px",padding:"0.8rem 0.5rem",textAlign:"center"}}>
              <div style={{fontSize:"1.2rem",marginBottom:"0.3rem"}}>{s.icon}</div>
              <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.6)"}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:"0.6rem"}}>
          <button onClick={onClose} style={{flex:0,padding:"0.85rem 1.1rem",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"8px",color:"rgba(255,255,255,0.5)",fontSize:"0.78rem",cursor:"pointer"}}>Later</button>
          <button onClick={()=>{onClose();onOpen();}} style={{flex:1,padding:"0.85rem",background:`linear-gradient(135deg,${C.primary},${C.teal})`,border:"none",borderRadius:"8px",color:"#fff",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",letterSpacing:"0.08em",boxShadow:`0 4px 16px rgba(255,107,107,0.3)`}}>✨ Get My Referral Link</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function HomePage({ listings, onSelect, onNavigate, promoConfig, activeHoliday, onSelectWithHoliday, onOpenReferral, siteContent }) {
  const sc = siteContent || {};
  const heroBadge   = sc.heroBadge   || `${BRAND.city}'s Premier Short Stays`;
  const heroLine1   = sc.heroLine1   || "Live Like a";
  const heroLine2   = sc.heroLine2   || "Local Legend";
  const heroSubcopy = sc.heroSubcopy || `Handpicked apartments, studios and villas across ${BRAND.city}'s finest neighbourhoods.`;
  const upcoming = getUpcomingHolidays(promoConfig || {}, 6);
  return (
    <>
      <Hero listings={listings} onNavigate={onNavigate} heroBadge={heroBadge} heroLine1={heroLine1} heroLine2={heroLine2} heroSubcopy={heroSubcopy}/>
      {/* Discount Slideshow — shows holiday + listing deals */}
      <DiscountSlideshow
        promoConfig={promoConfig||{}}
        listings={listings}
        activeHoliday={activeHoliday}
        onNavigate={onNavigate}
        onSelectListing={onSelect}
        onSelectWithHoliday={onSelectWithHoliday}
      />
      {upcoming.length > 0 && <PromoTicker holidays={upcoming}/>}
      <section style={{padding:"4rem 1.5rem",background:"#FDFAF5"}}>
        <div style={{maxWidth:"1200px",margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
            <div style={{fontSize:"0.68rem",letterSpacing:"0.35em",textTransform:"uppercase",color:C.gold,marginBottom:"0.8rem"}}>Featured</div>
            <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(2rem,4vw,3rem)",color:C.cream,fontWeight:400}}>Handpicked <em style={{color:C.gold,fontStyle:"italic"}}>for you</em></h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:"1.8rem"}}>
            {listings.slice(0,3).map(l=><ListingCard key={l.id} listing={l} onClick={()=>activeHoliday&&onSelectWithHoliday?onSelectWithHoliday(l,activeHoliday):onSelect(l)} activeHoliday={activeHoliday}/>)}
          </div>
          <div style={{textAlign:"center",marginTop:"3rem"}}>
            <button onClick={()=>onNavigate("listings")} style={{background:"transparent",color:C.gold,border:`1px solid ${C.border}`,padding:"0.9rem 2.5rem",fontSize:"0.8rem",fontWeight:500,letterSpacing:"0.18em",textTransform:"uppercase",borderRadius:"2px",cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.target.style.borderColor=C.gold;e.target.style.background=C.goldDim;}} onMouseLeave={e=>{e.target.style.borderColor=C.border;e.target.style.background="transparent";}}>
              View All {listings.length} Listings →
            </button>
          </div>
        </div>
      </section>
      <ReferAndEarnSection onOpenDashboard={onOpenReferral}/>
      <UpcomingPromosSection promoConfig={promoConfig || {}} onNavigate={onNavigate} listings={listings} onSelectWithHoliday={onSelectWithHoliday}/>
      <section style={{padding:"4rem 1.5rem",background:"#F7F2EA"}}>
        <div style={{maxWidth:"1200px",margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
            <div style={{fontSize:"0.68rem",letterSpacing:"0.35em",textTransform:"uppercase",color:C.gold,marginBottom:"0.8rem"}}>Why Choose Us</div>
            <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"clamp(2rem,4vw,3rem)",color:C.cream,fontWeight:400}}>The {BRAND.name} <em style={{color:C.gold,fontStyle:"italic"}}>difference</em></h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,220px),1fr))",gap:"1rem"}}>
            {[{icon:"✦",title:"Curated Spaces",desc:"Every property is personally inspected and styled — no compromises."},{icon:"⚡",title:"Fast WiFi",desc:"Fibre connectivity guaranteed in every listing."},{icon:"🔑",title:"Flexible Check-in",desc:"Self check-in on all properties. Arrive on your terms."},{icon:"🛡",title:"24/7 Support",desc:"Always reachable. Issues resolved — not escalated."}].map(f=>(
              <div key={f.title} style={{padding:"2.2rem",background:"#fff",border:`1px solid ${C.border}`,borderRadius:"6px",transition:"all 0.2s",boxShadow:"0 2px 12px rgba(14,43,31,0.06)"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.boxShadow="0 8px 24px rgba(14,43,31,0.12)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="0 2px 12px rgba(14,43,31,0.06)";}}>
                <div style={{fontSize:"1.5rem",marginBottom:"1rem",color:C.gold}}>{f.icon}</div>
                <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.15rem",color:C.cream,marginBottom:"0.7rem",fontWeight:500}}>{f.title}</div>
                <div style={{fontSize:"0.85rem",color:C.muted,lineHeight:1.7,fontWeight:300}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────
// ─── ERROR BOUNDARY ───────────────────────────────────────────────
export class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
        <div style={{background:"#fff",borderRadius:"12px",padding:"2.5rem",maxWidth:"480px",textAlign:"center",boxShadow:"0 32px 80px rgba(0,0,0,0.4)"}}>
          <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>⚠️</div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.4rem",color:C.cream,marginBottom:"0.8rem"}}>Something went wrong</div>
          <div style={{fontSize:"0.83rem",color:"#666",lineHeight:1.7,marginBottom:"1.5rem"}}>
            The page ran into an unexpected error. This is usually caused by a data issue or a lost connection to the database. Refreshing usually fixes it.
          </div>
          <div style={{fontSize:"0.72rem",fontFamily:"monospace",background:"#F7F2EA",padding:"0.7rem 1rem",borderRadius:"5px",color:"#B00",marginBottom:"1.5rem",wordBreak:"break-all",textAlign:"left"}}>
            {this.state.error.message}
          </div>
          <button onClick={()=>window.location.reload()} style={{background:C.cream,color:"#F7F2EA",border:"none",padding:"0.8rem 2rem",borderRadius:"6px",fontSize:"0.85rem",fontWeight:600,cursor:"pointer"}}>Refresh Page</button>
        </div>
      </div>
    );
  }
}

export default function App() {
  const [showSplash,setShowSplash]=useState(true);
  const [splashConfig,setSplashConfig]=useState(null);
  const [page,setPage]=useState("home");
  const [listings,setListings]=useState(DEFAULT_LISTINGS);
  const [bookings,setBookings]=useState([]);
  const [selectedListing,setSelectedListing]=useState(null);
  const [loading,setLoading]=useState(true);
  const [showMyBookings,setShowMyBookings]=useState(false);
  const [promoConfig,setPromoConfig]=useState({});
  const [activeHoliday,setActiveHoliday]=useState(null);
  const [showHolidayPopup,setShowHolidayPopup]=useState(false);
  const [pendingHoliday,setPendingHoliday]=useState(null);
  const [showReferralPopup,setShowReferralPopup]=useState(false);
  const [siteContent,setSiteContent]=useState(DEFAULT_SITE_CONTENT);
  const [showConcierge,setShowConcierge]=useState(false);
  const [referrals,setReferrals]=useState({});
  const [commissionSettings,setCommissionSettings]=useState(DEFAULT_COMMISSION);
  const [showReferralDashboard,setShowReferralDashboard]=useState(false);
  const [pendingRefCode,setPendingRefCode]=useState(null); // captured from URL ?ref=
  const [supabaseError,setSupabaseError]=useState(null); // non-null = DB unreachable

  useEffect(()=>{
    // Test DB connection in parallel with data loading
    testSupabase().then(err => { if(err) setSupabaseError(err); });
    // Load splash config early so the screen shows the right text
    loadSplashConfig().then(cfg=>setSplashConfig(cfg));
    Promise.all([loadListings(),loadBookings(),loadPromos(),loadSiteContent(),loadReferrals(),loadCommissionSettings()]).then(([ls,bs,pc,sc,refs,cs])=>{
      setListings(ls); setBookings(bs); setPromoConfig(pc); setSiteContent(sc);
      setReferrals(refs); setCommissionSettings(cs); setLoading(false);
      // If ls === DEFAULT_LISTINGS (fresh deployment, nothing in Supabase yet),
      // save them so that subsequent edits/deletes persist correctly.
      if(ls === DEFAULT_LISTINGS) {
        saveListings(DEFAULT_LISTINGS).catch(()=>{});
      }
      const holiday = getActiveHoliday(pc);
      if(holiday){
        setActiveHoliday(holiday);
        const seen = sessionStorage.getItem(`${BRAND.slug}_promo_seen_`+holiday.id);
        if(!seen){ setTimeout(()=>setShowHolidayPopup(true),2500); }
      }
      // Referral popup — show after 45s, once per session, only if no holiday popup
      const referralSeen = sessionStorage.getItem(`${BRAND.slug}_referral_popup_seen`);
      if(!referralSeen){
        setTimeout(()=>{
          setShowReferralPopup(prev => prev ? prev : true);
          sessionStorage.setItem(`${BRAND.slug}_referral_popup_seen`,"1");
        }, 45000);
      }
      // Capture ?ref= from URL and store for use at booking time
      const urlRef = new URLSearchParams(window.location.search).get("ref");
      if(urlRef){ setPendingRefCode(urlRef); sessionStorage.setItem(`${BRAND.slug}_ref`,urlRef); }
      else {
        const stored = sessionStorage.getItem(`${BRAND.slug}_ref`);
        if(stored) setPendingRefCode(stored);
      }
    });
  },[]);

  const handlePromoSave = async(cfg) => {
    setPromoConfig(cfg);
    await savePromos(cfg);
    const holiday = getActiveHoliday(cfg);
    setActiveHoliday(holiday);
  };

  const handleSiteContentSave = async(sc) => {
    setSiteContent(sc);
    await saveSiteContent(sc);
  };

  const handleCommissionSave = async(cs) => {
    setCommissionSettings(cs);
    await saveCommissionSettings(cs);
  };
  const handleReferralsUpdate = async(refs) => {
    setReferrals(refs);
    await saveReferrals(refs);
  };

  const navigate=(p)=>{ setPage(p); window.scrollTo(0,0); };
  const selectListing=(l)=>{ setSelectedListing(l); setPage("listing"); window.scrollTo(0,0); };
  // Navigate to a listing AND pre-load a holiday discount into the booking widget
  const selectListingWithHoliday=(l, holiday)=>{
    setSelectedListing(l);
    setPendingHoliday(holiday);
    setPage("listing");
    window.scrollTo(0,0);
  };
  // Clear pendingHoliday once it's been consumed by ListingPage
  const consumePendingHoliday=()=>{ const h=pendingHoliday; setPendingHoliday(null); return h; };

  const handleListingUpdate=async(updated)=>{
    const updatedListings=listings.map(l=>l.id===updated.id?updated:l);
    setListings(updatedListings);
    await saveListings(updatedListings);
    if(selectedListing?.id===updated.id) setSelectedListing(updated);
  };

  const handleListingCreate=async(newListing)=>{
    const updatedListings=[...listings, newListing];
    setListings(updatedListings);
    await saveListings(updatedListings);
  };

  const handleListingDelete=async(id)=>{
    const updatedListings=listings.filter(l=>l.id!==id);
    setListings(updatedListings);
    await saveListings(updatedListings);
    if(selectedListing?.id===id) setSelectedListing(null);
  };

  const handleBalancePayment=async(updatedBooking)=>{
    // Called when a guest pays their deposit balance via MyBookingPage
    // Update the booking record: mark balance as cleared
    const newBookings = bookings.map(b=>
      b.ref===updatedBooking.ref ? {...b, balanceDue:0, isDeposit:false, total:updatedBooking.total} : b
    );
    setBookings(newBookings);
    await saveBookings(newBookings);
    // WhatsApp: let guest + host know the balance is cleared
    sendWhatsApp({ to: updatedBooking.phone, message: buildBalanceClearedGuestMessage(updatedBooking, updatedBooking.listing) });
    if (siteContent?.whatsapp) {
      sendWhatsApp({ to: siteContent.whatsapp, message: buildBalanceClearedHostMessage(updatedBooking, updatedBooking.listing) });
    }
  };

  const handleBookingMade=async(booking)=>{
    // Attach referral code if present
    const refCode = pendingRefCode || sessionStorage.getItem(`${BRAND.slug}_ref`);
    const bookingWithRef = refCode ? {...booking, referralCode:refCode} : booking;
    booking = bookingWithRef;

    // Credit commission to the referrer
    if(refCode){
      const refs = await loadReferrals();
      if(refs[refCode]){
        const commission = calcCommission(booking.total, commissionSettings);
        refs[refCode].totalEarned    = (refs[refCode].totalEarned||0) + commission;
        refs[refCode].pendingAmount  = (refs[refCode].pendingAmount||0) + commission;
        refs[refCode].bookingRefs    = [...(refs[refCode].bookingRefs||[]), booking.ref];
        await saveReferrals(refs);
        setReferrals(refs);
      }
    }
    // Add booked dates to the listing
    const nights=booking.nights;
    const newDates=[];
    let cur=booking.checkIn;
    for(let i=0;i<nights;i++){
      newDates.push(cur);
      cur=addDays(cur,1);
    }
    const updatedListings=listings.map(l=>
      l.id===booking.listing.id
        ? {...l,bookedDates:[...new Set([...l.bookedDates,...newDates])]}
        : l
    );
    setListings(updatedListings);
    await saveListings(updatedListings);
    // Update selected listing view
    if(selectedListing?.id===booking.listing.id){
      setSelectedListing(updatedListings.find(l=>l.id===booking.listing.id));
    }
    const newBookings=[...bookings,booking];
    setBookings(newBookings);
    await saveBookings(newBookings);
    setShowMyBookings(true);
    // WhatsApp: automatic confirmation + receipt to guest, notification + receipt to host.
    // Fire-and-forget — never blocks the booking flow if WhatsApp isn't configured yet.
    sendWhatsApp({ to: booking.phone, message: buildGuestConfirmationMessage(booking, booking.listing) });
    if (siteContent?.whatsapp) {
      sendWhatsApp({ to: siteContent.whatsapp, message: buildHostNewBookingMessage(booking, booking.listing) });
    }
    // Push notification to the admin/host device(s) — instant new-booking alert.
    sendPushNotification({
      role: "admin",
      title: "🎉 New booking on your site",
      message: `${booking.name || "A guest"} booked ${booking.listing?.name || "a listing"} — ${booking.checkIn} → ${booking.checkOut} · KES ${fmt(booking.total)}`,
      url: "/?admin=1",
      tag: "new-booking",
    });
  };

  if(loading) return (
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#FDFAF5"}}>
      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.5rem",color:C.sage,animation:"shimmer 1.2s ease infinite"}}>{BRAND.name}<em>{BRAND.nameAccent}</em></div>
    </div>
  );

  const handleHolidayClose = () => {
    setShowHolidayPopup(false);
    if(activeHoliday) sessionStorage.setItem(`${BRAND.slug}_promo_seen_`+activeHoliday.id,"1");
  };
  const handleHolidayBook = () => {
    setShowHolidayPopup(false);
    if(activeHoliday) sessionStorage.setItem(`${BRAND.slug}_promo_seen_`+activeHoliday.id,"1");
    // Go to first available listing with discount pre-applied
    const target = listings.find(l=>l.available);
    if(target) selectListingWithHoliday(target, activeHoliday);
    else navigate("listings");
  };

  return (
    <>
      <style>{GS}</style>
      {/* Splash screen — shown on first page load, skipped for admin */}
      {showSplash && page!=="admin" && (splashConfig?.enabled !== false) && (
        <SplashScreen config={splashConfig} onDone={()=>setShowSplash(false)} photos={listings.slice(0,5).map(l=>l.photos?.[0]).filter(Boolean)}/>
      )}
      <Nav onNavigate={navigate} listing={page==="listing"?selectedListing:null} siteContent={siteContent}/>
      {/* Supabase connectivity warning — only shown in admin */}
      {supabaseError && page==="admin" && (
        <div style={{position:"fixed",top:"64px",left:0,right:0,zIndex:800,background:"rgba(220,38,38,0.95)",backdropFilter:"blur(8px)",padding:"0.6rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.7rem"}}>
            <span style={{fontSize:"1rem"}}>⚠️</span>
            <div>
              <span style={{fontSize:"0.82rem",fontWeight:600,color:"#fff"}}>Database not saving — </span>
              <span style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.85)"}}>Supabase connection issue: {supabaseError}. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, and ensure the kv_store table exists.</span>
            </div>
          </div>
          <button onClick={()=>setSupabaseError(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",padding:"0.3rem 0.7rem",borderRadius:"4px",cursor:"pointer",fontSize:"0.78rem",flexShrink:0}}>Dismiss</button>
        </div>
      )}
      {page==="home"    &&<HomePage listings={listings} onSelect={selectListing} onNavigate={navigate} promoConfig={promoConfig} activeHoliday={activeHoliday} onSelectWithHoliday={selectListingWithHoliday} onOpenReferral={()=>setShowReferralDashboard(true)} siteContent={siteContent}/>}
      {page==="listings"&&<ListingsPage listings={listings} onSelect={selectListing} promoConfig={promoConfig} activeHoliday={activeHoliday} onSelectWithHoliday={selectListingWithHoliday}/>}
      {page==="listing" &&selectedListing&&<ListingPage listing={selectedListing} onBack={()=>navigate("listings")} onNavigate={navigate} onBookingMade={handleBookingMade} activeHoliday={pendingHoliday||activeHoliday} siteContent={siteContent}/>}
      {page==="about"   &&<AboutPage siteContent={siteContent}/>}
      {page==="contact" &&<ContactPage siteContent={siteContent}/>}
      {page==="mybooking"&&<MyBookingPage bookings={bookings} listings={listings} onBookingMade={handleBalancePayment}/>}
      {page==="refer"    &&<ReferPage commissionSettings={commissionSettings} onOpenDashboard={()=>setShowReferralDashboard(true)}/>}
      {page==="admin"   &&<AdminRoot listings={listings} bookings={bookings} onNavigate={navigate} onListingUpdate={handleListingUpdate} onListingCreate={handleListingCreate} onListingDelete={handleListingDelete} promoConfig={promoConfig} onPromoSave={handlePromoSave} siteContent={siteContent} onSiteContentSave={handleSiteContentSave} referrals={referrals} commissionSettings={commissionSettings} onCommissionSave={handleCommissionSave} onReferralsUpdate={handleReferralsUpdate}/>}
      {page!=="home"&&page!=="admin"&&<Footer onNavigate={navigate} onMyBookings={()=>setShowMyBookings(true)}/>}
      {page==="home"    &&<Footer onNavigate={navigate} onMyBookings={()=>setShowMyBookings(true)}/>}
      {showMyBookings&&<MyBookingsPanel bookings={bookings} onClose={()=>setShowMyBookings(false)}/>}
      {showHolidayPopup&&activeHoliday&&page!=="admin"&&(
        <HolidayPopup holiday={activeHoliday} onClose={handleHolidayClose} onBook={handleHolidayBook}/>
      )}
      {!showHolidayPopup&&activeHoliday&&page!=="admin"&&(
        <PromoBanner holiday={activeHoliday} onOpen={()=>setShowHolidayPopup(true)}/>
      )}
      {showReferralPopup&&!showHolidayPopup&&page==="home"&&(
        <ReferralPopup onClose={()=>setShowReferralPopup(false)} onOpen={()=>{setShowReferralPopup(false);setShowReferralDashboard(true);}}/>
      )}
      {page!=="admin"&&(
        <BridgeConcierge
          listing={page==="listing"?selectedListing:null}
          siteContent={siteContent}
        />
      )}
      {showReferralDashboard&&(
        <ReferralDashboard
          onClose={()=>setShowReferralDashboard(false)}
          commissionSettings={commissionSettings}
        />
      )}
    </>
  );
}
