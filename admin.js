// ===== Admin panel logic: sign in, manage listings and photos (works with db.js + Supabase) =====
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SK = "sk_admin_session";
const STATUS_LABEL = {available:"Available", reserved:"Reserved", sold:"Sold", let:"Let"};
let session = null, rows = [], editing = null, newUploads = [], removedOld = [], dirty = false;

/* ---------- small helpers ---------- */
function toast(msg, bad){
  const t = $("toast"); t.textContent = msg; t.className = "toast" + (bad ? " bad" : ""); t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, bad ? 6000 : 3000);
}
const ksh = n => "KSh " + Number(n).toLocaleString();

/* ---------- session ---------- */
function saveSession(s){
  if(!s){ session = null; try{ localStorage.removeItem(SK); }catch(e){} return; }
  session = {
    access_token:s.access_token, refresh_token:s.refresh_token,
    expires_at:s.expires_at || (Math.floor(Date.now() / 1000) + (s.expires_in || 3600)),
    email:(s.user && s.user.email) || (session && session.email) || ""
  };
  try{ localStorage.setItem(SK, JSON.stringify(session)); }catch(e){}
}
async function token(){
  if(!session) throw new Error("Please sign in again.");
  if(session.expires_at - Date.now() / 1000 < 60){
    try{ saveSession(await DB.refresh(session.refresh_token)); }
    catch(e){ saveSession(null); showLogin("Your session expired. Please sign in again."); throw e; }
  }
  return session.access_token;
}
function showLogin(msg){
  $("app").hidden = true; $("ed").hidden = true; $("login").hidden = false;
  $("lErr").textContent = msg || ""; $("lPass").value = "";
}

/* ---------- login / logout ---------- */
$("loginForm").onsubmit = async e => {
  e.preventDefault();
  const btn = $("lBtn"); $("lErr").textContent = ""; btn.disabled = true; btn.textContent = "Signing in…";
  try{
    saveSession(await DB.signIn($("lEmail").value.trim(), $("lPass").value));
    if(await DB.isAdmin(session.access_token) !== true){
      await DB.signOut(session.access_token); saveSession(null);
      throw new Error("This account is not an administrator.");
    }
    await enterApp();
  }catch(err){
    $("lErr").textContent = /invalid login/i.test(err.message) ? "Wrong email or password." : err.message;
  }
  btn.disabled = false; btn.textContent = "Sign in";
};
$("logout").onclick = async () => {
  if(dirty && !confirm("Discard unsaved changes?")) return;
  if(session) await DB.signOut(session.access_token);
  saveSession(null); rows = []; showLogin();
};

async function enterApp(){
  $("login").hidden = true; $("app").hidden = false; $("who").textContent = session.email;
  await Promise.all([refreshList(), refreshPeople(), loadSite()]);
}
async function refreshList(){
  try{ rows = await DB.listAll(await token()); render(); }
  catch(e){ if(session) toast("Couldn't load listings: " + e.message, true); }
}

/* ---------- list ---------- */
function render(){
  $("sTotal").textContent = rows.length;
  $("sLive").textContent = rows.filter(p => p.published).length;
  $("sAvail").textContent = rows.filter(p => p.published && p.status === "available").length;
  $("sDraft").textContent = rows.filter(p => !p.published).length;
  const q = $("q").value.trim().toLowerCase(), f = $("fs").value;
  const list = rows.filter(p =>
    (!q || (p.title + " " + p.loc).toLowerCase().includes(q)) &&
    (!f || (f === "draft" ? !p.published : p.status === f)));
  $("list").innerHTML = list.length ? list.map(p => `
    <div class="item" data-id="${p.id}">
      ${p.images && p.images[0] ? `<img class="th" src="${esc(p.images[0])}" alt="">` : '<div class="th">🏠</div>'}
      <div class="t"><b>${esc(p.title)}</b><small>${esc(p.loc)} · ${ksh(p.price)}${p.purpose === "Rent" ? "/mo" : ""} · ${esc(p.type)}</small><br>
        <span class="badge ${p.status === "available" ? "g" : "y"}">${STATUS_LABEL[p.status] || esc(p.status)}</span>
        <span class="badge ${p.published ? "g" : "r"}">${p.published ? "Live" : "Draft"}</span>${p.featured ? '<span class="badge y">★ Featured</span>' : ""}
        <span class="badge">${(p.images || []).length} photo${(p.images || []).length === 1 ? "" : "s"}</span></div>
      <div class="acts">
        <button class="b s" data-a="edit">Edit</button>
        <button class="b o s" data-a="pub">${p.published ? "Hide" : "Publish"}</button>
        <button class="b o s" data-a="copy">Copy</button>
        <button class="b d s" data-a="del">Delete</button>
      </div>
    </div>`).join("") : `<div class="empty">${rows.length ? "No listings match your search." : "No listings yet. Tap “+ Add listing” to add your first property."}</div>`;
}
$("q").oninput = render; $("fs").onchange = render;

