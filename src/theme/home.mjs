// src/theme/home.mjs - the home page <main> (DESIGN-SPEC 6.9 hero, 6.10 section map, 6.11 category cards, 6.12 live
// panels and brand rails, 6.15-6.20, 5.2-5.3 protrusions; BUILD-CONTRACT 4.5, 4.17.4, 4.17.9-4.17.11).
// Owner: T1b (home). Skeleton by T0; layout by T1b, 2026-10-12. Change requests: tmp/t1b/INBOX.md.
//
// Every word comes from the home model (page.sections) or the ctx models; nothing is retyped. The only theme words are
// the declared ones: the six tile labels and their button label (transcribed from the tile images, BUILD-CONTRACT
// 4.17.10; src/content/removals.d/theme-home.json), the postcard's postmark, and the shared LABELS (parts.mjs).
// Sections are recognised by their block types (not by id), in model order; any visible block a band does not lay
// out itself is still rendered (renderBlocks), so no visible source text is dropped.
//
// Exports: renderHome(page, ctx) -> <main> inner html
import { renderBlocks, renderPopup, rich, embed } from './blocks.mjs';
import { slot, slotImg, protrusion, link, image, stars, handoff, sectionTitle, icon, LABELS } from './parts.mjs';

/* ---------------------------------------------------------------- theme words (each declared in theme-home.json) */
/* BUILD-CONTRACT 4.17.10: the six top tiles carry their text only inside the images. Each label is transcribed from
   its image (checked by eye: Affordable Ounces and Mindy's Gummies by the orchestrator; Infused Pre-Rolls,
   Disposables, Wana Gummies and Kanha Gummies by T1b on 2026-10-12), keyed by the tile's file name. */
const TILE_LABELS = [
  ['Affordable-Ounces-Homepage-Button', 'Affordable Ounces'],
  ['Infused-Pre-rolls-Homepage-Button', 'Infused Pre-Rolls'],
  ['Disposables-Homepage-Button', 'Disposables'],
  ['Wana-Gummies-Homepage-Button', 'Wana Gummies'],
  ['Mindys-Gummies-Homepage-Button', "Mindy's Gummies"],
  ['Kanha-Gummies-Homepage-Button', 'Kanha Gummies'],
];
const TILE_BUTTON = 'Learn More';            /* the button baked into every tile image (declared: home-tile-button) */
const POSTMARK = 'Wellfleet, MA 02667';      /* the postcard's decorative postmark (declared: home-postmark) */
const TOP_ART = ['H-CAT-1', 'H-CAT-2', 'H-CAT-3'];

/* ---------------------------------------------------------------- model helpers */
const vis = (list) => (list || []).filter((b) => b && !b.hiddenAll);
/** every visible block, depth first (slides, items and their blocks) */
function* walk(list) {
  for (const b of vis(list)) {
    yield b;
    for (const s of b.slides || []) yield* walk(s.blocks);
    for (const i of b.items || []) if (i && Array.isArray(i.blocks)) yield* walk(i.blocks);
  }
}
const find = (sections, pred) => { for (const s of sections) for (const b of walk(s.blocks)) if (pred(b)) return b; return null; };
const tileLabel = (b) => { const f = String((b && b.ref) || ''); const hit = TILE_LABELS.find(([k]) => f.includes(k)); return hit ? hit[1] : null; };
const isTileCarousel = (b) => b.t === 'carousel' && (b.slides || []).length > 0 && (b.slides || []).every((s) => { const v = vis(s.blocks); return v.length === 1 && v[0].t === 'image'; });
const brandFilter = (b) => (b.filters || []).find((f) => f && f.field === 'brandName');
/* a 21:9 band taller than 1265/2.33 CSS px is cover-scaled by its height: ask for the next variant at 1101px and up so
   it paints at 1.0 file px per device px or more at 1280x585@1.5 (R-48) */
const WIDE_BAND = '(min-width: 1101px) 125vw, 100vw';
const RATING_LINE = /^\s*\d\.\d \(\d+\)\s*$/;   /* the model's "4.9 (967)" line (matched, never retyped) */
const whaleTail = (cls) => '<svg class="' + cls + '" viewBox="0 0 64 40" aria-hidden="true" focusable="false"><path d="M32 39c-1.6-6.4-2.6-12-2.8-17.6C22.4 22.6 9.6 19.6 2 6.4c9.4 3.2 18.8 3.6 27 6.8.6-4.2 1.6-8.2 3-12 1.4 3.8 2.4 7.8 3 12 8.2-3.2 17.6-3.6 27-6.8-7.6 13.2-20.4 16.2-27.2 15C34.6 27 33.6 32.6 32 39z"/></svg>';

/** a section heading with exactly one accent (3.2), at the model's level; emoji headings get none (sectionTitle) */
const title = (ctx, b, accent, opts = {}) => sectionTitle(ctx, b.text, { level: b.level || 2, accent, id: opts.id, cls: opts.cls, word: opts.word, href: b.href });

