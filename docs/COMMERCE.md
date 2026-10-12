# Commerce and catalog: Cape Cod Cannabis

Role: catalog (UNDERSTAND phase), written 2026-10-12. Machine-readable twin: `audit/understand/catalog-model.json`.
Scratch scripts and their outputs (all re-runnable from the workspace root, Node builtins only): `tmp/understand/catalog/`.
No request went to capecodcannabis.com. Six requests went to images.dutchie.com (section 9).

## 1. What a designer or builder must know first

1. **The shop is a client-side app.** Every product grid, slider, product page body, cart, checkout, order history and points page is an empty `<div>` with a `data-config` attribute that the Joint Commerce script (`joint-ecommerce` 1.45.0, `main.1.45.0.js`) fills in the browser. The crawled HTML holds the configuration of each grid, not the products in it.
2. **We have full data for exactly one product** (`audit/prelock/t1.html`, Claravita Maui Waui | Popcorn). For the other 5,856 we have the URL and the post title. For 11 of them we also have the description, from the `/products/` archive page.
3. **The full product URL list exists after all.** `audit/raw/sitemap.html` (the Rank Math HTML sitemap page) lists **5,857 product links with their titles**. All 4,000 product URLs of `sm-joint_products-sitemap1.xml` are in it. So the missing XML sitemap 2 does not matter.
4. **Pickup only, recreational only, one store.** In `window.jointEcommerce.stores.5164` (t1.html), `available_order_types` is `["IN_STORE_PICKUP"]` and `available_menu_types` is `["RECREATIONAL"]`. There is no delivery. Online orders are reservations that are paid in the store.
5. **The live site hides all discount signals.** Its custom CSS (`style#wp-custom-css`, under the comment "Hide Specials MA Compliance") hides special-offer badges, original or strike-through prices and the "Specials" titles. It renames them "Shop Bundles", "Shop Offer", "Shop Offers" and "Bundles". This happens even though the Joint setting `ma_compliance_enabled` is `false`. The redesign must keep this: no strike-through prices and no "% off" badges on product cards.
6. **The payment copy disagrees with itself.** The site shows "💵 Debit & Cash Accepted" (an h2 on 4 pages). The menu banner says "*We accept cash, debit cards or CanPay". The online order settings list `paymentTypes: ["CASH"]`. One JSON-LD block says "Cash, Debit Card, CanPay" and a second says "Cash". Keep the visible copy verbatim and flag the conflict to the client.
7. **Specials disclaimer to keep, verbatim:** "*Website cart may not reflect the bundled price but it will be adjusted at time of payment." It appears on all 17 crawled special pages (`grep -lF` over `audit/raw`).
8. **Some copy is hidden on every breakpoint.** It sits in the DOM but in Elementor containers that carry all six `elementor-hidden-*` classes. In 7 of the 11 top-level categories (concentrates, edibles, flower, pre-rolls, tinctures, topicals, vaporizers), a second FAQ block such as "Concentrate FAQ's" is hidden this way, next to a visible FAQ accordion. The "Shop By Category" block on every effect and strain page is hidden, and so is a "technical difficulties with our Bundles" note on /specials/. The UX and content owners must decide whether this copy comes back. Do not silently drop it, and do not silently make it visible.
9. **Product images are Dutchie imgix URLs that can be hotlinked.** They accept resize and format parameters, send CORS `*` and allow caching for one year. The one sample source image is only 250x250.
10. **Product data goes stale daily.** t1 has `og:updated_time` 2026-10-11T14:07:33-04:00, and sitemap `lastmod` values are hours old. Any static price is a snapshot.

## 2. The shop engine: Joint Commerce configuration

Every page carries three inline configs. All three are present in all 743 raw HTML files; the values below are quoted from t1.html.

