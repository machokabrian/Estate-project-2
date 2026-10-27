// ===== Forms (WhatsApp + email backup), List Property, Team, Reviews, Contact info =====
// Loaded last, so it can use everything from config.js, script.js and details.js.

// Sends a copy of a form to your email through the form provider set in config.js (Formspree).
async function sendEmail(subject, data){
  if(!CONFIG.formEndpoint) return false;
  try{
    const r = await fetch(CONFIG.formEndpoint, {
      method:"POST",
      headers:{"Content-Type":"application/json", "Accept":"application/json"},
      keepalive:true,
      body:JSON.stringify({_subject:subject, ...data})
    });
    return r.ok;
  }catch(e){ return false; }
}

// ----- Contact form -----
$("cf").onsubmit = e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  if(d.website) return;                       // spam trap: bots fill this hidden field
  delete d.website;
  const msg = `Hello, I'm ${d.name} (${d.phone}). Interested in: ${d.interest}.${d.msg ? "\n" + d.msg : ""}`;
  wa(msg, "contact");                          // opens WhatsApp straight away
  track("enquiry_form", {interest:d.interest});
  const note = $("cfMsg");
  note.textContent = CONFIG.formEndpoint ? "Opening WhatsApp… sending a copy by email." : "Opening WhatsApp…";
  sendEmail(`New enquiry from ${d.name}`, d).then(ok => {
    note.textContent = ok ? "Thank you! Your enquiry was sent and WhatsApp is open." : "Thank you! Please send the WhatsApp message to complete your enquiry.";
  });
  e.target.reset();
};

// ----- "List your property" form -----
function openListForm(){
  showModal(`<div class="mi">
   <h2 id="mT" style="font-size:28px">List Your Property</h2>
   <p class="meta">Tell us about your property and we'll contact you to arrange photos and a viewing.</p>
   <form id="lf" class="lf">
     <input name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
     <div class="two"><input name="name" placeholder="Your full name" required maxlength="100"><input name="phone" type="tel" placeholder="Phone e.g. 0712 345 678" required maxlength="25"></div>
     <input name="email" type="email" placeholder="Email (optional)" maxlength="120">
     <div class="two">
       <select name="purpose" required><option value="">Selling or renting out?</option><option>Sell</option><option>Rent out</option></select>
       <select name="type" required><option value="">Property type</option><option>House</option><option>Apartment</option><option>Land</option><option>Commercial</option></select>
     </div>
     <div class="two"><input name="loc" placeholder="Location e.g. Karen, Nairobi" required maxlength="120"><input name="price" placeholder="Asking price (KSh)" inputmode="numeric" maxlength="20"></div>
     <div class="two"><input name="beds" type="number" min="0" max="20" placeholder="Bedrooms (if any)"><input name="size" placeholder="Size e.g. 0.25 acre / 120 m²" maxlength="60"></div>
     <textarea name="desc" rows="3" placeholder="Describe the property, its features and condition" maxlength="800"></textarea>
     <input name="photos" type="url" placeholder="Link to photos (Google Drive, Dropbox…) – optional" maxlength="300">
     <label class="chk"><input type="checkbox" name="agree" required> I'm the owner or authorised to list this property, and I agree my details may be used to contact me about it (see the Privacy Policy in the footer).</label>
     <button class="btn">Send listing request</button>
   </form></div>`);
  $("lf").onsubmit = ev => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target));
    if(d.website) return;
    delete d.website; delete d.agree;
    const msg = `Hello, I'd like to list a property.\nName: ${d.name} (${d.phone})\nGoal: ${d.purpose}\nType: ${d.type}\nLocation: ${d.loc}` +
      (d.price ? `\nPrice: KSh ${d.price}` : "") + (d.beds ? `\nBedrooms: ${d.beds}` : "") + (d.size ? `\nSize: ${d.size}` : "") +
      (d.desc ? `\nDetails: ${d.desc}` : "") + (d.photos ? `\nPhotos: ${d.photos}` : "");
    wa(msg, "list_property");
    track("list_property", {type:d.type, purpose:d.purpose});
    mBody.innerHTML = `<div class="mi" style="text-align:center">
      <h2 id="mT" style="font-size:28px">Thank you, ${esc(d.name.split(" ")[0])}!</h2>
      <p style="margin:12px 0">WhatsApp should have opened with your details. <b>Please send your property photos in that chat.</b></p>
      <p class="meta" id="lfNote">${CONFIG.formEndpoint ? "Sending a copy by email…" : ""}</p>
      <div class="macts" style="justify-content:center;margin-top:16px"><button class="btn" id="lfAgain" type="button">${WAI}Open WhatsApp again</button><button class="btn outline" id="lfClose" type="button">Close</button></div></div>`;
    $("lfAgain").onclick = () => wa(msg, "list_property");
    $("lfClose").onclick = closeModal;
    sendEmail(`New listing request: ${d.type} in ${d.loc}`, d).then(ok => {
      if(CONFIG.formEndpoint && $("lfNote")) $("lfNote").textContent = ok ? "A copy was also emailed to our team ✓" : "";
    });
  };
}
$("listBtn").onclick = () => { $("nav").classList.remove("open"); openListForm(); };

