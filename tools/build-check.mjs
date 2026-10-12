#!/usr/bin/env node
// build-check.mjs - output invariants of the static build (PIPELINE-SITE).
//   node tools/build-check.mjs [--dir dist] [--report <build report.json>] [--json <report.json>]   exit 1 on any finding or a dead control
// Checks, over every file of the build:
//   1. exactly one <h1> per HTML page (comments and scripts ignored);
//   2. no platform residue anywhere (wp-content, elementor, joint-ecommerce, litespeed, gtranslate, googletagmanager,
//      rankreallyhigh) and no WP Defender honeypot ("Secret Link", 7b62afab7960ee01);
//   3. no capecodcannabis.com URL in a page except: <link rel="canonical">, og:/twitter: meta, JSON-LD script
//      bodies, and the explicit live-menu hand-off links (<a data-handoff="live-menu">); prose mentions are counted
//      as info only. sitemap.xml and robots.txt carry absolute live URLs by design;
//   4. every route in src/content/routes.json is emitted (its index.html exists);
//   5. sitemap.xml lists every indexable route exactly once, and nothing else;
//   6. every product page from audit/raw/sitemap.html (re-read here, independently of routes.json) is present.
//   7. (H2, BUILD-CONTRACT 4.7 / 4.16.11) no excluded fact in any JSON-LD script body: the alternateName
//      "Medical Marijuana Dispensary", the openingHours "8:00 - 8:00", a FAQPage stating 1 ounce / 28 grams, an e-mail
//      address other than the printed info@capecodcannabis.com, a joint-product-photos.s3.amazonaws.com image;
//   8. (H2, 4.15.4) no _gl, _ga or utm_* parameter on an internal link (relative, or on the capecodcannabis.com host);
//      external links are not checked (a ?utm_source=capecodcannabis.com referral on another host is fine);
//   9. (H2, 4.16.8) no platform identifier (tribe-, post-password-form, elementor, jet-) in an aria-label or name;
//  10. (H2) the page's one <h1> is visible: not inside an element carrying `hidden` or `data-hidden-all`.
// Positive controls (in memory): a page with two <h1>, a page with none, a hidden <h1>, a residue string, a honeypot,
// a live-site href, a missing route, a sitemap without one URL, a sitemap with a duplicate, each excluded JSON-LD
// fact, a tracking parameter on an internal link and a platform aria-label/name must each be reported; a canonical,
// an og:url, a JSON-LD URL, a hand-off link, the printed e-mail, a 56 g FAQPage and an external utm_source referral
// must not be.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESIDUE = /wp-content|elementor|joint-ecommerce|litespeed|gtranslate|googletagmanager|rankreallyhigh/gi;
const HONEYPOT = /Secret Link|7b62afab7960ee01/g;
const ORIGIN_RE = /(?:https?:)?\/\/(?:www\.)?capecodcannabis\.com/i;

function listFiles(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/').normalize('NFC'));
  }
  return out;
}
const encodePath = (p) => p.split('/').map((s) => encodeURIComponent(s)).join('/');
const liveUrl = (p) => 'https://capecodcannabis.com' + encodePath(p).replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase());
const outFileOf = (p) => (/\.[a-z0-9]{2,5}$/i.test(p) ? p.slice(1) : p.slice(1) + 'index.html');
const stripScripts = (h) => h.replace(/<!--[\s\S]*?-->/g, '').replace(/(<script\b[^>]*>)[\s\S]*?(<\/script\s*>)/gi, '$1$2');

