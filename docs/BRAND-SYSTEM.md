# Cape Cod Cannabis: brand system

Phase: UNDERSTAND, brand lane. Written 2026-10-12 (UTC). Machine-readable twin: `audit/understand/brand.json`.

**How this was captured.** The origin has refused this machine since 2026-10-12T00:44:20Z, so there is no live
computed-style capture and no live screenshot. Everything here comes from:

- the Elementor kit and widget CSS in `audit/prelock/kit.css`;
- the 743 raw pages in `audit/raw/`;
- the images in `assets/source/`, decoded pixel by pixel (`tmp/understand/brand/probe.mjs`);
- 8 requests to the image CDN, listed in section 1.

Nothing was requested from capecodcannabis.com. Anything not proven is marked UNVERIFIED.

## What a designer or builder must know first

1. **The logo is a white town-line sign with one blue whale tail.** Its only colour is the tail, `#24A3DC`, which is
   not the site's primary blue `#02A7EB`. The panel is solid white, so on dark or glass backgrounds the sign
   works as a white plate. Never recolour it.
2. **There is no vector logo.** The largest master is 700x568 (lossy WebP). Ask the client for SVG/AI/EPS. Until then,
   keep the sign at about 350 CSS px wide or less if it must stay sharp on 2x screens.
3. **The live primary button fails contrast.** White on `#02A7EB` is 2.72:1, and `#02A7EB` links on white are also
   2.72:1. The accent `#015375` passes at 8.42:1. Use a darker primary for white-label buttons and links
   (`#017BAE` gives 4.72:1, proposed), or black on `#02A7EB` (7.73:1).
4. **Roboto is the whole type system.** The Elementor kit defines 24 typography sets. 23 declare Roboto; the 24th,
   `a8d387b` (18px, weight 600, style normal), declares no family and inherits Roboto. There is no letter-spacing and
   no text transform, and headings are 700 (the h1 set `f838561` is 3rem, 2.625rem at 1025px and below, 2.25rem at
   767px and below). Playball is set on exactly one line ("Thank you Cape Cod!"), but no Playball font
   file is loaded anywhere, so the live site probably shows a fallback italic (UNVERIFIED).
5. **The whale tail is the motif.** It appears in the logo, the favicon, the header and footer pattern (white tails on
   `#C0E9FA`), the shop windows and the parking cones. The site's own blog explains it: Wellfleet's name "is believed to
   be derived from 'whale fleet'".
6. **The tagline is "Always worth the trip!"** It is in all 743 raw files. The age gate carries it on every file (a
   visible `h3 em` line, plus the logo alt "Cape Cod Cannabis in Wellfleet, MA...Always worth the trip!"). The footer
   carries it on 741 files: `/links/` and `/free-bar-coasters/` have no footer, so on `/links/` it appears only in the
   age gate, and `/free-bar-coasters/` repeats it in its own content. Variants appear on the home, about, FAQ and town
   pages.
7. **Compliance shapes the UI.** The site's own CSS hides original and strike-through prices and the special-offer
   badge under the comment "Hide Specials MA Compliance", and relabels them "Shop Bundles" and "Shop Offer". Do not
   bring back was/now pricing. The 21+ age gate copy must be kept verbatim.
8. **The live site has almost no motion.** Every scroll reveal, parallax and hover state in the redesign is new, so
   keep it calm.

## 1. Logo

### The mark
The logo is a New England town-line sign:

- **Panel:** white, with a black keyline border. The top edge has a double arch: two humps meeting in a centre dip,
  like an open book.
- **Lettering:** **CAPE COD** sits on an upward arc in heavy, wide, uppercase geometric sans. **CANNABIS** is set
  straight below in the same face.
- **Centre:** a solid blue **whale fluke**, flanked by **EST.** on the left and **2018** on the right in smaller
  condensed uppercase.

The lettering is outlined artwork in an unidentified typeface (UNVERIFIED), and it is not Roboto. Some versions bake
a soft grey drop shadow outside the panel. The favicon is the tail alone on transparency.

Measured colours from the lossless origin PNG (`audit/prelock/logo-agegate.png`, share of opaque pixels):

