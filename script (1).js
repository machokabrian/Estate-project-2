const WHATSAPP = CONFIG.whatsapp;
const $ = id => document.getElementById(id);
const WAI = '<svg class="wai" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
const IMG = {House:1, Apartment:1, Land:1, Commercial:1};      // property types (used for the category tiles)
const STATUS = {reserved:"Reserved", sold:"Sold", let:"Let"};

// A photo can be an image path ("images/karen-1.jpg"), a full URL, or an Unsplash photo ID
const imgSrc = k => !k ? "" : /[./]/.test(k) ? String(k).replace(/'/g,"%27") : `https://images.unsplash.com/${k}?auto=format&fit=crop&w=1000&q=80`;
const cover = p => p.imgs.length ? imgSrc(p.imgs[0]) : "";     // "" = no photo yet (a neutral placeholder is shown, never a stock photo)
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// Listings are loaded from your database (see db.js and SETUP.md), managed from admin.html
const DATA = [];
let loadState = "loading";                 // loading | ok | error
let LOCS = [];
const fromRow = r => ({
  id:r.id, title:r.title||"", type:r.type, purpose:r.purpose, status:r.status||"available", loc:r.loc||"",
  price:+r.price||0, beds:+r.beds||0, size:r.size||"", desc:r.description||"",
  amenities:Array.isArray(r.amenities) ? r.amenities : [], imgs:(Array.isArray(r.images) ? r.images : []).filter(Boolean),
  featured:+!!r.featured
});
function setData(rows){
  DATA.length = 0; DATA.push(...rows.map(fromRow));
  LOCS = [...new Set(DATA.flatMap(p => p.loc.toLowerCase().split(/[, ]+/)).filter(w => w.length > 3 && w !== "town"))];
}

const S = {purpose:"", type:"", beds:0, max:0, loc:"", sort:"feat", shown:6, favOnly:false};
let favs = [];
try { favs = JSON.parse(localStorage.getItem("favs")||"[]"); } catch(e){}
const saveFavs = () => { try{ localStorage.setItem("favs", JSON.stringify(favs)); }catch(e){} };
const ksh = n => "KSh " + Number(n).toLocaleString();

function filtered(){
  let r = DATA.filter(p =>
    (!S.purpose || p.purpose===S.purpose) && (!S.type || p.type===S.type) &&
    p.beds >= S.beds && (!S.max || p.price<=S.max) &&
    (!S.loc || S.loc.toLowerCase().split(/\s+/).every(w =>
      (p.title+" "+p.loc+" "+p.type+" "+p.purpose+(p.purpose==="Sale"?" buy":"")).toLowerCase().includes(w))) &&
    (!S.favOnly || favs.includes(p.id)));
  const sorts = {low:(a,b)=>a.price-b.price, high:(a,b)=>b.price-a.price, new:(a,b)=>b.id-a.id, feat:(a,b)=>b.featured-a.featured||a.id-b.id};
  r.sort(sorts[S.sort]);
  // sold / let / reserved properties always go to the end
  return [...r.filter(p => p.status==="available"), ...r.filter(p => p.status!=="available")];
}

function emptyHtml(){
  const chat = `<button class="btn" type="button" data-wa>${WAI}Message us on WhatsApp</button>`;
  if(loadState === "error") return `We couldn't load our properties right now. Please refresh the page, or message us and we'll help you directly.<br><br>${chat}`;
  if(!DATA.length) return `New properties are being added. Message us and we'll share what's currently available.<br><br>${chat}`;
  return `No properties found. Try changing your search or filters.<br><br><button class="btn" type="button" data-reset>Show all properties</button>`;
}

function render(){
  $("fPurpose").value = S.purpose; $("fType").value = S.type; $("hType").value = S.type;
  $("hMax").value = S.max ? String(S.max) : "";
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.p === S.purpose));
  const all = filtered(), list = all.slice(0,S.shown);
  $("count").textContent = loadState === "loading" ? "Loading properties…" : `${all.length} ${all.length===1?"property":"properties"} found` + (S.loc ? ` for “${S.loc}”` : "");
  $("favN").textContent = favs.length;
  const none = loadState !== "loading" && all.length === 0;
  $("empty").hidden = !none;
  if(none) $("empty").innerHTML = emptyHtml();
  $("more").hidden = all.length <= S.shown;
  $("grid").innerHTML = list.map(p => {
    const off = p.status !== "available";
    return `
    <article class="card${off?" off":""}">
      <div class="img${cover(p) ? "" : " noimg"}" data-view="${p.id}" role="img" aria-label="${esc(p.title)}, ${esc(p.loc)}" style="${cover(p) ? `background-image:url('${cover(p)}');` : ""}cursor:pointer">
        <span class="tag${off?" off":""}">${off ? (STATUS[p.status]||esc(p.status)) : "For "+p.purpose}</span>
        <button class="heart" data-fav="${p.id}" aria-label="Favourite">${favs.includes(p.id)?"♥":"♡"}</button>
      </div>
      <div class="body">
        <div class="price">${ksh(p.price)}${p.purpose==="Rent"?" /mo":""}</div>
        <h3 style="font-size:19px;cursor:pointer" data-view="${p.id}"><a class="cardlink" href="${pageUrl(p)}">${esc(p.title)}</a></h3>
        <div class="meta">📍 ${esc(p.loc)} · ${p.type}${p.beds?` · ${p.beds} bed`:""}</div>
        <div class="acts"><button class="btn outline" data-view="${p.id}">Details</button><button class="btn" data-enq="${p.id}">${WAI}Enquire</button></div>
      </div>
    </article>`;
  }).join("");
}

