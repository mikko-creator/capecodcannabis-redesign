// src/theme/shop.mjs - shop templates: shop-menu, products-index, product, brands-index, brand, categories-index,
// category, subcategory, specials-index, special, sale-landing, collection; plus the `products` block (Joint grid/rail).
// Owner: T2b (shop). Change requests: tmp/t2b/INBOX.md. Look: tmp/panel/winner/{category,product}.html; contract:
// BUILD-CONTRACT 4.5 (Plan B), 4.16.2 (data-catalog), 4.16.7 (chips), 4.17.4 (AI tag), 4.17.8 (category pages);
// DESIGN-SPEC 6.9 (interior hero), 6.12 (live panels, Plan B cards), 6.13 (filter bar), 6.14 (product page), R-13, R-39.
//
// Exports: SHOP_KINDS (Set), renderShop(page, ctx) -> <main> inner html, renderListing(block, ctx, opts?) -> html,
//          productBody(page, ctx) -> html, SHOP_LABELS (the words this module adds; each one declared in
//          src/content/removals.d/theme-shop.json or the base file)
// Rules:
// - Plan B: evidenced members only (brand pages: page.products) plus the live-menu hand-off; never invented products,
//   prices or images. Only t1 (product.full) has a price "as of <date>", a photo and a Reserve button.
// - No strike-through, no <del>/<s>, no badge or pill holding "%", "off", "Sale", "Special" or "Deal" (COMMERCE, R-39):
//   offer titles stay plain text at their model heading level.
// - Catalog-driven text (product titles, brand names) sits inside a data-catalog element (4.16.2); captions, hand-offs and
//   UI labels stay outside it. Chip labels and facet values are NOT server-rendered on parity-checked pages (brand pages):
//   the gate has no evidence rule for them yet (request in tmp/p1/INBOX.md); shop.js builds the facet lists from the
//   cards' data attributes. Product pages (not parity-checked; guarded by tools/product-guard.mjs) show the chips.
import { renderBlocks, renderSection, renderPopup } from './blocks.mjs';
import { link, breadcrumbs, handoff, LABELS, slot, slotImg, protrusion, icon } from './parts.mjs';

export const SHOP_KINDS = new Set(['shop-menu', 'products-index', 'product', 'brands-index', 'brand', 'categories-index', 'category', 'subcategory', 'specials-index', 'special', 'sale-landing', 'collection']);

/** the words this module adds (declaration ids in src/content/removals.d/theme-shop.json unless noted) */
export const SHOP_LABELS = {
  reserve: 'Reserve for pickup',              // shop-reserve
  viewBag: 'View bag',                        // shop-view-bag
  preview: 'Preview: orders are not sent',    // shop-bag-preview (+ shop-preview-note on product pages)
  inStock: 'In stock',                        // shop-in-stock (schema.org InStock of the offer)
  filters: 'Filters',                         // shop-filter-ui
  apply: 'Apply',                             // shop-filter-ui
  clearAll: 'Clear all',                      // shop-filter-ui
  filterEmpty: 'No products match these filters.',   // shop-filter-empty
  facetSize: 'Size',                          // shop-facet-names (Joint param "weights" -> variants.option)
  facetStrain: 'Strain type',                 // shop-facet-names (Joint param "strain" -> strainType)
};
/** the evidenced Joint sort labels (COMMERCE 6) with the record field each sorts on. A sort is offered only when its
    field is present with 2+ distinct values among the listed members (DESIGN-SPEC 6.13): on Plan B pages (title, brand,
    chips only) none qualifies, so the select is not rendered. Declared: shop-sort-labels */
const SORTS = [
  { label: 'Price: Low to High', key: 'price', dir: 1, get: (p) => p.price },
  { label: 'Price: High to Low', key: 'price', dir: -1, get: (p) => p.price },
  { label: 'Brand', key: 'brand', dir: 1, get: (p) => (p.brand && p.brand.name) || null },
  { label: 'THC: High to Low', key: 'thc', dir: -1, get: (p) => p.thc },
  { label: 'CBD: Low to High', key: 'cbd', dir: 1, get: (p) => p.cbd },
];
const SORT_NAME = 'Sort';   /* the select's accessible name (declared with the sort labels; rendered only when a sort applies) */

