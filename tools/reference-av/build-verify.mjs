#!/usr/bin/env node
// build-verify.mjs - independent checks of the built site in dist/ (PIPELINE role). It reads the inputs and dist/ with
// its own code (no import from src/), except for the build report's image manifest in check (f).
//   (a)  text: for each SOURCE page, every sentence unit of its model text appears in the built page's <main> at its NEW
//        path. Units and normalisation are tools/text-parity.mjs's (same NON_TEXT_KEYS, same composition rule, same
//        norm()). Categories: visible text (default) must be in the text of <main>; alt / aria-label / placeholder /
//        map title / rating label may also be an attribute value inside <main>; runtime UI strings (ui.*, form
//        messages.*) may be anywhere in <main>'s markup or in the shipped JS; a review excerpt is covered when it is a
//        prefix of its full quote (which is checked); excluded with a reason: rel values, form input/rule `name`
//        attributes, reviews.aggregate (JSON-LD data, checked in h), location record fields the source did not print
//        (`show`). Declared edits: (732) 736-1700 -> (732) 978-9306 (BUILD-CONTRACT 4.3), the removed comic (4.7).
//   (a2) the same scoring for the source page's own visible <main> units (audit/raw static pipeline + rendered text);
//   (a3) every text unit of each adopted JSON appears in its built page.
//   (b)  exactly one <h1> in every built page (and 404.html).
//   (c)  residue: platform and Eye Trends strings nowhere in dist (text files fully; images by metadata chunks; names);
//        "EyeCarePro" only inside the disclaimer's legal text; the second phone number nowhere (4.3); map embeds keyless
//        by name + address (4.8).
//   (d)  every moved source path is absent from dist as a page and present in _redirects (both forms) and .htaccess.
//   (e)  every nav, footer, top-bar, header-button and CTA href resolves, and every built page links every nav/footer page.
//   (f)  the removed comic (practice-35053-c2274987) appears nowhere: no id/uuid in any text or name, no variant made from
//        its files (build report manifest + sha256), and no dist WebP of its shape is visually close (dHash via dwebp).
//   (g)  every variant made from assets/generated/ carries the IPTC trainedAlgorithmicMedia XMP, and no other file does.
//   (h)  SEO: canonical self at the live origin, og:url = canonical, og:image served, one consolidated business block,
//        no other business entity, BreadcrumbList ending at the page, the reviews page's 20 reviews + aggregateRating.
//   (i)  sitemap.xml lists every page once at the live origin with no lastmod; robots.txt allows all with the Sitemap
//        line; the /sitemap/ page links every page.
// Every check has an in-memory positive control; --control also runs the (a) control the brief names: one sentence is
// removed from one built page in memory and exactly that one must be reported.
//   node tools/build-verify.mjs [--dist dist] [--report tmp/pipeline/build-report.json] [--control] [--show 15] [--json out.json]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i === -1 ? d : argv[i + 1]; };
const DIST = path.resolve(ROOT, opt('--dist', 'dist'));
const REPORT = path.resolve(ROOT, opt('--report', 'tmp/pipeline/build-report.json'));
const SHOW = Number(opt('--show', 15));
const CONTROL = argv.includes('--control');
const ORIGIN = 'https://www.academyvisionnj.com';
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const R = (...p) => path.join(ROOT, ...p);

/* ------------------------------------------------------------------ text-parity's normalisation (same rules) */
const cc = (...c) => String.fromCharCode(...c);
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: '-', mdash: '-', hellip: '...', raquo: '', laquo: '', reg: cc(0xae), trade: cc(0x2122), copy: cc(0xa9), bull: cc(0x2022), middot: cc(0xb7), deg: cc(0xb0), shy: '', eacute: cc(0xe9), ntilde: cc(0xf1) };
const decode = (s) => String(s || '')
  .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z][a-z0-9]*);/gi, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : NAMED[n.toLowerCase()] !== undefined ? NAMED[n.toLowerCase()] : m));
