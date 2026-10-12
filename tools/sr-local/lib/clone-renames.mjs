#!/usr/bin/env node
// clone-renames.mjs — the platform-class rename map, in ONE place.
//
// The builder rewrites these in the markup AND in every stylesheet in the same pass, so
// rendering is preserved by construction. The verify gate applies the SAME list to the
// source before comparing, or every mandatory rename reads as damage.
//
// It lives here, not in the builder, because importing it from a script that runs work at
// module scope would EXECUTE the build as a side effect of reading a constant.
//
// WARNING: these apply to the whole document, including visible prose. A rename that hits
// body copy is a content defect, not a decontamination win — measured: a privacy policy
// naming its data processor was rewritten into a link to an unrelated real domain.
export const RENAMES = [
  ['shopify-section-group-header-group', 'region-header'],
  ['shopify-section-group-footer-group', 'region-footer'],
  ['shopify-app-block', 'app-block'],
  ['shopify-section', 'section-block'],
  ['shopify-block', 'block'],
  ['shopify-payment-button', 'payment-button'],
  ['shopify-policy', 'policy'],
  ['shopify-challenge', 'challenge'],
  ['shopify-accelerated-checkout', 'accelerated-checkout'],
  ['shopify-subscription-policy', 'subscription-policy'],
  ['shopify-buyer-consent', 'buyer-consent'],
  ['shopify-payment-terms', 'payment-terms'],
  ['pi-shopify_pay', 'pi-wallet-pay'],
  ['shopify_pay', 'wallet-pay'],
  ['ShopifyAnalytics', 'SiteAnalytics'],
  ['ShopifyPay', 'WalletPay'],
  ['ShopifyForms', 'SiteForms'],
  ['shopifyPaymentsEnabled', 'paymentsEnabled'],
  ['shopify-features', 'site-features'],
  ['shopify-cfh-end', 'head-end'],
  ['shopify.content_for_header.', 'head.'],
  ['shopifysvc', 'svc'],
  ['shopify-y', 'visitor-y'],
  ['shopify-s', 'visitor-s'],
  // the Squarespace block pasted into a collection description: a trace of an even
  // earlier platform, wrapper only — every word inside it is kept
  ['sqs-block', 'content-block'],
  ['sqs-html-content', 'content-html'],
  ['sqs-', 'legacy-'],
  ['--shopify-accelerated-checkout-', '--accelerated-checkout-'],
  ['icartShopifyCartContent', 'icartCartContent'],
  ['_shopify_s', '_visitor_s'],
  ['_shopify_y', '_visitor_y'],
  ['shopify-managed-markets', 'managed-markets'],
  ['shopify-rotator', 'rotator'],
  ['shopify-dash', 'dash'],
  ['/shopify', '/store'],
  ['Shopify', 'Store'],
  ['shopify', 'store'],
];

// A rename map is a property of the PROFILE, not of the module. While there was one profile
// the distinction cost nothing; with two, a builder holding the module-level map applies
// one platform's renames to another platform's source — and the verifier, which applies the
// SAME map to the source before comparing, then reports every mandatory rename as damage.
export const renameAllFor = (renames) => (s) => {
  for (const [from, to] of renames) s = s.split(from).join(to);
  return s;
};
export const renameAll = renameAllFor(RENAMES);

// renameMarkup — the same map, applied ONLY where it belongs.
//
// The map rewrites class names, ids and script identifiers. Applied to a whole document it
// also rewrites body copy and outbound links, and on a real run it turned a privacy
// policy's named data processor into "Store" linking to www.store.com — an unrelated real
// domain, in five sentences that each state a fact about who handles customer data.
//
// Two hold-outs, both measured:
//   · TEXT NODES — visible prose is the client's copy, never the builder's to reword.
//     A platform name left in prose fails sr-decontaminate, which is the point: it forces a
//     human decision on wording instead of shipping an invented sentence.
//   · ABSOLUTE URLS TO ANOTHER HOST — an outbound link is an address, not a class name.
//     Renaming one produces a live link to a domain nobody chose.
//
// Script and style CONTENT is markup here: the escaped platform payload some themes ship as
// text has to be rewritten or it survives every scan.
//
// BOTH the builder and the verifier call this. They used to hold separate copies of the
// rule, and a change to one silently made the other report every page as damaged.
export function renameMarkup(html) { return renameMarkupWith(RENAMES, html); }

