# Open decisions: for the operator and for Cape Cod Cannabis

Started 2026-10-12 and kept current through the build. Each item says what the rebuild does until someone decides.
Evidence for every item is in the doc named in its row.

## A. For the operator (blocking parts of the build)

| # | Decision | Until decided | Evidence |
|---|---|---|---|
| A1 | **The firewall lockout.** The live site refused this machine (IP 152.32.99.153) from 2026-10-12 00:44:20Z, after the crawl followed 20 of the site's own dead links. Either the client allowlists the IP (WP Defender: Firewall, IP Banning, Allowlist, then clear it from Lockouts), or you confirm you are authorized by the site owner to resume. | Product pages are built from the site's own HTML sitemap: all 5,857 URLs and titles, a brand link, "from the product name" chips and a hand-off to the live menu. They carry NO prices, photos or descriptions, except the one product captured before the lockout. There is no live computed-style capture, so gate check C09 is unprovable. 161 non-sitemap URLs were refused; 131 of them, the tag archives, are rebuilt from the posts. | `docs/BUILD-NOTES.md` 1.4, `docs/COMMERCE.md` section 8 |
| A2 | **Preview publishing:** a public GitHub repo plus a noindex GitHub Pages preview (as on earlier redesigns), or local only. | Local only. | |
| A3 | **Media budget:** generated stills and loops are capped at $15 (fal plus Higgsfield). | The cap stands. | `audit/generated-images.json` |

## B. For the client (the rebuild keeps the live wording until they decide)

### Facts that conflict on the live site
| # | Topic | The conflict | The rebuild | Evidence |
|---|---|---|---|---|
| B1 | Founding year | Logo "EST. 2018" and About "Established 2018" vs "Since 2021" / "Open Since 2021". | Each line is printed exactly as on its page. | FACTS-EVIDENCE C1 |
| B2 | Payment methods | "cash, debit cards and CanPay" vs "cash and debit" vs JSON-LD "Cash". | The visible sentences are kept verbatim. | FACTS-EVIDENCE C2, COMMERCE 1.6 |
| B3 | Purchase limit | The visible copy says 2 oz / 56 g (23 pages); the FAQ markup says 1 oz / 28 g. | The visible copy is kept and the stale markup dropped. | FACTS-EVIDENCE C3 |
| B4 | Legal entity name | Not printed anywhere. | None is stated. | FACTS-EVIDENCE |

### Content and compliance flags (copy kept verbatim; nothing new added)
| # | Item | Evidence |
|---|---|---|
| B5 | Health or therapeutic statements in existing copy (product descriptions "May Relieve: ...", terpene and cannabinoid "Entourage" lists, blog posts on sleep, pain and anxiety): a review for 935 CMR 500.105(4)(b)7. | COMPLIANCE section 5 |
| B6 | Promotional language ("Daily Offers", "Sale", "% off" on 7 pages, MOONROCK MONDAY, $12 TUESDAY): for counsel under the 2026-09-25 CCC bulletin. The rebuild adds no deal UI and no strike-through prices. | COMPLIANCE section 6 |
| B7 | Self-claims ("Top Rated", "Best Dispensary on Cape Cod", "largest selection and best prices", "Wellfleet's first dispensary"): substantiation. | COMPLIANCE section 7 |
| B8 | Markup not carried: the personal staff e-mail in the home JSON-LD; Joint's alternateName "Medical Marijuana Dispensary" (the store is adult-use only). | COMPLIANCE section 9 |
| B9 | Copy hidden at every screen size on the live site (a second FAQ on 7 category pages, "Shop By Category" on effect and strain pages, a bundles note on /specials/): show it or delete it? | COMMERCE 1.8 |

### Links and assets
| # | Item | The rebuild | Evidence |
|---|---|---|---|
| B10 | 20 dead internal links on the live site (they likely tripped the firewall). 8 have an obvious live target, and 8 expired /offers/ promotions point to /specials/. | Retargeted as DECLARED changes; anchor text kept. | BUILD-CONTRACT 4.13, FACTS-EVIDENCE |
| B11 | Dead links with no obvious target: /our-team ("Learn More" on About), /categories/concentrates/hash, /categories/clones, /brands/perpetual-harvest. | Text kept, link removed. | FACTS-EVIDENCE |
| B12 | A vector logo master (SVG, AI or EPS). The largest file is a 700x568 lossy WebP. | The sign is shown at 350 CSS px or less. | BRAND-SYSTEM section 1 |
| B13 | The machine-translation widget (GTranslate). | Removed with the platform runtime; it can be restored. | BUILD-CONTRACT 4.8 |
| B14 | Reviews are frozen at the capture date (4.9, 967); avatars are not mirrored. | The capture date is shown; initials replace avatars. | COMPLIANCE section 8 |
| B15 | Online ordering, cart, checkout, order history and points need the Joint Commerce or Dutchie integration at launch. | Preview-only bag ("orders are not sent"). | COMMERCE section 8 |
