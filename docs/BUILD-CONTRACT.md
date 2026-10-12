# BUILD CONTRACT: Cape Cod Cannabis redesign (orchestrator, 2026-10-12)

**DRAFT 1** (written while the Understand workflow runs). Sections marked *(after WF1)* are completed from
`docs/SITE-ARCHITECTURE.md`, `docs/CONTENT-MODEL.md`, `docs/COMMERCE.md`, `docs/IMAGE-INVENTORY.md` and
`docs/COMPLIANCE.md` before any build agent starts.

Every build agent reads this file first. It fixes who owns which file, the interface between the data pipeline and the
theme, and the decisions already taken. When this file and another doc disagree, this file wins; report the conflict
in your structured output.

## 1. Inputs (frozen unless named as yours)

| input | what it is | who may change it |
|---|---|---|
| `audit/raw/*.html`, `audit/*.json`, `audit/prelock/*` | the crawl and the pre-lockout fetches (evidence) | nobody |
| `src/content/pages/*.json`, `src/content/chrome.json` | lossless page and chrome models | regenerate only with `node src/lib/extract.mjs`; never hand-edit |
| `src/content/catalog/*.json` | catalog model (products, brands, categories, specials, glossary) | regenerate only with `node src/lib/catalog.mjs` |
| `facts/client-facts.json` | every fact the live site states, with quotes | nobody |
| `docs/BRAND-SYSTEM.md`, `docs/DESIGN-SPEC.md`, `tmp/panel/winner/` | brand guardrails, the chosen design, its reference prototype | nobody (read) |
| `src/content/image-plan.json` | planned generations and motion loops | IMAGERY |

## 2. Ownership (one writer per file)

| owner | files |
|---|---|
| PIPELINE | `src/build.mjs`, `src/lib/*.mjs`, `src/theme-stub/**`, `src/content/pages/**`, `src/content/chrome.json`, `src/content/catalog/**`, `tools/link-check.mjs`, `tools/build-check.mjs`, `tools/text-parity.mjs`, `dist/**` (generated only), `assets/optimized/**` (image cache), `assets/fonts/**` |
| THEME (core) | `src/theme/index.mjs`, `src/theme/chrome.mjs`, `src/theme/home.mjs`, `src/theme/parts.mjs`, `src/styles/{tokens,base,glass,depth,motion,chrome,home}.css`, `src/scripts/site.js`, `assets/brand/**` |
| THEME (templates) | `src/theme/templates.mjs`, `src/theme/blocks.mjs`, `src/theme/shop.mjs`, `src/styles/{interior,blocks,shop,forms}.css`, `src/scripts/{shop,features}.js` |
| IMAGERY | `assets/generated/**`, `audit/generated-images.json`, `src/content/image-plan.json` |
| INTEGRATOR (later) | may edit any of the above to make the whole build pass, recording each cross-owner edit |

- Scratch work goes under `tmp/<your-role>/`.
- No git commits, no publishing, no memory writes.
- Network: none except what your role names, and NEVER `capecodcannabis.com` (see 4.12).

## 3. Interfaces

### 3.1 Build
- `node src/build.mjs` (run from the workspace root) writes `dist/` and exits 0.
  - `--out <dir>` builds elsewhere.
  - `--cache <dir>` moves the image cache, so a verifier never writes PIPELINE's `assets/optimized/`. (Lesson: on
    Academy Vision, verifiers could not build because the cache path was hard-wired.)
- Two consecutive builds are byte-identical: no timestamps and no random ids. The build date is a constant in
  `src/lib/site.mjs`.
- The build fails (exit 1) on:
  - a dead internal link or asset;
  - an unknown block type;
  - a duplicate output path;
  - a page without exactly one `<h1>`;
  - any reference to `capecodcannabis.com/wp-content`, or any other platform runtime, in the output.

### 3.2 Theme module (`src/theme/index.mjs`)
```js
export const styles = ['tokens.css', 'base.css', /* ... */];  // src/styles files, concatenated in this order
export const scripts = ['site.js', 'features.js'];             // src/scripts files, concatenated in this order
export function renderPage(page, ctx) { /* -> complete HTML document string */ }
export function render404(ctx) { /* -> complete HTML document string */ }
```
Until `src/theme/index.mjs` exists, the pipeline renders with `src/theme-stub/index.mjs`: plain semantic HTML with the
same signature, so both tracks can work at once.

### 3.3 `page` and `ctx` (orchestrator draft; PIPELINE may refine)
PIPELINE may refine field names. Every refinement is documented in `docs/PIPELINE-SITE.md` (and `docs/PIPELINE-CONTENT.md`), which the theme reads as the
source of truth.

