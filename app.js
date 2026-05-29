/* ============ ADDITIVE EDGE - APP.JS ============ */
(function(){
  "use strict";

  /* ---- PRODUCT CATALOG ----
     NOTE: prices are PLACEHOLDERS - replace `price` values with real pricing. */
  const PRODUCTS = {
    "rizium-gf": {
      id:"rizium-gf", name:"Rizium GF", type:"filament",
      tagline:"Glass-fiber-reinforced COC engineering filament",
      prices:{ "500 g":99, "820 g":160 }, priceFrom:99,
      url:"product-rizium.html"
    },
    "rizium-cf": {
      id:"rizium-cf", name:"Rizium CF", type:"filament",
      tagline:"Carbon-fiber-reinforced COC engineering filament",
      prices:{ "500 g":99, "820 g":160 }, priceFrom:99,
      url:"product-rizium-cf.html"
    },
    ataru: {
      id:"ataru", name:"Ataru", type:"resin",
      tagline:"High-performance DLP resin · 300°C+ · low dielectric loss",
      prices:{ "1 L":693.00, "5 L":3315.79 }, priceFrom:693,
      url:"product-ataru.html"
    },
    "ataru-cleaner": {
      id:"ataru-cleaner", name:"Ataru Resin Cleaner", type:"cleaner",
      tagline:"Post-print resin wash formulated for Ataru DLP resin",
      prices:{ "1 L":24.00, "5 L":99.00 }, priceFrom:24,
      url:"product-ataru-cleaner.html"
    }
  };
  window.AE_PRODUCTS = PRODUCTS;
  const money = n => "$"+Number(n).toFixed(2);

  /* ---- CART (localStorage w/ in-memory fallback) ---- */
  let mem = [];
  const store = {
    read(){ try{ return JSON.parse(localStorage.getItem("ae_cart")||"[]"); }catch(e){ return mem; } },
    write(c){ try{ localStorage.setItem("ae_cart", JSON.stringify(c)); }catch(e){ mem = c; } }
  };
  const AE = {
    cart(){ return store.read(); },
    count(){ return this.cart().reduce((s,i)=>s+i.qty,0); },
    total(){ return this.cart().reduce((s,i)=>s+i.qty*i.price,0); },
    key(id,variant){ return id+"|"+variant; },
    add(id, variant, qty, price, name){
      const c = this.cart(); const k = this.key(id,variant);
      const ex = c.find(i=>this.key(i.id,i.variant)===k);
      if(ex){ ex.qty += qty; } else { c.push({id,variant,qty,price,name}); }
      store.write(c); this.badge();
    },
    setQty(k, qty){
      let c = this.cart();
      c = c.map(i=>this.key(i.id,i.variant)===k?{...i,qty:Math.max(1,qty)}:i);
      store.write(c); this.badge();
    },
    remove(k){
      const c = this.cart().filter(i=>this.key(i.id,i.variant)!==k);
      store.write(c); this.badge();
    },
    badge(){
      const b = document.getElementById("cartBadge");
      if(!b) return; const n = this.count();
      b.textContent = n; b.classList.toggle("show", n>0);
    }
  };
  window.AE = AE;

  /* ---- NAV + FOOTER MARKUP ---- */
  const NAV = [
    ["index.html","home","Home"],
    ["what-we-make.html","capabilities","What We Make"],
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
        <span class="mark"><span></span><span></span><span></span></span>
        <b>ADDITIVE<i>EDGE</i></b>
      </a>
      <div class="nav-right">
        <div class="nav-links" id="navlinks">${links}</div>
        <a class="cart-btn" href="cart.html" aria-label="Cart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span class="cart-badge" id="cartBadge">0</span>
        </a>
        <a class="btn btn-primary" href="quote.html">Get a Quote <span class="arr">&rarr;</span></a>
        <button class="hamb" id="hamb" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
    </nav></div></header>`;
  }
  function renderFooter(){
    return `<footer><div class="wrap">
      <div class="foot-grid">
        <div>
          <a class="brand" href="index.html" style="display:inline-flex">
            <span class="mark"><span></span><span></span><span></span></span>
            <b>ADDITIVE<i>EDGE</i></b>
          </a>
          <p>On-demand 3D-printed parts, produced in-house and across a vetted manufacturing network. Printer- and material-agnostic. Engineering-grade.</p>
        </div>
        <div class="foot-col"><h4>Explore</h4>
          <a href="what-we-make.html">What We Make</a>
          <a href="our-network.html">Our Network</a>
          <a href="materials.html">Materials</a>
        </div>
        <div class="foot-col"><h4>Shop</h4>
          <a href="shop.html">All Materials</a>
          <a href="product-rizium.html">Rizium GF</a>
          <a href="product-rizium-cf.html">Rizium CF</a>
          <a href="product-ataru.html">Ataru Resin</a>
        </div>
        <div class="foot-col"><h4>Contact</h4>
          <a href="mailto:david@additive-edge.com">david@additive-edge.com</a>
          <a href="tel:6173316266">617-331-6266</a>
          <a>Sharon, MA 02067</a>
          <a href="quote.html">Get a Quote</a>
        </div>
      </div>
      <div class="foot-bottom">
        <span>&copy; 2026 ADDITIVE EDGE - ALL RIGHTS RESERVED</span>
        <span>ADDITIVE MANUFACTURING // IN-HOUSE + NETWORK</span>
      </div>
    </div></footer>`;
  }

  /* ---- INIT ---- */
  function init(){
    const active = document.body.getAttribute("data-page") || "";
    const navRoot = document.getElementById("nav-root");
    const footRoot = document.getElementById("footer-root");
    if(navRoot) navRoot.innerHTML = renderNav(active);
    if(footRoot) footRoot.innerHTML = renderFooter();

    const hamb = document.getElementById("hamb");
    if(hamb) hamb.addEventListener("click",()=>document.getElementById("navlinks").classList.toggle("open"));

    AE.badge();
    initReveal();
    buildStack();
  }

  function initReveal(){
    const els = document.querySelectorAll(".reveal");
    if(!("IntersectionObserver" in window)){ els.forEach(e=>e.classList.add("in")); return; }
    const io = new IntersectionObserver((ents)=>{
      ents.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target);} });
    },{threshold:.12});
    els.forEach(e=>io.observe(e));
  }

  function buildStack(){
    const stack = document.getElementById("stack");
    if(!stack) return;
    const n=9;
    for(let i=0;i<n;i++){
      const d=document.createElement("div"); d.className="layer";
      const s=1-Math.abs(i-n/2)/(n*1.1); const sz=70+s*70;
      d.style.setProperty("--z",((i-n/2)*16)+"px");
      d.style.animationDelay=(i*0.18)+"s";
      d.style.width=sz+"px"; d.style.height=sz+"px";
      d.style.left=(-sz/2)+"px"; d.style.top=(-sz/2)+"px";
      stack.appendChild(d);
    }
  }

  window.AE_money = money;
  document.addEventListener("DOMContentLoaded", init);
})();
