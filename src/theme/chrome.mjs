// src/theme/chrome.mjs - the document around every page: head, skip link, header (hanging sign, disclosure nav, Shop
// mega menu), search, Pickup bag, phone menu sheet, footer, to-top, age gate.
// Owner: T1a (chrome + design system). Skeleton by T0, 2026-10-12; finished by T1a 2026-10-12 (DESIGN-SPEC 6.1-6.8,
// 6.22; BUILD-CONTRACT 4.15.2, 4.15.3, 4.17.1, 4.17.2, 4.17.4, 4.17.7). Every chrome TEXT comes from ctx.nav /
// ctx.footer / ctx.ageGate verbatim; the theme's own words are parts.mjs LABELS and the strings below, each declared in
// src/content/removals.d/theme-*.json. Change requests: tmp/t1a/INBOX.md.
//
// Exports: renderDocument(page, ctx, mainHtml) -> complete HTML document; AGE_GATE_PLUGIN; HEAD_SCRIPT
// Data attributes read by src/scripts/site.js (contract in src/theme/README.md): data-header, data-nav-item,
// data-caret, data-mega, data-search-open, data-search, data-search-close, data-search-results, data-bag-open,
// data-bag, data-bag-close, data-bag-count, data-bag-items, data-bag-empty, data-sheet-open, data-sheet,
// data-sheet-close, data-acc, data-dialog, data-age, data-key, data-title, data-breach, data-totop, data-live.
import { renderBlock, uid } from './blocks.mjs';
import { link, slotImg, protrusion, icon, LABELS } from './parts.mjs';

/** the age-verification plugin's own strings, verbatim from its script config on every captured page
    (var age_gate = {..."error", "customTitle"...}, var age_gate_common = {"cookies"}); BUILD-CONTRACT 4.15.2 */
export const AGE_GATE_PLUGIN = {
  error: 'You are not old enough to view this content',
  customTitle: 'Age Verification - Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA',
  cookies: 'Your browser does not support cookies, you may experience problems entering this site',
};
/** blocking head script (runs before first paint): html.js; html.age-ok when consent is stored (hides the gate before
    paint, BUILD-CONTRACT 4.17.1); html.js-reveal only with IntersectionObserver and no reduced motion (DESIGN-SPEC 7.1) */
export const HEAD_SCRIPT = "(function(d,w){var h=d.documentElement;h.classList.add('js');try{if(w.localStorage.getItem('ccc-age-21')==='1')h.classList.add('age-ok')}catch(e){}try{if('IntersectionObserver' in w&&!w.matchMedia('(prefers-reduced-motion: reduce)').matches)h.classList.add('js-reveal')}catch(e){}})(document,window);";

/** the logo master (DESIGN-SPEC 6.2; docs/BRAND-SYSTEM.md "Masters picked": the 700x568 sign without a baked shadow).
    One 700 px variant only, so the header paints at 3.0+ file px per device px at every operator window (R-2). */
const LOGO_MASTER = 'assets/source/e4ae712e-CCC-Logo-Footer.webp';
/** the age gate's logo plate (DESIGN-SPEC 6.8): the origin RGBA original of the plugin's logo (370x306) */
const GATE_LOGO = 'assets/brand/logo-agegate.png';
/** the specials disclaimer the bag shows (BUILD-CONTRACT 4.5), verbatim from the 17 special pages; declared for the
    chrome in theme-chrome.json (chrome-bag-specials-disclaimer) */
const BAG_DISCLAIMER = '*Website cart may not reflect the bundled price but it will be adjusted at time of payment.';
/** the to-top link's accessible name (no source label: chrome.json backToTop.label is null); declared (chrome-to-top) */
const TO_TOP = 'Back to top';
/** the footer AI note (BUILD-CONTRACT 4.17.4 wording); declared (theme-footer-ai-note) */
const AI_NOTE = 'Some images on this site are AI-generated illustrations. They are not photos of our store, staff, customers or products.';

const normSp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const e = (ctx, s) => ctx.esc(s);
const attrOf = (tag, name) => { const m = tag.match(new RegExp('\\s' + name + '="([^"]*)"')); return m ? m[1] : null; };

/* ---------------------------------------------------------------- head */
/** a preload for the page's high-priority image (the hero): the first <img fetchpriority="high"> in <main>. Inside a
    <picture>, each <source media> gets its own preload and the <img> one gets the negated media, so a phone never
    preloads the desktop file (R-20, R-23). imagesrcset/href are relativized by the build. */
