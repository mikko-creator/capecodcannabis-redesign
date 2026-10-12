#!/usr/bin/env node
// fetch-masters.mjs: fetch better image masters, one at a time, behind hard stops.
//
//   node tools/fetch-masters.mjs --list <file> [--out assets/masters] [--ledger audit/masters.json]
//        [--hosts b2702268.assetcdn.net,...] [--gap-ms 1500] [--max N] [--dry-run] [--force]
//
// Each line of --list is either
//   - a harvested file, `assets/source/<name>`: its source URL comes from audit/image-inventory.json, and a CDN URL is
//     rewritten from lossy=N to lossy=0 (the original); the master is written as <out>/<name>; or
//   - a full https URL (a third-party body image): written as <out>/<sha1(url)[0..8]>-<basename>.
//
// Stops (BUILD-CONTRACT 4.12, 4.15; site-reforge "no retry past a 403"):
//   - a host in the block ledger (SR_BLOCK_LEDGER, default audit/scan-blocked-hosts.json) or any capecodcannabis.com
//     host is refused before any request;
//   - a host not in --hosts is refused;
//   - redirects are NEVER followed (an uncached CDN variant 302s to the blocked origin); the 3xx is recorded;
//   - a 401 or 403 stops the whole run;
//   - a 429 or 503 waits for Retry-After (capped at 120 s) and is retried at most twice; a third one stops the run;
//   - a body that is not an image (by its bytes) is not written.
// An existing file with the same bytes is left alone; different bytes are only replaced with --force.
// Node builtins only. The ledger is rewritten atomically after every URL, so an interrupted run keeps its record.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const flag = (name) => args.includes('--' + name);

const ROOT = process.cwd();
const LIST = opt('list');
const OUT = path.resolve(ROOT, opt('out', 'assets/masters'));
const LEDGER = path.resolve(ROOT, opt('ledger', 'audit/masters.json'));
const HOSTS = new Set(String(opt('hosts', 'b2702268.assetcdn.net')).split(',').map((h) => h.trim().toLowerCase()).filter(Boolean));
const GAP_MS = Number(opt('gap-ms', '1500'));
const MAX = Number(opt('max', '0')) || Infinity;
const DRY = flag('dry-run');
const FORCE = flag('force');
const INVENTORY = path.resolve(ROOT, opt('inventory', 'audit/image-inventory.json'));
const RETRY_AFTER_CAP_MS = Number(opt('retry-cap-ms', '120000'));

if (!process.env.SR_BLOCK_LEDGER) process.env.SR_BLOCK_LEDGER = path.resolve(ROOT, 'audit/scan-blocked-hosts.json');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { ledgerHit, resetPolicyCache } = await import(pathToFileURL(path.join(HERE, 'sr-local/lib/fetchx.mjs')).href);
const { imageMeta } = await import(pathToFileURL(path.join(HERE, 'sr-local/lib/imagemeta.mjs')).href);
resetPolicyCache();

if (!LIST) {
  console.error('usage: node tools/fetch-masters.mjs --list <file> [--out dir] [--ledger file] [--hosts a,b] [--gap-ms n] [--max n] [--dry-run] [--force]');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowISO = () => new Date().toISOString();
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const writeAtomic = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
};
const isOwnOrigin = (host) => host === 'capecodcannabis.com' || host.endsWith('.capecodcannabis.com');