/* H2 checks 7-10 (own patterns, independent of src/lib/policy.mjs) */
const EXCLUDED_LD = [
  { kind: 'ld-excluded-alternate-name', re: /Medical Marijuana Dispensary/i },
  { kind: 'ld-excluded-opening-hours', re: /\b8:00\s*-\s*8:00\b/ },
  { kind: 'ld-joint-image', re: /joint-product-photos\.s3\.amazonaws\.com/i },
];
const LD_EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const STALE_FAQ_RE = /up to 1 ounce\b|\b28 grams\b/i;
const PLATFORM_NAME_RE = /tribe-|post-password-form|elementor|jet-/i;
const TRACKING_RE = /[?&](?:_gl|_ga|utm_[a-z0-9_]*)=/i;
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
function ldFindings(rel, html) {
  const f = [];
  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    const body = m[1];
    for (const x of EXCLUDED_LD) { const h = body.match(x.re); if (h) f.push({ kind: x.kind, file: rel, value: h[0] }); }
    for (const e of body.match(LD_EMAIL_RE) || []) if (e.toLowerCase() !== 'info@capecodcannabis.com' && !/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(e)) f.push({ kind: 'ld-personal-email', file: rel, value: e.replace(/^[^@]{0,3}/, '***') });
    let j = null; try { j = JSON.parse(body); } catch { f.push({ kind: 'ld-unparsable', file: rel }); continue; }
    const nodes = [];
    const rec = (n) => { if (Array.isArray(n)) n.forEach(rec); else if (n && typeof n === 'object') { nodes.push(n); if (Array.isArray(n['@graph'])) n['@graph'].forEach(rec); } };
    rec(j);
    for (const n of nodes) if ([].concat(n['@type'] || []).includes('FAQPage') && STALE_FAQ_RE.test(JSON.stringify(n))) f.push({ kind: 'ld-stale-faq', file: rel, value: (JSON.stringify(n).match(STALE_FAQ_RE) || [''])[0] });
  }
  return f;
}
function tagFindings(rel, body) {
  const f = [];
  for (const m of body.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
    const a = m[2];
    for (const am of a.matchAll(/\s(aria-label|name)\s*=\s*"([^"]*)"/gi)) if (PLATFORM_NAME_RE.test(am[2]) && !(m[1].toLowerCase() === 'meta')) f.push({ kind: 'platform-id-name', file: rel, value: am[1] + '="' + am[2].slice(0, 80) + '"' });
    const hm = a.match(/\shref\s*=\s*"([^"]*)"/i);
    if (hm) {
      const href = hm[1].replace(/&amp;/g, '&');
      const internal = /^(?:https?:)?\/\/(?:www\.)?capecodcannabis\.com(?:[/?#]|$)/i.test(href) || !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);
      if (internal && TRACKING_RE.test(href.split('#')[0])) f.push({ kind: 'tracking-param-internal-link', file: rel, value: href.slice(0, 160) });
    }
  }
  return f;
}
/** <h1> elements and how many are not inside an element carrying `hidden` or `data-hidden-all` */
function h1Visibility(body) {
  const stack = [];
  let total = 0, visible = 0;
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)) {
    const tag = m[2].toLowerCase();
    if (m[1]) { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; } continue; }
    const hidden = /\shidden(?=[\s=>/]|$)/i.test(m[3]) || /\sdata-hidden-all\b/i.test(m[3]);
    if (tag === 'h1') { total++; if (!hidden && !stack.some((s) => s.hidden)) visible++; }
    if (!VOID_TAGS.has(tag) && !/\/\s*$/.test(m[3])) stack.push({ tag, hidden });
  }
  return { total, visible };
}

export function checkPage(rel, html) {
  const f = [];
  const body = stripScripts(html);
  const h1 = (body.match(/<h1[\s>]/gi) || []).length;
  if (h1 !== 1) f.push({ kind: 'h1-count', file: rel, value: h1 });
  else if (h1Visibility(body).visible !== 1) f.push({ kind: 'h1-not-visible', file: rel });
  f.push(...ldFindings(rel, html), ...tagFindings(rel, body));
  for (const m of html.matchAll(RESIDUE)) { f.push({ kind: 'residue', file: rel, value: m[0], context: html.slice(Math.max(0, m.index - 50), m.index + 50) }); break; }
  for (const m of html.matchAll(HONEYPOT)) { f.push({ kind: 'honeypot', file: rel, value: m[0] }); break; }
  /* live-site URLs: drop the allowed contexts, then look inside tags only (attribute values, inline style url()) */
  const scrubbed = body
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\b[^>]*(property|name)="(og|twitter|article):[^"]*"[^>]*>/gi, '')
    .replace(/<a\b[^>]*data-handoff="live-menu"[^>]*>/gi, '<a>');
  let prose = 0;
  for (const m of scrubbed.matchAll(/<[a-zA-Z][^>]*>|[^<]+/g)) {
    const s = m[0];
    if (!ORIGIN_RE.test(s) && !/capecodcannabis\.com/i.test(s)) continue;
    if (s.startsWith('<')) {
      /* a URL on the live host ("//capecodcannabis.com", also percent-encoded inside another URL). An e-mail address
         (mailto:) or a referral tag (?utm_source=capecodcannabis.com) names the domain but is not a site URL */
      const dec = (v) => { let x = v.replace(/&amp;/g, '&'); for (let i = 0; i < 2; i++) { try { x = decodeURIComponent(x); } catch { break; } } return x; };
      const hits = [...s.matchAll(/[\w:-]+="([^"]*capecodcannabis\.com[^"]*)"/gi)].filter((m) => !/^mailto:/i.test(m[1]) && /\/\/(?:www\.)?capecodcannabis\.com(?![a-z0-9.-])/i.test(dec(m[1])));
      if (hits.length) f.push({ kind: 'live-site-url', file: rel, value: hits[0][0].slice(0, 200) });
    }
    else prose++;
  }
  return { findings: f, prose, handoffs: (html.match(/data-handoff="live-menu"/g) || []).length };
}

