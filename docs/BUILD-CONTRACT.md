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
| PIPELINE | `src/build.mjs`, `src/lib/*.mjs`, `src/theme-stub/**`, `src/content/pages/**`, `src/content/chrome.json`, `src/content/catalog/**`, `tools/link-check.mjs`, `tools/build-verify.mjs`, `dist/**` (generated only), `assets/optimized/**` (image cache), `assets/fonts/**` |
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
PIPELINE may refine field names. Every refinement is documented in `docs/PIPELINE.md`, which the theme reads as the
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
