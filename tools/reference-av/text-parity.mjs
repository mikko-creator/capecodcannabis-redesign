#!/usr/bin/env node
// text-parity.mjs - is the content model complete? Every sentence of each page's visible <main> text must occur in
// that page's model (src/content/pages/<slug>.json), and every sentence of the site chrome (header + footer) must
// occur in src/content/source-chrome.json.
//
// Source text, per page, is the UNION of
//   static   - audit/raw/<slug>.html (never edited), the <main> region, read with this tool's own regex pipeline
//              (deliberately NOT src/lib/extract.mjs's parser, so a parser bug cannot hide its own loss): comments,
//              <script>/<style>/<noscript>/<template>/<svg>/<iframe> removed, block tags -> line breaks, inline tags
//              -> nothing (as a browser joins them), entities decoded;
//   rendered - tmp/extract/rendered/<slug>.main.txt, the innerText of <main> after JavaScript in headless Chrome at
//              1440x900, scrolled to the bottom (written by `node src/lib/extract.mjs --render`).
// Units: each line is split on sentence punctuation (. ! ? followed by space); a unit must contain a letter or digit
// (star emoji, the decorative "»" chevron and lone asterisks are not sentences). Normalisation, applied to both sides:
// entities, curly quotes -> straight, dashes -> "-", every space kind -> one space, zero-width/soft hyphen removed,
// "…" -> "...", "»" removed, case folded (the source uppercases with CSS text-transform, which innerText applies),
// no space before , . ; : ! ? ) or after (. A unit is FOUND when it occurs in the model text on word boundaries; a unit
// found only after deleting all whitespace is reported as "ws-only" and still counts as found.
// Model text = every string under blocks[].nodes (html values tag-stripped the same way), minus keys that hold URLs,
// ids or enums (see NON_TEXT_KEYS). meta/jsonLd are NOT model text: a sentence kept only in JSON-LD is a loss.
//
//   node tools/text-parity.mjs [--show 20]       exit 1 on any miss
//   node tools/text-parity.mjs --control         positive control: one sentence is deleted from one model IN MEMORY;
//                                                exit 0 only when exactly that one miss (and nothing else) is reported
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i === -1 ? d : args[i + 1]; };
const RAW = path.join(ROOT, 'audit', 'raw');
const RENDERED = path.resolve(ROOT, opt('--rendered-dir', 'tmp/extract/rendered'));
const PAGES = path.resolve(ROOT, opt('--pages-dir', 'src/content/pages'));
const CHROME = path.resolve(ROOT, opt('--chrome', 'src/content/source-chrome.json'));
const SHOW = Number(opt('--show', 20));
const CONTROL = args.includes('--control');

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: '-', mdash: '-', hellip: '...', raquo: '', laquo: '', reg: '®', trade: '™', copy: '©', bull: '•', middot: '·', deg: '°', shy: '', eacute: 'é', ntilde: 'ñ' };
const decode = (s) => String(s || '')
  .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z][a-z0-9]*);/gi, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : NAMED[n.toLowerCase()] !== undefined ? NAMED[n.toLowerCase()] : m));
