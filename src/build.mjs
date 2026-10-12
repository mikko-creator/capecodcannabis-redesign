#!/usr/bin/env node
// build.mjs - the static build (PIPELINE-SITE; BUILD-CONTRACT 3.1).
//   node src/build.mjs [--out dist] [--cache assets/optimized] [--models src/content/pages] [--report <file>]
//                      [--allow-missing-models] [--theme stub]
// Reads src/content/routes.json, the page models, src/content/chrome.json, src/content/catalog/*.json and
// facts/client-facts.json; builds ctx once; renders every route with src/theme/index.mjs (else src/theme-stub/);
// writes <out>/<path>/index.html, 404.html, robots.txt, sitemap.xml, _redirects, .htaccess, assets/.
// Exit 1 on: a dead internal link or asset, a duplicate output path, a page without exactly one <h1>, an unknown
// block type, or platform residue in the output. Deterministic: constant dates, sorted iteration, hash-named assets.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { ROOT, ORIGIN, splitInternal, encodePath, outFileOf, liveUrl, withSlash, isFileLike, relUrl } from './lib/paths.mjs';
import { BUILD_DATE, SNAPSHOT_DATE, readJSON, exists, siteFromFacts, decodeEntities, writeIfChanged } from './lib/site.mjs';
import { loadCatalog } from './lib/catalog.mjs';
import { createImageIndex, resolveImage, ImagePipeline } from './lib/images.mjs';
import { KNOWN_BLOCKS, RESIDUE_RE, Linker, rewriteRich, relativizeHtml, rootAbsoluteLeft, countH1, residueHits, walkBlocks, esc, escAttr, attrs } from './lib/render-util.mjs';
import { applyLdPolicy, CONFLICT_POLICY, PLATFORM_ID_RE, outKey, modelProblems, sanitizeHtml } from './lib/policy.mjs';

const t0 = process.hrtime.bigint();
const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i === -1 ? d : argv[i + 1]; };
const flag = (k) => argv.includes(k);
const OUT = path.resolve(arg('--out', path.join(ROOT, 'dist')));
const CACHE = path.resolve(arg('--cache', path.join(ROOT, 'assets', 'optimized')));
const MODELS = path.resolve(arg('--models', path.join(ROOT, 'src', 'content', 'pages')));
const REPORT = arg('--report');
const ALLOW_MISSING = flag('--allow-missing-models');
const log = (...a) => console.log(...a);
const errors = [];
const fail = (kind, detail) => errors.push({ kind, ...detail });
const SUFFIX = ' | Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/* ------------------------------------------------------------------ inputs */
const routes = arg('--routes') ? JSON.parse(fs.readFileSync(path.resolve(arg('--routes')), 'utf8')) : readJSON('src/content/routes.json');
const catalog = loadCatalog();
const site = siteFromFacts();
const seo = readJSON('audit/seo-inventory.json');
const inv = readJSON('audit/site-inventory.json');
const ia = readJSON('audit/understand/ia-map.json');
const imagePlan = exists('src/content/image-plan.json') ? (() => { const j = readJSON('src/content/image-plan.json'); const slots = j.slots || j; return Array.isArray(slots) ? Object.fromEntries(slots.map((s) => [s.id || s.slot, s])) : slots; })() : {};
const seoByFinal = new Map();
for (const p of seo.pages) { seoByFinal.set(p.finalUrl, p); seoByFinal.set(p.url, p); }
const invByFinal = new Map(inv.pages.filter((p) => p.finalUrl).map((p) => [p.finalUrl, p]));

/* page models: <models>/_index.json when present (any of: [{path|url, file|model}] or {path: file}), else by convention
   <models>/<savedAs without .html>.json */
function modelIndex() {
  const idx = new Map();
  const f = path.join(MODELS, '_index.json');
  if (!fs.existsSync(f)) return { idx, source: 'convention (no _index.json)' };
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const rows = Array.isArray(j) ? j : Array.isArray(j.pages) ? j.pages : Array.isArray(j.models) ? j.models : Object.entries(j.byPath || j.paths || {}).map(([p, file]) => ({ path: p, file }));
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const p = r.path ? withSlash(r.path) : r.url ? (splitInternal(r.url) || {}).path : null;
    const file = r.file || r.model || r.json || (r.slug ? r.slug + '.json' : null);
    if (p && file) idx.set(p, file.endsWith('.json') ? file : file + '.json');
  }
  return { idx, source: '_index.json (' + idx.size + ' entries)' };
}
const MI = modelIndex();
/* models are read and validated once, BEFORE --out is wiped (BUILD-CONTRACT 4.16.10): a malformed model fails the
   build cleanly with a reported error and leaves the previous output untouched */