/** a backdrop layer (plane 0): a slot photo inside a clipping media box, the inner layer carries the parallax.
    tag: show the "AI illustration" tag (4.17.4) for tag:true slots painted 300 CSS px wide or more */
function backdrop(ctx, id, { sizes = '100vw', parallax, tag = false, cls } = {}) {
  if (!id) return '';
  const img = slotImg(ctx, id, { alt: '', sizes, cls: 'band__img', tag: tag ? undefined : false, frameCls: 'band__frame' });
  return '<div class="' + ['band__media', cls].filter(Boolean).join(' ') + '" aria-hidden="true"><div class="band__layer"' + (parallax ? ' data-parallax="' + parallax + '"' : '') + '>' + img + '</div></div>';
}
const pools = '<div class="band__pools" aria-hidden="true"><span class="pool pool--a"></span><span class="pool pool--b"></span></div>';
const pattern = '<div class="band__pattern band__pattern--tails" aria-hidden="true"></div>';
/** one home band: <section class="band band--home band--<type>"> with plane-0 layers, then the content wrap */
function section(ctx, { cls, type, id, label, labelledby, layers = '', inner, after = '', reveal = true, dataId }) {
  return '<section' + ctx.attrs({ class: ['band', 'band--home', cls].filter(Boolean).join(' '), id: id || null, 'data-band': type, 'data-id': dataId || null, 'aria-labelledby': labelledby || null, 'aria-label': label || null, 'data-reveal': reveal ? '' : null }) + '>'
    + layers + '<div class="wrap band__in">' + inner + '</div>' + after + '</section>';
}

/* ---------------------------------------------------------------- 1. hero (6.9) */
/** the H1 in three lines (3.2): "Cape Cod" + gradient "Cannabis" / "Recreational Dispensary" / "| Wellfleet, MA" with
    the drawn underline under "Wellfleet," (the comma inside the span). The text is the model's, token by token, with
    the spaces kept between the line spans, so the H1 reads exactly as the model; any other shape renders plainly. */
function heroH1(ctx, text) {
  const t = String(text || '');
  const bar = t.indexOf(' | ');
  const head = bar > 0 ? t.slice(0, bar).split(' ') : null;
  const tail = bar > 0 ? t.slice(bar + 1).split(' ') : null;   /* ['|', 'Wellfleet,', 'MA'] */
  if (!head || head.length < 3 || !tail || tail.length < 2) return '<h1 class="h1 hero__title" id="h1">' + ctx.esc(t) + '</h1>';
  const e = (s) => ctx.esc(s);
  const l1 = head.slice(0, 2).map(e).join(' ') + ' <span class="grad">' + e(head[2]) + '</span>';
  const l2 = head.slice(3).map(e).join(' ');
  const draw = '<span class="draw">' + e(tail[1]) + '<svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M2 9 C 40 3, 90 3, 120 7 S 180 12, 198 5"/></svg></span>';
  const l3 = e(tail[0]) + ' ' + draw + (tail.length > 2 ? ' ' + tail.slice(2).map(e).join(' ') : '');
  return '<h1 class="h1 hero__title" id="h1"><span class="t1">' + l1 + '</span>' + (l2 ? ' <span class="t2">' + l2 + '</span>' : '') + ' <span class="t3">' + l3 + '</span></h1>';
}
/** the art-directed hero photo: HERO-PHONE through <source media> at 700px and below, HERO-DESKTOP otherwise (one
    request per device, never both) */
function heroPicture(ctx) {
  /* tag:false here: the art-directed <picture> needs bare <img> markup; the AI tag is placed once on the hero (hero()) */
  const wide = slotImg(ctx, 'HERO-DESKTOP', { alt: '', sizes: '100vw', loading: 'eager', fetchpriority: 'high', cls: 'hero__img', tag: false });
  const tall = slotImg(ctx, 'HERO-PHONE', { alt: '', sizes: '100vw', cls: 'hero__img', tag: false });
  const a = (re) => { const m = tall.match(re); return m ? m[1] : null; };
  const srcset = a(/\ssrcset="([^"]*)"/) || a(/\ssrc="([^"]*)"/);
  if (!/^<img\b/.test(wide) || !srcset) return wide;
  const rec = slot('HERO-PHONE') || {};
  return '<picture><source' + ctx.attrs({ media: '(max-width: 700px)', srcset, sizes: '100vw', width: rec.w || null, height: rec.h || null }) + '>' + wide + '</picture>';
}
/** the hero background video (BUILD-CONTRACT 4.21): operator-supplied aerial footage of a whale and her calf, mirrored so
    they swim beside the pane; a portrait crop for phones. Muted, inline, looping, preload none; the poster <picture>
    underneath is the first frame, so nothing jumps when the video fades in (.is-playing). */
