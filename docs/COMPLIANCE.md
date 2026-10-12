# Compliance brief: Massachusetts adult-use cannabis rules for the redesign

Owner: facts lane (UNDERSTAND phase), 2026-10-12. Evidence: `audit/raw/*.html` (crawl run A), `audit/prelock/*`,
the CCC copy of 935 CMR 500.000 and two CCC bulletins (cited below). No request was made to capecodcannabis.com.
This is not legal advice. Every item marked **FLAG** is for the client's compliance review. The rebuild keeps live copy
verbatim, so this document **does not propose edits** to existing copy.

## What the designer and builder must know first

1. **The age gate is a legal requirement, not decoration.** 935 CMR 500.105(4)(b)13 prohibits "Operation of any website
   of a Marijuana Establishment that fails to verify that the entrant is 21 years of age or older". It must cover every
   URL (deep links included), and the copy stays verbatim (section 4.1).
2. **No new promotional-pricing UI.** The CCC bulletin of 2026-09-25 says staff "have and will continue to cite
   Licensees" for "Sale", "Discount", "Special", "Showing strike-through of higher prices next to new price",
   "Promos/Promotional Offer", "Special offer", "X% off", "Buy X get X free" and "different terms that have the same
   effect" on websites and online menus. So the redesign must not add sale badges, strike-through prices, "% off"
   chips or countdown "deal" timers. The live site already uses such words. They are kept verbatim and **FLAGGED**
   (section 6), not amplified.
3. **No new health, safety or curative claims, in copy or in imagery.** 500.105(4)(b)7. Existing claims are
   **FLAGGED** (section 5).
4. **Generated imagery:** nobody who is or looks under 21; no cartoons, mascots or kid-appeal; no medical symbols;
   nothing misleading. Plain-English rules are in section 2.
5. **New microcopy** (button labels, empty states, toasts, badges) follows section 3. When in doubt, use plain, neutral
   words: "View menu", "Add to order", "Pick up in store".

## 1. The rules that constrain a website redesign

