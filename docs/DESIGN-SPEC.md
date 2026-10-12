# DESIGN SPEC: Cape Cod Cannabis redesign, "Seashore Glass" (the design contract)

Written by the spec writer on 2026-10-12, between 12:09 and 12:41, inside a 60-minute box.
- **Reference prototype:** `tmp/panel/winner/`, a copy of `tmp/panel/a/`. The prototype files are unmodified; `GRAFTS.md` and `spec-work/` were added.
- **Grafts:** listed in `tmp/panel/winner/GRAFTS.md`.

**Precedence.**
- `docs/BUILD-CONTRACT.md` wins over this spec.
- This spec wins over the prototype. The prototype shows the look and feel. Where it differs from this spec, follow the spec (the differences are listed in section 1.2).
- `docs/BRAND-SYSTEM.md`, `docs/COMPLIANCE.md` and `docs/COMMERCE.md` stay binding where this spec is silent.
- Report every conflict you find in your structured output.

**Evidence labels used below.**
- *(A)*: designer A's measurement (`tmp/panel/a/DESIGN-NOTES.md`, `tmp/panel/a/shots/probe-report.json`).
- *(J-brand / J-ux / J-craft)*: a judge's re-measurement (`tmp/panel/judges/judge-*/`).
- *(S)*: computed by the spec writer this session (`tmp/panel/winner/spec-work/tokens.mjs`; the contrast and type-scale numbers).
- **UNVERIFIED**: marks anything that nobody measured.

---

## 1. Decision, and what changes from the prototype

### 1.1 The vote
| Judge | Winner | A / B / C totals |
|---|---|---|
| judge-brand (brand, tone, compliance) | **A** | 50 / 43 / 41 |
| judge-ux (usability, accessibility, performance) | B | 51 / 54 / 50 |
| judge-craft (glass, depth, menu, first screens) | **A** | 53 / 51 / 50 |

A wins by majority (2 of 3). Summed scores: A 154, B 148, C 141.

### 1.2 Required deltas from prototype A
These are mandatory. Each is specified in full in the section named.

1. **Menus use a disclosure pattern, not `:focus-within`** (6.2, 6.3). B and C use this pattern.
2. **The Pickup bag button is always named "Pickup bag"**, and a live region confirms each reservation (6.6).
3. **Product page.** At 1280x585, the H1, the price, the "as of" line and the whole Reserve button are above the fold (6.14). This follows C's layout.
4. **Collection and special rails are live-menu panels.** They show no product cards and no t1 (6.12; BUILD-CONTRACT 4.5).
5. **Every product rail sits on a photo or smoked band** (6.10).
6. **Phone hero.** The copy is top-aligned, with no empty sky (6.9). This follows B.
7. **Every section H2 carries one type accent** (3.2), adapted from B.
8. **The real storefront becomes a pinned postcard** across the Shop By Category to intro seam (5.3), from C.
9. **The visit band sets the address at display size** (6.20), from C.
10. **The top-row category cards become photo cards** with frosted label plates (6.11).
11. **Visible AI labelling.** Alt-text prefix, a footer note and place-image tags (9, 10), from B.
12. **The footer repeats "*Must be 21+ with a VALID ID."** (6.7), from B.
13. **The VIP band carries the CCC loyalty note** (6.17), from B.
14. **"⭐ Daily Offers ⭐" is a plain link** (6.3), from B.
15. **Age gate.** The "No" error, the document title and the storage warning are verbatim, and so is the logo alt (6.8; BUILD-CONTRACT 15.2).
16. **The announcement bar is not rendered visibly** (6.1). Its model is `hiddenAll: true`, under BUILD-CONTRACT 4.5.
17. **With JS off, page content stays readable** (6.8, R-36; BUILD-CONTRACT 4.4). The prototype fails closed. This is an open question (13.2).
18. **Fixes for A's measured defects:**
    - links on foam: `--ocean-ink` is 4.47:1 there *(S)*;
    - CLS 0.2389 on the category page *(J-ux)*;
    - an upscaled band photo: 0.688 at 1280@1.5 and 0.169 at 390@3 *(J-craft)*;
    - blog-card glass over a backdrop with a range of 0.077 *(J-craft)*;
    - weak mega-card scrims, and a lone Accessories card in the phone menu *(J-craft)*;
    - a focus ring in `--ocean`, which is only 2.72:1 on white and 2.57:1 on foam *(S)*. It becomes `--harbour` on light grounds (section 6, R-33);
    - focus moving into the hero after the gate *(J-ux)*;
    - "…" appended to verbatim excerpts *(J-brand)*;
    - initial weight of 2,100 KB *(J-ux)*.

---

## 2. Concept

**Seashore Glass.** The site feels like a bright day on the Outer Cape, seen through tumbled sea glass.

- **Photography.** Real Wellfleet photographs fill the bands edge to edge: Uncle Tim's Bridge, the shingled storefront with its whale-tail windows, and dune grass at sunset in Orleans.
- **Glass.** Frosted panes tinted aqua, sea-green and sky float over that photography and over drifting pools of ocean light.
- **The town-line sign** is the recurring shape:
  - the logo hangs off the header like a road sign;
  - the Google rating sits in a sign-shaped plate;
  - the sign's double arch is the footer seam that a whale fluke breaches.
- **Cut-outs** (a bud, sea-glass shards, dune grass, a fan leaf, terpene botanicals and the real storefront as a pinned print) cross panel and section edges. They make a third plane of depth.
- **Mood:** calm, local and adult. The tone is the live site's own: warm, "you"-addressed, lightly playful (emoji feature heads), and "Always worth the trip!".

---

## 3. Tokens

Put these in `src/styles/tokens.css` (THEME core). The names follow the prototype (`tmp/panel/winner/css/site.css` lines 12-55).

### 3.1 Colour: roles and measured contrast
WCAG 2.x ratios were computed *(S)*.

| Token | Value | Role | Allowed text use |
|---|---|---|---|
| `--ocean` | `#02A7EB` | Brand primary. Fills, glows, outlines, the outer focus **halo** (never the ring itself on light grounds), light pools, underline strokes | **Never text on a light ground** (2.72:1 on white). On it, use `--ink` (5.89) or black (7.73) |
| `--harbour` | `#015375` | Accent. Headings, **all body links on light grounds**, primary button base | 8.42 on white, 7.96 on foam, 6.52 on sky |
| `--harbour-2` | `#013F59` | Display headings, smoked glass, the footer sea | 11.31 on white |
| `--ocean-ink` | `#017BAE` | Small eyebrows, and the gradient-word start | **Only on pure white (4.72) or as large text.** On foam it is **4.47 (fails AA)**; on sky 3.66 |
| `--sky` | `#C0E9FA` | Pale sky: pools, tints, the whale-tail pattern ground, light buttons and links on dark | Text on harbour-2: 8.77. On harbour: 6.52 |
| `--foam` | `#F2FAFD` | Page ground | — |
| `--ink` | `#0C2431` | Body text | 16.00 on white, 15.14 on foam, 12.40 on sky |
| `--ink-2` | `#2C4A58` | Secondary text | 9.43 on white, 8.92 on foam |
| `--ink-3` | `#4A6370` | Fine print (13px and up) | 6.34 on white, 6.00 on foam, 4.92 on sky |
| `--signal` | `#00DB4A` | In-stock **dot only** (the kit green, used opaque) | Never text (1.87 on white) |
| `--signal-ink` | `#086A2E` | Text beside the dot ("In stock") | 6.75 on white, 6.39 on foam |
| `--grey`, `--mist` | `#636363`, `#F4F4F4` | Kit greys, reserved | 5.46 (grey on mist) |
| Logo tail | `#24A3DC` | In the logo artwork only; never restyled | — |

**Rules:**
- No new hues. B's navy-night palette and C's paper and sand palette are not used.
- Shadows and scrims are tinted harbour (`rgb(1,40,58)` / `rgb(1,63,89)`), never neutral grey.
- The gradient word runs from `--ocean-ink` to `--harbour` and appears only at 28px or larger (large text). Its lightest stop must give at least 3:1 on the painted pane (R-8).

### 3.2 Type
**Families.** All are self-hosted woff2 with Latin subsets. No runtime calls to Google Fonts (BUILD-CONTRACT 4.11-4.12).

| Role | Family | Weights and axes | File |
|---|---|---|---|
| Text, UI | Roboto (variable) | 400, 500, 600, 700, 800; italic 400 and 700 | `assets/fonts` (already there) |
| Display | **Roboto Flex** (the one added face; OFL) | wght 500-1000, wdth 100-151 | `tmp/panel/winner/fonts/roboto-flex-latin.woff2` (59,560 B). PIPELINE copies it into `assets/fonts/` with its OFL text |
| Script sign-off | Playball 400 | — | `assets/fonts` |

- **Playball** sets only the verbatim sign-offs "Always worth the trip!" and "Thank you Cape Cod!".
- **Text transform.** Headings, verbatim copy and the age gate use no text-transform (the kit has none).
  - Uppercase with letter-spacing of .12-.14em is allowed only on eyebrow labels of 13px or less that are UI labels or a product's brand name. Examples: the mega "SHOP MENU" kicker and the product brand eyebrow.
  - Never uppercase a sentence of live copy.
- **Fallback metrics.** Each face gets an `@font-face` fallback with `size-adjust`, `ascent-override` and `descent-override` set so the swap does not shift layout (R-22).
- **Preload** Roboto normal and Roboto Flex only.

**Scale.** Values come from the prototype's clamps; sizes are CSS px *(S)*.

| Step | Definition | 360 | 390 | 768 | 1024 | 1280 | 1440 | 1600+ |
|---|---|---|---|---|---|---|---|---|
| hero display (`--fs-hero`) | `clamp(2.45rem, 1.3rem + 3.1vw, 4.4rem)`, Flex 900, wdth 122%, lh .96, tracking -.012em | 39.2 | 39.2 | 44.6 | 52.5 | 60.5 | 65.4 | 70.4 |
| h2 (`--fs-h2`) | `clamp(1.8rem, 1.2rem + 2vw, 2.9rem)`, Flex 800-900, wdth 112-120%, lh 1.05 | 28.8 | 28.8 | 34.6 | 39.7 | 44.8 | 46.4 | 46.4 |
| h3 (`--fs-h3`) | `clamp(1.25rem, 1rem + .9vw, 1.6rem)`, Flex 800, wdth 110% | 20.0 | 20.0 | 22.9 | 25.2 | 25.6 | 25.6 | 25.6 |
| hero sub-lines | `clamp(1.15rem, .85rem + 1vw, 1.75rem)`, Flex 700, wdth 108% | 18.4 | 18.4 | 21.3 | 23.8 | 26.4 | 28.0 | 28.0 |
| lead | 1.125rem (`--fs-3`), Roboto 400, lh 1.6 | 18 | 18 | 18 | 18 | 18 | 18 | 18 |
| body | 1rem (`--fs-2`), Roboto 400, lh 1.6 | 16 | 16 | 16 | 16 | 16 | 16 | 16 |
| small, UI | .9375rem (`--fs-1`), Roboto 500-600 | 15 | 15 | 15 | 15 | 15 | 15 | 15 |
| fine print | .8125rem (`--fs-0`), Roboto 400-700 | 13 | 13 | 13 | 13 | 13 | 13 | 13 |

- No visible text below 12px at any width (R-38).
- **Heading levels follow the model** (`page.sections[].blocks`), not their visual size. Example: the home "Featured Bundles & Offers" is an h3 in the source and stays h3, styled with the section-title class.

**Expressive type.** This applies to key statements. Every word stays verbatim, and no tag boundary falls between a word and its punctuation.

- **Home H1.** The verbatim text is "Cape Cod Cannabis Recreational Dispensary | Wellfleet, MA". It is set in three lines:
  1. "Cape Cod" plus the gradient word "Cannabis";
  2. "Recreational Dispensary";
  3. "| Wellfleet, MA", with a drawn SVG underline under "Wellfleet,". The comma sits inside the underlined span.
  
  A Playball sign-off follows the CTAs.
- **Section accents** (graft 7). Every section H2, and every h3 styled as a section title, carries **exactly one** accent from this set:
  - **gradient word:** one word filled with the `--ocean-ink` to `--harbour` gradient via `background-clip: text`, with a solid `--harbour` fallback;
  - **drawn underline:** an SVG stroke in `--ocean`, 4px, drawn on reveal;
  - **italic word:** one word in Roboto italic 700. It is never synthesized; Roboto Flex has no italic axis in our subset.
- **Rotation.** Adjacent section titles use different accents. The accent goes on a meaningful word, usually the last noun. Examples: "Shop By *Category*", "Featured Bundles & *Offers*" (gradient), "Our *Blog*" (underline).
- **Emoji headings** ("🅿️ Easy Parking" …) take no extra accent. The emoji is the accent.

### 3.3 Spacing
- **Scale:** `--sp-1..9` = 4 / 8 / 12 / 16 / 24 / 32 / 48 / 72 / 112 px.
- **Gutter:** `--gut: clamp(16px, 3.6vw, 40px)`, which is 16px at 390 and 40px at 1112 and up.
- **Wrap:** `--wrap: 1240px` of content plus two gutters.
- **Section vertical padding:**
  - 72px at 1024 and up;
  - 48px at 768-1023;
  - 40px at 700 and below.
  - Seam overlaps (postcard, protrusions) are added to the padding on the side they intrude, so nothing overlaps text (R-17).