function heroVideo(ctx) {
  return '<video class="hero__video" data-loop muted playsinline loop preload="none" width="1280" height="720">'
    + '<source media="(max-width: 700px)" src="' + ctx.asset('media/hero-whale-calf-phone.mp4') + '" type="video/mp4">'
    + '<source src="' + ctx.asset('media/hero-whale-calf.mp4') + '" type="video/mp4"></video>';
}
function hero(ctx, { h1, award, badge, ctas, sign }) {
  const pill = award ? link(ctx, award.href, icon('star', 'award__star') + '<span>' + ctx.esc(award.text) + '</span>', { class: 'award' }) : '';
  const panel = '<div class="hero__panel glass glass--hero" data-glass="light">' + pill + heroH1(ctx, h1)
    + (ctas.length ? '<div class="hero__cta">' + ctas.join('') + '</div>' : '')
    + (sign ? '<p class="hero__sign script">' + ctx.esc(sign) + '</p>' : '')
    + '</div>';   /* the floating sea glass (P1) was removed at the operator's request, 2026-10-13 */
  return '<section class="hero" data-band="stage" aria-labelledby="h1">'
    + '<div class="hero__media" aria-hidden="true"><div class="hero__layer" data-parallax=".08">' + heroPicture(ctx) + heroVideo(ctx) + '</div>'
    /* the hero photo is an AI illustration since 2026-10-13 (BUILD-CONTRACT 4.20): the visible tag (4.17.4, R-40) */
    + ((slot('HERO-DESKTOP') || {}).ai ? '<span class="ai-tag hero__ai" aria-hidden="true">' + ctx.esc(LABELS.aiTag) + '</span>' : '') + '</div>'
    + '<div class="wrap hero__in">' + panel + (badge || '') + '</div>'
    + '</section>';
}
/** the Google sign plate (6.9): the model's Google logo, rating label and "4.9 (967)" line, linked to the reviews band */
function googleBadge(ctx, logo, line) {
  if (!logo && !line) return '';
  const label = logo ? (logo.ariaLabels || []).find((l) => /Stars$/.test(l)) : null;
  const words = line ? String(line.html || '').replace(/<[^>]*>/g, '').trim() : '';
  const [n, ...rest] = words.split(' ');
  return '<a class="gbadge" href="#google-reviews"><span class="gbadge__plate">'
    + (logo ? image(logo, ctx, '96px', { cls: 'gbadge__logo' }) : '')
    + (label ? stars(ctx, label) : '')
    + (words ? '<span class="gbadge__n"><span class="gbadge__v">' + ctx.esc(n) + '</span>' + (rest.length ? ' <span class="gbadge__c">' + ctx.esc(rest.join(' ')) + '</span>' : '') + '</span>' : '')
    + '</span></a>';
}

/* ---------------------------------------------------------------- 2. Shop By Category card field (6.11, 4.17.9) */
function tiles(ctx, carousels) {
  const top = [];
  const gummies = [];
  const promo = [];
  carousels.forEach((c, ci) => {
    for (const s of c.slides || []) {
      const im = vis(s.blocks)[0];
      const lab = tileLabel(im);
      if (lab && ci === 0) top.push({ im, lab });
      else if (lab) gummies.push({ im, lab });
      else promo.push(im);
    }
  });
  const plateText = (lab) => '<p class="ccard__t">' + ctx.esc(lab) + '</p><p class="ccard__btn"><span>' + ctx.esc(TILE_BUTTON) + '</span>' + icon('arrow') + '</p>';
  const topRow = top.length ? '<ul class="ccards" role="list">' + top.map(({ im, lab }, i) => '<li class="ccard" style="--d:' + i + '">'
    + link(ctx, im.href, '<span class="ccard__media">' + slotImg(ctx, TOP_ART[i] || TOP_ART[0], { alt: '', sizes: '(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 400px', frameCls: 'ccard__frame' }) + '</span>'
      + '<div class="ccard__plate plate">' + plateText(lab) + '</div>', { class: 'ccard__link' })
    /* P4 (fan leaf on card 1) is not placed: with P1 and P2 it would put three protrusions in one 1280x585 viewport
       (DESIGN-SPEC 5.2 rule 7; measured by tmp/t1b/probe.mjs) */
    + '</li>').join('') + '</ul>' : '';
  const gumRow = gummies.length ? '<ul class="gcards" role="list">' + gummies.map(({ im, lab }, i) => '<li class="gcard surface" style="--d:' + i + '">'
    + link(ctx, im.href, '<p class="gcard__t">' + ctx.esc(lab) + '</p><p class="gcard__btn"><span>' + ctx.esc(TILE_BUTTON) + '</span>' + icon('arrow') + '</p>', { class: 'gcard__link' })
    + '</li>').join('') + '</ul>' : '';
  /* the third carousel (4.17.9): the real ad creatives, unaltered, verbatim alts and links, in glass frames, painted
     306 CSS px wide or less at 1280 */
  const promoRow = promo.length ? '<ul class="promos" role="list">' + promo.map((im, i) => '<li class="promo surface" style="--d:' + i + '">'
    + (im.href ? link(ctx, im.href, image(im, ctx, '(max-width: 700px) 44vw, 290px', { cls: 'promo__img' }), { class: 'promo__link' }) : image(im, ctx, '(max-width: 700px) 44vw, 290px', { cls: 'promo__img' }))
    + '</li>').join('') + '</ul>' : '';
  return { html: topRow + gumRow + promoRow, count: top.length + gummies.length + promo.length };
}

