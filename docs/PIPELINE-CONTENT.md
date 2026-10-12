# Pipeline, content lane: page models, chrome model, text parity

Owner: PIPELINE-CONTENT (2026-10-12). This file is the source of truth for the JSON the theme and the site lane read
from `src/content/`. It refines the `page` draft of `docs/BUILD-CONTRACT.md` 3.3 for the content fields. The route,
catalog and image-plan fields (`products`, `related`, `generated`) belong to the other lanes and are not in these files.

## 1. What a reader must know first

1. **737 page models, one per output path.** `audit/site-inventory.json` has 745 ok HTML pages. The 6 query variants
   (`?product=`, `?strain=`) and the 2 case variants (`/categories/CBD`, `/categories/Seeds`) fold into their base path
   and are listed under `variants`. The 6 query variants were checked: their page-region text equals the base page's.
2. **Every word is accounted for.** The independent checker `tools/text-parity.mjs` accounts for every one of the
   25,468 visible source sentences (737 pages plus the chrome): recall **1.000000**, with **0 ADDED** sentences. 25,407
   are found in the models. 61 are declared removals in `src/content/removals.json`:
   - the agency credit's logo alt, in the chrome;
   - the alt "Loading Events" of The Events Calendar's AJAX spinner, on 60 event pages.

   Both positive controls fire exactly (section 6).
3. **Zero unknown blocks.** All 63 widget types in the census map to a block type. The extractor's own per-widget loss
   guard reports 0 widgets whose words are missing from their blocks.
4. **Nothing is dropped for being hidden.** Copy hidden on every device stays in the model with `hiddenAll: true`
   (BUILD-CONTRACT 4.5): 359 whole sections on 175 pages, plus single blocks inside visible sections (518 blocks in
   all). The theme must not render it visibly.
5. **Device duplicates are rare on this site.** The collapse rule removed 16 blocks, all on `/daily-purchase-limit-in-ma/`,
   whose desktop table repeats the tablet/mobile one line for line. The same page holds the 28 g vs 56 g contradiction:
   both variants are kept and flagged (`conflict: true`, 6 line pairs in `ledger.conflicts`).
6. **Deterministic.** Two consecutive runs produce byte-identical files (739 files; manifest sha256 recorded in section 6).
   There are no timestamps in any output.
7. **Never render these as visible text:**
   - the fields `note`, `reason`, `from`, `ledger`, `editorTitles`, `rawFile`, `rawSha256`, `rawNote`, `sourceHref`
     and `srcUrl`;
   - the `data-source-url`, `data-master` and `data-missing` attributes inside `html`;
   - any block or section with `hiddenAll: true`.

   `ariaLabels` are accessible names. The theme may use them as `aria-label`, but must not print them.

## 2. How to run

```
node src/lib/extract.mjs                    # all pages -> src/content/pages/<slug>.json, chrome.json, then _index.json
node src/lib/extract.mjs --only home,faqs-420   # debug: only these slugs; does NOT rewrite chrome.json or _index.json
node tools/text-parity.mjs                  # parity of every model + the chrome against audit/raw (exit 1 on any miss)
node tools/text-parity.mjs --control        # same, plus the two positive controls (exit 1 if a control fails)
node tools/text-parity.mjs --page <slug>    # one page, listing every missing and added sentence
node tools/text-parity.mjs --built dist     # source vs each built page's <main> (dist/<path>/index.html); also fails on
                                            # hiddenShown: hidden-everywhere copy rendered visibly (keep it out, or inside
                                            # an element with the `hidden` attribute or `data-hidden-all`)
node tools/text-parity.mjs --json <file>    # write the full report
```

- Run from the workspace root. Node builtins only, no network. About 16 s to extract and 25 s to check.
- `_index.json` is written LAST. Its presence means the extraction finished.
- Inputs (read-only): `audit/raw/*.html`, `audit/site-inventory.json`, `audit/understand/ia-map.json` (route kind,
  aliases, dead links), `audit/image-inventory.json` (local image files), `src/content/removals.json` (parity only).

## 3. Page model (`src/content/pages/<slug>.json`)

```js
{
  schema: 'ccc-reforge/page@1',
  path: '/categories/flower/',        // output path, leading + trailing slash; percent-encoding kept, lower-case hex
  sourceUrl: 'https://capecodcannabis.com/categories/flower/',  // the URL that served the bytes (after the slash 301)
  requestedUrl,                       // only when it differs from sourceUrl
  slug: 'categories-flower',          // file-safe id = the crawler's savedAs name ('home' for '/'); ASCII only
  kind: 'category',                   // template name from ia-map routes (35 kinds, see _index.json)
  wpTemplate: 'category',             // WordPress body-class template (census-lib classifier), for reference
  derived: false,                     // always false here: every model is a crawled page
  rawFile, rawSha256, rawNote?,       // evidence pointer; rawNote on the 2 case-collision pages
  variants: [{ url, kind: 'query'|'case', savedAs, sameFile?, sha256, sameRegionText? }],
  regionKind: 'main' | 'body-minus-chrome',
  // head, verbatim from the source <head> (BUILD-CONTRACT 3.3 keeps them top-level; URLs unchanged)
  title, metaDescription, canonical, robots,
  og: { locale, type, title, description, url, site_name, image, ... },   // 'og:' prefix dropped; repeats -> arrays
  article?: { publisher, section, tag, published_time, ... },              // 'article:' metas
  twitter: { card, title, description, image, ... },
  jsonLd: [ /* every <script type="application/ld+json"> parsed; unparsable -> { parseError: true, raw } */ ],
  h1: 'Shop Cannabis Flower for sale in Wellfleet, MA',   // the first H1 visible on some device, or null
  h1Source: { count, visible, hidden, note?, candidates?: [{ text, from }] },   // candidates only when h1 is null
  breadcrumbs: [{ label, href }],     // last item href: null (the current page)
  breadcrumbsSource: 'visible' | 'jsonld' | 'none',   // 'jsonld': the source showed no breadcrumb on this page; those
                                      // labels are entity-decoded ("&amp;" -> "&"); visible labels are exactly as displayed
  breadcrumbsSeparator: ' / ',        // visible ones only
  breadcrumbsLabel: 'breadcrumbs',    // the nav's aria-label, verbatim
  breadcrumbsInRegion: true,          // the source printed the breadcrumb inside the page region (it is NOT a block)
  section: 'Shop Menu' | null,        // header menu group for the active state (top-level label owning this path)
  ariaLabels?: [ ... ],               // aria-labels in non-widget markup (events calendar view switcher), verbatim
  sections: [{
    n: 0,                             // ordinal (ids repeat when a section continues after a nested one)
    id: 'a43a989' | null,             // Elementor data-id of the top-level container; null for theme/plugin markup
    doc: 'single-post#13166',         // the Elementor document that holds it (shared templates = partials)
    popup: true?,                     // Elementor popup doc (only /about-cape-cod-cannabis/): a dialog, not inline
    cssId?, cont?: true,              // cont: the rest of a parent section after a nested one closed
    hiddenAll?: true,                 // every block hidden on all five views: keep, never render visibly
    dev?: ['widescreen','desktop'],   // source visibility of the container (informational)
    blocks: [ /* section 4 */ ],
  }],
  catalog: [{ section, widget: 'slider'|'menu', label, filters, sort, limit, params, hiddenAll? }] | null,
  blockCounts: { heading: 3, rich: 4, ... },
  ledger: {
    collapsed: [{ section, t, dev, text }],        // device duplicates removed (section 5); full text kept here
    keptDeviceOnly: [{ section, t, dev, partialDuplicate?, text }],
    conflicts: [{ kind: 'numbers-differ-by-device', a: { section, dev, line }, b: {...} } | { kind: 'partial-duplicate', ... }],
    unknown: [],                      // { widget, id } for an unmapped widget (0 on this crawl)
    widgetLoss: [],                   // widgets whose words are not all in their blocks (0)
    removed: [{ what, text, reason }],   // honeypot "Secret Link" (625 pages), Smash Balloon admin error (2),
                                         // tec-loading-spinner (60 event pages)
    links: [{ href, from, status }],  // only dead | blocked | unknown internal links
    aliasesResolved: [{ from, to }],
    imagesMissing: [{ srcUrl, missing }],
    h1InRich: 0,
  },
}
```