const SPACES = new RegExp('[\\s' + cc(0xa0, 0x1680, 0x2000) + '-' + cc(0x200a, 0x202f, 0x205f, 0x3000) + ']+', 'g');
const ZERO = new RegExp('[' + cc(0x200b) + '-' + cc(0x200d, 0x2060, 0xfeff, 0xad) + ']', 'g');
const SQUOTES = new RegExp('[' + cc(0x2018, 0x2019, 0x201a, 0x201b, 0x2032, 0x2bc) + '`]', 'g');
const DQUOTES = new RegExp('[' + cc(0x201c, 0x201d, 0x201e, 0x201f, 0x2033) + ']', 'g');
const DASHES = new RegExp('[' + cc(0x2010) + '-' + cc(0x2015, 0x2212) + ']', 'g');
const ELLIPSIS = new RegExp(cc(0x2026), 'g');
const RAQUO = new RegExp(cc(0xbb), 'g');
const norm = (s) => decode(s).replace(ZERO, '').replace(SQUOTES, "'").replace(DQUOTES, '"').replace(DASHES, '-').replace(ELLIPSIS, '...').replace(RAQUO, ' ')
  .replace(SPACES, ' ').replace(/\s+([,.;:!?)])/g, '$1').replace(/\(\s+/g, '(').trim().toLowerCase();
const squash = (s) => s.replace(/\s+/g, '');
const BLOCK = /^<\/?(p|div|li|ul|ol|h[1-6]|td|th|tr|table|thead|tbody|tfoot|caption|dt|dd|dl|section|article|header|footer|nav|aside|main|form|fieldset|legend|label|option|select|button|blockquote|figure|figcaption|address|br|hr|summary|details)\b/i;
const TAG = /<[!/a-zA-Z](?:"[^"]*"|'[^']*'|[^'">])*>/g;
const htmlToText = (h) => String(h || '').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript|template|svg|iframe)\b[\s\S]*?<\/\1\s*>/gi, '\n').replace(TAG, (t) => (BLOCK.test(t) ? '\n' : ''));
const unitsOf = (text) => {
  const out = [];
  for (const line of String(text).split(/\n+/)) {
    const n = norm(line);
    if (!n) continue;
    for (const s of n.split(/(?<=[.!?])\s+/)) { const u = s.trim(); if (u && /[\p{L}\p{N}]/u.test(u)) out.push(u); }
  }
  return out;
};
const isWord = (ch) => !!ch && /[\p{L}\p{N}]/u.test(ch);
function countOcc(hay, unit) {
  let n = 0, i = hay.indexOf(unit);
  while (i !== -1) {
    if ((!isWord(unit[0]) || !isWord(hay[i - 1])) && (!isWord(unit[unit.length - 1]) || !isWord(hay[i + unit.length]))) { n++; i = hay.indexOf(unit, i + unit.length); } else i = hay.indexOf(unit, i + 1);
  }
  return n;
}
const occurs = (hay, unit) => countOcc(hay, unit) > 0;
const NON_TEXT_KEYS = new Set(['t', 'id', 'origin', 'col', 'at', 'cpt', 'master', 'file', 'w', 'h', 'href', 'external', 'newTab', 'variant', 'focal',
  'group', 'element', 'level', 'kind', 'show', 'locationId', 'phoneHref', 'mapsUrl', 'placeId', 'mapQuery', 'presentation', 'labelFor', 'legend',
  'required', 'requiredGroup', 'submitName', 'el', 'type', 'rows', 'min', 'max', 'step', 'inputmode', 'autocomplete', 'phoneFormat', 'value', 'chevron',
  'hint', 'transform', 'align', 'highlight', 'conditional', 'origin', 'matchedFrom', 'rating', 'ratingOf', 'date', 'depth', 'empty', 'action', 'logic',
  'enabled', 'operator', 'mode', 'field', 'name_attr', 'scriptEndpoint', 'scriptMethod', 'captcha', 'attribute', 'method', 'novalidate', 'hidden',
  'position', 'mobile', 'background', 'layout', 'identifier', 'unknownType']);

/* ------------------------------------------------------------------ inputs */
const restructure = readJson(R('src/content/restructure.json'));
const masters = readJson(R('src/content/image-masters.json'));
const inventory = readJson(R('audit/image-inventory.json')).images;
const report = fs.existsSync(REPORT) ? readJson(REPORT) : null;
const moves = restructure.moves;
const ownPath = (p) => String(p).replace(/^\/+|\/+$/g, '');
const remapOwn = (own) => { const p = ownPath(own); if (Object.hasOwn(moves, p)) return moves[p]; for (const k of Object.keys(moves).sort((a, b) => b.length - a.length)) if (p.startsWith(k + '/')) return moves[k] + p.slice(k.length); return p; };
const served = (own) => (own ? '/' + own + '/' : '/');
const distFileOf = (p) => path.join(DIST, p === '/' ? 'index.html' : ownPath(p) + '/index.html');
function listFiles(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) { const p = path.join(dir, e.name); if (e.isDirectory()) listFiles(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/')); }
  return out;
}
const distFiles = listFiles(DIST);
const pagePaths = [...restructure.keep.map((k) => served(k)), ...Object.values(moves).map(served), ...restructure.adopt.map((a) => served(a.path))].filter((v, i, a) => a.indexOf(v) === i).sort();
const results = [];
const check = (id, name, ok, details = [], extra = {}) => { results.push({ id, name, ok, details, ...extra }); };
const mainOf = (html) => { const a = html.search(/<main\b/i); const b = html.lastIndexOf('</main>'); return a === -1 || b === -1 ? null : html.slice(a, b + 7); };
const ATTR_VAL = /\s(alt|aria-label|title|placeholder|value|content|label)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const attrText = (h) => [...h.matchAll(ATTR_VAL)].map((m) => norm(m[2] ?? m[3])).filter(Boolean).join('\n');
const visibleText = (h) => htmlToText(h).split(/\n+/).map(norm).filter(Boolean).join('\n');
const jsText = distFiles.filter((f) => /^assets\/[^/]+\.js$/.test(f)).map((f) => norm(fs.readFileSync(path.join(DIST, f), 'utf8'))).join('\n');

/* ------------------------------------------------------------------ (a) model text */
const PHONE_FROM = '(732) 736-1700', PHONE_TO = '(732) 978-9306';
function applyDeclaredEdits(model) {
  const m = structuredClone(model);
  const walk = (v) => { if (Array.isArray(v)) v.forEach((x, i) => { if (typeof x === 'string') v[i] = x.split(PHONE_FROM).join(PHONE_TO); else walk(x); }); else if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (typeof v[k] === 'string') v[k] = v[k].split(PHONE_FROM).join(PHONE_TO); else walk(v[k]); } };
  walk(m.blocks);
  return m;
}
function categoryOf(node, key, keys) {
  if (keys.includes('ui') || keys.includes('messages')) return 'ui';
  if (node.t === 'reviews' && keys[0] === 'aggregate') return 'skip';
  if (node.t === 'reviews' && key === 'excerpt') return 'excerpt';
  if (key === 'rel') return 'skip';
  if (node.t === 'form' && key === 'name') return 'skip';
  if (node.t === 'location') {
    const show = new Set(node.show || []);
    if (['name', 'address', 'phone'].includes(key) && !show.has(key)) return 'skip';
    if (keys[0] === 'hours' && !show.has('hours')) return 'skip';
    if (key === 'mapTitle') return show.has('map') ? 'attr' : 'skip';
  }
  if (['alt', 'ariaLabel', 'placeholder', 'mapTitle', 'ratingLabel'].includes(key)) return 'attr';
  return 'text';
}
function modelUnits(model) {
  const units = new Map();
  const add = (text, cat) => { for (const u of unitsOf(text)) { if (!units.has(u)) units.set(u, new Set()); units.get(u).add(cat); } };
  const excerpts = [];
  const visit = (v, node, key, keys) => {
    if (v === null || v === undefined) return;
    if (typeof v === 'string') { const cat = categoryOf(node, key, keys); if (cat !== 'skip') add(/<[a-z][^>]*>/i.test(v) ? htmlToText(v) : v, cat); return; }
    if (typeof v !== 'object') return;
    if (Array.isArray(v)) { for (const x of v) visit(x, node, key, keys); return; }
    if (typeof v.label === 'string' && typeof v.requiredMark === 'string') add(v.label + ' ' + v.requiredMark, 'text');
    if (node.t === 'reviews' && typeof v.excerpt === 'string' && typeof v.quote === 'string') excerpts.push({ excerpt: v.excerpt, quote: v.quote });
    for (const [k, x] of Object.entries(v)) { if (NON_TEXT_KEYS.has(k)) continue; visit(x, node, k, keys.concat(k)); }
  };
  for (const b of model.blocks || []) for (const n of b.nodes || []) visit(n, n, 'nodes', []);
  /* an excerpt is covered only when it truncates its own quote; otherwise its units count as visible text */
  const badExcerpts = [];
  for (const x of excerpts) {
    const e = norm(x.excerpt).replace(/(\.\.\.|\s)+$/, '');
    if (!norm(x.quote).startsWith(e)) { badExcerpts.push(x.excerpt.slice(0, 80)); for (const u of unitsOf(x.excerpt)) units.get(u) && units.get(u).add('text'); }
  }
  return { units, badExcerpts };
}
function score(units, hay) {
  const res = { total: units.size, found: 0, wsOnly: [], viaAttr: 0, viaUi: 0, viaExcerpt: 0, missing: [] };
  const visSq = squash(hay.visible);
  for (const [u, cats] of units) {
    if (occurs(hay.visible, u)) { res.found++; continue; }
    if (visSq.includes(squash(u))) { res.found++; res.wsOnly.push(u); continue; }
    if (!cats.has('text')) {
      if (cats.has('attr') && occurs(hay.attrs, u)) { res.found++; res.viaAttr++; continue; }
      if (cats.has('ui') && (occurs(hay.raw, u) || occurs(hay.js, u) || occurs(hay.raw, u.replace(/\s*\{n\}.*$/, '')))) { res.found++; res.viaUi++; continue; }
      if (cats.has('excerpt') && !cats.has('attr') && !cats.has('ui')) { res.found++; res.viaExcerpt++; continue; }
    }
    res.missing.push({ unit: u, cats: [...cats].join('+') });
  }
  return res;
}
const hayOf = (html) => { const m = mainOf(html); return m === null ? null : { visible: visibleText(m), attrs: attrText(m), raw: norm(m), js: jsText }; };