const e = (ctx, s) => ctx.esc(s);
const normSp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const visible = (list) => (list || []).filter((b) => b && !b.hiddenAll);
const L = SHOP_LABELS;

/* ---------------------------------------------------------------- category art (DESIGN-SPEC 10.3; brief) */
/* the category hero slot by top-level category path; subcategories use their parent's. Flower uses the real trichomes
   macro (FLOWER-HERO), Seeds the real seeds photo (MEGA-SEEDS); the others are generated (tag:true). */
const CAT_SLOT = {
  flower: 'FLOWER-HERO', seeds: 'MEGA-SEEDS', 'pre-rolls': 'CAT-PREROLLS', edibles: 'CAT-EDIBLES', vaporizers: 'CAT-VAPORIZERS',
  tinctures: 'CAT-TINCTURES', concentrates: 'CAT-CONCENTRATES', topicals: 'CAT-TOPICALS', cbd: 'CAT-CBD',
  accessories: 'CAT-ACCESSORIES', merch: 'CAT-APPAREL',
};
function categorySlot(page) {
  const m = /^\/categories\/([^/]+)\//.exec(page.path || '');
  return m ? CAT_SLOT[m[1].toLowerCase()] || null : null;
}

/* ---------------------------------------------------------------- headings */
/** the H1 text, split like the prototype's category page when it follows "Shop [Cannabis] X for sale in ...": the
    first words at display weight, the noun as the gradient word, the rest as a sub-line (DESIGN-SPEC 6.9). Every word
    stays verbatim and in order; the parts are separated by a real space, so the text reads as one run. Only for
    kinds whose H1 is the model's own (no build H1 note). */
const SPLIT_KINDS = new Set(['category', 'subcategory', 'collection', 'shop-menu', 'products-index', 'brands-index']);
function h1Inner(ctx, page, text) {
  const t = String(text || '');
  const m = SPLIT_KINDS.has(page.kind) ? /^(Shop(?: Cannabis)?) (\S.*?) ((?:for|For) [Ss]ale in .+)$/.exec(t) : null;
  if (!m) return e(ctx, t);
  const words = m[2].split(' ');
  const last = words.pop();
  const lead = m[1] + ' ' + (words.length ? words.join(' ') + ' ' : '');
  return '<span class="h1__main">' + e(ctx, lead) + '<span class="grad">' + e(ctx, last) + '</span></span> <span class="h1__sub">' + e(ctx, m[3]) + '</span>';
}
/** the page's level-1 heading block, wherever the build put it */
function h1Block(page) {
  for (const s of page.sections || []) {
    if (!s || s.hiddenAll) continue;
    for (const b of visible(s.blocks)) if ((b.t === 'heading' || b.t === 'event-field') && +b.level === 1) return { s, b };
  }
  return null;
}
/** a model heading block rendered with the shop's H1 treatment when it is the level-1 heading */
function renderHeroBlocks(ctx, page, blocks) {
  return visible(blocks).map((b) => {
    if (b.t === 'heading' && +b.level === 1 && !b.srOnly) {
      const inner = h1Inner(ctx, page, b.text);
      return '<h1 class="h1 shop-h1">' + (b.href ? link(ctx, b.href, inner) : inner) + '</h1>';
    }
    return renderBlocks([b], ctx);
  }).filter(Boolean).join('\n');
}

/* ---------------------------------------------------------------- live panels and listings */
/** the "Shop Menu" item of the header model (verbatim label and href), for the live panel's second link */
function shopMenuItem(ctx) {
  const menu = (ctx.nav && ctx.nav.menu) || [];
  return menu.find((i) => normSp(i.label) === 'Shop Menu') || null;
}
/* the panel tone for the section being rendered: renderShop sets 'smoke' around a listing band; elsewhere (home, town
   and terpene pages render products blocks through blocks.mjs) a panel is a plain white card unless the caller's CSS
   says otherwise (no backdrop-filter by default: a flat ground has nothing to blur, DESIGN-SPEC 4.6) */