Common block fields:
- `t` is the block type.
- `dev` lists the views the block was visible on in the source. It is informational: after the collapse every kept
  block renders on every device.
- `hiddenAll: true` means keep but never render visibly.
- `conflict: true` marks a device variant that contradicts its sibling.
- `ariaLabels` lists accessible names found in the widget (landmark and control labels such as "Post Navigation",
  "4.9 Stars", "1 of 3"). They are verbatim, but they are not visible copy.
- `overflow: true` marks content that a heading or image widget wrapped (pasted markup); it is kept after the primary
  block.

**Links.** Every internal href is an output path:
- origin removed, trailing slash added, `?query` and `#hash` kept;
- the 12 aliases and the case variants are resolved, for example `/intro-to-cannabis` → `/intro-to-cannabis-101/`;
- files (`.pdf`, `.kml`, `.txt`) keep their exact path, with no slash.

External hrefs are verbatim. `hrefStatus` appears only when the link is a problem:
- `dead`: one of the 20 live 404s (117 occurrences); the site lane retargets or unlinks it (BUILD-CONTRACT 4.13);
- `dead-anchor`: a `#id` that exists nowhere on the page, for example the menu's `#hours`.

Inside `html`, a dead link carries `data-link="dead"`. `ledger.links` also lists:
- `blocked`: 11 `/offers/*` URLs refused by the lockout; live, they redirect to `/specials/*`;
- `unknown`: never crawled. These are the year archives `/2021/`…`/2026/`, `/events-calendar/month/` and `/today/`, and
  2 uploads PDFs.

**Images.**
- `ref` is the local file `assets/source/…`, taken from `image-inventory.json → localFile`; `srcUrl` is the source URL.
  The source attribute is `data-src`, never the lazy `data:` placeholder.
- `master` is a larger local file from the srcset, when one exists.
- `alt` is verbatim. `null` means the attribute was absent; `''` means it was empty.
- `titleAttr`, `w` and `h` come from the source attributes.
- When there is no local file, `ref: null` and `missing` says why:

| missing | count | cause |
|---|---|---|
| download-failed | 14 | refused or failed during the harvest |
| not-inventoried | 38 | 32 images.dutchie.com product shots on event pages, plus 6 CDN files (see 8) |
| platform-placeholder | 1 | Elementor's empty-widget placeholder on /faqs-420/; never render it |

- Inside `html`, an image is `<img src="assets/source/…" data-source-url data-master? data-missing? alt width height
  title>`. The renderer must rewrite `src` through `ctx.img` and drop the `data-*` attributes. If it doesn't, the build's
  dead-asset check catches the relative `assets/source/` path: it fails closed.

## 4. Block types (every type the extractor emits, with a real example)

Examples are trimmed (`...`). Counts are over the 737 models, nested blocks included.

| t | count | source widgets |
|---|---|---|
| heading | 2,546 | heading, theme-post-title, theme-archive-title, aux_modern_heading, animated-headline, h1–h6 in classic HTML or text editors |
| rich | 2,405 | text-editor, theme-post-excerpt, jet-table (`kind: 'table'`), classic p/ul/ol/table/blockquote |
| image | 741 | image, theme-post-featured-image, theme-site-logo (`kind: 'logo'`), jet-banner (`kind: 'banner'`), TEC event image (`kind: 'event-image'`), classic img/figure, images inside headings (`inHeading`) |
| event-field | 532 | tec_events_elementor_widget_event_* (title, datetime, venue, categories, tags, status, export, navigation, calendar_link) |
| button | 459 | button; `kind: 'control'` for a bare `<button>` in plugin markup |
| icon | 292 | icon (inline SVG; `name` such as `fas-parking`) |
| products | 208 | joint_slider, joint_menu, shortcode `#joint-menu` / `.joint-slider` |
| divider | 160 | divider |
| reviews | 152 | Joint Google reviews badge (`kind: 'badge'`), review list (`kind: 'list'`) |
| gallery | 151 | jet-carousel, media-carousel, image-carousel, jet-brands |
| faq | 123 | nested-accordion, toggle |
| postnav | 78 | post-navigation |
| comments, meta | 61 each | post-comments, post-info |
| posts | 41 | archive-posts, posts.classic, posts.cards, jet-posts, loop-carousel |
| embed | 28 | Google Maps / YouTube / Alpine IQ iframes, video, Smash Balloon |
| carousel | 23 | nested-carousel |
| anchor | 23 | menu-anchor |
| html | 21 | html (custom code: calculator, maps) |
| cta | 17 | call-to-action |
| nav | 11 | nav-menu, mega-menu inside a page region (canvas pages, blog archives) |
| search | 7 | search-form, jet-search-suggestions |
| timeline | 4 | jet-timeline, jet-horizontal-timeline |
| form | 4 | form (contact, join-our-team), WordPress password form |
| chrome-ref | 3 | joint_cart and GTranslate inside a canvas page (GTranslate carries `removed: true`) |
| hotspot | 2 | hotspot |
| app, hours, social, sitemap | 1 each | joint_checkout, Joint hours list, social-icons, Rank Math HTML sitemap |
| unknown | 0 | any unmapped widget: `{ t: 'unknown', widget, html }` (the build fails on it) |

Spacer widgets produce no block. Breadcrumb widgets produce no block: their content is `page.breadcrumbs`.

