// ============================================================
//  SITE SETTINGS – edit this file, no other code needs changing
// ============================================================
const CONFIG = {
  name: "Senator Kondo Properties",
  siteUrl: "https://estateproject2.vercel.app",   // your live address. When you add a custom domain later, change it here (the build updates everything else)

  // --- Contact details (shown in the Contact section) ---
  whatsapp: "254716635052",                  // international format, no + or spaces
  // The assistant's "Talk to an agent" / "Continue on WhatsApp" buttons open THIS number.
  // Write it as 0110922252 or 254110922252, both work. Use the main number above to send everything to one place.
  helperWhatsapp: "0110922252",
  phone: "0716 635 052",
  email: "",                                 // e.g. "info@yourdomain.co.ke"  (hidden until you fill it in)
  address: "",                               // e.g. "Kenyatta Avenue, Nakuru"  (adds a map + Google business info)
  hours: "",                                 // e.g. "Mon–Sat, 8:00am – 6:00pm"
  serviceArea: "Kenya",
  socials: {                                 // paste full links; empty ones are hidden
    facebook: "",
    instagram: "",
    tiktok: "",
    x: "",
    youtube: ""
  },

  // --- Listings database (Supabase) – see SETUP.md ---
  // Your properties are stored in your own Supabase project and managed from /admin.html.
  supabaseUrl: "",                           // e.g. "https://abcdefgh.supabase.co"
  supabaseKey: "",                           // the public "anon" / "publishable" key (safe to publish)
  imageBucket: "listing-images",             // leave as is unless you renamed the bucket

  // --- AI chat assistant (optional) ---
  // Paste the URL of your deployed ai-worker here (see ai-worker/README.md), e.g. "https://sk-assistant.yourname.workers.dev"
  // Leave empty to use the built-in keyword assistant.
  aiEndpoint: "",

  // --- Email backup for forms ---
  // 1) Create a free form at https://formspree.io  2) paste its URL here, e.g. "https://formspree.io/f/abcdwxyz"
  // Every enquiry / listing request is then ALSO emailed to you. Leave empty to use WhatsApp only.
  formEndpoint: "",

  // --- Analytics (leave empty to disable) ---
  analytics: {
    plausibleDomain: "",   // e.g. "yourdomain.co.ke"  (privacy-friendly, no cookies)
    ga4: "",               // e.g. "G-XXXXXXXXXX"      (loads only after visitor accepts cookies)
    metaPixel: ""          // e.g. "123456789012345"   (loads only after visitor accepts cookies)
  }
};

// ============================================================
//  TEAM – the section stays hidden until you add real people.
//  Example (copy, fill in, remove the // marks):
//    {name:"Full Name", role:"Principal Agent", phone:"254700000000", photo:"images/name.jpg", bio:"Short bio."},
//  photo is optional; phone adds a WhatsApp button for that person.
// ============================================================
const TEAM = [
];

// ============================================================
//  TESTIMONIALS – the section stays hidden until you add real client reviews.
//  Only publish genuine reviews you have permission to use. Example:
//    {name:"Client Name", detail:"Bought a home in Karen", rating:5, text:"What the client said."},
// ============================================================
const TESTIMONIALS = [
];
