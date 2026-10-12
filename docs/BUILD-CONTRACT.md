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

### 3.3 `page` and `ctx` *(after WF1: from the template list and the block model)*

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
5. **Commerce.**
   - A static site takes no orders. The cart, checkout and loyalty entry points are designed honestly; the real Joint
     Commerce/Dutchie integration plugs in at handoff (`docs/COMMERCE.md`).
   - Product data is a dated snapshot.
   - Plan A (products crawled after an allowlist) or Plan B (no product pages) follows the operator's decision.
6. **Forms are unwired.** Fields, labels and validation copy render faithfully; the `<form>` uses `method="post"`,
   starts disabled and carries `data-sr-unwired="1"`, and JS stops submission. This prevents a no-JS GET leaking the
   fields into the URL.
7. **SEO.**
   - Canonicals are self-referencing at `https://capecodcannabis.com` plus the path.
   - Titles, descriptions, robots meta and Open Graph come from the source per page.
   - JSON-LD (LocalBusiness/Store, BreadcrumbList, Product, Event, FAQPage, Article) is kept with its URLs; the
     Rank Math graph is consolidated to one business entity with an `@id`.
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
13. **The 20 dead internal links** (`audit/failures.json`, status 404).
    - The anchor text is kept.
    - A link is retargeted only where one existing page is the unambiguous target (for example `/blog` ->
      `/our-blog/`). Otherwise it is unlinked.
    - Each case is recorded in the ledger and in the client report *(targets after WF1)*.
14. **Class names.** Never use names a CMS detector reads as a platform:
    - `w-container`, `w-row`, `w-col`, `w-nav`, `w-slider`, which also catches `row-container` and `show-nav`;
    - `sqs-block`, `et_pb_`, `elementor-`, `wp-`, `data-wf-`, `svelte-xxxxxx`, `data-v-xxxxxxxx`.
