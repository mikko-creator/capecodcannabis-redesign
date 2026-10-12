# src/theme: the "Seashore Glass" theme (module map, API, contracts)

Written by lane T0 (theme skeleton), 2026-10-12. The skeleton renders every page kind and passes the four build gates
on its own build (see the T0 report). After T0, each file below has ONE owner. To change a file you do not own,
append a request (what, why, the exact text or code) to `tmp/<owner-lane>/INBOX.md` and carry on.

Binding docs, in order: `docs/BUILD-CONTRACT.md` (wins), `docs/DESIGN-SPEC.md`, `docs/PIPELINE-SITE.md` (page/ctx as
implemented), `docs/PIPELINE-CONTENT.md` section 11 (block fields), `docs/COMPLIANCE.md`.

## 1. Module map and owners

| file | owner | what |
|---|---|---|
| `src/theme/index.mjs` | T1a | the theme module: `styles`, `scripts`, `blockTypes`, `renderPage`, `render404`; dispatch by `page.kind` |
| `src/theme/chrome.mjs` | T1a | the document: head (+ blocking head script), skip link, header, mega, search, phone sheet, Pickup bag drawer, footer, age gate |
| `src/theme/parts.mjs` | T1a | shared partials (section 3) and the image-plan slot reader |
| `src/theme/home.mjs` | T1b | the home page `<main>` |
| `src/theme/blocks.mjs` | T2a | every block renderer, sections, popups |
| `src/theme/templates.mjs` | T2a | every non-home, non-shop kind, and the 404 `<main>` |
| `src/theme/shop.mjs` | T2b | the 12 shop kinds, the `products` block (`renderListing`), the product body |
| `src/styles/{tokens,base,glass,depth,motion,chrome}.css` | T1a | design system and chrome |
| `src/styles/home.css` | T1b | home |
| `src/styles/{interior,blocks,forms}.css` | T2a | interior, blocks, forms |
| `src/styles/shop.css` | T2b | shop |
| `src/scripts/site.js` | T1a | gate, popups, disclosures, dialogs (`CCC.dialog`), phone sheet, Pickup bag drawer (`CCC.bag`), search (index + typeahead, `?s=`), rails, video loops, reveal + fail-safes, seam sweep, parallax, to-top, maps |
| `src/scripts/features.js` | T2a | rails, review toggle, calculator dialog, events |
| `src/scripts/shop.js` | T2b | "Reserve for pickup" (calls `CCC.bag.add`), "View bag" (`CCC.bag.open`), listing filters (bottom sheet via `CCC.dialog.create`) |
| `assets/brand/**` | T1a | logo masters, pattern |
| `src/content/removals.d/theme-chrome.json` / `theme-home.json` / `theme-interior.json` / `theme-shop.json` | T1a / T1b / T2a / T2b | declared microcopy (section 6) |

Bundles: `styles` concatenate in this order into `dist/assets/site.<hash>.css`: tokens, base, glass, depth, motion,
chrome, home, interior, blocks, forms, shop. `scripts` into `dist/assets/site.<hash>.js`: site, features, shop (one
IIFE each; `window.CCC` is the only shared global). In CSS, write fonts and brand files as `url("asset:fonts/<f>")`
(the bundler replaces EVERY `url("asset:...")`, comments included: never write that form in a comment).

Dispatch (`index.mjs`): `home` -> `renderHome`; `shop-menu, products-index, product, brands-index, brand,
categories-index, category, subcategory, specials-index, special, sale-landing, collection` -> `renderShop`; every
other kind -> `renderTemplate`; 404 -> `render404Main`. Each returns the `<main>` inner HTML; `renderDocument` wraps it.
`resetIds()` runs once per page before anything renders (deterministic ids).

## 2. Exported functions (signatures)

All return HTML strings. `ctx` is the pipeline context (PIPELINE-SITE 4); `page` the page object (PIPELINE-SITE 5).

**index.mjs**: `styles: string[]`, `scripts: string[]`, `blockTypes: string[]` (= KNOWN_BLOCKS), `stylesDir`,
`scriptsDir`, `renderPage(page, ctx) -> document`, `render404(ctx) -> document`.

**chrome.mjs**: `renderDocument(page, ctx, mainHtml) -> document`; `AGE_GATE_PLUGIN` ({ error, customTitle, cookies },
verbatim plugin strings); `HEAD_SCRIPT` (inline, blocking: sets `html.js`, `html.age-ok` when consent is stored,
`html.js-reveal` when IntersectionObserver exists and motion is allowed).

