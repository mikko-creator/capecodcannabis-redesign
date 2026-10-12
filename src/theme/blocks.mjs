// src/theme/blocks.mjs - every content-model block renderer (docs/CONTENT-MODEL.md section 5, KNOWN_BLOCKS).
// Owner: T2a (blocks + interior). Skeleton by T0, 2026-10-12: a port of src/theme-stub/index.mjs, which passes the
// parity gate. TEXT BEHAVIOUR IS THE STUB'S, EXACTLY (BUILD-CONTRACT 4.16.9): every model field that carries visible or
// accessible text is rendered; old-platform widget labels are dropped only where declared (4.16.3); platform identifiers
// are never accessible names (4.16.8). Only markup and classes changed. Change requests: tmp/t2a/INBOX.md.
//
// Exports (signatures in src/theme/README.md):
//   renderBlocks(blocks, ctx, opts?) -> html      every visible block (hiddenAll skipped), joined by '\n'
//   renderBlock(block, ctx, opts?)   -> html      one block ('' for a hiddenAll block)
//   renderSection(section, ctx, opts?) -> html    <section class="section ..."> around renderBlocks; '' when hiddenAll
//   renderPopup(section, ctx)        -> html      a popup section (popup: true) as a <dialog data-popup>
//   pageSections(page, ctx, opts?)   -> { html, popups, hasGrid }   the page's sections in order (hiddenAll skipped,
//                                                  popups collected separately)
//   resetIds(), uid(prefix)                        per-page deterministic element ids (reset once per page)
//   isWidgetLabel(label)                           old-platform widget instructions (declared removals)
//   LABELS                                         the theme's declared microcopy used by blocks
//   image(b, ctx, sizes?), stars(ctx, label), link(ctx, href, inner, extra?)   (re-exported from parts.mjs)
import { link, image, stars, icon, LABELS } from './parts.mjs';
import { renderListing } from './shop.mjs';

export { link, image, stars, LABELS };

/** model aria-labels the theme does not render: old-platform widget instructions for widgets the rebuild does not
    have (each declared in removals.json removals[], BUILD-CONTRACT 4.16.3), plus labels of controls it omits (the
    event venue map iframe and the omitted video player's play button, declared) */
const WIDGET_LABEL = [/^Carousel$/, /^Image Carousel$/, /^Slides$/, /^\d+ of \d+$/, /^Previous$/, /^Next$/,
  /^Accordion\. Open links with Enter or Space, close with Escape, and navigate with Arrow Keys$/,
  /^View links to add events to your calendar$/, /^Venue location map$/, /\.(mov|mp4) Play video$/i];
export const isWidgetLabel = (s) => WIDGET_LABEL.some((re) => re.test(String(s)));

let UID = 0;   // per-page counter for element ids (reset by resetIds() at the start of every page: deterministic)
export function resetIds() { UID = 0; }
export const uid = (p) => p + '-' + (++UID);