const modelCache = new Map();
function loadModel(route) {
  if (modelCache.has(route.path)) return modelCache.get(route.path);
  let file = MI.idx.get(route.path);
  if (!file && route.model) file = route.model + '.json';
  let m = null;
  if (file) {
    const abs = path.join(MODELS, file);
    if (fs.existsSync(abs)) {
      try { m = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch (e) { m = { __invalid: 'unparsable JSON: ' + String(e.message).slice(0, 120) }; }
    }
  }
  modelCache.set(route.path, m);
  return m;
}

/* chrome: src/content/chrome.json (PIPELINE-CONTENT), else the ia-map nav (development fallback) */
function loadChrome() {
  const cf = arg('--chrome');
  if (cf) return JSON.parse(fs.readFileSync(path.resolve(cf), 'utf8'));
  if (exists('src/content/chrome.json')) return { source: 'src/content/chrome.json', ...readJSON('src/content/chrome.json') };
  /* the ia-map fallback is for development only: a real build without the content lane's chrome fails closed */
  if (!ALLOW_MISSING) fail('missing-chrome', { file: 'src/content/chrome.json' });
  const n = ia.nav;
  const clean = (h) => (typeof h === 'string' ? h.split(' (')[0].trim() : h);
  const items = (arr) => (arr || []).map((i) => ({ label: i.label, href: clean(i.href), target: i.target, title: i.title, children: i.children ? items(i.children) : undefined }));
  const pairs = (arr) => (arr || []).map((x) => (Array.isArray(x) ? { label: x[0], href: x[1] } : x));
  const f = n.footer;
  return {
    source: 'audit/understand/ia-map.json nav (fallback: src/content/chrome.json missing)',
    header: { logo: { href: '/', alt: n.header.logo.alt }, search: { placeholder: n.header.search.placeholder, field: 's' }, menu: items(n.header.mainMenu.items),
      strips: [items(n.mega.categoryStrip.items), items(n.mega.shopByStrip.items)], hint: 'Scroll left-right to view categories' },
    footer: {
      newsletter: { heading: f.newsletterBand.heading, text: f.newsletterBand.text, button: f.newsletterBand.button },
      tagline: f.brandColumn.tagline, social: f.brandColumn.social,
      hours: { heading: f.hours.heading, rows: null },
      contact: { heading: f.contact.heading, text: f.contact.text, phone: f.contact.phone, links: f.contact.links },
      columns: [{ heading: f.menuColumn.heading, links: pairs(f.menuColumn.links) }, { heading: f.learnColumn.heading, links: pairs(f.learnColumn.links) }],
      legal: { copyright: f.legalRow.copyright, links: pairs(f.legalRow.links), license: f.legalRow.license },
      serviceArea: { text: f.serviceArea.text, links: pairs(f.serviceArea.links) },
      chambers: { text: f.chambers.text, links: pairs(f.chambers.links) },
    },
    ageGate: null,
  };
}
const chromeRaw = loadChrome();
const AGE_GATE = { headline: 'Welcome!', challenge: 'Are you over 21 years of age?', yes: 'Yes', no: 'No', notes: ['*Must be 21+ with a VALID ID.', 'Always worth the trip!'], ariaLabel: 'Verify you are over 21 years of age?', storageKey: 'ccc-age-21', logo: null, source: 'BUILD-CONTRACT 4.4 / docs/COMPLIANCE.md 4.1 (verbatim)' };
/** normalise the content lane's chrome.json (schema ccc-reforge/chrome@1) to ctx.nav / ctx.footer / ctx.ageGate */
function chromeToCtx(c) {
  if (!(c.schema && /chrome@/.test(c.schema))) return { nav: c.header, footer: c.footer, announcement: null, ageGate: AGE_GATE, source: c.source };
  const g = c.ageGate || {};
  const copy = g.contractCopy || [];
  return {
    source: 'src/content/chrome.json (' + c.schema + ')',
    nav: { logo: c.logo || null, menu: (c.nav && c.nav.items) || [], toggleLabel: c.nav && c.nav.toggleLabel || null, strips: (c.mega || []).map((m) => m.items || []),
      hint: c.megaHint ? c.megaHint.text : null, search: c.search || null, skipLink: c.skipLink || null, backToTop: c.backToTop || null },
    footer: { sections: (c.footer && c.footer.sections) || [] },
    announcement: c.announcement || null,
    ageGate: { ...AGE_GATE, headline: g.headline || copy[0] || AGE_GATE.headline, challenge: g.challenge || AGE_GATE.challenge, yes: g.yes || AGE_GATE.yes, no: g.no || AGE_GATE.no,
      notes: copy.length >= 6 ? copy.slice(4) : AGE_GATE.notes, ariaLabel: (g.ariaLabel || AGE_GATE.ariaLabel).replace('%s', '21'), logo: g.logo || null },
  };
}
const chrome = chromeToCtx(chromeRaw);

/* ------------------------------------------------------------------ ctx */
const linker = new Linker(routes);
const imgIndex = createImageIndex();
const images = new ImagePipeline({ cacheDir: CACHE, outDir: OUT, log });
const missingImages = new Map();
const assetFiles = new Map();     // output rel path -> source abs path (copied at the end)
const assetUrls = new Map();      // logical name -> root-relative url
let current = null;               // the page being rendered (default `from` for ctx.link / ctx.rich)

function fingerprintCopy(logical, srcAbs) {
  if (assetUrls.has(logical)) return assetUrls.get(logical);
  const buf = fs.readFileSync(srcAbs);
  const ext = path.extname(logical);
  const rel = 'assets/' + logical.slice(0, -ext.length) + '.' + sha(buf).slice(0, 10) + ext;
  assetFiles.set(rel, srcAbs);
  const url = '/' + rel;
  assetUrls.set(logical, url);
  return url;
}

const lateUsed = new Map();      // late image file -> { srcUrl, pages:Set } (BUILD-CONTRACT 4.15.5)
const sanitized = new Map();     // removed kind (script, iframe, on*, javascript:) -> { count, pages:Set } (4.16.10)
function imgTag(ref, o = {}) {
  /* a captured URL resolves to a local file first: since 4.15.5 that includes the late images (the Dutchie event
     images and the home banners fetched into assets/source/late/), which get WebP variants like any other */
  const r = resolveImage(ref, imgIndex, imagePlan);
  if (!r.missing && r.late) {
    if (!lateUsed.has(r.file)) lateUsed.set(r.file, { srcUrl: String(ref).split('?')[0], pages: new Set() });
    const e = lateUsed.get(r.file); if (e.pages.size < 5 && current) e.pages.add(current.path);
  }
  /* a Dutchie product photo with no local copy is hotlinked with imgix parameters, as the live site does
     (BUILD-CONTRACT 4.5); its source size is unknown, so 600 and 1200 wide */
  const dm = r.missing && typeof ref === 'string' && ref.match(/^https?:\/\/images\.dutchie\.com\/([0-9a-z]{16,64})/i);
  if (dm) {
    if (current) linker.note('hotlinked:dutchie-image', dm[1], current.path);
    const u1 = ctx.dutchie(dm[1], { w: 600, fit: 'max' }), u2 = ctx.dutchie(dm[1], { w: 1200, fit: 'max' });
    return '<img' + attrs({ src: u1, srcset: u1 + ' 600w, ' + u2 + ' 1200w', sizes: o.sizes || '100vw', alt: o.alt ?? '', width: +o.width || null, height: +o.height || null, class: o.cls || null, loading: o.loading || 'lazy', decoding: o.decoding || 'async' }) + '>';
  }
  const alt = o.alt ?? r.alt ?? '';
  if (r.missing) {
    const k = r.slot ? 'slot:' + r.slot : String(ref).split('?')[0];
    if (!missingImages.has(k)) missingImages.set(k, { ref: k, reason: r.missing, pages: new Set() });
    const e = missingImages.get(k); if (e.pages.size < 5 && current) e.pages.add(current.path);
    const w = +o.width || null, h = +o.height || null;
    return '<span' + attrs({ class: ['img-missing', o.cls].filter(Boolean).join(' '), 'data-slot': r.slot || null, role: alt ? 'img' : null, 'aria-label': alt || null, style: w && h ? 'aspect-ratio:' + w + '/' + h : null }) + '></span>';
  }
  const vs = images.variants(r.file, o.widths);
  if (!vs) {
    const url = fingerprintCopy('media/' + path.basename(r.file).replace(/^[0-9a-f]{8}-/, 'img-'), path.join(ROOT, r.file));
    return '<img' + attrs({ src: url, alt, loading: o.loading || 'lazy', decoding: o.decoding || 'async', class: o.cls || null }) + '>';
  }
  const big = vs[vs.length - 1];
  const fallback = vs.find((v) => v.w >= 960) || big;
  return '<img' + attrs({
    src: fallback.url, srcset: vs.map((v) => v.url + ' ' + v.w + 'w').join(', '), sizes: o.sizes || '100vw',
    width: big.w, height: big.h, alt, title: o.title || null, class: o.cls || null,
    loading: o.loading || 'lazy', fetchpriority: o.fetchpriority || null, decoding: o.decoding || 'async',
  }) + '>';
}

const ctx = {
  site, chrome: chromeRaw, nav: chrome.nav, footer: chrome.footer, announcement: chrome.announcement || null,
  ageGate: chrome.ageGate || AGE_GATE,
  buildDate: BUILD_DATE, snapshotDate: SNAPSHOT_DATE, origin: ORIGIN,
  catalog, routes,
  esc, escAttr, attrs,
  get page() { return current; },
  /** any source or output path/URL -> root-relative output URL (percent-encoded), or null when it is not built */
  url(u, from) { const r = linker.resolve(u, from || (current && current.path) || '/'); return r.unlink ? null : r.href; },
  /** full resolution: { href, external? } | { unlink, reason }. An external link to a harvested image file (an image
      that links to its own full-size copy on the CDN) points at the largest rebuilt variant instead. */
  link(u, from) {
    const r = linker.resolve(u, from || (current && current.path) || '/');
    if (r.external && /^https?:/i.test(r.href) && (RESIDUE_RE.lastIndex = 0, RESIDUE_RE.test(r.href))) {
      RESIDUE_RE.lastIndex = 0;
      const im = resolveImage(r.href, imgIndex, imagePlan);
      const vs = im.missing ? null : images.variants(im.file);
      if (vs) { linker.note('rewritten:image-file-link', String(u).split('?')[0], current && current.path); return { href: vs[vs.length - 1].url }; }
      linker.note('unlinked:platform-file-link', String(u).split('?')[0], current && current.path);
      return { unlink: true, reason: 'link to a platform-hosted file that the harvest does not hold' };
    }
    return r;
  },
  /** a model's rich HTML with links resolved and images made responsive, then sanitised (BUILD-CONTRACT 4.16.10:
      no <script>, on* attributes, javascript: URLs, or <iframe> other than the Google Maps embed form) */
  rich(html, from) {
    const s = sanitizeHtml(rewriteRich(html, ctx, from || (current && current.path) || '/'));
    if (s.removed.length) for (const k of s.removed) { if (!sanitized.has(k)) sanitized.set(k, { count: 0, pages: new Set() }); const e = sanitized.get(k); e.count++; if (e.pages.size < 5 && current) e.pages.add(current.path); }
    return s.html;
  },
  img: imgTag,
  imgSrc(ref, width = 960) {
    const r = resolveImage(ref, imgIndex, imagePlan);
    if (r.missing) return null;
    const vs = images.variants(r.file);
    if (!vs) return fingerprintCopy('media/' + path.basename(r.file), path.join(ROOT, r.file));
    return (vs.find((v) => v.w >= width) || vs[vs.length - 1]).url;
  },
  /** product image hotlinked from images.dutchie.com (imgix), as the live site does */
  dutchie(hash, { w = 344, h = 330, fit = 'fill', dpr } = {}) {
    if (!hash) return null;
    const q = fit === 'fill' ? 'auto=format&fit=fill&fill=solid&w=' + w + '&h=' + h : 'auto=format&w=' + w;
    return 'https://images.dutchie.com/' + encodeURIComponent(hash) + '?' + q + (dpr ? '&dpr=' + dpr : '');
  },
  /** fingerprinted URL of a site asset: 'site.css', 'site.js', 'fonts/<file>', 'brand/<file>', 'generated/<file>' */
  asset(name) {
    if (assetUrls.has(name)) return assetUrls.get(name);
    const abs = path.join(ROOT, 'assets', name);
    if (!/^(fonts|brand|generated)\//.test(name) || !fs.existsSync(abs)) { fail('missing-asset', { asset: name, page: current && current.path }); return '/assets/missing/' + name; }
    return fingerprintCopy(name, abs);
  },
  /** the live-site URL of an output path (the hand-off to the live menu; carries data-handoff="live-menu") */
  live(p) { return liveUrl(p); },
  pagesByPath: new Map(),
  collections: {},
};

/* ------------------------------------------------------------------ head + page assembly */
const stripSuffix = (t) => String(t || '').replace(/\s*\|\s*Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA.*$/, '').trim();
function parseJSONsafe(s) { try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; } }
const ogImageFor = (u) => { const r = resolveImage(u, imgIndex, imagePlan); if (r.missing) return null; const vs = images.variants(r.file); if (!vs) return null; const v = vs.find((x) => x.w >= 1200) || vs[vs.length - 1]; return { url: ORIGIN + v.url, width: v.w, height: v.h }; };
/** JSON-LD: keep the source graph; every URL that names platform paths is mapped to a rebuilt image or dropped */
function cleanLd(node, dropped) {
  if (Array.isArray(node)) return node.map((n) => cleanLd(n, dropped)).filter((n) => n !== undefined);
  if (node && typeof node === 'object') {
    const o = {};
    for (const k of Object.keys(node)) { const v = cleanLd(node[k], dropped); if (v !== undefined) o[k] = v; }
    return o;
  }
  if (typeof node === 'string' && (RESIDUE_RE.lastIndex = 0, RESIDUE_RE.test(node))) {
    RESIDUE_RE.lastIndex = 0;
    if (/^https?:\/\//.test(node)) { const m = ogImageFor(decodeEntities(node)); if (m) return m.url; }
    dropped.push(node.slice(0, 160));
    return undefined;
  }
  return node;
}
/** BUILD-CONTRACT 4.7: one business entity with an @id. The Rank Math graph's "#organization" node stays and is the
    business; every standalone LocalBusiness/Store/Organization script (the Joint blocks) is folded into it: types are
    unioned, properties it lacks are copied from the source node, conflicting values keep the #organization value and
    are listed in page.ldNotes (e.g. paymentAccepted, which the live site states two ways). Nothing is invented. */
function consolidateLd(list, notes) {
  if (!Array.isArray(list)) return list;
  let primary = null;
  for (const s of list) for (const n of (s && s['@graph']) || [s]) if (!primary && n && typeof n['@id'] === 'string' && /#organization$/.test(n['@id'])) primary = n;
  if (!primary) return list;
  const isBiz = (n) => [].concat(n && n['@type'] || []).some((t) => /^(LocalBusiness|Store|Organization)$/.test(t));
  const out = [];
  for (const s of list) {
    if (!s || s['@graph'] || !isBiz(s)) { out.push(s); continue; }
    for (const [k, v] of Object.entries(s)) {
      if (k === '@context' || k === '@id') continue;
      if (k === '@type') { primary['@type'] = [...new Set([].concat(primary['@type'] || [], v))]; continue; }
      if (primary[k] === undefined) primary[k] = v;
      else if (JSON.stringify(primary[k]) !== JSON.stringify(v)) notes.push(k + ': kept the #organization value over ' + (s['@id'] || 'a second business node'));
    }
    notes.push('folded ' + (s['@id'] || [].concat(s['@type']).join('+')) + ' into #organization');
  }
  return out;
}
/** head text that carries a platform URL (a source copy defect, e.g. a .mov URL inside a meta description): the URL
    token is removed with its separator and the change is declared in page.headDropped */
function scrubText(s, dropped, field) {
  if (typeof s !== 'string') return s;
  RESIDUE_RE.lastIndex = 0;
  if (!RESIDUE_RE.test(s)) { RESIDUE_RE.lastIndex = 0; return s; }
  RESIDUE_RE.lastIndex = 0;
  const out = s.replace(/\s*\|?\s*(?:https?:)?\/\/\S*(?:wp-content|elementor|litespeed|joint-ecommerce)\S*/gi, '').replace(/\s{2,}/g, ' ').trim();
  dropped.push(field + ': removed a platform URL from the text');
  return out;
}
function headFor(route, seoRow) {
  const og = parseJSONsafe(seoRow && seoRow.openGraph) || {};
  const tw = parseJSONsafe(seoRow && seoRow.twitter) || {};
  const ld = parseJSONsafe(seoRow && seoRow.jsonLd) || [];
  const dropped = [];
  for (const m of [og, tw]) for (const k of Object.keys(m)) if (!/image/.test(k) && typeof m[k] === 'string') m[k] = scrubText(m[k], dropped, k);
  const cleanMeta = (m) => {
    const o = {};
    for (const k of Object.keys(m).sort()) {
      let v = m[k];
      /* Rank Math's Slack-unfurl extras ("Written by" <WP user>, "Time to read"): the author is the previous agency's
         account (rrh_clientadmin), so the pairs are dropped (BUILD-CONTRACT 4.8) */
      if (/^twitter:(label|data)\d+$/.test(k)) { dropped.push(k); continue; }
      if (Array.isArray(v) || (v && typeof v === 'object')) v = Array.isArray(v) ? v.join(',') : JSON.stringify(v);
      if (/^og:video/.test(k) && /(wp-content|capecodcannabis\.com\/[^,]*\.(mp4|mov|webm))/i.test(String(v))) { dropped.push(k + ' (self-hosted video not in the harvest)'); continue; }
      if (/:image(:secure_url)?$/.test(k) || k === 'twitter:image') {
        const im = ogImageFor(decodeEntities(String(v)));
        if (!im) { dropped.push(k + ' ' + String(v).slice(0, 120)); continue; }
        v = im.url;
        if (k === 'og:image') { o['og:image:width'] = String(im.width); o['og:image:height'] = String(im.height); }
      } else if (/^og:image:(width|height|type)$/.test(k)) continue;
      else if (k === 'og:url') v = route.canonicalUrl || liveUrl(route.path);
      if (typeof v === 'string') { RESIDUE_RE.lastIndex = 0; if (RESIDUE_RE.test(v)) { dropped.push(k); continue; } }
      o[k] = decodeEntities(String(v));
    }
    return o;
  };
  return { og: cleanMeta(og), twitter: cleanMeta(tw), jsonLd: cleanLd(ld, dropped), dropped };
}

const breadcrumbCache = new Map();
function breadcrumbsFromRaw(route) {
  if (!route.evidence || !route.evidence.startsWith('audit/raw/')) return [];
  if (breadcrumbCache.has(route.path)) return breadcrumbCache.get(route.path);
  const html = fs.readFileSync(path.join(ROOT, route.evidence), 'utf8');
  const m = html.match(/<nav aria-label="breadcrumbs"[^>]*>([\s\S]*?)<\/nav>/i);
  const out = [];
  if (m) for (const x of m[1].matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<span class="last">([\s\S]*?)<\/span>/g)) {
    if (x[1]) out.push({ label: decodeEntities(x[2].replace(/<[^>]+>/g, '')).trim(), href: (splitInternal(x[1]) || {}).path || null });
    else out.push({ label: decodeEntities(x[3].replace(/<[^>]+>/g, '')).trim(), href: null });
  }
  breadcrumbCache.set(route.path, out);
  return out;
}

function cssIdsFromRaw(route) {
  const out = new Map();
  if (!route.evidence || !route.evidence.startsWith('audit/raw/')) return out;
  const html = fs.readFileSync(path.join(ROOT, route.evidence), 'utf8');
  for (const m of html.matchAll(/<(?:section|div)\b[^>]*\bdata-id="([0-9a-f]+)"[^>]*>/g)) {
    const idm = m[0].match(/\sid="([^"]+)"/);
    if (idm && !out.has(m[1])) out.set(m[1], idm[1]);
  }
  return out;
}

const SECTION_OF = [[/^\/(menu|categories|brands|specials|products|effects|strains|terpenes|cannabinoids|staff-picks|top-sellers|new-products|sleep-products|shop-high-testing-flower|all-[^/]+)\//, 'shop'],
  [/^\/(our-blog|category|tag|\d{4}|events-calendar|event|intro-to-cannabis-101|faqs-420|free-rack-cards|terpene-cannabinoid-guide|daily-purchase-limit-in-ma)\//, 'learn'],
  [/^\/(about-cape-cod-cannabis|contact-cape-cod-cannabis|join-our-team-cape-cod-cannabis|leave-your-review|loyalty-sign-up|return-policy|join-our-newsletter|things-to-do-near-cape-cod-cannabis-in-wellfleet-ma)\//, 'about'],
  [/^\/directions\//, 'directions'], [/^\/shop-your-loyalty-points\//, 'loyalty'], [/^\/$/, 'home']];
const sectionOf = (p) => { for (const [re, s] of SECTION_OF) if (re.test(p)) return s; return null; };

/** collections the theme can list completely (blog posts, events) - captured data only */
function memberCard(p) {
  const r = routesByPath.get(p);
  const s = r && seoByFinal.get(r.sourceUrl);
  const og = parseJSONsafe(s && s.openGraph) || {};
  const outline = parseJSONsafe(s && s.headingOutline) || [];
  const h1 = (outline.find((x) => /^1:/.test(x)) || '').slice(2) || stripSuffix(s && s.title);
  return { href: p, title: decodeEntities(h1), excerpt: s && s.metaDescription ? decodeEntities(s.metaDescription) : null, excerptSource: 'meta description', image: og['og:image'] ? { src: decodeEntities(og['og:image']), alt: decodeEntities(og['og:image:alt'] || '') } : null, date: r && r.published || null };
}
const routesByPath = new Map(routes.routes.map((r) => [r.path, r]));
ctx.collections.posts = routes.routes.filter((r) => r.kind === 'blog-post').map((r) => memberCard(r.path)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.href < b.href ? -1 : 1));
ctx.collections.events = routes.routes.filter((r) => r.kind === 'event').map((r) => memberCard(r.path)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.href < b.href ? -1 : 1));

const productsByPath = new Map(catalog.products.map((p) => [p.path, p]));
const brandByPath = new Map(catalog.brands.map((b) => [b.path, b]));
const productRef = (p) => ({ path: p.path, title: p.title, brand: p.brand, size: p.size, strainType: p.strainType, full: p.full || undefined });
const missingModels = [];
const unknownBlocks = new Map();
const h1Notes = [];
const conflictPurges = [];       // 4.16.4: purged conflict variants { path, t, dev, text }
const ldDropLog = [];            // 4.7 / 4.16.11: JSON-LD changes per page
const ogImageOmitted = [];       // 4.16.12: og:image omitted (origin-hosted source)
/** the text of a block, flattened (for removal declarations) */
function blockSummary(b) {
  const parts = [];
  const rec = (x, k) => {
    if (x == null) return;
    if (typeof x === 'string') { if (!['t', 'href', 'ref', 'srcUrl', 'kind', 'dev', 'id', 'src'].includes(k)) parts.push(/html$/i.test(k || '') ? x.replace(/<[^>]+>/g, ' ') : x); return; }
    if (Array.isArray(x)) { x.forEach((v) => rec(v, k)); return; }
    if (typeof x === 'object') for (const [kk, v] of Object.entries(x)) if (!['dev', 'conflict', 'hiddenAll'].includes(kk)) rec(v, kk);
  };
  rec(b, null);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function assemble(route) {
  const seoRow = route.sourceUrl ? seoByFinal.get(route.sourceUrl) : null;
  let sections = [];
  let ledger = null;
  let model = null;
  if (!route.derived && route.kind !== 'product') {
    model = loadModel(route);
    if (!model) { missingModels.push(route.path); sections = []; }
    else { sections = JSON.parse(JSON.stringify(model.sections || [])); ledger = model.ledger || null; }
    /* section CSS ids (in-page jump targets such as #directions) are not in the model: recover them from the raw
       HTML by the section's Elementor data-id */
    const ids = cssIdsFromRaw(route);
    for (const s of sections) if (s.id && ids.has(String(s.id)) && !s.cssId) s.cssId = ids.get(String(s.id));
  }
  /* decontamination (BUILD-CONTRACT 4.8): a block that carries the previous agency's credit or the WP Defender trap is
     dropped and declared in page.removedBlocks */
  const removedBlocks = [];
  const purge = (list) => {
    if (!Array.isArray(list)) return list;
    const keep = [];
    for (const b of list) {
      const s = JSON.stringify(b);
      if (/rankreallyhigh|7b62afab7960ee01/i.test(s) && !(Array.isArray(b.blocks) || Array.isArray(b.slides) || (Array.isArray(b.items) && b.items.some((i) => i && i.blocks)))) { removedBlocks.push({ t: b.t, why: /rankreallyhigh/i.test(s) ? 'previous agency credit (BUILD-CONTRACT 4.8)' : 'WP Defender honeypot' }); continue; }
      if (Array.isArray(b.blocks)) b.blocks = purge(b.blocks);
      for (const k of ['slides', 'items']) if (Array.isArray(b[k])) for (const it of b[k]) if (it && Array.isArray(it.blocks)) it.blocks = purge(it.blocks);
      keep.push(b);
    }
    return keep;
  };
  for (const s of sections) s.blocks = purge(s.blocks);
  /* BUILD-CONTRACT 4.16.4: a contradicting device pair (conflict: true) renders only the variant its page policy
     keeps; the other is purged and declared in page.removedBlocks. A conflict without a policy fails the build. */
  {
    let n = 0;
    for (const s of sections) walkBlocks(s.blocks, (b) => { if (b.conflict) n++; });
    const pol = CONFLICT_POLICY[route.path];
    if (n && !pol) fail('undecided-conflict', { page: route.path, blocks: n });
    if (n && pol) {
      /* the stale side's lines, from the model's own conflict ledger. A container block (faq items, carousel slides)
         loses only the items that carry a stale line: its other items hold sentences whose desktop twins the content
         lane collapsed into this variant (ledger.collapsed), so they are the only copy and stay (contract 4.2). */
      const alnum = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
      const stale = [];
      for (const c of (model && model.ledger && model.ledger.conflicts) || []) {
        if (c.kind !== 'numbers-differ-by-device' || !c.a || !c.b) continue;
        for (const side of [c.a, c.b]) if (!pol.keep(side.dev)) stale.push(alnum(side.line));
      }
      const isStale = (x) => { const t = alnum(blockSummary(x)); return stale.some((l) => l && t.includes(l)); };
      const record = (t, b, text) => {
        removedBlocks.push({ t, why: pol.reason, dev: b.dev || null, text });
        conflictPurges.push({ path: route.path, t, dev: b.dev || null, text: text.slice(0, 200) });
      };
      const drop = (list) => (Array.isArray(list) ? list.filter((b) => {
        if (!b || typeof b !== 'object') return true;
        if (b.conflict && !pol.keep(b.dev)) {
          const key = Array.isArray(b.items) && b.items.some((it) => it && Array.isArray(it.blocks)) ? 'items' : Array.isArray(b.slides) ? 'slides' : null;
          if (key && stale.length) {
            const gone = b[key].filter((it) => isStale(it));
            const kept = b[key].filter((it) => !isStale(it));
            if (gone.length && kept.length) {
              for (const it of gone) record(b.t + ' ' + key.replace(/s$/, ''), b, blockSummary(it));
              b[key] = kept;
              b.conflictPurged = gone.length;
              delete b.conflict;
              return true;
            }
          }
          record(b.t, b, blockSummary(b));
          return false;
        }
        if (Array.isArray(b.blocks)) b.blocks = drop(b.blocks);
        for (const k of ['slides', 'items']) if (Array.isArray(b[k])) for (const it of b[k]) if (it && Array.isArray(it.blocks)) it.blocks = drop(it.blocks);
        return true;
      }) : list);
      for (const s of sections) s.blocks = drop(s.blocks);
      sections = sections.filter((s) => s.blocks.length);
    }
  }
  /* BUILD-CONTRACT 4.16.8: platform identifiers are never accessible names or field names. A form or search whose
     name is a platform class list loses the name (its visible labels stay); a field named after the platform gets a
     neutral name. Each change is declared in page.renamed. */
  const renamed = [];
  for (const s of sections) walkBlocks(s.blocks, (b) => {
    if ((b.t === 'form' || b.t === 'search') && typeof b.name === 'string' && PLATFORM_ID_RE.test(b.name)) { renamed.push({ what: b.t + ' name', from: b.name, to: null }); b.name = null; }
    for (const f of Array.isArray(b.fields) ? b.fields : []) {
      if (f && typeof f.name === 'string' && PLATFORM_ID_RE.test(f.name)) {
        const to = /search/i.test(f.name) || f.type === 'search' ? 'search' : 'field';
        renamed.push({ what: 'field name', from: f.name, to });
        f.name = to;
      }
    }
  });
  const page = {
    kind: route.kind, path: route.path, sourceUrl: route.derived ? null : route.sourceUrl, derived: !!route.derived,
    derivedType: route.derivedType || null, why: route.why || (route.derivedType && routes.whyByType[route.derivedType]) || null,
    slug: route.model || (route.productSlug) || route.path.split('/').filter(Boolean).join('-') || 'home',
    title: null, metaDescription: null, canonical: null, robots: null, og: {}, twitter: {}, jsonLd: [],
    h1: null, breadcrumbs: [], section: sectionOf(route.path), sections, catalog: catalog.listings[route.path] || null,
    products: null, related: [], generated: {}, ledger, listing: null, product: null, modelMissing: !!(route.kind !== 'product' && !route.derived && !model),
    removedBlocks: removedBlocks.length ? removedBlocks : undefined,
    renamed: renamed.length ? renamed : undefined,
  };
  const finalModel = model && typeof model.schema === 'string' && /page@/.test(model.schema);
  if (finalModel) {
    /* the content lane's model carries the source head: use it, then clean it the same way (images, residue) */
    const pre = (o, p) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [p + k, v]));
    const h = headFor(route, { openGraph: { ...pre(model.og, 'og:'), ...pre(model.article, 'article:') }, twitter: pre(model.twitter, 'twitter:'), jsonLd: model.jsonLd || [] });
    page.title = scrubText(model.title || '', h.dropped, 'title') || null;
    page.metaDescription = model.metaDescription ? scrubText(model.metaDescription, h.dropped, 'description') : null;
    page.robots = model.robots || null;
    page.canonical = model.canonical ? liveUrl(route.path) : null;
    page.og = h.og; page.twitter = h.twitter; page.jsonLd = h.jsonLd; page.headDropped = h.dropped.length ? h.dropped : undefined;
    page.breadcrumbs = (model.breadcrumbs || []).map((b) => ({ label: b.label, href: b.href ? ((splitInternal(b.href) || {}).path || b.href) : null }));
    /* H2: the model's breadcrumb facts and page-level accessible names, so the theme needs no bridge to the models
       (contract 4.16.5: breadcrumbs are visible only where breadcrumbsSource is 'visible') */
    page.breadcrumbsSource = model.breadcrumbsSource || 'none';
    page.breadcrumbsSeparator = model.breadcrumbsSeparator;   // undefined when the source showed no separator
    page.breadcrumbsLabel = model.breadcrumbsLabel;
    page.ariaLabels = Array.isArray(model.ariaLabels) ? model.ariaLabels : [];
    page.section = model.section || page.section;
    if (Array.isArray(model.catalog) && model.catalog.length) { page.catalog = model.catalog; page.catalogSource = 'model'; }
    else if (page.catalog) page.catalogSource = 'src/content/catalog/listings.json';
    page.modelH1 = model.h1 || null;
    /* BUILD-CONTRACT 4.16.12: an og:image whose source sits on the origin (never harvested) stays omitted, declared */
    if (model.og && model.og.image && !page.og['og:image']) ogImageOmitted.push({ path: route.path, src: String([].concat(model.og.image)[0]).slice(0, 200), why: 'og:image source not in the harvest (origin-hosted); omitted until the site social card exists (BUILD-CONTRACT 4.16.12)' });
  } else if (seoRow) {
    const h = headFor(route, seoRow);
    page.title = scrubText(decodeEntities(seoRow.title || ''), h.dropped, 'title') || null;
    page.metaDescription = seoRow.metaDescription ? scrubText(decodeEntities(seoRow.metaDescription), h.dropped, 'description') : null;
    page.robots = seoRow.metaRobots || null;
    page.canonical = seoRow.canonical ? liveUrl(route.path) : null;
    page.og = h.og; page.twitter = h.twitter; page.jsonLd = h.jsonLd; page.headDropped = h.dropped.length ? h.dropped : undefined;
    page.breadcrumbs = breadcrumbsFromRaw(route);
  }
  if (page.jsonLd && page.jsonLd.length) { const notes = []; page.jsonLd = consolidateLd(page.jsonLd, notes); if (notes.length) page.ldNotes = notes; }
  if (route.kind === 'product') {
    const p = productsByPath.get(route.path);
    page.product = p;
    page.title = p.title + SUFFIX;
    page.robots = 'follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large';
    page.canonical = liveUrl(route.path);
    page.breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: p.title, href: null }];
    const crumbsLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: page.breadcrumbs.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.label, item: b.href ? liveUrl(b.href) : liveUrl(route.path) })) };
    page.jsonLd = p.full ? [crumbsLd, p.full.jsonLd] : [crumbsLd];
    if (p.full) page.metaDescription = p.full.description.replace(/<br\s*\/?>/gi, '');
    page.sections = [{ id: 'product', blocks: [{ t: 'heading', level: 1, text: p.title }] }];
  }
  if (route.derived && route.members) {
    page.title = route.title || (route.page ? null : null);
    page.robots = route.robots || null;
    page.canonical = liveUrl(route.path);
    const items = route.members.map((m) => memberCard(m));
    page.listing = { members: route.members, order: route.memberOrder };
    if (route.derivedType === 'terpene-pagination') {
      const parent = routesByPath.get(route.parent); const ps = parent && seoByFinal.get(parent.sourceUrl);
      page.title = ps ? decodeEntities(ps.title) : null;
      page.metaDescription = ps && ps.metaDescription ? decodeEntities(ps.metaDescription) : null;
      page.robots = route.robots;
      page.breadcrumbs = breadcrumbsFromRaw(parent);
      const h1 = ps ? ((parseJSONsafe(ps.headingOutline) || []).find((x) => /^1:/.test(x)) || '').slice(2) : null;
      page.sections = [{ id: 'derived', blocks: [{ t: 'heading', level: 1, text: decodeEntities(h1 || stripSuffix(page.title)) }, { t: 'posts', kind: 'derived', items: route.members.map((m) => { const g = catalog.glossary.terpenes.find((x) => x.path === m); return { title: g ? g.name : m, href: m }; }) }] }];
    } else {
      page.breadcrumbs = [{ label: 'Home', href: '/' }, { label: route.h1, href: null }];
      page.sections = [{ id: 'derived', blocks: [{ t: 'heading', level: 1, text: route.h1 }, { t: 'posts', kind: 'derived', items }] }];
    }
  }
  if (route.kind === 'brand') {
    const b = brandByPath.get(route.path);
    if (b && b.products.length) page.products = b.products.map((pp) => productRef(productsByPath.get(pp)));
  }
  /* BUILD-CONTRACT 4.7 / 4.16.11: JSON-LD carries printed facts only (no "Medical Marijuana Dispensary"
     alternateName, the printed opening hours, no stale 1 ounce / 28 grams FAQPage, no personal e-mail) and no Joint
     S3 image (local copy, else dropped). Every change is declared in page.ldDropped and the report. */
  if (page.jsonLd && page.jsonLd.length) {
    const drops = [];
    page.jsonLd = applyLdPolicy(page.jsonLd, drops, (u) => { const m = ogImageFor(decodeEntities(u)); return m ? m.url : null; });
    if (drops.length) { page.ldDropped = drops; ldDropLog.push({ path: route.path, drops }); }
  }

  /* exactly one level-1 heading among the RENDERED blocks (heading, or event-field with a level):
     1. the content lane's demote flags apply first (level 1 -> 2);
     2. the first remaining H1 stays, later ones become level 2;
     3. none -> promote the first rendered heading, else synthesise one from the route or <title>. */
  const isH = (b) => (b.t === 'heading' || (b.t === 'event-field' && b.level)) && !b.hiddenAll;
  const visit = (fn) => { for (const s of page.sections) { if (s.hiddenAll) continue; walkBlocks(s.blocks, (b) => { if (!b.hiddenAll) fn(b); }); } };
  for (const s of page.sections) walkBlocks(s.blocks, (b) => { if (!KNOWN_BLOCKS.has(b.t)) { const k = b.t; if (!unknownBlocks.has(k)) unknownBlocks.set(k, []); if (unknownBlocks.get(k).length < 5) unknownBlocks.get(k).push(route.path); } });
  let demoted = 0;
  for (const s of page.sections) walkBlocks(s.blocks, (b) => { if ((b.t === 'heading' || b.t === 'event-field') && +b.level === 1 && b.demote) { b.level = 2; b.demotedFromH1 = 'model'; demoted++; } });
  if (demoted) h1Notes.push({ path: route.path, action: 'applied ' + demoted + ' demote flag(s) from the model' });
  const h1s = [];
  visit((b) => { if (isH(b) && +b.level === 1) h1s.push(b); });
  if (h1s.length > 1) { for (const b of h1s.slice(1)) { b.level = 2; b.demotedFromH1 = 'build'; } h1Notes.push({ path: route.path, action: 'demoted ' + (h1s.length - 1) + ' extra H1' }); }
  if (h1s.length) page.h1 = h1s[0].text;
  else {
    /* BUILD-CONTRACT 4.15.7: a page with no source H1 uses h1Source.candidates[0] (first heading, then last breadcrumb
       label, then title). A heading candidate promotes that heading block; any other candidate becomes the H1 text in
       a leading section of its own (never inside a hidden section). The title is used only when no candidate exists. */
    const sq = (s) => String(s || '').replace(/\s+/g, ' ').trim();
    const cands = model && model.h1Source && Array.isArray(model.h1Source.candidates) ? model.h1Source.candidates.filter((c) => c && sq(c.text)) : [];
    const c0 = cands[0] || null;
    let target = null;
    if (c0 && /heading/i.test(c0.from || '')) visit((b) => { if (!target && isH(b) && b.level && sq(b.text) === sq(c0.text)) target = b; });
    const synth = (text, why) => {
      page.sections.unshift({ id: 'h1', blocks: [{ t: 'heading', level: 1, text, synthetic: true, from: why }] });
      page.h1 = text;
      h1Notes.push({ path: route.path, action: 'H1 ' + JSON.stringify(text) + ' from ' + why + ', in a leading section', synthetic: true });
    };
    if (target) { target.promotedFromLevel = target.level; target.level = 1; page.h1 = target.text; h1Notes.push({ path: route.path, action: 'promoted h1Source.candidates[0] (' + c0.from + ', h' + target.promotedFromLevel + ') to H1' }); }
    else if (c0) synth(/^title$/i.test(c0.from || '') ? stripSuffix(c0.text) : sq(c0.text), 'h1Source.candidates[0] (' + c0.from + ')');
    else {
      let first = null;
      visit((b) => { if (!first && isH(b) && b.text && b.level) first = b; });
      if (first) { first.promotedFromLevel = first.level; first.level = 1; page.h1 = first.text; h1Notes.push({ path: route.path, action: 'promoted the first heading (h' + first.promotedFromLevel + ') to H1 (no candidates)' }); }
      else synth(route.h1 || stripSuffix(page.title) || page.slug, route.h1 ? 'the route' : 'the <title>');
    }
  }
  if (!page.title) page.title = page.h1;
  return page;
}

