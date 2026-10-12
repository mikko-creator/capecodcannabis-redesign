// Controlled test of the local sr-crawl breakers (--stop-on-403, --max-404/--window-min, --skip-known-404) and the
// project-ledger stop. A loopback fixture mimics the 2026-10-12 incident: dead internal links, then a lockout where
// every request answers 403. Every assertion is paired with a control run without the flag.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const HOME = os.homedir();
const CRAWL = path.join(HOME, 'capecodcannabis-reforge', 'tools', 'sr-local', 'sr-crawl.mjs');
const INIT = path.join(HOME, '.claude', 'skills', 'site-reforge', 'scripts', 'sr-init.mjs');
const ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');

let reqLog = [];
let mode = { lockAfter: Infinity };   // after this many successful page answers, everything answers 403
let served = 0;
const page = (t, links) => `<!doctype html><html><head><title>${t}</title></head><body><main><h1>${t}</h1><p>Words for ${t}.</p>${links.map((l) => `<a href="${l}">${l}</a>`).join(' ')}</main></body></html>`;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = (u.pathname.replace(/\/+$/, '') || '/') + u.search;
  reqLog.push(p);
  const send = (code, ct, body) => { res.writeHead(code, { 'content-type': ct }); res.end(body); };
  const origin = `http://${req.headers.host}`;
  if (p === '/robots.txt') return send(200, 'text/plain', `User-agent: *\nSitemap: ${origin}/sitemap_index.xml\n`);
  if (p === '/sitemap_index.xml') return send(200, 'application/xml', `<?xml version="1.0"?><urlset>${['/', '/a', '/b', '/c', '/d', '/e', '/f', '/g'].map((x) => `<url><loc>${origin}${x}</loc></url>`).join('')}</urlset>`);
  if (served >= mode.lockAfter) return send(403, 'text/html', 'locked');
  if (p.startsWith('/dead')) return send(404, 'text/html', 'nope');
  if (['/', '/a', '/b', '/c', '/d', '/e', '/f', '/g'].includes(p)) {
    served++;
    const links = p === '/' ? ['/dead1/', '/dead2/', '/dead3/', '/dead4/', '/dead5/', '/dead6/'] : [];
    return send(200, 'text/html', page('P' + p, links));
  }
  return send(404, 'text/html', 'nope');
});

const run = (proj, args, env = {}) => new Promise((resolve) => {
  const child = spawn(process.execPath, [CRAWL, '--project', proj, ...args], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('exit', (code) => resolve({ code, out }));
});
const init = (name, hostname = '127.0.0.1') => {
  const proj = path.join(ROOT, 'brk-' + name);
  fs.rmSync(proj, { recursive: true, force: true });
  execFileSync(process.execPath, [INIT, '--project', proj, '--url', `http://${hostname}:${server.address().port}/`, '--max', '100', '--concurrency', '1'], { stdio: 'ignore' });
  return proj;
};
const inv = (proj) => JSON.parse(fs.readFileSync(path.join(proj, 'audit', 'site-inventory.json'), 'utf8'));
const pageReqs = () => reqLog.filter((x) => !/(robots\.txt|\.xml)$/.test(x));
let fails = 0;
const check = (label, ok, detail = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  — ' + detail : '')); if (!ok) fails++; };
const reset = (m) => { reqLog = []; served = 0; mode = m; };

await new Promise((r) => server.listen(0, '127.0.0.1', r));

// T1: 403 breaker. The server serves 3 pages, then answers 403 to everything (a lockout).
let P = init('t1');
reset({ lockAfter: 3 });
let r = await run(P, ['--stop-on-403']);
let reqs = pageReqs();
let first403 = reqs.findIndex((_, i) => i >= 3);
check('T1: exit code 3 (breaker)', r.code === 3, String(r.code));
check('T1: no request after the first 403', reqs.length === 4, `page requests ${reqs.length}: ${reqs.join(' ')}`);
const led = JSON.parse(fs.readFileSync(path.join(P, 'audit', 'scan-blocked-hosts.json'), 'utf8'));
check('T1: host written to the project ledger', !!led.hosts['127.0.0.1'], JSON.stringify(Object.keys(led.hosts)));
const pj = JSON.parse(fs.readFileSync(path.join(P, 'project.json'), 'utf8'));
check('T1: stage note names the breaker', /BREAKER forbidden/.test(pj.stages.crawl.note), pj.stages.crawl.note);
check('T1: inventory records the breaker', inv(P).counts.breaker && inv(P).counts.breaker.kind === 'forbidden');
// Control: without the flag the crawler keeps asking into the lockout.
P = init('t1c');
reset({ lockAfter: 3 });
await run(P, []);
reqs = pageReqs();
check('CONTROL T1: without --stop-on-403 it keeps requesting after the lockout', reqs.length > 6, `page requests ${reqs.length}`);

// T2: 404 burst breaker (3 within 5 minutes); the home page links 6 dead links.
P = init('t2');
reset({ lockAfter: Infinity });
r = await run(P, ['--max-404', '3', '--window-min', '5']);
reqs = pageReqs();
const dead = reqs.filter((x) => x.startsWith('/dead'));
check('T2: exit code 3 (breaker)', r.code === 3, String(r.code));
check('T2: stopped at the 3rd 404', dead.length === 3, dead.join(' '));
check('T2: breaker kind 404-burst', inv(P).counts.breaker && inv(P).counts.breaker.kind === '404-burst');
// Control.
P = init('t2c');
reset({ lockAfter: Infinity });
await run(P, []);
check('CONTROL T2: without --max-404 all 6 dead links are requested', pageReqs().filter((x) => x.startsWith('/dead')).length === 6);

// T3: --skip-known-404 on resume. The control project from T2 already recorded 6 x 404.
reset({ lockAfter: Infinity });
await run(P, []);
const replayed = pageReqs().filter((x) => x.startsWith('/dead')).length;
check('CONTROL T3: a plain resume replays the recorded dead links', replayed === 6, String(replayed));
reset({ lockAfter: Infinity });
r = await run(P, ['--skip-known-404']);
check('T3: --skip-known-404 resume requests no dead link', pageReqs().filter((x) => x.startsWith('/dead')).length === 0, pageReqs().join(' '));
check('T3: skippedKnown404 counted', inv(P).counts.skippedKnown404 === 6, String(inv(P).counts.skippedKnown404));

// T4: a host in the project ledger gets ZERO requests (through SR_BLOCK_LEDGER), and the run stops at once.
P = init('t4', 'localhost');
const ledFile = path.join(P, 'audit', 'scan-blocked-hosts.json');
fs.writeFileSync(ledFile, JSON.stringify({ hosts: { localhost: { host: 'localhost', ts: '2026-10-12T00:00:00Z', reason: 'test' } } }));
reset({ lockAfter: Infinity });
r = await run(P, ['--stop-on-403'], { SR_BLOCK_LEDGER: ledFile });
check('T4: zero requests reach a ledgered host', reqLog.length === 0, reqLog.join(' '));
check('T4: exit code 3, breaker kind ledger', r.code === 3 && inv(P).counts.breaker && inv(P).counts.breaker.kind === 'ledger', `code ${r.code} ${JSON.stringify(inv(P).counts.breaker)}`);
// Control: the same project without the ledger env is crawled normally.
reset({ lockAfter: Infinity });
await run(P, ['--stop-on-403']);
check('CONTROL T4: without SR_BLOCK_LEDGER the host is requested', pageReqs().length > 0, String(pageReqs().length));

server.close();
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
