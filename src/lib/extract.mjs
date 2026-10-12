// extract.mjs - production content extractor: audit/raw/*.html -> src/content/pages/<slug>.json + chrome.json.
// Owner: PIPELINE-CONTENT. Node builtins only, deterministic, no network.
//
//   node src/lib/extract.mjs              all ok HTML pages in audit/site-inventory.json
//   node src/lib/extract.mjs --only a,b   only these slugs (debug; does NOT rewrite _index.json)
//   node src/lib/extract.mjs --report     also print the per-page ledger summary
//   node src/lib/extract.mjs --out <dir>  dry run: write pages, chrome.json and _index.json into <dir> (H2 change)
//
// Spec: docs/BUILD-CONTRACT.md 3.3 (page shape) + 4.x, docs/CONTENT-MODEL.md (block types, device rule).
// Schema and rules as implemented: docs/PIPELINE-CONTENT.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parse, findAll, findFirst, cls, hasCls, elChildren, isEl, textOf, squash, decode, esc, sanitizeRich, richText,
  stableJson, isAncestor,
} from './html-util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const WS = path.resolve(HERE, '../..');
const RAW = path.join(WS, 'audit/raw');
const OUT = path.join(WS, 'src/content/pages');
const ORIGIN = 'https://capecodcannabis.com';
const HOSTS = new Set(['capecodcannabis.com', 'www.capecodcannabis.com']);
// The five views of docs/CONTENT-MODEL.md section 1. tablet_extra (a 1px band at 1026px) is ignored, so an element
// visible only there counts as hidden on every device.
export const VIEWS = ['widescreen', 'desktop', 'tablet', 'mobile_extra', 'mobile'];
const SCHEMA = 'ccc-reforge/page@1';

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(WS, rel), 'utf8'));
const parseJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };
const pick = (o, ks) => { const r = {}; for (const k of ks) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') r[k] = o[k]; return Object.keys(r).length ? r : undefined; };
const T = (n) => squash(textOf(n));
const nonEmpty = (a) => (a && a.length ? a : undefined);

// ---------------------------------------------------------------- site context (inventory, routes, images)
export function loadContext() {
  const inv = readJson('audit/site-inventory.json');
  const ia = readJson('audit/understand/ia-map.json');
  const imgInv = readJson('audit/image-inventory.json');
  const routeByUrl = new Map();
  const routeByPath = new Map();
  for (const r of ia.routes) {
    routeByUrl.set(r.url, r);
    if (r.path && !routeByPath.has(r.path)) routeByPath.set(r.path, r);
  }
  // alias: source path (no trailing slash, as requested) -> output path
  const alias = new Map();
  const addAlias = (fromUrl, toPath) => {
    let p;
    try { p = new URL(fromUrl).pathname; } catch { return; }
    const k = p.replace(/\/+$/, '') || '/';
    if (!alias.has(k)) alias.set(k, toPath);
  };
  for (const p of inv.pages) {
    if (!p.ok || !p.finalUrl) continue;
    let fp;
    try { fp = new URL(p.finalUrl).pathname; } catch { continue; }
    const out = withSlash(fp);
    for (const a of p.aliases || []) addAlias(a, out);
    for (const h of p.redirectChain || []) { try { if (HOSTS.has(new URL(h.to).host)) addAlias(h.from, withSlash(new URL(h.to).pathname)); } catch { /* ignore */ } }
  }
  for (const r of ia.routes) if (r.redirectTo) addAlias(r.url, withSlash(r.redirectTo));
  // case variants (route note "case variant; live canonical is /categories/cbd/")
  const caseVariant = new Map();
  for (const r of ia.routes) {
    const m = /case variant; live canonical is (\/\S+\/)/.exec(r.note || '');
    if (m && r.template !== 'non-html' && !/\.[a-z0-9]{2,5}\/$/i.test(m[1])) { caseVariant.set(r.path, m[1]); addAlias(r.url, m[1]); }
  }
  const dead = new Set(ia.deadLinks.map((d) => withSlash(new URL(d.url).pathname)));
  // every route by its path key (no trailing slash), including 403 rows whose path is null
  const routeByKey = new Map();
  for (const r of ia.routes) { try { const u = new URL(r.url); if (u.search) continue; const k = u.pathname.replace(/\/+$/, '') || '/'; if (!routeByKey.has(k)) routeByKey.set(k, r); } catch { /* ignore */ } }
  // images: decoded src -> record
  const imgByUrl = new Map();
  const imgByBase = new Map();
  for (const im of imgInv.images) {
    imgByUrl.set(im.src, im);
    const base = im.src.split('?')[0];
    const prev = imgByBase.get(base);
    if (!prev || (!prev.localFile && im.localFile)) imgByBase.set(base, im);
  }
  return { inv, ia, routeByUrl, routeByPath, routeByKey, alias, caseVariant, dead, imgByUrl, imgByBase, outputPaths: new Set() };
}
function withSlash(p) {
  if (!p) return '/';
  if (/\.[a-z0-9]{2,5}$/i.test(p)) return p; // a file (pdf, txt, kml, xml, images) keeps its exact path
  return p.endsWith('/') ? p : p + '/';
}

// ---------------------------------------------------------------- links
// Returns { href, status } where status is one of: page | route | dead | unknown | alias->page | external | anchor | scheme
export function makeLinker(S, pagePath, ledger) {
  return function link(raw) {
    if (raw == null) return { href: null };
    const h = String(raw).trim();
    if (!h) return { href: h, status: 'empty' };
    if (h.startsWith('#')) return { href: h, status: 'anchor' };
    if (/^(mailto|tel|sms|javascript|data):/i.test(h)) return { href: h, status: 'scheme' };
    let u;
    try { u = new URL(h, ORIGIN + (pagePath || '/')); } catch { return { href: h, status: 'unparsed' }; }
    if (!HOSTS.has(u.host)) return { href: h, status: 'external' };
    let p = u.pathname;
    const key = p.replace(/\/+$/, '') || '/';
    let via = null;
    if (S.alias.has(key)) { via = 'alias'; p = S.alias.get(key); }
    p = withSlash(p);
    // lower-case percent-encoding hex as the route map stores it
    p = p.replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase());
    const href = p + (u.search || '') + (u.hash || '');
    let status;
    if (S.dead.has(p)) status = 'dead';
    else if (S.outputPaths.has(p)) status = 'page';
    else if (S.routeByPath.has(p)) status = 'route';
    else if (S.routeByKey.has(p.replace(/\/+$/, '') || '/')) { const r = S.routeByKey.get(p.replace(/\/+$/, '') || '/'); status = r.status === 403 ? 'blocked' : r.status === 404 ? 'dead' : 'route'; }
    else status = 'unknown';
    if (ledger) {
      if (status === 'dead' || status === 'unknown' || status === 'blocked') ledger.links.push({ href, from: h, status });
      if (via) ledger.aliasesResolved.push({ from: h, to: href });
    }
    return { href, status, via };
  };
}

// ---------------------------------------------------------------- images
const lazySrc = (img) => {
  const a = img.attrs;
  for (const k of ['data-src', 'data-lazy-src', 'data-orig-src', 'data-original', 'src']) if (a[k] && !a[k].startsWith('data:')) return a[k];
  return null;
};
const srcsetOf = (img) => String(img.attrs['data-srcset'] || img.attrs.srcset || '').split(/,\s+(?=https?:|\/)/).map((c) => {
  const m = /^\s*(\S+)\s+(\d+)w\s*$/.exec(c);
  return m ? { url: decode(m[1]), w: +m[2] } : null;
}).filter(Boolean);
export function makeImager(S, ledger) {
  const lookup = (url) => {
    if (!url) return null;
    let u = decode(url).trim();
    if (u.startsWith('//')) u = 'https:' + u;
    return S.imgByUrl.get(u) || S.imgByUrl.get(u.replace(/([?&])size=\d+x\d+&?/, '$1').replace(/[?&]$/, '')) || S.imgByBase.get(u.split('?')[0]) || null;
  };
  return function image(src, extraCandidates = []) {
    const rec = lookup(src);
    const out = { ref: rec && rec.localFile ? rec.localFile : null, srcUrl: src || null };
    if (src && /\/elementor\/assets\/images\/placeholder\.png/.test(src)) {
      // an empty Elementor image widget prints the plugin's placeholder: not content, never render it
      out.ref = null;
      out.missing = 'platform-placeholder';
      if (ledger) ledger.imagesMissing.push({ srcUrl: src, missing: out.missing });
      return out;
    }
    if (!out.ref) {
      out.missing = !src ? 'no-src' : rec ? (rec.downloadError ? 'download-failed' : 'no-local-file') : 'not-inventoried';
      if (ledger) ledger.imagesMissing.push({ srcUrl: src || null, missing: out.missing });
    }
    // a larger local master from the srcset, when one exists
    let best = null;
    for (const c of extraCandidates) {
      const r = lookup(c.url);
      if (r && r.localFile && r.localFile !== out.ref && (!best || c.w > best.w)) best = { ref: r.localFile, w: c.w, iw: r.intrinsicWidth || null };
    }
    if (best && rec && rec.intrinsicWidth && best.iw && best.iw > rec.intrinsicWidth) out.master = best.ref;
    else if (best && !out.ref) out.master = best.ref;
    return out;
  };
}

// ---------------------------------------------------------------- device visibility
export function visibleViews(n) {
  const hid = new Set();
  for (let x = n; x; x = x.parent) for (const c of cls(x)) { const m = /^elementor-hidden-([a-z_]+)$/.exec(c); if (m) hid.add(m[1]); }
  return VIEWS.filter((v) => !hid.has(v));
}
const isDisplayNone = (n) => isEl(n) && /display\s*:\s*none/i.test(n.attrs.style || '');
// only the spinner image is a platform asset; the view loader's live-region text ("1 event found.") is kept as copy
const isPlatformUi = (n) => isEl(n) && hasCls(n, 'tribe-events-ajax-loading');
// background image of an element: lazy data-bg-image="url('...')" (31 in the crawl: CTA tiles, media-carousel slides),
// data-bg / data-background, or an inline style url(...); 'inherit' placeholders are ignored
const bgUrlOf = (n) => {
  if (!n) return null;
  for (const v of [n.attrs['data-bg-image'], n.attrs['data-bg'], n.attrs['data-background'], n.attrs.style]) {
    const m = /url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(v || '');
    if (m) return m[1];
    if (v && /^https?:/.test(v)) return v;
  }
  return null;
};

// ---------------------------------------------------------------- widget -> blocks
const widgetBody = (w) => elChildren(w).find((c) => hasCls(c, 'elementor-widget-container')) || w;
const firstHref = (n) => { if (!n) return null; const a = n.tag === 'a' && n.attrs.href ? n : findFirst(n, (x) => x.tag === 'a' && x.attrs.href); return a ? a.attrs.href : null; };
function findOwn(w, pred) {
  const out = [];
  const rec = (n) => { for (const c of n.children || []) { if (!isEl(c)) continue; if (pred(c)) out.push(c); if (c.attrs['data-widget_type'] && c !== w) continue; rec(c); } };
  rec(w);
  return out;
}

