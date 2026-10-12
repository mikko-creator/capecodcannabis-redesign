// theme-stub/index.mjs - plain semantic HTML for every page kind and block type.
// Owner: PIPELINE-SITE stub, reworked by lane H1 (2026-10-12) after the WF3a verifier (tmp/pipe-verify/verifier-result.json)
// and BUILD-CONTRACT 4.15 / 4.16. Same signature as src/theme/index.mjs (BUILD-CONTRACT 3.2).
//
// Rules this renderer follows (the real theme must keep them; docs/PIPELINE-CONTENT.md "H1 change" lists them per block):
// - Every model field that carries visible or accessible text is rendered (4.16.9). The parity gate
//   (node tools/text-parity.mjs --built <dist> --control) proves it on the real build.
// - Copy is the captured copy. The stub's own words are the few labels in STUB_LABELS (plus the age-gate plugin strings
//   in AGE_GATE_PLUGIN, which are verbatim from the source's script config); each is declared in
//   src/content/removals.json allowedAdded[] with a reason (4.16.2).
// - Old-platform widget instructions are not rendered where the stub has no such widget; each one is declared in
//   removals.json removals[] (4.16.3). Content-bearing accessible names stay verbatim (ratings, "Read more about <title>",
//   "Post Navigation", "Google Logo", every image alt).
// - Platform identifiers are never accessible names or field names (4.16.8).
// - Every internal URL goes through ctx.url / ctx.link / ctx.img / ctx.rich / ctx.asset (root-relative; the build
//   relativizes it). Catalog-driven text sits inside an element marked data-catalog (4.16.2).
export const styles = ['stub.css'];
export const scripts = ['stub.js'];
export const blockTypes = ['heading', 'rich', 'image', 'button', 'faq', 'carousel', 'gallery', 'posts', 'cta', 'products', 'reviews', 'hours',
  'embed', 'html', 'form', 'hotspot', 'timeline', 'meta', 'postnav', 'comments', 'event-field', 'anchor', 'icon', 'divider', 'nav', 'search',
  'social', 'chrome-ref', 'app', 'sitemap', 'excluded'];

/** the stub's own words; each one is declared in src/content/removals.json allowedAdded[] */
export const STUB_LABELS = {
  handoff: 'Check price and availability',      // the Plan B hand-off to the live menu (BUILD-CONTRACT 4.5)
  fromName: 'from the product name',             // chip source, label found verbatim in the title (4.16.7)
  fromSlug: "from the product's web address",    // chip or brand source, taken from the URL slug (4.16.7)
  asOf: 'as of',                                 // dated snapshots: prices (4.5) and the review capture date (4.7)
  close: 'Close',                                // the about-page popup's close control (the source's close button is
                                                 // added by Elementor's runtime, so it is not in the captured HTML)
};
/** the age-verification plugin's own strings, verbatim from its script config on every captured page
    (var age_gate = {..."error", "customTitle"...}, var age_gate_common = {"cookies"}); BUILD-CONTRACT 4.15.2 */
export const AGE_GATE_PLUGIN = {
  error: 'You are not old enough to view this content',
  customTitle: 'Age Verification - Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA',
  cookies: 'Your browser does not support cookies, you may experience problems entering this site',
};
/** model aria-labels the stub does not render: old-platform widget instructions for widgets the stub does not have
    (each declared in removals.json removals[], BUILD-CONTRACT 4.16.3), plus labels of controls it omits (the event venue
    map iframe, which the parity tool does not read, and the omitted video player's play button, declared) */
const WIDGET_LABEL = [/^Carousel$/, /^Image Carousel$/, /^Slides$/, /^\d+ of \d+$/, /^Previous$/, /^Next$/,
  /^Accordion\. Open links with Enter or Space, close with Escape, and navigate with Arrow Keys$/,
  /^View links to add events to your calendar$/, /^Venue location map$/, /\.(mov|mp4) Play video$/i];
const isWidgetLabel = (s) => WIDGET_LABEL.some((re) => re.test(String(s)));
/** the site's verbatim breadcrumb nav label and separator (PIPELINE-CONTENT breadcrumbsLabel / breadcrumbsSeparator) */
const CRUMB_LABEL = 'breadcrumbs';
const CRUMB_SEP = ' / ';