Source text: 935 CMR 500.000 as hosted by the CCC
(<https://masscannabiscontrol.com/wp-content/uploads/2023/10/935cmr500.pdf>, header "(Mass. Register #1507,
10/27/2023)"). I extracted it with `pdftotext -layout`, and 500.105(4) is at lines 3938 to 4092 of that text. A later
compilation exists (a search result cites Mass. Register #1535, 11/22/2024, on mass.gov). mass.gov returned HTTP 403,
so whether 500.105(4) wording changed in that version is **UNVERIFIED**. The CCC began a "major regulatory overhaul"
in September 2026 (CCC announcement, title seen in search results only, **UNVERIFIED**). Re-check before launch.

| # | Rule (935 CMR 500.105(4)) | Verbatim (short) | What it means for the rebuild |
|---|---|---|---|
| R1 | (b)1 deceptive or misleading | "Advertising in such a manner that is deemed to be is deceptive, misleading, false or fraudulent, or that tends to deceive or create a misleading impression, whether directly or by omission or ambiguity" | No invented facts, counts, ratings, awards or reviews. AI images must not pass as the real store, staff, customers or products. |
| R2 | (b)2 85 % audience 21+ | "Advertising by means of television, radio, internet, mobile applications, social media, ... unless at least 85% of the audience is reasonably expected to be 21 years of age or older" | Keep the 21+ gate. Treat social share cards and open-graph images as internet advertising (my interpretation, not a CCC statement): keep them to logo and storefront imagery, and never use kid-appealing art. |
| R3 | (b)3 portraying under-21s | "Advertising that utilizes statements, designs, representations, pictures or illustrations that portray anyone younger than 21 years old" | No people who look under 21 in any image. |
| R4 | (b)4 and (b)5 appeal to under-21s | "Advertising including, but not limited to, mascots, cartoons, and celebrity endorsements, that is deemed to appeal to a person younger than 21 years old" | No mascots, cartoon characters or celebrity likenesses. Treat a whale-tail mascot or cartoon animation as out of scope. The logo's whale tail is the existing Brand Name mark and stays as is. |
| R5 | (b)6 statements about other licensees | "makes any false or statements concerning other Licensees and the conduct and products of such other Licensees that is deceptive, misleading..." | No new comparative copy ("better than", "cheapest on the Cape"). Existing superlatives are FLAGGED (section 7). |
| R6 | (b)7 safety, curative or therapeutic claims | "asserts that its products are safe, or represent that its products have curative or therapeutic effects, ... unless supported by substantial evidence or substantial clinical data" | No new "relieves", "treats", "heals", "safe", "wellness" claims or medical imagery. Existing claims are FLAGGED (section 5). |
| R7 | (b)13 website age verification | "Operation of any website of a Marijuana Establishment that fails to verify that the entrant is 21 years of age or older" | Age gate on every page, deep links included. "No" must not let the visitor in. |
| R8 | (b)14 objectionable | "the use of language or images offensive or disparaging to certain groups" | Review generated images and copy for stereotypes. |
| R9 | (b)18 price advertising | "Advertising of the price of Marijuana or Marijuana Products, except as permitted above pursuant to 935 CMR 500.105(4)(a)6." (a)6: the establishment "may post the same catalogue or printed list on its website" | Plain price lists or menus are allowed. Promotional framing of prices is not (R10). |
| R10 | (b)20 promotions and loyalty | "Advertising through the marketing of free promotional items including, but not limited to, gifts, giveaways, discounts, points-based reward systems, customer loyalty programs, coupons, and "free" or "donated" Marijuana" | No new deal, coupon, giveaway or points UI. The live loyalty, "Offers" and "Specials" copy is FLAGGED (section 6). |
| R11 | (a)7 warnings on public advertising | "Any such Advertising created for viewing by the public shall include the statement "Please Consume Responsibly", in a conspicuous manner ... and shall include a minimum of two of the following warnings in their entirety" (a. impairment and habit forming; b. impair concentration, do not operate a vehicle; c. health risks; d. "For use only by adults 21 years of age or older. Keep out of the reach of children."; e. pregnant or breastfeeding) | Any new promotional banner or graphic that advertises products should carry "Please Consume Responsibly" plus two warnings verbatim. Whether a website page is "Advertising" is a counsel question: FLAG. |
| R12 | (a)8 FDA warning on advertising for products | "All Advertising produced by or on behalf of a Marijuana Establishment for Marijuana or Marijuana Products shall include the following warning, including capitalization" (the "This product has not been analyzed or approved by the Food and Drug Administration (FDA)..." text) | The live site carries this text only on `/disclaimer` (section 4.2). Whether product, category and specials pages need it is a counsel question: FLAG. Never paraphrase it, because capitalization is mandated. |
| R13 | (a)1 Brand Name | "use of medical symbols, images of Marijuana or Marijuana Products or related Paraphernalia images that are appealing to persons younger than 21 years old, and colloquial references to Marijuana and Cannabis are prohibited from use in the Brand Name" | Do not redraw or extend the logo with leaf art, medical crosses or slang. |
| R14 | (b)9 illuminated signage, (b)16 vehicles, (b)17 exterior signs | about physical signs and vehicles | Do not generate images of illuminated or neon exterior signs or branded vehicles that could pass as the real store. |

Related rules (not 500.105(4), but useful context for imagery):

- 500.105(6)(b), packaging: may not be attractive to minors. It is "explicitly prohibited from" "Using bright colors,
  defined as colors that are "neon" in appearance", "Featuring cartoons", "Featuring symbols or celebrities that are
  commonly used to market products to minors" and "Featuring images of minors".
- 500.160(b), edibles: shapes of "a human, animal, fruit, or sporting-equipment item" are prohibited, "including
  artistic, caricature, or cartoon renderings". Do not generate edibles in such shapes.

CCC guidance:

- **Bulletin: Advertising Activities, 2024-05-21** (<https://masscannabiscontrol.com/2024/05/bulletin-advertising-activities-may-21-2024/>):
  - (b)20 covers "broadcasting a reduced or promotional pricing offered on their in-store and online menus", "the use
    of terms including, but not limited to "sale", "discount", "purchase program", "xx% off"", "showing
    strike-throughs of higher prices next to lower prices", and "advertising via third-parties or through an ME's
    website or social media".
  - An age gate is "Minimal interaction by the Consumer".
  - "Licensees must ensure that all advertising and marketing practices taken by, or on behalf of the Licensee by a
    third-party" comply. This covers the design agency.
- **Bulletin: Advertising Compliance regarding Chapter 65, 2026-09-25** (<https://masscannabiscontrol.com/2026/09/bulletin-advertising-compliance-regarding-chapter-65-september-25-2026/>):
  - "Chapter 65 did not extend advertising or discounting allowances to Licensee websites".
  - "when a Licensee broadcasts a reduced or promotional price through its online menus it is engaging in advertising."
  - Licensees "may also offer purchase programs or bundled pricing," "but it cannot be communicated in a way that
    markets Marijuana or Marijuana Products as free, discounted, or promotional".
  - **Segregated deals pages are still advertising (context now verified).** The full sentence reads: "Minimal
    interaction by the Consumer, such as verifying that they are over 21 years old via a website’s age gate, in
    accordance with Commission regulations, or segregating discounts into a separate portion of the Licensee’s website
    where Consumers attest to accessing the price list, does not make the communication personalized." The next
    sentence is the "broadcasts a reduced or promotional price" line above. So neither the age gate nor a separate,
    attested "Deals" or "Bundles" area turns website pricing into a personalized message. Do not design one as a
    compliance workaround. Source: the bulletin page saved by the critic lane,
    `tmp/understand/critic/dl-b2/bulletin-2026-09-25.html` (page title "Bulletin | Advertising Compliance regarding
    Chapter 65 | September 25, 2026 - Cannabis Control Commission Massachusetts").
- Chapter 65 of the Acts of 2026 ("An Act Modernizing the Commonwealth's Cannabis Laws", effective 2026-04-19) lets the
  Commission permit limited in-store and opt-in email advertising. Source: the 2026-09-25 bulletin. The statute itself
  was not read: **UNVERIFIED**.
- CCC Administrative Order No. 6 (2026-04-19) set the two-ounce limit. Source: a search summary only; the order was not
  read: **UNVERIFIED**. The site's own "As of April 19, 2026 ... up to 2 ounces" copy is consistent with it.

Not found in the rule text: an explicit ban on **depicting consumption**. A search of 500.105(4) for "depict" and
"consum" found no such rule. Still treat images of smoking or vaping as out of scope for generated imagery. The plan
already bans them (`docs/PLAN.md`, "Imagery is honest"), and they risk R2 and R11. If anyone needs that rule cited,
label it **UNVERIFIED**.

## 2. Rules for AI-generated imagery (fal stills, Higgsfield loops)

| Do | Do not |
|---|---|
| Cape Cod place mood: dunes, bay light, marsh grass, shingled textures, Route 6 travel feel, ocean water, whale-watching horizon (no whale mascot) | Anyone who looks under 21, families with children, students, school or college settings (R3) |
| Abstract botanical close-ups, macro textures, resin-like light, glassware as still life without smoke | Cartoons, mascots, characters, anime, plush or toy styles, candy look, bright "neon" palettes (R4, 500.105(6)(b)) |
| Adults who clearly look 25 or older, only as unnamed atmosphere, and never presented as staff, customers or reviewers | People consuming (smoking, vaping, eating edibles), visible smoke plumes, impaired or "high" poses (plan rule; R2 and R11 risk) |
| Product-agnostic jars, tins and boxes with no readable text | Readable brand names, fake labels, potency numbers, prices, "SALE" or deal signage, coupons (R1, R10) |
| Calm, adult, coastal palette from the brand tokens (#02A7EB, #015375, #C0E9FA) | Medical symbols (crosses, pills, stethoscopes, lab coats implying treatment), healing or "wellness clinic" scenes (R6, R13) |
| Label every generated asset with the IPTC `trainedAlgorithmicMedia` XMP (`tools/ai-label.xmp`) | Images that could pass as the real storefront, staff, products, events or awards (R1) |
|  | Edibles shaped like people, animals, fruit or sports gear (500.160(b)) |
|  | Illuminated exterior signs, branded vehicles, transit-stop ads (R14) |

Every generated image is reviewed by eye against this table before use. Motion loops follow the same rules frame by
frame.

## 3. Rules for new UI microcopy

| Element | Use | Avoid (cited) |
|---|---|---|
| Primary buttons | "View menu", "Shop the menu", "Add to order", "Place pre-order", "Get directions", "Call the store" | "Grab the deal", "Claim offer", "Save now" (R10; 2026-09-25 bulletin) |
| Price display | One plain price per item | Strike-through prices, "was/now", "% off", "Sale" or "Special" badges, crossed-out totals (2026-09-25 bulletin) |
| Empty states | "No products match these filters.", "Your order is empty.", "This item is not available right now." | "Out of stock, grab it before it's gone!" (urgency marketing); "Feel better with..." (R6) |
| Effect or category filters | The live labels, verbatim | New effect words such as "Relief", "Pain", "Sleep aid", "Anxiety" (R6) |
| Age gate | Verbatim live copy (section 4.1) | Any rewording, humor or joke "No" button text |
| Reviews | Verbatim text, name, date, star value, and "Google" as the source | Composite, edited or invented quotes; star totals not printed by the source (R1) |
| Loyalty | Verbatim live copy only | New "Earn points", "Free gift", "Members save" copy (R10) |
| Trust badges | Only printed facts: "#MR282685", "Since 2021", "4.9", "900+ Google Reviews" | "Lab-tested & safe" or "Certified safe" (R6); "Best on Cape Cod" (R5) |
| Footer | Live footer copy verbatim | Health or wellness taglines |

## 4. Required notices printed on the live site (verbatim, with locations)

### 4.1 Age gate (Age Gate plugin; client-side overlay, cookie `age_gate`, age 21)

Source: `audit/raw/index.html`, age-gate markup (the same markup is on every page). Logo:
`audit/prelock/logo-agegate.png`.

> Welcome!
> Are you over 21 years of age?
> Yes | No
> *Must be 21+ with a VALID ID.
> Always worth the trip!

What the live "No" button does was not captured: **UNVERIFIED**. The plugin's inline config (the `age_gate` and
`age_gate_common` script objects in `audit/raw/index.html`, present in all 743 raw files) holds further runtime copy
that must also be kept verbatim:

> You are not old enough to view this content

(the `error` string, most likely what "No" shows), the document title while the gate is open,

> Age Verification - Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA

and the cookie warning

> Your browser does not support cookies, you may experience problems entering this site

The settings are `"age":"21"` and `"rechallenge":"1"` (most likely: after "No", the visitor may try again). How the
plugin uses `error` and `rechallenge` at runtime is **UNVERIFIED**. The rebuild's gate must show that error on "No",
must not let the visitor in, and may offer a retry. The logo alt is "Cape Cod Cannabis in Wellfleet, MA...Always worth
the trip!".

### 4.2 Disclaimer page: `/disclaimer` (H1 "Disclaimer / MA Law"; footer link "Disclaimer")

File: `audit/raw/disclaimer.html`. Quoted verbatim, including the source's typos, which must not be fixed silently.
The client may correct "associate", "at your now risk" and "Feel to contact us".

> IMPORTANT INFORMATION ABOUT CANNABIS:
> Marijuana and Marijuana Products have not been analyzed or approved by the FDA, therefore there is limited information
> on side effects. There may be health risks associate with using marijuana or marijuana products. All marijuana and
> marijuana products should be kept away from children.
> Under M.G.L. c90, §24 it is illegal to drive or operate machinery under the influence of marijuana.
> We always recommend speaking with a physician regarding dosage. For consumers who are new to cannabis we recommend
> starting with smallest dosage according to package directions and allowing sufficient time to pass to allow effects
> to be felt, based on the method of consumption or application.
> Tolerance, dependence and withdrawal have not been researched therefore please consume marijuana and marijuana
> products at your now risk.
> If you or someone you know is exhibiting signs or symptoms of substance abuse please contact the Massachusetts
> Substance Abuse Helpline at 800 327 5050 for further assistance.
> Consumer may not sell marijuana to any other individual, doing so may impose a fine and/or imprisonment; likewise
> registered qualifying patients may not distribute marijuana to any other individual, and that they must return unused,
> excess, or contaminated product to the RMD from which they purchased the product, for disposal.
> For information regarding penalties for possession or distribution of marijuana in violation of Massachusetts law
> Please refer to M.G.L. c94G, §13 .
> For additional educational materials please refer to Intro to Cannabis 101.
> For FAQs (frequently asked questions) please visit our FAQ page . Feel to contact us directly during regular business
> hours at (774) 383-3133 for assistance.
> Please consume cannabis products responsibly.
> Cannabis is for use only by adults 21 years of age or older. All information contained herein and, on our website,
> www.capecodcannabis.com, is for educational purposes only. None of this information should be interpreted as medical
> or treatment advice for any person or condition. Always consult with a licensed physician in all matters regarding your
> health.
> Please Consume Responsibly. This product may cause impairment and may be habit forming. For use only by adults 21 years
> of age or older. Keep out of the reach of children. This product has not been analyzed or approved by the Food and Drug
> Administration (FDA). There is limited information on the side effects of using this product, and there may be
> associated health risks. Marijuana use during pregnancy and breast-feeding may pose potential harms. It is against the
> law to drive or operate machinery when under the influence of this product. KEEP THIS PRODUCT AWAY FROM CHILDREN. There
> may be health risks associated with consumption of this product. Marijuana can impair concentration, coordination, and
> judgment. The impairment effects of edible marijuana may be delayed by two hours or more. In case of accidental
> ingestion, contact poison control hotline 1-800-222-1222 or 9-1-1. This product may be illegal outside of MA.

The last paragraph matches the 500.105(4)(a)8 text, with one difference: the site says "edible marijuana" where the
regulation says "Edibles". It also includes "Please Consume Responsibly" and the (a)7 warnings a. and d.

### 4.3 Footer (741 of 743 pages)

- Footer policy line: "Copyright © 2026 Cape Cod Cannabis Recreational Dispensary. All Rights Reserved. Privacy Policy |
  Terms Of Use | Return Policy | Disclaimer | #MR282685" (`audit/raw/index.html`, footer).
- **Two pages have no footer.** `/links/` (the link-in-bio canvas page) carries neither the licence number "#MR282685"
  (0 occurrences) nor any of the four legal links. `/free-bar-coasters/` has no footer but prints the licence twice
  and links Privacy Policy, Terms Of Use, Return Policy and Disclaimer in its own body. Client decision (FLAG):
  should every rebuilt page, `/links/` included, show the licence number and the legal links?
- **The footer carries no cannabis warning statement.** Counts: grep of the 745 page texts finds "has not been analyzed"
  on 1 page (`/disclaimer`) and "reach of children" on 2 pages (`/disclaimer`, `/ccc-landing-2`). Adding a warning to
  the footer would be new copy. That is the client's decision with counsel (R11, R12): FLAG.

### 4.4 Short notices found on other pages

| Notice (verbatim) | Where | Count |
|---|---|---|
| "*Cannabis is for use only by adults 21 years of age or older. All information contained herein is for educational purposes only. None of this information should be interpreted as medical or treatment advice for any person or condition. Always consult with a licensed physician in all matters regarding your health. View our Disclaimer ." | /recreational and its pages 2 to 5, /cannabinoids and its page 2, /terpenes, /products, /terpene-cannabinoid-guide | 10 pages (`grep -h -i "consult with a licensed physician"`, deduplicated) |
| "If you or someone you know is exhibiting signs or symptoms of substance abuse please contact the Massachusetts Substance Abuse Helpline at 800 327 5050 for further assistance." | /disclaimer, /intro-to-cannabis-101, /what-is-live-rosin | 3 pages |
| Same helpline sentence, lower-case "substance abuse helpline", with "(800) 327-5050" | /intro-to-cannabis-101, /learn-about-cannabis | 2 pages |
| "For adults 21+ only. Please consume responsibly. Keep out of reach of children and pets. Product availability may vary." | /ccc-landing-2 | 1 page |
| "NOTE : Per MA Cannabis Control Commission regulations, Loyalty Points CANNOT be used for cannabis products ." | FAQ and loyalty blocks | 23 pages |

### 4.5 Policy pages (footer links)

| Page | H1 | Key verbatim lines |
|---|---|---|
| `/return-policy` | Return Policy | "We uphold a strict 5-day return policy exclusively for defective or damaged vape cartridges and pods. Regrettably, we do not accept returns for accessories, vape batteries, cannabis flower, cannabis seeds, clones or pre-rolls. Your understanding and cooperation are greatly appreciated." and "If you have any questions regarding our Return Policy please contact us or call (774) 383-3133." |
| `/terms-of-use` | Terms Of Use | "These Terms of Use and your use of the Site are governed by the federal laws of the United States of America and the laws of the State of Massachusetts , without regard to conflict of law provisions." Contact: "please contact us info@capecodcannabis.com." Legal entity named only as "the Company". |
| `/privacy-policy` | Privacy Policy | "You have the right at any time to prevent us from contacting you for marketing purposes." No "last updated" or effective date was found (grep for last updated, effective date, updated on). |
| `/disclaimer` | Disclaimer / MA Law | Section 4.2 |

These four pages are carried over verbatim. The privacy policy and terms describe the old platform's services
("make appointments and place product orders for pick up"). If the rebuild changes data collection (analytics,
forms), the client must update the policy. That is new copy: FLAG.

## 5. Health and medical claims in existing copy (FLAG for the client's compliance review; no edits proposed)

Measured with `grep -l -i -E "<word>"` over the 745 page texts (`tmp/understand/facts/text/`). Page counts by keyword:
sleep 112, anti-inflammatory 44, pain 46, anxiety 32, treat* 30, wellness 30, therapeutic 13, medicinal 10, reliev 10,
appetite 9, nausea 8, seizure 4, depress 4, insomnia 3, arthritis 2. Not every hit is a claim: for example, "cure"
matches the product type "Cured Resin" on /categories/vaporizers/cured-resin-cartidge-4, and "nausea" matches a
side-effect warning on /intro-to-cannabis-101. Every example below was re-checked against its page with `grep -F`.

| Page | Verbatim quote | Rule at risk |
|---|---|---|
| /products (also the only captured product page, `audit/prelock/t1.html`, JSON-LD `Product.description`) | "May Relieve: Low mood, Stress, Tension, Discomfort" (this exact list once on `audit/raw/products.html`; the label "May Relieve:" appears 8 times there with differing lists (6 distinct strings when each is cut at its first tag), e.g. "Discomfort, Stress, Low mood, Anxiety" and "Tension, Restlessness, Mental fatigue, Stress, Low mood") | R6. Product descriptions come from Dutchie. The 5,857 product pages were not crawled, so how widespread this pattern is: **UNVERIFIED** (likely common). |
| /terpenes/alpha-bisabolol | "Entourage: Anti-inflammatory, Antimicrobial, Antibiotic, Antioxidant, Anti-cancer, Anti-anxiety, Anti-depression, and Analgesic" | R6 |
| /terpenes/phellandrene | "Entourage: Anti-inflammatory, Cancer-fighting, Anti-depressant, and Pain relief" | R6 |
| /terpene-cannabinoid-guide | "Entourage: Anti-Inflammatory, Memory Aid, Pain Relief, Stress and Anxiety Relief, Anti-Microbial, Anti-Depressant" | R6 |
| /cannabinoids/cbc-cannabichromene | "being studied for its potential therapeutic effects, including anti-inflammatory, anti-nociceptive, and anti-cancer properties" | R6 |
| /cannabis-101 | "CBD can reduce anxiety, provide pain relief, suppress nausea, support cardiovascular health, and have anti-inflammatory properties" | R6 |
| /cannabis-glossary-101 | "Indica strains are known for their relaxing, sedative effects and are often used to relieve pain, insomnia, and anxiety" | R6 |
| /cannabinoids/page/2 | "CBD (cannabidiol) – Non-psychoactive; known for potential benefits like reducing anxiety, inflammation, and seizures" | R6 |
| /an-introduction-to-cannabinoids | "THC is also a powerful compound for managing pain, improving sleep, and easing anxiety (especially in low to moderate doses)" | R6 |
| /an-introduction-to-terpenes | "Anti-inflammatory and may help with pain" and "Calming and may ease anxiety or stress" | R6 |
| /my-favorite-cannabis-products-for-sleeping-in-massachusetts | "Luckily, cannabis can be extremely effective for any insomnia-riddled users" | R6 |
| /what-is-cbd-a-beginners-guide | "CBD may offer a natural solution for sleep issues by addressing the underlying causes of insomnia, such as anxiety and pain" | R6 |
| /embracing-the-end-of-summer-on-cape-cod | "We also offer a great selection of CBD products that may help relieve aches and pains, stress, and anxiety or help with getting a better night’s sleep" | R6 |
| /event/chill-medicated-pop-up | "Recommended Uses: Muscle Soreness, Pain, Tension, Stress, Inflammation, Cramping, Skin Conditions, Muscle Strain, Arthritis, Nerve Damage, Nausea, Psoriasis, Dermatitis, Headaches, Migraines, Sunburns, Scar Tissue Repair and more" | R6 |
| /join-our-loyalty-vip-program-today | "CBD Products – Enjoy the benefits of high-quality CBD for relaxation and wellness." | R6 (milder) |
| /about-cape-cod-cannabis | "We believe in the power of cannabis to enhance lives and foster a sense of wellness." and, in the FAQ, "whether you’re looking to relax, sleep better, or try cannabis for the first time" | R6 (milder) |
| / (home JSON-LD FAQ, markup only) | "All cannabis products sold at Cape Cod Cannabis are state-tested and lab-certified to ensure purity, potency, and safety." | R6 ("safe") |

The site's own educational disclaimer (section 4.4) is on only 10 pages and does not cure a claim.

## 6. Promotional pricing and loyalty language in existing copy (FLAG)

Measured over `audit/raw/*.html`:

- "Daily Offers" in the category bar: 742 pages.
- Visible "Sale"/"SALE": 70 pages (`grep -l -E ">[^<]*\bSALE\b|>[^<]*\bSale\b"`, which includes product names).
- "% off": 7 pages.
- Strike-through markup (`<del>`, `<s>`, `line-through`): 0 pages. Joint renders prices client-side, so the live
  storefront's price display was not captured: **UNVERIFIED**.

Examples:

- `/specials` (aliases `/offers`, `/bundle`) and offer pages such as `/specials/wana-gummies-2-for-55`.
- "LIMITED EDITION! 5th Anniversary offer for only $89" on `/420-jersey`. That item is apparel, not cannabis, so it is
  listed for completeness only.
- FAQ blocks "MOONROCK MONDAY" and "$12 TUESDAY" (`/faqs-420`).
- Footer: "earn loyalty points with every purchase that you can redeem for Accessories, Apparel or CBD".

These map to R10 and the 2026-09-25 bulletin's list. The site's own note ("Loyalty Points CANNOT be used for cannabis
products") shows awareness of part of the rule. Whether the remaining language complies is for counsel. The rebuild
carries this copy verbatim and **adds no new deal UI** (section 3).

## 7. Claims about themselves (FLAG; keep verbatim, never extend)

| Claim (verbatim) | Where | Rule at risk |
|---|---|---|
| "Wellfleet's Top Rated Cannabis Store on Cape Cod" | home `<title>` | R1 (needs substantiation) |
| "Top Rated Cannabis Dispensary located in Wellfleet, MA" | /customer-reviews | R1 |
| "Cape Cod Cannabis Recreational Dispensary is the Best Dispensary on Cape Cod" | home JSON-LD (WebSite name, logo caption) | R1, R5 |
| "recognized by many as the Best Dispensary on Cape Cod" | home JSON-LD description | R1, R5 |
| "Wellfleet’s first dispensary" | /about-cape-cod-cannabis | R1 (checkable fact; client to confirm) |
| "offers the largest selection and best prices on Cape Cod" | /about-cape-cod-cannabis | R1, R5 (comparative) |
| "2026 Cape Cod Choice Awards: Best CBD Store Winner, Top 3 Best Cannabis Dispensary" | home, About, FAQs | Award claim; keep the printed wording, never upgrade "Top 3" to "Best" |
| alternateName "Medical Marijuana Dispensary" | Joint JSON-LD, every page | R1 (the store is adult-use only by every visible statement) |

## 8. Reviews and testimonials: where they are and how to show them

- **Where:** the Joint reviews widget (`ul.joint-review-list`, server-rendered) on the home page (1 review shown,
  "Lyn Clements") and `/customer-reviews` (10 reviews). Summary lines: "We have 900+ reviews with a 4.9 / 5.0 star
  rating… click to see what your neighbors are saying about their experience ." (home), "900+ ⭐⭐⭐⭐⭐ Google Reviews",
  "4.9 ⭐ rating", widget badge "4.9" "(967)".
- **JSON-LD:** the Joint `LocalBusiness` on 743 of the 745 saved pages carries `aggregateRating` (ratingValue 4.9,
  ratingCount 967) and 5 `review` items without dates (`tmp/understand/facts/jsonld.js`).
- **Source:** Google (the page says "Read reviews on our Google Business Profile"; avatars are hotlinked from
  `lh3.googleusercontent.com`).
- **Verbatim list:** in `facts/client-facts.json` → `testimonials` (author, date, rating, text). It includes source
  typos ("amd", "awsome"), which must not be corrected. Ryan Mickle (4.0) has no text.

Rules for the redesign:

1. Verbatim only: text, name, date and rating exactly as captured, with "Google" named as the source. No trimming
   inside a quote, no composites, no new reviews (R1; the plan's fabrication gate).
2. Show the capture date. The widget was live and the static copy freezes it on 2026-10-12. Never present "967" as
   current after launch without refreshing it from the source.
3. Do not mirror reviewer avatars into the repo. They are third-party personal images hotlinked from Google. Use
   initials or no avatar unless the client re-integrates the live widget.
4. Ratings: show only "4.9", "900+" and "(967)" as printed. Never round up or show a 5.0 average.
5. Reviews mention a staff member by first name ("Hannah"). Keep them as printed. Do not add staff photos or names.

## 9. Other markup-level items for the client

- The home page JSON-LD carries a personal staff e-mail (jbourgea@...) from an ezlocal listing. Do not republish it.
- Stale JSON-LD FAQ (home and `/faqs-420`): "up to 1 ounce of flower ... 28 grams" contradicts the visible
  2-ounce copy. Do not regenerate it.
- Rank Math `openingHours` "8:00 - 8:00" has no am/pm (see `docs/FACTS-EVIDENCE.md`, conflicts).

## Sources and verification status

| Source | Status |
|---|---|
| 935 CMR 500.105(4), (6)(b), 500.160(b): CCC-hosted PDF, Register #1507 (10/27/2023), extracted text read directly | Verified text of that version; currency after 11/2024 **UNVERIFIED** |
| CCC Bulletin "Advertising Activities", 2024-05-21 | Fetched; quotes taken from the fetch summary (verbatim fragments) |
| CCC Bulletin "Advertising Compliance regarding Chapter 65", 2026-09-25 | Fetched; quotes taken from the fetch summary (verbatim fragments). The full page is saved at `tmp/understand/critic/dl-b2/bulletin-2026-09-25.html` (critic lane); the "segregating discounts" sentence in section 1 was re-read there by the fixer lane |
| Chapter 65 of the Acts of 2026; CCC Administrative Order No. 6 | Seen in search results only: **UNVERIFIED** |
| Explicit "no depiction of consumption" rule in 500.105(4) | **Not found** in the text; treated as plan policy |
| What the live age gate's "No" button does; price display on the live menu | Not captured (origin lockout): **UNVERIFIED** |

## Verification log (fixer lane, 2026-10-12)

Each item was re-run against the evidence before this doc changed (scripts in `tmp/understand/fixer/`, read-only).

| # | Was | Now | Evidence |
|---|---|---|---|
| 1 | §5 first row: the quoted "May Relieve" list "8 occurrences" on /products/ | The exact list occurs once; the label occurs 8 times with differing lists | `fixcheck.mjs` section L over `audit/raw/products.html` (entities decoded): label 8, exact quote 1, 6 distinct strings cut at the first tag. The flag itself stands |
| 2 | §4.1 had no plugin runtime strings | Added the error, the document title, the cookie warning, `age` and `rechallenge`, and the logo alt | `follow.mjs` on `audit/raw/index.html`: `"error":"You are not old enough to view this content"`, `"customTitle":"Age Verification - Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA"`, `"rechallenge":"1"`, `age_gate_common.cookies`; the error and `rechallenge` strings are in 743 of 743 files. Runtime behaviour UNVERIFIED |
| 3 | §4.3 "Footer (every page)" | 741 of 743; /links/ has no licence and no legal links; /free-bar-coasters/ carries them in its body | `fixcheck.mjs` sections E, J and G8: footer template 1996 on 741 files; `links.html` MR282685 0, legal hrefs 0; `free-bar-coasters.html` MR282685 2, legal hrefs privacy 1, terms 1, return 3, disclaimer 2 |
| 4 | §1: the "segregating discounts" fragment's context was UNVERIFIED | Context verified: a segregated, attested discount area "does not make the communication personalized" | Full sentence read in `tmp/understand/critic/dl-b2/bulletin-2026-09-25.html` (text extraction, entities decoded); the next sentence is "Until further notice, when a Licensee broadcasts a reduced or promotional price through its online menus it is engaging in advertising." The HTTP status of the critic's fetch is not recorded in the file (taken on the critic's word) |
