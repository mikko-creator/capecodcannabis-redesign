#!/usr/bin/env node
// style-diff.mjs - prove a stylesheet refactor (tools/tokenize-css.mjs) changed nothing that paints colour.
//   node tools/style-diff.mjs --a <dist-before> --b <dist-after> --pages /,/categories/flower/,... [--sizes 1280x585,390x844]
//        [--json <report.json>] [--no-control] [--b-css <bundle.css>]
// Both builds are served from 127.0.0.1 and loaded in ONE guarded headless Chrome (tools/cdp.mjs: no host other than
// localhost resolves). Consent is pre-set and transitions/animations are switched off on both sides. Each page is
// compared element by element (and ::before, ::after, ::placeholder) on every colour-bearing computed property.
// Any difference exits 1.
// Positive control (default on): the first page is loaded once more on side B with a planted colour change; the
// diff must fire, or the run exits 1 without a verdict.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { launch, sleep } from './cdp.mjs';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (!k.startsWith('--')) continue;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) args[k.slice(2)] = true; else { args[k.slice(2)] = v; i++; }
}
if (!args.a || !args.b || !args.pages) { console.error('need --a <dist> --b <dist> --pages /,/x/'); process.exit(2); }
const PAGES = String(args.pages).split(',').map((s) => s.trim()).filter(Boolean);
const SIZES = String(args.sizes || '1280x585,390x844').split(',').map((s) => { const [w, h] = s.split('x').map(Number); return { w, h }; });
const PROPS = ['color', 'background-color', 'background-image', 'border-top-color', 'border-right-color', 'border-bottom-color',
  'border-left-color', 'outline-color', 'box-shadow', 'text-shadow', 'text-decoration-color', 'fill', 'stroke', 'caret-color',
  'column-rule-color', '-webkit-text-fill-color', '-webkit-text-stroke-color', 'accent-color', 'filter', 'backdrop-filter',
  'mask-image', '-webkit-mask-image', 'stop-color', 'flood-color', 'lighting-color', 'border-image-source', 'scrollbar-color'];

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };
// --b-css <file>: side B answers every /assets/site.<hash>.css request with this file (a refactored bundle tried against
// the same build without rebuilding it).
function serve(root, cssOverride) {
  root = path.resolve(root);
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (cssOverride && /^\/assets\/site\.[0-9a-f]+\.css$/.test(p)) { res.writeHead(200, { 'content-type': TYPES['.css'] }); return res.end(fs.readFileSync(cssOverride)); }
    let f = path.join(root, p);
    if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { f = path.join(root, '404.html'); res.writeHead(404, { 'content-type': TYPES['.html'] }); return res.end(fs.existsSync(f) ? fs.readFileSync(f) : ''); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, base: 'http://127.0.0.1:' + srv.address().port })));
}

const INIT = `try{localStorage.setItem('ccc-age-21','1')}catch(e){}
document.addEventListener('DOMContentLoaded',function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';document.head.appendChild(s);});`;
const PLANT = `document.addEventListener('DOMContentLoaded',function(){var s=document.createElement('style');s.textContent='body{color:rgb(1,2,3)!important}';document.head.appendChild(s);});`;
const COLLECT = `(function(){var P=${JSON.stringify(PROPS)};var out=[];var els=document.querySelectorAll('*');
for(var i=0;i<els.length;i++){var el=els[i];var pse=['',"::before","::after"];if(el.matches('input,textarea'))pse.push('::placeholder');
for(var j=0;j<pse.length;j++){var cs=getComputedStyle(el,pse[j]||null);if(pse[j]&&pse[j]!=='::placeholder'&&cs.content==='none')continue;
var v=[];for(var k=0;k<P.length;k++)v.push(cs.getPropertyValue(P[k]));out.push([i,el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\\s+/).slice(0,3).join('.'):''),pse[j],v]);}}
return JSON.stringify({n:els.length,rows:out,title:document.title});})()`;

async function grab(b, base, pagePath, size, extra) {
  const pg = await b.newPage({ width: size.w, height: size.h, mobile: size.w < 700 });
  await pg.send('Page.enable');
  await pg.send('Page.addScriptToEvaluateOnNewDocument', { source: INIT + (extra || '') });
  await pg.goto(base + pagePath, { settle: 700 });
  const r = JSON.parse(await pg.eval(COLLECT));
  try { await b.send('Target.closeTarget', { targetId: pg.targetId }); } catch {}
  return r;
}
function compare(A, B) {
  const diffs = [];
  if (A.n !== B.n) diffs.push({ what: 'element count', a: A.n, b: B.n });
  const mb = new Map(B.rows.map((r) => [r[0] + '|' + r[2], r]));
  for (const ra of A.rows) {
    const rb = mb.get(ra[0] + '|' + ra[2]);
    if (!rb) { diffs.push({ el: ra[1] + ra[2], what: 'missing on B' }); continue; }
    for (let k = 0; k < PROPS.length; k++) if (ra[3][k] !== rb[3][k]) diffs.push({ el: ra[1] + ra[2], prop: PROPS[k], a: ra[3][k], b: rb[3][k] });
  }
  if (B.rows.length !== A.rows.length) diffs.push({ what: 'row count', a: A.rows.length, b: B.rows.length });
  return diffs;
}

const [sa, sb] = await Promise.all([serve(args.a), serve(args.b, args['b-css'] ? path.resolve(args['b-css']) : null)]);
const b = await launch();
const report = { a: args.a, b: args.b, pages: PAGES, sizes: SIZES, compared: 0, rows: 0, diffs: [], control: null };
let failed = false;
try {
  if (!args['no-control']) {
    const A = await grab(b, sa.base, PAGES[0], SIZES[0]);
    const B = await grab(b, sb.base, PAGES[0], SIZES[0], PLANT);
    const d = compare(A, B);
    report.control = { page: PAGES[0], fired: d.length > 0, diffs: d.length };
    console.log('control: ' + (d.length ? 'fired (' + d.length + ' planted difference(s) found)' : 'DID NOT FIRE'));
    if (!d.length) failed = true;
  }
  for (const size of SIZES) for (const p of PAGES) {
    const A = await grab(b, sa.base, p, size);
    const B = await grab(b, sb.base, p, size);
    const d = compare(A, B);
    report.compared++; report.rows += A.rows.length;
    for (const x of d.slice(0, 20)) report.diffs.push({ page: p, size: size.w + 'x' + size.h, ...x });
    console.log((d.length ? 'DIFF ' : 'same ') + size.w + 'x' + size.h + ' ' + p + ' (' + A.rows.length + ' element/pseudo rows' + (d.length ? ', ' + d.length + ' difference(s)' : '') + ')');
    if (d.length) failed = true;
  }
} finally {
  await b.close(); sa.srv.close(); sb.srv.close();
}
if (args.json) { fs.mkdirSync(path.dirname(path.resolve(args.json)), { recursive: true }); fs.writeFileSync(args.json, JSON.stringify(report, null, 1)); }
for (const d of report.diffs.slice(0, 15)) console.log('  ' + JSON.stringify(d).slice(0, 300));
console.log((failed ? 'STYLE-DIFF FAIL' : 'STYLE-DIFF PASS') + ': ' + report.compared + ' page loads per side, ' + report.rows + ' rows compared');
process.exit(failed ? 1 : 0);