/* ---------------------------------------------------------------- 3. intro with the storefront postcard (5.3 P3) */
function postcard(ctx) {
  const rec = slot('POSTCARD');
  if (!rec) return '';
  const photo = slotImg(ctx, 'POSTCARD', { sizes: '(max-width: 700px) 280px, (max-width: 1279px) 360px, 440px', cls: 'postcard__img' });
  const ring = '<svg class="postcard__mark" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><defs><path id="pm-arc" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs>'
    + '<circle cx="60" cy="60" r="56"/><circle cx="60" cy="60" r="34"/><text><textPath href="#pm-arc" startOffset="2%">' + ctx.esc(POSTMARK) + '</textPath></text>'
    + '<path class="postcard__tailmark" d="M60 78c-.8-3.2-1.3-6-1.4-8.8-3.4.6-9.8-.9-13.6-7.5 4.7 1.6 9.4 1.8 13.5 3.4.3-2.1.8-4.1 1.5-6 .7 1.9 1.2 3.9 1.5 6 4.1-1.6 8.8-1.8 13.5-3.4-3.8 6.6-10.2 8.1-13.6 7.5-.1 2.8-.6 5.6-1.4 8.8z"/></svg>';
  void ring; /* calm revision: the postmark and tape are not drawn */
  return '<figure class="postcard postcard--calm">' + photo + '</figure>';
}

