// test-chrome-guard.mjs: controls for the Chrome network guard (BUILD-CONTRACT 4.17.13) in tools/cdp.mjs, used by
// tools/cdp-realsb.mjs and tools/serve.mjs --open. Owner: lane P0.
//   1. guardArgs(): the default rule set, SR_CHROME_ALLOW additions, and every refusal (no Chrome is started).
//   2. Refusal exits 2 BEFORE Chrome starts, for cdp.mjs, cdp-realsb.mjs and serve.mjs --open (child processes; the
//      profile directory they were given must not exist afterwards).
//   3. One headless Chrome at a time (cdp.mjs, own profiles under --work), no network used:
//      run A, default guard: a page on 127.0.0.1 loads; an <img> from https://example.com and one from
//      http://sr-probe.localhost:<port> fail with net::ERR_NAME_NOT_RESOLVED;
//      run B, the positive control, SR_CHROME_ALLOW=sr-probe.localhost: the same sr-probe.localhost image loads (Chrome
//      resolves *.localhost to loopback itself, without DNS), so the failure in run A is the guard's doing, not the
//      machine's network. After each run Chrome is closed and no chrome.exe may still use the profile.
//   node tools/tests/test-chrome-guard.mjs [--work <dir>]   (default a new directory under the OS temp dir)
// Exit 0 when every check passes, 1 otherwise.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { guardArgs, launch, sleep } from '../cdp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const tools = path.resolve(here, '..');
const args = process.argv.slice(2);
const work = args.includes('--work') ? path.resolve(args[args.indexOf('--work') + 1]) : fs.mkdtempSync(path.join(os.tmpdir(), 'sr-chrome-guard-'));
fs.mkdirSync(work, { recursive: true });
let fails = 0;
const check = (label, ok, detail = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  -- ' + detail : '')); if (!ok) fails++; };
const DEFAULT_RULES = '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1, EXCLUDE images.dutchie.com';
const refused = (fn) => { try { fn(); return null; } catch (err) { return err.message; } };

// 1. guardArgs()
{
  const a = guardArgs([], {});
  check('default: exact resolver rule + --no-proxy-server', a.length === 2 && a[0] === DEFAULT_RULES && a[1] === '--no-proxy-server', JSON.stringify(a));
  const b = guardArgs([], { SR_CHROME_ALLOW: 'fonts.gstatic.com, *.example.org  images.dutchie.com' });
  check('SR_CHROME_ALLOW adds hosts (deduplicated)', b[0] === DEFAULT_RULES + ', EXCLUDE fonts.gstatic.com, EXCLUDE *.example.org', b[0]);
  for (const h of ['capecodcannabis.com', 'WWW.CapeCodCannabis.com.', 'sst.capecodcannabis.com', '*.capecodcannabis.com', 'capecodcannabis.*', '*', '*.com', '*cannabis.com', 'c*.com', '93.184.215.14', 'bad_host!', 'MAP']) {
    const m = refused(() => guardArgs([], { SR_CHROME_ALLOW: 'fonts.gstatic.com,' + h }));
    // "MAP" alone is a valid-looking single label; it is harmless as an EXCLUDE, so only the others must be refused
    if (h === 'MAP') { check('a bare label is accepted only as an EXCLUDE host ("map")', m === null && guardArgs([], { SR_CHROME_ALLOW: h })[0].endsWith(', EXCLUDE map'), String(m)); continue; }
    check('refused: SR_CHROME_ALLOW=' + h, !!m && m.startsWith('refused:'), String(m));
  }
  for (const x of ['--host-resolver-rules=MAP * 127.0.0.1', '--proxy-server=http://127.0.0.1:8888', '--proxy-pac-url=http://x/p.pac', '--proxy-auto-detect']) {
    const m = refused(() => guardArgs([x], {}));
    check('refused extra arg: ' + x.split('=')[0], !!m && m.startsWith('refused:'), String(m));
  }
}

// 2. refusal exits 2 before Chrome starts
{
  const env = { ...process.env, SR_CHROME_ALLOW: 'www.capecodcannabis.com' };
  for (const mod of ['cdp.mjs', 'cdp-realsb.mjs']) {
    const prof = path.join(work, 'refused-' + mod.replace('.mjs', ''));
    fs.rmSync(prof, { recursive: true, force: true });
    const code = `import(${JSON.stringify(pathToFileURL(path.join(tools, mod)).href)}).then((m) => m.launch({ userDataDir: ${JSON.stringify(prof)} })).then(() => process.exit(0), () => process.exit(3));`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env, encoding: 'utf8', timeout: 60000 });
    check(mod + ': SR_CHROME_ALLOW=www.capecodcannabis.com -> exit 2, no profile created', r.status === 2 && /\[network guard\] refused/.test(r.stderr) && !fs.existsSync(prof), 'exit ' + r.status + ', ' + r.stderr.trim().slice(0, 160));
  }
  const r = spawnSync(process.execPath, [path.join(tools, 'serve.mjs'), '--root', work, '--port', '0', '--open'], { env, encoding: 'utf8', timeout: 60000 });
  check('serve.mjs --open: SR_CHROME_ALLOW=www.capecodcannabis.com -> exit 2 before a browser opens', r.status === 2 && /\[network guard\] refused/.test(r.stderr), 'exit ' + r.status + ', ' + (r.stderr || '').trim().slice(0, 160));
}