| Config | Key facts (verbatim values) |
|---|---|
| `var joint` | theme: `layout_option` "cannazon", `product_card_layout` "cannazon", `product_details_layout` "5g", `primary_color` "#00a3e0", `secondary_color` "#02a7eb", `border_radius` "8px", `mobile_filter_style` "static". ecommerce: `search_mode` "mega_menu", `checkout_flow` "retail", `checkout_url` "/checkout/", `checkout_redirect` "/thank-you/", `buy_now` true, `show_low_stock_notice` true, `low_stock_threshold` 5, `view_only_mode` false, `ma_compliance_enabled` false, `require_delivery_address` true (unused: pickup only). integrations: all false, **including `alpineIq` false**. api `baseUrl` https://capecodcannabis.com/wp-json/joint-api/v1 (with a WP nonce) |
| `window.jointEcommerce` | store 5164 "Cape Cod Cannabis Recreational Dispensary" (display "Cape Cod Cannabis"), 1446 US-6, Wellfleet MA 02667, tz America/New_York, phone (774) 383-3133, google_rating "4.9", google_review_count "967"; hours: every day open "0800", close "2000"; special_hours 2026-07-04, 2026-09-07, 2026-10-12 (8 to 20); `default_sort` "Popular", `default_order_type` IN_STORE_PICKUP, `show_effects` true, `display_dosage` false, `subcategory_display` "rank_subcategory", `featured_brand` "skyhigh", `show_menu_banner` **false** (its content holds the ID policy and payment lines); order_settings: asap false, scheduled false, orderMinimum null, paymentTypes ["CASH"]; storeIntegrations: moodiDay, highQ (bot); api jointWp https://capecodcannabis.com/wp-json/joint-ecommerce/v1, jointAjax /wp-admin/admin-ajax.php |
| `var jointTypeahead` | suggestUrl https://capecodcannabis.com/wp-json/joint-ecommerce/v1/search/suggest, menuUrl /menu/, minChars "2", mode "mega_menu", displays: products "card", specials/brands/categories "rail"; binds to `form[role="search"] input[name="s"]`, `input.search-field`, `input[type="search"][name="s"]` |

Widget containers across the 745 raw page records (counted with `node tmp/understand/catalog/survey.mjs`, raw pages only; a grep that also counts the prelock copies gives 752 / 505 / 88):

| Container | Count | Role |
|---|---|---|
| `#joint-cart` | 744 (every page except /links) | floating cart button, config `{"color":"default","variant":"fixed","icon":"store","size":"small"}` |
| `#joint-menu` | 500 | product grid with filters (limit 20 almost everywhere) |
| `.joint-slider` | 81 | product rail (limit 15, or 100 on the home page) |
| `.joint-product-details` | 1 (t1) | product page body |
| `#joint-checkout` | 1 (/checkout/) | checkout, no config |
| `#joint-order-history` | 1 (/my-orders/) | `{"storeName":"","rewardsUrl":""}` |
| `#joint-rewards` | 1 (/my-points/) | `{"storeName":"","orderHistoryUrl":"https://capecodcannabis.com/my-orders/"}` |

## 3. Product data model (t1.html, the only sample)

| Field | Where | Sample value |
|---|---|---|
| URL | canonical | /products/flower-popcorn-half-ounce-claravita-maui-waui-sdh-14g-for-sale-wellfleet-ma/ |
| `<title>` | head | "Claravita Maui Waui \| Popcorn \| Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA" = `<post title> \| Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA` |
| meta / og / twitter description | head | description text with the `<br />` removed and no separator ("...Pineapple, SweetDominate Terpenes...") |
| og:type, og:updated_time | head | "article", "2026-10-11T14:07:33-04:00" |
| H1 (post title) | body | "Claravita Maui Waui \| Popcorn" = brand + " " + JSON-LD name |
| Breadcrumb (Rank Math, HTML and JSON-LD) | body | Home > Products > Claravita Maui Waui \| Popcorn. **There is no category level** |
| JSON-LD Product `name` | inline script | "Maui Waui \| Popcorn" |
| `description` | JSON-LD | "Flavor: Citrus, Fruity, Pineapple, Sweet&lt;br /&gt;Dominate Terpenes: Myrcene (Earthy, Relaxing), ...&lt;br /&gt;Effects: ...&lt;br /&gt;May Relieve: ...". The `<br />` separators are HTML-escaped inside the JSON. The labelled lines (Lineage, Flavor, Dominate Terpenes, Effects, May Relieve) repeat in the 12 archive excerpts |
| `brand` | JSON-LD | {"@type":"Brand","name":"Claravita","description":"","image":""} |
| `image` | JSON-LD | https://images.dutchie.com/da19282bb39167e387f0e00ed9f12f32 |
| `offers[]` | JSON-LD | [{"availability":"https://schema.org/InStock","name":"1/2oz","price":"75.00","priceCurrency":"USD"}]. The offer name is the variant label |
| Joint product id | `div.joint-product-details[data-config]` | raw.product "018167f0-b6ee-43b2-b641-fa0f52b56be9"; filters [{field:"jointId", values:[uuid], type:"any"}]; limit 15 |
| WP post id | data-config raw.post_id and body class | 240851 |
| Also on the page | | two LocalBusiness JSON-LD blocks (reviews, hours, offer catalog), the floating cart, the footer. Everything else (variant picker, price, potency, add to cart, specials, staff-pick badge, low-stock notice) is drawn client-side |

