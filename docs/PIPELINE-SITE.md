# Pipeline (site half): routes, catalog, build, stub theme, checks

Role: PIPELINE-SITE, written 2026-10-12. This file is the interface the theme reads. It describes the `page` and
`ctx` shapes **as implemented** in `src/build.mjs`. Where it refines `docs/BUILD-CONTRACT.md` 3.3, the change is
named. The contract calls this file `docs/PIPELINE.md`; this role's brief named it `docs/PIPELINE-SITE.md`.

Node builtins only. No network at build or check time. cwebp (on PATH) makes the WebP variants.

## 0. H2 changes (lane H2, 2026-10-12): what the theme must know

These changes enforce BUILD-CONTRACT 4.7, 4.15 and 4.16. The details are in the sections named below.

| change | theme impact | section |
|---|---|---|
| **Pre-flight.** Every model and route path is validated before `--out` is wiped. A null block, a block without `t` or missing `sections` fails with `invalid-model` and leaves the old output untouched. | none | 7 |
| **Duplicate guard.** The guard folds case, a missing trailing slash and an `index.html` suffix. A path such as `/x` or `/x/index.html/` also fails as `invalid-route-path`. | none | 7 |
| **`ctx.rich` sanitises** after rewriting. It removes `<script>`, `on*` attributes, `javascript:` URLs and every `<iframe>` except `https://www.google.com/maps/embed?...`. | Model HTML now passes through `ctx.rich` safely. Do not print model `html` raw. | 4 |
| **Late images** (`audit/late-images.json`): 26 Dutchie event images and 2 home banners resolve to `assets/source/late/` and get WebP variants. | Pass `ref \|\| srcUrl` to `ctx.img`, as before. A Dutchie URL is hotlinked only when no local copy exists. In `rich` HTML, `data-source-url` is now used when `src` is absent. | 4, 10 |
| **Link hygiene.** `_gl`, `_ga` and `utm_*` are stripped from internal links. Other query strings are kept, and external links are untouched. | none, as long as links go through `ctx.url`, `ctx.link` or `ctx.rich` | 6 |
| **JSON-LD policy.** No "Medical Marijuana Dispensary" `alternateName`. `openingHours` is the printed `08:00-20:00`. No FAQPage stating 1 ounce / 28 grams. No e-mail other than `info@capecodcannabis.com`. Joint S3 images become the local copy. | new `page.ldDropped` (declared, never printed) | 5 |
| **Conflict purge** on /daily-purchase-limit-in-ma/ (4.16.4, signed off as built by 4.18.1): exactly one item is purged, the tablet/mobile faq item that carries the 28 g lines ("Understanding the 28-Gram Daily Limit"); it is in `page.removedBlocks`. The same faq's two other items render (their desktop twins were collapsed into it; they contradict nothing), and so do the desktop (56 g) blocks. Measured on the P1 stub build: `declared.conflictPurges` has 1 entry, `t: 'faq item'`. | none; never render `removedBlocks` | 5 |
| **Platform names.** A form or search whose `name` is a platform class list gets `name: null`. A platform field name becomes `search` or `field`. | Do not fall back to another platform string for `aria-label`. The changes are in `page.renamed`. | 5 |
| **H1 for the 28 pages without one** comes from `h1Source.candidates[0]`. A heading candidate promotes that block. Otherwise a leading section `{ id: 'h1' }` holds a synthetic level-1 heading. | Render the `id: 'h1'` section like any other. | 5.3 |
| **Chips** carry `from: 'title' \| 'slug'` and a caption (`source`) that follows it: "from the product name" or "from the product's web address". | Print each chip's own `source`, not a fixed caption. | 9 |
| **Brand pages** list the flagged slug-start matches too (`/brands/1906/` now has 21: 15 + 6). | Show `brand.flag` for `match: 'slug-start'` if you show provenance. | 5, 9 |
| **og:image** stays omitted on the 9 pages whose source image sits on the origin. They are listed in the report under `declared.ogImageOmitted`. | none | 11 |

## 0.1 P1 changes (lane P1, 2026-10-12): what the theme must know

These enforce BUILD-CONTRACT 4.17.7, 4.17.12 and 4.18.2-4.18.9. Evidence: `tmp/p1/` (logs named below).