let PANEL_TONE = null;
let GRID_PAGE = null;   /* the page whose evidenced grid has been rendered (one grid per page) */
/** a live-menu panel (DESIGN-SPEC 6.12a): the verbatim heading (when the widget has one), the hand-off, the verbatim
    "Shop Menu" link. No product cards, placeholders or prices (BUILD-CONTRACT 4.5) */
function livePanel(ctx, page, { heading, tone, attrs } = {}) {
  const smoke = tone === 'smoke';
  const menu = shopMenuItem(ctx);
  /* two separate block elements: the hand-off and the menu link are two labels, never one run (parity units) */
  const menuLink = menu && ctx.url(menu.href) !== ctx.url(page.path) ? '<p>' + link(ctx, menu.href, e(ctx, menu.label), { class: 'live-panel__menu' }) + '</p>' : '';
  /* calm revision (operator, 2026-10-13): every live-menu panel is a plain surface */
  void smoke;
  const cls = ['live-panel', 'surface'].join(' ');
  return '<div' + ctx.attrs({ class: cls, ...(attrs || {}) }) + '>'
    + (heading ? '<p class="live-panel__h">' + e(ctx, heading) + '</p>' : '')
    + '<div class="live-panel__actions"><p>' + handoff(ctx, page.path, { cls: 'btn ' + (smoke ? 'btn--sky' : 'btn--ink') + ' handoff' }) + '</p>' + menuLink + '</div></div>';
}

/** one Plan B card for an evidenced member (DESIGN-SPEC 6.12b): brand eyebrow and title inside data-catalog; the slug
    flag caption outside it; the chip data in attributes for the filters (shop.js). No photo frame, no price. */
function memberCard(ctx, page, p, i) {
  const brand = p.brand || null;
  const size = p.size && p.size.label ? p.size : null;
  const strain = p.strainType && p.strainType.label ? p.strainType : null;
  const onOwnBrand = brand && ctx.url(brand.path) === ctx.url(page.path);
  const brandHtml = brand ? '<p class="bcard__brand"><span data-catalog="brand">' + (onOwnBrand ? e(ctx, brand.name) : link(ctx, brand.path, e(ctx, brand.name))) + '</span></p>'
    + (brand.match === 'slug-start' ? '<p class="bcard__flag">(' + e(ctx, LABELS.fromSlug) + ')</p>' : '') : '';
  return '<li' + ctx.attrs({
    class: 'bcard', 'data-i': String(i),
    'data-size': size ? size.label : null, 'data-size-src': size ? size.from : null,
    'data-strain': strain ? strain.label : null, 'data-strain-src': strain ? strain.from : null,
    'data-brand': brand ? brand.name : null,
  }) + '>' + brandHtml
    + '<p class="bcard__name" data-catalog="title">' + link(ctx, p.path, e(ctx, p.title), { class: 'bcard__link' }) + '</p>'
    + '<span class="bcard__tail" aria-hidden="true">' + icon('arrow') + '</span></li>';
}
/** the filter bar (DESIGN-SPEC 6.13) for an evidenced grid: only facets with 2+ distinct values in the data; the value
    lists are built by shop.js from the cards' data attributes (catalog text, never retyped). On phones "Filters" opens
    the same controls as a bottom-sheet dialog. Sorting: see SORTS. */