Second source of product text: the `/products/` archive (`audit/raw/products.html`) is a server-rendered Elementor posts grid. It shows 12 products per page, each with a title, the description as the excerpt, and "Shop Now ⭢". For t1 the excerpt equals the full JSON-LD description; for the others, whether the excerpt is truncated is UNVERIFIED. It is paginated with `rel=next` /products/page/2/. Only page 1 was crawled. About 489 pages would cover the whole catalog (5,857 / 12).

## 4. Product URL grammar and what the slug alone tells you

Shape: `/products/<core>-for-sale-wellfleet-ma[-N]/`. The core is the POS product name, slugified when the post was created. Parse script: `tmp/understand/catalog/slugparse.mjs`. Output: `slugstats.json` and `slugrows.json`.

| Core layout | Count | Example |
|---|---|---|
| product type first | 1,926 | `flower-popcorn-half-ounce-claravita-maui-waui-sdh-14g` |
| brand first | 3,157 | `trees-co-pre-roll-tc-time-turner-hybrid-1g` |
| neither (name-led) | 774 | `resinate-lemon-haze`, `mango-sapphire` |

Tokens: strain type just before the size (`sdh` 770, `idh` 762, `hybrid` 1,018, `sativa` 16, `indica` 9, `s` 35, `i` 9, `cbd` 38). The expansions sativa-dominant and indica-dominant hybrid are UNVERIFIED. Size comes last (`3-5g` = 3.5 g, `14g`, `1g`, `0-5g`, `12oz`, `50ml`, `500mg-4oz`, `10pk-20serv`). The `-N` WordPress duplicate counter appears on 654 slugs. 36 slugs contain percent-encoded UTF-8, for example `1-%c2%bc` for the ¼ sign.

**How much the slug alone recovers (5,857 products):**

| Field | Recovered | Notes |
|---|---|---|
| Size token | 3,757 (64.1%) | units: g 2,749, pk 539, oz 253, serv 137, mg 47, ml 32. **The format is not the variant label**: t1's slug says `14g`, its offer says "1/2oz". Multi-size products cannot be expressed |
| Strain type | 2,657 (45.4%) | |
| Brand from the slug | 4,686 found (80.0%): 3,163 at the start, 1,250 after the type token, 273 elsewhere (weak) | dictionary = 247 brand names from the 252 crawled brand pages |
| Brand from the title | 5,227 titles start with a known brand (89.2%) | slug agrees 4,155, disagrees 1,072 (860 missing in slug, 212 contradicting) |
| Brand from slug or title | 5,546 (94.7%) | |
| Category (guess) | 4,609 guessed (78.7%); 4,124 unambiguous (70.4%); 485 conflicting; 1,248 no type token | **no ground truth exists**: t1 has no category in its breadcrumb, JSON-LD or data-config. Guessed split: FLOWER 968, PRE_ROLLS 885, ACCESSORIES 722, CONCENTRATES 561, VAPORIZERS 520, EDIBLES 481, MERCH 202, SEEDS 160, TINCTURES 60, TOPICALS 44, CLONES 6 |
| Brand + category + size together | 3,078 (52.6%) | |
| Titles | 4,290 distinct; 1,182 titles used by more than one URL | one product name per size, for example "Garcia Hand Picked Caps Frozen Lemons" at 3.5 g, 14 g and 28 g |