```js
// heading (the home H1; dev = source visibility, informational)
{ "t":"heading","level":1,"text":"Cape Cod Cannabis Recreational Dispensary | Wellfleet, MA","dev":["widescreen","desktop"] }
// heading, a second H1 (/250-years-of-america-.../: the post body repeats the title) -> render as a lower level
{ "t":"heading","level":1,"text":"250 Years of America: Celebrating Independence, Community, and the Spirit of Cape Cod","demote":true }
// heading, animated-headline (/fire-offers-2/; this one is hidden on every device in the source)
{ "t":"heading","level":3,"text":"🔥Fire Offers!!!!🔥","animated":{"before":"","words":["🔥Fire Offers!!!!🔥"],"after":"","highlighted":"🔥Fire Offers!!!!🔥"},"dev":[],"hiddenAll":true }
// rich (allowlist html of docs/CONTENT-MODEL.md section 5; headings h2-h6 may appear inside)
{ "t":"rich","html":"<p><strong>Cape Cod Cannabis Recreational Dispensary</strong> is an adult-use cannabis dispensary located on Route 6 ..." }
{ "t":"rich","kind":"table","html":"<table><thead><tr><th scope=\"col\">Type</th><th scope=\"col\">Method</th>..." }
// image
{ "t":"image","ref":"assets/source/57b016cb-Affordable-Ounces-Homepage-Button-460-x-330.png","srcUrl":"https://b2702268.assetcdn.net/...?lossy=2&strip=0&webp=1",
  "alt":"Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA","titleAttr":"...","w":460,"h":300,"href":"/specials/affordable-ounces-1-2-ounces/" }
{ "t":"image","kind":"banner","ref":"assets/source/42656dd7-Gold-Cape-Cods-Best-CBD-Store.png","alt":"Cape Cod Cannabis was voted Best CBD Store ...","href":"/best-cbd-store-on-cape-cod/" }
// button
{ "t":"button","label":"Order Now","href":"/specials/wana-gummies-2-for-55/" }
// products (Joint grid / rail): label = nearest preceding heading in the same section, verbatim
{ "t":"products","source":"joint","widget":"slider","via":"widget","params":{"collections":"Blazing Bargains | Flower","limit":"100"},
  "filters":[{"field":"collections","values":["Blazing Bargains | Flower"],"type":"any"}],"sort":null,"limit":100,"label":"Product Spotlight","labelFrom":"heading","clientRendered":true }
// faq (nested-accordion: items hold full block lists; toggle: the same shape)
{ "t":"faq","kind":"nested-accordion","items":[{"q":"WHY CAPE COD CANNABIS","blocks":[{"t":"image",...},{"t":"heading","level":2,"text":"2026 Cape Cod Choice Awards: ..."},...]}] }
{ "t":"faq","kind":"toggle","items":[{"q":"Where is Cape Cod Cannabis located?","blocks":[{"t":"rich","html":"<p>Cape Cod Cannabis Recreational Dispensary is located at <b>1446 US-6, ..."}]}] }
// carousel (nested-carousel: slides hold block lists; editorTitles are editor-only, never render)
{ "t":"carousel","kind":"nested","editorTitles":["Affordable Ounces","Infused Pre-rolls","Disposables"],"settings":{"autoplay":"yes","autoplay_speed":5000,"slides_to_show":"1"},"slides":[{"blocks":[{"t":"image",...}]}] }
// gallery
{ "t":"gallery","kind":"jet-carousel","items":[{"image":{"ref":"assets/source/7094f275-Flower-Tile-for-Website.png","alt":"Flower Tile for Website",...},"href":"/categories/flower/","title":"Flower"}] }
{ "t":"gallery","kind":"jet-brands","items":[{"image":{"ref":"assets/source/1b41e5cd-Garcia-Hand-Picked-Logo.png","alt":"Garcia Hand Picked Logo"},"href":"/brands/garcia-hand-picked/?brand=Garcia%20Hand%20Picked","title":"..."}] }
{ "t":"gallery","kind":"media-carousel","settings":{"autoplay":"yes","effect":"fade","loop":"yes"},"items":[{"image":{"ref":null,"srcUrl":"https://b2702268.assetcdn.net/.../Loyalty-VIP-1-1176x500-1.png?...","missing":"not-inventoried","alt":"Shop your Loyalty VIP Points ..."}}] }
// posts (listing snapshot; loop-carousel items carry block lists)
{ "t":"posts","kind":"posts.classic","items":[{"title":"Glassware","href":"/categories/accessories/glassware/"}] }
{ "t":"posts","kind":"posts.cards","items":[{"title":"&Shine","href":"/brands/shine/"}],"loadMore":{"maxPage":21} }
{ "t":"posts","kind":"loop-carousel.post","items":[{"blocks":[{"t":"image",...},{"t":"heading",...},{"t":"rich",...},{"t":"button","label":"Order Now",...}],"href":"/specials/wana-gummies-2-for-55/"},...] }   // 12 offer cards on the home page
// cta
{ "t":"cta","title":"Shop Sleepy Products","text":"VIEW NOW","href":"/effects/sleepy/","image":{"ref":"assets/source/dd20d5df-CLOUD-CITY-Effects-Dutchie-Sleepy-768x384.webp","alt":"Shop by Effects - Sleepy"},"ariaLabels":["Shop by Effects - Sleepy"] }
// reviews (third-party snapshot, keep dated)
{ "t":"reviews","source":"joint","kind":"badge","rating":"4.9","count":"(967)","text":"4.9 (967)","logo":{"ref":"assets/source/5cec7fe2-google-logo.png","alt":"Google Logo"},"snapshot":true,"ariaLabels":["4.9 Stars"] }
{ "t":"reviews","source":"joint","kind":"list","snapshot":true,"items":[{"author":"Lyn Clements","time":"10/08/2026 09:39 PM","rating":"5.0","ratingLabel":"5 Stars","text":"Hannah was the icing on the cake ...","avatarUrl":"https://lh3.googleusercontent.com/..."}] }
// hours (the only page-region one, on /free-bar-coasters/, is hidden on every device)
{ "t":"hours","source":"joint","rows":[{"day":"Sunday","time":"8:00am – 8:00pm"},{"day":"Monday","time":"8:00am – 8:00pm"},...],"dev":[],"hiddenAll":true }
// embed
{ "t":"embed","kind":"gmap","src":"https://www.google.com/maps/embed?pb=...","w":"600","h":"450" }
{ "t":"embed","kind":"video","src":"https://capecodcannabis.com/wp-content/uploads/2026/06/So-Cool-400x600-1-2.mp4","settings":{"video_type":"hosted","autoplay":"yes","loop":"yes"} }
// html (custom code, /daily-purchase-limit-in-ma/ calculator): text = every visible string (labels, select options);
// html = the sanitized markup (form controls removed); controls = the form controls, to rebuild by hand
{ "t":"html","review":true,"text":"Open Calculator\nX\nDaily Limit Calculator\n(For educational purposes only. Limits may vary based on actual potency)\nFlower (grams):\n...\nMoonrocks:\nChoose from dropdown\nCrude Boys | Frosted Buds\n...\nTOTAL\nClear",
  "html":"Open Calculator X<h5>Daily Limit Calculator</h5><h6>(For educational purposes only. Limits may vary based on actual potency)</h6>",
  "controls":[{"tag":"button","label":"X"},{"tag":"input","type":"number","name":"flower","placeholder":"0"},...] }
// form (rendered unwired: BUILD-CONTRACT 4.6)
{ "t":"form","name":"Application Form","fields":[{"tag":"input","type":"text","name":"form_fields[name]","label":"Name","placeholder":"Name","required":true},
  {"tag":"input","type":"checkbox","name":"form_fields[field_37e6993]","label":"Age Verification","options":[{"label":"I confirm that I am at least 21 years old","value":"..."}]},{"tag":"button","type":"submit","label":"Apply"}],"submit":"Apply" }
// event-field (TEC single event); title fields carry level
{ "t":"event-field","field":"calendar_link","text":"« All Events","links":[{"label":"« All Events","href":"/events-calendar/"}] }
// meta (post-info), postnav, comments
{ "t":"meta","items":[{"text":"June 19, 2026","href":"/2026/06/19/"}] }
{ "t":"postnav","prev":{"srLabel":"Prev","title":"Cape Cod Cannabis in Wellfleet: A Local Dispensary ...","href":"/cape-cod-cannabis-in-wellfleet-.../"},"next":{"title":"What Is CBD? A Beginner’s Guide","srLabel":"Next","href":"/what-is-cbd-a-beginners-guide/"},"ariaLabels":["Post Navigation"] }
{ "t":"comments","note":"WordPress comment form; no comment backend in a static rebuild" }
// hotspot, timeline
{ "t":"hotspot","image":{"ref":"assets/source/5e15e572-moonrocks2-....jpg","alt":"Moonrocks"},"items":[{"label":"Flower","tipHtml":"<p>Flower (also known as bud) is <b>the smokable part of ..."}] }
{ "t":"timeline","kind":"jet-timeline","items":[{"meta":"1-7 Days","text":"1-7 Days 1. Germination Stage ...","image":{"ref":"assets/source/a83c97d1-Germination-765x300-1.png","alt":"Germination Cannabis Seed - ..."}}] }
// anchor, icon, divider
{ "t":"anchor","id":"Top" }   { "t":"icon","name":"fas-parking" }   { "t":"divider" }
// nav, search, social, chrome-ref, app (inside a page region)
{ "t":"nav","kind":"mega-menu","items":[{"label":"Start Here","href":"/category/start-here/","title":"Start Here"}],"ariaLabels":["Categories","Menu Toggle"] }
{ "t":"search","kind":"search-form","action":"/","method":"get","field":"s","placeholder":"Search Cape Cod Cannabis...","label":"Search","button":"Search","clientRendered":false }
{ "t":"social","items":[{"label":"Facebook","href":"https://www.facebook.com/Cape-Cod-Cannabis-112536844674702/","target":"_blank"}] }
{ "t":"chrome-ref","what":"gtranslate","removed":true,"reason":"GTranslate third-party runtime (BUILD-CONTRACT 4.8)" }
{ "t":"app","what":"checkout","clientRendered":true }
// sitemap (/sitemap/ only: the Rank Math HTML sitemap, grouped)
{ "t":"sitemap","groups":[{"heading":"Posts","level":2,"links":[{"label":"Cannabis Moonrocks: What on Earth Are These Things?","href":"/what-is-a-cannabis-moonrock/"}]}] }
```