| Colour | Part | Share |
|---|---|---|
| `#FFFFFF` | panel | 76% |
| `#000000` | lettering and border (lossy WebPs decode to about `#241F21`) | 11% |
| `#24A3DC` | whale tail (favicon decodes to `#25A2DD`) | 4% |

### Every variant in use
"Pages" counts come from the `usedOn` lists in `audit/image-inventory.json`. CDN paths below are relative to
`https://b2702268.assetcdn.net/2.0/2702268/wp-content/uploads/`.

| Where | Source path | Size | Alpha | Local file | Pages |
|---|---|---|---|---|---|
| Header (`theme-site-logo` widget, template 18695) | `elementor/thumbs/CCC-Logo-pr1hbos….webp` | 700x568 lossy WebP | yes, 4% transparent | `assets/source/84e934d9-CCC-Logo-pr1hbos….webp` | 744 |
| Footer (image widget, template 1996) | `2021/08/CCC-Logo-Footer.webp` (+ 300, 160, 480, 640 sizes) | 700x568 lossy WebP | yes, 4% | `assets/source/e4ae712e-CCC-Logo-Footer.webp` | 744 |
| Age gate | `2025/12/CCC_Logo_320px-2.png`, with shadow | 370x306 | yes, 29% | CDN copy `1c48453a-…` (palette PNG); origin original `audit/prelock/logo-agegate.png` (RGBA) | all |
| Favicon | `2022/01/cropped-CCC-Favicon-1-32x32.webp`, `-192x192.webp` | 32, 192 | yes | `ef3d170b-…`, `d0c3b5e9-…` | all |
| Apple touch icon | `…-180x180.webp` | 180 | yes | `42e4021b-…` | all |
| MS tile | origin `…-270x270.webp` | 270 (from the name; UNVERIFIED) | — | not fetched (CDN redirects to origin) | all |
| og:image / twitter:image | origin `2025/09/Home-Featured-Image-1200-x-628-2_geo.png` | 1200x628 | opaque | `tmp/understand/brand/masters/og-home-1200x628.png` | home |
| Schema `Organization.logo` | origin `2022/01/CCC-Logo.webp`, with shadow | 700x500 | yes, 28% | `masters/ccc-sign-700x500-schema-shadow.webp` | all (JSON-LD) |
| In content | `2024/04/CCC_Logo_650px.png`, with shadow | 648x548 RGBA PNG | yes, 21% | `95c5c457-CCC_Logo_650px.png` | 4 |
| In content | `2025/12/CCC_Logo_320px.png` / `2025/04/CCC_Logo_250px.png` | 320x256 / 250x200 | yes / **no** (white ground) | `572b659d-…` / `80866f34-…` | 3 / 4 |
| In content | `2023/12/CCC_Logo_650px-geo-tag-1.jpg` | 648x548 JPEG, 603 KB, 4 colour components | no | `1a7e34ec-…` (not a usable master) | 4 (+ thumb on 60) |

Not brand: `RRH-Logo-White.webp` (733x150) is the previous agency's footer credit on 744 pages. Remove it.

### Masters picked
Copies are in `tmp/understand/brand/masters/`.

| File | Use | Why |
|---|---|---|
| `ccc-sign-700x568-footer-noshadow.webp` (+ `.decoded.png`) | **primary master** | Largest sign (the panel is about 660 px wide), no baked shadow, so CSS supplies depth. Lossy. |
| `ccc-sign-648x548-shadow.png` | shadowed variant | Largest true RGBA PNG |
| `ccc-sign-370x306-shadow-agegate-origin.png` | small, lossless | The only file fetched from the origin itself, before the lockout |
| `ccc-sign-700x568-header.webp`, `ccc-sign-700x500-schema-shadow.webp` | reference | Header and schema versions |
| `ccc-whale-tail-icon-192.webp`, `-180-apple.webp`, `-32.webp` | icon masters | Tail only |
| `ccc-pattern-whale-tails-179x114.webp` | pattern tile | White tails on transparency |
| `og-home-1200x628.png` | social card | The sign over a beach |