Failure modes, with examples in `catalog-model.json` > slugParseStats.failureExamples:

- House abbreviations replace the brand: `ghp` = Garcia Hand Picked, `tf` = Trifecta Farms, `tt` = Tumble & Toke.
- Strain words are also brand names: "haze", "juicy".
- The slug uses the parent brand while the title uses the sub-brand: Mega Labs vs Wavez, Northern Grown vs Fog Cutter.
- **Stale slugs:** `flower-popcorn-half-ounce-claravita-lemon-mints-idh-14g...` is titled "Tumble & Toke ...".
- Typos: `cali-balze`, `disbosable`, `pe-roll`.
- Name-only slugs (722) carry no type, size or strain.

## 5. Listing pages: server copy and the client grid behind each

Counts are of pages in `audit/raw`. "Visible words" counts main-region text between the header and footer, excluding copy hidden on all breakpoints (`tmp/understand/catalog/maintext.mjs`).

| Page type | Pages | H1 pattern (verbatim sample) | Server-rendered copy | Grid config |
|---|---|---|---|---|
| /categories/ | 1 | (none detected) | category cards with "View All", Blue Tail apparel paragraph (139 words) | none |
| /categories/<cat>/ | 15 URLs = 11 categories + 4 aliases (/categories/CBD and /cbd, /Seeds and /seeds, two /tinctures?product= variants) | "Shop Cannabis CBD for sale in Wellfleet, MA" | intro (80 to 394 visible words); visible FAQ accordion on 8 categories ("CLICK TO VIEW CBD FAQ'S"; none on accessories, merch, seeds); a second FAQ hidden on every breakpoint on 7 of them (for example "Concentrate FAQ's"); subcategory cards (`type-joint_categories` posts) | `#joint-menu` category=<ENUM>, sort "Price: High to Low" or "Price: Low to High", limit 20, + a `.joint-slider` FLOWER, weights 1oz, pricemax 115, "Price: Low to High", limit 15 |
| /categories/<cat>/<sub>/ | 51 | "Shop Cannabis Batteries & Devices for sale in Wellfleet, MA" | breadcrumb + H1 only (15 to 21 words) | `#joint-menu` category + subcategory (51 enum values, for example SMALLS_POPCORN, LIVE_ROSIN, GUMMIES,LIVE_RESIN_GUMMIES,LIVE_ROSIN_GUMMIES) + the same 1oz rail |
| /brands/ | 1 | "Shop Cannabis Brands for sale in Wellfleet, MA" | brand name grid | none |
| /brands/<brand>/ | 252 | brand name, for example "14 Counties" | breadcrumb + H1 only (6 to 14 words); title "Buy <Brand> Brand Products Online \| ..." | `#joint-menu` brandName=<display name>, limit 20 |
| /specials/ | 1 | "Cannabis Offers for sale in Wellfleet, MA" | long intro (1,073 visible words) + 17 special cards (`joint_specials` posts, h2 titles like "Wana Gummies \| 2 for $55"), paginated; hidden: "September's Last Hurrah" and a bundles "technical difficulties" note | none |
| /specials/<slug>/ | 17 | special name, for example "Affordable Ounces & Half Ounces" | h5 summary + "*Website cart may not reflect the bundled price..." | `#joint-menu` applicableSpecials.specialId=<uuid>, limit 20 |
| /strains/<type>/ | 4 (+1 `?strain=` alias) | visible "Shop High CBD Cannabis Products for sale in Wellfleet, MA"; the first H1 in the DOM is the hidden "Shop By Category" | breadcrumb + heading only (14 to 16 visible words) | strainType HIGH_CBD / HYBRID / INDICA / SATIVA |
| /effects/ and /effects/<e>/ | 1 + 10 | "Shop Calm Cannabis Products for sale in Wellfleet, MA" | index intro (143 words); children H1 only plus a hidden "Shop By Category" block | effects CALM, CLEAR_MIND, CREATIVE, ENERGETIC, FOCUSED, HAPPY, INSPIRED, RELAXED, SLEEPY, UPLIFTED |
| /terpenes/ and /terpenes/<t>/ | 1 + 52 | terpene name, for example "α-Phellandrene" (percent-encoded URLs) | index has an accordion; children H1 only | terpenes.name (index: 14 names at once) |
| /cannabinoids/ and /cannabinoids/<c>/ | 1 (+ page/2) + 20 | "CBC (Cannabichromene)" | index 991 words; children a 43 to 61 word definition | cannabinoids.name (index: 18 names at once) |
| /recreational/<geo>/ | 56 (+ index and 4 paginated) | "Cannabis Dispensary near West Harwich, MA 02671" | 481 to 497 visible words of local copy, category tiles, "Shop by Effect" | `#joint-menu` with no filter, limit 20 |
| /stores/<store>/ | 1 | "Cape Cod Cannabis Dispensary in Wellfleet" | mission and about copy (223 words) | none |
| /menu/ | 1 | "Shop Cannabis Products for sale in Wellfleet, MA" | intro + "Shop Offers By Category" tiles (111 words) | `#joint-menu` no filter, limit 20 |
| Curated pages | 1 each | for example "Shop Staff Picks for sale in Wellfleet, MA" | H1 only | /staff-picks/ staffPick; /new-products/ collections "New Products" sorted High to Low; /top-sellers/ "Best Selling"; /featured-brand/ featured, Low to High, limit 25; /sleep-products/ collections "Sleep Products"; /fire-offers-2/ 3 "Fire Offers" collections; /shop-high-testing-flower/ FLOWER, "THC: High to Low"; /all-*-on-sale/ (6 pages) category + specials "all"; /affordable-ounces-cape-cod-cannabis/ FLOWER + special name |
| Home / | 1 | | | 7 rails, limit 100: collections "Blazing Bargains \| Flower" ("Product Spotlight"), specials by name ×4, brand "health circle", brand "choice chews" |