**home.mjs**: `renderHome(page, ctx) -> main html`.

**templates.mjs**: `renderTemplate(page, ctx) -> main html`; `render404Main(ctx) -> main html`.

**shop.mjs**: `SHOP_KINDS: Set<string>`; `renderShop(page, ctx) -> main html`; `renderListing(block, ctx) -> html`
(Plan B: evidenced members inside `data-catalog`, plus the hand-off); `productBody(page, ctx) -> html`.

**blocks.mjs**:
- `renderBlocks(blocks, ctx, opts?) -> html`: every visible block, `hiddenAll` skipped. `opts.imgSizes` overrides the image `sizes`.
- `renderBlock(block, ctx, opts?) -> html`: one block; `srOnly: true` renders inside `<span class="sr">` (or `<div class="sr">` around block-level output).
- `renderSection(section, ctx, opts?) -> html`: `<section class="section {opts.cls}" id=cssId data-id>`; '' for `hiddenAll`. `opts: { cls, attrs, inner(bodyHtml) -> html }` (default inner: `<div class="wrap">`).
- `renderPopup(section, ctx) -> html`: a `popup: true` section as `<dialog data-popup>`.
- `pageSections(page, ctx, opts?) -> { html, popups[], hasGrid }`; `opts.section(section, index) -> renderSection opts`.
- `rich(ctx, html) -> html`: `ctx.rich` plus the click-to-load map facade. Never print model HTML raw.
- `sr(inner, on = true) -> html`: `<span class="sr">inner</span>` when `on`. Screen-reader-only source text
  (BUILD-CONTRACT 4.18.3, PIPELINE-CONTENT 12.2) stays in the page, visually hidden: `srOnly` headings get the span
  inside the `<hN>`, `srOnly` rich blocks around the html, other `srOnly` blocks a `.sr` wrapper; `labelSrOnly` form
  labels, `buttonSrOnly` search buttons (an icon stays visible), `srOnly` social items (icon links: label in `.sr`,
  glyph shown) and `pagination.srPrefix` ("Page" before each number) all use it. `ctx.rich` keeps inline
  `<span class="sr">` runs from the source; `.sr` hides them.
- `embed(block, ctx)`, `toggledNav(ctx, cls, navLabel, toggleLabel, items)`, `isWidgetLabel(label)`, `resetIds()`, `uid(prefix)`; re-exports `link`, `image`, `stars`, `LABELS`.
- T2a (15:02): optional `opts.postCard` (e.g. 'glass') for posts cards, passed through `renderSection` / `renderBlocks`.

**parts.mjs**:
- `LABELS`: the theme's own words (each declared; see the comments for the declaration id).
- `slot(id) -> record | null`: `{ id, file, alt, ai, tag, w, h, focal, use, ... }` from `src/content/image-plan.json` (read once per build).
- `slotImg(ctx, id, opts?) -> html`: `ctx.img(id)` with the slot alt (`opts.alt` overrides), width/height, `data-ai` when `ai`, `object-position` from `focal`, and the "AI illustration" tag when `tag` (pass `tag: false` where it paints under 300 CSS px). An unfilled slot renders the sized empty frame with `data-slot`.
- `link(ctx, href, inner, extra?) -> html`: resolved link around already-escaped `inner`; an unbuilt target renders `inner` only.
- `image(b, ctx, sizes?, extra?) -> html`: a model image block through `ctx.img` ('' for the platform placeholder).
- `stars(ctx, label) -> html`: rating graphic, verbatim accessible name, no text.
- `button(ctx, { href, label | inner, variant: ink|glass|ghost|sky, size: sm|lg, type, cls, attrs })`.
- `handoff(ctx, path, { label, cls }?)`: `data-handoff="live-menu"` to `ctx.live(path)` (Plan B). NEVER click one in a test.
- `glassPane(ctx, inner, { tint: aqua|green|blue|hero, smoke, tag, cls, attrs })`, `card(ctx, inner, { tag, cls, attrs })`, `chip(ctx, text, { cls, note })`, `pill(ctx, inner, { href, cls, attrs })`.
- `band(ctx, inner, { tag, cls, attrs, backdrop (slot id or ref), backdropAlt, sizes, pattern, pools, smoke, parallax, wrap })`: plane 0 backdrop/pattern/pools + content. T1a 14:25: the band's LAST child is now `<span class="band__sweep" aria-hidden="true">` (the seam light sweep, run once by site.js; nothing to do on your side).
- `sectionTitle(ctx, text, { level, accent: grad|draw|italic, word, cls, id, href, as })`: ONE accent on one whole token (punctuation stays with its word); emoji headings get none.
- `protrusion(ctx, slotId, { cls, sizes, widths, parallax, breach })`: cut-out in an `aria-hidden` wrapper with `data-protrude`, `pointer-events: none`, `alt=""`, `data-ai`.
- `breadcrumbs(page, ctx, { cls }?)`: only where the source showed them (4.16.5).
- `icon(name, cls?)`: decorative inline SVG (search, bag, caret, close, arrow, up, star).