const models = fs.readdirSync(R('src/content/pages')).filter((f) => f.endsWith('.json')).sort().map((f) => ({ slug: f.slice(0, -5), model: readJson(R('src/content/pages', f)) }));
const aRows = [], a2Rows = [];
const hays = new Map();
for (const { slug, model } of models) {
  const p = served(remapOwn(model.path));
  const file = distFileOf(p);
  if (!fs.existsSync(file)) { aRows.push({ slug, path: p, error: 'built page missing' }); continue; }
  const hay = hayOf(fs.readFileSync(file, 'utf8'));
  if (!hay) { aRows.push({ slug, path: p, error: 'no <main> in built page' }); continue; }
  hays.set(slug, hay);
  const { units, badExcerpts } = modelUnits(applyDeclaredEdits(model));
  aRows.push({ slug, path: p, units, badExcerpts, ...score(units, hay) });
  /* (a2) the raw page's own visible <main> units, categorised by the model key that holds them */
  const raw = fs.readFileSync(R('audit/raw', slug + '.html'), 'utf8');
  const ra = raw.indexOf('<main'), rb = raw.indexOf('</main>');
  const srcUnits = new Map();
  const addSrc = (u) => { const v = u.split(norm(PHONE_FROM)).join(norm(PHONE_TO)); if (!srcUnits.has(v)) srcUnits.set(v, units.get(v) ? new Set(units.get(v)) : new Set(['text'])); };
  for (const u of unitsOf(htmlToText(raw.slice(ra, rb + 7)))) addSrc(u);
  const rf = R('tmp/extract/rendered', slug + '.main.txt');
  if (fs.existsSync(rf)) for (const u of unitsOf(fs.readFileSync(rf, 'utf8'))) addSrc(u);
  a2Rows.push({ slug, path: p, ...score(srcUnits, hay) });
}
const sumOf = (rows) => rows.reduce((a, r) => ({ total: a.total + (r.total || 0), found: a.found + (r.found || 0), missing: a.missing + (r.missing ? r.missing.length : 0), ws: a.ws + (r.wsOnly ? r.wsOnly.length : 0), attr: a.attr + (r.viaAttr || 0), ui: a.ui + (r.viaUi || 0), ex: a.ex + (r.viaExcerpt || 0), err: a.err + (r.error ? 1 : 0) }), { total: 0, found: 0, missing: 0, ws: 0, attr: 0, ui: 0, ex: 0, err: 0 });
const aSum = sumOf(aRows), a2Sum = sumOf(a2Rows);
const rowDetails = (rows) => rows.filter((r) => r.error || r.missing.length).flatMap((r) => r.error ? [r.slug + ' ' + r.path + ': ' + r.error] : [r.slug + ' -> ' + r.path + ': ' + r.missing.length + ' missing', ...r.missing.slice(0, SHOW).map((m) => '    [' + m.cats + '] ' + m.unit.slice(0, 160))]);
check('a', 'model text of every source page is in its built <main> (' + aSum.found + '/' + aSum.total + ' units; ' + aSum.ws + ' ws-only, ' + aSum.attr + ' via attribute, ' + aSum.ui + ' via UI/JS, ' + aSum.ex + ' review excerpts covered by their quote)', aSum.missing === 0 && aSum.err === 0 && aRows.length === models.length, rowDetails(aRows).concat(aRows.flatMap((r) => (r.badExcerpts || []).map((x) => r.slug + ': excerpt is not a prefix of its quote: ' + x))));
check('a2', 'source page visible units are in the built <main> (' + a2Sum.found + '/' + a2Sum.total + ')', a2Sum.missing === 0 && a2Sum.err === 0, rowDetails(a2Rows));