`page`, built by the pipeline (one per output path):
```js
{
  kind,            // template name from audit/understand/ia-map.json templates[] (home, page, post, archive-tag,
                   // archive-date, event, events-index, town, town-geo, brand, brands-index, category, subcategory,
                   // categories-index, product, special, specials-index, glossary-terpene|cannabinoid|effect|strain,
                   // glossary-index, store, legal, account-shell, checkout, collection, utility, 404 ...)
  path,            // output path with leading and trailing slash ('/' = home); the same as the source path
  sourceUrl,       // the live URL it came from (null for a derived page)
  derived,         // true for pages rebuilt from other captured pages (tag/event-category archives, pagination)
  slug,            // the file-safe id of the model
  title, metaDescription, canonical, robots, og: {...}, jsonLd: [...],   // from the source head; URLs unchanged
  h1,              // the page's single H1 text
  breadcrumbs: [{ label, href }],
  section,         // nav group for the active state
  sections: [ { id, hiddenAll?, blocks: [ /* CONTENT-MODEL block types */ ] } ],   // Elementor containers, device
                   // duplicates already collapsed; hiddenAll sections are kept but not rendered visibly
  catalog: { filters, sort, limit, label } | null,   // the page's own Joint grid config(s) (several when a page
                   // has a grid plus rails)
  products: [productRef] | null,   // evidenced members only (Plan B: brand-prefix matches); never guessed silently
  related: [{ label, href, excerpt?, image? }],
  generated: { hero?: slotId, art?: [slotId] },   // image-plan slots that apply to this page
}
```

`ctx`, built once by the pipeline:
```js
{
  site: { name, origin: 'https://capecodcannabis.com', phone: { display, href }, address: {...}, hours: [...],
          socials: [...], rating: { value, count, source }, tagline: 'Always worth the trip!' },   // facts/client-facts.json only
  nav,             // header incl. the Shop mega menu tree (labels and hrefs verbatim)
  footer, announcement, ageGate: { headline, challenge, yes, no, notes: [...] },
  url(path) -> output path,            // normalises any source or output path (trailing slash)
  img(ref, { alt, sizes, cls, loading, fetchpriority, decoding, widths }) -> '<img ...>' with a WebP srcset and
                   // width/height; ref = a local file (assets/source/..., assets/generated/..., assets/brand/...) or
                   // an image-plan slot id; a missing generated slot renders a styled empty frame with data-slot,
                   // never a broken <img>
  imgSrc(ref, width) -> URL of one variant (for CSS backgrounds and preloads),
  dutchie(hash, { w, h, fit }) -> hotlinked imgix URL (product images),
  asset(name) -> fingerprinted URL (site.css, site.js, fonts, logo),
  catalog: { products, brands, categories, specials, glossary },   // src/content/catalog/*.json
  buildDate,       // constant
  pagesByPath,
}
```

## 4. Decisions already taken (orchestrator)

1. **Paths.** Every crawled source URL keeps its path, with WordPress's trailing slash
   (`/about-cape-cod-cannabis/` -> `dist/about-cape-cod-cannabis/index.html`). Aliases and redirects observed in the
   crawl become `_redirects` and `.htaccess` rules.
2. **Copy is verbatim.**
   - Elementor device duplicates (desktop-only plus mobile-only copies of one section) collapse into ONE responsive
     section. A sentence that exists in only one variant is kept.
   - The collapse is declared in the change ledger, so parity does not count it as loss.
3. **Derived archives, marked `derived: true` in the route map:**
   - The 131 tag archives refused by the lockout are ALL linked from captured posts, so they are rebuilt as listings
     of the captured posts carrying each tag.
   - Event-category archives and the terpene index pagination are rebuilt the same way.
4. **Age gate.**
   - Rebuilt as a glass dialog with the verbatim copy: "Welcome!", "Are you over 21 years of age?", Yes / No,
     "*Must be 21+ with a VALID ID.", "Always worth the trip!".
   - Consent persists in `localStorage` (`ccc-age-21`). The "No" behaviour follows the live plugin's config *(after WF1)*.
   - With JS off, the content stays readable, as on the live site, where the gate is a script.
   - QA and screenshot tools pre-set consent with `--init`.
