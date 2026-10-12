# capecodcannabis.com: site architecture (as captured 2026-10-12)

Lane: UNDERSTAND / ia. Machine-readable twin: `audit/understand/ia-map.json` (templates, nav, 7,323 routes, dead links,
filter links, SEO per template, third parties). Every count below was produced by the scripts in
`tmp/understand/ia/` (`classify.mjs`, `features.mjs`, `seo.mjs`, `links.mjs`, `build-iamap.mjs`) over
`audit/site-inventory.json`, `audit/seo-inventory.json`, `audit/failures.json`, `audit/raw/*.html` and `audit/prelock/*`.
No request was made to capecodcannabis.com for this document.

**Evidence limits.** The origin locked us out at 00:44:20Z. There is no live computed-style capture, no screenshot and
no product crawl. "Hidden at every breakpoint" means hidden by Elementor classes; the computed visibility is UNVERIFIED.
On this Windows disk, `audit/raw/categories-cbd.html` and `categories-seeds.html` hold the bytes of the **uppercase**
variants `/categories/CBD` (226,737 B) and `/categories/Seeds` (229,884 B). The case-insensitive file system overwrote
the lowercase pages (226,941 B and 230,088 B in `site-inventory.json`).

## 1. What a builder must know first

1. **Trailing slash everywhere.** Every page `<loc>` in the saved sitemaps (4,636 of 4,636) and every canonical ends
   in `/`. A request without the slash gets a 301 to it (752 redirect chains in the inventory). Build each path as
   `<path>/index.html` and write every internal link with the slash.
2. **The catalog is client-rendered.** 497 crawled page URLs carry a `div#joint-menu` product grid, and 73 carry
   `div.joint-slider` (81 sliders in all). Each grid's filter is a JSON preset in `data-config` (`raw.category`,
   `brand`, `strain`, `effects`, `terpenes`, `cannabinoids`, `special`, `staffpicks`, `collections`, `weights`,
   `pricemax`, `sort`, `limit`). The rebuild must render each page's grid from that preset. The static HTML holds no
   product cards.
3. **Products: 5,857 URLs, none crawled.** `/sitemap/` (the HTML sitemap page) links all 5,857 distinct `/products/*/`
   URLs, which recovers the full list even though product sitemap 2 was not saved. Product sitemap 1 holds 4,000 of
   them. The one captured product (`audit/prelock/t1.html`) is a shell: breadcrumb, `Product` JSON-LD (name,
   description, brand, a Dutchie image, offers) and `div.joint-product-details` with the product UUID.
4. **Two town-landing families** with different templates (section 3). Both must be kept.
5. **Filter deep-links must keep working** as client-side state on the base path: `?brand=`, `?category=&brand=&sort=`,
   `?strain=`, `?product=<uuid>` and `?s=` (section 5.4).
6. **20 dead internal links on the live site** (section 5.3). The rebuild must not reproduce them as dead.
7. **Remove on rebuild:**
   - the WP Defender honeypot `<a href="/7b62afab7960ee01" rel="nofollow">Secret Link</a>` inside a
     `display:none` div, which is on all 745 pages;
   - the agency badge (rankreallyhigh.com, nofollow) in the footer;
   - the WP Defender `Disallow` lines in robots.txt.
8. **The same global chrome is on 741 of 743 HTML files:** header template `18695` and footer template `1996`.
   `/links/` and `/free-bar-coasters/` have neither.
9. **Copy that exists but is hidden** at every enabled breakpoint must still be accounted for in the content ledger:
   - the announcement bar;
   - a footer Loyalty sentence;
   - a Sunday-first hours list;
   - the footer push-notification link.
10. **One H1 per page will be a change from the source.** Sale landings have 0 H1s (6 of 6), `/brands/` has 13, and 11
    of 16 town pages have 2. Of the 62 blog posts, 43 have 1 H1, 1 has none, 15 have exactly 2 and 3 have more:
    `labor-day-weekend-on-cape-cod-2026` (6 H1 tags, 4 of them with no text once tags are stripped),
    `massachusetts-cannabis-purchase-limit` (9, 7 with no text) and `cannabis-101-the-beginners-guide` (10, all real
    section titles such as "Understanding Cannabinoids"). These three need a hand-checked outline: a blind one-H1 rule
    would flatten the real section structure of the beginner's guide.

## 2. Templates (every known URL)

Counts are URLs in `site-inventory.json` (931) plus the URLs we know of but never crawled. A query or case variant
counts under its base template.

