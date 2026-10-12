| R-24 composition | SUPERSEDED | BUILD-CONTRACT 4.19 and 4.20: quiet grounds with balanced textures on alternate bands (contours, the whale-tail scatter, grain, glow), wavy edges on the offers and reviews bands, product rails and panels plain. Checked by eye on the full home page at 1280 and 390 (tmp/tex/shots). || R-20 weight | PASS | (4.20 build, tmp/tex/weight2-*.json) Home at 1280x585@1.5: 1,176 KB before scroll and 1,553 KB after excluding the 713 KB loop. At 390x844@3: 1,139 and 1,746 KB. The largest decorative images are the hero at 216 KB and the phone hero at 241 KB (cap 250). || R-1 hero sharpness | PASS (computed) | Since 4.20 the hero is the generated Cape Cod bay shore: a 2880x1620 master (variants up to 2400) and a 1440x2560 phone master with a 1170 variant. Computed: 1280x585@1.5 is 1.26 (2400 / 1898); 1600x662@1.2 is 1.26; 390x844@3 is 1.0 (1170 / 1170); 1920x1080@1 is 1.26. The tmp/tex shots show it sharp by eye. A re-measure with qa-probe is UNVERIFIED. || R-24 composition | SUPERSEDED | BUILD-CONTRACT 4.19 grounds: white and foam alternate, the offers band is the sky tint, the reviews band is the one solid harbour band, and no band carries a photo or pattern. Checked by eye on the full home page at 1280 and 390 (tmp/calm/shots). || R-22 CLS | PASS | (calm build) Home is 0 at 1280x585@1.5 and at 390x844@3. Roboto Flex is font-display optional (the earlier 0.196 was the headline re-wrapping on the font swap). || R-20 weight | PASS | (calm build, tmp/calm/weight-*.json) Home at 1280x585@1.5: 1,160 KB before scroll and 1,537 KB after a full scroll excluding the 713 KB loop video. At 390x844@3: 1,069 and 1,732 KB. Caps are 1,400 and 3,000. || R-16 protrusions cross seams | SUPERSEDED | BUILD-CONTRACT 4.19: two cut-outs remain on home (the hero sea glass and the footer fluke), at the operator's direction to tone the design down. || R-11 backdrop variety | PASS (narrowed) | Calm revision (BUILD-CONTRACT 4.19): glass remains only on the header, the hero panes over photos, the mega menu, the dialogs and the sticky price bar. The home hero pane sits over the bridge photo. Content cards are plain surfaces with no backdrop-filter, so R-11 does not apply to them. The earlier offer-card measurements (0.44 at 1280) describe the superseded smoked band. |# THEME: the "Seashore Glass" theme as integrated (INTEGRATOR, 2026-10-12)

This is the integrator's map of the finished theme: who owns what, how to build and check it, which acceptance
requirements (DESIGN-SPEC R-1 to R-48) have evidence, and what is still open. The binding docs are unchanged and win
over this file, in this order: `docs/BUILD-CONTRACT.md`, `docs/DESIGN-SPEC.md`, `docs/PIPELINE-SITE.md`,
`docs/PIPELINE-CONTENT.md` section 11, `docs/COMPLIANCE.md`. Exported signatures, the class vocabulary and the
data-attribute contract are in `src/theme/README.md`, which this file does not repeat.

Status words: **PASS** = a command or probe ran on a build and printed a passing line (named in the evidence);
**FAIL** = it printed a failing value; **PARTIAL** = some windows or templates pass and others fail or were not run;
**UNVERIFIED** = nobody's evidence covers it, or the evidence was not available to the integrator. Evidence marked
"(lane X)" is that lane's report, not re-run by the integrator.

## 1. Module map and owners