/* ------------------------------------------------------------------ theme */
const themeArg = arg('--theme');
const themeDir = themeArg && themeArg !== 'stub' && fs.existsSync(path.join(path.resolve(themeArg), 'index.mjs')) ? path.relative(ROOT, path.resolve(themeArg)).split(path.sep).join('/')
  : fs.existsSync(path.join(ROOT, 'src/theme/index.mjs')) && themeArg !== 'stub' ? 'src/theme' : 'src/theme-stub';
const theme = await import(pathToFileURL(path.join(ROOT, themeDir, 'index.mjs')).href);
const stylesDir = theme.stylesDir ? path.join(ROOT, theme.stylesDir) : themeDir === 'src/theme' ? path.join(ROOT, 'src/styles') : path.join(ROOT, themeDir);
const scriptsDir = theme.scriptsDir ? path.join(ROOT, theme.scriptsDir) : themeDir === 'src/theme' ? path.join(ROOT, 'src/scripts') : path.join(ROOT, themeDir);

/* ------------------------------------------------------------------ pre-flight (BUILD-CONTRACT 4.16.10) */
/* every route path and every page model is checked BEFORE --out is wiped. A failure here exits 1 with a reported
   error and leaves the previous output untouched. The duplicate guard normalises case, a missing trailing slash and
   an index.html suffix. */
{
  const keys = new Map();
  const missingPre = [];
  for (const r of routes.routes) {
    const p = r && r.path;
    if (typeof p !== 'string' || !p.startsWith('/') || /\/index\.html?\/?$/i.test(p) || (!p.endsWith('/') && !isFileLike(p))) fail('invalid-route-path', { path: p ?? null, why: 'an output path starts with "/" and ends with "/" (a file-like path keeps its name; no index.html suffix)' });
    if (typeof p === 'string') {
      const k = outKey(p);
      if (keys.has(k)) fail('duplicate-output', { path: p, other: keys.get(k), key: k, stage: 'pre-flight' });
      else keys.set(k, p);
    }
    if (r && !r.derived && r.kind !== 'product') {
      const m = loadModel(r);
      if (!m) { missingPre.push(r.path); continue; }
      const probs = m.__invalid ? [m.__invalid] : modelProblems(m);
      if (probs.length) fail('invalid-model', { page: r.path, problems: probs.slice(0, 5), count: probs.length });
    }
  }
  if (missingPre.length && !ALLOW_MISSING) fail('missing-model', { count: missingPre.length, examples: missingPre.slice(0, 10), stage: 'pre-flight' });
  if (errors.length) {
    log('pre-flight FAILED before ' + path.relative(ROOT, OUT).split(path.sep).join('/') + ' was touched: ' + errors.length + ' error(s)');
    for (const e of errors.slice(0, 30)) log('  ERROR ' + JSON.stringify(e).slice(0, 400));
    if (REPORT) writeIfChanged(path.resolve(REPORT), JSON.stringify({ summary: { stage: 'pre-flight', out: path.relative(ROOT, OUT).split(path.sep).join('/'), outTouched: false, errors: errors.length }, errors }, null, 1));
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ build */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

/* fonts first (CSS may reference them), then the CSS and JS bundles */
for (const f of fs.readdirSync(path.join(ROOT, 'assets/fonts')).sort()) if (/\.(woff2?|ttf|otf)$/i.test(f)) ctx.asset('fonts/' + f);
function bundle(names, dir, ext) {
  let txt = '';
  for (const n of names || []) {
    const abs = path.join(dir, n);
    if (!fs.existsSync(abs)) { fail('missing-asset', { asset: path.relative(ROOT, abs).split(path.sep).join('/') }); continue; }
    txt += '/* ' + n + ' */\n' + fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n') + '\n';
  }
  if (ext === 'css') txt = txt.replace(/url\(\s*(["']?)asset:([^"')]+)\1\s*\)/g, (m, q, name) => 'url("' + ctx.asset(name.trim()).replace(/^\/assets\//, '') + '")');
  const rel = 'assets/site.' + sha(txt).slice(0, 10) + '.' + ext;
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), txt);
  assetUrls.set('site.' + ext, '/' + rel);
}
bundle(theme.styles, stylesDir, 'css');
bundle(theme.scripts, scriptsDir, 'js');

const pages = [];
for (const r of routes.routes) {
  const page = assemble(r);
  pages.push(page);
  ctx.pagesByPath.set(page.path, { path: page.path, kind: page.kind, title: page.title, h1: page.h1, derived: page.derived });
}
const h1NotesByPath = new Map();
for (const nt of h1Notes) { if (!h1NotesByPath.has(nt.path)) h1NotesByPath.set(nt.path, []); h1NotesByPath.get(nt.path).push(nt); }
/* missing models were already failed in the pre-flight (before the wipe) */
for (const [t, ex] of unknownBlocks) fail('unknown-block-type', { type: t, examples: ex });
if (Array.isArray(theme.blockTypes)) for (const t of new Set(pages.flatMap((p) => { const ts = []; for (const s of p.sections) walkBlocks(s.blocks, (b) => ts.push(b.t)); return ts; }))) if (!theme.blockTypes.includes(t)) fail('block-type-not-rendered-by-theme', { type: t });

const idsOfHtml = (h) => new Set([...h.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const idsByPath = new Map();    // page path -> Set(ids)
const crossFrags = [];          // { page, url } root-relative URLs with a #fragment (checked once every page exists)
const written = new Map();      // lowercased output file -> path (duplicate / case-collision guard)
const refsByPage = new Map();   // page path -> Set(root-relative urls)
const sitemapUrls = [];
let bytes = 0;
for (const page of pages) {
  current = page;
  let html;
  try { html = theme.renderPage(page, ctx); } catch (e) { fail('render-error', { page: page.path, error: String(e && e.stack || e).slice(0, 400) }); continue; }
  /* fragment hygiene: an in-page #x with no element id="x" (dead on the live site too, or an id the rebuild does not
     carry) is unlinked, text kept, and logged */
  const ids = idsOfHtml(html);
  idsByPath.set(page.path, ids);
  html = html.replace(/<a\b([^>]*?)\shref="#([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi, (m, pre, frag, post, inner) => {
    let f = frag; try { f = decodeURIComponent(frag); } catch { /* keep */ }
    if (ids.has(f)) return m;
    linker.note('unlinked:dead-fragment', '#' + frag, page.path);
    return inner;
  });
  const refs = new Set();
  html = relativizeHtml(html, page.path, (u) => { refs.add(u); if (u.includes('#')) crossFrags.push({ page: page.path, url: u }); }, true);
  refsByPage.set(page.path, refs);
  const left = rootAbsoluteLeft(html);
  if (left.length) fail('root-absolute-left', { page: page.path, refs: left });
  const n = countH1(html);
  if (n !== 1) fail('h1-count', { page: page.path, h1: n });
  /* an H1 note claims only what rendered: the page has exactly one <h1> and it carries the chosen text */
  for (const note of h1NotesByPath.get(page.path) || []) note.rendered = n === 1 && html.includes(esc(page.h1));
  const hits = residueHits(html);
  if (hits.length) fail('residue', { page: page.path, hits: hits.slice(0, 3) });
  const rel = outFileOf(page.path);
  const key = outKey(page.path);
  if (written.has(key)) { fail('duplicate-output', { path: page.path, other: written.get(key), key }); continue; }
  written.set(key, page.path);
  const abs = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, html);
  bytes += Buffer.byteLength(html);
  if (!/noindex/i.test(page.robots || '')) sitemapUrls.push(liveUrl(page.path));
}
current = null;

/* cross-page fragments: a link to another page's #frag that the target does not carry keeps the page, drops the
   fragment (logged); the file is rewritten in place (deterministic: same inputs, same edits) */
{
  const fixes = new Map();   // page -> [[fromAttr, toAttr]]
  for (const { page, url } of crossFrags) {
    const [base, frag] = [url.slice(0, url.indexOf('#')), url.slice(url.indexOf('#') + 1)];
    let p; try { p = decodeURIComponent(base.split('?')[0]); } catch { p = base; }
    const target = idsByPath.get(p.normalize('NFC')) || idsByPath.get(p);
    let f = frag; try { f = decodeURIComponent(frag); } catch { /* keep */ }
    if (!target || !frag || target.has(f)) continue;
    const rel = relUrl(page, url);
    if (!fixes.has(page)) fixes.set(page, []);
    /* the collected URL is the attribute text as written (already HTML-escaped), so no second escaping here */
    fixes.get(page).push(['"' + rel + '"', '"' + rel.slice(0, rel.indexOf('#')) + '"']);
    linker.note('stripped:dead-cross-page-fragment', url, page);
  }
  for (const [page, list] of [...fixes].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const abs = path.join(OUT, outFileOf(page));
    let h = fs.readFileSync(abs, 'utf8');
    for (const [a, b] of list) h = h.split(a).join(b);
    fs.writeFileSync(abs, h);
  }
}

/* 404 (root-relative: served at any depth) */
{
  current = { path: '/404.html', kind: '404', sections: [] };
  let html = theme.render404(ctx);
  const refs = new Set();
  html = relativizeHtml(html, '/', (u) => refs.add(u), false);
  refsByPage.set('/404.html', refs);
  if (countH1(html) !== 1) fail('h1-count', { page: '/404.html', h1: countH1(html) });
  const hits = residueHits(html); if (hits.length) fail('residue', { page: '/404.html', hits });
  fs.writeFileSync(path.join(OUT, '404.html'), html);
  current = null;
}

/* robots, sitemap, redirects */
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + ORIGIN + '/sitemap.xml\n');
sitemapUrls.sort();
const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemapUrls.map((u) => '  <url><loc>' + xmlEsc(u) + '</loc></url>').join('\n') + '\n</urlset>\n');
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const redirectsTxt = ['# Generated by src/build.mjs from src/content/routes.json (aliases and redirect chains observed in the crawl).', '# Netlify / Cloudflare Pages format: <from> <to> <status>'];
const htaccess = ['# Generated by src/build.mjs from src/content/routes.json. Apache 2.4.', 'ErrorDocument 404 /404.html', 'DirectorySlash On', 'Options -MultiViews', ''];
redirectsTxt.push('# Case-variant rules (/categories/CBD -> /categories/cbd/) are in .htaccess only: a host that matches case-insensitively could loop.');
for (const r of routes.redirects) {
  const to = encodePath(r.to);
  const caseOnly = withSlash(r.from).toLowerCase() === r.to.toLowerCase();
  if (!caseOnly) redirectsTxt.push(encodePath(r.from) + ' ' + to + ' ' + r.status, encodePath(withSlash(r.from)) + ' ' + to + ' ' + r.status);
  htaccess.push('RedirectMatch ' + r.status + ' ^' + reEsc(encodePath(r.from)) + '/?$ ' + to);
}
fs.writeFileSync(path.join(OUT, '_redirects'), redirectsTxt.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, '.htaccess'), htaccess.join('\n') + '\n');

/* images (cwebp into the cache), then copy every used variant and asset */
log('images: ' + images.jobs.size + ' variants planned');
const imgStats = await images.run();
const pub = images.publish();
for (const [rel, src] of [...assetFiles].sort()) { const abs = path.join(OUT, rel); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.copyFileSync(src, abs); }
if (imgStats.failed.length) fail('image-failed', { count: imgStats.failed.length, examples: imgStats.failed.slice(0, 5) });

/* every root-relative reference resolves to a written file (dead internal link or asset) */
const outFiles = new Set();
(function list(dir, base) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) list(p, base); else outFiles.add(path.relative(base, p).split(path.sep).join('/').normalize('NFC')); } })(OUT, OUT);
let refCount = 0;
const dead = new Map();
for (const [p, refs] of [...refsByPage].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  for (const u of refs) {
    refCount++;
    let clean; try { clean = decodeURIComponent(u.split('#')[0].split('?')[0]); } catch { clean = u; }
    const rel = clean.replace(/^\//, '').normalize('NFC');
    const ok = clean.endsWith('/') ? outFiles.has(rel + 'index.html') : outFiles.has(rel) || outFiles.has(rel + '/index.html');
    if (!ok) { if (!dead.has(u)) dead.set(u, []); if (dead.get(u).length < 3) dead.get(u).push(p); }
  }
}
for (const [u, ps] of dead) fail('dead-internal-reference', { ref: u, pages: ps });
/* residue in the non-HTML text output too (CSS/JS bundles, sitemap, robots, redirect files) */
for (const rel of [...outFiles].sort()) {
  if (!/\.(css|js|xml|txt|json|svg)$/i.test(rel) && rel !== '_redirects' && rel !== '.htaccess') continue;
  const hits = residueHits(fs.readFileSync(path.join(OUT, rel), 'utf8'));
  if (hits.length) fail('residue', { file: rel, hits: hits.slice(0, 3) });
}

/* report */
const ms = Number((process.hrtime.bigint() - t0) / 1000000n);
const byKind = errors.reduce((a, e) => { a[e.kind] = (a[e.kind] || 0) + 1; return a; }, {});
const summary = {
  out: path.relative(ROOT, OUT).split(path.sep).join('/') || '.', theme: themeDir, models: path.relative(ROOT, MODELS).split(path.sep).join('/') + ' via ' + MI.source, chrome: chrome.source,
  pages: pages.length, written: written.size, htmlBytes: bytes, sitemapUrls: sitemapUrls.length, redirects: routes.redirects.length,
  missingModels: missingModels.length, rootRelativeRefs: refCount, deadRefs: dead.size,
  images: { planned: imgStats.planned, cached: imgStats.cached, made: imgStats.made, failed: imgStats.failed.length, published: pub.copied, missingSources: missingImages.size },
  links: linker.report().reduce((a, e) => { a[e.kind] = (a[e.kind] || 0) + e.count; return a; }, {}),
  h1Adjusted: h1Notes.length, h1NotesNotRendered: h1Notes.filter((x) => x.rendered === false).length,
  declared: {
    lateImagesUsed: lateUsed.size,
    jsonLdChangedPages: ldDropLog.length, jsonLdChanges: ldDropLog.reduce((a, x) => a + x.drops.length, 0),
    ogImageOmitted: ogImageOmitted.length, conflictVariantsPurged: conflictPurges.length,
    renamedPlatformIds: pages.reduce((a, p) => a + (p.renamed ? p.renamed.length : 0), 0),
    richSanitized: Object.fromEntries([...sanitized].map(([k, v]) => [k, v.count])),
  },
  errors: errors.length, errorsByKind: byKind, ms,
};
log('build ' + JSON.stringify(summary));
for (const e of errors.slice(0, 30)) log('  ERROR ' + JSON.stringify(e).slice(0, 400));
if (REPORT) {
  const ldByRule = {};
  for (const x of ldDropLog) for (const d of x.drops) { const k = d.rule + ' | ' + d.what; if (!ldByRule[k]) ldByRule[k] = { count: 0, pages: [] }; ldByRule[k].count++; if (ldByRule[k].pages.length < 8 && !ldByRule[k].pages.includes(x.path)) ldByRule[k].pages.push(x.path); }
  writeIfChanged(path.resolve(REPORT), JSON.stringify({
    summary, errors, linkLog: linker.report(), missingImages: [...missingImages.values()].map((m) => ({ ...m, pages: [...m.pages] })).sort((a, b) => (a.ref < b.ref ? -1 : 1)), h1Notes, missingModels,
    declared: {
      lateImages: [...lateUsed].map(([file, e]) => ({ file, srcUrl: e.srcUrl, pages: [...e.pages].sort() })).sort((a, b) => (a.file < b.file ? -1 : 1)),
      jsonLdByRule: ldByRule, jsonLdByPage: ldDropLog,
      ogImageOmitted, conflictPurges,
      renamed: pages.filter((p) => p.renamed).map((p) => ({ path: p.path, renamed: p.renamed })),
      richSanitized: [...sanitized].map(([k, v]) => ({ kind: k, count: v.count, pages: [...v.pages].sort() })),
    },
  }, null, 1));
  log('report ' + REPORT);
}
process.exitCode = errors.length ? 1 : 0;