**site.js shared API (T1a, 2026-10-12; `window.CCC` is the only global):**
- `CCC.dialog.create(rootEl, { panel, closeSel, initial, onOpen, onClose }) -> { open(opener), close(), isOpen() }`: a modal
  sheet/drawer (rootEl toggles `hidden`; focus goes to `initial`, else the first `closeSel` control, else the first focusable;
  Tab and Shift+Tab are trapped in `panel`; Escape and any `closeSel` element close it; focus returns to the opener;
  `html.dialog-open` locks the page scroll). `CCC.dialog.trap(panel, keydownEvent)`, `CCC.dialog.focusables(panel)`.
- `CCC.bag.add({ id, name, variant, price, asOf }) -> count` (adds or increments, re-renders the drawer list with
  "as of <asOf>" and the quantity steppers, updates every `[data-bag-count]`, announces "Added to your pickup bag." in the
  polite live region `[data-live]`); `CCC.bag.open(opener?)`, `CCC.bag.close()`, `CCC.bag.items()`, `CCC.bag.count()`.
  Storage: localStorage `ccc-bag` (preview only, memory fallback when storage throws). Do not announce again after add().
- `CCC.announce(text)`: the shared polite live region. `CCC.search.open(value?)`, `CCC.search.close()`.
- Rails: `[data-rail]` > `[data-rail-track]` (+ optional `[data-rail-prev]` / `[data-rail-next]` buttons with your declared
  labels); one card per press, ArrowLeft/ArrowRight on the focused track, `aria-disabled` at the ends, never automatic.
  `data-rail="manual"` opts out.
- Video loops: `[data-loop]` on a `<video>` (or its wrapper) with `muted playsinline loop preload="none" poster=...`:
  loads within one viewport, plays in view, pauses off-screen; never under reduced motion or Save-Data.
- The head (chrome.mjs) preloads the FIRST `<img fetchpriority="high">` in `<main>` (with its srcset/sizes); inside a
  `<picture>`, each `<source media srcset>` gets its own preload with that media. So mark only the hero high priority.

## 3. Class vocabulary

Never a platform class name (BUILD-CONTRACT 4.14): no `w-container`/`w-row`/`w-col`/`w-nav`/`w-slider` (nor any
class containing `row-container` or `show-nav`), `sqs-block`, `et_pb_`, `elementor-`, `wp-`, `data-wf-`, `svelte-`,
`data-v-`. The residue scan also fails the build on `wp-content`, `elementor`, `joint-ecommerce`, `litespeed`,
`gtranslate`, `googletagmanager`, `rankreallyhigh` anywhere in pages and bundles.

