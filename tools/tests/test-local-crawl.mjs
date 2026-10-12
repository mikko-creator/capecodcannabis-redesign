// Controlled test of the patched local sr-crawl (--defer, --defer-stop, --exclude, --checkpoint).
// A fixture site on loopback mirrors the live shape: products listed before brands, an endless
// calendar, a ?brand= duplicate, a robots-disallowed path. Every assertion has a control run.
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
let productDelay = 0;
let onFirstProduct = null;   // fired once, when a product is first requested: simulates another stage writing mid-run
const STOCK = path.join(HOME, '.claude', 'skills', 'site-reforge', 'scripts', 'sr-crawl.mjs');
const page = (title, links) => `<!doctype html><html><head><title>${title}</title></head><body><main><h1>${title}</h1><p>Body text for ${title} with enough words to be a page.</p>${links.map((l) => `<a href="${l}">${l}</a>`).join(' ')}</main></body></html>`;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  // Route on the slash-less path: the crawler's normalizeUrl strips trailing slashes, and a
  // WordPress host answers both spellings.
  const p = (u.pathname.replace(/\/+$/, '') || '/') + u.search;
  reqLog.push(p);
  const send = (ct, body) => { res.writeHead(200, { 'content-type': ct }); res.end(body); };
  const origin = `http://127.0.0.1:${server.address().port}`;
  if (p === '/robots.txt') return send('text/plain', `User-agent: *\nDisallow: /private/\nSitemap: ${origin}/sitemap_index.xml\n`);
  if (p === '/sitemap_index.xml') return send('application/xml', `<?xml version="1.0"?><sitemapindex><sitemap><loc>${origin}/s-pages.xml</loc></sitemap><sitemap><loc>${origin}/s-products.xml</loc></sitemap><sitemap><loc>${origin}/s-brands.xml</loc></sitemap></sitemapindex>`);
  const urlset = (paths) => `<?xml version="1.0"?><urlset>${paths.map((x) => `<url><loc>${origin}${x}</loc></url>`).join('')}</urlset>`;
  if (p === '/s-pages.xml') return send('application/xml', urlset(['/', '/about/']));
  if (p === '/s-products.xml') return send('application/xml', urlset(['/products/p1/', '/products/p2/', '/products/p3/', '/products/p5/', '/products/p6/']));
  if (p === '/s-brands.xml') return send('application/xml', urlset(['/brands/b1/']));
  if (p === '/') return send('text/html', page('Home', ['/about/', '/cal/month/', '/brands/b1/?brand=B1', '/private/x']));
  if (p === '/about') return send('text/html', page('About', ['/blog/page/2/']));
  if (p === '/blog/page/2') return send('text/html', page('Blog 2', ['/']));
  if (p === '/cal/month' || p.startsWith('/cal/month/')) { const n = Number((p.match(/month\/(\d+)/) || [0, 0])[1]); return send('text/html', page('Cal ' + n, [`/cal/month/${n + 1}/`])); }
  if (p === '/brands/b1' || p === '/brands/b1?brand=B1') return send('text/html', page('Brand B1', ['/products/p4/']));
  if (p.startsWith('/products/')) {
    if (onFirstProduct) { const f = onFirstProduct; onFirstProduct = null; f(); }
    setTimeout(() => send('text/html', page('Product ' + p, ['/brands/b1/'])), productDelay); return;
  }
  if (p.startsWith('/private/')) return send('text/html', page('Private', []));
  res.writeHead(404, { 'content-type': 'text/html' }); res.end('nope');
});