function heroPreload(mainHtml) {
  const html = String(mainHtml || '');
  const m = html.match(/<img\b[^>]*\sfetchpriority="high"[^>]*>/);
  if (!m) return [];
  const img = m[0];
  const out = [];
  const pre = html.slice(0, m.index);
  const pOpen = pre.lastIndexOf('<picture');
  const medias = [];
  if (pOpen !== -1 && pre.indexOf('</picture>', pOpen) === -1) {
    for (const s of pre.slice(pOpen).match(/<source\b[^>]*>/g) || []) {
      const media = attrOf(s, 'media'), srcset = attrOf(s, 'srcset');
      if (!srcset) continue;
      if (media) medias.push(media);
      out.push('<link rel="preload" as="image"' + (media ? ' media="' + media + '"' : '') + ' imagesrcset="' + srcset + '"' + (attrOf(s, 'sizes') ? ' imagesizes="' + attrOf(s, 'sizes') + '"' : '') + ' fetchpriority="high">');
    }
  }
  const src = attrOf(img, 'src'), srcset = attrOf(img, 'srcset'), sizes = attrOf(img, 'sizes');
  if (src || srcset) {
    const media = medias.length ? medias.map((q) => 'not all and ' + q).join(', ') : null;
    out.push('<link rel="preload" as="image"' + (media && medias.length === 1 ? ' media="' + media + '"' : '') + (src ? ' href="' + src + '"' : '') + (srcset ? ' imagesrcset="' + srcset + '"' : '') + (sizes ? ' imagesizes="' + sizes + '"' : '') + ' fetchpriority="high">');
  }
  return out;
}
function head(page, ctx, mainHtml) {
  const m = [];
  m.push('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  m.push('<title>' + e(ctx, page.title || page.h1 || '') + '</title>');
  if (page.metaDescription) m.push('<meta name="description" content="' + ctx.escAttr(page.metaDescription) + '">');
  if (page.robots) m.push('<meta name="robots" content="' + ctx.escAttr(page.robots) + '">');
  if (page.canonical) m.push('<link rel="canonical" href="' + ctx.escAttr(page.canonical) + '">');
  for (const [k, v] of Object.entries(page.og || {})) m.push('<meta property="' + ctx.escAttr(k) + '" content="' + ctx.escAttr(v) + '">');
  for (const [k, v] of Object.entries(page.twitter || {})) m.push('<meta name="' + ctx.escAttr(k) + '" content="' + ctx.escAttr(v) + '">');
  for (const ld of page.jsonLd || []) m.push('<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>');
  m.push('<meta name="theme-color" content="#F2FAFD">');
  /* the live site's own site icons (its head declares these three; byte copies of the harvested files in assets/brand/).
     Without them every page shipped no icon, and the browser's automatic /favicon.ico request got the 41 KB 404 page.
     (orchestrator, 2026-10-12) */
  m.push('<link rel="icon" href="' + ctx.asset('brand/site-icon-32.webp') + '" sizes="32x32">');
  m.push('<link rel="icon" href="' + ctx.asset('brand/site-icon-192.webp') + '" sizes="192x192">');
  m.push('<link rel="apple-touch-icon" href="' + ctx.asset('brand/site-icon-180.webp') + '">');
  m.push('<script>' + HEAD_SCRIPT + '</script>');
  /* preload Roboto normal and Roboto Flex only (DESIGN-SPEC 3.2, R-21), then the hero image (R-23) */
  m.push('<link rel="preload" href="' + ctx.asset('fonts/roboto-normal-latin.woff2') + '" as="font" type="font/woff2" crossorigin>');
  m.push('<link rel="preload" href="' + ctx.asset('fonts/roboto-flex-latin.woff2') + '" as="font" type="font/woff2" crossorigin>');
  m.push(...heroPreload(mainHtml));
  m.push('<link rel="stylesheet" href="' + ctx.asset('site.css') + '">');
  return m.join('\n');
}

/* ---------------------------------------------------------------- header */
/* the Shop mega menu's six paired photo cards plus "Shop All" (BUILD-CONTRACT 4.17.3, DESIGN-SPEC 6.3). Labels and
   hrefs come from the nav model, matched by label; a pair whose label is not in the model is skipped. */
const MEGA_CARDS = [
  { main: 'Flower', sub: 'Pre-Rolls', slot: 'MENU-FLOWER' },
  { main: 'Edibles', sub: 'Tinctures', slot: 'MENU-EDIBLES' },
  { main: 'Concentrates', sub: 'Vaporizers', slot: 'MENU-CONC' },
  { main: 'Topicals', sub: 'CBD', slot: 'MENU-TOPICALS' },
  { main: 'Seeds', sub: null, slot: 'MEGA-SEEDS' },
  { main: 'Accessories', sub: 'Apparel', slot: 'MENU-ACC' },
];
/* painted widths (object-fit: cover; R-48 needs 1.0 file px per device px): mega cards are about 280x130 CSS at
   1280, the Shop All column about 216x280 (cover makes the 3:2 photo about 420 CSS wide); phone-sheet cards about
   170x120 and the Shop All banner the sheet's full width */
const SIZES_MCARD = '(max-width: 1100px) 48vw, 300px';
const SIZES_FEATURE = '(max-width: 1100px) 94vw, 440px';
function navLinkList(ctx, items, cls) {
  if (!items || !items.length) return '';
  return '<ul' + (cls ? ' class="' + cls + '"' : '') + '>' + items.map((i) => '<li>' + link(ctx, i.href, e(ctx, i.label), { target: i.target || null, title: i.title || null }) + (i.children && i.children.length ? navLinkList(ctx, i.children) : '') + '</li>').join('') + '</ul>';
}
/** the Shop menu's parts, shared by the mega panel and the phone sheet: { feature, cards[], offers, plain[], strips,
    apparel, rest[] } (labels and hrefs verbatim from the model) */
function shopParts(ctx, item) {
  const h = ctx.nav || {};
  const kids = item.children || [];
  const byLabel = new Map(kids.map((k) => [normSp(k.label), k]));
  const used = new Set();
  const take = (label) => { const k = byLabel.get(label); if (k) used.add(k); return k; };
  const shopAll = take('Shop All');
  const cards = MEGA_CARDS.map((c) => { const main = take(c.main); return main ? { main, sub: c.sub ? take(c.sub) : null, slot: c.slot } : null; }).filter(Boolean);
  const strips = h.strips || [];
  const offers = strips[0] && strips[0][0] && /Daily Offers/.test(strips[0][0].label) ? strips[0][0] : null;
  const plain = ['Offers', 'Shop Gift Cards'].map(take).filter(Boolean);
  const apparel = kids.find((k) => k.children && k.children.length) || null;
  if (apparel) used.add(apparel);
  return { shopAll, cards, offers, plain, strips, apparel, used, kids };
}
function cardHtml(ctx, c, n, sizes) {
  return '<li class="mcard" style="--d:' + n + '">' + slotImg(ctx, c.slot, { alt: '', sizes, cls: 'mcard__img', tag: false, widths: [480, 640, 960] }) + '<span class="mcard__scrim" aria-hidden="true"></span><div class="mcard__labels"><p>'
    + link(ctx, c.main.href, e(ctx, c.main.label) + icon('arrow', 'ar'), { class: 'mcard__main' }) + '</p>' + (c.sub ? '<p>' + link(ctx, c.sub.href, e(ctx, c.sub.label), { class: 'mcard__sub', target: c.sub.target || null }) + '</p>' : '') + '</div></li>';
}
function featureHtml(ctx, item, shopAll, sizes, cls) {
  return shopAll ? link(ctx, shopAll.href, slotImg(ctx, 'MEGA-SHOPALL', { alt: '', sizes, cls: 'mega__img', widths: [640, 960, 1280] }) + '<div class="mega__feature-txt"><p class="mega__feature-k">' + e(ctx, item.label) + '</p><p class="mega__feature-t">' + e(ctx, shopAll.label) + icon('arrow', 'ar') + '</p></div>', { class: cls || 'mega__feature' }) : '';
}
/** the Shop mega panel. Every model label is rendered at least once: cards, then the side column (offers, gift cards,
    the strips as their own labelled navs, the Apparel heading and its L3 list, the strips' hint), then any label left */
function megaPanel(ctx, item, id) {
  const h = ctx.nav || {};
  const P = shopParts(ctx, item);
  const megaRaw = (ctx.chrome && Array.isArray(ctx.chrome.mega)) ? ctx.chrome.mega : [];
  const side = [];
  if (P.offers) side.push('<p class="mega__offers">' + link(ctx, P.offers.href, e(ctx, P.offers.label), { title: P.offers.title || null }) + '</p>');
  if (P.plain.length) side.push('<ul class="mega__links">' + P.plain.map((k) => '<li>' + link(ctx, k.href, e(ctx, k.label)) + '</li>').join('') + '</ul>');
  /* the strips: strip 1 repeats the card labels (and the offers link); it is printed as its labelled nav only when it
     holds a label the cards do not; strip 2 is the pills. The strips' "Menu Toggle" is the burger's label. */
  const placed = new Set([...P.used].map((k) => normSp(k.label)).concat(P.offers ? [normSp(P.offers.label)] : []));
  P.strips.forEach((s, i) => {
    const labs = (megaRaw[i] && megaRaw[i].ariaLabels) || [];
    const navLabel = labs.find((l) => l !== 'Menu Toggle') || null;
    const extra = (s || []).filter((x) => !placed.has(normSp(x.label)));
    if (i > 0 || extra.length) side.push('<nav class="mega__strip"' + (navLabel ? ' aria-label="' + ctx.escAttr(navLabel) + '"' : '') + '>' + navLinkList(ctx, i > 0 ? s : extra, 'mega__pills') + '</nav>');
    else if (navLabel) side.push('<nav class="mega__strip mega__strip--cards" aria-label="' + ctx.escAttr(navLabel) + '">' + navLinkList(ctx, s, 'mega__pills mega__pills--quiet') + '</nav>');
    for (const x of s || []) placed.add(normSp(x.label));
  });
  if (P.apparel) side.push('<p class="mega__h">' + link(ctx, P.apparel.href, e(ctx, P.apparel.label)) + '</p>' + navLinkList(ctx, P.apparel.children, 'mega__links mega__links--sm'));
  if (h.hint) side.push('<p class="mega__hint fine">' + e(ctx, h.hint) + '</p>');
  const rest = P.kids.filter((k) => !P.used.has(k));
  if (rest.length) side.push(navLinkList(ctx, rest, 'mega__links'));
  return '<div class="mega" id="' + id + '" data-mega><div class="mega__panel">' + featureHtml(ctx, item, P.shopAll, SIZES_FEATURE) + '<ul class="mega__grid">' + P.cards.map((c, n) => cardHtml(ctx, c, n, SIZES_MCARD)).join('') + '</ul><div class="mega__side">' + side.join('') + '</div></div></div>';
}
/** exactly ONE mega: the first item whose children hold "Shop All" AND at least 3 of the card categories (the Shop
    Menu). "Ship My Apparel" also has a "Shop All" child, but it is a simple dropdown (DESIGN-SPEC 6.3). */
function megaIndex(ctx) {
  const cardLabels = new Set(MEGA_CARDS.map((c) => c.main));
  return ((ctx.nav && ctx.nav.menu) || []).findIndex((it) => (it.children || []).some((k) => normSp(k.label) === 'Shop All') && (it.children || []).filter((k) => cardLabels.has(normSp(k.label))).length >= 3);
}
function header(page, ctx) {
  const h = ctx.nav || {};
  /* the hanging sign: the logo master at one 700 px variant (R-2); alt verbatim from the header model. It is not a
     separate Tab stop (tabindex -1): "Home", the next link, has the same destination, and R-30 caps the header at 14
     stops. Pointer, screen-reader browse mode and the link itself are unchanged. */
  const logo = ctx.img(LOGO_MASTER, { alt: (h.logo && h.logo.alt) || '', sizes: '96px', loading: 'eager', decoding: 'sync', widths: [700], cls: 'hdr__logo-img' });
  const megaIdx = megaIndex(ctx);
  const items = (h.menu || []).map((it, idx) => {
    const kids = it.children || [];
    const isMega = idx === megaIdx;
    const cur = page.path && it.href === page.path ? { 'aria-current': 'page' } : {};
    const a = link(ctx, it.href, e(ctx, it.label), { class: 'nav__link', target: it.target || null, title: it.title || null, ...cur });
    if (!kids.length) return '<li class="nav__item">' + a + '</li>';
    const id = uid('sub');
    const caret = '<button type="button" class="nav__caret" data-caret aria-expanded="false" aria-controls="' + id + '" aria-label="' + ctx.escAttr(it.label + ' ' + LABELS.submenu) + '">' + icon('caret') + '</button>';
    const panel = isMega ? megaPanel(ctx, it, id) : '<div class="drop" id="' + id + '">' + navLinkList(ctx, kids, 'drop__list') + '</div>';
    return '<li class="nav__item has-sub' + (isMega ? ' has-mega' : '') + '" data-nav-item>' + a + caret + panel + '</li>';
  }).join('');
  /* "Menu" is the source header nav's aria-label (audit/raw/index.html); the burger carries the source's "Menu Toggle" */
  const toggle = h.toggleLabel || 'Menu Toggle';
  const sf = h.search;
  /* the search form (DESIGN-SPEC 6.5): its <label class="sr"> is the source's screen-reader-only label; the submit
     button's source text was screen-reader-only too (buttonSrOnly), so it stays in .sr beside the icon. data-src = the
     build's search index (ctx.searchIndex; the build relativizes data-src), lazy-loaded by site.js. On phones the
     panel is a dialog (site.js sets role/aria-modal there) with a Close button. */
  const search = sf ? '<div class="search-panel" id="search-panel" data-search aria-label="' + ctx.escAttr(sf.label || LABELS.search) + '"><div class="wrap search-panel__in"><form class="search-form" role="search" method="get" action="' + ctx.url(sf.action || '/') + '"' + (ctx.searchIndex ? ' data-src="' + ctx.escAttr(ctx.searchIndex) + '"' : '') + '>' + icon('search')
    + (sf.label ? '<label class="sr" for="site-search">' + e(ctx, sf.label) + '</label>' : '')
    + '<input type="search" id="site-search" name="' + ctx.escAttr(sf.field || 's') + '"' + (sf.placeholder ? ' placeholder="' + ctx.escAttr(sf.placeholder) + '"' : '') + ' autocomplete="off" aria-controls="search-results" aria-autocomplete="list" aria-expanded="false">'
    + (sf.button ? '<button type="submit" class="btn btn--ink btn--sm search-go">' + (sf.buttonSrOnly ? icon('arrow') + '<span class="sr">' + e(ctx, sf.button) + '</span>' : e(ctx, sf.button)) + '</button>' : '')
    + '<button type="button" class="tool search-close" data-search-close aria-label="' + LABELS.close + '">' + icon('close') + '</button>'
    + '</form><div class="search-results" id="search-results" data-search-results role="region" aria-live="polite"></div></div></div>' : '';
  return '<header class="hdr" id="topBar" data-header><div class="wrap hdr__bar">'
    + link(ctx, (h.logo && h.logo.href) || '/', logo, { class: 'hdr__logo', tabindex: '-1' })
    + '<nav class="nav" aria-label="Menu"><ul class="nav__list">' + items + '</ul></nav>'
    + '<div class="hdr__tools">'
    + (sf ? '<button type="button" class="tool tool--search" data-search-open aria-expanded="false" aria-controls="search-panel" aria-label="' + ctx.escAttr(sf.label || LABELS.search) + '">' + icon('search') + '</button>' : '')
    + '<button type="button" class="tool tool--bag" data-bag-open aria-haspopup="dialog" aria-controls="bag" aria-label="' + LABELS.bag + '" aria-describedby="bag-count-sr">' + icon('bag') + '<span class="tool__txt">' + LABELS.bag + '</span> <span class="bag-count" data-bag-count aria-hidden="true">0</span></button><div class="sr" id="bag-count-sr" data-bag-count-sr>0 items</div>'
    + '<button type="button" class="tool tool--burger" data-sheet-open aria-haspopup="dialog" aria-controls="sheet" aria-expanded="false" aria-label="' + ctx.escAttr(toggle) + '"><span class="burger" aria-hidden="true"><i></i><i></i><i></i></span></button>'
    + '</div></div>' + search + '</header>';
}
/** the footer model's contact block (heading "Contact" + the block after it), for the phone sheet (DESIGN-SPEC 6.4.5) */
function footerContact(ctx) {
  for (const s of (ctx.footer && ctx.footer.sections) || []) {
    if (s.hiddenAll) continue;
    const list = (s.blocks || []).filter((b) => b && !b.hiddenAll);
    const i = list.findIndex((b) => b.t === 'heading' && /^contact$/i.test(normSp(b.text)));
    if (i !== -1 && list[i + 1]) return list[i + 1];
  }
  return null;
}
/** the phone menu sheet (DESIGN-SPEC 6.4): a dialog labelled "Menu" (the source nav label), hidden until opened.
    1 the Shop Menu photo cards (Shop All a 16:7 banner over both columns, the six group cards in 3 rows); 2 the plain
    offer links; 3 the strip-2 pills; then the Apparel list; 4 the other L1 items as accordions (button + L2 links);
    5 the footer model's visible address and phone. Card images are lazy: the sheet is display:none until opened. */
function sheet(page, ctx) {
  const h = ctx.nav || {};
  const megaIdx = megaIndex(ctx);
  const out = [];
  (h.menu || []).forEach((it, idx) => {
    const kids = it.children || [];
    const cur = page.path && it.href === page.path ? { 'aria-current': 'page' } : {};
    if (idx === megaIdx) {
      const P = shopParts(ctx, it);
      let s = '<li class="sheet__shop"><p class="sheet__shop-h">' + link(ctx, it.href, e(ctx, it.label), { class: 'sheet__l1', ...cur }) + '</p>';
      s += '<ul class="sheet__cards">' + (P.shopAll ? '<li class="mcard mcard--feature">' + featureHtml(ctx, it, P.shopAll, SIZES_FEATURE, 'mega__feature') + '</li>' : '') + P.cards.map((c, n) => cardHtml(ctx, c, n, SIZES_MCARD)).join('') + '</ul>';
      if (P.offers || P.plain.length) s += '<ul class="sheet__links">' + (P.offers ? '<li>' + link(ctx, P.offers.href, e(ctx, P.offers.label), { title: P.offers.title || null }) + '</li>' : '') + P.plain.map((k) => '<li>' + link(ctx, k.href, e(ctx, k.label)) + '</li>').join('') + '</ul>';
      if (P.strips[1] && P.strips[1].length) s += navLinkList(ctx, P.strips[1], 'mega__pills sheet__pills');
      if (P.apparel) s += '<p class="sheet__sub-h">' + link(ctx, P.apparel.href, e(ctx, P.apparel.label)) + '</p>' + navLinkList(ctx, P.apparel.children, 'sheet__l3');
      const rest = P.kids.filter((k) => !P.used.has(k));
      if (rest.length) s += navLinkList(ctx, rest, 'sheet__links');
      out.push(s + '</li>');
      return;
    }
    if (!kids.length) { out.push('<li>' + link(ctx, it.href, e(ctx, it.label), { class: 'sheet__l1', target: it.target || null, title: it.title || null, ...cur }) + '</li>'); return; }
    const id = uid('acc');
    /* the L1 link stays reachable inside its panel when no child already goes to the same place */
    const own = kids.some((k) => k.href === it.href) ? '' : '<li>' + link(ctx, it.href, e(ctx, it.label), { target: it.target || null, title: it.title || null, ...cur }) + '</li>';
    out.push('<li class="sheet__acc"><button type="button" class="sheet__l1 sheet__acc-btn" data-acc aria-expanded="false" aria-controls="' + id + '">' + e(ctx, it.label) + icon('caret') + '</button><div class="sheet__acc-panel" id="' + id + '" hidden><ul class="sheet__l2">' + own + kids.map((k) => '<li>' + link(ctx, k.href, e(ctx, k.label), { target: k.target || null, title: k.title || null }) + '</li>').join('') + '</ul></div></li>');
  });
  const contact = footerContact(ctx);
  return '<div class="sheet" id="sheet" data-sheet hidden><div class="sheet__veil" data-sheet-close></div><div class="sheet__panel" role="dialog" aria-modal="true" aria-label="Menu" data-dialog="sheet">'
    + '<div class="sheet__top"><button type="button" class="tool" data-sheet-close aria-label="' + LABELS.close + '">' + icon('close') + '</button></div>'
    + '<nav class="sheet__nav" aria-label="Menu"><ul class="sheet__list">' + out.join('') + '</ul></nav>'
    + (contact ? '<div class="sheet__contact">' + renderBlock(contact, ctx) + '</div>' : '') + '</div></div>';
}
/** the Pickup bag drawer (DESIGN-SPEC 6.6; preview only, BUILD-CONTRACT 4.5): hidden until opened. site.js renders the
    items (name, variant, price with "as of", quantity steppers) into data-bag-items and toggles data-bag-empty.
    "Place pre-order" is disabled; its reason is the preview notice (aria-describedby). */
function bag(ctx) {
  return '<div class="bag" id="bag" data-bag hidden><div class="bag__veil" data-bag-close></div><div class="bag__sheet" role="dialog" aria-modal="true" aria-labelledby="bag-h" data-dialog="bag">'
    + '<div class="bag__top"><h2 id="bag-h">' + LABELS.bag + '</h2><button type="button" class="tool" data-bag-close aria-label="' + LABELS.close + '">' + icon('close') + '</button></div>'
    + '<p class="bag__preview" id="bag-preview">' + 'Preview: orders are not sent' + '</p>'
    + '<ul class="bag__items" data-bag-items></ul><p class="bag__empty" data-bag-empty>' + 'Your order is empty.' + '</p>'
    + '<p class="bag__disclaimer fine">' + e(ctx, BAG_DISCLAIMER) + '</p>'
    + '<p class="bag__actions"><button type="button" class="btn btn--ink" aria-disabled="true" aria-describedby="bag-preview" data-bag-place>' + 'Place pre-order' + '</button></p>'
    + '</div></div>';
}

/* ---------------------------------------------------------------- footer */
/** the visible Monday-first hours (BUILD-CONTRACT 4.15.3) as two aligned columns: a rich block holding only text lines
    split by <br> becomes a list, each line "Day time" -> day + time, the words unchanged. Anything else renders as is. */
function hoursList(b, ctx) {
  const m = b && b.t === 'rich' && String(b.html || '').match(/^\s*<p>([^<>]*(?:<br\s*\/?>[^<>]*)*)<\/p>\s*$/);
  if (!m) return renderBlock(b, ctx);
  const lines = m[1].split(/<br\s*\/?>/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length || !lines.every((l) => /^\S+\s+\S/.test(l))) return renderBlock(b, ctx);
  return '<ul class="hours-list">' + lines.map((l) => { const k = l.search(/\s/); return '<li><span class="hours__d">' + l.slice(0, k) + '</span> <span class="hours__t">' + l.slice(k).trim() + '</span></li>'; }).join('') + '</ul>';
}
/** footer (DESIGN-SPEC 6.7): the double-arch seam over the deep-water band (P7 fluke breaches it on home), the
    newsletter band as a smoked pane, the brand column, Hours (id="hours", the "Hours of Operation" target), Contact,
    Menu and Learn, the legal row, the repeated "*Must be 21+ with a VALID ID.", the AI note (4.17.4), the service area
    and the chambers. Blocks render verbatim through blocks.mjs; hiddenAll sections and blocks are skipped (the
    Sunday-first Joint list is never rendered, 4.15.3); the source's empty "#topBar" button becomes the to-top link. */
function footer(page, ctx) {
  const f = ctx.footer || {};
  let hoursDone = false;
  let toTop = false;
  const news = [], cols = [], legal = [], tail = [];
  for (const s of (Array.isArray(f.sections) ? f.sections : [])) {
    if (s.hiddenAll) continue;
    const list = (s.blocks || []).filter((b) => b && !b.hiddenAll && !(b.t === 'chrome-ref') && !(b.t === 'excluded'));
    if (!list.length) continue;
    if (list.every((b) => b.t === 'button' && /^#/.test(String(b.href || '')) && !normSp(b.label))) { toTop = true; continue; }
    const hasHeading2 = list.some((b) => b.t === 'heading' && b.level === 2);
    if (!hasHeading2 && list.some((b) => b.t === 'button') && list.some((b) => b.t === 'heading')) { news.push(list.map((b) => renderBlock(b, ctx)).join('\n')); continue; }
    if (!hasHeading2) { tail.push('<div class="ftr__area-part">' + list.map((b) => renderBlock(b, ctx)).join('\n') + '</div>'); continue; }
    /* the main section: a column per level-2 heading; blocks before the first heading are the brand column; a divider
       starts the legal row */
    let cur = { cls: 'ftr__brand', html: [] };
    let inLegal = false;
    const flush = () => { if (cur && cur.html.length) cols.push(cur); };
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.t === 'divider') { flush(); cur = null; inLegal = true; continue; }
      if (inLegal) { legal.push(renderBlock(b, ctx)); continue; }
      if (b.t === 'heading' && b.level === 2) {
        flush();
        const isHours = !hoursDone && /^hours$/i.test(normSp(b.text));
        cur = { cls: isHours ? 'ftr__hours hours' : 'ftr__col', id: isHours ? 'hours' : null, html: [renderBlock(b, ctx)] };
        if (isHours) { hoursDone = true; if (list[i + 1] && list[i + 1].t === 'rich') { cur.html.push(hoursList(list[i + 1], ctx)); i++; } }
        continue;
      }
      if (b.t === 'button' && /^#/.test(String(b.href || '')) && !normSp(b.label)) { toTop = true; continue; }
      cur.html.push(b.t === 'image' ? renderBlock(b, ctx, { imgSizes: '180px' }) : renderBlock(b, ctx));
    }
    flush();
  }
  const gate = ctx.ageGate || {};
  const must = (gate.notes || []).find((n) => /VALID ID/.test(n));
  const top = toTop || (ctx.nav && ctx.nav.backToTop);
  /* calm revision (operator, 2026-10-13): the footer is the solid harbour gradient under its wave edge, without the
     deep-water photo; the newsletter is a plain outlined panel (no smoked glass). The whale fluke stays on home. */
  return '<footer class="ftr" data-footer>'
    + (page.kind === 'home' ? protrusion(ctx, 'CUT-FLUKE', { cls: 'protrude--fluke', sizes: '(max-width: 700px) 260px, 520px', breach: true }) : '')
    + '<div class="wrap ftr__in">'
    + (news.length ? '<section class="ftr__news ftr__news--calm">' + news.join('\n') + '</section>' : '')
    + '<div class="ftr__grid">' + cols.map((c) => '<section class="ftr__part ' + c.cls + '"' + (c.id ? ' id="' + c.id + '"' : '') + '>' + c.html.join('\n') + '</section>').join('') + '</div>'
    + (hoursDone ? '' : '<span id="hours"></span>')
    + '<div class="ftr__legal">' + legal.join('\n') + (must ? '<p class="ftr__must">' + e(ctx, must) + '</p>' : '') + '<p class="ftr__ai">' + AI_NOTE + '</p></div>'
    + (tail.length ? '<div class="ftr__area">' + tail.join('') + '</div>' : '')
    + '</div></footer>'
    + (top ? '<a class="totop" href="#topBar" data-totop aria-label="' + TO_TOP + '">' + icon('up') + '</a>' : '');
}

/* ---------------------------------------------------------------- age gate */
/** age gate (BUILD-CONTRACT 4.4, 4.15.2, 4.17.1 FAIL CLOSED): visible by default (<dialog open>); the head script hides
    it before paint when consent is stored; without JS, "Yes" (#age-ok) and "No" (#age-no) work through :target, per
    page view. site.js makes it modal, makes main/header/footer inert, sets document.title to the plugin's
    customTitle while it is up, keeps it up on "No" with the plugin's error, and shows the plugin's cookie warning when
    storage throws. The veil (the lighthouse photo, gate backdrop only, never captioned) and the card are siblings. */
function ageGate(ctx) {
  const g = ctx.ageGate;
  if (!g) return '';
  const P = { ...AGE_GATE_PLUGIN, ...(g.error ? { error: g.error } : {}), ...(g.customTitle ? { customTitle: g.customTitle } : {}), ...(g.cookies ? { cookies: g.cookies } : {}) };
  const aria = String(g.ariaLabel || g.challenge || '').replace('%s', '21');
  const notes = g.notes || [];
  const logoAlt = (g.logo && g.logo.alt) || '';
  return '<span id="age-ok" class="age-target"></span><span id="age-no" class="age-target"></span>'
    + '<dialog id="age-gate" class="agegate" open' + ctx.attrs({ 'aria-modal': 'true', 'aria-label': aria, 'aria-describedby': 'age-q', 'data-key': g.storageKey || 'ccc-age-21', 'data-title': P.customTitle, 'data-dialog': 'age' }) + '>'
    /* loading=lazy (orchestrator, 2026-10-12, R-20): with consent stored, html.age-ok hides the gate (display:none),
       so lazy images inside it are never fetched; for a first visit the open gate covers the viewport and they load at
       once. Eager, they cost every returning visitor 94 KB (veil) plus the logo on every page. */
    + '<div class="agegate__veil" aria-hidden="true">' + slotImg(ctx, 'AGEGATE-VEIL', { alt: '', sizes: '100vw', cls: 'agegate__veil-img', tag: false, loading: 'lazy', widths: [960, 1280] }) + '</div>'
    + '<div class="agegate__card">'
    + (g.logo ? ctx.img(GATE_LOGO, { alt: logoAlt, sizes: '190px', loading: 'lazy', widths: [370], cls: 'agegate__logo' }) : '')
    + '<p class="agegate__h">' + e(ctx, g.headline) + '</p><p class="agegate__q" id="age-q">' + e(ctx, g.challenge) + '</p>'
    + '<p class="agegate__btns"><a href="#age-ok" role="button" class="btn btn--ink btn--lg" data-age="yes">' + e(ctx, g.yes) + '</a> <a href="#age-no" role="button" class="btn btn--glass btn--lg" data-age="no">' + e(ctx, g.no) + '</a></p>'
    + '<p class="age-error agegate__no" role="alert" hidden>' + e(ctx, P.error) + '</p>'
    + '<p class="age-cookies agegate__no" role="alert" hidden>' + e(ctx, P.cookies) + '</p>'
    + notes.map((n, i) => '<p class="' + (i === notes.length - 1 && ctx.site && n === ctx.site.tagline ? 'agegate__tag script' : 'agegate__fine') + '">' + e(ctx, n) + '</p>').join('')
    + '</div></dialog>';
}

/* ---------------------------------------------------------------- document */
/** the complete HTML document around mainHtml (the <main> inner html from a template module) */
export function renderDocument(page, ctx, mainHtml) {
  const skip = (ctx.nav && ctx.nav.skipLink) || { label: 'Skip to main content', href: '#content' };
  const mainId = String(skip.href || '#content').replace(/^#/, '') || 'content';
  return '<!doctype html>\n<html lang="en-US">\n<head>\n' + head(page, ctx, mainHtml) + '\n</head>\n<body class="kind-' + ctx.escAttr(page.kind) + '">\n'
    + '<a class="skip" href="#' + ctx.escAttr(mainId) + '">' + e(ctx, skip.label) + '</a>\n'
    + header(page, ctx) + '\n<main id="' + ctx.escAttr(mainId) + '" tabindex="-1">\n' + mainHtml + '\n</main>\n' + footer(page, ctx) + '\n'
    + sheet(page, ctx) + '\n' + bag(ctx) + '\n<div class="sr" aria-live="polite" data-live></div>\n' + ageGate(ctx)
    + '\n<script src="' + ctx.asset('site.js') + '" defer></script>\n</body>\n</html>\n';
}