In use: `wrap`, `section`, `band`, `band--smoke`, `band__media`, `band__img`, `band__pattern`, `band__in`, `pool`,
`pool--a/b`, `glass`, `glass--aqua/green/blue/hero/smoke`, `plate`, `scrim`, `card`, `chip`, `pill`, `btn`,
`btn--ink/glass/ghost/sky/sm/lg`, `h-sec`, `h1`, `grad`, `draw`, `ital`, `script`, `fine`, `sr` (also `sr-only`),
`skip`, `ico`, `stars`, `img-missing` (pipeline), `ai-frame`, `ai-tag`, `protrude`, `protrude--<name>`; chrome: `hdr`,
`hdr__bar`, `hdr__logo`, `hdr__tools`, `nav`, `nav__list`, `nav__item`, `has-sub`, `has-mega`, `nav__link`,
`nav__caret`, `drop`, `drop__list`, `mega`, `mega__panel`, `mega__grid`, `mega__feature`, `mcard`, `mcard__labels`,
`mcard__main`, `mcard__sub`, `mega__side`, `mega__offers`, `mega__links`, `mega__pills`, `mega__strip`, `mega__h`,
`mega__hint`, `tool`, `tool--search/bag/burger`, `bag-count`, `search-panel`, `search-form`, `sheet`, `sheet__panel`,
`bag`, `bag__sheet`, `ftr`, `ftr__in`, `ftr__part`, `ftr__sea`, `ftr__notes`, `hours`, `hours-list`, `agegate`,
`agegate__veil`, `agegate__card`, `age-error`, `age-cookies`, `age-target`, `sheet__*` (phone menu), `bag__*` (drawer), `ftr__news`, `ftr__grid`, `ftr__brand`, `ftr__hours`, `ftr__col`, `ftr__legal`, `ftr__area`, `hours-list`, `totop`, `search-*`, `band__sweep`; home: `hero`, `hero__media`, `hero__img`,
`hero__in`, `hero__panel`; content: `rich`, `media`, `gallery`, `posts`, `post-card`, `faq`, `faq__item`, `slides`,
`slide`, `reviews`, `review`, `reviews-badge`, `timeline`, `meta`, `postnav`, `event-field`, `cta`, `map-facade`,
`embed-missing`, `html-block`, `form`, `form__row`, `form__choice`, `crumbs`, `popup`; shop: `listing`, `live-panel`,
`product-list`, `pdp`, `pdp__panel`, `chips`, `handoff`. T2a (15:02): `ihero`, `ihero--<family>`, `ihero--plain`,
`ihero__frame`, `ihero__in`, `ihero__pane`, `ihero__crumbs`, `ihero__h1` (+ `t2`), `iprose`, `iprose--<family>`, `iprose__col`,
`iprose__sec`, `iposts`, `iposts__sec`, `ilisting`, `ical`, `event-list`, `i404`, `i404__in`, `i404__pane`, `i404__cta`,
`btn--on-dark`, `protrude--ihero`, `protrude--<family>`, `protrude--i404`; blocks: `faq__q`, `faq__btn`, `faq__t`, `faq__ico`,
`faq__panel`, `faq__a` (the FAQ is a button + panel, not details/summary), `slides--rail`, `slides__track`, `slides__nav`,
`rail-btn`, `post-card__media`, `post-card__body`, `post-card__meta`, `post-card--noimg`, `review__avatar` (initials painted
by CSS from `data-initials`), `review__who`, `review__body`, `review__more`, `calc-block`, `calc-open`, `calc`, `calc__in`,
`calc__x`, `calc__close`, `calc__out`, `calc__msg`, `jumpbar`.
T2b (15:31): `shero`, `shero--cat` / `--band`, `shero__frame` / `__photo` / `__layer` / `__pane` / `__crumbs`, `shop-h1`, `h1__main`,
`h1__sub`, `subs`, `shop-copy`, `shop-copy__pane` / `__sec`, `shop-live`, `shop-live__sec`, `shop-grid`, `live-panel`,
`live-panel--card`, `live-panel__h` / `__actions` / `__menu`, `listing--grid`, `plist`, `pgrid`, `bcard` (+ `__brand`, `__flag`,
`__name`, `__link`, `__tail`), `fbar` (+ `__open-row`, `__veil`, `__sheet`, `__facets`, `__sort`, `__actions`, `__apply`,
`__active`), `facet` (+ `__btn`, `__chev`, `__panel`, `__list`), `pdp--full` / `--stub`, `pdp__bg` / `__in` / `__stage` / `__crumbs` /
`__brand` / `__title` / `__offer` / `__price` / `__variant` / `__amount` / `__asof` / `__stock` / `__buy` / `__reserve` / `__view` /
`__note` / `__desc`, `lens`, `lens__img`, `pdp-more`, `pdp-sticky`, `chips`, `chip-item`, `chip-note`, `protrude--lens` / `--pane` /
`--cat`. State classes: `is-open`, `is-in`, `is-compact`; on `<html>`:
`js`, `js-reveal`, `age-ok`, `gate-open`, `dialog-open`.

## 4. Data-attribute contract (markup <-> JS)