/* ---------------------------------------------------------------- 6.12a live-menu panel */
function livePanel(ctx, page, headB, prod, shopMenu, { smoke, cut }) {
  const id = 'h-' + (prod.label || headB.text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const head = headB ? title(ctx, headB, smoke ? 'grad' : 'draw', { id }) : '';
  /* two labels, two block elements (README 6: inline neighbours read as one run) */
  const go = '<div class="live__go"><p>' + handoff(ctx, page.path, { cls: 'btn ' + (smoke ? 'btn--sky' : 'btn--ink') + ' btn--lg handoff' }) + '</p>'
    + (shopMenu ? '<p>' + link(ctx, shopMenu.href, ctx.esc(shopMenu.label) + icon('arrow'), { class: 'btn ' + (smoke ? 'btn--ghost btn--onDark' : 'btn--ghost') }) + '</p>' : '') + '</div>';
  const panel = '<div class="live surface">' + head + go + '</div>';
  return { id, html: '<div class="live-wrap">' + panel + '' + '</div>' };
}

/* ---------------------------------------------------------------- 6.12b brand rail (catalog-evidenced members) */
function brandRail(ctx, headB, prod, accent) {
  const f = brandFilter(prod);
  const want = new Set((f.values || []).map((v) => String(v).toLowerCase()));
  const members = ((ctx.catalog && ctx.catalog.products) || []).filter((p) => p && p.brand && want.has(String(p.brand.name || '').toLowerCase()));
  const id = 'h-' + (headB ? headB.text : prod.label || 'rail').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const head = headB ? title(ctx, headB, accent, { id }) : '';
  if (!members.length) return { id, html: head + '<p class="live__go">' + handoff(ctx, ctx.page.path) + '</p>' };
  const lv = Math.min(6, (+(headB && headB.level) || 3) + 1);
  const cards = members.map((p, i) => '<li class="pcard surface" style="--d:' + Math.min(i, 5) + '">'
    + '<p class="pcard__brand" data-catalog="brand">' + link(ctx, p.brand.path, ctx.esc(p.brand.name)) + '</p>'
    + '<h' + lv + ' class="pcard__t" data-catalog="title">' + link(ctx, p.path, ctx.esc(p.title)) + '</h' + lv + '>'
    + '<p class="pcard__go">' + handoff(ctx, p.path, { cls: 'btn btn--ink btn--sm handoff' }) + '</p></li>').join('');
  return { id, html: '<div class="rail-head">' + head + '</div><div class="rail" data-rail tabindex="0" role="region" aria-labelledby="' + id + '"><ul class="rail__list" role="list">' + cards + '</ul></div>' };
}

/* ---------------------------------------------------------------- 6.15-6.17 reviews, feature points, VIP */
function reviewCards(ctx, rb) {
  return '<ul class="rev__list" role="list">' + (rb.items || []).map((r) => {
    const ini = String(r.author || '').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return '<li class="review surface">'
      + '<span class="review__av" aria-hidden="true" data-initials="' + ctx.escAttr(ini) + '"></span>'
      + (r.author ? '<p class="review__author">' + ctx.esc(r.author) + '</p>' : '')
      + (r.time ? '<p class="review__time">' + ctx.esc(r.time) + '</p>' : '')
      + (r.rating || r.ratingLabel ? '<p class="review__rating">' + (r.ratingLabel ? stars(ctx, r.ratingLabel) : '') + (r.rating ? '<span class="value">' + ctx.esc(r.rating) + '</span>' : '') + '</p>' : '')
      + String(r.text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => '<p class="review__text">' + ctx.esc(l) + '</p>').join('')
      + '</li>';
  }).join('') + '</ul>';
}
/** the slide blocks laid out by the band; anything not recognised is rendered as is */
function reviewsBand(ctx, s, extras) {
  const bs = vis(s.blocks);
  const awardImg = bs.find((b) => b.t === 'image');
  const thanks = bs.find((b) => b.t === 'heading');
  const car = bs.find((b) => b.t === 'carousel');
  const others = bs.filter((b) => b !== awardImg && b !== thanks && b !== car);
  const slides = car ? (car.slides || []).map((x) => vis(x.blocks)) : [];
  const revSlide = slides.find((x) => x.some((b) => b.t === 'reviews'));
  const vipSlide = slides.find((x) => x !== revSlide && x.some((b) => b.t === 'button'));
  const featSlides = slides.filter((x) => x !== revSlide && x !== vipSlide);
  let revTitleId = null;
  /* Google Reviews: a smoked intro pane, the review cards, the award with "Thank you Cape Cod!" */
  let intro = '';
  let list = '';
  if (revSlide) {
    const parts = [];
    for (let k = 0; k < revSlide.length; k++) {
      const b = revSlide[k];
      if (b.t === 'heading' && +b.level <= 3 && !revTitleId) { revTitleId = 'h-google-reviews'; parts.push(title(ctx, b, 'draw', { id: revTitleId })); continue; }
      if (b.t === 'heading') { const lv = Math.min(6, +b.level || 5); parts.push('<h' + lv + ' class="rev__sub">' + ctx.esc(b.text) + '</h' + lv + '>'); continue; }
      if (b.t === 'reviews') { list = reviewCards(ctx, b); continue; }
      if (b.t === 'image' && (b.ariaLabels || []).some((l) => /Stars$/.test(l))) {
        /* the Google logo, its rating label and the "4.9 (967)" line that follows it, as one score row */
        const nx = revSlide[k + 1];
        const line = nx && nx.t === 'rich' && RATING_LINE.test(String(nx.html || '').replace(/<[^>]*>/g, '')) ? nx : null;
        if (line) k++;
        parts.push('<div class="rev__score">' + image(b, ctx, '96px', { cls: 'rev__logo' }) + b.ariaLabels.filter((l) => /Stars$/.test(l)).map((l) => stars(ctx, l)).join('')
          + (line ? '<p class="rev__line">' + rich(ctx, line.html) + '</p>' : '') + '</div>');
        continue;
      }
      parts.push(renderBlocks([b], ctx));
    }
    parts.push('<p class="snapshot fine">' + LABELS.asOf + ' ' + ctx.esc(ctx.snapshotDate) + '</p>');
    intro = '<div class="rev__intro">' + parts.join('') + '</div>';
  }
  const award = (awardImg || thanks) ? '<div class="rev__award">' + (thanks ? '<h' + Math.min(6, +thanks.level || 4) + ' class="rev__thanks script">' + ctx.esc(thanks.text) + '</h' + Math.min(6, +thanks.level || 4) + '>' : '')
    + (awardImg ? '<figure class="rev__fig">' + (slot('AWARD') ? slotImg(ctx, 'AWARD', { alt: awardImg.alt == null ? '' : awardImg.alt, sizes: '(max-width: 700px) 46vw, 200px', cls: 'rev__awardimg' }) : image(awardImg, ctx, '200px')) + '</figure>' : '') + '</div>' : '';
  /* the four feature points: smoked tiles (6.16), each heading with its text */
  const feats = featSlides.map((x) => {
    const tiles = [];
    let cur = null;
    for (const b of x) {
      if (b.t === 'heading') { cur = [b]; tiles.push(cur); } else if (cur) cur.push(b); else tiles.push([b]);
    }
    return '<ul class="feats" role="list">' + tiles.map((t, i) => '<li class="feat" style="--d:' + i + '">' + t.map((b) => (b.t === 'heading' ? '<h' + Math.min(6, +b.level || 2) + ' class="feat__h">' + ctx.esc(b.text) + '</h' + Math.min(6, +b.level || 2) + '>' : renderBlocks([b], ctx))).join('') + '</li>').join('') + '</ul>';
  }).join('');
  const reviewsHtml = section(ctx, {
    cls: 'band--reviews band--deep', type: 'deep', id: 'google-reviews', labelledby: revTitleId, dataId: s.id,
    inner: '<div class="rev">' + award + intro + list + '</div>' + feats + (others.length ? renderBlocks(others, ctx) : ''),
  });
  /* the VIP band (6.17): a light pane over the whale-tail pattern, P6 across its top edge; the CCC note is the
     model's own sentence (the FAQ answer), set as fine print under the copy (graft 13) */
  let vipHtml = '';
  if (vipSlide) {
    let tId = null;
    const parts = vipSlide.map((b) => {
      if (b.t === 'heading' && !tId) { tId = 'h-vip'; return title(ctx, b, 'grad', { id: tId }); }
      if (b.t === 'heading') return title(ctx, b, 'italic', { cls: 'vip__h2' });
      if (b.t === 'image') return '<figure class="vip__banner">' + image(b, ctx, '(max-width: 700px) 92vw, 820px') + '</figure>';
      if (b.t === 'button') return b.label ? '<p class="vip__go">' + link(ctx, b.href, ctx.esc(b.label) + icon('arrow'), { class: 'btn btn--ink btn--lg' }) + '</p>' : '';
      return renderBlocks([b], ctx);
    }).join('');
    vipHtml = section(ctx, {
      cls: 'band--vip band--g-foam', type: 'calm', labelledby: tId,
      inner: '<div class="vip-wrap"><div class="vip surface">' + parts + (extras.note ? '<div class="vip__note fine rich">' + extras.note + '</div>' : '') + '</div>'
        + '</div>',
    });
  }
  return reviewsHtml + vipHtml;
}

/* ---------------------------------------------------------------- the page */
/** <main> inner html for the home page */
export function renderHome(page, ctx) {
  const secs = (page.sections || []).filter((s) => s && !s.hiddenAll && !s.popup);
  const popups = (page.sections || []).filter((s) => s && !s.hiddenAll && s.popup);
  const h1i = secs.findIndex((s) => vis(s.blocks).some((b) => b.t === 'heading' && +b.level === 1));
  if (h1i < 0) throw new Error('home: no level-1 heading in the model');
  const pre = secs.slice(0, h1i);
  const h1Sec = secs[h1i];
  const post = secs.slice(h1i + 1);
  const h1Block = vis(h1Sec.blocks).find((b) => b.t === 'heading' && +b.level === 1);

  /* model blocks the hero borrows (verbatim): the award line, the Google logo and rating, the two closing CTAs */
  const banners = pre.flatMap((s) => vis(s.blocks).filter((b) => b.t === 'image'));
  const carousels = pre.flatMap((s) => vis(s.blocks).filter(isTileCarousel));
  const preOther = pre.flatMap((s) => vis(s.blocks).filter((b) => b.t !== 'image' && !isTileCarousel(b)));
  const awardLine = find(secs, (b) => b.t === 'heading' && /Choice Awards/.test(String(b.text)) && / \| /.test(String(b.text)));
  const awardHref = (banners.find((b) => b.href) || {}).href || null;
  const gLogo = find(secs, (b) => b.t === 'image' && (b.ariaLabels || []).some((l) => /Stars$/.test(l)));
  const gLine = find(secs, (b) => b.t === 'rich' && RATING_LINE.test(String(b.html || '').replace(/<[^>]*>/g, '')));
  const closer = post.find((s) => { const v = vis(s.blocks); return v.length >= 2 && v.every((b) => b.t === 'button'); });
  const closerBtns = closer ? vis(closer.blocks) : [];
  const shopMenu = closerBtns[0] || null;
  const ctaHtml = closerBtns.slice(0, 2).map((b, i) => link(ctx, b.href, ctx.esc(b.label) + (i === 0 ? icon('arrow') : ''), { class: 'btn btn--lg ' + (i === 0 ? 'btn--ink' : 'btn--white') }));
  const note = (() => {
    for (const s of secs) for (const b of walk(s.blocks)) if (b.t === 'rich') { const m = String(b.html || '').match(/<p>(?:(?!<\/p>)[\s\S])*Cannabis Control Commission(?:(?!<\/p>)[\s\S])*<\/p>/); if (m) return rich(ctx, m[0]); }
    return '';
  })();

  const out = [];
  out.push(hero(ctx, {
    h1: h1Block.text,
    award: awardLine && awardHref ? { text: awardLine.text, href: awardHref } : null,
    badge: '',   /* the Google plate was removed from the hero at the operator's request, 2026-10-13; the rating stays in the reviews band */
    ctas: ctaHtml,
    sign: ctx.site && ctx.site.tagline,
  }));

  /* 2. the category card field over the sea-glass shallows (H-BAND-1; foam and pools on phones) */
  if (carousels.length || preOther.length) {
    const t = tiles(ctx, carousels);
    out.push(section(ctx, {
      cls: 'band--cats band--g-foam', type: 'card-field', label: null, dataId: pre[pre.length - 1] && pre[pre.length - 1].id,
      inner: t.html + (preOther.length ? renderBlocks(preOther, ctx) : ''),
    }));
  }

  /* 3. the intro: the gold award banner and the model's intro copy on a light pane over the whale-tail pattern */
  const introBlocks = vis(h1Sec.blocks).filter((b) => b !== h1Block);
  out.push(section(ctx, {
    cls: 'band--intro band--g-white', type: 'calm', label: null, dataId: h1Sec.id,
    inner: postcard(ctx) + '<div class="intro">'
      + banners.map((b) => '<figure class="intro__banner">' + (b.href ? link(ctx, b.href, image(b, ctx, '(max-width: 700px) 92vw, 660px'), { class: 'intro__bannerlink' }) : image(b, ctx, '(max-width: 700px) 92vw, 660px')) + '</figure>').join('')
      + '<div class="intro__copy">' + renderBlocks(introBlocks, ctx) + '</div></div>',
  }));

  /* the rest, in model order. Calm revision: section grounds alternate white and foam (the offers band is the sky
     tint, the reviews band the one solid harbour band) */
  let gN = 0;
  const ground = () => (gN++ % 2 === 0 ? 'band--g-white' : 'band--g-foam');
  let liveN = 0;
  let railN = 0;
  for (let i = 0; i < post.length; i++) {
    const s = post[i];
    const bs = vis(s.blocks);
    if (!bs.length || s === closer) continue;
    const headOnly = bs.length === 1 && bs[0].t === 'heading';
    const next = post[i + 1] ? vis(post[i + 1].blocks) : [];
    /* 4. Featured Bundles & Offers: smoked text cards over deep water (6.10 row 4; R-39) */
    if (headOnly && next.some((b) => b.t === 'posts')) {
      const postsB = next.find((b) => b.t === 'posts');
      const after = post[i + 2] ? vis(post[i + 2].blocks) : [];
      const more = after.length && after.every((b) => b.t === 'button') && post[i + 2] !== closer ? after : [];
      const nextOther = next.filter((b) => b !== postsB);
      const tId = 'h-offers';
      const cards = (postsB.items || []).map((it, k) => {
        const v = vis(it.blocks);
        const h = v.find((b) => b.t === 'heading');
        const r = v.find((b) => b.t === 'rich');
        const btn = v.find((b) => b.t === 'button');
        const rest = v.filter((b) => b !== h && b !== r && b !== btn && b.t !== 'image');
        const hl = Math.min(6, +(h && h.level) || 3);
        return '<li class="ocard surface" style="--d:' + Math.min(k, 5) + '">'
          + (h ? '<h' + hl + ' class="ocard__t">' + (h.href || it.href ? link(ctx, h.href || it.href, ctx.esc(h.text)) : ctx.esc(h.text)) + '</h' + hl + '>' : '')
          + (r ? '<div class="ocard__x">' + rich(ctx, r.html) + '</div>' : '')
          + (rest.length ? renderBlocks(rest, ctx) : '')
          + (btn && btn.label ? '<p class="ocard__more">' + (btn.href ? link(ctx, btn.href, ctx.esc(btn.label) + icon('arrow')) : ctx.esc(btn.label)) + '</p>' : '')
          + '</li>';
      }).join('');
      out.push(section(ctx, {
        cls: 'band--offers band--g-sky', type: 'calm', labelledby: tId, dataId: s.id,
        /* INTEGRATOR 2026-10-12 (R-11): the deep-water photo has its sun glints only in its right half, so the smoked
           cards on the left had a flat backdrop (range 0.037-0.069 at 1280x585@1.5). A mirrored copy of the same file,
           blended with lighten (home.css .band__media--glint), puts glints behind every card; same URL, no extra bytes. */
        inner: '<div class="rail-head">' + title(ctx, bs[0], 'grad', { id: tId }) + '</div>'
          + '<div class="rail rail--offers" data-rail tabindex="0" role="region" aria-labelledby="' + tId + '"><ul class="rail__list" role="list">' + cards + '</ul></div>'
          + (nextOther.length ? renderBlocks(nextOther, ctx) : '')
          + (more.length ? '<p class="offers__more">' + more.map((b) => link(ctx, b.href, ctx.esc(b.label) + icon('arrow'), { class: 'btn btn--ink' })).join(' ') + '</p>' : ''),
      }));
      i += more.length ? 2 : 1;
      continue;
    }
    const prod = bs.find((b) => b.t === 'products');
    const headB = bs.find((b) => b.t === 'heading');
    const otherOf = (...used) => bs.filter((b) => !used.includes(b));
    /* 6.12b: brand rails over a photo band (H-BAND-3, H-BAND-4) */
    if (prod && brandFilter(prod)) {
      railN++;
      const r = brandRail(ctx, headB, prod, railN === 1 ? 'draw' : 'grad');
      const other = otherOf(prod, headB);
      out.push(section(ctx, {
        cls: 'band--rail ' + ground(), type: 'rail', labelledby: r.id, dataId: s.id,
        inner: r.html + (other.length ? renderBlocks(other, ctx) : ''),
      }));
      continue;
    }
    /* 6.12a: live-menu panels (Product Spotlight over dune grass; Affordable Ounces over the whale-fluke loop) */
    if (prod) {
      const first = liveN++ === 0;
      const p = livePanel(ctx, page, headB, prod, shopMenu, { smoke: false, cut: null });
      const other = otherOf(prod, headB);
      let layers;
      let media = '';
      if (!first) {
        /* 4.17.11: the whale-fluke loop, poster first (a lazy image under the video); site.js plays it near the
           viewport, pauses it off-screen, and never plays it under reduced motion or Save-Data (data-loop) */
        const poster = slotImg(ctx, 'LOOP-FLUKE-POSTER', { alt: '', sizes: '(max-width: 700px) 92vw, 1000px', cls: 'loop__poster' });
        media = '<div class="loop-frame" aria-hidden="true">' + poster
          + '<video class="loop__video" data-loop data-ai muted playsinline loop preload="none" width="1920" height="640">'
          + '<source src="' + ctx.asset('generated/video/whale-fluke-loop.webm') + '" type="video/webm">'
          + '<source src="' + ctx.asset('generated/video/whale-fluke-loop.mp4') + '" type="video/mp4"></video></div>';
      }
      out.push(section(ctx, {
        cls: 'band--live' + (first ? '' : ' band--loop') + ' ' + ground(), type: 'live-panel', labelledby: p.id, dataId: s.id,
        inner: '<div class="live-split">' + p.html + media + '</div>' + (other.length ? renderBlocks(other, ctx) : ''),
      }));
      continue;
    }
    /* 6.23 Brand Spotlight: the logos on white plates (flat band 1 of 2: foam and pools) */
    const gal = bs.find((b) => b.t === 'gallery');
    if (gal) {
      const tId = 'h-brands';
      const items = (gal.items || []).map((it, k) => {
        const img = it.image ? image(it.image, ctx, '(max-width: 700px) 88px, 120px', { cls: 'logo__img' }) : '';
        const txt = it.title ? '<span class="logo__name">' + ctx.esc(it.title) + '</span>' : '';
        const href = it.href || (it.image && it.image.href) || null;
        return '<li class="logo" style="--d:' + Math.min(k, 7) + '">' + (href ? link(ctx, href, '<span class="logo__plate">' + img + '</span>' + txt, { class: 'logo__link' }) : '<span class="logo__plate">' + img + '</span>' + txt) + '</li>';
      }).join('');
      const other = otherOf(gal, headB);
      out.push(section(ctx, {
        cls: 'band--logos ' + ground(), type: 'logo-strip', labelledby: headB ? tId : null, dataId: s.id,
        inner: (headB ? title(ctx, headB, 'italic', { id: tId }) : '') + '<ul class="logos" role="list">' + items + '</ul>' + (other.length ? renderBlocks(other, ctx) : ''),
      }));
      continue;
    }
    /* 6.15-6.17: the reviews carousel becomes the reviews band and the VIP band */
    if (bs.some((b) => b.t === 'carousel' && (b.slides || []).some((x) => vis(x.blocks).some((y) => y.t === 'reviews')))) {
      out.push(reviewsBand(ctx, s, { note }));
      continue;
    }
    /* 6.20: the visit band, the model's click-to-load map on the storefront photo (P8 at its bottom edge) */
    const emb = bs.find((b) => b.t === 'embed');
    if (emb && bs.length === 1) {
      out.push(section(ctx, {
        cls: 'band--visit ' + ground(), type: 'calm', label: null, dataId: s.id,
        inner: '<div class="visit-split"><figure class="visit__photo">' + slotImg(ctx, 'VISIT-BAND', { alt: '', sizes: '(max-width: 900px) 92vw, 560px', cls: 'visit__img' }) + '</figure>'
          + '<div class="visit surface"><div class="visit__map">' + embed(emb, ctx) + '</div></div></div>',
      }));
      continue;
    }
    /* 6.18: "Learn More About Cape Cod Cannabis" and the three accordions that follow it (pattern band) */
    if (headB && bs[0] === headB && bs.every((b) => b.t === 'heading' || b.t === 'rich')) {
      const faqs = [];
      while (post[i + 1] && post[i + 1] !== closer && vis(post[i + 1].blocks).length && vis(post[i + 1].blocks).every((b) => b.t === 'faq')) faqs.push(...vis(post[++i].blocks));
      const tId = 'h-learn';
      out.push(section(ctx, {
        cls: 'band--learn ' + ground(), type: 'calm', labelledby: tId, dataId: s.id,
        inner: '<div class="learn surface">' + title(ctx, headB, 'italic', { id: tId }) + renderBlocks(otherOf(headB), ctx) + renderBlocks(faqs, ctx) + '</div>',
      }));
      continue;
    }
    /* anything else: rendered as is on a plain band */
    out.push(section(ctx, { cls: 'band--plain ' + ground(), type: 'plain', dataId: s.id, inner: renderBlocks(bs, ctx) }));
  }

  /* 15. the closer: the model's two buttons on foam (flat band 2 of 2) */
  if (closer) {
    out.push(section(ctx, {
      cls: 'band--closer ' + ground(), type: 'closer', dataId: closer.id, label: null,
      inner: '<p class="closer">' + closerBtns.map((b, i) => link(ctx, b.href, ctx.esc(b.label) + (i === 0 ? icon('arrow') : ''), { class: 'btn btn--lg ' + (i === 0 ? 'btn--ink' : 'btn--ghost') })).join(' ') + '</p>',
    }));
  }
  /* popups (none on the home model today) keep the shared renderer */
  for (const s of popups) out.push(renderPopup(s, ctx));
  return out.join('\n');
}
