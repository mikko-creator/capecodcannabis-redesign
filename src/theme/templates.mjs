// src/theme/templates.mjs - every page kind that is neither home nor shop (standard-page, blog-*, legal, utility,
// checkout, account-loyalty-shell, taxonomy-*, terpene, cannabinoid, effect, strain, event, events-calendar,
// town-landing-*, stores-index, store, ...) and the 404 page.
// Owner: T2a (blocks + interior). Skeleton by T0; interior templates by T2a, 2026-10-12. Change requests: tmp/t2a/INBOX.md.
//
// Exports: renderTemplate(page, ctx) -> <main> inner html; render404Main(ctx) -> <main> inner html for 404.html
//
// Layout (DESIGN-SPEC 6.9 "Interior pages", 6.24):
//   1. the interior hero: a half-bleed photo frame on the right and a light glass pane overlapping it from the left. The
//      pane holds the breadcrumb (only where the source showed one, BUILD-CONTRACT 4.16.5), the model's level-1 block
//      (the page's single H1; never a second one) and the small blocks next to it in its section (an event's back link
//      and date, a post's meta, a town page's sub-heading and button). Photo: a generic PLACE-* image (generated,
//      tagged "AI illustration", never captioned as a town); legal, utility, checkout and account pages get the pane only.
//   2. the rest of the page in model order: prose sections on a light surface over the pattern band (a plain card on
//      that flat ground, DESIGN-SPEC 4.6, so no glass sits inside glass, R-15), and every section that lists posts on
//      the wet-sand photo band (H-BAND-5) with glass cards (6.19).
//   3. at most ONE protrusion, at the hero frame's bottom edge, rotated by template (5.3); none on legal pages.
//   events-calendar: the captured static event list, without the calendar's view switcher, list pagination, date
//   picker, search bar or export menu (BUILD-CONTRACT 4.18.4; the removed words are declared in theme-interior.json).
//   404: the deep-water band, a smoked pane, declared microcopy, "Shop Menu" and "Home", the fluke across the pane's
//   top edge (4.18.7).
import { renderBlock, renderSection, renderPopup } from './blocks.mjs';
import { breadcrumbs, link, slot, slotImg, protrusion, band } from './parts.mjs';
import { renderListing } from './shop.mjs';

/** template family per page kind */
const FAMILY = {
  'blog-post': 'post', 'blog-index': 'list', 'blog-archive-category': 'list', 'blog-archive-date': 'list', 'blog-archive-tag': 'list',
  'standard-page': 'page', 'stores-index': 'page', store: 'page',
  legal: 'legal', utility: 'plain', checkout: 'plain', 'account-loyalty-shell': 'plain',
  'taxonomy-index': 'gloss', 'taxonomy-index-pagination': 'gloss', terpene: 'gloss', cannabinoid: 'gloss', effect: 'gloss', strain: 'gloss',
  event: 'event', 'events-calendar': 'calendar',
  'town-landing-cpt': 'town', 'town-landing-page': 'town', 'town-landing-index': 'town', 'town-landing-index-pagination': 'town',
};
/** the one protrusion per template family, rotated through the kit (DESIGN-SPEC 5.3); legal and plain pages get none */
const CUT = { post: 'CUT-SEAGLASS', list: 'CUT-BUD', page: 'CUT-FANLEAF', gloss: 'CUT-TERPENE', event: 'CUT-SEAGLASS-2', town: 'CUT-BEACHGRASS' };
/** families whose hero is the pane alone (no photo): prose-only legal pages, utility/account shells */
const PANE_ONLY = new Set(['legal', 'plain']);

/** a stable small hash of a string (deterministic PLACE rotation; no randomness, BUILD-CONTRACT 3.1) */
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
const visible = (b) => b && !b.hiddenAll;
const isH1 = (b) => visible(b) && (b.t === 'heading' || b.t === 'event-field') && +b.level === 1;
/* small blocks that may sit in the hero pane next to the H1 (never prose, images or lists) */
const PANE_PRE = (b) => visible(b) && ((b.t === 'event-field' && !b.level && !(b.ariaLabels || []).length) || b.t === 'meta');
const PANE_POST = (b) => visible(b) && ((b.t === 'heading' && +b.level >= 2 && !b.href) || b.t === 'meta' || b.t === 'button' || (b.t === 'event-field' && !b.level && !(b.ariaLabels || []).length && !(b.links || []).length));