function makeBlocks(ctx) {
  const L = (h) => ctx.link(h);
  const href = (h) => { const r = L(h); return r.href; };
  const hrefFields = (h) => {
    if (h == null) return {};
    const r = L(h);
    const o = { href: r.href };
    if (r.status === 'dead') o.hrefStatus = 'dead';
    if (r.status === 'anchor' && ctx.ids && h.length > 1 && !ctx.ids.has(decodeURIComponent(h.slice(1)))) o.hrefStatus = 'dead-anchor';
    if (ctx.keepSourceHref && r.href !== h) o.sourceHref = h;
    return o;
  };
  const rich = (nodes) => {
    const h1 = nodes.some((n) => isEl(n) && (n.tag === 'h1' || findFirst(n, (x) => x.tag === 'h1')));
    if (h1) ctx.ledger.h1InRich++;
    return sanitizeRich(nodes, {
      skip: (x) => { if (isPlatformUi(x)) { ctx.notePlatform(x); return true; } return isDisplayNone(x); },
      link: (a) => { const r = L(a.href); return { href: r.href, extra: r.status === 'dead' ? { 'data-link': 'dead' } : undefined }; },
      img: (x) => {
        const src = lazySrc(x);
        const im = ctx.image(src, srcsetOf(x));
        return { src: im.ref || '', alt: x.attrs.alt == null ? null : x.attrs.alt, width: x.attrs.width, height: x.attrs.height, title: x.attrs.title,
          extra: { 'data-source-url': im.srcUrl || undefined, 'data-master': im.master, 'data-missing': im.missing } };
      },
    });
  };
  const imageBlock = (img, extra = {}) => {
    const a = img.attrs;
    const src = lazySrc(img);
    const im = ctx.image(src, srcsetOf(img));
    const link = img.parent && img.parent.tag === 'a' ? img.parent : null;
    return { t: 'image', ref: im.ref, srcUrl: im.srcUrl, master: im.master, missing: im.missing, alt: a.alt == null ? null : a.alt,
      titleAttr: a.title || undefined, w: a.width ? +a.width || undefined : undefined, h: a.height ? +a.height || undefined : undefined,
      ...(link ? hrefFields(link.attrs.href) : {}), target: link && link.attrs.target || undefined, ...extra };
  };
  const formFields = (form) => {
    const groups = findAll(form, (x) => hasCls(x, 'elementor-field-group'));
    if (groups.length) return groups.map((g) => {
      const lab = elChildren(g).find((c) => c.tag === 'label') || findFirst(g, (x) => x.tag === 'label' && hasCls(x, 'elementor-field-label'));
      const inputs = findAll(g, (x) => ['input', 'textarea', 'select'].includes(x.tag) && x.attrs.type !== 'hidden');
      const first = inputs[0];
      if (!first) { const b = findFirst(g, (x) => x.tag === 'button'); return b ? { tag: 'button', type: b.attrs.type || undefined, label: T(b) || undefined } : { tag: 'group', label: T(g) || undefined }; }
      const multi = inputs.length > 1 || ['checkbox', 'radio'].includes(first.attrs.type);
      return { tag: first.tag, type: first.attrs.type || undefined, name: first.attrs.name || undefined, label: lab ? T(lab) || undefined : undefined,
        placeholder: first.attrs.placeholder || undefined, ariaLabel: first.attrs['aria-label'] || undefined, required: inputs.some((i) => 'required' in i.attrs || i.attrs['aria-required'] === 'true') || undefined,
        options: first.tag === 'select' ? findAll(first, (o) => o.tag === 'option').map((o) => ({ label: T(o), value: o.attrs.value }))
          : multi ? inputs.map((i) => { const l = i.attrs.id ? findFirst(g, (x) => x.tag === 'label' && x.attrs.for === i.attrs.id && x !== lab) : null; return { label: l ? T(l) : undefined, value: i.attrs.value }; }) : undefined };
    });
    return findAll(form, (x) => ['input', 'textarea', 'select'].includes(x.tag) && !['hidden', 'submit', 'button'].includes(x.attrs.type)).map((f) => {
    const id = f.attrs.id;
    const lab = id ? findFirst(form, (x) => x.tag === 'label' && x.attrs.for === id) : null;
    return { tag: f.tag, type: f.attrs.type || undefined, name: f.attrs.name || undefined, label: lab ? T(lab) || undefined : undefined,
      placeholder: f.attrs.placeholder || undefined, ariaLabel: f.attrs['aria-label'] || undefined, required: 'required' in f.attrs || f.attrs['aria-required'] === 'true' || undefined,
      value: f.tag === 'input' && ['checkbox', 'radio'].includes(f.attrs.type) ? f.attrs.value : undefined,
      options: f.tag === 'select' ? findAll(f, (o) => o.tag === 'option').map((o) => ({ label: T(o), value: o.attrs.value })) : undefined };
    });
  };
  const submitOf = (form) => { const s = findFirst(form, (x) => (x.tag === 'button' && x.attrs.type !== 'button') || (x.tag === 'input' && x.attrs.type === 'submit')); return s ? (T(s) || s.attrs.value || undefined) : undefined; };
  const productsBlock = (cfgEl, widget, via) => {
    const cfg = parseJSON(cfgEl.attrs['data-config'] || '') || {};
    const raw = cfg.raw || {};
    const params = Object.fromEntries(Object.entries(raw).filter(([k, v]) => v !== null && v !== '' && k !== 'post_id'));
    return { t: 'products', source: 'joint', widget, via, params, filters: cfg.filters || null, sort: cfg.sort || null, limit: cfg.limit ?? params.limit ?? null, label: null, clientRendered: true };
  };
  const hoursBlock = (ul) => ({ t: 'hours', source: 'joint', rows: findAll(ul, (x) => hasCls(x, 'joint-hours-row-container')).map((r) => ({ day: T(findFirst(r, (x) => hasCls(x, 'joint-hours-label')) || r), time: T(findFirst(r, (x) => hasCls(x, 'joint-hours-time')) || r) })) });
  const reviewListBlock = (ul) => ({ t: 'reviews', source: 'joint', kind: 'list', snapshot: true, items: findAll(ul, (x) => hasCls(x, 'joint-review')).map((r) => {
    const g = (c) => { const n = findFirst(r, (x) => hasCls(x, c)); return n ? T(n) || undefined : undefined; };
    const st = findFirst(r, (x) => hasCls(x, 'joint-reviews-stars'));
    const av = findFirst(r, (x) => x.tag === 'img');
    return { author: g('joint-review-author'), time: g('joint-review-time'), rating: g('joint-review-rating'), ratingLabel: st ? st.attrs['aria-label'] : undefined,
      text: g('joint-review-text') || g('joint-review-body') || g('joint-review-content'), avatarUrl: av ? lazySrc(av) || undefined : undefined, avatarAlt: av ? av.attrs.alt : undefined };
  }) });
  const embedFromIframe = (iframe) => { const src = iframe.attrs['data-src'] || iframe.attrs.src || null; return { t: 'embed', kind: /google\.[a-z.]+\/maps/.test(src || '') ? 'gmap' : /youtube|youtu\.be/.test(src || '') ? 'youtube' : /vimeo/.test(src || '') ? 'vimeo' : /alpineiq/.test(src || '') ? 'alpineiq' : 'iframe', src, title: iframe.attrs.title || undefined, w: iframe.attrs.width || undefined, h: iframe.attrs.height || undefined }; };
  const videoBlock = (v) => { const s = findFirst(v, (x) => x.tag === 'source'); return { t: 'embed', kind: 'video', src: v.attrs.src || (s && s.attrs.src) || null, poster: v.attrs.poster || undefined, settings: pick(v.attrs, ['autoplay', 'loop', 'muted', 'controls', 'playsinline']) }; };
  const navItems = (ul) => elChildren(ul).filter((li) => li.tag === 'li').map((li) => {
    const a = elChildren(li).find((c) => c.tag === 'a') || findFirst(li, (x) => x.tag === 'a');
    const sub = elChildren(li).find((c) => c.tag === 'ul');
    return { label: a ? T(a) : T(li), ...(a && a.attrs.href ? hrefFields(a.attrs.href) : {}), target: a && a.attrs.target || undefined, title: a && a.attrs.title || undefined, children: sub ? navItems(sub) : undefined };
  });

  function shortcodeBlocks(body) {
    const badge = findFirst(body, (x) => hasCls(x, 'joint-reviews-badge'));
    if (badge) {
      const r = findFirst(badge, (x) => hasCls(x, 'joint-reviews-badge-rating-text'));
      const c = findFirst(badge, (x) => hasCls(x, 'joint-reviews-badge-count'));
      const img = findFirst(badge, (x) => x.tag === 'img');
      const a = findFirst(badge, (x) => x.tag === 'a' && x.attrs.href);
      return [{ t: 'reviews', source: 'joint', kind: 'badge', rating: r ? T(r) : null, count: c ? T(c) : null, text: T(badge) || undefined, logo: img ? imageBlock(img) : undefined, ...(a ? hrefFields(a.attrs.href) : {}), snapshot: true }];
    }
    const rl = findFirst(body, (x) => hasCls(x, 'joint-review-list'));
    if (rl) return [reviewListBlock(rl)];
    const hours = findFirst(body, (x) => hasCls(x, 'joint-hours-list'));
    if (hours) return [hoursBlock(hours)];
    const cfgEl = findFirst(body, (x) => x.attrs['data-config'] && (x.attrs.id === 'joint-menu' || hasCls(x, 'joint-slider')));
    if (cfgEl) return [productsBlock(cfgEl, hasCls(cfgEl, 'joint-slider') ? 'slider' : 'menu', 'shortcode')];
    const iframe = findFirst(body, (x) => x.tag === 'iframe');
    if (iframe) return [embedFromIframe(iframe)];
    if (findFirst(body, (x) => hasCls(x, 'gtranslate_wrapper'))) return [{ t: 'chrome-ref', what: 'gtranslate', removed: true, reason: 'GTranslate third-party runtime (BUILD-CONTRACT 4.8)' }];
    const sbi = findFirst(body, (x) => (x.attrs.id || '').startsWith('sbi_mod_error'));
    if (sbi) { ctx.ledger.removed.push({ what: 'smash-balloon-admin-error', text: T(sbi), reason: 'admin-only plugin error message (removals.json)' }); return [{ t: 'embed', kind: 'instagram-feed', src: null, note: 'Smash Balloon feed; the static HTML held only an admin-only error' }]; }
    const sm = findFirst(body, (x) => hasCls(x, 'rank-math-html-sitemap'));
    if (sm) return [sitemapBlock(sm)];
    const bc = findFirst(body, (x) => hasCls(x, 'rank-math-breadcrumb'));
    if (bc) { ctx.breadcrumbAt = ctx.breadcrumbAt || true; return []; }
    return htmlToBlocks(body.children).map((b) => (b.t === 'rich' ? { ...b, via: 'shortcode' } : b));
  }
  function sitemapBlock(sm) {
    const groups = [];
    let cur = null;
    walkTree(sm, (x) => {
      if (/^h[2-6]$/.test(x.tag)) { cur = { heading: T(x), level: +x.tag[1], links: [] }; groups.push(cur); return false; }
      if (x.tag === 'a' && x.attrs.href) { if (!cur) { cur = { heading: null, links: [] }; groups.push(cur); } cur.links.push({ label: T(x), ...hrefFields(x.attrs.href) }); return false; }
      return undefined;
    });
    return { t: 'sitemap', groups };
  }
  // everything in body except the subtree of one primary node, as top-level fragments in document order
  function without(body, except) {
    const out = [];
    const rec = (n) => { for (const c of n.children || []) { if (c === except) continue; if (isEl(c) && isAncestor(c, except)) { rec(c); continue; } out.push(c); } };
    rec(body);
    return out;
  }
  function restRich(body, except) {
    return nested(htmlToBlocks(without(body, except))).map((b) => ({ ...b, overflow: true }));
  }
  function headingFrom(body, extra = {}) {
    const h = findFirst(body, (x) => /^h[1-6]$/.test(x.tag)) || findFirst(body, (x) => hasCls(x, 'elementor-heading-title')) || body;
    const level = /^h([1-6])$/.test(h.tag) ? +h.tag[1] : null;
    const a = firstHref(h);
    const imgs = findAll(h, (y) => y.tag === 'img').map((im) => imageBlock(im, { inHeading: true }));
    const txt = T(h);
    const head = txt ? [{ t: 'heading', level, text: txt, ...(a ? hrefFields(a) : {}), as: level ? undefined : h.tag, ...extra }] : [];
    return [...imgs, ...head, ...(h === body ? [] : restRich(body, h))];
  }

  function blocksFromWidget(w) {
    const bl = blocksFromWidgetRaw(w);
    const own = [];
    const rec = (n) => { for (const c of n.children || []) { if (!isEl(c)) continue; if (c !== w && c.attrs['data-widget_type']) continue; if (isDisplayNone(c)) continue; if (c.attrs['aria-label']) own.push(c.attrs['aria-label']); rec(c); } };
    if (w.attrs['aria-label']) own.push(w.attrs['aria-label']);
    rec(w);
    const first = bl.find((b) => !MARKERS.has(b.t));
    if (first && own.length) {
      const have = new Set(blockText(first).split('\n').map(squash));
      const extra = [...new Set(own.map(squash).filter(Boolean))].filter((x) => !have.has(x));
      if (extra.length) first.ariaLabels = extra;
    }
    return bl;
  }
  function blocksFromWidgetRaw(w) {
    const type = w.attrs['data-widget_type'];
    const body = widgetBody(w);
    switch (type) {
      case 'heading.default':
      case 'theme-post-title.default':
      case 'theme-archive-title.default':
      case 'aux_modern_heading.default':
        return headingFrom(body);
      case 'animated-headline.default': {
        const h = findFirst(body, (x) => /^h[1-6]$/.test(x.tag)) || body;
        const plain = findAll(h, (x) => hasCls(x, 'elementor-headline-plain-text')).map(T);
        const dyn = findAll(h, (x) => hasCls(x, 'elementor-headline-dynamic-text')).map(T).filter(Boolean);
        const st = parseJSON(w.attrs['data-settings'] || '') || {};
        const rot = st.rotating_text ? String(st.rotating_text).split('\n').map(squash).filter(Boolean) : dyn;
        const text = [plain[0], rot[0] || dyn[0], plain[1]].filter(Boolean).join(' ');
        return [{ t: 'heading', level: /^h([1-6])$/.test(h.tag) ? +h.tag[1] : null, text, animated: { before: plain[0] || '', words: rot.length ? rot : dyn, after: plain[1] || '', highlighted: st.marker ? st.highlighted_text : undefined } }];
      }
      case 'text-editor.default':
      case 'theme-post-excerpt.default': {
        const hours = findFirst(body, (x) => hasCls(x, 'joint-hours-list'));
        if (hours) return [hoursBlock(hours), ...restRich(body, hours).map((b) => ({ ...b, overflow: undefined }))];
        const rl = findFirst(body, (x) => hasCls(x, 'joint-review-list'));
        if (rl) return [reviewListBlock(rl)];
        if (findFirst(body, (x) => hasCls(x, 'rank-math-breadcrumb'))) { ctx.breadcrumbAt = true; const rest = (body.children || []).filter((c) => !(isEl(c) && (hasCls(c, 'rank-math-breadcrumb') || findFirst(c, (x) => hasCls(x, 'rank-math-breadcrumb'))))); return htmlToBlocks(rest); }
        return htmlToBlocks(elChildren(body).length || (body.children || []).some((c) => c.tag === '#text' && squash(c.text)) ? body.children : [body]);
      }
      case 'image.default':
      case 'theme-post-featured-image.default':
      case 'theme-site-logo.default': {
        const img = findFirst(body, (x) => x.tag === 'img');
        const cap = findFirst(body, (x) => x.tag === 'figcaption');
        if (!img) return htmlToBlocks(body.children);
        let primary = img;
        for (let x = img.parent; x && x !== body; x = x.parent) if (x.tag === 'figure' || x.tag === 'a') primary = x;
        const rest = squash(textOf({ children: without(body, primary) }, { skip: isDisplayNone })) ? restRich(body, primary) : [];
        return [imageBlock(img, { caption: cap ? T(cap) || undefined : undefined, kind: type === 'theme-site-logo.default' ? 'logo' : undefined }), ...rest];
      }
      case 'button.default': {
        const a = findFirst(body, (x) => hasCls(x, 'elementor-button')) || findFirst(body, (x) => x.tag === 'a');
        const lab = findFirst(body, (x) => hasCls(x, 'elementor-button-text'));
        return [{ t: 'button', label: T(lab || a || body), ...(a && a.attrs.href ? hrefFields(a.attrs.href) : { href: null }), target: a && a.attrs.target || undefined, id: a && a.attrs.id || undefined }];
      }
      case 'divider.default': { const t = T(body); return [{ t: 'divider', text: t || undefined }]; }
      case 'spacer.default': return [];
      case 'menu-anchor.default': { const a = findFirst(body, (x) => hasCls(x, 'elementor-menu-anchor')); return [{ t: 'anchor', id: a ? a.attrs.id : null }]; }
      case 'icon.default': {
        const a = findFirst(body, (x) => x.tag === 'a');
        const svg = findFirst(body, (x) => x.tag === 'svg');
        const name = svg ? (cls(svg).find((c) => /^e-(fas|far|fab)-/.test(c)) || '').replace(/^e-/, '') || undefined : undefined;
        return [{ t: 'icon', name, ...(a && a.attrs.href ? hrefFields(a.attrs.href) : {}), label: a ? a.attrs['aria-label'] || undefined : undefined }];
      }
      case 'nested-accordion.default': {
        const items = findOwn(w, (x) => x.tag === 'details' && hasCls(x, 'e-n-accordion-item')).map((d) => {
          const q = findFirst(d, (x) => hasCls(x, 'e-n-accordion-item-title-text'));
          const panel = elChildren(d).find((c) => (c.attrs.role || '').split(/\s+/).includes('region')) || elChildren(d).find((c) => c.tag !== 'summary');
          return { q: q ? T(q) : '', open: 'open' in d.attrs || undefined, blocks: panel ? nested(walkChildren(panel)) : [] };
        });
        return [{ t: 'faq', kind: 'nested-accordion', items }];
      }
      case 'toggle.default': {
        const items = findOwn(w, (x) => hasCls(x, 'elementor-toggle-item')).map((it) => {
          const q = findFirst(it, (x) => hasCls(x, 'elementor-toggle-title'));
          const a = findFirst(it, (x) => hasCls(x, 'elementor-tab-content'));
          return { q: q ? T(q) : '', blocks: a ? nested(htmlToBlocks(a.children)) : [] };
        });
        return [{ t: 'faq', kind: 'toggle', items }];
      }
      case 'nested-carousel.default': {
        const st = parseJSON(w.attrs['data-settings'] || '') || {};
        const slides = findOwn(w, (x) => hasCls(x, 'swiper-slide') && !hasCls(x, 'swiper-slide-duplicate'));
        const tops = slides.filter((s) => !slides.some((o) => o !== s && isAncestor(o, s)));
        return [{ t: 'carousel', kind: 'nested', editorTitles: (st.carousel_items || []).map((c) => c.slide_title), settings: pick(st, ['autoplay', 'autoplay_speed', 'slides_to_show', 'slides_to_scroll', 'infinite', 'pause_on_hover']), slides: tops.map((s) => ({ blocks: nested(walkChildren(s)) })) }];
      }
      case 'media-carousel.default':
      case 'image-carousel.default': {
        const st = parseJSON(w.attrs['data-settings'] || '') || {};
        const items = findOwn(w, (x) => hasCls(x, 'swiper-slide') && !hasCls(x, 'swiper-slide-duplicate')).map((s) => {
          const img = findFirst(s, (x) => x.tag === 'img');
          const bg = findFirst(s, (x) => hasCls(x, 'elementor-carousel-image'));
          const cap = findFirst(s, (x) => x.tag === 'figcaption' || hasCls(x, 'elementor-carousel-image-overlay'));
          const bgUrl = bgUrlOf(bg);
          const im = img ? imageBlock(img) : { t: 'image', ...ctx.image(bgUrl), alt: bg ? bg.attrs['aria-label'] ?? null : null };
          const a = firstHref(s);
          return { image: { ...im, t: undefined }, ...(a ? hrefFields(a) : {}), caption: cap ? T(cap) || undefined : undefined };
        });
        return [{ t: 'gallery', kind: type.split('.')[0], settings: pick(st, ['autoplay', 'autoplay_speed', 'effect', 'loop', 'slides_per_view', 'skin']), items }];
      }
      case 'jet-carousel.default': {
        const items = findOwn(w, (x) => hasCls(x, 'jet-carousel__item')).map((it) => {
          const img = findFirst(it, (x) => x.tag === 'img');
          const title = findFirst(it, (x) => hasCls(x, 'jet-carousel__item-title') || hasCls(x, 'jet-banner__title'));
          const text = findFirst(it, (x) => hasCls(x, 'jet-carousel__item-text') || hasCls(x, 'jet-banner__text'));
          const btn = findFirst(it, (x) => hasCls(x, 'jet-carousel__item-button') || hasCls(x, 'elementor-button'));
          const a = firstHref(it);
          return { image: img ? { ...imageBlock(img), t: undefined } : undefined, ...(a ? hrefFields(a) : {}), title: title ? T(title) || undefined : undefined, text: text ? T(text) || undefined : undefined, button: btn ? T(btn) || undefined : undefined };
        });
        return [{ t: 'gallery', kind: 'jet-carousel', items }];
      }
      case 'jet-brands.default': {
        const items = findOwn(w, (x) => hasCls(x, 'brands-list__item')).map((it) => {
          const img = findFirst(it, (x) => x.tag === 'img');
          const a = firstHref(it);
          return { image: img ? { ...imageBlock(img), t: undefined } : undefined, ...(a ? hrefFields(a) : {}), title: T(it) || undefined };
        });
        return [{ t: 'gallery', kind: 'jet-brands', items }];
      }
      case 'jet-banner.default': {
        const img = findFirst(body, (x) => x.tag === 'img');
        const title = findFirst(body, (x) => hasCls(x, 'jet-banner__title'));
        const text = findFirst(body, (x) => hasCls(x, 'jet-banner__text'));
        const a = firstHref(body);
        const base = img ? imageBlock(img) : { t: 'image', ref: null, srcUrl: null, missing: 'no-src', alt: null };
        return [{ ...base, kind: 'banner', ...(a ? hrefFields(a) : {}), title: title ? T(title) || undefined : undefined, text: text ? T(text) || undefined : undefined }];
      }
      case 'call-to-action.default': {
        const title = findFirst(body, (x) => hasCls(x, 'elementor-cta__title'));
        const desc = findFirst(body, (x) => hasCls(x, 'elementor-cta__description'));
        const btn = findFirst(body, (x) => hasCls(x, 'elementor-cta__button'));
        const ribbon = findFirst(body, (x) => hasCls(x, 'elementor-ribbon-inner'));
        const bg = findFirst(body, (x) => hasCls(x, 'elementor-cta__bg'));
        const bgUrl = bgUrlOf(bg);
        const a = firstHref(body) || (body.tag === 'a' ? body.attrs.href : null) || (findFirst(w, (x) => x.tag === 'a' && x.attrs.href) || { attrs: {} }).attrs.href;
        return [{ t: 'cta', title: title ? T(title) || undefined : undefined, text: desc ? T(desc) || undefined : undefined, button: btn ? T(btn) || undefined : undefined, ribbon: ribbon ? T(ribbon) || undefined : undefined, ...(a ? hrefFields(a) : {}), image: bgUrl ? { ...ctx.image(bgUrl), alt: bg.attrs['aria-label'] ?? null } : undefined }];
      }
      case 'video.default': {
        const st = parseJSON(w.attrs['data-settings'] || '') || {};
        const v = findFirst(body, (x) => x.tag === 'video');
        const src = st.youtube_url || st.vimeo_url || (st.hosted_url && st.hosted_url.url) || (v && (v.attrs.src || '')) || null;
        return [{ t: 'embed', kind: st.video_type === 'hosted' || v ? 'video' : st.video_type || 'video', src, settings: pick(st, ['video_type', 'autoplay', 'mute', 'loop', 'controls']) }];
      }
      case 'html.default': {
        const iframe = findFirst(body, (x) => x.tag === 'iframe');
        const controls = findAll(body, (x) => ['input', 'textarea', 'select', 'button'].includes(x.tag) && x.attrs.type !== 'hidden').map((f) => ({ tag: f.tag, type: f.attrs.type || undefined, name: f.attrs.name || f.attrs.id || undefined, placeholder: f.attrs.placeholder || undefined, label: f.tag === 'button' ? T(f) || undefined : undefined, value: f.tag === 'input' && ['submit', 'button'].includes(f.attrs.type) ? f.attrs.value : undefined, ariaLabel: f.attrs['aria-label'] || undefined, options: f.tag === 'select' ? findAll(f, (o) => o.tag === 'option').map((o) => ({ label: T(o), value: o.attrs.value })) : undefined }));
        const imgs = findAll(body, (x) => x.tag === 'img').map((i) => ({ ...imageBlock(i), t: undefined }));
        return [{ t: 'html', review: true, text: textOf(body, { skip: isDisplayNone }) || undefined, html: rich(body.children) || undefined, embed: iframe ? embedFromIframe(iframe) : undefined, controls: nonEmpty(controls), images: nonEmpty(imgs) }];
      }
      case 'shortcode.default': return shortcodeBlocks(body);
      case 'joint_slider.default':
      case 'joint_menu.default': {
        const el = findFirst(body, (x) => !!x.attrs['data-config']);
        if (!el) return [{ t: 'products', source: 'joint', widget: type.startsWith('joint_slider') ? 'slider' : 'menu', via: 'widget', params: {}, filters: null, sort: null, limit: null, label: null, clientRendered: true, note: 'no data-config' }];
        return [productsBlock(el, type.startsWith('joint_slider') ? 'slider' : 'menu', 'widget')];
      }
      case 'joint_cart.default': { const el = findFirst(body, (x) => !!x.attrs['data-config']); return [{ t: 'chrome-ref', what: 'cart', config: el ? parseJSON(el.attrs['data-config']) : undefined }]; }
      case 'joint_checkout.default': return [{ t: 'app', what: 'checkout', clientRendered: true }];
      case 'template.default':
      case 'theme-post-content.default': {
        const doc = findFirst(body, (x) => !!x.attrs['data-elementor-type']);
        if (doc) return [{ t: 'doc-start', docType: doc.attrs['data-elementor-type'], docId: doc.attrs['data-elementor-id'] }, ...walkChildren(doc), { t: 'doc-end' }];
        return htmlToBlocks(body.children);
      }
      case 'post-info.default': return [{ t: 'meta', items: findAll(body, (x) => x.tag === 'li').map((li) => { const a = firstHref(li); return { text: T(li), ...(a ? hrefFields(a) : {}) }; }).filter((i) => i.text) }];
      case 'post-navigation.default': {
        const side = (c, lc, tc) => {
          const n = findFirst(body, (x) => hasCls(x, c));
          if (!n) return undefined;
          const lab = findFirst(n, (x) => hasCls(x, lc));
          const ti = findFirst(n, (x) => hasCls(x, tc));
          const sr = findFirst(n, (x) => hasCls(x, 'elementor-screen-only'));
          const a = firstHref(n);
          if (!lab && !ti && !a) return undefined;
          const parts = [['label', lab], ['srLabel', sr], ['title', ti]].filter(([, n]) => n).sort((p, q) => p[1].s - q[1].s);
          const o = {};
          for (const [k, n] of parts) o[k] = T(n) || undefined;
          return { ...o, ...(a ? hrefFields(a) : {}) };
        };
        return [{ t: 'postnav', prev: side('elementor-post-navigation__prev', 'post-navigation__prev--label', 'post-navigation__prev--title'), next: side('elementor-post-navigation__next', 'post-navigation__next--label', 'post-navigation__next--title') }];
      }
      case 'post-comments.theme_comments': {
        const form = findFirst(body, (x) => x.tag === 'form');
        const title = findFirst(body, (x) => x.attrs.id === 'reply-title' || hasCls(x, 'comment-reply-title'));
        return [{ t: 'comments', title: title ? T(title) || undefined : undefined, text: textOf(body) || undefined, fields: form ? formFields(form) : undefined, submit: form ? submitOf(form) : undefined, note: 'WordPress comment form; no comment backend in a static rebuild' }];
      }
      case 'archive-posts.archive_cards':
      case 'posts.classic':
      case 'posts.cards':
      case 'jet-posts.default':
      case 'loop-carousel.post': {
        const loop = type === 'loop-carousel.post';
        const arts = loop ? findAll(body, (x) => x.attrs['data-elementor-type'] === 'loop-item' && !findFirst(x.parent || x, () => false) && !(x.parent && hasCls(x.parent, 'swiper-slide-duplicate')))
          : type === 'jet-posts.default' ? findAll(body, (x) => hasCls(x, 'jet-posts__item')) : findAll(body, (x) => x.tag === 'article');
        const items = arts.map((a) => {
          if (loop) return { blocks: nested(walkChildren(a)), ...(firstHref(a) ? hrefFields(firstHref(a)) : {}) };
          const ti = findFirst(a, (x) => hasCls(x, 'elementor-post__title') || hasCls(x, 'entry-title') || hasCls(x, 'elementor-heading-title') || hasCls(x, 'jet-posts__title'));
          const ex = findFirst(a, (x) => hasCls(x, 'elementor-post__excerpt') || hasCls(x, 'jet-posts__excerpt') || x.attrs['data-widget_type'] === 'theme-post-excerpt.default');
          const img = findFirst(a, (x) => x.tag === 'img');
          const more = findFirst(a, (x) => hasCls(x, 'elementor-post__read-more') || hasCls(x, 'jet-more') || hasCls(x, 'elementor-button'));
          const meta = findFirst(a, (x) => hasCls(x, 'elementor-post__meta-data') || hasCls(x, 'elementor-post__badge') || hasCls(x, 'jet-posts__meta'));
          const h = firstHref(ti || a);
          return { title: ti ? T(ti) || undefined : undefined, ...(h ? hrefFields(h) : {}), excerpt: ex ? T(ex) || undefined : undefined, image: img ? { ...imageBlock(img), t: undefined, href: undefined, target: undefined, hrefStatus: undefined } : undefined, more: more ? T(more) || undefined : undefined, meta: meta ? T(meta) || undefined : undefined };
        });
        const pag = findFirst(w, (x) => hasCls(x, 'elementor-pagination') || (x.tag === 'nav' && hasCls(x, 'pagination')));
        const loadMore = findFirst(w, (x) => hasCls(x, 'e-load-more-anchor'));
        const lmBtn = findFirst(w, (x) => hasCls(x, 'e-loop__load-more') || hasCls(x, 'elementor-button-wrapper'));
        return [{ t: 'posts', kind: type, items, pagination: pag ? { text: T(pag), links: findAll(pag, (x) => x.tag === 'a' && x.attrs.href).map((x) => ({ label: T(x), ...hrefFields(x.attrs.href) })) } : undefined,
          loadMore: loadMore ? { maxPage: +loadMore.attrs['data-max-page'] || undefined, label: lmBtn ? T(lmBtn) || undefined : undefined } : undefined }];
      }
      case 'hotspot.default': {
        const img = findFirst(body, (x) => x.tag === 'img');
        const items = findOwn(w, (x) => hasCls(x, 'e-hotspot')).map((h) => {
          const lab = findFirst(h, (x) => hasCls(x, 'e-hotspot__label'));
          const tip = findFirst(h, (x) => hasCls(x, 'e-hotspot__tooltip'));
          const a = h.tag === 'a' ? h.attrs.href : firstHref(h);
          return { label: lab ? T(lab) || undefined : undefined, tipHtml: tip ? rich(tip.children) || undefined : undefined, ...(a ? hrefFields(a) : {}) };
        });
        return [{ t: 'hotspot', image: img ? { ...imageBlock(img), t: undefined } : undefined, items }];
      }
      case 'jet-table.default': { const tb = findFirst(body, (x) => x.tag === 'table'); return [{ t: 'rich', kind: 'table', html: rich(tb ? [tb] : body.children) }]; }
      case 'jet-horizontal-timeline.default':
      case 'jet-timeline.default': {
        const items = findAll(body, (x) => hasCls(x, 'jet-hor-timeline-item') || hasCls(x, 'jet-timeline-item')).map((it) => {
          const g = (re) => { const n = findFirst(it, (x) => cls(x).some((c) => re.test(c))); return n ? T(n) || undefined : undefined; };
          const img = findFirst(it, (x) => x.tag === 'img');
          return { meta: g(/__meta$/), title: g(/__title$/), desc: g(/__desc$/), text: T(it), image: img ? { ...imageBlock(img), t: undefined } : undefined };
        });
        return [{ t: 'timeline', kind: type.split('.')[0], items }];
      }
      case 'form.default': {
        const form = findFirst(body, (x) => x.tag === 'form') || body;
        return [{ t: 'form', name: form.attrs.name || undefined, fields: formFields(form), submit: submitOf(form) }];
      }
      case 'search-form.default':
      case 'jet-ajax-search.default':
      case 'jet-search-suggestions.default': {
        const inp = findFirst(body, (x) => x.tag === 'input' && (x.attrs.type === 'search' || x.attrs.name === 's' || hasCls(x, 'jet-search-suggestions__inline-area-input')));
        const form = findFirst(body, (x) => x.tag === 'form');
        const lab = findFirst(body, (x) => x.tag === 'label' || hasCls(x, 'elementor-screen-only'));
        const btn = findFirst(body, (x) => x.tag === 'button');
        const opts = findAll(body, (x) => x.tag === 'option').map(T).filter(Boolean);
        return [{ t: 'search', kind: type.split('.')[0], categories: nonEmpty(opts), action: form ? href(form.attrs.action || '/') : undefined, method: form ? form.attrs.method || undefined : undefined, field: inp ? inp.attrs.name || undefined : undefined,
          placeholder: inp ? inp.attrs.placeholder || undefined : undefined, label: lab ? T(lab) || undefined : undefined, button: btn ? T(btn) || btn.attrs['aria-label'] || undefined : undefined, clientRendered: type !== 'search-form.default' }];
      }
      case 'nav-menu.default': {
        const main = findFirst(body, (x) => x.tag === 'nav' && hasCls(x, 'elementor-nav-menu--main')) || findFirst(body, (x) => x.tag === 'nav');
        const ul = main ? findFirst(main, (x) => x.tag === 'ul') : null;
        const toggle = findFirst(body, (x) => hasCls(x, 'elementor-menu-toggle'));
        return [{ t: 'nav', kind: 'nav-menu', items: ul ? navItems(ul) : [], toggleLabel: toggle ? toggle.attrs['aria-label'] || undefined : undefined, note: 'the dropdown clone (elementor-nav-menu--dropdown) is the same menu and is not repeated' }];
      }
      case 'mega-menu.default': {
        const items = findAll(body, (x) => hasCls(x, 'e-n-menu-item') && x.tag === 'li').map((li) => {
          const a = findFirst(li, (x) => x.tag === 'a' && x.attrs.href);
          const t = findFirst(li, (x) => hasCls(x, 'e-n-menu-title-text'));
          const img = findFirst(li, (x) => x.tag === 'img');
          return { label: t ? T(t) : a ? T(a) : T(li), ...(a ? hrefFields(a.attrs.href) : {}), title: a && a.attrs.title || undefined, image: img ? { ...imageBlock(img), t: undefined } : undefined };
        });
        return [{ t: 'nav', kind: 'mega-menu', items }];
      }
      case 'social-icons.default': return [{ t: 'social', items: findAll(body, (x) => x.tag === 'a' && x.attrs.href).map((a) => { const sr = findFirst(a, (x) => hasCls(x, 'elementor-screen-only')); return { label: (sr ? T(sr) : T(a)) || a.attrs['aria-label'] || undefined, ...hrefFields(a.attrs.href), target: a.attrs.target || undefined }; }) }];
      case 'sbi-widget.default': {
        const err = findFirst(body, (x) => (x.attrs.id || '').startsWith('sbi_mod_error'));
        if (err) ctx.ledger.removed.push({ what: 'smash-balloon-admin-error', text: T(err), reason: 'admin-only plugin error message (removals.json)' });
        return [{ t: 'embed', kind: 'instagram-feed', src: null, note: 'Smash Balloon feed; the static HTML held only an admin-only error' }];
      }
      default: {
        if (type && type.startsWith('tec_events_elementor_widget_event_')) {
          const field = type.replace('tec_events_elementor_widget_event_', '').replace('.default', '');
          if (field === 'image') { const img = findFirst(body, (x) => x.tag === 'img'); return img ? [imageBlock(img, { kind: 'event-image' })] : []; }
          const links = findAll(body, (x) => x.tag === 'a' && x.attrs.href).map((a) => ({ label: T(a) || undefined, ...hrefFields(a.attrs.href) }));
          const h = findFirst(body, (x) => /^h[1-6]$/.test(x.tag));
          return [{ t: 'event-field', field, text: textOf(body) || undefined, level: field === 'title' && h ? +h.tag[1] : undefined, links: nonEmpty(links) }];
        }
        ctx.ledger.unknown.push({ widget: type, id: w.attrs['data-id'] });
        return [{ t: 'unknown', widget: type, html: rich(body.children) }];
      }
    }
  }

  // Plain (non-Elementor) HTML -> blocks: headings, images, figures, iframes, video and forms become their own blocks;
  // paragraph-level and inline content is buffered into rich blocks.
  const INLINE = new Set(['a', 'span', 'strong', 'em', 'b', 'i', 'u', 's', 'br', 'small', 'sup', 'sub', 'mark', 'code', 'time', 'abbr', 'cite', 'q', 'label', 'font', 'del', 'ins']);
  const FLOW = new Set(['p', 'ul', 'ol', 'blockquote', 'table', 'pre', 'dl', 'hr', 'center']);
  function htmlToBlocks(nodes) {
    const out = [];
    let buf = [];
    const flush = () => {
      if (!buf.length) return;
      const html = rich(buf);
      if (squash(html.replace(/<[^>]+>/g, ' ')) || /<img\b/.test(html)) out.push({ t: 'rich', html });
      buf = [];
    };
    for (const x of nodes || []) {
      if (x.tag === '#comment') continue;
      if (x.tag === '#text') { buf.push(x); continue; }
      if (!isEl(x)) continue;
      if (isDisplayNone(x)) { ctx.noteHidden(x); continue; }
      if (isPlatformUi(x)) { ctx.notePlatform(x); continue; }
      if (x.attrs['data-widget_type'] || x.attrs['data-element_type'] || x.attrs['data-elementor-type']) { flush(); out.push(...walkChildren({ children: [x] })); continue; }
      if (/^h[1-6]$/.test(x.tag)) {
        flush();
        const imgs = findAll(x, (y) => y.tag === 'img');
        const txt = T(x);
        const a = firstHref(x);
        for (const im of imgs) out.push(imageBlock(im, { inHeading: true }));
        if (txt) out.push({ t: 'heading', level: +x.tag[1], text: txt, ...(a ? hrefFields(a) : {}) });
        continue;
      }
      if (x.tag === 'img') { flush(); out.push(imageBlock(x)); continue; }
      if (x.tag === 'a' && elChildren(x).length === 1 && elChildren(x)[0].tag === 'img' && !squash(textOf(x))) { flush(); out.push(imageBlock(elChildren(x)[0])); continue; }
      if (x.tag === 'figure' && findFirst(x, (y) => y.tag === 'img') && !findFirst(x, (y) => y.tag === 'table')) {
        flush(); const img = findFirst(x, (y) => y.tag === 'img'); const cap = findFirst(x, (y) => y.tag === 'figcaption');
        out.push(imageBlock(img, { caption: cap ? T(cap) || undefined : undefined })); continue;
      }
      if (x.tag === 'iframe') { flush(); out.push(embedFromIframe(x)); continue; }
      if (x.tag === 'video') { flush(); out.push(videoBlock(x)); continue; }
      if (x.tag === 'form') {
        flush();
        const intro = findAll(x, (f) => f.tag === 'p' && !findFirst(f, (y) => ['input', 'textarea', 'select', 'button'].includes(y.tag)));
        out.push({ t: 'form', name: x.attrs.name || x.attrs.class || undefined, intro: nonEmpty(intro.map(T).filter(Boolean)), fields: formFields(x), submit: submitOf(x), text: textOf(x) || undefined });
        continue;
      }
      if (['script', 'style', 'noscript', 'template', 'svg', 'link', 'meta', 'input', 'button', 'select', 'textarea'].includes(x.tag)) {
        if (x.tag === 'button' && T(x)) { flush(); out.push({ t: 'button', label: T(x), href: null, kind: 'control' }); }
        continue;
      }
      if (FLOW.has(x.tag) || INLINE.has(x.tag)) {
        // a flow element that holds Elementor widgets or block-level media must be walked, not flattened
        if (findFirst(x, (y) => y.attrs['data-widget_type'] || y.attrs['data-element_type'] || y.tag === 'iframe' || y.tag === 'form' || y.tag === 'video' || (INLINE.has(x.tag) && /^h[1-6]$/.test(y.tag)))) { flush(); out.push(...htmlToBlocks(x.children)); continue; }
        buf.push(x); continue;
      }
      flush();
      out.push(...htmlToBlocks(x.children || []));
    }
    flush();
    return out;
  }

  function withDev(el, blocks) {
    const dev = visibleViews(el);
    if (dev.length === VIEWS.length) return blocks;
    return blocks.map((b) => (b.t === 'doc-start' || b.t === 'doc-end' ? b : { ...b, dev }));
  }

  // Walk Elementor element children (containers, sections, columns, widgets) in document order.
  function walkChildren(n) {
    const out = [];
    let buf = [];
    const flush = () => { if (buf.length) { out.push(...htmlToBlocks(buf)); buf = []; } };
    for (const c of n.children || []) {
      if (c.tag === '#text') { if (squash(decode(c.text))) buf.push(c); continue; }
      if (!isEl(c)) continue;
      if (['script', 'style', 'noscript', 'template', 'link', 'meta'].includes(c.tag)) continue;
      if (isDisplayNone(c)) { ctx.noteHidden(c); continue; }
      if (isPlatformUi(c)) { ctx.notePlatform(c); continue; }
      const et = c.attrs['data-element_type'];
      if (c.attrs['data-widget_type']) {
        flush();
        const bl = blocksFromWidget(c);
        ctx.guard(c, bl);
        out.push(...withDev(c, bl));
        continue;
      }
      if (et === 'container' || et === 'section' || et === 'column') {
        flush();
        const top = hasCls(c, 'e-parent') || hasCls(c, 'elementor-top-section');
        const inner = walkChildren(c);
        if (top) {
          const dev = visibleViews(c);
          out.push({ t: 'section-start', id: c.attrs['data-id'], el: et, cssId: c.attrs.id || undefined, dev: dev.length === VIEWS.length ? undefined : dev }, ...inner, { t: 'section-end', id: c.attrs['data-id'] });
        } else out.push(...inner);
        continue;
      }
      if (c.attrs['data-elementor-type']) { flush(); out.push({ t: 'doc-start', docType: c.attrs['data-elementor-type'], docId: c.attrs['data-elementor-id'] }, ...walkChildren(c), { t: 'doc-end' }); continue; }
      if (hasCls(c, 'rank-math-breadcrumb')) { flush(); ctx.breadcrumbAt = true; continue; }
      if (INLINE.has(c.tag) && !findFirst(c, (y) => y.attrs['data-widget_type'] || y.attrs['data-element_type'])) { buf.push(c); continue; }
      if (/^h[1-6]$/.test(c.tag) || ['p', 'ul', 'ol', 'img', 'figure', 'iframe', 'table', 'blockquote', 'form', 'video', 'pre', 'dl', 'hr', 'center'].includes(c.tag)) { buf.push(c); continue; }
      flush();
      out.push(...walkChildren(c));
    }
    flush();
    return out;
  }
  return { blocksFromWidget, htmlToBlocks, walkChildren, rich, imageBlock, navItems, hrefFields };
}
const MARKERS = new Set(['section-start', 'section-end', 'doc-start', 'doc-end']);
const nested = (blocks) => blocks.filter((b) => !MARKERS.has(b.t));
function walkTree(n, fn) {
  for (const c of n.children || []) { if (!isEl(c)) continue; if (fn(c) === false) continue; walkTree(c, fn); }
}

