/* ============ ADDITIVE EDGE - APP.JS ============ */
(function(){
  "use strict";

  /* ---- PRODUCT CATALOG ----
     `variants` map option label -> Shopify Storefront variant GID.
     `prices` are used for on-page display; the cart/checkout uses Shopify's
     authoritative prices. `note(label)` returns the small price-note text. */
  const PRODUCTS = {
    "rizium-gf": {
      id:"rizium-gf", name:"Rizium GF", type:"filament",
      tagline:"Glass-fiber-reinforced COC engineering filament",
      prices:{ "500 g":99, "820 g":160 }, priceFrom:99,
      url:"product-rizium.html",
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
      url:"product-rizium-cf.html",
      variants:{
        "500 g":"gid://shopify/ProductVariant/51025912922332",
        "820 g":"gid://shopify/ProductVariant/51025912955100"
      },
      note:(l)=> l+" spool · in stock"
    },
    "rizium-support": {
      id:"rizium-support", name:"Rizium Support", type:"filament",
      tagline:"Copolyester support material - compatible with all RIZIUM® filaments",
      prices:{ "500 g":75 }, priceFrom:75,
      url:"product-rizium-support.html",
      variants:{
        "500 g":"gid://shopify/ProductVariant/51025913053404"
      },
      note:null
    },
    ataru: {
      id:"ataru", name:"Ataru", type:"resin",
      tagline:"High-performance DLP resin · 300°C+ · low dielectric loss",
      prices:{ "1 L":693.00, "5 L":3316.00 }, priceFrom:693,
      url:"product-ataru.html",
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
      url:"product-ataru-cleaner.html",
      variants:{
        "1 L":"gid://shopify/ProductVariant/51025916559580",
        "5 L":"gid://shopify/ProductVariant/51025916592348"
      },
      note:(l)=> l + (l === "5 L" ? " · ships in one container" : "")
    }
  };
  window.AE_PRODUCTS = PRODUCTS;
  const money = n => "$"+Number(n).toFixed(2);

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
      if (coBtn) coBtn.disabled = !items.length;
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
    },
    closeCart(){
      const drawer = document.getElementById("aeCartDrawer");
      const overlay = document.getElementById("aeCartOverlay");
      if (!drawer || !overlay) return;
      drawer.classList.remove("open");
      overlay.classList.remove("show");
      drawer.setAttribute("aria-hidden","true");
      document.body.style.overflow = "";
      setTimeout(()=>{ if (!drawer.classList.contains("open")) overlay.hidden = true; }, 280);
    },
    checkout(){ if (_cart && _cart.checkoutUrl) window.location.href = _cart.checkoutUrl; }
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
        catch(err){ console.error(err); alert("Sorry — something went wrong adding to cart. Please try again."); }
        finally { addBtn.disabled = false; addBtn.innerHTML = original; }
      });
    }
    refresh();
  }

  /* ---- NAV + FOOTER + CART DRAWER MARKUP ---- */
  const NAV = [
    ["index.html","home","Home"],
    ["what-we-make.html","capabilities","Capabilities"],
    ["our-network.html","network","Our Network"],
    ["materials.html","materials","Materials"],
    ["about.html","about","About"],
    ["shop.html","shop","Shop"]
  ];
  function renderNav(active){
    const links = NAV.map(([href,key,txt])=>
      `<a href="${href}"${key===active?' class="active"':''}>${txt}</a>`).join("");
    return `<header><div class="wrap"><nav class="nav">
      <a class="brand" href="index.html">
        <b>ADDITIVE <i>EDGE</i></b>
      </a>
      <div class="nav-right">
        <div class="nav-links" id="navlinks">${links}</div>
        <a class="cart-btn" href="cart.html" aria-label="Cart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span class="cart-badge" id="cartBadge">0</span>
        </a>
        <a class="btn btn-primary" href="quote.html">Request a Print <span class="arr">&rarr;</span></a>
        <button class="hamb" id="hamb" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
    </nav></div></header>`;
  }
  function renderFooter(){
    return `<footer><div class="wrap">
      <div class="foot-grid">
        <div>
          <a class="brand" href="index.html" style="display:inline-flex">
            <b>ADDITIVE <i>EDGE</i></b>
          </a>
          <p>On-demand 3D-printed parts, produced in-house and across a vetted manufacturing network. Printer- and material-agnostic. Engineering-grade.</p>
        </div>
        <div class="foot-col"><h4>Explore</h4>
          <a href="what-we-make.html">Capabilities</a>
          <a href="our-network.html">Our Network</a>
          <a href="materials.html">Materials</a>
        </div>
        <div class="foot-col"><h4>Shop</h4>
          <a href="shop.html">All Materials</a>
          <a href="product-rizium.html">Rizium GF</a>
          <a href="product-rizium-cf.html">Rizium CF</a>
          <a href="product-rizium-support.html">Rizium Support</a>
          <a href="product-ataru.html">Ataru Resin</a>
        </div>
        <div class="foot-col"><h4>Contact</h4>
          <a href="mailto:david@additive-edge.com">david@additive-edge.com</a>
          <a href="tel:6173316266">617-331-6266</a>
          <a>Sharon, MA 02067</a>
          <a href="quote.html">Request a Print</a>
        </div>
      </div>
      <div class="foot-bottom">
        <span>&copy; 2026 ADDITIVE EDGE - ALL RIGHTS RESERVED</span>
        <span>ADDITIVE MANUFACTURING // IN-HOUSE + NETWORK</span>
      </div>
    </div></footer>`;
  }
  function renderCartDrawer(){
    return `<div id="aeCartOverlay" class="ae-cart-overlay" hidden></div>
    <aside id="aeCartDrawer" class="ae-cart-drawer" aria-hidden="true" aria-label="Cart">
      <div class="ae-cart-head"><h3>Your cart</h3><button id="aeCartClose" aria-label="Close cart">&times;</button></div>
      <div id="aeCartBody" class="ae-cart-body"></div>
      <div class="ae-cart-foot">
        <div class="ae-cart-subtotal"><span class="k">Subtotal</span><span class="v" id="aeCartSubtotal">$0.00</span></div>
        <button id="aeCartCheckout" class="btn btn-primary" disabled>Checkout <span class="arr">&rarr;</span></button>
        <p class="ae-cart-note">Shipping &amp; taxes calculated at checkout.</p>
      </div>
    </aside>`;
  }

  /* ---- INIT ---- */
  function init(){
    const active = document.body.getAttribute("data-page") || "";
    const navRoot = document.getElementById("nav-root");
    const footRoot = document.getElementById("footer-root");
    if(navRoot) navRoot.innerHTML = renderNav(active);
    if(footRoot) footRoot.innerHTML = renderFooter();

    /* inject + wire the shared cart drawer */
    document.body.insertAdjacentHTML("beforeend", renderCartDrawer());
    wireCartDrawer();

    const hamb = document.getElementById("hamb");
    if(hamb) hamb.addEventListener("click",()=>document.getElementById("navlinks").classList.toggle("open"));

    /* nav cart icon opens the drawer instead of navigating to a cart page */
    const cartBtn = document.querySelector(".cart-btn");
    if(cartBtn) cartBtn.addEventListener("click",(e)=>{ e.preventDefault(); AE.openCart(); });

    /* product page (declares itself via <body data-product="..."> ) */
    const productId = document.body.getAttribute("data-product");
    if(productId) initProductPage(productId);

    AE.badge();
    initReveal();

    /* load any existing Shopify cart, then refresh badge + drawer */
    AE.ensure().then(()=>AE.render()).catch(err=>console.error(err));

    /* allow ?cart=1 (e.g. legacy cart.html redirect) to open the drawer */
    if(/[?&]cart=1\b/.test(window.location.search)){
      AE.ensure().then(()=>{ AE.render(); AE.openCart(); }).catch(err=>console.error(err));
    }
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
          alert("Sorry — couldn't update the cart. Please try again.");
        } finally {
          body.classList.remove("busy");
        }
      });
    }
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
