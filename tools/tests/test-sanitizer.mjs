#!/usr/bin/env node
// test-sanitizer.mjs - unit test for ctx.rich's sanitiser, sanitizeHtml in src/lib/policy.mjs (BUILD-CONTRACT 4.16.10,
// 4.18.2). P1, 2026-10-12. Node builtins only; no browser, no network.
//   node tools/tests/test-sanitizer.mjs [--old <module>]
// 1. The verifier's 12 payloads (tmp/hverify/make-plants.mjs, copied verbatim below) plus 30 more forms: no on*
//    attribute, srcdoc, script, javascript: URL or non-map iframe survives, and the planted visible text does.
// 2. Clean HTML passes byte for byte: every html string in the real page models and chrome.json.
// 3. Positive control: with --old <module> (a copy of the previous sanitiser), the same payload checks must FAIL, so a
//    green run is not a checker that cannot fire.
// Exit 0 when every check passes (and, with --old, when the control fails as expected); 1 otherwise.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const oldMod = argv.includes('--old') ? path.resolve(argv[argv.indexOf('--old') + 1]) : null;
const { sanitizeHtml, decodeAttrValue } = await import(pathToFileURL(path.join(ROOT, 'src/lib/policy.mjs')).href);

// the verifier's payloads, verbatim (tmp/hverify/make-plants.mjs)
export const PLANTS = [
  ['P1', '<p onclick="window.PLANT_P1=1">PLANTONE baseline onclick</p>', 'PLANTONE baseline onclick'],
  ['P2', '<details open title="x"ontoggle="window.PLANT_P2=1"><summary>PLANTTWO no space before handler</summary></details>', 'PLANTTWO no space before handler'],
  ['P3', '<details open title="x"/ontoggle="window.PLANT_P3=1"><summary>PLANTTHREE slash before handler</summary></details>', 'PLANTTHREE slash before handler'],
  ['P4', '<details open title=">" ontoggle="window.PLANT_P4=1"><summary>PLANTFOUR gt inside quoted attr</summary></details>', 'PLANTFOUR gt inside quoted attr'],
  ['P5', '<a href="java&#115;cript:window.PLANT_P5=1">PLANTFIVE entity in scheme</a>', 'PLANTFIVE entity in scheme'],
  ['P6', '<a href="javascript&colon;window.PLANT_P6=1">PLANTSIX colon entity</a>', 'PLANTSIX colon entity'],
  ['P7', '<iframe src="https://www.google.com/maps/embed?pb=plant7" srcdoc="&lt;script&gt;parent.PLANT_P7=1&lt;/script&gt;"></iframe>', null],
  ['P8', '<SCRIPT>window.PLANT_P8=1</SCRIPT>', null],
  ['P9', '<svg><script>window.PLANT_P9=1</script></svg>', null],
  ['P10', '<iframe src="https://example.com/plant10"></iframe>', null],
  ['P11', '<a href="javascript:window.PLANT_P11=1">PLANTELEVEN plain javascript</a>', 'PLANTELEVEN plain javascript'],
  ['P12', '<details open ontoggle="window.PLANT_P12=1"><summary>PLANTTWELVE baseline ontoggle</summary></details>', 'PLANTTWELVE baseline ontoggle'],
  ['TEXT', '<p>PLANTTEXT kept text</p>', 'PLANTTEXT kept text'],
];
// more forms of the same attacks (X1..): [id, html, text that must survive or null]
const EXTRA = [
  ['X1', '<a href="&#x6A;avascript:window.PLANT_X=1">x1</a>', 'x1'],
  ['X2', '<a href="&#106avascript:window.PLANT_X=1">x2</a>', 'x2'],
  ['X3', '<a href="&#0000106;avascript:window.PLANT_X=1">x3</a>', 'x3'],
  ['X4', '<a href="java&Tab;script:window.PLANT_X=1">x4</a>', 'x4'],
  ['X5', '<a href="jav&#x0A;ascript:window.PLANT_X=1">x5</a>', 'x5'],
  ['X6', '<a href=" javascript:window.PLANT_X=1">x6</a>', 'x6'],
  ['X7', '<a href="JaVaScRiPt:window.PLANT_X=1">x7</a>', 'x7'],
  ['X8', "<a href='javascript:window.PLANT_X=1'>x8</a>", 'x8'],
  ['X9', '<a href=javascript:window.PLANT_X=1>x9</a>', 'x9'],
  ['X10', '<a href="javascript&#58;window.PLANT_X=1">x10</a>', 'x10'],
  ['X11', '<a href="javascript&#x3a;window.PLANT_X=1">x11</a>', 'x11'],
  ['X12', '<form action="javascript:window.PLANT_X=1"><button formaction=javascript:window.PLANT_X=1>x12</button></form>', 'x12'],
  ['X13', '<img src=x onerror=window.PLANT_X=1>', null],
  ['X14', '<a href="/ok/" onmouseover="window.PLANT_X=1">x14</a>', 'x14'],
  ['X15', '<p title="a" onclick="window.PLANT_X=1" title="b">x15</p>', 'x15'],
  ['X16', '<details open title=x ontoggle=window.PLANT_X=1><summary>x16</summary></details>', 'x16'],
  ['X17', '<details open ontoggle  =  "window.PLANT_X=1"><summary>x17</summary></details>', 'x17'],
  ['X18', '<a href="/x/"/onclick="window.PLANT_X=1">x18</a>', 'x18'],
  ['X19', '<iframe src="https://www.google.com/maps/embed?pb=1" onload="window.PLANT_X=1" srcdoc="x" name="n" sandbox="allow-scripts" width="600"></iframe>', null],
  ['X20', '<noscript><p title="</noscript><img src=x onerror=window.PLANT_X=1>"></noscript>', null],
  ['X21', '<style><img src=x onerror=window.PLANT_X=1></style>', null],
  ['X22', '<!--<img src=x onerror=window.PLANT_X=1>-->x22', 'x22'],
  ['X23', '<!--><img src=x onerror=window.PLANT_X=1>-->x23', 'x23'],
  ['X24', '<math><mi xlink:href="javascript:window.PLANT_X=1">x</mi></math>', null],
  ['X25', '<p onclick="window.PLANT_X=1', null],
  ['X26', '<object data="javascript:window.PLANT_X=1"></object><embed src="javascript:window.PLANT_X=1">', null],
  ['X27', '<base href="javascript:/"><meta http-equiv="refresh" content="0;url=javascript:window.PLANT_X=1"><link rel="import" href="x">', null],
  ['X28', '<iframe src="https://www.google.com/maps/embed?pb=1"><script>window.PLANT_X=1</script></iframe>', null],
  ['X29', '<a href="java&amp;#115;cript:window.PLANT_X=1">x29</a>', 'x29'],
  ['X30', '<svg/onload=window.PLANT_X=1>', null],
];
// what must never survive, checked on the output: handlers in any delimiting, srcdoc, script, javascript: in any
// decoded form, non-map iframes
function violations(out) {
  const v = [];
  if (/[\s"'\/]on[a-z]+\s*=/i.test(out)) v.push('on* attribute');
  if (/srcdoc/i.test(out)) v.push('srcdoc');
  if (/<script/i.test(out)) v.push('<script>');
  const dec = decodeAttrValue(decodeAttrValue(out)).replace(/[\s\x00-\x1f]+/g, '');
  if (/(java|vb|live)script:/i.test(dec)) v.push('javascript: URL');
  for (const m of out.matchAll(/<iframe\b[^>]*>/gi)) if (!/^<iframe src="https:\/\/www\.google\.com\/maps\/embed\?/i.test(m[0])) v.push('non-map iframe ' + m[0].slice(0, 80));
  if (/<(svg|math|object|embed|base|meta|link|style|noscript)\b/i.test(out)) v.push('dropped element present');
  return v;
}
function runPayloads(fn, label) {
  const rows = [];
  for (const [id, html, text] of [...PLANTS, ...EXTRA]) {
    const r = fn(html);
    const out = r.html;
    const v = violations(out);
    if (text && !out.includes(text)) v.push('lost text "' + text + '"');
    rows.push({ id, pass: v.length === 0, violations: v, out: out.slice(0, 160), removed: r.removed });
  }
  // all 13 together, as the verifier planted them in one rich block
  const all = fn(PLANTS.map((p) => p[1]).join(''));
  const v = violations(all.html);
  for (const [, , t] of PLANTS) if (t && !all.html.includes(t)) v.push('lost text "' + t + '"');
  if (!all.html.includes('<iframe src="https://www.google.com/maps/embed?pb=plant7"></iframe>')) v.push('map iframe not kept as <iframe src="...pb=plant7"></iframe>');
  rows.push({ id: 'ALL', pass: v.length === 0, violations: v, out: all.html.slice(0, 400), removed: all.removed });
  console.log('== ' + label + ': ' + rows.filter((r) => r.pass).length + '/' + rows.length + ' payload rows pass');
  for (const r of rows) console.log((r.pass ? '  PASS ' : '  FAIL ') + r.id.padEnd(5) + (r.pass ? '' : ' ' + r.violations.join('; ')) + '  -> ' + JSON.stringify(r.out).slice(0, 150));
  return rows;
}

let ok = true;
const rows = runPayloads(sanitizeHtml, 'current sanitizeHtml (src/lib/policy.mjs)');
if (rows.some((r) => !r.pass)) ok = false;

// 2. clean HTML passes byte for byte
const htmlStrings = [];
const collect = (v, key) => {
  if (v == null) return;
  if (typeof v === 'string') { if (['html', 'tipHtml', 'a_html'].includes(key)) htmlStrings.push(v); return; }
  if (Array.isArray(v)) { for (const x of v) collect(x, key); return; }
  if (typeof v === 'object') for (const [k, x] of Object.entries(v)) collect(x, k);
};
const PAGES = path.join(ROOT, 'src/content/pages');
for (const f of fs.readdirSync(PAGES).filter((x) => x.endsWith('.json') && x !== '_index.json').sort()) collect(JSON.parse(fs.readFileSync(path.join(PAGES, f), 'utf8')).sections, 'sections');
collect(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/chrome.json'), 'utf8')), 'chrome');
let changed = 0;
const ex = [];
for (const h of htmlStrings) { const r = sanitizeHtml(h); if (r.html !== h || r.removed.length) { changed++; if (ex.length < 3) ex.push({ in: h.slice(0, 160), out: r.html.slice(0, 160), removed: r.removed }); } }
console.log('== clean model HTML: ' + htmlStrings.length + ' strings, ' + changed + ' changed by the sanitiser');
for (const e of ex) console.log('  changed: ' + JSON.stringify(e));
if (!htmlStrings.length || changed) ok = false;

// 3. positive control: the previous sanitiser must fail the same checks
if (oldMod) {
  const old = await import(pathToFileURL(oldMod).href);
  const orows = runPayloads(old.sanitizeHtml, 'CONTROL: previous sanitiser (' + path.relative(ROOT, oldMod).split(path.sep).join('/') + ')');
  const fired = orows.filter((r) => !r.pass).map((r) => r.id);
  console.log('== control fired on ' + fired.length + ' rows: ' + fired.join(', '));
  if (!fired.length) ok = false;
}
console.log(ok ? 'RESULT PASS' : 'RESULT FAIL');
process.exit(ok ? 0 : 1);