// ---------------------------------------------------------------- text of blocks (loss guard, collapse lines)
const NON_TEXT_KEYS = new Set(['t', 'href', 'hrefStatus', 'ref', 'srcUrl', 'master', 'missing', 'src', 'kind', 'dev', 'id', 'docType', 'docId', 'params', 'filters', 'sort', 'settings', 'source', 'widget', 'cssId', 'via', 'el', 'what', 'note', 'reason', 'field', 'tag', 'type', 'name', 'level', 'as', 'w', 'h', 'review', 'snapshot', 'clientRendered', 'target', 'limit', 'editorTitles', 'hiddenAll', 'overflow', 'open', 'required', 'value', 'action', 'method', 'poster', 'config', 'removed', 'avatarUrl', 'maxPage', 'demote', 'partialDuplicate', 'conflict', 'labelFrom', 'n', 'cont', 'doc', 'iw', 'animated']);
export function blockText(b) {
  const parts = [];
  const rec = (x, k) => {
    if (x == null) return;
    if (typeof x === 'string') { parts.push(k === 'html' || k === 'tipHtml' ? richText(x) : x); return; }
    if (typeof x !== 'object') return;
    if (Array.isArray(x)) { x.forEach((v) => rec(v, k)); return; }
    for (const [kk, v] of Object.entries(x)) { if (NON_TEXT_KEYS.has(kk)) continue; rec(v, kk); }
  };
  rec(b, null);
  return parts.join('\n');
}
const words = (s) => (String(s).toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) || []);
function recallWords(want, got) {
  const g = new Map();
  for (const w of got) g.set(w, (g.get(w) || 0) + 1);
  const missing = [];
  for (const w of want) { const c = g.get(w) || 0; if (c > 0) g.set(w, c - 1); else missing.push(w); }
  return missing;
}