function filterBar(ctx, members, gridId) {
  const distinct = (k) => new Set(members.map((p) => (p[k] && p[k].label) || null).filter(Boolean)).size;
  const facets = [];
  if (distinct('size') >= 2) facets.push({ key: 'size', name: L.facetSize });
  if (distinct('strainType') >= 2) facets.push({ key: 'strain', name: L.facetStrain });
  if (new Set(members.map((p) => p.brand && p.brand.name).filter(Boolean)).size >= 2) facets.push({ key: 'brand', name: 'Brand' });
  const sorts = SORTS.filter((s) => new Set(members.map(s.get).filter((v) => v != null && v !== '')).size >= 2);
  if (!facets.length && !sorts.length) return '';
  const fid = gridId + '-f';
  const facetHtml = facets.map((f, n) => '<div class="facet" data-facet="' + f.key + '"><button type="button" class="facet__btn" aria-expanded="false" aria-controls="' + fid + '-' + n + '">' + e(ctx, f.name) + icon('caret', 'facet__chev') + '</button>'
    + '<div class="facet__panel" id="' + fid + '-' + n + '" hidden><ul class="facet__list" data-facet-list="' + f.key + '"></ul></div></div>').join('');
  const sortHtml = sorts.length ? '<p class="fbar__sort"><select data-sort aria-label="' + SORT_NAME + '">' + sorts.map((s) => '<option value="' + s.key + ':' + s.dir + '">' + e(ctx, s.label) + '</option>').join('') + '</select></p>' : '';
  return '<div class="fbar" data-fbar data-grid="' + gridId + '">'
    + '<p class="fbar__open-row"><button type="button" class="btn btn--glass btn--sm fbar__open" data-fbar-open aria-haspopup="dialog" aria-expanded="false" aria-controls="' + fid + '-sheet">' + e(ctx, L.filters) + '</button></p>'
    + '<div class="fbar__veil" data-fbar-close hidden></div>'
    + '<div class="fbar__sheet" id="' + fid + '-sheet" data-fbar-sheet aria-label="' + ctx.escAttr(L.filters) + '">'
    + '<div class="fbar__facets">' + facetHtml + sortHtml + '</div>'
    + '<p class="fbar__actions"><button type="button" class="btn btn--ghost btn--sm" data-fbar-clear>' + e(ctx, L.clearAll) + '</button> <button type="button" class="btn btn--ink btn--sm fbar__apply" data-fbar-apply>' + e(ctx, L.apply) + '</button></p>'
    + '</div><ul class="fbar__active" data-fbar-active></ul></div>';
}
/** an evidenced grid (brand pages): filter bar, cards, the empty state (hidden until a filter empties the grid), and the
    hand-off for price and availability */
function memberGrid(ctx, page, members) {
  const gridId = 'pgrid';
  return '<div class="plist" data-plist>' + filterBar(ctx, members, gridId)
    + '<ul class="pgrid" id="' + gridId + '" data-pgrid>' + members.map((p, i) => memberCard(ctx, page, p, i)).join('') + '</ul>'
    + '<p class="pgrid__empty" data-pgrid-empty hidden>' + e(ctx, L.filterEmpty) + '</p>'
    + '<p class="plist__handoff">' + handoff(ctx, page.path) + '</p></div>';
}

/** a Joint grid/rail (`products` block, or a page.catalog entry). Plan B: evidenced members (brand pages) as a grid with
    the filter bar, else a live-menu panel. opts: { tone: 'smoke'|'light'|null } (default: the tone renderShop set) */
export function renderListing(b, ctx, opts = {}) {
  const page = ctx.page;
  const params = b.params || {};
  /* the evidenced grid renders once per page (one id set, one filter bar); any further widget is a live panel */
  const members = page && page.products && b.widget !== 'slider' && GRID_PAGE !== page ? page.products : null;
  const attrs = { 'data-widget': b.widget || '', 'data-params': JSON.stringify(params) };
  if (members && members.length) GRID_PAGE = page;
  if (members && members.length) return '<section' + ctx.attrs({ class: 'listing listing--grid', ...attrs }) + '>' + memberGrid(ctx, page, members) + '</section>';
  return '<section' + ctx.attrs({ class: 'listing', ...attrs }) + '>' + livePanel(ctx, page, { heading: b.label || null, tone: opts.tone !== undefined ? opts.tone : PANEL_TONE }) + '</section>';
}

/* ---------------------------------------------------------------- product page (DESIGN-SPEC 6.14) */
/** chip source per 4.16.7: the catalog's own caption (chip.source), else derived the same way */
const chipSource = (c, title) => (c.source === LABELS.fromName || c.source === LABELS.fromSlug ? c.source : String(title || '').includes(String(c.label)) ? LABELS.fromName : LABELS.fromSlug);
/** the labelled chips of a product (sizes and strain types; abbreviations without a label are not shown), each with
    its own source caption in its own element */
