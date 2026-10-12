# Open decisions: for the operator and for Cape Cod Cannabis

Started 2026-10-12 and kept current through the build. Each item says what the rebuild does until someone decides.
Evidence for every item is in the doc named in its row.

## A. For the operator (blocking parts of the build)

| # | Decision | Until decided | Evidence |
|---|---|---|---|
| A1 | **The firewall lockout.** The live site refused this machine (IP 152.32.99.153) from 2026-10-12 00:44:20Z, after the crawl followed 20 of the site's own dead links. Either the client allowlists the IP (WP Defender: Firewall, IP Banning, Allowlist, then clear it from Lockouts), or you confirm you are authorized by the site owner to resume. | Product pages are built from the site's own HTML sitemap: all 5,857 URLs and titles, a brand link, "from the product name" chips and a hand-off to the live menu. They carry NO prices, photos or descriptions, except the one product captured before the lockout. There is no live computed-style capture, so gate check C09 is unprovable. 161 non-sitemap URLs were refused; 131 of them, the tag archives, are rebuilt from the posts. | `docs/BUILD-NOTES.md` 1.4, `docs/COMMERCE.md` section 8 |
| A2 | **Preview publishing:** a public GitHub repo plus a noindex GitHub Pages preview (as on earlier redesigns), or local only. | **Decided 2026-10-12 18:10 by the operator; published 2026-10-13.** Repo: https://github.com/mikko-creator/capecodcannabis-redesign (public, branch master). Preview: https://mikko-creator.github.io/capecodcannabis-redesign/ (branch gh-pages, built by tools/make-preview.mjs: noindex, nofollow on all 6,733 pages, .nojekyll). Secret scans before each push: the repo publish set and every past commit, the preview copy, and the handoff zip, all 0 hits with controls firing. | Operator message, 2026-10-12 18:10 |
| A3 | **Media budget:** generated stills and loops are capped at $15 (fal plus Higgsfield). | The cap stands. | `audit/generated-images.json` |
| A4 | **Search indexing of the 5,856 Plan B product pages.** Each carries only the title, brand link, chips and a hand-off (no price, photo or description). Keep them indexable, as the live product URLs are, or mark them noindex until full product data exists (Plan A)? | Indexable, mirroring the live site's robots (and t1's). | `docs/PIPELINE-SITE.md`; `tmp/pipe-site/site-lane-result.json` (risks) |

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
| B9 | Copy hidden at every screen size on the live site (a second FAQ on 7 category pages, "Shop By Category" on effect and strain pages, a bundles note on /specials/, and the announcement bar "Boards in the Stores is back for 2026 and bidding is now open! Click here to bid or learn more!"): show it or delete it? | COMMERCE 1.8; BUILD-CONTRACT 4.17.2 |

### Links and assets
| # | Item | The rebuild | Evidence |
|---|---|---|---|
| B10 | 20 dead internal links on the live site (they likely tripped the firewall). 8 have an obvious live target, and 8 expired /offers/ promotions point to /specials/. | Retargeted as DECLARED changes; anchor text kept. | BUILD-CONTRACT 4.13, FACTS-EVIDENCE |
| B11 | Dead links with no obvious target: /our-team ("Learn More" on About), /categories/concentrates/hash, /categories/clones, /brands/perpetual-harvest. | Text kept, link removed. | FACTS-EVIDENCE |
| B12 | A vector logo master (SVG, AI or EPS). The largest file is a 700x568 lossy WebP. | The sign is shown at 350 CSS px or less. | BRAND-SYSTEM section 1 |
| B13 | The machine-translation widget (GTranslate). | Removed with the platform runtime; it can be restored. | BUILD-CONTRACT 4.8 |
| B14 | Reviews are frozen at the capture date (4.9, 967); avatars are not mirrored. | The capture date is shown; initials replace avatars. | COMPLIANCE section 8 |
| B15 | Online ordering, cart, checkout, order history and points need the Joint Commerce or Dutchie integration at launch. | Preview-only bag ("orders are not sent"). | COMMERCE section 8 |
| B16 | The licence number "#MR282685" and the four legal links (Privacy Policy, Terms Of Use, Return Policy, Disclaimer) are on every page with the footer (741 of 743) but not on `/links/`, the link-in-bio page. Should every rebuilt page show them? | `/links/` is rebuilt as it is live (no licence line, no legal links) and flagged. | COMPLIANCE section 4.3; `facts/client-facts.json` licences[0] |
| B17 | Where was the lighthouse photo (`13096766-CCC-Beach-Team.webp`, the age-gate backdrop) taken, and is it a stock photo? The file has no caption, EXIF or XMP. | It stays only as the age-gate backdrop it already is. It is not used as a Cape Cod cut-out or as Cape Cod scenery. | BRAND-SYSTEM Direction A; IMAGE-INVENTORY section 14 |
| B18 | **Broken images on the live site.** 12 uploads named `*.jpeg.jpeg` return 404 from the site's own image CDN: 3 on /categories/edibles/, 3 on /categories/pre-rolls/, 2 on /categories/tinctures/, 3 on /categories/vaporizers/ and 1 on /specials/. Replace or remove them? | An empty frame that keeps the alt text, declared in the ledger. | `audit/failures.json` (assets:image, status 404); BUILD-CONTRACT 4.15.5 |
| B19 | **Files the lockout kept from us:** 19 video and audio files hosted on the site itself, the 4 "Loyalty VIP" banners on /shop-your-loyalty-points/ (the CDN redirects them to the blocked origin), `american-flag.avif` on /2025/06/17/, and the Levia seltzer image (levia.buzz answered 403). Supply the files, or allowlist us (A1). | Player or image omitted, the surrounding copy kept, each declared in the ledger. | `audit/late-images.json`; `audit/failures.json`; BUILD-CONTRACT 4.15.5-6 |
| B20 | **The hero kayaker.** The Uncle Tim's Bridge photo (the client's own, from a blog post) shows a small kayaker, seen from behind, at about 1% of the frame. The rebuild's compliance plan bars anyone who looks under 21 (COMPLIANCE R3); this figure's age cannot be judged either way. Keep it, or crop it out? | Kept uncropped. A crop is a one-line change. | BUILD-CONTRACT 4.17.6; DESIGN-SPEC 13.2 item 6 |
| B21 | **New disclosure copy**, for the client and counsel: the footer note "Some images on this site are AI-generated illustrations. They are not photos of our store, staff, customers or products.", the "AI illustration" tag on generated place and product images, and the footer line repeating the age gate's "*Must be 21+ with a VALID ID." on every page. | All three are shown, declared as added microcopy. | BUILD-CONTRACT 4.17.4; DESIGN-SPEC 13.2 item 4 |
| B22 | **Brand photography for the Wana, Mindy's and Kanha gummies tiles.** The rebuild gives them no generated imagery, so nothing passes as those brands' products. | Plain glass cards with the transcribed labels. | BUILD-CONTRACT 4.17.5 |

## Verification log (fixer lane, 2026-10-12)

| # | Change | Evidence |
|---|---|---|
| 1 | Added B16 (licence and legal links missing on `/links/`) | `tmp/understand/fixer/fixcheck.mjs` sections J and G8: `links.html` has 0 "MR282685" and 0 legal hrefs; footer template 1996 is on 741 of 743 files |
| 2 | Added B17 (lighthouse photo location) | `tmp/understand/fixer/follow2.mjs` (e): WebP chunks VP8X, ICCP, VP8, PSAI, with no EXIF or XMP; IMAGE-INVENTORY already marked the location UNVERIFIED |