`sitemap`, `animated`, `inHeading`, `ariaLabels`, `srLabel`, `conflict`, `demote`, `popup` and the `platform-placeholder`
image reason are additions to the CONTENT-MODEL vocabulary. `faq` items of both kinds use `blocks`, never `a_html`.

**H2 change (2026-10-12, lane H2): container CSS ids.**
- A container's CSS id is an in-page jump target. When the container's own section part holds no block, it used to be
  lost. Example: on /directions/, section 425d858 (`id="directions"`) holds only a nested template section (the map).
- Such an id is now an `anchor` block placed where the container's content starts:
  `{ "t":"anchor", "id":"directions", "via":"container#425d858", "dev"?: [...] }`.
  - `via: 'container#<data-id>'` says the anchor comes from a container. menu-anchor widgets have no `via`.
  - `dev` is the container's visibility. An anchor alone never makes a hidden section visible.
- A continuation part (`cont: true`) no longer repeats the parent's `cssId`, because an HTML id must be unique.
- A container anchor never repeats an id that the page already carries.
- Render it like any `anchor`: `<span id="...">`.
- Measured: the anchor is on /directions/ only (anchor blocks 23 -> 24). A scan of `audit/raw` found 0 containers with
  an id below the top level and 3 container ids inside page regions. 2 are now carried; the third, `#top` on
  /free-bar-coasters/, is in a `hiddenAll` section.
- Outputs are written atomically: each file goes to `<file>.tmp` and is renamed over the target, so a parallel reader
  never sees a truncated `_index.json`, `chrome.json` or page file. No page file is deleted during a run.
- `--out <dir>` writes a dry run into `<dir>` (pages, `chrome.json`, `_index.json`).

## 5. Rules as implemented

**Region.**
- `<main>` (112 pages) plus any Elementor popup doc outside it. The only popup is #236015 on /about-cape-cod-cannabis/.
- Otherwise (625 pages), the body children minus the Elementor header and footer docs, `<template>`, scripts,
  `#joint-ecommerce` and the skip link.
- Inline `display:none` subtrees are skipped and logged in `ledger.removed` (the WP Defender honeypot).

**Visibility.** A node is visible on a view unless it or any ancestor carries `elementor-hidden-<view>`. The views are
widescreen, desktop, tablet, mobile_extra and mobile. `tablet_extra` is a 1px band at 1026px and is ignored, so a node
visible only there counts as hidden everywhere (docs/CONTENT-MODEL.md section 1). `tools/text-parity.mjs` applies the
same rule with its own code.

**hiddenAll.**
- A block visible on no view gets `hiddenAll: true`. A section whose blocks are all hidden gets `hiddenAll: true`
  itself.
- The content is kept verbatim and is never rendered visibly. The parity check does not require it, because it is
  invisible on the source too, but checks it against the source in the ADDED guard.
- Example: home container f6c0f7e is the hidden twin of the visible 3d04197.
- Correction to docs/CONTENT-MODEL.md item 3: container 2f8428b itself is visible at ≥1027px, but its only widget,
  d0b282b, carries all six `elementor-hidden-*` classes. The 110-word "Cape Cod Cannabis Dispensary in Wellfleet, MA"
  block is therefore hidden everywhere, and is modelled `hiddenAll`. The home H1 and its intro (6b8afef) are visible on
  widescreen and desktop and are kept.

**Device-duplicate collapse.** This is the rule of docs/CONTENT-MODEL.md section 4, implemented over each page's
top-level blocks:
1. U = for each normalised line, the largest number of times any one view shows it.
2. Blocks visible on all five views are kept, and their lines are counted into K.
3. Device-limited blocks are visited from the widest visibility to the narrowest, in document order within a tie.
   - A block is dropped as a duplicate (`ledger.collapsed`, with its full text) only when every one of its lines is
     already in K up to U.
   - Otherwise it is kept and renders on every device.

A line present in only one variant is therefore never lost. Kept variants that share some lines get `partialDuplicate`.
Kept variants on disjoint views whose lines match once digits are masked but differ in their numbers get
`conflict: true` and a `numbers-differ-by-device` entry. Result: 16 blocks collapsed on 1 page, 204 device-limited
blocks kept, and 6 conflicts, all 28 g vs 56 g.

**H1.**
- `h1` is the first level-1 heading that is not hidden everywhere. Other level-1 headings carry `demote: true`
  (58 blocks on 34 pages; /cannabis-101-the-beginners-guide/ has 10).
- 28 pages have no H1 in the source: 6 sale landings, 10 effects, 5 strain pages, /categories/, /links/,
  /moodi-day-review-portal/ and 4 others. For them, `h1Source.candidates` lists verbatim options: the first visible
  heading, the last breadcrumb label, then the title. The site lane picks one, because the build requires exactly one H1.

**Products.**
- Each Joint mount becomes a `products` block with the stored `filters`, `sort` and `limit`, and `params` (the non-null
  `raw` preset without `post_id`).
- `label` is the nearest preceding heading in the same section, or null.
- `page.catalog` lists them: 208 mounts on 143 pages.

**Chrome removal from pages.** The header, footer, age-gate template and honeypot are never in page models. The nav-menu
dropdown clone is the same menu printed twice and is stored once.

## 6. Results (2026-10-12 run)

