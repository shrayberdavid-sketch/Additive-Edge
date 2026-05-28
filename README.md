# Additive Edge

Marketing + storefront website for **Additive Edge** — an on-demand additive manufacturing production hub (in-house production + a vetted partner network) with a store selling the RIZIUM® line and Ataru materials.

Static site — plain HTML, CSS, and JavaScript. No build step, no dependencies.

## Structure

| File | Page |
|------|------|
| `index.html` | Home |
| `what-we-make.html` | Capabilities |
| `our-network.html` | Our Network |
| `materials.html` | Materials overview |
| `shop.html` | Store |
| `product-rizium.html` | Rizium GF product |
| `product-rizium-cf.html` | Rizium CF product |
| `product-ataru.html` | Ataru product |
| `cart.html` | Cart |
| `industries.html` | Industries |
| `about.html` | About |
| `quote.html` | Get a Quote |
| `styles.css` | Shared styles |
| `app.js` | Shared nav/footer + cart logic + product catalog |
| `Rizium_GF.pdf`, `Rizium_CF.pdf` | Downloadable datasheets |

## Run locally
Open `index.html` in a browser, or serve the folder:
```
python3 -m http.server 8000
```
then visit http://localhost:8000

## Deploy with GitHub Pages
1. Push these files to the repo (root level).
2. Repo **Settings → Pages**.
3. Source: **Deploy from a branch**, branch **main**, folder **/(root)**.
4. Save. The site publishes at `https://shrayberdavid-sketch.github.io/Additive-Edge/`.

## Notes
- The cart is a front-end preview (uses browser storage). It calculates items and totals but does **not** process payments. To take real orders, connect a checkout (Wix Stores, Snipcart, or Stripe).
- Rizium pricing is live: 500 g = $99, 820 g = $160 (set in `app.js`).
- Ataru pricing is now set to $693 in `app.js`, `product-ataru.html`, `shop.html`, `index.html`, and `materials.html`.
- Product catalog and prices live in `app.js` (`PRODUCTS`).
