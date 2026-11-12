# Additive Edge

Marketing and storefront website for **Additive Edge**, an on-demand additive manufacturing production hub (in-house production plus a vetted partner network) with a store selling the RIZIUM® line and Ataru materials.

Live at **https://additive-edge.com** (custom domain set in `CNAME`).

Static site: plain HTML, CSS and JavaScript. No build step, no dependencies.

## Structure

| File | Page |
|------|------|
| `index.html` | Home (linked as `./`) |
| `what-we-make.html` | Capabilities |
| `our-network.html` | Our Network |
| `about.html` | About |
| `resources.html` | Resources (placeholder, not in the sitemap yet) |
| `quote.html` | Request a quote (Web3Forms) |
| `partnerships.html` | Machine shop partner program (served at `/partnerships`) |
| `machine-shop-partnership.html` | Redirect to `/partnerships` (old URL, `noindex`) |
| `shop.html` | Store |
| `product-rizium.html` | Rizium GF product |
| `product-rizium-cf.html` | Rizium CF product |
| `product-rizium-support.html` | Rizium Support product |
| `product-ataru.html` | Ataru resin product |
| `product-ataru-cleaner.html` | Ataru Resin Cleaner product |
| `cart.html` | Redirect that opens the cart drawer on the shop page (`noindex`) |
| `styles.css` | Shared styles |
| `app.js` | Menu, cart drawer and sticky-bar behavior, Shopify cart, product catalog and GA4 events |
| `tools/build_chrome.py` | Source of the shared header (Google rating strip + menu) and footer; writes them into every page |
| `*.pdf` | Datasheets and safety data sheets |
| `og-image.png` | Social share image (1200 x 630). `og-image.svg` is the source. |
| `robots.txt`, `sitemap.xml` | Search engine files |

## Run locally
Serve the folder:
```
python3 -m http.server 8000
```
then visit http://localhost:8000/index.html (this simple server needs the `.html` ending; GitHub Pages serves the clean addresses like `/about`).

## Header and footer
The header (Google rating strip and menu) and the footer are plain HTML inside every page, so search engines see the phone number, address and links without JavaScript. Don't edit them page by page: change `tools/build_chrome.py` and run
```
python3 tools/build_chrome.py
```
It rewrites the block between `<div id="nav-root">` and `<!-- /nav-root -->` (and the same for `footer-root`) on every page and marks the current page in the menu.

## Deploy
GitHub Pages deploys from the `main` branch, root folder. Anything merged to `main` goes live right away, so make changes on a branch and open a pull request.

When `styles.css` or `app.js` changes, raise the `?v=` number on every page that loads it so browsers fetch the new file.

## Notes
- The cart is a slide-out drawer backed by the Shopify Storefront API. Checkout and payment happen on Shopify.
- Product catalog, display prices and Shopify variant IDs live in `PRODUCTS` in `app.js`. Shopify's prices are the ones charged at checkout. Product pages also carry `Product` schema prices, which must match `PRODUCTS`.
- Google Analytics 4 (`G-JXJV7S784T`) loads on every page. Events: `generate_lead` (quote and partnership forms), `add_to_cart`, `begin_checkout` and `file_download` (PDF links).
- Canonical domain is `https://additive-edge.com` (no `www`). Canonicals, Open Graph URLs and the sitemap all use it.
