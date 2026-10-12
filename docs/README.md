# Cape Cod Cannabis: "Seashore Glass" redesign

A static rebuild of capecodcannabis.com (WordPress, Elementor, Joint Commerce / Dutchie) with a new design:
glass panels over the client's own Cape Cod photography, images that cross section edges, scroll reveals and hover
states. It keeps the brand, the brand voice and every visible word of the source.

The site is plain HTML, CSS and JS that any static host can serve. It has no runtime dependencies, and Node is used
only for the build.

**Status, 2026-10-12: preview, not live.** Decisions are open for the operator (A1, A3, A4) and for the client
(B1–B22). See `docs/OPEN-DECISIONS.md`.

## What is where

| Path | What it holds |
|---|---|
| `src/build.mjs` | The build: page models, theme, images and checks in, `dist/` out |
| `src/lib/` | Pipeline modules: links, images (WebP variants via cwebp), the HTML sanitiser, paths, extraction |
| `src/theme/` | The Seashore Glass theme. Module map and owners: `docs/THEME.md`. Interface: `src/theme/README.md` |
| `src/styles/` | The CSS. `tokens.css` holds the design tokens (DESIGN-SPEC 3) plus a generated colour palette block (see below) |
| `src/scripts/` | `site.js` (age gate, menus, dialogs, bag, search, reveals, parallax, video loop), `features.js`, `shop.js` |
| `src/content/` | The page models (`pages/`, 737), `chrome.json` (header and footer), `catalog/` (5,857 products), `routes.json`, `image-plan.json` (every image slot), and `removals.json` plus `removals.d/` (every declared removal and added string, each with a reason) |
| `assets/` | `fonts/` (self-hosted, OFL), `brand/` (logo plate and site icons), `generated/` (AI images and the loop video, all IPTC-labelled), `derived/` (crops of client photos) |
| `tools/` | The gates and probes listed below |
| `docs/` | Contract, spec, theme map, decisions, brand system, pipeline notes, compliance |
| `audit/` | Inventories (site, content, SEO, images, links), the change-control ledger, recorded failures, gate reports |
| `facts/` | Client facts |

**Not in the public repository:**
- `assets/source/` (the client's original images, harvested from the live site; about 486 MB);
- `assets/optimized/` (the WebP variant cache);
- `audit/raw/` and `audit/prelock/` (the untouched crawl);
- `dist/` and `tmp/`.

The build needs `assets/source/`. Every image's source URL is in `audit/image-inventory.json`.

## Build

```sh
node src/build.mjs                  # writes dist/ (6,733 HTML pages plus assets); needs cwebp and webpmux on PATH
node src/build.mjs --out <dir> --cache <dir> --report <file.json>
```

Two builds from the same inputs are byte-identical. The integrator checked this on 2026-10-12: `tools/hashdir.mjs`
reported IDENTICAL across 8,885 files.

## Checks

These are the fast ones, run on the final build on 2026-10-12. Each has a planted positive control that must fire.

| Command | Proves |
|---|---|
| `node tools/text-parity.mjs --built dist --control` | Every visible source sentence is on the built page, or declared removed with a reason, and every added string is declared. Recall 1 over 25,468 sentences on 738 pages. |
| `node tools/link-check.mjs --dir dist` | No dead internal reference |
| `node tools/build-check.mjs --dir dist` | One H1 per page, no platform residue, no live link without its hand-off marker, a sitemap, JSON-LD hygiene, and the AI label on every generated file (239 of 239) |
| `node tools/product-guard.mjs` | Every product name, variant and price is verbatim from its source record (5,857 product pages) |
| `node tools/tokenize-css.mjs` | The colour token layer (site-reforge gate C13). With `--apply` it moves any new colour literal into `tokens.css` |
| `node tools/style-diff.mjs --a <before> --b <after> --pages /,...` | A stylesheet refactor changed no computed colour, element by element |
| `node tools/secret-scan.mjs --keys <file>` | No credential in what git would publish |

Serve a build locally:

```sh
node tools/serve.mjs --root dist --port 8787 --not-found 404.html
```

## Where the decisions are

- `docs/BUILD-CONTRACT.md`: every ruling. It wins over every other document.
- `docs/DESIGN-SPEC.md`: the design and its acceptance requirements, R-1 to R-48.
- `docs/THEME.md`: the theme as integrated, with the R-coverage table.
- `docs/OPEN-DECISIONS.md`: what the operator and the client still have to decide.
- `docs/COMPLIANCE.md`: the Massachusetts cannabis advertising rules (935 CMR 500.105(4)) as they apply here.
- `docs/BRAND-SYSTEM.md`: the source brand, captured before the lockout.
- `docs/CHANGE-LOG.md` and `docs/DEPLOY.md`.

## Known gaps

**The firewall lockout.** The live site has refused this machine since 2026-10-12 00:44:20Z, which leaves three gaps:
- 181 pages and about 370 assets were not harvested;
- the 5,856 product pages are "Plan B" stubs: title, brand and hand-off only, with no price, photo or description;
- the live browser captures that site-reforge gates C09 and C10 want are missing.

Lifting it is decision A1.

**Checks not run.** On 2026-10-12 the operator asked to skip verification that takes a long time, so these were not
run on the final build:
- the independent verifier;
- the full R-1 to R-48 probe suite at every operator window;
- a responsive sweep at every breakpoint (gate C23).

What was measured is in `docs/THEME.md` and `tmp/` (not published). Everything else is UNVERIFIED.

**Forms are unwired** (BUILD-CONTRACT section 3). See `docs/DEPLOY.md`.
