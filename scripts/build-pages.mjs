// Generates a crawlable page for every published property + sitemap.xml
//   node scripts/build-pages.mjs          (writes property/ and sitemap.xml next to the site files)
//   node scripts/build-pages.mjs --dist   (same, then copies ONLY the public website files into dist/, used by Vercel)
// Reads your public settings from config.js and your published listings from Supabase.
// Optional overrides: SUPABASE_URL, SUPABASE_KEY, SITE_URL (environment variables).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { CONFIG } = vm.runInNewContext(fs.readFileSync(path.join(ROOT, "config.js"), "utf8") + "\n;({CONFIG})");

const SB = (process.env.SUPABASE_URL || CONFIG.supabaseUrl || "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_KEY || CONFIG.supabaseKey || "";
const SITE = (process.env.SITE_URL || CONFIG.siteUrl || "").replace(/\/+$/, "");
const NO_DB = !SB || !KEY;
if (NO_DB) console.warn("NOTE: supabaseUrl / supabaseKey are not set in config.js yet, so the site is built without property pages. Follow SETUP.md to connect your database.");
if (!SITE || /yourdomain/.test(SITE)) console.warn("WARNING: siteUrl is still the placeholder. Set your real domain in config.js before launch.");
const BASE = new URL(SITE || "https://example.com").pathname.replace(/\/+$/, "");   // "" for a normal domain, "/repo" for a project site

// ---------- data ----------
async function rest(p) {
  const r = await fetch(SB + p, { headers: { apikey: KEY } });
  if (!r.ok) throw new Error(`${p} returned ${r.status}`);
  return r.json();
}
let rows = [];
try {
  if (!NO_DB) rows = await rest("/rest/v1/listings?select=id,title,type,purpose,status,loc,price,beds,size,description,amenities,images,created_at,updated_at&published=eq.true&order=id.asc");
} catch (e) {
  // Stop WITHOUT touching existing pages, so a database hiccup never wipes your property pages.
  console.error("Could not read listings from the database: " + (e.cause ? e.cause.code || e.cause.message : e.message));
  console.error("Existing pages were left as they are.");
  process.exit(1);
}
let settings = {};
if (!NO_DB) try { const s = await rest("/rest/v1/site_settings?id=eq.1&select=data"); settings = (s[0] && s[0].data) || {}; } catch (e) { /* optional */ }
for (const k of ["phone", "whatsapp", "email", "address", "hours"]) if (settings[k]) CONFIG[k] = settings[k];

// ---------- helpers ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = t => String(t).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "property";
const waNumber = n => { n = String(n).replace(/\D/g, ""); return n.startsWith("0") ? "254" + n.slice(1) : n; };
const ksh = n => "KSh " + Number(n).toLocaleString("en-US");
const STATUS = { available: "Available", reserved: "Reserved", sold: "Sold", let: "Let" };
const urlPath = p => `${BASE}/property/${p.id}-${slug(p.title)}/`;
const imgs = p => (p.images || []).filter(u => /^https?:\/\//.test(u));
const jsonLd = o => JSON.stringify(o).replace(/</g, "\\u003c");
const paras = t => esc(t).split(/\n{2,}/).map(x => `<p>${x.replace(/\n/g, "<br>")}</p>`).join("");

function describe(p) {
  const bits = [`${p.type} for ${p.purpose === "Sale" ? "sale" : "rent"} in ${p.loc}.`];
  if (p.beds) bits.push(`${p.beds} bedroom${p.beds > 1 ? "s" : ""}.`);
  bits.push(`${ksh(p.price)}${p.purpose === "Rent" ? " per month" : ""}.`);
  const d = (p.description || "").replace(/\s+/g, " ").trim();
  let s = bits.join(" ");
  if (d && s.length < 120) s += " " + d;
  return s.length > 158 ? s.slice(0, 155).replace(/\s+\S*$/, "") + "…" : s;
}

function similar(p) {
  const pool = rows.filter(x => x.id !== p.id && x.status === "available");
  return [...pool.filter(x => x.type === p.type && x.purpose === p.purpose), ...pool.filter(x => x.purpose === p.purpose && x.type !== p.type)].slice(0, 3);
}

// ---------- page template ----------
function page(p) {
  const url = SITE + urlPath(p).slice(BASE.length);
  const photos = imgs(p), avail = p.status === "available";
  const title = `${p.title} – ${p.loc} | ${CONFIG.name}`;
  const desc = describe(p);
  const tel = `tel:+${waNumber(CONFIG.whatsapp)}`;
  const ld = {
    "@context": "https://schema.org", "@type": "RealEstateListing", name: p.title, url,
    description: (p.description || desc).slice(0, 500), datePosted: p.created_at, dateModified: p.updated_at,
    ...(photos.length ? { image: photos } : {}),
    address: { "@type": "PostalAddress", addressLocality: p.loc, addressCountry: "KE" },
    offers: {
      "@type": "Offer", url, priceCurrency: "KES",
      availability: avail ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      ...(p.purpose === "Rent"
        ? { priceSpecification: { "@type": "UnitPriceSpecification", price: p.price, priceCurrency: "KES", unitText: "MONTH" } }
        : { price: p.price }),
      seller: { "@type": "RealEstateAgent", name: CONFIG.name }
    }
  };
  const crumbs = {
    "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Properties", item: SITE + "/#properties" },
      { "@type": "ListItem", position: 3, name: p.title, item: url }]
  };
  const sim = similar(p);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#1c1411">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🏡%3C/text%3E%3C/svg%3E">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(CONFIG.name)}">
<meta property="og:title" content="${esc(p.title)} – ${esc(ksh(p.price))}${p.purpose === "Rent" ? "/mo" : ""}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
${photos[0] ? `<meta property="og:image" content="${esc(photos[0])}">\n<meta name="twitter:image" content="${esc(photos[0])}">` : ""}
<meta property="og:locale" content="en_KE">
<meta name="twitter:card" content="${photos[0] ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${BASE}/style.css">
<script type="application/ld+json">${jsonLd(ld)}</script>
<script type="application/ld+json">${jsonLd(crumbs)}</script>
</head>
<body data-id="${p.id}" data-title="${esc(p.title)}" data-loc="${esc(p.loc)}" data-site="${esc(BASE)}">
<header class="solid"><div class="container nav">
  <a class="brand" href="${BASE}/">${esc(CONFIG.name.toUpperCase())}<small>PROPERTIES &amp; REAL ESTATE</small></a>
  <div class="pnav"><a href="${BASE}/#properties">All properties</a><a href="${BASE}/#contact">Contact</a></div>
</div></header>

<main class="pp container">
  <p class="crumbs"><a href="${BASE}/">Home</a> › <a href="${BASE}/#properties">Properties</a> › ${esc(p.title)}</p>
  <div class="ppgone" id="ppGone" role="status" hidden>This property is no longer listed. <a href="${BASE}/#properties">Browse our current properties</a>.</div>

  <div class="pgal${photos.length ? "" : " noimg"}">${photos.map((u, i) => `<img src="${esc(u)}" alt="${esc(p.title)} – photo ${i + 1}"${i ? ' loading="lazy"' : ' fetchpriority="high"'}>`).join("")}</div>

  <div class="pgrid">
    <article>
      <span class="tag${avail ? "" : " off"}" id="ppStatus" style="position:static;display:inline-block">${avail ? "For " + esc(p.purpose) : esc(STATUS[p.status] || p.status)}</span>
      <h1>${esc(p.title)}</h1>
      <div class="meta">📍 ${esc(p.loc)}</div>
      <div class="chips"><span>${esc(p.type)}</span>${p.beds ? `<span>${p.beds} bedroom${p.beds > 1 ? "s" : ""}</span>` : ""}${p.size ? `<span>${esc(p.size)}</span>` : ""}</div>
      ${p.description ? `<h2>About this property</h2>${paras(p.description)}` : ""}
      ${(p.amenities || []).length ? `<h2>Features</h2><ul class="amen">${p.amenities.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
      <h2>Location</h2>
      <iframe class="mmap" loading="lazy" title="Map of ${esc(p.loc)}" src="https://www.google.com/maps?q=${encodeURIComponent(p.loc + ", Kenya")}&amp;output=embed"></iframe>
    </article>

    <aside class="pcard">
      <div class="price" id="ppPrice">${esc(ksh(p.price))}${p.purpose === "Rent" ? " /mo" : ""}</div>
      <div id="ppAvail"${avail ? "" : " hidden"}>
        <div class="book"><b>Book a viewing</b><input type="date" id="bDate" aria-label="Preferred viewing date"><button class="btn" data-book>Book via WhatsApp</button></div>
        <div class="macts"><button class="btn" data-enq>Enquire on WhatsApp</button><a class="btn outline" href="${tel}" data-call>📞 Call</a></div>
      </div>
      <div id="ppSold"${avail ? " hidden" : ""}>
        <p class="meta" style="margin:8px 0 12px">This property is no longer available. Ask us about similar properties.</p>
        <div class="macts"><button class="btn" data-similar>Find similar on WhatsApp</button><a class="btn outline" href="${BASE}/#properties">Browse all</a></div>
      </div>
      <button class="btn outline" data-share style="width:100%;margin-top:10px">Share this property</button>
    </aside>
  </div>

  ${sim.length ? `<h2 class="simh">Similar properties</h2><div class="sim">${sim.map(x => `<a class="simc" href="${urlPath(x)}">${imgs(x)[0] ? `<img src="${esc(imgs(x)[0])}" alt="" loading="lazy">` : '<div class="simph">🏠</div>'}<b>${esc(x.title)}</b><span>${esc(ksh(x.price))}${x.purpose === "Rent" ? "/mo" : ""} · ${esc(x.loc)}</span></a>`).join("")}</div>` : ""}
</main>

<div class="pbar"${avail ? "" : " hidden"}><button class="btn" data-enq>Enquire on WhatsApp</button><a class="btn outline" href="${tel}" data-call>📞 Call</a></div>
<footer>© ${new Date().getFullYear()} ${esc(CONFIG.name)}. All rights reserved. · <a href="${BASE}/#privacy" data-privacy>Privacy Policy</a></footer>

<div class="cookie" id="cookie" role="region" aria-label="Privacy notice" hidden></div>
<script src="${BASE}/config.js"></script>
<script src="${BASE}/db.js"></script>
<script src="${BASE}/analytics.js"></script>
<script src="${BASE}/property.js"></script>
</body>
</html>
`;
}

// ---------- write files ----------
const propDir = path.join(ROOT, "property");
fs.rmSync(propDir, { recursive: true, force: true });
for (const p of rows) {
  const dir = path.join(propDir, `${p.id}-${slug(p.title)}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page(p));
}

const day = d => (d ? new Date(d).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
const urls = [`  <url><loc>${SITE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
  ...rows.map(p => `  <url><loc>${esc(SITE + urlPath(p).slice(BASE.length))}</loc><lastmod>${day(p.updated_at)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`)];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);

const robots = path.join(ROOT, "robots.txt");
if (fs.existsSync(robots)) {
  let r = fs.readFileSync(robots, "utf8");
  r = /^Sitemap:.*$/m.test(r) ? r.replace(/^Sitemap:.*$/m, `Sitemap: ${SITE}/sitemap.xml`) : r.trimEnd() + `\n\nSitemap: ${SITE}/sitemap.xml\n`;
  fs.writeFileSync(robots, r);
}
console.log(`Built ${rows.length} property page${rows.length === 1 ? "" : "s"} and sitemap.xml for ${SITE || "(no siteUrl)"}`);

// ---------- dist/: only the files that belong on the public website ----------
if (process.argv.includes("--dist")) {
  const DIST = path.join(ROOT, "dist");
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const publicFile = /\.(html|js|css|txt|xml|json|jpe?g|png|webp|gif|svg|ico|webmanifest)$/i, privateFile = /^(vercel|package|package-lock|tsconfig)\.json$/i;
  for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
    const from = path.join(ROOT, e.name), to = path.join(DIST, e.name);
    if (e.isFile() && publicFile.test(e.name) && !privateFile.test(e.name)) fs.copyFileSync(from, to);
    else if (e.isDirectory() && ["property", "images", "assets"].includes(e.name)) fs.cpSync(from, to, { recursive: true });
  }
  // keep the home page's link-preview tags pointing at your real address
  const ix = path.join(DIST, "index.html");
  if (fs.existsSync(ix)) {
    let h = fs.readFileSync(ix, "utf8");
    const hasOg = fs.existsSync(path.join(ROOT, "og-image.jpg"));
    h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${SITE}/$2`).replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${SITE}/$2`);
    if (hasOg) h = h.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*(")/g, `$1${SITE}/og-image.jpg$2`);
    else {
      h = h.replace(/<meta (?:property="og:image"|name="twitter:image") content="[^"]*">\n?/g, "").replace('content="summary_large_image"', 'content="summary"');
      console.warn("NOTE: og-image.jpg not found, so shared links will have no preview picture. Add a 1200x630 og-image.jpg next to index.html.");
    }
    fs.writeFileSync(ix, h);
  }
  console.log("Copied the public website files to dist/");
}