/* (a3) adopted pages */
const a3Rows = [];
for (const a of restructure.adopt) {
  const f = R('src/content/adopted', a.path.replace(/\//g, '__') + '.json');
  if (!fs.existsSync(f)) { a3Rows.push({ slug: a.path, error: 'adopted JSON missing' }); continue; }
  const j = readJson(f);
  const file = distFileOf(served(a.path));
  if (!fs.existsSync(file)) { a3Rows.push({ slug: a.path, error: 'built page missing' }); continue; }
  const hay = hayOf(fs.readFileSync(file, 'utf8'));
  const units = new Map();
  const add = (s) => { for (const u of unitsOf(/<[a-z][^>]*>/i.test(s) ? htmlToText(s) : s)) units.set(u, new Set(['text'])); };
  for (const s of [j.h1, j.kicker, j.lede, ...(j.sections || []).flatMap((x) => [x.heading, x.html]), ...(j.faq || []).flatMap((x) => [x.q, x.a]), j.cta && j.cta.heading, j.cta && j.cta.html]) if (typeof s === 'string') add(s);
  a3Rows.push({ slug: a.path, path: served(a.path), ...score(units, hay) });
}
const a3Sum = sumOf(a3Rows);
check('a3', 'adopted page text is in its built <main> (' + a3Sum.found + '/' + a3Sum.total + ' units, ' + a3Rows.length + ' pages)', a3Sum.missing === 0 && a3Sum.err === 0, rowDetails(a3Rows));

/* (a) control: one sentence removed from one built page in memory must be reported, and nothing else */
let aControl = null;
if (CONTROL) {
  for (const r of aRows) {
    if (!r.units || aControl) continue;
    const hay = hays.get(r.slug);
    const pick = [...r.units.keys()].find((u) => r.units.get(u).has('text') && u.split(' ').length >= 8 && countOcc(hay.visible, u) === 1);
    if (!pick) continue;
    const i = hay.visible.indexOf(pick);
    const cut = { ...hay, visible: hay.visible.slice(0, i) + ' ' + hay.visible.slice(i + pick.length) };
    const res = score(r.units, cut);
    const newMiss = res.missing.filter((m) => !r.missing.some((x) => x.unit === m.unit));
    aControl = { slug: r.slug, pick, fired: newMiss.length === 1 && newMiss[0].unit === pick, newMissing: newMiss.map((m) => m.unit) };
  }
  check('a-control', 'control: one sentence deleted in memory from ' + (aControl ? aControl.slug : '(none)') + ' is reported, nothing else', !!(aControl && aControl.fired), aControl ? ['deleted: "' + aControl.pick + '"', 'newly missing: ' + JSON.stringify(aControl.newMissing)] : ['no eligible sentence found']);
}

/* ------------------------------------------------------------------ (b) one h1 */
const htmlFiles = distFiles.filter((f) => /\.html$/.test(f));
const h1Count = (h) => (h.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script\s*>/gi, '').match(/<h1[\s>]/gi) || []).length;
const bBad = htmlFiles.map((f) => [f, h1Count(fs.readFileSync(path.join(DIST, f), 'utf8'))]).filter(([, n]) => n !== 1);
const bControl = h1Count('<h1>a</h1><!-- <h1>x</h1> --><h1 class="b">c</h1>') === 2 && h1Count('<h1>a</h1><script>"<h1>"</script>') === 1;
check('b', 'exactly one <h1> in each of ' + htmlFiles.length + ' HTML files (control ' + (bControl ? 'fired' : 'DID NOT FIRE') + ')', bBad.length === 0 && bControl, bBad.map(([f, n]) => f + ': ' + n));

/* ------------------------------------------------------------------ (c) residue */
const RESIDUE = ['patientengage', 'cpt--', 'ecp-', 'sitebuilder', 'googletagmanager', 'clarity.ms', 'callrail', 'recaptcha', 'eye trends', 'clear lake', 'hyder', '281-488', '(281) 488', 'bay area blvd', 'houston', '736-1700', '7327361700'];
const TEXT_EXT = /\.(html|css|js|mjs|json|xml|txt|svg|xmp|webmanifest|map)$|(^|\/)(_redirects|\.htaccess)$/i;
function binaryMeta(buf) {
  /* metadata a binary may carry as text: WebP XMP/EXIF chunks, PNG text chunks; nothing else is read (raw image bytes
     match short tokens by chance) */
  const out = [];
  if (buf.length > 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    for (let o = 12; o + 8 <= buf.length;) { const id = buf.toString('latin1', o, o + 4); const len = buf.readUInt32LE(o + 4); if (id === 'XMP ' || id === 'EXIF') out.push(buf.toString('latin1', o + 8, o + 8 + len)); o += 8 + len + (len & 1); }
  } else if (buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) {
    for (let o = 8; o + 8 <= buf.length;) { const len = buf.readUInt32BE(o); const id = buf.toString('latin1', o + 4, o + 8); if (/^(tEXt|iTXt|zTXt)$/.test(id)) out.push(buf.toString('latin1', o + 8, o + 8 + len)); o += 12 + len; }
  }
  return out.join('\n');
}
const residueHits = [];
const ecpCounts = {};
let textScanned = 0, binScanned = 0;
const scanText = (label, s) => { const low = s.toLowerCase(); for (const t of RESIDUE) { const i = low.indexOf(t); if (i !== -1) residueHits.push(label + ': "' + t + '" ... ' + s.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, ' ')); } };
for (const f of distFiles) {
  scanText('name ' + f, f);
  const buf = fs.readFileSync(path.join(DIST, f));
  if (TEXT_EXT.test(f)) { textScanned++; const s = buf.toString('utf8'); scanText(f, s); const n = (s.toLowerCase().match(/eyecarepro/g) || []).length; if (n) ecpCounts[f] = n; }
  else { binScanned++; const meta = binaryMeta(buf); if (meta) scanText(f + ' (metadata)', meta); if (/eyecarepro/i.test(meta)) ecpCounts[f + ' (metadata)'] = 1; }
}
/* EyeCarePro: only inside the disclaimer's legal text, as often as the model's disclaimer prints it */
const disc = models.find((m) => m.slug === 'disclaimer').model;
const discLegal = disc.blocks.flatMap((b) => b.nodes).find((n) => n.t === 'legal' && n.kind === 'disclaimer');
const ecpModel = (discLegal.html.toLowerCase().match(/eyecarepro/g) || []).length;
const discHtml = fs.existsSync(path.join(DIST, 'disclaimer/index.html')) ? fs.readFileSync(path.join(DIST, 'disclaimer/index.html'), 'utf8') : '';
const discMain = mainOf(discHtml) || '';
const ecpInMain = (discMain.toLowerCase().match(/eyecarepro/g) || []).length;
const ecpOk = Object.keys(ecpCounts).length === 1 && ecpCounts['disclaimer/index.html'] === ecpModel && ecpInMain === ecpModel;
/* map embeds: keyless, by name + address */
const iframeIssues = [];
let iframes = 0;
for (const f of htmlFiles) for (const m of fs.readFileSync(path.join(DIST, f), 'utf8').matchAll(/<iframe\b[^>]*\ssrc\s*=\s*"([^"]*)"/gi)) {
  iframes++;
  const src = decode(m[1]);
  if (/google\.[a-z.]+\/maps/.test(src) && (/place_id|[?&]key=/i.test(src) || !/[?&]q=Academy(%20|\+| )Vision/i.test(src) || !/90(%20|\+| )Atlantic/i.test(src))) iframeIssues.push(f + ': ' + src.slice(0, 140));
}
const residueControl = (() => { const before = residueHits.length; scanText('ctl', 'x PatientEngage y'); scanText('ctl', 'Clear Lake'); const fired = residueHits.length === before + 2; residueHits.splice(before); return fired; })();
check('c', 'residue: none of ' + RESIDUE.length + ' strings in ' + textScanned + ' text files, ' + binScanned + ' binaries (metadata) or any file name; EyeCarePro only in the disclaimer legal text (' + ecpModel + 'x, model ' + ecpModel + '); ' + iframes + ' map embeds keyless by name + address (control ' + (residueControl ? 'fired' : 'DID NOT FIRE') + ')',
  residueHits.length === 0 && ecpOk && iframeIssues.length === 0 && residueControl,
  [...residueHits.slice(0, 30), ...(ecpOk ? [] : ['EyeCarePro occurrences: ' + JSON.stringify(ecpCounts) + ' (disclaimer <main> ' + ecpInMain + ', model ' + ecpModel + ')']), ...iframeIssues]);