let UID = 0;   // per-page counter for element ids (reset in renderPage / render404: deterministic)
const uid = (p) => p + '-' + (++UID);
const e = (ctx, s) => ctx.esc(s);
const imgRef = (x) => x && (x.ref || x.src || x.srcUrl);
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const normSp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
/** text of an html fragment, one entry per block-level run (only to tell which `text` lines an `html` already shows) */
function htmlRuns(html) {
  return String(html || '').replace(/<(br|\/p|\/h[1-6]|\/li|\/div|\/tr|\/td|\/th|p|h[1-6]|li|div)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .split('\n').map(normSp).filter(Boolean);
}
const covers = (runs, line) => { const l = normSp(line); return runs.some((r) => (' ' + r + ' ').includes(' ' + l + ' ') || r === l); };

function link(ctx, href, inner, extra = {}) {
  const r = ctx.link(href);
  if (!r || r.unlink) return inner;
  const ext = r.external && /^https?:/.test(r.href);
  return '<a' + ctx.attrs({ href: r.href, ...extra, rel: ext ? extra.rel || 'noopener' : extra.rel || null }) + '>' + inner + '</a>';
}

/* ---------------------------------------------------------------- model fields the build copies onto `page` */
/* page.breadcrumbsSource ('visible' | 'jsonld' | 'none'), breadcrumbsSeparator, breadcrumbsLabel and ariaLabels come
   from the page's model (src/build.mjs, lane H2). Product and derived pages have no model, so they are undefined. */
const pageMeta = (page) => ({ breadcrumbsSource: page.breadcrumbsSource, breadcrumbsSeparator: page.breadcrumbsSeparator, breadcrumbsLabel: page.breadcrumbsLabel, ariaLabels: page.ariaLabels || [] });

/* ---------------------------------------------------------------- chrome */
function navList(ctx, items, id) {
  if (!items || !items.length) return '';
  return '<ul' + (id ? ' id="' + id + '"' : '') + '>' + items.map((i) => '<li>' + link(ctx, i.href, e(ctx, i.label), { target: i.target || null, title: i.title || null }) + (i.children && i.children.length ? navList(ctx, i.children) : '') + '</li>').join('') + '</ul>';
}
/** a nav with its menu toggle (the source's toggle label, verbatim; the button shows a CSS glyph, no text) */
function toggledNav(ctx, cls, navLabel, toggleLabel, items) {
  const id = uid('nav');
  return '<nav class="' + cls + '"' + (navLabel ? ' aria-label="' + ctx.escAttr(navLabel) + '"' : '') + '>'
    + (toggleLabel ? '<button type="button" class="nav-toggle" aria-label="' + ctx.escAttr(toggleLabel) + '" aria-expanded="true" aria-controls="' + id + '"></button>' : '')
    + navList(ctx, items, id) + '</nav>';
}
function header(ctx) {
  const h = ctx.nav || {};
  const logoRef = (h.logo && (h.logo.ref || h.logo.srcUrl)) || 'assets/brand/logo-agegate.png';
  const logo = ctx.img(logoRef, { alt: (h.logo && h.logo.alt) || '', sizes: '160px', loading: 'eager', widths: [320, 480] });
  /* the mega strips' labels are in the raw chrome model ("Categories", "Menu Toggle"); ctx.nav.strips holds only items */
  const mega = (ctx.chrome && Array.isArray(ctx.chrome.mega)) ? ctx.chrome.mega : [];
  const strips = (h.strips || []).map((s, i) => {
    const labs = (mega[i] && mega[i].ariaLabels) || [];
    return toggledNav(ctx, 'strip', labs.find((l) => l !== 'Menu Toggle') || null, labs.includes('Menu Toggle') ? 'Menu Toggle' : null, s);
  }).join('');
  const sf = h.search;
  const search = sf ? '<form class="search" role="search" method="get" action="' + ctx.url(sf.action || '/') + '"><input type="search" name="' + ctx.escAttr(sf.field || 's') + '"' + (sf.placeholder ? ' placeholder="' + ctx.escAttr(sf.placeholder) + '"' : '') + (sf.label ? ' aria-label="' + ctx.escAttr(sf.label) + '"' : '') + '>' + (sf.button ? '<button type="submit">' + e(ctx, sf.button) + '</button>' : '') + '</form>' : '';
  /* "Menu" is the source header nav's aria-label (audit/raw/index.html), not stored in chrome.json */
  return '<header class="site-header" id="topBar">' + link(ctx, (h.logo && h.logo.href) || '/', logo, { class: 'logo' })
    + toggledNav(ctx, 'main-nav', 'Menu', h.toggleLabel || null, h.menu)
    + search + strips + (h.hint ? '<p class="hint">' + e(ctx, h.hint) + '</p>' : '') + '</header>';
}
/** footer: the content lane's block sections; the visible "Hours" heading and the list after it are the hours block
    (id="hours", the target of the header's "Hours of Operation" link). The Sunday-first Joint list is hiddenAll and is
    never rendered (BUILD-CONTRACT 4.15.3). */
function footer(ctx) {
  const f = ctx.footer || {};
  let hoursDone = false;
  const parts = (Array.isArray(f.sections) ? f.sections : []).filter((s) => !s.hiddenAll).map((s) => {
    const list = (s.blocks || []).filter((b) => b && !b.hiddenAll);
    let html = '';
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (!hoursDone && b.t === 'heading' && /^hours$/i.test(normSp(b.text))) {
        let j = i + 1;
        while (j < list.length && list[j].t !== 'heading') j++;
        html += '<div class="hours" id="hours">' + list.slice(i, j).map((x) => block(x, ctx)).join('\n') + '</div>';
        hoursDone = true;
        i = j - 1;
        continue;
      }
      html += block(b, ctx) + '\n';
    }
    return '<section class="footer-part"' + (s.id ? ' data-id="' + ctx.escAttr(String(s.id)) + '"' : '') + '>' + html + '</section>';
  });
  return '<footer class="site-footer">' + parts.join('') + (hoursDone ? '' : '<span id="hours"></span>') + '</footer>';
}
/** age gate (BUILD-CONTRACT 4.4, 4.15.2): closed in the markup, so with JS off the page stays readable; stub.js opens
    it, sets document.title to the plugin's customTitle while it is open, keeps it open on "No" with the plugin's error,
    and shows the plugin's cookie warning when storage throws */
