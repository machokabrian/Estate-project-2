// ============================================================
//  SITE SETTINGS – edit this file, no other code needs changing
// ============================================================
const CONFIG = {
  name: "Senator Kondo Properties",
  siteUrl: "https://www.yourdomain.co.ke",   // your real domain (also update index.html, robots.txt, sitemap.xml)

  // --- Contact details (shown in the Contact section) ---
  whatsapp: "254716635052",                  // international format, no + or spaces
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
//  TEAM  – items marked `sample:true` show a "Sample" badge.
//  Replace them with real people and delete `sample:true`.
//  photo: path like "images/team-john.jpg" (optional)
//  Remove all items ( TEAM = [] ) to hide the section.
// ============================================================
const TEAM = [
  {name:"Your Name", role:"Founder & Lead Agent", phone:CONFIG.whatsapp, photo:"", bio:"Add a short bio: years of experience, areas you cover, what you specialise in.", sample:true},
  {name:"Team Member", role:"Sales Agent", phone:CONFIG.whatsapp, photo:"", bio:"Add a short bio for each person who deals with clients.", sample:true},
  {name:"Team Member", role:"Rentals & Property Management", phone:CONFIG.whatsapp, photo:"", bio:"Add a short bio for each person who deals with clients.", sample:true}
];

// ============================================================
//  TESTIMONIALS – only publish REAL client reviews.
//  Replace the samples (and delete `sample:true`). Remove all to hide the section.
// ============================================================
const TESTIMONIALS = [
  {name:"Sample Client", detail:"Bought a home", rating:5, text:"Replace this with a real review from one of your clients. Short, specific reviews build the most trust.", sample:true},
  {name:"Sample Client", detail:"Rented an apartment", rating:5, text:"Replace this with a real review from one of your clients. Mention what they bought or rented and how you helped.", sample:true},
  {name:"Sample Client", detail:"Bought land", rating:5, text:"Replace this with a real review from one of your clients. Ask happy clients to send you a message you can use.", sample:true}
];