| attribute | on | read by | meaning |
|---|---|---|---|
| `data-header` | `header.hdr` | site.js | gets `is-compact` after 24px of scroll |
| `data-live` | the polite live region (end of body) | site.js (`CCC.announce`) | bag confirmations |
| `data-totop` | the to-top link | site.js | `is-shown` after one viewport of scroll |
| `data-acc` | phone-sheet accordion buttons | site.js | toggles the panel named by `aria-controls` |
| `data-search-close` | the search Close button (phones) | site.js | closes the search dialog |
| `data-bag-empty`, `data-bag-place`, `data-bag-step` | drawer parts | site.js | empty state; the disabled "Place pre-order"; quantity steppers |
| `data-nav-item` | `li.nav__item.has-sub` | site.js | a disclosure item: `is-open` toggled; hover intent 120/250 ms on fine pointers; Escape, Down Arrow, focus-out |
| `data-caret` | `button.nav__caret` | site.js | the disclosure button (`aria-expanded`, `aria-controls`) |
| `data-mega` | `div.mega` | CSS | the Shop mega panel (open when its `li` is `.is-open`) |
| `data-search-open` / `data-search` / `data-search-results` | button / panel / results box | site.js | search disclosure (a dialog on phones); typeahead from 2 characters; `?s=` opens it pre-filled, hyphens as spaces (4.17.7) |
| `data-src` on `form.search-form` (header) | the search form | site.js | URL of the build's search index JSON, fetched on first use (`ctx.searchIndex`; the build relativizes `data-src`) |
| `data-bag-open` / `data-bag` / `data-bag-close` / `data-bag-items` / `data-bag-count` | button / drawer / close / list / count | site.js (drawer, list, count) | the Pickup bag; `window.CCC.bag.add()` / `.open()` (section 2) |
| `data-bag-add` | "Reserve for pickup" buttons | shop.js | adds the item (t1 only under Plan B) |
| `data-sheet-open` / `data-sheet` / `data-sheet-close` | burger / sheet / close + veil | site.js | phone menu dialog |
| `data-dialog` | every dialog panel (`age`, `sheet`, `bag`, `popup`) | site.js | focus management scope |
| `data-age="yes|no"`, `data-key`, `data-title` | gate links / `dialog#age-gate` | site.js | consent key `ccc-age-21`; customTitle while up |
| `data-popup`, `data-delay`, `data-times`, `data-period`, `data-close` | popup dialogs | site.js | page load + 1 s, at most 2 per session |
| `data-reveal` (or class `reveal`) | sections, cards | site.js + motion.css | rise-and-settle under `html.js-reveal` only; `--d` = stagger index |
| `data-breach` | the footer fluke wrapper | site.js + motion.css | breaches when the footer arrives (6 s fail-safe) |
| `data-parallax="<speed>"` | the inner layer of a clipping backdrop (`.hero__layer`, `.band__layer`), cut-outs | site.js | `translate` = (centre offset) x -speed, clamped to +-40px; off under reduced motion and for the hero at 700px and below |
| `data-protrude="<SLOT-ID>"` | protrusion wrappers | QA probes | marks a protrusion (aria-hidden, pointer-events none) |
| `data-glass="light|smoke"` | glass panes | QA probes | marks a pane for the backdrop-variety checks (R-11, R-12) |
| `data-ai` | every generated image | QA probes, R-40 | generated imagery (set by `slotImg`) |
| `data-slot` | empty frames (pipeline) | QA | an unfilled image-plan slot |
| `data-handoff="live-menu"` | live-menu links | build-check | the only in-page href to the live host; never clicked in tests |
| `data-catalog` | catalog-driven lists | text-parity | text inside must equal a catalog title or brand |
| `data-rail` | horizontally scrolling rows | features.js | Previous/Next buttons and arrow keys (T2a) |
| `data-loop` | the whale-fluke video band | site.js (T1b/T1a) | muted playsinline loop; poster under reduced motion / Save-Data; pauses off-screen (4.17.11) |
| `data-map`, `data-map-src`, `data-map-title`, `data-map-load` | map facades | site.js | click-to-load Google map (4.17.14) |
| `data-sr-unwired="1"` | forms | site.js | submission is stopped (4.6) |
| `data-faq` | FAQ container | features.js (T2a) | toggles `.faq__btn` / its panel |
| `data-clamp` | review body | features.js (T2a) | adds the "Read more" toggle on phones |
| `data-calc-open` / `data-calc-dialog` / `data-calc-close` / `data-calc="total\|clear"` / `data-calc-out="error\|total\|remaining"` | the purchase-limit calculator | features.js (T2a) | native dialog + showModal |
| `data-sr-source="1"` | a form label whose source label was screen-reader-only | QA | shown visibly per DESIGN-SPEC 6.21 / BUILD-CONTRACT 4.18.3 |
| `data-hidden-all` / `hidden` | wrappers of hidden copy | text-parity | copy kept in the DOM but not shown (4.5) |