Anomaly: /intro-to-cannabis-101/ passes a UUID as `brand`, so it filters `brandName` by "f0450cce-6d03-4eaa-9071-d0394ee8d354". It probably renders nothing (UNVERIFIED).

## 6. Filters and sorts

Every listing is one `#joint-menu` or `.joint-slider` config of the form `{raw:{...}, filters:[{field, values, type:"any"}], sort:[{field, direction}], limit}`.

| Widget param | API filter field | Filter entries | Values seen |
|---|---|---|---|
| brand | brandName | 255 | 247 brand display names (plus the UUID anomaly) |
| category | category | 144 | FLOWER, PRE_ROLLS, VAPORIZERS, CONCENTRATES, EDIBLES, TINCTURES, TOPICALS, SEEDS, CBD, ACCESSORIES, CLONES, MERCH |
| subcategory | subCategory | 54 | 51 enums (comma lists allowed) |
| weights | variants.option | 66 | "1oz" |
| pricemin / pricemax | variants.price | 68 | max 115 (66 pages), 7 to 12.50 (1) |
| terpenes | terpenes.name | 53 | 52 single names + a list of 14 |
| cannabinoids | cannabinoids.name | 21 | 20 single names + a list of 18 |
| special | applicableSpecials.specialId | 17 | UUIDs |
| specials | applicableSpecials.specialName | 11 | "all" or special names |
| effects | effects | 11 | 10 enums + "sleepy" |
| collections | collections | 6 | "Blazing Bargains \| Flower", "New Products", "Sleep Products", "Liquid Diamond Cartridges", "Liquid Diamond Disposables", Fire Offers ×3 |
| strain | strainType | 5 | HIGH_CBD, HYBRID, INDICA, SATIVA |
| staffpicks | staffPick | 1 | true |
| menutype | menuType | 2 | RECREATIONAL |
| featured | (no filter emitted) | 2 widgets | true (store `featured_brand` "skyhigh") |
| thcmin/thcmax/cbdmin/cbdmax, tags, ids, pos_ids | UNVERIFIED | 0 | keys exist in every config, never set |