// ---------------------------------------------------------------- sections + device collapse
// H2 change (2026-10-12): a container's CSS id (an in-page jump target such as /directions/ "#directions") used to be
// lost when its own section part held no block, e.g. section 425d858 whose only content is a nested template section.
// Such an id now becomes an `anchor` block { t: 'anchor', id, via: 'container#<data-id>', dev? } placed where the
// container's content starts. Continuation parts (`cont`) no longer repeat the cssId (an HTML id must be unique).
function sectionize(stream) {
  const sections = [];
  let cur = null;
  const docStack = [];
  const secStack = [];
  let pending = [];
  const emitted = new Set();
  const anchorOf = (s) => ({ t: 'anchor', id: s.cssId, via: 'container#' + s.id, ...(s.dev ? { dev: s.dev } : {}) });
  // a section part that is about to be left empty still owes its CSS id to the page
  const settle = () => { if (cur && !cur.blocks.length && cur.cssId && !emitted.has(cur.cssId)) { pending.push(anchorOf(cur)); emitted.add(cur.cssId); } };
  const open = (meta, cont) => {
    settle();
    const cssId = meta.cssId && !cont && !emitted.has(meta.cssId) ? meta.cssId : undefined;
    cur = { id: meta.id || null, doc: docStack.length ? docStack[docStack.length - 1] : null, cssId, dev: meta.dev, cont: cont || undefined, blocks: [] };
    sections.push(cur);
  };
  for (const b of stream) {
    if (b.t === 'doc-start') { docStack.push(b.docType + '#' + b.docId); continue; }
    if (b.t === 'doc-end') { docStack.pop(); continue; }
    if (b.t === 'section-start') { secStack.push(b); open(b); continue; }
    if (b.t === 'section-end') { secStack.pop(); settle(); cur = null; const parent = secStack[secStack.length - 1]; if (parent) open(parent, true); continue; }
    if (!cur) open({}, false);
    if (cur.cssId && !cur.blocks.length) emitted.add(cur.cssId);
    if (pending.length) { cur.blocks.push(...pending); pending = []; }
    cur.blocks.push(b);
  }
  settle();
  if (pending.length) {
    const last = [...sections].reverse().find((s) => s.blocks.length);
    if (last) last.blocks.push(...pending);
  }
  return sections.filter((s) => s.blocks.length);
}
const normLine = (s) => s.normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
// The rule of docs/CONTENT-MODEL.md section 4, with BUILD-CONTRACT 4.5: hidden-everywhere blocks are KEPT with
// hiddenAll:true (not rendered visibly) instead of being dropped to a ledger.
function collapseDevices(sections, ledger) {
  const all = [];
  sections.forEach((s, si) => s.blocks.forEach((b, bi) => all.push({ s, si, b, bi, dev: b.dev || s.dev || VIEWS })));
  const linesOf = (b) => blockText(b).split('\n').map(normLine).filter(Boolean);
  const U = new Map();
  for (const v of VIEWS) {
    const m = new Map();
    for (const x of all) if (x.dev.includes(v)) for (const l of linesOf(x.b)) m.set(l, (m.get(l) || 0) + 1);
    for (const [l, c] of m) U.set(l, Math.max(U.get(l) || 0, c));
  }
  const K = new Map();
  const take = (ls) => { for (const l of ls) K.set(l, (K.get(l) || 0) + 1); };
  const order = all.map((x, i) => ({ x, i })).sort((a, b) => (b.x.dev.length - a.x.dev.length) || (a.i - b.i));
  for (const { x } of order) {
    if (!x.dev.length) { x.b.hiddenAll = true; continue; }
    const ls = linesOf(x.b);
    if (x.dev.length === VIEWS.length) { take(ls); continue; }
    const adds = ls.filter((l) => (K.get(l) || 0) < (U.get(l) || 0));
    if (ls.length && !adds.length) {
      ledger.collapsed.push({ section: x.s.id, t: x.b.t, dev: x.dev, text: blockText(x.b).split('\n').map(squash).filter(Boolean).join(' / ') });
      x.drop = true;
      continue;
    }
    take(ls);
    if (ls.length) {
      const partial = adds.length < ls.length;
      if (partial) x.b.partialDuplicate = true;
      ledger.keptDeviceOnly.push({ section: x.s.id, t: x.b.t, dev: x.dev, partialDuplicate: partial || undefined, text: ls.join(' / ').slice(0, 240) });
    }
  }
  const dropped = new Set(all.filter((x) => x.drop).map((x) => x.b));
  return sections.map((s) => ({ ...s, blocks: s.blocks.filter((b) => !dropped.has(b)) })).filter((s) => s.blocks.length);
}