// Resolve list lines into jobs.
let inv = null;
const loadInv = () => {
  if (inv) return inv;
  const o = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  inv = new Map();
  for (const im of o.images || []) if (im.localFile) inv.set(path.basename(im.localFile), im);
  return inv;
};
const jobs = [];
for (const raw of fs.readFileSync(path.resolve(ROOT, LIST), 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  if (/^https?:\/\//i.test(line)) {
    const u = new URL(line);
    const base = path.basename(decodeURIComponent(u.pathname)).replace(/[^A-Za-z0-9._-]+/g, '-') || 'image';
    const id = crypto.createHash('sha1').update(line).digest('hex').slice(0, 8);
    jobs.push({ ref: line, url: line, file: path.join(OUT, `${id}-${base}`) });
  } else {
    const name = path.basename(line);
    const rec = loadInv().get(name);
    if (!rec) { jobs.push({ ref: line, url: null, file: null, error: 'not in image-inventory.json' }); continue; }
    let url = rec.src;
    try {
      const u = new URL(url);
      if (u.searchParams.has('lossy')) u.searchParams.set('lossy', '0');
      url = u.href;
    } catch { /* leave as is; the host check below rejects it */ }
    jobs.push({ ref: line, url, file: path.join(OUT, name) });
  }
}

const ledger = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : { schema: 'fetch-masters/1', entries: {} };
const record = (key, entry) => {
  ledger.entries[key] = { ...entry, at: nowISO() };
  if (!DRY) writeAtomic(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
};

let stop = null;
let fetched = 0;
const tally = {};
const bump = (k) => { tally[k] = (tally[k] || 0) + 1; };

for (const job of jobs) {
  if (fetched >= MAX) { bump('skipped-max'); continue; }
  if (stop) { bump('skipped-stopped'); record(job.ref, { url: job.url, status: 'skipped', reason: `run stopped: ${stop.reason}` }); continue; }
  if (job.error) { bump('unresolved'); record(job.ref, { url: null, status: 'unresolved', reason: job.error }); continue; }

  let host;
  try { host = new URL(job.url).hostname.toLowerCase(); } catch { bump('bad-url'); record(job.ref, { url: job.url, status: 'bad-url' }); continue; }
  const hit = ledgerHit(host);
  if (hit || isOwnOrigin(host)) { bump('refused-ledger'); record(job.ref, { url: job.url, status: 'refused', reason: 'host in the block ledger or the client origin; no request sent' }); continue; }
  if (!HOSTS.has(host)) { bump('refused-host'); record(job.ref, { url: job.url, status: 'refused', reason: `host ${host} not in --hosts; no request sent` }); continue; }
  if (DRY) { bump('dry-run'); console.log('would fetch', job.url, '->', path.relative(ROOT, job.file)); continue; }

  let attempt = 0;
  let res = null;
  let body = null;
  for (;;) {
    attempt++;
    try {
      res = await fetch(job.url, { redirect: 'manual', headers: { accept: 'image/png,image/jpeg;q=0.9,image/*;q=0.5' } });
    } catch (e) {
      res = { status: 0, error: String(e && e.message || e) };
    }
    fetched++;
    if (res.status === 429 || res.status === 503) {
      const ra = Number(res.headers.get('retry-after'));
      const wait = Math.min(RETRY_AFTER_CAP_MS, Number.isFinite(ra) && ra > 0 ? ra * 1000 : 5000 * attempt);
      if (attempt <= 2) { await sleep(wait); continue; }
      stop = { reason: `${res.status} three times on ${host}`, url: job.url };
    }
    break;
  }

  const status = res.status;
  if (status === 401 || status === 403) {
    stop = { reason: `${status} from ${host}`, url: job.url };
    bump('forbidden');
    record(job.ref, { url: job.url, status });
  } else if (status >= 300 && status < 400) {
    bump('redirect-not-followed');
    record(job.ref, { url: job.url, status, location: res.headers.get('location') || null, reason: 'redirect not followed' });
  } else if (status === 200) {
    body = Buffer.from(await res.arrayBuffer());
    const meta = imageMeta(body);
    const isSvg = /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(body.slice(0, 512).toString('utf8'));
    if (meta.format === 'unknown' && !isSvg) {
      bump('not-an-image');
      record(job.ref, { url: job.url, status, reason: 'body is not an image', contentType: res.headers.get('content-type') });
    } else {
      // A URL with no extension (imgix hashes) gets one from its bytes, so encoders and servers can type it.
      if (!path.extname(job.file)) job.file += '.' + (isSvg ? 'svg' : meta.format === 'jpeg' ? 'jpg' : meta.format);
      const sum = sha256(body);
      const exists = fs.existsSync(job.file);
      const same = exists && sha256(fs.readFileSync(job.file)) === sum;
      if (exists && !same && !FORCE) {
        bump('kept-existing');
        record(job.ref, { url: job.url, status, file: path.relative(ROOT, job.file), reason: 'different file already there; use --force', sha256: sum });
      } else {
        if (!same) writeAtomic(job.file, body);
        bump(same ? 'unchanged' : 'written');
        record(job.ref, {
          url: job.url, status, file: path.relative(ROOT, job.file).split(path.sep).join('/'),
          bytes: body.length, sha256: sum, format: isSvg ? 'svg' : meta.format, width: meta.width || null, height: meta.height || null,
          contentType: res.headers.get('content-type'),
        });
      }
    }
  } else if (stop) {
    bump('throttled');
    record(job.ref, { url: job.url, status, reason: stop.reason });
  } else {
    bump('http-' + status);
    record(job.ref, { url: job.url, status, error: res.error || null });
  }
  await sleep(GAP_MS);
}

console.log(JSON.stringify({ jobs: jobs.length, tally, stopped: stop, ledger: path.relative(ROOT, LEDGER) }, null, 1));
process.exit(stop ? 3 : 0);
