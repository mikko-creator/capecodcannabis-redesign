#!/usr/bin/env node
// sr-crawl.mjs — STAGE 1. Systematic same-origin crawl of the live site.
// Seeds from: the target URL, robots.txt Sitemap: lines, /sitemap.xml,
// /sitemap_index.xml, /wp-sitemap.xml, then breadth-first over discovered links.
//
// RESUMABLE (BYLAW 10): a page already on disk with a recorded status is not
// refetched unless --refetch. Re-running after a network wobble costs nothing.
//
//   node scripts/sr-crawl.mjs --project <dir> [--max N] [--concurrency N]
//                             [--refetch] [--subdomains] [--css]
//
// LOCAL COPY (capecodcannabis-reforge, 2026-10-12). Stock 1.12.1 plus four flags; UA, pacing,
// robots handling and every refusal rule are unchanged (lib/ is a byte copy of the skill's).
//   --defer <regex>   URLs matching go to a second queue, served only when the first is empty.
//                     This host lists 5,857 /products/ pages ahead of its brand, category and
//                     specials sitemaps, so a stock run reaches those last.
//   --defer-stop      end the run when the first queue is empty (the deferred rest = truncated).
//   --exclude <regex> never request matching URLs. Counted as counts.excludedByPattern, the
//                     pattern and a sample recorded in discovery, so nothing is dropped silently.
//                     For crawler traps (The Events Calendar month/day views page forward
//                     without end) and measured duplicates (?brand= = the brand page, same text,
//                     canonical to it).
//   --checkpoint N    write the inventory and failures every N fetched pages. The stock run
//                     writes them only at the end, so an interrupted multi-hour run resumed
//                     from nothing.
// And three write-safety changes for a crawl that runs for hours beside other stages:
//   project.json is re-read before stages.crawl is written (stock wrote back its start-time copy,
//   erasing stages recorded meanwhile); failures.json is merged on write (this run's new items
//   appended to a fresh read); site-inventory.json and failures.json are written atomically.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  argv, die, log, ensureDir, readJSON, writeJSON, nowISO,
  normalizeUrl, sameSite, slugifyUrl, sha256, pool, relTime,
} from './lib/util.mjs';
import { get, parseRobots, robotsMatcher, parseSitemap, setPacing, trippedHosts } from './lib/fetchx.mjs';
import { getAnchors, getLinkRels, getStyleBlocks } from './lib/html.mjs';

// LOCAL: write-then-rename, so a concurrent reader sees the old file or the new one, never half of one.
// Windows can refuse a rename onto a file another process holds for a moment; retry briefly, then
// fall back to a plain write rather than lose the data.
function writeJSONAtomic(p, obj) {
  ensureDir(path.dirname(p));
  const body = JSON.stringify(obj, null, 2) + '\n';
  const tmp = p + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, body, 'utf8');
  for (let i = 0; i < 20; i++) {
    try { fs.renameSync(tmp, p); return p; } catch { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100); }
  }
  fs.writeFileSync(p, body, 'utf8');
  try { fs.unlinkSync(tmp); } catch {}
  return p;
}

const HTML_TYPES = new Set(['text/html', 'application/xhtml+xml']);
const SKIP_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|json|xml|pdf|zip|gz|mp4|webm|mp3|wav|woff2?|ttf|eot|txt|rss|atom)$/i;

