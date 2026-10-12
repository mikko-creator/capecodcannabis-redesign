// src/theme/parts.mjs - shared partials: links, buttons, glass panes, cards, chips, pills, bands, section titles,
// protrusions, image-plan slots, the live-menu hand-off, breadcrumbs, icons.
// Owner: T1a (chrome + design system). Skeleton by T0, 2026-10-12. Change requests: tmp/t1a/INBOX.md.
// Every function returns an HTML string. Text arguments are escaped here unless the parameter is named `inner`/`html`
// (already-built markup). Every internal URL goes through ctx.url / ctx.link / ctx.img / ctx.asset (root-relative; the
// build relativizes it). Class names never use platform names (BUILD-CONTRACT 4.14). Signatures: src/theme/README.md.
import fs from 'node:fs';

/** the theme's own words. Each one is declared in src/content/removals.json or src/content/removals.d/theme-*.json
    allowedAdded[] with a reason (BUILD-CONTRACT 4.16.2); never add one here without its declaration */
export const LABELS = {
  handoff: 'Check price and availability',      // Plan B hand-off to the live menu (4.5)               base: plan-b-handoff
  fromName: 'from the product name',             // chip source (4.16.7)                                base: chip-source-labels
  fromSlug: "from the product's web address",    // chip / brand source (4.16.7)                        base: chip-source-labels
  asOf: 'as of',                                 // dated snapshots (4.5, 4.7)                          base: snapshot-date
  close: 'Close',                                // popup and dialog close buttons (4.15.9, 4.18.5)     base: popup-close + theme-chrome
  mapLoad: 'Load Google map',                    // click-to-load map facade (4.17.14)                  theme-interior
  mapTitle: 'Google map',                        // the loaded map iframe's title (4.17.14)             theme-interior
  aiTag: 'AI illustration',                      // visible tag on tagged generated images (4.17.4)     theme-chrome
  search: 'Search',                              // header search button name (DESIGN-SPEC 6.2)         theme-chrome
  bag: 'Pickup bag',                             // bag button name and drawer heading (6.2, 6.6)       theme-shop
  submenu: 'submenu',                            // "<label> submenu" caret names (6.2)                 theme-chrome
};

/* ---------------------------------------------------------------- image-plan slots */
let PLAN = null;
/** the slot record { id, file, alt, ai, tag, w, h, focal, use, ... } from src/content/image-plan.json, or null.
    Read once per build process (lane IMG writes the file; a build reads the state at its start). */
export function slot(id) {
  if (!PLAN) {
    PLAN = new Map();
    try {
      const j = JSON.parse(fs.readFileSync(new URL('../content/image-plan.json', import.meta.url), 'utf8'));
      for (const s of (Array.isArray(j) ? j : j.slots || [])) if (s && (s.id || s.slot)) PLAN.set(s.id || s.slot, s);
    } catch { /* no plan yet: every slot renders its empty frame through ctx.img */ }
  }
  return PLAN.get(id) || null;
}
/** an image-plan slot through ctx.img, with the slot's alt (opts.alt overrides), data-ai on generated images and the
    visible "AI illustration" tag when the slot has tag:true (opts.tag === false suppresses it, for paints under 300 CSS
    px wide; BUILD-CONTRACT 4.17.4). An unfilled slot renders ctx.img's sized empty frame (data-slot).
    opts: ctx.img opts plus { tag, frameCls } */
export function slotImg(ctx, id, opts = {}) {
  const rec = slot(id) || {};
  const alt = opts.alt !== undefined ? opts.alt : rec.alt != null ? rec.alt : '';
  const o = { ...opts, alt };
  delete o.tag; delete o.frameCls;
  if (!o.width && rec.w) o.width = rec.w;
  if (!o.height && rec.h) o.height = rec.h;
  let html = ctx.img(id, o);
  if (rec.ai) html = html.replace(/^<(img|span)\b/, '<$1 data-ai');
  if (rec.focal && /^<img\b/.test(html)) html = html.replace(/^<img\b/, '<img style="object-position:' + ctx.escAttr(rec.focal) + '"');
  if (rec.ai && rec.tag && opts.tag !== false) {
    return '<span class="' + ['ai-frame', opts.frameCls].filter(Boolean).join(' ') + '">' + html + '<span class="ai-tag" aria-hidden="true">' + LABELS.aiTag + '</span></span>';
  }
  return html;
}