/* ------------------------------------------------------------------ (d) moved paths */
const redirectsTxt = fs.existsSync(path.join(DIST, '_redirects')) ? fs.readFileSync(path.join(DIST, '_redirects'), 'utf8') : '';
const htaccess = fs.existsSync(path.join(DIST, '.htaccess')) ? fs.readFileSync(path.join(DIST, '.htaccess'), 'utf8') : '';
const redLines = new Set(redirectsTxt.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
const dIssues = [];
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dCheck = (from, to, files, lines, ht) => {
  const out = [];
  if (files.has(from + '/index.html') || files.has(from + '.html') || files.has(from)) out.push('/' + from + '/ is still a page');
  for (const form of ['/' + from, '/' + from + '/']) if (!lines.has(form + ' /' + to + '/ 301')) out.push('_redirects lacks "' + form + ' /' + to + '/ 301"');
  if (!ht.includes('RedirectMatch 301 ^/' + reEsc(from) + '/?$ /' + to + '/')) out.push('.htaccess lacks the rule for /' + from);
  return out;
};
const distSet = new Set(distFiles);
for (const [from, to] of Object.entries(moves)) dIssues.push(...dCheck(from, to, distSet, redLines, htaccess));
const dControl = dCheck('contact-lenses', 'products/contact-lenses', new Set(['contact-lenses/index.html']), new Set(), '').length === 4;
check('d', Object.keys(moves).length + ' moved source paths absent as pages and redirected in _redirects (both forms) and .htaccess (control ' + (dControl ? 'fired' : 'DID NOT FIRE') + ')', dIssues.length === 0 && dControl, dIssues);

/* ------------------------------------------------------------------ (e) nav + footer */
const chromeLinks = [];
const navWalk = (items, where) => { for (const it of items) { if (it.href) chromeLinks.push({ where, label: it.label, href: it.href }); if (it.children) navWalk(it.children, where); } };
navWalk(restructure.nav, 'nav');
for (const c of restructure.footer) for (const l of c.links) chromeLinks.push({ where: 'footer ' + (c.title || c.role), label: l.label, href: l.href });
chromeLinks.push({ where: 'topbar', label: restructure.topbar.label, href: restructure.topbar.href });
for (const b of restructure.headerButtons) chromeLinks.push({ where: 'header button', label: b.label, href: b.href });
for (const c of restructure.ctas) if (c.href) chromeLinks.push({ where: 'cta', label: c.label, href: c.href });
const eIssues = [];
const external = {};
const internalTargets = new Set();
for (const l of chromeLinks) {
  if (/^(https?:|tel:|mailto:)/i.test(l.href)) { external[l.href] = (external[l.href] || 0) + 1; continue; }
  if (!l.href.startsWith('/')) { eIssues.push(l.where + ' "' + l.label + '": unsupported href ' + l.href); continue; }
  internalTargets.add(l.href);
  if (!fs.existsSync(distFileOf(l.href))) eIssues.push(l.where + ' "' + l.label + '": ' + l.href + ' does not resolve to a page in dist');
}
const linksOfPage = (p, html) => new Set([...html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '').matchAll(/<a\b[^>]*\shref\s*=\s*"([^"]*)"/gi)].map((m) => { try { const u = new URL(decode(m[1]), 'https://x.test' + p); return u.origin === 'https://x.test' ? u.pathname : null; } catch { return null; } }).filter(Boolean));
let pagesChecked = 0;
for (const p of pagePaths) {
  const f = distFileOf(p);
  if (!fs.existsSync(f)) { eIssues.push('page missing from dist: ' + p); continue; }
  pagesChecked++;
  const links = linksOfPage(p, fs.readFileSync(f, 'utf8'));
  const lack = [...internalTargets].filter((t) => !links.has(t));
  if (lack.length) eIssues.push(p + ' does not link ' + lack.length + ' nav/footer page(s): ' + lack.slice(0, 6).join(', '));
}
const eControl = !linksOfPage('/a/b/', '<a href="../../c/">x</a>').has('/a/c/') && linksOfPage('/a/b/', '<a href="../../c/">x</a>').has('/c/') && linksOfPage('/a/', '<a href="./">x</a>').has('/a/');
check('e', chromeLinks.length + ' nav/footer/top-bar/button/CTA links: ' + internalTargets.size + ' internal targets resolve; every one of ' + pagesChecked + ' pages links all of them; external: ' + Object.keys(external).length + ' distinct (control ' + (eControl ? 'fired' : 'DID NOT FIRE') + ')', eIssues.length === 0 && eControl && pagesChecked === pagePaths.length, eIssues, { external });

/* ------------------------------------------------------------------ (f) the removed comic */
const comic = masters.find((m) => m.id === 'practice-35053-c2274987');
const comicToken = String(comic.master).split('/').pop();
const comicFiles = [...new Set([comic.file, ...inventory.filter((r) => String(r.src).includes(comicToken)).map((r) => r.localFile)])];
const comicShas = new Set(comicFiles.map((f) => sha256(fs.readFileSync(R(f)))));
const fIssues = [];
const tokens = [comicToken.toLowerCase(), comicToken.split('-')[0].toLowerCase(), '35053', 'practice-35053'];
for (const f of distFiles) {
  if (tokens.some((t) => f.toLowerCase().includes(t))) fIssues.push('file name: ' + f);
  if (TEXT_EXT.test(f)) { const low = fs.readFileSync(path.join(DIST, f), 'utf8').toLowerCase(); for (const t of tokens) if (low.includes(t)) fIssues.push(f + ' mentions ' + t); }
  else if (comicShas.has(sha256(fs.readFileSync(path.join(DIST, f))))) fIssues.push(f + ' is byte-identical to a comic file');
}
let manifestChecked = 0;
if (report && report.imageManifest) for (const [d, m] of Object.entries(report.imageManifest)) { manifestChecked++; if (comicFiles.includes(m.src) || comicShas.has(m.srcSha)) fIssues.push(d + ' was made from ' + m.src); }
else fIssues.push('no build report with an image manifest at ' + path.relative(ROOT, REPORT));
/* visual: dHash of every dist WebP whose aspect is within 3% of the comic's (540x720) */
const webpSize = (buf) => { const fourcc = buf.toString('latin1', 12, 16); if (fourcc === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff]; if (fourcc === 'VP8L') { const b = buf.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; } if (fourcc === 'VP8X') return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1]; return null; };
const TMP = R('tmp/pipeline/verify-dhash');
fs.mkdirSync(TMP, { recursive: true });
let dhashN = 0;
function dHash(file) {
  const out = path.join(TMP, 'h' + (dhashN++) + '.ppm');
  execFileSync('dwebp', [file, '-scale', '9', '8', '-ppm', '-o', out], { stdio: 'ignore', windowsHide: true });
  const b = fs.readFileSync(out);
  fs.rmSync(out);
  let o = 0, fields = [];
  while (fields.length < 4) { while (b[o] === 0x20 || b[o] === 0x0a || b[o] === 0x0d || b[o] === 0x09) o++; if (b[o] === 0x23) { while (b[o] !== 0x0a) o++; continue; } let s = ''; while (b[o] > 0x20) s += String.fromCharCode(b[o++]); fields.push(s); }
  o++;
  const [, w, h] = fields.map(Number);
  const g = (x, y) => { const i = o + (y * w + x) * 3; return 0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2]; };
  let bits = '';
  for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) bits += g(x, y) > g(x + 1, y) ? '1' : '0';
  return bits;
}
const dist = (a, b) => [...a].reduce((n, c, i) => n + (c !== b[i] ? 1 : 0), 0);
const comicHash = dHash(R(comic.file));
const target = 540 / 720;
const candidates = distFiles.filter((f) => /\.webp$/.test(f)).filter((f) => { const s = webpSize(fs.readFileSync(path.join(DIST, f))); return s && Math.abs(s[0] / s[1] - target) / target < 0.03; });
const close = [];
for (const f of candidates) { const d = dist(comicHash, dHash(path.join(DIST, f))); if (d <= 10) close.push(f + ' (dHash distance ' + d + ')'); }
fIssues.push(...close.map((c) => 'looks like the comic: ' + c));
const fControl = dist(comicHash, dHash(R(comicFiles.find((f) => f !== comic.file) || comic.file))) <= 10;
check('f', 'removed comic absent: no mention in names or text, no variant from its ' + comicFiles.length + ' files (' + manifestChecked + ' manifest entries), no dist WebP of its shape within dHash 10 (' + candidates.length + ' candidates; control: its own smaller variant ' + (fControl ? 'flagged' : 'NOT flagged') + ')', fIssues.length === 0 && fControl, fIssues);

