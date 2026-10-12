# Facts and evidence: Cape Cod Cannabis

Owner: facts lane (UNDERSTAND phase), 2026-10-12. Machine-readable twin: `facts/client-facts.json`, where every fact has
its page, saved file and verbatim quote. Compliance rules and flags: `docs/COMPLIANCE.md`.

Evidence base: `audit/raw/*.html` (745 pages, crawl run A) and `audit/prelock/*`. No request was made to
capecodcannabis.com (the origin has blocked this machine since 2026-10-12T00:44:20Z).

**Verification:** `node tmp/understand/facts/verify-quotes.js` re-checks every quote in `client-facts.json` against
the saved page text (or raw HTML for markup-only facts).

- Result: 74 quotes verified, 0 missing.
- The positive control (an invented quote) was correctly reported as missing.
- One fact, the logo's "EST. 2018", was read from the image by eye.

## What a designer or builder must know

| Fact | Value as printed | Where (main evidence) |
|---|---|---|
| Brand | Cape Cod Cannabis | logo, headings |
| Name in copyright line | Cape Cod Cannabis Recreational Dispensary | footer, every page |
| Legal entity name | **Not printed anywhere.** Terms say only "the Company". Ask the client. | /terms-of-use |
| Address | 1446 US-6 Wellfleet, MA 02667 ("Located in the Rt.6 shopping plaza in South Wellfleet") | footer; /contact-cape-cod-cannabis |
| Phone | (774) 383-3133 (tel: +1-774-383-3133) | footer, every page |
| E-mail | info@capecodcannabis.com (careers: hr@capecodcannabis.com) | /contact-cape-cod-cannabis, /terms-of-use; /join-our-team-cape-cod-cannabis |
| Hours | Open daily 08:00–20:00. The visible footer list reads "Monday 8am – 8pm … Sunday 8am – 8pm" (Monday first). A second, Sunday-first "8:00am – 8:00pm" list in footer container `467fc28` is hidden at every breakpoint: do not render it as the footer wording. /customer-reviews says "Open daily, 8 AM–8 PM" | visible footer list (every page with the footer); /customer-reviews |
| Licence | #MR282685 (issuer not named on the site; MR prefix suggests a CCC Marijuana Retailer licence: **UNVERIFIED**) | footer legal row, once per page on the 741 files with the footer; also once in the body of /free-rack-cards/ and twice in the body of /free-bar-coasters/ (no footer). **/links/ does not carry it**, nor any footer legal link (client decision, COMPLIANCE §4.3) |
| Founded / opened | Logo "EST. 2018"; About "Established 2018" and "Open Since 2021"; much copy says "Since 2021" | logo PNG; /about-cape-cod-cannabis |
| Slogan | "Always worth the trip!" | age gate (all 743 files), footer (741 files) |
| Rating as printed | "4.9 / 5.0 star rating", "900+ Google Reviews", widget badge "4.9" "(967)" | home; /customer-reviews |
| Award (claim) | "2026 Cape Cod Choice Awards: Best CBD Store Winner, Top 3 Best Cannabis Dispensary" | home, About, FAQs |
| Payment | cash, debit cards and CanPay, on-site ATM; "ATM and Debit transactions will incur a small third-party merchant fee." | About FAQ; /directions panel |
| Parking | "For your convenience, we have 26 dedicated parking spaces. Several municipal parking spaces are located in the shopping plaza at no charge as well." | /directions, home panel |
| Age rule | 21+ with valid government ID; expired out-of-state or international IDs not accepted | About FAQ |
| Purchase limit (visible copy) | "As of April 19, 2026 , Massachusetts law allows you to purchase up to 2 ounces of flower (Recreational) or its equivalent..." | FAQ on 23 pages; /daily-purchase-limit-in-ma |
| Loyalty | Free Loyalty VIP Program, sign-up in store; points redeemable for Accessories, Apparel or CBD; "Loyalty Points CANNOT be used for cannabis products" | footer; /join-our-loyalty-vip-program-today |
| Returns | "strict 5-day return policy exclusively for defective or damaged vape cartridges and pods" | /return-policy |
| Social | Facebook, LinkedIn, Twitter (twitter.com/capecodcanna), Instagram (instagram.com/thecccstore.ma) | footer icons |
| Chambers | Wellfleet, Eastham and Yarmouth Chambers of Commerce | footer |
| Area served | Barnstable, Bourne, Brewster, Chatham, Dennis, Eastham, Falmouth, Harwich, Hyannis, Mashpee, Orleans, Provincetown, Sandwich, Truro, Wellfleet, Yarmouth | footer |
| Announcement bar (dated) | "Boards in the Stores is back for 2026 and bidding is now open! Click here to bid or learn more!" | top bar at crawl time |

