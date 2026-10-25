// ===== Shared modal, listing details & privacy policy =====
// Loaded after script.js, so it can use DATA, IMG, favs, wa, ksh, esc, WAI, render, saveFavs.

// Default photo sets by type, used only when a listing has no photos of its own
const GAL = {
  House:[IMG.House, "photo-1600607687939-ce8a6c25118c"],
  Apartment:[IMG.Apartment, "photo-1600607687939-ce8a6c25118c"],
  Land:[IMG.Land],
  Commercial:[IMG.Commercial]
};

const modal = $("modal"), mBody = $("mBody"), baseTitle = document.title;
let G = {imgs:[], i:0}, lastFocus = null;

function showModal(html){
  if(modal.hidden) lastFocus = document.activeElement;
  mBody.innerHTML = html;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  modal.scrollTop = 0;
  $("mX").focus();
}
function closeModal(){
  modal.hidden = true; mBody.innerHTML = "";
  document.body.style.overflow = "";
  document.title = baseTitle;
  if(/^#listing-/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  lastFocus && lastFocus.focus && lastFocus.focus();
}
function setGal(i){
  G.i = (i + G.imgs.length) % G.imgs.length;
  $("gMain").src = imgSrc(G.imgs[G.i]);
  document.querySelectorAll(".thumbs img").forEach((t,k) => t.classList.toggle("on", k === G.i));
}

function openListing(id){
  const p = DATA.find(x => x.id === id); if(!p) return;
  G = {imgs: p.imgs.length ? p.imgs : (GAL[p.type] || [IMG[p.type]]), i:0};
  const multi = G.imgs.length > 1, avail = p.status === "available";
  const today = new Date().toISOString().slice(0,10);
  track("view_listing", {id:p.id, title:p.title});
  showModal(`
   <div class="gal"><img id="gMain" src="${imgSrc(G.imgs[0])}" alt="${esc(p.title)} in ${esc(p.loc)}">${multi ? '<button class="gnav gp" data-gp aria-label="Previous photo">‹</button><button class="gnav gn" data-gn aria-label="Next photo">›</button>' : ""}</div>
   ${multi ? `<div class="thumbs">${G.imgs.map((k,j) => `<img src="${imgSrc(k)}" alt="Photo ${j+1}" data-g="${j}" class="${j ? "" : "on"}">`).join("")}</div>` : ""}
   <div class="mi">
     <span class="tag${avail ? "" : " off"}" style="position:static;display:inline-block">${avail ? "For " + p.purpose : (STATUS[p.status] || esc(p.status))}</span>
     <div class="price" style="margin-top:8px">${ksh(p.price)}${p.purpose === "Rent" ? " /mo" : ""}</div>
     <h2 id="mT" style="font-size:28px">${esc(p.title)}</h2>
     <div class="meta">📍 ${esc(p.loc)}</div>
     <div class="chips"><span>${p.type}</span>${p.beds ? `<span>${p.beds} bedroom${p.beds > 1 ? "s" : ""}</span>` : ""}${p.size ? `<span>${esc(p.size)}</span>` : ""}</div>
     ${p.desc ? `<h3>About this property</h3><p>${esc(p.desc)}</p>` : ""}
     ${p.amenities.length ? `<h3>Features</h3><ul class="amen">${p.amenities.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
     <h3>Location</h3>
     <iframe class="mmap" loading="lazy" title="Map of ${esc(p.loc)}" src="https://www.google.com/maps?q=${encodeURIComponent(p.loc + ", Kenya")}&output=embed"></iframe>
     ${avail
       ? `<div class="book"><b>Book a viewing</b><input type="date" id="bDate" min="${today}" aria-label="Preferred viewing date"><button class="btn" data-book="${p.id}">${WAI}Book via WhatsApp</button></div>`
       : `<div class="book"><span>This property is no longer available. Ask us about similar properties.</span></div>`}
     <div class="macts"><button class="btn" data-ask="${p.id}">${WAI}${avail ? "Enquire on WhatsApp" : "Find similar"}</button><a class="btn outline" href="tel:+${waNumber(CONFIG.whatsapp)}" data-call>📞 Call</a><button class="btn outline" data-share="${p.id}">Share</button><button class="btn outline" data-save="${p.id}">${favs.includes(p.id) ? "♥ Saved" : "♡ Save"}</button></div>
   </div>`);
  document.title = `${p.title} – ${p.loc} | ${CONFIG.name}`;
  history.replaceState(null, "", "#listing-" + id);
}

modal.addEventListener("click", e => {
  const t = e.target, q = s => t.closest(s);
  if(t === modal || q("#mX")) return closeModal();
  if(q("[data-gp]")) return setGal(G.i - 1);
  if(q("[data-gn]")) return setGal(G.i + 1);
  const g = q("[data-g]"); if(g) return setGal(+g.dataset.g);
  if(q("[data-call]")){ track("call_click"); return; }
  const find = k => DATA.find(x => x.id === +k);
  const b = q("[data-book]");
  if(b){ const p = find(b.dataset.book), dt = $("bDate").value;
    track("book_viewing", {id:p.id});
    return wa(`Hello, I'd like to book a viewing of "${p.title}" in ${p.loc} (${ksh(p.price)}) on ${dt || "a date to be agreed"}.\n${listingUrl(p)}`, "viewing"); }
  const a = q("[data-ask]");
  if(a){ const p = find(a.dataset.ask);
    return wa(p.status === "available"
      ? `Hello, I'm interested in "${p.title}" in ${p.loc} (${ksh(p.price)}).\n${listingUrl(p)}`
      : `Hello, I saw "${p.title}" in ${p.loc} is no longer available. Do you have something similar?`, "details"); }
  const s = q("[data-share]");
  if(s){ const p = find(s.dataset.share), url = location.href;
    if(navigator.share) navigator.share({title:p.title, text:`${p.title} – ${p.loc}`, url}).catch(() => {});
    else if(navigator.clipboard) navigator.clipboard.writeText(url).then(() => { s.textContent = "Link copied ✓"; });
    return; }
  const f = q("[data-save]");
  if(f){ const id = +f.dataset.save;
    favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
    saveFavs(); render(); f.textContent = favs.includes(id) ? "♥ Saved" : "♡ Save"; }
});

document.addEventListener("keydown", e => {
  if(modal.hidden) return;
  if(e.key === "Escape") closeModal();
  if(G.imgs.length > 1 && $("gMain")){
    if(e.key === "ArrowLeft") setGal(G.i - 1);
    if(e.key === "ArrowRight") setGal(G.i + 1);
  }
});

// Open a listing from a shared link like yoursite.com/#listing-3
function openFromHash(){
  const m = location.hash.match(/^#listing-(\d+)$/);
  if(m) openListing(+m[1]);
}
addEventListener("hashchange", openFromHash);
openFromHash();

// ===== Privacy policy (built from config.js) =====
// Draft only: have a lawyer review it and add your registered business details.
function privacyHtml(){
  const A = CONFIG.analytics || {};
  const contact = `<a href="tel:+${CONFIG.whatsapp}">${esc(CONFIG.phone)}</a>` + (CONFIG.email ? ` or <a href="mailto:${esc(CONFIG.email)}">${esc(CONFIG.email)}</a>` : "");
  return `<div class="mi pol">
  <h2 id="mT" style="font-size:28px">Privacy Policy</h2>
  <p><small>Last updated: ${new Date().toLocaleDateString("en-GB", {year:"numeric", month:"long", day:"numeric"})}</small></p>
  <p>${esc(CONFIG.name)} ("we") respects your privacy and handles personal data in line with the Kenya Data Protection Act, 2019.</p>
  <h3>What we collect</h3>
  <ul>
    <li>Details you enter in our enquiry and "List your property" forms (name, phone, email, property details, message).</li>
    <li>Messages you send in the website chat assistant, if you choose to continue to WhatsApp.</li>
    <li>Your saved favourites, stored only in your own browser.</li>
    ${A.plausibleDomain ? "<li>Anonymous visit statistics (pages viewed, device type, country) from Plausible Analytics, which uses no cookies and does not identify you.</li>" : ""}
    ${(A.ga4 || A.metaPixel) ? `<li>If you accept cookies: usage data through ${[A.ga4 && "Google Analytics", A.metaPixel && "Meta Pixel"].filter(Boolean).join(" and ")}, used to understand how the site is used${A.metaPixel ? " and to measure our advertising" : ""}.</li>` : ""}
  </ul>
  <h3>How we use it</h3>
  <p>To respond to your enquiry, arrange viewings, share suitable properties and, if you ask, list your property. We do not sell your data.</p>
  <h3>Third parties</h3>
  <p>When you tap a WhatsApp button, your message is handled by WhatsApp (Meta) under its own privacy policy.${CONFIG.formEndpoint ? " Form submissions are also emailed to us through our form-processing provider." : ""} This site also loads fonts from Google Fonts, images from Unsplash and maps from Google Maps, which may receive your IP address.</p>
  <h3>Your rights</h3>
  <p>You may ask to access, correct or delete your personal data, or object to its use. Contact us on ${contact}. You may also complain to the Office of the Data Protection Commissioner (Kenya).</p>
  <h3>Cookies and storage</h3>
  <p>${(A.ga4 || A.metaPixel) ? "Analytics and advertising cookies are used only if you accept them, and you can change your choice at any time using “Cookie settings” in the footer. " : "We do not use tracking cookies. "}We store your favourites and your cookie choice in your browser's local storage. You can clear them at any time in your browser settings.</p>
</div>`;
}
document.addEventListener("click", e => {
  if(e.target.closest("[data-privacy]")){ e.preventDefault(); showModal(privacyHtml()); }
});