$("list").onclick = async e => {
  const b = e.target.closest("[data-a]"); if(!b) return;
  const p = rows.find(x => x.id === +b.closest(".item").dataset.id); if(!p) return;
  const act = b.dataset.a;
  try{
    if(act === "edit") return openEditor(p);
    if(act === "pub"){
      if(!p.published && !(p.images || []).length) return toast("Add at least one photo before publishing.", true);
      b.disabled = true;
      const u = await DB.update(p.id, {published:!p.published}, await token());
      rows = rows.map(x => x.id === p.id ? u : x); render(); return toast(u.published ? "Now live on the website." : "Hidden from the website.");
    }
    if(act === "copy"){
      const c = {...p}; delete c.id; delete c.created_at;
      c.title = (p.title + " (copy)").slice(0, 120); c.published = false; c.featured = false;
      const u = await DB.insert(c, await token());
      rows = [u, ...rows]; render(); return toast("Copied as a hidden draft. Edit it, then publish.");
    }
    if(act === "del"){
      if(!confirm(`Delete “${p.title}” permanently? This also deletes its photos and cannot be undone.`)) return;
      b.disabled = true;
      await DB.remove(p.id, await token());
      rows = rows.filter(x => x.id !== p.id); render();
      const stillUsed = new Set(rows.flatMap(x => x.images || []));
      DB.removeFiles((p.images || []).filter(u => !stillUsed.has(u)), await token());
      return toast("Listing deleted.");
    }
  }catch(err){ toast(err.message, true); render(); }
};

/* ---------- editor ---------- */
const FIELDS = ["title","type","purpose","status","loc","price","beds","size","desc"];
function openEditor(p){
  editing = p ? {...p, images:[...(p.images || [])], origImages:[...(p.images || [])]} :
    {id:null, title:"", type:"House", purpose:"Sale", status:"available", loc:"", price:"", beds:0, size:"", description:"", amenities:[], images:[], origImages:[], featured:false, published:true};
  newUploads = []; removedOld = []; dirty = false;
  $("edTitle").textContent = p ? "Edit listing" : "Add listing";
  FIELDS.forEach(k => $(k).value = k === "desc" ? editing.description : editing[k]);
  $("amen").value = (editing.amenities || []).join("\n");
  $("featured").checked = !!editing.featured; $("published").checked = !!editing.published;
  $("fErr").textContent = ""; $("upMsg").textContent = ""; $("save").disabled = false;
  drawPhotos(); $("ed").hidden = false; $("ed").scrollTop = 0; document.body.style.overflow = "hidden";
}
function closeEditor(){ $("ed").hidden = true; editing = null; document.body.style.overflow = ""; dirty = false; }
$("add").onclick = () => openEditor(null);
$("f").addEventListener("input", () => { dirty = true; });
$("cancel").onclick = async () => {
  if(dirty && !confirm("Discard your changes?")) return;
  if(newUploads.length) DB.removeFiles(newUploads, await token().catch(() => null));   // clean up photos uploaded but never saved
  closeEditor();
};

