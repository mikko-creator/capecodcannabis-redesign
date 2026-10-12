// test-fetch-masters.mjs: fixture tests for tools/fetch-masters.mjs (local servers only; no real host is contacted).
//   node tools/tests/test-fetch-masters.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { encodePNG } from '../sr-local/lib/png.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.resolve(HERE, '..', 'fetch-masters.mjs');

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name, extra); }
};

const png = (w, h, v) => encodePNG({ width: w, height: h, data: Buffer.alloc(w * h * 4, v) });
let pngA = png(3, 2, 200);
const pngB = png(5, 4, 90);

// Server A: the fixture image host. Server B: the redirect target; it only counts hits.
const hits = {};
const queries = {};
let throttleOnce = 0;
const A = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  hits[u.pathname] = (hits[u.pathname] || 0) + 1;
  queries[u.pathname] = u.search;
  const send = (code, headers, body) => { res.writeHead(code, headers); res.end(body); };
  switch (u.pathname) {
    case '/ok.png': case '/ok2.png': case '/cdn/x.png': case '/noext/2ab3c53b1660': return send(200, { 'content-type': 'image/png' }, pngA);
    case '/redir.png': return send(302, { location: `http://127.0.0.1:${portB}/landing.png` }, '');
    case '/forbidden.png': return send(403, {}, 'no');
    case '/notimage.png': return send(200, { 'content-type': 'text/html' }, '<html><body>blocked</body></html>');
    case '/throttle-once.png':
      if (throttleOnce++ === 0) return send(429, { 'retry-after': '1' }, 'slow down');
      return send(200, { 'content-type': 'image/png' }, pngB);
    case '/always429.png': return send(429, { 'retry-after': '1' }, 'slow down');
    default: return send(404, {}, 'nf');
  }
});
let hitsB = 0;
const B = http.createServer((req, res) => { hitsB++; res.writeHead(200, { 'content-type': 'image/png' }); res.end(pngB); });
await new Promise((r) => A.listen(0, '127.0.0.1', r));
await new Promise((r) => B.listen(0, '127.0.0.1', r));
const portA = A.address().port;
const portB = B.address().port;
const a = (p) => `http://127.0.0.1:${portA}${p}`;

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-test-'));
const ledgerFile = path.join(work, 'blocked.json');
fs.writeFileSync(ledgerFile, JSON.stringify({ hosts: { 'blocked.invalid': { reason: 'test' } } }));
fs.mkdirSync(path.join(work, 'audit'), { recursive: true });
fs.writeFileSync(path.join(work, 'audit', 'image-inventory.json'), JSON.stringify({
  images: [{ src: a('/cdn/x.png?lossy=2&strip=0&webp=1'), localFile: 'assets/source/abc12345-x.png' }],
}));