**Not printed** (so the rebuild must not state them):

- a legal entity name;
- owner, founder or management names, and any ownership statement (no "family-owned" or "locally owned");
- an accessibility statement (no wheelchair, ADA or accessible-parking text);
- a privacy-policy date;
- any cannabis delivery service. Online ordering is pre-order for in-store pickup. The only "delivery" wording is on
  /free-rack-cards and /free-bar-coasters (delivering printed cards and coasters to local businesses). Checked with
  `grep -i "deliver(y|ies)"` over all page texts. An ownership grep (family-owned, locally owned, founder and similar)
  found only statements about other brands and towns.

## Conflicts the client must resolve

| # | Topic | What conflicts (evidence) | Handling until resolved |
|---|---|---|---|
| C1 | Founding year | Logo "EST. 2018" and About "Established 2018" vs "Since 2021", "Since opening in 2021", "Celebrate 420 & Our 5th Anniversary" (April 2026). Home JSON-LD: `"foundingDate": "2018"` plus `"Retail Store Open Since"` `"2021"`. | Both are printed and likely mean company 2018, store 2021. Keep each label exactly as printed; never write "serving since 2018". |
| C2 | Payment methods | Visible: "We accept cash, debit cards and CanPay". Another FAQ answer: "we accept cash and debit payment options". Joint JSON-LD (743 pages): `paymentAccepted` "Cash"; custom JSON-LD: "Cash, Debit Card, CanPay". | Show only verbatim sentences; ask the client. |
| C3 | Purchase limit | Visible copy on 23 pages: 2 ounces / 56 grams. Home and /faqs-420 JSON-LD FAQ (stale): "up to 1 ounce of flower ... 28 grams (flower) a day ... 500mg of edibles ... 5g of concentrates". | Do not regenerate the stale markup. |
| C4 | Facebook URL | Footer: facebook.com/Cape-Cod-Cannabis-112536844674702/. Joint JSON-LD: facebook.com/107188521043656/. Rank Math and ezlocal JSON-LD: facebook.com/profile.php?id=100077867156438. | `sameAs` uses the visible footer link; ask the client. |
| C5 | Geo coordinates | 41.9162662,-69.9883627 (Joint; matches the Google Maps link 41.916266,-69.988363); 41.916283126902506,-69.98835964200036 (custom Store); 41.916265712481554,-69.98840341462632 (Rank Math). | First pair used. All are within a few metres. |
| C6 | Street | "1446 US-6" printed; Google Maps link text "1446 State Hwy Wellfleet, MA 02667". | Print "1446 US-6". |
| C7 | Opening hours markup | Rank Math JSON-LD (489 pages): "Mo,Tu,We,Th,Fr,Sa,Su 8:00 - 8:00" (no am/pm) vs 08:00–20:00 everywhere else. | Use `hoursSpec` 08:00–20:00. |
| C8 | Price range | Joint JSON-LD "$" vs custom JSON-LD "$$" (markup only). | Left unset. |
| C9 | Business type | Joint JSON-LD alternateName includes "Medical Marijuana Dispensary"; all visible copy says adult-use / recreational. | Do not carry it over. |
| C10 | Testing statement | Visible: "required to meet Massachusetts testing and labeling requirements". Home JSON-LD FAQ: "state-tested and lab-certified to ensure purity, potency, and safety". | Visible wording only (see COMPLIANCE R6). |
| C11 | Review count | "900+" (static) vs "(967)" (live widget at crawl time). | Both printed; date the snapshot (2026-10-12). |
| C12 | Organization name | Rank Math JSON-LD name "Cape Cod Cannabis in Wellfleet - Best dispensary on Cape Cod." (a claim used as a name). | Use "Cape Cod Cannabis". |
| C13 | Staff e-mail in markup | Home JSON-LD (ezlocal block) lists jbourgea@capecodcannabis.com. | Do not publish without the client's consent. |
| C14 | Extended hours on a past event | /event/spring-in-to-4-20-celebration: Friday and Saturday "8:00 am – 9:00 pm", "4th Anniversary". | A past event, not current hours. |