/* ------------------------------------------------------------------ (g) AI labels */
const gIssues = [];
let labelled = 0, generatedVariants = 0;
const LABEL = 'trainedAlgorithmicMedia';
if (report && report.imageManifest) {
  for (const [d, m] of Object.entries(report.imageManifest)) {
    const fromGenerated = String(m.src).startsWith('assets/generated/');
    const has = fs.existsSync(path.join(DIST, d)) && fs.readFileSync(path.join(DIST, d)).includes(LABEL);
    if (fromGenerated) { generatedVariants++; if (!has) gIssues.push(d + ' (from ' + m.src + ') lacks the AI label'); }
    if (has) labelled++;
    if (has && !fromGenerated) gIssues.push(d + ' carries the AI label but was made from ' + m.src);
  }
} else gIssues.push('no build report image manifest');
const strays = distFiles.filter((f) => /\.webp$/.test(f) && !(report && report.imageManifest && report.imageManifest[f]) && fs.readFileSync(path.join(DIST, f)).includes(LABEL));
gIssues.push(...strays.map((f) => f + ' carries the AI label but is not in the manifest'));
/* a generated still copied verbatim (e.g. through ctx.asset, outside the manifest) would ship unlabelled: no image file
   in dist may be byte-identical to an image under assets/generated/ (verifier fix V2; the manifest check above cannot
   see files that never went through ctx.img) */
