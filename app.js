/* ============ ADDITIVE EDGE - APP.JS ============ */
(function(){
  "use strict";

  /* Content is visible by default; reveal animations only hide it once this script runs. */
  document.documentElement.classList.add("js");

  /* Old links ending in .html still load the page; show the clean address (/about, not /about.html).
     replaceState only rewrites the address bar: no reload, no new history entry. */
  if (/\.html$/.test(location.pathname) && window.history && history.replaceState) {
    const clean = location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    history.replaceState(history.state, "", clean + location.search + location.hash);
  }

  const PHONE_DISPLAY = "617-331-6266";
  const PHONE_HREF = "tel:+16173316266";
  const MAIL_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
  const PHONE_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  /* Same wording in the cart drawer, on the shop page and under each Add to cart button. */
  const SHIP_NOTICE = 'This shop ships to <strong>North and South American customers only</strong>. If you\'re outside this region, please <a href="quote">Get a quote</a> and we\'ll provide a separate quote.';
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- PRODUCT CATALOG ----
     `variants` map option label -> Shopify Storefront variant GID.
     `prices` are used for on-page display; the cart/checkout uses Shopify's
     authoritative prices. `note(label)` returns the small price-note text. */
  const PRODUCTS = {
    "rizium-gf": {
      id:"rizium-gf", name:"Rizium GF", type:"filament",
      tagline:"Glass-fiber-reinforced COC engineering filament",
      prices:{ "500 g":99, "820 g":160 }, priceFrom:99,
      url:"product-rizium",
      variants:{
        "500 g":"gid://shopify/ProductVariant/51025909481692",
        "820 g":"gid://shopify/ProductVariant/51025909514460"
      },
      note:(l)=> l+" spool · in stock"
    },
    "rizium-cf": {
      id:"rizium-cf", name:"Rizium CF", type:"filament",
      tagline:"Carbon-fiber-reinforced COC engineering filament",
      prices:{ "500 g":99, "820 g":160 }, priceFrom:99,
      url:"product-rizium-cf",
      variants:{
        "500 g":"gid://shopify/ProductVariant/51025912922332",
        "820 g":"gid://shopify/ProductVariant/51025912955100"
      },
      note:(l)=> l+" spool · in stock"
    },
    "rizium-support": {
      id:"rizium-support", name:"Rizium Support", type:"filament",
      tagline:"Copolyester support material, compatible with all RIZIUM® filaments",
      prices:{ "500 g":75 }, priceFrom:75,
      url:"product-rizium-support",
      variants:{
        "500 g":"gid://shopify/ProductVariant/51025913053404"
      },
      note:null
    },
    ataru: {
      id:"ataru", name:"Ataru", type:"resin",
      tagline:"High-performance DLP resin · 300°C+ · low dielectric loss",
      prices:{ "1 L":693.00, "5 L":3316.00 }, priceFrom:693,
      url:"product-ataru",
      variants:{
        "1 L":"gid://shopify/ProductVariant/51025916428508",
        "5 L":"gid://shopify/ProductVariant/51025916461276"
      },
      note:(l)=> l + (l === "5 L" ? " · ships in one container" : "")
    },
    "ataru-cleaner": {
      id:"ataru-cleaner", name:"Ataru Resin Cleaner", type:"cleaner",
      tagline:"Post-print resin wash formulated for Ataru DLP resin",
      prices:{ "1 L":24.00, "5 L":100.00 }, priceFrom:24,
      url:"product-ataru-cleaner",
      variants:{
        "1 L":"gid://shopify/ProductVariant/51025916559580",
        "5 L":"gid://shopify/ProductVariant/51025916592348"
      },
      note:(l)=> l + (l === "5 L" ? " · ships in one container" : "")
    }
  };
  window.AE_PRODUCTS = PRODUCTS;
  const money = n => "$"+Number(n).toFixed(2);

  /* ---- GA4 EVENTS ----
     Sends a GA4 event if the tag loaded. Returns false when gtag is missing
     (blocked by an ad blocker, for example) so the cart and forms keep working. */
  function track(name, params){
    if (typeof gtag !== "function") return false;
    try { gtag("event", name, params); return true; } catch(e){ return false; }
  }

  /* ---- SHOPIFY STOREFRONT CART API ---- */
  const SHOPIFY = {
    domain: "eiqdfd-f3.myshopify.com",
    token:  "00eb0e320b197878fa44271fffc3ccd9",
    api:    "https://eiqdfd-f3.myshopify.com/api/2024-04/graphql.json"
  };
  const CART_FIELDS = `
    id
    checkoutUrl
    cost { subtotalAmount { amount } }
    lines(first: 50) { edges { node {
      id
      quantity
      merchandise { ... on ProductVariant {
        title
        price { amount }
        product { title }
      } }
    } } }`;

  async function shopGQL(query, variables){
    const res = await fetch(SHOPIFY.api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY.token
      },
      body: JSON.stringify({ query, variables })
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors.map(e=>e.message).join("; "));
    return json.data;
  }
  function payloadCart(p){
    if (p.userErrors && p.userErrors.length)
      throw new Error(p.userErrors.map(e=>e.message).join("; "));
    return p.cart;
  }
  function normalizeCart(c){
    if (!c) return null;
    return {
      id: c.id,
      checkoutUrl: c.checkoutUrl,
      subtotal: Number((c.cost && c.cost.subtotalAmount && c.cost.subtotalAmount.amount) || 0),
      lines: c.lines.edges.map(({node})=>({
        id: node.id,
        qty: node.quantity,
        title: node.merchandise.product.title,
        variant: node.merchandise.title,
        price: Number(node.merchandise.price.amount)
      }))
    };
  }
  async function apiCartFetch(id){
    const d = await shopGQL(`query($id:ID!){ cart(id:$id){ ${CART_FIELDS} } }`, { id });
    return normalizeCart(d.cart);
  }
  async function apiCartCreate(merchandiseId, quantity){
    const d = await shopGQL(`mutation($lines:[CartLineInput!]!){ cartCreate(input:{lines:$lines}){ cart{ ${CART_FIELDS} } userErrors{ message } } }`,
      { lines: [{ merchandiseId, quantity }] });
    return normalizeCart(payloadCart(d.cartCreate));
  }
  async function apiCartAdd(cartId, merchandiseId, quantity){
    const d = await shopGQL(`mutation($id:ID!,$lines:[CartLineInput!]!){ cartLinesAdd(cartId:$id, lines:$lines){ cart{ ${CART_FIELDS} } userErrors{ message } } }`,
      { id: cartId, lines: [{ merchandiseId, quantity }] });
    return normalizeCart(payloadCart(d.cartLinesAdd));
  }
  async function apiCartUpdate(cartId, lineId, quantity){
    const d = await shopGQL(`mutation($cid:ID!,$lines:[CartLineUpdateInput!]!){ cartLinesUpdate(cartId:$cid, lines:$lines){ cart{ ${CART_FIELDS} } userErrors{ message } } }`,
      { cid: cartId, lines: [{ id: lineId, quantity }] });
    return normalizeCart(payloadCart(d.cartLinesUpdate));
  }
  async function apiCartRemove(cartId, lineId){
    const d = await shopGQL(`mutation($cid:ID!,$ids:[ID!]!){ cartLinesRemove(cartId:$cid, lineIds:$ids){ cart{ ${CART_FIELDS} } userErrors{ message } } }`,
      { cid: cartId, ids: [lineId] });
    return normalizeCart(payloadCart(d.cartLinesRemove));
  }

  /* ---- CART CONTROLLER (drawer + badge) ---- */
  let _cart = null;
  const STORAGE_KEY = "ae_cart_id";

  const AE = {
    cart(){ return _cart; },
    lines(){ return (_cart && _cart.lines) || []; },
    count(){ return this.lines().reduce((s,l)=>s+l.qty,0); },

    /* Load a saved cart if present; never creates one on page load. */
    async ensure(){
      if (_cart) return _cart;
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved){
        try { const c = await apiCartFetch(saved); if (c){ _cart = c; return _cart; } }
        catch(e){ /* stale id -> a fresh cart is created on the next add */ }
      }
      return null;
    },
    async addToCart(productId, label, qty){
      const P = PRODUCTS[productId];
      const variantId = P && P.variants && P.variants[label];
      if (!variantId) throw new Error("No Shopify variant for "+productId+" / "+label);
      await this.ensure();
      _cart = _cart ? await apiCartAdd(_cart.id, variantId, qty)
                    : await apiCartCreate(variantId, qty);
      localStorage.setItem(STORAGE_KEY, _cart.id);
      this.render();
      const price = P.prices[label];
      track("add_to_cart", {
        currency: "USD",
        value: price * qty,
        items: [{ item_id: productId, item_name: P.name, item_variant: label, price: price, quantity: qty }]
      });
    },
    async setLineQty(lineId, qty){
      if (!_cart) return;
      _cart = qty <= 0 ? await apiCartRemove(_cart.id, lineId)
                       : await apiCartUpdate(_cart.id, lineId, qty);
      this.render();
    },
    async removeLine(lineId){
      if (!_cart) return;
      _cart = await apiCartRemove(_cart.id, lineId);
      this.render();
    },

    badge(){
      const b = document.getElementById("cartBadge");
      if (!b) return;
      const n = this.count();
      b.textContent = n;
      b.classList.toggle("show", n>0);
    },
    render(){
      const body = document.getElementById("aeCartBody");
      const sub  = document.getElementById("aeCartSubtotal");
      const coBtn = document.getElementById("aeCartCheckout");
      const items = this.lines();
      if (body){
        body.innerHTML = items.length ? items.map(l=>`
          <div class="ae-cart-item" data-id="${l.id}">
            <div class="ae-ci-info">
              <div class="ae-ci-title">${l.title}</div>
              <div class="ae-ci-variant">${l.variant}</div>
              <div class="ae-ci-price">${money(l.price)}</div>
            </div>
            <div class="ae-ci-controls">
              <div class="ae-ci-qty">
                <button data-act="dec" aria-label="Decrease quantity">&minus;</button>
                <span>${l.qty}</span>
                <button data-act="inc" aria-label="Increase quantity">&#43;</button>
              </div>
              <button class="ae-ci-remove" data-act="remove">Remove</button>
            </div>
          </div>`).join("") : '<p class="ae-cart-empty">Your cart is empty.</p>';
      }
      if (sub)   sub.textContent = money(_cart ? _cart.subtotal : 0);
      /* empty cart: show a link to the shop instead of a disabled Checkout button */
      const browse = document.getElementById("aeCartBrowse");
      if (coBtn)  coBtn.hidden = !items.length;
      if (browse) browse.hidden = !!items.length;
      this.badge();
    },
    openCart(){
      const drawer = document.getElementById("aeCartDrawer");
      const overlay = document.getElementById("aeCartOverlay");
      if (!drawer || !overlay) return;
      overlay.hidden = false;
      requestAnimationFrame(()=>{ overlay.classList.add("show"); drawer.classList.add("open"); });
      drawer.setAttribute("aria-hidden","false");
      document.body.style.overflow = "hidden";
      document.body.classList.add("cart-open");
    },
    closeCart(){
      const drawer = document.getElementById("aeCartDrawer");
      const overlay = document.getElementById("aeCartOverlay");
      if (!drawer || !overlay) return;
      drawer.classList.remove("open");
      overlay.classList.remove("show");
      drawer.setAttribute("aria-hidden","true");
      document.body.style.overflow = "";
      document.body.classList.remove("cart-open");
      setTimeout(()=>{ if (!drawer.classList.contains("open")) overlay.hidden = true; }, 280);
    },
    checkout(){
      if (!_cart || !_cart.checkoutUrl) return;
      const url = _cart.checkoutUrl;
      let gone = false;
      const go = ()=>{ if (!gone){ gone = true; window.location.href = url; } };
      /* Give the event a moment to send before leaving for Shopify; never wait more than 800 ms. */
      if (track("begin_checkout", { currency: "USD", value: _cart.subtotal, event_callback: go })) setTimeout(go, 800);
      else go();
    }
  };
  window.AE = AE;

  /* ---- PRODUCT PAGE WIRING ---- */
  function initProductPage(id){
    const P = PRODUCTS[id];
    if (!P) return;
    const labels  = Object.keys(P.variants);
    let label = labels[0];
    const priceEl = document.getElementById("pdPrice");
    const noteEl  = document.getElementById("pdNote");
    function refresh(){
      if (priceEl) priceEl.textContent = money(P.prices[label]);
      if (noteEl && typeof P.note === "function") noteEl.textContent = P.note(label);
    }
    const optRow = document.querySelector(".opt-row[data-opt]");
    if (optRow){
      optRow.querySelectorAll(".opt").forEach(b=>{
        b.addEventListener("click",()=>{
          optRow.querySelectorAll(".opt").forEach(o=>o.classList.remove("sel"));
          b.classList.add("sel"); label = b.textContent.trim(); refresh();
        });
      });
    }
    const qVal = document.getElementById("qVal");
    if (qVal){
      const up = document.getElementById("qUp"), dn = document.getElementById("qDown");
      if (up) up.onclick = ()=> qVal.value = Math.max(1,(parseInt(qVal.value)||1)+1);
      if (dn) dn.onclick = ()=> qVal.value = Math.max(1,(parseInt(qVal.value)||1)-1);
      qVal.oninput = ()=> qVal.value = qVal.value.replace(/[^0-9]/g,"");
    }
    const addBtn = document.getElementById("aeAddCart") || document.getElementById("addBtn");
    if (addBtn){
      addBtn.addEventListener("click", async ()=>{
        const qty = qVal ? Math.max(1, parseInt(qVal.value)||1) : 1;
        addBtn.disabled = true;
        const original = addBtn.innerHTML;
        addBtn.textContent = "Adding…";
        try { await AE.addToCart(id, label, qty); AE.openCart(); }
        catch(err){ console.error(err); alert("Sorry, something went wrong adding to cart. Please try again."); }
        finally { addBtn.disabled = false; addBtn.innerHTML = original; }
      });
    }
    refresh();
  }

  /* ---- CART DRAWER + STICKY BAR MARKUP ----
     The header, rating strip and footer are written into each page's HTML by
     tools/build_chrome.py (so search engines see them without JavaScript).
     Edit them there, then run: python tools/build_chrome.py */
  /* the strip scrolls away with the page; the fixed header slides up to fill its place */
  function wireRatingStrip(){
    const strip = document.getElementById("rateStrip");
    if(!strip) return;
    const root = document.documentElement;
    let h = 0;
    const update = ()=>{ root.style.setProperty("--strip-top", Math.max(0, h - window.scrollY) + "px"); };
    const measure = ()=>{ h = strip.offsetHeight; update(); };
    measure();
    window.addEventListener("scroll", update, {passive:true});
    window.addEventListener("resize", measure);
    strip.addEventListener("click", ()=>{ track("view_reviews", {link_url: strip.href, location: "top_strip"}); });
  }
  function renderStickyBar(){
    return `<div class="m-sticky" id="mSticky">
      <a class="btn btn-ghost" href="${PHONE_HREF}" data-call="sticky_bar">${PHONE_SVG} Call</a>
      <a class="btn btn-primary" href="quote">Get a quote</a>
    </div>`;
  }
  function renderCartDrawer(){
    return `<div id="aeCartOverlay" class="ae-cart-overlay" hidden></div>
    <aside id="aeCartDrawer" class="ae-cart-drawer" aria-hidden="true" aria-label="Cart">
      <div class="ae-cart-head"><h3>Your cart</h3><button id="aeCartClose" aria-label="Close cart">&times;</button></div>
      <div id="aeCartBody" class="ae-cart-body"></div>
      <div class="ae-cart-foot">
        <div class="ae-cart-ship-notice">
          <span aria-hidden="true">&#127758;</span>
          <p>${SHIP_NOTICE}</p>
        </div>
        <div class="ae-cart-subtotal"><span class="k">Subtotal</span><span class="v" id="aeCartSubtotal">$0.00</span></div>
        <button id="aeCartCheckout" class="btn btn-primary" hidden>Checkout <span class="arr">&rarr;</span></button>
        <a id="aeCartBrowse" class="btn btn-ghost" href="shop">Browse materials <span class="arr">&rarr;</span></a>
        <p class="ae-cart-note">Shipping &amp; taxes calculated at checkout.</p>
      </div>
    </aside>`;
  }

  /* ---- INIT ---- */
  function init(){
    /* inject + wire the shared cart drawer and the phone call/quote bar */
    document.body.insertAdjacentHTML("beforeend", renderCartDrawer());
    document.body.insertAdjacentHTML("beforeend", renderStickyBar());
    wireCartDrawer();
    wireMenu();
    wireRatingStrip();
    wireCallTracking();
    wireFieldFocus();
    wireStickyAfterHero();
    initMobileDetails();

    /* nav cart icon opens the drawer instead of navigating to a cart page */
    const cartBtn = document.querySelector(".cart-btn");
    if(cartBtn) cartBtn.addEventListener("click",(e)=>{ e.preventDefault(); AE.openCart(); });

    /* product page (declares itself via <body data-product="..."> ) */
    const productId = document.body.getAttribute("data-product");
    if(productId) initProductPage(productId);

    /* GA4: datasheet and SDS downloads (any PDF link on the site) */
    document.addEventListener("click", (e)=>{
      const a = e.target.closest && e.target.closest('a[href$=".pdf"]');
      if (!a) return;
      const href = a.getAttribute("href");
      track("file_download", { file_name: href.split("/").pop(), file_extension: "pdf", link_url: a.href });
    });

    AE.badge();
    initReveal();
    initCountUp();
    initHeroDots();
    initRibbon();

    /* load any existing Shopify cart, then refresh badge + drawer */
    AE.ensure().then(()=>AE.render()).catch(err=>console.error(err));

    /* allow ?cart=1 (e.g. legacy cart redirect) to open the drawer */
    if(/[?&]cart=1\b/.test(window.location.search)){
      AE.ensure().then(()=>{ AE.render(); AE.openCart(); }).catch(err=>console.error(err));
    }
  }

  /* Mobile menu: aria-expanded, close on link tap, outside tap or Escape. */
  function wireMenu(){
    const hamb = document.getElementById("hamb");
    const menu = document.getElementById("navlinks");
    if(!hamb || !menu) return;
    const setOpen = (open)=>{
      menu.classList.toggle("open", open);
      hamb.setAttribute("aria-expanded", open ? "true" : "false");
    };
    hamb.addEventListener("click", (e)=>{ e.stopPropagation(); setOpen(!menu.classList.contains("open")); });
    menu.addEventListener("click", (e)=>{ if(e.target.closest("a")) setOpen(false); });
    document.addEventListener("click", (e)=>{
      if(menu.classList.contains("open") && !menu.contains(e.target) && !hamb.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", (e)=>{
      if(e.key === "Escape" && menu.classList.contains("open")){ setOpen(false); hamb.focus(); }
    });
  }

  /* GA4: phone taps. Each tel: link says where it sits with data-call. */
  function wireCallTracking(){
    document.addEventListener("click", (e)=>{
      const a = e.target.closest && e.target.closest('a[href^="tel:"]');
      if(!a) return;
      track("click_to_call", { location: a.getAttribute("data-call") || "contact_card" });
    });
  }

  /* Hide the phone sticky bar while a form field has focus, so it never covers the field. */
  /* Homepage only: the phone call/quote bar stays hidden while the hero's own buttons are on
     screen, and slides up once they scroll off the top. Other pages show the bar as before. */
  function wireStickyAfterHero(){
    const cta = document.body.getAttribute("data-page") === "home" && document.querySelector(".hero .cta-row");
    if(!cta) return;
    document.body.classList.add("sticky-wait");
    const update = ()=>{
      document.body.classList.toggle("sticky-show", cta.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener("scroll", update, {passive:true});
    window.addEventListener("resize", update);
    update();
  }

  function wireFieldFocus(){
    const isField = el => el && el.matches && el.matches("input, textarea, select");
    document.addEventListener("focusin",  (e)=>{ if(isField(e.target)) document.body.classList.add("field-focus"); });
    document.addEventListener("focusout", (e)=>{ if(isField(e.target)) document.body.classList.remove("field-focus"); });
  }

  /* <details data-mobile-closed> are open above 600 px and closed on phones.
     Above 600 px their summaries are plain text, so they also leave the tab order. */
  function initMobileDetails(){
    const list = document.querySelectorAll("details[data-mobile-closed]");
    if(!list.length || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width:600px)");
    const sync = ()=>{
      list.forEach(d=>{
        d.open = !mq.matches;
        const s = d.querySelector(":scope > summary");
        if(s){ if(mq.matches) s.removeAttribute("tabindex"); else s.setAttribute("tabindex","-1"); }
      });
    };
    sync();
    if(mq.addEventListener) mq.addEventListener("change", sync); else if(mq.addListener) mq.addListener(sync);
  }

  function wireCartDrawer(){
    const overlay = document.getElementById("aeCartOverlay");
    const body    = document.getElementById("aeCartBody");
    const close   = document.getElementById("aeCartClose");
    const coBtn   = document.getElementById("aeCartCheckout");
    if(close)   close.addEventListener("click", ()=>AE.closeCart());
    if(overlay) overlay.addEventListener("click", ()=>AE.closeCart());
    if(coBtn)   coBtn.addEventListener("click", ()=>AE.checkout());
    document.addEventListener("keydown", e=>{ if(e.key === "Escape") AE.closeCart(); });
    if(body){
      body.addEventListener("click", async (e)=>{
        const btn = e.target.closest("button[data-act]");
        if(!btn) return;
        const itemEl = btn.closest(".ae-cart-item");
        const id = itemEl && itemEl.getAttribute("data-id");
        const line = id && AE.lines().find(x=>x.id===id);
        if(!line) return;
        const act = btn.getAttribute("data-act");
        body.classList.add("busy");
        try {
          if(act === "inc")         await AE.setLineQty(id, line.qty+1);
          else if(act === "dec")    await AE.setLineQty(id, line.qty-1);
          else if(act === "remove") await AE.removeLine(id);
        } catch(err){
          console.error(err);
          alert("Sorry, we couldn't update the cart. Please try again.");
        } finally {
          body.classList.remove("busy");
        }
      });
    }
  }

  function initRibbon(){
    document.querySelectorAll(".ribbon").forEach(rb=>{
      const track = rb.querySelector(".ribbon-track");
      const prev  = rb.querySelector(".ribbon-prev");
      const next  = rb.querySelector(".ribbon-next");
      if(!track) return;
      const step = ()=>{
        const item = track.querySelector(".ribbon-item");
        return item ? item.getBoundingClientRect().width + 18 : track.clientWidth*0.8;
      };
      function updateArrows(){
        const max = track.scrollWidth - track.clientWidth - 1;
        if(prev) prev.disabled = track.scrollLeft <= 0;
        if(next) next.disabled = track.scrollLeft >= max;
      }
      const behavior = reduceMotion ? "auto" : "smooth";
      const go = dir => track.scrollBy({left: dir * step(), behavior});
      if(prev) prev.addEventListener("click", ()=>go(-1));
      if(next) next.addEventListener("click", ()=>go(1));
      /* keyboard: focus the strip, then use the left and right arrow keys (touch swipe is native scrolling) */
      track.addEventListener("keydown", (e)=>{
        if(e.key === "ArrowLeft"){ e.preventDefault(); go(-1); }
        else if(e.key === "ArrowRight"){ e.preventDefault(); go(1); }
      });
      track.addEventListener("scroll", updateArrows, {passive:true});
      window.addEventListener("resize", updateArrows);
      updateArrows();
    });
  }

  /* Hero stats count up from 0 once, when they scroll into view. The HTML holds the final
     numbers, so without JavaScript or with reduced motion they simply show as written. */
  function initCountUp(){
    const els = [...document.querySelectorAll(".count[data-to]")];
    if(!els.length || reduceMotion || !("IntersectionObserver" in window)) return;
    /* each number sits on its own line above its label, so it can grow to the right without moving anything */
    els.forEach(el=>{ el.textContent = "0"; });
    const run = (el)=>{
      const to = parseInt(el.getAttribute("data-to"), 10) || 0;
      const dur = 1400, t0 = performance.now();
      const tick = (now)=>{
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);                         /* ease-out cubic */
        el.textContent = String(Math.round(to * eased));
        if(p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((ents)=>{
      ents.forEach(e=>{ if(e.isIntersecting){ run(e.target); io.unobserve(e.target); } });
    },{threshold:.4});
    els.forEach(el=>io.observe(el));
  }

  /* Phone hero: dots under the swipeable photo row show how many photos there are and
     which one is in view. Tapping a dot scrolls to that photo. CSS shows them at 600 px and below. */
  function initHeroDots(){
    const row = document.querySelector(".hero-photos");
    if(!row) return;
    const tiles = [...row.querySelectorAll(".hero-photo")];
    if(tiles.length < 2) return;
    const dots = document.createElement("div");
    dots.className = "hero-dots";
    tiles.forEach((tile, i)=>{
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show photo " + (i + 1) + " of " + tiles.length);
      b.addEventListener("click", ()=>{
        row.scrollTo({ left: tile.offsetLeft - row.offsetLeft - parseFloat(getComputedStyle(row).paddingLeft || 0), behavior: reduceMotion ? "auto" : "smooth" });
      });
      dots.appendChild(b);
    });
    row.after(dots);
    const btns = [...dots.children];
    const update = ()=>{
      const max = row.scrollWidth - row.clientWidth;
      let active = 0;
      if(max > 0 && row.scrollLeft >= max - 4) active = tiles.length - 1;
      else {
        const left = row.getBoundingClientRect().left;
        let best = Infinity;
        tiles.forEach((t, i)=>{ const d = Math.abs(t.getBoundingClientRect().left - left); if(d < best){ best = d; active = i; } });
      }
      btns.forEach((b, i)=>{ b.classList.toggle("on", i === active); b.setAttribute("aria-current", i === active ? "true" : "false"); });
    };
    row.addEventListener("scroll", update, {passive:true});
    window.addEventListener("resize", update);
    update();
  }

  function initReveal(){
    const els = document.querySelectorAll(".reveal");
    if(!("IntersectionObserver" in window)){ els.forEach(e=>e.classList.add("in")); return; }
    const io = new IntersectionObserver((ents)=>{
      ents.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target);} });
    },{threshold:.12});
    els.forEach(e=>io.observe(e));
  }

  window.AE_money = money;
  document.addEventListener("DOMContentLoaded", init);
})();