**Gap:** `audit/image-inventory.json` contains 0 SVG images. Request the vector logo from the client.

### CDN requests (8 of the 10 allowed)
Requests were spaced 2 s or more apart. Only URLs that the live HTML or CSS references were requested, so the CDN
never relayed a 404 to the origin.

- `2022/01/CCC-Logo.webp`:
  - 01:10:13Z returned 302;
  - 01:10:29Z returned 200 from `BunnyCDN-PH1-1245` (headers only);
  - 01:10:45Z returned 200 image/webp (20,164 bytes), saved.
- `2024/04/CCC_Logo_650px.png` (01:10:48Z) returned **302 to capecodcannabis.com**, not followed.
- `2025/09/Home-Featured-Image-…png` (01:10:52Z) returned 200 image/png (883,123 bytes), saved.
- `cropped-CCC-Favicon-1-270x270.webp` (01:10:56Z) returned 302 to the origin, not followed.
- `2022/09/CCC_Pattern.webp?…` and `2021/12/CCC_Pattern.webp?…` (01:16Z) each returned 200 (818 bytes, identical).

**Finding:** the CDN redirects anything it has not cached to the origin. Without the `?lossy=2…` parameters,
"originals" cannot be fetched without touching the origin.

### Logo rules for the redesign
These are recommendations.

- Use the sign whole and unaltered: no recolouring, no redrawn letters, no separated words.
- The tail alone may serve as the icon, the pattern and the motif.
- On glass or dark grounds, the sign stays a white plate. Add depth with a CSS shadow, not a baked one.
- Give it clear space of about the height of the "EST." line on every side (proposal).

## 2. Palette

### Elementor kit globals (`.elementor-kit-8` in kit.css)
"Refs" counts the `var()` references in kit.css rules.

| Hex | Token | Role | Refs |
|---|---|---|---|
| `#02A7EB` | primary | Buttons, links, h6, header search button, "Specials" menu item, "Shop Bundles" badge, event titles | 30 (color 10, bg 8, border 8) |
| `#015375` | accent | Button and link hover, age-gate button hover | 7 |
| `#000000` | text (+ bb98ae3) | h1–h5, labels, body | 34 + 9 |
| `#FFFFFF` | secondary (+ be74b8f) | Background, button labels | 17 + 7 (plus 142 hard-coded) |
| `#C0E9FA` | 5d35960 | Sky blue: header background under the whale pattern, one footer block | 5 |
| `#F4F4F4` | d12f9b9 | Light grey: footer and card surfaces | 16 |
| `#636363` | 5e25e5b | Muted text: footer links and phone | 10 |
| `#00DB4AA8` | 2730197 | Green at 66% alpha (`#57E788` on white) | **0, defined but unused** |

**Brand primaries:** `#02A7EB`, `#015375`, black and white, with the logo blue `#24A3DC`. The secondary brand
surfaces are `#C0E9FA` and the whale pattern.

### Other colours in use
| Hex | Where | Evidence |
|---|---|---|
| `#07A80F` | "Staff Pick" ribbon, white text | `style#wp-custom-css` |
| `#B8E6F9` | `.featured-brand` chips | `style#wp-custom-css` |
| `#00CCFF` | Editor highlight in content (award line, stats) | 101 inline `style` occurrences |
| `#FF0000` | Editor red for compliance and disclaimer notes | 129 inline occurrences |
| `#111111`, `#1D1D1D`, `#7BD389` | Password-page form | `style#wp-custom-css` |
| `rgba(0,0,0,.5)` | Card glow, `box-shadow: 0 0 10px 0` | 21 rules in the home template |

Ignore the WordPress core preset colours (`#CF2E2E`, `#FF6900`, `#FCB900`…) in every page's
`global-styles-inline-css`. They are not brand colours.