const SPACES = /[\s   -   　]+/g;
const ZERO = /[​-‍⁠﻿­]/g;
export const norm = (s) => decode(s)
  .replace(ZERO, '')
  .replace(/[‘’‚‛′ʼ`]/g, "'").replace(/[“”„‟″]/g, '"')
  .replace(/[‐-―−]/g, '-').replace(/…/g, '...').replace(/»/g, ' ')
  .replace(SPACES, ' ').replace(/\s+([,.;:!?)])/g, '$1').replace(/\(\s+/g, '(').trim().toLowerCase();
const squashAll = (s) => s.replace(/\s+/g, '');
const BLOCK = /^<\/?(p|div|li|ul|ol|h[1-6]|td|th|tr|table|thead|tbody|tfoot|caption|dt|dd|dl|section|article|header|footer|nav|aside|main|form|fieldset|legend|label|option|select|button|blockquote|figure|figcaption|address|br|hr|summary|details)\b/i;
// a tag is "<" + name or "/" or "!" and runs to the first ">" that is not inside a quoted attribute value
// (the source prints <option value="Select >">)
const TAG = /<[!/a-zA-Z](?:"[^"]*"|'[^']*'|[^'">])*>/g;
const htmlToText = (h) => String(h || '')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style|noscript|template|svg|iframe)\b[\s\S]*?<\/\1\s*>/gi, '\n')
  .replace(TAG, (t) => (BLOCK.test(t) ? '\n' : ''));
const unitsOf = (text) => {
  const out = [];
  for (const line of String(text).split(/\n+/)) {
    const n = norm(line);
    if (!n) continue;
    for (const s of n.split(/(?<=[.!?])\s+/)) { const u = s.trim(); if (u && /[\p{L}\p{N}]/u.test(u)) out.push(u); }
  }
  return out;
};
const region = (raw, tag) => { const a = raw.indexOf('<' + tag); const b = raw.indexOf('</' + tag + '>'); return a === -1 || b === -1 ? '' : raw.slice(a, b + tag.length + 3); };

/* model text */
const NON_TEXT_KEYS = new Set(['t', 'id', 'origin', 'col', 'at', 'cpt', 'master', 'file', 'w', 'h', 'href', 'external', 'newTab', 'variant', 'focal',
  'group', 'element', 'level', 'kind', 'show', 'locationId', 'phoneHref', 'mapsUrl', 'placeId', 'mapQuery', 'presentation', 'labelFor', 'legend',
  'required', 'requiredGroup', 'submitName', 'el', 'type', 'rows', 'min', 'max', 'step', 'inputmode', 'autocomplete', 'phoneFormat', 'value', 'chevron',
  'hint', 'transform', 'align', 'highlight', 'conditional', 'origin', 'matchedFrom', 'rating', 'ratingOf', 'date', 'depth', 'empty', 'action', 'logic',
  'enabled', 'operator', 'mode', 'field', 'name_attr', 'scriptEndpoint', 'scriptMethod', 'captcha', 'attribute', 'method', 'novalidate', 'hidden',
  'position', 'mobile', 'background', 'layout', 'identifier', 'unknownType']);
function collectStrings(v, out, key) {
  if (v === null || v === undefined) return;
  if (typeof v === 'string') { if (!NON_TEXT_KEYS.has(key)) out.push(/<[a-z][^>]*>/i.test(v) ? htmlToText(v) : v); return; }
  if (typeof v !== 'object') return;
  if (Array.isArray(v)) { for (const x of v) collectStrings(x, out, key); return; }
  // a form field prints its label followed by the required marker (field.label + ' ' + field.requiredMark)
  if (typeof v.label === 'string' && typeof v.requiredMark === 'string') out.push(v.label + ' ' + v.requiredMark);
  for (const [k, x] of Object.entries(v)) { if (NON_TEXT_KEYS.has(k)) continue; collectStrings(x, out, k); }
}
const modelText = (model) => { const parts = []; for (const b of model.blocks || []) collectStrings(b.nodes, parts, 'nodes'); return parts.map((p) => p.split(/\n+/).map(norm).filter(Boolean).join('\n')).join('\n'); };
const chromeText = (chrome) => { const parts = []; collectStrings(chrome, parts, 'chrome'); return parts.map((p) => p.split(/\n+/).map(norm).filter(Boolean).join('\n')).join('\n'); };

/* word-boundary occurrence: the unit must not start or end in the middle of a word of the model text */
const isWord = (ch) => !!ch && /[\p{L}\p{N}]/u.test(ch);
function occurs(hay, unit) {
  let i = hay.indexOf(unit);
  while (i !== -1) {
    const before = hay[i - 1], after = hay[i + unit.length];
    const okB = !isWord(unit[0]) || !isWord(before);
    const okA = !isWord(unit[unit.length - 1]) || !isWord(after);
    if (okB && okA) return true;
    i = hay.indexOf(unit, i + 1);
  }
  return false;
}
function countOccurrences(hay, unit) {
  let n = 0, i = hay.indexOf(unit);
  while (i !== -1) {
    const before = hay[i - 1], after = hay[i + unit.length];
    if ((!isWord(unit[0]) || !isWord(before)) && (!isWord(unit[unit.length - 1]) || !isWord(after))) { n++; i = hay.indexOf(unit, i + unit.length); }
    else i = hay.indexOf(unit, i + 1);
  }
  return n;
}
function scorePage(units, text, counts) {
  const textSq = squashAll(text);
  const res = { total: units.size, found: 0, wsOnly: [], missing: [], short: [] };
  for (const [u, from] of units) {
    if (occurs(text, u)) {
      res.found++;
      // occurrence check: a sentence (>= 3 words) the static source prints n >= 2 times must occur >= n times in
      // the model text. Two-word UI labels repeated per item ("Show More" on each truncated review) are kept once
      // as ui.* in the model and are exempt.
      const n = counts ? counts.get(u) || 0 : 0;
      if (n >= 2 && u.split(' ').length >= 3) { const m = countOccurrences(text, u); if (m < n) res.short.push({ unit: u, source: n, model: m }); }
      continue;
    }
    if (textSq.includes(squashAll(u))) { res.found++; res.wsOnly.push(u); continue; }
    res.missing.push({ unit: u, from });
  }
  return res;
}
function sourceUnits(slug) {
  const raw = fs.readFileSync(path.join(RAW, slug + '.html'), 'utf8');
  const units = new Map();
  const counts = new Map();
  const add = (u, src) => { const cur = units.get(u); units.set(u, cur && cur !== src ? 'both' : src); };
  for (const u of unitsOf(htmlToText(region(raw, 'main')))) { add(u, 'static'); counts.set(u, (counts.get(u) || 0) + 1); }
  const rf = path.join(RENDERED, slug + '.main.txt');
  let rendered = false;
  if (fs.existsSync(rf)) { rendered = true; for (const u of unitsOf(fs.readFileSync(rf, 'utf8'))) add(u, 'rendered'); }
  return { units, counts, rendered };
}
function chromeUnits(slugs) {
  const units = new Map();
  const add = (u, src) => { const cur = units.get(u); units.set(u, cur && cur !== src ? 'both' : src); };
  for (const slug of slugs) {
    const raw = fs.readFileSync(path.join(RAW, slug + '.html'), 'utf8');
    const body = raw.slice(raw.indexOf('<body'), raw.indexOf('<main'));
    const pre = body.replace(/<header[\s\S]*$/i, '');
    for (const u of unitsOf(htmlToText(pre + region(raw, 'header') + region(raw, 'footer')))) add(u, 'static');
    const rf = path.join(RENDERED, slug + '.chrome.txt');
    if (fs.existsSync(rf)) for (const u of unitsOf(fs.readFileSync(rf, 'utf8').replace(/\u0000/g, '\n'))) add(u, 'rendered');
  }
  return units;
}

const slugs = fs.readdirSync(RAW).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).sort();
const results = [];
let missingRendered = 0;
const models = new Map();
for (const slug of slugs) {
  const mf = path.join(PAGES, slug + '.json');
  if (!fs.existsSync(mf)) { results.push({ slug, total: 0, found: 0, wsOnly: [], missing: [{ unit: '(model file missing)', from: '-' }] }); continue; }
  const model = JSON.parse(fs.readFileSync(mf, 'utf8'));
  models.set(slug, model);
  const { units, counts, rendered } = sourceUnits(slug);
  if (!rendered) missingRendered++;
  const r = scorePage(units, modelText(model), counts);
  r.static = [...units.values()].filter((v) => v !== 'rendered').length;
  r.renderedOnly = [...units.values()].filter((v) => v === 'rendered').length;
  results.push({ slug, ...r });
}
const chrome = fs.existsSync(CHROME) ? JSON.parse(fs.readFileSync(CHROME, 'utf8')) : null;
const cUnits = chromeUnits(slugs);
const cRes = chrome ? scorePage(cUnits, chromeText(chrome)) : { total: cUnits.size, found: 0, wsOnly: [], missing: [{ unit: '(source-chrome.json missing)', from: '-' }], short: [] };

/* delete ONE occurrence of `unit` from the first model string (outside NON_TEXT_KEYS) that contains it; the string is
   replaced by its normalised text without that occurrence (scoring only ever sees normalised text) */
function deleteOnce(model, unit) {
  const clone = JSON.parse(JSON.stringify(model));
  let removed = false;
  const walk = (v) => {
    if (removed || v === null || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (removed) return;
      if (NON_TEXT_KEYS.has(k)) continue;
      if (typeof x === 'string') {
        const plain = /<[a-z][^>]*>/i.test(x) ? htmlToText(x) : x;
        const lines = plain.split(/\n+/).map(norm);
        const li = lines.findIndex((l) => countOccurrences(l, unit) > 0);
        if (li === -1) continue;
        lines[li] = lines[li].replace(unit, ' ');
        v[k] = lines.join('\n');
        removed = true;
      } else walk(x);
    }
  };
  walk(clone.blocks);
  return removed ? clone : null;
}

if (!CONTROL) {
  let T = 0, F = 0, W = 0, M = 0, S = 0;
  for (const r of results) {
    T += r.total; F += r.found; W += r.wsOnly.length; M += r.missing.length; S += (r.short || []).length;
    const bad = r.missing.length || (r.short || []).length;
    console.log((bad ? 'MISS ' : 'ok   ') + r.slug.padEnd(56) + String(r.found).padStart(5) + '/' + String(r.total).padEnd(5) + (r.wsOnly.length ? ' ws-only ' + r.wsOnly.length : '') + (r.renderedOnly ? ' rendered-only units ' + r.renderedOnly : '') + ((r.short || []).length ? ' shortfalls ' + r.short.length : ''));
    for (const m of r.missing.slice(0, SHOW)) console.log('       - [' + m.from + '] ' + m.unit.slice(0, 180));
    for (const s of (r.short || []).slice(0, SHOW)) console.log('       - short ' + s.source + '->' + s.model + ' ' + s.unit.slice(0, 160));
  }
  console.log((cRes.missing.length ? 'MISS ' : 'ok   ') + '(chrome: header + footer, all pages)'.padEnd(56) + String(cRes.found).padStart(5) + '/' + String(cRes.total).padEnd(5) + (cRes.wsOnly.length ? ' ws-only ' + cRes.wsOnly.length : ''));
  for (const m of cRes.missing.slice(0, SHOW)) console.log('       - [' + m.from + '] ' + m.unit.slice(0, 180));
  for (const w of cRes.wsOnly.slice(0, SHOW)) console.log('       ~ ws-only (found once whitespace is ignored): ' + w.slice(0, 180));
  console.log('pages ' + results.length + ' | main units found ' + F + '/' + T + ' | ws-only ' + W + ' | missing ' + M + ' | occurrence shortfalls ' + S + ' | chrome ' + cRes.found + '/' + cRes.total + ' | pages without a rendered snapshot ' + missingRendered);
  process.exitCode = M || S || cRes.missing.length || missingRendered ? 1 : 0;
} else {
  /* positive controls, both IN MEMORY:
     (1) deletion: the first page (sorted) with a unit of >= 8 words that the source prints once and the model holds
         once; that sentence is deleted from the model; exactly that one miss (and no shortfall) must be reported.
     (2) occurrence: the first page with a unit the source prints >= 2 times and the model holds exactly as often;
         one copy is deleted; exactly that one shortfall (and no miss) must be reported. */
  let c1 = null, c2 = null;
  // a control is judged against the page's own real result: only what the deletion ADDS counts
  const newOnes = (after, before) => after.filter((a) => !(before || []).some((b) => b.unit === a.unit));
  for (const r of results) {
    if (c1) break;
    const model = models.get(r.slug);
    if (!model) continue;
    const text = modelText(model);
    const { units, counts } = sourceUnits(r.slug);
    const pick = [...units.keys()].find((u) => u.split(' ').length >= 8 && (counts.get(u) || 0) <= 1 && countOccurrences(text, u) === 1);
    if (!pick) continue;
    const clone = deleteOnce(model, pick);
    if (!clone) continue;
    const res = scorePage(units, modelText(clone), counts);
    const nm = newOnes(res.missing, r.missing), ns = newOnes(res.short, r.short);
    c1 = { slug: r.slug, pick, res, exact: nm.length === 1 && nm[0].unit === pick && ns.length === 0 };
  }
  for (const r of results) {
    if (c2) break;
    const model = models.get(r.slug);
    if (!model) continue;
    const text = modelText(model);
    const { units, counts } = sourceUnits(r.slug);
    const pick = [...units.keys()].find((u) => u.split(' ').length >= 4 && (counts.get(u) || 0) >= 2 && countOccurrences(text, u) === counts.get(u));
    if (!pick) continue;
    const clone = deleteOnce(model, pick);
    if (!clone) continue;
    const res = scorePage(units, modelText(clone), counts);
    const nm = newOnes(res.missing, r.missing), ns = newOnes(res.short, r.short);
    c2 = { slug: r.slug, pick, n: counts.get(pick), res, exact: nm.length === 0 && ns.length === 1 && ns[0].unit === pick };
  }
  const report = (label, c) => {
    if (!c) { console.log(label + ': no eligible sentence found - DID NOT RUN'); return false; }
    console.log(label + ': deleted one copy from ' + c.slug + ' (in memory): "' + c.pick + '"' + (c.n ? ' (source prints it ' + c.n + 'x)' : ''));
    console.log('MISS ' + c.slug.padEnd(56) + String(c.res.found).padStart(5) + '/' + String(c.res.total) + (c.res.short.length ? ' shortfalls ' + c.res.short.length : ''));
    for (const m of c.res.missing) console.log('       - [' + m.from + '] ' + m.unit.slice(0, 180));
    for (const s of c.res.short) console.log('       - short ' + s.source + '->' + s.model + ' ' + s.unit.slice(0, 160));
    console.log(label + ': ' + (c.exact ? 'fired - exactly the deleted sentence is reported, nothing else' : 'DID NOT FIRE as expected'));
    return c.exact;
  };
  const ok1 = report('control 1 (deleted sentence)', c1);
  const ok2 = report('control 2 (deleted duplicate copy)', c2);
  process.exitCode = ok1 && ok2 ? 0 : 1;
}