// ----- Team & testimonials (from your database; config.js lists are only a fallback) -----
let teamList = TEAM.slice(), reviewList = TESTIMONIALS.slice();
const navLink = id => document.querySelector(`nav a[href="#${id}"]`);

function renderTeam(){
  const empty = !teamList.length;
  $("team").hidden = empty; if(navLink("team")) navLink("team").hidden = empty;
  if(empty) return;
  $("teamGrid").innerHTML = teamList.map((m,i) => {
    const ini = m.name.split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
    return `<article class="tm">${m.sample ? '<span class="sample">Sample</span>' : ""}
      ${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy">` : `<div class="av" aria-hidden="true">${esc(ini)}</div>`}
      <h3>${esc(m.name)}</h3><div class="role">${esc(m.role || "")}</div>
      ${m.bio ? `<p>${esc(m.bio)}</p>` : ""}
      ${m.phone ? `<button class="btn" data-tw="${i}">${WAI}WhatsApp</button>` : ""}</article>`;
  }).join("");
}
$("teamGrid").onclick = e => {
  const b = e.target.closest("[data-tw]"); if(!b) return;
  const m = teamList[+b.dataset.tw];
  wa(`Hello ${m.name.split(" ")[0]}, I found you on the ${CONFIG.name} website.`, "team", String(m.phone).replace(/\D/g,""));
};

function renderReviews(){
  const empty = !reviewList.length;
  $("reviews").hidden = empty; if(navLink("reviews")) navLink("reviews").hidden = empty;
  if(empty) return;
  $("revGrid").innerHTML = reviewList.map(r => `<article class="rev">${r.sample ? '<span class="sample">Sample</span>' : ""}
    <div class="stars" aria-label="${r.rating || 5} out of 5 stars">${"★".repeat(r.rating || 5)}${"☆".repeat(5 - (r.rating || 5))}</div>
    <p>“${esc(r.text)}”</p><b>${esc(r.name)}</b><small>${esc(r.detail || "")}</small></article>`).join("");
}

async function loadPeople(){
  if(!DB.configured()) return;
  try{
    const [t, r] = await Promise.all([DB.team.listPublic(), DB.reviews.listPublic()]);
    teamList = t.map(m => ({name:m.name, role:m.role, phone:m.phone, photo:m.photo, bio:m.bio}));
    reviewList = r.map(x => ({name:x.name, detail:x.detail, rating:x.rating, text:x.quote}));
    renderTeam(); renderReviews();
  }catch(err){ console.warn("Could not load team/reviews:", err); }
}

// ----- Contact details (from config.js) -----
function renderContact(){
  const rows = [`<b>Phone / WhatsApp:</b> <a href="tel:+${waNumber(CONFIG.whatsapp)}">${esc(CONFIG.phone)}</a>`];
  if(CONFIG.email) rows.push(`<b>Email:</b> <a href="mailto:${esc(CONFIG.email)}">${esc(CONFIG.email)}</a>`);
  if(CONFIG.address) rows.push(`<b>Office:</b> ${esc(CONFIG.address)}`);
  if(CONFIG.hours) rows.push(`<b>Hours:</b> ${esc(CONFIG.hours)}`);
  rows.push(`<b>Service area:</b> ${esc(CONFIG.serviceArea)}`);
  const names = {facebook:"Facebook", instagram:"Instagram", tiktok:"TikTok", x:"X", youtube:"YouTube"};
  const soc = Object.entries(CONFIG.socials || {}).filter(([,u]) => u)
    .map(([k,u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${names[k] || k}</a>`).join("");
  $("contactInfo").innerHTML = rows.join("<br>") +
    (soc ? `<div class="soc">${soc}</div>` : "") +
    (CONFIG.address ? `<iframe class="mmap" loading="lazy" style="margin-top:14px" title="Our office location" src="https://www.google.com/maps?q=${encodeURIComponent(CONFIG.address + ", Kenya")}&output=embed"></iframe>` : "");
}

