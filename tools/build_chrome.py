"""Write the shared header (rating strip + menu) and footer into every page.

The header and footer live in the page HTML so search engines see the phone
number, address and links without running JavaScript. This script is the one
place to edit them. After changing anything below, run from the repo root:

    python tools/build_chrome.py

It rewrites the block between <div id="nav-root"> ... <!-- /nav-root --> and
<div id="footer-root"> ... <!-- /footer-root --> in each page, and marks the
current page's menu link as active (from <body data-page="...">).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PHONE_DISPLAY = "617-331-6266"
PHONE_HREF = "tel:+16173316266"
EMAIL = "david@additive-edge.com"
ADDRESS = "Sharon, MA 02067"

# Google rating strip. Update the score here if it ever changes.
GOOGLE_REVIEWS_URL = "https://share.google/D9OqPWWIksmOvs6bG"
GOOGLE_RATING = "5.0"

# Top menu: (href, data-page key, label). Resources is hidden until the page has content.
NAV = [
    ("./", "home", "Home"),
    ("what-we-make", "capabilities", "Capabilities"),
    ("our-network", "network", "Our Network"),
    ("about", "about", "About"),
    # ("resources", "resources", "Resources"),
    ("shop", "shop", "Shop"),
    ("faq", "faq", "FAQ"),
]

PHONE_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
MAIL_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'
CART_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'
STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>'
GOOGLE_G_SVG = '<svg class="rate-strip-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>'


def header(active):
    current = ' class="active" aria-current="page"'
    links = "".join(
        f'<a href="{href}"{current if key == active else ""}>{label}</a>'
        for href, key, label in NAV
    )
    return f"""
<a class="rate-strip" id="rateStrip" href="{GOOGLE_REVIEWS_URL}" target="_blank" rel="noopener" aria-label="Rated {GOOGLE_RATING} out of 5 on Google. Read our reviews.">
  <span class="wrap rate-strip-in">
    {GOOGLE_G_SVG}
    <span class="rate-strip-stars" aria-hidden="true">{STAR_SVG * 5}</span>
    <span class="rate-strip-txt">Rated <b>{GOOGLE_RATING}</b> on Google</span>
    <span class="rate-strip-sep" aria-hidden="true"></span>
    <span class="rate-strip-more">Read our reviews <span aria-hidden="true">&rarr;</span></span>
    <span class="rate-strip-arr" aria-hidden="true">&rarr;</span>
  </span>
</a>
<header><div class="wrap"><nav class="nav" aria-label="Main">
  <a class="brand" href="./" aria-label="Additive Edge home"><b>ADDITIVE <i>EDGE</i></b></a>
  <div class="nav-right">
    <div class="nav-links" id="navlinks">{links}
      <div class="nav-menu-cta">
        <a class="btn btn-ghost" href="{PHONE_HREF}" data-call="menu">{PHONE_SVG} Call {PHONE_DISPLAY}</a>
        <a class="btn btn-primary" href="quote">Get a quote <span class="arr">&rarr;</span></a>
      </div>
    </div>
    <a class="nav-call" href="{PHONE_HREF}" data-call="header">{PHONE_SVG}<span>{PHONE_DISPLAY}</span></a>
    <a class="nav-call-icon" href="{PHONE_HREF}" data-call="header" aria-label="Call Additive Edge">{PHONE_SVG}</a>
    <a class="cart-btn" href="cart" aria-label="Cart">{CART_SVG}<span class="cart-badge" id="cartBadge">0</span></a>
    <a class="btn btn-primary" href="quote">Get a quote <span class="arr">&rarr;</span></a>
    <button class="hamb" id="hamb" type="button" aria-label="Menu" aria-expanded="false" aria-controls="navlinks"><span></span><span></span><span></span></button>
  </div>
</nav></div></header>
"""


def footer():
    return f"""