function ageGate(ctx) {
  const g = ctx.ageGate;
  if (!g) return '';
  const P = { ...AGE_GATE_PLUGIN, ...(g.error ? { error: g.error } : {}), ...(g.customTitle ? { customTitle: g.customTitle } : {}), ...(g.cookies ? { cookies: g.cookies } : {}) };
  return '<dialog id="age-gate" class="age-gate"' + ctx.attrs({ 'aria-label': g.ariaLabel || g.challenge, 'data-key': g.storageKey || 'ccc-age-21', 'data-title': P.customTitle }) + '>'
    + (g.logo && (g.logo.ref || g.logo.srcUrl) ? ctx.img(g.logo.ref || g.logo.srcUrl, { alt: g.logo.alt || '', sizes: '200px', loading: 'eager', widths: [320] }) : '')
    + '<p class="headline">' + e(ctx, g.headline) + '</p><p class="challenge">' + e(ctx, g.challenge) + '</p>'
    + '<p class="choices"><button type="button" data-age="yes">' + e(ctx, g.yes) + '</button> <button type="button" data-age="no">' + e(ctx, g.no) + '</button></p>'
    + '<p class="age-error" role="alert" hidden>' + e(ctx, P.error) + '</p>'
    + '<p class="age-cookies" role="alert" hidden>' + e(ctx, P.cookies) + '</p>'
    + (g.notes || []).map((n) => '<p class="note">' + e(ctx, n) + '</p>').join('') + '</dialog>';
}
function head(page, ctx) {
  const m = [];
  m.push('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  m.push('<title>' + e(ctx, page.title || page.h1 || '') + '</title>');
  if (page.metaDescription) m.push('<meta name="description" content="' + ctx.escAttr(page.metaDescription) + '">');
  if (page.robots) m.push('<meta name="robots" content="' + ctx.escAttr(page.robots) + '">');
  if (page.canonical) m.push('<link rel="canonical" href="' + ctx.escAttr(page.canonical) + '">');
  for (const [k, v] of Object.entries(page.og || {})) m.push('<meta property="' + ctx.escAttr(k) + '" content="' + ctx.escAttr(v) + '">');
  for (const [k, v] of Object.entries(page.twitter || {})) m.push('<meta name="' + ctx.escAttr(k) + '" content="' + ctx.escAttr(v) + '">');
  for (const ld of page.jsonLd || []) m.push('<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>');
  m.push('<link rel="stylesheet" href="' + ctx.asset('site.css') + '">');
  return m.join('\n');
}
function shell(page, ctx, main) {
  const skip = (ctx.nav && ctx.nav.skipLink) || { label: 'Skip to main content', href: '#main' };
  const mainId = String(skip.href || '#main').replace(/^#/, '') || 'main';
  return '<!doctype html>\n<html lang="en-US">\n<head>\n' + head(page, ctx) + '\n</head>\n<body class="kind-' + ctx.escAttr(page.kind) + '">\n'
    + '<a class="skip" href="#' + ctx.escAttr(mainId) + '">' + e(ctx, skip.label) + '</a>\n' + header(ctx) + '\n<main id="' + ctx.escAttr(mainId) + '">\n' + main + '\n</main>\n' + footer(ctx) + '\n' + ageGate(ctx)
    + '\n<script src="' + ctx.asset('site.js') + '"></script>\n</body>\n</html>\n';
}

/* ---------------------------------------------------------------- blocks */
/* blocks hidden at every breakpoint (hiddenAll) stay in the model and are not rendered (BUILD-CONTRACT 4.5) */
function blocks(list, ctx) { return (list || []).filter((b) => b && !b.hiddenAll).map((b) => block(b, ctx)).filter(Boolean).join('\n'); }
function image(b, ctx, sizes = '(max-width: 900px) 100vw, 900px') {
  if (!b || b.missing === 'platform-placeholder') return '';   /* Elementor's empty-widget placeholder: never rendered */
  return ctx.img(imgRef(b), { alt: b.alt == null ? '' : b.alt, title: b.titleAttr || undefined, width: b.w, height: b.h, sizes });
}
/** a rating graphic: no text, the verbatim accessible name ("5 Stars", "4.9 Stars") */
const stars = (ctx, label) => '<span class="stars" role="img" aria-label="' + ctx.escAttr(label) + '"></span>';
function block(b, ctx) {
  switch (b.t) {
    case 'heading': {
      const inner = b.href ? link(ctx, b.href, e(ctx, b.text)) : e(ctx, b.text);
      if (!b.level && b.as) { const tag = /^(p|div|span)$/.test(b.as) ? b.as : 'p'; return '<' + tag + ' class="heading-as">' + inner + '</' + tag + '>'; }
      const lv = Math.min(6, Math.max(1, +b.level || 2));
      return '<h' + lv + '>' + inner + '</h' + lv + '>';
    }
    case 'rich': return '<div class="rich' + (b.kind === 'table' ? ' table' : '') + '">' + ctx.rich(b.html || '') + '</div>';
    case 'sitemap': return b.groups ? '<div class="sitemap">' + b.groups.map((g) => { const lv = Math.min(6, Math.max(2, +g.level || 2)); return (g.heading ? '<h' + lv + '>' + e(ctx, g.heading) + '</h' + lv + '>' : '') + '<ul>' + (g.links || []).map((l) => '<li>' + link(ctx, l.href, e(ctx, l.label)) + '</li>').join('') + '</ul>'; }).join('') + '</div>' : '<div class="rich">' + ctx.rich(b.html || '') + '</div>';
    case 'image': {
      const img = image(b, ctx);
      if (!img) return '';
      const rating = (b.ariaLabels || []).filter((l) => !isWidgetLabel(l)).map((l) => stars(ctx, l)).join('');
      return '<figure class="image">' + (b.href ? link(ctx, b.href, img, { target: b.target || null }) : img) + rating + (b.caption ? '<figcaption>' + e(ctx, b.caption) + '</figcaption>' : '') + '</figure>';
    }
    case 'button': if (!b.label) return ''; return '<p class="button-row">' + (b.href ? link(ctx, b.href, e(ctx, b.label), { class: 'button', target: b.target || null, id: b.id || null }) : '<span class="button">' + e(ctx, b.label) + '</span>') + '</p>';
    /* native disclosure: no keyboard instructions needed (the Elementor accordion's are declared removals) */
    case 'faq': return '<div class="faq">' + (b.items || []).map((i) => '<details' + (i.open ? ' open' : '') + '><summary>' + e(ctx, i.q) + '</summary>' + (i.blocks ? blocks(i.blocks, ctx) : ctx.rich(i.a_html || i.a || '')) + '</details>').join('') + '</div>';
    /* slides are shown as a static list: the slider's labels ("Carousel", "N of M", "Previous"/"Next") are declared */
    case 'carousel': return '<div class="carousel">' + (b.slides || []).map((s) => '<div class="slide">' + blocks(s.blocks, ctx) + '</div>').join('') + '</div>';
    case 'gallery': return '<ul class="gallery">' + (b.items || []).map((i) => {
      const img = i.image ? image(i.image, ctx, '(max-width: 600px) 50vw, 300px') : '';
      const txt = (i.title ? '<span class="title">' + e(ctx, i.title) + '</span>' : '') + (i.caption ? '<span class="caption">' + e(ctx, i.caption) + '</span>' : '');
      const href = i.href || (i.image && i.image.href) || null;
      if (!img && !txt) return '';
      return '<li>' + (href ? link(ctx, href, img + txt, { target: (i.image && i.image.target) || null }) : img + txt) + '</li>';
    }).join('') + '</ul>';
    case 'posts': return posts(b, ctx);
    case 'cta': {
      const img = b.image ? (typeof b.image === 'string' ? ctx.img(b.image, { alt: '', sizes: '100vw' }) : image(b.image, ctx, '(max-width: 900px) 100vw, 600px')) : '';
      const inner = (b.ribbon ? '<p class="ribbon">' + e(ctx, b.ribbon) + '</p>' : '') + img + (b.title ? '<p class="cta-title">' + e(ctx, b.title) + '</p>' : '') + (b.text ? '<p class="cta-text">' + e(ctx, b.text) + '</p>' : '');
      if (b.button) return '<section class="cta">' + inner + '<p>' + (b.href ? link(ctx, b.href, e(ctx, b.button), { class: 'button' }) : '<span class="button">' + e(ctx, b.button) + '</span>') + '</p></section>';
      return '<section class="cta">' + (b.href ? link(ctx, b.href, inner, { class: 'cta-link' }) : inner) + '</section>';
    }
    case 'products': return listingBlock(b, ctx);
    case 'reviews': return reviews(b, ctx);
    case 'hours': return '<ul class="hours-list">' + (b.rows || []).map((r) => '<li><span class="day">' + e(ctx, r.day) + '</span> <span class="time">' + e(ctx, r.time) + '</span></li>').join('') + '</ul>';
    case 'embed': return embed(b, ctx);
    case 'html': return htmlBlock(b, ctx);
    case 'form': return form(b, ctx);
    case 'hotspot': return '<div class="hotspot">' + (b.image ? '<figure class="image">' + image(b.image, ctx) + '</figure>' : '') + '<ul>' + (b.items || []).map((i) => '<li><details><summary>' + (i.href ? link(ctx, i.href, e(ctx, i.label || i.text || '')) : e(ctx, i.label || i.text || '')) + '</summary>' + (i.tipHtml ? '<div class="tip">' + ctx.rich(i.tipHtml) + '</div>' : i.tooltip ? '<div class="tip"><p>' + e(ctx, i.tooltip) + '</p></div>' : '') + '</details></li>').join('') + '</ul></div>';
    case 'timeline': return '<ol class="timeline">' + (b.items || []).filter((i) => i && (normSp(i.text) || normSp(i.meta) || i.image)).map((i) => '<li>'
      + (i.meta && !normSp(i.text).includes(normSp(i.meta)) ? '<p class="meta">' + e(ctx, i.meta) + '</p>' : '')
      + (i.image ? '<figure class="image">' + image(i.image, ctx, '(max-width: 900px) 100vw, 765px') + '</figure>' : '')
      + lines(i.text).map((l) => '<p>' + e(ctx, l) + '</p>').join('') + '</li>').join('') + '</ol>';
    case 'meta': return '<ul class="meta">' + (b.items || []).map((i) => { const t = typeof i === 'string' ? i : i.text || i.label || ''; return '<li>' + (i && i.href ? link(ctx, i.href, e(ctx, t)) : e(ctx, t)) + '</li>'; }).join('') + '</ul>';
    case 'postnav': return postnav(b, ctx);
    case 'comments': return b.text ? '<section class="comments"><p>' + e(ctx, b.text) + '</p></section>' : '';
    case 'event-field': return eventField(b, ctx);
    case 'anchor': return b.id ? '<span id="' + ctx.escAttr(b.id) + '"></span>' : '';
    case 'icon': return b.href && b.label ? '<p class="icon">' + link(ctx, b.href, e(ctx, b.label)) + '</p>' : '';
    case 'divider': return b.text ? '<p class="divider">' + e(ctx, b.text) + '</p>' : '<hr>';
    case 'nav': {
      const labs = (b.ariaLabels || []).filter((l) => !isWidgetLabel(l));
      const toggle = b.toggleLabel || (labs.includes('Menu Toggle') ? 'Menu Toggle' : null);
      return toggledNav(ctx, 'block-nav', labs.find((l) => l !== toggle) || null, toggle, b.items);
    }
    case 'search': return '<form class="search" role="search" method="get" action="' + ctx.url(b.action || '/') + '"><input type="search" name="' + ctx.escAttr(b.field || 's') + '"' + (b.placeholder ? ' placeholder="' + ctx.escAttr(b.placeholder) + '"' : '') + (b.label ? ' aria-label="' + ctx.escAttr(b.label) + '"' : '') + '>' + (b.button ? '<button type="submit">' + e(ctx, b.button) + '</button>' : '') + '</form>';
    case 'social': return '<ul class="social">' + (b.items || []).map((i) => '<li>' + link(ctx, i.href, e(ctx, i.label || ''), { target: i.target || null }) + '</li>').join('') + '</ul>';
    case 'chrome-ref': case 'excluded': return '';
    case 'app': return '<div class="app" data-app="' + ctx.escAttr(b.what || '') + '"></div>';
    default: throw new Error('stub: unknown block type ' + b.t);
  }
}
/** posts: listing cards (title, image, meta, excerpt, "more" link with its verbatim "Read more about <title>" label),
    block-list cards (the home offer cards), and pagination {text, links} as a token line */
function posts(b, ctx) {
  const labels = b.ariaLabels || [];
  const used = new Set();
  const items = (b.items || []).map((i) => {
    if (Array.isArray(i.blocks)) return '<li class="card">' + blocks(i.blocks, ctx) + '</li>';
    const img = i.image && imgRef(i.image) ? image(i.image, ctx, '(max-width: 600px) 100vw, 360px') : '';
    const title = i.title ? '<h3>' + (i.href ? link(ctx, i.href, e(ctx, i.title)) : e(ctx, i.title)) + '</h3>' : '';
    const meta = i.meta ? '<p class="meta">' + e(ctx, [].concat(i.meta).join(' ')) + '</p>' : '';
    const ex = i.excerpt ? '<p class="excerpt">' + e(ctx, i.excerpt) + '</p>' : '';
    const rm = i.title && labels.includes('Read more about ' + i.title) ? 'Read more about ' + i.title : null;
    if (rm) used.add(rm);
    const more = i.more ? '<p class="more">' + (i.href ? link(ctx, i.href, e(ctx, i.more), { 'aria-label': rm }) : e(ctx, i.more)) + '</p>' : '';
    return '<li>' + img + title + meta + ex + more + '</li>';
  }).join('');
  let pag = '';
  const pg = b.pagination;
  if (typeof pg === 'string' && pg.trim()) pag = '<p class="pagination">' + e(ctx, pg) + '</p>';
  else if (pg && typeof pg === 'object') {
    /* the source line ("Page1 Page2 ...") with each linked page as its link; the current page is plain text. The
       pagination nav's own label is the block's remaining aria-label ("Pagination"), verbatim */
    const byLabel = new Map((pg.links || []).map((l) => [normSp(l.label), l.href]));
    const toks = normSp(pg.text).split(' ').filter(Boolean);
    const parts = toks.map((t) => (byLabel.has(t) ? link(ctx, byLabel.get(t), e(ctx, t)) : '<span>' + e(ctx, t) + '</span>'));
    for (const l of pg.links || []) if (!toks.includes(normSp(l.label))) parts.push(link(ctx, l.href, e(ctx, l.label)));
    const rest = labels.filter((l) => !used.has(l) && !isWidgetLabel(l));
    pag = '<nav class="pagination"' + (rest.length === 1 ? ' aria-label="' + ctx.escAttr(rest[0]) + '"' : '') + '>' + parts.join(' ') + '</nav>';
  }
  return '<ul class="posts">' + items + '</ul>' + pag;
}
/** reviews (BUILD-CONTRACT 4.7, 4.16.6): name, date and rating as separate elements, no separator text; the rating
    graphic carries the verbatim label; avatars are not mirrored or hotlinked; the capture date is shown */
function reviews(b, ctx) {
  const asOf = '<p class="snapshot"><small>' + STUB_LABELS.asOf + ' ' + e(ctx, ctx.snapshotDate) + '</small></p>';
  if (b.kind === 'list') {
    return '<div class="reviews"><ul>' + (b.items || []).map((i) => '<li class="review">'
      + (i.author ? '<p class="author">' + e(ctx, i.author) + '</p>' : '')
      + (i.time ? '<p class="time">' + e(ctx, i.time) + '</p>' : '')
      + (i.rating || i.ratingLabel ? '<p class="rating">' + (i.ratingLabel ? stars(ctx, i.ratingLabel) : '') + (i.rating ? '<span class="value">' + e(ctx, i.rating) + '</span>' : '') + '</p>' : '')
      + lines(i.text).map((l) => '<p class="text">' + e(ctx, l) + '</p>').join('')
      + '</li>').join('') + '</ul>' + asOf + '</div>';
  }
  const logo = b.logo ? image(b.logo, ctx, '120px') : '';
  const rating = (b.ariaLabels || []).filter((l) => !isWidgetLabel(l)).map((l) => stars(ctx, l)).join('');
  const txt = b.rating || b.count ? (b.rating ? '<span class="value">' + e(ctx, b.rating) + '</span>' : '') + (b.rating && b.count ? ' ' : '') + (b.count ? '<span class="count">' + e(ctx, b.count) + '</span>' : '') : e(ctx, b.text || '');
  return '<div class="reviews-badge">' + logo + '<p class="rating">' + rating + txt + '</p>' + asOf + '</div>';
}
function postnav(b, ctx) {
  const lab = (b.ariaLabels || []).find((l) => !isWidgetLabel(l));
  /* the parts in the model's key order, which is the source order: prev = [srLabel][title], next = [title][srLabel] */
  const one = (k) => {
    const x = b[k];
    if (!x || !x.href) return '';
    const parts = [];
    for (const key of Object.keys(x)) {
      if (key === 'srLabel' && x.srLabel) parts.push('<span class="sr-only">' + e(ctx, x.srLabel) + '</span>');
      else if ((key === 'title' || key === 'label') && x[key]) parts.push('<span class="' + key + '">' + e(ctx, x[key]) + '</span>');
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
  if (b.level) { const lv = Math.min(6, Math.max(1, +b.level)); return '<h' + lv + ' class="event-field" data-field="' + f + '">' + inner + '</h' + lv + '>'; }
  const lab = (b.ariaLabels || []).find((l) => !isWidgetLabel(l));
  if (lab) return '<nav class="event-field" data-field="' + f + '" aria-label="' + ctx.escAttr(lab) + '"><p>' + inner + '</p></nav>';
  return '<p class="event-field" data-field="' + f + '">' + inner + '</p>';
}
function embed(b, ctx) {
  const src = b.src || '';
  if (!/^https?:\/\//.test(src) || /capecodcannabis\.com/i.test(src)) return '<div class="embed-missing" data-kind="' + ctx.escAttr(b.kind || '') + '"></div>';
  /* the source iframes carry no title; none is invented (an iframe title would be declared microcopy) */
  return '<iframe' + ctx.attrs({ src, title: b.title || null, width: b.w || null, height: b.h || null, loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade', allowfullscreen: true }) + '></iframe>';
}
/** html (custom code): the sanitized markup, then every `text` line it does not already show, one element per line, with
    the model's form controls placed at their label lines (a line ending in ":" labels the next input or select; a
    button sits at the line of its label; a select at the line of its first option). Inert: nothing is wired. */
function htmlBlock(b, ctx) {
  let out = b.html ? ctx.rich(b.html) : '';
  const runs = htmlRuns(b.html);
  const ctlQueue = (b.controls || []).filter((c) => !(c.tag === 'button' && c.label && covers(runs, c.label)));
  const placed = new Set();
  const inputs = ctlQueue.filter((c) => c.tag === 'input' || c.tag === 'select' || c.tag === 'textarea');
  const ctl = (c, id) => {
    placed.add(c);
    if (c.tag === 'button') return '<button type="button" disabled>' + e(ctx, c.label || '') + '</button>';
    if (c.tag === 'select') return '<select' + ctx.attrs({ id, name: c.name || null, disabled: true }) + '>' + (c.options || []).map((o) => '<option>' + e(ctx, o.label || '') + '</option>').join('') + '</select>';
    if (c.tag === 'textarea') return '<textarea' + ctx.attrs({ id, name: c.name || null, placeholder: c.placeholder || null, disabled: true }) + '></textarea>';
    return '<input' + ctx.attrs({ id, type: c.type || 'text', name: c.name || null, placeholder: c.placeholder || null, disabled: true }) + '>';
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
  return '<div class="html">' + out + '</div>';
}
/** forms render unwired (BUILD-CONTRACT 4.6): method=post, disabled, data-sr-unwired. Field names are neutral (derived
    from the visible label; never the platform's field name) and the form's accessible name is used only when the
    source had it as one (4.16.8). Every label, option label, placeholder, aria-label and intro line is verbatim. */
function form(b, ctx) {
  const slug = (s, i) => normSp(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 4).join('-') || 'field-' + (i + 1);
  const named = (b.ariaLabels || []).includes(b.name) ? b.name : null;
  const fields = (b.fields || []).filter((f) => !(f.tag === 'button' && (!f.label || f.label === b.submit)));
  const shown = [...(b.intro || []), ...fields.flatMap((f) => [f.label, ...(f.options || []).map((o) => o.label)]), b.submit].filter(Boolean).map(normSp);
  const intro = (b.intro || []).map((p) => '<p class="intro">' + e(ctx, p) + '</p>').join('')
    + lines(b.text).filter((l) => !shown.includes(normSp(l)) && !shown.some((s) => s.includes(normSp(l)))).map((l) => '<p class="intro">' + e(ctx, l) + '</p>').join('');
  const used = new Set();
  const nm = (f, i) => { let n = slug(f.label || f.placeholder, i); while (used.has(n)) n += '-' + (i + 1); used.add(n); return n; };
  const body = fields.map((f, i) => {
    const id = uid('field');
    const name = nm(f, i);
    const common = { id, name, placeholder: f.placeholder || null, required: !!f.required, 'aria-label': f.ariaLabel || null };
    if (f.tag === 'button') return '<p><button type="button">' + e(ctx, f.label) + '</button></p>';
    if ((f.type === 'checkbox' || f.type === 'radio') && Array.isArray(f.options) && f.options.length) {
      return '<fieldset class="choice"><legend>' + e(ctx, f.label || '') + '</legend>' + f.options.map((o, k) => { const oid = id + '-' + (k + 1); return '<p><input' + ctx.attrs({ id: oid, type: f.type, name, value: o.value ?? o.label, required: !!f.required }) + '> <label for="' + oid + '">' + e(ctx, o.label || '') + '</label></p>'; }).join('') + '</fieldset>';
    }
    const lab = f.label ? '<label for="' + id + '">' + e(ctx, f.label) + '</label> ' : '';
    if (f.tag === 'textarea') return '<p>' + lab + '<textarea' + ctx.attrs(common) + '></textarea></p>';
    if (f.tag === 'select') return '<p>' + lab + '<select' + ctx.attrs({ id, name, required: !!f.required, 'aria-label': f.ariaLabel || null }) + '>' + (f.options || []).map((o) => '<option>' + e(ctx, o.label || '') + '</option>').join('') + '</select></p>';
    return '<p>' + lab + '<input' + ctx.attrs({ ...common, type: f.type || 'text' }) + '></p>';
  }).join('');
  return '<form class="form" method="post" data-sr-unwired="1"' + (named ? ' aria-label="' + ctx.escAttr(named) + '"' : '') + '><fieldset disabled>' + intro + body
    + (b.submit ? '<p><button type="submit">' + e(ctx, b.submit) + '</button></p>' : '') + '</fieldset></form>';
}
/** a Joint grid/rail: Plan B shows evidenced members only (brand pages) and a live-menu hand-off, never invented
    products. The member list is catalog-driven: marked data-catalog (4.16.2) */
function listingBlock(b, ctx) {
  const page = ctx.page;
  const params = b.params || {};
  const members = page && page.products && b.widget !== 'slider' ? page.products : null;
  const list = members && members.length ? '<ul class="product-list" data-catalog="products">' + members.map((p) => '<li>' + link(ctx, p.path, e(ctx, p.title)) + '</li>').join('') + '</ul>' : '';
  return '<section class="listing" data-widget="' + ctx.escAttr(b.widget || '') + '" data-params="' + ctx.escAttr(JSON.stringify(params)) + '">' + list
    + '<p><a data-handoff="live-menu" href="' + ctx.escAttr(ctx.live(page.path)) + '">' + STUB_LABELS.handoff + '</a></p></section>';
}

/* ---------------------------------------------------------------- pages */
/** breadcrumbs only where the source showed them (BUILD-CONTRACT 4.16.5): breadcrumbsSource 'visible'; product pages
    (Plan B requires one, 4.5) and derived pages (no source page; built from their family's pattern) keep theirs. One line,
    the source separator between the crumbs, as the source printed it. */
function breadcrumbs(page, ctx) {
  if (!page.breadcrumbs || !page.breadcrumbs.length) return '';
  const meta = pageMeta(page);
  const show = page.kind === 'product' || page.derived || meta.breadcrumbsSource === 'visible';
  if (!show) return '';
  const sep = '<span class="sep">' + e(ctx, meta.breadcrumbsSeparator || CRUMB_SEP) + '</span>';
  return '<nav class="breadcrumbs" aria-label="' + ctx.escAttr(meta.breadcrumbsLabel || CRUMB_LABEL) + '"><p>' + page.breadcrumbs.map((c) => (c.href ? link(ctx, c.href, e(ctx, c.label)) : '<span aria-current="page">' + e(ctx, c.label) + '</span>')).join(sep) + '</p></nav>';
}
/** chip source per 4.16.7: the catalog's own caption (chip.source, from chip.from 'title' | 'slug'); derived the same way
    when absent: a label found verbatim in the title is "from the product name", else it came from the URL slug */
const chipSource = (c, title) => (c.source === STUB_LABELS.fromName || c.source === STUB_LABELS.fromSlug ? c.source : String(title || '').includes(String(c.label)) ? STUB_LABELS.fromName : STUB_LABELS.fromSlug);
function productBody(page, ctx) {
  const p = page.product;
  if (!p) return '';
  const out = [];
  if (p.brand) out.push('<p class="brand"><span data-catalog="brand">' + link(ctx, p.brand.path, e(ctx, p.brand.name)) + '</span>' + (p.brand.match === 'slug-start' ? ' <small>(' + STUB_LABELS.fromSlug + ')</small>' : '') + '</p>');
  const chips = [p.size, p.strainType].filter((c) => c && c.label);
  if (chips.length) out.push('<p class="chips">' + chips.map((c) => '<span class="chip">' + e(ctx, c.label) + ' <small>(' + chipSource(c, p.title) + ')</small></span>').join(' ') + '</p>');
  if (p.full) {
    const f = p.full;
    if (f.imageHash) out.push('<img' + ctx.attrs({ src: ctx.dutchie(f.imageHash, { w: 250, h: 250 }), srcset: ctx.dutchie(f.imageHash, { w: 250, h: 250 }) + ' 1x, ' + ctx.dutchie(f.imageHash, { w: 250, h: 250, dpr: 2 }) + ' 2x', width: 250, height: 250, alt: p.title, loading: 'lazy', decoding: 'async' }) + '>');
    out.push('<ul class="description">' + (f.descriptionLines || []).map((l) => '<li>' + e(ctx, l) + '</li>').join('') + '</ul>');
    out.push('<ul class="offers">' + (f.offers || []).map((o) => '<li>' + e(ctx, o.name) + ' $' + e(ctx, o.price) + ' <small>' + STUB_LABELS.asOf + ' ' + e(ctx, f.asOf) + '</small></li>').join('') + '</ul>');
  }
  out.push('<p><a data-handoff="live-menu" href="' + ctx.escAttr(ctx.live(page.path)) + '">' + STUB_LABELS.handoff + '</a></p>');
  return '<section class="product">' + out.join('') + '</section>';
}
/** an Elementor popup section (popup: true; /about-cape-cod-cannabis/ #236015) as a dialog. The source trigger
    (data-elementor-settings of the popup doc): page load after 1 s, at most 2 times per session; stub.js reproduces it,
    after the age gate is answered. With JS off the dialog stays closed, as the source popup never opens without JS. */
function popup(s, ctx) {
  const firstHeading = (s.blocks || []).find((b) => b && !b.hiddenAll && b.t === 'heading');
  const firstImage = (s.blocks || []).find((b) => b && !b.hiddenAll && b.t === 'image' && b.alt);
  const name = firstHeading ? firstHeading.text : firstImage ? firstImage.alt : null;
  return '<dialog class="popup"' + ctx.attrs({ id: 'popup-' + (s.id || uid('p')), 'data-popup': String(s.doc || s.id || ''), 'data-trigger': 'page-load', 'data-delay': '1000', 'data-times': '2', 'data-period': 'session', 'aria-label': name }) + '>'
    + blocks(s.blocks, ctx) + '<p class="popup-close"><button type="button" data-close>' + STUB_LABELS.close + '</button></p></dialog>';
}
export function renderPage(page, ctx) {
  UID = 0;
  const main = [breadcrumbs(page, ctx)];
  const pops = [];
  for (const s of page.sections || []) {
    if (s.hiddenAll) continue;
    if (s.popup) { pops.push(popup(s, ctx)); continue; }
    main.push('<section class="section"' + (s.cssId ? ' id="' + ctx.escAttr(String(s.cssId)) + '"' : '') + (s.id ? ' data-id="' + ctx.escAttr(String(s.id)) + '"' : '') + '>' + blocks(s.blocks, ctx) + '</section>');
  }
  if (page.kind === 'product') main.push(productBody(page, ctx));
  /* a grid the page has (page.catalog) but no visible products block renders it (brand pages: the grid is built from
     the URL by the theme template, so it is in page.catalog, not in the sections) */
  const hasGrid = (page.sections || []).some((s) => !s.hiddenAll && (s.blocks || []).some((b) => b && b.t === 'products' && !b.hiddenAll));
  if (!hasGrid) for (const c of (page.catalog || []).filter((x) => !x.hiddenAll)) main.push(listingBlock({ widget: c.widget, params: c.params || c.raw || {} }, ctx));
  main.push(...pops);
  return shell(page, ctx, main.filter(Boolean).join('\n'));
}
export function render404(ctx) {
  UID = 0;
  const page = { kind: '404', title: '404', h1: '404', og: {}, twitter: {}, jsonLd: [], robots: 'noindex, follow' };
  return shell(page, ctx, '<h1>404</h1><p>' + link(ctx, '/', 'Home') + '</p>');
}