No second phone number for the store exists. The other phone numbers on the site are the Massachusetts Substance
Abuse Helpline "800 327 5050" / "(800) 327-5050" and poison control "1-800-222-1222". Every page prints the same store
number. Phone tally from `audit/content-inventory.json` `contact.phones`: (774) 383-3133 on 744 pages; tel forms on
745.

## Reviews and testimonials

- **Where:**
  - The Joint reviews widget (`ul.joint-review-list`) shows 1 review on the home page (Lyn Clements) and 10 on
    `/customer-reviews`.
  - JSON-LD `review[]`: 5 undated reviews on 743 pages.
  - Summary lines: home "We have 900+ reviews with a 4.9 / 5.0 star rating…"; About "⭐ 900+ Google Reviews",
    "⭐ 4.9★ Rating" and "Google Rating 4.9 Stars ⭐⭐⭐⭐⭐".
- **Source:** Google ("Read reviews on our Google Business Profile"; avatars hotlinked from `lh3.googleusercontent.com`).
- **The 10 visible reviews** (verbatim in `client-facts.json` → `testimonials`):

| Author | Date | Rating | Text (verbatim) |
|---|---|---|---|
| Lyn Clements | 10/08/2026 09:39 PM | 5.0 | Hannah was the icing on the cake of our experience. Sad that we live in the Berkshires because we would make you our store of choice. |
| Mike Korenich | 10/03/2026 04:39 PM | 5.0 | Quick, efficient. Pointed out some specials I was eligible to consider. Thanks! |
| James Kelly | 10/02/2026 06:38 PM | 5.0 | Hannah always has a friendly smile to greet you with and excellent knowledge about the products and deals. |
| Joseph Vitale | 09/30/2026 04:54 PM | 5.0 | Hannah is awesome |
| Barry McKeon | 09/26/2026 05:58 PM | 5.0 | Very professional |
| Lucas Warburton | 09/23/2026 05:21 PM | 5.0 | Hannah is extremely helpful! |
| Diane ODonnell | 09/22/2026 01:26 PM | 5.0 | Always a pleasure. Friendly, helpful staff. Clean well organized and decorated shop. Hannah’s smile and demeanor is welcoming. She is very knowledgeable. |
| Ryan Mickle | 09/15/2026 01:41 PM | 4.0 | (no text) |
| Paul Shuhi | 09/10/2026 12:39 PM | 5.0 | Hannah was so friendly and knowledgeable. She made the experience so easy amd carefree for us. We will definitely be coming back because of her service!! |
| Wesley Shuhi | 09/10/2026 12:30 AM | 5.0 | Hannah was great had an awsome experience will definitely visit again |

Display rules (full list in COMPLIANCE §8):

- Show reviews verbatim, typos included, with name, date, rating and "Google" as the source.
- Date the snapshot.
- Do not copy avatars into the repo.
- No new or edited reviews.

## The 20 dead internal links (client-facing finding)

The live site links to 20 URLs that return 404 (`audit/failures.json`, stage `crawl:page`, `reason: "status 404"`;
the 13 further `assets:image` 404s in that file are images, not links). Eight of them are `/offers/...` links that
301-redirect to `/specials/...` and then 404. Referring pages come from an href scan of
`audit/raw` (`tmp/understand/facts/deadlinks.js`, output `deadlinks.json`). A fix target is suggested only when a live
(status 200) page clearly matches. "Client to decide" means no obvious target exists.