T2b data attributes (15:31; shop.js): `data-bag-add` (+ `data-id`, `data-name`, `data-variant`, `data-price`, `data-currency`,
`data-asof`, `data-href`), `data-bag-live` (polite status on the product page), `data-bag-view` ("View bag" -> `CCC.bag.open`),
`data-pdp-sticky`, `data-fbar`, `data-grid`, `data-fbar-open` / `-close` / `-sheet` / `-clear` / `-apply` / `-active`, `data-facet`,
`data-facet-list`, `data-sort`, `data-pgrid`, `data-pgrid-empty`, `data-plist`, `data-size` / `data-strain` / `data-brand` (+ `-src`)
on `.bcard`, `data-guard="name|variant|price|desc"` (read by tools/product-guard.mjs, R-44). `data-bag-count-sr` is the header's
screen-reader count (site.js fills it; T1a).

## 5. Image slots (`src/content/image-plan.json`, lane IMG)

Use `slotImg(ctx, '<ID>', opts)`, `band(ctx, inner, { backdrop: '<ID>' })` or `protrusion(ctx, '<ID>', opts)`.
Real photos (ai:false; crop/resize only): HERO-DESKTOP, HERO-PHONE, POSTCARD, VISIT-BAND, MEGA-SHOPALL, REVIEWS-BAND,
FLOWER-HERO, AWARD, AGEGATE-VEIL (age-gate backdrop ONLY; never captioned, never as Cape Cod scenery), MEGA-SEEDS,
SOCIAL-CARD. Generated (ai:true): cut-outs CUT-BUD, CUT-SEAGLASS, CUT-SEAGLASS-2, CUT-FANLEAF, CUT-TERPENE,
CUT-BEACHGRASS, CUT-FLUKE; bands BAND-DEEPWATER, H-BAND-1, H-BAND-2*, H-BAND-3*, H-BAND-4*, H-BAND-5; home cards
H-CAT-1*, H-CAT-2*, H-CAT-3*; category heroes CAT-PREROLLS*, CAT-EDIBLES*, CAT-VAPORIZERS*, CAT-TINCTURES*,
CAT-CONCENTRATES*, CAT-TOPICALS*, CAT-CBD*, CAT-ACCESSORIES*, CAT-APPAREL* (Flower uses FLOWER-HERO, Seeds uses
MEGA-SEEDS); place fallbacks PLACE-1*..PLACE-6*; mega cards MENU-FLOWER, MENU-EDIBLES, MENU-CONC, MENU-TOPICALS,
MENU-ACC; LOOP-FLUKE-POSTER plus `ctx.asset("generated/video/whale-fluke-loop.mp4")` / `.webm`.
`*` = tag:true: the visible "AI illustration" tag shows where the image paints 300 CSS px wide or more
(BUILD-CONTRACT 4.17.4). Generated imagery never stands in for a real person, place, product or result.

## 6. Declared microcopy

Every visible or accessible string the theme adds must be declared before it renders: base
`src/content/removals.json` (INTEGRATOR after T0) and `src/content/removals.d/theme-{chrome,home,interior,shop}.json`
(schema in `src/content/removals.d/README.md`). Use `pages: ["#chrome"]` for strings outside `<main>` (header, footer,
dialogs), and `kinds` to limit an entry to `text`, `alt`, `aria-label`, `placeholder` or `value`. Two inline labels with
no whitespace between them read as ONE run to the parity checker ("EdiblesTinctures"): put separate labels in separate
block elements (`p`, `li`, `div`) or separate them with a space. The gates: build exit 0;
`node tools/text-parity.mjs --built <dist> --control --control-dir <dir>` exit 0; `node tools/link-check.mjs --dir <dist>`
exit 0; `node tools/build-check.mjs --dir <dist>` exit 0.