export function renameMarkupWith(renames, html) {
  const renameAllHere = renameAllFor(renames);
  // NUL delimits the placeholder: a bare digit would collide with a number already in
  // the tag (width="12"), and NUL cannot appear in HTML.
  const NUL = String.fromCharCode(0);
  const EXTERNAL_URL = /((?:href|src|content|action)\s*=\s*")(https?:\/\/[^"]+)(")/gi;
  const parts = String(html).split(/(<[a-zA-Z/!][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>)/);
  let inRaw = false;
  return parts.map((part, i) => {
    // A text node that is ENTITY-ENCODED MARKUP is still markup. One theme ships its
    // checkout payload as &lt;div id=&quot;...&quot; data-shopify=&quot;...&quot;&gt;
    // inside a display:none container: encoding it does not make it a sentence, and
    // holding it out of the rename leaves the platform's own attribute names in the page.
    // Prose is what a reader reads; this is a tag wearing entities.
    const ENCODED_MARKUP = /&lt;\s*\/?\s*[a-zA-Z][\w-]*[^]*?&gt;/;
    if (i % 2 === 0) return (inRaw || ENCODED_MARKUP.test(part)) ? renameAllHere(part) : part;
    if (/^<\s*(script|style)\b/i.test(part)) inRaw = true;
    else if (/^<\s*\/\s*(script|style)\s*>/i.test(part)) inRaw = false;
    // Hold absolute urls out of the rename, then put them back untouched.
    const held = [];
    const masked = part.replace(EXTERNAL_URL, (m, a, url, z) => {
      held.push(url); return a + NUL + (held.length - 1) + NUL + z;
    });
    const RESTORE = new RegExp(NUL + '([0-9]+)' + NUL, 'g');
    return renameAllHere(masked).replace(RESTORE, (m, n) => held[Number(n)]);
  }).join('');
}

// Which source platforms this map actually covers.
//
// Every entry above was derived from, and measured against, ONE platform. Run over a
// WordPress/Elementor source the builder leaves /wp-includes/ and /wp-content/ script
// references standing and every Elementor class intact — and then reports "clean clone",
// which is the exact failure this whole gate exists to prevent. So the profile is declared,
// and sr-clone REFUSES a source it has no profile for rather than emitting a build that
// says it is clean and is not.
//
// Adding a platform means: a rename map, the script/inline patterns for its runtime, and a
// real site it has been run against. Not one of the three is optional.
// --- WordPress -------------------------------------------------------------------------
//
// CLASS AND ID TOKENS ONLY. Every WordPress blocker in sr-decontaminate that contains "wp-"
// is a PATH — /wp-content/, /wp-includes/, /wp-json/, /wp-admin, wp-login.php — and a path
// is not renamed, it is resolved. Rewriting /wp-content/x.png to /site-content/x.png
// produces a reference that names no CMS and also fetches nothing: the trace is gone and so
// is the image. That is laundering, and it is the same defect the shopify notes above
// describe from the other direction — a rename made ShopifyAnalytics invisible to every
// later string check while the tracker stayed in the page.
//
// So paths are left to the asset map and the remote sweep, which turn them into /assets/
// and /styles/ references that resolve, and sr-clone-verify check 1 fails the build if one
// of them does not. What is left here is markup identifiers, where a rename is the whole
// point: the class keeps its meaning, the stylesheet is rewritten in the same pass, and
// nothing about the rendering moves.
//
// Ordered longest-first. ['elementor-', 'layout-'] before ['elementor', 'layout'], or the
// shorter rule consumes the prefix and the longer one never fires.
export const WP_RENAMES = [
  // Elementor
  //
  // Capitalised forms too. A rename map is a list of LITERALS, and JavaScript identifiers
  // capitalise: the lower-case entries cleared every class name and left
  // `wpformsElementorVars` reading `siteformsElementorVars` — the plugin renamed, the
  // platform still named, in a variable this build ships. Longest first, as everywhere here.
  ['data-elementor-', 'data-layout-'],
  ['ElementorPro', 'LayoutPro'],
  ['elementor-', 'layout-'],
  ['Elementor', 'Layout'],
  ['elementor', 'layout'],
  // Divi
  ['et_pb_', 'pb_'],
  ['et-pb-', 'pb-'],
  ['et_divi_', 'theme_'],
  // WPBakery
  ['js_composer', 'composer'],
  ['wpb_wrapper', 'wrapper-block'],
  ['vc_row', 'row-block'],
  ['vc_column', 'column-block'],
  // Beaver Builder
  ['fl-builder-content', 'builder-content'],
  // WordPress core markup
  ['wp-block-', 'block-'],
  ['wp-embed-responsive', 'embed-responsive'],
  ['wp-schema-pro-', 'schema-pro-'],
  ['wp-singular', 'singular-page'],
  ['wp-theme-', 'site-theme-'],
  ['wp-caption', 'caption'],
  ['wp-image-', 'image-'],
  ['wp-emoji', 'emoji'],
  ['wp-container-', 'container-'],
  ['wp-elements-', 'elements-'],
  // The body classes. sr-decontaminate rates these MAJOR (wp-body-class), and on a real
  // 137-page build they were 134 of the 139 remaining findings — one per page, every one a
  // class name that says which CMS numbered the post. A class is exactly what a rename map
  // is for, and the stylesheet is rewritten in the same pass, so nothing about the rendering
  // moves. Longest first: `postid-` before `post-`, or the shorter rule eats the prefix.
  ['page-template-default', 'page-template'],
  ['post-template-default', 'post-template'],
  ['single-format-standard', 'single-format'],
  ['wp-embed-responsive', 'embed-responsive'],
  ['page-id-', 'page-'],
  // NOT 'post-': the same rule also matches post-<digits> followed by a space, so renaming
  // postid-199 to post-199 moved it from one clause of wp-body-class to another and the
  // finding count barely changed. A rename has to leave the pattern, not slide along it.
  ['postid-', 'entry-'],
  ['single-post', 'single-entry'],
  ['singular', 'single-view'],
  ['hentry', 'entry'],
  // Plugins that put their own name in the markup
  ['wpforms-', 'form-'],
  ['wpforms', 'siteforms'],
  ['wpcf7', 'contact-form'],
  ['woocommerce-no-js', 'commerce-no-js'],
  ['woocommerce', 'commerce'],
  ['WooCommerce', 'Commerce'],
];

// --- runtime patterns, per profile -------------------------------------------------------
//
// These lived as module-level constants inside sr-clone. A constant cannot be two things,
// so a second profile had no way to say what ITS runtime looks like — the builder would
// have run shopify's patterns over a WordPress page, matched nothing, and reported a clean
// clone. That is the exact failure profileFor() exists to prevent, one layer further in.
export const SHOPIFY_SRC = /(?:cdn\.shopify\.com|\/cdn\/shop\/|shopifycloud|shop-js|myshopify|trekkie|web-pixel|webmcp|standard-actions|preloads\.js|shopify-forms|connect\.facebook\.net|\/wpm\/|perf-kit)/i;
export const SHOPIFY_INLINE = /(?:\bShopify|webPixelsManager|web_pixels|shop_events_listener|__st\s*=|trekkie|shopifycloud|shop-js|myshopify|cdn\.shopify\.com|monorail|buyer_site_abandonment|"accessToken"\s*:\s*"[0-9a-f]{16,}"|PaypalV4VisibilityTracking|shop\.app)/i;

// A script whose SRC is CMS runtime. This pattern is applied to <script src> ONLY — the
// builder tests it against the src attribute of a script element and nothing else — so
// /wp-content/ here removes script elements, never images or stylesheets.
//
// It covers the theme's own JS as well as the plugins', which is the same line shopify's
// profile draws: /cdn/shop/ is where a Shopify theme's JS lives and it is in SHOPIFY_SRC.
// The reasoning is in sr-clone's own closing note — removing the platform's script references
// also removes the behaviours they carried, which is why the clone ships its own layer.
//
// Measured on a live site before this covered /wp-content/: 19 pages, one surviving
// /wp-content/ blocker each, every one a <script src> for a plugin or the child theme.
export const WP_SRC = /(?:\/wp-content\/|\/wp-includes\/|\/wp-admin\/|wp-emoji-release|jquery-migrate|admin-ajax|wp-embed(?:\.min)?\.js)/i;

// A LIBRARY IS NOT A RUNTIME, and this is the distinction the gates cannot see.
//
// WP_SRC matches /wp-includes/, and jQuery lives at /wp-includes/js/jquery/jquery.min.js. So
// the builder removed jQuery - and the theme's own 27 inline `jQuery(...)` calls stayed. Every
// clone-verify check passed and every decontamination check passed, because both read
// references and text; the browser said `Uncaught ReferenceError: jQuery is not defined`, four
// times, on a page the gates called perfect. A 19/19 is a status code, not a working page.
//
// The fix is NOT a keep-list. sr-assets harvests same-origin <script src> into assets/js, the
// url map rewrites those references to /scripts/<hash>-name.js BEFORE the strip runs, and a
// script carrying a local path is never offered to WP_SRC at all. Having the file is the
// permission - keeping an UNHARVESTED script would ship a dangling /wp-includes/ path that
// resolves to nothing and still names the CMS, which is strictly worse than removing it.
//
// A keep-list was written at the STRIP first and deleted: it preserved the reference without
// the file, and the suite caught it immediately. The decision belongs one stage earlier, at
// the HARVEST — what gets downloaded is what gets kept, and everything else is removed.
//
// WHICH scripts: libraries and theme behaviour, never the page builder's own runtime.
// Harvesting everything shipped Elementor's frontend.min.js and its webpack runtime into the
// build, and those bundles carry /wp-content/ paths in their own source — the clone then
// named its CMS from inside a file the clone itself had chosen to vendor. sr-clone's own
// header says it: vendoring the platform's bundles under a local path moves the leash
// indoors.
//
// The line: jQuery and the UI plugins a theme leans on, plus the theme's own scripts. Not
// /wp-content/plugins/, which is where a page builder, a form runtime and a cart live.
export const WP_SCRIPT_HARVEST = new RegExp([
  'jquery(?!-migrate)', 'bootstrap', 'popper', 'slick', 'fancybox', 'owl\\.?carousel',
  'swiper', 'isotope', 'masonry', 'magnific', 'lightbox', 'wow(?:\\.min)?\\.js',
  'animate', 'aos(?:\\.min)?\\.js', 'gsap', 'lazyload', 'lazysizes', 'zoom', 'blockui',
  'underscore', 'backbone', 'imagesloaded', 'moment',
  '\\/themes\\/[^/]+\\/(?:js|assets|dist|src)\\/',
].join('|'), 'i');

// An inline script that carries CMS runtime. Every entry was read out of a live page:
// wc_add_to_cart_params, wc_cart_fragments_params, woocommerce_params, wpforms_settings and
// wpforms_conditional_logic are the globals the plugins ship, and each one carries an
// admin-ajax endpoint or a nonce that reaches a backend this build does not have.
// A PHP ENDPOINT CALLED FROM AN INLINE SCRIPT is server runtime by construction. LiteSpeed
// Cache ships fetch("/wp-content/plugins/litespeed-cache/guest.vary.php", ...) on every page
// of a live site — 403 blockers on a 397-page build, one per page. A static host answers a
// POST to a .php path with 405, so the call cannot work and the path names the CMS.
//
// Anchored on the PHP extension under a CMS directory, not on /wp-content/ alone: a theme
// script that names an image path is site behaviour, and removing it would take a working
// interaction out of the clone.
//
// WordPress 6.x ships <script type="speculationrules"> — a JSON prefetch config whose rules
// are a list of /wp-* path patterns. It is CMS runtime for a feature a static build does not
// have, and it named /wp-admin and /wp-content on every page of a live 10-page crawl.
//
// `gf_global` / `gform` is Gravity Forms' own runtime config. It carries
// "base_url":"\/wp-content\/plugins\/gravityforms" — the plugin's directory, escaped for a
// JSON string — and it configures a form submission a static build cannot serve at all; the
// form itself is already stamped unwired. Matching the escaped spelling as well as the plain
// one, because that is how it is written in the page.
export const WP_INLINE = /(?:admin-ajax|wp-json|wpemojiSettings|_wpUtilSettings|\bwc_[a-z_]+params\b|woocommerce_params|wpforms_settings|wpforms_conditional_logic|elementorFrontendConfig|ElementorProFrontendConfig|\bwp\.(?:i18n|apiFetch|hooks)\b|ajaxurl\s*=|\bgf_global\b|\bgform\w*\s*=|\bgform[A-Z]\w*\s*\(|gravityforms|\\\/wp-content\\\/|speculationrules|"prefetch"\s*:\s*\[|litespeed_vary|litespeed-cache|\/wp-content\/plugins\/[^"']*\.php|\/wp-includes\/[^"']*\.php)/i;

// Anchors this build cannot serve, stamped rather than removed: the markup renders exactly
// as the source rendered it and the behaviour layer stops the navigation. Removing the
// anchor would change the DOM; pointing it somewhere would lie about where it goes.
// WHICH same-origin scripts a storefront clone vendors.
//
// ⚖ VENDORING THE PLATFORM'S RUNTIME UNDER A LOCAL PATH MOVES THE LEASH INDOORS.
// WordPress has had this filter since its profile existed; shopify declared none, so sr-assets
// harvested EVERY same-origin script. Measured 2026-09-18 on a 19-page storefront: that pulled in
// `storefront-<hash>.js` and `remote_product_tracking-<hash>.js` — the analytics and telemetry
// bundles — and the rename map then relabelled `ShopifyAnalytics` as `SiteAnalytics`. The
// decontamination scan caught its own tool laundering the platform, which is the outcome the
// scan's own header warns about.
//
// The keep-list is the THEME (/cdn/shop/t/<n>/assets/, the storefront's own JS) and the libraries
// a theme leans on. Everything under shopifycloud, the perf kit, the feature loader, the preload
// shim, trekkie and the pixel manager stay where they are and are stripped as platform runtime.
// The refusal is checked FIRST, as a lookahead, because a platform bundle can carry a word the
// keep-list wants: `remote_product_tracking-<hash>.js` contains "product", and a keep-list alone
// vendored the telemetry bundle on the strength of that one substring.
const SHOPIFY_PLATFORM_JS = 'shopifycloud|perf-kit|trekkie|web-pixels|remote_product_tracking'
  + '|load_feature|preloads|storefront-[0-9a-f]{6,}|shop-js|checkout|payment';
export const SHOPIFY_SCRIPT_HARVEST = new RegExp('^(?!.*(?:' + SHOPIFY_PLATFORM_JS + '))(?=.*(?:' + [
  '\\/cdn\\/shop\\/t\\/\\d+\\/assets\\/',
  'jquery', 'bootstrap', 'popper', 'slick', 'fancybox', 'owl\\.?carousel', 'swiper', 'isotope',
  'masonry', 'magnific', 'lightbox', 'scrollreveal', 'anime[.\\d]*\\.js', 'gsap', 'lazyload',
  'lazysizes', 'flickity', 'splide', 'theme(?:\\.min)?\\.js', 'cart(?:js|\\.js)', 'product',
  'scroll-ties',
].join('|') + '))', 'i');
export const SHOPIFY_DEAD_ANCHORS = /\/(?:customer_authentication|account\/login|account\/register|challenge)\b/i;
// /feed/ is the one that dominates a real WordPress site: every page, every category and
// every tag advertises one, and a static build serves none of them. Measured on a 137-page
// clone: 495 of 496 unresolved references were a feed URL. They are not broken links the
// clone invented — the source serves them and this build cannot — so they are stamped like
// any other endpoint the build does not answer, rather than left pointing at a 404.
export const WP_DEAD_ANCHORS = /(?:wp-login\.php|\/wp-admin\b|xmlrpc\.php|\/wp-json\/|\/my-account\b|\?add-to-cart=|\/cart\/\?|\/checkout\/\?|\/feed\/?$|\/comments\/feed\/?$)/i;

// The platform's own attribution: visible text, and still a trace rather than the client's
// copy. sr-decontaminate rates both shapes a BLOCKER (powered-by-text, built-with-text), and
// they are the one kind of visible prose a clone may delete — nobody chose to write them.
//
// Declaring them per profile is what lets the builder record each removal into
// audit/clone-removals.json instead of leaving a person to remember. A removal the verifier
// has not been told about is reported as damage, and word parity is the check that would
// catch a real deletion — so an undeclared attribution removal either fails a good build or
// trains someone to widen the exception until it stops catching anything.
// A rename map holds LITERALS, and some platform classes carry a number.
//
// `<article class="post-575 page type-page status-publish hentry entry">` is WordPress's own
// post class, one per page, and sr-decontaminate rates `post-<digits> ` a MAJOR. No list of
// strings can match it, so it needs a pattern — and a pattern applied to a whole document
// would reach prose, which is the one thing this file exists to protect.
//
// So these are applied INSIDE class attributes only, where a class name is unambiguously a
// class name. Each pair is [pattern with the class token, replacement].
export const WP_CLASS_PATTERNS = [
  [/\bpost-(\d+)\b/g, 'entry-$1'],
  [/\bpage-id-(\d+)\b/g, 'page-$1'],
  [/\bpostid-(\d+)\b/g, 'entry-$1'],
  [/\bcategory-(\d+)\b/g, 'cat-$1'],
  [/\btag-(\d+)\b/g, 'label-$1'],
];

/**
 * Apply the numbered-class patterns, inside class attributes only.
 *
 * SHARED, like renameMarkupWith and cssNameFor, and for the reason those two are shared. The
 * builder applied these and the verifier did not, so the verifier compared a source still
 * saying `post-199` against a build saying `entry-199` and reported one element missing and
 * one added on every post page — a correct build failing a gate, which is the failure mode
 * that teaches people to stop reading gates. Third time this exact shape has appeared in this
 * file's history; it is why the rule lives here rather than at either call site.
 */
export function applyClassPatterns(patterns, html) {
  if (!patterns || !patterns.length) return html;
  let s = String(html);
  for (const [re, to] of patterns) {
    s = s.replace(/\bclass=(["'])([^"']*)\1/g, (m, q, v) => 'class=' + q + v.replace(re, to) + q);
  }
  return s;
}

export const SHOPIFY_ATTRIBUTIONS = ['Powered by Shopify'];
export const WP_ATTRIBUTIONS = [
  'Proudly powered by WordPress',
  'Powered by WordPress',
  'Built with Elementor',
  'Powered by WooCommerce',
  'Designed with the Divi Theme',
];

export const PROFILES = {
  shopify: {
    renames: RENAMES,
    platformSrc: SHOPIFY_SRC,
    platformInline: SHOPIFY_INLINE,
    deadAnchors: SHOPIFY_DEAD_ANCHORS,
    attributions: SHOPIFY_ATTRIBUTIONS,
    scriptHarvest: SHOPIFY_SCRIPT_HARVEST,
    verified: '2026-09-04, 41-page storefront; script harvest 2026-09-18, 19-page storefront',
  },
  wordpress: {
    renames: WP_RENAMES,
    platformSrc: WP_SRC,
    platformInline: WP_INLINE,
    deadAnchors: WP_DEAD_ANCHORS,
    attributions: WP_ATTRIBUTIONS,
    scriptHarvest: WP_SCRIPT_HARVEST,
    classPatterns: WP_CLASS_PATTERNS,
    // Where this platform keeps its media. Any image reference still on this path after the
    // url map has run is one the image inventory never collected — an icon href, an og:image,
    // a CSS background — and the builder resolves it by basename against what it already
    // stores. Global 'g' flag is required: the builder calls .replace with it.
    assetPath: /(?:https?:)?(?:\/\/[^/"'\s)]+)?\/wp-content\/[^"'\s)\\]+?\.(?:png|jpe?g|gif|webp|avif|svg|ico)/gi,
    // wp-login.php, /wp-admin and xmlrpc.php are decontamination blockers in their own
    // right, so a stamped anchor that keeps its href keeps the trace. shopify's dead
    // endpoints name no platform to a scanner and keep theirs.
    neutraliseDeadAnchorHref: true,
    verified: '2026-09-07, 20-page WordPress 5.9.16 + Elementor + WooCommerce 6.4.2 site',
  },
};

// --- SGEN ---------------------------------------------------------------------------
//
// Measured on eyetrendsclearlake.com 2026-09-18, a 45-page SGEN site: 3816 sgb-* and 1341 sgen-*
// class tokens, the builder runtime, a visitor beacon and a 404 reporter on every page.
//
// ⚖ A LITERAL RENAME MAP IS WRONG FOR A SHORT PREFIX. "sgen" is inside "Transgender" — lucide
// ships that icon name in the bundle this site loads — and "sg-" is inside "msg-". Every entry
// here is a RegExp with a lookbehind that refuses a letter or digit before the match, so the
// platform's tokens go and the words that merely contain them stay. renameAllFor splits on
// each entry, and String.prototype.split takes a RegExp as readily as a string.
//
// The same map reaches markup, stylesheets, harvested scripts AND harvested script file names,
// so a selector in sgen-mobile-menu.js keeps matching the class it was written against.
// Not after a letter or digit, and not after `<letter-or-digit>_` either: `_sg_sid` is the
// platform's cookie and starts an identifier, `pkg_sg_y` is somebody else's identifier.
const NB = '(?<![A-Za-z0-9])(?<![A-Za-z0-9]_)';
const sg = (src, to) => [new RegExp(NB + src), to];
export const SGEN_RENAMES = [
  sg('SgBuilder', 'BlockKit'),
  sg('sgBuilder', 'blockKit'),
  sg('sgbuilder', 'blockkit'),
  sg('sgb-', 'blk-'),
  sg('sgb_', 'blk_'),
  sg('sgen(?![a-z])', 'kit'),
  sg('Sgen(?![a-z])', 'Kit'),
  sg('SGEN(?![A-Za-z])', 'SITE'),
  sg('sgp_', 'pop_'),
  sg('sgpopup', 'popkit'),
  sg('sg-', 'c-'),
  sg('sg_', 'c_'),
];

// Removed, never harvested: the platform reporting on the clone's visitors. The beacon posts to
// /sg-collect, the 404 reporter to /sg-collect-404, and the two session attributers record phone
// taps and form sessions to /do_actions/ — every one of them a request to a backend the clone
// does not have, carrying a stranger's traffic into the source site's analytics.
const SGEN_TRACKERS = String.raw`sg-analytics|sg-404-source|sessionAttributer(?:Forms|PhoneTaps)`;
export const SGEN_SRC = new RegExp(String.raw`\/assets\/(?:front|defaults)\/[^"'\s]*(?:` + SGEN_TRACKERS + String.raw`)(?:\.min)?\.js`, 'i');
// `var Defaults = {base_url: ...}` is NOT here: plugins.min.js, the locations picker and the
// popup loader all read Defaults.base_url, each behind a typeof guard, and removing it changes
// where populateLocations.json is fetched from. Config a shipped script reads is behaviour.
export const SGEN_INLINE = /(?:__SG_TRACK__|__SG404__|\/sg-collect\b|do_log_session|sessionAttributer)/;
// Behaviour the page renders with: the builder runtime (sliders, tabs), the mobile menu, the
// drawer, the accessibility widget, icons, lazy loading, the location picker, forms UI.
// Everything under the platform's asset tree EXCEPT the trackers above.
export const SGEN_SCRIPT_HARVEST = new RegExp(String.raw`\/assets\/(?:front|defaults)\/(?![^?#]*(?:` + SGEN_TRACKERS + String.raw`))[^?#]*\.js`, 'i');
export const SGEN_DEAD_ANCHORS = /(?:\/sg-admin\b|\/do_actions\/)/i;
export const SGEN_ATTRIBUTIONS = ['Powered by SGEN', 'Built with SGEN'];

PROFILES.sgen = {
  renames: SGEN_RENAMES,
  platformSrc: SGEN_SRC,
  platformInline: SGEN_INLINE,
  deadAnchors: SGEN_DEAD_ANCHORS,
  attributions: SGEN_ATTRIBUTIONS,
  scriptHarvest: SGEN_SCRIPT_HARVEST,
  // The version meta renders nothing and names the platform. Same reason the generator meta goes.
  // Where this platform keeps media: /sites/<site_key>/uploads/<yyyy>/<mm>/ for the client's own
  // files, /assets/{front,defaults}/ for the platform's. A reference still on either path after
  // the url map has run is one the image inventory never collected — a CSS background, an
  // og:image, an icon href — so it points at the ORIGINAL HOST and names the platform. The
  // builder resolves those by basename against what it already stores (sr-clone.mjs:442).
  // Global flag required: the builder calls .replace with it.
  assetPath: /(?:https?:)?(?:\/\/[^/"'\s)]+)?\/(?:sites\/[^/"'\s)]+\/uploads|assets\/(?:front|defaults))\/[^"'\s)\\]+?\.(?:png|jpe?g|gif|webp|avif|svg|ico)/gi,
  neutraliseDeadAnchorHref: true,
  platformMeta: /<meta\b[^>]*\bname=["']?sgen_version["']?[^>]*>\s*/gi,
  verified: '2026-09-18, 45-page SGEN site (eyetrendsclearlake.com)',
};

// The stored stylesheet's FILE NAME — ONE definition, used by the builder and the verifier.
//
// It lived in both, as two copies of the same expression. Changing the builder's to strip
// WordPress path segments and not the verifier's dropped the sheet pairing from 94 to 6 in a
// single run: the two sides computed different names for the same file and simply stopped
// finding each other. Every other check stayed green, because each was still internally
// consistent. That is the whole failure mode this file's own header warns about, and it was
// reproduced here by hand.
//
// Renaming a file this build wrote is not laundering — the reference resolves, and only the
// label stops spelling the source's directory layout.
const PLATFORM_FILENAME = /(?:^|-)(?:cdn-shop(?:ifycloud)?|wp-content|wp-includes|plugins|themes|uploads)-/g;
export const cssNameFor = (renames) => {
  const rename = renameAllFor(renames);
  return (n) => rename(n).replace(PLATFORM_FILENAME, '-').replace(/^-+/, '');
};

// --- the universal layer ------------------------------------------------------------
//
// Analytics, ad pixels, session recorders and chat widgets are NOT platform features, and
// putting them in a platform profile is how one shipped: `connect.facebook.net` lived in
// SHOPIFY_SRC and nowhere else, so a WordPress clone carrying the same pixel kept it. The
// pattern was right and its ADDRESS was wrong.
//
// A surviving tracker is the most expensive thing a clone can ship, and it is not a
// cosmetic defect. `googletagmanager.com/gtag/js?id=AW-...` is an ADS conversion tag: every
// visitor to the clone is reported into the original owner's ad account, where it corrupts
// the conversion data their bidding runs on and spends against their budget. A chat widget
// puts the clone's visitors into the owner's real inbox. Neither is visible on the page.
//
// Applied to every profile — see profileFor. A profile cannot opt out, because the reason
// the last one got through was that opting out was possible by omission.
export const THIRD_PARTY_SRC = new RegExp([
  // google: analytics, ads, tag manager, and the ad-serving surfaces
  'googletagmanager\\.com', 'google-analytics\\.com', 'googleadservices\\.com',
  'googlesyndication\\.com', 'doubleclick\\.net', 'google\\.com/(?:ads|pagead)',
  // meta
  'connect\\.facebook\\.net', 'facebook\\.com/tr',
  // session recorders and heatmaps
  'hotjar\\.com', 'clarity\\.ms', 'mouseflow\\.com', 'fullstory\\.com',
  'crazyegg\\.com', 'luckyorange\\.(?:com|net)', 'inspectlet\\.com', 'smartlook\\.com',
  // other ad networks and their conversion pixels
  'bat\\.bing\\.com', 'analytics\\.tiktok\\.com', 'snap\\.licdn\\.com',
  'ads-twitter\\.com', 'analytics\\.twitter\\.com', 'ct\\.pinterest\\.com',
  'sc-static\\.net', 'reddit\\.com/rp\\.js', 'quantserve\\.com', 'scorecardresearch\\.com',
  // product analytics / CDPs
  'segment\\.(?:com|io)', 'mxpnl\\.com', 'amplitude\\.com', 'heap(?:analytics)?\\.com',
  'matomo\\.(?:js|php|cloud)', 'piwik\\.(?:js|php)', 'plausible\\.io', 'usefathom\\.com',
  'posthog\\.com',
  // marketing automation
  'klaviyo\\.com', 'hs-scripts\\.com', 'hsforms\\.net', 'hs-analytics\\.net',
  'marketo\\.(?:com|net)', 'pardot\\.com', 'mailchimp\\.com/.*\\.js', 'omnisnippet',
  // chat and support widgets — a clone must not route strangers into the owner's inbox
  'tawk\\.to', 'crisp\\.chat', 'intercom(?:cdn)?\\.(?:com|io)', 'drift\\.com',
  'zdassets\\.com', 'zopim\\.com', 'livechatinc\\.com', 'tidio\\.co', 'front\\.com/widget',
  // error and performance reporting into the owner's account
  'browser\\.sentry-cdn\\.com', 'bugsnag\\.com', 'nr-data\\.net', 'newrelic\\.com',
  'js-agent\\.newrelic\\.com',
].join('|'), 'i');

// The same surfaces, as an INLINE snippet. A tag manager's loader is inline by design —
// removing the <script src> alone leaves the bootstrap that writes it back.
//
// Anchored on the call or the assignment, not the bare word: `ga` and `hj` as substrings
// appear in ordinary code, and a pattern that removed every block containing them would
// take the site's own JS with it. Each entry below is a call `name(` or an assignment.
// Also the BOOTSTRAP, not a call to a global — this pattern REMOVES a whole inline
// <script> block, so matching a call would delete the site's own code around it. A real
// site's form handler reads `if (typeof gtag === "function") gtag("event", ...)`, and with
// the loader gone that guard is false and the call reports to nobody; removing the block it
// sits in would take the form's submit handler with it. What defines or queues to the
// tracker is still matched, and that is what a loader has to do to work.
export const THIRD_PARTY_INLINE = new RegExp([
  'function\\s+gtag\\s*\\(', 'dataLayer\\s*(?:=|\\.push)', 'GoogleAnalyticsObject', '\\bga\\s*\\(\\s*[\'"](?:create|send|config)',
  'google_tag_manager', 'googletagmanager\\.com', 'google-analytics\\.com',
  '\\bfbq\\s*=', '\\bfbq\\s*\\(\\s*[\'"](?:init|track)', '_fbq\\b', 'connect\\.facebook\\.net',
  '_hjSettings', '\\bclarity\\s*\\(\\s*[\'"](?:set|identify|consent)',
  '\\bttq\\s*\\.\\s*load', '_linkedin_partner_id', '\\btwq\\s*\\(\\s*[\'"](?:init|track)', '\\bpintrk\\s*\\(\\s*[\'"]load',
  '_uetq\\s*(?:=|\\.push)',
  'mixpanel\\s*\\.\\s*init', 'amplitude\\s*\\.\\s*(?:init|getInstance)', '\\bheap\\s*\\.\\s*load',
  'analytics\\s*\\.\\s*load\\s*\\(', '_learnq\\b', '_hsq\\b',
  'Sentry\\s*\\.\\s*init', 'Tawk_API', '\\$crisp\\b', 'intercomSettings', 'window\\.Intercom',
  '_paq\\s*(?:=|\\.push)', 'plausible\\s*\\(',
].join('|'), 'i');

// A site somebody hand-wrote — no CMS, no vendor to launder, its own assets/ tree.
//
// Its rename map is EMPTY on purpose, and that is the whole point of naming it a profile
// rather than waving the check: there is no platform name in the markup to remove, so a
// rename map here could only ever corrupt the author's own class names. What this profile
// still gets is the universal layer above, which is where a hand-rolled site's real
// contamination lives — the tag manager and the pixels, pasted in by hand.
//
// Selected only when detection found NOTHING. A site that IS on a CMS this bundle has no
// profile for still refuses, because renaming nothing on a Wix export would emit a build
// that names Wix on every page and call it clean.
export const STATIC_SCRIPT_HARVEST = /\/(?:assets|js|scripts|static|dist|build)\//i;
export const STATIC_DEAD_ANCHORS = /$^/;
export const STATIC_ATTRIBUTIONS = [];

PROFILES.static = {
  renames: [],
  platformSrc: /$^/,
  platformInline: /$^/,
  deadAnchors: STATIC_DEAD_ANCHORS,
  attributions: STATIC_ATTRIBUTIONS,
  scriptHarvest: STATIC_SCRIPT_HARVEST,
  verified: '2026-09-07, 14-page hand-written static site on Vercel',
};

// Merge a pattern with the universal one. `/$^/` is this file's "matches nothing" idiom and
// survives the union unchanged, so a profile that declares no platform pattern still gets
// the trackers.
const union = (a, b) => new RegExp('(?:' + a.source + ')|(?:' + b.source + ')', 'i');

export function profileFor(detected) {
  const ids = (detected || []).map((d) => String(d && d.id ? d.id : d).toLowerCase());
  let picked = null;
  for (const id of ids) { if (PROFILES[id]) { picked = { id, ...PROFILES[id] }; break; } }
  // Nothing detected at all -> hand-rolled. Something detected that we have no profile for
  // -> still null, still refuses.
  if (!picked && ids.length === 0) picked = { id: 'static', ...PROFILES.static };
  if (!picked) return null;
  // Folded in HERE rather than at each call site. The last tracker to ship did so because
  // one profile named it and the other did not; a union a caller has to remember is the
  // same defect with an extra step.
  return {
    ...picked,
    platformSrc: union(picked.platformSrc, THIRD_PARTY_SRC),
    platformInline: union(picked.platformInline, THIRD_PARTY_INLINE),
  };
}
