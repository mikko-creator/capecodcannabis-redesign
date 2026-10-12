# Build notes: the verification record (newest last)

## 1. Harvest (2026-10-12, session c9cb544a)

### 1.1 Scoping (08:00-08:13 local, single curl requests)
- **Origin:** a plain request to `https://capecodcannabis.com/` returned 200 (519,793 bytes, 6.7 s). Only a
  client-side age gate (Age Gate plugin: cookie `age_gate`, age 21); no server-side 307 to a gate.
- **Platform:** WordPress ("weedpress" theme), Elementor Pro, Joint Commerce (`joint-ecommerce`; product data and
  images from Dutchie), Rank Math SEO Pro, LiteSpeed Cache, WP Defender (robots.txt markers), The Events Calendar,
  GTranslate, JetSearch/JetElements, OneSignal and Alpine IQ.
- **Sitemaps:** 6,531 page URLs.
  - 5,857 are `/products/`. A product page is a server-rendered shell whose JSON-LD `Product` carries name,
    description, brand, a `images.dutchie.com` image and offers.
  - Category, brand and menu grids are rendered client-side, so there are no product links in the static HTML.
- **Measured duplicates:**
  - `/brands/boutiq/?brand=Boutiq` has text identical to `/brands/boutiq/` and is canonical to it.
  - `/categories/edibles/?category=edibles&brand=wana&sort=price-high-to-low` likewise matches
    `/categories/edibles/`.
  - `/brands/<b>/product/<id>/` is the brand page itself (same title, canonical to the brand). It is linked once,
    from one post.
- **Crawler trap:** The Events Calendar links month/today views that page forward without end.

### 1.2 Tools
- **`tools/sr-local/sr-crawl.mjs`:** stock 1.12.1 (lib/ a byte copy) plus:
  - `--defer`, `--defer-stop`, `--exclude` and `--checkpoint`;
  - write-safety: project.json is re-read before writing, failures.json is merged on write, and writes are atomic;
  - breakers: `--stop-on-403`, `--max-404/--window-min` and `--skip-known-404`.
  - Tests in `tools/tests/`: `test-local-crawl.mjs` 29/29, `test-breakers.mjs` 16/16 and `test-patterns.mjs`, each
    with controls. The traps they caught: normalizeUrl strips the trailing slash, so an exclude pattern must not
    require one; and a plain resume re-queues every failed URL.
- **`tools/crawl-live.mjs`:** holds EXCLUDE/DEFER (15 exclude, 18 keep and 5 defer cases), passes the breakers and
  sets `SR_BLOCK_LEDGER`. It is guarded by IS_MAIN: on 08:14:58-08:17:12 an `import` of the unguarded version
  started a 54-page crawl. That crawl was killed, and its files were moved to `tmp/crawl/aborted-run-0814/`.
- **`tools/capture-live.mjs`** (computed-style harvest in headless Chrome) and **`tools/shots-dpr.mjs`** (first
  screens at 1280x585@1.5, 1600x662@1.2, 390x844@3 and 1440x900@1, with a real 15px scrollbar on desktop).

### 1.3 Crawl run A (08:18-08:45 local)
- `node tools/crawl-live.mjs --defer-stop --checkpoint 50 --max 8000` took 27m16s.
- **Result:**
  - 745 html pages and 5 non-html (llms.txt, llms-full.txt, locations.kml, 2 PDFs);
  - 102 excluded by pattern, 1 robots-blocked, 12 aliases;
  - 5,881 products deferred (5,857 from the sitemaps plus 24 found by BFS).
- **Non-product sitemap coverage:** 634/635. The missing special was no longer in the sitemap the crawler read at
  08:18.

### 1.4 The lockout (00:44:20Z = 08:44:20 local)
- **What the crawl hit:**
  - 20 x 404 (00:41:06-00:44:19Z): dead internal links ON THE LIVE SITE.
  - From 00:44:20Z, 403 for everything: 161 refusals in 75 s, with 2 successes after the first.
  - Most likely WP Defender's 404 detection (UNVERIFIED).
- **Why nothing stopped it:** fetchx's forbidden tripwire only trips while a host has had zero successes, and this
  host had 745 first.
- **Refused:** 131 tag archives, 11 offers, 7 unlisted brands, 5 calendar views, 4 terpene pagination pages and
  3 strain-filter views.
  - All 131 tag archives are linked from captured posts, so they can be derived (BUILD-CONTRACT 4.3).
- **Action:** stopped all origin requests. The skill forbids retrying past a 403; only the owner allowlisting us gets
  past a block.
  - The project ledger `audit/scan-blocked-hosts.json` is enforced through `tools/sr.sh` and `tools/crawl-live.mjs`
    (control: a listed host is refused before DNS).
  - The pre-lockout curl fetches are in `audit/prelock/`, including the ONLY product page (`t1.html`) and the kit
    CSS.
- **Blocked until the operator decides:**
  - the 5,857 products (and product sitemap 2, 1,857 URLs, never saved);
  - the live computed-style capture, so gate checks C09 (and the token checks built on it) cannot pass;
  - the 173 origin-hosted images, 173 stylesheets and 19 media files.
- **The machine's public IP** for the allowlist request: 152.32.99.153.

### 1.5 sr-extract (local, 42 s)
- 745 pages and 2,246 images. Page types: home 1, article 76, page 664, commerce 2, legal 1, form 1.
- The CMS detector's "Webflow(744)" is a false positive: `joint-hours-row-container` contains `w-container`.
  sr-decontaminate's real Webflow rule (`data-wf-*`, `website-files.com`) is different.
- 580 pages are flagged as possibly JS-rendered (script bytes about 11x body text). The content lane checks what is
  truly client-rendered.

### 1.6 sr-assets --download (through the ledger, 15m3s)
- 2,051 of 2,246 images on disk (482 MB), with 419 duplicates collapsed.
- Decisions proposed: KEEP 1,498, REMOVE 419 (duplicates), REPLACE 325, OPTIONAL 4.
- **Failures:**
  - 173 images, 173 CSS, 19 media and 2 scripts on the origin, refused by the ledger (no request sent);
  - 13 x 404 on the CDN;
  - 8 lost when the CDN throttled at 01:05:04-01:05:10Z (2 x 429 after backoff, then 6 skipped); retry after a
    cool-down;
  - 1 x 403 from a third-party brand site (levia.buzz).
- sr-tokens and sr-motion are NOT run. Without a live capture they would only overwrite `src/styles/tokens.css` with
  an empty baseline. Brand tokens come from `audit/prelock/kit.css`.

### 1.7 Image generation check
- One fal flux-pro ultra 16:9 generation plus a birefnet cut-out (`tmp/fal-test/bud-macro.jpg`, request
  01a12d86-ce0b-72d3-88ed-609f7347478b, seed 395673316, about $0.07).
- Clean: no black frame and no text. The cut-out edges hold on #015375.
- Keys: fal 404 against a bad-key 401 control; Higgsfield 404 against a bad-key 401 control.