// ---------------------------------------------------------------- head, breadcrumbs, region
export function extractHead(root) {
  const head = findFirst(root, (x) => x.tag === 'head') || root;
  const metas = findAll(head, (x) => x.tag === 'meta');
  const meta = (attr, name) => { const m = metas.find((x) => (x.attrs[attr] || '').toLowerCase() === name); return m ? m.attrs.content ?? null : null; };
  const group = (attr, prefix) => {
    const o = {};
    for (const m of metas) {
      const k = (m.attrs[attr] || '');
      if (!k.startsWith(prefix)) continue;
      const key = k.slice(prefix.length);
      const v = m.attrs.content ?? '';
      if (key in o) o[key] = [].concat(o[key], v); else o[key] = v;
    }
    return o;
  };
  const titleEl = findFirst(head, (x) => x.tag === 'title');
  const canon = findFirst(head, (x) => x.tag === 'link' && (x.attrs.rel || '').split(/\s+/).includes('canonical'));
  const jsonLd = findAll(root, (x) => x.tag === 'script' && (x.attrs.type || '').toLowerCase() === 'application/ld+json').map((s) => {
    const raw = (s.children[0] && s.children[0].text) || '';
    const v = parseJSON(raw.trim());
    return v == null ? { parseError: true, raw } : v;
  });
  return {
    title: titleEl ? squash(decode((titleEl.children[0] && titleEl.children[0].text) || '')) : null,
    metaDescription: meta('name', 'description'),
    canonical: canon ? canon.attrs.href : null,
    robots: meta('name', 'robots'),
    og: group('property', 'og:'),
    article: Object.keys(group('property', 'article:')).length ? group('property', 'article:') : undefined,
    twitter: group('name', 'twitter:'),
    jsonLd,
  };
}
function breadcrumbsFrom(root, jsonLd, link) {
  const nav = findFirst(root, (x) => x.tag === 'nav' && hasCls(x, 'rank-math-breadcrumb'));
  if (nav) {
    const items = [];
    walkTree(nav, (x) => {
      if (x.tag === 'a') { items.push({ label: T(x), href: link(x.attrs.href).href }); return false; }
      if (hasCls(x, 'last')) { items.push({ label: T(x), href: null }); return false; }
      return undefined;
    });
    const sep = findFirst(nav, (x) => hasCls(x, 'separator'));
    return { items, source: 'visible', separator: sep ? decode((sep.children[0] && sep.children[0].text) || '') : undefined, ariaLabel: nav.attrs['aria-label'] || undefined };
  }
  for (const g of jsonLd) {
    const nodes = Array.isArray(g['@graph']) ? g['@graph'] : [g];
    const bl = nodes.find((n) => n && n['@type'] === 'BreadcrumbList');
    if (bl && Array.isArray(bl.itemListElement)) {
      const els = [...bl.itemListElement].sort((a, b) => (a.position || 0) - (b.position || 0));
      // JSON-LD strings are not HTML-rendered; Rank Math HTML-escapes them ("&amp;"), so labels are entity-decoded
      return { items: els.map((e, i) => ({ label: squash(decode(e.name || (e.item && e.item.name) || '')), href: i === els.length - 1 ? null : link(typeof e.item === 'string' ? e.item : e.item && e.item['@id']).href })), source: 'jsonld' };
    }
  }
  return { items: [], source: 'none' };
}
// Page region: <main> when present, else body children minus chrome (docs/CONTENT-MODEL.md section 2).
export function regionNodes(root) {
  const body = findFirst(root, (n) => n.tag === 'body') || root;
  const main = findFirst(body, (n) => n.tag === 'main');
  // Elementor popup docs live outside <main> (one on /about-cape-cod-cannabis/): they are page content shown on demand
  if (main) return { kind: 'main', nodes: [main, ...findAll(body, (n) => n.attrs['data-elementor-type'] === 'popup' && !isAncestor(main, n))] };
  return { kind: 'body-minus-chrome', nodes: elChildren(body).filter((c) => {
    if (['script', 'style', 'noscript', 'template', 'link'].includes(c.tag)) return false;
    const t = c.attrs['data-elementor-type'];
    if (t === 'header' || t === 'footer') return false;
    if (c.tag === 'header' || c.tag === 'footer') return false;
    if (c.attrs.id === 'joint-ecommerce') return false;
    if (cls(c).some((k) => k.includes('skip-link'))) return false;
    return true;
  }) };
}