| change | theme impact | section |
|---|---|---|
| **Screen-reader-only source text** is marked in the models (4.18.3): `srOnly: true` on a block (heading, rich) or a social item, `<span class="sr">` inline in model html, `labelSrOnly` / `buttonSrOnly` on form fields and search blocks (also `chrome.search`, `chrome.ajaxSearch`), `srPrefix: "Page"` on posts pagination. Full table: docs/PIPELINE-CONTENT.md section 12. | Render each marked text visually hidden (the design's `.sr` class), never as visible text and never dropped. `ctx.rich` keeps `<span class="sr">`. | PIPELINE-CONTENT 12 |
| **`_index.json` paths** are decoded UTF-8, the same form as `routes.json` (4.18.6): `/terpenes/α-pinene/`, not `/terpenes/%ce%b1-pinene/` (6 paths; the 6 models' own `path` too). | none (`page.path` always came from routes.json) | PIPELINE-CONTENT 12.3 |
| **`ctx.rich` sanitiser is attribute-aware** (4.18.2): a tokenizer replaces the regex pass. Every `on*` attribute however delimited (`title="x"ontoggle=`, `title="x"/ontoggle=`, `title=">" ontoggle=`), `srcdoc`, duplicate attributes, and URL attributes whose decoded value has a `javascript:` (`java&#115;cript:`, `javascript&colon;`, ...) or malformed scheme are removed; script, style, svg, math, object, noscript and other raw-text elements go with their content; a Google Maps iframe keeps only `src, width, height, style, loading, allowfullscreen, referrerpolicy, title`. Clean HTML passes byte for byte (all 2,443 model html strings unchanged). | none; keep printing model HTML only through `ctx.rich` | 4 |
| **AI label in the shipped variants** (4.17.12): WebP variants of `assets/generated/**` files get `tools/ai-label.xmp` with `webpmux -set xmp` after cwebp. Their output name is `assets/img/<sha12>-<w>-ai.webp`; the cache name carries `-xmp<sha8 of the XMP>`, so an unlabelled or stale cached variant is never reused. The report lists `aiVariants` (dist paths) and `aiAssets` (files copied as-is from `assets/generated/`, e.g. the loop video through `ctx.asset`). | none; use `ctx.img` / `ctx.asset` for generated files as before | 10 |
| **build-check 11**: every `-ai.webp`, every `assets/generated/**` file in the build, and (with `--report <build report>`) every `aiVariants` / `aiAssets` entry must hold the bytes `trainedAlgorithmicMedia`. Control: a labelled file (a real one from the build when there is one) is not reported, its copy with the XMP chunk stripped (WebP) or the label bytes blanked (other files) is. | none | 7 |
| **Search index** (4.17.7, DESIGN-SPEC 6.5): one `assets/search-index.<sha10>.json` per build, URL in `ctx.searchIndex`. | Put `ctx.searchIndex` in a `data-src` attribute (the build makes it page-relative); fetch it from JS. | 4 |
| **Declaration files** `src/content/removals.d/*.json` (P0): `tools/text-parity.mjs` reads `src/content/removals.json` and then every `removals.d/*.json` in file-name order, one schema; each lane writes only its own file (owners in `src/content/removals.d/README.md`). | New UI microcopy is declared in the lane's own `removals.d` file. | PIPELINE-CONTENT 11.2 |

## 1. How to run (from the workspace root)

```sh
node src/lib/routes.mjs      # -> src/content/routes.json (only when the evidence or the route rules change)
node src/lib/catalog.mjs     # -> src/content/catalog/*.json (reads routes.json; same rule)
node src/build.mjs           # -> dist/ ; exit 1 on any build failure (section 7)
node tools/link-check.mjs    # every internal href/src/srcset/url() in dist/ resolves; with positive controls
node tools/build-check.mjs   # h1, residue, live-site URLs, routes emitted, sitemap, products, AI label; with positive controls
#   add --report <build report> to cross-check the report's aiVariants / aiAssets (P1)
node tools/tests/test-sanitizer.mjs --old <copy of the previous policy.mjs>   # ctx.rich sanitiser unit test (P1)
# reproducibility: two builds, two dirs, identical trees
node src/build.mjs --out tmp/a && node src/build.mjs --out tmp/b && node tools/hashdir.mjs tmp/a tmp/b --control
```

Build flags:

| flag | default | meaning |
|---|---|---|
| `--out <dir>` | `dist` | output directory (wiped and rewritten) |
| `--cache <dir>` | `assets/optimized` | WebP variant cache, so a verifier never writes PIPELINE's cache |
| `--models <dir>` | `src/content/pages` | page models; `_index.json` there maps path -> `<slug>.json` |
| `--report <file>` | none | JSON report: summary, every error, the link log, missing images, H1 adjustments |
| `--allow-missing-models` | off | development only: a crawled page without a model gets a synthesised H1, and a missing `chrome.json` falls back to the ia-map nav, instead of failing |
| `--theme stub` \| `--theme <dir>` | `src/theme` if present, else the stub | force the stub, or use another theme directory (`<dir>/index.mjs`; the build-gate control uses this) |
| `--chrome <file>` | `src/content/chrome.json` | chrome model (to build from a snapshot) |
| `--routes <file>` | `src/content/routes.json` | route map (the build-gate control plants a duplicate this way) |

A build with an empty cache makes about 1,560 WebP variants and takes about 3.5 minutes on 10 cwebp workers. With a
warm cache a build takes about 60 s.

## 2. Files

| file | what |
|---|---|
| `src/lib/paths.mjs` | ROOT, ORIGIN, URL <-> output-path helpers (`splitInternal`, `withSlash`, `encodePath`, `relUrl`, `outFileOf`, `liveUrl`) |
| `src/lib/site.mjs` | `BUILD_DATE` and `SNAPSHOT_DATE` (constants, `2026-10-12`), JSON loaders, entity decoding, `siteFromFacts()` |
| `src/lib/routes.mjs` | builds `src/content/routes.json` |
| `src/lib/catalog.mjs` | builds `src/content/catalog/{products,brands,categories,specials,glossary,listings}.json` |
| `src/lib/images.mjs` | image index (`audit/image-inventory.json`), header-based dimensions, cwebp variants and cache |
| `src/lib/render-util.mjs` | escaping, `Linker`, `rewriteRich`, `relativizeHtml`, H1 count, residue scan, `KNOWN_BLOCKS` |
| `src/lib/policy.mjs` | H2: contract 4.7/4.15/4.16 enforcement: `stripTracking`, `applyLdPolicy`, `CONFLICT_POLICY`, `PLATFORM_ID_RE`, `outKey` (duplicate key), `modelProblems` (pre-flight), `sanitizeHtml` (`ctx.rich`) |
| `src/build.mjs` | the build |
| `src/theme-stub/` | `index.mjs` (renderPage, render404, styles, scripts, blockTypes), `stub.css`, `stub.js` |
| `tools/link-check.mjs`, `tools/build-check.mjs` | the two output checks |
| `tools/tests/test-ai-label.mjs` | P1: ImagePipeline on one `assets/generated/` file and one `assets/source/` photo, twice with two empty caches: `-ai.webp` names, `-xmp<sha8>` cache names, the label bytes in every AI variant and in none of the photo's, byte-identical runs, and an unlabelled variant under the old cache name never reused (8 checks) |
| `tools/tests/test-sanitizer.mjs` | P1: the 12 payloads of the hardening verifier (tmp/hverify/make-plants.mjs) and 30 more forms through `sanitizeHtml`; every model html string must pass unchanged; `--old <module>` runs the same checks on a previous sanitiser, which must fail (positive control) |
| `assets/brand/logo-agegate.png` | the logo floor (`audit/prelock/logo-agegate.png`, 370x306), until the brand lane's master lands |

## 3. The theme module (BUILD-CONTRACT 3.2, as implemented)

```js
export const styles = ['tokens.css', ...];   // concatenated in order -> dist/assets/site.<sha10>.css
export const scripts = ['site.js', ...];     // concatenated in order -> dist/assets/site.<sha10>.js
export const blockTypes = [...];             // optional: the block types the theme renders; a page block of any
                                             // other type fails the build ("block-type-not-rendered-by-theme")
export const stylesDir = 'src/styles';       // optional; default src/styles for src/theme, the stub's own dir else
export const scriptsDir = 'src/scripts';     // optional; default src/scripts for src/theme
export function renderPage(page, ctx) {}     // -> a complete HTML document string
export function render404(ctx) {}            // -> a complete HTML document string (served at any depth)
```

Rules the build enforces on what the theme returns:
- **Write every internal URL root-relative** (`/menu/`, `/assets/site.abc.css`), always through `ctx.url`,
  `ctx.img`, `ctx.imgSrc`, `ctx.asset` or `ctx.rich`. The build then rewrites every `href`, `src`, `srcset`,
  `poster`, `action`, `data-src`, `data-href` (double- or single-quoted), and every `url()` in a `style`
  attribute or a `<style>` block, to a **page-relative** URL. `dist/` therefore works from any directory, and under
  a GitHub Pages project subpath. `dist/404.html` keeps root-relative URLs,
  because it is served at any depth. Script bodies (JSON-LD, inline JS) are never touched.
- A root-absolute URL left in a page after that pass fails the build (`root-absolute-left`).
- Exactly one `<h1>` per page. The pipeline guarantees one level-1 heading block (section 5.3). The theme must not
  add a second `<h1>`, and must render the level-1 block as the `<h1>`.
- In CSS, write `url("asset:fonts/roboto-normal-latin.woff2")` (or `asset:brand/...`, `asset:generated/...`). The
  bundler swaps in the fingerprinted path, relative to `dist/assets/`.
- A live-menu hand-off link must carry `data-handoff="live-menu"` and use `ctx.live(path)`. It is the only
  allowed in-page `href` to capecodcannabis.com (build-check 3).
- The header's "Hours of Operation" item links `#hours`, which is dead on the live site. Give the hours block
  `id="hours"` and the link works (the stub does this).

## 4. `ctx` (built once)

| field | type | notes |
|---|---|---|
| `site` | object | from `facts/client-facts.json` ONLY: `{ name: 'Cape Cod Cannabis', legalName: null (not printed on the site), businessNames: [...], origin, phone: {display: '(774) 383-3133', href: 'tel:+17743833133'}, email: 'info@capecodcannabis.com', address: {street, locality, region, postalCode, country, geo, printedAs, ...}, hours: 'Open daily, 8 AM–8 PM', hoursSpec: [{days, opens, closes}], socials: [{href, label}], rating: {value: '4.9', count: '967', source, quote}, tagline: 'Always worth the trip!', licence: '#MR282685', areaServed: [16 towns], facts }`. `socials[].label` is the facts file's network name ("Twitter / X"), NOT visible copy: the footer's verbatim labels are in `ctx.footer`. Read the facts' `conflicts` before presenting a fact. Render nothing for a null field; never fill one from memory |
| `nav` | object | `{ logo: {ref, srcUrl, alt, href}, menu: [{label, href, target?, title?, children?}], toggleLabel, strips: [[{label, href, title}], ...] (the two mega strips), hint, search: {action, method, field, placeholder, label, button}, skipLink: {label, href}, backToTop: {href, label} }` from `src/content/chrome.json` (PIPELINE-CONTENT) |
| `footer` | object | `{ sections: [{ id, blocks: [...] , hiddenAll? }] }`: the footer is block-modelled; render it with the block renderer and skip `hiddenAll` |
| `announcement` | object | `{ text, href, hiddenAll: true }`: hidden at every breakpoint on the live site; not rendered by the stub |
| `ageGate` | object | `{ headline: 'Welcome!', challenge: 'Are you over 21 years of age?', yes: 'Yes', no: 'No', notes: ['*Must be 21+ with a VALID ID.', 'Always worth the trip!'], ariaLabel: 'Verify you are over 21 years of age?', storageKey: 'ccc-age-21', logo: {ref, alt} }`. **"No" (BUILD-CONTRACT 4.15.2, from the plugin's script config on all 743 captured pages, `"rechallenge":"1"`):** the gate stays up, shows "You are not old enough to view this content" verbatim and lets the visitor answer again; nothing behind it becomes usable (docs/COMPLIANCE.md R7). While it is up, `document.title` is the plugin's customTitle "Age Verification - Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA"; if storage throws, show "Your browser does not support cookies, you may experience problems entering this site". These three plugin strings are not in `ctx.ageGate`: the stub exports them as `AGE_GATE_PLUGIN` (`src/theme-stub/index.mjs`). **Fail closed (4.17.1, replaces the no-JS line of 4.4):** the gate is visible by default, not only under `html.js`; a blocking head script hides it before first paint when `ccc-age-21` is stored; without JS, "Yes" is `<a href="#age-ok" role="button">` and CSS `:target` hides the gate for that page view, and "No" is `<a href="#age-no" role="button">` whose `:target` shows the error; JS intercepts both and Space activates them. The stub predates 4.17.1 (its gate is closed in the markup); the theme implements 4.17.1. |
| `chrome` | object | the raw `src/content/chrome.json` (for anything not mapped above) |
| `url(u, from?)` | fn -> string \| null | any source or output URL -> root-relative, percent-encoded output URL with trailing slash, query and hash kept; `null` when the target is not built (render the text without a link) |
| `link(u, from?)` | fn -> `{href, external?}` \| `{unlink, reason}` | the full resolution behind `url` (section 6) |
| `rich(html, from?)` | fn -> string | a model's allowlisted rich HTML with links resolved (dead -> text kept, tracking parameters stripped from internal links) and every `<img>` made responsive (`data-src`, else `src`, else `data-source-url`). Then **sanitised** by `sanitizeHtml` (src/lib/policy.mjs; contract 4.16.10, attribute-aware since 4.18.2, P1): a tokenizer that reads tags and attributes as a browser does (quoted values may hold `>` and `/`; an attribute may follow a quoted value without a space; `/` between attributes is a space; the first of two same-named attributes wins). Removed: every `on*` attribute, `srcdoc`, duplicate attributes, a URL attribute (href, src, action, formaction, xlink:href, data, poster, srcset and 14 more) whose value after decoding every character reference and removing spaces and control characters has a `javascript:`/`vbscript:`/`livescript:` scheme or a malformed scheme; script, style, noscript, template, textarea, title, xmp, noembed, noframes, object, applet, svg, math, frameset and every non-map iframe with their content; base, meta, link, embed, frame, param tags; comments; a tag cut off by the end of the input. A Google Maps iframe (`https://www.google.com/maps/embed?...`) keeps only `src, width, height, style, loading, allowfullscreen, referrerpolicy, title`. A tag with nothing removed is copied byte for byte, and `<span class="sr">` (screen-reader-only text) passes. Counts are in the report (`declared.richSanitized`; 0 on the real models). Unit test: `node tools/tests/test-sanitizer.mjs --old <previous policy.mjs>` |
| `searchIndex` | string | P1 (4.17.7, DESIGN-SPEC 6.5): root-relative URL of this build's search index, `/assets/search-index.<sha10>.json`; set before any page renders. Put it in a `data-src` attribute (the build relativizes `data-src`) and fetch it from JS. Shape: `{ "v": 1, "items": [ { "t", "u", "k", "b"? } ] }`. `t` is verbatim: the product title from the HTML sitemap, the brand name, the category or subcategory name, or the page's single H1 for a crawled page, post or event. `u` is the root-relative URL as `ctx.url` returns it (percent-encoded). `k` is `product`, `brand`, `category`, `page`, `post` or `event`. `b` is the product's catalog brand (5,419 of 5,857 products have one). Every product (5,857), brand (249), category (62) and crawled page (304), post (62) and event (60): 6,594 items, 1,050,782 bytes on the P1 stub build; nothing is dropped to save bytes. Derived archives (tag, event-category, terpene pagination) are not in it. Order: kind in the order above, then `t`, then `u` (code-unit order). The 8 products titled "... \| Gift Card" are in it (`/?s=gift-card`, 4.17.7). |
| `img(ref, opts)` | fn -> string | `<img src srcset sizes width height alt loading decoding fetchpriority? class? title?>` with WebP variants. `ref` = a captured image URL (CDN, origin, or a late image: `images.dutchie.com/<hash>` and the 2 home banners in `audit/late-images.json`), a local file (`assets/source/...`, `assets/generated/...`, `assets/brand/...`) or an image-plan slot id. A local copy always wins; a Dutchie URL is hotlinked only when none exists. opts: `{ alt, sizes, cls, loading ('lazy'), fetchpriority, decoding ('async'), widths, width, height, title }`. A missing image or ungenerated slot renders `<span class="img-missing" data-slot? role="img"? aria-label?>` with the aspect ratio when known, never a broken `<img>` |
| `imgSrc(ref, width=960)` | fn -> string \| null | URL of one variant (the first >= width) for CSS backgrounds and preloads |
| `dutchie(hash, {w=344, h=330, fit='fill', dpr})` | fn -> string | `https://images.dutchie.com/<hash>?auto=format&fit=fill&fill=solid&w=..&h=..[&dpr=2]` (cards as on the live site). Cap the width at the source size; t1's source is 250x250 |
| `asset(name)` | fn -> string | `'site.css'`, `'site.js'`, `'fonts/<file>'`, `'brand/<file>'`, `'generated/<file>'` -> fingerprinted root-relative URL; a missing asset fails the build |
| `live(path)` | fn -> string | the live URL of an output path (`https://capecodcannabis.com/...`), for `data-handoff="live-menu"` links only |
| `catalog` | object | `{ products, brands, categories, specials, glossary: {terpenes, cannabinoids, effects, strains}, listings, stats, snapshot }` (section 8) |
| `collections` | object | `{ posts: [card], events: [card] }`, newest first. card = `{ href, title, excerpt, excerptSource: 'meta description', image: {src, alt} \| null, date }` (date = JSON-LD datePublished). Use these to list a whole archive on one page |
| `routes` | object | `src/content/routes.json` |
| `pagesByPath` | Map | path -> `{ path, kind, title, h1, derived }` for every page |
| `page` | getter | the page being rendered (default `from` for `url`, `link`, `rich`) |
| `buildDate`, `snapshotDate`, `origin` | strings | constants: `2026-10-12`, `2026-10-12`, `https://capecodcannabis.com` |
| `esc`, `escAttr`, `attrs(obj)` | fns | text and attribute escaping; `attrs({a:1, b:null, c:true})` -> ` a="1" c` |

Contract refinements:
- `ctx.nav` holds the header (contract: `nav`).
- `ctx.footer` is block sections, not a fixed shape.
- `ctx.rich`, `ctx.link`, `ctx.live`, `ctx.collections`, `ctx.routes`, `ctx.page` and (P1) `ctx.searchIndex` are additions.
- `ctx.site` adds `businessNames`, `hoursSpec`, `licence` and `areaServed`.

## 5. `page` (one per output path)

| field | notes |
|---|---|
| `kind` | the ia-map template name: home, blog-post, blog-index, blog-archive-category, blog-archive-date, blog-archive-tag (derived), standard-page, sale-landing, legal, utility, checkout, account-loyalty-shell, collection, shop-menu, products-index, product, brands-index, brand, categories-index, category, subcategory, specials-index, special, taxonomy-index, taxonomy-index-pagination, terpene, cannabinoid, effect, strain, event, events-calendar, town-landing-cpt, town-landing-index, town-landing-index-pagination, town-landing-page, stores-index, store (37 kinds) |
| `path` | decoded output path, leading and trailing slash (`/terpenes/α-pinene/`); written to `<out>/<path>/index.html` |
| `sourceUrl` | the live URL (null for a derived page) |
| `derived`, `derivedType`, `why` | derived pages: `tag-archive`, `event-category-archive`, `terpene-pagination`, `product`; `why` says why the page exists |
| `slug` | the model slug (crawled pages), the product slug, or the path joined with `-` |
| `title`, `metaDescription`, `robots`, `canonical` | from the model head (else `audit/seo-inventory.json`); canonical = `https://capecodcannabis.com` + the encoded path (self-referencing) when the source had one |
| `og`, `twitter` | objects keyed by full property name (`og:title`, `article:published_time`, `twitter:card`). Image URLs are swapped for the rebuilt variant (absolute, at the origin, >= 1200 wide when available) or dropped |
| `jsonLd` | array of JSON-LD objects from the source; every string naming a platform path is mapped to a rebuilt image URL or dropped. H2 policy (contract 4.7 / 4.16.11): the `#organization` entity has no "Medical Marijuana Dispensary" `alternateName`; `openingHours` "… 8:00 - 8:00" becomes "… 08:00-20:00"; a FAQPage stating 1 ounce / 28 grams is dropped (a `WebPage+FAQPage` node loses the FAQPage type and `mainEntity`); a string holding an e-mail other than `info@capecodcannabis.com` is dropped; a `joint-product-photos.s3.amazonaws.com` image becomes the local copy (absolute, at the origin), else is dropped |
| `ldDropped` | H2: every JSON-LD change on this page, `[{ rule, what, detail }]` (declared; never render) |
| `headDropped` | what the head clean-up removed (platform URLs in text, unmappable images, Rank Math author extras) |
| `h1` | the text of the page's single level-1 heading |
| `breadcrumbs` | `[{label, href \| null}]`, href = output path; the model removed the breadcrumb from the region, so the theme renders it |
| `breadcrumbsSource`, `breadcrumbsSeparator`, `breadcrumbsLabel`, `ariaLabels` | H2: copied from the model, so the theme needs no bridge. Show breadcrumbs only where `breadcrumbsSource === 'visible'` (contract 4.16.5); product and derived pages build their own. The separator and label are `undefined` when the source had none. `ariaLabels` are page-level accessible names (`[]` when none). Output is byte-identical to the stub's former bridge (same aggregate hash). |
| `section` | the nav group for the active state (the model's label, e.g. "Shop Menu"; else shop, learn, about, directions, loyalty, home) |
| `sections` | `[{ id, doc?, hiddenAll?, blocks: [...] }]`: the content model (docs/CONTENT-MODEL.md section 5). Skip `hiddenAll` sections AND blocks |
| `catalog` | the page's Joint widget configs: `[{ widget: menu \| slider, params/raw, filters, sort, limit, label?, hiddenAll? }]` (the model's, else `src/content/catalog/listings.json`), or null. `catalogSource` says which |
| `products` | brand pages only: every product the catalog links to the brand, as `[{ path, title, brand, size, strainType, full? }]`; null elsewhere (Plan B). `brand.match` is `title-prefix` or, for the 6 flagged ones (all on /brands/1906/), `slug-start` with `brand.flag` "brand taken from the URL slug, not the title" (H2, contract 4.16.7) |
| `product` | product pages: the catalog entry (section 8) |
| `listing` | derived archives: `{ members: [path], order }` (the cards are in the sections' `posts` block) |
| `ledger` | the model's ledger (collapsed, hidden, conflicts, removed, ...) |
| `removedBlocks` | blocks the build dropped, with the reason: decontamination (agency credit, honeypot) and, H2 (contract 4.16.4), the stale side of a contradicting device pair `{ t, why, dev, text }`. On /daily-purchase-limit-in-ma/ that is the "Understanding the 28-Gram Daily Limit" faq item (tablet/mobile). The same faq keeps its two other items ("Why Are Purchase Limits Important?", "Tips for Staying Within the Limit"), because their desktop twins were collapsed into it, so they are the only copy. The kept block carries `conflictPurged: <n>` and no longer `conflict`. A `conflict: true` block on a page without a policy fails the build (`undecided-conflict`). |
| `renamed` | H2 (contract 4.16.8): platform identifiers removed from form/search `name` (set to null, so no `aria-label` from it) and field names (`tribe-events-views[tribe-bar-search]` -> `search`): `[{ what, from, to }]`; /events-calendar/ and /moodi-day-review-portal/ |
| `related`, `generated` | `[]` and `{}`: reserved (image-plan slots attach here once `src/content/image-plan.json` exists) |
| `modelMissing` | true only in `--allow-missing-models` development builds |

### 5.1 Block types

`KNOWN_BLOCKS` (render-util.mjs) = the CONTENT-MODEL vocabulary: heading, rich, image, button, faq, carousel,
gallery, posts, cta, products, reviews, hours, embed, html, form, hotspot, timeline, meta, postnav, comments,
event-field, anchor, icon, divider, nav, search, social, chrome-ref, app, sitemap, excluded. Any other type fails
the build. Field notes from the final models:
- `image`: `ref` (the local file in `assets/source/`), `srcUrl` (the CDN URL), `alt`, `w`, `h`, `href`, `missing`.
  Pass `ref || src || srcUrl` to `ctx.img`.
- `heading`: `level` may be null with `as: 'p'` (a paragraph styled as a heading).
- `event-field`: `field`, `text` (with newlines), `links[{label, href}]`, and `level` for the title field (the
  event's H1).
- `sitemap`: `groups[{heading, level, links[{label, href}]}]`.
- `products`: `widget`, `params`, `filters`, `sort`, `limit`, `label`. Plan B: render the copy and a hand-off
  (`data-handoff="live-menu"` to `ctx.live(page.path)`), never invented products.
- `chrome-ref` with `removed: true`, `excluded`: render nothing.

### 5.2 Derived pages (no model)
Sections are built by the pipeline from existing block types: `[{ id: 'derived', blocks: [ {t:'heading', level:1,
text}, {t:'posts', kind:'derived', items:[card]} ] }]`. Product pages: `[{ id: 'product', blocks: [{t:'heading',
level:1, text: title}] }]` plus `page.product`.

### 5.3 One H1 (the build's normalisation, logged in the report's `h1Notes`)
1. The model's `demote: true` flags apply (level 1 -> 2).
2. Among rendered blocks (not `hiddenAll`), `heading` and `event-field` with a level count. The first level-1
   block stays; later ones become level 2.
3. If there is none (the 28 pages with no source H1), the build follows contract 4.15.7 and uses the model's
   `h1Source.candidates[0]`.
   - **A heading candidate** (11 pages): that heading block is promoted to level 1.
   - **A breadcrumb candidate** (15 visible, 2 JSON-LD only: /links/ "Links" and /moodi-day-review-portal/
     "Protected: Moodi Day Review Portal"): the text becomes a synthetic level-1 heading. It sits in a leading section
     of its own, `{ id: 'h1', blocks: [{ t: 'heading', level: 1, text, synthetic: true, from }] }`, so it is never
     inside a hidden section.
   - Only a page with no candidate at all falls back to the first rendered heading, then to the route H1 or `<title>`.
   - Each `h1Notes` entry carries `rendered: true|false`, measured after rendering: exactly one `<h1>` that carries the
     chosen text. The summary counts `h1NotesNotRendered`.
   - Examples: /effects/happy/ -> "Happy"; /strains/ -> "Strains"; /categories/ -> "Flower" (its first visible heading).

## 6. Links (`Linker`, render-util.mjs)

Resolution of every href, in order:
1. `#frag`, `mailto:`, `tel:` and `sms:` are kept.
2. An external URL is kept, unless it embeds a URL on the live host (`//capecodcannabis.com`, also
   percent-encoded inside a query: calendar-subscribe and "add to Outlook" links, `webcal:`). Those are unlinked,
   with the text kept. A bare domain mention, such as `?utm_source=capecodcannabis.com` or a mailto: address, is
   kept.
3. An external link to a harvested image file (a CDN `wp-content` URL) points at the image's largest rebuilt
   variant. Without a local copy it is unlinked.
4. Internal: the path is decoded and normalised (trailing slash), then:
   - platform endpoints (`?ical=`, `?outlook-ical=`, wp-admin, wp-json) are unlinked;
   - aliases and redirects are followed to the built page (`/intro-to-cannabis` -> `/intro-to-cannabis-101/`);
   - the case variants (`/categories/CBD/`) go to their lowercase page;
   - a dead link from `routes.deadLinks` is retargeted only where one page is the unambiguous target. Only
     `/blog/` -> `/our-blog/` (the contract's example) qualifies; every other dead link is unlinked;
   - anything else not built (403 brands, unsaved PDFs, year archives, calendar month/day views, archive
     pagination) is unlinked.
5. The query and hash are kept (`/categories/edibles/?category=edibles&brand=wana&sort=price-high-to-low` stays
   a client-side filter on the base page). **H2 (contract 4.15.4):** the tracking parameters `_gl`, `_ga` and
   `utm_*` are stripped from internal links (also from `https://capecodcannabis.com/...` and `https://www....` forms,
   which become page-relative). The other parameters keep their order and encoding. External links are untouched: a
   `?utm_source=capecodcannabis.com` referral on another host stays. Logged as `stripped:tracking-params`
   (24 links: 23 to /directions/, 1 to /).

Every unlink, retarget and redirect is counted in the build report's `linkLog` (kind, target, count, example pages).

## 7. Build failures (exit 1)

**Pre-flight (H2, contract 4.16.10), before `--out` is touched:**
- `invalid-model`: a model that is not an object, has no `sections` array, or holds a null or non-object block, a
  block without `t`, or a null item in `items` / `slides`;
- `invalid-route-path`: a path without the leading or trailing slash, or ending in `index.html`;
- `duplicate-output`: the key folds case, Unicode form, a missing trailing slash and an `index.html` suffix;
- `missing-model`;
- `missing-chrome`.

Any of these exits 1 with the errors printed, and in `--report`, before the output directory is wiped. The previous
output stays as it was. The write-time duplicate guard uses the same key.

During the build:
`undecided-conflict` (a `conflict: true` block on a page with no policy; H2),
`missing-model` (a crawled page without a model), `unknown-block-type`, `block-type-not-rendered-by-theme`,
`render-error`, `h1-count` (not exactly one, also on 404.html), `residue` (wp-content, elementor, joint-ecommerce,
litespeed, gtranslate, googletagmanager, rankreallyhigh, case-insensitive, anywhere in a page and in the CSS/JS
bundles, sitemap.xml, robots.txt, `_redirects`, `.htaccess`), `missing-chrome` (no `src/content/chrome.json`), `duplicate-output`
(also case-insensitive: Windows and macOS disks fold case), `root-absolute-left`, `dead-internal-reference` (every
relativized URL must name a written file), `missing-asset`, `image-failed` (a cwebp error, or, P1, a variant of an `assets/generated/` file that `webpmux -set xmp` did not label).

Deterministic output: constant dates, sorted iteration, content-hash file names, no timestamps in `dist/`, and
`routes.json` and catalog files written only when their bytes change.

## 8. Routes

See `src/content/routes.json` (`counts`, `routes`, `redirects`, `variants`, `deadLinks`, `notBuilt`, `whyByType`,
`titlePatterns`).

**6,732 routes** = 738 captured pages (737 crawled HTML pages + t1 from `audit/prelock`) + 5,994 derived.

| family | routes | source and why |
|---|---|---|
| crawled pages | 737 | every ok HTML row of `ia-map.json` routes: 745 minus 6 query variants and the 2 case variants. Path = the source path with its trailing slash; kind = the ia-map template |
| products | 5,857 (t1 + 5,856 derived) | every `/products/` link on `audit/raw/sitemap.html` (5,857 distinct, titles verbatim after entity decoding). The 36 percent-encoded slugs are written under decoded UTF-8 names (`.../raw-cones-raw-classic-6pk-1-¼-for-sale-wellfleet-ma/`); hrefs are re-encoded. The `-N` duplicate counters are kept. 4,000 are also in product sitemap 1 (`inXmlSitemap1`) |
| tag archives | 131 derived | the 131 `/tag/<slug>/` URLs refused by the lockout. Members = the captured pages whose TEC tag widget (`a.tec-events-elementor-event-widget__tags-link`) links the tag: all are event pages; 459 memberships, 1 to 41 per tag. Order: JSON-LD `datePublished` desc (WordPress archive order). H1 = the tag label as linked. Title = "<label> Archives \| ..." (the category-archive pattern; the live tag template is UNVERIFIED). Robots `follow, noindex` (live robots UNVERIFIED), so they are not in sitemap.xml |
| event-category archives | 3 derived | `/events-calendar/category/{pop-ups, events, 420-weekend-2026}/` (403). Members = the events whose category link (`rel="tag"`) points there: 53, 2 and 1 |
| terpene pagination | 4 derived | `/terpenes/page/2-5/` (403). Members = the 40 terpene pages not in the captured page-1 grid (12 cards), 12 per page, in path order. The live order is UNVERIFIED: page 1 follows neither the sitemap order nor its reverse |

- **Redirects (15)** go to `dist/_redirects` (Netlify/Cloudflare form, with and without the slash) and
  `dist/.htaccess` (`RedirectMatch`):
  - the 12 crawler-folded aliases;
  - the 2 case variants (`.htaccess` only);
  - `/events-calendar/list` -> `/events-calendar/` (the TEC list view is the calendar's default view);
  - `/offers/affordable-ounces-1-2-ounces` -> its special.

  A rule whose target is not built is dropped and listed in `notBuilt`; this hit 8 `/offers/` chains to expired
  specials. The plain trailing-slash 301s (752 chains) are host behaviour (`DirectorySlash On`).
- **Query variants (9)** are not files: 3 brand `?product=`, 2 tinctures `?product=`, 3 flower `?strain=` (403)
  and 1 `?strain=`. Links keep the query on the base page, which reads it as client-side filter state.
- **Dead links (20)** from `ia-map.deadLinks`: `/blog/` is retargeted to `/our-blog/`, and the other 19 are
  unlinked with their text kept (BUILD-CONTRACT 4.13).
- **Not built (574):**
  - 522 archive-pagination pages, never crawled: the theme can list a whole archive from `ctx.collections` and
    `ctx.catalog`;
  - 12 dead 404s, plus the 8 `/offers/<slug>/` URLs whose specials expired (404). Those 8 are listed twice: once
    as the 404 row and once as their dropped redirect rule;
  - 11 `/offers/` URLs refused by the lockout with no captured special;
  - 7 unlisted brands (403);
  - 5 non-HTML files whose bodies were not saved (llms.txt, llms-full.txt, locations.kml, 2 PDFs);
  - 1 special that is in the sitemap but was never requested.

## 9. Catalog and Plan B (BUILD-CONTRACT 4.5)

`node src/lib/catalog.mjs` reads `routes.json`, the raw brand, category, special and glossary pages (breadcrumbs,
H1s, Joint `data-config`) and `audit/prelock/t1.html`.

| file | content |
|---|---|
| `products.json` | 5,857 `{ path, slug, title (verbatim), brand, size, strainType, dup?, encodedSlug?, sourceUrl, full? }` + `stats` |
| `brands.json` | 249 `{ name (H1), path, slug, jointBrand (the brandName filter value), products: [path] }`: every product the catalog links to the brand, the 6 flagged slug-start matches included (H2) |
| `categories.json` | 11 categories + 51 subcategories `{ name (breadcrumb), h1, path, kind, parent, jointCategory, jointSubcategory, children }` |
| `specials.json` | 17 `{ name (H1), path, specialId }` |
| `glossary.json` | terpenes 52, cannabinoids 20, effects 10, strains 4: `{ name, h1, path, filterField, filterValues }` |
| `listings.json` | 496 pages, 569 Joint widgets: `{ widget: menu \| slider, raw (non-null params), filters, sort, limit }`, verbatim from each page's `data-config` |

Rules (Plan B, BUILD-CONTRACT 4.5):
- **Brand** = the longest brand display name or Joint brand value that the TITLE starts with, at a word boundary:
  5,413 products. Otherwise, a brand slug at the start of the product slug: 6 products, flagged `match:
  'slug-start'` with "brand taken from the URL slug, not the title". 438 have no brand.
- **Size** (3,757) and **strain type** are parsed from the slug. **H2 (contract 4.16.7):** each chip says where
  its label comes from:
  - chip shape: `{ token, label, from: 'title' | 'slug', source }`. `source` is the theme-facing caption and follows
    `from`. **Print `chip.source` with each chip, not a fixed caption.**
  - `from: 'title'`: the token's words appear in the title (any 1-3 non-alphanumeric characters between them). The
    label is that title substring, verbatim ("30pk/15serv", "3.5g", "Hybrid"). Caption: "from the product name".
  - `from: 'slug'`: the label is the slug token, un-slugged only (hyphens to spaces, case kept: "1g", "hybrid",
    "3 5g"). Caption: "from the product's web address".
  - Measured: 4,838 labelled chips, 1,840 from the title and 2,998 from the slug. 0 chips claim the title without
    their label appearing verbatim in it (the previous catalog had 3,204 such chips).
  - Full words get a label: hybrid, indica, sativa, cbd, balanced (1,081 products).
  - Abbreviations (sdh, idh, s, i, h) keep the token with `label: null` and `source: null` (1,576 products), because
    their expansion is UNVERIFIED. Show only labelled chips.
  - The token keeps the slug form (`3-5g`); the old `3.5g` token was a reformatting.
  - The slug size is not the variant label: t1's slug says 14g, and its offer is named "1/2oz".
  - The caption "from the product's web address" is new microcopy. It must be declared in `allowedAdded[]` by the
    owner of `src/content/removals.json` before the theme prints it.
- **t1** (`full`) holds the verbatim JSON-LD Product, the description lines, the image hash, the offers (`1/2oz`,
  `75.00`, InStock), the Joint id, `updated` 2026-10-11T14:07:33-04:00 and `asOf` 2026-10-12. Only t1 gets Product
  JSON-LD, an image and a price ("as of 2026-10-12").
- **Every other product page:** the H1 (the sitemap title), a breadcrumb (Home / Products / title) with
  BreadcrumbList JSON-LD, the brand link, the labelled chips and the "Check price and availability" hand-off
  (`data-handoff="live-menu"` to the live product URL). No price, image, offers or Product JSON-LD. Robots = t1's
  (`follow, index, ...`); noindex for the stubs is an operator decision.
- **Listings:** brand pages list their title-prefix members. Every other grid renders its copy plus the hand-off,
  never invented products. Category membership has no ground truth (COMMERCE.md 4), so no category lists products.

## 10. Images

- **Resolution order** for a captured URL: an exact `src` match in `audit/image-inventory.json` (duplicates resolve
  to their kept twin); the path after `/wp-content/` (with the `smush-webp/` and `.png.webp` forms normalised); the
  same without a WordPress size suffix (`-300x200`, `-scaled`); a unique local basename.
- **Variants:** widths 320, 480, 640, 960, 1280, 1600, 1920 and 2400, below the source width, plus the source width
  itself (capped at 2400). cwebp `-q 80 -alpha_q 90 -m 4 -metadata none`. The output is byte-identical across runs
  (checked: two runs on one PNG gave equal sha256).
- **AI label (P1, 4.17.12).** A variant of a file under `assets/generated/` is made by cwebp and then labelled with
  `webpmux -set xmp tools/ai-label.xmp`; the build checks the bytes `trainedAlgorithmicMedia` are in it before caching
  it. Its names carry a marker: `dist/assets/img/<sha12>-<w>-ai.webp`, cache `<sha12>-<w>-q80a90m4-xmp<sha8 of
  tools/ai-label.xmp>.webp`, so an unlabelled cached variant (or one labelled with an older XMP) is never reused, and a
  labelled and an unlabelled variant of the same bytes never share a file. Measured (`tmp/p1/dist-ai-a`, a test theme
  that adds `assets/generated/cat-cbd.jpg` and the loop video to the home page): 8 labelled variants and 1 asset;
  build-check 11 finds the label in 9/9; two builds from two separate copies of the cache (each made the 8 labelled
  variants afresh) are IDENTICAL by `tools/hashdir.mjs` (8,613 files). The report lists `aiVariants` and `aiAssets`.
- **Names:** `dist/assets/img/<sha12 of the source>-<w>.webp`; cache `<cache>/<sha12>-<w>-q80a90m4.webp`. No source
  path reaches the output.
- **Product images** are hotlinked (`ctx.dutchie`); only t1 has a hash.
- **Late images (H2, contract 4.15.5).** `audit/late-images.json` maps 28 source URLs to files in
  `assets/source/late/`: the 26 Dutchie images in event bodies and 2 home banners. The image index resolves those
  URLs to the local files, ignoring the query, so they get WebP variants like any other image.
  - Measured: all 26 Dutchie files render locally on the 14 event pages, and the only `images.dutchie.com` reference
    left in the HTML is t1's product photo.
  - The 2 home banners resolve too, but sit in a `hiddenAll` section (home section 14), so they are not rendered.
  - The 4 loyalty VIP banners (302 to the origin, not fetched), `american-flag.avif` and the levia.buzz image stay
    missing: they render the `.img-missing` frame with the alt kept (report `missingImages`: 6).
- **JSON-LD images (H2, 4.16.11).** All 17 `joint-product-photos` URLs have a local copy in
  `audit/image-inventory.json`, matched by source URL. They become absolute origin URLs of the rebuilt variant (29
  replacements on 18 pages).

## 11. Check results (measured)

Final build: 2026-10-12 10:45-10:49, `dist/`, stub theme, the content lane's 737 models via `_index.json`, and
`chrome.json`. The model and chrome timestamps were identical before and after both builds, so no files changed
under them.

| check | result |
|---|---|
| `node src/build.mjs` | exit 0, 0 errors; 6,732 pages written + 404.html; 107,267,431 HTML bytes; 526,747 root-relative references relativized, 0 dead; 0 missing models; 1,559 WebP variants (all cached, 0 failed); 3 Dutchie product photos on event pages hotlinked (`ctx.dutchie`); 2 missing image sources (styled frames); 77 H1 adjustments (49 model demote flags applied, 11 promotions, 17 synthesised); sitemap 6,542 URLs; 15 redirects; 75 s with a warm cache |
| link log (`tmp/pipe-site/build-report.json`) | 9 redirects followed; 1 dead link retargeted (`/blog/`); 5 image-file links rewritten to the rebuilt variant; 117 dead-on-live-site links, 12 not-built, 60 unknown-internal-target (year archives, calendar views, uploads PDFs), 63 `?ical` endpoints, 115 calendar exports carrying live URLs and 1 platform file link unlinked, text kept; 7 dead in-page fragments unlinked; 1 cross-page fragment stripped |
| `node tools/link-check.mjs` | exit 0. 8,304 files, 6,734 HTML+CSS files checked, 794,972 local references, 13,524 fragments, **0 broken**. Control fired: all 7 planted defects reported (missing file, root-absolute page link, dead fragment, missing srcset candidate, missing CSS url(), page-relative link in 404.html, directory without its slash); valid references and an encoded UTF-8 link (`../../cannabinoids/thca-%CE%B49-tetrahydrocannabinolic-acid/`) not |
| `node tools/build-check.mjs` | exit 0. 6,733 pages; routes 6,732/6,732 emitted; sitemap 6,542 locs = 6,542 indexable; products 5,857/5,857 (re-read from audit/raw/sitemap.html); 6,349 hand-off links; 41 prose mentions of the domain (info); **0 findings**. Control fired: two H1s, a residue string, the honeypot, a live href, a missing route, a missing sitemap URL, a duplicate sitemap URL and a percent-encoded live URL each reported. A canonical, og:url, JSON-LD, a hand-off, mailto: and a `utm_source=capecodcannabis.com` referral are not |
| reproducibility | `dist/` vs a second build in `tmp/pipe-site/repro-dist`: **IDENTICAL**, 8,304 files, aggregate `9276c116f76abceafe3ef5fbf14521e512e319dc8b42368054d0b1a88e82429b`; hashdir control fired. Also from a snapshot of the models with a warm cache vs an EMPTY cache (`--cache`, all 1,559 variants re-made by cwebp): IDENTICAL, 8,304 files |
| build gates (positive control) | a run with planted defects (`--theme tmp/pipe-site/control-theme`, `--models` copy with an unknown block, `--routes` copy with a duplicate and a case-only collision) exits 1 with unknown-block-type, duplicate-output (`/brands/MUZE/` vs `/brands/muze/`), h1-count, residue and dead-internal-reference (a missing page and a missing asset). A second control (`--theme tmp/pipe-site/control-css`, a CSS bundle carrying `wp-content`) exits 1 with residue in `assets/site.<hash>.css` |
| age gate in a browser (one headless Chrome, `file://`, `/brands/1906/`) | first load: dialog open, verbatim text "Welcome! Are you over 21 years of age? Yes No *Must be 21+ with a VALID ID. Always worth the trip!", nothing stored; "No": still open, nothing stored; "Yes": closed, `ccc-age-21` = "1"; reload: closed. 14 requests, all file://, 0 failed; 3 images, 0 broken; Roboto loaded through the fingerprinted `asset:` URL; one H1 |
| regenerators | `node src/lib/routes.mjs` and `node src/lib/catalog.mjs` re-run report "unchanged" (byte-identical) |

### 11.1 H2 results (2026-10-12, final code, stub theme as of 12:14)

All builds ran with `--out tmp/h2/<dir> --cache tmp/h2/cache`. `dist/` and `assets/optimized/` were not written.

| check | result |
|---|---|
| models | `node src/lib/extract.mjs` run twice. `tmp/pipe-content/hash-outputs.mjs` gave the same manifest both times, `8c46711f…` (739 files). Only `directions.json` and `_index.json` changed from the previous manifest `3705c23f…`. `node tools/text-parity.mjs --control` (models mode): recall 1, missing 0, added 0, both controls PASS |
| catalog | `node src/lib/catalog.mjs`: 4,838 labelled chips, 1,840 from the title and 2,998 from the slug. 0 chips claim the title without their label appearing in it; the same check on the previous catalog finds 3,204. /brands/1906/ has 21 members (was 15). A re-run prints "unchanged" for all 6 files |
| build | `node src/build.mjs --out tmp/h2/dist --cache tmp/h2/cache --report tmp/h2/report.json`: exit 0, 0 errors. 6,732 pages written + 404; 532,506 relativized refs, 0 dead; 1,857 WebP variants, 0 failed. Declared: 26 late images used; JSON-LD changed on 737 pages (737 alternateName removals, 483 openingHours rewrites, 2 stale FAQPage nodes, 29 Joint images made local); 9 og:image omitted; 1 conflict item purged; 3 platform names neutralised; 24 internal links stripped of tracking parameters; 77 H1 notes, all `rendered: true` |
| reproducibility | a second build into `tmp/h2/dist2`, then `node tools/hashdir.mjs tmp/h2/dist tmp/h2/dist2 --control`: **IDENTICAL**, 8,602 files, aggregate `074c6755…d4`; the control fired. A hash of all build inputs (stub, routes, chrome, `_index.json`, catalog, build code) was the same before, between and after the two builds. An earlier pair differed only because the stub's `stub.js` changed between the builds (a parallel lane's edit), which changed the JS bundle name in every page |
| `node tools/link-check.mjs --dir tmp/h2/dist` | exit 0: 8,602 files, 801,727 local refs, 13,525 fragments, 0 broken; the control fired |
| `node tools/build-check.mjs --dir tmp/h2/dist` | exit 0, 0 findings. The control fired (17 planted defects). The new checks also fire on real output: the verifier's older build `tmp/pipe-verify/dist-a` gives 737 `ld-excluded-alternate-name`, 483 `ld-excluded-opening-hours`, 2 `ld-stale-faq`, 18 `ld-joint-image`, 24 `tracking-param-internal-link` and 3 `platform-id-name` (2 files), exit 1 |
| `node tools/text-parity.mjs --built tmp/h2/dist --control --control-dir tmp/h2/parity-ctl` | exit 0: recall 1, missing 0, added 0, hiddenShown 0, all 11 controls pass. This uses the parallel lane's `removals.json` as it stood at the time of the run (about 12:17) |
| planted defects | Null block (`--models` copy with `[null, {}]`): exit 1, `invalid-model`, out dir untouched (only the sentinel file left). `/return-policy` and `/return-policy/index.html/` (`--routes` copies): exit 1, `invalid-route-path` + `duplicate-output` (key `/return-policy/`), out dir untouched. `<script>`, `onclick`, `onmouseover`, a non-map `<iframe>` and a `javascript:` link planted in a rich block of /about-cape-cod-cannabis/: build exit 0, all removed; the maps iframe and the planted text kept; the report counts them |

### 11.2 P1 results (2026-10-12, 13:20-14:00, stub theme)

All builds ran with `--theme stub --cache tmp/p1/cache` (a copy of `assets/optimized/`). `dist/` and
`assets/optimized/` were not written.

| check | result |
|---|---|
| models | `node src/lib/extract.mjs` once (13:35, `tmp/p1/MODELS-DONE`): 26 page models, `_index.json` and `chrome.json` changed, exactly the srOnly markers and the 6 decoded paths (`tmp/p1/diff-models.mjs` against `tmp/p1/models-before/`). `node tools/text-parity.mjs --control` (models): exit 0, 25,468 sentences, found 25,407 + declared 61, recall 1, missing 0, ADDED 0, both controls pass |
| build | `node src/build.mjs --theme stub --out tmp/p1/dist --cache tmp/p1/cache --report tmp/p1/report.json`: exit 0, 0 errors; 6,732 pages + 404; 539,239 relativized refs, 0 dead; 1,857 variants (all cached); `richSanitized` empty (the real models need no sanitising); search index 6,594 items, 1,050,782 bytes; `ai` 0 variants, 0 assets (the stub shows no generated image) |
| reproducibility | a second build into `tmp/p1/dist2`; `node tools/hashdir.mjs tmp/p1/dist tmp/p1/dist2 --control`: IDENTICAL, 8,604 files, aggregate `49a747be00bc9fbbbf0b2744807be8009f8ad753ffb4eaeed142d6a1d7a95051`, control fired. `node tmp/p1/hash-inputs.mjs` (786 input files: build code, stub, content, facts, audit inputs, fonts, brand, AI label) gave `de1a7e3e…0942` before, between and after |
| `node tools/link-check.mjs --dir tmp/p1/dist` | exit 0: 8,604 files, 808,460 local refs, 13,525 fragments, 0 broken; control fired (7 planted defects) |
| `node tools/build-check.mjs --dir tmp/p1/dist --report tmp/p1/report.json` | exit 0, 0 findings; routes 6,732/6,732, sitemap 6,542, products 5,857/5,857; control fired (19 planted defects; the AI-label control used a synthetic labelled WebP because this build holds no AI file) |
| `node tools/text-parity.mjs --built tmp/p1/dist --control --control-dir tmp/p1/parity-control` | exit 0: 25,468 sentences, found 25,205 + declared 263, recall 1, missing 0, ADDED 0 (565 declared), hiddenShown 0, 11/11 controls pass |
| AI label in dist (`--theme tmp/p1/ai-theme`: the stub plus `assets/generated/cat-cbd.jpg` through `ctx.img` and the loop video through `ctx.asset` on the home page) | two builds from two separate copies of the cache, each making the 8 labelled variants afresh: exit 0 both, IDENTICAL by `hashdir --control` (8,613 files); `build-check --report`: 9/9 AI files carry the label, 0 findings; the control used a real `-ai.webp` (XMP chunk stripped) and the real mp4 (label bytes blanked), both reported |
| sanitiser | `node tools/tests/test-sanitizer.mjs --old tmp/p1/old/policy.mjs`: 44/44 payload rows pass (the verifier's 12, the kept-text line, 30 more forms, all together); 2,443 model html strings unchanged; the previous sanitiser fails 23 rows (control) |
| sanitiser in Chrome | the planted model set (`tmp/p1/make-plants.mjs`, the verifier's payload verbatim) built with `--models tmp/p1/models-rich`; one headless Chrome (`tools/cdp.mjs`, network guard) over file:// on /return-policy/: `window.PLANT_P1`..`P12` all unset after load and after clicking every planted element; the 9 planted text lines visible; no `on*`, `srcdoc` or `javascript:` attribute in the DOM. Control: the verifier's planted build of the old sanitiser (`tmp/hverify/out-rich`) sets P2, P3, P4 and P7 in the same run |
| screen-reader-only text | `tmp/p1/srtext-check.mjs tmp/p1/dist` (the verifier's script; `<span class="sr">` counts as hidden): 1 of the verifier's 16 strings still visible, "List" on /events-calendar/, which is the calendar's visible view-selector link (see docs/PIPELINE-CONTENT.md 12.2); on the verifier's old build the same script still finds all 16 (control) |

## 12. Known gaps and decisions for the operator

Gaps (known, not fixed by this role):
1. **Fixed by H2: container CSS ids.** The extractor now emits an `anchor` block (`via: 'container#<data-id>'`)
   for a container id whose own section part holds no block (docs/PIPELINE-CONTENT.md, "H2 change"). /directions/
   "Get Directions" -> `#directions` resolves: dead in-page fragments went from 7 to 6.
2. **Dead in-page anchors on the live site** (`#restaurants`, `#attractions`, `#galleries`, `#shopping`,
   `#accommodations` on things-to-do; `#top` on /fire-offers-2/) are unlinked, with the image or text kept. One
   cross-page fragment (`/specials/#infused-pre-rolls`) keeps the page and drops the fragment.
3. **Archive pagination (522 pages) is not built.** Pagination links in the models (posts `pagination` text) are
   inert. The theme can list complete archives from `ctx.collections` (posts, events), `ctx.catalog.brands`, and so
   on.
4. **Alias URLs work only through host rules.** `/home`, `/seeds` and the other aliases exist only in
   `_redirects` / `.htaccess`, so on a host with neither (GitHub Pages) an inbound alias URL gets the 404 page.
   Internal links never use them: they go straight to the target.
5. **Unsaved files are unlinked:** llms.txt, llms-full.txt, locations.kml, the 4 uploads PDFs and the
   self-hosted videos (`og:video` dropped, video embeds render an empty `.embed-missing` frame).
6. **6 image sources are missing (H2 build, current stub).** They render the `.img-missing` frame with the alt kept
   (build report `missingImages`):
   - the 4 loyalty VIP banners on /shop-your-loyalty-points/: 302 to the origin, not followed;
   - `american-flag.avif` on /2025/06/17/: the download failed in the harvest;
   - the levia.buzz image on /event/levia-pop-up/: 403 in the harvest.

   The Dutchie images in event bodies now render from their local copies (`assets/source/late/`, contract 4.15.5).
   The earlier count of 2 was measured on the site lane's build. The stub has changed since then: it now renders
   gallery images, which the verifier's defect 2 found it dropped.
7. **Live-menu hand-offs point at capecodcannabis.com product and listing URLs.** That is right while the live
   menu runs on the old platform. When this rebuild replaces the origin, the hand-off must point at the new
   commerce integration (Joint embed or Dutchie hosted menu): change `ctx.live` in one place.
8. **Product stubs keep t1's robots (`index`).** Noindex for Plan B stubs is an operator decision (COMMERCE.md 8).
9. **Tag and event-category archives are `noindex`** and out of sitemap.xml until the operator decides; their
   live robots and titles are UNVERIFIED (403).
10. **Terpene pagination order** (pages 2-5) is path order; the live order is UNVERIFIED.

Decisions taken here (each recorded in routes.json, the build report or the page object):
- The TEC "add to calendar" and subscribe links that embed a live URL (115: Google, Outlook, webcal) and the 63
  `?ical` export endpoints are unlinked with the label kept. A bare domain mention, such as
  `?utm_source=capecodcannabis.com` on the Wellfleet business links, is not a live URL and is kept.
- Rank Math's `twitter:label1/data1` ("Written by" rrh_clientadmin) and `label2/data2` (reading time) are
  dropped.
- A platform URL inside head text (the meta description of /cannabis-chronicles-insights-into-premium-products/
  quotes a `.mov` upload URL) is removed with its separator, and the removal is declared in `headDropped`.
- JSON-LD is consolidated to one business entity (`#organization`), per BUILD-CONTRACT 4.7.
- `_redirects` omits the 2 case-variant rules (a case-insensitive host could loop); `.htaccess` keeps them.

Conflicts with other docs (BUILD-CONTRACT wins; reported, not resolved here):
- The contract names this interface `docs/PIPELINE.md` and a `tools/build-verify.mjs`. This role's brief named
  `docs/PIPELINE-SITE.md` and `tools/build-check.mjs`, which are the files that exist.
- The contract gives `assets/brand/**` to THEME (core). This role's brief gave it to PIPELINE-SITE "for now".
  Only `assets/brand/logo-agegate.png` (the floor logo, a byte copy of `audit/prelock/logo-agegate.png`) was
  written there; the stub's header uses the model's logo `ref`.
- Contract 4.4 says "No" follows the live plugin's config. That config is in the plugin's script on every captured
  page and contract 4.15.2 records it (`"rechallenge":"1"`, the error "You are not old enough to view this content",
  the customTitle and the cookie warning). The stub follows it: "No" stores nothing, keeps the dialog open, shows the
  error and lets the visitor answer again. Contract 4.17.1 (fail closed without JS) supersedes the stub's
  closed-in-markup dialog; see the `ageGate` row in section 4.