| # | Dead link | Linked from (count: pages) | Anchor | Suggested fix (evidence) |
|---|---|---|---|---|
| 1 | /recreational-dispensary-near-dennis-02638 | 23: FAQ answer "Where is Cape Cod Cannabis located?" on home, /about-cape-cod-cannabis, /faqs-420, the town landing pages, loyalty pages | "Dennis" | /recreational-dispensary-near-me-in-dennis (200 in site-inventory) |
| 2 | /recreational-dispensary-near-falmouth-02540 | same 23 | "Falmouth" | /recreational-dispensary-near-falmouth (200) |
| 3 | /recreational-dispensary-near-provincetown-02657 | same 23 (including /dispensary-near-provincetown itself) | "Provincetown" | /dispensary-near-provincetown (200) |
| 4 | /recreational-dispensary-near-sandwich-02563 | same 23 | "Sandwich" | /recreational-dispensary-near-sandwich (200) |
| 5 | /our-team | 1: /about-cape-cod-cannabis | button "Learn More" | Client to decide. /join-our-team-cape-cod-cannabis (200) is the careers page, which is a different intent. |
| 6 | /terpene-guide | 4: /cannabis-101, /cannabis-glossary-101, /the-myth-of-high-thc-potency, /the-ultimate-dabbing-temperature-guide | "Terpene Guide", "terpenes" | /terpene-cannabinoid-guide (200) |
| 7 | /offers/end-of-summer-blowout (301 to /specials/..., then 404) | 2: /labor-day-weekend-on-cape-cod-2026, /things-to-do-near-cape-cod-cannabis-in-wellfleet-ma | "Shop Our End of Summer Blowout Offers" | /specials (200; aliases /offers and /bundle), or remove the expired promotion (COMPLIANCE §6) |
| 8 | /categories/concentrates/hash | 1: /cannabis-glossary-101 | "Hash (Hashish)" | No hash category in the categories sitemap (grep count 0). Parent /categories/concentrates (200); client to confirm. |
| 9 | /offers/stocking-stuffers-2025 (301, then 404) | 1: /the-best-holiday-cannabis-gifts-on-cape-cod | image banner | /specials, or remove (seasonal, expired) |
| 10 | /categories/concentrates/rosin | 4: /dab-vocab-101, /the-ultimate-dabbing-temperature-guide, /what-is-710-dab-day, /what-is-live-rosin | "LIVE ROSIN", "rosin", "Rosin" | /categories/concentrates/live-rosin (200; in the categories sitemap) |
| 11 | /blog | 1: /the-myth-of-high-thc-potency | "our blog" | /our-blog (200) |
| 12 | /categories/clones | 1: /cannabis-seeds-vs-clones | "Shop All Clones", "clone", "clones" | Client to decide. No clones category in the sitemap; nearest is /categories/seeds (200). |
| 13 | /beautiful-wellfleet-ma-attractions | 1: /cape-cod-summer-guide-2025-cape-cod-cannabis | "Click here" | /things-to-do-near-cape-cod-cannabis-in-wellfleet-ma (200; the header "Discover Wellfleet" link target) |
| 14 | /brands/perpetual-harvest | 2: /cannabis-chronicles-insights-into-premium-products, /event/perpetual-harvest-pop-up | "Shop Perpetual Harvest", "Click here to shop Perpetual Harvest products!" | Client to decide. Not in the brands sitemap (grep count 0); the brand may no longer be carried. |
| 15 | /offers/concentrates-1g-2-for-5-off-3-for-10-off-4-for-15-off-5-for-20-off (301, then 404) | 1: /categories/concentrates | image banner | /specials, or remove |
| 16 | /offers/tinctures-treeworks-2-for-10-off-3-for-15-off-4-for-20-off (301, then 404) | 3: /categories/tinctures (plus 2 `?product=` views) | image banner | /specials, or remove |
| 17 | /offers/500mg-syrups-3-for-99 (301, then 404) | 4: /categories/edibles, /categories/tinctures (plus 2 `?product=` views) | image banner | /specials, or remove. Do not substitute the different live offer /specials/chill-medicated-500mg-syrups-2-for-65. |
| 18 | /offers/cartridges-jeeter-1g-5-for-120 (301, then 404) | 1: /categories/vaporizers | image banner | /specials, or remove |
| 19 | /offers/vaporizers-1g-3-for-69-5-for-105 (301, then 404) | 1: /categories/vaporizers | image banner | /specials, or remove |
| 20 | /offers/jeeter-1g-cartridge-5-for-120 (301, then 404) | 1: /categories/vaporizers | image banner | /specials, or remove |