const genStills = listFiles(R('assets/generated')).filter((f) => !f.includes('/') && /\.(webp|png|jpe?g)$/i.test(f));
const genSha = new Map(genStills.map((f) => [sha256(fs.readFileSync(R('assets/generated', f))), f]));
const verbatimOf = (buf) => genSha.get(sha256(buf)) || null;
const verbatim = distFiles.filter((f) => /\.(webp|png|jpe?g)$/i.test(f)).map((f) => [f, verbatimOf(fs.readFileSync(path.join(DIST, f)))]).filter(([, g]) => g);
gIssues.push(...verbatim.map(([f, g]) => f + ' is a verbatim, unlabelled copy of assets/generated/' + g));
const gControl = Buffer.from('xx' + LABEL + 'yy').includes(LABEL) && !Buffer.from('trainedAlgorithmic Media').includes(LABEL)
  && (genStills.length === 0 || (!!verbatimOf(fs.readFileSync(R('assets/generated', genStills[0]))) && !verbatimOf(Buffer.from('not a generated image'))));
check('g', generatedVariants + ' variants made from assets/generated/ all carry the IPTC ' + LABEL + ' XMP; ' + labelled + ' labelled files in all; ' + verbatim.length + ' verbatim copies of the ' + genStills.length + ' generated stills (control ' + (gControl ? 'fired' : 'DID NOT FIRE') + ')', gIssues.length === 0 && gControl, gIssues);

