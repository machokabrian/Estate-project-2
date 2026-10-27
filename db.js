// ===== Listings database client (Supabase REST, no extra libraries) =====
// Used by the public site (read published listings) and by admin.html (sign in, manage listings and photos).
// Security comes from the database rules in supabase/setup.sql, not from hiding this key.
const DB = (() => {
  const base = (CONFIG.supabaseUrl || "").replace(/\/+$/, "");
  const key = CONFIG.supabaseKey || "";
  const bucket = CONFIG.imageBucket || "listing-images";
  const configured = () => !!(base && key);
  const COLS = "id,title,type,purpose,status,loc,price,beds,size,description,amenities,images,featured,published,created_at";
  const publicPrefix = `${base}/storage/v1/object/public/${bucket}/`;

  async function call(path, {method = "GET", token, body, headers = {}} = {}){
    const h = {apikey:key, ...headers};
    if(token) h.Authorization = "Bearer " + token;
    let payload = body;
    if(body !== undefined && typeof body !== "string" && !(body instanceof Blob)){
      payload = JSON.stringify(body); h["Content-Type"] = "application/json";
    }
    const r = await fetch(base + path, {method, headers:h, body:payload});
    const txt = await r.text();
    let data = null;
    if(txt){ try{ data = JSON.parse(txt); }catch(e){ data = txt; } }
    if(!r.ok){
      const err = new Error((data && (data.message || data.msg || data.error_description || data.error)) || r.statusText || "Request failed");
      err.status = r.status; throw err;
    }
    return data;
  }

  // generic table helper for small tables (team, reviews)
  const table = name => ({
    listPublic: () => call(`/rest/v1/${name}?select=*&published=eq.true&order=sort.asc,id.asc`),
    listAll: token => call(`/rest/v1/${name}?select=*&order=sort.asc,id.asc`, {token}),
    insert: (row, token) => call(`/rest/v1/${name}`, {method:"POST", token, body:row, headers:{Prefer:"return=representation"}}).then(a => a[0]),
    update: (id, row, token) => call(`/rest/v1/${name}?id=eq.${Number(id)}`, {method:"PATCH", token, body:row, headers:{Prefer:"return=representation"}}).then(a => a[0]),
    remove: (id, token) => call(`/rest/v1/${name}?id=eq.${Number(id)}`, {method:"DELETE", token})
  });

  return {
    configured, bucket,
    settings: {
      get: () => call("/rest/v1/site_settings?id=eq.1&select=data").then(a => (a[0] && a[0].data) || {}),
      save: (data, token) => call("/rest/v1/site_settings?on_conflict=id", {method:"POST", token, body:{id:1, data, updated_at:new Date().toISOString()},
        headers:{Prefer:"resolution=merge-duplicates,return=representation"}})
    },
    team: table("team_members"),
    reviews: table("testimonials"),
    // public site: only published listings (the database enforces this too)
    listPublic: () => call(`/rest/v1/listings?select=${COLS}&published=eq.true&order=featured.desc,id.asc`),
    getPublic: id => call(`/rest/v1/listings?select=${COLS}&published=eq.true&id=eq.${Number(id)}`),
    // admin: everything, including drafts
    listAll: token => call(`/rest/v1/listings?select=${COLS}&order=id.desc`, {token}),
    insert: (row, token) => call("/rest/v1/listings", {method:"POST", token, body:row, headers:{Prefer:"return=representation"}}).then(a => a[0]),
    update: (id, row, token) => call(`/rest/v1/listings?id=eq.${Number(id)}`, {method:"PATCH", token, body:row, headers:{Prefer:"return=representation"}}).then(a => a[0]),
    remove: (id, token) => call(`/rest/v1/listings?id=eq.${Number(id)}`, {method:"DELETE", token}),
    isAdmin: token => call("/rest/v1/rpc/is_admin", {method:"POST", token, body:{}}),
    signIn: (email, password) => call("/auth/v1/token?grant_type=password", {method:"POST", body:{email, password}}),
    refresh: refresh_token => call("/auth/v1/token?grant_type=refresh_token", {method:"POST", body:{refresh_token}}),
    signOut: token => call("/auth/v1/logout", {method:"POST", token}).catch(() => {}),
    // uploads a JPEG blob, returns its public URL
    upload: async (blob, token) => {
      const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      await call(`/storage/v1/object/${bucket}/${path}`, {method:"POST", token, body:blob,
        headers:{"Content-Type":"image/jpeg", "x-upsert":"false", "cache-control":"max-age=31536000"}});
      return publicPrefix + path;
    },
    removeFiles: (urls, token) => {
      const paths = urls.filter(u => u.startsWith(publicPrefix)).map(u => decodeURIComponent(u.slice(publicPrefix.length)));
      return paths.length ? call(`/storage/v1/object/${bucket}`, {method:"DELETE", token, body:{prefixes:paths}}).catch(() => {}) : Promise.resolve();
    }
  };
})();