export function checkSitemap(xml, indexablePaths) {
  const f = [];
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  const seen = new Map();
  for (const l of locs) seen.set(l, (seen.get(l) || 0) + 1);
  for (const [l, n] of seen) if (n > 1) f.push({ kind: 'sitemap-duplicate', value: l, count: n });
  const want = new Set(indexablePaths.map(liveUrl));
  for (const w of want) if (!seen.has(w)) f.push({ kind: 'sitemap-missing', value: w });
  for (const l of seen.keys()) if (!want.has(l)) f.push({ kind: 'sitemap-extra', value: l });
  return { findings: f, locs: locs.length };
}

export function checkRoutes(routes, fileSet) {
  const f = [];
  for (const r of routes) if (!fileSet.has(outFileOf(r.path).normalize('NFC'))) f.push({ kind: 'route-not-emitted', value: r.path });
  return f;
}

function productPathsFromSitemapHtml() {
  const hs = fs.readFileSync(path.join(ROOT, 'audit/raw/sitemap.html'), 'utf8');
  const out = new Set();
  for (const m of hs.matchAll(/<a href="https:\/\/capecodcannabis\.com(\/products\/[^"]+)"/g)) {
    let p; try { p = decodeURIComponent(m[1]); } catch { p = m[1]; }
    out.add((p.endsWith('/') ? p : p + '/').normalize('NFC'));
  }
  return out;
}

/* 11. (P1, BUILD-CONTRACT 4.17.12, DESIGN-SPEC R-40) every AI-generated file in the build carries the IPTC label: the
   bytes "trainedAlgorithmicMedia". The files: every labelled WebP variant (assets/img/<sha12>-<w>-ai.webp, the name the
   build gives variants of assets/generated/ files), every file copied from assets/generated/ (assets/generated/**,
   e.g. the loop videos and posters served through ctx.asset), and, with --report <build report>, the report's
   aiVariants and aiAssets lists, which must also match the -ai.webp files found. */
