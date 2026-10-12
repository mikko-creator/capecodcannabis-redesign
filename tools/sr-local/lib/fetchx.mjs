// fetchx.mjs — polite HTTP with manual redirect tracking, retry and timeout.
// Uses the global fetch (Node >= 18). No dependencies.
//
// Every failure is RETURNED, never thrown and never swallowed: the caller writes
// it into failures.json. BYLAW 9 (record the failure) is enforced here.
//
// ---------------------------------------------------------------------------
// POLITENESS LIVES HERE, AT THE ONLY PLACE REQUESTS ARE MADE.
//
// Measured 2026-09-09 across this file's callers: sr-crawl paced its page fetches (one
// sleep per pool item) and sr-assets paced NOTHING — 536 images went out back to back at
// concurrency 4. The run report for that same harvest credited it with "concurrency 2 with
// 400 ms between requests", which no statement in sr-assets.mjs implemented. Pacing that
// lives in one caller is pacing every other caller does not have, so it lives below and
// every stage inherits it whether or not the stage remembers to ask.
//
// Four mechanisms, all keyed on HOST:
//   1. a minimum gap between request STARTS                        (delayMs)
//   2. a ceiling on simultaneous connections to one host           (hostCap)
//   3. a backoff that a 429 / 503 pushes onto the HOST, so one refusal slows every
//      worker on that host and not only the one that received it
//   4. a refusal to touch a host already recorded in the scan block ledger
//
// Loopback and private addresses are exempt outright: there is no third party to be polite
// to, and a paced fixture server would only slow the suite.
//
// This is not an evasion layer. Nothing here rotates a user agent, routes through a proxy
// or retries a 403. A block is a stop.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_UA =
  'Mozilla/5.0 (compatible; site-reforge/1.0; +reconstruction-audit) AppleWebKit/537.36';

// What an un-allowlisted third-party host gets, regardless of what the project config asks
// for. 2 simultaneous connections is what one human visitor looks like; 8 is what tripped
// MalCare, and 4-with-no-gap is what the asset stage was doing.
// Read at call time, not at import. A constant frozen at module load cannot be varied by a
// test, and a limit no test can move is a limit no test can prove.
const politeCap = () => Math.max(1, Number(process.env.SR_HOST_CAP || 2));
const politeDelay = () => Math.max(0, Number(process.env.SR_HOST_DELAY_MS || 400));

// Loopback is exempt from all of this so a fixture server is not rate-limited. The seam
// exists because the exemption would otherwise make every mechanism below untestable: the
// only host a suite can bind is the one the rules do not apply to.
const paceLocal = () => process.env.SR_PACE_LOCAL === '1';
const exempt = (h) => !paceLocal() && isLocalHost(h);

const cfg = { delayMs: 150, hostCap: 4 };
const hosts = new Map();   // host -> { inFlight, nextAt, queue }

/** Set the pacing used for hosts we have allowlisted. Un-allowlisted hosts are clamped. */
export function setPacing(opts = {}) {
  if (Number.isFinite(Number(opts.delayMs))) cfg.delayMs = Math.max(0, Number(opts.delayMs));
  if (Number.isFinite(Number(opts.hostCap))) cfg.hostCap = Math.max(1, Number(opts.hostCap));
  return { ...cfg };
}