/** split the page into the hero's blocks and the remaining sections (each section keeps its id and cssId) */
function splitHero(page) {
  const secs = (page.sections || []).filter((s) => s && !s.hiddenAll && !s.popup);
  for (const s of secs) {
    const blocks = s.blocks || [];
    const at = blocks.findIndex(isH1);
    if (at < 0) continue;
    let from = at;
    while (from > 0 && at - from < 3 && PANE_PRE(blocks[from - 1])) from--;
    let to = at + 1;
    let headings = 0;
    while (to < blocks.length && to - at <= 3 && PANE_POST(blocks[to])) {
      if (blocks[to].t === 'heading' && ++headings > 1) break;
      to++;
    }
    const hero = blocks.slice(from, to).filter(visible);
    const restBlocks = blocks.slice(0, from).concat(blocks.slice(to));
    const rest = secs.map((x) => (x === s ? { ...x, blocks: restBlocks } : x)).filter((x) => (x.blocks || []).some(visible));
    return { hero, h1: blocks[at], rest };
  }
  return { hero: [], h1: null, rest: secs };
}

/** the H1, verbatim. "Shop Cannabis X For Sale in Wellfleet, MA" titles are split like the prototype's category page
    (6.9): the first two words display, the noun as the gradient word, the rest as a sub-line; one inline run, so the
    text stays one unit and no tag boundary falls between a word and its punctuation. */
function heroH1(b, ctx) {
  const m = b.t === 'heading' && !b.href && !b.srOnly ? /^(Shop Cannabis) (\S+) ((?:for|For) (?:sale|Sale) in .+)$/.exec(String(b.text || '')) : null;
  if (!m) return renderBlock(b, ctx);
  return '<h1 class="h1 ihero__h1"><strong>' + ctx.esc(m[1]) + ' <span class="grad">' + ctx.esc(m[2]) + '</span></strong> <span class="t2">' + ctx.esc(m[3]) + '</span></h1>';
}

/** the interior hero (6.9): photo frame + overlapping light pane + at most one protrusion */
function hero(page, ctx, fam, parts) {
  const crumbs = breadcrumbs(page, ctx, { cls: 'ihero__crumbs' });
  const inner = parts.hero.map((b) => (b === parts.h1 ? heroH1(b, ctx) : renderBlock(b, ctx))).filter(Boolean).join('\n');
  const photo = !PANE_ONLY.has(fam);
  let frame = '';
  if (photo) {
    const id = 'PLACE-' + ((hash(page.path) % 6) + 1);
    frame = '<div class="ihero__frame">' + slotImg(ctx, id, { cls: 'ihero__img', sizes: '(max-width: 900px) 100vw, 56vw', loading: 'eager', fetchpriority: 'high', frameCls: 'ihero__ai' }) + '</div>';
  }
  const cut = photo && CUT[fam] && slot(CUT[fam]) ? protrusion(ctx, CUT[fam], { cls: 'protrude--ihero protrude--' + fam, sizes: '(max-width: 1100px) 170px, 230px' }) : '';
  return '<section class="ihero ihero--' + fam + (photo ? '' : ' ihero--plain') + '">' + frame
    + '<div class="wrap ihero__in"><div class="ihero__pane ' + (photo ? 'glass glass--hero" data-glass="light">' : 'card">') + crumbs + inner + '</div></div>' + cut + '</section>';
}

const hasPosts = (s) => (s.blocks || []).some((b) => visible(b) && b.t === 'posts');

/** the page body: prose runs on the pattern band, posts sections on the wet-sand photo band */
function body(page, ctx, fam, rest) {
  const out = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const html = run.map((s) => renderSection(s, ctx, { cls: 'iprose__sec', inner: (h) => h })).filter(Boolean).join('\n');
    run = [];
    if (!html) return;
    out.push(band(ctx, '<div class="iprose__col">' + html + '</div>', { tag: 'div', cls: 'iprose iprose--' + fam, pattern: true, pools: true }));
  };
  for (const s of rest) {
    if (!hasPosts(s)) { run.push(s); continue; }
    flush();
    const inner = renderSection(s, ctx, { cls: 'iposts__sec', inner: (h) => h, postCard: 'glass' });
    if (inner) out.push(band(ctx, inner, { tag: 'div', cls: 'iposts iposts--' + fam, backdrop: 'H-BAND-5' }));
  }
  flush();
  return out.join('\n');
}