| Sort label | API sort | Widgets |
|---|---|---|
| Price: Low to High | lowestPrice asc | 67 |
| Price: High to Low | lowestPrice desc | 60 |
| Brand | brandName asc | 2 |
| THC: High to Low | potencyThcRangeHigh desc | 1 |
| CBD: Low to High | potencyCbdRangeHigh asc | 1 |
| Relevance | _score desc | 1 |
| Best Selling | itemsSold desc | 1 |
| Popular (store default) | UNVERIFIED | 0 explicit |

The filter panel itself is drawn by `main.1.45.0.js`, which was not captured, so the full list of facets shown to shoppers is UNVERIFIED. The custom CSS shows only two hooks: a "Specials" facet (`#Specials-filter-label`, relabelled "Bundles") and a collection facet (`.joint-collection-filter`, hidden). For the rebuild, offer the facets that the evidenced fields support: category, subcategory, brand, strain type, effect, terpene, cannabinoid, size (variant option), price range and bundles. Offer the sorts in the table above.

## 7. Shop UX flows

| Flow | How it works on the live site | Evidence |
|---|---|---|
| Age gate | client overlay (template `#tmpl-age-gate`, cookie `age_gate`, 21+). Copy: "Welcome!", "Are you over 21 years of age?", Yes / No, "*Must be 21+ with a VALID ID.", "Always worth the trip!" | any raw page |
| Menu | /menu/ grid, 20 per page, store default sort "Popular" | `audit/raw/menu.html` |
| Search | header JetSearch form (`role="search"`, with a category select) + Elementor search form "Search Cape Cod Cannabis..."; the Joint typeahead attaches to `input[name=s]` in a mega-menu (products as cards; specials, brands and categories as rails), min 2 characters; "Shop Gift Cards" links to `/?s=gift-card` | `var jointTypeahead`; `content-inventory.json` forms |
| Product page | the server sends breadcrumb, H1 and JSON-LD; the client draws the "5g" details layout | t1.html |
| Cart | floating fixed button on every page, opens the Joint cart; `buy_now` true | `#joint-cart` |
| Checkout | /checkout/ `#joint-checkout`, flow "retail", then /thank-you/ (not crawled); IN_STORE_PICKUP only; no ASAP or scheduled slots; payment CASH online | `audit/raw/checkout.html`, store config |
| Specials | /specials/ cards, then /specials/<slug>/ grid by specialId; bundle price applied at the register; discount UI hidden for compliance | section 1, item 5 |
| My orders / my points | Joint client widgets; how customers log in is UNVERIFIED (inside the app) | `my-orders.html`, `my-points.html` |
| Loyalty | sign-up is in-store ("Sign up in-store today!"); /loyalty-sign-in/ embeds the Alpine IQ wallet iframe `https://lab.alpineiq.com/wallet/1209` (500x900); /join-our-newsletter/ embeds the Alpine IQ join iframe `https://lab.alpineiq.com/join/c/1209/110622` (500x1350); Alpine IQ pixel `https://lab.alpineiq.com/p/1209.js` on every page; points are redeemable "for Accessories, Apparel or CBD" | `loyalty-sign-in.html`, `join-our-newsletter.html` |
| Purchase limit | /daily-purchase-limit-in-ma/: copy + inline JS calculator (limit 56.70 g flower-equivalent; concentrate and vape ×5.6; tincture 0.55999 g per 100 mg; edibles 0.27999 g per 5 mg; moonrock presets Crude Boys Frosted Buds, Four20, Glorious). The copy says "56 grams (2 ounces)" | `daily-purchase-limit-in-ma.html #purchaseForm` |
| Store hours | server-rendered `ul.joint-hours-list` (7 rows, Sunday first, "8:00am – 8:00pm") + LocalBusiness JSON-LD 08:00 to 20:00 daily. **Every one of the 742 Joint hours lists in `audit/raw` sits inside an element hidden on all six breakpoints** (footer widget `467fc28`, plus a body copy on /contact-cape-cod-cannabis/), so none is visible on the live site. The visible footer hours are a text-editor list (widget `cf8f393`): "Monday 8am – 8pm … Sunday 8am – 8pm". Render that wording, not the Joint list | `audit/raw/index.html`; `tmp/understand/fixer/hours-lists.mjs` |
| ID policy | "*ID must be a Government issued ID. An expired ID is not an acceptable form of identification..." (menu banner content, `show_menu_banner` false) | t1 `window.jointEcommerce` |