| file | owner | what it renders or does |
|---|---|---|
| `src/theme/index.mjs` | T1a (skeleton T0) | `styles`, `scripts`, `blockTypes`, `renderPage`, `render404`; dispatch by `page.kind` |
| `src/theme/chrome.mjs` | T1a | the document: head and blocking head script, skip link, header, mega menu, search, phone sheet, Pickup bag drawer, footer, age gate |
| `src/theme/parts.mjs` | T1a | shared partials (bands, slot images with the AI tag, breadcrumbs, icons, section titles) |
| `src/theme/home.mjs` | T1b | the home `<main>` (DESIGN-SPEC 6.10 band map) |
| `src/theme/blocks.mjs` | T2a | every block renderer, sections, popups |
| `src/theme/templates.mjs` | T2a | every non-home, non-shop kind, and the 404 `<main>` |
| `src/theme/shop.mjs` | T2b | the 12 shop kinds, listings, the product body |
| `src/styles/{tokens,base,glass,depth,motion,chrome}.css` | T1a | design system and chrome |
| `src/styles/home.css` | T1b | home |
| `src/styles/{interior,blocks,forms}.css` | T2a | interior pages, blocks, forms |
| `src/styles/shop.css` | T2b | shop |
| `src/scripts/site.js` | T1a | gate, dialogs (`CCC.dialog`), sheet, bag (`CCC.bag`), search (`?s=`), rails, video loop, reveal and parallax with fail-safes |
| `src/scripts/features.js` | T2a | FAQ toggles, review "Read more", the purchase-limit calculator dialog |
| `src/scripts/shop.js` | T2b | "Reserve for pickup", "View bag", brand-page filters |
| `src/content/removals.json`, `removals.d/integrator.json` | INTEGRATOR | base declarations (removals and allowedAdded) |
| `src/content/removals.d/theme-{chrome,home,interior,shop}.json`, `imagery.json` | T1a, T1b, T2a, T2b, IMG | each lane's declared microcopy |
| `src/content/image-plan.json`, `assets/generated/**` | IMG | the 48 image slots and the generated files |
| `src/build.mjs`, `src/lib/*.mjs`, `tools/{text-parity,link-check,build-check}.mjs` | PIPELINE (P0, P1) | build, models, gates |
| `tools/product-guard.mjs` | T2b | R-44 guard |

Bundles: the stylesheets concatenate in the order tokens, base, glass, depth, motion, chrome, home, interior, blocks,
forms, shop into `dist/assets/site.<hash>.css`; the scripts site, features, shop into `dist/assets/site.<hash>.js`.

## 2. Build and check

Run everything from the workspace root. Node 18 or later, builtins only; `cwebp` and `webpmux` on PATH. No step
requests `capecodcannabis.com`; browser steps launch Chrome only through `tools/cdp.mjs` or `tools/cdp-realsb.mjs`,
which apply the host-resolver guard of BUILD-CONTRACT 4.17.13.

```sh
node src/build.mjs --report tmp/integrator/report.json          # dist/ with the default cache assets/optimized
node tools/text-parity.mjs --built dist --control --control-dir tmp/integrator/run2/parity-control --json tmp/integrator/run2/parity.json --quiet
node tools/link-check.mjs --dir dist
node tools/build-check.mjs --dir dist --report tmp/integrator/report.json     # includes check 11, the AI-label family
node tools/product-guard.mjs --dir dist --json tmp/integrator/run2/guard.json --control-dir tmp/integrator/run2/guard-control
node tools/serve.mjs --root dist --port 8951 --not-found 404.html               # then, with ONE Chrome at a time:
node tmp/integrator/agegate-test.mjs http://127.0.0.1:8951 tmp/integrator/run2/agegate-result.json
node tmp/integrator/run2/r11-offers.mjs http://127.0.0.1:8951 tmp/integrator/run2/r11-offers.json --control
node tmp/integrator/static-checks.mjs dist ; node tmp/integrator/r46-scan.mjs dist
```