| Template | URL regex (rebuild path, slash form) | Crawled 200 | 403 | 404 | Known, not crawled | Elementor template | Visible breadcrumb |
|---|---|---|---|---|---|---|---|
| home | `^/$` | 1 | | | | wp-page 117740 | none |
| standard page | `^/[a-z0-9-]+/$` (page-sitemap, not a family below) | 25 | | 4 | | wp-page per page | 11 of 25 |
| blog post | single slug listed in post-sitemap | 62 | | | | single-post 6157 (61) | Home / Category / Title |
| blog index | `^/our-blog/(page/\d+/)?$` | 1 | | | pages 2-6 | archive 10600 | Home / Our Blog |
| blog category archive | `^/category/[a-z0-9-]+/(page/\d+/)?$` | 5 | | | page 2-4 (cannabis-101), 2-3 (start-here), 2 (cape-cod-lifestyle) | archive 10600 | Home / Category |
| blog date archive (day) | `^/\d{4}/\d{2}/\d{2}/$` | 56 | | | | theme | none |
| blog tag archive | `^/tag/[a-z0-9-]+/$` | 0 | 131 | | | UNVERIFIED | UNVERIFIED |
| event | `^/event/[a-z0-9-]+/$` | 60 | | | | tec_event_single_dynamic 92071 | none |
| events calendar | `^/events-calendar/(list/\|category/<slug>/\|page/\d+/)?$` | 1 | 5 | | page 2 | TEC view | none |
| town landing, CPT | `^/recreational/[a-z0-9-]+-ma-\d{5}/$` | 56 | | | | single-post 12 + sections 5339, 9522 | none |
| town landing index | `^/recreational/(page/\d+/)?$` | 5 | | | | archive 13755 | Home / Recreational Geo |
| town landing, page | `^/(recreational-dispensary-near-\|dispensary-near-)[a-z0-9-]+/$` | 16 | | 4 | | wp-page per page | none |
| brand | `^/brands/[a-z0-9-]+/$` | 252 (249 distinct + 3 `?product=` variants) | 7 | 1 | | single-post 6278 | Home / Brands / name |
| brands index | `^/brands/(page/\d+/)?$` | 1 | | | pages 2-21 | archive 4479 | Home / Brands |
| category | `^/categories/[a-z0-9-]+/$` | 15 (11 distinct + CBD/Seeds case variants + 2 `?product=` variants) | 3 (strain-filter views) | 1 | | single-post 13166 | Home / Categories / name |
| subcategory | `^/categories/[a-z0-9-]+/[a-z0-9-]+/$` | 51 | | 2 | | single-post 13166 | Home / Categories / parent / name |
| categories index | `^/categories/(page/\d+/)?$` | 1 | | | page 2 | archive 11910 | Home / Categories |
| product | `^/products/[a-z0-9-]+/$` | 0 (1 prelock) | | | 5,857 | single-post 6278 | Home / Products / name |
| products index | `^/products/(page/\d+/)?$` | 1 | | | pages 2-489 | archive 13755 | Home / Products |
| special | `^/specials/[a-z0-9-]+/$` | 17 | | | 1 | single-post 4468 | none |
| specials index | `^/specials/(page/\d+/)?$` | 1 | | | page 2 | archive 113037 | none |
| offers (redirect only) | `^/offers/([a-z0-9-]+/)?$` | 0 | 11 | 8 | | redirect to /specials/ | n/a |
| terpene | `^/terpenes/[^/]+/$` (Greek slugs percent-encoded, e.g. `%ce%b1-pinene`) | 52 | | | | single-post 6278 | Home / Terpenes / name |
| cannabinoid | `^/cannabinoids/[^/]+/$` | 20 | | | | single-post 6278 | Home / Cannabinoids / name |
| effect | `^/effects/[a-z0-9-]+/$` | 10 | | | | single-post 13750 | Home / Effects / name |
| strain | `^/strains/[a-z0-9-]+/$` | 5 (incl. 1 query variant) | | | | single-post 13750 | Home / Strains / name |
| taxonomy index | `^/(terpenes\|cannabinoids\|effects\|strains)/$` | 4 | | | | archives 13614 / 13674 / 134678 / 134837 | Home / name |
| taxonomy pagination | `^/(terpenes\|cannabinoids)/page/\d+/$` | 1 | 4 | | | archive | Home / name / Page N |
| store | `^/stores/[a-z0-9-]+/$` | 1 | | | | none | none |
| stores index | `^/stores/$` | 1 | | | | none | none |
| shop menu | `^/menu/$` | 1 | | | | wp-page 755 | Home / Menu |
| collection | `^/(staff-picks\|top-sellers\|new-products\|sleep-products\|shop-high-testing-flower)/$` | 5 | | | | wp-page per page | Home / name |
| sale landing | `^/all-[a-z-]+-(on-sale\|bundles)/$` | 6 | | | | wp-page per page | none |
| checkout | `^/checkout/$` | 1 | | | | wp-page 122520 | none |
| loyalty / account shells | `^/(my-orders\|my-points\|loyalty-sign-in\|loyalty-sign-up)/$` | 4 | | | | wp-page per page | none |
| legal | `^/(privacy-policy\|terms-of-use\|disclaimer\|return-policy)/$` | 4 | | | | wp-page per page | none |
| utility | `^/(sitemap\|links\|join-our-newsletter)/$` | 3 | | | | wp-page per page | 2 of 3 |
| search results | `/?s=<term>` | not requested by design | | | 21 terms linked | UNVERIFIED | UNVERIFIED |
| non-HTML | `llms.txt`, `llms-full.txt`, `locations.kml`, 2 PDFs in `/wp-content/uploads/2024/02/` | 5 | | | | n/a | n/a |

Notes on the table:
- Totals: 750 x 200, 161 x 403 and 20 x 404, which is all 931 inventory rows.
- The 5 crawled 200 non-HTML files were not saved. The inventory has no `savedAs` for non-HTML, so the bodies of
  `llms.txt` and the others are UNVERIFIED.
- The breadcrumb separator is `" / "`. Markup: `nav.rank-math-breadcrumb[aria-label=breadcrumbs] > p > a … span.separator … span.last`,
  on 503 raw files.

## 3. Town landing pages: two families

| | CPT family `/recreational/<slug>/` | Page family `/recreational-dispensary-near-*/`, `/dispensary-near-*/` |
|---|---|---|
| Source | Joint "Recreational Geo" post type, in `joint_recreational-sitemap.xml` (57 entries: 56 pages plus the `/recreational/` index) | WordPress pages in `page-sitemap.xml` (16) |
| Count | 56 (all 200), plus the index and pages 2-5 | 16 x 200, plus 4 dead `-0xxxx` variants (404, each linked from 23 pages) |
| Template | One shared single template (single-post 12, sections 5339 and 9522) | A hand-built Elementor page each (unique wp-page id); section 5693 on 8 |
| Copy | Templated per ZIP code, about 1,000 words. H1 "Cannabis Dispensary near Brewster, MA 02631" | Unique long copy, 2,300-2,700 words. H1 "Cape Cod Cannabis Dispensary in Wellfleet, MA" (11 of 16 have 2 H1s) |
| Slugs | `recreational-marijuana-dispensary-near-<town>-ma-<zip>` (55) and one `recreational-cannabis-dispensary-near-west-harwich-ma-02671` | `recreational-dispensary-near-me-in-<town>`, `recreational-dispensary-near-<town>[-zip]`, `dispensary-near-me-in-<town>-<zip>`, `dispensary-near-provincetown` |
| Shop widgets | Category tiles, "Shop by Effect" tiles, full Joint menu grid (preset `limit` only), Google reviews badge, jet-carousel | Shop-by-Effect tiles, Google reviews badge, jet-carousel, no Joint grid |
| Structured data | BreadcrumbList, LocalBusiness, Store | BreadcrumbList, LocalBusiness, Store, **FAQPage** |
| Title | "Recreational Marijuana Dispensary Near <Town>, MA <ZIP> \| Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA \|" (most) | Per page, e.g. "Best Recreational Dispensary Near Me in Brewster 02631" |
| Map | none | Google Maps iframe on 10 of 16 |
| Linked from | Only the `/recreational/` archive (pages 1-5) and `/sitemap/`: 6 source pages in all | The global footer service-area list (all 16, on 743 pages) |