/* ---------------------------------------------------------------- links and images */
/** a resolved link around `inner` (already-escaped markup); an unbuilt target renders `inner` alone (text kept).
    extra: attributes ({ class, target, title, rel, 'aria-label', ... }); external http(s) links get rel=noopener */
export function link(ctx, href, inner, extra = {}) {
  const r = ctx.link(href);
  if (!r || r.unlink) return inner;
  const ext = r.external && /^https?:/.test(r.href);
  return '<a' + ctx.attrs({ href: r.href, ...extra, rel: ext ? extra.rel || 'noopener' : extra.rel || null }) + '>' + inner + '</a>';
}
/** a model image block (or any { ref|src|srcUrl, alt, w, h, titleAttr, missing }) through ctx.img; '' for Elementor's
    empty-widget placeholder */
export function image(b, ctx, sizes = '(max-width: 900px) 100vw, 900px', extra = {}) {
  if (!b || b.missing === 'platform-placeholder') return '';
  return ctx.img(b.ref || b.src || b.srcUrl, { alt: b.alt == null ? '' : b.alt, title: b.titleAttr || undefined, width: b.w, height: b.h, sizes, ...extra });
}
/** a rating graphic: no text, the verbatim accessible name ("5 Stars", "4.9 Stars") */
export const stars = (ctx, label) => '<span class="stars" role="img" aria-label="' + ctx.escAttr(label) + '"></span>';

/** a button-styled link (href) or a <button> (no href). opts: { href, label (text, escaped) | inner (markup),
    variant: 'ink'|'glass'|'ghost'|'sky', size: 'sm'|'lg', type, attrs } */
export function button(ctx, opts = {}) {
  const cls = ['btn', 'btn--' + (opts.variant || 'ink'), opts.size ? 'btn--' + opts.size : null, opts.cls].filter(Boolean).join(' ');
  const inner = opts.inner != null ? opts.inner : ctx.esc(opts.label || '');
  if (opts.href) return link(ctx, opts.href, inner, { class: cls, ...(opts.attrs || {}) });
  return '<button' + ctx.attrs({ type: opts.type || 'button', class: cls, ...(opts.attrs || {}) }) + '>' + inner + '</button>';
}
/** the Plan B live-menu hand-off (BUILD-CONTRACT 4.5; build-check 3): data-handoff="live-menu" to ctx.live(path).
    Never click one in a test. opts: { label (declared microcopy only), cls } */
export function handoff(ctx, path, opts = {}) {
  return '<a' + ctx.attrs({ class: opts.cls || 'btn btn--ink handoff', 'data-handoff': 'live-menu', href: ctx.live(path) }) + '>' + ctx.esc(opts.label || LABELS.handoff) + '</a>';
}

/* ---------------------------------------------------------------- surfaces */
/** a glass pane (DESIGN-SPEC 4.1/4.2). inner: markup. opts: { tint: 'aqua'|'green'|'blue'|'hero', smoke, tag, cls, attrs }.
    Never nest one glass pane inside another (R-15): inner chips and buttons use plain fills. */