Reproducibility: `sh tmp/integrator/run2/build-both.sh` hashes the inputs (`tmp/integrator/hash-inputs.mjs`), builds
`dist/`, hashes again, builds `tmp/integrator/dist2/`, hashes again, and runs
`node tools/hashdir.mjs dist tmp/integrator/dist2 --control`.

Screenshots: `sh tmp/integrator/run2/run-shots2.sh` (first screens of 11 templates at the three operator windows,
full home pages after a 14-step scroll so lazy band photos are painted, then `tmp/integrator/states.mjs` for the
mega menu, phone sheet, bag and age-gate states). Output: `tmp/integrator/shots/`.

Declarations report: `node tmp/integrator/run2/decl-report.mjs <parity.json> <out.json>` lists every removals and
allowedAdded entry with its kinds, pages and match count.

## 3. Integrator edits to files other lanes own

| file (owner) | edit | why |
|---|---|---|
| `src/build.mjs` (P1) | run 1, kept: an `og:image` whose source sits on the origin is replaced by the SOCIAL-CARD variant (absolute URL at the origin, `og:image:width`/`height`, `og:image:alt` = the slot's live alt); recorded in the report as `declared.ogImageSocialCard`; the old omission path stays as the fallback | BUILD-CONTRACT 4.16.12; the report shows `ogImageSocialCard: 9`, `ogImageOmitted: 0` |
| `src/content/removals.d/theme-chrome.json` (T1a) | run 1, kept: `theme-skip-to-content` ("Skip to content") removed | unused: the skip link renders the source's own "Skip to main content" (0 built files contain "Skip to content") |
| `src/content/removals.d/theme-interior.json` (T2a) | run 1, kept: `interior-404-copy` pages narrowed from `*` to `/404.html` | the 404 copy appears only on the 404 page |
| `src/theme/home.mjs` (T1b) | run 2: the offers band renders a second, mirrored layer of the same BAND-DEEPWATER image (`band__media--glint`) | R-11: the photo's sun glints sit only in its right half; the left-hand smoked cards measured 0.037 |
| `src/styles/home.css` (T1b) | run 2: `.band__media--glint` (mirror, `mix-blend-mode: lighten`, masked to start below the section title, hidden at 700px and below) | as above; the mask keeps the white section title off the glints (R-8) |

The integrator's own files: `src/content/removals.json` (run 1 narrowed 7 entries by kinds or pages; run 2 narrowed
`smash-balloon-admin-error` to kinds `text`) and `tmp/integrator/**`. The originals are in
`tmp/integrator/run1-backup-pre-narrowing/` and `tmp/integrator/run2/backup-pre-run2/`.

## 4. Acceptance coverage (DESIGN-SPEC section 12)

**Calm revision (2026-10-13, BUILD-CONTRACT 4.19), then balanced textures and a generated hero (4.20).** The operator asked for a milder, toned-down design. The rows for R-11, R-16, R-20, R-22 and R-24 below reflect it. Every other row stands; the calm build re-passed the gates listed in 4.19.7.

**Sources.**
- The lanes' reports, pulled from the workflow transcripts by `tmp/integrator/run3/lane-reqs.mjs` into
  `tmp/integrator/run3/lane-reqs.txt`. These are marked "(lane X)", and the integrator did not re-run them.
- The integrator's runs 1 and 2 (`tmp/integrator/`, `tmp/integrator/run2/`).
- The orchestrator's checks on the final build of 2026-10-12, under `tmp/finish/` and marked "(final)": the build, the
  gates, `style-diff`, the age gate, and weight, CLS and screenshots.

**Not run.** The operator asked to skip verification that takes a long time, so there was no independent verifier and
no full re-probe of R-1 to R-48 at every window. Anything not covered below is UNVERIFIED, not PASS.