/** Test seam: forget every host's queue, in-flight count and backoff. */
export function resetPacing() { hosts.clear(); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function hostOf(u) {
  try { return new URL(u).hostname.toLowerCase(); } catch { return ''; }
}

// Loopback, link-local and RFC1918. A fixture server and a client's WAF are not the same
// kind of counterparty and must not share a rate limit.
export function isLocalHost(h) {
  h = String(h || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.test')) return true;
  if (h === '::1' || h === '0.0.0.0') return true;
  return /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^169\.254\./.test(h);
}

// --- the policy files, shared with the Cardinal scan-etiquette rule ---------
// Read lazily and cached for the life of the process. A missing or unparseable file yields
// NO restriction: this layer paces requests, it does not gate the tool on the presence of
// a config file.
// EVERY agent home on the machine, not one.
//
// Measured 2026-09-09 in a live session: CLAUDE_CONFIG_DIR pointed at a profile home that
// holds neither policy file, so a single-home lookup found no ledger and no allowlist, and
// the ledger check silently passed every host — including the one host we know has refused
// us. A protection that reads one location and finds nothing does not report that it found
// nothing; it reports that there is nothing to protect against.
//
// The union is the correct merge in both directions: a host blocked under ANY profile is
// blocked, and a host allowlisted under any profile is one of ours.
function policyHomes() {
  const out = [];
  const push = (p) => { if (p && !out.includes(p) && fs.existsSync(p)) out.push(p); };
  push(process.env.CLAUDE_CONFIG_DIR);
  const home = os.homedir();
  push(path.join(home, '.claude'));
  try {
    for (const e of fs.readdirSync(home, { withFileTypes: true })) {
      if (e.isDirectory() && e.name.startsWith('.claude')) push(path.join(home, e.name));
    }
  } catch { /* unreadable home: the two explicit candidates above still stand */ }
  return out;
}
/** Every readable copy of a policy file, newest-listed-first order irrelevant: all are merged. */
function readPolicies(file, envOverride) {
  const found = [];
  const direct = envOverride && process.env[envOverride];
  const paths = direct ? [direct] : policyHomes().map((h) => path.join(h, file));
  for (const p of paths) {
    try { found.push(JSON.parse(fs.readFileSync(p, 'utf8'))); } catch { /* absent or unparseable */ }
  }
  return found;
}
let _ledger, _allow;
function ledger() {
  if (_ledger === undefined) {
    _ledger = {};
    for (const j of readPolicies('.scan-blocked-hosts.json', 'SR_BLOCK_LEDGER')) {
      if (j && j.hosts && typeof j.hosts === 'object') Object.assign(_ledger, j.hosts);
    }
  }
  return _ledger;
}
function allowPatterns() {
  if (_allow === undefined) {
    const seen = new Set();
    for (const j of readPolicies('.sgen-host-allowlist.json', 'SR_HOST_ALLOWLIST')) {
      if (j && Array.isArray(j.hosts)) for (const h of j.hosts) seen.add(h);
    }
    _allow = [...seen];
  }
  return _allow;
}
/** Which homes were consulted — so a run can say where its policy came from. */
export function policySources() { return policyHomes(); }
/** Test seam: drop the cached policy files so a test can point at its own. */
export function resetPolicyCache() { _ledger = undefined; _allow = undefined; }

/** The ledger entry for a host, matching a registrable key against its subdomains. */
export function ledgerHit(host) {
  host = String(host || '').toLowerCase();
  for (const [key, rec] of Object.entries(ledger())) {
    const k = String(key).toLowerCase();
    if (host === k || host.endsWith('.' + k)) return { host: k, ...(rec || {}) };
  }
  return null;
}

export function isAllowlisted(host) {
  host = String(host || '').toLowerCase();
  return allowPatterns().some((raw) => {
    const p = String(raw).toLowerCase();
    if (p === host) return true;
    if (p.startsWith('*.')) { const s = p.slice(1); return host.endsWith(s) && host.length > s.length; }
    return false;
  });
}

/** The pacing a given host actually gets. Un-allowlisted third parties are clamped. */
export function pacingFor(host) {
  if (exempt(host)) return { delayMs: 0, cap: Infinity, allowlisted: true, local: true };
  if (isAllowlisted(host)) return { delayMs: cfg.delayMs, cap: cfg.hostCap, allowlisted: true, local: false };
  return {
    delayMs: Math.max(cfg.delayMs, politeDelay()),
    cap: Math.min(cfg.hostCap, politeCap()),
    allowlisted: false, local: false,
  };
}

function stateFor(host) {
  let s = hosts.get(host);
  if (!s) { s = { inFlight: 0, nextAt: 0, queue: [] }; hosts.set(host, s); }
  return s;
}

// A slot is TRANSFERRED on release rather than decremented-then-reacquired. Decrementing
// first opens a window in which a caller arriving synchronously sees inFlight below the cap
// and slips past it, because the woken waiter only resumes on the next microtask — the cap
// would then be cap+1 exactly when the host is busiest.
async function acquire(host) {
  const p = pacingFor(host);
  if (p.local) return () => {};
  const s = stateFor(host);
  if (s.inFlight >= p.cap) await new Promise((res) => s.queue.push(res));
  else s.inFlight++;
  const now = Date.now();
  const wait = Math.max(0, s.nextAt - now);
  s.nextAt = Math.max(now, s.nextAt) + p.delayMs;
  if (wait > 0) await sleep(wait);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = s.queue.shift();
    if (next) next(); else s.inFlight--;
  };
}

/** Push a host's next allowed request out by ms — a refusal slows every worker on it. */
export function backoffHost(host, ms) {
  if (!host || exempt(host) || !(ms > 0)) return 0;
  const s = stateFor(host);
  s.nextAt = Math.max(s.nextAt, Date.now() + ms);
  return ms;
}

// Retry-After is seconds OR an HTTP-date (RFC 9110 10.2.3). Both shapes appear in the wild.
export function retryAfterMs(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return Number(s) * 1000;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : Math.max(0, t - Date.now());
}

// The transport-level shape of a refusal. A WAF that drops the socket produces one of these
// rather than a status code, and without this test it is indistinguishable from bad wifi in
// failures.json — which is how a block gets recorded as a flaky network read.
const RESET_SHAPE = /ECONNRESET|socket hang up|other side closed|terminated|EPIPE|ECONNREFUSED/i;
export function looksLikeReset(err) { return RESET_SHAPE.test(String(err || '')); }

// THE ERROR MESSAGE IS NOT THE ERROR. Node's fetch reports every transport failure as the
// same five characters — "fetch failed" — and puts what actually happened in .cause, where
// ECONNRESET, ECONNREFUSED and ENOTFOUND all live. Recording e.message alone wrote a WAF
// dropping the socket into failures.json in the identical words as a DNS typo, and that is
// why no run of this tool has ever reported a reset: it could not see one.
export function errText(e) {
  const parts = [];
  let cur = e, guard = 0;
  while (cur && guard++ < 4) {
    if (cur.code && !parts.includes(String(cur.code))) parts.push(String(cur.code));
    if (cur.message && !parts.includes(String(cur.message))) parts.push(String(cur.message));
    cur = cur.cause;
  }
  return parts.join(': ') || String(e);
}

// --- the tripwire ----------------------------------------------------------
// Once a host has HARD refused, every further request to it in this process short-circuits.
// What each stage records in failures.json is unchanged; what changes is that the stage
// stops asking. A caller that never inspects its own results can no longer turn one refusal
// into five hundred, which is the shape that converts a block into an IP ban.
//
// A 403 alone does not trip it. A client's own storage bucket answered 262 images with 403
// on one build while serving the rest — a host that answers ANY request is not refusing us,
// so the forbidden count only trips while that host has produced no successful reply at all.
const forbiddenTrip = () => Math.max(1, Number(process.env.SR_FORBIDDEN_TRIP || 10));
const trips = new Map();   // host -> { ok, forbidden, reason }

function tripState(host) {
  let t = trips.get(host);
  if (!t) { t = { ok: 0, forbidden: 0, reason: null }; trips.set(host, t); }
  return t;
}
function noteOk(host) { if (host && !exempt(host)) tripState(host).ok++; }
function noteForbidden(host) {
  if (!host || exempt(host)) return;
  const t = tripState(host);
  t.forbidden++;
  if (!t.reason && t.ok === 0 && t.forbidden >= forbiddenTrip()) t.reason = 'forbidden';
}
function tripHard(host, reason) {
  if (!host || exempt(host)) return;
  const t = tripState(host);
  if (!t.reason) t.reason = reason;
}

/** The reason a host is being skipped this run, or null. */
export function hostTripped(host) {
  const t = trips.get(String(host || '').toLowerCase());
  return t && t.reason ? t.reason : null;
}
/** Every host this process stopped asking, for the run summary. */
export function trippedHosts() {
  return [...trips.entries()].filter(([, t]) => t.reason)
    .map(([host, t]) => ({ host, reason: t.reason, forbidden: t.forbidden }));
}
/** Test seam. */
export function resetTrips() { trips.clear(); }

// `headers` is threaded from the project record so every stage fetches the source the SAME
// way. It exists because a storefront can serve a DIFFERENT PAGE to the same URL depending
// on where the request comes from: shop.suitednyc.com answered a Manila IP with 363 prices
// in Philippine pesos and country_code="PH", and the clone froze that — a US shop whose
// static copy quotes the wrong currency. The locale is a property of the REQUEST, so pinning
// it belongs at the only place requests are made. Caller-supplied keys win over the defaults.
export async function fetchOnce(url, opts = {}) {
  const {
    timeoutMs = 20000, userAgent = DEFAULT_UA, method = 'GET', accept = '*/*', headers = {},
  } = opts;
  // A slot held by the caller is not taken again: get() holds one for the whole hop, and a
  // second acquire on the same host would wait for a slot the same call already owns —
  // a deadlock at cap 1 rather than a slow request.
  const release = opts._heldSlot ? () => {} : await acquire(hostOf(url));
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      redirect: 'manual',
      signal: ac.signal,
      headers: { 'user-agent': userAgent, accept, 'accept-language': 'en-US,en;q=0.9', ...headers },
    });
    return { ok: true, res, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, error: errText(e), ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
    release();
  }
}