// ---------------------------------------------------------------- one page
export function extractPage(html, S, meta) {
  const root = parse(html);
  const ledger = { collapsed: [], keptDeviceOnly: [], conflicts: [], unknown: [], widgetLoss: [], removed: [], links: [], aliasesResolved: [], imagesMissing: [], h1InRich: 0 };
  const ctx = { ledger, breadcrumbAt: false, ids: new Set(findAll(root, (x) => !!x.attrs.id).map((x) => x.attrs.id)) };
  ctx.link = makeLinker(S, meta.path, ledger);
  ctx.image = makeImager(S, ledger);
  ctx.noteHidden = (x) => { const t = T(x); if (t) ledger.removed.push({ what: /7b62afab7960ee01/.test(x.s != null ? html.slice(x.s, x.e) : '') ? 'wp-defender-honeypot' : 'display-none', text: t, reason: 'inline display:none in the source (invisible on every device)' }); };
  ctx.notePlatform = (x) => { const img = findFirst(x, (y) => y.tag === 'img'); const t = T(x) || (img ? img.attrs.alt : ''); if (!ledger.removed.some((r) => r.what === 'tec-loading-spinner')) ledger.removed.push({ what: 'tec-loading-spinner', text: t || null, reason: 'The Events Calendar AJAX loading spinner (plugin runtime UI, origin wp-content gif); declared in removals.json' }); };
  ctx.guard = (w, bl) => {
    const want = words(textOf(w, { skip: (x) => isDisplayNone(x) || isPlatformUi(x) || hasCls(x, 'rank-math-breadcrumb') || hasCls(x, 'elementor-nav-menu--dropdown') || (x.attrs.id || '').startsWith('sbi_mod_error') }));
    const got = words(bl.map(blockText).join('\n'));
    const glued = got.join('');
    // a word made of two adjacent block words ("Prev" + "Best..." printed without a space) is not a loss
    const missing = recallWords(want, got).filter((x) => !glued.includes(x));
    if (missing.length) ledger.widgetLoss.push({ id: w.attrs['data-id'], type: w.attrs['data-widget_type'], missingWords: missing.length, sample: missing.slice(0, 12).join(' ') });
  };
  const B = makeBlocks(ctx);
  const headInfo = extractHead(root);
  const region = regionNodes(root);
  const stream = [];
  for (const r of region.nodes) {
    if (r.attrs['data-elementor-type']) stream.push({ t: 'doc-start', docType: r.attrs['data-elementor-type'], docId: r.attrs['data-elementor-id'] }, ...B.walkChildren(r), { t: 'doc-end' });
    else stream.push(...B.walkChildren({ children: [r] }));
  }
  let sections = collapseDevices(sectionize(stream), ledger);
  // H2 change: a container anchor never repeats an id the page already carries (section cssId or an earlier anchor)
  {
    const seen = new Set();
    for (const s of sections) {
      if (s.cssId) seen.add(s.cssId);
      s.blocks = s.blocks.filter((b) => {
        if (b.t !== 'anchor' || !b.id) return true;
        if (seen.has(b.id) && typeof b.via === 'string' && b.via.startsWith('container#')) return false;
        seen.add(b.id);
        return true;
      });
    }
    sections = sections.filter((s) => s.blocks.length);
  }
  const isContainerAnchor = (b) => b.t === 'anchor' && typeof b.via === 'string' && b.via.startsWith('container#');
  sections = sections.map((s, i) => {
    // a container anchor alone does not make a hidden section visible
    const content = s.blocks.filter((b) => !isContainerAnchor(b));
    const hiddenAll = (content.length ? content : s.blocks).every((b) => b.hiddenAll) || undefined;
    return { n: i, id: s.id, doc: s.doc || undefined, popup: s.doc && s.doc.startsWith('popup#') ? true : undefined, cssId: s.cssId, cont: s.cont, hiddenAll, dev: s.dev, blocks: hiddenAll ? s.blocks.map((b) => ({ ...b, hiddenAll: true })) : s.blocks };
  });
  // conflicts: (1) kept device variants that partly repeat a sibling; (2) kept variants on disjoint devices whose lines
  // are equal once digits are masked but differ in their numbers (e.g. "28-gram" vs "56-gram")
  for (const k of ledger.keptDeviceOnly) if (k.partialDuplicate) ledger.conflicts.push({ kind: 'partial-duplicate', section: k.section, dev: k.dev, text: k.text });
  {
    const kept = [];
    for (const s of sections) for (const b of s.blocks) if (b.dev && b.dev.length && b.dev.length < VIEWS.length && !b.hiddenAll) kept.push({ s, b, lines: blockText(b).split('\n').map(squash).filter(Boolean) });
    const mask = (l) => normLine(l).replace(/\d+([.,]\d+)?/g, '#');
    for (let i = 0; i < kept.length; i++) for (let j = i + 1; j < kept.length; j++) {
      const A = kept[i], Bk = kept[j];
      if (A.b.dev.some((v) => Bk.b.dev.includes(v))) continue;
      const mb = new Map(Bk.lines.map((l) => [mask(l), l]));
      for (const la of A.lines) {
        const lb = mb.get(mask(la));
        if (lb !== undefined && normLine(lb) !== normLine(la) && /\d/.test(la) && !ledger.conflicts.some((c) => c.a && c.a.line === la && c.b.line === lb)) { ledger.conflicts.push({ kind: 'numbers-differ-by-device', a: { section: A.s.id, dev: A.b.dev, line: la }, b: { section: Bk.s.id, dev: Bk.b.dev, line: lb } }); A.b.conflict = true; Bk.b.conflict = true; }
      }
    }
  }

  // products: label = nearest preceding visible heading in the same section (verbatim), and the page catalog list
  const catalog = [];
  const eachBlock = (blocks, fn, path = []) => blocks.forEach((b, i) => {
    fn(b, blocks, i, path);
    if (b.t === 'faq') b.items.forEach((it, k) => eachBlock(it.blocks || [], fn, [...path, 'faq', k]));
    if (b.t === 'carousel') b.slides.forEach((sl, k) => eachBlock(sl.blocks || [], fn, [...path, 'slide', k]));
    if (b.t === 'posts') b.items.forEach((it, k) => it.blocks && eachBlock(it.blocks, fn, [...path, 'item', k]));
  });
  for (const s of sections) {
    eachBlock(s.blocks, (b, list, i) => {
      if (b.t !== 'products') return;
      for (let k = i - 1; k >= 0; k--) if (list[k].t === 'heading' && list[k].text) { b.label = list[k].text; b.labelFrom = 'heading'; break; }
      catalog.push({ section: s.id, widget: b.widget, label: b.label, filters: b.filters, sort: b.sort, limit: b.limit, params: b.params, hiddenAll: b.hiddenAll || s.hiddenAll || undefined });
    });
  }
  // H1: the first level-1 heading that is not hidden everywhere; the others are marked demote:true
  const h1s = [];
  for (const s of sections) eachBlock(s.blocks, (b) => { if (b.t === 'heading' && b.level === 1) h1s.push({ b, hidden: !!(b.hiddenAll || s.hiddenAll) }); });
  for (const s of sections) eachBlock(s.blocks, (b) => { if (b.t === 'event-field' && b.field === 'title' && b.level === 1) h1s.push({ b, hidden: !!(b.hiddenAll || s.hiddenAll), event: true }); });
  const visibleH1 = h1s.filter((x) => !x.hidden);
  const primary = visibleH1[0] || null;
  for (const x of h1s) if (x !== primary) x.b.demote = true;
  let firstHeading = null;
  for (const s of sections) { if (s.hiddenAll) continue; eachBlock(s.blocks, (b) => { if (!firstHeading && b.t === 'heading' && !b.hiddenAll && b.text) firstHeading = b; }); }
  const h1 = primary ? primary.b.text : null;
  const h1Source = { count: h1s.length, visible: visibleH1.length, hidden: h1s.length - visibleH1.length, inRich: ledger.h1InRich || undefined,
    note: !h1s.length ? 'source has no h1' : !visibleH1.length ? 'source h1 is hidden on every device' : visibleH1.length > 1 ? 'source has several visible h1s; the first is primary, the rest carry demote:true' : undefined,
    candidates: undefined };
  const bc = breadcrumbsFrom(root, headInfo.jsonLd, ctx.link);
  const pageAria = [];
  {
    const have = new Set();
    for (const s of sections) eachBlock(s.blocks, (b) => { for (const l of blockText(b).split('\n')) have.add(squash(l)); for (const l of b.ariaLabels || []) have.add(l); });
    const rec = (n) => {
      for (const c of n.children || []) {
        if (!isEl(c) || c.attrs['data-widget_type'] || isDisplayNone(c) || ['script', 'style', 'template', 'noscript', 'svg'].includes(c.tag)) continue;
        if (!visibleViews(c).length) continue;
        const a = squash(c.attrs['aria-label'] || '');
        if (a && !have.has(a) && !pageAria.includes(a) && !hasCls(c, 'rank-math-breadcrumb')) pageAria.push(a);
        rec(c);
      }
    };
    for (const r of region.nodes) rec({ children: [r] });
  }
  // no visible H1 in the source: every verbatim candidate, in order of preference; the site lane picks one
  if (!primary) {
    const cands = [];
    if (firstHeading) cands.push({ text: firstHeading.text, from: 'first visible heading (level ' + firstHeading.level + ')' });
    if (bc.items.length) cands.push({ text: bc.items[bc.items.length - 1].label, from: 'breadcrumb last item (' + bc.source + ')' });
    if (headInfo.title) cands.push({ text: headInfo.title, from: 'title' });
    h1Source.candidates = cands.length ? cands : undefined;
  }
  const body = findFirst(root, (x) => x.tag === 'body');
  const dedupe = (arr, key) => { const seen = new Set(); return arr.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); };
  ledger.links = dedupe(ledger.links, (x) => x.href + '|' + x.status);
  ledger.aliasesResolved = dedupe(ledger.aliasesResolved, (x) => x.from);
  ledger.imagesMissing = dedupe(ledger.imagesMissing, (x) => x.srcUrl);
  const counts = {};
  const countAll = (blocks) => eachBlock(blocks, (b) => { counts[b.t] = (counts[b.t] || 0) + 1; });
  for (const s of sections) countAll(s.blocks);
  return {
    schema: SCHEMA,
    path: meta.path,
    sourceUrl: meta.sourceUrl,
    requestedUrl: meta.requestedUrl,
    slug: meta.slug,
    kind: meta.kind,
    wpTemplate: wpTemplateOf(body ? body.attrs.class || '' : ''),
    derived: false,
    rawFile: 'audit/raw/' + meta.savedAs,
    rawSha256: meta.sha256,
    rawNote: meta.rawNote,
    variants: meta.variants,
    regionKind: region.kind,
    title: headInfo.title,
    metaDescription: headInfo.metaDescription,
    canonical: headInfo.canonical,
    robots: headInfo.robots,
    og: headInfo.og,
    article: headInfo.article,
    twitter: headInfo.twitter,
    jsonLd: headInfo.jsonLd,
    h1,
    h1Source,
    breadcrumbs: bc.items,
    breadcrumbsSource: bc.source,
    breadcrumbsSeparator: bc.separator,
    breadcrumbsLabel: bc.ariaLabel,
    breadcrumbsInRegion: ctx.breadcrumbAt || undefined,
    section: meta.navSection,
    ariaLabels: pageAria.length ? pageAria : undefined,
    sections,
    catalog: catalog.length ? catalog : null,
    blockCounts: Object.fromEntries(Object.entries(counts).sort((a, b) => (a[0] < b[0] ? -1 : 1))),
    ledger,
  };
}
export function wpTemplateOf(bodyClass) {
  const b = ' ' + bodyClass + ' ';
  const has = (t) => b.includes(' ' + t + ' ');
  if (has('home')) return 'home';
  const single = /\bsingle-(joint_[a-z]+|tribe_events|post)\b/.exec(bodyClass);
  if (single) return { joint_brands: 'brand', joint_categories: 'category', joint_recreational: 'town', joint_terpenes: 'terpene', joint_cannabinoids: 'cannabinoid', joint_effects: 'effect', joint_strains: 'strain', joint_specials: 'special', joint_stores: 'store', tribe_events: 'event', post: 'post' }[single[1]] || 'single-' + single[1];
  if (has('date')) return 'archive-date';
  if (has('category')) return 'archive-blog-category';
  if (has('blog')) return 'archive-blog';
  const pta = /\bpost-type-archive-([a-z_]+)\b/.exec(bodyClass);
  if (pta) return pta[1] === 'tribe_events' ? 'archive-events-calendar' : 'archive-' + pta[1].replace('joint_', '');
  if (has('page')) {
    if (has('page-template-elementor_canvas')) return 'page-canvas';
    if (has('page-template-elementor_header_footer')) return 'page-full-width';
    return 'page';
  }
  return 'other';
}