// 3. guarded Chrome runs, one at a time
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
let port = 0;
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/dot.png')) { res.writeHead(200, { 'content-type': 'image/png' }); res.end(PNG); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><title>guard probe</title><p id="ok">local page loaded</p>' +
    '<img id="ext" src="https://example.com/sr-guard-probe.png" alt="">' +
    '<img id="loc" src="http://sr-probe.localhost:' + port + '/dot.png" alt="">');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
port = server.address().port;
const url = 'http://127.0.0.1:' + port + '/';
const countProcs = (profile) => {
  const r = spawnSync('powershell', ['-NoProfile', '-Command', `@(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${profile.replace(/'/g, "''")}*' }).Count`], { encoding: 'utf8' });
  return Number(String(r.stdout).trim());
};
const leftOver = async (profile) => {
  if (process.platform !== 'win32') return 0;
  let left = -1;
  for (let i = 0; i < 20; i++) {
    left = countProcs(profile);
    if (left === 0) break;
    await sleep(500);
  }
  return left;
};
const runChrome = async (tag, allow) => {
  const profile = path.join(work, 'chrome-profile-' + tag);
  const saved = process.env.SR_CHROME_ALLOW;
  if (allow) process.env.SR_CHROME_ALLOW = allow; else delete process.env.SR_CHROME_ALLOW;
  let b = null;
  const sent = [], failed = [];
  let st = null, err = null, running = null;
  try {
    b = await launch({ userDataDir: profile });
    b.on((m) => {
      if (m.method === 'Network.requestWillBeSent') sent.push({ id: m.params.requestId, url: m.params.request.url });
      if (m.method === 'Network.loadingFailed') failed.push({ id: m.params.requestId, err: m.params.errorText });
    });
    const pg = await b.newPage({ width: 800, height: 600 });
    await pg.goto(url, { settle: 1500 });
    st = await pg.eval('({ text: (document.getElementById("ok") || {}).textContent, ext: document.getElementById("ext").naturalWidth, loc: document.getElementById("loc").naturalWidth })');
    if (process.platform === 'win32') running = countProcs(profile);   // positive control for the leftover count
  } catch (e) { err = e.message; } finally {
    if (b) await b.close();
    if (saved === undefined) delete process.env.SR_CHROME_ALLOW; else process.env.SR_CHROME_ALLOW = saved;
  }
  const errOf = (prefix) => failed.filter((f) => sent.some((x) => x.id === f.id && x.url.startsWith(prefix))).map((f) => f.err);
  const hosts = [...new Set(sent.map((x) => { try { return new URL(x.url).host; } catch { return x.url.slice(0, 40); } }))];
  return { st, err, ext: errOf('https://example.com/'), loc: errOf('http://sr-probe.localhost:'), hosts, running, left: await leftOver(profile), profile };
};
try {
  const A = await runChrome('a', null);
  check('run A: a page on 127.0.0.1 loads', !A.err && A.st && A.st.text === 'local page loaded', A.err || JSON.stringify(A.st && A.st.text) + ' at ' + url);
  check('run A: an <img> from https://example.com fails to resolve (net::ERR_NAME_NOT_RESOLVED, naturalWidth 0)', !!A.st && A.ext.length >= 1 && A.ext.every((e) => e === 'net::ERR_NAME_NOT_RESOLVED') && A.st.ext === 0, 'failures ' + JSON.stringify(A.ext) + ', naturalWidth ' + (A.st && A.st.ext));
  check('run A: an <img> from sr-probe.localhost (loopback, no DNS) is blocked too', !!A.st && A.loc.length >= 1 && A.loc.every((e) => e === 'net::ERR_NAME_NOT_RESOLVED') && A.st.loc === 0, 'failures ' + JSON.stringify(A.loc) + ', naturalWidth ' + (A.st && A.st.loc));
  check('run A: no request to capecodcannabis.com', !A.hosts.some((h) => /capecodcannabis/i.test(h)), 'hosts requested: ' + A.hosts.join(' '));
  check('run A: Chrome closed, no chrome.exe still uses the profile (while open the same query counted > 0)', A.left === 0 && A.running > 0, 'while open ' + A.running + ', after close ' + A.left + ' (' + A.profile + ')');
  const B = await runChrome('b', 'sr-probe.localhost');
  check('run B (positive control, SR_CHROME_ALLOW=sr-probe.localhost): the same image loads', !B.err && !!B.st && B.st.loc === 1 && B.loc.length === 0, B.err || 'naturalWidth ' + (B.st && B.st.loc) + ', failures ' + JSON.stringify(B.loc));
  check('run B: example.com still fails to resolve', !!B.st && B.ext.length >= 1 && B.ext.every((e) => e === 'net::ERR_NAME_NOT_RESOLVED'), 'failures ' + JSON.stringify(B.ext));
  check('run B: Chrome closed, no chrome.exe still uses the profile (while open the same query counted > 0)', B.left === 0 && B.running > 0, 'while open ' + B.running + ', after close ' + B.left + ' (' + B.profile + ')');
} finally {
  server.close();
}
if (!args.includes('--work')) { try { fs.rmSync(work, { recursive: true, force: true }); } catch { /* Chrome may hold a file for a moment */ } }
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASS');
process.exit(fails ? 1 : 0);
