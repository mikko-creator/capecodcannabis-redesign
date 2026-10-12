# Image inventory: capecodcannabis.com

Lane: imagery (UNDERSTAND phase). Generated 2026-10-12 from `audit/understand/image-roles.json` (same data, machine-readable). Scripts and contact sheets: `tmp/understand/imagery/`.

## 1. What a designer or builder must know first

1. **2,246 image references collapse to 423 distinct images**: 390 on disk, 33 missing. Decisions: 376 KEEP, 29 REPLACE, 3 OPTIONAL, 15 REMOVE. Every on-disk image was looked at, on 14 labelled contact sheets (`tmp/understand/imagery/sheets/sheet-01.png` to `sheet-14.png`).
2. **Real things that must never be generated, swapped or "improved":** 4 photos of the real storefront, 10 photos of real people (9 staff named in their alt text plus one brand-team group photo), 14 photos of named Cape Cod towns on the geo pages, and the client's own landscapes (Sunset-Orleans 5487x3658, Uncle Tim's Bridge 4032x2681, Sagamore Bridge). These are the best "real" hero material on the site.
3. **Text baked into images is content.** 100 promo/special banners carry offers, prices or dates in their pixels. 51 of them have no alt or only the generic "Cape Cod Cannabis Recreational Dispensary..." alt, including all 34 specials banners. For those, the deal text exists only in the pixels and in the specials post titles. The 22 on-disk specials are transcribed in section 9 (checked by eye at near-native size) for use as alt text. 22 category tiles bake their label and a "LEARN MORE"/"SHOP NOW" pill into the photo. They are marked REPLACE (rebuild as live-text glass tiles), and their label words must survive verbatim (section 9).
4. **The CDN copies on disk are degraded for JPEG and PNG.** The site requests every image at `?lossy=2`. Against `?lossy=0` the on-disk JPEG/PNG copies score SSIM 0.939 to 0.968. `lossy=0` returned the original pixels: the age-gate logo is pixel-identical to the pre-lockout origin copy (SSIM 1.000). WebP files are byte-identical at every setting, so they are already masters. Uncached variants redirect (302) to the blocked origin. Build rule: re-fetch every KEEP PNG/JPEG with `?lossy=0&strip=0&webp=1`, never following a redirect to capecodcannabis.com (section 6).
5. **Brand assets are thin.** There is no vector logo anywhere. The best raster logos are the 700x568 WebP and the 370x306 age-gate PNG (origin master in `audit/prelock/logo-agegate.png`), and the favicon tops out at 192 px. The brand pattern `CCC_Pattern.webp` (a 179x114 tile behind sections, over #C0E9FA) was missing from the inventory because no stylesheet was downloaded. It is now in `tmp/understand/imagery/masters/`. **Ask the client for vector logo files and the original photos** (storefront 870x580 is the largest copy anywhere; staff portraits exist only as 400x500 thumbnails).
6. **Third-party brand logos:** the `/brands` index and all 249 brand pages (252 crawled URLs, including 3 `?product=` variants; re-tested on all 252 `audit/raw/brands-*.html`, whose only `<img>` sources are the header logo, the agency badge and the age-gate logo) carry **no** brand logo in their static HTML (Joint Commerce renders them in the browser). Static logos exist only in the home brand strip (8 square artworks, 1080x1080) and on event pages (34 files, mostly 200 px). Measured with ffmpeg: 14 of the 34 event logos are opaque white boxes and 3 are transparent with dark ink. Both kinds need a light chip on dark glass (section 8).
7. **Generation:** 27 candidate still slots and 3 motion loops (sections 10 and 11). They cover botanicals, terpene botanicals, generic coastal atmosphere, sea glass, apothecary glass, and transparent cut-outs for protrusions. None stands in for a person, the store, a product, a brand or a named landmark. The fal test (`tmp/fal-test/bud-macro.jpg`) passed the safety filter and is on-brand (pale sky blue). Its cut-out clips a blurred second bud at the frame edge, so cut-out prompts must ask for the whole subject inside the frame.

## 2. Method and evidence

- **Source:** `audit/image-inventory.json` as rewritten by sr-assets (2,246 refs, 2,051 on disk, 195 failed, `tmp/assets.log`). Failures: 173 same-origin refs refused by the block ledger, 13 x 404, 8 CDN throttle, 1 x 403.
- **Collapse** (`tmp/understand/imagery/group.mjs`):
  - Normalise the path: drop the CDN prefix, `smush-webp` and the double extension, the Elementor thumb hash, `-WxH`, `-scaled` and `-e<timestamp>`.
  - Merge sha256 duplicates.
  - Merge same-stem re-uploads whose aspect agrees within 3% (generic stems like `2.png` are excluded).
  - The best file is the variant with the most pixels.
- **Look:** 14 contact sheets of 30 images each (`sheets.mjs`), rendered in one headless Chrome with `*capecodcannabis.com*` blocked. No broken image was reported, and every sheet was read by eye.
- **Roles and decisions:** filename rules plus that eye review (`classify.mjs`, rules listed in code). Third-party logo transparency and ink luminance were measured with ffmpeg (48x48 RGBA), not judged from the sheets. The sheets' checkerboard misleads: it shows around any letterboxed image.
- **Rendered sizes:** home element CSS from `audit/prelock/kit.css` (LiteSpeed combined CSS). Desktop container max-width is 1600px. Per-page CSS for other templates was not downloaded (sr-assets: stylesheets 0/173), so other render widths are estimates, marked as such. For the same reason, any section background image set in that CSS on a non-home template is unknown (169 distinct LiteSpeed CSS files are referenced; see section 14). Each record carries `maxCssWidth` = the widest CSS size it stays crisp at 1x, 1.5x and 3x.
- **CDN probes:** 29 of 30 allowed requests to `b2702268.assetcdn.net` only, sequential, 2 s apart, redirects not followed (`probe-masters.mjs`, `probe-results*.json`). No request touched capecodcannabis.com.

## 3. Counts

| Role | KEEP | REPLACE | OPTIONAL | REMOVE | Total |
|---|---:|---:|---:|---:|---:|
| LOGO/BRAND | 15 | 3 | 0 | 0 | 18 |
| HERO | 7 | 0 | 0 | 0 | 7 |
| SECTION/BACKGROUND | 18 | 0 | 0 | 0 | 18 |
| CATEGORY TILE | 58 | 22 | 0 | 8 | 88 |
| THIRD-PARTY BRAND LOGO | 42 | 0 | 0 | 0 | 42 |
| BLOG FEATURED | 54 | 0 | 0 | 0 | 54 |
| EVENT POSTER | 20 | 0 | 0 | 0 | 20 |
| PROMO/SPECIAL BANNER | 100 | 0 | 0 | 0 | 100 |
| ICON/UI | 4 | 4 | 3 | 2 | 13 |
| PHOTO OF THE STORE/STAFF/PEOPLE | 14 | 0 | 0 | 0 | 14 |
| MAP | 0 | 0 | 0 | 0 | 0 |
| OTHER | 44 | 0 | 0 | 5 | 49 |
| **All** | 376 | 29 | 3 | 15 | 423 |

MAP: there are no map images. Maps are Google Maps iframe embeds (a Street View and a place map) on 74 raw pages (files with an `<iframe` whose `src` is a Google Maps URL). A Google Maps URL of any kind is on all 743 files, because the LocalBusiness JSON-LD and links carry one; that count is not embeds. Never replace an embed with a generated map.

## 4. Brand assets

| id | Asset | Best file | px | Bytes | Where it renders | Decision |
|---|---|---|---|---:|---|---|
| img0001 | age-gate backdrop | `13096766-CCC-Beach-Team.webp` | 1920x1674 | 590544 | Age-gate backdrop (--ag-background-image at opacity 0.2, blur 16px, over #C0E9FA; inline style age-gate-custom-inline-css). Despite its name it shows a lighthouse on rocks at sunrise with beach grass, not the team; the lighthouse is unidentified (UNVERIFIED whether on Cape Cod). Optional swap: slot G26. | KEEP |
| img0003 | primary logo | `e4ae712e-CCC-Logo-Footer.webp` | 700x568 | 32848 | Primary logo (700x568, transparent WebP). Footer renders it at max 175 px wide (kit.css .elementor-element-daa3a09 img{max-width:175px}). WebP is byte-identical at every CDN setting, so this is the best CDN master; ask the client for a vector. | KEEP |
| img0004 | age-gate logo | `1c48453a-CCC_Logo_320px-2.png` | 370x306 | 6461 | Age-gate logo (town-sign logo on a white card with shadow). Use audit/prelock/logo-agegate.png (origin master, 30,436 B): CDN lossy=0 is pixel-identical to it (SSIM 1.000), while the on-disk lossy=2 copy is quantised (6,461 B). | KEEP |
| img0005 | favicon | `d0c3b5e9-cropped-CCC-Favicon-1-192x192.webp` | 192x192 | 4604 | Site icon (blue whale tail). Largest on disk is 192 px; build favicons/touch icons from it, ideally from a client vector or 512 px master. | KEEP |
| img0007 | header logo | `84e934d9-CCC-Logo-pr1hbosryw7qhdibj7baymy1z2tyhsipa5ll50lqgg.webp` | 700x568 | 17160 | Header logo (Elementor thumb of CCC-Logo.webp), rendered max 108x88 px (kit.css .elementor-element-716f931 img{max-width:108px;height:88px}); 700 px source covers 3x DPR. | KEEP |
| img0008 | schema logo | `MISSING` | MISSING |  | Schema/og logo URL (same-origin, refused by the block ledger). Fetched from the CDN in the masters probe: 700x500 WebP, tmp/understand/imagery/masters/03-*.webp. | KEEP |
| img0028 | logo as JPEG | `c0c34846-CCC_Logo_650px-geo-tag-r9v1ohpw5zerbd7bkhgpgccbma2ezjddi6xfhghm0u.jpg` | 300x275 | 9417 | The logo saved as a geo-tagged JPEG (no transparency, heavy for a flat logo). Render the PNG/WebP logo master instead; keep the URL only if the SEO lane needs it as an og:image. | REPLACE |
| img0050 | logo as JPEG | `1a7e34ec-CCC_Logo_650px-geo-tag-1.jpg` | 648x548 | 603200 | The logo saved as a geo-tagged JPEG (no transparency, heavy for a flat logo). Render the PNG/WebP logo master instead; keep the URL only if the SEO lane needs it as an og:image. | REPLACE |
| img0068 | logo variant | `2119ffa4-Canna-101-CCC-Logo.png` | 449x407 | 14882 | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. | KEEP |
| img0070 | logo variant | `80866f34-CCC_Logo_250px.png` | 250x200 | 6200 | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. | KEEP |
| img0077 | logo variant | `95c5c457-CCC_Logo_650px.png` | 648x548 | 32618 | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. | KEEP |
| img0079 | logo variant | `572b659d-CCC_Logo_320px.png` | 320x256 | 6840 | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. | KEEP |
| img0184 | logo variant | `60722800-capecodcannabislogo-america.png` | 600x490 | 53768 | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. | KEEP |
| img0206 | logo variant | `3f6a76d9-CCC-generic-pop-up-logo_200px.png` | 200x200 | 24146 | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. | KEEP |
| img0368 | logo variant | `8bddce12-5th-Annivesary-400px-x-400px-blue.png` | 400x400 | 20390 | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. | KEEP |
| img0369 | logo variant | `f47a5465-Chrismas-CCC-Logo-600x600-1-repdlskgl9uzeryzrtulo7t0hgenmk4indg0lg1hnk.png` | 400x400 | 17142 | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. | KEEP |
| img0372 | logo variant | `ab17e58d-5th-Anniversary-Logo-2.png` | 353x286 | 43600 | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. | KEEP |
| img0413 | logo as JPEG | `MISSING` | MISSING |  | The logo saved as a geo-tagged JPEG (no transparency, heavy for a flat logo). Render the PNG/WebP logo master instead; keep the URL only if the SEO lane needs it as an og:image. | REPLACE |
| img0417 | logo variant | `MISSING` | MISSING |  | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. | KEEP |
| imgX001 | brand pattern | `tmp/.../masters/01-pattern_2022_09_as_used.webp` | 179x114 | 818 | Brand pattern tile, repeated as an Elementor motion-effects background layer over #C0E9FA (prelock/kit.css, selector .elementor-element-27b81eb > .elementor-motion-effects-container > .elementor-motion-effects-layer::before). Not in image-inventory.json because no stylesheet was downloaded (sr-assets: stylesheets 0/173). 2021/12 and 2022/09 copies are byte-identical. | KEEP |

Extra masters fetched this lane (scratch only; the build lane copies what it uses into `assets/`):
- `tmp/understand/imagery/masters/03-CCC_Logo_webp_og_schema_master_as_used.webp` is CCC-Logo.webp, 700x500 (the schema/og logo; the same-origin URL was refused).
- `tmp/understand/imagery/masters/01-pattern_2022_09_as_used.webp` is CCC_Pattern.webp, 179x114, byte-identical to the 2021/12 copy.
- `audit/prelock/logo-agegate.png` is the age-gate logo master (30,436 B). CDN lossy=0 matches its pixels exactly.

## 5. Real people and the real store (never generate, never replace)

| id | Subject (alt) | Best file | px | Crisp to (CSS px @1.5x) | Pages | Note |
|---|---|---|---|---:|---|---|
| img0002 | Cape Cod Cannabis Dispensary in Wellfleet located on Rt. 6 in South Wellfleet, MA shopping plaza. It's worth the trip! | `3964222d-CCC-Storefront.webp` | 870x580 | 580 | 745 (store 2, home 1, date-archive 56, page 113, brands-index 1, brand 252, cannabinoid 22, category 67, blog-category 5, geo-page 16, effect 11, event 61, recreational-geo 61, special 18, strain 6, terpene 53) | 870x580 is the largest copy anywhere (WebP byte-identical at lossy=0). Crisp only up to 580 CSS px at 1.5x: ask the client for the original photo before any wide use. |
| img0033 | Cape Cod Cannabis, Wellfleet, MA - It's worth the trip! | `8a6ede78-CCC-exterior.jpeg` | 1303x977 | 868 | 20 (geo-page 16, date-archive 1, page 3) | lossy=0 master fetched: 407,189 B vs 248,364 B on disk at 1303x977 (SSIM 0.947, PSNR 30.7 dB). Use tmp/understand/imagery/masters/21-CCC_exterior_lossy0.jpeg. |
| img0088 | Cape Cod Cannabis | `516bebba-IMG_7184-2.webp` | 1680x1119 | 1120 | 3 (date-archive 1, page 2) | 1680x1119 WebP storefront (front windows with the logo). The no-query original 302s to the origin. |
| img0130 | FREE CCC Bar Coasters for Cape Cod Restaurants & Bars provided by Cape Cod Cannabis in Wellfleet! | `5f016e6a-IMG_1120-scaled-rt2d5p1mcclazmug6c944qs29ucmzx27k695ol8a40.jpg` | 1920x1080 | 1280 | 2 (page 2) | 1920x1080 storefront (Elementor thumb of IMG_1120-scaled.jpg); lossy=0 and the original 302 to the origin. |
| img0149 | Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA | `07da78b5-CCC-Med_Card_Blog_1200.jpeg` | 1200x628 | 800 | 2 (date-archive 1, page 1) | Eye review: shows a Massachusetts medical-marijuana card with a person's face, name and card number (real or sample: UNVERIFIED). Ask the client before reuse. |
| img0196 | Shawn \| Security | `1a05e30a-IMG_5994-pncvp79hmriquxolw4zjxnqgdndkrkcbobm8k8cadk.webp` | 400x500 | 266 | 2 (page 2) | 400x500 Elementor thumb: the original's upload folder is not referenced anywhere in the captured HTML, and lossy=0 of the thumb 302s to the origin. Crisp up to 266 CSS px at 1.5x. |
| img0197 | Casandra \| Product Specialist | `5de1498e-IMG_7110-2-pncvp87btlk16jn8qne6i5hwz18xz9g20g9q1iaw7c.webp` | 400x500 | 266 | 2 (page 2) | 400x500 Elementor thumb (see IMG_5994). |
| img0198 | Sophia \| Product Specialist | `a4ce7f2d-IMG_9973-3-px9p7jrppmr7ww6kqnp99yb8gzmgvyiydmqojie6q0.jpg` | 400x500 | 266 | 2 (page 2) | 400x500 Elementor thumb; lossy=0 302s to the origin (probe 24). |
| img0199 | Jackson \| Marketing Administrator | `2c7d680b-Jackson-e1650653133690-pnr3otold50tieq15t4bj04j7y95y1lusdvaz9l9c8.webp` | 400x500 | 266 | 2 (page 2) | 400x500 Elementor thumb; the guessed original 2022/04/Jackson-e1650653133690.webp 302s to the origin (probe 19), so its existence is UNVERIFIED. |
| img0200 | Larysa \| General Manager | `03a85a17-Larysa-pncvpa3079mltrkifo7fn50u5szoenniopkp0283uw.webp` | 400x500 | 266 | 2 (page 2) | 400x500 Elementor thumb (see IMG_5994). |
| img0201 | Morgan \| Inventory Manager | `21b428fc-Morgan-pncvpb0ue3nw5dj5a6m27msar6v1mcr90u86hc6poo.webp` | 400x500 | 266 | 2 (page 2) | 400x500 Elementor thumb (see IMG_5994). |
| img0202 | Rich \| Product Specialist | `8f1e1ccd-Untitled_design_3-pncvpcwirrqgslgez7fbcmb7xyls1qypp3j5fw3xc8.webp` | 400x500 | 266 | 2 (page 2) | 400x500 Elementor thumb (alt: Rich \| Product Specialist). |
| img0260 | people (brand team) | `1d2b9bb7-ourstory-heroV2.png` | 1152x400 | 768 | 1 (event 1) | Group photo of real people (a brand team, on an event page; identity UNVERIFIED). |
| img0261 | Jackson Simard - Product Curator - Cape Cod Cannabis | `a779fe4f-PC90ZH_Black_Front_1080x1080.png` | 1080x1080 | 720 | 1 (page 1) | Real person (alt: Jackson Simard - Product Curator) outdoors in a CCC hoodie. |
| img0264 | Shop Apparel at Cape Cod Cannabis in Wellfleet, MA | `025c600e-LOYALTY-PAGE-APPAREL-1080x1080-2.png` | 1080x1080 | 720 | 1 (page 1) | Eye review: a real person wearing CCC merch (identity UNVERIFIED); reuse only this client photo, never a generated person. |
| img0370 | Kayla \| Receptionist | `0782c2ae-IMG_9969-2-1-px9p73sghg5cfitsbysllkcedft893rinfnfdt1vns.jpg` | 400x500 | 266 | 1 (page 1) | 400x500 Elementor thumb (alt: Kayla \| Receptionist). |

Stock people also appear: the nine "CLOUD-CITY" shop-by-effect tiles, three strain tiles, and several home category tiles and blog images. They are not staff. Keep them as the client's images, and never answer them with generated people. Consumption is shown in the Top Sellers and Accessories home tiles, the Pre-roll category tile and the CCC-Recreational_Benefit blog image.

## 6. Better masters (CDN probe, 29 requests)

- WebP uploads are passed through unchanged: lossy=2, lossy=0 and no-query returned byte-identical files (CCC-Logo-Footer, CCC-Storefront, CCC-Beach-Team; sha256 equal to the files on disk). The WebP files on disk are the best masters the CDN has.
- JPEG and PNG uploads are recompressed at lossy=2. Fetching them with ?lossy=0&strip=0&webp=1 returned the same pixel size at 1.6x to 4.7x the bytes, and SSIM of the on-disk lossy=2 copy against it is 0.939 to 0.968 (PSNR 30.7 to 37.7 dB).
- Positive control: the lossy=0 age-gate logo is pixel-identical to the origin copy fetched before the lockout (audit/prelock/logo-agegate.png): SSIM 1.000, PSNR inf. So lossy=0 returns the original pixels, while lossy=2 (6,461 B) is quantised.
- A variant the edge has not cached answers 302 with Location: https://capecodcannabis.com/... (the blocked origin). That happened for every no-query JPEG/PNG and for lossy=0 of Sunset-Orleans, uncle-tims-bridge, CCC-Accessories and two Elementor thumbs. Those masters are unreachable until the origin unblocks us; the redirects were not followed.
- Removing the -WxH suffix is not needed: the inventory already holds the unsuffixed file for every collapsed group (best variant = largest pixels). Originals behind '-scaled' files (IMG_1120, live-rosin) and behind the staff Elementor thumbs live only on the origin (302).
- The brand pattern CCC_Pattern.webp (179x114, 818 B) was missing from the inventory and is now in tmp/understand/imagery/masters/01-*.webp; CCC-Logo.webp (the schema/og logo, 700x500) is in masters/03-*.webp.

**Build rule:** Build lane: re-fetch every KEEP image whose best file is PNG or JPEG with ?lossy=0&strip=0&webp=1 (sequential, >= 1 s apart; never follow a redirect to capecodcannabis.com). Keep the WebP files as they are.

| # | Request | Status | Format | px | Bytes | Result |
|---:|---|---|---|---|---:|---|
| 1 | pattern-2022-09 as-used | 200 | webp | 179x114 | 818 | tmp/.../masters/01-pattern_2022_09_as_used.webp |
| 2 | pattern-2021-12 as-used | 200 | webp | 179x114 | 818 | tmp/.../masters/02-pattern_2021_12_as_used.webp |
| 3 | CCC-Logo.webp (og/schema master) as-used | 200 | webp | 700x500 | 20164 | tmp/.../masters/03-CCC_Logo_webp_og_schema_master_as_used.webp |
| 4 | CCC-Logo.webp no-query | 200 | webp | 700x500 | 20164 | tmp/.../masters/04-CCC_Logo_webp_no_query.webp |
| 5 | CCC-Logo-Footer no-query | 200 | webp | 700x568 | 32848 | tmp/.../masters/05-CCC_Logo_Footer_no_query.webp |
| 6 | CCC-Logo-Footer lossy0 | 200 | webp | 700x568 | 32848 | tmp/.../masters/06-CCC_Logo_Footer_lossy0.webp |
| 7 | agegate logo CCC_Logo_320px-2 no-query | 200 | png | 370x306 | 23308 | tmp/.../masters/07-agegate_logo_CCC_Logo_320px_2_no_query.png |
| 8 | CCC-Storefront no-query | 302 |  |  |  | 302 to the origin (not followed) |
| 9 | CCC-Storefront lossy0 | 200 | webp | 870x580 | 122476 | tmp/.../masters/09-CCC_Storefront_lossy0.webp |
| 10 | CCC-exterior no-query | 302 |  |  |  | 302 to the origin (not followed) |
| 11 | IMG_7184-2 storefront no-query | 302 |  |  |  | 302 to the origin (not followed) |
| 12 | CCC-Beach-Team (agegate bg) no-query | 200 | webp | 1920x1674 | 590544 | tmp/.../masters/12-CCC_Beach_Team_agegate_bg_no_query.webp |
| 13 | trichomes no-query | 302 |  |  |  | 302 to the origin (not followed) |
| 14 | trichomes lossy0 | 200 | jpeg | 1958x1300 | 625127 | tmp/.../masters/14-trichomes_lossy0.jpeg |
| 15 | Leafs black bg homepage no-query | 302 |  |  |  | 302 to the origin (not followed) |
| 16 | Flower tile no-query | 302 |  |  |  | 302 to the origin (not followed) |
| 17 | Effects Calm no-query | 302 |  |  |  | 302 to the origin (not followed) |
| 18 | live-rosin original (unscaled) | 302 |  |  |  | 302 to the origin (not followed) |
| 19 | Jackson staff original guess 2022/04 | 302 |  |  |  | 302 to the origin (not followed) |
| 20 | CCC_Logo_650px no-query | 200 | png | 648x548 | 23957 | tmp/.../masters/20-CCC_Logo_650px_no_query.png |
| 21 | CCC-exterior lossy0 | 200 | jpeg | 1303x977 | 407189 | tmp/.../masters/21-CCC_exterior_lossy0.jpeg |
| 22 | Flower tile lossy0 | 200 | png | 1024x683 | 1541047 | tmp/.../masters/22-Flower_tile_lossy0.png |
| 23 | Leafs black bg homepage lossy0 | 200 | png | 2160x1132 | 4083420 | tmp/.../masters/23-Leafs_black_bg_homepage_lossy0.png |
| 24 | Sophia staff thumb lossy0 | 302 |  |  |  | 302 to the origin (not followed) |
| 25 | uncle-tims-bridge lossy0 | 302 |  |  |  | 302 to the origin (not followed) |
| 26 | agegate logo lossy0 | 200 | png | 370x306 | 23308 | tmp/.../masters/26-agegate_logo_lossy0.png |
| 27 | CCC-Accessories store interior lossy0 | 302 |  |  |  | 302 to the origin (not followed) |
| 28 | IMG_1120 storefront thumb lossy0 | 302 |  |  |  | 302 to the origin (not followed) |
| 29 | Sunset-Orleans lossy0 | 302 |  |  |  | 302 to the origin (not followed) |

Measured quality gap (ffmpeg SSIM/PSNR of the on-disk lossy=2 copy against lossy=0):

| Image | lossy=2 bytes | lossy=0 bytes | SSIM | PSNR |
|---|---:|---:|---:|---:|
| Flower-Tile-for-Website.png 1024x683 | 486,853 | 1,541,047 | 0.968 | 33.7 dB |
| Cannabis-Leafs-with-Black-Background-Homepage.png 2160x1132 | 868,393 | 4,083,420 | 0.939 | 35.5 dB |
| CCC-exterior.jpeg 1303x977 (storefront) | 248,364 | 407,189 | 0.947 | 30.7 dB |
| trichomes.jpg 1958x1300 | 306,275 | 625,127 | 0.953 | 37.7 dB |
| CCC_Logo_320px-2.png 370x306 (lossy=0 vs the origin copy in prelock) | 6,461 (on disk) | 23,308 | 1.000 | inf |

## 7. Rendered size check

| Where | Rendered size (evidence) | Source | Verdict |
|---|---|---|---|
| Header logo | max 108 x 88 CSS px (kit.css `.elementor-element-716f931 img`) | 700x568 | OK to 6x |
| Footer logo | max 175 CSS px wide (kit.css `.elementor-element-daa3a09 img`) | 700x568 | OK to 4x |
| Home loyalty banner | `img{width:80%}` of a full-width container (kit.css `a395d7c`), so about 1150 CSS px at 1440 (estimate) | 1500x185 (baked text) | Soft at 1.5x (needs 1725 px). Keep it narrower, or carry its text live |
| Home promo/category tiles | radius 15px plus shadow (kit.css `218b1b4`); column width not in the captured CSS | 460x300 | Crisp to 306 CSS px at 1.5x |
| Specials cards (home loop) | Elementor loop; card width not captured (estimate 1/3 of the container) | 765x330 | Crisp to 510 CSS px at 1.5x; never full-bleed |
| Category promo strips | full content width on category pages (estimate) | 1580x200 / 1500x185 | Need 2160 px at 1440 @1.5x: soft, with baked text. Cap at about 1050 CSS px or rebuild as live text |
| Hero banners 1176x500 | page width (estimate) | 1176x500 | Crisp to 784 CSS px at 1.5x |
| Staff portraits | swiper carousel, slides per view not captured | 400x500 | Crisp to 266 CSS px at 1.5x: keep cards small, ask for originals |
| Town photos (geo pages) | image widget, width not captured | 640x480 (Hyannis 800x627) | Crisp to 426 CSS px at 1.5x; not a hero |
| Storefront | JSON-LD image site-wide; visible on store/about pages | 870x580 (CCC-Storefront), 1680x1119 (IMG_7184-2), 1920x1080 (IMG_1120), 1303x977 (CCC-exterior) | Use IMG_1120 or IMG_7184-2 for wide placements |
| Event brand logos | 200 px files | 200 px | Crisp to 133 CSS px at 1.5x; use the brand's 1080 px file where one exists |
| Full-bleed hero/backdrop (redesign) | 1440 CSS at 1440; 1920 device px at 1280 @1.5 | needs >= 2200 px with parallax overscan | Real candidates: Sunset-Orleans 5487, uncle-tims-bridge 4032, Cannabis-Concentrates-banner 2560, live-rosin 2560, cannabis-seeds 2300, the two former home backgrounds 2160. Generated: G01, G25 |

## 8. Third-party brand logos

Home jet-brands strip (8 x 1080x1080 square artworks) and event/pop-up pages (34 logo files, mostly 200 px wide). The /brands index and the 249 /brands/<slug> pages (252 crawled URLs with 3 `?product=` variants) carry NO brand logo in their static HTML: Joint Commerce renders them in the browser from its API (grep of audit/raw/brands.html and brands-1906.html finds only the site logos and jointstorage 5164-CCC-Logo-Footer.png).

Keep every brand mark as-is: no recolouring, no cropping into the mark, no generated look-alikes. Where the same brand has a larger file (Boutiq, Wana, Strane, Garcia, Jeeter, Cali-Blaze), use the larger one. 200 px logos are crisp only to 133 CSS px at 1.5x.

| id | File | px | Pages | Transparent share | Ink luminance | On dark glass |
|---|---|---|---|---:|---:|---|
| img0063 | `cd2b7ef0-kosmik-cclassic-uncut-banner-e1784817619700.jpg` | 1653x300 | 5 (event 5) | 0 | 0.86 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0071 | `3b8b11ca-Regenerative-Logo_200px.png` | 200x188 | 5 (event 5) | 0 | 0.66 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0078 | `9b7f4c46-Boutiq-Logo.png` | 340x76 | 4 (event 4) | 0 | 0.11 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0080 | `65a1f5e4-Wana-200px.png` | 200x219 | 4 (event 4) | 0 | 0.87 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0081 | `a513c8e9-Coast_200px-2.png` | 200x219 | 4 (event 4) | 0 | 0.53 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0082 | `e4f8eca8-strane_logo_200px.jpg` | 200x41 | 4 (event 4) | 0 | 0.54 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0083 | `3be50b15-Northern_Grown_Logo_200x200.png` | 200x200 | 4 (event 4) | 0 | 0.42 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0121 | `e28211df-Blackstone-Valley-Cannabis-Logo-200px.png` | 200x119 | 3 (event 3) | 0 | 0.88 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0193 | `cf2328a1-strane-this_is_next_level.png` | 456x230 | 2 (event 2) | 0 | 0.17 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0195 | `af36f482-eureka-logo.png` | 442x156 | 2 (event 2) | 0.75 | 0.1 | TRANSPARENT with dark ink: needs a light chip on dark glass |
| img0203 | `92dcc033-stingers-sweets.png` | 317x159 | 2 (event 2) | 0 | 0.81 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0204 | `d1f17449-NEA-200px.png` | 200x219 | 2 (event 2) | 0 | 0.95 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0205 | `ec6c2808-Treeworks-200px.png` | 200x219 | 2 (event 2) | 0 | 0.79 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0207 | `6dbdd385-Garcia_Hand_Picked_logo_200px.png` | 200x193 | 2 (event 2) | 0 | 0.3 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0214 | `5e971a0d-Sluggers_Logo.webp` | 3270x953 | 1 (event 1) | 0.26 | 0.39 | TRANSPARENT with dark ink: needs a light chip on dark glass |
| img0215 | `72d8bf14-High-Quality-Logo-2048x800-1.png` | 2048x800 | 1 (event 1) | 0.55 | 0.61 | transparent with light or colour ink: reads on dark glass; a light chip is optional |
| img0234 | `ed45312b-kosmik-cclassic-uncut-banner-e1784817619700-1536x279.jpg` | 1536x279 | 1 (event 1) | 0 | 0.86 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0239 | `0a222204-Holistic_Brands.png` | 1428x208 | 1 (event 1) | 0 | 0.06 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0280 | `63ba393e-Boutiq-Logo.png` | 1080x1080 | 1 (home 1) | 0 | 0.68 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0281 | `6c4fec5c-Cali-Blaze-Logo.png` | 1080x1080 | 1 (home 1) | 0 | 0.45 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0282 | `1b41e5cd-Garcia-Hand-Picked-Logo.png` | 1080x1080 | 1 (home 1) | 0 | 0.5 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0283 | `049f5d37-Glorious-Cannabis-Logo.png` | 1080x1080 | 1 (home 1) | 0 | 0.05 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0284 | `35c89a10-Jeeter-Logo.png` | 1080x1080 | 1 (home 1) | 0 | 0.12 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0285 | `7bf3d43d-Simpler-Daze-Logo.png` | 1080x1080 | 1 (home 1) | 0 | 0.54 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0286 | `9e1c72f1-Strane-Logo.png` | 1080x1080 | 1 (home 1) | 0 | 0.59 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0287 | `763b69dc-Wana-Logo.png` | 1080x1080 | 1 (home 1) | 0 | 0.62 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0366 | `690c96bd-Treeworks-400px.png` | 416x171 | 1 (event 1) | 0 | 0.92 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0367 | `f4ffe9a6-Vangarden_logo_200px.png` | 403x200 | 1 (event 1) | 0 | 0.16 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0373 | `4e56cc74-levia-logo-bottom-type-opt.png` | 340x206 | 1 (event 1) | 0.58 | 0.63 | transparent with light or colour ink: reads on dark glass; a light chip is optional |
| img0382 | `0ff6d75e-havn_stingers_logos_240px.png` | 240x200 | 1 (event 1) | 0 | 0.84 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0383 | `71d7f4bc-Cann-200px.png` | 200x219 | 1 (event 1) | 0 | 0.94 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0384 | `ffaab36e-Chill-200px-2.png` | 200x219 | 1 (event 1) | 0 | 0.06 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0385 | `0ad1f431-Good-Feels_Good-Vibes_200px.png` | 200x219 | 1 (event 1) | 0 | 0.72 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0386 | `7e3bb837-nova-farms-brand-pop-up-logo_200px.png` | 200x200 | 1 (event 1) | 0 | 0.9 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0387 | `4697bb47-natures-heritage-logo_200.png` | 200x106 | 1 (event 1) | 0 | 0.9 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0388 | `714900ed-wyld-logo-200.png` | 200x130 | 1 (event 1) | 0 | 0.9 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0389 | `6cc55502-Jeeter_HUD_200px.jpg` | 200x121 | 1 (event 1) | 0 | 0.63 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0390 | `ad74c027-Jeeter_black_web_20px.png` | 200x88 | 1 (event 1) | 0.51 | 0.04 | TRANSPARENT with dark ink: needs a light chip on dark glass |
| img0391 | `104bec1a-perpetual_logo_200px.png` | 200x115 | 1 (event 1) | 0 | 0.08 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0392 | `a82a8bbb-U4EA_Farms_logo_200px.png` | 200x200 | 1 (event 1) | 0 | 0.9 | OPAQUE WHITE/LIGHT box (no alpha): present it on a light chip (a white rounded card) so the box reads as intentional on dark glass |
| img0393 | `b74b6f8a-hellavated-baja-blastoff_200px.png` | 200x238 | 1 (event 1) | 0 | 0.65 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |
| img0394 | `9136c0df-sparq_logo.jpg` | 191x72 | 1 (event 1) | 0 | 0.75 | opaque artwork with its own coloured or dark background: show as a rounded tile; no chip needed |

## 9. Text baked into images

### 9a. Specials banners (deal text exists only in the pixels and the specials post title)

| id | File | Baked text (verified by eye) | Pages |
|---|---|---|---|
| img0108 | `1f6b6f4d-0bd369ba-ee40-4d64-9cc5-1cd101bd44f0.jpeg.jpeg` | 1G CULTIVATOR CLASSIC CONCENTRATES \| Buy 5 for $90 \| Buy 10 for $160 | 3 (home 1, special 2) |
| img0109 | `74fe9f00-14b449ff-d179-4bb8-800c-c17a8d767c7f.jpeg.jpeg` | HAPPY VALLEY PRE-ROLL 7PKS \| Buy 2 for $75 | 3 (home 1, special 2) |
| img0110 | `62525e9b-68b550e4-c9b1-4bf2-b9a8-9401ba467545.jpeg.jpeg` | KIVA CHOCOLATES \| Buy 2 for $32.50 | 3 (home 1, special 2) |
| img0111 | `a099726a-6aaa429d-2e31-4e8a-9c2a-6af7c20b04d0.jpeg.jpeg` | PREMIUM 3.5G FLOWER \| 2 for 10% OFF \| 4 for 15% OFF \| 8 for 20% OFF | 3 (home 1, special 2) |
| img0112 | `87019394-761f4984-92f8-4471-88b6-ea4486ad7ca3.jpeg.jpeg` | GLORIOUS MOONROCKS \| Buy 2 for $70 \| Buy 5 for $160 | 3 (home 1, special 2) |
| img0113 | `3184124b-8cf109bc-bdd3-4b44-b393-16121cb8b9a5.jpeg.jpeg` | EUREKA DISPOSABLES \| Buy 2 for $40 | 3 (home 1, special 2) |
| img0114 | `790cbd58-9616d019-3f82-4688-abef-63c6f3c81e13.jpeg.jpeg` | WANA GUMMIES \| Buy 2 for $55 | 3 (home 1, special 2) |
| img0115 | `b9980832-cf9b880b-ed5d-4803-b3ac-bdb4e62ebd26.jpeg.jpeg` | INFUSED PRE-ROLLS \| Buy 2 for $20 | 3 (home 1, special 2) |
| img0116 | `051bbd3f-d32685ca-f8d3-426d-ae97-85752e981e4b.jpeg.jpeg` | Jeeter INFUSED 5PK OF PRE-ROLLS \| Buy 2 for $95 \| Buy 4 for $180 \| Buy 6 for $255 \| Buy 10 for $380 | 3 (home 1, special 2) |
| img0117 | `912a5317-e7d46cba-7bcb-41ab-9404-bc45b71eb130.jpeg.jpeg` | WAVEZ INFUSED PRE-ROLLS \| Buy 10 for $75 \| Buy 20 for $135 \| Buy 30 for $180 | 3 (home 1, special 2) |
| img0118 | `2da057ef-f16d5d71-5e9f-4587-ac5e-a5864be09029.jpeg.jpeg` | MINDY'S GUMMIES \| Buy 8 for $100 | 3 (home 1, special 2) |
| img0119 | `c4d16fab-f264b096-2519-409a-8754-5b427197ed89.jpeg.jpeg` | CHILL MEDICATED 500MG SYRUPS \| Buy 2 for $65 | 3 (home 1, special 2) |
| img0177 | `8bd2bc55-544da0a3-d35e-491d-8eca-b97e6690bc68.jpeg.jpeg` | 1G CARTRIDGES \| Buy 2 for $36 | 2 (special 2) |
| img0178 | `2c9161a3-6def7ad4-02c9-4012-9093-9013fa10d658.jpeg.jpeg` | ZONKED SLEEPY GUMMIES / HASHABLES (brand wordmarks) \| Buy 2 for $35 | 2 (special 2) |
| img0179 | `2eea8f1e-8610df32-ef46-4f5c-9136-a363cb82b93c.jpeg.jpeg` | DISPOSABLES \| 2 for 10% OFF | 2 (special 2) |
| img0180 | `cb08432a-951f0dfe-73b3-46e1-a385-165d625fcc69.jpeg.jpeg` | 1G CONCENTRATES \| 2 for 10% OFF \| 5 for 15% OFF \| 10 for 25% OFF | 2 (special 2) |
| img0181 | `03e39bfe-b592a693-48ee-4b50-86e1-f85ef152513f.jpeg.jpeg` | AFFORDABLE OUNCES | 2 (special 2) |
| img0304 | `40e12ae3-October-12-Tuesday.png` | $12 TUESDAY \| 3.5G of FLOWER \| 10/20/26 (with the Blackstone Valley Cannabis mark) | 1 (special 1) |
| img0305 | `8a6f6d48-October-28g-Simpler-Daze-Sunday.png` | 28G SIMPLER DAZE SUNDAY \| Buy 2 for $140 | 1 (special 1) |
| img0306 | `b578dc88-October-2G-Dispo-Tuesday.png` | 2G DISPO TUESDAY \| $40 EACH | 1 (special 1) |
| img0307 | `9c515578-October-Double-Baked-BOGO-765-x-330.png` | DOUBLE BAKED RSO CHOCOLATES \| Only Available Friday, October 16th \| Buy 2 for $12.50 | 1 (special 1) |
| img0308 | `2b6afbb7-October-Wax-Wana-Wednesday.png` | WAX & WANA WEDNESDAY \| $20 1G CONCENTRATES \| $25 WANA GUMMIES | 1 (special 1) |

Transcribed by eye from the contact sheet, then checked against a near-native render (`tmp/understand/imagery/sheets/specials-large.png`). 12 more specials images (on category and specials pages) are MISSING (section 13).

**Compliance (docs/COMPLIANCE.md, item 2):** these banners use terms the CCC says it cites ("X% off", "Buy X for $Y"). The banners stay as they are, flagged there and not amplified.
- Using a transcription as alt text only mirrors the image for accessibility (WCAG 1.1.1) and adds no new UI. Still, confirm it with the compliance owner before shipping.
- Never turn this text into sale badges, strike-through prices, "% off" chips or countdown timers.

### 9b. Tiles marked REPLACE: the label words to carry as live text

- Home category tiles (each also shows a "LEARN MORE" pill): Seeds, Ounces of Flower, Offers, Accessories, Terpenes, Cannabinoids, Top Sellers, Staff Picks, Indica Products, Hybrid Products, Sativa Products.
- 1080x1080 shop tiles (each shows "SHOP NOW"): PRE-ROLLS, CANNABIS SEEDS, EDIBLES, FLOWER, VAPORIZERS.
- Loyalty-page tiles (each shows "Shop Now"): APPAREL, CBD, DAB TOOLS, GLASSWARE, GRINDERS, ROLLING SUPPLIES.
- Bitmap UI: the "SHOP NOW" button image (Shop-Now-Button-200px.png on 12 pages, 11 of them events), and the pot-leaf bullet icons on home.
- Checked: the home record of `audit/content-inventory.json` does **not** contain "Staff Picks", "Top Sellers", "Ounces of Flower" or "Sativa Products" as text. On home these words exist only in the images, so rebuilding the tiles as live text adds them to the page text. Declare that in the content ledger. The same words occur elsewhere in the inventory (8, 4, 26 and 4 case-insensitive hits); where is UNVERIFIED.

## 10. Generation slots (fal stills)

The governing allowed/not-allowed table is `docs/COMPLIANCE.md` section 2 (facts lane). These slots are stricter: they contain no people at all.

Rules for every slot:
- No people consuming cannabis, and no person at all.
- No cartoon characters.
- No product packaging or brand marks.
- No text or numerals.
- No medical or health framing.
- Nothing presented as the real store or a named Cape Cod landmark.
- Avoid candy-like edibles, which could appeal to minors.
- Every output is reviewed by eye and labelled with the IPTC `trainedAlgorithmicMedia` XMP (`tools/ai-label.xmp`).
- Every call is booked in `audit/generated-images.json` against the $15 cap. Pricing per call is UNVERIFIED here.

| id | Role | Page / section | Aspect | Rendered (1440; 1280 @1.5) | Cut-out | Draft prompt | Notes |
|---|---|---|---|---|---|---|---|
| G01 | HERO backdrop layer | home / hero (behind the glass hero panel) | 16:9 | 1440 x ~800 CSS full-bleed at 1440; 1920 x 1067 device px at 1280 @1.5 (+15% parallax overscan -> ~2210 px) | no | Wide atmospheric photograph of low coastal dunes covered in beach grass at first light, soft pale sky-blue haze, gentle bokeh, calm and airy, large clean negative space in the upper two thirds, editorial landscape photography, no buildings, no lighthouse, no people, no text | The client's own Sunset-Orleans.jpg (5487x3658) is the preferred real option; this slot is the generic alternative or a second parallax layer. |
| G02 | protrusion cut-out | home / hero, overlapping down into the specials band | 4:5 | ~380 x 475 CSS at 1440; ~570 x 713 device at 1280 @1.5 | yes | Macro studio photograph of one whole cannabis flower bud, completely inside the frame with generous margin on all sides, frosty trichomes catching soft daylight, crisp focus front to back, plain pale sky-blue seamless background, no text, no packaging, no hands | The fal test (tmp/fal-test/bud-macro.jpg) passed the safety filter, but its cut-out keeps a blurred second bud clipped at the left frame edge; ask for the whole subject in frame. |
| G03 | protrusion cut-out | home + sitewide / hero bottom-left foreground; reused at section seams and on the 404 page | 3:2 | ~520 x 347 CSS; ~780 x 520 device | yes | A single tuft of American beach grass with a few seed heads, the whole plant fully inside the frame, backlit by soft golden light, plain light background for clean extraction, no dune horizon, no text |  |
| G04 | protrusion cut-out (echoes the logo's whale tail) | home / seam between the brands strip and the footer | 4:3 | ~360 x 270 CSS; ~540 x 405 device | yes | Photograph of a humpback whale tail fluke rising from calm ocean water with a few falling droplets, soft side light at dawn, the whole fluke and splash fully inside the frame, plain soft grey-blue sky behind, no boats, no people, no text | A photographic fluke, never a redraw of the logo glyph; keep it small and secondary to the real logo. |
| G05 | floating parallax cut-outs | sitewide / section seams (sea-glass shards drifting at different parallax speeds) | 1:1 | 60-140 CSS each; up to 210 device | yes | Three separate pieces of frosted sea glass in pale aqua, seafoam green and clear, spaced apart, top-down macro on a plain white background, soft shadowless light, no sand, no text |  |
| G06 | SECTION/BACKGROUND | home + /specials / specials band behind the glass deal cards | 21:9 | 1440 x ~600 CSS; 2160 x 900 device | no | Soft-focus close-up of wet sea glass and smooth pebbles in shallow clear water, sun-dappled caustic light, palette of pale aqua, sky blue and deep teal, shallow depth of field, abstract and calm, no text | Brand colours to match: #C0E9FA, #02A7EB, #015375. |
| G07 | SECTION/BACKGROUND | home + /brands / brands strip behind the logo chips | 16:9 | 1440 x ~420 CSS; 2160 x 630 device | no | Close-up texture of weathered grey cedar shingles in soft morning side light, gentle shadows, salt-weathered patina, muted greys with a cool blue cast, shallow depth of field, no windows, no signage, no text | A generic texture, never presented as the store's wall. |
| G08 | SECTION/BACKGROUND | home / category tiles band | 16:9 | 1440 x ~700 CSS; 2160 x 1050 device | no | Overhead macro of fresh green cannabis fan leaves with dew drops, soft diffused daylight, cool green and blue tones, darker edges, calm open areas, editorial botanical photography, no text |  |
| G09 | CATEGORY TILE image | /categories/flower (and the Flower tile if it is rebuilt) / category header | 3:2 | ~480 x 320 CSS; 720 x 480 device | no | Extreme macro of cannabis flower trichomes, glistening resin heads in amber and white, soft daylight, shallow depth of field, pale sky-blue background bokeh, no text | The client's trichomes.jpg (lossy=0 master fetched) may cover this; generate only if the design needs a second macro. |
| G10 | SECTION/BACKGROUND | /categories/concentrates / category header band | 21:9 | 1440 x ~500 CSS; 2160 x 750 device | no | Macro photograph of translucent golden amber cannabis resin, glassy surface with tiny bubbles, warm backlight, abstract close-up, no tools, no packaging, no hands, no text |  |
| G11 | SECTION image | /categories/tinctures + education hub / category header / feature card | 3:2 | ~720 x 480 CSS; 1080 x 720 device | no | Still life of unlabeled amber glass apothecary bottles with glass stoppers on a pale stone surface beside a sprig of green cannabis leaf, soft coastal daylight, clean pale blue background, minimal, no droppers, no labels, no text, no people, no hands | Check every output for invented label text. Avoid droppers, pills or any pharmacy look (COMPLIANCE R6/R13: no medical symbols or curative framing). |
| G12 | protrusion cut-out | education pages, /about-cape-cod-cannabis / section seams | 4:5 | ~300 x 375 CSS; 450 x 563 device | yes | A single whole cannabis fan leaf with seven leaflets, fully inside the frame with margin, crisp edges, natural green, studio light on a plain white background, no text |  |
| G13 | terpene botanical cut-out | /terpenes/limonene + terpenes hub / beside the existing terpene tile | 1:1 | ~260 CSS; 390 device | yes | A halved lemon and a curl of orange peel, glistening, fully inside the frame, studio macro on a plain white background, no text | Botanicals named on the client's own terpene tile. |
| G14 | terpene botanical cut-out | /terpenes/pinene / beside the terpene tile | 1:1 | ~260 CSS; 390 device | yes | A sprig of fresh pine needles with a small green pine cone, fully inside the frame, studio macro on a plain white background, no text |  |
| G15 | terpene botanical cut-out | /terpenes/linalool / beside the terpene tile | 1:1 | ~260 CSS; 390 device | yes | A small bundle of fresh lavender sprigs, fully inside the frame, studio light on a plain white background, no text |  |
| G16 | terpene botanical cut-out | /terpenes/caryophyllene / beside the terpene tile | 1:1 | ~260 CSS; 390 device | yes | A small heap of whole black peppercorns with a few cloves, top-down macro on a plain white background, fully inside the frame, no text |  |
| G17 | terpene botanical cut-out | /terpenes/humulene / beside the terpene tile | 1:1 | ~260 CSS; 390 device | yes | Two fresh green hop cones with one leaf, fully inside the frame, studio macro on a plain white background, no text |  |
| G18 | terpene botanical cut-out | /terpenes/myrcene / beside the terpene tile | 1:1 | ~260 CSS; 390 device | yes | Half a ripe mango and a sprig of fresh thyme, fully inside the frame, studio macro on a plain white background, no text | Mango and thyme are listed on the client's Myrcene tile. |
| G19 | SECTION/BACKGROUND | /cannabinoids hub + 22 cannabinoid pages / page header band | 21:9 | 1440 x ~500 CSS; 2160 x 750 device | no | Abstract macro of cannabis trichome heads like tiny crystal spheres, cool blue-white light, deep teal shadows, shallow depth of field, calm and scientific, no text, no drawn molecules | No medical framing: no lab coats, pills or syringes. |
| G20 | HERO | /cannabis-101 + Start Here / Cannabis 101 blog category pages / page hero | 16:9 | 1440 x ~600 CSS; 2160 x 900 device | no | Bright minimal still life: one dried cannabis flower in a small clear glass apothecary jar beside a closed plain notebook and a pencil on pale linen, soft window light, pale blue tones, no writing, no text, no labels, no people | Reject any output with lettering. |
| G21 | SECTION/BACKGROUND | /about-cape-cod-cannabis / behind the real staff carousel | 16:9 | 1440 x ~900 CSS; 2160 x 1350 device | no | Soft-focus ocean horizon in morning sea mist, pale sky-blue and silver tones, gentle light rays, minimal and airy, no boats, no lighthouse, no people, no text | Atmosphere only; the people on this page stay the real staff photos. |
| G22 | SECTION/BACKGROUND | /events-calendar + event pages / page header band behind glass event cards | 21:9 | 1440 x ~500 CSS; 2160 x 750 device | no | Dusk over low dunes and beach grass, warm last light fading to a deep teal sky, soft and calm, wide negative space, no buildings, no landmarks, no people, no text |  |
| G23 | SECTION/BACKGROUND | sitewide / footer layer | 21:9 | 1440 x ~420 CSS; 2160 x 630 device | no | Top-down view of a deep teal ocean surface with gentle ripples and soft light caustics, dark navy to teal tones, calm, even texture, no foam lines, no boats, no text | Footer text sits on glass over it: keep it low-contrast. Navy reference #015375. |
| G24 | divider cut-out | sitewide / a wave-crest edge crossing section seams | 4:1 | 1440 x ~360 CSS; 2160 x 540 device | yes | A long low breaking wave crest with white foam seen from the side, isolated against a plain light sky, the foam spanning the full width, soft light, no surfers, no shore, no text | Foam cut-outs are hard to extract cleanly: test one before committing. |
| G25 | SECTION/BACKGROUND | 75 town/geo landing pages (/recreational/*, /*dispensary-near*) / header band behind the real town photo | 16:9 | 1440 x ~600 CSS; 2160 x 900 device | no | A sandy coastal path through beach grass toward the sea under a soft blue sky, wide and calm, no buildings, no lighthouse, no signs, no recognizable landmark, no people, no text | Never captioned or alt-texted as any named town; the town is shown by its real photo. |
| G26 | SECTION/BACKGROUND (optional) | age gate (every page, first visit) / full-screen backdrop at low opacity | 16:9 | full viewport, blurred 16px at 20% opacity: 1600 px wide is ample | no | Soft pale sky-blue coastal haze over gentle dunes, very low contrast, dreamy, no landmarks, no people, no text | Only if the design drops the current unidentified-lighthouse photo (CCC-Beach-Team.webp). |
| G27 | SECTION/BACKGROUND | home loyalty band + /shop-your-loyalty-points / behind the loyalty glass panel | 21:9 | 1440 x ~480 CSS; 2160 x 720 device | no | Flat lay of smooth beach stones and pale sea glass on fine white sand, soft overhead daylight, airy and bright, no shells with markings, no text |  |

## 11. Motion loops (Higgsfield)

| id | Where | Idea | Source | Aspect | Rules |
|---|---|---|---|---|---|
| M1 | home hero (behind the glass hero panel) | Beach grass swaying in a gentle breeze at golden hour, locked-off camera, 6-8 s seamless loop | image-to-video from the G01 still (or the client's Sunset-Orleans photo, if the client agrees to animate it) | 16:9 | Slow and calm: no flashing, no cuts, no camera shake, low contrast so glass text stays legible. A poster frame for prefers-reduced-motion and slow networks; muted, no audio. |
| M2 | Flower category header or the home shop band | A frosty bud turning slowly (about 15 degrees) with soft specular glints on the trichomes, pale sky-blue background, 5 s ping-pong loop | image-to-video from the G02 or G09 still | 4:5 or 1:1 | Same as M1; no smoke, no hands, no packaging. |
| M3 | global footer layer | Top-down deep-teal water with soft light caustics drifting slowly, 8 s seamless loop | image-to-video from the G23 still | 21:9 | Very low contrast; must not reduce footer text contrast; still poster under prefers-reduced-motion. |

The site already links 15 brand and campaign videos (`audit/media-inventory.json`). All are same-origin, none was downloaded, and they are content, not motion design.

## 12. Full inventory by role

Columns: id, best local file (under `assets/source/` unless noted), intrinsic px, size, format, pages using it, decision, and the reason (plus eye-review notes). Every source URL and variant is in `image-roles.json` (`sources`, `files`).

### LOGO/BRAND (18)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0003 | `e4ae712e-CCC-Logo-Footer.webp` | 700x568 | 32 KB | webp | 745 (home 1, date-archive 56, page 113, brands-index 1, brand 252, cannabinoid 22, category 67, blog-category 5, geo-page 16, effect 11, event 61, recreational-geo 61, special 18, store 2, strain 6, terpene 53) | KEEP | Primary logo (700x568, transparent WebP). Footer renders it at max 175 px wide (kit.css .elementor-element-daa3a09 img{max-width:175px}). WebP is byte-identical at every CDN setting, so this is the best CDN master; ask the client for a vector. |
| img0004 | `1c48453a-CCC_Logo_320px-2.png` | 370x306 | 6 KB | png | 745 (home 1, date-archive 56, page 113, brands-index 1, brand 252, cannabinoid 22, category 67, blog-category 5, geo-page 16, effect 11, event 61, recreational-geo 61, special 18, store 2, strain 6, terpene 53) | KEEP | Age-gate logo (town-sign logo on a white card with shadow). Use audit/prelock/logo-agegate.png (origin master, 30,436 B): CDN lossy=0 is pixel-identical to it (SSIM 1.000), while the on-disk lossy=2 copy is quantised (6,461 B). |
| img0005 | `d0c3b5e9-cropped-CCC-Favicon-1-192x192.webp` | 192x192 | 4 KB | webp | 745 (home 1, date-archive 56, page 113, brands-index 1, brand 252, cannabinoid 22, category 67, blog-category 5, geo-page 16, effect 11, event 61, recreational-geo 61, special 18, store 2, strain 6, terpene 53) | KEEP | Site icon (blue whale tail). Largest on disk is 192 px; build favicons/touch icons from it, ideally from a client vector or 512 px master. |
| img0007 | `84e934d9-CCC-Logo-pr1hbosryw7qhdibj7baymy1z2tyhsipa5ll50lqgg.webp` | 700x568 | 17 KB | webp | 744 (home 1, date-archive 56, page 112, brands-index 1, brand 252, cannabinoid 22, category 67, blog-category 5, geo-page 16, effect 11, event 61, recreational-geo 61, special 18, store 2, strain 6, terpene 53) | KEEP | Header logo (Elementor thumb of CCC-Logo.webp), rendered max 108x88 px (kit.css .elementor-element-716f931 img{max-width:108px;height:88px}); 700 px source covers 3x DPR. |
| img0008 | `MISSING` | MISSING |  |  | 492 (home 1, date-archive 56, page 69, brands-index 1, brand 252, cannabinoid 2, category 67, blog-category 5, effect 1, event 6, recreational-geo 5, special 18, store 2, strain 6, terpene 1) | KEEP | Schema/og logo URL (same-origin, refused by the block ledger). Fetched from the CDN in the masters probe: 700x500 WebP, tmp/understand/imagery/masters/03-*.webp. MISSING: same-origin URL refused by the block ledger |
| img0028 | `c0c34846-CCC_Logo_650px-geo-tag-r9v1ohpw5zerbd7bkhgpgccbma2ezjddi6xfhghm0u.jpg` | 300x275 | 9 KB | jpeg | 60 (event 60) | REPLACE | The logo saved as a geo-tagged JPEG (no transparency, heavy for a flat logo). Render the PNG/WebP logo master instead; keep the URL only if the SEO lane needs it as an og:image. |
| img0050 | `1a7e34ec-CCC_Logo_650px-geo-tag-1.jpg` | 648x548 | 589 KB | jpeg | 7 (page 3, store 1, geo-page 2, home 1) | REPLACE | The logo saved as a geo-tagged JPEG (no transparency, heavy for a flat logo). Render the PNG/WebP logo master instead; keep the URL only if the SEO lane needs it as an og:image. |
| img0068 | `2119ffa4-Canna-101-CCC-Logo.png` | 449x407 | 15 KB | png | 5 (page 5) | KEEP | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. |
| img0070 | `80866f34-CCC_Logo_250px.png` | 250x200 | 6 KB | png | 5 (page 3, event 2) | KEEP | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. |
| img0077 | `95c5c457-CCC_Logo_650px.png` | 648x548 | 32 KB | png | 4 (page 4) | KEEP | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. |
| img0079 | `572b659d-CCC_Logo_320px.png` | 320x256 | 7 KB | png | 4 (page 4) | KEEP | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. |
| img0184 | `60722800-capecodcannabislogo-america.png` | 600x490 | 53 KB | png | 2 (page 2) | KEEP | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. |
| img0206 | `3f6a76d9-CCC-generic-pop-up-logo_200px.png` | 200x200 | 24 KB | png | 2 (event 2) | KEEP | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. |
| img0368 | `8bddce12-5th-Annivesary-400px-x-400px-blue.png` | 400x400 | 20 KB | png | 1 (page 1) | KEEP | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. |
| img0369 | `f47a5465-Chrismas-CCC-Logo-600x600-1-repdlskgl9uzeryzrtulo7t0hgenmk4indg0lg1hnk.png` | 400x400 | 17 KB | png | 1 (page 1) | KEEP | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. |
| img0372 | `ab17e58d-5th-Anniversary-Logo-2.png` | 353x286 | 43 KB | png | 1 (page 1) | KEEP | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. |
| img0413 | `MISSING` | MISSING |  |  | 1 (page 1) | REPLACE | The logo saved as a geo-tagged JPEG (no transparency, heavy for a flat logo). Render the PNG/WebP logo master instead; keep the URL only if the SEO lane needs it as an og:image. MISSING: same-origin URL refused by the block ledger |
| img0417 | `MISSING` | MISSING |  |  | 1 (page 1) | KEEP | Logo variant (size, seasonal or campaign) used inside a post or as an og image; keep where it is used. MISSING: same-origin URL refused by the block ledger |

### HERO (7)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0046 | `31453cdc-FAQ-banner.jpg` | 1900x600 | 194 KB | jpeg | 9 (date-archive 2, blog-category 3, page 4) | KEEP | Post or page header banner (1920x250; FAQ 1900x600). |
| img0047 | `d25caf10-Choice-Awards-2026-Winner-Blog-Banner-1920x250-1.png` | 1920x250 | 72 KB | png | 8 (date-archive 1, blog-category 5, page 2) | KEEP | Post or page header banner (1920x250; FAQ 1900x600). |
| img0051 | `ce779115-Memorial-Day-Blog-Banner-Image-1.png` | 1920x250 | 674 KB | png | 6 (date-archive 2, blog-category 1, page 3) | KEEP | Post or page header banner (1920x250; FAQ 1900x600). |
| img0052 | `a74765ac-Discover-Wellfleet-1920x250-1.png` | 1920x250 | 217 KB | png | 6 (date-archive 1, blog-category 3, page 2) | KEEP | Post or page header banner (1920x250; FAQ 1900x600). |
| img0060 | `d9f0e811-OCMF-1920x250-1.png` | 1920x250 | 196 KB | png | 5 (date-archive 1, blog-category 2, page 2) | KEEP | Post or page header banner (1920x250; FAQ 1900x600). |
| img0061 | `7e09fbd6-Moonrock-Banner-1920x250-1.png` | 1920x250 | 193 KB | png | 5 (date-archive 1, blog-category 2, page 2) | KEEP | Post or page header banner (1920x250; FAQ 1900x600). |
| img0075 | `7f389578-Blog-Banner-Image-1920x250-1.png` | 1920x250 | 588 KB | png | 4 (date-archive 1, blog-category 1, page 2) | KEEP | Post or page header banner (1920x250; FAQ 1900x600). |

### SECTION/BACKGROUND (18)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0001 | `13096766-CCC-Beach-Team.webp` | 1920x1674 | 577 KB | webp | 745 (home 1, date-archive 56, page 113, brands-index 1, brand 252, cannabinoid 22, category 67, blog-category 5, geo-page 16, effect 11, event 61, recreational-geo 61, special 18, store 2, strain 6, terpene 53) | KEEP | Age-gate backdrop (--ag-background-image at opacity 0.2, blur 16px, over #C0E9FA; inline style age-gate-custom-inline-css). Despite its name it shows a lighthouse on rocks at sunrise with beach grass, not the team; the lighthouse is unidentified (UNVERIFIED whether on Cape Cod). Optional swap: slot G26. Rendered only on the age gate; everywhere else it is an inline CSS variable. |
| img0045 | `8794d7d7-Cannabis-Leafs-with-Black-Background-Homepage.png` | 2160x1132 | 848 KB | png | 9 (date-archive 3, blog-category 3, page 3) | KEEP | A former home background, now a post featured/hero background. A strong dark/colour field behind glass. lossy=0 master is 4.7x the bytes (SSIM 0.939 vs on-disk), re-fetch it. lossy=0 master fetched: 4,083,420 B vs 868,393 B on disk at 2160x1132 (SSIM 0.939). Use tmp/understand/imagery/masters/23-Leafs_black_bg_homepage_lossy0.png. |
| img0099 | `d092c7e1-hyannis-ma.png` | 800x627 | 318 KB | png | 3 (geo-page 3) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0127 | `b6ab1a38-Cape-Cod-Homepage-Background-2.png` | 2160x1132 | 740 KB | png | 2 (date-archive 1, page 1) | KEEP | A former home background, now a post featured/hero background. A strong dark/colour field behind glass. lossy=0 master is 4.7x the bytes (SSIM 0.939 vs on-disk), re-fetch it. |
| img0328 | `298619a8-bourne-ma.png` | 640x480 | 124 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0329 | `e233adf0-brewster-ma.png` | 640x480 | 173 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0330 | `f3286874-chatham-ma.png` | 640x480 | 95 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0331 | `08558b1b-dennis-beach.png` | 640x480 | 108 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0332 | `fee6628e-eastham-ma.png` | 640x480 | 117 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0333 | `5f79e062-harwich-ma.png` | 640x480 | 126 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0334 | `c0d2a9d3-mashpee-ma.png` | 640x480 | 182 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0335 | `97965062-orleans-ma.png` | 640x480 | 146 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0336 | `bc62f9f8-provincetown-ma.png` | 640x480 | 164 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0337 | `4e6a5f84-sandwich-ma.png` | 640x480 | 608 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0338 | `d4877989-truro-ma.png` | 640x480 | 125 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0339 | `d7cb20e4-yarmouth-ma.png` | 640x480 | 139 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| img0340 | `c629fdc6-lecount-hollow2.png` | 631x480 | 74 KB | png | 1 (geo-page 1) | KEEP | Photo of the named town or landmark on its geo landing page (a real place). Never replace with a generated landmark. |
| imgX001 | `tmp/.../masters/01-pattern_2022_09_as_used.webp` | 179x114 | 1 KB | webp | CSS | KEEP | Brand pattern tile, repeated as an Elementor motion-effects background layer over #C0E9FA (prelock/kit.css, selector .elementor-element-27b81eb > .elementor-motion-effects-container > .elementor-motion-effects-layer::before). Not in image-inventory.json because no stylesheet was downloaded (sr-assets: stylesheets 0/173). 2021/12 and 2022/09 copies are byte-identical. Saved only to tmp/understand/imagery/masters/ (this lane may not write assets/); the build lane must copy it into assets/. |

### CATEGORY TILE (88)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0010 | `00ad29fb-CLOUD-CITY-Effect-ClearMind.webp` | 1200x600 | 44 KB | webp | 73 (effect 1, geo-page 16, recreational-geo 56) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0011 | `7b252982-CLOUD-CITY-Effects-Calm.webp` | 1200x600 | 69 KB | webp | 73 (effect 1, geo-page 16, recreational-geo 56) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0012 | `f33f681c-CLOUD-CITY-Effects-Dutchie-Creative.webp` | 1200x600 | 78 KB | webp | 73 (effect 1, geo-page 16, recreational-geo 56) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0013 | `1b77a302-CLOUD-CITY-Effects-Dutchie-Energetic.webp` | 1200x600 | 41 KB | webp | 73 (effect 1, geo-page 16, recreational-geo 56) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0014 | `c941c2eb-CLOUD-CITY-Effects-Dutchie-Sleepy.webp` | 1200x600 | 45 KB | webp | 73 (geo-page 16, recreational-geo 56, effect 1) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0015 | `d1b5af85-CLOUD-CITY-Effects-Focused.webp` | 1200x600 | 35 KB | webp | 73 (effect 1, geo-page 16, recreational-geo 56) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0016 | `95a153b0-CLOUD-CITY-Effects-Happy.webp` | 1200x600 | 34 KB | webp | 73 (effect 1, geo-page 16, recreational-geo 56) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0017 | `40b13f1c-CLOUD-CITY-Effects-Inspired.webp` | 1200x600 | 33 KB | webp | 73 (effect 1, geo-page 16, recreational-geo 56) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0018 | `dec593d8-CLOUD-CITY-Effects-Relaxed.webp` | 1200x600 | 54 KB | webp | 73 (effect 1, geo-page 16, recreational-geo 56) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0019 | `45620464-Accessories-Tile-for-Website.png` | 1024x683 | 78 KB | png | 71 (effect 10, recreational-geo 56, strain 5) | KEEP | Category tile photo, no baked text. |
| img0020 | `27cbb41d-Beverages-Tile-for-Website-1.png` | 1024x683 | 1450 KB | png | 71 (effect 10, recreational-geo 56, strain 5) | KEEP | Category tile photo, no baked text. Eye review: shows LEVIA cans (third-party packaging). |
| img0021 | `8137552b-CBD-Tile-for-Website.png` | 1024x683 | 207 KB | png | 71 (effect 10, recreational-geo 56, strain 5) | KEEP | Category tile photo, no baked text. |
| img0022 | `04d78e05-Concentrates-Tile-for-Website.png` | 1024x683 | 182 KB | png | 71 (effect 10, recreational-geo 56, strain 5) | KEEP | Category tile photo, no baked text. |
| img0023 | `7094f275-Flower-Tile-for-Website.png` | 1024x683 | 475 KB | png | 71 (effect 10, recreational-geo 56, strain 5) | KEEP | Category tile photo, no baked text. lossy=0 master fetched: 1,541,047 B vs 486,853 B on disk at 1024x683 (SSIM 0.968). Use tmp/understand/imagery/masters/22-Flower_tile_lossy0.png. |
| img0024 | `0461edd9-Pre-roll-Tile-for-Website-1.png` | 1024x683 | 216 KB | png | 71 (effect 10, recreational-geo 56, strain 5) | KEEP | Category tile photo, no baked text. Eye review: a hand holding a lit joint with smoke (consumption-adjacent). |
| img0025 | `98779c22-Tinctures-Tile-for-Website.png` | 1024x683 | 258 KB | png | 71 (effect 10, recreational-geo 56, strain 5) | KEEP | Category tile photo, no baked text. |
| img0026 | `e5d25b22-Topicals-Tile-for-Website.png` | 1024x683 | 129 KB | png | 71 (effect 10, recreational-geo 56, strain 5) | KEEP | Category tile photo, no baked text. |
| img0027 | `a4a94657-apparel.png` | 300x200 | 26 KB | png | 71 (effect 10, recreational-geo 56, strain 5) | KEEP | Category tile photo, no baked text. |
| img0030 | `c9066120-Edibles-Tile-for-Website-1.png` | 1024x683 | 234 KB | png | 57 (page 1, recreational-geo 56) | KEEP | Category tile photo, no baked text. Eye review: gummies/chocolate imagery. Keep as the client's photo; do NOT generate candy-like edibles (could appeal to minors). |
| img0031 | `09ef1bf7-Cartridge-Tile-for-Website-1.png` | 1024x683 | 266 KB | png | 56 (recreational-geo 56) | KEEP | Category tile photo, no baked text. |
| img0034 | `69eb1628-Calm-200x100-1-qp61amsg9vjlumu7zoz2jjg1y7iexzojfdwkxgsjjc.jpg` | 200x100 | 5 KB | jpeg | 16 (geo-page 16) | REMOVE | A separate 200x100 upload of the same effect photo as the 1200x600 CLOUD-CITY master. Build small sizes from the master. |
| img0035 | `2a96c289-ClearMind-200x100-1-qp61bgvackos65mj41z4rbusyje5sazy7is4abjy08.jpg` | 200x100 | 4 KB | jpeg | 16 (geo-page 16) | REMOVE | A separate 200x100 upload of the same effect photo as the 1200x600 CLOUD-CITY master. Build small sizes from the master. |
| img0036 | `a631efae-Creative-200x100-1-qp61c84lurq3iuixovrb9mz66pnszj05z9p77cfizs.jpg` | 200x100 | 6 KB | jpeg | 16 (geo-page 16) | REMOVE | A separate 200x100 upload of the same effect photo as the 1200x600 CLOUD-CITY master. Build small sizes from the master. |
| img0037 | `e98d9487-Energetic-200x100-1-qp61czdxcyrevjfc9pjhry3jevxg6r0dr0ma4db3zc.jpg` | 200x100 | 5 KB | jpeg | 16 (geo-page 16) | REMOVE | A separate 200x100 upload of the same effect photo as the 1200x600 CLOUD-CITY master. Build small sizes from the master. |
| img0038 | `dd6ebd5b-Focused-200x100-1-qp61dx84701qhi26s4629pk4sranvuqpvo3rebwxrc.jpg` | 200x100 | 4 KB | jpeg | 16 (geo-page 16) | REMOVE | A separate 200x100 upload of the same effect photo as the 1200x600 CLOUD-CITY master. Build small sizes from the master. |
| img0039 | `300ad8b7-Happy-200x100-1-qp61eohfp731u6ylcxy8s0oi0xkb32qxnf0ubcsiqw.jpg` | 200x100 | 6 KB | jpeg | 16 (geo-page 16) | REMOVE | A separate 200x100 upload of the same effect photo as the 1200x600 CLOUD-CITY master. Build small sizes from the master. |
| img0040 | `ce76ca88-Relaxed-200x100-1-qp61fgole85nihtmsa51utkbuhpbhzuvralepnmpk8.jpg` | 200x100 | 4 KB | jpeg | 16 (geo-page 16) | REMOVE | A separate 200x100 upload of the same effect photo as the 1200x600 CLOUD-CITY master. Build small sizes from the master. |
| img0041 | `77428b78-Sleepy-200x100-1-qp61965hn5jjsgyoj27ynwq8ompuyxvkk5de1yyl7s.jpg` | 200x100 | 4 KB | jpeg | 16 (geo-page 16) | REMOVE | A separate 200x100 upload of the same effect photo as the 1200x600 CLOUD-CITY master. Build small sizes from the master. |
| img0042 | `52a1202c-Edibles-768x512-1.png` | 768x512 | 99 KB | png | 15 (effect 10, strain 5) | KEEP | Category tile photo, no baked text. |
| img0043 | `d1194d76-Vaporizers-768x512-1.png` | 768x512 | 79 KB | png | 15 (effect 10, strain 5) | KEEP | Category tile photo, no baked text. Eye review: shows Strane-branded cartridges. |
| img0049 | `5970135b-Start-Here-Blog-Category-765x330-2.png` | 765x330 | 63 KB | png | 7 (blog-category 5, page 2) | KEEP | Blog category tile with its title and description baked in (text = content). |
| img0054 | `f7f827ae-Cannabis-101-Blog-Category-765x330-1.png` | 765x330 | 73 KB | png | 6 (blog-category 5, page 1) | KEEP | Blog category tile with its title and description baked in (text = content). |
| img0055 | `b63d0d3d-Cannabis-News-Blog-Category-765x330-1.png` | 765x330 | 84 KB | png | 6 (blog-category 5, page 1) | KEEP | Blog category tile with its title and description baked in (text = content). |
| img0056 | `9735581e-Cape-Cod-Lifestyle-Blog-Category-765x330-1.png` | 765x330 | 52 KB | png | 6 (blog-category 5, page 1) | KEEP | Blog category tile with its title and description baked in (text = content). |
| img0057 | `b8dcae8f-Inside-Cape-Cod-Cannabis-Blog-Category-765x330-1.png` | 765x330 | 78 KB | png | 6 (blog-category 5, page 1) | KEEP | Blog category tile with its title and description baked in (text = content). |
| img0076 | `3447f272-CBD-765x330-2b.png` | 765x330 | 39 KB | png | 4 (cannabinoid 2, page 2) | KEEP | Cannabinoid tile: name, effects and claimed benefits baked in (text = content; the health claims are the client's copy and must be carried verbatim if ever rebuilt as text). |
| img0100 | `1dcd7a64-CBDA-765x330-8b.png` | 765x330 | 73 KB | png | 3 (cannabinoid 2, page 1) | KEEP | Cannabinoid tile: name, effects and claimed benefits baked in (text = content; the health claims are the client's copy and must be carried verbatim if ever rebuilt as text). |
| img0101 | `d37e4f11-CBDV-765x330-7b.png` | 765x330 | 48 KB | png | 3 (cannabinoid 2, page 1) | KEEP | Cannabinoid tile: name, effects and claimed benefits baked in (text = content; the health claims are the client's copy and must be carried verbatim if ever rebuilt as text). |
| img0102 | `5b3f0718-CBG-765x330-3b.png` | 765x330 | 82 KB | png | 3 (cannabinoid 2, page 1) | KEEP | Cannabinoid tile: name, effects and claimed benefits baked in (text = content; the health claims are the client's copy and must be carried verbatim if ever rebuilt as text). |
| img0103 | `222903a1-CBN-765x330-4b.png` | 765x330 | 65 KB | png | 3 (cannabinoid 2, page 1) | KEEP | Cannabinoid tile: name, effects and claimed benefits baked in (text = content; the health claims are the client's copy and must be carried verbatim if ever rebuilt as text). |
| img0104 | `48566b12-THC-Delta-9-765x330-1c.png` | 765x330 | 100 KB | png | 3 (cannabinoid 2, page 1) | KEEP | Cannabinoid tile: name, effects and claimed benefits baked in (text = content; the health claims are the client's copy and must be carried verbatim if ever rebuilt as text). |
| img0105 | `e804dafc-THCA-765x330-9b-1.png` | 765x330 | 62 KB | png | 3 (cannabinoid 2, page 1) | KEEP | Cannabinoid tile: name, effects and claimed benefits baked in (text = content; the health claims are the client's copy and must be carried verbatim if ever rebuilt as text). |
| img0106 | `9489d6b8-THCV-765x330-6b.png` | 765x330 | 90 KB | png | 3 (cannabinoid 2, page 1) | KEEP | Cannabinoid tile: name, effects and claimed benefits baked in (text = content; the health claims are the client's copy and must be carried verbatim if ever rebuilt as text). |
| img0107 | `b80edb82-CBC-765x330-4b.png` | 765x330 | 57 KB | png | 3 (cannabinoid 2, page 1) | KEEP | Cannabinoid tile: name, effects and claimed benefits baked in (text = content; the health claims are the client's copy and must be carried verbatim if ever rebuilt as text). |
| img0167 | `98593750-Bisabolol-765x330-9b.png` | 765x330 | 91 KB | png | 2 (page 1, terpene 1) | KEEP | Terpene tile: name, aroma, effects and "also found in" baked in (text = content). |
| img0168 | `eb0c24e2-Caryophyllene-765x330-4b.png` | 765x330 | 91 KB | png | 2 (page 1, terpene 1) | KEEP | Terpene tile: name, aroma, effects and "also found in" baked in (text = content). |
| img0169 | `48727a56-Geraniol-765x330-9b.png` | 765x330 | 77 KB | png | 2 (page 1, terpene 1) | KEEP | Terpene tile: name, aroma, effects and "also found in" baked in (text = content). |
| img0170 | `5e35eed9-Humulene-765x330-6b.png` | 765x330 | 88 KB | png | 2 (page 1, terpene 1) | KEEP | Terpene tile: name, aroma, effects and "also found in" baked in (text = content). |
| img0171 | `708b92f4-Limonene-765x330-2b.png` | 765x330 | 94 KB | png | 2 (page 1, terpene 1) | KEEP | Terpene tile: name, aroma, effects and "also found in" baked in (text = content). |
| img0172 | `54d109f5-Linalool-765x330-5b.png` | 765x330 | 131 KB | png | 2 (page 1, terpene 1) | KEEP | Terpene tile: name, aroma, effects and "also found in" baked in (text = content). |
| img0173 | `9da44245-Myrcene-765x330-1b.png` | 765x330 | 78 KB | png | 2 (page 1, terpene 1) | KEEP | Terpene tile: name, aroma, effects and "also found in" baked in (text = content). |
| img0174 | `a9e75c02-Ocimene-765x330-8b.png` | 765x330 | 130 KB | png | 2 (page 1, terpene 1) | KEEP | Terpene tile: name, aroma, effects and "also found in" baked in (text = content). |
| img0175 | `0308ce02-Pinene-765x330-3b.png` | 765x330 | 64 KB | png | 2 (page 1, terpene 1) | KEEP | Terpene tile: name, aroma, effects and "also found in" baked in (text = content). |
| img0176 | `86e9a96a-Terpinolene-765x330-7b.png` | 765x330 | 76 KB | png | 2 (page 1, terpene 1) | KEEP | Terpene tile: name, aroma, effects and "also found in" baked in (text = content). |
| img0264 | `025c600e-LOYALTY-PAGE-APPAREL-1080x1080-2.png` | 1080x1080 | 3070 KB | png | 1 (page 1) | REPLACE | Loyalty-page shop tile with the label and "Shop Now" baked in. Rebuild as a live-text tile (label verbatim). Eye review: a real person wearing CCC merch (identity UNVERIFIED); reuse only this client photo, never a generated person. |
| img0265 | `d60e3c5c-LOYALTY-PAGE-CBD-1080x1080-1.png` | 1080x1080 | 182 KB | png | 1 (page 1) | REPLACE | Loyalty-page shop tile with the label and "Shop Now" baked in. Rebuild as a live-text tile (label verbatim). |
| img0266 | `9663dc17-LOYALTY-PAGE-DAB-TOOLS-1080x1080-1.png` | 1080x1080 | 1510 KB | png | 1 (page 1) | REPLACE | Loyalty-page shop tile with the label and "Shop Now" baked in. Rebuild as a live-text tile (label verbatim). |
| img0267 | `914ace3f-LOYALTY-PAGE-GLASSWARE-1080x1080-2.png` | 1080x1080 | 397 KB | png | 1 (page 1) | REPLACE | Loyalty-page shop tile with the label and "Shop Now" baked in. Rebuild as a live-text tile (label verbatim). |
| img0268 | `4c1b7637-LOYALTY-PAGE-GRINDERS-1080x1080-2.png` | 1080x1080 | 360 KB | png | 1 (page 1) | REPLACE | Loyalty-page shop tile with the label and "Shop Now" baked in. Rebuild as a live-text tile (label verbatim). |
| img0269 | `35ed2c31-LOYALTY-PAGE-ROLLING-SUPPLIES-1080x1080-1.png` | 1080x1080 | 614 KB | png | 1 (page 1) | REPLACE | Loyalty-page shop tile with the label and "Shop Now" baked in. Rebuild as a live-text tile (label verbatim). |
| img0272 | `f28aca84-2.png` | 1080x1080 | 192 KB | png | 1 (page 1) | REPLACE | Category tile (1080x1080) with the label and a "SHOP NOW" pill baked in. Rebuild as a live-text tile (label verbatim). |
| img0273 | `949598d9-Cannabis-Seeds-Button.png` | 1080x1080 | 299 KB | png | 1 (page 1) | REPLACE | Category tile (1080x1080) with the label and a "SHOP NOW" pill baked in. Rebuild as a live-text tile (label verbatim). |
| img0274 | `550682f4-Edibles-Button.png` | 1080x1080 | 307 KB | png | 1 (page 1) | REPLACE | Category tile (1080x1080) with the label and a "SHOP NOW" pill baked in. Rebuild as a live-text tile (label verbatim). |
| img0275 | `bcad1750-Flower-New-button.png` | 1080x1080 | 551 KB | png | 1 (page 1) | REPLACE | Category tile (1080x1080) with the label and a "SHOP NOW" pill baked in. Rebuild as a live-text tile (label verbatim). |
| img0276 | `6163ec72-Vaporizer-Button.png` | 1080x1080 | 268 KB | png | 1 (page 1) | REPLACE | Category tile (1080x1080) with the label and a "SHOP NOW" pill baked in. Rebuild as a live-text tile (label verbatim). |
| img0288 | `ffe0fa8c-tinctures-banner-1000px.png` | 1024x683 | 935 KB | png | 1 (page 1) | KEEP | Category tile photo, no baked text. |
| img0300 | `12dcd5d9-CLOUD-CITY-Strains-HighCBD-768x384.webp` | 768x384 | 32 KB | webp | 1 (strain 1) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0301 | `2c192007-Untitled-design-2-768x384.png` | 768x384 | 101 KB | png | 1 (strain 1) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0302 | `734dccc6-Untitled-design-5-768x384.png` | 768x384 | 81 KB | png | 1 (strain 1) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0303 | `ed23c6a3-Untitled-design-6-768x384.png` | 768x384 | 112 KB | png | 1 (strain 1) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0313 | `20e97693-Restaurants-765x300-1.png` | 765x330 | 106 KB | png | 1 (page 1) | KEEP | Wellfleet guide tile with its heading baked in (text = content). |
| img0316 | `75974c81-Art-Galleries-765x300-3c.png` | 765x330 | 47 KB | png | 1 (page 1) | KEEP | Wellfleet guide tile with its heading baked in (text = content). |
| img0317 | `2191e6f5-Attractions-765x300-2b.png` | 765x330 | 168 KB | png | 1 (page 1) | KEEP | Wellfleet guide tile with its heading baked in (text = content). |
| img0318 | `777d8c0e-Shopping-765x300-4b.png` | 765x330 | 106 KB | png | 1 (page 1) | KEEP | Wellfleet guide tile with its heading baked in (text = content). |
| img0319 | `1e6ad691-Accomodations-765x300-1-rn484jzy2qmtr1dwcemrw6ll3zzb38a56m782kyznc.png` | 765x300 | 48 KB | png | 1 (page 1) | KEEP | Wellfleet guide tile with its heading baked in (text = content). |
| img0342 | `b162a79e-CBD_image2.png` | 626x683 | 430 KB | png | 1 (strain 1) | KEEP | Shop-by-effect or strain-type tile, no baked text. Stock photos of models (not staff, no consumption). Do not swap for generated people. |
| img0347 | `4d723a86-Accessories-Homepage-Button-460-x-330.png` | 460x300 | 47 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. Eye review: shows a person using a glass bong (consumption). |
| img0348 | `a117ae6f-Cannabinoids-Homepage-Button-460-x-330.png` | 460x300 | 61 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. |
| img0349 | `0b43b8a6-Hybrid-Products-Homepage-Button-460-x-330.png` | 460x300 | 67 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. Eye review: stock photo of a man on a seaside rock. |
| img0350 | `ff4fb109-Indica-Products-Homepage-Button-460-x-330.png` | 460x300 | 57 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. Eye review: stock photo of a man in a hammock. |
| img0351 | `bebb3060-Offers-Homepage-Button-460-x-330.png` | 460x300 | 47 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. |
| img0352 | `64edbb96-Ounces-of-Flower-Homepage-Button-460-x-330-1.png` | 460x300 | 44 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. |
| img0353 | `425ea123-Sativa-Products-Homepage-Button-460-x-330.png` | 460x300 | 60 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. Eye review: stock photo of runners. |
| img0354 | `6bde793f-Seeds-Homepage-Button-460-x-330-1.png` | 460x300 | 69 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. |
| img0355 | `6bb9965a-Staff-Picks-Homepage-Button-460-x-330.png` | 460x300 | 60 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. Eye review: a woman's hands touching a cannabis plant (stock; not identified as staff). |
| img0356 | `49599391-Terpenes-Homepage-Button-460-x-330.png` | 460x300 | 62 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. |
| img0357 | `515ab9eb-Top-Sellers-Homepage-Button-460-x-330-1.png` | 460x300 | 57 KB | png | 1 (home 1) | REPLACE | Home category tile with the label and a "LEARN MORE" pill baked into the image. Rebuild as a live-text glass tile carrying the label verbatim; the photo cannot be separated from the baked text. Eye review: shows a man smoking a joint (consumption). |
| img0421 | `MISSING` | MISSING |  |  | 1 (page 1) | KEEP | Wellfleet guide tile with its heading baked in (text = content). MISSING: same-origin URL refused by the block ledger |

### THIRD-PARTY BRAND LOGO (42)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0063 | `cd2b7ef0-kosmik-cclassic-uncut-banner-e1784817619700.jpg` | 1653x300 | 53 KB | jpeg | 5 (event 5) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0071 | `3b8b11ca-Regenerative-Logo_200px.png` | 200x188 | 20 KB | png | 5 (event 5) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0078 | `9b7f4c46-Boutiq-Logo.png` | 340x76 | 2 KB | png | 4 (event 4) | KEEP | Home "jet-brands" strip (widget c12bb1e): a 1080x1080 full-bleed square artwork with its own background. Keep as-is (their mark). |
| img0080 | `65a1f5e4-Wana-200px.png` | 200x219 | 3 KB | png | 4 (event 4) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0081 | `a513c8e9-Coast_200px-2.png` | 200x219 | 26 KB | png | 4 (event 4) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0082 | `e4f8eca8-strane_logo_200px.jpg` | 200x41 | 18 KB | jpeg | 4 (event 4) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0083 | `3be50b15-Northern_Grown_Logo_200x200.png` | 200x200 | 47 KB | png | 4 (event 4) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0121 | `e28211df-Blackstone-Valley-Cannabis-Logo-200px.png` | 200x119 | 4 KB | png | 3 (event 3) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0193 | `cf2328a1-strane-this_is_next_level.png` | 456x230 | 8 KB | png | 2 (event 2) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0195 | `af36f482-eureka-logo.png` | 442x156 | 6 KB | png | 2 (event 2) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0203 | `92dcc033-stingers-sweets.png` | 317x159 | 6 KB | png | 2 (event 2) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0204 | `d1f17449-NEA-200px.png` | 200x219 | 24 KB | png | 2 (event 2) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0205 | `ec6c2808-Treeworks-200px.png` | 200x219 | 11 KB | png | 2 (event 2) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0207 | `6dbdd385-Garcia_Hand_Picked_logo_200px.png` | 200x193 | 22 KB | png | 2 (event 2) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0214 | `5e971a0d-Sluggers_Logo.webp` | 3270x953 | 125 KB | webp | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0215 | `72d8bf14-High-Quality-Logo-2048x800-1.png` | 2048x800 | 108 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0234 | `ed45312b-kosmik-cclassic-uncut-banner-e1784817619700-1536x279.jpg` | 1536x279 | 40 KB | jpeg | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0239 | `0a222204-Holistic_Brands.png` | 1428x208 | 44 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0280 | `63ba393e-Boutiq-Logo.png` | 1080x1080 | 251 KB | png | 1 (home 1) | KEEP | Home "jet-brands" strip (widget c12bb1e): a 1080x1080 full-bleed square artwork with its own background. Keep as-is (their mark). |
| img0281 | `6c4fec5c-Cali-Blaze-Logo.png` | 1080x1080 | 468 KB | png | 1 (home 1) | KEEP | Home "jet-brands" strip (widget c12bb1e): a 1080x1080 full-bleed square artwork with its own background. Keep as-is (their mark). |
| img0282 | `1b41e5cd-Garcia-Hand-Picked-Logo.png` | 1080x1080 | 1479 KB | png | 1 (home 1) | KEEP | Home "jet-brands" strip (widget c12bb1e): a 1080x1080 full-bleed square artwork with its own background. Keep as-is (their mark). |
| img0283 | `049f5d37-Glorious-Cannabis-Logo.png` | 1080x1080 | 69 KB | png | 1 (home 1) | KEEP | Home "jet-brands" strip (widget c12bb1e): a 1080x1080 full-bleed square artwork with its own background. Keep as-is (their mark). |
| img0284 | `35c89a10-Jeeter-Logo.png` | 1080x1080 | 15 KB | png | 1 (home 1) | KEEP | Home "jet-brands" strip (widget c12bb1e): a 1080x1080 full-bleed square artwork with its own background. Keep as-is (their mark). |
| img0285 | `7bf3d43d-Simpler-Daze-Logo.png` | 1080x1080 | 272 KB | png | 1 (home 1) | KEEP | Home "jet-brands" strip (widget c12bb1e): a 1080x1080 full-bleed square artwork with its own background. Keep as-is (their mark). |
| img0286 | `9e1c72f1-Strane-Logo.png` | 1080x1080 | 601 KB | png | 1 (home 1) | KEEP | Home "jet-brands" strip (widget c12bb1e): a 1080x1080 full-bleed square artwork with its own background. Keep as-is (their mark). |
| img0287 | `763b69dc-Wana-Logo.png` | 1080x1080 | 140 KB | png | 1 (home 1) | KEEP | Home "jet-brands" strip (widget c12bb1e): a 1080x1080 full-bleed square artwork with its own background. Keep as-is (their mark). |
| img0366 | `690c96bd-Treeworks-400px.png` | 416x171 | 27 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0367 | `f4ffe9a6-Vangarden_logo_200px.png` | 403x200 | 4 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0373 | `4e56cc74-levia-logo-bottom-type-opt.png` | 340x206 | 4 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0382 | `0ff6d75e-havn_stingers_logos_240px.png` | 240x200 | 29 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0383 | `71d7f4bc-Cann-200px.png` | 200x219 | 3 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0384 | `ffaab36e-Chill-200px-2.png` | 200x219 | 8 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0385 | `0ad1f431-Good-Feels_Good-Vibes_200px.png` | 200x219 | 34 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0386 | `7e3bb837-nova-farms-brand-pop-up-logo_200px.png` | 200x200 | 8 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0387 | `4697bb47-natures-heritage-logo_200.png` | 200x106 | 1 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0388 | `714900ed-wyld-logo-200.png` | 200x130 | 3 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0389 | `6cc55502-Jeeter_HUD_200px.jpg` | 200x121 | 36 KB | jpeg | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0390 | `ad74c027-Jeeter_black_web_20px.png` | 200x88 | 8 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0391 | `104bec1a-perpetual_logo_200px.png` | 200x115 | 2 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0392 | `a82a8bbb-U4EA_Farms_logo_200px.png` | 200x200 | 41 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0393 | `b74b6f8a-hellavated-baja-blastoff_200px.png` | 200x238 | 9 KB | png | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |
| img0394 | `9136c0df-sparq_logo.jpg` | 191x72 | 27 KB | jpeg | 1 (event 1) | KEEP | Brand logo on an event (pop-up) page. Keep as-is (their mark). |

### BLOG FEATURED (54)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0048 | `90ed5f05-Terpenes_banner.webp` | 1200x800 | 197 KB | webp | 8 (date-archive 2, blog-category 3, page 3) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). Eye review: macro bud with a small mark at bottom right (source UNVERIFIED). |
| img0059 | `fbcf2c1f-Cannabis-Concentrates-banner.jpg` | 2560x1707 | 248 KB | jpeg | 5 (date-archive 2, blog-category 1, page 2) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0062 | `7aedf324-ChatGPT-Image-Jun-1-2026-05_27_27-PM.png` | 1774x887 | 598 KB | png | 5 (date-archive 1, blog-category 2, page 2) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). The client's own AI illustration (the filename says ChatGPT), already published as theirs. |
| img0064 | `688f67ef-Carts-Variety-2c-Mitch-Blog-1366-x-768.jpeg` | 1366x768 | 111 KB | jpeg | 5 (date-archive 2, blog-category 1, page 2) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0065 | `a3471edb-cbd.jpg` | 1200x682 | 57 KB | jpeg | 5 (date-archive 1, blog-category 2, page 2) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0066 | `d653f855-Cannabis-Glossary-1200x600-1.png` | 1200x600 | 306 KB | png | 5 (date-archive 2, blog-category 1, page 2) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0067 | `086df39e-CBD-Featured-Image-1200-x-628_geo.png` | 1200x628 | 1086 KB | png | 5 (page 1, category 2, strain 2) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. |
| img0072 | `38e62043-Sunset-Orleans.jpg` | 5487x3658 | 3177 KB | jpeg | 4 (date-archive 1, blog-category 2, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). Client photo, 5487x3658, beach-grass sunset (Orleans, a named town): the strongest real hero/backdrop candidate. lossy=0 is not cached at the CDN (302 to the origin), so the on-disk lossy=2 file (3.25 MB) is the best available. |
| img0073 | `557fea31-trichomes.jpg` | 1958x1300 | 299 KB | jpeg | 4 (date-archive 1, blog-category 2, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). lossy=0 master fetched: 625,127 B vs 306,275 B on disk at the same 1958x1300 (SSIM 0.953, PSNR 37.7 dB). Use tmp/understand/imagery/masters/14-trichomes_lossy0.jpeg. |
| img0074 | `bd6894e5-Choice-Awards-2026-Banner-Image-1.png` | 1920x250 | 244 KB | png | 4 (date-archive 1, blog-category 2, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0085 | `a01230b3-cannabis-seeds.jpg` | 2300x1494 | 343 KB | jpeg | 3 (date-archive 1, blog-category 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0090 | `ddfd02bd-Cartridges-Featured-Image-1200-x-628_geo.png` | 1200x628 | 240 KB | png | 3 (page 1, category 2) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. |
| img0091 | `46107e33-Flower-Featured-Image-1200-x-628_geo.png` | 1200x628 | 942 KB | png | 3 (page 1, category 1, effect 1) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. |
| img0092 | `48ea379d-Loyalty-1200x600-1.png` | 1200x600 | 158 KB | png | 3 (date-archive 1, blog-category 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0093 | `52304d76-Cannabis-Infused-Summer-Drinks-Blog-Banner-1200x600-2.png` | 1200x600 | 363 KB | png | 3 (date-archive 1, blog-category 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0094 | `8cec0c5d-Holiday-Lights-1200x600-1.png` | 1200x600 | 148 KB | png | 3 (date-archive 1, blog-category 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0095 | `9d46e882-Valentines-1200x600-1.png` | 1200x600 | 60 KB | png | 3 (date-archive 1, blog-category 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0098 | `ce882cbe-rso-fso.png` | 1024x512 | 208 KB | png | 3 (date-archive 1, blog-category 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0124 | `bc393109-uncle-tims-bridge.jpeg` | 4032x2681 | 1900 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). Uncle Tim's Bridge, Wellfleet (a named landmark), 4032x2681 client photo: a strong real hero candidate for Wellfleet pages. lossy=0 not cached (302 to the origin). |
| img0126 | `39a39014-live-rosin-scaled.webp` | 2560x1707 | 264 KB | webp | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0131 | `1fa6f32f-CCC-Recreational_Benefit.png` | 1680x1344 | 1907 KB | png | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). Eye review: a man smoking a joint (consumption). |
| img0138 | `186cbbcc-CCC-Accessories.jpeg` | 1536x2048 | 296 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). Eye review: looks like an in-store photo (glassware on a counter); UNVERIFIED that it is this store. |
| img0140 | `c662191e-Green-Wednesday-Complex.png` | 1366x768 | 367 KB | png | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0141 | `aec6e43f-Dry-Herb.png` | 1366x768 | 305 KB | png | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0142 | `8a222c3a-High-Anxiety.jpg` | 1366x768 | 1359 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0143 | `9240c3fe-CCC-Blog-OverdoseCookies.png` | 1354x1350 | 2103 KB | png | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0144 | `96f52757-CCC-Afraid_to_try_Blog.jpeg` | 1200x628 | 205 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). Eye review: stock photo of a woman (not staff). |
| img0145 | `a4010bc0-CCC-Blog-Dabs_1200.webp` | 1200x628 | 27 KB | webp | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0146 | `04ef4226-CCC-Blog-RSO_Blog_Images1.webp` | 1200x628 | 7 KB | webp | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0147 | `d9143379-CCC-Blog-Vape_Blog_1200.jpeg` | 1200x628 | 78 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0148 | `1215dd69-CCC-Dry_Herb_Vape_Blog.jpeg` | 1200x628 | 134 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0149 | `07da78b5-CCC-Med_Card_Blog_1200.jpeg` | 1200x628 | 140 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). Eye review: shows a Massachusetts medical-marijuana card with a person's face, name and card number (real or sample: UNVERIFIED). Ask the client before reuse. |
| img0150 | `f4bb0ae7-Dab-Banner.png` | 1200x600 | 94 KB | png | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0151 | `7e0db3f9-Mmmmmmmm.jpg` | 1200x600 | 58 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0152 | `308fba51-Accessories-Featured-Image-1200-x-628_geo.png` | 1200x628 | 1268 KB | png | 2 (page 1, category 1) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. |
| img0153 | `e3831f1f-Concentrates-Featured-Image-1200-x-628_geo.png` | 1200x628 | 1008 KB | png | 2 (page 1, category 1) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. |
| img0154 | `07b90040-Edibles-Featured-Image-1200-x-628-3_geo.png` | 1200x628 | 319 KB | png | 2 (page 1, category 1) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. |
| img0155 | `d3eac148-Merch-Featured-Image-1200-x-628.png` | 1200x628 | 223 KB | png | 2 (page 1, category 1) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. |
| img0156 | `e589192f-Sagamore-Bridge-1200x600-1.png` | 1200x600 | 828 KB | png | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). Eye review: Sagamore Bridge (a named landmark). |
| img0157 | `f125e490-Toke-or-Treat-1200x600-1.png` | 1200x600 | 132 KB | png | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0162 | `4abade59-CCC-Blog-Dosage.jpeg` | 1080x1080 | 129 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0163 | `1b50b0aa-CCC-Blog-Tincture_Calc2.jpeg` | 1080x1080 | 85 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0166 | `063ce8eb-CCC-Blog-Sleep_Products.jpeg` | 1024x768 | 95 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0185 | `01e4bda8-CCC-RouteAdmin-Blog.jpeg` | 540x540 | 40 KB | jpeg | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0213 | `MISSING` | MISSING |  |  | 2 (date-archive 1, page 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). MISSING: same-origin URL refused by the block ledger |
| img0243 | `c889e247-Lifecylcle-of-a-seed-1200x600-1.png` | 1200x600 | 270 KB | png | 1 (blog-category 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). |
| img0244 | `196bf1f7-Pre-Rolls-Featured-Image-1200-x-628-3_geo.png` | 1200x628 | 999 KB | png | 1 (page 1) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. |
| img0245 | `f03b45ee-Tinctures-Featured-Image-1200-x-628_geo.png` | 1200x628 | 672 KB | png | 1 (page 1) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. |
| img0414 | `MISSING` | MISSING |  |  | 1 (page 1) | KEEP | og:image only (a same-origin URL refused by the block ledger; no CDN twin in the inventory). MISSING: same-origin URL refused by the block ledger |
| img0415 | `MISSING` | MISSING |  |  | 1 (category 1) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. MISSING: same-origin URL refused by the block ledger |
| img0416 | `MISSING` | MISSING |  |  | 1 (date-archive 1) | KEEP | Post featured image (shown on archive cards, and as the post header background where referencedAs includes BACKGROUND). MISSING: same-origin URL refused by the block ledger |
| img0418 | `MISSING` | MISSING |  |  | 1 (home 1) | KEEP | Page featured image of a category landing page (also its og:image): the CCC logo over a product photo. MISSING: same-origin URL refused by the block ledger |
| img0419 | `MISSING` | MISSING |  |  | 1 (geo-page 1) | KEEP | og:image only (a same-origin URL refused by the block ledger; no CDN twin in the inventory). MISSING: same-origin URL refused by the block ledger |
| img0420 | `MISSING` | MISSING |  |  | 1 (page 1) | KEEP | og:image only (a same-origin URL refused by the block ledger; no CDN twin in the inventory). MISSING: same-origin URL refused by the block ledger |

### EVENT POSTER (20)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0096 | `1cb35a4a-Blackston-Valley-Cannabis-Banner-Pop-Up-Event-1176x500-1.png` | 1176x500 | 157 KB | png | 3 (event 3) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0158 | `e4cde6aa-outer-cape-music-festival-updated.png` | 1200x1600 | 1502 KB | png | 2 (event 1, page 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0165 | `deea41b9-Eureka-Dispos-1080x1080-2.png` | 1080x1080 | 2119 KB | png | 2 (event 2) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0186 | `4d74b2ec-420_Celebration_Green.png` | 503x421 | 35 KB | png | 2 (page 1, event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0194 | `7f28f936-MA-Sweets-Flavs-1080.png` | 447x418 | 293 KB | png | 2 (event 2) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0208 | `35261ab5-Outer-Cape-Music-Festival-200px-x-200px.png` | 200x200 | 17 KB | png | 2 (event 1, page 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0217 | `53f59cb6-Jeeter_HUD_banner.jpg` | 1920x751 | 475 KB | jpeg | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0237 | `4ddcf74e-Garcia-Bundle-2024.jpg` | 1478x2000 | 403 KB | jpeg | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0238 | `080b38cb-good-vibes-product.png` | 1469x558 | 380 KB | png | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0247 | `4e618ae1-GHP_Lifestyle_Bertha_1.png` | 1194x790 | 1618 KB | png | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0277 | `353ddd16-Boards-in-the-Stores-2025-First-Place.png` | 1080x1080 | 470 KB | png | 1 (page 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0278 | `f802850f-Boards-in-the-Stores-2026-1080X1080.png` | 1080x1080 | 423 KB | png | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0289 | `5d47c63e-Boards-in-the-Stores-2026-1080X1080-1024x1024.png` | 1024x1024 | 375 KB | png | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0291 | `9259cb4c-Hellavated_OR_cartridge_Baja-Blastoff.png` | 1000x1755 | 2141 KB | png | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0326 | `408d29b5-CaliblazeWebsiteAssets-1-1-1.png` | 685x258 | 66 KB | png | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0327 | `2e5b1668-Hellavated_OR_JuicyStickz_Baja-Blastoff-scaled.png` | 677x2560 | 1130 KB | png | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0343 | `b8a3eb93-Oyster-Festival-2026-rt2lsiby5a4r9pb8dubusfyu2if6th7unp989xbb20.png` | 600x300 | 16 KB | png | 1 (page 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0371 | `bd7e00c3-garcia-limefire-skunk-qq01g8c0f2lc76zxklvsmnqh6u7xwk7ueaweea7na8.jpeg` | 400x400 | 26 KB | jpeg | 1 (page 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0378 | `2f4a26e5-6a966fece10f670bfdbf62e7_1522aa61e692c8cdab34f14d680017a5.webp` | 300x382 | 15 KB | webp | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). |
| img0422 | `MISSING` | MISSING |  |  | 1 (event 1) | KEEP | Event flyer, pop-up artwork or the featured product (text = content). MISSING: HTTP 403 |

### PROMO/SPECIAL BANNER (100)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0053 | `f43de00d-Loyalty-Banner-1500x185-.png` | 1500x185 | 72 KB | png | 6 (page 5, home 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0087 | `f8a22860-FREE-Cape-Cod-Cannabis-Educational-Rack-Cards-1920x1080-1.png` | 1920x1080 | 783 KB | png | 3 (page 3) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0089 | `cb3b44d8-Treeworks-Tincture-banner-ad-1580-x-200-1.png` | 1580x200 | 48 KB | png | 3 (category 3) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0108 | `1f6b6f4d-0bd369ba-ee40-4d64-9cc5-1cd101bd44f0.jpeg.jpeg` | 765x330 | 64 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0109 | `74fe9f00-14b449ff-d179-4bb8-800c-c17a8d767c7f.jpeg.jpeg` | 765x330 | 63 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0110 | `62525e9b-68b550e4-c9b1-4bf2-b9a8-9401ba467545.jpeg.jpeg` | 765x330 | 59 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0111 | `a099726a-6aaa429d-2e31-4e8a-9c2a-6af7c20b04d0.jpeg.jpeg` | 765x330 | 70 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0112 | `87019394-761f4984-92f8-4471-88b6-ea4486ad7ca3.jpeg.jpeg` | 765x330 | 61 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0113 | `3184124b-8cf109bc-bdd3-4b44-b393-16121cb8b9a5.jpeg.jpeg` | 765x330 | 56 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0114 | `790cbd58-9616d019-3f82-4688-abef-63c6f3c81e13.jpeg.jpeg` | 765x330 | 59 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0115 | `b9980832-cf9b880b-ed5d-4803-b3ac-bdb4e62ebd26.jpeg.jpeg` | 765x330 | 60 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0116 | `051bbd3f-d32685ca-f8d3-426d-ae97-85752e981e4b.jpeg.jpeg` | 765x330 | 67 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0117 | `912a5317-e7d46cba-7bcb-41ab-9404-bc45b71eb130.jpeg.jpeg` | 765x330 | 65 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0118 | `2da057ef-f16d5d71-5e9f-4587-ac5e-a5864be09029.jpeg.jpeg` | 765x330 | 61 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0119 | `c4d16fab-f264b096-2519-409a-8754-5b427197ed89.jpeg.jpeg` | 765x330 | 62 KB | jpeg | 3 (home 1, special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0120 | `4af7707d-Chill-Medicated-Button-Ad-r86ax1b8o88p4q98idm642a574wfrmjr2t9gr4i7fo.png` | 765x330 | 355 KB | png | 3 (category 3) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0122 | `MISSING` | MISSING |  |  | 3 (category 3) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0123 | `MISSING` | MISSING |  |  | 3 (category 3) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0128 | `59525873-Wellfleet-OptiSigns-1920x1080-2b.png` | 1920x1080 | 883 KB | png | 2 (page 2) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0129 | `e3f79979-End-of-Summer-Blowout-Sept-OptiSigns-1920x1080-2.png` | 1920x1080 | 4642 KB | png | 2 (page 2) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0133 | `ee1b175a-Barneys-Farm-Cannabis-Seeds-1580-x-200-.png` | 1580x200 | 147 KB | png | 2 (category 2) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0134 | `b29afc3c-LIT-FARMS-Cannabis-Seeds-1580-x-200-.png` | 1580x200 | 116 KB | png | 2 (category 2) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0139 | `568d8a4f-Humboldt-Seeds-Learn-More-1500x185-.png` | 1500x185 | 75 KB | png | 2 (category 2) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0160 | `ec83c8d2-Bundles-Blazing-Bargains-1176x500-1.png` | 1176x500 | 228 KB | png | 2 (page 2) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0161 | `f72ccc73-Humboldt-Seeds-Learn-More-1176x500-1-r2pdijanwy554eide64dgx5lwhg8tyjduhpbo5uu88.png` | 1176x500 | 144 KB | png | 2 (category 2) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0177 | `8bd2bc55-544da0a3-d35e-491d-8eca-b97e6690bc68.jpeg.jpeg` | 765x330 | 64 KB | jpeg | 2 (special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0178 | `2c9161a3-6def7ad4-02c9-4012-9093-9013fa10d658.jpeg.jpeg` | 765x330 | 57 KB | jpeg | 2 (special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0179 | `2eea8f1e-8610df32-ef46-4f5c-9136-a363cb82b93c.jpeg.jpeg` | 765x330 | 61 KB | jpeg | 2 (special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0180 | `cb08432a-951f0dfe-73b3-46e1-a385-165d625fcc69.jpeg.jpeg` | 765x330 | 65 KB | jpeg | 2 (special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0181 | `03e39bfe-b592a693-48ee-4b50-86e1-f85ef152513f.jpeg.jpeg` | 765x330 | 65 KB | jpeg | 2 (special 2) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0183 | `10f087e8-Blue-Tail-Apparel-Website-Button-Mobile2.png` | 600x600 | 137 KB | png | 2 (date-archive 1, page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0187 | `57b016cb-Affordable-Ounces-Homepage-Button-460-x-330.png` | 460x300 | 59 KB | png | 2 (home 1, page 1) | KEEP | Home promo tile: product photo, baked label and a "LEARN MORE" pill (text = content). Third-party packaging shown for Kanha, Mindy's and Wana. |
| img0188 | `bc128502-Disposables-Homepage-Button-460-x-330.png` | 460x300 | 38 KB | png | 2 (home 1, page 1) | KEEP | Home promo tile: product photo, baked label and a "LEARN MORE" pill (text = content). Third-party packaging shown for Kanha, Mindy's and Wana. |
| img0189 | `ce3bb451-Infused-Pre-rolls-Homepage-Button-460-x-330.png` | 460x300 | 31 KB | png | 2 (home 1, page 1) | KEEP | Home promo tile: product photo, baked label and a "LEARN MORE" pill (text = content). Third-party packaging shown for Kanha, Mindy's and Wana. |
| img0190 | `b577ec18-Kanha-Gummies-Homepage-Button-460-x-330.png` | 460x300 | 48 KB | png | 2 (home 1, page 1) | KEEP | Home promo tile: product photo, baked label and a "LEARN MORE" pill (text = content). Third-party packaging shown for Kanha, Mindy's and Wana. |
| img0191 | `10e1f7f4-Mindys-Gummies-Homepage-Button-460-x-330.png` | 460x300 | 46 KB | png | 2 (home 1, page 1) | KEEP | Home promo tile: product photo, baked label and a "LEARN MORE" pill (text = content). Third-party packaging shown for Kanha, Mindy's and Wana. |
| img0192 | `64bd853f-Wana-Gummies-Homepage-Button-460-x-330.png` | 460x300 | 32 KB | png | 2 (home 1, page 1) | KEEP | Home promo tile: product photo, baked label and a "LEARN MORE" pill (text = content). Third-party packaging shown for Kanha, Mindy's and Wana. |
| img0210 | `MISSING` | MISSING |  |  | 2 (category 2) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). MISSING: CDN throttled sr-assets; re-fetch later |
| img0211 | `MISSING` | MISSING |  |  | 2 (page 2) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). MISSING: CDN throttled sr-assets; re-fetch later |
| img0218 | `87242b01-FREE-Cape-Cod-Cannabis-Coasters-1920x1080-1.png` | 1920x1080 | 585 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0219 | `273e1c95-Free-Bar-Coaster-1774x887-2.png` | 1774x887 | 645 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0220 | `a983b057-Blue-Live-Rosin-Gummies-banner-ad-1580-x-200-2-1.png` | 1580x200 | 46 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0221 | `b8ac6322-Custom-420-CCC-Baseball-Jersey-Banner-1580x200-2.png` | 1580x200 | 172 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0222 | `ea229fba-Orange-10-Infused-1g-infused-for-105-banner-ad-1580-x-200-2.png` | 1580x200 | 55 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0223 | `48d6c800-Orange-Jeeter-Infused-5pk-Bundle-banner-ad-1580-x-200-1.png` | 1580x200 | 57 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0224 | `02d3e28c-Yellow-Jeeter-1g-Cartridges-Bundle-2-2-1.png` | 1580x200 | 84 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0225 | `79b20301-Cannabis-Seeds-Restocked-1580x200-1-rqhw86infimejdy412wadaelwvyyyyy66tozjgkd00.png` | 1580x200 | 155 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0226 | `7e188ec9-Green-Affordable-14g-28g-banner-ad-1580-x-200-2--rqhx60phgsy0i0smfpgs4qzzs96o2paaub69i2e500.png` | 1580x200 | 100 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0227 | `4bb45ec7-Mix-n-Match-Concentrates-Web-Banner-1580x200-2-rjs7hm3n6p2cqb0g6o8xsf77g3uo1u6tv9bf0epvps.png` | 1580x200 | 66 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0228 | `9534b94a-Mix-n-Match-Edibles-Web-Banner-1580x200-2-rkxrjo89joorqv6cy468oj12qkc0l8y8nwg4duu5sg.png` | 1580x200 | 57 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0229 | `866aeafc-Stop-The-Repeal-MA-1580x200-2b-rthp9eu9qiz8lcvgj4ej6mrmhditi7o76wvb0qfmq8.png` | 1580x200 | 45 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0230 | `e5fa266d-Yellow-Jeeter-1g-Cartridges-Bundle-2-2-rh9p8s7egejp937bah1dhv9zhkzyptwj1un4lfwcls.png` | 1580x200 | 93 KB | png | 1 (category 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0231 | `54df8760-4th-of-July-2025-CCC.png` | 1545x1040 | 374 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0232 | `16478cbc-STR-Sign-White.png` | 1545x2000 | 95 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0233 | `6d2e7b6b-Custom-CCC-420-Baseball-Jersey-WEB-8.5-x-11-FINAL-2.png` | 1545x1999 | 430 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0235 | `42656dd7-Gold-Cape-Cods-Best-CBD-Store.png` | 1500x300 | 222 KB | png | 1 (home 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). Home jet-banner (widget 91d2aa3), the first content image under the header. |
| img0241 | `1ac7660a-2-1.png` | 1254x1254 | 785 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0248 | `62097976-12-Tuesday-UPDATED-HERO-BANNER-1176-x-500.png` | 1176x500 | 955 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0249 | `637ab21e-Stocking-Stuffers-1176x500-2-1.png` | 1176x500 | 1075 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0250 | `0963b6a0-CHOICE-AWARDS-2026-VOTING-1176X500-3d.png` | 1176x500 | 168 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0251 | `2a012fb5-Vote-for-Cape-Cod-Cannabis-1176x500-FINAL.png` | 1176x500 | 254 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0252 | `0f48be3a-2.png` | 1176x500 | 272 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0253 | `d1c1211f-250-Years-of-America-Tribute-1176x500-1.png` | 1176x500 | 338 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0254 | `3e342a4b-12-Tuesday-8.11.26-Hero-Banner-1176-x-500.png` | 1176x500 | 278 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0255 | `3c3f79d1-Boutiq-Thursday-Hero-Banner-1176-x-500-.png` | 1176x500 | 799 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0256 | `2ec917e2-Moonrock-Mondays-Hero-Banner-765-x-330.png` | 1176x500 | 841 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0257 | `a4ec372f-Stinger-Sting-Sunday-Hero-Banner-1176-x-500.png` | 1176x500 | 801 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0258 | `ebee256c-Stop-The-Repeal-MA-1176x500-2.png` | 1176x500 | 918 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0259 | `10625635-Wavez-Wednesday-AI-Hero-Banner-765-x-330.png` | 1176x500 | 266 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). The filename says AI (client-made). |
| img0263 | `43c6953d-CC-Cannabis-Gift-Cards-1080x1080-1.png` | 1080x1080 | 1330 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0270 | `64120d9f-CCC-Its-worth-the-trip.png` | 1080x1080 | 1670 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0271 | `b022bb74-Love-is-in-the-Air-1080x1080-1.png` | 1080x1080 | 969 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0290 | `f9b10756-Choice_Awards_2026_VOTE-rnebdgc5821e59gf7zk4kkb0g065x0zp8zmkfvw9ws.jpg` | 1000x286 | 40 KB | jpeg | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0296 | `503e8ba1-Toke-or-Treat-Bundles-800x800-1.jpg` | 800x800 | 96 KB | jpeg | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0304 | `40e12ae3-October-12-Tuesday.png` | 765x330 | 545 KB | png | 1 (special 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0305 | `8a6f6d48-October-28g-Simpler-Daze-Sunday.png` | 765x330 | 136 KB | png | 1 (special 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0306 | `b578dc88-October-2G-Dispo-Tuesday.png` | 765x330 | 135 KB | png | 1 (special 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0307 | `9c515578-October-Double-Baked-BOGO-765-x-330.png` | 765x330 | 459 KB | png | 1 (special 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0308 | `2b6afbb7-October-Wax-Wana-Wednesday.png` | 765x330 | 137 KB | png | 1 (special 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. |
| img0325 | `f5984c41-Leafly-Stop-The-Repeal-Leaderboard-728-x-90-px-1.png` | 728x90 | 10 KB | png | 1 (home 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). A 728x90 leaderboard ad on home. |
| img0358 | `26ad1ea1-Cape-Cod-Grow-Lab-Homepage-Ad-460-x-330.png` | 460x300 | 70 KB | png | 1 (page 1) | KEEP | Home promo ad for a third-party product or campaign (text = content). |
| img0359 | `03cf4c00-New-Cali-Blaze-SKUs-Homepage-Ad-460-x-330.png` | 460x300 | 300 KB | png | 1 (page 1) | KEEP | Home promo ad for a third-party product or campaign (text = content). |
| img0360 | `2cbdf5ca-STOP-the-REPEAL-Homepage-Ad-460-x-330.png` | 460x300 | 38 KB | png | 1 (page 1) | KEEP | Home promo ad for a third-party product or campaign (text = content). |
| img0361 | `baf0f2f7-Aura-Cannabis-Co-Ad-460-x-300.png` | 460x300 | 83 KB | png | 1 (home 1) | KEEP | Home promo ad for a third-party product or campaign (text = content). |
| img0362 | `6d12202b-STOP-the-REPEAL-Homepage-Ad-460-x-330-2.png` | 460x300 | 39 KB | png | 1 (home 1) | KEEP | Home promo ad for a third-party product or campaign (text = content). |
| img0363 | `61c587ba-Sky-High-2g-Disposable-.png` | 460x300 | 40 KB | png | 1 (home 1) | KEEP | Home promo ad for a third-party product or campaign (text = content). |
| img0364 | `5d33573f-Suncrafted-Restock-Ad-460-x-300.png` | 460x300 | 79 KB | png | 1 (home 1) | KEEP | Home promo ad for a third-party product or campaign (text = content). |
| img0374 | `03bcfe19-Vote-NO-on-8.png` | 330x232 | 64 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0377 | `fc6c4970-Leafly-Stop-the-Repeal-Square-Tile-300-x-250-px.png` | 300x250 | 10 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0381 | `9c1b903f-Rack-Cards-2026-FRONT-2E-FINAL-2-rt2nqxekcmt62qe6kmhz2zbhhq5ezeilqziwzvjyoq.png` | 288x649 | 59 KB | png | 1 (page 1) | KEEP | Promotional graphic with offer or campaign text baked in (text = content). |
| img0399 | `MISSING` | MISSING |  |  | 1 (category 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0400 | `MISSING` | MISSING |  |  | 1 (category 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0401 | `MISSING` | MISSING |  |  | 1 (category 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0402 | `MISSING` | MISSING |  |  | 1 (category 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0403 | `MISSING` | MISSING |  |  | 1 (category 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0404 | `MISSING` | MISSING |  |  | 1 (category 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0405 | `MISSING` | MISSING |  |  | 1 (category 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0406 | `MISSING` | MISSING |  |  | 1 (category 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0407 | `MISSING` | MISSING |  |  | 1 (category 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |
| img0408 | `MISSING` | MISSING |  |  | 1 (special 1) | KEEP | Specials banner: product, deal and price (sometimes a date) baked in = content. Its alt is generic, so the deal text exists only in the pixels and the specials post title. MISSING: HTTP 404 at the CDN |

### ICON/UI (13)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0009 | `5cec7fe2-google-logo.png` | 184x60 | 1 KB | png | 76 (home 1, page 3, geo-page 16, recreational-geo 56) | OPTIONAL | Small UI image (review widget mark, star row, compass). Prefer SVG/CSS in the rebuild; the Google mark stays a Google mark. |
| img0029 | `MISSING` | MISSING |  |  | 60 (event 60) | REMOVE | Plugin UI asset (The Events Calendar spinner / Instagram Feed placeholder); the static rebuild has no such plugin. MISSING: same-origin URL refused by the block ledger |
| img0044 | `d151dbdc-Shop-Now-Button-200px.png` | 200x69 | 1 KB | png | 12 (event 11, page 1) | REPLACE | Bitmap button or bullet icon (a "SHOP NOW" image button, pot-leaf bullets). Rebuild as a live button or inline SVG. |
| img0084 | `b037f031-5-stars_200-1.png` | 200x42 | 2 KB | png | 4 (home 1, page 3) | OPTIONAL | Small UI image (review widget mark, star row, compass). Prefer SVG/CSS in the rebuild; the Google mark stays a Google mark. |
| img0209 | `9375c58c-2c.png` | 43x38 | 1 KB | png | 2 (page 2) | REPLACE | Bitmap button or bullet icon (a "SHOP NOW" image button, pot-leaf bullets). Rebuild as a live button or inline SVG. |
| img0212 | `MISSING` | MISSING |  |  | 2 (page 2) | REMOVE | Plugin UI asset (The Events Calendar spinner / Instagram Feed placeholder); the static rebuild has no such plugin. MISSING: same-origin URL refused by the block ledger |
| img0294 | `8dda955f-mastercard-amex-visa-mastercard-american-express.jpg` | 820x210 | 16 KB | jpeg | 1 (page 1) | KEEP | Payment-acceptance or review call-to-action marks (third-party marks, functional content). |
| img0375 | `ea823794-google_review-1.png` | 300x144 | 7 KB | png | 1 (page 1) | KEEP | Payment-acceptance or review call-to-action marks (third-party marks, functional content). |
| img0376 | `75937183-leave-a-yelp-review.jpg` | 300x144 | 25 KB | jpeg | 1 (page 1) | KEEP | Payment-acceptance or review call-to-action marks (third-party marks, functional content). |
| img0380 | `3975f8aa-apple-google-amazon-pay-rk9jk6d8t5rr8hnvqnf73jjjio1us2a2okihfy8k7m.png` | 300x85 | 3 KB | png | 1 (page 1) | KEEP | Payment-acceptance or review call-to-action marks (third-party marks, functional content). |
| img0395 | `9d3e8d18-canva-compass-icon-rncvph8v989umwbvdghhjvii077vrmhv8clerfwadg.png` | 150x154 | 3 KB | png | 1 (page 1) | OPTIONAL | Small UI image (review widget mark, star row, compass). Prefer SVG/CSS in the rebuild; the Google mark stays a Google mark. |
| img0396 | `428476e2-2.png` | 50x50 | 1 KB | png | 1 (home 1) | REPLACE | Bitmap button or bullet icon (a "SHOP NOW" image button, pot-leaf bullets). Rebuild as a live button or inline SVG. |
| img0397 | `c4125403-pot-leaf-50x50-1.png` | 50x50 | 1 KB | png | 1 (home 1) | REPLACE | Bitmap button or bullet icon (a "SHOP NOW" image button, pot-leaf bullets). Rebuild as a live button or inline SVG. |

### PHOTO OF THE STORE/STAFF/PEOPLE (14)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0002 | `3964222d-CCC-Storefront.webp` | 870x580 | 120 KB | webp | 745 (store 2, home 1, date-archive 56, page 113, brands-index 1, brand 252, cannabinoid 22, category 67, blog-category 5, geo-page 16, effect 11, event 61, recreational-geo 61, special 18, strain 6, terpene 53) | KEEP | The real storefront (1446 US-6, Wellfleet). Never replace with generated imagery. 870x580 is the largest copy anywhere (WebP byte-identical at lossy=0). Crisp only up to 580 CSS px at 1.5x: ask the client for the original photo before any wide use. |
| img0033 | `8a6ede78-CCC-exterior.jpeg` | 1303x977 | 243 KB | jpeg | 20 (geo-page 16, date-archive 1, page 3) | KEEP | The real storefront (1446 US-6, Wellfleet). Never replace with generated imagery. lossy=0 master fetched: 407,189 B vs 248,364 B on disk at 1303x977 (SSIM 0.947, PSNR 30.7 dB). Use tmp/understand/imagery/masters/21-CCC_exterior_lossy0.jpeg. |
| img0088 | `516bebba-IMG_7184-2.webp` | 1680x1119 | 283 KB | webp | 3 (date-archive 1, page 2) | KEEP | The real storefront (1446 US-6, Wellfleet). Never replace with generated imagery. 1680x1119 WebP storefront (front windows with the logo). The no-query original 302s to the origin. |
| img0130 | `5f016e6a-IMG_1120-scaled-rt2d5p1mcclazmug6c944qs29ucmzx27k695ol8a40.jpg` | 1920x1080 | 256 KB | jpeg | 2 (page 2) | KEEP | The real storefront (1446 US-6, Wellfleet). Never replace with generated imagery. 1920x1080 storefront (Elementor thumb of IMG_1120-scaled.jpg); lossy=0 and the original 302 to the origin. |
| img0196 | `1a05e30a-IMG_5994-pncvp79hmriquxolw4zjxnqgdndkrkcbobm8k8cadk.webp` | 400x500 | 19 KB | webp | 2 (page 2) | KEEP | A real staff member, named in the alt text. Never replace, restyle beyond cropping, or generate. 400x500 Elementor thumb: the original's upload folder is not referenced anywhere in the captured HTML, and lossy=0 of the thumb 302s to the origin. Crisp up to 266 CSS px at 1.5x. |
| img0197 | `5de1498e-IMG_7110-2-pncvp87btlk16jn8qne6i5hwz18xz9g20g9q1iaw7c.webp` | 400x500 | 25 KB | webp | 2 (page 2) | KEEP | A real staff member, named in the alt text. Never replace, restyle beyond cropping, or generate. 400x500 Elementor thumb (see IMG_5994). |
| img0198 | `a4ce7f2d-IMG_9973-3-px9p7jrppmr7ww6kqnp99yb8gzmgvyiydmqojie6q0.jpg` | 400x500 | 27 KB | jpeg | 2 (page 2) | KEEP | A real staff member, named in the alt text. Never replace, restyle beyond cropping, or generate. 400x500 Elementor thumb; lossy=0 302s to the origin (probe 24). |
| img0199 | `2c7d680b-Jackson-e1650653133690-pnr3otold50tieq15t4bj04j7y95y1lusdvaz9l9c8.webp` | 400x500 | 31 KB | webp | 2 (page 2) | KEEP | A real staff member, named in the alt text. Never replace, restyle beyond cropping, or generate. 400x500 Elementor thumb; the guessed original 2022/04/Jackson-e1650653133690.webp 302s to the origin (probe 19), so its existence is UNVERIFIED. |
| img0200 | `03a85a17-Larysa-pncvpa3079mltrkifo7fn50u5szoenniopkp0283uw.webp` | 400x500 | 26 KB | webp | 2 (page 2) | KEEP | A real staff member, named in the alt text. Never replace, restyle beyond cropping, or generate. 400x500 Elementor thumb (see IMG_5994). |
| img0201 | `21b428fc-Morgan-pncvpb0ue3nw5dj5a6m27msar6v1mcr90u86hc6poo.webp` | 400x500 | 25 KB | webp | 2 (page 2) | KEEP | A real staff member, named in the alt text. Never replace, restyle beyond cropping, or generate. 400x500 Elementor thumb (see IMG_5994). |
| img0202 | `8f1e1ccd-Untitled_design_3-pncvpcwirrqgslgez7fbcmb7xyls1qypp3j5fw3xc8.webp` | 400x500 | 27 KB | webp | 2 (page 2) | KEEP | A real staff member, named in the alt text. Never replace, restyle beyond cropping, or generate. 400x500 Elementor thumb (alt: Rich \| Product Specialist). |
| img0260 | `1d2b9bb7-ourstory-heroV2.png` | 1152x400 | 994 KB | png | 1 (event 1) | KEEP | Group photo of real people (a brand team, on an event page; identity UNVERIFIED). |
| img0261 | `a779fe4f-PC90ZH_Black_Front_1080x1080.png` | 1080x1080 | 2456 KB | png | 1 (page 1) | KEEP | A real staff member, named in the alt text. Never replace, restyle beyond cropping, or generate. Real person (alt: Jackson Simard - Product Curator) outdoors in a CCC hoodie. |
| img0370 | `0782c2ae-IMG_9969-2-1-px9p73sghg5cfitsbysllkcedft893rinfnfdt1vns.jpg` | 400x500 | 25 KB | jpeg | 1 (page 1) | KEEP | A real staff member, named in the alt text. Never replace, restyle beyond cropping, or generate. 400x500 Elementor thumb (alt: Kayla \| Receptionist). |

### OTHER (49)

| id | Best file | px | Size | Fmt | Pages | Decision | Reason / note |
|---|---|---|---:|---|---|---|---|
| img0006 | `ef93efa0-RRH-Logo-White.webp` | 733x150 | 9 KB | webp | 744 (home 1, date-archive 56, page 112, brands-index 1, brand 252, cannabinoid 22, category 67, blog-category 5, geo-page 16, effect 11, event 61, recreational-geo 61, special 18, store 2, strain 6, terpene 53) | REMOVE | Footer credit logo of the previous agency (rankreallyhigh.com): old-agency residue, not the client brand. |
| img0032 | `3d4a785d-CC_CapeCop_WINNER.png` | 1080x1412 | 66 KB | png | 25 (home 1, page 8, geo-page 16) | KEEP | Award badge (text = content). |
| img0058 | `4351e26e-Flowering-765x300-4.png` | 765x330 | 136 KB | png | 6 (date-archive 1, blog-category 2, page 3) | KEEP | In-article photo (grow lifecycle). |
| img0069 | `04d98801-CC26_CapeCod_Winner_lo-rez.png` | 288x468 | 39 KB | png | 5 (page 2, category 2, home 1) | KEEP | Award badge (text = content). |
| img0086 | `e4fff4cc-Entourage-Effect-Graphic_1920x1080.png` | 1920x1080 | 36 KB | png | 3 (page 2, date-archive 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0097 | `65303433-Dabbing-Temp-Guide-1080x1080-1.jpg` | 1080x1080 | 165 KB | jpeg | 3 (page 3) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0125 | `5a27b0ee-dab_vocab.png` | 2934x1316 | 1472 KB | png | 2 (date-archive 1, page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0132 | `d80a1552-type-method-effects-dose-chart.png` | 1590x291 | 18 KB | png | 2 (page 2) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0135 | `7338b502-Concentrates-1.png` | 1545x569 | 258 KB | png | 2 (page 2) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0136 | `25e60b2a-Concentrates-2.png` | 1545x620 | 191 KB | png | 2 (page 2) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0137 | `842e4f46-Concentrates-3.png` | 1545x540 | 823 KB | png | 2 (page 2) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0159 | `da79ce17-CC26_CapeCod_Winner.jpg` | 1200x1948 | 196 KB | jpeg | 2 (home 1, page 1) | KEEP | Award badge (text = content). |
| img0164 | `ca08cf11-moonrocks.jpeg` | 1080x1080 | 80 KB | jpeg | 2 (page 2) | KEEP | In-article or page image. |
| img0182 | `5e15e572-moonrocks2-qrcdthd918icz7vmkk6l2ncjv71ghw1o3su9h43vo4.jpg` | 700x514 | 34 KB | jpeg | 2 (page 2) | KEEP | In-article or page image. |
| img0216 | `60443995-CBD_Education_and_Information-1.png` | 1983x793 | 606 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0236 | `c1fd1101-Dabbing-Temp-Guide-1080x1080-2-qvpgb2togt4n4dskw3q7zosbmeu7t4k9fumytb8jzu.jpg` | 1500x185 | 41 KB | jpeg | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0240 | `2fc5e917-AmnesiaHazexDosidos-1365x2048.jpg` | 1365x2048 | 391 KB | jpeg | 1 (page 1) | KEEP | In-article or page image. |
| img0242 | `3d4798a6-The_Cannabis_Terpiodic_Table.png` | 1250x845 | 140 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0246 | `e1eefbbc-CC26_CapeCod_Finalist.jpg` | 1200x1948 | 197 KB | jpeg | 1 (page 1) | KEEP | Award badge (text = content). |
| img0262 | `856bf9d1-Cannabis-Glossary-101-image.webp` | 1080x172 | 95 KB | webp | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0279 | `8939a12b-CC_CapeCop_FINALIST.png` | 1080x1412 | 45 KB | png | 1 (page 1) | KEEP | Award badge (text = content). |
| img0292 | `136a5b4c-Mens-Size_Guide-1.png` | 837x820 | 40 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0293 | `2cf9f8de-Womens-Size_Guide-1.png` | 823x843 | 40 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0295 | `98b5109c-8826fddb-8f21-7e6a-2f33-200e8decb482.png` | 804x112 | 81 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0297 | `03bc4617-MassachusettsTHCUniversalSymbol.png` | 789x753 | 67 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0298 | `95f6b262-seeds-vs-clones-chart.png` | 784x272 | 6 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0299 | `d47e286b-iOS-Push-Notifications.png` | 779x739 | 117 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0309 | `d0dd4837-Drying-Curing-765x300-6.png` | 765x330 | 203 KB | png | 1 (page 1) | KEEP | In-article photo (grow lifecycle). |
| img0310 | `a83c97d1-Germination-765x300-1.png` | 765x330 | 496 KB | png | 1 (page 1) | KEEP | In-article photo (grow lifecycle). |
| img0311 | `359f3417-Harvest-765x300-5.png` | 765x330 | 119 KB | png | 1 (page 1) | KEEP | In-article photo (grow lifecycle). |
| img0312 | `ae9e716c-Pre-Flowering-765x300-4b.png` | 765x330 | 140 KB | png | 1 (page 1) | KEEP | In-article photo (grow lifecycle). |
| img0314 | `63e4e631-Seedling-765x300-2.png` | 765x330 | 48 KB | png | 1 (page 1) | KEEP | In-article photo (grow lifecycle). |
| img0315 | `36c34181-Vegetative-765x300-3.png` | 765x330 | 115 KB | png | 1 (page 1) | KEEP | In-article photo (grow lifecycle). |
| img0320 | `c7f5c082-Terpene_Chart_Leafly.png` | 754x428 | 41 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0321 | `9b58fd3d-Blue_Raspberry_Bliss_THC_Mocktail_750px.png` | 750x750 | 767 KB | png | 1 (page 1) | KEEP | In-article or page image. |
| img0322 | `2bdb7e1d-Chill_Medicated_Strawberry_Lemonade_750px.png` | 750x750 | 779 KB | png | 1 (page 1) | KEEP | In-article or page image. |
| img0323 | `6d26c3b7-Twilight_Orchard_Breeze_750px.png` | 750x750 | 494 KB | png | 1 (page 1) | KEEP | In-article or page image. |
| img0324 | `2466267b-Web-Push-Notifcations.png` | 729x423 | 9 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0341 | `ae0842cf-Scavenger_QR_Code.png` | 630x612 | 54 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0344 | `7066de79-Buddy_The_Elfs_Winter_Delight.jpg` | 490x515 | 120 KB | jpeg | 1 (page 1) | KEEP | In-article or page image. |
| img0345 | `09da75f3-Holidaze_Herb-Infused_Holiday_Nog.jpg` | 490x515 | 128 KB | jpeg | 1 (page 1) | KEEP | In-article or page image. |
| img0346 | `7cad76eb-Night_Before_Christmas_Tea.jpg` | 490x515 | 110 KB | jpeg | 1 (page 1) | KEEP | In-article or page image. |
| img0365 | `390be898-Cover-rt3qzslb41wi45tjgtq3x2t92gtug9qwvpmk8jbyjc.png` | 453x700 | 66 KB | png | 1 (page 1) | KEEP | Infographic, chart, diagram, regulatory symbol, QR code or screenshot (text = content). |
| img0379 | `d195a397-Best-of-Weed-Maps-2026-2-geo-tagged-rpfond3wyg2uh74ul2ugeq0jygdamxccyer50q7f28.jpg` | 300x384 | 21 KB | jpeg | 1 (page 1) | KEEP | Award badge (text = content). |
| img0398 | `MISSING` | MISSING |  |  | 1 (page 1) | KEEP | In-article or page image. MISSING: HTTP 404 at the CDN |
| img0409 | `MISSING` | MISSING |  |  | 1 (home 1) | REMOVE | Not an image: a broken background-image value "&" in the source markup. MISSING: same-origin URL refused by the block ledger |
| img0410 | `MISSING` | MISSING |  |  | 1 (page 1) | REMOVE | Not an image: a broken background-image value "&" in the source markup. MISSING: same-origin URL refused by the block ledger |
| img0411 | `MISSING` | MISSING |  |  | 1 (page 1) | REMOVE | Not an image: a broken background-image value "&" in the source markup. MISSING: same-origin URL refused by the block ledger |
| img0412 | `MISSING` | MISSING |  |  | 1 (page 1) | REMOVE | Not an image: a broken background-image value "&" in the source markup. MISSING: same-origin URL refused by the block ledger |

## 13. Missing images

| id | Stem | Role | Pages | Why missing | Covered by |
|---|---|---|---|---|---|
| img0008 | CCC-Logo.webp | LOGO/BRAND | 492 (home 1, date-archive 56, page 69, brands-index 1, brand 252, cannabinoid 2, category 67, blog-category 5, effect 1, event 6, recreational-geo 5, special 18, store 2, strain 6, terpene 1) | same-origin URL refused by the block ledger | masters/03 (fetched, 700x500) |
| img0029 | tribe-loading.gif | ICON/UI | 60 (event 60) | same-origin URL refused by the block ledger | not needed (REMOVE) |
| img0122 | dcef0a9b-b7be-49f1-bd7f-2a1fc41fda40.jpeg.jpeg | PROMO/SPECIAL BANNER | 3 (category 3) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0123 | f51d2987-67bc-4328-80c0-ef438ce8cc9a.jpeg.jpeg | PROMO/SPECIAL BANNER | 3 (category 3) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0210 | Humboldt-Seeds-Learn-More-1500x185--r1zkxvseu20jirpvy42o6b6iv5kt3bkz623v4317nk.png | PROMO/SPECIAL BANNER | 2 (category 2) | CDN throttled sr-assets; re-fetch later | the master of the same stem is on disk |
| img0211 | Loyalty-Banner-1500x185--r9s2072qs6bs47y4gj2w7sbkg0dgjyt6zva792e3nk.png | PROMO/SPECIAL BANNER | 2 (page 2) | CDN throttled sr-assets; re-fetch later | the master Loyalty-Banner-1500x185-.png is on disk |
| img0212 | placeholder.png | ICON/UI | 2 (page 2) | same-origin URL refused by the block ledger | not needed (REMOVE) |
| img0213 | american-flag.avif | BLOG FEATURED | 2 (date-archive 1, page 1) | same-origin URL refused by the block ledger | request the same path through the CDN mirror (https://b2702268.assetcdn.net/2.0/2702268/wp-content/uploads/...?lossy=0&strip=0&webp=1), sequentially; it 302s to the origin if uncached |
| img0398 | AmnesiaHazexDosidos-scaled-qvepiq5i91hxcwo5rfnpvtrabl2mpj1k8xmj4lgki0.jpg | OTHER | 1 (page 1) | HTTP 404 at the CDN | AmnesiaHazexDosidos-1365x2048.jpg on disk |
| img0399 | 439405d8-d863-45b3-8a2b-58933bb45285.jpeg.jpeg | PROMO/SPECIAL BANNER | 1 (category 1) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0400 | 57d6e06a-f407-49b8-9504-89bcb7bd98a4.jpeg.jpeg | PROMO/SPECIAL BANNER | 1 (category 1) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0401 | d49b9879-6ab0-4e18-93f4-32b48ddb1d95.jpeg.jpeg | PROMO/SPECIAL BANNER | 1 (category 1) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0402 | 0ff73a10-3ac0-4601-9fe2-d38a87a37d8b.jpeg.jpeg | PROMO/SPECIAL BANNER | 1 (category 1) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0403 | 1d618798-8a15-4f53-bb1d-c62528ea03bd.jpeg.jpeg | PROMO/SPECIAL BANNER | 1 (category 1) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0404 | 3a53dcb1-08ce-4120-ae22-5b8a5c98ecd4.jpeg.jpeg | PROMO/SPECIAL BANNER | 1 (category 1) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0405 | 5748de80-6ac7-4ed9-bb68-7a917d9087ff.jpeg.jpeg | PROMO/SPECIAL BANNER | 1 (category 1) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0406 | 657623f6-44a2-4e92-bdcf-68208f03682c.jpeg.jpeg | PROMO/SPECIAL BANNER | 1 (category 1) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0407 | b879f943-fd4a-48f4-88d6-fb4e1d550118.jpeg.jpeg | PROMO/SPECIAL BANNER | 1 (category 1) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0408 | 3b0ef225-991f-4a73-9f6a-a5c4a04327a7.jpeg.jpeg | PROMO/SPECIAL BANNER | 1 (special 1) | HTTP 404 at the CDN | nothing to recover: the CDN answers 404 (likely broken on the live site too, UNVERIFIED). Ask the client, or drop the reference |
| img0409 | & | OTHER | 1 (home 1) | same-origin URL refused by the block ledger | not needed (REMOVE) |
| img0410 | & | OTHER | 1 (page 1) | same-origin URL refused by the block ledger | not needed (REMOVE) |
| img0411 | & | OTHER | 1 (page 1) | same-origin URL refused by the block ledger | not needed (REMOVE) |
| img0412 | & | OTHER | 1 (page 1) | same-origin URL refused by the block ledger | not needed (REMOVE) |
| img0413 | CCC_Logo_650px-geo-tag.jpg | LOGO/BRAND | 1 (page 1) | same-origin URL refused by the block ledger | the CDN copy CCC_Logo_650px-geo-tag-1.jpg is on disk |
| img0414 | Contact-Cape-Cod-Cannabis-500x200-1.png | BLOG FEATURED | 1 (page 1) | same-origin URL refused by the block ledger | request the same path through the CDN mirror (https://b2702268.assetcdn.net/2.0/2702268/wp-content/uploads/...?lossy=0&strip=0&webp=1), sequentially; it 302s to the origin if uncached |
| img0415 | Pre-Rolls-Featured-Image-1200-x-628-3_geo.png | BLOG FEATURED | 1 (category 1) | same-origin URL refused by the block ledger | the same file is on disk via its CDN URL |
| img0416 | american-flag-300x200.jpg | BLOG FEATURED | 1 (date-archive 1) | same-origin URL refused by the block ledger | request the same path through the CDN mirror (https://b2702268.assetcdn.net/2.0/2702268/wp-content/uploads/...?lossy=0&strip=0&webp=1), sequentially; it 302s to the origin if uncached |
| img0417 | CCC-Whaletale-geo-tag.webp | LOGO/BRAND | 1 (page 1) | same-origin URL refused by the block ledger | request the same path through the CDN mirror (https://b2702268.assetcdn.net/2.0/2702268/wp-content/uploads/...?lossy=0&strip=0&webp=1), sequentially; it 302s to the origin if uncached |
| img0418 | Home-Featured-Image-1200-x-628-2_geo.png | BLOG FEATURED | 1 (home 1) | same-origin URL refused by the block ledger | request the same path through the CDN mirror (https://b2702268.assetcdn.net/2.0/2702268/wp-content/uploads/...?lossy=0&strip=0&webp=1), sequentially; it 302s to the origin if uncached |
| img0419 | Cape_Cod_Cannabis_g_best_dispensary_cape_cod.jpg | BLOG FEATURED | 1 (geo-page 1) | same-origin URL refused by the block ledger | request the same path through the CDN mirror (https://b2702268.assetcdn.net/2.0/2702268/wp-content/uploads/...?lossy=0&strip=0&webp=1), sequentially; it 302s to the origin if uncached |
| img0420 | CCC-420-Jersey-FINAL-2b-1080x1080-1.png | BLOG FEATURED | 1 (page 1) | same-origin URL refused by the block ledger | request the same path through the CDN mirror (https://b2702268.assetcdn.net/2.0/2702268/wp-content/uploads/...?lossy=0&strip=0&webp=1), sequentially; it 302s to the origin if uncached |
| img0421 | Things-To-Do-765x300-1.png | CATEGORY TILE | 1 (page 1) | same-origin URL refused by the block ledger | request the same path through the CDN mirror (https://b2702268.assetcdn.net/2.0/2702268/wp-content/uploads/...?lossy=0&strip=0&webp=1), sequentially; it 302s to the origin if uncached |
| img0422 | LEVIA-seltzers.png | EVENT POSTER | 1 (event 1) | HTTP 403 | a third-party host (levia.buzz) refused with 403: it is that brand's image, so ask the client |

## 14. Open questions and UNVERIFIED items

- **Client:** vector logo files; the original storefront and staff photos; whether the medical-card image (CCC-Med_Card_Blog_1200.jpeg) shows a real person's card; who the merch model on the loyalty Apparel tile is.
- **UNVERIFIED:** where the age-gate lighthouse photo (CCC-Beach-Team.webp) was taken. It shows a lighthouse on rocks and is not identified as Cape Cod.
- **UNVERIFIED:** rendered widths outside the home page (no per-page CSS was captured), and the swiper slides-per-view of the staff carousel.
- **UNVERIFIED:** which optimiser sits behind the CDN parameters, and whether originals exist behind the `-scaled` and Elementor-thumb files (the CDN 302s those to the blocked origin).
- **Not covered by this lane:** Dutchie product images (`images.dutchie.com`, client-rendered; t1.html is the only product page captured). These belong to the catalog lane.
- **Gap, not covered by any lane yet: 32 Dutchie product shots pasted into 14 event bodies.** They are static `<img>` tags on crawled pages, but `audit/image-inventory.json` has 0 `images.dutchie.com` sources, so they are in no inventory. Per file: event-cna-pop-up-event 6; event-jeeter-hook-up-pop-up, event-strane-garcia-hellavated-do-drops-pop-up and event-vangarden-pop-up 4 each; event-coast-cannabis-co-pop-up-event, event-coast-cannabis-pop-up-event, event-northeast-alternatives-pop-up and event-northeast-alternatives-pop-up-2 2 each; event-boutiq-pop-up-event, event-boutiq-spooky-pop-up-event, event-levia-pop-up, event-treeworks-pop-up-2, event-treeworks-pop-up-3 and event-wyld-pop-up 1 each. The event pages lose them unless they are snapshotted or kept as hotlinks. The same holds for other hotlinked body images that are not in the inventory: `static.wixstatic.com` (2 Stingers event pages; 1 mention in the inventory), `mcusercontent.com`, `www.hellavated.com`, `levia.buzz` and `u4eafarms.com` (1 page each), and the Google review avatars from `lh3.googleusercontent.com` (77 files; 0 in the inventory).
- **Section background images outside the home page are UNVERIFIED.** Elementor container backgrounds live only in the LiteSpeed combined CSS. The raw pages reference 169 distinct `litespeed/css/<hash>.css` files, and only the home bundle (`audit/prelock/kit.css`) was captured; its content-image `url()`s are the two `CCC_Pattern.webp` tiles. The HTML has no inline background image (31 `style` attributes mention `background-image`, all `inherit`). Hero and section backgrounds on town, category, effect, event, post and archive templates may therefore be missing from this inventory.
- **The lighthouse (img0001) must not be used as Cape Cod scenery until the client confirms it.** The file has no EXIF or XMP chunk (WebP chunks VP8X, ICCP, VP8, PSAI) and no caption, so there is no location evidence. It may be a stock photo (UNVERIFIED). BRAND-SYSTEM Direction A now carries the same caution.

## Verification log (fixer lane, 2026-10-12)

Each item was re-run against the evidence before this doc changed (scripts in `tmp/understand/fixer/`, read-only).

| # | Was | Now | Evidence |
|---|---|---|---|
| 1 | §3 MAP note: map iframes "on 743 raw pages" | 74 pages have a Google Maps iframe; 743 is every file that mentions a Maps URL | `fixcheck.mjs` section G: any Google Maps URL 743 files; `<iframe` with a Google Maps `src` 74 files; 0 `elementor-widget-google_maps` |
| 2 | Item 6 and §8: "253 brand pages" | 249 distinct brand pages, 252 crawled URLs with 3 `?product=` variants (7 x 403 and 1 x 404 not crawled) | `fixcheck.mjs` section H over `site-inventory.json`: 260 `/brands/<slug>` rows = 252 x 200 (249 distinct paths, 3 query variants), 7 x 403, 1 x 404; `ls audit/raw/brands-*` = 252. No-logo finding re-tested on all 252 files: the only `<img>` sources are `CCC-Logo-…webp`, `RRH-Logo-White-300x61.webp` and `CCC_Logo_320px-2.png` (252 each) |
| 3 | No record of the 32 Dutchie images in event bodies | Gap recorded in §14 with the per-file list | `fixcheck.mjs` section G3: 14 event files, 32 `<img>` tags with `images.dutchie.com`; `follow2.mjs` (d): 0 `images.dutchie.com` and 0 `googleusercontent` mentions in `audit/image-inventory.json` |
| 4 | Method did not say that non-home section backgrounds are unknown | §2 and §14 note added | `fixcheck.mjs` section G4: 169 distinct LiteSpeed CSS references; kit.css content-image `url()`s are the two `CCC_Pattern.webp`; `follow.mjs`: 31 inline `background-image` attributes, all `inherit` |
| 5 | img0001 lighthouse: location UNVERIFIED only | Added "do not present as Cape Cod until confirmed", with the file-chunk evidence | `follow2.mjs` (e): `assets/source/13096766-CCC-Beach-Team.webp` chunks VP8X, ICCP, VP8, PSAI (no EXIF, no XMP). Stock status UNVERIFIED |