| Check | Result |
|---|---|
| Pages extracted | 737 (+ chrome.json + _index.json = 739 files) |
| Sections / blocks | 2,720 sections; block counts in section 4; 0 unknown; 0 widget loss |
| Text parity, models (`node tools/text-parity.mjs --control`) | 23,987 units (20,729 text, 2,004 alt, 1,237 aria-label, 16 placeholder, 1 value) → 25,468 sentences; found 25,407 + declared 61; **recall 1.000000**; missing 0; **ADDED 0**; 122 matched only with whitespace ignored (121 are post-navigation, where the source glues "Prev"/"Next" to the title; 1 is a social-label row) |
| Chrome parity (part of the above) | 182 units, 118 sentences, 117 found + 1 declared (the agency logo alt) |
| Control a | deleting "Cape Cod Cannabis Recreational Dispensary is an adult-use cannabis dispensary located on Route 6 …" from the home model in memory → exactly that sentence reported missing: PASS |
| Control b | inserting "Zebra lanterns orbit the quiet harbor every 4417 seconds." into the home model → exactly that sentence reported ADDED: PASS |
| `--built` mode (synthetic dist, `tmp/pipe-content/make-test-dist.mjs`) | clean: 737 pages, 25,350 sentences, recall 1.0, ADDED 0, hiddenShown 0 (percent-encoded paths written decoded and still found; `hidden` copy and text outside `<main>` ignored). With `--break` (one sentence deleted on /faqs-420/, one invented on /directions/, the home page's hidden copy shown): exactly the deleted and the invented sentence, plus 12 hidden-only home sentences (the retired offer rails, the repeal message), are reported, exit 1 |
| Determinism | two consecutive runs byte-identical (739 files, final manifest sha256 `3705c23f…`, re-checked after every change) |
| Query variants | 6 of 6 have page-region text identical to the base page |
| Chrome identity | header + footer text identical on 735 pages; /links/ and /free-bar-coasters/ have none |

Bugs that the parity tool caught and that are fixed (none is visible in the final numbers):
- an `<img>` inside an `<h3>` was dropped (home FAQ award badge, 24 pages);
- jet-timeline images were dropped;
- `<button>` text inside plugin markup was dropped (the Tribe "Next Events" pager);
- `<b> </b>` lost its space ("andapparel");
- an Elementor popup outside `<main>` was missed;
- the 28 g / 56 g conflict was not flagged.

## 7. Chrome model (`src/content/chrome.json`)

The chrome is extracted once, from `audit/raw/index.html`. Every part records `from` (widget or container id). Hrefs are
normalised like page links, and `sourceHref` keeps the verbatim source href wherever normalisation changed it.

| Key | Content |
|---|---|
| `source` | file, header doc `header#18695`, footer doc `footer#1996`, `chromeTextGroups` (735 identical + 2 without chrome) |
| `skipLink` | "Skip to main content" → `#content` |
| `announcement` | the "Boards in the Stores …" ticker → `/boards-in-the-stores-2026-returns-to-cape-cod/`, `hiddenAll: true` (container 5664df5) |
| `logo` | image block (`ref`, alt "Dispensary near me \| Cape Cod Cannabis Dispensary in Wellfleet, MA", href `/`) |
| `nav` | `items` tree `{label, href, sourceHref?, target?, hrefStatus?, children?}`, 3 levels, verbatim. "Cannabis 101" `/intro-to-cannabis` resolves to `/intro-to-cannabis-101/`; "Hours of Operation" `#hours` is `dead-anchor`. `toggleLabel` "Menu Toggle" |
| `mobileMenu` | `sameAsNav: true`: the dropdown clone is the identical tree (checked) |
| `mega` | the two n-menu strips `[{id, items:[{label, href, title}]}]` ("⭐ Daily Offers ⭐" … "Apparel"; "Effects" … "Cannabinoids"). No item has an image |
| `megaHint` | "Scroll left-right to view categories", visible on tablet, mobile_extra and mobile |
| `search` | GET `/`, field `s`, placeholder "Search Cape Cod Cannabis...", label "Search", button "Search" |
| `ajaxSearch` | JetSearch widget, `hiddenAll: true`, with its 6 category options |
| `translate` | GTranslate, `removed: true` with reason |
| `footer.sections` | the footer doc walked with the page walker (same block types). Contents: newsletter band ("JOIN OUR NEWSLETTER"); hidden loyalty note (`hiddenAll`); logo, tagline, social; Hours (visible list, plus a hidden Joint hours list); Contact; Menu and Learn columns; copyright, legal links and "#MR282685"; service area (16 towns); Chambers; hidden push prompt; GTranslate ref; back-to-top button and cart ref |
| `agencyCredit` | `removed: true`, reason BUILD-CONTRACT 4.8, link `https://www.rankreallyhigh.com/`, logo alt; excluded from `footer.sections` |
| `backToTop` | `#topBar` |
| `cart` | Joint cart config `{color, variant: fixed, icon: store, size: small}` |
| `ageGate` | `headline` "Welcome!", `challenge` "Are you over 21 years of age?", `yes`, `no`, `notes` ["*Must be 21+ with a VALID ID.", "Always worth the trip!"], `matchesContractCopy: true`; plus `ariaLabel` "Verify you are over %s years of age?" (the plugin never fills %s), logo, hidden fields |
| `removed` | honeypot, agency credit, GTranslate (each with a reason) |

## 8. Known limits and hand-offs

- **Dead and unknown links** are annotated, not retargeted (BUILD-CONTRACT 4.13 leaves the targets to the site lane):
  - 20 dead targets (117 occurrences);
  - 11 blocked `/offers/*` links;
  - unknown: `/2021/`–`/2026/` (56 links), `/events-calendar/month/` and `/today/`, and
    `/wp-content/uploads/2024/01/Testing-Protocol-Flyer.pdf` and `…/2026/07/Dispensary-Messaging-Stop-the-Repeal-Flyer-8.5x11.pdf`.
- **Images without a local file:**
  - 14 failed downloads.
  - 32 images.dutchie.com product shots on event pages (allowed host for Plan A, hotlink).
  - 6 CDN files never inventoried, which the imagery lane can fetch from the allowed CDN:
    `uploads/2026/08/New-Arrival-Cape-Cod-Grow-Lab-1176x500-1.png` and `uploads/2026/07/Cannabis-Seed-Restocked.png`
    (home), and `uploads/2025/02/Loyalty-VIP-{1..4}-1176x500-1.png` (/shop-your-loyalty-points/).
  - The Elementor placeholder on /faqs-420/.
- **Media:** `embed.kind: 'video'` keeps the origin URL (`capecodcannabis.com/wp-content/uploads/…mp4`). The 19 media
  files were refused by the lockout ledger. The site lane must map or drop them, because the build fails on
  `capecodcannabis.com/wp-content`.
- **A meta description that holds an origin URL.** The verbatim `metaDescription` of
  `/cannabis-chronicles-insights-into-premium-products/` is "Cannabis Chronicles: Insights into Premium Products |
  https://capecodcannabis.com/wp-content/uploads/2021/12/Strane-Purgatory.mov | Cape Cod Cannabis". The build's
  `capecodcannabis.com/wp-content` check will fail on it. The site lane must decide, and declare any edit.
- **Platform runtime removed from models:**
  - the WP Defender honeypot;
  - the Smash Balloon admin error;
  - The Events Calendar AJAX spinner.

  Each is logged in `ledger.removed`; the two that carry text are declared in `removals.json`. The TEC view-loader
  live-region text ("1 event found.") is kept as copy.
- **Snapshots:** Google reviews (author, time, text, avatar URL) and the badge are third-party snapshots, kept verbatim.
- **Flat structures:** jet-horizontal-timeline items come out per track (meta / card), not grouped by event; all text is
  kept. Event `venue`, `datetime` and `export` fields carry `text` with line breaks, not structured address parts.
- **h1Source.candidates** are suggestions only. The site lane decides the single H1 of the 28 pages that have none.
- **Breadcrumbs from JSON-LD** (239 pages) were not visible on the source. Rendering them is a design choice: the
  labels are verbatim from the source's JSON-LD.
- **Parity scope:**
  - Sentence presence, not multiplicity.
  - Whitespace-insensitive fallback matching can bridge two adjacent model strings. Every such match (122) was reviewed.
  - JSON-LD and head fields are copied verbatim and are not scored here. The SEO lane scores them.
- **Disk case collision:** `/categories/cbd/` and `/categories/seeds/` are modelled from the uppercase variants' bytes
  (`rawNote`). Their page-region text is UNVERIFIED against the lowercase responses, which were never saved.

## 9. Conflicts with other docs (BUILD-CONTRACT wins)

1. **Head fields.** The brief says `head: { title, … }`, but BUILD-CONTRACT 3.3 puts `title, metaDescription, canonical,
   robots, og, jsonLd` at the top level of `page`. The models follow the contract.
2. **Hidden copy.** docs/CONTENT-MODEL.md section 4 drops hidden-everywhere blocks to `ledger.hiddenEverywhere`.
   BUILD-CONTRACT 4.5 keeps them with `hiddenAll: true`. The models follow the contract.
3. **docs/CONTENT-MODEL.md item 3** says container 2f8428b is visible at ≥1027px. Its only widget is hidden on all six
   breakpoints (section 5).
4. **audit/understand/ia-map.json** tags the 2 uploads PDFs as "case variant" routes with a slashed lower-case canonical
   (`…/things-you-should-know-cannabis.pdf/`). The extractor ignores case-variant notes on non-HTML routes, so links to
   those PDFs keep their exact path.

## 10. Files

| File | Role |
|---|---|
| `src/lib/extract.mjs` | the extractor (exports `extractPage`, `extractChrome`, `extractHead`, `regionNodes`, `visibleViews`, `blockText`) |
| `src/lib/html-util.mjs` | shared HTML helpers (`parse`, `findAll`, `findFirst`, `textOf`, `decode`, `sanitizeRich`, `richText`, `stableJson`, …); PIPELINE-SITE may import, never edit |
| `src/content/pages/*.json`, `_index.json` | page models and the index (`{slug, path, kind, wpTemplate, sourceUrl, title, h1, variants, sections, hiddenAllSections, products, unknown}` per page, plus totals) |
| `src/content/chrome.json` | chrome model |
| `src/content/removals.json` | declared removals (`removals[]`: id, pages, text or pattern, reason) and `allowedAdded[]` for future theme microcopy in `--built` mode |
| `tools/text-parity.mjs` | the independent checker (own tokenizer; exports `extractUnits`, `sentences`, `compare`, `modelTexts`, `norm`) |
| `tmp/pipe-content/` | scratch: patch scripts, debug probes, the `--built` fixture, run reports |

## 11. H1 change (lane H1, 2026-10-12): the built-output parity gate and the stub's block coverage

Why: the WF3a verifier (`tmp/pipe-verify/verifier-result.json`) ran `--built` on the real build and got recall 0.8996
(2,545 missing, 4,780 added), while every other gate passed, and the `--built` control could not run on a dirty build.
BUILD-CONTRACT 4.16 now makes built-output parity a gate. The real theme starts from the stub's block renderers and must
keep this gate green. Files: `tools/text-parity.mjs`, `src/content/removals.json`, `src/theme-stub/{index.mjs,stub.js,stub.css}`.

### 11.1 The gate (BUILD-CONTRACT 4.16.1)

```
node tools/text-parity.mjs --built <dist> --control [--control-dir <dir>] [--json <file>] [--quiet]
```

It must exit 0. It exits 1 on any miss, ADDED string, hiddenShown sentence or failed control, and 2 when
`src/content/removals.json` is malformed. `--control-dir` defaults to `tmp/text-parity-control`, and the tool refuses a
control dir inside `<dist>`.

| rule | what is compared |
|---|---|
| recall, pages | every visible source sentence of the page region (section 5) must occur in the built page's `<main>`, or match a `removals[]` entry |
| recall, chrome | the source chrome (header and footer docs plus the age-gate template of `chrome.source.file`) against each built page's `<body>` outside `<main>`. Identical built chromes are compared once (`chromeVariants` in the report) |
| ADDED | a built string is allowed only when (1) it occurs in the page's raw source (all text and attribute values, hidden copy included; for the chrome, the raw file of `chrome.source.file`), or (2) it matches an `allowedAdded[]` entry, or (3) it sits inside an element marked `data-catalog` and its whole text equals a product title or brand name in `src/content/catalog/*.json`. Text inside `data-catalog` is checked ONLY against the catalog, so an invented title there fails even if its words occur elsewhere. Everything else is ADDED and fails |
| hiddenShown | a sentence that exists only in copy the source hides on every device (the model's `hiddenAll`, the chrome's hidden parts such as the Sunday-first hours lists) must not be visible in the built `<main>` or chrome. Hidden copy may stay inside an element with the `hidden` attribute or `data-hidden-all` |
| units | text runs per block element, plus `alt`, `aria-label`, `placeholder` and submit/button `value`. A `data-catalog` element is a unit boundary in built pages |

**Controls.** In `--built` mode each defect is planted in a COPY of one built page, never in `<dist>`, and judged by
the difference from that page's own baseline. So the controls fire on a dirty build too; the target page does not need
to be clean.

| control | planted | expected |
|---|---|---|
| built-a | a unique ASCII source sentence of 8+ words deleted from the copy | exactly that sentence newly missing |
| built-b | `<p>Zebra lanterns orbit the quiet harbor every 4417 seconds.</p>` | exactly that sentence ADDED |
| built-c | an undeclared `aria-label` ("Quokka lanterns glow twice") | exactly that label ADDED |
| built-d | `<ul data-catalog><li>Zebra Lantern Kush \| 3.5g \| Harbor Cut</li></ul>` | ADDED (data-catalog text not in the catalog) |
| built-e | a declared `allowedAdded[]` text, plus a real catalog title inside `data-catalog` | nothing reported |
| built-f | the same catalog title outside `data-catalog` | ADDED (the exemption is scoped to `data-catalog`) |
| built-g | a hidden-only sentence of the first page that has one | exactly that sentence in hiddenShown |
| built-chrome-a, b, c | a footer sentence deleted; an invented footer sentence; hidden chrome copy shown in the footer | missing; ADDED; hiddenShown |

Model mode (no `--built`) keeps its two controls (delete and insert in a model, in memory).

### 11.2 Declared lists (`src/content/removals.json`, BUILD-CONTRACT 4.16.2)

Each entry has an `id`, a `reason`, and `text` (one normalised sentence, matched exactly) or `pattern` (tested against
one normalised sentence). Optional fields: `pages` (`'*'` or output paths, `'#chrome'` for the chrome) and `kinds`
(`text`, `alt`, `aria-label`, `placeholder`, `value`).

| list | id | what | pages |
|---|---|---|---|
| removals | `agency-credit` | the agency credit logo alt (4.8) | chrome, /free-bar-coasters/ |
| removals | `smash-balloon-admin-error`, `tec-loading-spinner` | plugin runtime output (unchanged) | all |
| removals | `widget-accordion-instructions` | aria-label "Accordion. Open links with Enter or Space, close with Escape, and navigate with Arrow Keys" (4.16.3). Native details/summary needs no replacement | all, aria-label only |
| removals | `widget-slider-labels` | aria-labels "Carousel", "Image Carousel", "Slides", "N of M", "Previous", "Next" (4.16.3). The stub shows slides as a static list | all, aria-label only |
| removals | `tec-add-to-calendar-label` | "View links to add events to your calendar": the calendar-export feature is dropped (its links are unlinked, docs/PIPELINE-SITE.md) | all, aria-label only |
| removals | `tec-calendar-view-controls` | the 7 page-level TEC view-switcher, list-pagination, date-picker and list-container labels | /events-calendar/, aria-label only |
| removals | `omitted-video-play-label` | "FINAL-MILO-INTRO.mov Play video" (the player is omitted, 4.15.6) | 2 treeworks event pages |
| removals | `age-gate-aria-label-placeholder` | "Verify you are over %s years of age?" (paired with its replacement below) | chrome |
| removals | `purchase-limit-28g-variant` | the 8 sentences of the 28 g item of the tablet/mobile accordion (4.16.4). The accordion's other two items contradict nothing and stay rendered (4.2) | /daily-purchase-limit-in-ma/ |
| allowedAdded | `plan-b-handoff` | "Check price and availability" (4.5) | all |
| allowedAdded | `snapshot-date` | "as of 2026-10-12" (prices 4.5, review capture date 4.7) | all |
| allowedAdded | `popup-close` | "Close" (the about-page popup dialog) | /about-cape-cod-cannabis/ |
| allowedAdded | `chip-source-labels` | "(from the product name)", "(from the product's web address)" (4.16.7; product pages are not parity-checked) | all |
| allowedAdded | `age-gate-plugin-strings` | the plugin's error, customTitle and cookie warning, verbatim from its script config (4.15.2) | all |
| allowedAdded | `age-gate-aria-label` | "Verify you are over 21 years of age?" | all, aria-label only |

A theme that adds microcopy (a carousel's own labels, an iframe title, reviewer initials as text) declares each string
in `allowedAdded[]` with a reason. A theme that restores a removed label verbatim deletes its entry.

### 11.3 Block coverage: what the stub renders (the theme must render at least these fields)

Every block and section with `hiddenAll` is skipped. Images go through `ctx.img` with the alt verbatim (`null` alt
becomes `""`). A `platform-placeholder` image is never rendered.

| t | fields rendered | notes |
|---|---|---|
| heading | `text`, `href`, `level` (build-normalised) / `as` | `ariaLabels` (a video play label) is not rendered (declared) |
| rich | `html` via `ctx.rich` | |
| image | `ref`/`srcUrl`, `alt`, `titleAttr`, `w`, `h`, `href` (+`target`), `caption`; `ariaLabels` as a rating graphic `<span role="img" aria-label="4.9 Stars">` | |
| button | `label`, `href`, `target` | |
| faq | `items[].q` (summary), `items[].blocks`, `items[].open` | native `<details>`; the accordion instructions are declared |
| carousel | `slides[].blocks` | static list; slider labels declared |
| gallery | `items[].image` (img with `alt`, `titleAttr`), `items[].title`, `items[].caption`, `items[].href` or `image.href` | the verifier's 1,132 lost images |
| posts | `items[].title`, `href`, `image`, `meta`, `excerpt`, `more`; the `more` link carries its verbatim `ariaLabels` entry "Read more about <title>"; `items[].blocks` (the home offer cards: image, heading, text, "Order Now"); `pagination` `{text, links}` as the source token line (linked pages linked, the current page plain), in a `<nav>` named by the block's remaining label ("Pagination") | no "[object Object]" |
| cta | `ribbon`, `image` (alt), `title`, `text`, `button`, `href` | |
| products | the Plan B listing: brand pages list `page.products` inside `<ul data-catalog="products">`, then the hand-off | |
| reviews | list: `author`, `time`, `rating` as separate elements, `ratingLabel` as the rating graphic's label, `text` one paragraph per line; badge: `logo` (alt "Google Logo"), `ariaLabels` ("4.9 Stars"), `rating`, `count`; both show the capture date "as of 2026-10-12" | no separator text (4.16.6); avatars are not used (4.7); `avatarAlt` equals the author |
| hours | `rows[].day`, `rows[].time` | the only page-region hours block is hiddenAll |
| embed | `src` (external only), `w`, `h`, `title` when the model has one | no invented iframe title; origin videos render an empty `.embed-missing` frame |
| html | `html` via `ctx.rich`, then every `text` line the html does not already show, one element per line; `controls` placed at their label lines (a line ending in ":" labels the next input or select; a button at its label's line; a select at its first option's line); `embed` | the calculator renders as labelled, disabled controls |
| form | `intro[]`, `fields[].label`, `placeholder`, `required`, `ariaLabel`, `options[].label` (checkbox and radio as a fieldset with one labelled input per option; select options), `submit`, any `text` line not shown otherwise | unwired (4.6). Field names are neutral, from the first 4 words of the label; the form's `aria-label` only when the model's `ariaLabels` holds `name` (4.16.8) |
| hotspot | `image` (alt, title), `items[].label` as a disclosure summary, `items[].tipHtml` via `ctx.rich` | |
| timeline | `items[].meta` (when the text does not already hold it), `items[].image`, `items[].text` | |
| meta | `items[].text` with `items[].href` | |
| postnav | `prev`/`next` `srLabel` (visually hidden) and `title`, or `label`, in the model's key order (the source order: prev = [srLabel][title], next = [title][srLabel]); `<nav aria-label="Post Navigation">` | |
| event-field | `text` with each `links[]` label linked, `level` (heading); a `navigation` field with `ariaLabels` ("Events") becomes a named `<nav>` | "Venue location map" (map iframe, not read by the checker) and the export label (declared) are not rendered |
| nav | `items` tree, `ariaLabels` ("Categories") as the nav name, `toggleLabel` / "Menu Toggle" as the toggle button's label | |
| search | `action`, `field`, `placeholder`, `label` (input aria-label), `button` | |
| social | `items[].label`, `href`, `target` | |
| sitemap | `groups[].heading`, `level`, `links[]` | |
| anchor, divider, icon, app | `id`; `<hr>`; label when present; empty mount | |
| comments, chrome-ref, excluded | nothing | |

### 11.4 Page, chrome and behaviour rules

- **Breadcrumbs (4.16.5).** Shown only when the model's `breadcrumbsSource` is `'visible'`, plus on product pages
  (Plan B, 4.5) and derived pages (no source page). One line: the crumbs joined by the model's `breadcrumbsSeparator`
  (" / "), inside `<nav aria-label="breadcrumbs">` (`breadcrumbsLabel`). The 239 JSON-LD-only pages show none.
  The build copies `breadcrumbsSource`, `breadcrumbsSeparator`, `breadcrumbsLabel` and the page-level `ariaLabels`
  onto `page` (lane H2); product and derived pages have none.
- **Chips (4.16.7).** Each chip prints its own caption, `chip.source` ("from the product name" or "from the product's
  web address"). A brand matched from the URL slug (`brand.match: 'slug-start'`) says "(from the product's web
  address)" after the brand link.
- **Popup (4.15.9).** `popup: true` sections render as `<dialog class="popup" data-popup ...>` inside `<main>`, named
  by the popup's first heading or image alt, with a "Close" button. The trigger comes from the source's
  `data-elementor-settings` on popup #236015: `triggers: {page_load: "yes", page_load_delay: 1}`,
  `timing: {times: "yes", times_times: 2, times_period: "session"}`. stub.js opens it 1 s after load (after the age
  gate is answered), at most twice per session (`sessionStorage`). Escape and Close close it. With JS off it never
  opens, as on the source.
- **Age gate (4.15.2).** The dialog is closed in the markup, so with JS off the page stays readable. stub.js opens it
  unless `localStorage['ccc-age-21'] === '1'`, and sets `document.title` to the plugin's customTitle while it is open.
  "No" keeps it open, shows "You are not old enough to view this content" (`role="alert"`) and lets the visitor answer
  again. "Yes" stores consent, restores the page title and closes it. Escape cannot dismiss it: Chrome makes the
  `cancel` event non-cancelable without user activation, so a close without "Yes" reopens the gate. If storage throws,
  the plugin's cookie warning shows, and "Yes" admits for that page view.
- **Hours (4.15.3).** The footer's visible "Hours" heading and the Monday-first list after it are wrapped in
  `<div class="hours" id="hours">`, the target of the header's "Hours of Operation" link. The Sunday-first Joint lists
  are hiddenAll and never rendered; the chrome check's hiddenShown guards them.
- **data-catalog.** Brand-page product lists (`data-catalog="products"`) and the product page's brand link
  (`data-catalog="brand"`) carry it. Nothing else does: hand-offs, chips and copy stay outside.
- **Platform identifiers (4.16.8).** No form, field or iframe takes a platform id as a name or accessible name.
  Class names avoid the 4.14 list, and stub.js and stub.css avoid the build's residue words. The build's residue gate
  fired on a comment that said "Elementor" in stub.js.

### 11.5 Results (2026-10-12, lane H1)

Final run, on lane H2's final code (tmp/h2/DONE, 12:16:10). 763 input files hashed the same before and after.

| check | result |
|---|---|
| `node src/build.mjs --out tmp/h1/final` and a second build into `tmp/h1/final-b` | both exit 0, 0 errors; `node tools/hashdir.mjs tmp/h1/final tmp/h1/final-b --control`: IDENTICAL, aggregate `074c6755559498a9d83551a9a4f72ab0e43819782d4d00ccfeac0a4f7d3a72d4`, control fired |
| `node tools/text-parity.mjs --built tmp/h1/final --control` | exit 0; 25,468 sentences (737 pages + chrome); found 25,205 + declared 263; recall 1.000000; missing 0; ADDED 0 (565 declared added strings; 5,419 data-catalog units, 0 rejected); hiddenShown 0; chrome: 1 variant on 737 pages, recall 1; 11/11 controls pass |
| declarations used (`totals.declaredBy`, `addedDeclaredBy`) | removals: accordion 86, add-to-calendar 60, loading spinner 60, slider 37, 28 g item 8, TEC view controls 7, agency credit 2, video label 2, %s label 1; allowedAdded: hand-off 486, "as of 2026-10-12" 77, "Close" 1, age-gate label 1. Unused: `smash-balloon-admin-error` (unused in model mode too), `chip-source-labels` (product pages are not checked), `age-gate-plugin-strings` (hidden until shown, so not read) |
| the same controls on the verifier's dirty build (`tmp/pipe-verify/dist-a`, the old stub) | exit 1 as it must (recall 0.907610, 2,353 missing, 4,294 ADDED); the target page `/` had 49 missing and 1 added at baseline, and all 11 controls passed |
| model mode `node tools/text-parity.mjs --control` | exit 0; 25,468 sentences, found 25,407 + declared 61; recall 1; missing 0; ADDED 0; both controls pass |
| `node tools/link-check.mjs --dir tmp/h1/final` | exit 0; 6,734 HTML+CSS files, 801,727 local refs, 13,525 fragments, 0 broken; control fired |
| `node tools/build-check.mjs --dir tmp/h1/final` | exit 0; 0 findings; routes 6,732/6,732, sitemap 6,542, products 5,857/5,857; control fired (17 planted defects) |
| age gate and popup, one headless Chrome over file:// (`node tmp/h1/agegate-test.mjs tmp/h1/final`) | 29/29 checks pass, including Escape, "No" twice, storage-throws and JS off; popup opened 1,016 ms after "Yes"; the HTTP cache holds no http(s) entry; 15 Chrome processes with the run's user-data-dir while running, 0 after close |

## 12. P1 change (2026-10-12): screen-reader-only text (`srOnly`) and decoded `_index.json` paths

BUILD-CONTRACT 4.18.3 and 4.18.6. Models regenerated once with `node src/lib/extract.mjs` (13:35; marker
`tmp/p1/MODELS-DONE`). The change touched 26 page models, `_index.json` and `chrome.json`; every other model is byte
identical (`tmp/p1/diff-models.mjs` against the snapshot `tmp/p1/models-before/`).

### 12.1 Which source text is screen-reader-only

Text inside an element carrying one of these classes is hidden from sighted readers on the live site but read by
screen readers (census of all 743 files in `audit/raw`: `tmp/p1/sr-census.mjs`):

| class | where it carries text in the page region | where in the chrome |
|---|---|---|
| `elementor-screen-only` | contact-form labels; the search-form label on /free-bar-coasters/; social-icon names on /free-bar-coasters/; "Prev"/"Next" in post navigation (already `srLabel`); "Page" before each pagination number (9 pages) | header search label "Search"; footer social names |
| `screen-reader-text` | the jet search-suggestions label "Search ..." (6 pages, hiddenAll blocks); /events-calendar/ "Events" H1 | jet-ajax-search label "Search ..." |
| any class ending in `-visual-hide` (`tribe-common-a11y-visual-hide`) | /events-calendar/: "1 event found.", "Events Search and Views Navigation", "Search", "Event Views Navigation", "List", "Select date.", the "Events" after "Previous"/"Next" | none |
| `tec-a11y-title-hidden` | /events-calendar/ "Events" H1 | none |

**Not screen-reader-only:** `tribe-common-a11y-hidden` (6 elements, /events-calendar/ only). The Events Calendar uses it
as a breakpoint visibility class: it sits on the desktop twin of a mobile element ("datepicker-desktop" next to
"datepicker-mobile"), on the top-bar navigation, "Today" and the list-view description. Its stylesheet is not in
`audit/` (UNVERIFIED), so this text is left as it was (visible copy), and 4.18.4 replaces that calendar UI anyway.

### 12.2 The fields

All markers are booleans except `srPrefix`. A field that is absent means visible text.

| where | field | meaning; how the theme renders it |
|---|---|---|
| any block (`heading`, `rich`) | `srOnly: true` | the block's whole text is screen-reader-only in the source. Render it visually hidden (`<span class="sr">` inside the heading, or around the rich html). The H1 of /events-calendar/ is such a block. |
| inside `rich.html` (also `html`, `tipHtml`) | `<span class="sr">...</span>` | an inline screen-reader-only run among visible text ("Previous <span class="sr">Events</span>"). `ctx.rich` keeps the span and its class; the theme's `.sr` class hides it. A rich block whose html would be one such span becomes `srOnly: true` with the span removed. |
| `form.fields[]` | `labelSrOnly: true` | the field's `label` is screen-reader-only (the contact form: Name, Email, Phone (Optional), Reason for Inquiry, Message). The input and its placeholder stay visible. DESIGN-SPEC 6.21 allows a visible label with the same words; otherwise render `<label>` with class `sr`. |
| `search` blocks, `chrome.search`, `chrome.ajaxSearch` | `labelSrOnly: true`, `buttonSrOnly: true` | the label is screen-reader-only; the button's text is screen-reader-only or only its `aria-label` in the source ("Search", "Search submit"). An icon button keeps the words as its accessible name (`<span class="sr">` or `aria-label`). |
| `social.items[]` (page blocks and the chrome footer) | `srOnly: true` | the item's `label` ("Facebook", ...) is the icon link's screen-reader-only name. |
| `posts.pagination` | `srPrefix: "Page"` | the screen-reader-only word before each page number: `text` "Page1 Page2" and `links[].label` "Page2" print as `<span class="sr">Page</span>2`. |
| `postnav.prev/next` | `srLabel` (unchanged) | already modelled as screen-reader-only text. |

Text parity is unaffected: the words stay in the model and in the built page (they are still text, only visually
hidden). `node tools/text-parity.mjs --control` after the regeneration: exit 0, recall 1, missing 0, ADDED 0.

The stub renders every marker inside `<span class="sr">` (`src/theme-stub/index.mjs`; `.sr` in `stub.css`).
`tmp/p1/srtext-check.mjs` (the verifier's `tmp/hverify/srtext-check.mjs` with one change: `<span class="sr">` counts as
hidden, like `<span class="sr-only">`) on the P1 stub build finds 1 of the verifier's 16 strings still visible: "List" on
/events-calendar/. That visible "List" is the calendar's view-selector link (`span.tribe-events-c-view-selector__list-item-text`,
visible in the source); the screen-reader-only "List" (the selector button's text) is inside `<span class="sr">`.
4.18.4 removes the view selector in the theme.

### 12.3 `_index.json` paths

`_index.json` `pages[].path` and each model's own `path` now use the decoded UTF-8 output path, the form
`src/content/routes.json` uses: `/terpenes/α-pinene/` (was `/terpenes/%ce%b1-pinene/`). This changed the 6 paths with
percent-encoding (5 terpenes and `/cannabinoids/thca-δ9-tetrahydrocannabinolic-acid/`). Links inside the models keep the
lower-case percent-encoded form; the build resolves both.