// --- WhatsApp helpers ---
const waNumber = n => { n = String(n).replace(/\D/g, ""); return n.startsWith("0") ? "254" + n.slice(1) : n; };
const waUrl = (text, number = CONFIG.whatsapp) => `https://wa.me/${waNumber(number)}?text=${encodeURIComponent(text)}`;
// Each property has its own page (property/<id>-<name>/), built by scripts/build-pages.mjs. Same slug rule as the builder.
const slug = t => String(t).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "property";
const pageUrl = p => `property/${p.id}-${slug(p.title)}/`;
// Full link, included in WhatsApp messages so the agent (and WhatsApp's link preview) sees the exact property
const listingUrl = p => new URL(pageUrl(p), (location.protocol === "http:" || location.protocol === "https:") ? location.origin + location.pathname.replace(/[^/]*$/, "") : CONFIG.siteUrl + "/").href;
const wa = (text, source = "site", number = CONFIG.whatsapp) => {
  track("whatsapp_click", {source});
  const url = waUrl(text, number);
  const w = window.open(url, "_blank");
  if (w) w.opener = null; else location.href = url;     // popup blocked or in-app browser: open in this tab instead
};

// Grid clicks (favourite / details / enquire)
$("grid").addEventListener("click", e => {
  const al = e.target.closest("a.cardlink");          // real link for search engines / new tab; normal click opens the quick view
  if (al && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button)) e.preventDefault();
  const f = e.target.closest("[data-fav]"), q = e.target.closest("[data-enq]"), v = e.target.closest("[data-view]");
  if (v && !f && !q) return openListing(+v.dataset.view);
  if (f){ const id=+f.dataset.fav; favs = favs.includes(id)?favs.filter(x=>x!==id):[...favs,id]; saveFavs(); render(); }
  if (q){ const p = DATA.find(x=>x.id===+q.dataset.enq); wa(`Hello, I'm interested in "${p.title}" in ${p.loc} (${ksh(p.price)}).\n${listingUrl(p)}`, "card"); }
});

// Filters
[["fPurpose","purpose"],["fType","type"],["fBeds","beds"],["fSort","sort"]].forEach(([id,k]) =>
  $(id).addEventListener("change", e => { S[k] = k==="beds" ? +e.target.value : e.target.value; S.shown=6; render(); }));

function resetAll(){
  Object.assign(S,{purpose:"",type:"",beds:0,max:0,loc:"",sort:"feat",shown:6,favOnly:false});
  ["fPurpose","fType","hLoc","hType","hMax"].forEach(id=>$(id).value="");
  $("fBeds").value="0"; $("fSort").value="feat";
  document.querySelectorAll(".tab").forEach((t,i)=>t.classList.toggle("on",i===0));
  render();
}
$("reset").onclick = resetAll;
$("more").onclick = () => { S.shown += 6; render(); };
$("favBtn").onclick = () => { S.favOnly = !S.favOnly; S.shown=6; render(); };