// ----- Business info for Google (structured data built from config.js) -----
function injectSchema(){
  const o = {"@context":"https://schema.org", "@type":"RealEstateAgent", name:CONFIG.name, url:CONFIG.siteUrl + "/",
    telephone:"+" + waNumber(CONFIG.whatsapp), areaServed:{"@type":"Country", name:"Kenya"}, priceRange:"KSh"};
  if(CONFIG.email) o.email = CONFIG.email;
  if(CONFIG.address) o.address = {"@type":"PostalAddress", streetAddress:CONFIG.address, addressCountry:"KE"};
  const same = Object.values(CONFIG.socials || {}).filter(Boolean); if(same.length) o.sameAs = same;
  const old = document.getElementById("ld"); if(old) old.remove();
  const s = document.createElement("script"); s.id = "ld"; s.type = "application/ld+json"; s.textContent = JSON.stringify(o);
  document.head.appendChild(s);
}

// ----- Site settings from your database (contact details, About text, photos) -----
function applySettings(s){
  s = s || {};
  for(const k of ["phone","whatsapp","email","address","hours"]) if(s[k]) CONFIG[k] = s[k];
  if(s.helper_whatsapp) CONFIG.helperWhatsapp = s.helper_whatsapp;
  CONFIG.socials = {...CONFIG.socials, ...Object.fromEntries(Object.entries(s.socials || {}).filter(([,u]) => u))};
  fab.href = waUrl(`Hello ${CONFIG.name}, I'd like to enquire about a property.`);
  if(s.about_text){ $("aboutText").textContent = s.about_text; $("aboutText").style.whiteSpace = "pre-line"; }
  const hero = document.querySelector(".hero");
  if(s.hero_image) hero.style.backgroundImage = `linear-gradient(100deg,rgba(18,12,9,.92) 15%,rgba(18,12,9,.4)),url('${String(s.hero_image).replace(/'/g,"%27")}')`;
  $("aboutImg").hidden = !s.about_image; if(s.about_image) $("aboutImg").src = s.about_image;
  document.querySelector(".about").classList.toggle("noimg", !s.about_image);
  catImages = {House:s.cat_house, Apartment:s.cat_apartment, Land:s.cat_land, Commercial:s.cat_commercial}; renderCats();
  renderContact(); injectSchema();
}
async function loadSettings(){
  try{ applySettings(JSON.parse(localStorage.getItem("sk_settings_cache") || "null")); }catch(err){}   // last known, shown instantly
  if(!DB.configured()) return;
  try{
    const s = await DB.settings.get();
    applySettings(s);
    try{ localStorage.setItem("sk_settings_cache", JSON.stringify(s)); }catch(err){}
  }catch(err){ console.warn("Could not load site settings:", err); }
}

renderTeam(); renderReviews(); renderContact(); injectSchema(); applySettings(null); loadSettings(); loadPeople();