These 20 links most likely triggered the firewall lockout (WP Defender 404 detection: **UNVERIFIED**). The rebuild's
link check must treat them as source defects. Once the client approves a fix target, record it as a declared change
in the ledger; until then, never silently repoint a link.

## Evidence index (commands, all reproducible from the workspace)

| What | Command or script |
|---|---|
| Per-page text dumps | `node tmp/understand/facts/dump.js` writes `tmp/understand/facts/text/*.txt` from `audit/content-inventory.json` |
| JSON-LD facts (ratings, reviews, sameAs, payment, geo, names) | `node tmp/understand/facts/jsonld.js` |
| Dead-link referrers and candidates | `node tmp/understand/facts/deadlinks.js` |
| Quote verification with positive control | `node tmp/understand/facts/verify-quotes.js` (exit 0: 74 verified, control fired) |
| Hours variants | `grep -ohiE "([0-9]{1,2}(:[0-9]{2})? ?[ap]\.?m\.?) ?(–\|-\|to) ?..." tmp/understand/facts/text/*.txt` |
| Licence | Over `audit/raw/*.html`: "MR282685" occurs 744 times in 742 files (`tmp/understand/fixer/fixcheck.mjs` section J): once in the footer on 741 files, plus 1 in the body of `free-rack-cards.html` and 2 in the body of `free-bar-coasters.html`; 0 in `links.html`. No other licence number. (The earlier "×1447" counted the lane's own text dumps, not the site.) |
| Logo text | `audit/prelock/logo-agegate.png`, viewed: "CAPE COD", "EST.", whale tail, "2018", "CANNABIS" |

## Verification log (fixer lane, 2026-10-12)

Each item was re-run against the evidence before this doc changed (scripts in `tmp/understand/fixer/`, read-only).
`facts/client-facts.json` was patched to match by `tmp/understand/fixer/patch-facts.mjs` (pre-patch copy
`tmp/understand/fixer/client-facts.before.json`; changes listed in its `verificationLog`).

| # | Was | Now | Evidence |
|---|---|---|---|
| 1 | Dead-links intro: "Ten of them are /offers/ links" | Eight | `site-inventory.json`: 20 rows with status 404, 8 of them under `/offers/`; the table below already lists 8 offers rows. `audit/failures.json` now also holds 13 `assets:image` 404s (33 "status 404" items in all) |
| 2 | Evidence index: "#MR282685 ×1447 (about 2 per page)"; licence "every page" | 744 occurrences in 742 raw files: once in the footer on 741 files, 1 more in the /free-rack-cards/ body, 2 in the /free-bar-coasters/ body, 0 on /links/ | `fixcheck.mjs` section J and `follow2.mjs` (c). The text dumps in `tmp/understand/facts/text/*.txt` hold 1,447, which is where the old figure came from |
| 3 | Hours row cited the footer as "Sunday to Saturday 8:00am – 8:00pm" | The visible footer list is Monday first, "8am – 8pm" (widget `cf8f393`); the Sunday-first "8:00am – 8:00pm" list (footer widget `467fc28`) is hidden at every breakpoint, and so is the same list in the /contact-cape-cod-cannabis/ body (widget `69f3ff6`) | `fixcheck.mjs` section K (`467fc28` carries all six `elementor-hidden-*` classes; the Monday list has no hidden ancestor) and `hours-contact.mjs` |
| 4 | Slogan "age gate, footer" | Age gate on all 743 files; footer on 741 | `fixcheck.mjs` section E, `follow2.mjs` (b) |