/* ---------------------------------------------------------------- events calendar (4.18.4) */
/** the calendar's own UI, which the static list does not have: view switcher, list pagination, date picker, search
    bar, export menu (each removed word is declared in theme-interior.json, pages /events-calendar/) */
const CAL_UI_TEXT = /^(Events Search and Views Navigation|Search|Event Views Navigation|List|Select date\.|List Month Day|Today|Upcoming Upcoming|Previous Events Today Next Events|Subscribe to calendar)$/;
const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
function calendarUi(b) {
  if (b.t === 'form') return true;
  if (b.t === 'heading' && +b.level !== 1) return CAL_UI_TEXT.test(String(b.text || '').trim());
  if (b.t === 'rich') { const t = strip(b.html); return CAL_UI_TEXT.test(t) || /Export \.ics file/.test(t); }
  return false;
}
function calendarMain(page, ctx) {
  const blocks = [];
  for (const s of (page.sections || []).filter((x) => x && !x.hiddenAll && !x.popup)) for (const b of s.blocks || []) if (visible(b) && !calendarUi(b)) blocks.push(b);
  const list = blocks.map((b) => (b.t === 'rich' && /href="[^"]*\/event\//.test(b.html || '') ? '<div class="event-list">' + renderBlock(b, ctx) + '</div>' : renderBlock(b, ctx))).filter(Boolean).join('\n');
  const crumbs = breadcrumbs(page, ctx, { cls: 'ihero__crumbs' });
  return band(ctx, '<div class="iprose__col ical__col">' + crumbs + list + '</div>', { tag: 'div', cls: 'iprose ical', pattern: true, pools: true });
}

/** <main> inner html for an interior page */
export function renderTemplate(page, ctx) {
  const fam = FAMILY[page.kind] || 'page';
  const popups = (page.sections || []).filter((s) => s && !s.hiddenAll && s.popup).map((s) => renderPopup(s, ctx));
  const parts = [];
  if (fam === 'calendar' && !page.derived) parts.push(calendarMain(page, ctx));
  else {
    const split = splitHero(page);
    parts.push(hero(page, ctx, fam, split));
    parts.push(body(page, ctx, fam, split.rest));
  }
  /* a page grid without a visible products block renders the Plan B listing (BUILD-CONTRACT 4.5) */
  const hasGrid = (page.sections || []).some((s) => s && !s.hiddenAll && (s.blocks || []).some((b) => visible(b) && b.t === 'products'));
  if (!hasGrid) for (const c of (page.catalog || []).filter((x) => !x.hiddenAll)) parts.push('<div class="wrap ilisting">' + renderListing({ widget: c.widget, params: c.params || c.raw || {} }, ctx) + '</div>');
  parts.push(...popups);
  return parts.filter(Boolean).join('\n');
}

/* ---------------------------------------------------------------- 404 (4.18.7) */
/** the 404 page's own words: declared microcopy (theme-interior.json interior-404-copy); the live 404 was never
    captured. "Shop Menu" and "Home" are the site's own nav labels. */
const NOT_FOUND = { title: 'Page not found', text: 'Sorry, we could not find the page you were looking for.' };
/** <main> inner html for 404.html (served at any depth: root-relative URLs are kept by the build) */
export function render404Main(ctx) {
  const pane = '<div class="i404__pane glass glass--smoke" data-glass="smoke"><h1 class="h1">' + ctx.esc(NOT_FOUND.title) + '</h1><p>' + ctx.esc(NOT_FOUND.text) + '</p>'
    + '<p class="i404__cta">' + link(ctx, '/menu/', 'Shop Menu', { class: 'btn btn--sky' }) + ' ' + link(ctx, '/', 'Home', { class: 'btn btn--ghost btn--on-dark' }) + '</p></div>';
  const cut = slot('CUT-FLUKE') ? protrusion(ctx, 'CUT-FLUKE', { cls: 'protrude--i404', sizes: '(max-width: 700px) 220px, 400px' }) : '';
  return band(ctx, '<div class="i404__in">' + cut + pane + '</div>', { tag: 'section', cls: 'i404', backdrop: 'BAND-DEEPWATER', smoke: true });
}