| R | status | evidence |
|---|---|---|
| R-1 hero sharpness | PARTIAL | **Measured** at 1280x585@1.5 and 1600x662@1.2: min 1 (T1b bands probe). **Computed, not measured:** 1.0 at 390x844@3 (probe limitation on `<picture>`), 1.12 at 1440x900@1 and 1.008 at 1920x1080@1. The hero is unchanged since (final). |
| R-2 logo | PASS | T1a |
| R-3 first-screen images | PARTIAL | PASS at 1280 and 1600 (T1b). At 390 the promo creatives are 0.996 and sit below the fold; the hero is computed 1.0. |
| R-4 hero clears header | PARTIAL | At scroll 0, every window passes (T1b qa7, qa3). Scroll 40 and 120 were not tested; the announcement bar is not rendered (4.17.2). |
| R-5 H1 and CTA in first screen | PARTIAL | Inside the window at 1280x585, 1600x662, 1024x768 and 390x844 (T1b). 1366x657 was not measured. |
| R-6 phone hero | PASS | T1b |
| R-7 no horizontal overflow | PASS | Lanes, at their sample widths with the menus open. (final): home at 1280 and 390 has scrollWidth = clientWidth (`tmp/finish/shots/*.json`). |
| R-8 text contrast | PARTIAL | **PASS:** T2b's templates; the offers title (4.98) and link (8.77) at 1280 and 1600 (integrator run 2). **Open:** T1b printed p05 values below the threshold for the home hero H1 words, "Shop Menu", the award pill and the intro links (3.07–3.16). The hero values look like probe artifacts: by eye it is dark navy on a light pane, and "Cannabis" is gradient text the probe cannot read. The intro links were not re-measured. UNVERIFIED on the final build. |
| R-9 card label contrast | UNVERIFIED | Not measured (T1b) |
| R-10 colour roles | PASS | T1a. The brand-page flag in T1a's earlier probe is stale: `.bcard__brand` is `--harbour` in `shop.css` (checked in the source, final). |
| R-11 backdrop variety | PASS | Offer cards: minimum 0.440 at 1280 and 0.324 at 1600 after the glint layer (`run2/r11-offers-final.json`). Other panes per T1b qa7 (intro 0.278). Cards at 700 px and below have no backdrop-filter. |
| R-12 through-glass variety | UNVERIFIED | Not measured |
| R-13 product first screen | PASS | T2b |
| R-14 no-backdrop-filter path | UNVERIFIED | Not run |
| R-15 no glass inside glass | PASS | T1a |
| R-16 protrusions cross seams | PASS | T1b |
| R-17 protrusions overlap nothing | PARTIAL | 0 overlaps at all four windows (T1b home, T1a probe-final, T2b). The category hero at 1024x768 was not re-run after T2b's build-5 hero change. |
| R-18 decorative protrusions hidden | PASS | `tmp/integrator/static-checks.mjs` R-18s (final; control fired) |
| R-19 mega menu fit | PASS | T1a, 7 of 7 windows |
| R-20 weight | PASS | (final, `tmp/finish/weight-final-*.json`). **Before scroll:** 1,363 KB at 1280x585@1.5 and 1,120 KB at 390x844@3 (cap 1,400). **After a full scroll, excluding the loop video:** 2,752 and 2,331 KB (cap 3,000). The video is 713 KB, under its own cap (4.17.11). The largest decorative image is 209 KB, under 250 KB. |
| R-21 fonts | PASS | T1a |
| R-22 CLS | PASS | (final) Home is 0 in three runs at 1280x585@1.5 and one at 390x844@3, after Roboto Flex became `font-display: optional`. The earlier intermittent 0.196 was the headline re-wrapping on the font swap (`tmp/orch/font-shift.mjs`). Other templates are 0 per the lanes. |
| R-23 image attributes | PASS | static checks R-23a and R-23c (final; controls fired) |
| R-24 composition | PASS | T1b. (final) The orchestrator looked at the full home page at 1280 after a scroll-through. |
| R-25 mega menu content | PASS | T1a |
| R-26 accents | PASS | T1b |
| R-27 reveal fail-safes | PASS | T1a |
| R-28 reduced motion | PASS | T1a |
| R-29 print | PASS | T1a |
| R-30 keyboard menus | PASS | T1a |
| R-31 bag name and live region | PASS | T1a, T2b |
| R-32 hover/focus twins | PASS (static) | `tmp/t1a/hover-parity.mjs` over every final stylesheet: 0 missing, control fired (final). The runtime sample of 10 controls is UNVERIFIED. |
| R-33 focus ring | PARTIAL | Header, mega, search, bag, footer button, skip link and gate Yes (T1a); accordion and form input (T2a). The footer link ring was not measurable (0 ring pixels). The category and rail cards were not measured. |
| R-34 touch targets | UNVERIFIED | Not measured |
| R-35 age gate (JS) | PASS | (final) `tmp/integrator/agegate-test.mjs` 78/78 on home, a category, t1 and a Plan B product, with off-host requests only to images.dutchie.com |
| R-36 age gate (no JS) | PASS | It fails closed, as ruled in 4.17.1. The JS-off cases are in the same 78/78 (final). |
| R-37 dialogs | PASS | Sheet, bag and phone search (T1a); the filter sheet (T2b) |
| R-38 phone text size | PASS | T1b |
| R-39 no deal styling | PASS | T2b (with a control); static R-39s (final; control fired) |
| R-40 AI labelling | PASS | build-check AI label 239/239 (final); static R-40a, R-40b and R-40c (final; controls fired) |
| R-41 generated image review | PASS | IMG: every slot reviewed by eye; 13 rejected attempts in `tmp/img/rejected/` |
| R-42 text parity | PASS | (final) recall 1, missing 0, added 0, hiddenShown 0 over 25,468 sentences on 738 pages; 11 controls |
| R-43 title and H1 | PASS | static R-43a and build-check (final) |
| R-44 product guard | PASS | (final) 5,857 product pages, 0 findings, 9 controls |
| R-45 reviews | PASS | static R-45a (final; control fired) |
| R-46 platform classes | PASS | `tmp/integrator/r46-scan.mjs` (final): 6,733 HTML files and the CSS, 0 findings, control fired |
| R-47 no auto-advance | UNVERIFIED | Not probed. The integrator's run 1 looked at the one interval in `site.js`. |
| R-48 sharpness beyond the first screen | PASS | Lanes. (final) The band photos are q70 with the same variant widths, so their file-px-per-device-px figures are unchanged. |