function chipsHtml(ctx, p) {
  const chips = [p.size, p.strainType].filter((c) => c && c.label);
  if (!chips.length) return '';
  return '<ul class="chips">' + chips.map((c) => '<li class="chip-item"><span class="chip">' + e(ctx, c.label) + '</span> <span class="chip-note">(' + e(ctx, chipSource(c, p.title)) + ')</span></li>').join('') + '</ul>';
}
const money = (o) => (String(o.priceCurrency || 'USD') === 'USD' ? '$' : '') + String(o.price);
/** "Reserve for pickup" with its live region and "View bag" (DESIGN-SPEC 6.6): the item travels in data attributes,
    verbatim from the catalog record; shop.js calls CCC.bag.add */
function reserveButton(ctx, p, o, f, { cls = 'btn btn--ink btn--lg pdp__reserve', id } = {}) {
  return '<button' + ctx.attrs({ type: 'button', class: cls, id: id || null, 'data-bag-add': '', 'data-id': f.jointId || p.slug, 'data-name': p.title, 'data-variant': o.name, 'data-price': o.price, 'data-currency': o.priceCurrency || 'USD', 'data-asof': f.asOf, 'data-href': ctx.url(p.path) }) + '>' + icon('bag') + '<span>' + e(ctx, L.reserve) + '</span></button>';
}
/** the product page <main> body: t1 (product.full) gets the full first screen; every other product is a Plan B stub */
export function productBody(page, ctx) {
  const p = page.product;
  if (!p) return '';
  const crumbs = breadcrumbs(page, ctx, { cls: 'pdp__crumbs' });
  const brand = p.brand ? '<p class="pdp__brand"><span data-catalog="brand">' + link(ctx, p.brand.path, e(ctx, p.brand.name)) + '</span>' + (p.brand.match === 'slug-start' ? ' <span class="chip-note">(' + e(ctx, LABELS.fromSlug) + ')</span>' : '') + '</p>' : '';
  const h1 = '<h1 class="h1 pdp__title" data-guard="name">' + e(ctx, p.title) + '</h1>';
  const back = '';   /* calm revision: no sea-glass photo behind product pages */
  if (!p.full) {
    /* Plan B stub: H1, breadcrumb, brand link, labelled chips with their captions, the hand-off. No image, price or offers */
    return '<section class="pdp pdp--stub pdp--calm">' + back + '<div class="wrap pdp__in"><div class="pdp__panel surface">'
      + crumbs + brand + h1 + chipsHtml(ctx, p)
      + '<p class="pdp__handoff">' + handoff(ctx, page.path) + '</p></div></div></section>';
  }
  const f = p.full;
  const o = (f.offers || [])[0] || null;
  const photo = f.imageHash ? '<img' + ctx.attrs({ class: 'lens__img', src: ctx.dutchie(f.imageHash, { w: 250, h: 250 }), srcset: ctx.dutchie(f.imageHash, { w: 250, h: 250 }) + ' 1x, ' + ctx.dutchie(f.imageHash, { w: 250, h: 250, dpr: 2 }) + ' 2x', width: 250, height: 250, alt: p.title, loading: 'eager', decoding: 'async', fetchpriority: 'high' }) + '>' : '';
  const stage = '<div class="pdp__stage"><div class="lens">' + photo + '</div></div>';
  const offer = o ? '<div class="pdp__offer">'
    + '<p class="pdp__price"><span class="pdp__variant" data-guard="variant">' + e(ctx, o.name) + '</span> <span class="pdp__amount" data-guard="price">' + e(ctx, money(o)) + '</span></p>'
    + '<p class="pdp__asof">' + e(ctx, LABELS.asOf) + ' ' + e(ctx, f.asOf) + '</p>'
    + (/InStock$/.test(String(o.availability || '')) ? '<p class="pdp__stock"><i class="dot" aria-hidden="true"></i><span>' + e(ctx, L.inStock) + '</span></p>' : '')
    + '</div>' : '';
  const buy = o ? '<div class="pdp__buy">' + reserveButton(ctx, p, o, f, { id: 'pdp-reserve' })
    + '<button type="button" class="btn btn--ghost btn--sm pdp__view" data-bag-view hidden>' + e(ctx, L.viewBag) + '</button>'
    + '<p class="pdp__note fine">' + e(ctx, L.preview) + '</p>'
    + '<p class="sr" role="status" aria-live="polite" data-bag-live></p></div>' : '';
  const panel = '<div class="pdp__panel surface">'
    + crumbs + brand + h1 + chipsHtml(ctx, p) + offer + buy + '</div>';
  const desc = (f.descriptionLines || []).length ? '<section class="pdp-more"><div class="wrap"><div class="pdp-more__pane card">'
    + '<ul class="pdp__desc">' + f.descriptionLines.map((l) => '<li data-guard="desc">' + e(ctx, l) + '</li>').join('') + '</ul>'
    + '<p class="pdp__handoff">' + handoff(ctx, page.path) + '</p></div></div></section>' : '';
  /* phones: the Reserve bar sticks to the viewport bottom once the pane's button has scrolled past (shop.js) */
  const sticky = o ? '<div class="pdp-sticky glass" data-pdp-sticky hidden><p class="pdp-sticky__price"><span>' + e(ctx, o.name) + '</span> <span class="pdp__amount">' + e(ctx, money(o)) + '</span></p>'
    + reserveButton(ctx, p, o, f, { cls: 'btn btn--ink btn--sm pdp-sticky__btn' }) + '</div>' : '';
  return '<section class="pdp pdp--full">' + back + '<div class="wrap pdp__in">' + stage + panel + '</div></section>' + desc + sticky;
}

