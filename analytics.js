// ===== Analytics + cookie consent =====
// Plausible (cookieless) loads straight away. Google Analytics and Meta Pixel load only after the visitor accepts.
(function(){
  const A = CONFIG.analytics || {};
  const hasTrackers = !!(A.ga4 || A.metaPixel);
  const store = {
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  };

  // Call track("event_name", {key:"value"}) anywhere; it does nothing if no analytics is loaded.
  window.track = (name, params = {}) => {
    try{
      if(window.gtag) gtag("event", name, params);
      if(window.fbq) fbq("trackCustom", name, params);
      if(window.plausible) plausible(name, {props: params});
    }catch(e){}
  };

  function loadPlausible(){
    if(!A.plausibleDomain) return;
    window.plausible = window.plausible || function(){ (window.plausible.q = window.plausible.q || []).push(arguments); };
    const s = document.createElement("script");
    s.defer = true; s.dataset.domain = A.plausibleDomain; s.src = "https://plausible.io/js/script.js";
    document.head.appendChild(s);
  }
  function loadGA(){
    if(!A.ga4) return;
    const s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(A.ga4);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag("js", new Date()); gtag("config", A.ga4, {anonymize_ip:true});
  }
  function loadPixel(){
    if(!A.metaPixel) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq("init", A.metaPixel); fbq("track", "PageView");
  }

  const ck = document.getElementById("cookie");
  function showBanner(){
    ck.innerHTML = hasTrackers
      ? `<span>We use cookies for analytics and advertising to improve our service. You can accept or decline. See our <a href="#privacy" data-privacy>Privacy Policy</a>.</span><button class="btn outline" id="ckNo" type="button">Decline</button><button class="btn" id="ckYes" type="button">Accept</button>`
      : `<span>We don't use tracking cookies. Favourites stay on your device and enquiries are sent through WhatsApp. See our <a href="#privacy" data-privacy>Privacy Policy</a>.</span><button class="btn" id="ckYes" type="button">Got it</button>`;
    ck.hidden = false;
    document.getElementById("ckYes").onclick = () => {
      store.set("consent", hasTrackers ? "yes" : "ack"); ck.hidden = true;
      if(hasTrackers){ loadGA(); loadPixel(); }
    };
    const no = document.getElementById("ckNo");
    if(no) no.onclick = () => {
      const was = store.get("consent") === "yes";
      store.set("consent", "no"); ck.hidden = true;
      if(was) location.reload();   // stops trackers that were already loaded
    };
  }

  loadPlausible();
  const c = store.get("consent");
  if(c === "yes") { loadGA(); loadPixel(); }
  if(!c || (hasTrackers && c === "ack") || (hasTrackers && c === "1")) showBanner();

  if(hasTrackers){
    const f = document.querySelector("footer");
    if(f) f.insertAdjacentHTML("beforeend", ' · <a href="#" id="ckSet">Cookie settings</a>');
    document.addEventListener("click", e => { if(e.target.id === "ckSet"){ e.preventDefault(); showBanner(); } });
  }
})();
