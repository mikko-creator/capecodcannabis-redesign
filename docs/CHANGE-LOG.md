# Change log

Every date is 2026-10-12 (local time, UTC+8). Commit hashes are in the local repository.

## Harvest and understanding

- `04b338a`: harvest tooling, the plan, the crawl run A inventory, and the lockout ledger. The site's WP Defender
  firewall locked this machine out at 00:44:20Z, after the crawl followed 20 of the site's own dead links.
- `c6eedbd`: crawler tests for patterns, defer, exclude, checkpoint and write-safety (29), plus breakers (16).
- `47e85a4`: `tools/shots-dpr.mjs`, first screens at the operator's windows at their true DPR, with a real scrollbar
  on desktop.
- `93b0738`: build notes (the harvest record and the lockout) and the first draft of the build contract.
- `5550904`: build contract, commerce decisions (4.5) and the page/ctx interface (3.3).
- `a25e081`: `tools/qa-probe.mjs`, measuring sharpness, header clearance, overflow, glass backdrop range, painted
  contrast, protrusion overlap, reduced motion and JS errors (19/19 controls).
- `136fa7b`: build contract, the stale FAQPage JSON-LD rule and the dead-link mapping (4.13).
- `e6e3701`: build notes on the Higgsfield motion check (a calm, seamless loop with no flashing).
- `2172836`: the open decisions for the operator and the client, and the JSON-LD and review hygiene rules.
- `4f3b359`: the pipeline (page models, catalog, build, checks) and the parity gate on the built output, hardened.

## Design

A design panel of three prototypes, three judges and a spec writer chose **A, "Seashore Glass"** by a 2–1 vote. The
spec is `docs/DESIGN-SPEC.md` (R-1 to R-48). The rulings on its open questions are BUILD-CONTRACT 4.17. The follow-ups
from the hardening verifier are 4.18.

## Theme and imagery

**Pipeline (P0, P1):**
- per-lane declaration files (`src/content/removals.d/`);
- the Chrome network guard on every launch;
- screen-reader-only source text marked rather than shown;
- the HTML sanitiser rebuilt as an attribute tokenizer, which held against 44 planted payloads;
- a client-side search index;
- the AI-label XMP attached to every generated WebP variant;
- decoded paths in `_index.json`.

**Theme:**
- the skeleton (T0);
- chrome and the design system, including the fail-closed age gate, the disclosure mega menu, the phone sheet and the
  Pickup bag preview (T1a);
- the home page (T1b);
- blocks and interior templates (T2a);
- shop pages plus `tools/product-guard.mjs` (T2b).

**Imagery (IMG).** 26 generated slots, all reviewed by eye and IPTC-labelled. 13 attempts were rejected and kept out
of the build. The client's photos are only cropped or resized. Spend was 39 flux-pro ultra calls and 2 cut-out
calls.

**Integration:**
- the site social card replaces `og:image`s that were hosted on the origin;
- declarations narrowed to the kinds and pages they need;
- a mirrored glint layer behind the smoked offer cards (R-11 backdrop variety: 0.44 minimum, from 0.037);
- `docs/THEME.md`.

## Finishing (orchestrator)

- **R-20 home weight** at 1280x585@1.5: 1,363 KB before scrolling and 2,752 KB after a full scroll excluding the loop
  video. The caps are 1,400 KB and 3,000 KB. The changes:
  - the age-gate images are lazy, so they are never fetched once consent is stored;
  - the footer reuses the home band's image variant instead of fetching a second size;
  - a per-file WebP quality setting (`quality` in `image-plan.json`), used at q70 for the nine decorative band photos;
  - CSS comments are stripped from the bundle.
- **R-22 layout shift.** Roboto Flex is `font-display: optional`. A late swap re-wrapped the hero headline (477 px to
  534 px tall), giving CLS 0.196. CLS is now 0.
- **Site icons.** The live site's own 32, 192 and 180 px icons are restored. Without them every page shipped no icon,
  and the browser's automatic `/favicon.ico` request got the 41 KB 404 page.
- **Footer social links** show the network icons (Feather, MIT) instead of a generic link glyph.
- **Colour token layer** (site-reforge gate C13). `tools/tokenize-css.mjs` moved 381 colour literals into 129 palette
  tokens. `tools/style-diff.mjs` showed no computed colour changed: 21,208 element rows on 11 templates at two
  widths, with a planted control firing. The comment stripping passed the same check.
- **Handoff paperwork:**
  - the change-control ledger has 6,079 rows, every one decided, with the narrative slots mapped;
  - the live site's own 20 dead pages and 13 broken CDN images are accepted as source defects;
  - this file, `README.md` and `DEPLOY.md`.

## Calm revision (2026-10-13)

After reviewing the preview, the operator found the backgrounds too noisy: they drew the eye away from the promotions
and products. The design was toned down and the branding kept (BUILD-CONTRACT 4.19).

**Grounds.** Quiet grounds replace the photo, pattern, pool and glint bands:
- white and foam alternate;
- the offers band is a soft sky tint;
- the reviews band is the one solid harbour band;
- the footer is the solid harbour gradient.

**Surfaces.** Content sits on plain white surfaces with a hairline border and a soft shadow. Glass stays on the header,
the hero panes, the mega menu and the dialogs.

**Cut-outs.** Two remain on home, the hero sea glass and the footer whale fluke; the 404 keeps its fluke. The
whale-tail watermarks on cards and the seam sweeps are gone.

**Photos.** The storefront photo is framed beside the intro and beside the map. The whale-fluke loop plays in a rounded
frame under its panel.

**Shop and interior pages.** No sea-glass or deep-water backgrounds; panels are plain; the live-menu band is the sky
tint.

**Result.** Home weight at 1280 fell to 1,160 KB before scroll and 1,537 KB after a full scroll, excluding the loop
(it was 1,363 and 2,752). CLS is 0. All gates pass. The age gate passes 78/78.

## Balanced textures and a generated hero (2026-10-13)

After the calm revision, the operator found the site too minimalist. They also asked for a striking Cape Cod hero made
with Higgsfield (BUILD-CONTRACT 4.20).

**Textures.** Subtle, fun textures came back on alternate bands, only in the gutters around the white cards:
- sea-chart contour lines;
- the brand's whale-tail scatter;
- a fine grain;
- a golden-hour glow;
- wavy edges on the offers and reviews bands.

Product rails and panels stay plain.

**The hero** is now a Higgsfield illustration (Marketing Studio Sunburst, 4K): a golden-hour Cape Cod bay with turquoise
sandbars, dunes and a humpback whale tail. There are separate desktop and phone compositions, both with the AI label and
the visible "AI illustration" tag. Four other candidates were reviewed and rejected.

**Weight.** The hero images are encoded at 216 KB (desktop) and 241 KB (phone). Home is 1,176 KB before scroll and
1,553 KB after at 1280. CLS is 0. All gates pass. The age gate passes 78/78.

## The whale-calf hero video (2026-10-13)

At the operator's request:
- **Hero background:** their aerial video of a whale and her calf, mirrored so the whales swim beside the headline
  pane.
  - Desktop file: 1,275 KB. Phones get a portrait crop: 565 KB.
  - It plays muted, inline and looping once in view. The first frame shows as the poster, and the still poster stays
    under reduced motion and data-saver.
- **Removed from the hero:** the Google rating plate (the rating stays in the reviews band) and the floating sea-glass
  gems.
- **Checks:** all gates pass; the age gate passes 78/78; CLS is 0.

**Open:**
- The video adds 1.27 MB to the first load on desktop.
- The video's license is on the client decisions list (B23).
