#!/usr/bin/env node
// product-guard.mjs - DESIGN-SPEC R-44: every product name, variant, price and description line rendered on a product
// page must be found verbatim in that product's source record. Owner: T2b (shop). Node builtins only; no network.
//
//   node tools/product-guard.mjs [--dir dist] [--json <report.json>] [--control-dir <dir>]
//   exit 0: no finding on the build AND every planted control fired (and the clean copies were not reported)
//   exit 1: a finding, or a control that did not fire;  exit 2: bad arguments or unreadable inputs
//
// What is checked, on every <dir>/products/<path>/index.html (one per catalog product, src/content/catalog/products.json):
//   - the page renders its product name exactly once, in the element marked data-guard="name" (a missing or doubled
//     marker is a finding, so the guard cannot pass on markup it no longer sees);
//   - name: equals the catalog title, AND that title is the verbatim link text of the product's own link in the site's
//     HTML sitemap (audit/raw/sitemap.html, entities decoded): the stubs' source record;
//   - full records (t1; product.full.evidence = audit/prelock/t1.html): every data-guard="variant", "price" and "desc"
//     text is found verbatim in that source file: the variant as an offer "name", the price as an offer "price" (the
//     rendered "$" only for priceCurrency "USD", which the source must state), each description line inside the
//     source (raw or entity-decoded, where the description's <br /> separates the lines);
//   - stubs (no full record): no variant, price or description marker, no Reserve button, no "$<digits>" text and no
//     product photo (images.dutchie.com) anywhere in <main> (Plan B: no price, image or offers; BUILD-CONTRACT 4.5).
// Controls: copies of the t1 page and of one stub page are written under --control-dir (default tmp/product-guard-
// control) with planted defects (a changed price, a changed variant, an altered description line, a changed stub name,
// a price planted on a stub, a doubled name marker); each must be reported. The clean copies must not be.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DIR = path.resolve(ROOT, opt('--dir', 'dist'));
const JSON_OUT = opt('--json', null);
const CTL = path.resolve(ROOT, opt('--control-dir', 'tmp/product-guard-control'));
if (!fs.existsSync(DIR)) { console.error('product-guard: no build at ' + DIR); process.exit(2); }
if (CTL.startsWith(DIR + path.sep)) { console.error('product-guard: the control dir must not be inside the build'); process.exit(2); }