async function main() {
  const a = argv();
  const dir = path.resolve(a.project || a._[0] || '.');
  const pfile = path.join(dir, 'project.json');
  const project = readJSON(pfile);
  if (!project) die('no project.json in ' + dir + ' — run sr-init.mjs first');

  const cfg = project.config;
  const maxPages = Number(a.max ?? cfg.maxPages);
  const concurrency = Number(a.concurrency ?? cfg.concurrency);
  const includeSubdomains = a.subdomains ? true : cfg.includeSubdomains;
  const refetch = !!a.refetch;
  const delayMs = Number(cfg.requestDelayMs || 0);
  // Pinned at sr-init and sent on every request, so a re-crawl from another machine
  // harvests the same locale rather than the operator's own.
  const headers = cfg.requestHeaders || {};
  // Pacing is enforced per HOST in the fetch layer, so every stage inherits it. A sleep
  // inside this pool paced pages only, and left the asset stage — the far heavier one —
  // running with no gap at all. hostCap is clamped there for a host we have not allowlisted.
  setPacing({ delayMs, hostCap: concurrency });
  const t0 = Date.now();

  const rawDir = path.join(dir, 'audit', 'raw');
  const invFile = path.join(dir, 'audit', 'site-inventory.json');
  const failFile = path.join(dir, 'audit', 'failures.json');
  ensureDir(rawDir);

  const prior = readJSON(invFile, null);
  const pages = new Map();
  // Alias URLs a previous run already resolved. Rebuilt from the inventory so a resumed
  // crawl does not re-issue a request whose only possible answer is a redirect it has
  // already followed.
  const aliasSeen = new Set();
  if (prior && !refetch) {
    for (const p of prior.pages || []) {
      pages.set(p.url, p);
      for (const alt of p.aliases || []) aliasSeen.add(alt);
    }
  }
  const failures = readJSON(failFile, { schema: 'site-reforge/failures@1', items: [] });
  // LOCAL: this run's own failures, merged into a FRESH read of failures.json at every write, so a
  // multi-hour run never erases what another stage recorded there meanwhile.
  const newFailures = [];
  const recordFailure = (stage, target, reason, extra) => {
    const item = { stage, target, reason, extra: extra || null, at: nowISO() };
    failures.items.push(item);
    newFailures.push(item);
  };

  // --- seeds ---------------------------------------------------------------
  const origin = project.origin;
  const seeds = new Set([project.targetUrl]);
  const discovery = { robots: null, sitemaps: [], sitemapUrlCount: 0 };

  const robotsRes = await get(origin + '/robots.txt', { timeoutMs: 15000, headers });
  if (robotsRes.ok && typeof robotsRes.body === 'string') {
    const parsed = parseRobots(robotsRes.body);
    // allow: is carried too — the matcher needs it, and a stored record that drops half the
    // rules is a record of a robots.txt the site does not have.
    discovery.robots = { status: robotsRes.status, sitemaps: parsed.sitemaps, disallow: parsed.disallow, allow: parsed.allow };
    fs.writeFileSync(path.join(dir, 'audit', 'robots.txt'), robotsRes.body);
    for (const s of parsed.sitemaps) discovery.sitemaps.push(s);
  } else {
    discovery.robots = { status: robotsRes.status, error: robotsRes.error || 'not-ok' };
    recordFailure('crawl:robots', origin + '/robots.txt', robotsRes.error || ('status ' + robotsRes.status));
  }

  for (const guess of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml', '/sitemap-index.xml']) {
    if (!discovery.sitemaps.includes(origin + guess)) discovery.sitemaps.push(origin + guess);
  }

  const seenSitemaps = new Set();
  const sitemapQueue = [...discovery.sitemaps];
  while (sitemapQueue.length) {
    const sm = sitemapQueue.shift();
    if (seenSitemaps.has(sm) || seenSitemaps.size > 60) continue;
    seenSitemaps.add(sm);
    const r = await get(sm, { timeoutMs: 20000, headers });
    if (!r.ok || typeof r.body !== 'string') continue;
    const parsed = parseSitemap(r.body);
    for (const n of parsed.nested) sitemapQueue.push(n);
    for (const u of parsed.urls) {
      const nu = normalizeUrl(u);
      if (nu && sameSite(nu, origin, includeSubdomains)) { seeds.add(nu); discovery.sitemapUrlCount++; }
    }
  }
  discovery.sitemapsFetched = [...seenSitemaps];

  // --- robots Disallow, ENFORCED ---------------------------------------------
  // ⚖ A RULE THAT IS PARSED AND NOT APPLIED IS A RULE THE SITE DOES NOT HAVE.
  // discovery.robots.disallow was written at the fetch above and read by exactly one
  // consumer in the whole bundle — sr-clone-verify, which uses it to EXEMPT files that are
  // missing from a build. Nothing filtered this queue, so every disallowed path with a link
  // pointing at it was fetched. Measured against a live host 2026-09-07: 30 rules parsed,
  // 30 ignored, 21 disallowed pages retrieved. The etiquette by-law is "obey the signals";
  // obeying them starts here, before the request, not in a report afterwards.
  //
  // Matching is the prefix form robots.txt actually specifies: a rule is a path prefix, and
  // a trailing `*` is the same prefix. `Disallow: /` blocks everything, which is a legitimate
  // instruction and is honoured — a crawl of such a site should return nothing and say so.
  // --own-site: the exception, and why it is not the default.
  // robots.txt is an instruction to third-party crawlers about a site somebody else operates.
  // Migrating a site the CLIENT OWNS is not third-party access, and obeying `Disallow:
  // /portfolio/` there silently drops 20 of the client's own pages out of the client's own
  // rebuild — the tool deciding, on a stranger's behalf, that the owner may not have their
  // work. Auditing a prospect is the opposite case and is far more common, so politeness
  // stays the default and the exception has to be typed out. It is recorded either way:
  // `robotsHonoured` in the inventory says which run this was, so a page count can always be
  // explained afterwards.
  const ownSite = !!a['own-site'];
  discovery.robotsHonoured = !ownSite;
  // The matcher lives in lib/fetchx.mjs and is tested there. It reads the rules as written —
  // `*` anywhere, `$` as an end anchor, the query string included, and `Allow:` beating a shorter
  // `Disallow:`. The line it replaces took `d.split('*')[0]`, which turned a live storefront's
  // `Disallow: /*/collections/*sort_by*` into `/` and refused all 2002 of its sitemap URLs.
  const disallowRules = ownSite ? [] : ((discovery.robots && discovery.robots.disallow) || []);
  const matcher = ownSite ? () => false : robotsMatcher(discovery.robots || {});
  if (ownSite) log('  --own-site: robots.txt Disallow NOT applied (crawling a site we own)');
  // ⚖ THE RULE KEEPS ITS TRAILING SLASH; THE URL HAS ALREADY LOST ITS OWN.
  // normalizeUrl strips a trailing slash (lib/util.mjs:51-53), so the directory `/private/`
  // reaches this matcher as `/private` — and `'/private'.startsWith('/private/')` is false.
  // Two earlier versions of this gate reported zero violations while fetching exactly that
  // shape: on the live host, `Disallow: /portfolio/` left `/portfolio` open, and `/portfolio`
  // 301s into the directory it names. Compare the slashed form as well, so a rule that names
  // a directory covers the directory.
  const robotsBlocks = (u) => (disallowRules.length ? matcher(u) : false);
  let blockedByRobots = 0;

  // LOCAL: --defer / --defer-stop / --exclude / --checkpoint (see the header).
  const deferRe = typeof a.defer === 'string' ? new RegExp(a.defer) : null;
  const deferStop = !!a['defer-stop'];
  const excludeRe = typeof a.exclude === 'string' ? new RegExp(a.exclude) : null;
  const checkpointEvery = Number(a.checkpoint || 0);
  discovery.deferPattern = deferRe ? deferRe.source : null;
  discovery.deferStop = deferStop;
  discovery.excludePattern = excludeRe ? excludeRe.source : null;
  discovery.excludedSample = [];
  let excludedByPattern = 0;

  // LOCAL: breakers, added after the 2026-10-12 firewall lockout (20 x 404 from the site's own dead links, then a
  // 403 for everything; fetchx's forbidden tripwire only fires while a host has had no success, so it never fired).
  //   --stop-on-403        end the run at the FIRST 401/403 (or a ledger/tripwire refusal) and add the host to the
  //                        project ledger audit/scan-blocked-hosts.json, so nothing asks again by accident.
  //   --max-404 N          end the run when N x 404/410 arrive within --window-min M minutes (default 5).
  //   --skip-known-404     never re-request a URL already recorded as 404/410; a resume otherwise replays exactly
  //                        the dead links that tripped the firewall.
  const stopOn403 = !!a['stop-on-403'];
  const max404 = Number(a['max-404'] || 0);
  const window404Ms = Number(a['window-min'] || 5) * 60000;
  const skipKnown404 = !!a['skip-known-404'];
  const recent404 = [];
  let breaker = null;
  let skippedKnown404 = 0;

  // --- breadth-first fetch --------------------------------------------------
  const queue = [];
  const deferred = [];
  const queued = new Set();
  const enqueue = (url, depth, from) => {
    const n = normalizeUrl(url);
    if (!n || queued.has(n) || aliasSeen.has(n)) return;
    if (robotsBlocks(n)) { blockedByRobots++; queued.add(n); return; }
    if (excludeRe && excludeRe.test(n)) {
      excludedByPattern++; queued.add(n);
      if (discovery.excludedSample.length < 200) discovery.excludedSample.push(n);
      return;
    }
    queued.add(n);
    (deferRe && deferRe.test(n) ? deferred : queue).push({ url: n, depth, from });
  };
  for (const s of seeds) enqueue(s, 0, 'seed');

  const pending = () => queue.length + (deferStop ? 0 : deferred.length);
  const takeNext = () => (queue.length ? queue.shift() : deferred.shift());

  // The stock inventory write, moved into a function so a checkpoint can call it too.
  const writeInventory = () => {
    const truncated = queue.length + deferred.length > 0;
    const list = [...pages.values()].sort((x, y) => (x.url < y.url ? -1 : 1));
    // LOCAL: written to a temp file and renamed into place, so a stage reading the inventory while
    // this run checkpoints never sees half a file.
    writeJSONAtomic(invFile, {
      schema: 'site-reforge/site-inventory@1',
      target: project.targetUrl,
      origin,
      generated: nowISO(),
      discovery,
      counts: {
        pages: list.length,
        html: list.filter((p) => p.ok && !p.nonHtml).length,
        nonHtml: list.filter((p) => p.nonHtml).length,
        failed: list.filter((p) => !p.ok).length,
        fetchedThisRun: fetched,
        skippedResume: skipped,
        // Reported, never silent: a page left out of a crawl and not counted anywhere is
        // indistinguishable from a page the crawl failed to find.
        blockedByRobots,
        excludedByPattern,
        skippedKnown404,
        deferredRemaining: deferred.length,
        breaker,
        // A host that refused us mid-run and was therefore not asked again. Silence here
        // would report the pages it cost as ordinary failures.
        refusedHosts: trippedHosts(),
        aliasesCollapsed: list.reduce((n, p) => n + ((p.aliases || []).length), 0),
      },
      truncated,
      queueRemaining: queue.length + deferred.length,
      maxPages,
      pages: list,
    });
    const fresh = readJSON(failFile, null) || { schema: 'site-reforge/failures@1', items: [] };
    const key = (it) => [it.stage, it.target, it.reason, it.at].join('\u0001');
    const have = new Set((fresh.items || []).map(key));
    for (const it of newFailures) if (!have.has(key(it))) (fresh.items = fresh.items || []).push(it);
    writeJSONAtomic(failFile, fresh);
    return { truncated, list };
  };
  let lastCheckpoint = 0;

  let fetched = 0, skipped = 0;
  while (pending() && pages.size < maxPages && !breaker) {
    const batch = [];
    while (pending() && batch.length < concurrency && pages.size + batch.length < maxPages) {
      const item = takeNext();
      const existing = pages.get(item.url);
      if (skipKnown404 && existing && !existing.ok && (existing.status === 404 || existing.status === 410)) {
        skippedKnown404++;
        continue;
      }
      if (existing && !refetch && existing.savedAs && fs.existsSync(path.join(rawDir, existing.savedAs))) {
        skipped++;
        for (const link of existing.internalLinks || []) enqueue(link, item.depth + 1, item.url);
        continue;
      }
      batch.push(item);
    }
    if (!batch.length) continue;

    const results = await pool(batch, concurrency, async (item) => {
      const r = await get(item.url, { timeoutMs: 25000, accept: 'text/html,application/xhtml+xml', headers });
      return { item, r };
    });

    for (const { item, r } of results) {
      if (!r.ok) {
        pages.set(item.url, {
          url: item.url, status: r.status, ok: false, error: r.error || null,
          depth: item.depth, discoveredFrom: item.from, redirectChain: r.chain || [],
          fetchedAt: nowISO(),
        });
        recordFailure('crawl:page', item.url, r.error || ('status ' + r.status), { chain: r.chain });
        if (stopOn403 && !breaker) {
          if (r.status === 403 || r.status === 401) breaker = { kind: 'forbidden', status: r.status, url: item.url, at: nowISO() };
          else if (r.blocked && (r.blockReason === 'ledger' || r.blockReason === 'tripped')) breaker = { kind: r.blockReason, status: r.status, url: item.url, at: nowISO() };
        }
        if (max404 && (r.status === 404 || r.status === 410)) {
          const now = Date.now();
          recent404.push(now);
          while (recent404.length && now - recent404[0] > window404Ms) recent404.shift();
          if (recent404.length >= max404 && !breaker) breaker = { kind: '404-burst', count: recent404.length, windowMin: window404Ms / 60000, url: item.url, at: nowISO() };
        }
        continue;
      }
      const ct = r.contentType || '';
      if (!HTML_TYPES.has(ct)) {
        pages.set(item.url, {
          url: item.url, status: r.status, ok: true, nonHtml: true, contentType: ct,
          bytes: r.bytes, depth: item.depth, discoveredFrom: item.from,
          redirectChain: r.chain || [], fetchedAt: nowISO(),
        });
        continue;
      }
      // ⚖ AN ALIAS IS THE PAGE IT LANDS ON, NOT A PAGE OF ITS OWN.
      // The key was `item.url` — what we ASKED for — while `finalUrl` sat in the value,
      // recorded and unused. A site that serves /seo-services/atlanta-seo as a 301 to
      // /our-locations/atlanta-seo therefore produced two entries holding one page's bytes,
      // and two raw files. On the live run of 2026-09-07 that inflated a 137-page site to
      // 173 and made a correct build look like it had dropped 36 pages it never had.
      // Keying by the destination collapses them; the requested spelling is kept in
      // `aliases` so nothing about how the page was reached is lost.
      const landed = normalizeUrl(r.finalUrl) || item.url;

      // ⚖ A GATE ON THE URL REQUESTED IS NOT A GATE ON WHERE THE REQUEST ENDS UP.
      // The enqueue check above reads the requested path, and a redirect can carry it
      // somewhere robots forbids. Found on the live host with the first version of this
      // fix still in place: `/portfolio` is NOT matched by the rule `/portfolio/` — one
      // character short of the prefix — and it 301s into exactly that directory. It was
      // fetched, stored, and reported as compliant. The body is already in memory here and
      // that cannot be undone; what CAN be done is refuse to keep it, and say so.
      if (robotsBlocks(landed)) {
        blockedByRobots++;
        aliasSeen.add(item.url);
        queued.add(landed);
        continue;
      }

      const already = pages.get(landed);
      if (already && landed !== item.url) {
        already.aliases = [...new Set([...(already.aliases || []), item.url])];
        aliasSeen.add(item.url);
        for (const link of already.internalLinks || []) enqueue(link, item.depth + 1, landed);
        continue;
      }
      if (landed !== item.url) aliasSeen.add(item.url);

      const savedAs = slugifyUrl(landed) + '.html';
      fs.writeFileSync(path.join(rawDir, savedAs), r.body, 'utf8');
      fetched++;

      const anchors = getAnchors(r.body);
      const internal = [];
      const external = [];
      for (const an of anchors) {
        const href = (an.href || '').trim();
        if (!href || href.startsWith('#') || /^(mailto|tel|javascript|sms):/i.test(href)) continue;
        const abs = normalizeUrl(href, r.finalUrl);
        if (!abs) continue;
        if (sameSite(abs, origin, includeSubdomains)) internal.push(abs);
        else external.push(abs);
      }
      const uniqInternal = [...new Set(internal)];

      pages.set(landed, {
        url: landed,
        finalUrl: r.finalUrl,
        aliases: landed === item.url ? [] : [item.url],
        status: r.status,
        ok: true,
        contentType: ct,
        bytes: r.bytes,
        sha256: sha256(Buffer.from(r.body)),
        savedAs,
        depth: item.depth,
        discoveredFrom: item.from,
        redirectChain: r.chain || [],
        headers: {
          'content-type': r.headers['content-type'] || '',
          'x-powered-by': r.headers['x-powered-by'] || '',
          server: r.headers.server || '',
          'cache-control': r.headers['cache-control'] || '',
          link: r.headers.link || '',
        },
        internalLinks: uniqInternal,
        externalLinks: [...new Set(external)],
        stylesheetHrefs: getLinkRels(r.body)
          .filter((l) => l.rel.split(/\s+/).includes('stylesheet') && l.href)
          .map((l) => normalizeUrl(l.href, r.finalUrl) || l.href),
        inlineStyleBytes: getStyleBlocks(r.body).reduce((n, s) => n + s.length, 0),
        fetchedAt: nowISO(),
      });

      for (const link of uniqInternal) {
        if (SKIP_EXT.test(new URL(link).pathname)) continue;
        enqueue(link, item.depth + 1, landed);
      }
    }
    if (checkpointEvery && fetched - lastCheckpoint >= checkpointEvery) {
      writeInventory();
      lastCheckpoint = fetched;
      log('  checkpoint   ' + pages.size + ' pages on record, ' + queue.length + ' queued, ' + deferred.length + ' deferred, ' + relTime(Date.now() - t0));
    }
  }

  const { truncated, list } = writeInventory();

  // LOCAL: a 403 breaker puts the host in the project ledger, so every stage run through tools/sr.sh, and
  // tools/crawl-live.mjs, refuses it before the first request until someone removes the entry deliberately.
  if (breaker && breaker.kind === 'forbidden') {
    const ledgerFile = path.join(dir, 'audit', 'scan-blocked-hosts.json');
    const led = readJSON(ledgerFile, null) || { schema: 'site-reforge/scan-blocked-hosts@1', hosts: {} };
    led.hosts = led.hosts || {};
    const host = new URL(breaker.url).hostname.toLowerCase();
    if (!led.hosts[host]) {
      led.hosts[host] = {
        host, ts: breaker.at,
        reason: 'sr-crawl (local) --stop-on-403: HTTP ' + breaker.status + ' at ' + breaker.url +
          '. The run stopped at the first refusal. Remove this entry only when the owner has allowlisted us.',
      };
      writeJSONAtomic(ledgerFile, led);
    }
  }

  // LOCAL: re-read project.json and change only stages.crawl. The stock run wrote back the copy it
  // read at start, erasing every stage another process recorded during a long crawl.
  const projectNow = readJSON(pfile) || project;
  projectNow.stages = projectNow.stages || {};
  projectNow.stages.crawl = {
    status: truncated ? 'partial' : 'done',
    at: nowISO(),
    note: list.length + ' pages, ' + list.filter((p) => !p.ok).length + ' failed' +
      (excludedByPattern ? ', ' + excludedByPattern + ' excluded by pattern' : '') +
      (breaker ? ', BREAKER ' + breaker.kind + ' at ' + breaker.url : '') +
      (truncated && !breaker ? (deferStop && !queue.length ? ', STOPPED with ' + deferred.length + ' deferred' : ', TRUNCATED at --max') : ''),
  };
  projectNow.updatedAt = nowISO();
  writeJSON(pfile, projectNow);

  log('crawl complete in ' + relTime(Date.now() - t0));
  log('  html pages   ' + list.filter((p) => p.ok && !p.nonHtml).length);
  log('  non-html     ' + list.filter((p) => p.nonHtml).length);
  log('  failed       ' + list.filter((p) => !p.ok).length + (list.some((p) => !p.ok) ? '  -> audit/failures.json' : ''));
  log('  from sitemap ' + discovery.sitemapUrlCount);
  if (blockedByRobots) log('  robots-block ' + blockedByRobots + '  URLs not requested (robots.txt Disallow)');
  for (const t of trippedHosts()) {
    log('  REFUSED      ' + t.host + ' (' + t.reason + ') — stopped requesting it. This crawl is INCOMPLETE.');
    log('               Do not re-run at this host until it has allowlisted us.');
  }
  {
    const aliases = list.reduce((n, p) => n + ((p.aliases || []).length), 0);
    if (aliases) log('  aliases      ' + aliases + '  redirect URL(s) folded into the page they land on');
  }
  if (excludedByPattern) log('  excluded     ' + excludedByPattern + '  URLs not requested (--exclude ' + excludeRe.source + ')');
  if (skippedKnown404) log('  skipped      ' + skippedKnown404 + '  URLs already recorded as 404/410 (--skip-known-404)');
  if (breaker) {
    log('  BREAKER      ' + breaker.kind + (breaker.status ? ' (HTTP ' + breaker.status + ')' : '') + (breaker.count ? ' (' + breaker.count + ' in ' + breaker.windowMin + ' min)' : '') + ' at ' + breaker.url);
    log('               The run stopped. ' + (breaker.kind === 'forbidden' ? 'The host is now in audit/scan-blocked-hosts.json; resume only after the owner allowlists us.' : 'Inspect before resuming.'));
    process.exitCode = 3;
  }
  if (truncated) log('  TRUNCATED    ' + (queue.length + deferred.length) + ' URLs left (' + deferred.length + ' deferred) — raise --max / drop --defer-stop and re-run (resumable)');
  log('  next         node scripts/sr-extract.mjs --project ' + JSON.stringify(dir));
}


// Only run when executed directly. The self-test imports CHECKS / selfTest /
// healthyWorkspace from this file, and an import that ran main() would exit the
// test process before it reported anything.
const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (IS_MAIN) main().catch((e) => die(e.stack || String(e)));