// Hero search
document.querySelectorAll(".tab").forEach(t => t.onclick = () => { S.purpose = t.dataset.p; S.shown = 6; render(); });
const applySearch = () => {
  Object.assign(S,{loc:$("hLoc").value.trim(), type:$("hType").value, max:+$("hMax").value||0, shown:6});
  render();
};
["input","change"].forEach(ev => ["hLoc","hType","hMax"].forEach(id => $(id).addEventListener(ev, applySearch)));
$("heroForm").onsubmit = e => {
  e.preventDefault(); applySearch();
  $("properties").scrollIntoView({behavior:"smooth"});
};
$("empty").onclick = e => {
  if(e.target.closest("[data-reset]")) resetAll();
  if(e.target.closest("[data-wa]")) wa(`Hello, I'm looking for a property. What do you have available?`, "empty");
};

// Categories (tile photos come from your admin Site settings; neutral colour until you add them)
let catImages = {};
const CAT_LABEL = {House:"Family Houses", Apartment:"Apartments", Land:"Land & Plots", Commercial:"Commercial"};
function renderCats(){
  $("cats").innerHTML = Object.keys(IMG).map(t => {
    const u = catImages[t] ? `linear-gradient(#0003,#0008),url('${String(catImages[t]).replace(/'/g,"%27")}')` : "linear-gradient(135deg,#6b4f3a,#2a1f1a)";
    return `<button class="cat" data-c="${t}" style="background-image:${u}">${CAT_LABEL[t]}</button>`;
  }).join("");
}
renderCats();
$("cats").onclick = e => {
  const c = e.target.closest("[data-c]"); if(!c) return;
  S.type = c.dataset.c; S.shown=6; $("fType").value = S.type; render();
  $("properties").scrollIntoView({behavior:"smooth"});
};

// Mobile menu
$("menu").onclick = () => $("nav").classList.toggle("open");
$("nav").onclick = e => { if (e.target.tagName==="A") $("nav").classList.remove("open"); };

// Header turns solid on scroll
const hd = document.querySelector("header");
const onScroll = () => hd.classList.toggle("solid", scrollY > 40);
addEventListener("scroll", onScroll); onScroll();

// Reveal on scroll
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold:.12});
document.querySelectorAll(".head,.cats,.toolbar,.about .container>*,.contact .container>*").forEach(el => { el.classList.add("rv"); io.observe(el); });

// Floating buttons: green = straight to WhatsApp, dark = property assistant
const fab = document.createElement("a");
document.querySelector("#cf .btn").insertAdjacentHTML("afterbegin", WAI);
fab.className = "wafab"; fab.innerHTML = WAI; fab.setAttribute("aria-label","Chat on WhatsApp");
fab.href = waUrl(`Hello ${CONFIG.name}, I'd like to enquire about a property.`); fab.target = "_blank"; fab.rel = "noopener";
fab.addEventListener("click", () => track("whatsapp_click", {source:"floating"}));
document.body.appendChild(fab);
const chatFab = document.createElement("button");
chatFab.className = "chatfab"; chatFab.type = "button"; chatFab.textContent = "💬"; chatFab.setAttribute("aria-label","Open property assistant"); chatFab.title = "Property assistant";
document.body.appendChild(chatFab);

// ===== Smart property assistant (WhatsApp-style chat) =====
const AI_ENDPOINT = CONFIG.aiEndpoint || "";                  // set in config.js; empty = built-in keyword assistant
const helper = () => CONFIG.helperWhatsapp || CONFIG.whatsapp;  // number the assistant hands customers to
const START = ["Buy a property","Rent a property","Land / investment","List my property","Talk to an agent"];
const chatEl = document.createElement("div");
chatEl.className = "chat"; chatEl.hidden = true;
chatEl.innerHTML = `<div class="ch-h"><span class="ch-av">SK</span><div><b>${esc(CONFIG.name)}</b><small>● AI assistant · replies instantly</small></div><button id="chX" aria-label="Close">✕</button></div>
<div class="ch-b" id="chB" aria-live="polite"></div><div class="ch-q" id="chQ"></div>
<form class="ch-f" id="chF"><input id="chI" placeholder="e.g. 3 bedroom house in Nairobi under 20M" autocomplete="off"><button aria-label="Send">➤</button></form>`;
document.body.appendChild(chatEl);
const chB = $("chB"), chQ = $("chQ"), chI = $("chI");
let ctx = {}, transcript = [], seen = [], convo = [];