/* photos */
function drawPhotos(){
  const n = editing.images.length;
  $("photos").innerHTML = editing.images.map((u, i) => `
    <div class="ph"><img src="${esc(u)}" alt="Photo ${i + 1}">
      ${i === 0 ? "<b>★ Cover</b><br>" : `<button type="button" data-p="cover" data-i="${i}">Make cover</button>`}
      ${i > 0 ? `<button type="button" data-p="left" data-i="${i}">◀</button>` : ""}${i < n - 1 ? `<button type="button" data-p="right" data-i="${i}">▶</button>` : ""}
      <button type="button" data-p="rm" data-i="${i}">Remove</button></div>`).join("");
}
$("photos").onclick = async e => {
  const b = e.target.closest("[data-p]"); if(!b) return;
  const i = +b.dataset.i, im = editing.images; dirty = true;
  if(b.dataset.p === "cover") im.unshift(im.splice(i, 1)[0]);
  if(b.dataset.p === "left") [im[i - 1], im[i]] = [im[i], im[i - 1]];
  if(b.dataset.p === "right") [im[i + 1], im[i]] = [im[i], im[i + 1]];
  if(b.dataset.p === "rm"){
    const [u] = im.splice(i, 1);
    if(newUploads.includes(u)){ newUploads = newUploads.filter(x => x !== u); DB.removeFiles([u], await token().catch(() => null)); }
    else removedOld.push(u);                      // deleted from storage only when the listing is saved
  }
  drawPhotos();
};
function compress(file, max = 1600, q = .82){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej(new Error("Could not process image")), "image/jpeg", q);
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("unsupported")); };
    im.src = url;
  });
}
$("files").onchange = async e => {
  const files = [...e.target.files]; e.target.value = "";
  const room = 12 - editing.images.length;
  if(files.length > room) toast(`Only ${Math.max(room, 0)} more photo(s) allowed (max 12).`, true);
  let done = 0;
  for(const f of files.slice(0, Math.max(room, 0))){
    $("upMsg").textContent = `Uploading photo ${done + 1} of ${Math.min(files.length, room)}…`;
    try{
      const url = await DB.upload(await compress(f), await token());
      editing.images.push(url); newUploads.push(url); dirty = true; done++; drawPhotos();
    }catch(err){
      toast(err.message === "unsupported" ? `“${f.name}” isn't a photo this browser can read. Use JPG or PNG.` : `Upload failed: ${err.message}`, true);
    }
  }
  $("upMsg").textContent = done ? `${done} photo${done > 1 ? "s" : ""} uploaded.` : "";
};

/* save */
$("f").onsubmit = async e => {
  e.preventDefault();
  const v = k => $(k).value.trim();
  const row = {
    title:v("title"), type:v("type"), purpose:v("purpose"), status:v("status"), loc:v("loc"),
    price:Number(v("price")), beds:Number(v("beds")) || 0, size:v("size"), description:v("desc"),
    amenities:$("amen").value.split("\n").map(s => s.trim()).filter(Boolean),
    images:editing.images, featured:$("featured").checked, published:$("published").checked
  };
  const bad =
    row.title.length < 3 ? "Enter a title (at least 3 characters)." :
    row.loc.length < 2 ? "Enter the location." :
    !(row.price >= 0) || v("price") === "" ? "Enter the price." :
    row.beds < 0 || row.beds > 50 ? "Bedrooms must be between 0 and 50." :
    (row.published && !row.images.length) ? "Add at least one real photo before publishing, or untick “Published” to save as a draft." : "";
  $("fErr").textContent = bad; if(bad) return;
  $("save").disabled = true; $("save").textContent = "Saving…";
  try{
    const t = await token();
    const saved = editing.id ? await DB.update(editing.id, row, t) : await DB.insert(row, t);
    rows = editing.id ? rows.map(x => x.id === saved.id ? saved : x) : [saved, ...rows];
    const stillUsed = new Set([...rows.flatMap(x => x.images || []), ...row.images]);
    const toDelete = removedOld.filter(u => !stillUsed.has(u));
    if(toDelete.length) DB.removeFiles(toDelete, t);
    newUploads = []; removedOld = []; closeEditor(); render();
    toast(row.published ? "Saved and live on your website." : "Saved as a hidden draft.");
  }catch(err){
    $("fErr").textContent = "Couldn't save: " + err.message;
  }
  $("save").disabled = false; $("save").textContent = "Save listing";
};
addEventListener("beforeunload", e => { if(dirty){ e.preventDefault(); e.returnValue = ""; } });

/* ---------- tabs ---------- */
$("tabs").onclick = e => {
  const b = e.target.closest("[data-tab]"); if(!b) return;
  document.querySelectorAll("#tabs button").forEach(x => x.classList.toggle("on", x === b));
  ["listings","team","reviews","site"].forEach(t => $("v-" + t).hidden = t !== b.dataset.tab);
};