const run = (proj, args, { killAfterProducts = 0, crawler = CRAWL } = {}) => new Promise((resolve) => {
  const child = spawn(process.execPath, [crawler, '--project', proj, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  let timer = null;
  if (killAfterProducts) {
    timer = setInterval(() => {
      const served = reqLog.filter((x) => x.startsWith('/products/')).length;
      if (served >= killAfterProducts) { clearInterval(timer); setTimeout(() => child.kill('SIGKILL'), 400); }
    }, 20);
  }
  child.on('exit', (code, sig) => { if (timer) clearInterval(timer); resolve({ code, sig, out }); });
});
const init = (name) => {
  const proj = path.join(ROOT, 'proj-' + name);
  fs.rmSync(proj, { recursive: true, force: true });
  execFileSync(process.execPath, [INIT, '--project', proj, '--url', `http://127.0.0.1:${server.address().port}/`, '--max', '100', '--concurrency', '2'], { stdio: 'ignore' });
  return proj;
};
const inv = (proj) => JSON.parse(fs.readFileSync(path.join(proj, 'audit', 'site-inventory.json'), 'utf8'));
const pagesOf = () => reqLog.filter((x) => !/(robots\.txt|\.xml)$/.test(x));
let fails = 0;
const check = (label, ok, detail = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  — ' + detail : '')); if (!ok) fails++; };

await new Promise((r) => server.listen(0, '127.0.0.1', r));
// normalizeUrl strips the trailing slash, so a directory pattern must not require it.
const EXCL = '/cal/month(/|$)|[?&]brand=';

// 1. Run A: content first, stop before the deferred products.
const A = init('A');
reqLog = [];
let r = await run(A, ['--defer', '/products/', '--defer-stop', '--exclude', EXCL, '--checkpoint', '2']);
let seq = pagesOf();
let i1 = inv(A);
check('A: exit 0', r.code === 0, String(r.code));
check('A: no product requested under --defer-stop', !seq.some((x) => x.startsWith('/products/')), seq.join(' '));
check('A: brand page (listed after products) was fetched', seq.includes('/brands/b1'));
check('A: BFS-found non-product page fetched (/blog/page/2)', seq.includes('/blog/page/2'));
check('A: calendar trap never entered', !seq.some((x) => x.startsWith('/cal/')), seq.join(' '));
check('A: ?brand= duplicate never requested', !seq.some((x) => x.includes('?brand=')));
check('A: excludedByPattern = 2 (/cal/month, ?brand=)', i1.counts.excludedByPattern === 2, String(i1.counts.excludedByPattern));
check('A: excluded sample recorded', i1.discovery.excludedSample.length === 2, JSON.stringify(i1.discovery.excludedSample));
check('A: robots Disallow still honoured (/private/x not requested, counted)', !seq.some((x) => x.startsWith('/private')) && i1.counts.blockedByRobots === 1, String(i1.counts.blockedByRobots));
check('A: deferredRemaining = 6 (p1,p2,p3,p5,p6 + BFS p4)', i1.counts.deferredRemaining === 6, String(i1.counts.deferredRemaining));
check('A: truncated true, stage note says STOPPED', i1.truncated === true && /STOPPED with 6 deferred/.test(JSON.parse(fs.readFileSync(path.join(A, 'project.json'), 'utf8')).stages.crawl.note));
check('A: checkpoint lines logged', /checkpoint/.test(r.out));

// 2. Run B: same project, products now, killed after 2 products; checkpoint every page.
productDelay = 250;
reqLog = [];
r = await run(A, ['--defer', '/products/', '--exclude', EXCL, '--checkpoint', '1'], { killAfterProducts: 2 });
check('B: content pages NOT re-requested on resume', !pagesOf().some((x) => ['/', '/about', '/brands/b1', '/blog/page/2'].includes(x)), pagesOf().join(' '));
check('B: killed mid-run', r.sig === 'SIGKILL' || r.code !== 0, `code=${r.code} sig=${r.sig}`);
const afterKill = inv(A);
const recorded = afterKill.pages.filter((p) => p.url.includes('/products/') && p.ok).map((p) => new URL(p.url).pathname);
check('B: checkpointed inventory holds the products served before the kill', recorded.length >= 1, recorded.join(' '));

// 3. Run C: resume; the products recorded in B must not be requested again.
productDelay = 0;
reqLog = [];
r = await run(A, ['--defer', '/products/', '--exclude', EXCL, '--checkpoint', '1']);
const servedC = reqLog.filter((x) => x.startsWith('/products/'));
const refetched = servedC.filter((x) => recorded.includes(x));
check('C: exit 0', r.code === 0, String(r.code));
check('C: no checkpointed product re-requested', refetched.length === 0, 'refetched=' + refetched.join(' '));
const fin = inv(A);
check('C: crawl complete (truncated false, 6 products on record)', fin.truncated === false && fin.pages.filter((p) => p.url.includes('/products/') && p.ok).length === 6, `truncated=${fin.truncated}`);

// 4. Negative control for --checkpoint: same kill without it re-requests what was served.
const N = init('N');
productDelay = 0; reqLog = [];
await run(N, ['--defer', '/products/', '--defer-stop', '--exclude', EXCL]);
productDelay = 250; reqLog = [];
await run(N, ['--defer', '/products/', '--exclude', EXCL], { killAfterProducts: 2 });
const servedN1 = reqLog.filter((x) => x.startsWith('/products/'));
productDelay = 0; reqLog = [];
await run(N, ['--defer', '/products/', '--exclude', EXCL]);
const servedN2 = reqLog.filter((x) => x.startsWith('/products/'));
const reN = servedN2.filter((x) => servedN1.includes(x));
check('CONTROL: without --checkpoint the killed run\'s products ARE re-requested', reN.length >= 1, `served-before-kill=${servedN1.join(' ')} re-requested=${reN.join(' ')}`);

// 5. Positive control for --exclude: without it the trap IS entered (bounded by --max).
const P = init('P');
productDelay = 0; reqLog = [];
await run(P, ['--defer', '/products/', '--defer-stop', '--max', '12']);
check('CONTROL: without --exclude the calendar trap IS entered', reqLog.some((x) => /\/cal\/month\/\d+/.test(x)), reqLog.filter((x) => x.startsWith('/cal/')).join(' '));
check('CONTROL: without --exclude the ?brand= duplicate IS requested', reqLog.some((x) => x.includes('?brand=')));

// 6. Ordering control: without --defer, products listed first are fetched before the brand.
const O = init('O');
reqLog = [];
await run(O, ['--exclude', EXCL, '--max', '100']);
const so = pagesOf();
check('CONTROL: without --defer a product is fetched before the brand page', so.findIndex((x) => x.startsWith('/products/')) < so.indexOf('/brands/b1'), so.join(' '));

// 7. Mid-run writes by another stage survive the local crawler (project.json stage + a failures item).
const midEdit = (proj) => () => {
  const pf = path.join(proj, 'project.json');
  const pj = JSON.parse(fs.readFileSync(pf, 'utf8'));
  pj.stages.extract = { status: 'done', at: 'MID-RUN', note: 'MARKER-STAGE' };
  fs.writeFileSync(pf, JSON.stringify(pj, null, 2));
  const ff = path.join(proj, 'audit', 'failures.json');
  const fj = fs.existsSync(ff) ? JSON.parse(fs.readFileSync(ff, 'utf8')) : { schema: 'site-reforge/failures@1', items: [] };
  fj.items.push({ stage: 'assets:image', target: 'MARKER-FAILURE', reason: 'test', extra: null, at: 'MID-RUN' });
  fs.writeFileSync(ff, JSON.stringify(fj, null, 2));
};
const M = init('M');
productDelay = 0; reqLog = [];
await run(M, ['--defer', '/products/', '--defer-stop', '--exclude', EXCL]);
productDelay = 250; reqLog = []; onFirstProduct = midEdit(M);
r = await run(M, ['--defer', '/products/', '--exclude', EXCL, '--checkpoint', '1']);
const pjM = JSON.parse(fs.readFileSync(path.join(M, 'project.json'), 'utf8'));
const fjM = JSON.parse(fs.readFileSync(path.join(M, 'audit', 'failures.json'), 'utf8'));
check('M: exit 0', r.code === 0, String(r.code));
check('M: a stage written mid-run survives (project.json re-read)', pjM.stages.extract && pjM.stages.extract.note === 'MARKER-STAGE', JSON.stringify(pjM.stages.extract));
check('M: crawl stage still recorded', pjM.stages.crawl && pjM.stages.crawl.status === 'done', JSON.stringify(pjM.stages.crawl));
check('M: a failure written mid-run survives (merge on write)', fjM.items.some((x) => x.target === 'MARKER-FAILURE'));
check('M: no temp files left behind', !fs.readdirSync(path.join(M, 'audit')).some((f) => f.includes('.tmp-')), fs.readdirSync(path.join(M, 'audit')).join(','));

// 8. Negative control: the STOCK crawler loses both mid-run writes.
const K = init('K');
productDelay = 250; reqLog = []; onFirstProduct = midEdit(K);
await run(K, ['--max', '100'], { crawler: STOCK });
const pjK = JSON.parse(fs.readFileSync(path.join(K, 'project.json'), 'utf8'));
const fjK = JSON.parse(fs.readFileSync(path.join(K, 'audit', 'failures.json'), 'utf8'));
check('CONTROL: stock crawler erases the mid-run stage', !(pjK.stages.extract && pjK.stages.extract.note === 'MARKER-STAGE'), JSON.stringify(pjK.stages.extract));
check('CONTROL: stock crawler erases the mid-run failure', !fjK.items.some((x) => x.target === 'MARKER-FAILURE'));

server.close();
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