// ---------------------------------------------------------------- chrome (header, menus, footer, age gate)
export function extractChrome(html, S, file) {
  const root = parse(html);
  const ledger = { collapsed: [], keptDeviceOnly: [], conflicts: [], unknown: [], widgetLoss: [], removed: [], links: [], aliasesResolved: [], imagesMissing: [], h1InRich: 0 };
  const ctx = { ledger, breadcrumbAt: false, keepSourceHref: true, ids: new Set(findAll(root, (x) => !!x.attrs.id).map((x) => x.attrs.id)) };
  ctx.link = makeLinker(S, '/', ledger);
  ctx.image = makeImager(S, ledger);
  ctx.noteHidden = (x) => { const t = T(x); if (t) ledger.removed.push({ what: 'display-none', text: t }); };
  ctx.notePlatform = () => {};
  ctx.guard = (w, bl) => {
    const missing = recallWords(words(textOf(w, { skip: isDisplayNone })), words(bl.map(blockText).join('\n')));
    if (missing.length) ledger.widgetLoss.push({ id: w.attrs['data-id'], type: w.attrs['data-widget_type'], missingWords: missing.length, sample: missing.slice(0, 12).join(' ') });
  };
  const B = makeBlocks(ctx);
  const header = findFirst(root, (x) => x.attrs['data-elementor-type'] === 'header');
  const footer = findFirst(root, (x) => x.attrs['data-elementor-type'] === 'footer');
  const widget = (scope, id) => findFirst(scope, (x) => x.attrs['data-id'] === id);
  const byType = (scope, type) => findAll(scope, (x) => x.attrs['data-widget_type'] === type);
  const devOf = (n) => { const d = visibleViews(n); return d.length === VIEWS.length ? undefined : d; };
  const docSections = (doc) => {
    const stream = B.walkChildren(doc);
    // keep every block (no device collapse in chrome: the theme rebuilds chrome from the named parts below)
    return sectionize(stream).map((s, i) => ({ n: i, id: s.id, dev: s.dev, hiddenAll: s.blocks.every((b) => b.dev && !b.dev.length) || undefined, blocks: s.blocks.map((b) => (b.dev && !b.dev.length ? { ...b, hiddenAll: true } : b)) }));
  };

  // header pieces
  const navW = header ? byType(header, 'nav-menu.default')[0] : null;
  const nav = navW ? B.blocksFromWidget(navW)[0] : null;
  const dropdown = navW ? findFirst(navW, (x) => x.tag === 'nav' && hasCls(x, 'elementor-nav-menu--dropdown')) : null;
  const dropdownItems = dropdown ? B.navItems(findFirst(dropdown, (x) => x.tag === 'ul')) : null;
  const sameTree = (a, b) => JSON.stringify((a || []).map(strip)) === JSON.stringify((b || []).map(strip));
  const strip = (i) => ({ label: i.label, href: i.href, children: i.children ? i.children.map(strip) : undefined });
  const megaWs = header ? byType(header, 'mega-menu.default') : [];
  const logoW = header ? byType(header, 'theme-site-logo.default')[0] : null;
  const searchW = header ? byType(header, 'search-form.default')[0] : null;
  const ajaxW = header ? byType(header, 'jet-ajax-search.default')[0] : null;
  const htmlWs = header ? byType(header, 'html.default') : [];
  const ticker = htmlWs.map((w) => ({ w, text: T(w) })).find((x) => x.text);
  const hint = header ? findAll(header, (x) => x.attrs['data-widget_type'] === 'text-editor.default' || x.attrs['data-widget_type'] === 'heading.default').map((w) => ({ w, text: T(w) })).find((x) => /scroll/i.test(x.text)) : null;
  const gtW = header ? findFirst(header, (x) => hasCls(x, 'gtranslate_wrapper')) : null;
  const cartW = findFirst(root, (x) => x.attrs['data-widget_type'] === 'joint_cart.default');
  const topBtn = findFirst(root, (x) => x.attrs.id === 'topButton');
  const skip = findFirst(root, (x) => x.tag === 'a' && cls(x).some((k) => k.includes('skip-link')));
  const tickerLink = ticker ? findFirst(ticker.w, (x) => x.tag === 'a' && x.attrs.href) : null;
  const tickerContainer = ticker ? (() => { for (let x = ticker.w; x; x = x.parent) if (x.attrs && x.attrs['data-element_type'] === 'container' && visibleViews(x).length === 0) return x; return null; })() : null;

  // footer: generic sections (complete) + the agency credit and push prompt pulled out
  let agency = null;
  if (footer) {
    const rrh = findAll(footer, (x) => x.tag === 'a' && /rankreallyhigh\.com/i.test(x.attrs.href || ''));
    if (rrh.length) {
      // the smallest Elementor element that holds every credit link
      let box = rrh[0];
      while (box.parent && !(box.attrs['data-element_type'] && rrh.every((a) => isAncestor(box, a) || a === box))) box = box.parent;
      const img = findFirst(box, (x) => x.tag === 'img');
      agency = { removed: true, reason: 'Previous agency footer credit (BUILD-CONTRACT 4.8: removed with reason, recorded in the change ledger)', text: T(box) || null,
        links: rrh.map((a) => ({ label: T(a) || undefined, href: a.attrs.href, rel: a.attrs.rel || undefined })), image: img ? { alt: img.attrs.alt ?? null, srcUrl: lazySrc(img) } : undefined, elementId: box.attrs['data-id'] || null };
      box.__removed = true;
    }
  }
  const footerSections = footer ? docSections(stripRemoved(footer)) : [];
  // age gate <template>
  const tpl = findFirst(root, (x) => x.tag === 'template' && x.attrs.id === 'tmpl-age-gate');
  let ageGate = null;
  if (tpl) {
    const tplRoot = parse((tpl.children || []).map((c) => html.slice(c.s, c.e)).join(''));
    const txt = (sel) => { const n = findFirst(tplRoot, sel); return n ? T(n) || null : null; };
    const buttons = findAll(tplRoot, (x) => x.tag === 'button' || (x.tag === 'input' && ['submit', 'button'].includes(x.attrs.type)));
    const dlg = findFirst(tplRoot, (x) => !!x.attrs['aria-label'] && (x.attrs.role === 'dialog' || /age-gate/.test(x.attrs.class || '')));
    const info = findFirst(tplRoot, (x) => hasCls(x, 'age-gate-additional-information'));
    const notes = info ? elChildren(info).map(T).filter(Boolean) : [];
    const logo = findFirst(tplRoot, (x) => x.tag === 'img');
    const headline = txt((x) => hasCls(x, 'age-gate-headline'));
    const challenge = txt((x) => hasCls(x, 'age-gate-challenge'));
    const subheadline = txt((x) => hasCls(x, 'age-gate-subheadline'));
    const yes = buttons[0] ? T(buttons[0]) || null : null;
    const no = buttons[1] ? T(buttons[1]) || null : null;
    const contractCopy = ['Welcome!', 'Are you over 21 years of age?', 'Yes', 'No', '*Must be 21+ with a VALID ID.', 'Always worth the trip!'];
    ageGate = {
      headline,
      subheadline: subheadline || undefined,
      challenge,
      yes,
      no,
      notes,
      matchesContractCopy: JSON.stringify([headline, challenge, yes, no, ...notes]) === JSON.stringify(contractCopy),
      ariaLabel: dlg ? dlg.attrs['aria-label'] : null,
      ariaLabelNote: dlg && /%s/.test(dlg.attrs['aria-label'] || '') ? 'the plugin never fills %s; the rebuild says 21 (docs/CONTENT-MODEL.md section 2)' : undefined,
      logo: logo ? { alt: logo.attrs.alt ?? null, ...ctx.image(lazySrc(logo)) } : undefined,
      fields: findAll(tplRoot, (x) => x.tag === 'input').map((i) => ({ name: i.attrs.name, type: i.attrs.type, value: i.attrs.value })),
      from: '<template id="tmpl-age-gate"> after the footer (Age Gate plugin; cookie age_gate): h2.age-gate-headline, p.age-gate-challenge, button.age-gate-submit-yes/-no, .age-gate-additional-information',
    };
  }
  const honeypot = findFirst(root, (x) => isDisplayNone(x) && findFirst(x, (y) => y.tag === 'a' && /7b62afab7960ee01/.test(y.attrs.href || '')));
  return {
    schema: 'ccc-reforge/chrome@1',
    source: { file: 'audit/raw/' + file, header: header ? 'header#' + header.attrs['data-elementor-id'] : null, footer: footer ? 'footer#' + footer.attrs['data-elementor-id'] : null },
    skipLink: skip ? { label: T(skip), href: skip.attrs.href, from: 'a.skip-link (theme)' } : null,
    announcement: ticker ? { text: ticker.text, ...(tickerLink ? B.hrefFields(tickerLink.attrs.href) : {}), hiddenAll: visibleViews(ticker.w).length === 0 || undefined,
      from: 'header html widget ' + ticker.w.attrs['data-id'] + (tickerContainer ? ' in container ' + tickerContainer.attrs['data-id'] : '') + ' (elementor-hidden-* on every enabled breakpoint: not rendered visibly, BUILD-CONTRACT 4.5)' } : null,
    logo: logoW ? { ...B.blocksFromWidget(logoW)[0], t: undefined, from: 'header theme-site-logo ' + logoW.attrs['data-id'] } : null,
    nav: nav ? { items: nav.items, toggleLabel: nav.toggleLabel, from: 'header nav-menu ' + navW.attrs['data-id'] + ' (elementor-nav-menu--main)', dev: devOf(navW) } : null,
    mobileMenu: dropdownItems ? { sameAsNav: sameTree(nav && nav.items, dropdownItems), items: sameTree(nav && nav.items, dropdownItems) ? undefined : dropdownItems, from: 'the same nav-menu ' + navW.attrs['data-id'] + ' printed a second time as elementor-nav-menu--dropdown (aria-hidden, shown behind the burger at <=1025px)' } : null,
    mega: megaWs.map((w) => ({ id: w.attrs['data-id'], ...B.blocksFromWidget(w)[0], t: undefined, kind: undefined, from: 'header mega-menu (n-menu) ' + w.attrs['data-id'] + ': a flat link strip, no dropdown content', dev: devOf(w) })),
    megaHint: hint ? { text: hint.text, dev: devOf(hint.w), from: 'header ' + hint.w.attrs['data-widget_type'] + ' ' + hint.w.attrs['data-id'] } : null,
    search: searchW ? { ...B.blocksFromWidget(searchW)[0], t: undefined, from: 'header search-form ' + searchW.attrs['data-id'], dev: devOf(searchW) } : null,
    ajaxSearch: ajaxW ? { hiddenAll: visibleViews(ajaxW).length === 0 || undefined, ...B.blocksFromWidget(ajaxW)[0], t: undefined, categories: findAll(ajaxW, (x) => x.tag === 'option').map(T).filter(Boolean), from: 'header jet-ajax-search ' + ajaxW.attrs['data-id'] + ' (client-rendered results)' } : null,
    translate: gtW ? { removed: true, reason: 'GTranslate third-party runtime (BUILD-CONTRACT 4.8; listed in docs/OPEN-DECISIONS.md)', from: 'header shortcode #' + (gtW.attrs.id || '') } : null,
    footer: { sections: footerSections, from: footer ? 'footer#' + footer.attrs['data-elementor-id'] + ' walked with the page block walker; hiddenAll marks elementor-hidden-* on every enabled breakpoint' : null },
    agencyCredit: agency,
    backToTop: topBtn ? { href: topBtn.attrs.href || (findFirst(topBtn, (x) => x.tag === 'a') || { attrs: {} }).attrs.href || null, label: T(topBtn) || topBtn.attrs['aria-label'] || topBtn.attrs.title || null, from: '#topButton (fixed)' } : null,
    cart: cartW ? { config: parseJSON((findFirst(cartW, (x) => !!x.attrs['data-config']) || { attrs: {} }).attrs['data-config'] || '') || null, from: 'joint_cart widget ' + cartW.attrs['data-id'] + ' (client runtime; BUILD-CONTRACT 4.5 Commerce)' } : null,
    ageGate,
    removed: [
      honeypot ? { what: 'wp-defender-honeypot', text: T(honeypot), href: (findFirst(honeypot, (y) => y.tag === 'a') || { attrs: {} }).attrs.href, reason: 'WP Defender bot trap inside display:none (docs/SITE-ARCHITECTURE.md 1.7): never rendered, never followed' } : null,
      agency ? { what: 'agency-credit', text: agency.text, reason: agency.reason } : null,
      gtW ? { what: 'gtranslate', reason: 'third-party runtime (BUILD-CONTRACT 4.8)' } : null,
    ].filter(Boolean),
    ledger: { unknown: ledger.unknown, widgetLoss: ledger.widgetLoss, links: dedupeBy(ledger.links, (x) => x.href), imagesMissing: dedupeBy(ledger.imagesMissing, (x) => x.srcUrl) },
  };
}
const dedupeBy = (arr, key) => { const seen = new Set(); return arr.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); };
function stripRemoved(n) {
  // a shallow view of the tree without nodes flagged __removed
  const clone = (x) => (isEl(x) ? { ...x, children: (x.children || []).filter((c) => !c.__removed).map((c) => { const k = clone(c); k.parent = x; return k; }) } : x);
  const out = clone(n);
  const relink = (x, p) => { if (isEl(x)) { x.parent = p; (x.children || []).forEach((c) => relink(c, x)); } else if (x) x.parent = p; };
  relink(out, n.parent);
  return out;
}