/* ---------- team & reviews ---------- */
let people = {team:[], reviews:[]}, peopleOk = true, kind = null, cur2 = null, ph2 = {url:"", orig:"", fresh:false};
const apiFor = k => k === "team" ? DB.team : DB.reviews;
async function refreshPeople(){
  try{
    const t = await token();
    [people.team, people.reviews] = await Promise.all([DB.team.listAll(t), DB.reviews.listAll(t)]);
    peopleOk = true;
  }catch(e){ if(session) peopleOk = false; }
  renderPeople();
}
function renderPeople(){
  const missing = '<div class="empty">Team and reviews need a database update. Run the latest <b>supabase/setup.sql</b> in the Supabase SQL Editor (it is safe to run again), then refresh this page.</div>';
  const acts = '<div class="acts"><button class="b s" data-a2="edit">Edit</button><button class="b o s" data-a2="pub">PUB</button><button class="b d s" data-a2="del">Delete</button></div>';
  const badge = p => `<span class="badge ${p.published ? "g" : "r"}">${p.published ? "Live" : "Hidden"}</span>`;
  $("teamList").innerHTML = !peopleOk ? missing : people.team.length ? people.team.map(m => `
    <div class="item" data-id="${m.id}" data-k="team">
      ${m.photo ? `<img class="th" src="${esc(m.photo)}" alt="">` : '<div class="th">👤</div>'}
      <div class="t"><b>${esc(m.name)}</b><small>${esc(m.role || "")}${m.phone ? " · " + esc(m.phone) : ""}</small><br>${badge(m)}</div>
      ${acts.replace("PUB", m.published ? "Hide" : "Publish")}</div>`).join("")
    : '<div class="empty">No team members yet. The “Meet Our Team” section stays hidden until you add someone.</div>';
  $("reviewList").innerHTML = !peopleOk ? missing : people.reviews.length ? people.reviews.map(r => `
    <div class="item" data-id="${r.id}" data-k="reviews">
      <div class="th">${"★".repeat(r.rating)}</div>
      <div class="t"><b>${esc(r.name)}</b><small>${esc(r.detail || "")}</small><br><small>“${esc(r.quote.length > 90 ? r.quote.slice(0, 90) + "…" : r.quote)}”</small><br>${badge(r)}</div>
      ${acts.replace("PUB", r.published ? "Hide" : "Publish")}</div>`).join("")
    : '<div class="empty">No reviews yet. The reviews section stays hidden until you add a genuine one.</div>';
}
function openEd2(k, row){
  kind = k; cur2 = row || null; ph2 = {url:(row && row.photo) || "", orig:(row && row.photo) || "", fresh:false};
  $("ed2Title").textContent = (row ? "Edit " : "Add ") + (k === "team" ? "team member" : "client review");
  $("g-team").hidden = k !== "team"; $("g-reviews").hidden = k !== "reviews";
  if(k === "team"){ $("t_name").value = row ? row.name : ""; $("t_role").value = row ? row.role : ""; $("t_phone").value = row ? row.phone : ""; $("t_bio").value = row ? row.bio : ""; drawPh2(); }
  else{ $("r_name").value = row ? row.name : ""; $("r_detail").value = row ? row.detail : ""; $("r_rating").value = row ? row.rating : 5; $("r_quote").value = row ? row.quote : ""; $("r_ok").checked = !!row; }
  $("sort2").value = row ? row.sort : 0; $("pub2").checked = row ? row.published : true;
  $("f2Err").textContent = ""; $("save2").disabled = false; $("ed2").hidden = false; $("ed2").scrollTop = 0; document.body.style.overflow = "hidden";
}
function closeEd2(){ $("ed2").hidden = true; kind = null; cur2 = null; document.body.style.overflow = ""; }
function drawPh2(){ $("t_prev").hidden = !ph2.url; $("t_rm").hidden = !ph2.url; if(ph2.url) $("t_prev").src = ph2.url; }
document.addEventListener("click", e => { const b = e.target.closest("[data-add]"); if(b) openEd2(b.dataset.add, null); });
$("t_file").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if(!f) return;
  try{
    const url = await DB.upload(await compress(f, 800, .85), await token());
    if(ph2.fresh) DB.removeFiles([ph2.url], await token().catch(() => null));
    ph2.url = url; ph2.fresh = true; drawPh2();
  }catch(err){ toast(err.message === "unsupported" ? "That file isn't a photo this browser can read. Use JPG or PNG." : "Upload failed: " + err.message, true); }
};
$("t_rm").onclick = async () => {
  if(ph2.fresh) DB.removeFiles([ph2.url], await token().catch(() => null));
  ph2.url = ""; ph2.fresh = false; drawPh2();
};
$("cancel2").onclick = async () => {
  if(ph2.fresh) DB.removeFiles([ph2.url], await token().catch(() => null));
  closeEd2();
};
$("f2").onsubmit = async e => {
  e.preventDefault();
  const v = id => $(id).value.trim(), k = kind;
  let row, bad = "";
  if(k === "team"){
    row = {name:v("t_name"), role:v("t_role"), phone:v("t_phone").replace(/[^\d+]/g, ""), bio:v("t_bio"), photo:ph2.url, sort:Number(v("sort2")) || 0, published:$("pub2").checked};
    if(row.name.length < 2) bad = "Enter the person's name.";
    else if(row.phone && row.phone.replace(/\D/g, "").length < 9) bad = "That WhatsApp number looks too short.";
  }else{
    row = {name:v("r_name"), detail:v("r_detail"), rating:Number(v("r_rating")), quote:v("r_quote"), sort:Number(v("sort2")) || 0, published:$("pub2").checked};
    if(row.name.length < 2) bad = "Enter the client's name.";
    else if(row.quote.length < 10) bad = "The review is too short.";
    else if(!$("r_ok").checked) bad = "Please confirm this is a genuine review you have permission to publish.";
  }
  $("f2Err").textContent = bad; if(bad) return;
  $("save2").disabled = true;
  try{
    const t = await token(), api = apiFor(k);
    const saved = cur2 ? await api.update(cur2.id, row, t) : await api.insert(row, t);
    people[k] = cur2 ? people[k].map(x => x.id === saved.id ? saved : x) : [...people[k], saved];
    people[k].sort((a, b) => a.sort - b.sort || a.id - b.id);
    if(k === "team" && ph2.orig && ph2.orig !== row.photo) DB.removeFiles([ph2.orig], t);
    ph2.fresh = false; closeEd2(); renderPeople(); toast(row.published ? "Saved and live on your website." : "Saved as hidden.");
  }catch(err){ $("f2Err").textContent = "Couldn't save: " + err.message; }
  $("save2").disabled = false;
};
for(const id of ["teamList","reviewList"]) $(id).onclick = async e => {
  const b = e.target.closest("[data-a2]"); if(!b) return;
  const el = b.closest(".item"), k = el.dataset.k, id2 = +el.dataset.id, row = people[k].find(x => x.id === id2);
  try{
    if(b.dataset.a2 === "edit") return openEd2(k, row);
    const t = await token(), api = apiFor(k);
    if(b.dataset.a2 === "pub"){
      const u = await api.update(id2, {published:!row.published}, t);
      people[k] = people[k].map(x => x.id === id2 ? u : x); renderPeople();
      return toast(u.published ? "Now live on the website." : "Hidden from the website.");
    }
    if(b.dataset.a2 === "del"){
      if(!confirm(`Delete “${row.name}” permanently?`)) return;
      await api.remove(id2, t); people[k] = people[k].filter(x => x.id !== id2); renderPeople();
      if(k === "team" && row.photo) DB.removeFiles([row.photo], t);
      toast("Deleted.");
    }
  }catch(err){ toast(err.message, true); }
};