## 4. Navigation

### 4.1 Header (Elementor header template 18695)

Header pieces, top to bottom:
- **Announcement bar.** An html widget in container `5664df5` with the text "Boards in the Stores is back for 2026 and
  bidding is now open! Click here to bid or learn more!", linking to `/boards-in-the-stores-2026-returns-to-cape-cod/`.
  The container carries `elementor-hidden-*` for all six enabled breakpoints. The laptop breakpoint is disabled. So the
  bar is in the markup on every page (the link counts in the link graph) but is hidden at every width.
- **Logo.** An image linking to `https://capecodcannabis.com`, with alt "Dispensary near me | Cape Cod Cannabis
  Dispensary in Wellfleet, MA" (700x568 webp).
- **Main menu.** Elementor `nav-menu` `8d9c881` (a WordPress menu), horizontal, with caret-down submenu icons. It
  collapses to a burger ("Menu Toggle") at tablet width, 1025px and below. Labels are verbatim from
  `tmp/understand/ia/header.html`:

```
L1 Home -> /
L1 Shop Menu -> /menu
   L2 Shop All -> /menu
   L2 Offers -> /specials
   L2 Flower -> /categories/flower/
   L2 Pre-Rolls -> /categories/pre-rolls
   L2 Edibles -> /categories/edibles
   L2 Vaporizers -> /categories/vaporizers
   L2 Tinctures -> /categories/tinctures
   L2 Concentrates -> /categories/concentrates
   L2 Topicals -> /categories/topicals
   L2 Seeds -> /categories/seeds
   L2 CBD -> /categories/cbd
   L2 Accessories -> /categories/accessories
   L2 Apparel -> /categories/merch/
      L3 Custom 420 Baseball Jersey -> /420-jersey/
      L3 Size: Small -> /brands/small
      L3 Size: Medium -> /brands/medium
      L3 Size: Large -> /brands/large
      L3 Size: X-Large -> /brands/xl
      L3 Size: XX-Large -> /brands/xxl
      L3 Hats -> /brands/one-size/
   L2 Shop Gift Cards -> /?s=gift-card
L1 Cannabis 101 -> /intro-to-cannabis   (alias; redirects to /intro-to-cannabis-101/)
   L2 Intro to Cannabis 101 -> /intro-to-cannabis-101/
   L2 Events & Pop-Ups -> /events-calendar/
   L2 FAQs -> /faqs-420/
   L2 FREE Rack Card Program -> /free-rack-cards/
   L2 Our Blog -> /our-blog/
   L2 Terpene & Cannabinoid Guide -> /terpene-cannabinoid-guide/
   L2 Understanding the Daily Purchase Limit -> /daily-purchase-limit-in-ma/
L1 Ship My Apparel -> https://bluetail.cc   (target _blank)
   L2 Shop All -> https://bluetail.cc/shop-our-merch/   (_blank)
   L2 CCC 420 Baseball Jersey -> /420-jersey/
   L2 Accessories -> https://www.bluetail.cc/product-category/accessories   (_blank)
   L2 Hats -> https://www.bluetail.cc/product-category/dispensary-hats   (_blank)
   L2 Sweatshirts -> https://www.bluetail.cc/product-category/dispensary-sweatshirts   (_blank)
   L2 T-Shirts -> https://www.bluetail.cc/product-category/dispensary-t-shirts   (_blank)
L1 Shop Your Loyalty Points -> /shop-your-loyalty-points/
L1 About -> /about-cape-cod-cannabis/
   L2 About -> /about-cape-cod-cannabis/
   L2 Contact -> /contact-cape-cod-cannabis/
   L2 Discover Wellfleet -> /things-to-do-near-cape-cod-cannabis-in-wellfleet-ma/
   L2 FAQs -> /faqs-420/
   L2 Hours of Operation -> #hours        (dead anchor: no id="hours" on any of 743 raw files)
   L2 Join Our Team -> /join-our-team-cape-cod-cannabis/
   L2 Leave Your Review! -> /leave-your-review/
   L2 Loyalty VIP Program -> /loyalty-sign-up/
   L2 Return Policy -> /return-policy/
   L2 Stay Connected -> /join-our-newsletter/
L1 Directions -> /directions/
   L2 Directions -> /directions/
   L2 Discover Wellfleet -> /things-to-do-near-cape-cod-cannabis-in-wellfleet-ma/
```