### WCAG contrast (computed)
| Pair | Ratio | Grade | Use |
|---|---|---|---|
| `#000` on `#FFF` | 21.00 | AAA | Body text |
| `#FFF` on `#02A7EB` | **2.72** | **FAIL** | Live button label |
| `#02A7EB` on `#FFF` | **2.72** | **FAIL** | Live links, h6 |
| `#FFF` on `#015375` | 8.42 | AAA | Button hover |
| `#636363` on `#F4F4F4` | 5.46 | AA | Footer links |
| `#000` on `#C0E9FA` | 16.28 | AAA | Header |
| `#02A7EB` on `#C0E9FA` | 2.11 | FAIL | — |
| `#015375` on `#C0E9FA` | 6.52 | AA | — |
| `#FFF` on `#07A80F` | 3.17 | large text/UI only | Staff Pick badge |
| `#000` on `#02A7EB` | 7.73 | AAA | Alternative button |
| `#FFF` on `#017BAE` (proposed) | 4.72 | AA | Darker primary, same hue |
| `#00CCFF` on `#FFF` | 1.90 | FAIL | Content highlight |
| `#FF0000` on `#FFF` | 4.00 | large only | Compliance notes |
| `#24A3DC` on `#FFF` | 2.86 | below 3:1 | Tail as a graphic |

## 3. Typography

| Role | Family | Size (desktop / ≤1025px / ≤767px) | Weight | Line height |
|---|---|---|---|---|
| h1 | Roboto | 3rem / 2.625rem / 2.25rem | 700 | 1.2em |
| h2 | Roboto | 2.5rem / 2.25rem / 2rem | 700 | 1.2em |
| h3 | Roboto | 2rem / 1.875rem / 1.5rem | 700 | 1.2em |
| h4 (and form labels) | Roboto | 1.75rem / 1.625rem / 1.5rem | 700 | 1.2em |
| h5 | Roboto | 1.5rem / 1.375rem / 1.3rem | 700 | 1.2em |
| h6 | (browser default size) | — | — | colour `#02A7EB` |
| Body | Roboto | 1rem | 400 | 1.5em |
| Button, link | Roboto | 1rem | 700 | 1.5em |
| "Secondary" set | Roboto | 1rem | 100 | 1.5em |
| Small sets | Roboto | 0.9rem and 0.8rem | 700, 100, 400 and 400 italic | 1.5em |
| Display alternates | Roboto | Same sizes as h1–h5 | 400 | 1.2em |
| Script accent | Playball, italic | (widget) | — | One line on the home page: "Thank you Cape Cod!" |

- **Spacing and case:** no letter-spacing anywhere in the kit, and `text-transform: none` in every set. Capitals
  appear only where the copy is typed that way (e.g. "JOIN OUR NEWSLETTER").
- **Hosting:** Roboto is self-hosted by Elementor's local Google Fonts copy at
  `/wp-content/uploads/elementor/google-fonts/fonts/roboto-*.woff2`. There are 162 `@font-face` rules (18 weight and
  style combinations × 9 unicode subsets) covering weights 100–900, normal and italic, with `font-stretch: 100%` and `font-display: swap`. None were
  downloaded (`audit/font-inventory.json`: 0), so the rebuild should get Roboto from Google Fonts or its GitHub
  release.
- **Playball** has no `@font-face` in kit.css, and none of the 743 raw pages mentions it (grep count 0).
- **Licences:** both Roboto and Playball are SIL Open Font License 1.1 on Google Fonts. This was not re-checked
  this session (UNVERIFIED), and older Roboto releases were Apache 2.0.
- **Plugin noise, not brand:** eicons, swiper-icons, one Open Sans rule, the Events Calendar font stack.