const e = (ctx, s) => ctx.esc(s);
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const normSp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
/** text of an html fragment, one entry per block-level run (only to tell which `text` lines an `html` already shows) */
function htmlRuns(html) {
  return String(html || '').replace(/<(br|\/p|\/h[1-6]|\/li|\/div|\/tr|\/td|\/th|p|h[1-6]|li|div)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .split('\n').map(normSp).filter(Boolean);
}
const covers = (runs, line) => { const l = normSp(line); return runs.some((r) => (' ' + r + ' ').includes(' ' + l + ' ') || r === l); };
const BLOCKISH = /<(div|p|h[1-6]|ul|ol|li|section|figure|nav|form|details|dialog|table|iframe|fieldset|blockquote|hr)\b/i;
/** screen-reader-only source text (BUILD-CONTRACT 4.18.3; PIPELINE-CONTENT 12.2: srOnly, labelSrOnly, buttonSrOnly,
    srPrefix): the words stay in the page inside .sr (visually hidden) */
export const sr = (inner, on = true) => (on ? '<span class="sr">' + inner + '</span>' : inner);

/** ctx.rich, then every Google Maps iframe it kept becomes a click-to-load facade (BUILD-CONTRACT 4.17.14): the src
    stays verbatim (already attribute-escaped) in data-map-src; site.js sets it on press */
const MAP_IFRAME = /<iframe\b[^>]*?\ssrc=(["'])(https:\/\/www\.google\.com\/maps\/embed\?[^"']*)\1[^>]*>\s*<\/iframe>/gi;
export function rich(ctx, html) {
  return ctx.rich(html || '').replace(MAP_IFRAME, (m, q, src) =>
    '<div class="map-facade" data-map data-map-src="' + src + '" data-map-title="' + LABELS.mapTitle + '"><button type="button" class="btn btn--glass map-facade__btn" data-map-load>' + LABELS.mapLoad + '</button></div>');
}

/* ---------------------------------------------------------------- navs inside content */
function navList(ctx, items, id) {
  if (!items || !items.length) return '';
  return '<ul' + (id ? ' id="' + id + '"' : '') + '>' + items.map((i) => '<li>' + link(ctx, i.href, e(ctx, i.label), { target: i.target || null, title: i.title || null }) + (i.children && i.children.length ? navList(ctx, i.children) : '') + '</li>').join('') + '</ul>';
}
/** a nav with its menu toggle (the source's toggle label, verbatim; the button shows a CSS glyph, no text) */
export function toggledNav(ctx, cls, navLabel, toggleLabel, items) {
  const id = uid('nav');
  return '<nav class="' + cls + '"' + (navLabel ? ' aria-label="' + ctx.escAttr(navLabel) + '"' : '') + '>'
    + (toggleLabel ? '<button type="button" class="nav-toggle" aria-label="' + ctx.escAttr(toggleLabel) + '" aria-expanded="true" aria-controls="' + id + '"></button>' : '')
    + navList(ctx, items, id) + '</nav>';
}

/* ---------------------------------------------------------------- blocks */
/* blocks hidden at every breakpoint (hiddenAll) stay in the model and are not rendered (BUILD-CONTRACT 4.5) */
/* the network glyph for an icon-only social link, by its (screen-reader) label; anything else keeps the link glyph */
const socialIcon = (label) => ({ facebook: 'facebook', instagram: 'instagram', linkedin: 'linkedin', twitter: 'twitter', x: 'twitter' })[String(label || '').trim().toLowerCase()] || 'link';
export function renderBlocks(list, ctx, opts = {}) {
  return dropPlaceholderGrids((list || []).filter((b) => b && !b.hiddenAll)).map((b) => renderBlock(b, ctx, opts)).filter(Boolean).join('\n');
}
/* An empty posts grid of the source (no items captured) renders nothing, together with a heading or button just before
   it that links to "#". On /categories/ the live site's unfinished "Category" / "View All" grids link nowhere and show
   only at its widescreen and mobile_extra breakpoints (declared removal categories-placeholder-posts-grid in
   src/content/removals.json; orchestrator, 2026-10-13). A grid with items, and any other "#" link, is untouched. */
function dropPlaceholderGrids(list) {
  const drop = new Set();
  list.forEach((b, i) => {
    if (b.t !== 'posts' || (b.items || []).length) return;
    for (let k = i - 1; k >= Math.max(0, i - 2); k--) {
      const p = list[k];
      if ((p.t === 'heading' || p.t === 'button') && String(p.href || '') === '#') { drop.add(p); drop.add(b); }
    }
  });
  return drop.size ? list.filter((b) => !drop.has(b)) : list;
}
/** one block; srOnly source text (BUILD-CONTRACT 4.18.3: *-visual-hide, screen-reader-text, ...) renders visually
    hidden inside a .sr wrapper (span for inline output, div when the output holds block-level markup) */
export function renderBlock(b, ctx, opts = {}) {
  if (!b || b.hiddenAll) return '';
  const html = block(b, ctx, opts);
  /* heading and rich carry srOnly inside their own markup (PIPELINE-CONTENT 12.2); any other type is wrapped */
  if (!html || !b.srOnly || b.t === 'heading' || b.t === 'rich') return html;
  return BLOCKISH.test(html) ? '<div class="sr">' + html + '</div>' : '<span class="sr">' + html + '</span>';
}
function block(b, ctx, opts) {
  switch (b.t) {
    case 'heading': {
      const inner = sr(b.href ? link(ctx, b.href, e(ctx, b.text)) : e(ctx, b.text), !!b.srOnly);
      if (!b.level && b.as) { const tag = /^(p|div|span)$/.test(b.as) ? b.as : 'p'; return '<' + tag + ' class="heading-as">' + inner + '</' + tag + '>'; }
      const lv = Math.min(6, Math.max(1, +b.level || 2));
      return '<h' + lv + (lv === 1 ? ' class="h1"' : '') + '>' + inner + '</h' + lv + '>';
    }
    case 'rich': return '<div class="rich' + (b.kind === 'table' ? ' rich--table' : '') + '">' + sr(rich(ctx, b.html), !!b.srOnly) + '</div>';
    case 'sitemap': return b.groups ? '<div class="sitemap">' + b.groups.map((g) => { const lv = Math.min(6, Math.max(2, +g.level || 2)); return (g.heading ? '<h' + lv + '>' + e(ctx, g.heading) + '</h' + lv + '>' : '') + '<ul>' + (g.links || []).map((l) => '<li>' + link(ctx, l.href, e(ctx, l.label)) + '</li>').join('') + '</ul>'; }).join('') + '</div>' : '<div class="rich">' + rich(ctx, b.html) + '</div>';
    case 'image': {
      const img = image(b, ctx, opts.imgSizes);
      if (!img) return '';
      const rating = (b.ariaLabels || []).filter((l) => !isWidgetLabel(l)).map((l) => stars(ctx, l)).join('');
      return '<figure class="media">' + (b.href ? link(ctx, b.href, img, { target: b.target || null }) : img) + rating + (b.caption ? '<figcaption>' + e(ctx, b.caption) + '</figcaption>' : '') + '</figure>';
    }
    case 'button': if (!b.label) return ''; return '<p class="btn-row">' + (b.href ? link(ctx, b.href, e(ctx, b.label), { class: 'btn btn--ink', target: b.target || null, id: b.id || null }) : '<span class="btn btn--ink">' + e(ctx, b.label) + '</span>') + '</p>';
    case 'faq': return faq(b, ctx);
    /* slides are a rail (site.js wires [data-rail]: one card per press, arrow keys, never on its own, R-47). The old
       slider's labels ("Carousel", "N of M", "Previous"/"Next") are declared removals; the rail's own "Previous" /
       "Next" button names are declared (theme-interior.json interior-rail-controls). Without JS the track still scrolls
       and the buttons are hidden (CSS). */
    case 'carousel': {
      const slides = (b.slides || []).map((s) => '<li class="slide">' + renderBlocks(s.blocks, ctx) + '</li>').filter((x) => x !== '<li class="slide"></li>');
      if (!slides.length) return '';
      const rail = slides.length > 1;
      return '<div class="slides' + (rail ? ' slides--rail' : '') + '"' + (rail ? ' data-rail' : '') + '><ul class="slides__track"' + (rail ? ' data-rail-track tabindex="0"' : '') + '>' + slides.join('') + '</ul>'
        + (rail ? '<p class="slides__nav"><button type="button" class="rail-btn" data-rail-prev aria-label="Previous">' + icon('arrow', 'ico--flip') + '</button> <button type="button" class="rail-btn" data-rail-next aria-label="Next">' + icon('arrow') + '</button></p>' : '') + '</div>';
    }
    case 'gallery': return '<ul class="gallery">' + (b.items || []).map((i) => {
      const img = i.image ? image(i.image, ctx, '(max-width: 600px) 50vw, 300px') : '';
      const txt = (i.title ? '<span class="gallery__title">' + e(ctx, i.title) + '</span>' : '') + (i.caption ? '<span class="gallery__caption">' + e(ctx, i.caption) + '</span>' : '');
      const href = i.href || (i.image && i.image.href) || null;
      if (!img && !txt) return '';
      return '<li>' + (href ? link(ctx, href, img + txt, { target: (i.image && i.image.target) || null }) : img + txt) + '</li>';
    }).join('') + '</ul>';
    case 'posts': return posts(b, ctx, opts);
    case 'cta': {
      const img = b.image ? (typeof b.image === 'string' ? ctx.img(b.image, { alt: '', sizes: '100vw' }) : image(b.image, ctx, '(max-width: 900px) 100vw, 600px')) : '';
      const inner = (b.ribbon ? '<p class="cta__ribbon">' + e(ctx, b.ribbon) + '</p>' : '') + img + (b.title ? '<p class="cta__title">' + e(ctx, b.title) + '</p>' : '') + (b.text ? '<p class="cta__text">' + e(ctx, b.text) + '</p>' : '');
      if (b.button) return '<section class="cta card">' + inner + '<p>' + (b.href ? link(ctx, b.href, e(ctx, b.button), { class: 'btn btn--ink' }) : '<span class="btn btn--ink">' + e(ctx, b.button) + '</span>') + '</p></section>';
      return '<section class="cta card">' + (b.href ? link(ctx, b.href, inner, { class: 'cta__link' }) : inner) + '</section>';
    }
    case 'products': return renderListing(b, ctx);
    case 'reviews': return reviews(b, ctx);
    case 'hours': return '<ul class="hours-list">' + (b.rows || []).map((r) => '<li><span class="day">' + e(ctx, r.day) + '</span> <span class="time">' + e(ctx, r.time) + '</span></li>').join('') + '</ul>';
    case 'embed': return embed(b, ctx);
    case 'html': return htmlBlock(b, ctx);
    case 'form': return form(b, ctx);
    case 'hotspot': return '<div class="hotspot">' + (b.image ? '<figure class="media">' + image(b.image, ctx) + '</figure>' : '') + '<ul>' + (b.items || []).map((i) => '<li><details><summary>' + (i.href ? link(ctx, i.href, e(ctx, i.label || i.text || '')) : e(ctx, i.label || i.text || '')) + '</summary>' + (i.tipHtml ? '<div class="tip">' + rich(ctx, i.tipHtml) + '</div>' : i.tooltip ? '<div class="tip"><p>' + e(ctx, i.tooltip) + '</p></div>' : '') + '</details></li>').join('') + '</ul></div>';
    case 'timeline': return '<ol class="timeline">' + (b.items || []).filter((i) => i && (normSp(i.text) || normSp(i.meta) || i.image)).map((i) => '<li>'
      + (i.meta && !normSp(i.text).includes(normSp(i.meta)) ? '<p class="meta">' + e(ctx, i.meta) + '</p>' : '')
      + (i.image ? '<figure class="media">' + image(i.image, ctx, '(max-width: 900px) 100vw, 765px') + '</figure>' : '')
      + lines(i.text).map((l) => '<p>' + e(ctx, l) + '</p>').join('') + '</li>').join('') + '</ol>';
    case 'meta': return '<ul class="meta">' + (b.items || []).map((i) => { const t = typeof i === 'string' ? i : i.text || i.label || ''; return '<li>' + (i && i.href ? link(ctx, i.href, e(ctx, t)) : e(ctx, t)) + '</li>'; }).join('') + '</ul>';
    case 'postnav': return postnav(b, ctx);
    case 'comments': return b.text ? '<section class="comments"><p>' + e(ctx, b.text) + '</p></section>' : '';
    case 'event-field': return eventField(b, ctx);
    case 'anchor': return b.id ? '<span id="' + ctx.escAttr(b.id) + '"></span>' : '';
    case 'icon': return b.href && b.label ? '<p class="icon-link">' + link(ctx, b.href, e(ctx, b.label)) + '</p>' : '';
    case 'divider': return b.text ? '<p class="divider">' + e(ctx, b.text) + '</p>' : '<hr>';
    case 'nav': {
      const labs = (b.ariaLabels || []).filter((l) => !isWidgetLabel(l));
      const toggle = b.toggleLabel || (labs.includes('Menu Toggle') ? 'Menu Toggle' : null);
      return toggledNav(ctx, 'block-nav', labs.find((l) => l !== toggle) || null, toggle, b.items);
    }
    /* the label is the input's accessible name; a button whose source text was screen-reader-only (buttonSrOnly) keeps
       it inside .sr beside a search icon */
    case 'search': return '<form class="search-form" role="search" method="get" action="' + ctx.url(b.action || '/') + '"><input type="search" name="' + ctx.escAttr(b.field || 's') + '"' + (b.placeholder ? ' placeholder="' + ctx.escAttr(b.placeholder) + '"' : '') + (b.label ? ' aria-label="' + ctx.escAttr(b.label) + '"' : '') + '>' + (b.button ? '<button type="submit" class="btn btn--ink">' + (b.buttonSrOnly ? icon('search') : '') + sr(e(ctx, b.button), !!b.buttonSrOnly) + '</button>' : '') + '</form>';
    /* an item whose label is screen-reader-only in the source (srOnly) is an icon link: the label in .sr, a glyph shown */
    case 'social': return '<ul class="social">' + (b.items || []).map((i) => '<li>' + link(ctx, i.href, i.srOnly ? sr(e(ctx, i.label || '')) + icon(socialIcon(i.label)) : e(ctx, i.label || ''), { target: i.target || null, class: i.srOnly ? 'social__icon' : null }) + '</li>').join('') + '</ul>';
    case 'chrome-ref': case 'excluded': return '';
    case 'app': return '<div class="app" data-app="' + ctx.escAttr(b.what || '') + '"></div>';
    default: throw new Error('theme: unknown block type ' + b.t);
  }
}
/** FAQ accordion (DESIGN-SPEC 6.18): each item is a <button aria-expanded aria-controls> plus its panel. The model
    gives no heading level for the questions (the source accordion titles are not headings), so none is invented. The
    old widget's keyboard instructions are declared removals (BUILD-CONTRACT 4.16.3). features.js toggles; under
    html.js closed panels collapse (grid rows 0fr -> 1fr, no height jump); without JS every panel shows. */
function faq(b, ctx) {
  return '<div class="faq" data-faq>' + (b.items || []).map((i) => {
    const id = uid('faq');
    const open = !!i.open;
    return '<div class="faq__item' + (open ? ' is-open' : '') + '"><p class="faq__q"><button type="button" class="faq__btn" id="' + id + '-b" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + id + '-p"><span class="faq__t">' + e(ctx, i.q) + '</span><span class="faq__ico" aria-hidden="true"></span></button></p>'
      + '<div class="faq__panel" id="' + id + '-p"><div class="faq__a">' + (i.blocks ? renderBlocks(i.blocks, ctx) : rich(ctx, i.a_html || i.a || '')) + '</div></div></div>';
  }).join('') + '</div>';
}
/** posts: listing cards (DESIGN-SPEC 6.19: the post's real image 16:9, the date/meta, the verbatim title, the verbatim
    excerpt clamped by CSS with nothing appended, then the "more" link with its verbatim "Read more about <title>" label),
    block-list cards (the home offer cards), and pagination {text, links} as a token line.
    opts.postCard: extra class for the cards (templates pass 'glass' where the cards sit on a photo band) */
function posts(b, ctx, opts = {}) {
  const labels = b.ariaLabels || [];
  const used = new Set();
  const cardCls = ['post-card', opts.postCard || 'card'].join(' ');
  const items = (b.items || []).map((i) => {
    if (Array.isArray(i.blocks)) return '<li class="card">' + renderBlocks(i.blocks, ctx) + '</li>';
    const img = i.image && (i.image.ref || i.image.src || i.image.srcUrl) ? '<div class="post-card__media">' + image(i.image, ctx, '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 400px') + '</div>' : '';
    const title = i.title ? '<h3 class="post-card__title">' + (i.href ? link(ctx, i.href, e(ctx, i.title)) : e(ctx, i.title)) + '</h3>' : '';
    const meta = i.meta ? '<p class="meta post-card__meta">' + e(ctx, [].concat(i.meta).join(' ')) + '</p>' : '';
    const ex = i.excerpt ? '<p class="excerpt">' + e(ctx, i.excerpt) + '</p>' : '';
    const rm = i.title && labels.includes('Read more about ' + i.title) ? 'Read more about ' + i.title : null;
    if (rm) used.add(rm);
    const more = i.more ? '<p class="more">' + (i.href ? link(ctx, i.href, e(ctx, i.more), { 'aria-label': rm }) : e(ctx, i.more)) + '</p>' : '';
    return '<li class="' + cardCls + (img ? '' : ' post-card--noimg') + '"' + (opts.postCard === 'glass' ? ' data-glass="light"' : '') + '>' + img + '<div class="post-card__body">' + meta + title + ex + more + '</div></li>';
  }).join('');
  let pag = '';
  const pg = b.pagination;
  if (typeof pg === 'string' && pg.trim()) pag = '<p class="pagination">' + e(ctx, pg) + '</p>';
  else if (pg && typeof pg === 'object') {
    /* the source line ("Page1 Page2 ...") with each linked page as its link; the current page is plain text. The
       pagination nav's own label is the block's remaining aria-label ("Pagination"), verbatim */
    const byLabel = new Map((pg.links || []).map((l) => [normSp(l.label), l.href]));
    const toks = normSp(pg.text).split(' ').filter(Boolean);
    /* srPrefix: the source's screen-reader-only word before each page number ("Page") */
    const pre = pg.srPrefix ? String(pg.srPrefix) : null;
    const tok = (t) => (pre && t.startsWith(pre) && t.length > pre.length ? sr(e(ctx, pre)) + e(ctx, t.slice(pre.length)) : e(ctx, t));
    const parts = toks.map((t) => (byLabel.has(t) ? link(ctx, byLabel.get(t), tok(t)) : '<span>' + tok(t) + '</span>'));
    for (const l of pg.links || []) if (!toks.includes(normSp(l.label))) parts.push(link(ctx, l.href, tok(normSp(l.label))));
    const rest = labels.filter((l) => !used.has(l) && !isWidgetLabel(l));
    pag = '<nav class="pagination"' + (rest.length === 1 ? ' aria-label="' + ctx.escAttr(rest[0]) + '"' : '') + '>' + parts.join(' ') + '</nav>';
  }
  return '<ul class="posts">' + items + '</ul>' + pag;
}
/** reviews (BUILD-CONTRACT 4.7, 4.16.6): name, date and rating as separate elements, no separator text; the rating
    graphic carries the verbatim label; avatars are not mirrored or hotlinked; the capture date is shown */
/** reviewer initials for the 40px sky circle (DESIGN-SPEC 6.15): first letter of the first and last word of the
    verbatim name. Painted by CSS from data-initials (aria-hidden; the name follows as text), so no text is added. */
function initials(name) {
  const w = normSp(name).split(' ').map((x) => x.replace(/^[^\p{L}\p{N}]+/u, '')).filter(Boolean);
  if (!w.length) return '';
  const f = (s) => Array.from(s)[0].toLocaleUpperCase('en-US');
  return w.length > 1 ? f(w[0]) + f(w[w.length - 1]) : f(w[0]);
}
function reviews(b, ctx) {
  const asOf = '<p class="snapshot fine">' + LABELS.asOf + ' ' + e(ctx, ctx.snapshotDate) + '</p>';
  if (b.kind === 'list') {
    return '<div class="reviews"><ul class="reviews__list">' + (b.items || []).map((i) => '<li class="review">'
      + (i.author ? '<span class="review__avatar" aria-hidden="true" data-initials="' + ctx.escAttr(initials(i.author)) + '"></span>' : '')
      + '<div class="review__who">'
      + (i.author ? '<p class="review__author">' + e(ctx, i.author) + '</p>' : '')
      + (i.time ? '<p class="review__time">' + e(ctx, i.time) + '</p>' : '')
      + (i.rating || i.ratingLabel ? '<p class="review__rating">' + (i.ratingLabel ? stars(ctx, i.ratingLabel) : '') + (i.rating ? '<span class="value">' + e(ctx, i.rating) + '</span>' : '') + '</p>' : '')
      + '</div><div class="review__body" data-clamp>' + lines(i.text).map((l) => '<p class="review__text">' + e(ctx, l) + '</p>').join('') + '</div>'
      + '</li>').join('') + '</ul>' + asOf + '</div>';
  }
  const logo = b.logo ? image(b.logo, ctx, '120px') : '';
  const rating = (b.ariaLabels || []).filter((l) => !isWidgetLabel(l)).map((l) => stars(ctx, l)).join('');
  const txt = b.rating || b.count ? (b.rating ? '<span class="value">' + e(ctx, b.rating) + '</span>' : '') + (b.rating && b.count ? ' ' : '') + (b.count ? '<span class="count">' + e(ctx, b.count) + '</span>' : '') : e(ctx, b.text || '');
  return '<div class="reviews-badge">' + logo + '<p class="review__rating">' + rating + txt + '</p>' + asOf + '</div>';
}
function postnav(b, ctx) {
  const lab = (b.ariaLabels || []).find((l) => !isWidgetLabel(l));
  /* the parts in the model's key order, which is the source order: prev = [srLabel][title], next = [title][srLabel] */
  const one = (k) => {
    const x = b[k];
    if (!x || !x.href) return '';
    const parts = [];
    for (const key of Object.keys(x)) {
      if (key === 'srLabel' && x.srLabel) parts.push('<span class="sr">' + e(ctx, x.srLabel) + '</span>');
      else if ((key === 'title' || key === 'label') && x[key]) parts.push('<span class="postnav__' + key + '">' + e(ctx, x[key]) + '</span>');
    }
    return link(ctx, x.href, parts.join(' '), { rel: k });
  };
  return '<nav class="postnav"' + (lab ? ' aria-label="' + ctx.escAttr(lab) + '"' : '') + '>' + one('prev') + ' ' + one('next') + '</nav>';
}
function eventField(b, ctx) {
  /* the field text, with each link's label turned into its link (first occurrence); a level makes it a heading */
  let inner = e(ctx, b.text || '');
  /* longest labels first, through placeholders, so "dispos" never lands inside "2g dispos" or inside an href */
  const subs = [];
  for (const l of [...(b.links || [])].sort((x, y) => String(y.label || '').length - String(x.label || '').length)) {
    const lab = e(ctx, l.label || '');
    if (!lab || !inner.includes(lab)) continue;
    inner = inner.replace(lab, '\u0000' + subs.length + '\u0000');
    subs.push(link(ctx, l.href, lab));
  }
  inner = inner.replace(/\n/g, '<br>').replace(/\u0000(\d+)\u0000/g, (m, i) => subs[+i]);
  const f = ctx.escAttr(b.field || '');
  if (b.level) { const lv = Math.min(6, Math.max(1, +b.level)); return '<h' + lv + ' class="event-field' + (lv === 1 ? ' h1' : '') + '" data-field="' + f + '">' + inner + '</h' + lv + '>'; }
  const lab = (b.ariaLabels || []).find((l) => !isWidgetLabel(l));
  if (lab) return '<nav class="event-field" data-field="' + f + '" aria-label="' + ctx.escAttr(lab) + '"><p>' + inner + '</p></nav>';
  return '<p class="event-field" data-field="' + f + '">' + inner + '</p>';
}
/** an embed. Google Maps iframes are click-to-load facades (BUILD-CONTRACT 4.17.14): the iframe src stays verbatim in
    data-src and is set only on press ("Load Google map", declared); the loaded iframe gets the declared title
    "Google map". Other iframes render as before (the source iframes carry no title; none is invented). */
export function embed(b, ctx) {
  const src = b.src || '';
  if (!/^https?:\/\//.test(src) || /capecodcannabis\.com/i.test(src)) return '<div class="embed-missing" data-kind="' + ctx.escAttr(b.kind || '') + '"></div>';
  if (/^https:\/\/www\.google\.com\/maps\/embed\?/.test(src)) {
    return '<div class="map-facade" data-map' + ctx.attrs({ 'data-map-src': src, 'data-map-title': LABELS.mapTitle, 'data-w': b.w || null, 'data-h': b.h || null }) + '>'
      + '<button type="button" class="btn btn--glass map-facade__btn" data-map-load>' + LABELS.mapLoad + '</button></div>';
  }
  return '<iframe' + ctx.attrs({ src, title: b.title || null, width: b.w || null, height: b.h || null, loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade', allowfullscreen: true }) + '></iframe>';
}
/** html (custom code): the sanitized markup, then every `text` line it does not already show, one element per line, with
    the model's form controls placed at their label lines (a line ending in ":" labels the next input or select; a
    button sits at the line of its label; a select at the line of its first option). Inert: nothing is wired. */
/* the purchase-limit calculator (/daily-purchase-limit-in-ma/; BUILD-CONTRACT 4.18.5): the source is a
   "popup-trigger" div "Open Calculator" and a popup container whose close button reads "X", then the h5/h6 and the
   labelled controls. The model html starts with that "Open Calculator X" run. */
const CALC_HEAD = /^\s*Open Calculator\s+X\s*(?=<)/;
/* a paragraph made only of in-page links with 1-3 character labels (the A-Z index of /cannabis-glossary-101/) */
const JUMPBAR = /^\s*<p>(?:\s*<a href="#[^"]+">[^<]{1,3}<\/a>\s*(?:<br>\s*)*){5,}<\/p>\s*$/i;
function htmlBlock(b, ctx) {
  const calc = !!(b.html && CALC_HEAD.test(b.html) && (b.controls || []).length);
  const html = calc ? b.html.replace(CALC_HEAD, '') : b.html;
  let out = html ? rich(ctx, html) : '';
  const runs = htmlRuns(b.html);
  const ctlQueue = (b.controls || []).filter((c) => !(c.tag === 'button' && c.label && covers(runs, c.label)));
  const placed = new Set();
  const inputs = ctlQueue.filter((c) => c.tag === 'input' || c.tag === 'select' || c.tag === 'textarea');
  /* the calculator's controls are live (features.js ports the source's own calculation); every other html block's
     controls stay inert (nothing is wired) */
  const off = !calc;
  const ctl = (c, id) => {
    placed.add(c);
    if (c.tag === 'button') return '<button type="button"' + (calc ? ' class="btn btn--ink btn--sm" data-calc="' + ctx.escAttr(normSp(c.label).toLowerCase()) + '"' : ' disabled') + '>' + e(ctx, c.label || '') + '</button>';
    if (c.tag === 'select') return '<select' + ctx.attrs({ id, name: c.name || null, disabled: off }) + '>' + (c.options || []).map((o) => '<option' + (calc && o.value != null ? ' value="' + ctx.escAttr(o.value) + '"' : '') + '>' + e(ctx, o.label || '') + '</option>').join('') + '</select>';
    if (c.tag === 'textarea') return '<textarea' + ctx.attrs({ id, name: c.name || null, placeholder: c.placeholder || null, disabled: off }) + '></textarea>';
    return '<input' + ctx.attrs({ id, type: c.type || 'text', name: c.name || null, placeholder: c.placeholder || null, min: calc && c.type === 'number' ? '0' : null, step: calc && c.type === 'number' ? 'any' : null, inputmode: calc && c.type === 'number' ? 'decimal' : null, disabled: off }) + '>';
  };
  const ls = lines(b.text).filter((l) => !covers(runs, l));
  let pendingLabel = null;
  const optionLines = new Set();
  for (const c of ctlQueue) if (c.tag === 'select') for (const o of (c.options || []).slice(1)) optionLines.add(normSp(o.label));
  const flushLabel = () => { if (pendingLabel) { out += '<p class="line">' + e(ctx, pendingLabel) + '</p>'; pendingLabel = null; } };
  for (const l of ls) {
    const n = normSp(l);
    const btn = ctlQueue.find((c) => c.tag === 'button' && !placed.has(c) && normSp(c.label) === n);
    if (btn) { flushLabel(); out += '<p class="line">' + ctl(btn) + '</p>'; continue; }
    const sel = ctlQueue.find((c) => c.tag === 'select' && !placed.has(c) && c.options && c.options[0] && normSp(c.options[0].label) === n);
    if (sel) { const id = uid('ctl'); out += '<p class="line">' + (pendingLabel ? '<label for="' + id + '">' + e(ctx, pendingLabel) + '</label> ' : '') + ctl(sel, id) + '</p>'; pendingLabel = null; continue; }
    if (optionLines.has(n)) continue;   /* shown as an option of its select */
    const next = inputs.find((x) => !placed.has(x));
    if (/:$/.test(n) && next) {
      flushLabel();
      if (next.tag === 'select') { pendingLabel = l; continue; }   /* placed at its first option's line */
      const id = uid('ctl');
      out += '<p class="line"><label for="' + id + '">' + e(ctx, l) + '</label> ' + ctl(next, id) + '</p>';
      continue;
    }
    flushLabel();
    out += '<p class="line">' + e(ctx, l) + '</p>';
  }
  flushLabel();
  const left = ctlQueue.filter((c) => !placed.has(c));
  if (left.length) out += '<p class="line">' + left.map((c) => ctl(c, uid('ctl'))).join(' ') + '</p>';
  if (b.embed && b.embed.src) out += embed({ kind: b.embed.kind || 'iframe', src: b.embed.src, title: b.embed.title, w: b.embed.w, h: b.embed.h }, ctx);
  if (calc) {
    /* a real dialog: "Open Calculator" is its button; the source's "X" is the dialog's close button (accessible name
       "Close", declared in theme-interior.json); the result lines are filled by features.js with the source script's
       own messages. The h5 names the dialog. */
    const id = uid('calc');
    const dlg = out.replace(/<h5>/, '<h5 id="' + id + '-h">');
    return '<div class="html-block calc-block"><p class="calc-open"><button type="button" class="btn btn--ink" data-calc-open aria-haspopup="dialog" aria-controls="' + id + '">Open Calculator</button></p>'
      + '<dialog class="calc" id="' + id + '" data-calc-dialog aria-labelledby="' + id + '-h"><div class="calc__in">'
      + '<p class="calc__x"><button type="button" class="calc__close" data-calc-close aria-label="Close"><span aria-hidden="true">X</span></button></p>'
      + dlg + '<div class="calc__out" aria-live="polite"><p class="calc__msg calc__msg--error" data-calc-out="error"></p><p class="calc__msg" data-calc-out="total"></p><p class="calc__msg" data-calc-out="remaining"></p></div>'
      + '</div></dialog></div>';
  }
  /* the A-Z jump bar becomes a sticky chip bar on phones (DESIGN-SPEC 6.24; CSS .jumpbar); its html is unchanged */
  if (JUMPBAR.test(b.html || '')) return '<div class="html-block jumpbar">' + out + '</div>';
  return '<div class="html-block">' + out + '</div>';
}
/** forms render unwired (BUILD-CONTRACT 4.6): method=post, disabled, data-sr-unwired. Field names are neutral (derived
    from the visible label; never the platform's field name) and the form's accessible name is used only when the
    source had it as one (4.16.8). Every label, option label, placeholder, aria-label and intro line is verbatim. */
function form(b, ctx) {
  const slug = (s, i) => normSp(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 4).join('-') || 'field-' + (i + 1);
  const named = (b.ariaLabels || []).includes(b.name) ? b.name : null;
  const fields = (b.fields || []).filter((f) => !(f.tag === 'button' && (!f.label || f.label === b.submit)));
  const shown = [...(b.intro || []), ...fields.flatMap((f) => [f.label, ...(f.options || []).map((o) => o.label)]), b.submit].filter(Boolean).map(normSp);
  const intro = (b.intro || []).map((p) => '<p class="form__intro">' + e(ctx, p) + '</p>').join('')
    + lines(b.text).filter((l) => !shown.includes(normSp(l)) && !shown.some((s) => s.includes(normSp(l)))).map((l) => '<p class="form__intro">' + e(ctx, l) + '</p>').join('');
  const used = new Set();
  const nm = (f, i) => { let n = slug(f.label || f.placeholder, i); while (used.has(n)) n += '-' + (i + 1); used.add(n); return n; };
  const body = fields.map((f, i) => {
    const id = uid('field');
    const name = nm(f, i);
    const common = { id, name, placeholder: f.placeholder || null, required: !!f.required, 'aria-label': f.ariaLabel || null };
    if (f.tag === 'button') return '<p class="form__row"><button type="button" class="btn btn--ghost">' + e(ctx, f.label) + '</button></p>';
    if ((f.type === 'checkbox' || f.type === 'radio') && Array.isArray(f.options) && f.options.length) {
      return '<fieldset class="form__choice"><legend>' + e(ctx, f.label || '') + '</legend>' + f.options.map((o, k) => { const oid = id + '-' + (k + 1); return '<p><input' + ctx.attrs({ id: oid, type: f.type, name, value: o.value ?? o.label, required: !!f.required }) + '> <label for="' + oid + '">' + e(ctx, o.label || '') + '</label></p>'; }).join('') + '</fieldset>';
    }
    /* labels are always visible above the field (DESIGN-SPEC 6.21): a label that is screen-reader-only in the source
       (labelSrOnly) shows the same words visibly, which BUILD-CONTRACT 4.18.3 allows for form labels */
    const lab = f.label ? '<label for="' + id + '"' + (f.labelSrOnly ? ' data-sr-source="1"' : '') + '>' + e(ctx, f.label) + '</label> ' : '';
    if (f.tag === 'textarea') return '<p class="form__row">' + lab + '<textarea' + ctx.attrs(common) + '></textarea></p>';
    if (f.tag === 'select') return '<p class="form__row">' + lab + '<select' + ctx.attrs({ id, name, required: !!f.required, 'aria-label': f.ariaLabel || null }) + '>' + (f.options || []).map((o) => '<option>' + e(ctx, o.label || '') + '</option>').join('') + '</select></p>';
    return '<p class="form__row">' + lab + '<input' + ctx.attrs({ ...common, type: f.type || 'text' }) + '></p>';
  }).join('');
  return '<form class="form" method="post" data-sr-unwired="1"' + (named ? ' aria-label="' + ctx.escAttr(named) + '"' : '') + '><fieldset disabled>' + intro + body
    + (b.submit ? '<p class="form__row"><button type="submit" class="btn btn--ink">' + e(ctx, b.submit) + '</button></p>' : '') + '</fieldset></form>';
}

/* ---------------------------------------------------------------- sections */
/** one content section; hiddenAll -> '' (BUILD-CONTRACT 4.5). opts: { cls, attrs, inner(html) -> html } */
export function renderSection(s, ctx, opts = {}) {
  if (!s || s.hiddenAll) return '';
  const body = renderBlocks(s.blocks, ctx, opts);
  const inner = typeof opts.inner === 'function' ? opts.inner(body) : '<div class="wrap">' + body + '</div>';
  return '<section' + ctx.attrs({ class: ['section', opts.cls].filter(Boolean).join(' '), id: s.cssId ? String(s.cssId) : null, 'data-id': s.id ? String(s.id) : null, ...(opts.attrs || {}) }) + '>' + inner + '</section>';
}
/** an Elementor popup section (popup: true; /about-cape-cod-cannabis/ #236015) as a dialog. The source trigger
    (data-elementor-settings of the popup doc): page load after 1 s, at most 2 times per session; site.js reproduces
    it, after the age gate is answered. With JS off the dialog stays closed, as the source popup never opens without JS. */
export function renderPopup(s, ctx) {
  const firstHeading = (s.blocks || []).find((b) => b && !b.hiddenAll && b.t === 'heading');
  const firstImage = (s.blocks || []).find((b) => b && !b.hiddenAll && b.t === 'image' && b.alt);
  const name = firstHeading ? firstHeading.text : firstImage ? firstImage.alt : null;
  return '<dialog class="popup glass"' + ctx.attrs({ id: 'popup-' + (s.id || uid('p')), 'data-popup': String(s.doc || s.id || ''), 'data-dialog': 'popup', 'data-trigger': 'page-load', 'data-delay': '1000', 'data-times': '2', 'data-period': 'session', 'aria-label': name }) + '>'
    + renderBlocks(s.blocks, ctx) + '<p class="popup__close"><button type="button" class="btn btn--ghost btn--sm" data-close>' + LABELS.close + '</button></p></dialog>';
}
/** the page's sections in model order: hiddenAll skipped, popups collected separately. opts.section(s, i) may return
    { cls, attrs, inner } for renderSection. hasGrid: a visible products block exists (the shop templates use it). */
export function pageSections(page, ctx, opts = {}) {
  const out = [];
  const popups = [];
  let i = 0;
  for (const s of page.sections || []) {
    if (!s || s.hiddenAll) continue;
    if (s.popup) { popups.push(renderPopup(s, ctx)); continue; }
    out.push(renderSection(s, ctx, typeof opts.section === 'function' ? opts.section(s, i) || {} : {}));
    i++;
  }
  const hasGrid = (page.sections || []).some((s) => s && !s.hiddenAll && (s.blocks || []).some((b) => b && b.t === 'products' && !b.hiddenAll));
  return { html: out.filter(Boolean).join('\n'), popups, hasGrid };
}