/* ---------------------------------------------------------------- page assembly */
/** a posts block whose items are title links only (category pages' subcategory lists) -> pills */
const linkOnlyPosts = (b) => b.t === 'posts' && Array.isArray(b.items) && b.items.length && b.items.every((i) => i && i.title && i.href && !i.image && !i.excerpt && !i.meta && !i.more && !i.blocks) && !b.pagination;
const quietBlock = (b) => b.t === 'divider' && !b.text;
function subPills(ctx, b) {
  return '<ul class="subs">' + b.items.map((i) => '<li>' + link(ctx, i.href, e(ctx, i.title), { class: 'pill' }) + '</li>').join('') + '</ul>';
}
/** the hero (DESIGN-SPEC 6.9). Category pages: the half-bleed photo frame on the right (category slot) with the pane
    overlapping it from the left, and the whole bud (P10) across the frame's bottom edge. Other shop pages: the pane over
    the sea-glass band (H-BAND-1). The pane holds the breadcrumb (where the source shows one), the H1's section and, on
    category pages, the subcategory list that follows it. Returns { html, used: Set(section) } */
function hero(page, ctx) {
  const used = new Set();
  const found = h1Block(page);
  const sections = (page.sections || []).filter((s) => s && !s.hiddenAll && !s.popup);
  /* no H1 block, or an H1 inside a large section (/categories/ promotes its first category heading): no hero; the
     sections render in order under the breadcrumb */
  if (!found || visible(found.s.blocks).length > 6) return { html: '', used };
  let inner = breadcrumbs(page, ctx, { cls: 'shero__crumbs' });
  used.add(found.s);
  inner += renderHeroBlocks(ctx, page, found.s.blocks);
  const next = sections[sections.indexOf(found.s) + 1];
  if (next && (page.kind === 'category' || page.kind === 'subcategory') && visible(next.blocks).length && visible(next.blocks).every((b) => linkOnlyPosts(b) || quietBlock(b))) {
    used.add(next);
    inner += visible(next.blocks).filter(linkOnlyPosts).map((b) => subPills(ctx, b)).join('');
  }
  const catSlot = page.kind === 'category' || page.kind === 'subcategory' ? categorySlot(page) : null;
  const pane = '<div class="shero__pane glass glass--aqua" data-glass="light">' + inner + '</div>';
  if (catSlot) {
    const rec = slot(catSlot) || {};
    const alt = rec.ai ? undefined : '';   /* generated art keeps its declared AI alt; the real photos are decorative here */
    /* the frame does not clip; the photo box inside it does. P10 (the whole bud) sits on the frame, across its bottom
       edge, so it is never clipped (DESIGN-SPEC 5.3) */
    return {
      html: '<section class="shero shero--cat"><div class="shero__frame">'
        + '<div class="shero__photo"><div class="shero__layer" data-parallax="0.08">' + slotImg(ctx, catSlot, { alt, sizes: '(max-width: 700px) 100vw, 52vw', cls: 'shero__img', loading: 'eager', fetchpriority: 'high', frameCls: 'shero__ai' }) + '</div></div>'
        + '</div>'
        + '<div class="wrap shero__in">' + pane + '</div></section>',
      used,
    };
  }
  return {
    html: '<section class="shero shero--band shero--calm">'
      + '<div class="wrap shero__in"><div class="shero__pane surface">' + inner + '</div></div></section>',
    used,
  };
}
/** the sections below the hero, grouped: consecutive copy sections share one light pane over the whale-tail pattern
    band; a section holding a products block becomes a full-bleed smoked band (deep water) with the live-menu panel */
