#!/usr/bin/env node
// tokenize-css.mjs - site-reforge gate C13: move every colour literal in the authored stylesheets into the token layer.
//   node tools/tokenize-css.mjs [--styles src/styles] [--apply] [--json <report.json>]
//
// The gate reads src/styles/*.css except tokens.css as the authored sheets. It FAILs while they carry more colour
// literals (#hex, rgb/rgba, hsl/hsla) than they reference tokens. This tool turns each distinct colour literal found in
// a DECLARATION VALUE into one custom property in a generated :root block at the end of tokens.css, and every
// occurrence into var(--that-token).
//
// Rendering is unchanged by construction:
//   - each token's value is the literal itself, copied exactly;
//   - every generated name is in the --c- namespace, which nothing else may declare. The run refuses (exit 2) when
//     any stylesheet, script or theme module declares or sets a --c- property outside the generated block, because a
//     scoped redeclaration would change what var() resolves to.
// tools/style-diff.mjs proves the neutrality on built pages.
//
// Never touched: literals inside comments, strings, url(...), selectors and at-rule preludes. Anything the gate's own
// regex still counts afterwards is reported as residual.
// Names come from the role tokens in tokens.css when the RGB matches one exactly (--c-harbour-a25 is --harbour,
// #015375, at alpha .25); otherwise from the hex (--c-01283a-a60).
// Without --apply nothing is written. Idempotent: a re-run keeps existing names and merges new literals into the block.
// Exit 0 when the predicted C13 result is PASS (literals <= referenced tokens), 1 when it is not, 2 on a refusal.
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (!k.startsWith('--')) continue;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) args[k.slice(2)] = true; else { args[k.slice(2)] = v; i++; }
}
const STYLES = path.resolve(args.styles || 'src/styles');
const TOKENS = path.join(STYLES, 'tokens.css');
const APPLY = !!args.apply;
const START = '/* C13-PALETTE-START';
const END = '/* C13-PALETTE-END */';
const GATE_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g; // sr-gate.mjs C13, verbatim

function die(code, msg) { console.error('tokenize-css: ' + msg); process.exit(code); }
if (!fs.existsSync(TOKENS)) die(2, 'no tokens.css in ' + STYLES);

// ---- masking: comments, strings and url(...) become spaces (same length), so positions stay comparable ----------
function mask(text) {
  const out = text.split('');
  const blank = (a, b) => { for (let i = a; i < b; i++) if (out[i] !== '\n') out[i] = ' '; };
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') {
      const e = text.indexOf('*/', i + 2); const end = e < 0 ? text.length : e + 2; blank(i, end); i = end; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== c) { if (text[j] === '\\') j++; j++; }
      blank(i, Math.min(text.length, j + 1)); i = j + 1; continue;
    }
    if ((c === 'u' || c === 'U') && /^url\(/i.test(text.slice(i, i + 4)) && !/[\w-]/.test(text[i - 1] || '')) {
      let j = i + 4, q = null;
      while (j < text.length) {
        const d = text[j];
        if (q) { if (d === '\\') j++; else if (d === q) q = null; } else if (d === '"' || d === "'") q = d; else if (d === ')') break;
        j++;
      }
      blank(i + 4, j); i = j + 1; continue;
    }
    i++;
  }
  return out.join('');
}

// ---- colour parsing and naming -----------------------------------------------------------------------------------
function parseColour(lit) {
  const s = lit.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (k) => parseInt(h.slice(k, k + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? Math.round((n(6) / 255) * 1000) / 1000 : 1 };
  }
  m = s.match(/^rgba?\(([^)]*)\)$/);
  if (m && !/var\(/.test(m[1])) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    if (p.length < 3) return null;
    const ch = (v) => (/%$/.test(v) ? Math.round(parseFloat(v) * 2.55) : Math.round(parseFloat(v)));
    const al = p.length > 3 ? (/%$/.test(p[3]) ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
    const o = { r: ch(p[0]), g: ch(p[1]), b: ch(p[2]), a: al };
    return [o.r, o.g, o.b, o.a].every((x) => Number.isFinite(x)) ? o : null;
  }
  return null; // hsl()/hsla() or var() inside: named by their text (rare; none at the time of writing)
}
const hex2 = (n) => n.toString(16).padStart(2, '0');
const keyOf = (lit) => {
  const c = parseColour(lit);
  return c ? `${c.r},${c.g},${c.b},${+c.a.toFixed(4)}` : 'raw:' + lit.replace(/\s+/g, '').toLowerCase();
};