export function glassPane(ctx, inner, opts = {}) {
  const tag = opts.tag || 'div';
  const cls = ['glass', opts.smoke ? 'glass--smoke' : opts.tint ? 'glass--' + opts.tint : null, opts.cls].filter(Boolean).join(' ');
  return '<' + tag + ctx.attrs({ class: cls, 'data-glass': opts.smoke ? 'smoke' : 'light', ...(opts.attrs || {}) }) + '>' + inner + '</' + tag + '>';
}
/** a plain card (white, --sh-2; for flat grounds where glass would have nothing to blur, 4.6). opts: { tag, cls, attrs } */
export function card(ctx, inner, opts = {}) {
  const tag = opts.tag || 'div';
  return '<' + tag + ctx.attrs({ class: ['card', opts.cls].filter(Boolean).join(' '), ...(opts.attrs || {}) }) + '>' + inner + '</' + tag + '>';
}
/** a chip (small label). text is escaped. opts: { cls, note (escaped small caption) } */
export function chip(ctx, text, opts = {}) {
  return '<span class="' + ['chip', opts.cls].filter(Boolean).join(' ') + '">' + ctx.esc(text) + (opts.note ? ' <small>' + ctx.esc(opts.note) + '</small>' : '') + '</span>';
}
/** a pill: a linked pill when opts.href resolves, else a span. inner: markup. opts: { href, cls, attrs } */
export function pill(ctx, inner, opts = {}) {
  const cls = ['pill', opts.cls].filter(Boolean).join(' ');
  if (opts.href) return link(ctx, opts.href, inner, { class: cls, ...(opts.attrs || {}) });
  return '<span' + ctx.attrs({ class: cls, ...(opts.attrs || {}) }) + '>' + inner + '</span>';
}
/** a section band (DESIGN-SPEC 3.6, 6.10): plane 0 = backdrop photo (slot id or image ref) or the whale-tail pattern,
    plus light pools; plane 1+ = inner. The band sets position:relative + isolation:isolate (CSS .band).
    opts: { tag ('section'), cls, attrs, backdrop (slot id or ref), backdropAlt (default ''), sizes, pattern (bool),
    pools (bool), smoke (dark band), parallax (speed, e.g. .12), wrap (default true) } */
export function band(ctx, inner, opts = {}) {
  const tag = opts.tag || 'section';
  let back = '';
  if (opts.backdrop) {
    const img = slot(opts.backdrop)
      ? slotImg(ctx, opts.backdrop, { alt: opts.backdropAlt || '', sizes: opts.sizes || '100vw', cls: 'band__img', tag: opts.backdropTag === true ? undefined : false })
      : ctx.img(opts.backdrop, { alt: opts.backdropAlt || '', sizes: opts.sizes || '100vw', cls: 'band__img' });
    /* the parallax moves the inner layer; .band__media stays put and clips it */
    back = '<div class="band__media" aria-hidden="true"><div class="band__layer"' + (opts.parallax ? ' data-parallax="' + ctx.escAttr(String(opts.parallax)) + '"' : '') + '>' + img + '</div></div>';
  }
  const pattern = opts.pattern ? '<div class="band__pattern" aria-hidden="true"></div>' : '';
  const pools = opts.pools ? '<div class="band__pools" aria-hidden="true"><span class="pool pool--a"></span><span class="pool pool--b"></span></div>' : '';
  const body = opts.wrap === false ? inner : '<div class="wrap band__in">' + inner + '</div>';
  /* the seam light sweep (DESIGN-SPEC 6.10, graft 18): a decorative 2px light along the band's top edge, run once by
     site.js (.is-swept) when the edge enters the viewport; never under reduced motion. Last child, aria-hidden. */
  const sweep = '<span class="band__sweep" aria-hidden="true"></span>';
  return '<' + tag + ctx.attrs({ class: ['band', opts.smoke ? 'band--smoke' : null, opts.cls].filter(Boolean).join(' '), ...(opts.attrs || {}) }) + '>' + back + pattern + pools + body + sweep + '</' + tag + '>';
}
/** a section title with exactly ONE accent (DESIGN-SPEC 3.2): 'grad' (gradient word), 'draw' (drawn SVG underline),
    'italic' (Roboto italic 700). The accented token is a whole whitespace-separated token, so a word and its
    punctuation are never split by a tag boundary. text is verbatim (escaped here); href links the whole title.
    opts: { level (2), accent ('grad'), word (index; default the last token), cls, id, href, as ('h'|'p') } */