## 8. Static rebuild plan (Node builtins, no runtime dependencies)

Common to both plans:

- **URL compatibility.** Emit `/products/<slug>/index.html` for all 5,857 slugs from `audit/raw/sitemap.html`, keeping trailing slashes. The live site 301-redirects non-slash URLs to slash URLs (`redirectChain` in site-inventory). Write the 36 percent-encoded slugs to disk under their decoded UTF-8 names, and test one, for example `raw-cones-raw-classic-6pk-1-¼-for-sale-wellfleet-ma`, on the target host.
- **Listings.** Generate category, brand, special, strain, effect, terpene, cannabinoid, geo and curated pages with their server copy verbatim. In place of the Joint div, render a grid component driven by the same filter object (store the `filters`, `sort` and `limit` per page from the raw configs). Use the per-page sort and the limits 20 and 15.
- **Product index.** Use one slim search index (slug, title, brand, category, size) plus per-category shards for card data.
- **Cart honesty.** The static preview cannot take orders. Proposal: "Reserve for pickup" buttons drive a local-only bag (localStorage, clearly labelled "Preview: orders are not sent"). The bag shows the specials disclaimer and the pickup and payment copy. The real integration plugs in at three points: (1) grid data fetch, which replaces the static shard with Joint `joint-ecommerce/v1` or Dutchie data; (2) add-to-cart and checkout, which become a Joint cart and checkout embed, or a Dutchie hosted checkout, with redirect `/thank-you/`; (3) account, where my-orders and my-points remount the Joint widgets and the loyalty pages keep the Alpine IQ iframes as they are.
- **Compliance.** Never show strike-through prices, "% off" or specials badges. Keep the age gate and the 21+ and ID copy.

**Plan A (product pages become crawlable later).** Harvest the 5,857 product pages slowly, or the 489 archive pages first for title and description. Index fields: slug, duplicate counter, title, name, brand, category, strain type, image hash, offers [{name, price, availability}], description, Joint id, post id. That is about 535 bytes per product, about 3.1 MB raw and about 0.6 MB gzip for all products. Shard per category, so the largest shard is around 0.5 to 0.7 MB raw. Each product page gets full Product JSON-LD (name, description, brand, image, offers), the BreadcrumbList Home > Products > title, and title and meta patterns as live. Category still does not come from the product page; it needs the client API or the slug guess (flagged). Label prices "as of <date>" or fetch them live.

**Plan B (product pages never become crawlable).** Buildable from evidence alone:

- 5,857 URL-compatible stubs with H1 = title and breadcrumb.
- "From the product name" chips: size (64.1%) and strain type (45.4%).
- A brand link, available for 94.7% of products.
- A "Check price and availability" button that hands off to the live menu, the integration point.
- A product index of 864,659 bytes raw (158,885 gzip, 96,393 brotli).
- Brand pages listing products by brand match (exact where the title starts with the brand, 89.2%).
- Category pages listing by guessed category, labelled as a preview, or showing only copy plus a live-menu button.
- Full data for t1, and descriptions for the 12 archive products.

What must be left out:

- Prices, variants, stock, potency, terpene, cannabinoid and effect tags, and images (except t1).
- Product JSON-LD with offers, which would be fabricated. Emit the breadcrumb only, or set the stubs to noindex.
- Product membership of specials, terpene, cannabinoid, effect and strain pages. Show their copy plus a live-menu call to action.

## 9. Product images (images.dutchie.com)

Six sequential GETs, at least 1.1 s apart (`tmp/understand/catalog/imgtest.mjs`, results in `imgtest.json`), on t1's hash with `Accept: image/avif,image/webp,...`:

| Variant | Query | Result | Bytes |
|---|---|---|---|
| original | none | JPEG 250x250 | 13,668 |
| card (live-site params) | `?auto=format&fit=fill&fill=solid&w=344&h=330` | AVIF 344x330 | 15,305 |
| card WebP | `?fm=webp&w=400&q=75` | WebP 400x400 | 34,472 |
| PDP | `?auto=format&w=1000&q=75` | AVIF 1000x1000 (upscaled) | 60,497 |
| card AVIF | `?fm=avif&w=400&q=60` | AVIF 400x400 | 22,232 |
| retina thumb | `?auto=format&w=200&dpr=2&q=60` | AVIF 400x400 | 22,232 |

The host is imgix: every response carries an `x-imgix-id` header, and the live event pages already use `?auto=format&fit=fill&fill=solid&ixlib=react-9.5.4&h=330&w=344`. Responses send `cache-control: public, max-age=31536000`, `access-control-allow-origin: *`, and `vary: Accept, User-Agent` on auto=format. Server: cloudflare.

Scaled from this one sample (order of magnitude only, since source sizes and sharing are unknown):

| Variant | Total for all 5,857 products |
|---|---|
| Original JPEG | about 80 MB |
| Card AVIF 344x330 | about 90 MB |
| Card WebP 400 | about 202 MB |
| Card AVIF 400 | about 130 MB |
| PDP AVIF 1000 (upscaled) | about 354 MB |

**Recommendation.** Hotlink with imgix parameters rather than downloading:

- Cards: `?auto=format&fit=fill&fill=solid&w=344&h=330`, with a `dpr=2` srcset entry.
- Product pages: cap the width at the source size, since a 250 px source upscales without gaining detail.

Self-host only the brand, category and AI art. Plan B has a product image for t1 only.

## 10. Endpoints recorded (none were called)

- https://capecodcannabis.com/wp-json/joint-api/v1
- https://capecodcannabis.com/wp-json/joint-ecommerce/v1
- https://capecodcannabis.com/wp-json/joint-ecommerce/v1/search/suggest
- https://capecodcannabis.com/wp-admin/admin-ajax.php
- https://capecodcannabis.com/wp-json/wp/v2/joint_categories/<id> (also `joint_brands` and `joint_strains`, linked from page heads)
- Joint app: /wp-content/plugins/joint-ecommerce/app/build/assets/js/main.1.45.0.js
- Alpine IQ: lab.alpineiq.com/p/1209.js, /wallet/1209, /join/c/1209/110622
- Store logo: jointstorage.blob.core.windows.net/dispensaryphotos-production/5164-CCC-Logo-Footer.png
- Product images: https://images.dutchie.com/<hash>

## 11. UNVERIFIED and open questions

- The category of any product. No evidence maps a product to a category; the slug guess has no ground truth.
- The "Popular" sort mapping, the full facet list in the menu app, and how customers log in for my-orders and my-points.
- What sdh and idh stand for. "Sativa-dominant" and "indica-dominant hybrid" fit, but no page defines them in the evidence read.
- Product image source sizes other than t1's 250x250.
- Whether the /thank-you/ page exists (not crawled).
- Which payment line is authoritative (section 1, item 6).
- Whether the hidden-everywhere FAQs and notes should return (section 1, item 8).

## Verification log (fixer lane, 2026-10-12)

| # | Was | Now | Evidence |
|---|---|---|---|
| 1 | Store hours row described the server-rendered Joint hours list without saying it is hidden | Every Joint hours list is hidden at every breakpoint; the visible footer hours are the Monday-first text list | `tmp/understand/fixer/hours-lists.mjs`: 742 `ul.joint-hours-list` instances in `audit/raw`, 742 with an ancestor carrying all six `elementor-hidden-*` classes, 0 visible. `tmp/understand/fixer/fixcheck.mjs` section K: the Monday-first list (widget `cf8f393`) has no hidden ancestor. Same correction as the critic's hours item in `facts/client-facts.json` and FACTS-EVIDENCE |