### 3.4 Radii
- `--r-s` 12px: chips, inputs, small tags.
- `--r-m` 20px: cards. Mega cards are 18px.
- `--r-l` 28px: panes. The hero pane is 30px.
- `--r-pill` 999px: buttons and pills. This keeps the live pill button.
- **Postcard print:** 6px. Paper corners are near-square.

### 3.5 Shadows
All are tinted harbour.
- `--sh-1: 0 1px 2px rgba(1,63,89,.10), 0 10px 24px -14px rgba(1,63,89,.34)`: chips, buttons.
- `--sh-2: 0 2px 6px rgba(1,63,89,.08), 0 26px 50px -24px rgba(1,63,89,.46)`: panes, cards.
- `--sh-3: 0 4px 10px rgba(1,40,58,.10), 0 40px 80px -30px rgba(1,40,58,.55)`: lifted, hover, smoked.
- **Cut-outs** use `filter: drop-shadow(0 18px 18px rgba(1,40,58,.28))`. A drop-shadow, never a box-shadow.

### 3.6 Z-planes
**Inside a section.** The section sets `position: relative; isolation: isolate`.

| Plane | Value | Content |
|---|---|---|
| 0 | `z-index: 0` | Backdrop photo or pattern, and the light pools |
| 1 | `z-index: 1` | Glass panes and cards |
| 2 | `z-index: 2` | Cut-out protrusions and the postcard. They sit above glass but never over text (R-17) |
| 3 | `z-index: 3` | Text-bearing overlays that must sit above cut-outs (label plates) |

**Global stack:**

| Layer | z-index |
|---|---|
| To-top button | 40 |
| Sticky header (contains the mega panel) | 50 |
| Mega panel | 60, inside the header |
| Search, mobile sheet, Pickup bag | 80 |
| Age gate | 100 |
| Skip link | 200 |

- **Protrusion stacking.** A protrusion that crosses into the next section belongs to the **upper** section's stacking context and sits at plane 2. The lower section's backdrop must not be raised above it.

---

## 4. Glass recipe

**One rule first: no glass inside glass.** An element with `backdrop-filter` must never have an ancestor with `backdrop-filter` (R-15).
- The header frost lives on `.hdr::before`, so the mega panel (a child) keeps its own `blur(26px)`.
- The age-gate veil and card are siblings.
- Chips, pills and buttons inside panes use plain fills.

### 4.1 Light pane (`.glass`, plus `--aqua` / `--green` / `--blue` tints)
- **Fill:** `radial-gradient(at var(--mx,30%) var(--my,0%), rgba(255,255,255,.55), transparent 60%)` (the pointer-following highlight) over `linear-gradient(150deg, var(--g-hi), var(--g-mid), var(--g-lo))`.
  - Neutral tint: hi `rgba(255,255,255,.80)`, mid `rgba(240,250,254,.62)`, lo `rgba(214,242,252,.52)`.
  - aqua mid/lo: `228,247,252 / 192,236,246`, at .64 / .56.
  - green: `232,250,240 / 200,242,222`, at .64 / .56.
  - blue: `232,244,253 / 196,226,250`, at .64 / .58.
- **Backdrop:** `backdrop-filter: blur(22px) saturate(175%)`, with the `-webkit-` twin.
- **Edge:** 1px `rgba(255,255,255,.78)` border.
- **Inset shadows:** `inset 0 1px 0 rgba(255,255,255,.95)` top highlight, `inset 0 0 0 1px rgba(255,255,255,.18)` rim, `inset 0 -22px 40px -30px rgba(2,167,235,.38)` inner glow. Then `--sh-2`.
- **Grain:** an inline-SVG `feTurbulence` fractal-noise tile on `::before`, opacity .16, `mix-blend-mode: soft-light`. It is the only pseudo-element the pane uses, so the header and pane frost rule (6.2) stays intact.
- **Text-safe fill rule (S).** Where body text sits, the fill composited over **pure black** must still give `--ink` at least 4.5:1. So text must not sit on the "lo" stop alone.

  | Fill over black | `--ink` contrast |
  |---|---|
  | white at alpha .54 (the minimum) | 4.5 |
  | "mid" stop | 5.68 |
  | "lo" stop | 3.80 |

  - Lay the gradient out so text sits over the hi or mid stops; the lo stop belongs to edges and the bottom glow.
  - Harbour headings need white at alpha .77 or more (mid stop) for 4.5, or .63 or more for large text.
  - Painted-pixel contrast stays the real gate (R-8).
- **Hero pane:** hi .86, mid .76, lo .70, because the bridge pilings are dark.

### 4.2 Smoked pane (`.glass--smoke`, dark bands only)
- **Fill:** `linear-gradient(150deg, rgba(1,38,55,.80), rgba(1,63,89,.72))`.
  - The prototype's .66 low stop is raised to .72 **(S)**: rgb(1,63,89) at .66 over white gives white text only 4.27. It needs .68 or more for 4.5.
- **Rim:** 1px `rgba(192,233,250,.30)`. Then `--sh-3`, with grain at opacity .10.
- **Text:** white, or `--sky` for links (8.77 on harbour-2).
- **Where it may sit:** only over dark or mid-tone backdrops (the deep water, the sunset, the storefront under a scrim). A smoked pane over a light photo reads as a grey card.

### 4.3 Label plate on photo cards (`.plate`)
- **Use:** a light pane (4.1) at the bottom of a photo card, with `blur(16px)`. Or a smoked plate when the photo's lower third is dark.
- **The card itself has no backdrop-filter.**
- **Plate height:** 40% of the card or less.
- **Text:** the label and the button.
- **Backdrop:** the card's own photo. Its luminance range is usually above 0.10 (R-11).

### 4.4 Image-card scrim (mega, phone menu, Shop All)
- **Gradient:** `linear-gradient(180deg, rgba(1,40,58,0) 30%, rgba(1,40,58,.62) 60%, rgba(1,34,50,.90) 100%)`. The prototype used .55 and .86 at these stops; raise them.
- **Labels:** white Flex 800 with a `0 1px 12px rgba(1,30,45,.6)` text-shadow.
- **Contrast:** label painted contrast at least 4.5 at the 2nd percentile (R-9). J-craft saw the "Concentrates" and "Topicals" labels go weak over light image areas. Raise the scrim, or crop the photo so its lower 40% is mid-tone.

### 4.5 Fallbacks
- **`@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`:**
  - light panes become `linear-gradient(150deg, rgba(255,255,255,.96), rgba(236,248,253,.94))`;
  - smoked panes become `rgba(1,38,55,.95)` to `rgba(1,63,89,.93)`.
  
  Text contrast must never depend on the blur (R-14).
- **`@media (prefers-reduced-transparency: reduce)`**, where supported: apply the same near-opaque fills.
- **`@media (forced-colors: active)`:**
  - panes get `background: Canvas` and a 1px `CanvasText` border;
  - scrims and grain are hidden;
  - focus outlines use `Highlight`.

### 4.6 Backdrop variety (the "something to blur" rule)
- **Light panes.** Every glass panel's backdrop, measured with the panel hidden, has a luminance range (p95 minus p5) of **0.10 or more** (R-11).
- **Through-glass (J-craft).** The visible variety through a light pane is **0.10 or more**.
  - A measured 0.19-0.37 *(J-craft)*.
  - B's smoked glass measured 0.017-0.075, which reads as opaque cards.
- **Smoked panes.** The through-glass range is **0.03 or more** (R-12).
  - Linear luminance compresses dark tones, so the floor is lower.
  - The prototype's smoked panes were not measured: **UNVERIFIED**.
- **Over a flat ground** (foam, sky): do not use glass. Either:
  - add the whale-tail pattern (white tails on `--sky`) plus two drifting light pools behind the pane; or
  - use a plain card (`--sh-2`, white) instead of glass.

---

## 5. Depth system and protrusions

### 5.1 Planes and motion
| Plane | Content | Motion |
|---|---|---|
| 0 backdrop | Full-bleed photos, the whale-tail pattern, ocean-light pools (radial gradients, `blur(30px)`) | Parallax 0.06-0.18, clamped to ±40 px. Pools drift for 26-32 s |
| 1 glass | Light and smoked panes, label plates, cards | Lift on hover and focus |
| 2 cut-outs and prints | Kit cut-outs (bud, sea glass, beach grass, fan leaf, terpene botanicals), the whale fluke, the **storefront postcard** | Slight counter-parallax of ±12 px or less; the fluke breach; the postcard tilt settles |
| 3 UI | Sticky header with the hanging sign, mega, sheets, bag, gate, to-top | Fades and slides |

### 5.2 Protrusion rules (all measurable, R-16 to R-18)
1. **Hard seams only.** A protrusion crosses a **hard** seam: a section edge with a colour or photo change, a pane or card edge, or a frame edge. It never dissolves into a soft photo edge or a gradient fade.
2. **Measure opaque pixels.** Measure on the object's **own opaque pixels** (alpha above 128), not its box.
   - At 1280, at least **20 CSS px** of opaque pixels lie on each side of the seam.
   - At 390, at least **12 CSS px**.
3. **No overlap.** Zero intersection between opaque pixels and:
   - any text box (Range client rects);
   - any interactive element's box;
   - any face in a photo;
   - any product photo (the Dutchie image or lens).
   
   This holds at 1280x585, 1600x662, 1024x768 and 390x844. When an overlap appears at a width, move or shrink the object at that breakpoint. Never let it cover the text.
4. **Decorative.** Every protrusion except the postcard P3 is `alt=""`, with `aria-hidden="true"` on the wrapper and `pointer-events: none`.
   - The postcard keeps its live alt and is **not** `aria-hidden`; only its tape and postmark are.
   - All protrusions use `pointer-events: none`. They never cause horizontal overflow. Clip them with `overflow-x: clip` on `body`, never on the section, or the crossing is lost.
5. **Labelling.** Every generated cut-out carries `data-ai` in the markup and the IPTC label in the file (R-40).
6. **Sizes.** Widths set in CSS from the table in 5.3, with `srcset` cut-out files at 1x and 2x of each painted width (R-20).
7. **Density.**
   - At most **one** protrusion per seam.
   - At most **two** protrusions in one viewport at 1280x585.
   - The home page has at least 6 (R-16).

### 5.3 Inventory
Prototype baselines are *(A)*. "New" marks a change from the prototype.