export function sectionTitle(ctx, text, opts = {}) {
  const lv = Math.min(6, Math.max(1, +opts.level || 2));
  const toks = String(text || '').split(/(\s+)/);
  const words = toks.map((t, i) => (/\S/.test(t) ? i : -1)).filter((i) => i >= 0);
  const pick = words.length ? (opts.word != null ? words[Math.min(words.length - 1, Math.max(0, +opts.word))] : words[words.length - 1]) : -1;
  const hasEmoji = /\p{Extended_Pictographic}/u.test(String(text || ''));
  const accent = hasEmoji ? null : opts.accent || 'grad';   /* emoji headings take no extra accent */
  const inner = toks.map((t, i) => {
    const x = ctx.esc(t);
    if (i !== pick || !accent) return x;
    if (accent === 'draw') return '<span class="draw">' + x + '<svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M2 8 C 30 2, 70 2, 98 7"/></svg></span>';
    if (accent === 'italic') return '<span class="ital">' + x + '</span>';
    return '<span class="grad">' + x + '</span>';
  }).join('');
  const body = opts.href ? link(ctx, opts.href, inner) : inner;
  const tag = opts.as === 'p' ? 'p' : 'h' + lv;
  return '<' + tag + ctx.attrs({ class: ['h-sec', opts.cls].filter(Boolean).join(' '), id: opts.id || null }) + '>' + body + '</' + tag + '>';
}
/** a protrusion (DESIGN-SPEC 5.2): a cut-out slot image inside an aria-hidden wrapper with data-protrude and
    pointer-events none (CSS .protrude); decorative alt="", data-ai from the slot. The wrapper sits at plane 2 of the
    UPPER section. opts: { cls (position class, e.g. 'protrude--shards'), sizes, widths, parallax (counter-parallax
    speed, at most .06), breach (true for the footer fluke) } */
export function protrusion(ctx, slotId, opts = {}) {
  const img = slotImg(ctx, slotId, { alt: '', sizes: opts.sizes || '240px', widths: opts.widths, cls: 'protrude__img', tag: false });
  return '<div' + ctx.attrs({ class: ['protrude', opts.cls].filter(Boolean).join(' '), 'aria-hidden': 'true', 'data-protrude': slotId, 'data-parallax': opts.parallax ? String(opts.parallax) : null, 'data-breach': opts.breach ? '' : null }) + '>' + img + '</div>';
}

/* ---------------------------------------------------------------- breadcrumbs */
const CRUMB_LABEL = 'breadcrumbs';   /* the site's verbatim breadcrumb nav label and separator (PIPELINE-CONTENT) */
const CRUMB_SEP = ' / ';
/** breadcrumbs only where the source showed them (BUILD-CONTRACT 4.16.5): breadcrumbsSource 'visible'; product pages
    (Plan B requires one, 4.5) and derived pages keep theirs. One line, the source separator between the crumbs. */
export function breadcrumbs(page, ctx, opts = {}) {
  if (!page.breadcrumbs || !page.breadcrumbs.length) return '';
  const show = page.kind === 'product' || page.derived || page.breadcrumbsSource === 'visible';
  if (!show) return '';
  const sep = '<span class="crumbs__sep">' + ctx.esc(page.breadcrumbsSeparator || CRUMB_SEP) + '</span>';
  return '<nav class="' + ['crumbs', opts.cls].filter(Boolean).join(' ') + '" aria-label="' + ctx.escAttr(page.breadcrumbsLabel || CRUMB_LABEL) + '"><p>' + page.breadcrumbs.map((c) => (c.href ? link(ctx, c.href, ctx.esc(c.label)) : '<span aria-current="page">' + ctx.esc(c.label) + '</span>')).join(sep) + '</p></nav>';
}

/* ---------------------------------------------------------------- icons (inline SVG, decorative; no text) */
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4.2-4.2"/>',
  bag: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  caret: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  /* social profile glyphs (Feather icons, MIT licence), the same outline style; the live footer shows each network's icon */
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  twitter: '<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>',
};
/** a decorative inline SVG icon (aria-hidden, focusable=false). name: search|bag|caret|close|arrow|up|star|link|facebook|instagram|linkedin|twitter */
export function icon(name, cls) {
  return '<svg class="' + ['ico', cls].filter(Boolean).join(' ') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
}