// ---------------------------------------------------------------- nav section (active state) from the header menu
function navSectionOf(chrome, pagePath) {
  if (!chrome || !chrome.nav) return null;
  const tops = chrome.nav.items;
  const norm = (h) => (h ? h.split('#')[0].split('?')[0] : null);
  for (const t of tops) {
    const all = [];
    const rec = (i) => { if (i.href) all.push(norm(i.href)); (i.children || []).forEach(rec); };
    rec(t);
    if (all.includes(pagePath)) return t.label;
  }
  if (/^\/(categories|brands|products|specials|strains|effects|terpenes|cannabinoids|menu)\//.test(pagePath)) return (tops.find((t) => /shop/i.test(t.label) && (t.children || []).length) || {}).label || null;
  return null;
}

// ---------------------------------------------------------------- atomic output (H2 change)
// Every output is written to "<file>.tmp" and renamed over the target, so a reader (the build, running in parallel)
// sees either the old or the new bytes, never a truncated file, and no page file is ever deleted mid-run. Windows
// can refuse a rename while another process holds the target open: retry briefly, then fail loudly.
function writeAtomic(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, data);
  for (let i = 0; ; i++) {
    try { fs.renameSync(tmp, file); return; } catch (e) {
      if (i >= 50 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) { try { fs.unlinkSync(tmp); } catch { /* keep the error */ } throw e; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}

// ---------------------------------------------------------------- main
function main() {
  const args = process.argv.slice(2);
  const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
  // --out <dir> (H2 change): a dry run writes the pages, chrome.json and _index.json into <dir> instead of src/content/
  const outDir = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : OUT;
  const chromeFile = args.includes('--out') ? path.join(outDir, 'chrome.json') : path.join(WS, 'src/content/chrome.json');
  const S = loadContext();
  // group ok HTML pages by output path
  const groups = new Map();
  for (const p of S.inv.pages) {
    if (!p.ok || !/html/.test(p.contentType || '') || !p.savedAs) continue;
    const r = S.routeByUrl.get(p.url);
    let outPath = r && r.path ? r.path : withSlash(new URL(p.finalUrl || p.url).pathname);
    const cv = S.caseVariant.get(outPath);
    const variantKind = new URL(p.url).search ? 'query' : cv ? 'case' : null;
    if (cv) outPath = cv;
    outPath = outPath.replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase());
    if (!groups.has(outPath)) groups.set(outPath, []);
    groups.get(outPath).push({ p, route: r, variantKind });
  }
  for (const k of groups.keys()) S.outputPaths.add(k);
  // chrome first (the nav section of each page uses it)
  const chromeSrc = 'index.html';
  const chrome = extractChrome(fs.readFileSync(path.join(RAW, chromeSrc), 'utf8'), S, chromeSrc);
  const paths = [...groups.keys()].sort();
  fs.mkdirSync(outDir, { recursive: true });
  const index = [];
  const totals = { pages: 0, sections: 0, blocks: {}, unknown: [], widgetLoss: 0, collapsed: 0, hiddenAllSections: 0, hiddenAllBlocks: 0, keptDeviceOnly: 0, conflicts: 0, deadLinks: 0, unknownLinks: 0, imagesMissing: 0, noH1: [], multiH1: [], variantsDiffer: [] };
  const slugs = new Set();
  const chromeTextHashes = new Map();
  for (const outPath of paths) {
    const g = groups.get(outPath);
    const primary = g.find((x) => !x.variantKind) || g[0];
    const p = primary.p;
    let slug = p.savedAs.replace(/\.html$/, '');
    if (slug === 'index') slug = 'home';
    if (slugs.has(slug)) throw new Error('duplicate slug ' + slug);
    slugs.add(slug);
    if (only && !only.has(slug)) continue;
    const html = fs.readFileSync(path.join(RAW, p.savedAs), 'utf8');
    const variants = g.filter((x) => x !== primary).map((x) => ({ url: x.p.url, kind: x.variantKind, savedAs: x.p.savedAs, sameFile: x.p.savedAs === p.savedAs || undefined, sha256: x.p.sha256 }));
    const rawNote = g.some((x) => x.variantKind === 'case') ? 'On this case-insensitive disk the file holds the bytes of the uppercase case variant (docs/CONTENT-MODEL.md item 5); the lowercase response was not saved.' : undefined;
    const model = extractPage(html, S, {
      path: outPath, sourceUrl: p.finalUrl || p.url, requestedUrl: p.url !== p.finalUrl ? p.url : undefined, slug,
      kind: primary.route ? primary.route.template : null, savedAs: p.savedAs, sha256: p.sha256, rawNote,
      variants: variants.length ? variants : undefined, navSection: null,
    });
    model.section = navSectionOf(chrome, outPath);
    // query variants: compare their region text with the primary (they render the base path)
    for (const v of model.variants || []) {
      if (v.sameFile) continue;
      const vroot = parse(fs.readFileSync(path.join(RAW, v.savedAs), 'utf8'));
      const vr = regionNodes(vroot).nodes.map((n) => textOf(n)).join('\n');
      const pr = regionNodes(parse(html)).nodes.map((n) => textOf(n)).join('\n');
      v.sameRegionText = vr === pr;
      if (!v.sameRegionText) totals.variantsDiffer.push(outPath + ' <- ' + v.url);
    }
    // chrome identity check (header + footer text) across pages
    {
      const r = parse(html);
      const hd = findFirst(r, (x) => x.attrs['data-elementor-type'] === 'header');
      const ft = findFirst(r, (x) => x.attrs['data-elementor-type'] === 'footer');
      const key = (hd ? squash(textOf(hd)) : '-') + '||' + (ft ? squash(textOf(ft)) : '-');
      if (!chromeTextHashes.has(key)) chromeTextHashes.set(key, []);
      chromeTextHashes.get(key).push(outPath);
    }
    writeAtomic(path.join(outDir, slug + '.json'), stableJson(model));
    totals.pages++;
    totals.sections += model.sections.length;
    for (const [t, c] of Object.entries(model.blockCounts)) totals.blocks[t] = (totals.blocks[t] || 0) + c;
    for (const u of model.ledger.unknown) totals.unknown.push({ page: outPath, ...u });
    totals.widgetLoss += model.ledger.widgetLoss.length;
    totals.collapsed += model.ledger.collapsed.length;
    totals.keptDeviceOnly += model.ledger.keptDeviceOnly.length;
    totals.conflicts += model.ledger.conflicts.length;
    totals.hiddenAllSections += model.sections.filter((s) => s.hiddenAll).length;
    totals.hiddenAllBlocks += model.sections.reduce((a, s) => a + s.blocks.filter((b) => b.hiddenAll).length, 0);
    totals.deadLinks += model.ledger.links.filter((l) => l.status === 'dead').length;
    totals.unknownLinks += model.ledger.links.filter((l) => l.status === 'unknown').length;
    totals.imagesMissing += model.ledger.imagesMissing.length;
    if (!model.h1) totals.noH1.push(outPath);
    if (model.h1Source.visible > 1) totals.multiH1.push(outPath);
    index.push({ slug, path: outPath, kind: model.kind, wpTemplate: model.wpTemplate, sourceUrl: model.sourceUrl, title: model.title, h1: model.h1, variants: (model.variants || []).map((v) => v.url), sections: model.sections.length, hiddenAllSections: model.sections.filter((s) => s.hiddenAll).length, products: model.catalog ? model.catalog.length : 0, unknown: model.ledger.unknown.length });
  }
  if (only) { console.log(JSON.stringify(totals, null, 1)); return; }
  // chrome verification facts
  const chromeGroups = [...chromeTextHashes.entries()].map(([k, v]) => ({ pages: v.length, sample: v.slice(0, 3), hasHeader: !k.startsWith('-||'), hasFooter: !k.endsWith('||-') })).sort((a, b) => b.pages - a.pages);
  chrome.source.chromeTextGroups = chromeGroups;
  writeAtomic(chromeFile, stableJson(chrome));
  const summary = { ...totals, unknown: totals.unknown, noH1: totals.noH1, multiH1: totals.multiH1 };
  // _index.json LAST: the site lane treats its presence as "content extraction finished"
  writeAtomic(path.join(outDir, '_index.json'), stableJson({ schema: 'ccc-reforge/pages-index@1', count: index.length, pages: index, totals: { ...summary, noH1: summary.noH1.length, multiH1: summary.multiH1.length, unknown: summary.unknown.length } }));
  console.log(JSON.stringify({ pages: totals.pages, sections: totals.sections, unknownBlocks: totals.unknown.length, unknownTypes: [...new Set(totals.unknown.map((u) => u.widget))], widgetLoss: totals.widgetLoss, collapsed: totals.collapsed, keptDeviceOnly: totals.keptDeviceOnly, conflicts: totals.conflicts, hiddenAllSections: totals.hiddenAllSections, hiddenAllBlocks: totals.hiddenAllBlocks, deadLinks: totals.deadLinks, unknownLinks: totals.unknownLinks, imagesMissing: totals.imagesMissing, noH1: totals.noH1.length, multiH1: totals.multiH1.length, variantsDiffer: totals.variantsDiffer, chromeGroups: chromeGroups.length, blocks: totals.blocks }, null, 1));
}

const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) main();
