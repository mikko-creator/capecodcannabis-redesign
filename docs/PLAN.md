# capecodcannabis.com: reforge plan (committed 2026-10-12)

## Objective (the operator's brief)
Clone https://capecodcannabis.com/ and capture its exact structure and architecture. Then do a **total redesign** that
keeps the existing branding and brand tone:
- existing imagery plus AI-generated industry imagery (fal stills, Higgsfield motion loops);
- multiple layers and depth, with images protruding across sections and out of their frames;
- clean, modern glassmorphism;
- scroll-through animations and hover effects.

## Definition of done
1. **Harvest complete and accounted for.**
   - Every same-origin page reachable from the sitemaps plus BFS is crawled, with robots.txt honoured.
   - Every URL not requested is counted with its reason: robots, an exclusion pattern, or a measured duplicate.
   - Failures are listed in `audit/failures.json`.
2. **Architecture captured.** `docs/SITE-ARCHITECTURE.md` and `audit/understand/ia-map.json` record:
   - templates, URL patterns and counts;
   - the header mega menu, mobile menu, footer and breadcrumbs;
   - the SEO surface and third-party dependencies;
   - a route map (source URL -> template -> rebuilt path).
3. **Brand captured** from computed style (`docs/BRAND-SYSTEM.md`): logo masters, palette, type, components, voice.
4. **Redesign built** as a static, platform-free site (Node builtins only, no runtime dependencies):
   - every source URL keeps its path;
   - every word of live copy is kept verbatim, and changes are declared in the ledger (duplicate device sections are
     collapsed into one responsive section and declared);
   - one H1 per page, semantic landmarks, `prefers-reduced-motion` honoured.
5. **Glass, depth and motion done well.**
   - Every glass panel has a varied backdrop behind it (luminance range >= 0.10).
   - Protrusions cross hard seams and are measured on their own pixels.
   - Reveal and parallax motion has a fail-safe, and hover and focus states have parity.
6. **Imagery is honest.**
   - Generated images never stand in for a real person, place, product, brand or result.
   - They carry no text or brand marks, depict no consumption, and show no one who looks under 21.
   - Every generated variant carries the IPTC `trainedAlgorithmicMedia` XMP label (`tools/ai-label.xmp`).
   - Every one is reviewed by eye.
7. **Verified.**
   - The build is reproducible (built twice, hashes equal) and the link check finds nothing broken.
   - Parity: sentence-level, with a positive control.
   - Fabrication, decontamination (no WordPress, Elementor, Joint, Dutchie runtime or old-agency residue) and the
     responsive sweep all pass.
   - First screens are sharp at the operator's windows (1280x585 @1.5, 1600x662 @1.2, 390x844 @3).
   - Finally, `sr-gate`. A FAIL that grades the source, not the rebuild, is recorded with `--force --why`, never
     silently.
8. **Handoff.** `sr-package` zip (secret-scanned). A noindex preview is published **only with the operator's go-ahead**.

## Scope decisions (with evidence)
- **Whole site, products included.**
  - The sitemaps list 6,531 URLs, 5,857 of them `/products/`.
  - Product pages are server-rendered shells whose JSON-LD `Product` carries name, brand, description, a Dutchie image
    and offers.
  - Category, brand and menu grids are rendered in the browser by the Joint Commerce app, so the static HTML has no
    product links.
  - The rebuild renders every product page and every grid from the captured JSON-LD and breadcrumbs.
- **Crawl order and safety** (`tools/sr-local/sr-crawl.mjs` = stock 1.12.1 plus flags, tested 29/29 with controls):
  - Content pages come first (run A, `--defer-stop`). Products follow in run B, with a checkpoint every 50 pages.
  - Write-safety: `project.json` is re-read before the crawl writes it, `failures.json` is merged on write, and the
    inventory is written atomically.
- **Not requested** (`tools/crawl-live.mjs` EXCLUDE, counted in `site-inventory.json`):
  - The Events Calendar month/day/week views (an endless forward trap).
  - iCal/RSS exports, `?s=` search, `?replytocom=`, `/wp-json`, `xmlrpc.php`.
  - `?brand=`, measured as a duplicate: the brand page and the filtered category view each had identical text and
    canonicalised to the plain URL. These filter deep-links must keep working in the rebuild as client-side filter
    state.
- **Politeness:** at most 2 connections and 400 ms spacing per host (the fetchx clamp). One origin-touching stage runs
  at a time; the browser capture blocks analytics and pixel hosts.
- **Age gate:**
  - Kept in the rebuild as a redesigned 21+ dialog with the verbatim copy: "Welcome!", "Are you over 21 years of age?",
    Yes/No, "*Must be 21+ with a VALID ID.", "Always worth the trip!".
  - The capture passes it the way a visitor does, with one "Yes" click.
- **Commerce:**
  - A static site cannot take live orders. The rebuild designs the cart and checkout entry points honestly; the real
    Joint Commerce/Dutchie integration plugs in at handoff (`docs/COMMERCE.md`).
  - Prices and stock are a dated snapshot of the live site.

## Phases
| # | Phase | How |
|---|---|---|
| 0 | Harvest | crawl A -> sr-extract -> sr-assets --download -> browser capture (29 template pages x 390/768/1024/1440 + screenshots) -> sr-tokens/sr-motion -> crawl B (products, background) |
| 1 | Understand | Workflow: ia, brand, content, catalog, imagery and facts lanes in parallel -> an adversarial critic re-runs the evidence -> a fixer applies the confirmed corrections |
| 2 | Design | Workflow: 3 independent on-brand directions prototyped on real content (home, category, product, mega menu, age gate) -> 3 judges with different lenses -> winner plus grafts |
| 3 | Build | `docs/BUILD-CONTRACT.md`: one writer per file. Lanes: pipeline, theme core, templates, catalog, imagery. Each lane gets its own isolated build for verification |
| 4 | QA + ship | Integrate -> fan-out review plus a refuter -> fixes -> gate -> docs -> package. Preview publish if the operator says yes |

Every workflow agent has a time box, runs in the foreground only and makes no memory writes.

## Budgets
- **Generated media:** a cap of **$15** across fal and Higgsfield, booked in `audit/generated-images.json`. Only the
  operator can raise it.
- **Keys:** `fal.key` and `hf.key` live ONLY in the session scratchpad, never in this tree. They are secret-scanned
  before any publish or zip. Both were pasted in chat, so they should be rotated after the project.

## Open for the operator
- Publishing: public repo plus noindex GitHub Pages preview (as on earlier projects), or local only.
