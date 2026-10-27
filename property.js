// ===== Client logic for the generated property pages (property/<id>-<name>/) =====
// The page itself is static HTML (so Google can read it). This script adds WhatsApp buttons and
// refreshes price / availability from the live database so a page is never out of date.
(function(){
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const B = document.body.dataset, SITE_BASE = B.site || "";
  const waNumber = n => { n = String(n).replace(/\D/g, ""); return n.startsWith("0") ? "254" + n.slice(1) : n; };
  const pageUrl = location.origin + location.pathname;
  const priceText = () => ($("#ppPrice") ? $("#ppPrice").textContent.trim() : "");
  const wa = (text, source) => {
    if(window.track) track("whatsapp_click", {source});
    const url = `https://wa.me/${waNumber(CONFIG.whatsapp)}?text=${encodeURIComponent(text)}`;
    const w = window.open(url, "_blank");
    if(w) w.opener = null; else location.href = url;        // pop-up blocked / in-app browser
  };
  if(window.track) track("view_listing_page", {id:B.id});

  document.addEventListener("click", e => {
    const t = e.target;
    if(t.closest("[data-enq]")) return wa(`Hello, I'm interested in "${B.title}" in ${B.loc} (${priceText()}).\n${pageUrl}`, "property_page");
    if(t.closest("[data-similar]")) return wa(`Hello, I saw "${B.title}" in ${B.loc} is no longer available. Do you have something similar?\n${pageUrl}`, "property_page");
    if(t.closest("[data-book]")){
      const dt = $("#bDate") && $("#bDate").value;
      if(window.track) track("book_viewing", {id:B.id});
      return wa(`Hello, I'd like to book a viewing of "${B.title}" in ${B.loc} (${priceText()}) on ${dt || "a date to be agreed"}.\n${pageUrl}`, "viewing");
    }
    if(t.closest("[data-call]") && window.track) track("call_click");
    const s = t.closest("[data-share]");
    if(s){
      if(navigator.share) navigator.share({title:B.title, text:`${B.title} – ${B.loc}`, url:pageUrl}).catch(() => {});
      else if(navigator.clipboard) navigator.clipboard.writeText(pageUrl).then(() => { s.textContent = "Link copied ✓"; }).catch(() => { window.prompt("Copy this link:", pageUrl); });
      else window.prompt("Copy this link:", pageUrl);
    }
    if(t.closest("[data-privacy]")){ e.preventDefault(); location.href = SITE_BASE + "/#privacy"; }
  });
  const today = new Date().toISOString().slice(0, 10);
  if($("#bDate")) $("#bDate").min = today;

  // Keep price / availability live
  (async function refresh(){
    if(typeof DB === "undefined" || !DB.configured()) return;
    try{
      const [rows, settings] = await Promise.all([DB.getPublic(B.id), DB.settings.get().catch(() => ({}))]);
      if(settings.whatsapp) CONFIG.whatsapp = settings.whatsapp;
      if(settings.whatsapp || settings.phone) $$("[data-call]").forEach(a => a.href = "tel:+" + waNumber(CONFIG.whatsapp));
      if(!rows.length){                                         // unpublished or deleted since the page was built
        $("#ppGone").hidden = false; $("#ppAvail").hidden = true; $("#ppSold").hidden = true;
        $$(".pbar").forEach(x => x.hidden = true); return;
      }
      const p = rows[0], avail = p.status === "available";
      const price = "KSh " + Number(p.price).toLocaleString("en-US") + (p.purpose === "Rent" ? " /mo" : "");
      $("#ppPrice").textContent = price;
      const tag = $("#ppStatus"); tag.classList.toggle("off", !avail);
      tag.textContent = avail ? "For " + p.purpose : ({reserved:"Reserved", sold:"Sold", let:"Let"}[p.status] || p.status);
      $("#ppAvail").hidden = !avail; $("#ppSold").hidden = avail;
      $$(".pbar").forEach(x => x.hidden = !avail);
    }catch(e){ /* keep the static page as is */ }
  })();
})();
