// sentence-parity.mjs - does every source SENTENCE survive on its rebuilt page, as often as the source prints it?
// Forked from the reference build's tool (R) with the PT-1 fixes of docs/PORT-NOTES.md:
//   - tags are removed BEFORE the text is split into lines (a tag written across several lines, such as the 27
//     multi-line <img> tags on /eyeglasses/designer-frames/, used to leave attribute fragments as "sentences");
//   - <select> is no longer stripped: every <option> is its own text unit;
//   - an OCCURRENCE check per page: a sentence the source content region prints n times must print n times in the
//     rebuilt <main> (a duplicate dropped by a dedupe pass is a loss unless declared);
//   - declarations come from audit/clone-removals.json: `strings` (anywhere), `sentences` (page-scoped),
//     `vendorClauses.removed`, and `replacements` (applied to the source text before matching: the resolved
//     shortcodes).
// Source text = the RAW HTML of each page (audit/raw, never edited), split at block elements, then into
// sentences of >= 5 words. A sentence is FOUND when it appears verbatim (normalised quotes, dashes, whitespace,
// entities) in the rebuilt page's text. A miss is classified:
//   sourceChrome - the source's own chrome: header, nav, footer, the sidebar widget area (div.ecp-secondary) or any
//                  menu / widget / search block; the rebuild renders its chrome from src/content/chrome.json
//   declared     - a declared removal (audit/clone-removals.json)
//   lost         - anything else: a real loss. The run exits 1 when lost > 0 or the occurrence check finds a
//                  shortfall that is not declared.
// Positive controls: (1) a found sentence deleted from one rebuilt page IN MEMORY must be reported lost;
// (2) one copy of a twice-printed sentence deleted in memory must be reported short. Exit 1 if either does not fire.
//   node tools/sentence-parity.mjs [--show 20] [--dir <dir>]   ($RFEC_DIST or --dir overrides dist/; either one skips the audit/ report)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR_OPT = process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : null;
if (process.argv.includes('--dir') && !DIR_OPT) throw new Error('--dir needs a directory');
const DIST = path.resolve(DIR_OPT || process.env.RFEC_DIST || path.join(PROJ, 'dist'));
const WRITE_AUDIT = !process.env.RFEC_DIST && !DIR_OPT;
const content = JSON.parse(fs.readFileSync(path.join(PROJ, 'audit/content-inventory.json'), 'utf8'));
const removals = JSON.parse(fs.readFileSync(path.join(PROJ, 'audit/clone-removals.json'), 'utf8'));
const show = Number(process.argv[process.argv.indexOf('--show') + 1]) || 20;
const NAMED = { raquo: '»', nbsp: ' ', amp: '&', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: '-', mdash: '-', hellip: '…', quot: '"', lt: '<', gt: '>', reg: '®', trade: '™', copy: '©', ouml: 'ö', dagger: '†', Dagger: '‡', le: '≤', sect: '§', para: '¶', deg: '°' };
const decode = (s) => String(s || '')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/gi, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : NAMED[n.toLowerCase()] !== undefined ? NAMED[n.toLowerCase()] : m));
const norm = (s) => decode(s).replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/ /g, ' ').replace(/…/g, '...').replace(/\s+/g, ' ').replace(/\s+([.,;:!?)])/g, '$1').trim().toLowerCase();
const DROP_RAW = /<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi;
const textOf = (h) => String(h || '').replace(DROP_RAW, ' ').replace(/<[^>]+>/g, ' ');
const sentences = (t) => norm(t).split(/(?<=[.!?])\s+(?=[a-z0-9"(])/).map((s) => s.trim()).filter((s) => s.split(' ').length >= 5);
const pathOf = (url) => { const p = new URL(url).pathname.replace(/^\/+|\/+$/g, ''); return p ? '/' + p + '/' : '/'; };
const regionOf = (raw) => (raw.match(/<main\b[\s\S]*?<\/main>/i) || raw.match(/<body\b[\s\S]*?<\/body>/i) || [raw])[0];

function chromeText(raw) {
  const body = (raw.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [])[1] || raw;
  const out = [];
  const openRe = /<(header|nav|footer|aside)\b[^>]*>|<(div|section|ul|form)\b[^>]*class="[^"]*\b(menu|widget|sidebar|ecp-secondary|search|fl-page-header|fl-page-footer)[^"]*"[^>]*>/gi;
  let m;
  while ((m = openRe.exec(body))) {
    const tag = (m[1] || m[2]).toLowerCase();
    const re = new RegExp('<(/?)' + tag + '\\b[^>]*>', 'gi');
    re.lastIndex = m.index + m[0].length;
    let depth = 1, mm, end = body.length;
    while ((mm = re.exec(body))) { depth += mm[1] ? -1 : 1; if (depth === 0) { end = mm.index; break; } }
    out.push(body.slice(m.index, end));
    openRe.lastIndex = end;
  }
  return norm(textOf(out.join(' ')));
}

const BLOCK = /^<\/?(p|li|h[1-6]|td|th|dt|dd|figcaption|blockquote|div|section|article|header|footer|nav|aside|ul|ol|br|tr|table|form|label|option|button|main|address|select|summary|details|legend|fieldset)\b/i;
const replacements = (removals.replacements || []).map((r) => [norm(r.from), norm(r.to)]);
function blocksOf(html) {
  /* PT-1: one pass over every tag (a tag may span lines): block tags become line breaks, inline tags spaces */
  const flat = String(html).replace(/<!--[\s\S]*?-->/g, ' ').replace(DROP_RAW, ' ').replace(/<[^>]+>/g, (t) => (BLOCK.test(t) ? '\n' : ' '));
  return flat.split('\n').map((t) => { let x = norm(t); for (const [a, b] of replacements) x = x.split(a).join(b); return x; }).filter((t) => t.split(' ').length >= 5);
}
const sourceBlocks = (raw) => blocksOf(((raw.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [])[1] || raw));

const globalDeclared = [
  ...(removals.strings || []).map((s) => norm(s.value)),
  ...((removals.vendorClauses && removals.vendorClauses.removed) || []).map(norm),
].filter((d) => d && d.split(' ').length >= 3);
const pageDeclared = new Map();
for (const s of removals.sentences || []) { const k = s.page || '*'; if (!pageDeclared.has(k)) pageDeclared.set(k, []); pageDeclared.get(k).push(norm(s.value)); }
const isDeclared = (s, p) => globalDeclared.some((d) => s.includes(d) || d.includes(s)) || (pageDeclared.get(p) || []).concat(pageDeclared.get('*') || []).some((d) => d.includes(s) || s.includes(d));
const squash = (s) => s.replace(/\s+/g, '');
const count = (hay, needle) => (needle ? hay.split(needle).length - 1 : 0);

function builtFor(page) {
  const slug = new URL(page.url).pathname.replace(/^\/+|\/+$/g, '');
  const file = slug ? path.join(DIST, slug, 'index.html') : path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, 'utf8');
  const main = (html.match(/<main\b[\s\S]*?<\/main>/i) || [''])[0];
  return { all: norm(textOf(html)), main: norm(textOf(main)) };
}

function score(pages, override) {
  let total = 0, found = 0, chromeOnly = 0, declaredMiss = 0;
  const lost = [], chromeList = [], declaredList = [], wsOnly = [], short = [];
  for (const page of pages) {
    const built = override && override.has(page.url) ? override.get(page.url) : builtFor(page);
    if (built === null) { lost.push({ url: page.url, sentence: '(page missing)' }); continue; }
    const p = pathOf(page.url);
    const builtSq = squash(built.all);
    const raw = fs.readFileSync(path.join(PROJ, 'audit/raw', page.savedAs), 'utf8');
    const chrome = chromeText(raw);
    const units = new Set(sourceBlocks(raw).flatMap((b) => sentences(b)));
    for (const s of units) {
      total++;
      if (built.all.includes(s)) { found++; continue; }
      if (builtSq.includes(squash(s))) { found++; wsOnly.push({ url: page.url, sentence: s }); continue; }
      if (chrome.includes(s)) { chromeOnly++; chromeList.push({ url: page.url, sentence: s }); continue; }
      if (isDeclared(s, p)) { declaredMiss++; declaredList.push({ url: page.url, sentence: s }); continue; }
      lost.push({ url: page.url, sentence: s });
    }
    /* occurrence check: content region of the source vs <main> of the rebuild */
    const regionUnits = blocksOf(regionOf(raw)).flatMap((b) => sentences(b));
    const want = new Map();
    for (const s of regionUnits) want.set(s, (want.get(s) || 0) + 1);
    for (const [s, n] of want) {
      if (n < 2 || !built.all.includes(s)) continue;
      const got = count(built.main, s);
      if (got < n && !isDeclared(s, p) && !chrome.includes(s)) short.push({ url: page.url, sentence: s, source: n, rebuilt: got });
    }
  }
  return { totals: { pages: pages.length, sentences: total, found, sourceChromeOnly: chromeOnly, declaredRemovals: declaredMiss, lost: lost.length, occurrenceShortfalls: short.length, foundWhitespaceInsensitiveOnly: wsOnly.length }, lost, chromeList, declaredList, wsOnly, short };
}

const res = score(content.pages);

/* positive control 1: remove one FOUND content sentence from one rebuilt page, in memory */
let control = { fired: false };
for (const page of content.pages) {
  const built = builtFor(page);
  if (!built) continue;
  const raw = fs.readFileSync(path.join(PROJ, 'audit/raw', page.savedAs), 'utf8');
  const chrome = chromeText(raw);
  const s = [...new Set(sourceBlocks(raw).flatMap((b) => sentences(b)))].find((x) => built.all.includes(x) && !chrome.includes(x) && x.length > 60);
  if (!s) continue;
  const mutated = new Map([[page.url, { all: built.all.split(s).join(' '), main: built.main.split(s).join(' ') }]]);
  const r2 = score([page], mutated);
  control = { page: page.url, sentence: s.slice(0, 80), fired: r2.lost.some((l) => l.sentence === s) };
  break;
}
/* positive control 2: delete ONE copy of a sentence the source content prints twice */
let control2 = { fired: false, note: 'no page prints a content sentence twice' };
for (const page of content.pages) {
  const built = builtFor(page);
  if (!built) continue;
  const raw = fs.readFileSync(path.join(PROJ, 'audit/raw', page.savedAs), 'utf8');
  const want = new Map();
  for (const s of blocksOf(regionOf(raw)).flatMap((b) => sentences(b))) want.set(s, (want.get(s) || 0) + 1);
  const twice = [...want].find(([s, n]) => n >= 2 && count(built.main, s) >= n && !isDeclared(s, pathOf(page.url)));
  if (!twice) continue;
  const s = twice[0];
  const i = built.main.indexOf(s);
  const main2 = built.main.slice(0, i) + built.main.slice(i + s.length);
  const r3 = score([page], new Map([[page.url, { all: built.all, main: main2 }]]));
  control2 = { page: page.url, sentence: s.slice(0, 80), fired: r3.short.some((x) => x.sentence === s) };
  break;
}

const out = {
  schema: 'rfec/sentence-parity@1', dist: path.relative(PROJ, DIST).split(path.sep).join('/') || '.',
  method: 'every distinct >=5-word sentence of each source page (raw HTML: tags removed in one pass, block tags as line breaks, then split into sentences) must appear verbatim (normalised quotes/dashes/whitespace/entities) in the rebuilt page text; misses are classified as source chrome, declared removal, or lost. Occurrence check: a sentence printed n times in the source content region must print n times in the rebuilt <main>.',
  totals: res.totals, control, control2, lost: res.lost, occurrenceShortfalls: res.short, whitespaceOnly: res.wsOnly, declared: res.declaredList, sourceChrome: res.chromeList.slice(0, 400), sourceChromeCount: res.chromeList.length,
};
if (WRITE_AUDIT) fs.writeFileSync(path.join(PROJ, 'audit/sentence-parity.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(res.totals));
console.log('control 1 (deleted sentence):', control.fired ? 'fired (' + control.page.replace(/^https?:\/\/[^/]+/, '') + ')' : 'DID NOT FIRE');
console.log('control 2 (deleted copy):', control2.fired ? 'fired (' + control2.page.replace(/^https?:\/\/[^/]+/, '') + ')' : 'DID NOT FIRE' + (control2.note ? ' (' + control2.note + ')' : ''));
for (const l of res.lost.slice(0, show)) console.log(' - lost', l.url.replace(/^https?:\/\/[^/]+/, ''), '|', l.sentence.slice(0, 160));
for (const l of res.short.slice(0, show)) console.log(' - short', l.url.replace(/^https?:\/\/[^/]+/, ''), '|', l.source, '->', l.rebuilt, '|', l.sentence.slice(0, 140));
if (res.lost.length || res.short.length || !control.fired || !control2.fired) process.exit(1);