/* ------------------------------------------------------------------ (h) SEO */
const BUSINESS = new Set(['LocalBusiness', 'MedicalBusiness', 'Optician', 'Optometrist', 'MedicalClinic', 'MedicalOrganization', 'MedicalSpecialty :: Optometric']);
const typesOf = (o) => [].concat((o && o['@type']) || []);
function seoIssues(p, html) {
  const out = [];
  const canon = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) || [])[1];
  if (decode(canon || '') !== ORIGIN + p) out.push('canonical ' + canon);
  const ogUrl = (html.match(/<meta\s+property="og:url"\s+content="([^"]*)"/i) || [])[1];
  if (decode(ogUrl || '') !== ORIGIN + p) out.push('og:url ' + ogUrl);
  const ogImg = (html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i) || [])[1];
  if (ogImg) { const u = decode(ogImg); if (!u.startsWith(ORIGIN + '/assets/') || !distSet.has(u.slice(ORIGIN.length + 1))) out.push('og:image not served: ' + u); }
  if (!/<title>[^<]+<\/title>/i.test(html)) out.push('no title');
  if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(html)) out.push('no meta description');
  const blocks = [];
  for (const m of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) { try { blocks.push(JSON.parse(m[1])); } catch (e) { out.push('invalid JSON-LD: ' + e.message); } }
  const flat = blocks.flatMap((b) => (Array.isArray(b['@graph']) ? b['@graph'] : [b]));
  const biz = flat.filter((b) => typesOf(b).some((t) => BUSINESS.has(t)));
  if (biz.length !== 1 || biz[0]['@id'] !== ORIGIN + '/#practice') out.push(biz.length + ' business entities (want exactly the consolidated one): ' + biz.map((b) => typesOf(b).join('+')).join(', '));
  else {
    const b = biz[0];
    if (b.telephone !== '+1-732-978-9306' || !b.address || b.address.streetAddress !== '90 Atlantic City Blvd' || b.name !== 'Academy Vision' || !Array.isArray(b.openingHoursSpecification)) out.push('consolidated block facts differ');
    if (p === '/reviews/' && (!Array.isArray(b.review) || b.review.length !== 20 || !b.aggregateRating || Number(b.aggregateRating.reviewCount) !== 20)) out.push('reviews page lacks its 20 reviews / aggregateRating');
    if (p !== '/reviews/' && (b.review || b.aggregateRating)) out.push('review data outside /reviews/');
  }
  const bc = flat.filter((b) => typesOf(b).includes('BreadcrumbList'));
  if (bc.length !== 1) out.push(bc.length + ' BreadcrumbList blocks');
  else { const items = bc[0].itemListElement || []; if (!items.length || items[items.length - 1].item !== ORIGIN + p || items[0].item !== ORIGIN + '/') out.push('BreadcrumbList does not run from the home to this page'); }
  const ldText = JSON.stringify(blocks);
  for (const m of ldText.matchAll(/https?:\/\/(?:www\.)?academyvisionnj\.com(\/[^"#?]*)/g)) { const pth = m[1] || '/'; if (!/^\/assets\//.test(pth) && !pagePaths.includes(pth.endsWith('/') ? pth : pth + '/')) out.push('JSON-LD URL is not a page: ' + m[0]); }
  return out;
}
const hIssues = [];
for (const p of pagePaths) { const f = distFileOf(p); if (fs.existsSync(f)) for (const i of seoIssues(p, fs.readFileSync(f, 'utf8'))) hIssues.push(p + ': ' + i); }
const hControl = seoIssues('/x/', '<link rel="canonical" href="https://www.academyvisionnj.com/y/"><script type="application/ld+json">{"@type":"Optician"}</script><script type="application/ld+json">{"@type":"LocalBusiness"}</script>').length >= 3;
check('h', 'SEO on ' + pagePaths.length + ' pages: self canonical + og:url at the live origin, og:image served, one consolidated business entity, BreadcrumbList to the page, reviews data on /reviews/ only, JSON-LD URLs are pages (control ' + (hControl ? 'fired' : 'DID NOT FIRE') + ')', hIssues.length === 0 && hControl, hIssues);

/* ------------------------------------------------------------------ (i) sitemap.xml, robots.txt, /sitemap/ */
const iIssues = [];
const smx = fs.existsSync(path.join(DIST, 'sitemap.xml')) ? fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8') : '';
const locs = [...smx.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
const want = pagePaths.map((p) => ORIGIN + p);
if (/lastmod/i.test(smx)) iIssues.push('sitemap.xml has lastmod');
if (locs.length !== new Set(locs).size) iIssues.push('sitemap.xml repeats a URL');
for (const w of want) if (!locs.includes(w)) iIssues.push('sitemap.xml lacks ' + w);
for (const l of locs) if (!want.includes(l)) iIssues.push('sitemap.xml lists a non-page ' + l);
const robots = fs.existsSync(path.join(DIST, 'robots.txt')) ? fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8') : '';
if (!/^User-agent: \*$/m.test(robots) || !/^Allow: \/$/m.test(robots) || /^Disallow:\s*\/\s*$/m.test(robots) || !robots.includes('Sitemap: ' + ORIGIN + '/sitemap.xml')) iIssues.push('robots.txt: ' + JSON.stringify(robots));
const smPage = fs.existsSync(distFileOf('/sitemap/')) ? fs.readFileSync(distFileOf('/sitemap/'), 'utf8') : '';
const smLinks = new Set([...(mainOf(smPage) || '').matchAll(/<a\b[^>]*\shref\s*=\s*"([^"]*)"/gi)].map((m) => new URL(decode(m[1]), 'https://x.test/sitemap/').pathname));
const smLack = pagePaths.filter((p) => !smLinks.has(p));
if (smLack.length) iIssues.push('/sitemap/ <main> does not link ' + smLack.length + ': ' + smLack.join(', '));
check('i', 'sitemap.xml = the ' + pagePaths.length + ' pages (' + locs.length + ' locs, no lastmod); robots.txt allows all + Sitemap line; /sitemap/ links all ' + pagePaths.length + ' pages', iIssues.length === 0 && locs.length === pagePaths.length, iIssues);

/* ------------------------------------------------------------------ output */
let failed = 0;
console.log('build-verify ' + path.relative(ROOT, DIST).split(path.sep).join('/') + ' (' + distFiles.length + ' files, ' + pagePaths.length + ' pages expected)');
for (const r of results) {
  if (!r.ok) failed++;
  console.log((r.ok ? 'PASS ' : 'FAIL ') + '(' + r.id + ') ' + r.name);
  for (const d of r.details.slice(0, r.ok ? 0 : 40)) console.log('       ' + d);
}
if (argv.includes('--json')) fs.writeFileSync(path.resolve(opt('--json')), JSON.stringify({ results: results.map(({ id, name, ok, details, external: ex }) => ({ id, name, ok, details, external: ex })), aRows: aRows.map(({ units, ...r }) => r) }, null, 1));
console.log(failed ? 'VERIFY FAILED: ' + failed + ' check(s)' : 'VERIFY OK: ' + results.length + ' checks green');
process.exitCode = failed ? 1 : 0;