/* ---------- site settings ---------- */
const SLOTS = [["hero_image","Top banner photo (wide)",1920],["about_image","About section photo",1200],["cat_house","“Family Houses” tile",900],["cat_apartment","“Apartments” tile",900],["cat_land","“Land & Plots” tile",900],["cat_commercial","“Commercial” tile",900]];
const SOCIALS = ["facebook","instagram","tiktok","x","youtube"];
let site = {}, siteOrig = {}, siteNew = [], siteOk = true;
async function loadSite(){
  try{ site = await DB.settings.get(); siteOk = true; }catch(e){ site = {}; siteOk = false; }
  siteOrig = JSON.parse(JSON.stringify(site)); siteNew = []; fillSite();
}
function fillSite(){
  $("siteWarn").innerHTML = siteOk ? "" : '<div class="err">Site settings need a database update. Run the latest <b>supabase/setup.sql</b> in the Supabase SQL Editor (safe to run again), then refresh.</div>';
  $("siteSave").disabled = !siteOk;
  const map = {s_phone:"phone", s_whatsapp:"whatsapp", s_helper:"helper_whatsapp", s_email:"email", s_address:"address", s_hours:"hours", s_about:"about_text"};
  for(const id in map) $(id).value = site[map[id]] || "";
  for(const k of SOCIALS) $("s_" + k).value = (site.socials && site.socials[k]) || "";
  drawSlots();
}
function drawSlots(){
  $("siteImgs").innerHTML = SLOTS.map(([k, label]) => `<div class="slot"><b>${label}</b>
    ${site[k] ? `<img class="sp" src="${esc(site[k])}" alt="">` : '<div class="sp">No photo yet</div>'}
    <input type="file" accept="image/*" data-up="${k}">
    ${site[k] ? `<button type="button" class="b o s" style="margin-top:6px" data-rmimg="${k}">Remove</button>` : ""}</div>`).join("");
}
$("siteImgs").onchange = async e => {
  const inp = e.target.closest("[data-up]"); if(!inp || !inp.files[0]) return;
  const k = inp.dataset.up, f = inp.files[0], size = SLOTS.find(s => s[0] === k)[2]; inp.value = "";
  try{
    const url = await DB.upload(await compress(f, size, .85), await token());
    if(siteNew.includes(site[k])){ DB.removeFiles([site[k]], await token().catch(() => null)); siteNew = siteNew.filter(u => u !== site[k]); }
    site[k] = url; siteNew.push(url); drawSlots();
  }catch(err){ toast(err.message === "unsupported" ? "That file isn't a photo this browser can read. Use JPG or PNG." : "Upload failed: " + err.message, true); }
};
$("siteImgs").onclick = async e => {
  const b = e.target.closest("[data-rmimg]"); if(!b) return;
  const k = b.dataset.rmimg;
  if(siteNew.includes(site[k])){ DB.removeFiles([site[k]], await token().catch(() => null)); siteNew = siteNew.filter(u => u !== site[k]); }
  site[k] = ""; drawSlots();
};
$("siteDiscard").onclick = async () => {
  if(siteNew.length) DB.removeFiles(siteNew, await token().catch(() => null));
  await loadSite(); toast("Changes discarded.");
};
$("siteForm").onsubmit = async e => {
  e.preventDefault();
  const v = id => $(id).value.trim();
  const socials = Object.fromEntries(SOCIALS.map(k => [k, v("s_" + k)]));
  const bad =
    (v("s_whatsapp") && v("s_whatsapp").replace(/\D/g, "").length < 9) ? "The main WhatsApp number looks too short." :
    (v("s_helper") && v("s_helper").replace(/\D/g, "").length < 9) ? "The assistant WhatsApp number looks too short." :
    (v("s_email") && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("s_email"))) ? "That email address doesn't look right." :
    SOCIALS.find(k => socials[k] && !/^https?:\/\//i.test(socials[k])) ? "Social links must start with https://" : "";
  $("siteErr").textContent = bad; if(bad) return;
  const data = {...site, phone:v("s_phone"), whatsapp:v("s_whatsapp"), helper_whatsapp:v("s_helper"), email:v("s_email"),
    address:v("s_address"), hours:v("s_hours"), about_text:v("s_about"), socials};
  $("siteSave").disabled = true;
  try{
    const t = await token();
    await DB.settings.save(data, t);
    const keep = new Set(Object.values(data).filter(x => typeof x === "string"));
    const gone = SLOTS.map(s => siteOrig[s[0]]).filter(u => u && !keep.has(u));
    if(gone.length) DB.removeFiles(gone, t);
    site = data; siteOrig = JSON.parse(JSON.stringify(data)); siteNew = [];
    toast("Saved. Your website now shows these details.");
  }catch(err){ $("siteErr").textContent = "Couldn't save: " + err.message; }
  $("siteSave").disabled = !siteOk;
};

/* ---------- start ---------- */
(async function init(){
  if(!DB.configured()){
    showLogin("The database isn't connected yet. Add supabaseUrl and supabaseKey in config.js (see SETUP.md).");
    $("lBtn").disabled = true; return;
  }
  try{ session = JSON.parse(localStorage.getItem(SK) || "null"); }catch(e){ session = null; }
  if(session){
    try{ await token(); if(await DB.isAdmin(session.access_token) === true) return await enterApp(); }catch(e){}
    saveSession(null);
  }
  showLogin();
})();