<footer><div class="wrap">
  <div class="foot-grid">
    <div>
      <a class="brand" href="./" style="display:inline-flex"><b>ADDITIVE <i>EDGE</i></b></a>
      <p>On-demand 3D printed parts, produced in-house and across a vetted manufacturing network.</p>
    </div>
    <div class="foot-col"><h4>Explore</h4>
      <a href="what-we-make">Capabilities</a>
      <a href="our-network">Our Network</a>
      <a href="about">About</a>
      <a href="partnerships">Partner Program</a>
      <a href="faq">FAQ</a>
    </div>
    <div class="foot-col"><h4>Shop</h4>
      <a href="shop">All Materials</a>
      <a href="product-rizium">Rizium GF</a>
      <a href="product-rizium-cf">Rizium CF</a>
      <a href="product-rizium-support">Rizium Support</a>
      <a href="product-ataru">Ataru Resin</a>
      <a href="product-ataru-cleaner">Ataru Resin Cleaner</a>
    </div>
    <div class="foot-col"><h4>Contact</h4>
      <a href="mailto:{EMAIL}">{EMAIL}</a>
      <a href="{PHONE_HREF}" data-call="footer">{PHONE_DISPLAY}</a>
      <span class="foot-addr">{ADDRESS}</span>
      <a href="quote">Get a quote</a>
    </div>
  </div>
  <div class="foot-bottom">
    <span>&copy; 2026 Additive Edge. All rights reserved.</span>
    <span>Additive manufacturing, in-house and across our network</span>
  </div>
  <div class="foot-m">
    <div class="foot-m-brand">
      <a class="brand" href="./"><b>ADDITIVE <i>EDGE</i></b></a>
      <p>3D printing service · {ADDRESS}</p>
    </div>
    <div class="foot-m-contact">
      <a class="foot-m-btn" href="mailto:{EMAIL}">{MAIL_SVG} Email us</a>
      <a class="foot-m-btn" href="{PHONE_HREF}" data-call="footer">{PHONE_SVG} {PHONE_DISPLAY}</a>
    </div>
    <nav class="foot-m-links" aria-label="Footer">
      <a href="what-we-make">Capabilities</a>
      <a href="shop">Shop materials</a>
      <a href="our-network">Our Network</a>
      <a href="partnerships">Partner program</a>
      <a href="about">About</a>
      <a href="faq">FAQ</a>
      <a href="quote">Get a quote</a>
    </nav>
    <div class="foot-m-legal">&copy; 2026 Additive Edge</div>
  </div>
</div></footer>
"""


NAV_RE = re.compile(r'<div id="nav-root">(?:</div>|.*?</div><!-- /nav-root -->)', re.S)
FOOT_RE = re.compile(r'<div id="footer-root">(?:</div>|.*?</div><!-- /footer-root -->)', re.S)
NOSCRIPT_NAV_RE = re.compile(r'<noscript><nav [^\n]*?</nav></noscript>\r?\n')
PAGE_RE = re.compile(r'<body[^>]*\bdata-page="([^"]*)"')


def main():
    changed = 0
    for page in sorted(ROOT.glob("*.html")):
        text = page.read_bytes().decode("utf-8")
        if 'id="nav-root"' not in text:
            continue
        m = PAGE_RE.search(text)
        active = m.group(1) if m else ""
        eol = "\r\n" if "\r\n" in text else "\n"
        head_html = f'<div id="nav-root">{header(active)}</div><!-- /nav-root -->'.replace("\n", eol)
        foot_html = f'<div id="footer-root">{footer()}</div><!-- /footer-root -->'.replace("\n", eol)
        new = NAV_RE.sub(lambda _: head_html, text, count=1)
        new = FOOT_RE.sub(lambda _: foot_html, new, count=1)
        new = NOSCRIPT_NAV_RE.sub("", new)  # the real menu is in the HTML now
        if new != text:
            page.write_bytes(new.encode("utf-8"))
            changed += 1
            print(f"updated {page.name} (active: {active or '-'})")
    print(f"{changed} page(s) updated")


if __name__ == "__main__":
    sys.exit(main())
