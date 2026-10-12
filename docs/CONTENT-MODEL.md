# Content model and extraction spec: capecodcannabis.com

UNDERSTAND phase, content lane. Written 2026-10-12. Machine-readable twin: `audit/understand/content-model.json`.
Evidence, scripts and outputs: `tmp/understand/content/`. Every number below comes from a script there. No request was made to
capecodcannabis.com or any other host.

## What a designer or builder must know first

1. **All the editorial copy is in the static HTML.** The prototype extractor recovered **219,872 of 220,073 visible words
   (99.909%)** across all 743 raw files without running a script (`batch-recall.json`). sr-extract flagged 580 pages as
   "possibly JS-rendered", and all 580 flags have the same reason: inline script bytes are more than 8x the body text.
   That measures script weight, not empty pages. Only commerce data is client-rendered: product rails and grids, the
   cart, checkout, account pages and search (section 8).
2. **"Hidden" text is a bigger issue than device duplicates.** In the page region, **6,379 words sit in elements hidden
   on every device** (all six `elementor-hidden-*` classes) on 64 pages. In 4,447 of those words, the line appears
   nowhere visible. In the header and footer it is about 116 words per page. Examples: the "Boards in the Stores"
   announcement ticker, a second hours list, a loyalty heading and the OneSignal prompt. Real mobile-only text is tiny:
   **207 words on 13 pages**. The rule in section 4 handles both cases. Hidden-everywhere copy is declared in a ledger
   and not rendered. **The 6,379 / 64-page baseline is not yet independently reproduced** (section 4,
   "Ledger reconciliation"): a div-only re-derivation gives 5,051 words on 48 pages, mostly because it skips hidden
   `<section>` blocks. Reconcile before any parity deficit is declared from this ledger.