// Follows redirects manually so the chain is recorded as evidence (BYLAW 6:
// a redirect the old site served is part of the SEO surface and must survive).
export async function get(url, opts = {}) {
  const {
    maxRedirects = 6, retries = 2, retryDelayMs = 700, binary = false,
    throttleRetries = 2, maxBackoffMs = 30000,
  } = opts;
  const chain = [];
  let current = url;
  let attempt = 0;
  let throttled = 0;

  // A host this run has already stopped asking. Checked before the ledger because it is the
  // cheaper test and the more recent evidence.
  const tripped = hostTripped(hostOf(url));
  if (tripped) {
    return {
      url, finalUrl: url, ok: false, status: 0, blocked: true, blockReason: 'tripped',
      error: 'stopped: ' + hostOf(url) + ' refused this run (' + tripped + ')', chain, ms: 0,
    };
  }

  // A host that has already refused this scanner is not requested again. Retrying is how
  // one refusal becomes an IP ban, and the sanctioned route past a block is an allowlist
  // entry from the site owner, never another attempt.
  const hit = ledgerHit(hostOf(url));
  if (hit) {
    return {
      url, finalUrl: url, ok: false, status: 0, blocked: true, blockReason: 'ledger',
      error: 'refused-previously: ' + hit.host + ' is in the scan block ledger' +
        (hit.ts ? ' (' + hit.ts + ')' : ''),
      chain, ms: 0,
    };
  }

  for (let hop = 0; hop <= maxRedirects; hop++) {
    // The slot covers the whole hop — request, redirect decision, backoff sleep and body
    // read. Releasing at the headers, as an acquire inside fetchOnce does, counts a 4 MB
    // image as finished while it is still arriving, and the cap then means nothing on
    // exactly the stage that downloads 500 of them.
    const release = await acquire(hostOf(current));
    try {
    const r = await fetchOnce(current, { ...opts, _heldSlot: true });
    if (!r.ok) {
      const reset = looksLikeReset(r.error);
      if (attempt < retries) {
        attempt++;
        // A reset is a refusal until proven otherwise, so it backs the whole host off
        // rather than only delaying this one retry.
        if (reset) backoffHost(hostOf(current), Math.min(maxBackoffMs, 2000 * attempt));
        await sleep(retryDelayMs * attempt);
        hop--;
        continue;
      }
      if (reset) tripHard(hostOf(current), 'connection-reset');
      return {
        url, finalUrl: current, ok: false, status: 0, error: r.error, chain, ms: r.ms,
        blocked: reset, ...(reset ? { blockReason: 'connection-reset' } : {}),
      };
    }
    const res = r.res;
    const status = res.status;
    const loc = res.headers.get('location');

    // --- the host said slow down -------------------------------------------
    // 429 and 503 are the two codes that mean "not now" rather than "not ever" (RFC 9110
    // 15.5.30 / 15.6.4). Honour Retry-After when it is sent, exponential otherwise, and
    // push the wait onto the HOST so the other workers in the pool wait too. Without this a
    // rate limit changed nothing: the response was recorded as a plain failure and the next
    // request went out at the same speed a millisecond later.
    if (status === 429 || status === 503) {
      const ra = retryAfterMs(res.headers.get('retry-after'));
      // A Retry-After LONGER than we are willing to wait is not a number to clamp. Clamping
      // it retried a host that had asked for an hour after 30 seconds — the one behaviour
      // the header exists to prevent, performed in the name of honouring it. Measured
      // 2026-09-09: Retry-After 3600 produced a second request 817 ms later.
      if (ra !== null && ra > maxBackoffMs) {
        backoffHost(hostOf(current), ra);
        tripHard(hostOf(current), 'throttled');
        return {
          url, finalUrl: current, ok: false, status, blocked: true, blockReason: 'throttled',
          error: 'throttled: HTTP ' + status + ', Retry-After ' + Math.round(ra / 1000) +
            's exceeds the ' + Math.round(maxBackoffMs / 1000) + 's backoff cap — not retried',
          retryAfterMs: ra, chain, ms: r.ms,
        };
      }
      const waitMs = Math.min(maxBackoffMs, ra === null ? retryDelayMs * Math.pow(2, throttled + 1) : ra);
      backoffHost(hostOf(current), waitMs);
      if (throttled < throttleRetries) {
        throttled++;
        await sleep(waitMs);
        hop--;
        continue;
      }
      tripHard(hostOf(current), 'throttled');
      return {
        url, finalUrl: current, ok: false, status, blocked: true, blockReason: 'throttled',
        error: 'throttled: HTTP ' + status + ' after ' + throttled + ' backoff(s)',
        retryAfterMs: ra, chain, ms: r.ms,
      };
    }

    // 401/403 are answers, not congestion. They are NEVER retried — they are reported with
    // the flag that says this was a refusal and not a missing file.
    if (status === 403 || status === 401) {
      noteForbidden(hostOf(current));
      return {
        url, finalUrl: current, ok: false, status, blocked: true, blockReason: 'forbidden',
        error: 'refused: HTTP ' + status, chain, ms: r.ms,
      };
    }

    if (status >= 300 && status < 400 && loc) {
      let next;
      try { next = new URL(loc, current).toString(); } catch { next = null; }
      chain.push({ from: current, status, to: next });
      if (!next || chain.length > maxRedirects) {
        return { url, finalUrl: current, ok: false, status, error: 'redirect-loop-or-bad-location', chain, ms: r.ms };
      }
      current = next;
      continue;
    }
    const headers = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    let body;
    try {
      body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (e) {
      return { url, finalUrl: current, ok: false, status, error: 'body-read-failed: ' + String(e.message || e), chain, headers, ms: r.ms };
    }
    noteOk(hostOf(current));
    return {
      url, finalUrl: current, ok: status >= 200 && status < 300, status, headers, body,
      bytes: binary ? body.length : Buffer.byteLength(body, 'utf8'),
      contentType: (headers['content-type'] || '').split(';')[0].trim().toLowerCase(),
      chain, ms: r.ms,
    };
    } finally { release(); }
  }
  return { url, finalUrl: current, ok: false, status: 0, error: 'too-many-redirects', chain, ms: 0 };
}

// robots.txt: returns { raw, sitemaps[], disallow[] } for the given user-agent
// group plus "*". Parsed for EVIDENCE and for sitemap discovery.
export function parseRobots(raw) {
  const out = { raw: String(raw || ''), sitemaps: [], disallow: [], allow: [] };
  let inStar = false;
  for (const line of out.raw.split(/\r?\n/)) {
    const l = line.replace(/#.*$/, '').trim();
    if (!l) continue;
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(l);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === 'sitemap') out.sitemaps.push(val);
    else if (key === 'user-agent') inStar = val === '*';
    else if (key === 'disallow' && inStar && val) out.disallow.push(val);
    else if (key === 'allow' && inStar && val) out.allow.push(val);
  }
  return out;
}

// robotsMatcher — the rules as robots.txt writes them, applied to path AND query.
//
// ⚖ A RULE MATCHED MORE BROADLY THAN IT IS WRITTEN IS A DIFFERENT RULE.
// Measured 2026-09-18 on a live Shopify storefront: sr-crawl reduced each rule with
// `d.split('*')[0]`, so `Disallow: /*/collections/*sort_by*` — a rule about ONE sort parameter —
// became `/` and blocked all 2002 sitemap URLs. The crawl fetched nothing and every stage after
// it still reported success over an empty harvest.
//
// The three things that reduction lost, all of them in the spec every crawler is measured against:
//   · `*` matches any run of characters ANYWHERE in the rule, not only at its end
//   · `$` anchors the rule to the end of the address
//   · the rule is matched against the path AND the query string, which is where `sort_by` lives
// and one thing the caller lost: `Allow:` was parsed and never consulted. Precedence is the
// documented one — the LONGEST matching rule wins, and Allow wins a tie, so a site that opens a
// subtree inside a blocked one is crawled the way its owner asked.
function robotsRuleToRegExp(rule) {
  const anchored = /\$$/.test(rule);
  const body = anchored ? rule.slice(0, -1) : rule;
  const escaped = body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + escaped + (anchored ? '$' : ''));
}