export const AI_NEEDLE = 'trainedAlgorithmicMedia';
export function checkAiLabel(rel, buf) { return buf.includes(AI_NEEDLE) ? [] : [{ kind: 'ai-label-missing', file: rel }]; }
/** a WebP without its XMP chunk (RIFF size and the VP8X XMP flag fixed): what cwebp -metadata none leaves */
export function stripWebpXmp(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') throw new Error('not a WebP');
  const parts = [buf.subarray(0, 12)];
  for (let o = 12; o + 8 <= buf.length;) {
    const id = buf.toString('ascii', o, o + 4);
    const size = buf.readUInt32LE(o + 4);
    const end = Math.min(buf.length, o + 8 + size + (size & 1));
    if (id !== 'XMP ') parts.push(Buffer.from(buf.subarray(o, end)));
    o = end;
  }
  const out = Buffer.concat(parts);
  out.writeUInt32LE(out.length - 8, 4);
  if (out.toString('ascii', 12, 16) === 'VP8X') out[20] &= ~0x04;
  return out;
}
/** any other file: every occurrence of the label bytes blanked (a stripped copy for the byte check) */
const blankLabel = (buf) => Buffer.from(buf.toString('latin1').split(AI_NEEDLE).join('x'.repeat(AI_NEEDLE.length)), 'latin1');
function aiFileList(files, fileSet, report) {
  const found = files.filter((f) => /^assets\/img\/[^/]+-ai\.webp$/.test(f) || /^assets\/generated\//.test(f));
  const f = [];
  const list = new Set(found);
  if (report) {
    const vs = new Set(report.aiVariants || []);
    for (const v of vs) { list.add(v); if (!fileSet.has(v)) f.push({ kind: 'ai-variant-missing', file: v }); }
    for (const x of found) if (/-ai\.webp$/.test(x) && !vs.has(x)) f.push({ kind: 'ai-variant-unlisted', file: x });
    for (const a of report.aiAssets || []) { list.add(a); if (!fileSet.has(a)) f.push({ kind: 'ai-asset-missing', file: a }); }
  }
  return { list: [...list].sort(), findings: f };
}

export function run(dist, opts = {}) {
  const routesJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/routes.json'), 'utf8'));
  const routes = routesJson.routes;
  const files = listFiles(dist);
  const fileSet = new Set(files);
  const findings = [];
  let pages = 0, prose = 0, handoffs = 0;
  for (const rel of files) {
    if (/\.html$/.test(rel)) {
      pages++;
      const r = checkPage(rel, fs.readFileSync(path.join(dist, rel), 'utf8'));
      findings.push(...r.findings); prose += r.prose; handoffs += r.handoffs;
    } else if (/\.(css|js|txt|xml|json|svg|webmanifest)$/.test(rel) || rel === '_redirects' || rel === '.htaccess') {
      const t = fs.readFileSync(path.join(dist, rel), 'utf8');
      for (const m of t.matchAll(RESIDUE)) { findings.push({ kind: 'residue', file: rel, value: m[0] }); break; }
    }
  }
  findings.push(...checkRoutes(routes, fileSet));
  const indexable = routes.filter((r) => !/noindex/i.test(r.robots || '')).map((r) => r.path);
  /* robots per page as built: a page whose emitted <meta name="robots"> says noindex is not indexable either */
  const builtNoindex = new Set();
  for (const r of routes) {
    const rel = outFileOf(r.path).normalize('NFC');
    if (!fileSet.has(rel)) continue;
    const head = fs.readFileSync(path.join(dist, rel), 'utf8').slice(0, 4000);
    if (/<meta name="robots" content="[^"]*noindex/i.test(head)) builtNoindex.add(r.path);
  }
  const indexableBuilt = indexable.filter((p) => !builtNoindex.has(p));
  let sm = { findings: [{ kind: 'sitemap-absent' }], locs: 0 };
  if (fileSet.has('sitemap.xml')) sm = checkSitemap(fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8'), indexableBuilt);
  findings.push(...sm.findings);
  const products = productPathsFromSitemapHtml();
  let productsPresent = 0;
  for (const p of products) { if (fileSet.has(outFileOf(p).normalize('NFC'))) productsPresent++; else findings.push({ kind: 'product-missing', value: p }); }
  /* 11. the AI label in every AI-generated file of the build */
  const ai = aiFileList(files, fileSet, opts.report || null);
  findings.push(...ai.findings);
  let aiLabelled = 0;
  for (const rel of ai.list) {
    if (!fileSet.has(rel)) continue;
    const r = checkAiLabel(rel, fs.readFileSync(path.join(dist, rel)));
    if (r.length) findings.push(...r); else aiLabelled++;
  }

  /* positive controls (in memory) */
  const good = '<html><head><link rel="canonical" href="https://capecodcannabis.com/x/"><meta property="og:url" content="https://capecodcannabis.com/x/"><script type="application/ld+json">{"url":"https://capecodcannabis.com/x/"}</script></head><body><h1>x</h1><a data-handoff="live-menu" href="https://capecodcannabis.com/products/x/">h</a></body></html>';
  const c1 = checkPage('ctl/good.html', good).findings;
  const c2 = checkPage('ctl/bad.html', '<h1>a</h1><h1>b</h1><img src="../wp-content/x.png"><a href="https://capecodcannabis.com/menu/">m</a><p>Secret Link</p>').findings;
  const c5 = checkPage('ctl/encoded.html', '<h1>x</h1><a href="https://www.google.com/calendar/render?cid=webcal%3A%2F%2Fcapecodcannabis.com%2F">g</a><a href="mailto:hr@capecodcannabis.com">m</a><a href="https://macsseafood.com/?utm_source=capecodcannabis.com">u</a>').findings;
  const someRoute = routes[Math.floor(routes.length / 2)];
  const missingSet = new Set(fileSet); missingSet.delete(outFileOf(someRoute.path).normalize('NFC'));
  const c3 = checkRoutes([someRoute], missingSet);
  const two = indexableBuilt.slice(0, 2);
  const c4 = checkSitemap('<urlset><url><loc>' + liveUrl(two[0]) + '</loc></url><url><loc>' + liveUrl(two[0]) + '</loc></url></urlset>', two).findings;
  const kinds = (fs2) => new Set(fs2.map((x) => x.kind));
  /* H2 controls: each planted defect must be reported; the clean twin must not */
  const ld = (o) => '<script type="application/ld+json">' + JSON.stringify(o) + '</script>';
  const c6 = checkPage('ctl/ld-bad.html', '<html><head>'
    + ld({ '@context': 'https://schema.org', '@graph': [{ '@type': ['LocalBusiness', 'Organization'], '@id': 'https://capecodcannabis.com/#organization', alternateName: ['Cape Cod Cannabis', 'Medical Marijuana Dispensary'], openingHours: ['Mo,Tu,We,Th,Fr,Sa,Su 8:00 - 8:00'], email: 'staffer@capecodcannabis.com', image: 'https://joint-product-photos.s3.amazonaws.com/production/specials/1/x.jpeg' }] })
    + ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'q', acceptedAnswer: { '@type': 'Answer', text: 'purchase up to 1 ounce of flower ... Recreational = 28 grams' } }] })
    + '</head><body><h1>x</h1><a href="../directions/?_gl=1*abc&amp;_ga=2.1">d</a><a href="https://capecodcannabis.com/?utm_source=gmb&amp;utm_medium=organic">h</a><form aria-label="tribe-events-c-search tribe-events-c-events-bar__search-form"><input name="tribe-events-views[tribe-bar-search]"></form><form aria-label="post-password-form"></form></body></html>').findings;
  const c7 = checkPage('ctl/ld-good.html', '<html><head>'
    + ld({ '@context': 'https://schema.org', '@graph': [{ '@type': ['LocalBusiness', 'Organization'], '@id': 'https://capecodcannabis.com/#organization', alternateName: ['Cape Cod Cannabis'], openingHours: ['Mo,Tu,We,Th,Fr,Sa,Su 08:00-20:00'], email: 'info@capecodcannabis.com', image: 'https://capecodcannabis.com/assets/img/abc-1200.webp' }] })
    + ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'q', acceptedAnswer: { '@type': 'Answer', text: 'As of April 19, 2026, up to 2 ounces ... Recreational = 56 grams' } }] })
    + '</head><body><h1>x</h1><a href="../directions/?category=edibles&amp;brand=wana">d</a><a href="https://macsseafood.com/?utm_source=capecodcannabis.com&amp;utm_medium=referral">m</a><form aria-label="Search"><input name="s"></form></body></html>').findings;
  const c8 = checkPage('ctl/no-h1.html', '<html><body><h2>x</h2></body></html>').findings;
  const c9 = checkPage('ctl/hidden-h1.html', '<html><body><section hidden><h1>x</h1></section><p>y</p></body></html>').findings;
  const k6 = kinds(c6);
  /* AI-label controls: a labelled file from this build (else a labelled WebP made in memory from tools/ai-label.xmp) is
     not reported; its stripped copy is (WebP: XMP chunk removed; any other file: label bytes blanked) */
  const aiReal = ai.list.find((x) => fileSet.has(x) && /\.webp$/.test(x) && checkAiLabel(x, fs.readFileSync(path.join(dist, x))).length === 0);
  const aiSynth = () => {
    const xmp = fs.readFileSync(path.join(ROOT, 'tools/ai-label.xmp'));
    const chunk = (id, data) => { const h = Buffer.alloc(8); h.write(id, 0, 'ascii'); h.writeUInt32LE(data.length, 4); return Buffer.concat([h, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
    const vp8x = Buffer.alloc(10); vp8x[0] = 0x04;
    const body = Buffer.concat([Buffer.from('WEBP'), chunk('VP8X', vp8x), chunk('VP8L', Buffer.from([0x2f, 0, 0, 0, 0])), chunk('XMP ', xmp)]);
    const head = Buffer.alloc(8); head.write('RIFF', 0, 'ascii'); head.writeUInt32LE(body.length, 4);
    return Buffer.concat([head, body]);
  };
  const aiBuf = aiReal ? fs.readFileSync(path.join(dist, aiReal)) : aiSynth();
  const aiOther = ai.list.find((x) => fileSet.has(x) && !/\.webp$/.test(x) && checkAiLabel(x, fs.readFileSync(path.join(dist, x))).length === 0);
  const aiOtherBuf = aiOther ? fs.readFileSync(path.join(dist, aiOther)) : Buffer.from('....' + AI_NEEDLE + '....');
  const control = {
    aiLabelledNotReported: checkAiLabel('ctl/ai.webp', aiBuf).length === 0 && checkAiLabel('ctl/ai-other', aiOtherBuf).length === 0,
    aiStrippedWebpReported: checkAiLabel('ctl/ai-stripped.webp', stripWebpXmp(aiBuf)).length === 1,
    aiStrippedOtherReported: checkAiLabel('ctl/ai-stripped-other', blankLabel(aiOtherBuf)).length === 1,
    validNotReported: c1.length === 0,
    twoH1: kinds(c2).has('h1-count'), residue: kinds(c2).has('residue'), honeypot: kinds(c2).has('honeypot'), liveHref: kinds(c2).has('live-site-url'),
    missingRoute: c3.length === 1, sitemapMissing: kinds(c4).has('sitemap-missing'), sitemapDuplicate: kinds(c4).has('sitemap-duplicate'),
    encodedLiveUrlReported: c5.length === 1 && c5[0].kind === 'live-site-url' && /google/.test(c5[0].value),
    ldAlternateName: k6.has('ld-excluded-alternate-name'), ldOpeningHours: k6.has('ld-excluded-opening-hours'), ldStaleFaq: k6.has('ld-stale-faq'),
    ldPersonalEmail: k6.has('ld-personal-email'), ldJointImage: k6.has('ld-joint-image'),
    trackingInternal: c6.filter((x) => x.kind === 'tracking-param-internal-link').length === 2,
    platformNames: c6.filter((x) => x.kind === 'platform-id-name').length === 3,
    cleanTwinNotReported: c7.length === 0,
    noH1: kinds(c8).has('h1-count'), hiddenH1: kinds(c9).has('h1-not-visible'),
  };
  control.fired = Object.values(control).every(Boolean);
  const byKind = findings.reduce((a, x) => { a[x.kind] = (a[x.kind] || 0) + 1; return a; }, {});
  return { dist, files: files.length, pages, routes: routes.length, routesEmitted: routes.length - (byKind['route-not-emitted'] || 0), indexable: indexableBuilt.length, sitemapLocs: sm.locs, productsInSitemapHtml: products.size, productsPresent, proseMentions: prose, handoffLinks: handoffs,
    ai: { files: ai.list.length, labelled: aiLabelled, fromReport: !!opts.report, controlSource: { webp: aiReal || 'synthetic WebP (tools/ai-label.xmp)', other: aiOther || 'synthetic buffer' } }, findings, byKind, control };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i === -1 ? null : process.argv[i + 1]; };
  const dist = path.resolve(arg('--dir') || path.join(ROOT, 'dist'));
  const report = arg('--report') ? JSON.parse(fs.readFileSync(path.resolve(arg('--report')), 'utf8')) : null;
  const r = run(dist, { report });
  console.log('build-check ' + dist);
  console.log('files ' + r.files + ' | pages ' + r.pages + ' | routes ' + r.routesEmitted + '/' + r.routes + ' emitted | sitemap ' + r.sitemapLocs + ' locs for ' + r.indexable + ' indexable | products ' + r.productsPresent + '/' + r.productsInSitemapHtml + ' | hand-off links ' + r.handoffLinks + ' | prose mentions of the domain ' + r.proseMentions);
  console.log('ai label: ' + r.ai.labelled + '/' + r.ai.files + ' AI-generated files carry "' + AI_NEEDLE + '"' + (r.ai.fromReport ? ' (lists cross-checked with --report)' : ' (found by name; pass --report <build report> to cross-check its aiVariants/aiAssets)') + '; control source: ' + r.ai.controlSource.webp + ', ' + r.ai.controlSource.other);
  console.log('findings ' + r.findings.length + ' ' + JSON.stringify(r.byKind));
  for (const x of r.findings.slice(0, 25)) console.log('  FINDING ' + JSON.stringify(x).slice(0, 300));
  console.log('control: ' + (r.control.fired ? 'fired (' + (Object.keys(r.control).length - 4) + ' planted defects reported: an AI file stripped of its label (WebP and other), two H1, no H1, hidden H1, residue, honeypot, live href, percent-encoded live URL, missing route, sitemap missing/duplicate, the 5 excluded JSON-LD facts, 2 internal tracking links, 3 platform aria-label/name; canonical, og:url, JSON-LD URL, hand-off, mailto:, an external utm_source referral and a clean JSON-LD/link/form twin not)' : 'DID NOT FIRE ' + JSON.stringify(r.control)));
  if (arg('--json')) fs.writeFileSync(path.resolve(arg('--json')), JSON.stringify(r, null, 1));
  process.exitCode = r.findings.length || !r.control.fired ? 1 : 0;
}