/* ---------------------------------------------------------------- text helpers */
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', frac14: '¼', frac12: '½', frac34: '¾', reg: '®', trade: '™', deg: '°', eacute: 'é' };
function decode(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, k) => {
    if (k[0] === '#') { const n = k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    const v = NAMED[k.toLowerCase()];
    return v === undefined ? m : v;
  });
}
const textOf = (html) => decode(String(html).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
/** every element carrying data-guard="<kind>" (non-nested markers; inner tags stripped) */
function markers(html, kind) {
  const out = [];
  const re = new RegExp('<([a-z][a-z0-9]*)\\b[^>]*\\bdata-guard="' + kind + '"[^>]*>([\\s\\S]*?)</\\1>', 'gi');
  let m;
  while ((m = re.exec(html))) out.push(textOf(m[2]));
  return out;
}
function mainOf(html) {
  const a = html.search(/<main[\s>]/i), z = html.lastIndexOf('</main>');
  return a >= 0 && z > a ? html.slice(a, z) : '';
}

/* ---------------------------------------------------------------- inputs */
let catalog;
try { catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/catalog/products.json'), 'utf8')); } catch (err) { console.error('product-guard: cannot read the catalog: ' + err.message); process.exit(2); }
const products = Array.isArray(catalog) ? catalog : catalog.products;
let sitemapHtml;
try { sitemapHtml = fs.readFileSync(path.join(ROOT, 'audit/raw/sitemap.html'), 'utf8'); } catch (err) { console.error('product-guard: cannot read audit/raw/sitemap.html: ' + err.message); process.exit(2); }
/* the sitemap's product links: decoded output path -> verbatim link text (the stubs' source record) */
const SITEMAP = new Map();
for (const m of sitemapHtml.matchAll(/<a\b[^>]*href="(https?:\/\/(?:www\.)?capecodcannabis\.com)?(\/products\/[^"#?]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
  let p = m[2];
  try { p = decodeURIComponent(p); } catch { /* keep */ }
  if (!p.endsWith('/')) p += '/';
  if (!SITEMAP.has(p)) SITEMAP.set(p, textOf(m[3]));
}
const sourceCache = new Map();
function sourceOf(rel) {
  if (!sourceCache.has(rel)) {
    const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    sourceCache.set(rel, { raw, dec: decode(raw), dec2: decode(decode(raw)) });
  }
  return sourceCache.get(rel);
}
const inSource = (src, s) => src.raw.includes(s) || src.dec.includes(s) || src.dec2.includes(s);

/* ---------------------------------------------------------------- the check of one page */
function checkPage(html, p) {
  const f = [];
  const add = (what, detail) => f.push({ path: p.path, what, detail });
  const names = markers(html, 'name');
  if (names.length !== 1) add('name-marker-count', names.length + ' elements marked data-guard="name" (want 1)');
  for (const n of names) {
    if (n !== textOf(p.title)) add('name-not-catalog-title', JSON.stringify(n) + ' != catalog ' + JSON.stringify(p.title));
    const sm = SITEMAP.get(p.path);
    if (sm === undefined) add('name-no-sitemap-record', p.path + ' is not linked from audit/raw/sitemap.html');
    else if (n !== sm) add('name-not-in-sitemap', JSON.stringify(n) + ' != sitemap ' + JSON.stringify(sm));
  }
  const variants = markers(html, 'variant'), prices = markers(html, 'price'), descs = markers(html, 'desc');
  if (p.full) {
    const ev = p.full.evidence;
    let src = null;
    try { src = sourceOf(ev); } catch (err) { add('source-unreadable', ev + ': ' + err.message); }
    if (src) {
      for (const n of names) if (!inSource(src, n)) add('name-not-in-source', JSON.stringify(n) + ' not in ' + ev);
      for (const v of variants) if (!inSource(src, '"name":"' + v + '"')) add('variant-not-in-source', JSON.stringify(v) + ' is not an offer name in ' + ev);
      for (const pr of prices) {
        const m = /^(\$)?(\d+(?:\.\d+)?)$/.exec(pr);
        if (!m) { add('price-format', JSON.stringify(pr)); continue; }
        if (!inSource(src, '"price":"' + m[2] + '"')) add('price-not-in-source', JSON.stringify(pr) + ' is not an offer price in ' + ev);
        if (m[1] && !inSource(src, '"priceCurrency":"USD"')) add('price-currency', JSON.stringify(pr) + ' shows $ but ' + ev + ' states no USD');
      }
      for (const d of descs) if (!inSource(src, d)) add('desc-not-in-source', JSON.stringify(d) + ' not in ' + ev);
      if (!variants.length || !prices.length || !descs.length) add('full-record-not-rendered', 'variant ' + variants.length + ', price ' + prices.length + ', desc ' + descs.length);
    }
  } else {
    if (variants.length || prices.length || descs.length) add('stub-shows-offer', 'variant ' + variants.length + ', price ' + prices.length + ', desc ' + descs.length);
    const main = mainOf(html);
    if (/data-bag-add/.test(main)) add('stub-reserve', 'a Reserve button on a Plan B stub');
    const money = textOf(main).match(/\$\s?\d/g);
    if (money) add('stub-price-text', money.length + ' "$<digits>" in <main>');
    if (/images\.dutchie\.com/.test(main)) add('stub-photo', 'a product photo on a Plan B stub');
  }
  return f;
}

/* ---------------------------------------------------------------- run over the build */
const t0 = Date.now();
const findings = [];
let pages = 0, full = 0, missing = 0;
const fileOf = (dir, p) => path.join(dir, ...p.split('/').filter(Boolean), 'index.html');
for (const p of products) {
  const file = fileOf(DIR, p.path);
  if (!fs.existsSync(file)) { missing++; findings.push({ path: p.path, what: 'page-missing', detail: path.relative(ROOT, file) }); continue; }
  pages++;
  if (p.full) full++;
  findings.push(...checkPage(fs.readFileSync(file, 'utf8'), p));
}

/* ---------------------------------------------------------------- planted controls (copies, never in the build) */
const controls = [];
const t1 = products.find((p) => p.full && fs.existsSync(fileOf(DIR, p.path)));
const stub = products.find((p) => !p.full && SITEMAP.has(p.path) && fs.existsSync(fileOf(DIR, p.path)));
fs.rmSync(CTL, { recursive: true, force: true });
fs.mkdirSync(CTL, { recursive: true });
function plant(name, p, html, mutate, expectWhat) {
  const planted = mutate(html);
  const changed = planted !== html;
  fs.writeFileSync(path.join(CTL, name + '.html'), planted);
  const got = checkPage(planted, p).map((x) => x.what);
  const pass = changed && (expectWhat ? got.includes(expectWhat) : got.length === 0);
  controls.push({ name, page: p.path, planted: changed, expect: expectWhat || 'nothing reported', got, pass });
}
if (!t1 || !stub) controls.push({ name: 'controls', pass: false, why: 'no t1 page or no stub page in the build' });
else {
  const T = fs.readFileSync(fileOf(DIR, t1.path), 'utf8');
  const S = fs.readFileSync(fileOf(DIR, stub.path), 'utf8');
  const tag = (kind) => new RegExp('(<([a-z][a-z0-9]*)\\b[^>]*\\bdata-guard="' + kind + '"[^>]*>)([\\s\\S]*?)(</\\2>)', 'i');
  plant('clean-t1', t1, T, (h) => h + '<!-- clean copy -->', null);
  plant('clean-stub', stub, S, (h) => h + '<!-- clean copy -->', null);
  plant('t1-price-changed', t1, T, (h) => h.replace(tag('price'), (m, a, n, inner, z) => a + inner.replace(/\d+\.\d\d/, (x) => (parseFloat(x) - 10).toFixed(2)) + z), 'price-not-in-source');
  plant('t1-variant-changed', t1, T, (h) => h.replace(tag('variant'), (m, a, n, inner, z) => a + inner + ' bundle' + z), 'variant-not-in-source');
  plant('t1-desc-altered', t1, T, (h) => h.replace(tag('desc'), (m, a, n, inner, z) => a + inner + ', Euphoric' + z), 'desc-not-in-source');
  plant('t1-name-doubled', t1, T, (h) => h.replace(/<main\b[^>]*>/i, (x) => x + '<p data-guard="name">' + t1.title.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</p>'), 'name-marker-count');
  plant('stub-name-changed', stub, S, (h) => h.replace(tag('name'), (m, a, n, inner, z) => a + inner + ' XL' + z), 'name-not-catalog-title');
  plant('stub-price-planted', stub, S, (h) => h.replace(/<main\b[^>]*>/i, (x) => x + '<p><span data-guard="price">$10.00</span></p>'), 'stub-shows-offer');
  plant('stub-dollar-text', stub, S, (h) => h.replace(/<main\b[^>]*>/i, (x) => x + '<p>Now only $12</p>'), 'stub-price-text');
}

const controlsOk = controls.length > 0 && controls.every((c) => c.pass);
const byWhat = {};
for (const x of findings) byWhat[x.what] = (byWhat[x.what] || 0) + 1;
const report = { dir: path.relative(ROOT, DIR) || '.', products: products.length, pagesChecked: pages, fullRecords: full, pagesMissing: missing, findings: findings.length, byWhat, examples: findings.slice(0, 20), controls, ms: Date.now() - t0 };
if (JSON_OUT) fs.writeFileSync(path.resolve(ROOT, JSON_OUT), JSON.stringify(report, null, 1));
console.log('product-guard: ' + pages + ' product pages checked (' + full + ' full record), ' + missing + ' missing, ' + findings.length + ' findings ' + JSON.stringify(byWhat));
for (const x of findings.slice(0, 10)) console.log('  ' + x.what + ' ' + x.path + ' ' + x.detail);
console.log('controls: ' + (controlsOk ? 'fired' : 'FAILED') + ' (' + controls.map((c) => c.name + (c.pass ? ' ok' : ' FAIL ' + JSON.stringify(c.got))).join('; ') + ')');
process.exit(findings.length || !controlsOk ? 1 : 0);