5. **Commerce** (`docs/COMMERCE.md`).
   - **The store:** pickup only, recreational only, one store. Online orders are reservations paid in store.
   - **Ordering:** a static site takes no orders. "Reserve for pickup" fills a local-only bag (localStorage) labelled
     "Preview: orders are not sent". The bag shows the verbatim specials disclaimer ("*Website cart may not reflect
     the bundled price but it will be adjusted at time of payment.") and the pickup and payment copy.
   - **Integration points:** grid data, cart/checkout (Joint embed or Dutchie hosted, redirect `/thank-you/`), and
     my-orders and my-points (Joint widgets). The loyalty pages keep their Alpine IQ iframes as external embeds.
   - **MA compliance, as on the live site:** NO strike-through prices, NO "% off" or specials badges on cards.
     "Specials" is labelled "Bundles" or "Offers" exactly as the live CSS relabels it.
   - **Product URLs:** all 5,857 product URLs and titles come from `audit/raw/sitemap.html`, the HTML sitemap page,
     and every one keeps its path. The 36 percent-encoded slugs are written under their decoded UTF-8 names.
   - **Plan A** (the operator gets us allowlisted): full JSON-LD per product. Category still comes from the slug
     guess, flagged as a guess.
   - **Plan B** (no access): product pages show the title H1, a breadcrumb, a brand link and "from the product name"
     chips for size and strain type, plus a "Check price and availability" hand-off to the live menu. They carry no
     price, image, offers or Product JSON-LD, because those would be fabricated. t1 is complete.
   - **Listing grids:** driven by each page's own stored Joint filter object (`filters`, `sort`, `limit`). Where
     membership cannot be evidenced (Plan B), render the copy plus a live-menu call to action, never invented
     products.
   - **Product images:** hotlinked from images.dutchie.com with imgix parameters, as the live site does (cards
     `?auto=format&fit=fill&fill=solid&w=344&h=330` plus a `dpr=2` srcset entry). The width is capped at the source
     size.
   - **Prices** are a dated snapshot ("as of <date>").
   - **Copy hidden at every breakpoint** (all six `elementor-hidden-*` classes; for example the second FAQ on 7
     categories, "Shop By Category" on effect and strain pages, the /specials/ bundles note) is kept in the model as
     `hiddenAll: true`. It is NOT rendered visibly and is listed in `docs/OPEN-DECISIONS.md` for the client. Parity
     excludes it, because it is invisible on the source too.
   - **Payment copy** stays verbatim where it appears ("💵 Debit & Cash Accepted", "*We accept cash, debit cards or
     CanPay"). The conflict goes to the client.
6. **Forms are unwired.** Fields, labels and validation copy render faithfully; the `<form>` uses `method="post"`,
   starts disabled and carries `data-sr-unwired="1"`, and JS stops submission. This prevents a no-JS GET leaking the
   fields into the URL.
7. **SEO.**
   - Canonicals are self-referencing at `https://capecodcannabis.com` plus the path.
   - Titles, descriptions, robots meta and Open Graph come from the source per page.
   - JSON-LD (LocalBusiness/Store, BreadcrumbList, Product, Event, FAQPage, Article) is kept with its URLs; the
     Rank Math graph is consolidated to one business entity with an `@id`.
   - **Exception, added 09:33:** JSON-LD that contradicts the page's visible copy is NOT carried over. The home and
     /faqs-420/ FAQPage markup still says "up to 1 ounce of flower ... 28 grams"; the visible copy on 23 pages says 2
     ounces / 56 grams (`docs/FACTS-EVIDENCE.md` C3). The removal is recorded in the ledger.
   - The pipeline lanes started before this note, so the INTEGRATOR enforces it.
   - **The consolidated business entity carries printed facts only** (`docs/COMPLIANCE.md` sections 7 and 9). NOT
     carried, each declared in the ledger and flagged to the client:
     - the personal staff e-mail (jbourgea@...) from an ezlocal listing in the home JSON-LD;
     - Joint's `alternateName` "Medical Marijuana Dispensary" (the store is adult-use only);
     - the stale FAQPage markup above.
     - Rank Math's `openingHours` "8:00 - 8:00" becomes the printed "8:00am – 8:00pm" daily, i.e. 08:00 to 20:00,
       as Joint's own LocalBusiness block already states.
   - **Reviews:**
     - verbatim text, name, date and rating, with "Google" named as the source and the capture date shown
       (2026-10-12);
     - the ratings exactly as printed ("4.9", "900+", "(967)");
     - reviewer avatars are NOT mirrored or hotlinked (third-party personal images); use initials;
     - source typos are kept.
8. **Removed, with reasons** (in the change ledger), as platform runtime:
   - GTM/GA, the Facebook pixel, server-side tagging (`sst.`), OneSignal push, the Alpine IQ loader, Ahrefs and WPMU
     analytics, LiteSpeed, WP Defender, the Elementor/Jet runtime and the Joint runtime;
   - the previous agency's footer credit (rankreallyhigh.com);
   - GTranslate's widget (a third-party runtime), listed in `docs/OPEN-DECISIONS.md` in case the client wants
     translation back.
9. **Logo.**
   - The town-sign mark is used unaltered. It carries its own white plaque and soft shadow, so it reads on light and
     dark glass without a chip.
   - Master: the best one found by the brand lane *(after WF1)*; the floor is `audit/prelock/logo-agegate.png`,
     370x306 RGBA.
10. **Images.**
    - Site images come from the CDN copies, or a better master where the imagery lane found one.
    - Generated images follow `docs/COMPLIANCE.md`: no consumption, nobody who could look under 21, no cartoons, no
      brand marks or text, no health implication, never presented as the real store or a named landmark.
    - Each one carries the IPTC `trainedAlgorithmicMedia` XMP (`tools/ai-label.xmp`) and is reviewed by eye.
11. **No runtime dependencies.** Node builtins at build time; vanilla JS and CSS in the browser; fonts (OFL) and images
    self-hosted.
12. **Network.** Nothing at build or test time requests `capecodcannabis.com` (`audit/scan-blocked-hosts.json`; run
    stages through `tools/sr.sh`). Allowed third-party hosts, at build or prep time only:
    - `fonts.gstatic.com` / `fonts.googleapis.com` (OFL fonts);
    - `b2702268.assetcdn.net` (site images);
    - `images.dutchie.com` (product images, Plan A only).
13. **The 20 dead internal links** (`audit/failures.json`, status 404; evidence and referrers in
    `docs/FACTS-EVIDENCE.md`, "The 20 dead internal links").
    - The anchor text is always kept verbatim. Every change is a DECLARED change in the ledger and the client report,
      never silent.
    - **Retargeted** (one live page is the unambiguous target):
      - `/recreational-dispensary-near-dennis-02638` -> `/recreational-dispensary-near-me-in-dennis/`
      - `/recreational-dispensary-near-falmouth-02540` -> `/recreational-dispensary-near-falmouth/`
      - `/recreational-dispensary-near-provincetown-02657` -> `/dispensary-near-provincetown/`
      - `/recreational-dispensary-near-sandwich-02563` -> `/recreational-dispensary-near-sandwich/`
      - `/terpene-guide` -> `/terpene-cannabinoid-guide/`
      - `/categories/concentrates/rosin` -> `/categories/concentrates/live-rosin/`
      - `/blog` -> `/our-blog/`
      - `/beautiful-wellfleet-ma-attractions` -> `/things-to-do-near-cape-cod-cannabis-in-wellfleet-ma/`
    - **Expired `/offers/...` promotions** (8 links; each 301s to `/specials/...` and then 404s on the live site)
      -> `/specials/`, the destination of the live site's own `/offers` alias.
    - **Unlinked, text kept, listed in `docs/OPEN-DECISIONS.md` for the client:** `/our-team` ("Learn More" on About),
      `/categories/concentrates/hash`, `/categories/clones`, `/brands/perpetual-harvest`.
    - The pipeline lanes started before this mapping, so the INTEGRATOR applies it as a declared post-extraction rule.
14. **Class names.** Never use names a CMS detector reads as a platform:
    - `w-container`, `w-row`, `w-col`, `w-nav`, `w-slider`, which also catches `row-container` and `show-nav`;
    - `sqs-block`, `et_pb_`, `elementor-`, `wp-`, `data-wf-`, `svelte-xxxxxx`, `data-v-xxxxxxxx`.
15. **WF1 critic corrections (added 10:45, after the pipeline lanes started; the INTEGRATOR enforces each one).**
    Each was re-run by the orchestrator against `audit/raw/` before it was written here
    (`scratchpad/spot1.mjs`: 60/60 event files carry Event JSON-LD and about-cape-cod-cannabis carries none; the
    error, rechallenge and customTitle strings are on 743/743 files; 82 files link the www host and 23 carry `_gl`).
    1. **Event schema.** All 60 events (and `/events-calendar/`) carry The Events Calendar's Event JSON-LD. It is
       already in all 60 event models' `jsonLd` and MUST be in each built page.
    2. **Age gate "No".** The live plugin config is `"rechallenge":"1"` and
       `"error":"You are not old enough to view this content"`. On "No" the gate stays up, shows that error verbatim
       and lets the visitor answer again; nothing behind it becomes usable. While the gate is up, `document.title` is
       the plugin's customTitle, "Age Verification - Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA", and
       the page title comes back on "Yes". If storage throws, show the plugin's warning verbatim: "Your browser does
       not support cookies, you may experience problems entering this site".
    3. **Hours.** The visible hours are the footer's Monday-first list ("Monday 8am – 8pm" ... "Sunday 8am – 8pm").
       The Sunday-first "8:00am – 8:00pm" lists (footer 467fc28 and all 742 `ul.joint-hours-list`) are hidden on
       every device on the live site: keep them `hiddenAll` and never render them visibly. No hours wording that is
       not printed on the site (for example "Open daily").
    4. **Link hygiene** (DECLARED in the ledger as one rule). An internal link written as
       `https://capecodcannabis.com/...` or `https://www.capecodcannabis.com/...` becomes a page-relative link to the
       output path. The tracking parameters `_gl`, `_ga` and `utm_*` are stripped from internal links (48 hrefs in 24
       models carry them); any other query string is kept. External links are untouched.
    5. **Images the models list as missing** (`ledger.imagesMissing`, 47 distinct URLs).
       - 26 `images.dutchie.com` images in event bodies (32 `<img>` on 14 event pages) and 6 CDN images that
         sr-assets never inventoried (2 home banners, 4 loyalty banners): the orchestrator fetches each once with
         `tools/fetch-masters.mjs` (no redirects followed; stops at a 403 or repeated 429s) into
         `assets/source/late/`. The record is `audit/late-images.json` (URL to file, status, sha256, dimensions); the
         INTEGRATOR maps those URLs to the files. Allowlist 12 is extended to exactly these URLs.
         **Done 10:53:** 28 written (26 Dutchie, 2 home banners). The 4 loyalty VIP banners answered 302 to the
         origin (uncached on the CDN), were NOT followed, and stay missing.
       - The posts' `static.wixstatic.com`, `mcusercontent.com`, `www.hellavated.com` and `u4eafarms.com` images
         were already downloaded by sr-assets.
       - Not fetched, each an empty styled frame with its alt text kept and a ledger line with its status: 12 CDN
         `.jpeg.jpeg` uploads that returned 404 (category pages and /specials/); `levia.buzz` (403, never retried);
         the origin's `american-flag.avif` and Elementor placeholder (lockout).
       - The 8 CDN files throttled during sr-assets are extra srcset sizes of images already on disk; nothing is
         missing because of them.
       - Google review avatars stay out (4.7).
    6. **Media the lockout refused.** 19 video and audio files sit on the origin. They are NOT fetched through any
       other host. The player is omitted, the surrounding copy is kept, and each one is a declared gap in the ledger
       and in OPEN-DECISIONS (the client supplies the files).
    7. **H1.** `page.h1` is the H1. Blocks with `demote: true` render as H2. For the 28 pages with no source H1, use
       the first of `h1Source.candidates` (first heading, then last breadcrumb label, then title), recorded in the
       ledger.
    8. **A meta description holding a URL.** `/cannabis-chronicles-insights-into-premium-products/` has
       `https://capecodcannabis.com/wp-content/uploads/2021/12/Strane-Purgatory.mov` inside its meta description (a
       CMS artefact). The URL and one of its ` | ` separators are removed, giving "Cannabis Chronicles: Insights into
       Premium Products | Cape Cod Cannabis"; the edit is declared.
    9. **The about-page popup** (Elementor popup #236015, `popup: true` sections) renders as a dialog.
    10. **The lighthouse photo** (`13096766-CCC-Beach-Team.webp`) may be stock and its location is unknown
        (OPEN-DECISIONS B17). It may stay as the age-gate backdrop. It is never used as a cut-out or captioned as Cape
        Cod.
16. **Pipeline verifier findings (added 11:20; decided by the orchestrator, enforced by the hardening lanes).**
    Evidence: the WF3a verifier's report (`tmp/pipe-verify/`): `text-parity --built` on the real build gave recall
    0.8996 with 2,545 missing and 4,780 added, while build, link-check and build-check all exited 0.
    1. **Built-output parity is a gate.** `node tools/text-parity.mjs --built <dist> --control` must exit 0 on the
       real build: every source sentence found or declared, nothing ADDED that is undeclared, `hiddenShown` 0, and a
       control that fires on the real build (planted in a copy, never needing an already-clean page).
    2. **Declared lists live in `src/content/removals.json`.**
       - `removals[]` declares source sentences deliberately not shown, each with a reason.
       - `allowedAdded[]` declares strings the rebuild adds (UI labels, landmark names, the Plan B hand-off "Check
         price and availability"), each with a reason. They are microcopy only, never a claim, a fact or marketing
         copy. The orchestrator reviews every entry.
       - Text inside an element marked `data-catalog` counts as evidenced only when it equals a title or brand in
         `src/content/catalog/*.json`, which comes from the site's own HTML sitemap.
    3. **Old-platform widget instructions** (Elementor "Accordion." and "Open links with Enter or Space, close with
       Escape, and navigate with Arrow Keys", "Menu Toggle", the slider's "Carousel", "N of M", "Previous"/"Next",
       The Events Calendar's "View links to add events to your calendar") are interaction labels, not content.
       Where the rebuild has the same widget, it may use its own label; each replacement is declared in
       `removals.json` with the replacing label in `allowedAdded[]`. **Content-bearing accessible names stay
       verbatim:** rating labels ("5 Stars", "4.9 Stars"), "Read more about <title>", "Post Navigation", the review
       source's "Google Logo" alt, and every image alt.
    4. **Contradicting device variants (`conflict: true`).** On `/daily-purchase-limit-in-ma/` the desktop variant
       (2 ounces / 56 g) agrees with the site's dated statement on 23 pages ("As of April 19, 2026 ... up to 2
       ounces"), and the tablet/mobile variant (28 g) is stale. The build renders only the 56 g variant. The 28 g
       sentences are declared removals with this reason and flagged to the client (OPEN-DECISIONS B3).
    5. **Breadcrumbs are shown only where the source showed them** (`breadcrumbsSource: 'visible'`, 497 pages). On
       the 239 pages whose crumbs come only from JSON-LD, the BreadcrumbList stays in the head and nothing visible
       is added (it would otherwise print "Archives for / Archives for" on 56 date archives).
    6. **Reviews:** the name, date and rating render as separate elements with no invented separator text (any
       visual separator is CSS). Rating aria-labels stay verbatim.
    7. **Product chips** say where each one comes from. A chip whose label appears verbatim in the product title is
       "from the product name"; one taken from the URL slug is "from the product's web address". Labels are never
       reformatted beyond un-slugging (no "30pk 15serv" from "30pk/15serv"). A brand page lists every product the
       catalog links to it, including the flagged slug-start matches (1906).
    8. **Platform identifiers are never accessible names or field names** in the output (for example
       `tribe-events-c-search ...`, `post-password-form`). Such forms get neutral names, and their verbatim visible
       labels are kept.
    9. **Every model field that carries visible or accessible text is rendered** (galleries' `items[].image`, posts'
       `items[].blocks`, `pagination` objects, hotspot `tipHtml`, form options and intro text, postnav `srLabel`,
       multi-line `html` blocks one line per element). Checked by the parity gate (16.1).
    10. **Build safety:** models are validated before `--out` is wiped (a null block fails cleanly); the duplicate
        guard normalises a missing trailing slash and an `index.html` suffix as well as case; `ctx.rich` sanitises
        (no `<script>`, `on*` attributes, `javascript:` URLs, or `<iframe>` other than the known map embeds).
    11. **JSON-LD third-party images:** a `joint-product-photos.s3.amazonaws.com` image in JSON-LD is replaced by
        the local copy when one exists, otherwise the property is dropped; either way it is declared.
    12. **og:image** on the 9 pages whose image sits on the origin is omitted for now and declared. The IMAGERY lane
        makes one site social card (1200x630, from existing assets), and the INTEGRATOR wires it to those pages.
17. **Design-spec rulings (added 12:50 by the orchestrator, after reviewing `docs/DESIGN-SPEC.md`, the winning
    prototype and the judges' reports). They answer the spec's open questions (13.2) and close gaps found in the
    review. Where they differ from the spec, they win (this contract wins over the spec).**
    1. **Age gate without JS: fail closed.** This replaces the no-JS line of 4.4.
       - The gate is visible by default. It is not shown only under `html.js`.
       - A blocking head script hides it before first paint when `ccc-age-21` is stored.
       - **No-JS pass, per page view.** "Yes" is `<a href="#age-ok" role="button">`, and CSS `:target` hides the
         gate. "No" is `<a href="#age-no" role="button">`, and `:target` shows the verbatim error
         "You are not old enough to view this content". JS intercepts both, and Space activates them.
       - The page content stays in the HTML, so parity is unaffected.
       - **Reason:** COMPLIANCE R7 (935 CMR 500.105(4)(b)13) bars operating a website that fails to verify the
         entrant's age, and the live script-only gate lets a no-JS visitor in. All three prototypes failed closed,
         and two judges scored that as a strength.
       - **Consequences:** DESIGN-SPEC R-36 flips. With JS off, the gate is visible on every template and the
         content becomes visible after "Yes" (#age-ok). The "JS off" case of `tmp/h1/agegate-test.mjs` changes the
         same way.
    2. **Announcement bar:** it is not rendered (4.5, `hiddenAll`). It is added to OPEN-DECISIONS B9.
    3. **Mega menu:** six paired photo cards plus "Shop All", as in the spec. Every label is its own link.
    4. **AI disclosure.**
       - **Footer note.** The spec's wording pointed sighted readers at alt text they cannot see. The note now
         reads: "Some images on this site are AI-generated illustrations. They are not photos of our store, staff,
         customers or products."
       - **"AI illustration" tag.** It goes on every generated image that shows a place or landscape, or a
         cannabis product, when it is painted 300 CSS px wide or more in page content: category heroes, the
         H-CAT cards, the PLACE images, and the H-BAND-2/3/4 landscape bands.
       - **No tag, because the image is a texture or ornament:** H-BAND-1 (sea glass), H-BAND-5 (sand), deep water,
         cut-outs, and the mega and phone-menu cards. They are covered by `data-ai`, the XMP and the footer note.
       - These strings, and the repeated footer line "*Must be 21+ with a VALID ID.", are declared microcopy for
         client and counsel review (OPEN-DECISIONS B21).
    5. **Gummies tiles** (Wana, Mindy's, Kanha): no generated product imagery (OPEN-DECISIONS B22).
    6. **The hero kayaker:** the Uncle Tim's Bridge photo is kept uncropped. The kayaker is an indistinct,
       adult-sized figure at about 1% of the frame, in the client's own published photo, and is not portrayed as
       anyone under 21. A crop is a one-line change if the client asks (OPEN-DECISIONS B20).
    7. **"Shop Gift Cards" (`/?s=gift-card`):**
       - The href stays verbatim, and the static host serves the home page for it.
       - `site.js` reads `?s=` on any page and opens Search pre-filled. Hyphens match as spaces.
       - The local search index includes the 9 "Gift Card" products.
    8. **Category pages under Plan B:** copy plus the live-menu hand-off, and no grid (4.5).
    9. **The third home carousel, missing from the spec.** Home section 1 has three carousels.
       - The third holds the real ad creatives "Sky-High-2g-Disposable", "Suncrafted-Restock-Ad",
         "Aura-Cannabis-Co-Ad" and "STOP-the-REPEAL-Homepage-Ad", with their verbatim alts and links.
       - They render unaltered as images in a promo row under the gummies row, inside glass frames.
       - They are painted at 306 CSS px wide or less at 1280, so they reach 1.0 file px per device px at 1.5 DPR.
       - They are never replaced by generated imagery, and nothing is badged.
    10. **Tile labels.** The six top tiles carry their text only inside the images. Their HTML labels transcribe it
        in title case, as the filenames spell it: "Affordable Ounces", "Infused Pre-Rolls", "Disposables",
        "Wana Gummies", "Mindy's Gummies", "Kanha Gummies".
        - The button label "Learn More" is the site's own HTML button label elsewhere.
        - Checked by eye on 2 of 6 this session ("AFFORDABLE OUNCES" and "MINDY'S GUMMIES", each with "LEARN
          MORE"). The THEME lane checks the other 4 by eye and declares each label with its file name.
    11. **One motion graphic.**
        - **Which clip:** the kit's Higgsfield whale-fluke loop (ACCEPTED, AI label in its metadata) is the
          backdrop of home section 7, the "Affordable Ounces & 1/2 Ounces" live-panel band.
        - **Encoding:** re-encoded to 900 KB or less per served file (MP4 H.264 plus WebM VP9), 1920 wide and
          cropped to the band.
        - **Playback:** `muted playsinline loop preload="none"`, with the poster first. It loads within one
          viewport of view and pauses off-screen.
        - **When it never plays:** under reduced motion or Save-Data, where the poster shows instead.
        - **Weight:** DESIGN-SPEC R-20 counts images, fonts, CSS and JS; the loop has its own cap.
        - No new Higgsfield spend.
    12. **The AI label ships.** The build's WebP variants are made with `cwebp -metadata none`, which would strip
        the IPTC `trainedAlgorithmicMedia` XMP.
        - Variants of `assets/generated/**` get `tools/ai-label.xmp` re-attached with `webpmux -set xmp`.
        - The variant cache key changes, so unlabelled cached variants are not reused.
        - DESIGN-SPEC R-40 is checked on the files in `dist/`, with a positive control.
    13. **Browser checks never touch the network**, except images.dutchie.com for t1's photo. Chrome runs with
        `--host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1, EXCLUDE images.dutchie.com"`.
        Lane H1's first run fetched Google Maps through two iframes.
    14. **Google Maps embeds are click-to-load.**
        - Each map iframe renders as a facade with a "Load Google map" button (declared). The iframe `src` stays
          verbatim in a data attribute and is set only on press.
        - The loaded iframe gets the declared title "Google map".
18. **Hardening verifier follow-ups (added 12:53; verifier report `tmp/hverify/`, 19 of 24 defects confirmed fixed).**
    1. **4.16.4 as built is signed off.** Only the one faq item that carries the 28 g lines is purged. The two other
       items render, and they contradict nothing (0 matches for "28 g" or "1 ounce" on the page). This is the precise
       form of 4.16.4, and it also keeps 4.2.
    2. **`ctx.rich` must be attribute-aware** (verifier: 4 of 13 planted payloads survived, and Chrome executed them).
       - The sanitiser tokenises tags with quoted attribute values. It drops every `on*` attribute however it is
         delimited, and drops `srcdoc` (and everything except `src`, `width`, `height`, `style`, `loading`,
         `allowfullscreen`, `referrerpolicy` and `title`) on the allowed map iframes.
       - A unit test plants each of the verifier's forms. Real models contain none today.
    3. **Screen-reader-only source text** (16 strings on 3 pages) is marked in the model (`srOnly: true`). The source
       classes are `*-visual-hide`, `elementor-screen-only`, `screen-reader-text` and `tec-a11y-title-hidden`.
       - The theme renders it visually hidden, with one exception: visible form labels (DESIGN-SPEC 6.21) may show
         the same words.
       - Labels for widget UI the rebuild does not have (the calendar's view switcher) are removed with that
         widget and declared.
    4. **/events-calendar/** renders a static event list from `ctx.collections.events`, with no view switcher, no
       "Previous Events"/"Next Events" controls and no date picker. The calendar UI's visible words are declared
       removals (`kinds` limited), and the stated reason now matches the output.
    5. **The calculator** on /daily-purchase-limit-in-ma/ is a real dialog. "Open Calculator" is a button, and "X" is
       the dialog's close button (accessible name "Close", declared). They never print as one prose run.
    6. **`_index.json` paths** use the same decoded UTF-8 form as `routes.json` (verifier #22).
    7. **The 404 page** carries declared microcopy (the live 404 was never captured) plus the verbatim "Shop Menu"
       and "Home" labels.
    8. **The `age-gate-plugin-strings` allowedAdded entry** is limited by `kinds` to the gate's own strings, so it
       cannot excuse the same sentences as body text.
    9. **docs/PIPELINE-SITE.md**: its three stale statements (lines about 21, 110 and 441) are corrected.
19. **Calm revision (added 2026-10-13 by the orchestrator, on the operator's direction).**

    The operator, after reviewing the published preview, wrote: "the background is too noisy and there's a lot going
    on, it takes away the viewers eyes away from the promotions and the actual products. Redesign and make the designs
    milder and more toned down but keep the current branding". This ruling wins over DESIGN-SPEC where they differ.

    1. **What the brand keeps.** The palette, the logo, Roboto, Roboto Flex and Playball, the section-title accents,
       the Uncle Tim's Bridge hero, the Google rating plate, the whale-fluke loop and the client's real photos.
    2. **Grounds are quiet.**
       - Home sections alternate between white and foam.
       - The offers band is the soft sky tint `--tint`.
       - The reviews band is the one solid harbour band.
       - The footer is the solid harbour gradient.
       - No band carries a photo, the whale-tail pattern, pools, glints or a seam sweep. `parts.mjs band()` ignores
         its `pattern` and `pools` options.
    3. **Content sits on plain surfaces** (`glass.css .surface`: white, a hairline `--line`, the soft `--sh-soft`).
       Glass stays only where it frames something: the header, the hero panes over photos (home, interior,
       category), the mega menu, the dialogs and the sticky price bar.
    4. **Two cut-outs remain:** the hero sea glass and the footer whale fluke on home. The 404 also keeps its fluke.
       The cut-outs that are no longer rendered:
       - the bud;
       - the second sea glass;
       - the fan leaf;
       - the beach grass;
       - the terpene;
       - the interior-hero and category-hero cut-outs;
       - the product-lens sea glass.
    5. **Photos are framed, not placed behind text.**
       - The storefront postcard is a straight framed photo beside the intro, with no tape, postmark or seam crossing.
       - The visit band frames the storefront photo beside the map.
       - The whale-fluke loop plays in a rounded frame under its panel (4.17.11 otherwise unchanged).
    6. **DESIGN-SPEC requirements superseded or narrowed:**
       - R-16, six or more protrusions crossing seams on home: superseded. R-17 and R-18 still apply to the cut-outs
         that remain.
       - R-24, rails and panels on photo or smoked bands, and the backdrop variety between sections: superseded by
         point 2.
       - R-11 and R-12 apply only to the glass that remains.
    7. **Evidence on the calm build** (orchestrator, 2026-10-13, `tmp/calm/`):
       - text parity recall 1, 0 missing, 0 added;
       - link-check, build-check (AI label 180/180), product-guard, static checks (9 controls), the R-46 scan, hover
         parity and the C13 token check all pass;
       - the age gate passes 78/78;
       - home at 1280x585@1.5: 1,160 KB before scroll and 1,537 KB after a full scroll excluding the loop video
         (before this revision: 1,363 and 2,752). CLS is 0 at 1280 and at 390.