## 5. Known gaps

- **The firewall lockout** (decision A1). Since 2026-10-12 00:44:20Z the origin refuses this machine. As a result:
  - 181 pages and about 370 assets were never harvested;
  - the 5,856 product pages are Plan B stubs, with title, brand, chips and a hand-off but no price, photo or
    description;
  - the live browser captures that the site-reforge gates C09 and C10 want are missing;
  - 537 recorded failures stay open, pending A1.
- **Skipped at the operator's request** (2026-10-12):
  - the independent verifier;
  - the full R-1 to R-48 re-probe at every operator window;
  - the responsive sweep (C23).

  The table above says which requirements rest on lane evidence only.
- **R-8, home.** T1b's p05 readings on the hero, the award pill and the intro links were not re-measured with a
  method that handles gradient text. The intro links (3.07–3.16) may really be low where whale-tail pattern pixels
  show through the frosted pane.
- **UNVERIFIED:** R-9, R-12, R-14, R-34 and R-47. **PARTIAL:** R-1, R-3, R-4, R-5, R-17 and R-33.
- **Six source images are missing** on the live site itself:
  - the four loyalty VIP banners;
  - `american-flag.avif`;
  - the levia.buzz image.

  The build reports them as `missingSources`.
- **Three forms are unwired** (contact, job application, Moodi Day review). The newsletter is the client's Alpine IQ
  embed. See `docs/DEPLOY.md`.
- **New copy needing client and counsel review** (B21): the footer AI note, the "AI illustration" tags and the
  repeated "*Must be 21+ with a VALID ID." line.