export function robotsMatcher(parsed) {
  const compile = (list) => (list || [])
    .map((r) => String(r).trim())
    .filter(Boolean)
    .map((r) => ({ rule: r, len: r.replace(/[*$]/g, '').length, re: robotsRuleToRegExp(r) }));
  const disallow = compile(parsed && parsed.disallow);
  const allow = compile(parsed && parsed.allow);
  if (!disallow.length) return () => false;
  return (u) => {
    let target;
    try { const url = new URL(u); target = url.pathname + url.search; } catch { return false; }
    // normalizeUrl strips a trailing slash, so `/private/` reaches here as `/private`. A rule that
    // names a directory still covers it — tested both ways, so `/privatelabel` stays untouched.
    const forms = target.endsWith('/') ? [target] : [target, target + '/'];
    const best = (rules) => rules.reduce((m, r) => (forms.some((f) => r.re.test(f)) && r.len > m ? r.len : m), -1);
    const d = best(disallow);
    if (d < 0) return false;
    return best(allow) < d;
  };
}

export function parseSitemap(xml) {
  const s = String(xml || '');
  const urls = [];
  const nested = [];
  const isIndex = /<sitemapindex[\s>]/i.test(s);
  const re = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(s))) {
    const v = m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    if (!v) continue;
    if (isIndex) nested.push(v); else urls.push(v);
  }
  return { urls, nested, isIndex };
}