function body(page, ctx, used) {
  const out = [];
  let copy = [];
  const flush = () => {
    if (!copy.length) return;
    out.push('<div class="shop-copy band shop-copy--calm"><div class="wrap band__in"><div class="shop-copy__pane surface">' + copy.join('\n') + '</div></div></div>');
    copy = [];
  };
  for (const s of page.sections || []) {
    if (!s || s.hiddenAll || s.popup || used.has(s)) continue;
    const isListing = visible(s.blocks).some((b) => b.t === 'products');
    if (!isListing) { const h = renderSection(s, ctx, { cls: 'shop-copy__sec', inner: (x) => x }); if (h) copy.push(h); continue; }
    flush();
    out.push(listingBand(ctx, page, () => renderSection(s, ctx, { cls: 'shop-live__sec', inner: (x) => x })));
  }
  flush();
  return out.join('\n');
}
/** a full-bleed band around listing output: smoked deep water for a live panel; the pattern band for an evidenced grid */
function listingBand(ctx, page, render) {
  const grid = !!(page.products && page.products.length);
  if (grid) return '<div class="shop-grid band"><div class="band__pattern" aria-hidden="true"></div><div class="band__pools" aria-hidden="true"><span class="pool pool--a"></span><span class="pool pool--b"></span></div><div class="wrap band__in">' + render() + '</div></div>';
  PANEL_TONE = 'smoke';
  let html;
  try { html = render(); } finally { PANEL_TONE = null; }
  return '<div class="shop-live band shop-live--calm"><div class="wrap band__in">' + html + '</div></div>';
}

/** <main> inner html for a shop kind */
export function renderShop(page, ctx) {
  const popups = (page.sections || []).filter((s) => s && !s.hiddenAll && s.popup).map((s) => renderPopup(s, ctx));
  if (page.kind === 'product' && page.product) {
    /* the product model is the H1 heading (PIPELINE-SITE 5.2); productBody renders the H1 inside the pane. Any other
       visible block of the model renders after it (none today) */
    const rest = (page.sections || []).filter((s) => s && !s.hiddenAll && !s.popup)
      .map((s) => ({ ...s, blocks: visible(s.blocks).filter((b) => !((b.t === 'heading' || b.t === 'event-field') && +b.level === 1)) }))
      .filter((s) => s.blocks.length).map((s) => renderSection(s, ctx)).join('\n');
    return [productBody(page, ctx), rest, ...popups].filter(Boolean).join('\n');
  }
  const parts = [];
  const h = hero(page, ctx);
  if (h.html) parts.push(h.html);
  else parts.push('<div class="wrap page-top">' + breadcrumbs(page, ctx) + '</div>');
  parts.push(body(page, ctx, h.used));
  /* a grid the page has (page.catalog) but no visible products block renders it (brand pages: the grid is built from
     the URL by the theme template, so it is in page.catalog, not in the sections) */
  const hasGrid = (page.sections || []).some((s) => s && !s.hiddenAll && visible(s.blocks).some((b) => b.t === 'products'));
  if (!hasGrid) for (const c of (page.catalog || []).filter((x) => !x.hiddenAll)) parts.push(listingBand(ctx, page, () => renderListing({ widget: c.widget, params: c.params || c.raw || {}, label: c.label || null }, ctx)));
  parts.push(...popups);
  return parts.filter(Boolean).join('\n');
}