const exec = (argv, opts) => new Promise((resolve) => {
  const c = spawn(process.execPath, argv, opts);
  let stdout = '', stderr = '';
  c.stdout.on('data', (d) => { stdout += d; });
  c.stderr.on('data', (d) => { stderr += d; });
  const timer = setTimeout(() => c.kill(), 60000);
  c.on('close', (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
});
const run = async (lines, extra = []) => {
  const list = path.join(work, 'list.txt');
  fs.writeFileSync(list, lines.join('\n') + '\n');
  const r = await exec([TOOL, '--list', list, '--out', 'out', '--ledger', 'audit/masters.json',
    '--hosts', '127.0.0.1', '--gap-ms', '0', '--retry-cap-ms', '1500', ...extra],
  { cwd: work, env: { ...process.env, SR_BLOCK_LEDGER: ledgerFile } });
  const ledPath = path.join(work, 'audit', 'masters.json');
  if (!fs.existsSync(ledPath)) { console.log('NO LEDGER; tool output:\n' + r.stdout + r.stderr + ''); process.exit(1); }
  const led = JSON.parse(fs.readFileSync(ledPath, 'utf8'));
  return { code: r.status, out: r.stdout + r.stderr, led: led.entries };
};

// Run 1: the per-URL behaviours.
{
  const { code, led, out } = await run([
    a('/ok.png'),
    a('/redir.png'),
    a('/throttle-once.png'),
    a('/notimage.png'),
    'https://capecodcannabis.com/wp-content/uploads/x.png',
    'https://www.capecodcannabis.com/x.png',
    'https://blocked.invalid/x.png',
    'https://example.org/x.png',
    'assets/source/abc12345-x.png',
  ]);
  ok(code === 0, 'run 1 exits 0', out);
  const e = led[a('/ok.png')];
  ok(e && e.status === 200 && e.width === 3 && e.height === 2 && e.format === 'png' && /^[0-9a-f]{64}$/.test(e.sha256), '200 image is written with dims and sha', JSON.stringify(e));
  ok(e && fs.existsSync(path.join(work, e.file)), 'the written file exists');
  const r = led[a('/redir.png')];
  ok(r && r.status === 302 && r.location && r.location.includes(String(portB)), '302 is recorded with its location', JSON.stringify(r));
  ok(hitsB === 0, 'the redirect was NOT followed (server B saw 0 hits)', String(hitsB));
  const t = led[a('/throttle-once.png')];
  ok(t && t.status === 200 && t.width === 5 && hits['/throttle-once.png'] === 2, '429 then 200: retried once after Retry-After', JSON.stringify(t) + ' hits=' + hits['/throttle-once.png']);
  const n = led[a('/notimage.png')];
  ok(n && n.reason === 'body is not an image' && !n.file, 'a non-image body is not written', JSON.stringify(n));
  const o1 = led['https://capecodcannabis.com/wp-content/uploads/x.png'];
  const o2 = led['https://www.capecodcannabis.com/x.png'];
  ok(o1 && o1.status === 'refused' && /ledger or the client origin/.test(o1.reason), 'the client origin is refused by the origin guard (not merely --hosts)', JSON.stringify(o1));
  ok(o2 && o2.status === 'refused' && /ledger or the client origin/.test(o2.reason), 'a www. client host is refused by the origin guard', JSON.stringify(o2));
  const l = led['https://blocked.invalid/x.png'];
  ok(l && l.status === 'refused' && /ledger/.test(l.reason), 'a ledger host is refused before any request (no DNS error recorded)', JSON.stringify(l));
  const h = led['https://example.org/x.png'];
  ok(h && h.status === 'refused' && /not in --hosts/.test(h.reason), 'a host outside --hosts is refused', JSON.stringify(h));
  const s = led['assets/source/abc12345-x.png'];
  ok(s && s.status === 200 && s.file === 'out/abc12345-x.png', 'an assets/source ref resolves through the inventory and keeps its name', JSON.stringify(s));
  ok(/lossy=0/.test(queries['/cdn/x.png'] || '') && !/lossy=2/.test(queries['/cdn/x.png'] || ''), 'the CDN URL is rewritten to lossy=0', queries['/cdn/x.png']);
}

// A URL with no extension gets one from its bytes.
{
  const { led } = await run([a('/noext/2ab3c53b1660')]);
  const e = led[a('/noext/2ab3c53b1660')];
  ok(e && e.status === 200 && /-2ab3c53b1660\.png$/.test(e.file) && fs.existsSync(path.join(work, e.file)), 'an extensionless URL is saved with the extension of its bytes', JSON.stringify(e));
}

// Control for the redirect zero: server B does count a direct request.
{
  const before = hitsB;
  const { led } = await run([`http://127.0.0.1:${portB}/landing.png`]);
  ok(hitsB === before + 1 && led[`http://127.0.0.1:${portB}/landing.png`].status === 200, 'control: server B counts a direct fetch, so its 0 above is meaningful', `hitsB=${hitsB}`);
}

// Run 2: a 403 stops the run; the control (no 403 in the list) fetches the same follower.
{
  hits['/ok2.png'] = 0;
  const { code, led } = await run([a('/forbidden.png'), a('/ok2.png')]);
  ok(code === 3, 'a 403 exits 3');
  ok(led[a('/ok2.png')].status === 'skipped' && (hits['/ok2.png'] || 0) === 0, 'after a 403 nothing more is requested', JSON.stringify(led[a('/ok2.png')]));
  const c = await run([a('/ok2.png')]);
  ok(c.code === 0 && c.led[a('/ok2.png')].status === 200 && hits['/ok2.png'] === 1, 'control: without the 403 the same URL is fetched');
}

// Run 3: three 429s stop the run.
{
  hits['/ok2.png'] = 0;
  const { code, led } = await run([a('/always429.png'), a('/ok2.png')]);
  ok(code === 3 && hits['/always429.png'] === 3, 'three 429s stop the run after 2 retries', `code=${code} hits=${hits['/always429.png']}`);
  ok(led[a('/ok2.png')].status === 'skipped' && (hits['/ok2.png'] || 0) === 0, 'after the throttle stop nothing more is requested');
}

// Run 4: overwrite rules.
{
  const first = (await run([a('/ok.png')])).led[a('/ok.png')];
  ok(first.status === 200, 'an identical re-fetch succeeds');
  pngA = png(7, 7, 10);
  const kept = (await run([a('/ok.png')])).led[a('/ok.png')];
  ok(kept.reason && /different file already there/.test(kept.reason), 'different bytes are not written without --force', JSON.stringify(kept));
  const forced = (await run([a('/ok.png')], ['--force'])).led[a('/ok.png')];
  ok(forced.status === 200 && forced.width === 7, '--force replaces it', JSON.stringify(forced));
}

// Run 5: --dry-run sends nothing.
{
  const before = hits['/ok.png'];
  const r = await exec([TOOL, '--list', path.join(work, 'list.txt'), '--out', 'out', '--hosts', '127.0.0.1', '--gap-ms', '0', '--dry-run'],
    { cwd: work, env: { ...process.env, SR_BLOCK_LEDGER: ledgerFile } });
  ok(r.status === 0 && hits['/ok.png'] === before && /would fetch/.test(r.stdout), '--dry-run sends no request', r.stdout + r.stderr);
}

A.close(); B.close();
fs.rmSync(work, { recursive: true, force: true });
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