// role tokens: --name: #hex in tokens.css (outside the generated block)
const tokensText = fs.readFileSync(TOKENS, 'utf8');
const sIdx = tokensText.indexOf(START);
const eIdx = sIdx < 0 ? -1 : tokensText.indexOf(END, sIdx);
if (sIdx >= 0 && eIdx < 0) die(2, 'tokens.css has a C13-PALETTE-START marker without its END marker');
const tokensOutside = sIdx < 0 ? tokensText : tokensText.slice(0, sIdx) + tokensText.slice(eIdx + END.length);
const blockText = sIdx < 0 ? '' : tokensText.slice(sIdx, eIdx + END.length);
const FAMILY = new Map([['255,255,255', 'white'], ['0,0,0', 'black']]);
for (const m of tokensOutside.matchAll(/--([a-zA-Z][\w-]*)\s*:\s*(#[0-9a-fA-F]{3,8})\s*[;}]/g)) {
  const c = parseColour(m[2]);
  if (c && c.a === 1 && !FAMILY.has(`${c.r},${c.g},${c.b}`)) FAMILY.set(`${c.r},${c.g},${c.b}`, m[1].toLowerCase());
}
function nameFor(lit) {
  const c = parseColour(lit);
  if (!c) {
    let h = 0; for (const ch of lit) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return '--c-x' + h.toString(16).padStart(8, '0').slice(0, 8);
  }
  const fam = FAMILY.get(`${c.r},${c.g},${c.b}`) || hex2(c.r) + hex2(c.g) + hex2(c.b);
  if (c.a >= 1) return '--c-' + fam;
  const pc = c.a * 100;
  const suf = Math.abs(pc - Math.round(pc)) < 1e-9 ? String(Math.round(pc)).padStart(2, '0') : String(Math.round(c.a * 1000)).padStart(3, '0');
  return '--c-' + fam + '-a' + suf;
}

// ---- the existing generated block (idempotent re-runs keep names) ------------------------------------------------
const byKey = new Map(); // value key -> { name, value }
const nameTaken = new Map(); // name -> key
for (const m of blockText.matchAll(/(--c-[\w-]+)\s*:\s*([^;]+);/g)) {
  const k = keyOf(m[2]);
  byKey.set(k, { name: m[1], value: m[2].trim() });
  nameTaken.set(m[1], k);
}

// ---- refuse a --c- declaration anywhere else ---------------------------------------------------------------------
const sheets = fs.readdirSync(STYLES).filter((f) => /\.css$/i.test(f) && f !== 'tokens.css').sort();
const refusals = [];
for (const f of sheets) {
  const t = mask(fs.readFileSync(path.join(STYLES, f), 'utf8'));
  for (const m of t.matchAll(/--c-[\w-]+\s*:/g)) refusals.push(f + ': declares ' + m[0].replace(/\s*:$/, ''));
}
for (const m of mask(tokensOutside).matchAll(/--c-[\w-]+\s*:/g)) refusals.push('tokens.css (outside the block): declares ' + m[0].replace(/\s*:$/, ''));
const ROOT = path.resolve(STYLES, '..', '..');
for (const dir of ['src/scripts', 'src/theme']) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    if (!/\.(m?js)$/.test(f)) continue;
    const t = fs.readFileSync(path.join(d, f), 'utf8');
    for (const m of t.matchAll(/--c-[\w-]+\s*:|setProperty\(\s*['"]--c-/g)) refusals.push(dir + '/' + f + ': sets ' + m[0]);
  }
}
if (refusals.length) die(2, 'the --c- namespace is in use outside the generated block:\n  ' + refusals.join('\n  '));

// ---- rewrite the sheets ----------------------------------------------------------------------------------------
const report = { styles: path.relative(process.cwd(), STYLES) || '.', apply: APPLY, files: {}, residual: [], created: [], reused: [] };
const newSheets = {};
for (const f of sheets) {
  const file = path.join(STYLES, f);
  const text = fs.readFileSync(file, 'utf8');
  const masked = mask(text);
  const hits = [];
  for (const m of text.matchAll(GATE_RE)) {
    const pos = m.index, lit = m[0];
    const where = (() => {
      if (masked.slice(pos, pos + lit.length) !== lit) return 'comment/string/url';
      let prev = -1;
      for (let j = pos - 1; j >= 0; j--) if (masked[j] === '{' || masked[j] === '}' || masked[j] === ';') { prev = j; break; }
      let next = masked.length;
      for (let j = pos + lit.length; j < masked.length; j++) if (masked[j] === '{' || masked[j] === '}' || masked[j] === ';') { next = j; break; }
      if (masked[next] === '{') return 'selector/prelude';
      if (!masked.slice(prev + 1, pos).includes(':')) return 'not a declaration value';
      return null;
    })();
    if (where) { hits.push({ pos, lit, skip: where }); continue; }
    hits.push({ pos, lit });
  }
  let out = text;
  let replaced = 0;
  for (const h of hits.slice().reverse()) {
    if (h.skip) continue;
    const k = keyOf(h.lit);
    let e = byKey.get(k);
    if (!e) {
      let name = nameFor(h.lit);
      if (nameTaken.has(name) && nameTaken.get(name) !== k) { let n = 2; while (nameTaken.has(name + '-' + n)) n++; name = name + '-' + n; }
      e = { name, value: h.lit.trim() };
      byKey.set(k, e); nameTaken.set(name, k); report.created.push({ name, value: e.value });
    }
    out = out.slice(0, h.pos) + 'var(' + e.name + ')' + out.slice(h.pos + h.lit.length);
    replaced++;
  }
  // what the gate would still count in this sheet
  const gateLeft = (out.replace(/\/\*[\s\S]*?\*\//g, ' ').match(GATE_RE) || []);
  for (const h of hits) if (h.skip && h.skip !== 'comment/string/url') report.residual.push({ file: f, literal: h.lit, why: h.skip });
  for (const h of hits) if (h.skip === 'comment/string/url') {
    // only count the ones outside comments: the gate strips comments first
    const before = text.slice(0, h.pos);
    const inComment = before.lastIndexOf('/*') > before.lastIndexOf('*/');
    if (!inComment) report.residual.push({ file: f, literal: h.lit, why: 'inside a string or url(...)' });
  }
  report.files[f] = { literalsBefore: hits.length, replaced, gateCountAfter: gateLeft.length };
  newSheets[f] = out;
}

// ---- the generated block ---------------------------------------------------------------------------------------
const entries = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
const block = START + ' (generated by tools/tokenize-css.mjs for site-reforge gate C13). Every colour the authored\n'
  + '   stylesheets use, declared once. Edit a value here and every use follows; for new work prefer the role tokens above\n'
  + '   (--ocean, --harbour, --sky, ...). Names: --c-<role or hex>[-a<alpha x100>]. Nothing else may declare a --c- name. */\n'
  + ':root {\n' + entries.map((e) => '  ' + e.name + ': ' + e.value + ';').join('\n') + '\n}\n' + END;
const newTokens = sIdx < 0
  ? tokensText.replace(/\s*$/, '') + '\n\n' + block + '\n'
  : tokensText.slice(0, sIdx) + block + tokensText.slice(eIdx + END.length);

// ---- predicted C13 (the gate's arithmetic on the rewritten files) ------------------------------------------------
const declared = [...new Set((newTokens.match(/--[a-zA-Z][\w-]*\s*:/g) || []).map((d) => d.replace(/\s*:$/, '')))];
const body = sheets.map((f) => newSheets[f]).join('\n');
const referenced = declared.filter((d) => body.includes('var(' + d));
const literals = (body.replace(/\/\*[\s\S]*?\*\//g, ' ').match(GATE_RE) || []).length;
report.c13 = { declared: declared.length, referenced: referenced.length, literals, pass: !(referenced.length ? literals > referenced.length : literals > 0) };
report.tokens = entries.length;
report.replaced = Object.values(report.files).reduce((s, x) => s + x.replaced, 0);

if (APPLY) {
  for (const f of sheets) if (newSheets[f] !== fs.readFileSync(path.join(STYLES, f), 'utf8')) fs.writeFileSync(path.join(STYLES, f), newSheets[f]);
  if (newTokens !== tokensText) fs.writeFileSync(TOKENS, newTokens);
}
if (args.json) { fs.mkdirSync(path.dirname(path.resolve(args.json)), { recursive: true }); fs.writeFileSync(args.json, JSON.stringify(report, null, 1)); }
console.log((APPLY ? 'APPLIED' : 'DRY RUN') + ': ' + report.replaced + ' literal(s) -> var(), ' + entries.length + ' palette token(s) ('
  + report.created.length + ' new), residual ' + report.residual.length);
for (const [f, x] of Object.entries(report.files)) console.log('  ' + f.padEnd(14) + ' literals ' + String(x.literalsBefore).padStart(4) + ', replaced ' + String(x.replaced).padStart(4) + ', gate count after ' + x.gateCountAfter);
for (const r of report.residual) console.log('  residual: ' + r.file + ' ' + r.literal + ' (' + r.why + ')');
console.log('C13 predicted: ' + report.c13.literals + ' literal(s) vs ' + report.c13.referenced + ' referenced token(s) of ' + report.c13.declared + ' declared -> ' + (report.c13.pass ? 'PASS' : 'FAIL'));
process.exit(report.c13.pass ? 0 : 1);