const hhmm = () => new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
function bubble(html, me){
  const d = document.createElement("div"); d.className = "m " + (me ? "me" : "bot");
  d.innerHTML = html + `<small>${hhmm()}${me ? " ✓✓" : ""}</small>`;
  chB.appendChild(d); chB.scrollTop = chB.scrollHeight; return d;
}
function say(html, then){
  const t = bubble('<span class="dots"><i></i><i></i><i></i></span>');
  setTimeout(() => { t.remove(); bubble(html); then && then(); }, 750);
}
const chips = list => { chQ.innerHTML = list.map(c => `<button type="button">${c}</button>`).join(""); };

function parse(t){
  const q = {};
  if(/\brent|rental|to let/.test(t)) q.purpose = "Rent"; else if(/\bbuy|buying|purchase|for sale/.test(t)) q.purpose = "Sale";
  if(/house|villa|bungalow|maisonette|home/.test(t)) q.type = "House";
  else if(/apartment|flat|studio/.test(t)) q.type = "Apartment";
  else if(/land|plot|farm|acre|invest/.test(t)) q.type = "Land";
  else if(/commercial|office|shop|retail/.test(t)) q.type = "Commercial";
  const b = t.match(/(\d+)\s*(?:bed|br)/); if(b) q.beds = +b[1];
  const m = t.match(/(\d+(?:\.\d+)?)\s*(m\b|million|k\b|thousand)/); if(m) q.max = +m[1] * (m[2][0]==="m" ? 1e6 : 1e3);
  const l = LOCS.filter(w => t.includes(w)); if(l.length) q.locs = l;
  return q;
}
const find = c => DATA.filter(p => p.status==="available" && (!c.purpose || p.purpose===c.purpose) && (!c.type || p.type===c.type) && p.beds >= (c.beds||0) &&
  (!c.max || p.price <= c.max) && (!c.locs || c.locs.some(w => p.loc.toLowerCase().includes(w))))
  .sort((a,b) => b.featured - a.featured || a.id - b.id);
const card = p => `<div class="mc">${cover(p) ? `<img src="${cover(p)}" alt="">` : '<div class="mc-ph">🏠</div>'}<div><b>${esc(p.title)}</b><br>${ksh(p.price)}${p.purpose==="Rent"?"/mo":""}<br>📍 ${esc(p.loc)}<br><a data-w="${p.id}">Enquire →</a> · <a data-v="${p.id}">Details</a></div></div>`;
const handoff = msg => say(msg + '<br><a class="go" data-go>Continue on WhatsApp</a>');