**Pairing that keeps Roboto's character (proposal):** Roboto for text; Roboto Flex or heavy Roboto (800–900) for
display; Playball, loaded properly, only for one or two hand-written sign-offs ("Thank you Cape Cod!", "Always worth
the trip!").

## 4. Components and motifs

| Component | Live style | Evidence |
|---|---|---|
| Button | Pill: radius 300px, 1px border in the fill colour, padding 16px 32px, `#02A7EB` fill with white Roboto 700. Hover: `#015375` fill and border, radius 32px | kit.css `.elementor-kit-8 button…` |
| Card | Radius 15px, `box-shadow: 0 0 10px 0 rgb(0 0 0/.5)`, white or `#F4F4F4` | 22 radius / 21 shadow rules in home template 117740 |
| Header | `#C0E9FA` container with the white whale-tail pattern on an Elementor motion-effects layer; shadows `0 8px 8px` / `0 8px 16px rgba(0,0,0,.25)` | kit.css `.elementor-18695` |
| Staff Pick badge | Diagonal corner ribbon (`rotate(45deg)`), `#07A80F`, white 600 14px | `wp-custom-css` |
| Bundles badge | `::before` "Shop Bundles" on primary, radius 8px, Roboto 15px | `wp-custom-css` |
| Featured-brand chip | `#B8E6F9`, bold, radius 5px | `wp-custom-css` |
| Age gate | Box with 1px `#CCC` border, radius 8px, padding 32px; logo max 320px; Yes/No in primary, accent on hover | `wp-custom-css` |
| Icons | Font Awesome 5 inline SVGs (angle up/down 17 each, caret-down 13, long-arrow-right 12, plus/minus, search, four socials) plus eicons. No custom set | `audit/raw/index.html` |
| Emoji as icons | 42 of 9,950 headings site-wide: ⭐ 40, 🅿️ 5, 💵 5, 🛒 5, ℹ️ 5, 🔥 4. Home: "🅿️ Easy Parking", "💵 Debit & Cash Accepted", "🛒 Order Online & Pickup", "ℹ️ Expert Cannabis Guidance"; menu "⭐ Daily Offers ⭐"; ✅ list markers | heading scan of 743 pages |
| Divider | One Elementor **book** shape divider on home; it echoes the sign's arched top | `shape_divider_bottom: book` |
| Motion (live) | No entrance animations (one `_animation: none`), no hover-animation classes, no sticky flag | home data-settings |

**Photography and illustration** (looked at by eye):

- **Real storefront** (`11d6f8ea-CCC-Storefront.webp`): a grey cedar-shingle Cape building with dormers, a US flag
  and an OPEN flag. The windows carry the sign logo and big blue whale tails, and the parking cones are blue and
  white with whale tails. Clear daylight. This is the brand's most distinctive photo.
- **Cape scenery:**
  - The og image: the sign over a turquoise beach with dune grass.
  - `13096766-CCC-Beach-Team.webp`: despite its name, a soft sunset lighthouse on rocks. Location UNVERIFIED.
- **Neon cannabis macro** (`Cape-Cod-Homepage-Background-2`): a magenta-lit bud on a cyan-to-magenta gradient.
- **Promo banners:**
  - Sizes: 1580x200 web banners, 1920x250 blog banners, 765x330 hero banners.
  - Style: dark navy grounds, white heavy uppercase headlines, light-blue price pills, partner logo plus the sign.
- **Products** come from Dutchie (`images.dutchie.com`).
- **No illustration system** exists beyond the whale tail.

## 5. Voice and tone

**Character:**

- **Warm and welcoming.** The copy speaks to "you".
- **Proudly local.** It names Wellfleet, Route 6 and the Outer Cape, and lists Cape towns.
- **Destination-framed.** The shop is "a stop", "on your way to PTown", "always worth the trip".
- **Education-first and trust-led.** "education before recommendations, honesty before sales", "…and NOT rushed."
- **Lightly playful.** One pun ("weed be happy to assist"), exclamation marks in promos and sign-offs, emoji
  (⭐ 🔥 ✅).
- **Compliance-aware.** 21+, valid ID, MA rules, "While supplies last."
- **SEO-heavy.** Headings carry "Dispensary near me" and town keywords. The rebuild keeps them verbatim.

**How customers are addressed:** "you", "our amazing customers", "Cape Cod residents and visitors", "locals and
visitors", "VIP member". The store speaks as "we".

**Recurring phrases** (pages containing them, out of 743):

| Phrase | Pages |
|---|---|
| "Always worth the trip!" | 743 |
| "Shop Menu" | 742 |
| "Order Ahead" | 74 |
| "Outer Cape" | 51 |
| "budtender" | 41 |
| "Experience the difference" | 18 |
| "Click for directions" | 17 |

Other recurring phrases: "residents and visitors", "Wellfleet's first … dispensary", "Serving Cape Cod Since
2021", "largest selection … best prices on Cape Cod", "Mix & match", "Double up".

**CTA verbs:** Shop, Order, Join, Earn, Redeem, Visit, Discover, Learn, Leave (a review), Sign up, Grab, Stock up.

**Avoid in any new microcopy or alt text** (recommendations, except where evidence is cited):

- was/now pricing and the word "Specials" as a UI label (the site's "MA Compliance" CSS);
- medical or cure claims;
- anything youthful or candy-like;
- depicting consumption in generated imagery (PLAN.md);
- the old agency's name.

### Verbatim quotes
All 24 are confirmed present in the cited raw pages by a script that also proved it reports a fake quote as
missing. Whitespace that tag stripping inserted before punctuation is removed, and entities are decoded.

| # | Quote | Page (audit/raw/…) |
|---|---|---|
| 1 | "Always worth the trip!" | age gate on all 743 files; footer on 741 (not `/links/` or `/free-bar-coasters/`) |
| 2 | "Welcome!" / "Are you over 21 years of age?" / "*Must be 21+ with a VALID ID." | age gate |
| 3 | "Whether you’re exploring the Outer Cape or relaxing after a beach day, our friendly and knowledgeable team is here to help you find the perfect product for your needs. Cape Cod Cannabis in Wellfleet is…Always worth the trip!" | index.html |
| 4 | "Choosing a cannabis dispensary is about more than finding the closest location. It’s about finding knowledgeable people, quality products, and a place you can trust." | index.html, about |
| 5 | "Since 2021, we’ve built lasting relationships with thousands of customers by focusing on education before recommendations, honesty before sales, and exceptional service during every visit." | index.html, about |
| 6 | "At Cape Cod Cannabis, trust is earned through consistency, transparency, and a genuine commitment to our customers." | index.html, about |
| 7 | "To guide you through the process and consult you on your cannabis needs. No hassle and at your own pace." | index.html |
| 8 | "Join for FREE and earn redeemable VIP points at Cape Cod Cannabis toward Accessories, Apparel or CBD products. Sign-up in-store today!" | index.html |
| 9 | "Thank you Cape Cod!" | index.html (the Playball line) |
| 10 | "Cape Cod Cannabis in Wellfleet…Always worth the trip!" | about-cape-cod-cannabis.html |
| 11 | "At Cape Cod Cannabis, Wellfleet’s first dispensary, our mission is to cultivate a vibrant and sustainable cannabis community, rooted in the spirit of the Cape […]" | about-cape-cod-cannabis.html |
| 12 | "Visit us in the Rt 6. shopping plaza in South Wellfleet, MA and experience the difference… always worth the trip! Please contact us at (774) 383-3133 if you have further questions and weed be happy to assist." | faqs-420.html |
| 13 | "Overall, expect a safe, regulated, and educational experience designed to help you feel comfortable and informed…and NOT rushed." | faqs-420.html |
| 14 | "Just a short drive down Route 6 from Provincetown, MA (or on your way to PTown)" | dispensary-near-provincetown.html |
| 15 | "It’s worth the trip!" | dispensary-near-provincetown.html |
| 16 | "Double up and save! 🔥 Mix & match select Infused Pre-Rolls and grab 2 for just $20. Pick your favorites or switch it up and try something new!" | specials-infused-pre-rolls-2-for-20.html |
| 17 | "*Website cart may not reflect the bundled price but it will be adjusted at time of payment." | specials pages |
| 18 | "Get more Glorious Moonrocks for less! Mix & match 3.5g Moonrocks and grab 2 for $70 or 5 for $160. While supplies last." | specials-glorious-3-5g-moonrocks-2-for-70-5-for-160.html |
| 19 | "At Cape Cod Cannabis in Wellfleet, MA, we believe in rewarding our amazing customers!" | join-our-loyalty-vip-program-today.html |
| 20 | "✅ Earn points on every purchase—no hassle, no hidden fees!" | join-our-loyalty-vip-program-today.html |
| 21 | "Branded Apparel – Rock your Cape Cod Cannabis pride with stylish hoodies, hats, and tees." | join-our-loyalty-vip-program-today.html |
| 22 | "The town’s name is believed to be derived from “whale fleet,” as the area was once a bustling center for whaling and fishing." | exploring-wellfleet-ma-cape-cod.html |
| 23 | "Boards in the Stores is back for 2026 and bidding is now open! Click here to bid or learn more!" | header announcement, 742 of 743 pages |

(The JSON lists the age-gate lines separately, which is why it counts 24.)

## 6. Redesign brief

**Keep:**

- the sign logo, unaltered;
- the whale tail as the single colour accent and motif;
- `#02A7EB`, `#015375`, black and white, with `#C0E9FA` and the tail pattern;
- Roboto;
- "Always worth the trip!";
- the age-gate copy;
- the warm, local, educational tone, with every word verbatim.

**Can evolve:**

- layout and section rhythm;
- frosted glass surfaces over sky, sea and photo backdrops;
- layered depth, with cut-outs that protrude across section seams;
- scroll reveals and hover states;
- the display type (Roboto Flex or heavy Roboto, with Playball as a properly loaded sign-off);
- accessible colour use (a darker primary such as `#017BAE` for white-label buttons and links).

### Direction A: Seashore Glass (daylight town-line sign)
- **Mood:** bright, airy and beach-day, taken from the og image (the sign over a turquoise beach) and the header's
  whale tails on `#C0E9FA`.
- **Glass:** layered sky-to-sea gradients and real Cape scenery behind frosted white glass panels. Each panel's top
  edge borrows the sign's double arch, so every card reads as a small town sign.
- **Colour:** black Roboto on white glass. `#015375` for links and hover. `#02A7EB` only for large fills, outlines and
  the glow behind the tail.
- **Depth:** three planes.
  - Back: a slow-parallax photo or gradient.
  - Middle: the glass.
  - Front: cut-out product jars, dune grass and the lighthouse, breaking out of the glass and across section seams.
  - **Lighthouse caution.** The only lighthouse image, `13096766-CCC-Beach-Team.webp` (the age-gate backdrop), has no
    caption, and the file has no EXIF or XMP chunk (its WebP chunks are VP8X, ICCP, VP8 and PSAI), so its location is
    UNVERIFIED and it may be a stock photo (also UNVERIFIED). Use it as a cut-out only after the client confirms where
    it was taken. Until then use dune grass and the whale-tail sign, and never present it as Cape Cod scenery (R1,
    misleading impression).
- **Signature motif:** the whale-tail tile becomes a faint watermark that drifts at its own speed. The arched sign
  top becomes the shape for cards, badges and dividers, echoing the existing "book" divider.
- **Motion:** a calm "tide" reveal, with content rising from behind a soft wave mask, and 4–6 px hover lifts with a
  deeper shadow.

### Direction B: Outer Cape After Dark (smoked glass, neon tide)
- **Mood:** an evening version of the brand, built on the accent `#015375` deepened toward night navy and on the
  site's own neon imagery: the cyan-to-magenta bud and the navy promo banners.
- **Glass:** smoked dark glass with a thin cyan rim light in `#02A7EB`. The blue finally reads as light, not as
  low-contrast text.
- **Logo:** the white sign sits on its own plate and glows like a lit roadside sign, so it stays unaltered.
- **Depth:**
  - Front: glowing product and bud cut-outs that overlap panel edges.
  - Back: bokeh orbs on a back plane and a horizon of moonlit water.
- **Best for:** offers, bundle days and the Loyalty VIP band.
- **Motion:** a slow gradient drift, a light sweep across the glass on hover, and the "900+" and "4.9" counters
  ticking up once.
- **Risk:** keep it adult and calm, never a club flyer, with body text at AA or better.

### Direction C: Route 6 Postcard (road-trip destination)
- **Idea:** the whole site is built around the line the brand repeats on every page, "Always worth the trip!", and
  the town pages' "Just a short drive down Route 6".
- **Mood:** a sunny road trip. Layered postcards, photo prints and ticket-like glass cards are stacked at slight
  angles, with the real storefront (whale-tail windows and cones) as the hero destination.
- **Glass:** clear window glass with frosted "decal" areas like the shop windows, over warm sand and sea tones sampled
  from the beach photography.
- **Colour:** `#02A7EB` and the tail serve as the wayfinding colour.
- **Depth:** photos and the sign pin out of their frames and overlap the next section. A dotted Route 6 line runs
  down the page, linking sections and the list of served towns.
- **Motion:** the route line draws itself on scroll, cards settle like dealt postcards, and hover tilts a card a few
  degrees with an inner parallax shift.
- **Type:** heavy Roboto headlines and Roboto text, with Playball only for "Thank you Cape Cod!".
- **Signature motif:** route markers and mile-post counters ("Serving Cape Cod Since 2021", "Est. 2018").

## UNVERIFIED and open
- **Live rendering of any page** (lockout): computed styles, the header motion-effects settings, sticky behaviour,
  and how the Playball line actually renders.
- **Facts not checked this session:** the Roboto and Playball licence texts, the logo's typeface, the MS tile's
  dimensions, and whether the lighthouse photo is on Cape Cod.
- **For the client:** a vector logo master, and confirmation that `#00DB4AA8` (defined but unused) has no planned role.
- **Section background images outside the home page.** Elementor container backgrounds live only in the LiteSpeed
  combined CSS. The raw pages reference 169 distinct `litespeed/css/<hash>.css` files, and only the home bundle
  (`audit/prelock/kit.css`) was captured. Its only content-image `url()`s are the two `CCC_Pattern.webp` whale tiles
  (2021/12 and 2022/09). The HTML has no inline background image: 31 `style` attributes mention `background-image`,
  and every one is `background-image:inherit` (6 files). So hero and section backgrounds on the town, category,
  effect, event, post and archive templates are UNVERIFIED and may be missing from this brand reference.

## Verification log (fixer lane, 2026-10-12)

Each item was re-run against the evidence before this doc changed (scripts in `tmp/understand/fixer/`, read-only).

| # | Was | Now | Evidence |
|---|---|---|---|
| 1 | Item 4: "All 25 Elementor kit sets are Roboto" | 24 sets; 23 Roboto; `a8d387b` (18px/600/normal) has no family | `fixcheck.mjs` section D parses the `.elementor-kit-8{…}` block of `audit/prelock/kit.css`: 24 distinct `--e-global-typography-<id>-` ids (24 in the whole file too), 23 with `font-family: "Roboto"`, 0 with letter-spacing, text-transform only `none`. `follow2.mjs` (a): `f838561` font-size 3rem, 2.625rem in `@media(max-width:1025px)`, 2.25rem in `@media(max-width:767px)` |
| 2 | Item 6 and phrase table row 1: tagline "in the footer of all 743 pages" | On all 743 files via the age gate; in the footer on 741 | `fixcheck.mjs` section E: the phrase is in 743 files; footer template 1996 is in 741. `follow2.mjs` (b): the age-gate template is in 743 files and its tagline line in 743. `links.html` has 2 occurrences, both in the age gate (logo alt, `h3 em`). `free-bar-coasters.html` has it in its own `h2`, `p` and `h5` plus the age gate |
| 3 | Direction A used "the lighthouse" with no caution | Caution added: client must confirm the location first | The file `assets/source/13096766-CCC-Beach-Team.webp` (590,544 B) has the WebP chunks VP8X, ICCP, VP8 and PSAI: no EXIF or XMP, so no geotag or caption. `IMAGE-INVENTORY.md` already marks the location UNVERIFIED. Whether it is a stock photo is UNVERIFIED (no evidence either way) |
| 4 | No note that non-home section backgrounds are unknown | Added to "UNVERIFIED and open" | `fixcheck.mjs` section G4: 169 distinct `litespeed/css/<hash>.css` references across `audit/raw`; only `audit/prelock/kit.css` was captured, and its content-image `url()`s are the two `CCC_Pattern.webp` files. `follow.mjs`: 31 inline `background-image` style attributes, all `background-image:inherit` (effects, strains, faqs-420, index, menu, shop-your-loyalty-points). The critic's "0 inline background-image attributes" holds for image URLs |