- **Search.** An Elementor search form submitting GET to `https://capecodcannabis.com` with field `s` and placeholder
  "Search Cape Cod Cannabis...". The Joint typeahead script loads on every page (`var jointTypeahead` is in all 743
  raw files). Its `inputSelector` is `form[role="search"] input[name="s"], input.search-field,
  input[type="search"][name="s"]`. In `index.html` that matches the visible Elementor header input
  `#elementor-search-form-c275c97` (type=search, name=s; its form has no `role`) through the third selector, and the
  hidden JetSearch input `#search-input-348550e` (its form has `role="search"`). Only the runtime behaviour is
  UNVERIFIED. A JetSearch ajax-search widget (`348550e`, category select "All Categories, Cannabis 101, Cannabis News, Cape Cod
  Lifestyle, Inside Cape Cod Cannabis, Start Here") is in the header but hidden at every breakpoint.
- **"Mega menu" strips.** Two Elementor `n-menu` widgets, `ff8edfc` and `82ce976`. They are flat link strips, not
  dropdowns: every item has `item_dropdown_content: "no"` and no icon or image, with `open_on: hover`,
  `horizontal_scroll: enable` and `breakpoint_selector: none`. Each link carries a `title` attribute.
  - Strip 1: "⭐ Daily Offers ⭐" /specials (title "Shop Daily Offers") · Flower /categories/flower/ ("Shop Cannabis
    Flower") · Pre-Rolls ("Shop Pre-Rolls") · Edibles ("Shop Edibles") · Vaporizers ("Shop Vaporizers") · Tinctures
    ("Shop Tinctures") · Concentrates ("Shop Concentrates") · Topicals ("Shop Topicals") · Seeds ("Shop Cannabis
    Seeds") · CBD ("Shop CBD") · Accessories ("Shop Cannabis Accessories") · Apparel /categories/merch/ ("Shop Cape Cod
    Cannabis Apparel"). Every strip-1 link uses the slash form.
  - Strip 2: Effects /effects ("Shop by Effects") · Strains /strains ("Shop by Strains") · Terpenes /terpenes ("Shop by
    Terpenes") · Cannabinoids /cannabinoids ("Shop by Cannabinoids").

**Mobile vs desktop.** The same menu is rendered a second time as `elementor-nav-menu--dropdown` behind the burger at
1025px and below. The strips scroll sideways. The hint "Scroll left-right to view categories" (container `4e160cb`) is
hidden on desktop and widescreen, so it shows at 1026px and below. Live breakpoints: mobile ≤767, mobile_extra ≤880,
tablet ≤1025, tablet_extra ≤1026, desktop 1027-1366, widescreen ≥1367 (laptop disabled).

**Floating UI on every page:**
- a back-to-top button `#topButton` (fixed), linking to `#topBar` (the id is present on 742 raw files);
- the Joint cart widget (`variant fixed`, `icon store`, `size small`).

### 4.2 Footer (Elementor footer template 1996), in source order

| Block | Content (verbatim) |
|---|---|
| Newsletter band | Heading "Stay connected with Cape Cod Cannabis"; text "Join our Newsletter below and stay connected with new arrivals, offers, events and other related Cape Cod Cannabis news ."; button "JOIN OUR NEWSLETTER", linking to /join-our-newsletter/. Hidden at every breakpoint: "Sign up for our free Loyalty VIP Program in-store … that you can redeem for Accessories, Apparel or CBD ." (link /shop-your-loyalty-points/) |
| Brand column | Footer logo (CCC-Logo-Footer.webp, links home), "Always worth the trip!", social links: Facebook (facebook.com/Cape-Cod-Cannabis-112536844674702/), Linkedin (linkedin.com/company/cape-cod-cannabis/), Twitter (twitter.com/capecodcanna), Instagram (instagram.com/thecccstore.ma) |
| Hours | Heading "Hours". Visible: "Monday 8am – 8pm … Sunday 8am – 8pm". Hidden everywhere: a Sunday-first "8:00am – 8:00pm" list |
| Contact | "Cape Cod Cannabis Recreational Dispensary 1446 US-6 Wellfleet, MA 02667"; "(774) 383-3133" (tel:); "Contact Us" /contact-cape-cod-cannabis; "Directions" /directions |
| Menu | Shop All /menu/ · Shop Offers /specials · Shop by Cannabinoids /cannabinoids · Shop by Terpenes /terpenes/ · Shop by Effects /effects/ |
| Learn | Intro to Cannabis /intro-to-cannabis-101/ · Customer Reviews /customer-reviews · Our Blog /our-blog/ · About /about-cape-cod-cannabis/ · FAQs /faqs-420/ |
| Legal row | "Copyright © 2026 Cape Cod Cannabis Recreational Dispensary. All Rights Reserved."; Privacy Policy · Terms Of Use · Return Policy · Disclaimer · "#MR282685" |
| Service area | "Cape Cod Cannabis Recreational Dispensary is an adult-use cannabis dispensary located on Route 6 in South Wellfleet, proudly serving residents and visitors throughout Cape Cod, including:" followed by 16 town links: Barnstable, Bourne, Brewster, Chatham, Dennis, Eastham, Falmouth, Harwich, Hyannis, Mashpee, Orleans, Provincetown, Sandwich, Truro, Wellfleet, Yarmouth (all to the page family; mixed slash forms) |
| Chambers | "Cape Cod Cannabis Recreational Dispensary is a proud member of the following Chambers on Cape Cod:" Wellfleet, Eastham and Yarmouth Chamber of Commerce (external) |
| Push | Hidden everywhere: "What are push notifications?", linking to /receive-web-ios-push-notifications/; OneSignal custom-link container |
| Translate | GTranslate wrapper `#gt-wrapper-66525644` |
| Agency badge | RRH logo, "Cape Cod Cannabis.com support by Rank Really High", rankreallyhigh.com (nofollow). **Remove.** |

### 4.3 In-page navigation

- FAQ and accordion sections use Elementor `nested-accordion` on many pages: home, category pages, town pages,
  `/faqs-420/` and the loyalty pages.
- `/cannabis-glossary-101/` uses `menu-anchor` jump targets.
- Event singles have the TEC event-navigation widget (previous and next event) and an export widget (`?ical=1` and
  Outlook links). The export widget's visible labels are not recorded here.
- Blog posts have post navigation and a comments widget.
- `/our-blog/` uses load-more (`data-max-page="6"`).
- The other archives use `rel="next"` (section 5.5).

## 5. Internal linking

### 5.1 Hubs

- 66 targets are linked from 700 or more pages: the header menu, the strips, the footer and the 16 footer town pages.
  The top one is the WP Defender trap (745 pages), then `/intro-to-cannabis` (744).
- The most-linked targets outside the chrome:

| Target | Linked from |
|---|---|
| `/brands/` | 252 |
| `/categories/apparel` (an alias) | 99 |
| `/categories/edibles/drinks/` | 86 |
| 9 of the 10 `/effects/<effect>/` pages (the "Shop by Effect" tiles); `/effects/uplifted/` has only 1 | 74-75 |
| `/categories/` | 67 |
| `/events-calendar/category/pop-ups/` | 53 (now 403) |
| `/tag/pop-up-event/` | 41 |
| `/category/cannabis-101/` | 39 |

### 5.2 Orphans and unlisted pages

- **Orphans** (in a sitemap, no inbound link from any crawled page): `/products/`, `/stores/`, `/sitemap/`, `llms.txt`,
  `llms-full.txt`, `locations.kml`, and `/specials/simpler-daze-sunday-28g-popcorn-2-for-140/`. The last one is in
  the saved specials sitemap but was never requested; why is UNVERIFIED.
- **Linked but in no sitemap:**
  - `/moodi-day-review-portal/` (200, password-protected);
  - the 56 day archives, 5 blog categories and 131 tags;
  - 8 brands not in the brands sitemap (7 x 403, plus `/brands/perpetual-harvest` 404);
  - `/categories/CBD` and `/categories/Seeds` (case variants);
  - archive pagination;
  - 4 events-calendar views;
  - the 2 crawled PDFs, plus 2 uncrawled PDFs (`2024/01/Testing-Protocol-Flyer.pdf`,
    `2026/07/Dispensary-Messaging-Stop-the-Repeal-Flyer-8.5x11.pdf`) and 4 uncrawled mp4 files in uploads;
  - the 12 aliases and the 20 dead links.

### 5.3 The 20 dead internal links (404 on 2026-10-12, `audit/failures.json`)

| Dead URL | Linked from (count, examples) |
|---|---|
| /recreational-dispensary-near-dennis-02638 | 23 (about, dispensary-near-me-in-hyannis-02601, dispensary-near-me-in-wellfleet-02667, …) |
| /recreational-dispensary-near-falmouth-02540 | 23 (same set) |
| /recreational-dispensary-near-provincetown-02657 | 23 (same set) |
| /recreational-dispensary-near-sandwich-02563 | 23 (same set) |
| /our-team | 1 (/about-cape-cod-cannabis) |
| /terpene-guide | 4 (/cannabis-101, /cannabis-glossary-101, /the-myth-of-high-thc-potency, /the-ultimate-dabbing-temperature-guide) |
| /blog | 1 (/the-myth-of-high-thc-potency) |
| /beautiful-wellfleet-ma-attractions | 1 (/cape-cod-summer-guide-2025-cape-cod-cannabis) |
| /categories/concentrates/hash | 1 (/cannabis-glossary-101) |
| /categories/concentrates/rosin | 4 (/dab-vocab-101, /the-ultimate-dabbing-temperature-guide, /what-is-710-dab-day, /what-is-live-rosin) |
| /categories/clones | 1 (/cannabis-seeds-vs-clones) |
| /brands/perpetual-harvest | 2 (/cannabis-chronicles-insights-into-premium-products, /event/perpetual-harvest-pop-up) |
| /offers/end-of-summer-blowout | 2 (/labor-day-weekend-on-cape-cod-2026, /things-to-do-near-cape-cod-cannabis-in-wellfleet-ma) |
| /offers/stocking-stuffers-2025 | 1 (/the-best-holiday-cannabis-gifts-on-cape-cod) |
| /offers/concentrates-1g-2-for-5-off-3-for-10-off-4-for-15-off-5-for-20-off | 1 (/categories/concentrates) |
| /offers/tinctures-treeworks-2-for-10-off-3-for-15-off-4-for-20-off | 3 (/categories/tinctures and its 2 ?product variants) |
| /offers/500mg-syrups-3-for-99 | 4 (/categories/edibles, /categories/tinctures, …) |
| /offers/cartridges-jeeter-1g-5-for-120 | 1 (/categories/vaporizers) |
| /offers/vaporizers-1g-3-for-69-5-for-105 | 1 (/categories/vaporizers) |
| /offers/jeeter-1g-cartridge-5-for-120 | 1 (/categories/vaporizers) |

All eight `/offers/<slug>` URLs 301 to `/specials/<slug>`, which then 404s (expired specials). In the rebuild, each
dead link must be repointed to a live equivalent or unlinked, with the text kept. That choice belongs to the operator
or the content lane.

### 5.4 Filter deep-links (keep as client-side state)

| Form | Example | Seen |
|---|---|---|
| `?s=` search | `/?s=gift-card` (nav, 744 pages), `/?s=moonrocks`, `/menu?sort=relevance&s=moonrocks` | 21 terms |
| category + brand + sort | `/categories/edibles/?category=edibles&brand=wana&sort=price-high-to-low` (also `brand=mindy's edibles`, `kanha`; flower `brand=cape cod grow lab`) | 4, + 1 with `&product=` |
| `?brand=` on a brand page | `/brands/wana/?brand=Wana` (10 brands) | 10 |
| `?product=<id>` (opens a product) | `/brands/resinate/?product=645d…`, `/categories/tinctures/?product=4e16…` | 5 + 1 with `?s=` |
| category + strain | `/categories/flower/?category=flower&strain=indica` (also sativa, hybrid; 403 now) | 3 |
| `?strain=` | `/strains/high-cbd/?strain=high-cbd` (canonical to the plain URL) | 1 |
| events | `?ical=1` on all 60 events, `/events-calendar/list/?ical=1`, `?outlook-ical=1`, `?eventDisplay=past` | 63 |

The `?brand=` and category-filter forms were measured as text-identical to the plain page and canonical to it (per the
brief). `seo-inventory` also shows that `?strain=`, `?product=` and the case variants carry a canonical pointing to
the plain lowercase URL. The rebuild serves the base path and reads the query into filter state. Product IDs come in
two shapes: a UUID, and a 24-hex id (likely Dutchie's; UNVERIFIED).

**Mixed hosts and tracking parameters in internal links** (not filter state; normalise them):
- 82 raw files link to the `www` host, which the live site does not use: 105 hrefs, of which 59 point to the bare
  `https://www.capecodcannabis.com` (59 files) and 46 to `https://www.capecodcannabis.com/directions…` (23 files).
- 23 files add Google Analytics linker parameters to those `/directions` links, e.g. `about-cape-cod-cannabis.html` →
  `https://www.capecodcannabis.com/directions?_gl=1*1hdn1y4*_gcl_au*…*_ga*…`.
- `event-treeworks-pop-up-3.html` links `https://capecodcannabis.com/?utm_source=gmb&utm_medium=organic`.
- One outbound link carries the partner's own tag: `things-to-do-near-cape-cod-cannabis-in-wellfleet-ma.html` →
  `https://wellfleetrestaurantweek.com/?utm_source=capecodcannabis.com`. That one is outbound and may stay.

Evidence: `tmp/understand/fixer/fixcheck.mjs` (section G5) and `tmp/understand/fixer/follow.mjs`.

### 5.5 Pagination (known, mostly uncrawled)

| Archive | Pages | Evidence |
|---|---|---|
| /products/page/N/ | 2-489 | `data-max-page`; anchors to 2-25 |
| /brands/page/N/ | 2-21 | `data-max-page` |
| /our-blog/page/N/ | 2-6 | load-more |
| /category/cannabis-101/page/N/ | 2-4 | |
| /category/start-here/page/N/ | 2-3 | |
| /category/cape-cod-lifestyle/page/N/ | 2 | |
| /recreational/page/N/ | 2-5 | crawled |
| /terpenes/page/N/ | 2-5 | 403 |
| /cannabinoids/page/2/ | 2 | crawled |
| /categories/page/2/, /specials/page/2/, /events-calendar/page/2/ | 2 or more | `rel=next` only, so the maximum is UNVERIFIED |

## 6. SEO surface

| Template | Title pattern (verbatim fragments) | Robots | Canonical | JSON-LD types (beyond the global ones) |
|---|---|---|---|---|
| home | "Cape Cod Cannabis \| Wellfleet's Top Rated Cannabis Store on Cape Cod" | index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large | self | Place, LocalBusiness+Organization, WebSite, ImageObject, FAQPage, Store (AggregateRating 4.9 / 967) |
| blog post | per post, mostly "… \| Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA" | index (same directives) | self | WebPage, Person, Article, ImageObject, BreadcrumbList (VideoObject on 2) |
| day archive | "Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA \| November 7, 2021" | **follow, noindex** | **none**; no meta description | CollectionPage, BreadcrumbList |
| blog category archive | "<Category> Archives \| Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA \|" | index (with snippet directives) | self | CollectionPage, FAQPage |
| blog index | "Our Blog \| Cape Cod Cannabis Blog \| Dispensary Near Me" (og:type website) | index (with snippet directives) | self | CollectionPage, FAQPage |
| tag archive | UNVERIFIED (all 403) | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| brand | "Buy <Brand> Brand Products Online \| Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA" | index | self (query variants point to the plain URL) | WebPage, Person, Article |
| category / subcategory | per page; subcats "Shop Cannabis <Sub> for Sale \| … Wellfleet, MA \|" | index | self (CBD and Seeds case variants point to lowercase) | WebPage, Person, Article |
| terpene | "Cannabis with <Terpene> Terpenes \| …" | index | self | BreadcrumbList |
| cannabinoid | "Shop <Name> at Cape Cod Cannabis Dispensary in Wellfleet, MA" | index | self | BreadcrumbList |
| effect | "Buy Cannabis for to feel <Effect> \| …" (verbatim, including "for to feel") | index | self | BreadcrumbList |
| strain | "Buy <Strain> Cannabis for Sale \| … \|" | index | self | WebPage, Article |
| special | "October <Offer> \| Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA on Cape Cod" | index | self | **Offer**, Article |
| product (1 sample) | "Claravita Maui Waui \| Popcorn \| Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA" (the JSON-LD name is "Maui Waui \| Popcorn"; the brand is Claravita) | index | self | **Product**, Brand, Offer, BreadcrumbList |
| event | "<Event> \| Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA" (16 duplicate titles) | index | self | **Event on all 60** (The Events Calendar's own ld+json block: 58 files have 1 Event block, 2 have 2). The rebuild must emit Event schema on every event |
| town CPT | "Recreational Marijuana Dispensary Near <Town>, MA <ZIP> \| …" | index | self | BreadcrumbList |
| town page | per page | index | self | **FAQPage** |
| archives (brands, categories, products, specials, stores, recreational, taxonomy indexes, calendar) | e.g. "Shop Cannabis by Brands \| …", "October Cannabis Deals on Cape Cod \| …" | **follow, index** (no snippet directives) | self | CollectionPage; `/events-calendar/` also carries **Event** |
| legal / utility / collection / checkout | "<Page> \| Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA \|" | index | self | BreadcrumbList |
| standard / sale landing / account | per page, e.g. "About Cape Cod Cannabis \| Wellfleet's First Cannabis Store", "Flower On Sale at Cape Cod Cannabis \| Wellfleet, MA" | index | self | per page: AboutPage, ContactPage, HowTo, FAQPage, VideoObject |

Global SEO facts:
- **On every crawled template:** `LocalBusiness` and `Store` JSON-LD, and `BreadcrumbList` everywhere except the home
  page. The prelock product page shows 7 `OpeningHoursSpecification` entries, `AggregateRating` and 5 store `Review`s
  inside its LocalBusiness block.
- **Open Graph:** `og:type` is `website` on the home page and blog index only, `article` everywhere else. On the home
  page, `og:site_name` is "Cape Cod Cannabis Recreational Dispensary is the Best Dispensary on Cape Cod".
- **Twitter:** `summary_large_image` on all 745 pages. The home page sets `twitter:site` and `twitter:creator` to
  `@capecodcanna`.
- **hreflang:** none on any page. GTranslate uses `url_structure: "none"`, which means client-side translation with
  no URL variants. It offers 14 languages: ar, zh-CN, zh-TW, en, tl, fr, de, it, ja, ko, pt, ru, es, vi.
- **Redirects:**
  - the slash 301 above;
  - 12 aliases folded by the crawler: `/home` → `/`; `/offers` and `/bundle` → `/specials/`;
    `/offers/affordable-ounces-1-2-ounces` → `/specials/affordable-ounces-1-2-ounces/`;
    `/categories/apparel` → `/categories/merch/`; `/seeds` → `/categories/seeds/`;
    `/intro-to-cannabis` → `/intro-to-cannabis-101/`;
    `/categories/accessories/batteries` → `/categories/accessories/batteries-devices/`;
    `/categories/concentrates/diamonds` → `diamonds-2/`; `/categories/concentrates/shatter` → `shatter-2/`;
    `/categories/pre-rolls/infused` → `/categories/flower/infused-bud-2/`;
    `/categories/pre-rolls/single-infused-pre-roll` → `single-infused-pre-roll-3/`.
    The status codes of the alias hops were not recorded.
  - The rebuild needs redirect stubs, or host rules, for all of them plus the two case variants.
- **robots.txt:**
  - Rank Math header;
  - `User-Agent: *`;
  - two WP Defender `Disallow` lines (`/7b62afab7960ee01`, `/72881c24c5395daa`);
  - `Disallow: /wp-admin/`, `Allow: /wp-admin/admin-ajax.php`;
  - sitemaps `sitemap_index.xml` and `sitemap-ai.xml`.

  The rebuild keeps the sitemap lines and drops the WordPress and Defender lines.
- **Sitemaps.** `sitemap_index.xml` lists 15 children: post, page, joint_recreational, joint_stores,
  joint_products 1 and 2, joint_brands, joint_specials, joint_categories, joint_strains, joint_effects,
  joint_terpenes, joint_cannabinoids, tribe_events, local. Saved counts: post 63, page 67, recreational 57, stores 2,
  products1 4,001 (including `/products/`), brands 250, specials 19, categories 63, terpenes 53, tribe_events 61.
  Strains, effects, cannabinoids, local and products2 were fetched by the crawler but not saved. Their URLs are seeds
  in the inventory: 20 cannabinoids, 11 effects including the index, 5 strains, `llms.txt`, `llms-full.txt` and
  `locations.kml`. `sitemap-ai.xml` was not saved, so its content is UNVERIFIED.
- **llms.txt, llms-full.txt, locations.kml:** each returned 200 (`text/plain` x2, `text/xml`). Their bodies were not
  saved (UNVERIFIED). The rebuild should regenerate them from rebuilt content.

## 7. Third-party dependencies

| Dependency | Where | What it renders | Server or client | What the static rebuild needs |
|---|---|---|---|---|
| Joint Commerce (`joint-ecommerce` 1.45.0, `joint-plugin` 2.35.0) | every page | `#joint-menu` grids (497 URLs), `.joint-slider` (81 on 73 URLs), `#joint-cart` (every page), `#joint-checkout` (/checkout/), `.joint-product-details` (products), typeahead, hours list (742 files), Google reviews badge (76 files), LocalBusiness/Store JSON-LD | grids, cart, checkout and product details client-side from `data-config`; hours, reviews and JSON-LD server-side | catalog data snapshot plus a vanilla renderer driven by each page's preset; honest cart and checkout entry points; real integration at handoff |
| Dutchie images | product JSON-LD `image` (images.dutchie.com); also 32 `<img>` tags pasted into the bodies of 14 event pages | product photos | third-party CDN | decide snapshot or hotlink (catalog lane); the 32 event-body images are in no image inventory and must be kept |
| Joint HighQ script (`joint-plugin/public/scripts/highq.min.js?ver=2.35.0`, `#highq-js`) | every page (743 of 743 raw files) | nothing visible in the static HTML; purpose UNVERIFIED | client | not shipped (decontamination); operator decision |
| Google review avatars (`lh3.googleusercontent.com`) | 77 raw files (Joint reviews widgets) | reviewer photos | hotlinked | snapshot with the review text, or drop |
| Hotlinked images in body copy | `static.wixstatic.com` (2 Stingers event pages), `mcusercontent.com` (cannabis-control-commission-testing-regulations-update), `www.hellavated.com`, `levia.buzz`, `u4eafarms.com` (1 event page each) | images inside post and event bodies | hotlinked | snapshot or keep the hotlink; check each still resolves |
| Joint specials images (`joint-product-photos.s3.amazonaws.com`) | 17 raw files (specials singles) | special-offer images | third-party S3 | already in `audit/image-inventory.json`; snapshot with the specials |
| Age Gate plugin | 743 files | `<template id="tmpl-age-gate">` overlay; fields `age_gate[age]`, `age_gate[lang]`, `age_gate[confirm]` | client | own 21+ dialog, verbatim copy |
| Alpine IQ (id 1209) | pixel `lab.alpineiq.com/p/1209.js` on every page; join iframe `/join/c/1209/110622` on /join-our-newsletter/; wallet iframe `/wallet/1209` on /loyalty-sign-in/ | loyalty and newsletter forms | client iframes | keep the iframes or link out (operator) |
| OneSignal v16 (appId 58f942b5-…) | every page plus a footer container | web push | client | operator decision |
| GTranslate | footer, every page | language switcher | client | operator decision |
| GTM GTM-TF6V5JS and GTM-TGHGZQ44, server-side GTM on sst.capecodcannabis.com, Clarity, Ahrefs analytics, analytics.wpmucdn.com | every page | tracking | client | not shipped (decontamination); operator re-adds |
| Google Maps embed | home, about, contact, directions, faqs-420, things-to-do, 10 town pages, 58 events | map iframe | client | lazy iframe or static map plus directions link |
| Self-hosted video (`<video>`) | about, boards-in-the-stores, cannabis-chronicles, intro-to-cannabis-101, massachusetts-cannabis-repeal-2026, 3 events | mp4 and mov from uploads | native | files listed in `audit/media-inventory.json` |
| Elementor Pro forms | /contact-cape-cod-cannabis/ (name, email, 2 custom fields, message); /join-our-team-cape-cod-cannabis/ (name, email, 5 custom fields) | forms POSTed via admin-ajax | server | a form endpoint at handoff |
| Purchase-limit calculator | /daily-purchase-limit-in-ma/ | fields flower, concentrate, vape, tincture, edibles, moonrocksQty | client | re-implement in vanilla JS |
| Password-protected page | /moodi-day-review-portal/ | `wp-login.php?action=postpass` form | server | operator decision |
| Smash Balloon Instagram and Elementor popup 236015 | /about-cape-cod-cannabis/ | feed and popup | client | a static grid and a dialog |
| The Events Calendar | /event/* and /events-calendar/ | singles, list view, tribe-bar search, iCal and Outlook export | singles server-side | a static list and singles; .ics optional |
| JetSearch / JetElements | header (hidden), blog archives (search suggestions), home (jet-brands, jet-banner), /faqs-420/ and /specials/ (horizontal timeline), effects and town pages (jet-carousel) | widgets | client | own components |
| WP Defender | honeypot link on every page; robots.txt lines | bot trap | server | remove |
| Blue Tail apparel shop | "Ship My Apparel" menu | outbound links (bluetail.cc) | n/a | keep the links |

## 8. Route map rules (the full list is `ia-map.json` → `routes`, 7,323 rows)

- **Keep every path.**
  - Rebuilt path = the live pathname with a trailing slash, as `index.html`.
  - Non-HTML files keep their exact path (`/llms.txt`, `/llms-full.txt`, `/locations.kml`,
    `/wp-content/uploads/2024/02/*.pdf`).
  - Percent-encoded terpene and cannabinoid slugs stay encoded in links. On disk they are the decoded characters,
    which needs checking against the host.
- **Query variants** (`?product=`, `?brand=`, `?strain=`, `?category=…`, `?s=`) are not separate files. They render
  the base path.
- **Normalise hosts and strip tracking parameters before link checks and route mapping.** Rewrite
  `http(s)://www.capecodcannabis.com/…` and `https://capecodcannabis.com/…` hrefs to root-relative paths with the
  trailing slash. Drop `_gl`, `_ga`, `_gcl_au` and `utm_*` from internal links. Otherwise the link check misses or
  double-counts these links (section 5.4), and the rebuild ships tracking parameters.
- **Redirect stubs:** the 12 aliases, `/categories/CBD/` and `/categories/Seeds/`, and `/offers/<slug>/` →
  `/specials/<slug>/` where the special exists.
- **Not built:** the 20 dead URLs (fix their links instead) and the WP Defender trap.
- **Known but not crawled.** The build must plan for these from captured data:

| Family | Count | Note |
|---|---|---|
| products | 5,857 | full list from /sitemap/ |
| archive pagination | 522 | listed in `routes` |
| tag archives | 131 | 403; titles and content UNVERIFIED |
| specials | 1 | in the sitemap, not requested |
| unlisted brands | 7 | 403 |
| events-calendar list and category views | 5 | 403 |
| terpenes pagination | 4 | 403 |

  Route counts by template and status are in `ia-map.json` → `routeCounts`.

## 9. UNVERIFIED (could not be checked without the origin)

- The computed visibility of every "hidden" element. No live capture was possible.
- The bodies of `llms.txt`, `llms-full.txt`, `locations.kml` and `sitemap-ai.xml`.
- The tag archives' template, robots and canonical.
- The product sitemap 2 file (its URLs are recovered from /sitemap/).
- What the Joint typeahead does at runtime. Its binding selector and the inputs it matches are known (section 4.1).
- What `/my-orders/` and `/my-points/` render client-side.
- The redirect status codes of the 12 aliases.
- Why `/specials/simpler-daze-sunday-28g-popcorn-2-for-140/` was never requested.
- The maximum page for /categories/, /specials/ and /events-calendar/ pagination.

## Verification log (fixer lane, 2026-10-12)

Each critic item was re-run against the raw evidence before this doc changed. Scripts: `tmp/understand/fixer/fixcheck.mjs`
(output `fixcheck-out.json`), `follow.mjs`, `follow2.mjs`; all are read-only over `audit/raw`, `audit/prelock` and the
audit JSON. `audit/understand/ia-map.json` was patched by `tmp/understand/fixer/patch-iamap.mjs` (pre-patch copy:
`tmp/understand/fixer/ia-map.before.json`; the patch list is in `ia-map.json` → `verificationLog`).

| # | Was | Now | Evidence |
|---|---|---|---|
| 1 | §6 event row: "Event on only 2 of 60" | Event on all 60 event singles, and on `/events-calendar/` | Parsing every `application/ld+json` block in the 60 `audit/raw/event-*.html`: 60 of 60 have an `Event` node (58 with 1 Event block, 2 with 2), 0 parse errors; e.g. `event-wana-pop-up-2.html` has a 4th block typed Event, Place, PostalAddress. `events-calendar.html` also has Event. `ia-map.json` seo.perTemplate.event and events-calendar corrected |
| 2 | §1 item 10: "17 blog posts have 2" H1s | 15 have exactly 2; 3 have 6, 9 and 10 | `<h1` count over the 62 posts of `audit/prelock/sm-post-sitemap.xml` (63 locs minus `/our-blog/`): {0:1, 1:43, 2:15, 6:1, 9:1, 10:1}. Counting only outside `<script>` gives the same 6/9/10. `ia-map.json` blog-post h1Count corrected |
| 3 | §4.1 and §9: typeahead binding UNVERIFIED | Selector and matched inputs recorded; only runtime UNVERIFIED | `index.html`: `inputSelector` quoted above; inputs `#elementor-search-form-c275c97` (visible) and `#search-input-348550e` (form role=search; it sits inside an element that carries all six `elementor-hidden-*` classes; nearest ancestors with a data-id are `1044960` and `348550e`) |
| 4 | §5.4 and §8 had no rule for www links and tracking parameters | Added | 82 files with `href="https://www.capecodcannabis.com…"` (105 hrefs: 59 bare host on 59 files, 46 `/directions…` on 23 files); 23 files with `_gl=`; 1 internal `utm_source` (event-treeworks-pop-up-3). The critic's "58 to the bare host" re-counts as 59 |
| 5 | §7 third-party table missing hosts | Added HighQ, Google review avatars, body hotlinks, Joint specials S3; Dutchie row widened | Host census over `src`/`data-src`/`href`/`srcset` of script, iframe, img, source, video and link tags: `lh3.googleusercontent.com` 77 files, `images.dutchie.com` 14 (32 `<img>`), `static.wixstatic.com` 2, `mcusercontent.com`, `www.hellavated.com`, `levia.buzz`, `u4eafarms.com` 1 each, `joint-product-photos.s3.amazonaws.com` 17 (found by this check, not by the critic); `highq.min.js` on 743 of 743 files |

Checked and left unchanged: the dead-link table (§5.3) already said "All eight" `/offers/` links (site-inventory: 20 rows
with status 404, 8 of them `/offers/`). `audit/failures.json` now holds 33 "status 404" items because the assets stage
added 13 image 404s (`assets:image`); the 20 page-level dead links are unchanged. The brand row (252 crawled, 249
distinct plus 3 `?product=` variants, 7 x 403, 1 x 404) re-counts the same from `site-inventory.json`.
