"""Copy "Common questions" blocks from faq.html onto other pages.

    python tools/build_common_questions.py

faq.html is the single source for every question and answer. This script copies
the chosen questions, word for word, into a block on each page listed in PAGES,
between <!-- common-questions --> and <!-- /common-questions -->. Edit an answer
in faq.html (and its FAQPage JSON-LD), then run this script again.

The block goes right before the closing call-to-action band, or at the end of
<main> when the page has none. These pages carry no FAQPage structured data;
each block links to the full FAQ instead.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# page: (FAQ section id, [question ids]), 4 to 6 questions each
PAGES = {
    "index.html": ("service", [
        "what-does-additive-edge-do",
        "where-is-additive-edge-located-and-what-areas-do-you-serve",
        "is-additive-edge-a-3d-printing-shop-or-a-broker",
        "why-use-a-3d-printing-network-instead-of-a-single-print-shop",
    ]),
    "quote.html": ("quotes", [
        "how-much-does-3d-printing-cost",
        "is-there-a-minimum-order-quantity-or-minimum-order-value",
        "how-long-does-3d-printing-take-what-are-your-lead-times",
        "do-you-offer-rush-or-expedited-3d-printing",
        "what-file-formats-do-you-accept",
        "will-you-sign-an-nda",
    ]),
    "what-we-make.html": ("processes", [
        "do-you-offer-metal-3d-printing",
        "what-materials-can-you-3d-print",
        "can-you-3d-print-peek-pekk-or-ultem",
        "what-is-the-difference-between-sls-and-mjf",
        "do-you-help-with-design-for-additive-manufacturing-dfam",
        "do-you-inspect-parts-before-they-ship",
    ]),
    "product-rizium.html": ("rizium", [
        "does-rizium-filament-need-to-be-dried-before-printing",
        "what-is-the-difference-between-rizium-gf-and-rizium-cf",
        "what-printer-do-i-need-for-rizium-gf-or-rizium-cf",
        "does-rizium-need-an-enclosure-and-which-bed-surface-works-be",
        "is-rizium-safe-to-print-indoors",
        "when-should-i-not-use-rizium",
    ]),
    "product-rizium-cf.html": ("rizium", [
        "what-is-the-difference-between-rizium-gf-and-rizium-cf",
        "is-rizium-a-good-alternative-to-nylon-or-carbon-fiber-nylon",
        "what-is-rizium-filament-best-used-for",
        "is-rizium-good-for-cold-or-outdoor-environments",
        "what-printer-do-i-need-for-rizium-gf-or-rizium-cf",
        "can-you-print-my-part-in-rizium-for-me",
    ]),
    "product-ataru.html": ("ataru", [
        "what-3d-printing-resin-can-withstand-300-c",
        "what-post-cure-does-ataru-resin-need",
        "is-ataru-resin-good-for-rf-and-high-frequency-parts",
        "which-printers-work-with-ataru-resin",
        "what-are-the-mechanical-properties-of-ataru-resin",
        "how-do-i-clean-ataru-prints",
    ]),
    "shop.html": ("shop", [
        "where-does-the-additive-edge-shop-ship",
        "how-long-does-a-shop-order-take-to-ship",
        "what-is-your-return-policy-for-shop-materials",
        "are-data-sheets-and-safety-data-sheets-available",
    ]),
    "partnerships.html": ("partners", [
        "how-much-does-it-cost-a-machine-shop-to-join",
        "how-does-pricing-work-for-partners",
        "will-my-customer-know-additive-edge-made-the-part",
        "what-kinds-of-jobs-do-machine-shops-send-to-additive-edge",
        "can-partners-get-an-nda",
    ]),
}

BLOCK_RE = re.compile(r'[ \t]*<!-- common-questions -->.*?<!-- /common-questions -->\r?\n\r?\n?', re.S)


def load_faq():
    t = (ROOT / "faq.html").read_text("utf-8")
    groups, items = {}, {}
    for g in re.finditer(r'<section class="faq-group" id="([^"]+)".*?<h2[^>]*>(.*?)</h2>(.*?)</section>', t, re.S):
        groups[g.group(1)] = g.group(2)
        for m in re.finditer(r'<details class="faq-item" id="([^"]+)">.*?</details>', g.group(3), re.S):
            items[m.group(1)] = m.group(0)
    return groups, items, len(items)


def block(title, ids, items, group, total, panel):
    bg = ' style="background:var(--panel)"' if panel else ""
    rows = []
    for i in ids:
        if i not in items:
            raise SystemExit(f"question id not in faq.html: {i}")
        rows.append("        " + re.sub(r"\n\s*", "\n          ", items[i]).replace("\n          </details>", "\n        </details>"))
    return (
        f'  <!-- common-questions -->\n'
        f'  <section class="cq" aria-labelledby="cq-h"{bg}>\n'
        f'    <div class="wrap cq-grid">\n'
        f'      <div class="sec-head">\n'
        f'        <span class="label">Common questions</span>\n'
        f'        <h2 id="cq-h">{title}</h2>\n'
        f'        <a class="cq-more" href="faq#{group}">See all {total} answers in the FAQ <span class="arr">&rarr;</span></a>\n'
        f'      </div>\n'
        f'      <div class="faq-list">\n'
        + "\n".join(rows) + "\n"
        f'      </div>\n'
        f'    </div>\n'
        f'  </section>\n'
        f'  <!-- /common-questions -->\n\n'
    )


def main():
    groups, items, total = load_faq()
    for name, (group, ids) in PAGES.items():
        f = ROOT / name
        raw = f.read_bytes().decode("utf-8")
        eol = "\r\n" if "\r\n" in raw else "\n"
        t = BLOCK_RE.sub("", raw.replace("\r\n", "\n"))
        main_start, main_end = t.find("<main"), t.find("</main>")
        cta = t.find('  <section class="ctaband">', main_start, main_end)
        at = cta if cta != -1 else main_end
        prev = t.rfind("<section", main_start, at)
        prev_tag = t[prev:t.find(">", prev)] if prev != -1 else ""
        panel = "--panel" not in prev_tag
        new = t[:at] + block(groups[group], ids, items, group, total, panel) + t[at:]
        new = new.replace("\n", eol)
        if new != raw:
            f.write_bytes(new.encode("utf-8"))
            print("updated", name, f"({len(ids)} questions, {'panel' if panel else 'plain'})")
    print("done")


if __name__ == "__main__":
    main()
