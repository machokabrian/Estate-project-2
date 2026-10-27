// ============================================================
//  SITE SETTINGS – Lemways Nest Ltd
//  edit this file, no other code needs changing
// ============================================================
const CONFIG = {
  name: "Lemways Nest Ltd",
  siteUrl: "https://lemwaysnest.co.ke",   // your live domain

  // --- Contact details (shown in the Contact section) ---
  whatsapp: "254716635052",                  // main WhatsApp – international format, no + or spaces
  helperWhatsapp: "0110922252",
  phone: "0716 635 052",
  email: "",                                 // e.g. "info@lemwaysnest.co.ke"  (hidden until you fill it in)
  address: "",                               // e.g. "Muthaiga, Nairobi"  (adds a map + Google business info)
  hours: "",                                 // e.g. "Mon–Sat, 8:00am – 6:00pm"
  serviceArea: "Kenya",
  socials: {                                 // paste full links; empty ones are hidden
    facebook: "",
    instagram: "",
    tiktok: "",
    x: "",
    youtube: ""
  },

  // --- Listings database (Supabase) – properties still stored in Supabase ---
  supabaseUrl: "https://yiahqsgyullwjirpdobq.supabase.co",
  supabaseKey: "sb_publishable_zh6qNRqkfwBgRw87lWVpww_tYjS2IqN",   // public key, safe to publish
  imageBucket: "listing-images",             // you can leave this, but we will now use Cloudinary

  // --- Cloudinary – Property Photos (NEW - CONNECTED) ---
  cloudinaryCloudName: "nedm27tp",
  cloudinaryUploadPreset: "lemways_nest",
  cloudinaryFolder: "lemways_nest",
  // Use this URL to upload: https://api.cloudinary.com/v1_1/nedm27tp/image/upload

  // --- AI chat assistant (optional) ---
  aiEndpoint: "",

  // --- Email backup for forms ---
  formEndpoint: "",

  // --- Analytics (leave empty to disable) ---
  analytics: {
    plausibleDomain: "lemwaysnest.co.ke",
    ga4: "",
    metaPixel: ""
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