3. **The home page does not have desktop/mobile twins.** The repeated feature headings ("Google Reviews", "🅿️ Easy
   Parking", "Earn Rewards with Our Free VIP Program!" and others) appear twice because container `f6c0f7e` is hidden
   on every device and duplicates the visible container `3d04197`. The home **H1 and its 130-word intro (`6b8afef`)
   and the 110-word "Cape Cod Cannabis Dispensary in Wellfleet, MA" block (`2f8428b`) are visible only at 1027px and
   wider.** Below that width the live site has no H1 and no replacement copy. The redesign should show both blocks
   everywhere: no words are lost, and mobile gains its H1.
4. **The live site contradicts itself on one page, so a decision is needed.** On `/daily-purchase-limit-in-ma/`,
   desktop says *"Understanding the 56-Gram Daily Limit / The state now allows you to purchase 56 grams…"* and
   tablet/mobile says *"Understanding the 28-Gram Daily Limit / The state allows you to purchase 28 grams…"*. Both are
   kept in the extraction. The operator must choose one. Which figure is current law is UNVERIFIED.
5. **Two raw files are wrong on disk.** On case-insensitive NTFS, `categories-CBD.html` overwrote `categories-cbd.html`
   and `categories-Seeds.html` overwrote `categories-seeds.html`. The files on disk carry the sha256 recorded for
   `/categories/CBD/` and `/categories/Seeds/` in `site-inventory.json`, so the lowercase responses are not on disk.
   This is why there are 745 inventory pages but 743 files.
6. **Every page carries a honeypot.** All 743 files contain `<div style="display:none;"><a
   href="https://capecodcannabis.com/7b62afab7960ee01" rel="nofollow">Secret Link</a></div>`, and robots.txt
   disallows that path. Never render it and never follow it. Parity must ignore its two words. sr-extract's
   `bodyText` includes them on the 631 pages without `<main>`.
7. **Only 112 of 743 files have `<main>`.** On the other 631, sr-extract's `bodyText` (the parity source) is the whole
   body: header, footer, hidden copy and honeypot included (sr-extract.mjs, the 25% rule). Expect declared parity
   deficits that come from hidden copy. Do not chase them by rendering hidden text.
8. **Shared templates make up most of the site.** The theme template `single-post#6278` renders 324 pages (252 brands,
   52 terpenes and 20 cannabinoids). Section template `#11803` (breadcrumb) appears on 503 pages, and `#5339` and
   `#9522` on all 56 town pages. Build these as partials keyed by Elementor doc id.
9. **Heading demotion needs a hand-checked outline on three posts.** Of the 62 posts, 15 have exactly 2 H1 tags and
   three have more: `labor-day-weekend-on-cape-cod-2026` (6, of which 4 have no text once tags are stripped),
   `massachusetts-cannabis-purchase-limit` (9, 7 with no text) and `cannabis-101-the-beginners-guide` (10, all real
   section titles, e.g. "Understanding Cannabinoids", "MA Recreational Cannabis Purchase Limits"). A blind one-H1 rule
   would flatten the beginner's guide. Proposal (not yet hand-checked): keep the post title as the H1, demote the
   other H1s one level, drop only H1s that hold no text and no image, and keep every word.

## 1. Method and evidence

| Script (tmp/understand/content/) | What it does | Output |
|---|---|---|
| `lib-html.mjs` | Tolerant HTML tokenizer and tree with source offsets (Node builtins) | (library) |
| `census.mjs`, `census-lib.mjs` | Widget census per type, region, doc and template; template classifier from WP body classes | `census.json`, `census-pages.json` |
| `devices.mjs` | Per-device text views, union, hidden-everywhere and mobile-only words, for page and chrome | `devices.json` |
| `joint-params.mjs` | Every Joint widget `data-config` and every shortcode output signature | `joint-params.json` |
| `extract-proto.mjs` | Prototype raw HTML to block JSON, device collapse, recall, positive control | `samples/*.json`, `recall.json` |
| `batch.mjs` | The prototype over all 743 files | `batch-recall.json` |
| `build-model.mjs` | Assembles `audit/understand/content-model.json` from the outputs above | content-model.json |

The breakpoints come from `audit/prelock/kit.css` (`@media` rules for `.elementor-hidden-*`):

| Breakpoint | Width |
|---|---|
| mobile | ≤767 |
| mobile_extra | 768–880 |
| tablet | 881–1025 |
| tablet_extra | 1026 only (a 1px band) |
| laptop | disabled |
| desktop | 1027–1366 |
| widescreen | ≥1367 |

The five views used throughout are widescreen, desktop, tablet, mobile_extra and mobile. An element visible only in
the 1px tablet_extra band counts as hidden everywhere.

## 2. Regions: page text vs site chrome

- **Page region**:
  - `<main>` when present: 112 files (home 1, default-template pages 53, date archives 56, /stores and the store page 2).
  - Otherwise: the body children minus `header[data-elementor-type=header]` (doc 18695),
    `footer[data-elementor-type=footer]` (doc 1996), `<template id="tmpl-age-gate">`, scripts, noscript,
    `div#joint-ecommerce`, the skip link and the display:none honeypot div.
- **Chrome** is identical on every page that has it: header 18695 and footer 1996 on 741 files. The two canvas pages
  (`/links`, `/free-bar-coasters`) carry their own logo, nav, search, mega menu, social and cart widgets inside the page.

| Chrome part | Visible text (union of views) | Notes |
|---|---|---|
| Header | 225 words, of which about 101 are the nav-menu's dropdown clone | `nav-menu` 8d9c881 holds the full menu (202 words) and **prints it twice** (main nav plus the dropdown clone): count it once. Mega menus: "⭐ Daily Offers ⭐ Flower … Apparel" and "Effects Strains Terpenes Cannabinoids". Search label "Search ...". Logo alt "Dispensary near me \| Cape Cod Cannabis Dispensary in Wellfleet, MA". Tablet/mobile only: "Scroll left-right to view categories". |
| Header, hidden on every device | (not rendered) | Ticker "Boards in the Stores is back for 2026 and bidding is now open! Click here to bid or learn more!" (container 5664df5). GTranslate (ca9744c). jet-ajax-search (1044960). Whether any script reveals the ticker is UNVERIFIED: there was no live capture. |
| Footer | 187 words | "Stay connected with Cape Cod Cannabis". Newsletter line plus "JOIN OUR NEWSLETTER". "Always worth the trip!". Facebook / Linkedin / Twitter / Instagram. Hours Monday–Sunday "8am – 8pm". Contact: "1446 US-6, Wellfleet, MA 02667", "(774) 383-3133". Menu / Learn / About columns. "Copyright © 2026 … All Rights Reserved." Legal links. "#MR282685". The 16-town service-area paragraph. The Chambers of Commerce paragraph. |
| Footer, hidden on every device | (not rendered) | The loyalty heading 786098f (37 words). A second Joint hours list 467fc28 ("8:00am – 8:00pm"). "What are push notifications?" |
| Age gate | in `<template>` | "Welcome!", "Are you over 21 years of age?", "Yes", "No", "*Must be 21+ with a VALID ID.", "Always worth the trip!". The dialog `aria-label` is literally "Verify you are over %s years of age?" (the plugin never fills `%s`; the rebuild should say 21). Logo alt: "Cape Cod Cannabis in Wellfleet, MA...Always worth the trip!". **Runtime strings in the inline `age_gate` / `age_gate_common` config** (all 743 files): error "You are not old enough to view this content"; document title while the gate shows "Age Verification - Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA"; cookie warning "Your browser does not support cookies, you may experience problems entering this site". Settings `"age":"21"`, `"rechallenge":"1"`, cookie `age_gate`. |
| Skip link | "Skip to main content" | Keep one. |

Measured chrome over 741 pages (`devices.json`): 391,248 raw words, 305,292 visible-union words and 85,956 words
hidden on every device.

## 3. Templates (from WP body classes; 2–4 raw examples each, outlines in `tmp/understand/content/outlines.txt`)

| Template | Pages | Region | Elementor docs | Sections in order (blocks) |
|---|---|---|---|---|
| home | 1 | main | wp-page 117740 (+12 loop-item 89670) | 1. hero banner image (jet-banner, links /best-cbd-store-on-cape-cod/)<br>2. 3 nested promo carousels<br>3. H1 + intro, **desktop/widescreen only**<br>4. "Featured Bundles & Offers" + 12 offer cards (loop-carousel)<br>5. "View All Offers"<br>6. Product Spotlight (products: collections "Blazing Bargains \| Flower")<br>7. Brand Spotlight (media-carousel of brand logos)<br>8. Affordable Ounces (products: specials)<br>9. 3 offer rails hidden everywhere<br>10. Google Reviews / info / loyalty carousel (visible 3d04197; hidden twin f6c0f7e)<br>11. Shop Health Circle Flower (products: brand)<br>12. map embed<br>13. Shop Choice Chew Gummies (products: brand)<br>14. "Learn More About Cape Cod Cannabis"<br>15. 3 nested accordions holding the long copy, the stats ("900+ ⭐⭐⭐⭐⭐ Google Reviews", "4.9 ⭐ Rating") and the FAQ<br>16. buttons "Shop Menu" / "Shop Bundles" |
| page (default) | 53 | main | wp-page + section templates | Free-form containers of heading, text-editor, image and button. FAQ (nested-accordion 40, toggle 24). Reviews badge and review list. Map iframes. joint_menu (13) and joint_slider (2). One-offs: jet-table, timelines, hotspot, animated-headline, the job form, the Instagram feed. **my-orders and my-points have only an H1** (Joint account apps). **moodi-day-review-portal is password-protected** (WP password form only). |
| page-full-width | 11 | body-minus-chrome | wp-page | Landing pages (ccc-landing-2, contact, daily-purchase-limit-in-ma), checkout (joint_checkout mount), leave-your-review, disclaimer. |
| page-canvas | 2 | body-minus-chrome | wp-page | /links and /free-bar-coasters, with their own chrome widgets. |
| post | 61 | body-minus-chrome | single-post 6157; body = theme-post-content (30 Elementor wp-post docs, 31 classic HTML) | 1. H1 (theme-post-title)<br>2. post-info date (links to /YYYY/MM/DD/)<br>3. breadcrumb (#11803)<br>4. body: headings, rich text, images, buttons, 23 menu anchors on one TOC page, FAQ, product sliders, hotspot<br>5. post-navigation<br>6. post-comments |
| brand | 252 | body-minus-chrome | single-post 6278 + #11803 | Breadcrumb, H1 brand name, theme-post-content (empty on most). **5.4 visible words per page on average** (1,370 / 252; the honeypot excluded). The product grid is built by the Joint app from the URL. |
| category | 64 | body-minus-chrome | single-post 13166 + #11803 (57 have a wp-post body) | 1. breadcrumb<br>2. intro (some device-limited)<br>3. subcategory posts list<br>4. nested carousel of subcategory tiles<br>5. **products: menu, category=CAT [subcategory=SUB], sort "Price: High to Low", limit 20**<br>6. SEO copy<br>7. FAQ accordion (parts hidden everywhere)<br>8. shared slider: category=FLOWER, weights=1oz, pricemax=115, sort "Price: Low to High", limit 15 (on all 64) |
| town | 56 | body-minus-chrome | single-post 12 + #5339 + #9522 | 1. intro x2 + "Order Ahead"<br>2. category tiles (jet-carousel, device-limited) + "Shop by Effect" tiles<br>3. town copy (4 rich blocks) + reviews badge "4.9 (967)" + a one-review list (the latest Google review at crawl time: "Lyn Clements", 10/08/2026, 5.0) + "Leave Us a Review!"<br>4. "Visiting Cape Cod Cannabis": Parking, Payment, Online Pre-Orders, "Knowledgable Staff" (icon + heading + rich)<br>5. products: menu, limit 20 |
| terpene / cannabinoid / effect / strain | 52 / 20 / 10 / 5 | body-minus-chrome | 6278 (terpene, cannabinoid); 13750 (effect, strain) | Breadcrumb, H1 or heading, one rich block (terpenes: "Aroma: … Entourage: …"). Effect and strain pages add category-tile carousels. Grids are client-rendered. |
| special | 17 | body-minus-chrome | single-post 4468 | Rich x2, post-navigation, H1 offer title, terms (rich x2). |
| event | 60 | body-minus-chrome | tec_event_single_dynamic 92071 | Event fields (calendar link, status, title, datetime, image x2), description (can wrap pasted Squarespace markup), venue, categories, tags, export, prev/next. |
| archives | 21 | body-minus-chrome | archive 10600, 13755, … | Title or intro, cards (archive-posts, posts.cards, jet-posts, call-to-action tiles), pagination. **The blog archives carry a 378–387-word intro hidden on every device.** |
| archive-date | 56 | main | none (theme) | H1 date, then per post: H2 link, image, excerpt. |
| events calendar, stores | 3 | body-minus-chrome (calendar) / main (stores) | none (plugins) | Tribe list view. Joint store page (address, hours, contact). |
| product | 0 here | n/a | n/a | Not in audit/raw (only `audit/prelock/t1.html`). This belongs to the catalog lane. |

Widgets per template, by count, are in `content-model.json → templates[].widgets`.

## 4. Device duplicates: measurement and the collapse rule

`devices.mjs` builds each view's text by skipping subtrees with `elementor-hidden-<view>`. It then takes the union:
for each normalized line, the maximum count over the five views.

| Page region, all 743 files | Words |
|---|---|
| Raw text (every element) | 226,452 |
| Union of the five views (what some visitor can see) | 220,073 |
| Desktop view / mobile view | 216,244 / 212,759 |
| Hidden on every device | 6,379 (64 pages); 4,447 never visible anywhere |
| Shown on mobile more often than on desktop | 207 (13 pages: "Scroll left-right to view …" hints on 12 pages, plus 144 words on daily-purchase-limit-in-ma) |

Outermost device-limited elements in the page region (`census.json`):
- 382 are hidden on every device.
- 95 are visible only on widescreen + tablet_extra.
- 62 are visible only on widescreen + tablet_extra + mobile_extra.
- 41 are visible everywhere except mobile.
- 26 are desktop-and-up plus tablet.
- 12 are tablet and down.
- 3 are mobile only.
- The rest are fewer than 5 each.

The pages with the most hidden-everywhere text, given as words never visible anywhere (`deadUniqueW`), with all
hidden-everywhere words (`deadW`) in brackets (`devices.json` perPage): the 5 blog category archives and /our-blog
(378–387 each [413], the "Blue Whale Tales" intro), /faqs-420 (317 [317]), /join-our-team (295 [568]), the home page
(138 [348]) and /directions (119 [134]).

**Ledger reconciliation (open).** A div-only re-derivation (`tmp/understand/critic/hidden2.mjs`, compared page by page
in `tmp/understand/fixer/hidden-diff.mjs` → `hidden-diff-out.json`) finds 5,051 words on 48 pages against this
lane's 6,379 on 64. Where the hidden block is a `<div>`, the two agree: home 348 vs 349, /our-blog and the category
archives 413 vs 413, /faqs-420 317 vs 313. (The critic's "349 against 138" compared `deadW` with `deadUniqueW`.)
22 pages differ by more than 10 words. 35 pages have a `<section>` hidden on all six breakpoints, which the div-only
method skips: /join-our-team 568 vs 0 (3 hidden sections), 10 effects and 4 strains pages 14 vs 0 (1 each),
/directions 134 vs 23. /daily-purchase-limit-in-ma (207 vs 19) and /contact (55 vs 41) have no hidden section, and
their difference is not yet explained. Reconcile these before any parity deficit is declared from the ledger.

**Collapse rule** (implemented in `extract-proto.mjs → collapseDevices`):
1. A block visible on no device is not rendered. It is written to `ledger.hiddenEverywhere` with its full text.
2. U = for each normalized line, the maximum count over the five views. K starts empty.
3. Blocks visible on every device are kept first, and their lines go into K.
4. Device-limited blocks are visited from widest to narrowest visibility, in document order within a tie. A block is
   **kept as one responsive block shown on every device** if any of its lines is still below U in K. Otherwise it is
   a duplicate variant: it is dropped and written to `ledger.collapsed`.
5. A kept device-limited block that repeats lines already in K is flagged `partialDuplicate` for a hand merge. Variants
   that disagree on facts go to the operator as a conflict. The prototype does not detect factual conflicts: the one
   below was found by reading the partialDuplicate pair. The production extractor should list every kept device-only
   pair with a partialDuplicate as a candidate conflict in `ledger.conflicts`.

The result is that every line a visitor could see on any device survives, exactly as many times as the most generous
device showed it. Tested on /daily-purchase-limit-in-ma/:
- 6 desktop table blocks collapsed into the tablet/mobile table.
- The 28 g (tablet/mobile) and 56 g (desktop) explanations were both kept. The 56 g block carries the
  `partialDuplicate` flag.
- Recall stayed at 605/605.

## 5. The semantic block model

Page model:

```
{ url, template, title,
  regionKind: main | body-minus-chrome,
  sections: [{ id: <data-id>, doc: "<type>#<id>", dev?: [views], blocks: [...] }],
  ledger: { hiddenEverywhere[], collapsed[], keptDeviceOnly[], conflicts[], widgetLoss[] } }
```

A new section starts at each top-level container (`e-parent`) or `elementor-top-section`. Embedded docs
(`template.default` → `section#<id>`, `theme-post-content` → `wp-post#<id>`) are recorded by doc id so the build can
render shared ones as partials.

| Block | Fields | Source widgets (instances site-wide) |
|---|---|---|
| `heading` | level, text, href? | heading (5,887), theme-post-title (413), theme-archive-title, aux_modern_heading, animated-headline, classic h1–h6 |
| `rich` | html (allowlist), overflow?, review? | text-editor (17,702 incl. chrome), theme-post-excerpt, jet-table, classic p/ul/ol/table |
| `image` | src, alt, titleAttr?, w, h, href?, caption? | image (1,965), featured image, site logo, jet-banner, event image |
| `button` | label, href, target?, id? | button (1,941) |
| `faq` | kind, items[{q, blocks[] or a_html}] | nested-accordion (104 on 51 pages), toggle (25 on 24 pages) |
| `carousel` | slides[{blocks[]}], settings, titles (editor-only) | nested-carousel (27) |
| `gallery` | kind, items[{src, alt, href, caption/title/text}] | jet-carousel (144 on 88 pages), media-carousel (4), image-carousel (3), jet-brands (1) |
| `posts` | kind, items[{title, href, excerpt, image, more, meta}], pagination | archive-posts (16), posts.classic (10), posts.cards (2), jet-posts (14), loop-carousel (1) |
| `cta` | title, text, button, href, image | call-to-action (17) |
| `products` | source joint, widget slider or menu, params{…}, clientRendered | joint_slider (77 on 69 pages), joint_menu (131), shortcode mounts |
| `reviews` | kind badge or list, rating, count, items[{author, time, rating, text}], snapshot | shortcode joint-reviews-badge (76 files, "4.9 (967)"), joint-review-list (77 files: all 56 town pages, /customer-reviews and others) |
| `hours` | rows[{day, time}] | Joint hours list (inside a text-editor; the footer copy is hidden everywhere) |
| `embed` | kind gmap, youtube, video, iframe or instagram-feed; src | Google Maps iframes (74 files), Alpine IQ iframes (/join-our-newsletter, /loyalty-sign-in), video (7), sbi-widget |
| `html` | html, text, review | html (21 in pages): hand-rebuilt, text kept |
| `form` | fields[{tag, type, name, label, placeholder, required, options}], submit | form (contact, join-our-team), WP password form |
| `hotspot`, `timeline`, `meta`, `postnav`, `comments`, `event-field`, `anchor`, `icon`, `divider` | see JSON | hotspot (2), jet timelines (4), post-info (61), post-navigation (78), post-comments (61), tec_* (60 pages), menu-anchor (23), icon (292, SVG only), divider (903) |
| `nav`, `search`, `social`, `chrome-ref`, `app` | items | chrome widgets, joint_checkout |

The rich-text allowlist is: p, br, strong, b, em, i, u, s, sup, sub, small, mark, code, pre, blockquote, hr,
a[href target rel title], ul, ol, li, dl, dt, dd, h2–h6, table parts, img[src alt width height title], figure and
figcaption. `center` becomes `p`. Every other tag is unwrapped. All style, class and id attributes are dropped.
script, style, svg, noscript, template, iframe and form controls are removed.

Images are lazy-loaded. Use `data-src` / `data-srcset`, never the `data:image/svg+xml` placeholder in `src`.

**Not found in the HTML**, despite the brief's list: no `icon-list` widget, no Elementor `google_maps` widget (maps are
iframes) and no Elementor popup except one on /about-cape-cod-cannabis.

### Joint product parameters (real values from `data-config`, `joint-params.json`)

joint_slider has 13 distinct configs (empty and `post_id` keys dropped):

| Params | Count | Where |
|---|---|---|
| category FLOWER, weights 1oz, pricemax 115, sort "Price: Low to High", limit 15 | 64 | category pages |
| menutype RECREATIONAL, category FLOWER, subcategory INFUSED_BUD, sort Brand, limit 15 | 2 | anatomy-of-a-moonrock (page), what-is-a-cannabis-moonrock (post) |
| category SEEDS / CLONES, limit 15 | 1 each | cannabis-seeds-vs-clones (post) |
| category EDIBLES, subcategory GUMMIES, pricemin 7, pricemax 12.50, sort "CBD: Low to High", limit 25 | 1 | categories-edibles |
| featured true, limit 15 | 1 | faqs-420 |
| collections "Blazing Bargains \| Flower"; specials "Affordable Ounces & 1/2 Ounces", "1g Pre-Rolls \| 7 for $35 \| 28 for $133", "Cartridges \| 2 for 10% Off \| 5 for 20% Off", "Disposables \| 1g & 2g \| 2 for 10% Off \| 4 for 20% Off"; brand "health circle", "choice chews" (all limit 100) | 1 each | home |

joint_menu has 72 distinct configs:
- `{limit:20}` on all 56 town pages and 1 page-full-width page.
- `category` (+ `subcategory`) with `sort "Price: High to Low"`, limit 20, on category pages.
- `category` + `specials "all"` on the "all-…-on-sale" pages.
- `cannabinoids` (a list of 18 names) on the cannabinoid archive (2 pages) and `terpenes` (a list) on /terpenes.
- `collections` on "Liquid Diamond" subcategory pages, /fire-offers-2, /new-products and /sleep-products;
  `staffpicks` on /staff-picks; `featured` on /featured-brand; `specials "Affordable Ounces of Flower"` on
  /affordable-ounces-cape-cod-cannabis.
- Keys seen: category, subcategory, specials, collections, sort, limit, featured, staffpicks, cannabinoids, terpenes.

Every `joint_cart` instance uses `{color:"default", variant:"fixed", icon:"store", size:"small"}`. `?brand=` deep links
must keep working as client filter state (docs/PLAN.md).

## 6. Parity: what counts

**Include:**
- The visible text of the page region in every device view (the union rule).
- FAQ answers. Collapsed panels are in the DOM.
- Every carousel slide and gallery title or caption.
- Heading, button and link labels.
- Image alt text, scored alt-for-alt.
- aria-labels that name images or controls.
- Form labels, placeholders, options and submit labels.
- Review badge text "4.9 (967)" and the review list (a dated third-party snapshot).
- Hours rows and event fields.
- Chrome text once per site (header, footer, age gate).

**Exclude:**
- script, style, noscript, inline SVG and JSON-LD. JSON-LD is scored by the SEO lane.
- The age-gate `<template>`, from page text. It is chrome.
- Blocks hidden on every device (declared in the ledger).
- Collapsed device duplicates.
- The display:none honeypot "Secret Link".
- The Smash Balloon admin-only error ("This error message is only visible to WordPress admins …").
- The nav-menu dropdown clone.
- jet-ajax-search `<script type="text/html">` templates and GTranslate wrappers.
- Editor-only data (`data-settings`, nested-carousel `slide_title`).

Checked and not found:
- **Cookie text**: no cookie-banner markup in the 743 files (grep for common consent plugins: 0). A runtime-injected
  banner is UNVERIFIED.
- **Screen-reader duplicates**: `class="screen-reader-text"` is on 741 files. 735 have one instance: the label
  "Search ..." of the hidden header JetSearch input `#search-input-348550e`. 6 files have two (the 5 blog category
  archives and /our-blog/): the second is the label "Search ..." of the jet-search-suggestions input
  `#search-input-d882d69`. `/links/` and `/free-bar-coasters/` have none. Exclude every instance. There is no
  `.sr-only`.

**Parity caution:** sr-parity compares against sr-extract `bodyText`, which is the whole body on the 631 pages without
`<main>`. That text includes chrome, hidden copy and the honeypot. Treat hidden-everywhere and honeypot words as
declared deficits in the ledger.

## 7. Prototype extractor: recall with a positive control

`node tmp/understand/content/extract-proto.mjs` checks recall against a plain visible-text dump of the region (the
union of views) and runs a positive control. The control deletes, in memory, the longest paragraph that is visible
everywhere and occurs exactly once, then checks that the matched-word count drops by exactly that paragraph's length.

| Sample | File | Template | Recall (matched/ref) | Control (drop/paragraph words) |
|---|---|---|---|---|
| home | index.html | home | 1.0000 (3379/3379) | 69/69 exact |
| blog post | what-is-a-cannabis-moonrock.html | post | 0.9990 (973/974)\* | 66/66 exact |
| town | …dispensary-near-brewster-ma-02631.html | town | 1.0000 (471/471) | 50/50 exact |
| category | categories-flower.html | category | 1.0000 (356/356) | 49/49 exact |
| terpene | terpenes-beta-caryophyllene.html | terpene | 1.0000 (33/33) | 27/27 exact |
| FAQ | faqs-420.html | page | 1.0000 (1738/1738) | 69/69 exact |

\*The single "missing" token is `prevbest`. The text dump glues the inline "Prev" label onto the next post title. It
is a reference artifact; the words themselves are present.

**All 743 files** (`batch.mjs`): 219,872 / 220,073 = **0.99909**. 65 pages are below 1.0 and 3 are below 0.99:

| Page | Recall | Cause |
|---|---|---|
| event-perpetual-harvest-pop-up | 0.642 | 72 words of pasted markup inside theme-post-content lost: a production fix is needed |
| events-calendar | 0.985 | "next events" |
| strains | 0.986 | CTA titles Indica / Sativa / Hybrid / CBD use a class the prototype does not read |

Of the other 62 pages below 1.0:
- 61 are the `prev…next` artifact (one post-navigation widget per post).
- 1 is /join-our-team (0.997): 3 job-form label words ("age verification privacy") that the form mapping does not
  read.

The loss guard records any widget whose own words are not all in its blocks (`ledger.widgetLoss`). This is how the
event and strains gaps surfaced.

Three prototype bugs, caught by the recall check and the controls, that are now fixed:
- Nested accordions double-counted inner FAQs. Item queries must not descend into nested widgets.
- `role="region region"` hid accordion panels.
- A heading widget wrapped pasted Squarespace blocks (event pages). The remainder is now kept as an overflow rich
  block flagged for review.

## 8. Is any copy client-rendered?

The 580 sr-extract flags all have the same reason, "script bytes Nx body text". The one high-risk page is /links, a
link-in-bio page with 165 characters of body text.

**Rendered in the browser:**
- Joint product rails and grids (77 slider and 131 menu mounts, plus the brand, effect, strain and terpene grids
  built from the URL).
- The cart (742 mounts) and checkout.
- /my-orders and /my-points.
- jet-ajax-search results and search suggestions.
- GTranslate.
- The OneSignal prompt.
- Alpine IQ newsletter and loyalty iframes.
- Events Calendar view switching.
- Google Maps.

**Missing from the static HTML:**
- Product names, prices and images on listings (the catalog lane rebuilds these from product JSON-LD).
- The password-protected /moodi-day-review-portal content.

**No editorial copy is missing.**

## 9. Open decisions for the operator

1. **28 g vs 56 g** on /daily-purchase-limit-in-ma/: which variant is current?
2. **Hidden-everywhere copy:**
   - 6,379 page words, including the blog "Blue Whale Tales" intro, the faqs-420 specials and the job listing on
     join-our-team.
   - The header ticker.
   - Default: do not render; declare in the ledger. Ask the client whether any of it should come back.
3. **Home offers hidden on every device** ("1g Pre-Rolls | 7 for $35 | 28 for $133", Cartridges, Disposables): these
   look like retired offers. Default: drop and declare.
4. **Google review text and reviewer names**: keep as a dated snapshot, or re-source live at handoff.
5. **Post comments** (61 posts): there is no comment backend in a static rebuild.

## Files written by this lane

- `docs/CONTENT-MODEL.md` (this file)
- `audit/understand/content-model.json`
- `tmp/understand/content/`:
  - `lib-html.mjs`, `census-lib.mjs`, `census.mjs`, `devices.mjs`, `joint-params.mjs`, `extract-proto.mjs`, `batch.mjs`,
    `build-model.mjs`
  - `census.json`, `census-pages.json`, `devices.json`, `joint-params.json`, `recall.json`, `batch-recall.json`,
    `outlines.txt`
  - `samples/*.json` (49 files): the 6 representative pages (`home`, `post`, `town`, `category`, `terpene`, `faq`)
    plus 43 more pages named after their raw file, covering every template
  - `patch-doc.cjs` (figure refresh for this doc) and `t-*.mjs` (probe scripts used during the study)
  - `t-*.mjs`: probe scripts

## Verification log (fixer lane, 2026-10-12)

Each item was re-run against the evidence before this doc changed (scripts in `tmp/understand/fixer/`, read-only).
`audit/understand/content-model.json` was patched to match (`verificationLog` and `hiddenLedgerReconciliation` keys;
pre-patch copy `tmp/understand/fixer/content-model.before.json`).

| # | Was | Now | Evidence |
|---|---|---|---|
| 1 | §6: `.screen-reader-text` "once per file (741 files)" | 735 files x1, 6 files x2, 2 files x0 | `fixcheck.mjs` section F: per-file count of `class="screen-reader-text"`; the 6 are `category-cannabis-101`, `category-cannabis-news`, `category-cape-cod-lifestyle`, `category-inside-cape-cod-cannabis`, `category-start-here`, `our-blog`. Context read in `our-blog.html` and `category-start-here.html`: labels for `#search-input-348550e` and `#search-input-d882d69` |
| 2 | §2 age-gate row lacked the plugin's runtime strings | Added the error, document title, cookie warning, `rechallenge` and the logo alt | `follow.mjs` on `audit/raw/index.html`: `"error":"You are not old enough to view this content"`, `"customTitle":"Age Verification - Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA"`, `"rechallenge":"1"`, `"age":"21"`, `age_gate_common={"cookies":"Your browser does not support cookies, you may experience problems entering this site",…}`. The error and `rechallenge` strings are in 743 of 743 files. What the plugin does with `rechallenge` at runtime is UNVERIFIED |
| 3 | §4: hidden-everywhere baseline stated without a caveat; "the home page (138)" listed as hidden-everywhere words | Measures labelled (`deadUniqueW` vs `deadW`); reconciliation section added; must-know item 2 carries the caveat | `devices.json` perPage (index 348/138, our-blog 413/378, faqs-420 317/317, join-our-team 568/295, directions 134/119); `hidden2.mjs` re-run: 48 pages, 5,051 words; `hidden-diff.mjs`: 22 pages differ by more than 10 words, 35 pages have a hidden `<section>` |
| 4 | No heading-demotion warning for the multi-H1 posts | Must-know item 9 added | `fixcheck.mjs` section B: H1 distribution over the 62 posts {0:1, 1:43, 2:15, 6:1, 9:1, 10:1}; H1 texts read outside `<script>` for the three posts |