function reply(text){
  const t = text.toLowerCase();
  if(/\b(sell|list my|rent out|landlord)/.test(t)) return say("Happy to help list your property. Tap below to fill in a short form.", () => { chQ.innerHTML = '<button type="button" data-lf>List my property</button>'; });
  if(/agent|human|speak|call me|talk to|whatsapp/.test(t)) return handoff("Of course! Tap below and our team will continue with you on WhatsApp.");
  if(/start over|reset|new search/.test(t)){ ctx = {}; return say("Sure, let's start again. What are you looking for?", () => chips(START)); }
  if(/^(hi|hello|hey|habari|jambo|good (morning|afternoon|evening))\b/.test(t)) return say("Hello! What kind of property are you looking for?", () => chips(START));
  if(/thank/.test(t)) return say("You're welcome! Anything else I can help with?", () => chips(["Talk to an agent"]));
  const q = parse(t);
  if(!Object.keys(q).length) return say("I can search our listings for you. Try “3 bedroom house in Nairobi under 20M”, or choose an option.", () => chips(START));
  ctx = {...ctx, ...q};
  const r = find(ctx);
  if(!r.length) return say("I couldn't find an exact match. Our team may have unlisted options that fit. Want to speak to an agent? You can also say “start over”.", () => chips(["Talk to an agent","Start over"]));
  const top = r.slice(0,3); top.forEach(p => seen.includes(p.title) || seen.push(p.title));
  say(`I found ${r.length} match${r.length>1?"es":""}${r.length>3?" — here are the top 3":""}:` + top.map(card).join("") + "Tell me your budget, bedrooms or area to narrow it down.", () => chips(["Talk to an agent","Start over"]));
}
// Asks your AI server (ai-worker) for a reply. Returns {reply, listing_ids, handoff} or null if unavailable.
async function aiReply(text){
  if(!AI_ENDPOINT) return null;
  try{
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
    const slim = DATA.filter(p => p.status === "available").map(({id,title,type,purpose,loc,price,beds,size}) => ({id,title,type,purpose,loc,price,beds,size}));
    const r = await fetch(AI_ENDPOINT, {method:"POST", headers:{"Content-Type":"application/json"}, signal:ctl.signal,
      body:JSON.stringify({message:text, history:convo.slice(-8), listings:slim})});
    clearTimeout(to);
    if(!r.ok) return null;
    const d = await r.json();
    return d && d.reply ? d : null;
  }catch(e){ return null; }
}
function showAi(ai){
  const ps = (ai.listing_ids || []).map(id => DATA.find(p => p.id === +id)).filter(Boolean).slice(0,3);
  ps.forEach(p => seen.includes(p.title) || seen.push(p.title));
  bubble(esc(ai.reply).replace(/\n/g, "<br>") + ps.map(card).join("") + (ai.handoff ? '<br><a class="go" data-go>Continue on WhatsApp</a>' : ""));
  chips(ai.handoff ? [] : ["Talk to an agent"]);
}
async function send(text){
  text = text.trim(); if(!text) return;
  bubble(esc(text), true); transcript.push(text); chQ.innerHTML = ""; chI.value = "";
  track("chat_message");
  // handing over to a person and listing a property are handled instantly, without AI
  if(/agent|human|speak|call me|talk to|whatsapp|\b(sell|list my|rent out|landlord)|start over|reset|new search/i.test(text)) return reply(text);
  let typing = null;
  if(AI_ENDPOINT) typing = bubble('<span class="dots"><i></i><i></i><i></i></span>');
  const ai = await aiReply(text);
  if(typing) typing.remove();
  convo.push({role:"user", content:text});
  if(ai){ convo.push({role:"assistant", content:ai.reply}); return showAi(ai); }
  reply(text);
}
$("chF").onsubmit = e => { e.preventDefault(); send(chI.value); };
chQ.onclick = e => {
  if(e.target.hasAttribute("data-lf")){ chatEl.hidden = true; return openListForm(); }
  if(e.target.tagName === "BUTTON") send(e.target.textContent);
};
chB.onclick = e => {
  const w = e.target.closest("[data-w]"), g = e.target.closest("[data-go]"), v = e.target.closest("[data-v]");
  if(v) return openListing(+v.dataset.v);
  if(w){ const p = DATA.find(x => x.id === +w.dataset.w); wa(`Hello, I'm interested in "${p.title}" in ${p.loc} (${ksh(p.price)}). Is it still available?\n${listingUrl(p)}`, "chat", helper()); }
  if(g) wa(`Hello ${CONFIG.name}, I was chatting on your website.\n` + (seen.length ? `Listings I liked: ${seen.join(", ")}\n` : "") + (transcript.length ? `My messages: ${transcript.slice(-6).join(" | ")}` : ""), "chat", helper());
};
chatFab.onclick = () => {
  chatEl.hidden = !chatEl.hidden;
  if(!chatEl.hidden && !chB.children.length) say(`Hello 👋 I'm the automated assistant for ${esc(CONFIG.name)}. What are you looking for today?`, () => chips(START));
};
$("chX").onclick = () => { chatEl.hidden = true; };

$("yr").textContent = new Date().getFullYear();
render();

// Load the real listings. Last known listings are shown instantly, then refreshed from the database.
function afterLoad(){ if(typeof onListingsLoaded === "function") onListingsLoaded(); }
(async function loadListings(){
  let cached = null;
  try{ cached = JSON.parse(localStorage.getItem("sk_listings_cache") || "null"); }catch(e){}
  if(Array.isArray(cached) && cached.length){ setData(cached); loadState = "ok"; render(); }
  if(!DB.configured()){
    console.warn("Listings database is not configured. Add supabaseUrl and supabaseKey in config.js (see SETUP.md).");
    loadState = DATA.length ? "ok" : "error"; render(); return;
  }
  try{
    const rows = await DB.listPublic();
    setData(rows); loadState = "ok";
    try{ localStorage.setItem("sk_listings_cache", JSON.stringify(rows)); }catch(e){}
  }catch(e){
    console.error("Could not load listings:", e);
    loadState = DATA.length ? "ok" : "error";
  }
  render(); afterLoad();
})();