| # | Page | Object | Seam (hard edge) | Width at 1280+ / at 701-1279 / at 700 and below | Notes |
|---|---|---|---|---|---|
| P1 | home | sea-glass shards (`cut-sea-glass`) | hero pane right edge (bottom-right corner); at 700 and below, the pane's top-right corner | 230 / 190 / 100 px | A: 153x123 opaque, crossing 101/52 |
| P2 | home | whole bud (`cut-bud-whole`) | hero bottom edge into Shop By Category | `clamp(170px, 19vw, 300px)`; 130 px at 700 and below | A: 102/90. Must clear the hero CTAs and the Google badge |
| P3 (new) | home | **storefront postcard**: the real photo `assets/source/11d6f8ea-CCC-Storefront.webp` (870x580, 3:2; measured this session). This is the shingled storefront with whale-tail windows that BRAND-SYSTEM calls the brand's most distinctive photo | Shop By Category bottom edge into the intro band | Photo 440x293 / 360x240 / 280x187 CSS inside a 10px white border. Sharpness: 1.32 at 1280@1.5, 1.37 at 1600@1.2 and 1.04 at 390@3; never paint it wider than 290 CSS on phones | Tilt -4°, 6px radius, two translucent sky "tape" strips, `--sh-3`. A postmark ring holds the printed address "Wellfleet, MA 02667" (decorative SVG, `aria-hidden`; declared in `allowedAdded`). It keeps the **live alt** of that photo. It is the one protrusion that carries meaning. No caption text. On phones it sits above the intro pane |
| P4 | home | fan leaf (`cut-fan-leaf`) | top edge of category card 1 | 190 / 160 / 150 px | Must not cover the card's label plate |
| P5 | home | terpene botanicals (`cut-terpene-botanicals`) | top edge of category card 3. It moved from card 2, so the row does not repeat | 230 / 190 / 180 px | — |
| P6 | home | fan leaf | VIP pane top edge | 220 / 180 / 116 px | A: 74/130 |
| P7 | home | whale fluke (`cut-whale-fluke`, generated) | footer top seam (the sign's double arch) | `clamp(280px, 34vw, 520px)` | Breaches as the footer arrives. A: 84/32 |
| P8 (moved) | home | beach grass (`cut-beach-grass`) | the visit band's bottom edge (it was at the Shop By Category seam) | `clamp(150px, 15vw, 230px)`; 120 px at 700 and below | — |
| P9 (new) | home | whole bud, or the second sea-glass variant (slot CUT-2) | the Product Spotlight live-menu panel's bottom frame | 160 / 140 / 110 px | Clears the hand-off button |
| P10 | category | whole bud | bottom edge of the half-bleed hero photo frame | 150-250 px | A: 129/33 |
| P11 | product | sea glass | right edge of the product lens frame. At 700 and below it sits at the lens's lower right, 100 px | 230 / 190 / 100 px | It once covered the photo note on phones; keep it clear (A) |
| P12 | product | terpene botanicals | product pane top edge | 170 / 150 / 120 px | — |

- **Count.** The home page has 9 protrusions (P1 to P9), against a minimum of 6. Cut P9 if the viewport-density rule fails at 1280x585.
- **Interior templates** (town, page, post, event, brand) get at most one protrusion each, at the hero frame's bottom edge. Rotate the kit objects by template.

---

## 6. Components

The whole design keeps one state model:
- **rest;**
- **hover:** pointer devices only, inside `@media (hover: hover)`;
- **focus:** `:focus-visible`, or `:focus-within` on cards. It gives the same visual change as hover, plus the ring;
- **active / pressed:** `translateY(0)` and a smaller shadow;
- **open:** `aria-expanded="true"`;
- **disabled:** `aria-disabled`, 55% opacity, no lift.

**Global focus ring:** this is changed from the prototype.
- **On light grounds:** 3px solid `--harbour`, offset 3px (8.42:1 on white, 7.96 on foam), plus an optional outer halo `0 0 0 6px rgba(2,167,235,.35)`. The prototype's 3px `--ocean` ring measures only **2.72:1 on white and 2.57 on foam** *(S)*, which fails R-33.
- **On dark or photo grounds:** 3px white plus a 6px `--ocean` halo.
- The ring needs at least 3:1 against both neighbours (R-33).

### 6.1 Announcement bar
- **Model:** `ctx.announcement` (`src/content/chrome.json`): the text "Boards in the Stores is back for 2026 and bidding is now open! Click here to bid or learn more!" linking to `/boards-in-the-stores-2026-returns-to-cape-cod/`, with `hiddenAll: true`.
- **Default:** not rendered visibly (BUILD-CONTRACT 4.5). Keep it in the DOM only if PIPELINE's model requires it, inside an element with `hidden`.
- **If the client decides to show it** (open question 13.2), the design is:
  - full-width bar, `--harbour-2`, height 36px (`--ann-h`), white Roboto 600 at 15px, a 22px whale-tail glyph in `--ocean`, centred;
  - the whole bar is the link;
  - hover and focus: underline plus the tail nudging 3px;
  - phones: 2 lines allowed.
- **Header token:** `--ann-h` is 0 when hidden. All hero-height maths use `--ann-h`, so both states pass R-4.

### 6.2 Header
- **Bar:**
  - sticky, `top: 0`, `--hdr-h` 68px (60px at 700 and below);
  - the frost is on `.hdr::before`: `rgba(242,250,253,.78)` plus `blur(18px) saturate(160%)`, with a 1px bottom hairline `rgba(1,83,117,.12)`. Nothing in the bar has a backdrop-filter;
  - after a 24px scroll, `.is-compact` gives the bar `--sh-1`.
- **Logo:**
  - the unaltered sign, `assets/source/e4ae712e-CCC-Logo-Footer.webp` (700x568), 96px wide (66px compact, 76px on phones);
  - hangs `top: 6px` and overhangs the bar's bottom edge by about 15px, like a road sign;
  - `drop-shadow(0 8px 14px rgba(1,40,58,.30))`;
  - links home, with the **live alt** "Dispensary near me | Cape Cod Cannabis Dispensary in Wellfleet, MA";
  - hover and focus: `rotate(-2.5deg) translateY(2px)`;
  - never wider than 350 CSS px (OPEN-DECISIONS B12); file px per device px of 3.0 or more at every operator window (R-2).
- **Nav:** labels and hrefs verbatim from `ctx.nav` (SITE-ARCHITECTURE 4.1).
  - Order: Home · Shop Menu · Cannabis 101 · Ship My Apparel · Shop Your Loyalty Points · About · Directions.
  - Ship My Apparel keeps `target="_blank"` and `rel="noopener"`.
  - Links are Roboto 600, 15px, `--ink`.
  - Hover and focus: colour `--harbour`, and a 2px `--ocean` underline scales in over .35s. `aria-current="page"` keeps the underline.
- **Disclosure pattern** (graft 1). Each item with children is:
  - a **link** (the L1 label, which goes to its href);
  - a **caret button** (`aria-expanded`, `aria-controls`, accessible name "Shop Menu submenu" and so on);
  - while closed, the panel is `visibility: hidden` and so out of the tab order.
  
  **Pointer:** hover opens the panel after a 120ms intent delay and closes it 250ms after leaving.

  **Keyboard:**
  - Enter or Space on the caret toggles the panel;
  - Down Arrow on the caret opens it and focuses the first item;
  - Escape closes it and returns focus to the caret;
  - Tab past the last panel item closes the panel.
  
  **Never open on `:focus-within`** (R-30).
- **Tools:**
  - Search: a 44x44 icon button, accessible name "Search".
  - **Pickup bag:** visible text "Pickup bag" plus a count badge (`--harbour` pill, white 12px). The accessible name is always "Pickup bag" (`aria-label`); the count is in a `<span class="sr">` reading ", 0 items" (R-31). At 1240 and below the visible label may hide, but the name stays.
  - Burger at 1100 and below: 44x44, accessible name "Menu Toggle" (the live label) or a declared replacement (BUILD-CONTRACT 16.3).
- **Compact desktop, 1101-1240:**
  - link padding goes from 10px to 7px, and the font to 14.5px;
  - the bag label hides, but its name stays;
  - check at 1101, 1180 and 1240 that the bar does not wrap (R-7).
- **Skip link:** the first focusable element, "Skip to content" (new microcopy, declared). It appears top-left on focus.

### 6.3 Shop mega menu (image-rich; operator lesson 3)
- **Container:** full-width under the bar. A **light glass panel** (4.1, `blur(26px)`), radius 28px, `--sh-3`, 24px padding.
- **Grid at 1280+:** `[feature card 1fr] [3 x group cards] [side column 300px]`.
- **Fit:** the panel spans y=101-482 within 585 *(A)*. It must end at least 8px above the bottom of a 1280x585 window (R-19), and at 1101-1279 too.
- **Feature card "Shop All".**
  - Photo: the real storefront `516bebba-IMG_7184-2.webp` (1680 px).
  - Kicker "SHOP MENU" (sky, 13px uppercase), then "Shop All" in Flex 900 at 1.7rem; links to `/menu`.
  - Height spans both card rows.
- **Group cards.** Six cards, one cohesive photo each. The label is white over the scrim (4.4), and every label is its **own link**.

  | Card | Main link | Sub-links | Photo |
  |---|---|---|---|
  | 1 | Flower | Pre-Rolls | `tmp/fal-test/bud-macro.jpg` (kit) |
  | 2 | Edibles | Tinctures | generated (A) |
  | 3 | Concentrates | Vaporizers | regenerate as slot M-CONC for cohesion (10.3); the real stock banner stays until then |
  | 4 | Topicals | CBD | kit terpene botanicals |
  | 5 | Seeds | — | real `2cf6a363-cannabis-seeds.jpg` |
  | 6 | Accessories | Apparel | generated (A; retouched), or the slot M-ACC regeneration |
  
  - **Photos** are decorative (`alt=""`) with `data-ai` where generated. Each needs file px per device px of 1.0 or more at 1280@1.5 (R-48).
  - **Main label:** Flex 800, 1.2rem.
  - **Sub-links:** Roboto 600, 15px, underlined in sky.
- **Side column** (Roboto 600, 15px, `--ink`). Every label is verbatim from SITE-ARCHITECTURE 4.1:
  1. "⭐ Daily Offers ⭐" (`/specials`, title "Shop Daily Offers") as a **plain text link** (graft 14). No pill, no fill, no banner card;
  2. "Offers" (`/specials`);
  3. "Shop Gift Cards" (`/?s=gift-card`; how this maps on the static host is PIPELINE's call, open item 13.2);
  4. strip-2 pills "Effects", "Strains", "Terpenes", "Cannabinoids" (with their title attributes);
  5. the "Apparel" heading link (`/categories/merch/`) and its L3 list: "Custom 420 Baseball Jersey", "Size: Small", "Size: Medium", "Size: Large", "Size: X-Large", "Size: XX-Large", "Hats".
- **States:**
  - **open:** fade in and slide 10px over .28s; the cards rise with a 40ms stagger;
  - **card hover and focus-within:** `translateY(-4px)`, a ring (`0 0 0 2px #fff, 0 0 0 5px rgba(2,167,235,.45)`), image `scale(1.08)` over .8s, and an arrow appears beside the main label;
  - **sub-link hover and focus:** colour `--sky`;
  - **link focus:** 2px white outline, offset 3px;
  - **Escape:** closes the panel and returns focus to the caret.
- **Other dropdowns** (Cannabis 101, Ship My Apparel, About, Directions) use the same disclosure pattern:
  - a small light-glass list panel, radius 20px, Roboto 600 15px;
  - row hover and focus: `rgba(2,167,235,.12)` fill and `--harbour` text;
  - "Hours of Operation" (`#hours`) lands on the footer hours block, which carries `id="hours"`. This fixes the live dead anchor without changing a URL.

### 6.4 Mobile menu (1100px and below)
- **Sheet:** a right-side glass sheet, full height and `min(420px, 100vw)` wide, light pane with `blur(24px)`. The veil behind is `rgba(1,40,58,.45)`. It is a sibling of the sheet, never its parent.
- **Dialog behaviour:** `role="dialog"`, `aria-modal="true"`, labelled "Menu". Focus goes to Close; Tab is trapped; Escape and the veil close it; focus returns to the burger.
- **Content:**
  1. the Shop Menu image cards in a 2-column grid. "Shop All" spans both columns as a 16:7 banner, and the six group cards fill 3 rows. This fixes the lone Accessories card (J-craft);
  2. "⭐ Daily Offers ⭐", "Offers" and "Shop Gift Cards" as plain links;
  3. the strip-2 pills;
  4. the other L1 items as accordions, each a `button` with `aria-expanded` and the L2 links inside;
  5. the visible phone and address line from the footer model.
- **Card sizes:** 2 columns of about 170x120 CSS px at 390. Photos need 1.0 or more file px per device px at 3x, so 510 px or more for the painted width (R-48).
- **Motion:** slides in over .35s `var(--ease)`. Under reduced motion it simply appears.

### 6.5 Search
- **Trigger:** the header Search button opens a glass popover under the bar (desktop) or a full-width sheet (phones).
- **Field:**
  - `type="search"`, `name="s"`, with a `<label class="sr">`;
  - placeholder "Search Cape Cod Cannabis..." (verbatim, SITE-ARCHITECTURE 4.1);
  - Roboto 16px, 48px tall, radius 12px, a 1px `rgba(1,83,117,.25)` border;
  - focus: a 3px `--harbour` ring.
- **Results:** a typeahead over PIPELINE's local product and page index, starting at 2 characters (the live `minChars` "2"). Results are grouped into products (title and brand), brands and categories, and are keyboard navigable (`role="listbox"` or a list of links).
- **Empty state:** "No products match your search." (new microcopy, declared).
- **Behaviour:** Escape closes the popover and returns focus to Search. Search is a dialog on phones only; on desktop it is a disclosure.

### 6.6 Pickup bag (preview only; BUILD-CONTRACT 4.5)
- **Drawer:** right side, light glass, `min(440px, 100vw)`. `role="dialog"` and `aria-modal`, focus to Close, a focus trap, Escape to close, focus returned to the opener.
- **Content:**
  - heading "Pickup bag";
  - items: name, variant and price, each price with its "as of" date;
  - quantity stepper buttons, labelled "Increase quantity of <name>" (new, declared);
  - "Preview: orders are not sent" in a notice chip;
  - the verbatim specials disclaimer "*Website cart may not reflect the bundled price but it will be adjusted at time of payment.";
  - the pickup and payment copy, verbatim from the model;
  - "Place pre-order" (disabled, with `aria-disabled` and its reason in `aria-describedby`);
  - the empty state "Your order is empty.".
- **Reserving:**
  - "Reserve for pickup" adds the item and announces "Added to your pickup bag." in a polite live region (new, declared);
  - the button briefly shows a check, and a "View bag" button appears beside it (new, declared) to open the drawer.
  - The bag count updates **and** is announced.
- **No deal UI:** no totals with savings, no strike-throughs, no badges (R-39).

### 6.7 Footer
- **Seam.** The footer top is the sign's **double arch**: an SVG mask built from two humps meeting in a centre dip, 48px tall at 1280 and 28px on phones. The deep-water photo band sits below it (`deep-water-2400.webp`, AI, decorative), under a smoked scrim. The whale fluke (P7) breaches this seam.
- **Blocks,** in source order and verbatim (SITE-ARCHITECTURE 4.2):
  1. **Newsletter band**, a smoked pane: "Stay connected with Cape Cod Cannabis", the copy, and the "JOIN OUR NEWSLETTER" button to `/join-our-newsletter/`;
  2. **Brand column:** the footer logo (unaltered, white plate, 180px), the Playball "Always worth the trip!", and the four social links (icon plus accessible name);
  3. **Hours:** heading "Hours" and the **visible Monday-first list** from the model, with `id="hours"`. Day and time sit in two aligned columns; the source's NBSP padding becomes layout. Never render the hidden Sunday-first lists (BUILD-CONTRACT 15.3);
  4. **Contact:** the address, the `tel:` phone, "Contact Us" and "Directions";
  5. **Menu** and **Learn** link columns;
  6. **Legal row:** "Copyright © 2026 Cape Cod Cannabis Recreational Dispensary. All Rights Reserved.", the four legal links and "#MR282685". Then, on its own line, the age gate's verbatim "*Must be 21+ with a VALID ID." (graft 12; the string is in every page's source through the gate template);
  7. **AI note** (graft 11; new microcopy, declared, for client and counsel review): "Images marked AI-generated in their alt text are illustrative and never show the store, staff, customers or products.";
  8. **Service area** with the 16 town links, and **Chambers**.
- **Removed:** the agency badge, GTranslate, and the push-notifications block (BUILD-CONTRACT 4.8; `hiddenAll`).
- **Colours:** on smoked or deep-water ground, body `rgba(255,255,255,.88)` and links `--sky`. Hover and focus: white with an underline. Painted contrast must be 4.5 or more (A: 7.17-8.87).

### 6.8 Age gate (COMPLIANCE 4.1, BUILD-CONTRACT 4.4 and 15.2)
- **Structure:**
  - `role="dialog"`, `aria-modal="true"`, `aria-label` "Verify you are over 21 years of age?" (the plugin template with the age filled in; already in `allowedAdded`);
  - `aria-describedby` points at the question;
  - the **veil** and the **card** are siblings.
- **Veil:** the lighthouse photo (`13096766-CCC-Beach-Team.webp`) at 22% opacity over `--harbour-2`, `blur(8px)`. It is the gate backdrop only and is never captioned (BUILD-CONTRACT 15.10).
- **Card:**
  - light glass, `min(460px, 100vw - 32px)`, radius 28px;
  - the logo plate (`audit/prelock/logo-agegate.png`) crosses the card's top edge by 40px. This is the gate's own protrusion;
  - logo alt: **"Cape Cod Cannabis in Wellfleet, MA...Always worth the trip!"** (verbatim).
- **Copy, all verbatim:** "Welcome!" (Flex 900, no transform), "Are you over 21 years of age?", the buttons "Yes" and "No", "*Must be 21+ with a VALID ID." and the Playball "Always worth the trip!".
- **Behaviour:**
  - on open, focus goes to **Yes**, `main`, header and footer are `inert`, and **`document.title`** = "Age Verification - Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA";
  - **Yes:** store `ccc-age-21` = `1`, remove `inert`, restore the page title, and move focus to the skip link (graft 20);
  - **No:** the gate stays up and shows **"You are not old enough to view this content"** verbatim in a `role="alert"` line. Both buttons stay usable (`rechallenge`), and nothing behind the gate becomes usable;
  - **storage throws:** show **"Your browser does not support cookies, you may experience problems entering this site"** verbatim, and let Yes proceed for the session;
  - Escape does nothing; the gate has no close button;
  - it covers every URL, deep links included.
- **No-JS:**
  - **Per BUILD-CONTRACT 4.4, page content stays readable with JS off:** the gate markup is shown only under `html.js`;
  - the prototype fails closed instead (`tmp/panel/winner`, judged positively by J-brand and J-ux; COMPLIANCE R7 argues for it). This is open question 13.2;
  - build the choice as one switch in `site.js` and `glass.css`.
- **Motion:** the card settles in over .6s. Under reduced motion it appears instantly.

### 6.9 Hero
**Home, at 701px and up:**
- **Stage:** `min-height: clamp(470px, calc(100svh - var(--hdr-h) - var(--ann-h) - 40px), 860px)`, `padding: 40px 0 74px`.
- **Backdrop:** the real Uncle Tim's Bridge photo, `hero-uncle-tims-2600.webp`, cut from `assets/source/bc393109-uncle-tims-bridge.jpeg` (4032x2681).
  - `object-position: 50% 58%`, 118% tall for the parallax.
  - `fetchpriority="high"`, preloaded, decorative `alt=""`.
  - A daylight scrim on `::after` keeps the left side calm for the pane.
- **Pane:** light glass (hero tint), `width: min(660px, 100%)`, padding 26/34/24, radius 30. Inside it:
  1. the award pill: the verbatim line "2026 Cape Cod Choice Awards: Best CBD Store Winner | Top 3 Best Cannabis Dispensary" with its star glyph, a white plain fill and a link;
  2. the H1 (3.2);
  3. the CTAs "Shop Menu" (ink button) and "Shop Bundles" (glass button);
  4. the Playball sign-off.
- **Google badge:** the sign-shaped plate on the right, with "GOOGLE", "4.9", stars and "(967)" as printed.
  - It is rotated 4° and straightens on hover and focus.
  - It hides at 900px and below and moves into the phone layout below.
- **Protrusions:** P1 and P2.
- **Sharpness:** 1.37 file px per device px at 1280x585@1.5 and 1600x662@1.2 *(A, reproduced by J-craft)*; this must stay at 1.0 or more (R-1).

**Home, at 700px and below** (graft 6, B's layout):
- **Backdrop:** the portrait crop `hero-uncle-tims-portrait.webp` (1560x2680). Re-crop if needed so that the bridge and marsh, not the empty sky, fill the top 45% of the stage. No parallax.
- **Copy is top-aligned under the header:**
  1. the H1 at 39px display;
  2. the CTAs side by side at 390, each about 48% wide and 48px tall (stacked at 360);
  3. the Playball sign-off.
  
  These sit on a light glass pane that starts at most 24px below the header.
- **Below the pane:** a second glass card holds the award pill. The Google sign plate sits at its right edge, overlapping the card's top edge by 16px. It is not floating in the sky.
- **Targets:** the H1 top at most 120px below the header bottom; the primary CTA bottom at 640px or less in an 844px window (R-6).

**Interior pages** (category, town, page, post, event, brand):
- **Composition:** a half-bleed photo frame on the right (about 55% of the width, radius 28px on the inner corners), with a light glass pane overlapping it from the left by 80px or more. The pane holds the breadcrumb (only where the source shows one), the H1 and the intro.
- **H1 styling:** H1s that follow a "Shop Cannabis X for sale in Wellfleet, MA" pattern are split like the prototype's category page. The first two words are display weight, the category noun is the gradient word, and the remainder is a sub-line. The text stays verbatim.
- **Photo sources:** category art by slot (10.3), the real trichomes macro for Flower, and generic place images for town and other pages (10.3).
- **Phones:** the photo sits above the pane at full width, 4:3, and the pane overlaps it by 40px.

### 6.10 Section types and the home section map
**Band types** (each section declares one):
- **Stage:** the hero.
- **Card field:** cards over a full-bleed photo.
- **Postcard seam:** the pinned print plus a pane over the pattern.
- **Smoked band:** deep water plus smoked panes.
- **Live panel band:** one panel plus a hand-off, over a photo.
- **Logo strip:** light pools.
- **Photo band with panes:** testimonials, visit.
- **Pattern band:** whale tails on sky plus pools.
- **Rail band:** a photo plus a scrolling rail.
- **Closer:** foam.
- **Footer.**

**Variety rules:**
- Adjacent sections differ in at least two of: backdrop image, tone (light or dark), and band type.
- The home page has at most 2 flat bands (foam or pools only), and they are never adjacent.
- Every product rail sits on a photo or smoked band (R-24).
- **Phones (700px and below).** A band photo is cover-scaled only up to the height it can paint at 0.75 or more file px per device px (R-48). Below that height it fades into the band's ground (foam, the sky pattern or harbour) over 160px.
  - Glass over the faded part follows the flat-ground rule (4.6): the pattern and pools behind it, or a plain card.
  - Card fields whose cards carry their own photos (Shop By Category) use a foam-plus-pools ground on phones instead of the band photo.

**Home, in live order.** Headings are verbatim; their levels follow the model.

| # | Section (heading) | Band type | Backdrop | Tone | Notes |
|---|---|---|---|---|---|
| 1 | Hero (H1) | Stage | Uncle Tim's Bridge (real) | light | 6.9 |
| 2 | Shop By Category | Card field | sea-glass shallows, **new hi-res** (slot H-BAND-1) | light | 6.11. On phones: a foam gradient behind, because each card carries its own photo |
| 3 | intro ("Cape Cod Cannabis Recreational Dispensary is an adult-use…") | Postcard seam | whale-tail pattern (white tails on `--sky`) plus 2 light pools | light | P3 postcard on the left, light pane with the verbatim copy on the right |
| 4 | Featured Bundles & Offers | Smoked band | deep water (AI, existing) | dark | The 12 live offers as smoked text cards: plain verbatim titles and excerpts with no appended "…" (CSS line-clamp), "Order Now", "View All Offers". **Titles containing prices or "% Off" stay plain text**: never a badge, pill, price chip or larger type (R-39). Do not put the specials disclaimer under this rail: it is not in the home source (grep count 0 in `audit/raw/index.html`), so it would be ADDED copy. It lives in the bag (BUILD-CONTRACT 4.5) and on the 17 special pages |
| 5 | Product Spotlight | Live panel band | dune grass, bright noon (slot H-BAND-2) | light | 6.12a; P9 |
| 6 | Brand Spotlight | Logo strip | foam plus pools | light (flat 1 of 2) | The 8 brand logos on white plates with live alts; hover and focus lift |
| 7 | Affordable Ounces & 1/2 Ounces | Live panel band | deep water | dark | 6.12a |
| 8 | Google Reviews, "Thank you Cape Cod!" and the four feature points | Photo band with panes | Sunset Orleans (real) | dark-warm | 6.15, 6.16 |
| 9 | Earn Rewards with Our Free VIP Program! | Pattern band | whale tails on sky | light | 6.17, P6 |
| 10 | Shop Health Circle Flower | Rail band | tidal flats (slot H-BAND-3) | light | 6.12b |
| 11 | Hours (visit) | Photo band with panes | storefront wide (real `5f016e6a-IMG_1120…jpg`, 1920x1080) under a smoked scrim; band height capped at 700 CSS px at 1101 and up so it paints at 1.0 or more | dark | 6.20, P8 |
| 12 | Shop Choice Chew Gummies | Rail band | marsh creek (slot H-BAND-4) | light | 6.12b |
| 13 | Learn More About Cape Cod Cannabis | Pattern band | whale tails on sky, pools | light | 6.18 |
| 14 | Our Blog | Card field | wet sand and foam lace (slot H-BAND-5) | light | 6.19. Fixes the 0.077 backdrop |
| 15 | Closer (Shop Menu / Shop Bundles) | Closer | foam (flat 2 of 2) | light | — |
| 16 | Footer | Footer | deep water | dark | 6.7, P7 |

**Seam light sweep** (graft 18). When a band's top edge enters the viewport, a 2px-tall soft white gradient sweeps along that seam **once**: 2.4s, `cubic-bezier(.65,0,.35,1)`. It is on `::after`, decorative, and not run under reduced motion.

### 6.11 Category cards (Shop By Category)
Graft 10. The cards replace the live 460x300 tiles that have baked-in text.

**Top row** ("Affordable Ounces", "Infused Pre-Rolls", "Disposables"):
- **Photo cards:**
  - 3 columns at 1101 and up, 2 at 701-1100, and a 1-column stack at 700 and below. Cards are 4:3 at 3 columns and 16:10 on phones;
  - each card is a link wrapper (href from the model) with one visible link label and a button label;
  - **Where the labels come from.** On the live site the six tile labels ("Affordable Ounces", "Infused Pre-Rolls", "Disposables", "Wana Gummies", "Mindy's Gummies", "Kanha Gummies") and their button text exist **only as text baked into the tile images**. The evidence is the filenames, e.g. `Affordable-Ounces-Homepage-Button-460-x-330.png`, `Kanha-Gummies-Homepage-Button-460-x-330.png`.
    - Every tile carries the same generic alt, "Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA" (checked this session in `audit/raw/index.html`).
    - So the HTML labels are a **transcription of the baked text**. They must be declared in `removals.json` `allowedAdded[]` with the filename as evidence, together with the button label as baked (the prototype uses "Learn More"; verify it against the tile images).
    - The six generic alts leave with the old images and are declared in `removals[]`.
  - the photo is slot H-CAT-1/2/3 (10.3), shown with `object-fit: cover` and `alt=""`, plus `data-ai`. Because the card label names the subject, the image is decorative.
- **Label plate:** 4.3, bottom 38%. Title in Flex 900 at `clamp(1.5rem, 1.1rem + 1.1vw, 2.1rem)` (`--harbour-2` on light plates); the button is a harbour pill.
- **Card protrusions:** P4 on card 1 and P5 on card 3, crossing the card's top edge. They never touch the plate.
- **States:**
  - hover and focus-within: `translateY(-6px)`, the ring (`0 0 0 2px #fff, 0 0 0 5px rgba(2,167,235,.30)`) and `--sh-3`; the photo goes to `scale(1.06)` over .8s and the cut-out to `translateY(-8px) rotate(-4deg)`;
  - focus-within also draws a 3px `--harbour` outline at offset 4px;
  - active: no lift.

**Second row** ("Wana Gummies", "Mindy's Gummies", "Kanha Gummies"):
- **Compact light-glass cards** (150px tall) over the **continuous** section photo, so each pane blurs real variety.
- No generated gummies imagery (open question 13.2).
- **On phones** the section ground is foam plus pools (6.10), so these three become plain white cards (`--sh-2`, no backdrop-filter), or sit over the whale-tail pattern (4.6).
- A whale-tail watermark sits at the top right, `rgba(2,167,235,.22)`; on hover and focus it shifts to `.5` and rises 3px.

**Chip row** under the cards: the live chip and link row from the model, as pills. Hover and focus: sky fill and a 1px lift.

### 6.12 Product rails and cards
**(a) Live-menu panel.** For collections and specials whose membership cannot be evidenced: Product Spotlight, Affordable Ounces & 1/2 Ounces, and every other such rail.
- A single glass panel, light or smoked to match the band, about 1000px wide or less and 220-280px tall.
- **Content:** the verbatim heading; the declared hand-off button "Check price and availability" (`data-handoff="live-menu"`) to the live menu target PIPELINE defines; and the verbatim "Shop Menu" link.
- **No product cards, no placeholders, no prices, no t1** (BUILD-CONTRACT 4.5).
- **No prototype explanations on the page.** B's "this preview does not invent its products" is NOT allowed.
- A decorative protrusion (P9) may cross the panel frame.

**(b) Evidenced rails** (brand rails such as "Shop Health Circle Flower" and "Shop Choice Chew Gummies", whose members the catalog links by brand):
- **Layout:** a horizontal rail on a photo band.
  - Cards are 260px at 1280 (4.5 visible) and 78-82% of the width on phones.
  - `scroll-snap-type: x mandatory`; the rail has `overflow-x: auto` with `overscroll-behavior-x: contain`.
  - Desktop has previous and next buttons (44x44 glass circles; labels "Previous" and "Next" are declared replacements). Arrow keys scroll when the rail has focus.
  - No autoplay (R-47).
- **Plan B card** (title evidence only):
  - a light-glass card over the band photo (frosted, so it blurs the photo);
  - the brand as an eyebrow (`--ocean-ink` on white plates only, otherwise `--harbour`), linking to the brand page;
  - the verbatim sitemap title (Flex 800, 1.1rem, 3-line clamp, no added "…" in the text);
  - chips with their source label, rendered exactly as the declared pattern: "(from the product name)" or "(from the product's web address)" (BUILD-CONTRACT 16.7; `removals.json` pattern);
  - the "Check price and availability" hand-off;
  - **no photo frame and no "photo on product page" placeholder.** A soft whale-tail watermark fills the top-right corner instead.
- **Plan A card** (when product data exists):
  - Dutchie image `?auto=format&fit=fill&fill=solid&w=344&h=330`, with a `dpr=2` srcset entry and the width capped at the source size, on a white inner plate;
  - brand eyebrow, title, then **one plain price** with its variant ("1/2oz $75.00"). The "as of <date>" line sits directly under the price;
  - the in-stock dot plus "In stock" in `--signal-ink`;
  - "Reserve for pickup" (sm);
  - **no strike-through, "% off", "Sale" or "Special" badges** (R-39).
- **Card states:**
  - hover and focus-within: `translateY(-6px)` and a ring; the image (or watermark) goes to `scale(1.05) rotate(-2deg)`;
  - focus-within: a 3px outline.

### 6.13 Filter bar (listing pages that render an evidenced grid)
- **Where it appears.**
  - Plan B: brand pages, where membership comes from the catalog.
  - Plan A: every listing.
  - **Category pages under Plan B render their copy plus the live-menu hand-off and no grid, so they have no filter bar** (BUILD-CONTRACT 4.5).
- **Bar:**
  - a sticky light-glass bar under the header (`top: var(--hdr-h)`), frosted on `::before`, radius 20px, height 56px;
  - it un-sticks at 1100px and below.
- **Contents:**
  - **facet buttons** (Roboto 600, 15px), each a disclosure with a checkbox list. Only fields present in the data are offered:
    - Plan B: size and strain chips "(from the product name)", and brand;
    - Plan A: category, subcategory, brand, strain type, effect, terpene, cannabinoid, size, price range, and **"Bundles"** (never "Specials");
  - the **sort select**, with the evidenced labels "Price: Low to High", "Price: High to Low", "Brand", "THC: High to Low", "CBD: Low to High", "Relevance", "Best Selling";
  - a results count;
  - "Clear all" (new, declared).
- **Phones:** a "Filters" button (new, declared) opens a bottom-sheet dialog (focus trap, Escape) with the same controls and an "Apply" button (new, declared).
- **Active facets** appear as removable chips, each labelled "Remove <value>".
- **Empty state:** "No products match these filters." (COMPLIANCE section 3).
- **States:**
  - facet button hover and focus: sky fill;
  - open: `aria-expanded`, chevron rotated 180°;
  - checked: a harbour box with a white check;
  - selects: harbour border on hover, a 3px `--harbour` ring on focus.
- Effect labels are verbatim enum labels only. No new effect words (COMPLIANCE section 3).

### 6.14 Product page
**t1, the only full product:**
- **First screen at 1280x585** (graft 3; R-13). With the announcement bar hidden, the content area is about 516px tall.
  - **Left:** the **lens**, a circular glass frame about 300px across around a white plate. The Dutchie photo is shown at **166 CSS px** (250 px source: 1.0 file px per device px at 1.5 DPR, 1.25 at 1.2 DPR). P11 crosses the lens's right edge.
  - **Right**, a light pane:
    1. the brand eyebrow "Claravita";
    2. the H1 "Claravita Maui Waui | Popcorn" at h2 scale (`--fs-h2`), never at hero scale, so the block fits;
    3. the chips "14g" and "SDH" with "(from the product name)";
    4. the variant "1/2oz" and the price "$75.00" in Flex 900 at 2rem;
    5. directly under the price, "as of 2026-10-12" (the declared `ctx.snapshotDate`);
    6. the in-stock dot and "In stock";
    7. "Reserve for pickup" (ink, lg) and "Preview: orders are not sent".
  - The breadcrumb ("Home / Products / Claravita Maui Waui | Popcorn", as the source shows it) sits in the pane's top row, not in a separate band.
  - Measure: the Reserve button's bottom is at least 8px above the fold at 1280x585 **and** 1366x657.
- **Below the first screen:**
  - the verbatim description lines (Flavor, Dominate Terpenes, Effects, May Relieve; the last is FLAGGED and set plainly, never highlighted);
  - pickup and payment notes, verbatim;
  - the related live-menu hand-off.
- **Phones:** the lens is 150 CSS px (0.56 file px per device px; the 250 px source cannot do better; A known issue). Then the pane, then the description. The Reserve button is sticky to the bottom of the viewport once the pane scrolls past (48px bar, glass).
- **Drop:** the prototype's caption "Product photo as supplied (250 px)". It is new copy that serves no customer.

**Plan B product stubs** (5,856 pages):
- the H1 (verbatim title) and the breadcrumb;
- the brand link;
- chips with their source labels;
- the "Check price and availability" hand-off;
- **no image, price or offers.**

The pane sits over a generic sea-glass band (slot H-BAND-1, reused), so the glass has its variety.

### 6.15 Reviews (Google)
- **Band:** Sunset Orleans (real, `sunset-orleans-2400.webp`) under a warm-dark scrim.
- **Intro pane** (smoked): the "Google Reviews" heading, the verbatim paragraph, the rating "4.9" and "(967)" exactly as printed, the "Google Logo" alt, and the capture date "as of 2026-10-12" (declared).
- **Review cards:** light glass on desktop, 3 columns, 6 items from `facts/client-facts.json`. Each card has, as **separate elements** with no invented separator text:
  - the reviewer's initials in a 40px sky circle, `aria-hidden`, since the name follows;
  - the name;
  - the date;
  - the star rating, with `aria-label` verbatim, e.g. "5 Stars";
  - the verbatim text. Source typos are kept.
  
  No avatars (BUILD-CONTRACT 4.7, 16.6).
- **"Thank you Cape Cod!"** in Playball over the award image `award-winner-800.webp`, with its live alt.
- **Phones:** 1 column. Long reviews clamp at 6 lines behind a "Read more" toggle (new, declared) that expands in place.
- **No carousel autoplay.**

### 6.16 Feature points
- **Content:** the four verbatim emoji headings and their text: "🅿️ Easy Parking", "💵 Debit & Cash Accepted", "🛒 Order Online & Pickup", "ℹ️ Expert Cannabis Guidance". The payment text stays verbatim (OPEN-DECISIONS B2).
- **Tiles:** smoked glass over the reviews band, in 4 columns at 1101+, 2 at 701-1100 and 1 at 700 and below.
- **States:** hover and focus-within lift 5px and add `--sh-3`.

### 6.17 VIP band
- **Content,** verbatim from the model: "Earn Rewards with Our Free VIP Program!", the VIP paragraph (BRAND-SYSTEM quote 8; its markup splits it across elements, so render it from the model and never retype it), "Already a Loyalty VIP member?" and "Shop Your VIP Points".
- **The CCC note** (graft 13), in fine print under the copy: "NOTE: Per MA Cannabis Control Commission regulations, Loyalty Points CANNOT be used for cannabis products."
- **Styling:** a light glass pane over the whale-tail pattern band, with P6 crossing the pane's top edge.
- **No glow, no neon, no larger type for "FREE"**: the copy is FLAGGED (COMPLIANCE R10) and set at body size.

### 6.18 FAQ accordion
- **Content:** the three verbatim accordions ("WHY CAPE COD CANNABIS", "ABOUT CAPE COD CANNABIS", "CLICK TO VIEW FAQs", as the model has them) and every other accordion on interior pages.
- **Markup:** each item is a `<button aria-expanded aria-controls>` heading at the level the model gives, plus a region. Use native `<details>/<summary>` only if the heading level is kept.
- **Light glass container.** Each item is a row with a 1px `rgba(1,83,117,.14)` divider.
- **States:**
  - hover and focus: sky fill and a `--harbour` title;
  - open: a plus icon that rotates into an × over .3s, and the panel opens with `grid-template-rows: 0fr` to `1fr` over .35s (no height jump).
- **Copy:** the old widget's instructions ("Open links with Enter or Space…") are not rendered; they are declared in `removals.json` (BUILD-CONTRACT 16.3).
- **Images:** award images inside rich text render from local copies where they exist. Otherwise they become empty frames with their alt (PIPELINE).

### 6.19 Blog cards
- **Layout:** 3 cards at 1101+, 2 at 701-1100, and a 1-column stack at 700 and below. Each is light glass over the slot H-BAND-5 photo.
- **Card:** a 16:9 image (the post's real image) on top with radius 16px, then the date, the verbatim title (h3 scale) and the verbatim excerpt. Excerpts are CSS line-clamped to 3 lines with **no appended "…"**. Then the live "read more" label.
- **States:** hover and focus-within lift 6px; the image goes to `scale(1.05)`.

### 6.20 Hours and location (visit band)
- **Band:** the real wide storefront photo (`5f016e6a-IMG_1120…jpg`, 1920x1080) under a harbour scrim (`rgba(1,40,58,.55)` to `.75`).
  - The band is capped at 700 CSS px tall at 1101px and up, so the photo paints at 1.0 or more (R-48).
  - On phones, the fade rule from 6.10 applies.
  - The 870 px storefront photo is used for the postcard (P3), never full-bleed.
- **Smoked pane:**
  - the heading "Hours" and the **display address** "1446 US-6 Wellfleet, MA 02667" (graft 9). It is Flex 900 at `clamp(2rem, 1.2rem + 3vw, 3.6rem)` in white, set in **sentence case as printed**, split after "US-6";
  - the Monday-first hours list;
  - the phone `tel:` link, "Directions" and "Contact Us";
  - a click-to-load map: a "Load Google map" button (new, declared). The map is never requested until it is pressed.
- **Phones:** the address at 32px, then the hours, then the actions.
- **P8** crosses the band's bottom edge.

### 6.21 Forms (BUILD-CONTRACT 4.6: unwired)
- **Fields:**
  - labels always visible above the field (Roboto 600, 15px);
  - inputs 48px tall, radius 12px, white fill, a 1px `rgba(1,83,117,.25)` border, 16px text;
  - hover: a `--harbour` border;
  - focus: a 3px `--harbour` ring;
  - invalid: a 2px border in `#B3261E`, plus an inline message with an icon. The live validation copy is verbatim where it exists;
  - disabled: the `--mist` fill.
- **The form:** `method="post"`, starts disabled, carries `data-sr-unwired="1"`, and JS stops submission.
- Required marks use the live markers.

### 6.22 Base controls
- **Buttons** are pills, min height 48px (40px sm, 54px lg).
  - **Ink** (primary): `linear-gradient(180deg, #0a6b93, var(--harbour))`, white text (white on `--harbour` is 8.42:1).
  - **Glass:** white at .58 with `blur(10px)`. Use it only where the button is not inside another backdrop-filter; inside panes, use the **white** variant (white at .86, no blur).
  - **Ghost:** a harbour outline.
  - **Sky:** sky with `--harbour-2` text, on dark grounds.
  - States: hover and focus lift 2px with a deeper shadow; the ink button adds a 4px `--ocean` halo; the arrow nudges 4px; active returns to rest; disabled per section 6.
- **Links:**
  - `--harbour` on light grounds, underlined with an offset of 3px;
  - hover: a thicker underline in `--ocean`;
  - on dark grounds: `--sky`, with white on hover.
- **Chips and pills:** white at .75, a `rgba(1,83,117,.18)` border, `--harbour` text. Hover and focus: sky fill, lifted 1px.
- **Breadcrumbs:** only where the source shows them (BUILD-CONTRACT 16.5). Roboto 15px, `--harbour` links, with "/" separators drawn in CSS.
- **To-top button:** 44x44 glass. It appears after one viewport of scroll and links to `#topBar`.
- **Skip link:** see 6.2.

### 6.23 Brand Spotlight
- **Logos:** the 8 brand logos (1080 px PNGs in WebP) on white rounded plates, 120px at 1280 and 88px on phones, with their live alts.
- **Layout:** a row on desktop that wraps at 1100px and below.
- **States:** hover and focus lift 4px.
- **Links:** the brand page links as in the model.

### 6.24 Other templates (brief)
- **Page, post and event:** an interior hero (6.9), then a prose column of 70ch or less on a light pane over the pattern band, then related cards (blog-card style).
  - Event pages keep their JSON-LD (BUILD-CONTRACT 15.1).
  - The about-page popup is a dialog (15.9).
- **Town and geo pages:** an interior hero with a place image (10.3, labelled AI), then the verbatim local copy, category tiles as compact glass cards, and the effects links as pills.
- **Glossary** (terpene, cannabinoid): a light pane with an alphabetical list. On phones, `menu-anchor` jump links become a sticky glass chip bar.
- **Legal pages:** prose only. No protrusion. Typos are kept verbatim.
- **404:** the deep-water band, a smoked pane, "Shop Menu" and "Home" (verbatim labels), and the whale fluke cut-out across the pane edge.

---

## 7. Motion system

| What | Trigger | Duration and easing | Fail-safe |
|---|---|---|---|
| Reveal (rise and settle) | IntersectionObserver, threshold .08, rootMargin bottom -6%, adds `.is-in` | opacity .8s `cubic-bezier(.2,.8,.2,1)`; `translate` 34px to 0 over 1s `cubic-bezier(.18,1.25,.4,1)`; stagger `--d` × 90ms | See the rules below |
| Underline draw ("Wellfleet," and the H2 underlines) | Load (hero) or reveal | 1.1s, .5s delay | Drawn statically under reduced motion and when JS is absent |
| Whale fluke breach (P7) | Footer reveal | 60px rise, 1.3s settle | 6s keyframe fail-safe |
| Postcard settle (P3) | Reveal | rotate from -9° to -4° and translate 24px to 0 over .9s, `cubic-bezier(.3,1.45,.55,1)` | The reveal fail-safe; under reduced motion it rests at -4° |
| Light pools | Always | drift 26-32s, `ease-in-out` alternate | Off under reduced motion |
| Parallax | rAF on scroll | offset = (element centre − viewport centre) × speed (.06-.18), clamped to ±40px; written to the `translate` property | Off under reduced motion; off for the hero at 700px and below; never scroll-timeline |
| Seam light sweep | A band's top edge enters | 2.4s once, `cubic-bezier(.65,0,.35,1)` | Decorative only |
| Mega open | Hover intent or caret | .28s fade plus a 10px slide; cards stagger 40ms | — |
| Drawers and sheets | Open | .35s `var(--ease)` | Shown instantly under reduced motion |
| Hover and focus lifts | Pointer or focus | transform .45s `var(--ease)`; images `scale` .8s | Same under keyboard focus |
| Age-gate card | Open | settles over .6s | Shown instantly under reduced motion |

**Rules:**
1. **Content hides only under `html.js-reveal`.** The head script sets that class only when IntersectionObserver exists **and** `prefers-reduced-motion` is not `reduce`.
2. **A `reveal-failsafe` keyframe** forces every `.reveal` visible after 5s, even if the observer never fires.
3. **Reveals animate the `translate` property, never `transform`,** so hover transforms compose with them and are never overridden. **A reveal rule never sets `transform: none`.**
4. **No scroll-timeline or view-timeline animation** that can leave content half-visible.
5. **On every scroll, any `.reveal` above the viewport bottom that is not `.is-in` gets `.is-in`.** A jump scroll must not leave a gap. This is C's per-scroll reveal.
6. **`@media print` and `beforeprint`** show everything and hide the veils and drawers (R-29).
7. **`prefers-reduced-motion: reduce`:**
   - every animation and transition is off (`animation: none; transition: none`), except `opacity` fades of .15s or less on dialogs;
   - reveals and the fluke are forced visible;
   - underlines are drawn statically;
   - parallax is reset to 0;
   - pools are static;
   - any video loop is paused and shows its poster.
8. **No autoplay** of carousels or video with sound. Decorative loops (if any) are muted and `playsinline`, and pause when off-screen.

---

## 8. Responsive rules

| Width | Header and nav | Hero | Grids and sections | Protrusions |
|---|---|---|---|---|
| 360-420 | 60px bar; logo 76px; Search, Bag (count) and burger at 44x44 | Phone layout (6.9); CTAs stack at 360 | Everything 1 column; rails at 78-82% card width; product grid 1 column below 420 | Phone sizes (5.3); re-check overlap at 360 and 390 |
| 421-700 | Same | Phone layout; CTAs side by side | Category top row 1 column at 16:10; blog 1 column | Phone sizes |
| 701-900 | Burger sheet | Desktop composition; the hero stacks (pane full width, badge hidden); the short-height rule applies when the height is 700 or less | 2 columns; reviews 1 column; visit and product stack | Mid sizes |
| 901-1100 | Burger sheet; mega cards in the sheet | Pane and badge side by side | 2-3 columns; the filter bar unsticks | Mid sizes |
| 1101-1240 | Full nav, compact (6.2); the bag label hides but its name stays | Full | 3 columns | Mid and full sizes |
| 1241-1440 | Full nav; the bag shows its label | Full; the 1280x585 and 1366x657 operator windows | 3-4 columns; wrap 1240 | Full sizes |
| 1441-1600+ | Full nav | Full; the stage max is 860px; 1600x662@1.2 | Content capped at 1240 plus gutters; bands stay full-bleed | Full sizes |
| 1920+ | Full nav | Hero image 2600 px or more (1.36 at 1905 CSS) | Same | Same |

**Short-height rule** (`min-width: 701px and max-height: 700px`): the hero padding goes to 24/48, the pane padding tightens, and the sign-off sits beside the CTAs. Measured windows: 1280x585, 1366x657 and 1600x662.

---

## 9. Accessibility requirements
- **Contrast:** WCAG 2.2 AA, measured on painted pixels: 4.5 for text, 3.0 for large text, UI component boundaries and the focus ring.
- **Structure:**
  - one H1 per page, with heading levels from the model;
  - landmarks: `header`, `nav[aria-label="Main"]`, `main#content`, `footer`;
  - the skip link is first.
- **Keyboard:**
  - every control is reachable in DOM order;
  - disclosure menus (6.2);
  - dialogs trap focus and restore it;
  - nothing is reachable only by hover;
  - rails scroll with the arrow keys and have buttons.
- **Hover parity:** every `:hover` style has a `:focus-visible` or `:focus-within` twin (R-32).
- **Names:**
  - every icon button has an accessible name;
  - image alt text is verbatim from the source;
  - meaningful generated images start their alt with "AI-generated illustration:";
  - decorative images use `alt=""`.
- **Targets:** at least 44x44 for header tools, primary CTAs and dialog controls; at least 24x24 for everything else, or the WCAG 2.5.8 spacing exception.
- **Live regions:** bag updates (polite); the age-gate "No" error (`role="alert"`).
- **Motion:** reduced motion is honoured (section 7). Nothing flashes more than 3 times a second.
- **Language:** `<html lang="en">`. Emoji in headings are kept (live copy), and screen readers will read them.
- **Zoom:** at 200% zoom (640 CSS px at 1280), no content is lost and there is no horizontal scroll. At 400% (320 CSS px), the page reflows to the 360 layout.

---

## 10. Image direction and the generated-image plan

### 10.1 Art direction (all new imagery)
- **Light and palette.** Bright Outer Cape daylight, airy and clean, in the brand's own colours: pale aqua and sky (#C0E9FA), sea-green, ocean blue (#02A7EB), harbour depth (#015375), white sand, weathered driftwood and linen.
- **Look.** Natural editorial photography with real light (caustics, soft shadows) and a shallow depth of field. Subjects are still lifes or places. Never moody night, neon or club-flyer.
- **Never** (COMPLIANCE section 2):
  - people, hands or faces;
  - consumption, smoke, flame or a lighter;
  - text, letters, labels, logos or brand marks;
  - the real store, staff, customers or a named landmark (no lighthouse, no Route 6 sign, no named town);
  - candy looks, cartoons or medical symbols;
  - edibles shaped like people, animals, fruit or sports gear;
  - illuminated signs or branded vehicles.
- **Every generated image:**
  - reviewed by eye, with the verdict recorded in its sidecar;
  - IPTC `trainedAlgorithmicMedia` XMP embedded (`tools/ai-label.xmp`);
  - `data-ai` in the markup;
  - labelled in the alt or caption per graft 11.
- **Place images** (dunes, marsh, water) shown 480 CSS px wide or more carry a visible corner tag "AI illustration" (new, declared): 12px, white on `rgba(1,40,58,.78)` (7.68:1 even over pure white; .6 would give only 4.27 *(S)*), `aria-hidden` because the alt says it.

### 10.2 Real images: keep (unaltered, converted to WebP)
| Use | Source |
|---|---|
| Hero (desktop, phone) | `assets/source/bc393109-uncle-tims-bridge.jpeg`: the 2600 px cut and the 1560x2680 portrait crop |
| Postcard (P3) | `assets/source/11d6f8ea-CCC-Storefront.webp` (870x580) |
| Visit band (full-bleed) | `assets/source/5f016e6a-IMG_1120-scaled-…jpg` (1920x1080). 1.01 file px per device px at 1265 CSS wide @1.5, so keep the band 711 CSS px tall or less; 700 is the cap |
| Mega Shop All | `assets/source/516bebba-IMG_7184-2.webp` |
| Reviews band, blog | `assets/source/38e62043-Sunset-Orleans.jpg` |
| Flower hero, blog | trichomes macro `tmp/understand/imagery/masters/14-trichomes_lossy0.jpeg` |
| "Thank you Cape Cod!" | `assets/source/da79ce17-CC26_CapeCod_Winner.jpg` |
| Age-gate veil only | lighthouse `13096766-CCC-Beach-Team.webp` |
| Mega Seeds | `2cf6a363-cannabis-seeds.jpg` |
| Brand logos, whale-tail pattern, the logo | — |

**Kit, already generated and reviewed:** the bud, sea-glass, terpene-botanicals, beach-grass and fan-leaf cut-outs; the whale tail; `bud-macro`; and A's generations (`deep-water`, `seaglass-shallows`, `whale-fluke`, `menu-edibles-tinctures`, `menu-accessories-apparel`). Their sidecars are in `tmp/panel/winner/img/*.json` and `tmp/panel/kit/`.

### 10.3 New slots
- **Model:** `fal-ai/flux-pro/v1.1-ultra`, `output_format: jpeg`, cut-outs with `--cutout` (birefnet v2). Through IMAGERY's `tools/fal-gen.mjs` into `assets/generated/`, recorded in `audit/generated-images.json` and `src/content/image-plan.json`.
- **Required file px** is the painted size at 1600x662@1.2 or 1280x585@1.5, whichever is larger, times 1.0. A full-bleed 1265 CSS px band needs at least 1898 file px wide.
- **Every prompt ends with:** "Natural daylight photograph, editorial still life, shallow depth of field, no people, no hands, no text, no letters, no logos, no labels, no smoke."

| Slot | Use (spec section) | Aspect, output | Painted size (CSS px), 1280 / 1600 / 390 | Prompt (the shared suffix is added) | Cut-out |
|---|---|---|---|---|---|
| H-BAND-1 | Shop By Category band; product-page band (6.11, 6.14) | **4:3, 2368x1792** (the band is about 1265x1000 CSS at 1280, so 21:9 would be too short: it needs 1494 or more device px tall at 1.5) | 1265x~1000 / 1585x~1000 / top of band only (6.10 phone rule) | "Tumbled sea glass pieces in aqua, pale green, cobalt and frosted white resting in clear shallow seawater over pale sand, sunlight caustic patterns rippling across them, bright airy summer noon, Outer Cape palette of pale sky blue and sea green" | no |
| H-BAND-2 | Product Spotlight band (6.12a) | 21:9, about 3136x1344 | 1265x~360 / 1585x~360 / phone rule | "Coastal dune grass backlit at bright midday, soft green and straw tones, out-of-focus pale blue sky and sea beyond, gentle wind, airy and calm" | no |
| H-BAND-3 | Health Circle rail band | 21:9 | 1265x~520 / 1585x~520 / phone rule | "Rippled tidal flat at low tide, silver shallow water channels reflecting a pale blue sky, wet sand patterns, bright morning light, wide and calm" | no |
| H-BAND-4 | Choice Chews rail band | 21:9 | 1265x~520 / 1585x~520 / phone rule | "Salt marsh creek winding through green spartina grass toward calm blue bay water, bright clear day, soft haze, wide and calm" | no |
| H-BAND-5 | Blog band (6.19) | 21:9 | 1265x~700 / 1585x~700 / phone rule (band heights over 896 CSS px at 1.5 DPR need the 4:3 output instead) | "Top-down view of wet beach sand with a thin lace of white sea foam and a few small smooth pebbles, bright daylight, pale aqua and sand tones" | no |
| H-CAT-1 | "Affordable Ounces" card | 4:3, 2368x1792 | 390x293 / 470x352 / 358x224 | "A clear wide-mouth glass jar holding cured cannabis flower buds, lid resting beside it, on a weathered driftwood plank with a few pieces of aqua sea glass, pale linen backdrop, bright window light" | no |
| H-CAT-2 | "Infused Pre-Rolls" card | 4:3 | same | "Three unlit pre-rolled cones lying side by side in a shallow white ceramic dish on pale linen, a sprig of dried herbs beside them, soft sea-blue shadows, bright daylight, unlit, no smoke" | no |
| H-CAT-3 | "Disposables" card | 4:3 | same | "A plain matte white slim vaporizer device with no markings standing upright among smooth beach pebbles and pale sea glass, bright clean daylight, minimal still life" | no |
| CAT-PREROLLS … CAT-APPAREL (9 slots) | Category page heroes: Pre-Rolls, Edibles, Vaporizers, Tinctures, Concentrates, Topicals, CBD, Accessories, Apparel (6.9). **Seeds uses the real `2cf6a363-cannabis-seeds.jpg`** (2300x1494, measured this session), so it needs no slot | 4:3 | ~700x500 / ~870x560 / 390x293 | Same direction, one subject each: unlit pre-rolls in a tray; plain dark chocolate squares and two unlabelled amber dropper bottles (muted, no sugar coating, no shapes); a plain cartridge on sea glass; amber dropper bottles on linen; amber resin in a small glass dish; a plain white jar of balm with lavender and lemon; hemp leaves with a plain dropper bottle; a plain glass jar, a wooden grinder and a tray; a folded plain hoodie and a cap with no logos | no |
| PLACE-1 … PLACE-6 | Town, geo, post and event fallback heroes (6.24); never captioned as a named town | 16:9, about 2752x1536 | ~700x500 / ~870x560 / 390x293 | 1 dunes with a weathered snow fence at midday; 2 marsh creek at golden hour; 3 bay tidal flats at low tide; 4 open ocean horizon with gentle swell, no whale; 5 freshwater kettle pond ringed by pitch pines; 6 a sandy path through beach grass to the sea | no |
| M-CONC | Mega "Concentrates · Vaporizers" card (6.3) | 4:3 | 330x230 at 1.5 needs 495+ | "Amber concentrate in a small clear glass dish beside a plain unmarked vaporizer cartridge on pale sea glass, bright airy light, lower third mid-tone for a label" | no |
| M-ACC | Mega "Accessories · Apparel" (optional regenerate) | 4:3 | same | "A folded plain blue hoodie, a plain cap, a wooden grinder and a small glass jar on pale linen, no logos, no tags, no labels" | no |
| CUT-2 | Second sea-glass cut-out (P9 option), so the shard cluster is not repeated | 4:3 | 160-230 px wide | "Three pieces of tumbled sea glass, cobalt blue, pale green and frosted white, isolated on plain white background, soft shadow" | yes |

**Budget** (about $9 available):
- **Slot count:** 26. That is 5 bands, 3 cards, 9 category heroes, 6 place images, 2 mega cards and 1 cut-out.
- **Pricing basis:** the kit README records 9 ultra generations plus 8 cut-outs at about $0.60 (fal list prices, **UNVERIFIED against the invoice**), so assume about $0.06 per ultra call.
- **Plan:** 26 slots, up to 3 attempts each, makes at most 78 ultra calls (about $4.70) plus at most 3 cut-out calls.
- **Hard stop:** 140 ultra calls, which is about $8.40.
- **Not used:** no Higgsfield loops are planned. The kit's whale-fluke loop is optional, and if used it is shown muted with its poster under reduced motion.
- **Order:** generate in this order, so the operator-visible slots land first: H-BAND-1 and H-CAT-1/2/3, then M-CONC, then H-BAND-2 to 5, then the category heroes, then the PLACE images.

---

## 11. Copy and microcopy
- **Verbatim everywhere** (BUILD-CONTRACT 4.2):
  - text comes from the models, never retyped;
  - no tag boundary between a word and its punctuation;
  - no appended "…" (CSS clamps instead);
  - flagged copy (COMPLIANCE sections 5-7: "May Relieve", "% Off" titles, loyalty, superlatives) is kept and set plainly, never enlarged, badged or highlighted;
  - `<title>`, meta and H1 come from `page`, so the prototype's category title drift is fixed by construction.
- **New UI microcopy introduced by this spec.** Each must be declared in `src/content/removals.json` `allowedAdded[]` with a reason. The orchestrator reviews them:
  - "Skip to content"
  - "Pickup bag"
  - "Search"
  - "Menu Toggle" replacement (if any)
  - "<label> submenu" caret names
  - "Previous" / "Next" (rails)
  - "Reserve for pickup"
  - "View bag"
  - "Added to your pickup bag."
  - "Preview: orders are not sent"
  - "Your order is empty."
  - "Place pre-order"
  - "Increase quantity of <name>" / "Decrease quantity of <name>"
  - "Check price and availability" (already declared)
  - "as of <date>" (already declared)
  - "(from the product name)" / "(from the product's web address)" (already declared as a pattern)
  - the six home tile labels and their button label, transcribed from the baked tile images (6.11)
  - the sort labels and facet names. They come from the Joint configs (COMMERCE section 6) and are not visible copy on the live pages
  - "No products match your search."
  - "No products match these filters."
  - "Filters"
  - "Apply"
  - "Clear all"
  - "Remove <value>"
  - "Read more" (review toggle)
  - "Load Google map"
  - "AI illustration"
  - "AI-generated illustration: <description>" (alt prefix)
  - the footer AI note
  - the postmark "Wellfleet, MA 02667"
- **Not allowed:** prototype explanations on the page; invented age-gate messages; "Product photo as supplied"; "Open daily"; any deal or urgency wording (COMPLIANCE section 3).

---

## 12. Acceptance requirements

**The operator windows:**
- 1280x585 at DPR 1.5;
- 1600x662 at DPR 1.2;
- 390x844 at DPR 3.

The two desktop windows run in Windows Chrome with a real 15px scrollbar. "All templates" means home, category, product (t1), a Plan B product stub, a brand page, a town page, a post and a legal page. Measure with consent pre-set (`--init "localStorage.setItem('ccc-age-21','1')"`) unless a requirement is about the gate. The methods are in section 14.

The IDs are stable and appear in numeric order. The tag in brackets gives each one's theme. Each "fails today" note names a known gap in the prototype that the build must close.

- **R-1.** [first screen] The home hero image paints at **1.0 or more file px per device px** at all of these, with the parallax over-height included:
  - 1280x585@1.5 (A: 1.37);
  - 1600x662@1.2 (A: 1.367);
  - 390x844@3 (A: 1.234);
  - 1440x900@1;
  - 1920x1080@1.
- **R-2.** [brand] The logo:
  - is the unaltered master: the aspect error of its painted box is 0.5% or less (unrotated), and it has no CSS filter other than `drop-shadow`;
  - is 350 CSS px wide or less;
  - paints at 3.0 or more file px per device px in the header at every operator window (A: 4.86-7.29 desktop, 3.24 phone).
- **R-3.** [first screen] Every other image painted inside the first screen at the three operator windows reaches 1.0 or more, except the 250 px Dutchie photo on phones (a documented limit).
- **R-4.** [first screen] **Hero copy clears the sticky header.**
  - **Windows:** 1024x768, 1366x657, 1280x585, 1600x662 and 390x844.
  - **Scroll positions:** 0, 40 and 120.
  - **Bar states:** announcement bar hidden and shown.
  - **Condition:** the H1 box and the CTA boxes do not intersect the header box or the hanging logo box (A at scroll 0, bar shown: H1 top 314 vs header 105 at 1024x768; 257 vs 105 at 1366x657).
- **R-5.** [first screen] At scroll 0, the H1 and the primary CTA are fully inside the first screen at 1024x768, 1366x657, 1280x585, 1600x662 and 390x844.
- **R-6.** [first screen] **Phone hero, at 390x844@3:**
  - the H1 top is at most header bottom + 120 CSS px;
  - the primary CTA bottom is at 640 CSS px or less;
  - no horizontal band taller than 120 CSS px between the header and the H1 holds no text, control or badge.
  
  (A: H1 at 460 under about 190 px of sky; fails today.)
- **R-7.** [layout] `scrollWidth` is at most `clientWidth`:
  - on all templates;
  - at 320 (WCAG 1.4.10 reflow), 360, 375, 390, 414, 768, 820, 1024, 1101, 1180, 1240, 1280, 1366, 1440, 1600 and 1920;
  - with the mega menu, the mobile sheet and the bag open as well as closed.
- **R-8.** [contrast] **Text contrast on painted pixels**, at the 2nd percentile of glyph pixels against the pixels under them:
  - body text 4.5 or more; large text (24 px and up, or 18.66 px bold and up) 3.0 or more;
  - for every text element over glass or a photo;
  - on all templates at 1280x585@1.5 and 390x844@3, and on the first screens at 1600x662@1.2.
  
  (A: 35 samples, minimum 4.52 large and 4.58 body.)
- **R-9.** [contrast] Labels on image cards (mega, phone menu, category cards, Shop All) reach 4.5 or more at the 2nd percentile, with the card at rest and on hover (zoomed).
- **R-10.** [tokens] A computed-style scan of all templates finds:
  - no text colour `#02A7EB`;
  - `#017BAE` text only on a white ground or at large size;
  - body links on foam or sky in `--harbour`.
- **R-11.** [glass] **Backdrop variety.** For every element with a backdrop-filter, the luminance range (p95 − p5) behind it, measured with the panel hidden, is **0.10 or more**:
  - at 1280x585, 1600x662 (first screen) and 390x844;
  - the header is exempt at scroll 0 only.
  
  (A: 18 panels, minimum 0.126; J-craft found the second blog card at 0.077, which fails today.)
- **R-12.** [glass] **Through-glass variety**, measured with the panel shown and its contents hidden:
  - 0.10 or more for light panes (A: 0.19-0.37 per J-craft);
  - 0.03 or more for smoked panes (UNVERIFIED for A).
- **R-13.** [product] **Product page t1.** At 1280x585@1.5 and at 1366x657:
  - the H1, the price, the "as of" line and the whole "Reserve for pickup" button are inside the first screen;
  - the button's bottom edge is at least 8 CSS px above the fold;
  - the Dutchie photo paints at 1.0 or more file px per device px at 1280x585@1.5 and 1600x662@1.2 (166 CSS px for the 250 px source).
  
  (A: the Reserve button is cut by the fold, so this fails today; C passed per J-ux.)
- **R-14.** [glass] With `backdrop-filter` disabled (forced through the `@supports not` path), every R-8 sample still passes.
- **R-15.** [glass] A DOM scan finds 0 elements with a computed `backdrop-filter` whose ancestor also has one.
- **R-16.** [depth] The home page at 1280 has **6 or more** protrusions that cross hard seams. Each has **20 or more CSS px** of opaque pixels (alpha above 128) on both sides of its seam at 1280, and 12 or more at 390.
- **R-17.** [depth] **Protrusions overlap nothing.** On all templates at 1280x585@1.5, 1600x662@1.2, 1024x768 and 390x844@3, there are 0 CSS px² of intersection between protrusion opaque pixels and any of:
  - text rects;
  - interactive boxes;
  - product photos;
  - faces.
- **R-18.** [depth] Decorative protrusions are `aria-hidden`. The postcard P3 is exposed, with its live alt, and only its tape and postmark are hidden. Every protrusion has `pointer-events: none` and never raises `scrollWidth` (R-7).
- **R-19.** [menu] At 1280x585 and at 1101-1279 the open mega panel's bottom is at least 8 CSS px above the window bottom (A: 482 of 585).
- **R-20.** [performance] **Weight** (transfer bytes with a cold cache, local server, uncompressed):
  - home before any scroll: **1,400 KB or less** at 1280x585@1.5 and at 390x844@3 (A: 2,100; B: 1,242);
  - home after a full scroll: **3,000 KB or less** (A: 3,211);
  - no single decorative image above 250 KB;
  - cut-outs served at most 2× their painted width.
- **R-21.** [performance] Fonts total 190 KB or less, in woff2, with only Roboto normal and Roboto Flex preloaded.
- **R-22.** [performance] **CLS is 0.05 or less** on every template at 1280x585@1.5 and 390x844@3, over load plus a full scroll (A's category page: 0.2389; fails today).
- **R-23.** [images]
  - Every `<img>` has `width` and `height`.
  - Below-the-fold images are `loading="lazy"`.
  - The hero is `fetchpriority="high"` and preloaded.
  - 0 broken images in every capture.
- **R-24.** [composition]
  - Every product rail and live panel sits on a photo or smoked band.
  - Adjacent home sections differ in at least two of backdrop, tone and band type (the 6.10 table is the declaration; check it against a full-page capture).
  - The home page has at most 2 flat bands, and they are not adjacent.
- **R-25.** [menu] **Mega menu content.**
  - 7 image cards: Shop All plus 6 groups.
  - Every L2 and L3 label from SITE-ARCHITECTURE 4.1 is present verbatim, each as its own link.
  - "⭐ Daily Offers ⭐" has no background fill.
  - Images are `alt=""`.
  - Hover gives an image scale of 1.06 or more and a lift of 3 px or more, and keyboard focus gives the same values.
- **R-26.** [type] **Accents.**
  - Every home section title (6.10) carries exactly one accent, and adjacent titles differ.
  - No title has a tag boundary between a letter and the punctuation that follows it (static check).
- **R-27.** [motion] **Reveal fail-safes.**
  - **JS disabled:** 0 elements below opacity 1 (excluding the gate, R-36).
  - **IntersectionObserver deleted** by an init script: everything at opacity 1 at load.
  - **Jump scroll** to 25%, 45% and 75% of the page: every element in the viewport reaches opacity 1 within 1.5 s.
  - **Global:** every `.reveal` reaches opacity 1 by 6 s.
- **R-28.** [motion] **Reduced motion** (emulated `prefers-reduced-motion: reduce`):
  - 0 running animations from `document.getAnimations()` after load and after a full scroll;
  - 0 non-zero parallax translates;
  - all reveals at opacity 1 at load;
  - pools static;
  - any video paused.
- **R-29.** [motion] Print preview (or emulated `print` media) shows every reveal and hides the gate veil, the sheets and the bag.
- **R-30.** [keyboard] **Keyboard menus.**
  - Closed panels contain 0 focusable elements in the tab sequence.
  - Crossing the whole header with Tab takes **14 stops or fewer** at 1280 (A: more than 45; B and C: 12).
  - Enter or Space on a caret opens its panel, and the next Tab lands on the first card or link.
  - Escape closes the panel and focus returns to the caret.
  - The same holds for every dropdown.
- **R-31.** [keyboard]
  - The bag button's accessible name contains "Pickup bag" at every width (A: "0" at 1240 and below; fails today).
  - "Reserve for pickup" updates the count and posts a polite live-region message.
- **R-32.** [keyboard] Every `:hover` rule in the shipped CSS has a `:focus-visible` or `:focus-within` twin with the same declarations (static check). At runtime, a sample of 10 controls shows equal computed transform and box-shadow for hover and focus.
- **R-33.** [keyboard] The focus indicator is 3 px or wider, has 3:1 contrast against both adjacent colours, and is never clipped by an ancestor's overflow. Sample: header link, caret, mega card, category card, rail card, accordion button, form input, footer link and the gate's Yes.
- **R-34.** [touch] On phones, header tools, primary CTAs and dialog controls are 44x44 or larger. All other targets are 24x24 or larger, or meet the WCAG 2.5.8 spacing exception.
- **R-35.** [age gate] With no consent stored, on every template:
  - the dialog is visible;
  - `main`, header and footer are `inert`;
  - focus is on "Yes";
  - `document.title` equals "Age Verification - Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA".

  **"No"** keeps the gate up, shows "You are not old enough to view this content" verbatim, and lets the visitor answer again.

  **"Yes"** stores `ccc-age-21`, removes `inert`, restores the page title and focuses the skip link.

  **Storage that throws** (forced in a test) shows "Your browser does not support cookies, you may experience problems entering this site".

  **All gate strings and the logo alt** match the source byte for byte. Deep links (a product URL opened directly) show the gate.
- **R-36.** [age gate] With JS disabled, page content is readable and the gate is not shown (BUILD-CONTRACT 4.4). If the operator chooses fail-closed (13.2), this requirement flips: the gate stays visible and blocks content with JS off.
- **R-37.** [dialogs] The mobile sheet, the bag, phone search and the filter sheet are each:
  - `role="dialog"` with `aria-modal`;
  - focus-trapped (8 Tabs and 3 Shift+Tabs stay inside);
  - closed by Escape, with focus returned to the opener.
- **R-38.** [phones] At 390 there are 0 visible text elements below 12 CSS px, and body text is 16 px or larger (A: 22 of 464 under 12; fails today).
- **R-39.** [compliance] **Pricing and deals.** A scan of all templates, with a positive control (a planted line-through and a "% off" badge in a copy) that must fire, finds:
  - 0 elements with `text-decoration: line-through`;
  - 0 `<del>` and 0 `<s>`;
  - 0 badges, pills or chips whose text contains "%", "off", "Sale", "Special" or "Deal";
  - offer titles rendered at body or card-title size with no fill;
  - the specials disclaimer verbatim in the bag.
- **R-40.** [AI labelling]
  - Every file under `assets/generated/` contains the `trainedAlgorithmicMedia` XMP. A byte grep must return 1 or more per file, with a positive control file that fires.
  - Every non-decorative generated image's alt starts with "AI-generated illustration:".
  - Every decorative generated image has `alt=""` and `data-ai`.
  - The footer AI note is on every page that has the footer.
  - Every generated place image painted 480 CSS px wide or more shows the "AI illustration" tag.
- **R-41.** [imagery] Every generated image has a recorded by-eye verdict against COMPLIANCE section 2: no people, no consumption, no text, no marks, no real store or landmark, no candy look. Rejected attempts are kept in a `rejected/` folder and never shipped.
- **R-42.** [copy] `node tools/text-parity.mjs --built <dist> --control` exits 0 (BUILD-CONTRACT 16.1), with only the section 11 strings in `allowedAdded`.
- **R-43.** [copy] `<title>` equals `page.title` on every built page. Exactly one `<h1>` per page.
- **R-44.** [copy] **Product guard.** The build fails if any rendered product description line, name, variant or price is not found verbatim in its source record (t1: `audit/prelock/t1.html`). C's guard is the model.
- **R-45.** [reviews]
  - Text, name and date are verbatim, in separate elements.
  - The rating aria-labels are verbatim.
  - "4.9" and "(967)" appear as printed.
  - The capture date is shown.
  - There are 0 third-party avatar images.
- **R-46.** [platform] 0 forbidden platform class names (BUILD-CONTRACT 4.14) in `dist/`. The grep is proven with a planted control. This session's control fired on `elementor-widget`, `w-row` and `wp-block`; the prototype has 0.
- **R-47.** [motion] No carousel or rail advances on its own. Rails scroll by buttons, keys, swipe and the wheel only.
- **R-48.** [images] **Sharpness beyond the first screen.**
  - **Mega-menu card photos:** 1.0 or more file px per device px at 1280x585@1.5.
  - **Phone-sheet card photos:** 1.0 or more at 390x844@3.
  - **Category-card photos:** 1.0 or more at 1280x585@1.5, 1600x662@1.2 and 390x844@3.
  - **Full-bleed band photos:**
    - 1.0 or more at 1280x585@1.5 and 1600x662@1.2;
    - on phones, 0.75 or more over the painted part, with the rest of a tall band fading into its ground (6.10).
  
  (A's Shop By Category band: 0.688 at 1280@1.5 and 0.169 at 390@3; fails today.)

---

## 13. Where the judges disagreed, and open questions

### 13.1 Judge disagreements and how this spec resolves them
1. **The winner.** J-brand and J-craft picked A. J-ux picked B, for the best keyboard pattern, phone readability, the lightest load and zero CLS. A wins by majority. Each of B's usability strengths is grafted in (grafts 1, 2, 6 and 17).
2. **"⭐ Daily Offers ⭐" in the mega menu.**
   - J-brand: demote it to a plain link.
   - J-craft: make it a photo banner card like C's.
   - **Resolved for the plain link**, because COMPLIANCE says flagged promotional labels are kept, not amplified.
3. **B's palette.** J-brand and J-craft scored the after-dark navy as a departure from the brand. J-ux rated B's readability highest. Resolved: A's daylight palette, with B's usability patterns.
4. **The no-JS age gate.** J-brand and J-ux treated fail-closed as a strength. BUILD-CONTRACT 4.4 says content stays readable without JS. The contract wins in this spec (R-36), but the question goes to the operator.
5. **Mega-label contrast.** J-ux measured A's labels as passing (one sample of 1.54 was likely a transition artefact). J-craft saw "Concentrates" and "Topicals" as weak, by eye. Resolved: stronger scrims plus R-9, measured at rest and on hover.
6. **Composition variety.** J-craft rated C (8) above A (7). Resolved with C's postcard (graft 8), the photo category cards (graft 10), the rail bands (graft 5) and the section map rule (R-24).

### 13.2 Open questions for the operator
1. **No-JS behaviour of the age gate:** fail closed (the prototype; COMPLIANCE R7) or readable (BUILD-CONTRACT 4.4; the live plugin is script-only)? Default here: readable.
2. **The announcement bar** ("Boards in the Stores…") is hidden at every width on the live site (`hiddenAll`). Show it in the redesign? Default: not shown.
3. **Mega grouping.** Six photo cards with two categories each (Flower + Pre-Rolls, Edibles + Tinctures, Concentrates + Vaporizers, Topicals + CBD, Accessories + Apparel; Seeds alone), or one photo per category (11 cards and a taller panel)? Default: paired. Every label stays its own link.
4. **New disclosure copy:** the footer AI note, the "AI illustration" tag, and the footer line repeating "*Must be 21+ with a VALID ID.". These need client and counsel review.
5. **Brand-named gummies tiles** (Wana, Mindy's, Kanha) get no generated product imagery, to avoid passing as those brands' products (R1) and the candy look. Acceptable, or does the client supply brand photography?
6. **The hero kayaker.** Uncle Tim's Bridge shows a small kayaker, seen from behind, whose age cannot be judged (J-brand, info). It is a real client photo, so the risk is low. Keep it, or crop it out?
7. **"Shop Gift Cards" goes to `/?s=gift-card`.** That is a search query the static host cannot answer. Should it map to a static result page, or hand off to the live menu? (PIPELINE.)
8. **Category pages under Plan B** show copy plus the live-menu hand-off and no grid (BUILD-CONTRACT 4.5). COMMERCE 8 also allowed a "preview" grid by guessed category. The contract wins here. Confirm.
9. **Hard-rule conflict in this lane's brief.** It said both "no edits to docs/" and "write docs/DESIGN-SPEC.md". This file was written because the spec-writer role names it as its deliverable. Nothing else in docs/ was touched.

---

## 14. Measurement methods and evidence

**Methods:**
- **Painted-pixel contrast (R-8, R-9).**
  1. Capture the element's box at the target DPR.
  2. Set `color: transparent; text-shadow: none` on the element and its descendants, and capture again.
  3. Glyph pixels are those that changed.
  4. Contrast compares the text colour, alpha-composited, with each background pixel under the glyph mask. Report the 2nd percentile (the worst 2%). Hide the focus ring during capture.
- **Backdrop luminance range (R-11).**
  1. Set `visibility: hidden` on the panel.
  2. Capture its rect.
  3. Compute relative luminance per pixel (sRGB to linear).
  4. The range is p95 minus p5.
- **Through-glass range (R-12):** the same, with the panel shown and only its contents hidden.
- **File px per device px (R-1 to R-3).**
  - For `object-fit: cover`, the applied scale is `max(boxW/natW, boxH/natH)` times any transform scale.
  - The result is `1 / (scale × DPR)`.
  - For CSS backgrounds, use `background-size` the same way.
  - For overscan or parallax, use the element's painted (transformed) size.
- **Protrusion overlap (R-16, R-17).**
  1. Decode the cut-out's alpha, keeping alpha above 128.
  2. Map it to CSS px through the element's painted rect.
  3. Sample a grid of 15x15 or finer.
  4. Intersect with `Range.getClientRects()` of every text node and the boxes of every `a, button, input, select, textarea, [tabindex]`, plus product photos and annotated face boxes.
  
  The seam crossing counts opaque samples on each side of the seam line.
- **Keyboard walk (R-30):** CDP `Input.dispatchKeyEvent` Tab from the page start, logging `document.activeElement` until focus leaves the header.
- **Weight (R-20):** CDP `Network.loadingFinished` `encodedDataLength`, summed from a cold cache, before and after an 8-step scroll.
- **Tools:**
  - `tools/shots-dpr.mjs` for captures;
  - `tools/cdp.mjs` for probes;
  - `tools/contrast.mjs`;
  - judge probes to reuse: `tmp/panel/judges/judge-ux/probe.mjs`, `judge-craft/probe.mjs` and `judge-craft/megac.mjs`, and `judge-brand/probe.mjs` (verbatim corpus, logo, gate, pricing scan with control).

**Evidence index:**
- **Prototype:** `tmp/panel/winner/` (`index.html`, `category.html`, `product.html`, `css/site.css`, `js/site.js`, `build.mjs`, `DESIGN-NOTES.md`, `shots/`, `work/` probes).
- **Grafts:** `tmp/panel/winner/GRAFTS.md`.
- **Render check of the copy:** `tmp/panel/winner/spec-work/winner-home.{1280x585@1.5,1600x662@1.2,390x844@3}.png` and `winner-home.shots.json`. It returned 200, with no overflow and 0 broken images.
- **Judge reports:** `tmp/panel/judges/judge-brand/probe-report.json`, `judge-ux/{a,b,c}/probe.json`, and `judge-craft/probe-*.json` and `motion-*.json`.
- **Runner-up references:**
  - B: `tmp/panel/b/` (disclosure menus, live panels, phone hero, AI notes);
  - C: `tmp/panel/c/` (postcard, product first screen, address band, print fail-safe).
