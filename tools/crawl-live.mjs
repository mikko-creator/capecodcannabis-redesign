#!/usr/bin/env node
// Launches the patched local crawler (tools/sr-local/sr-crawl.mjs) against capecodcannabis.com with
// the measured --defer / --exclude patterns. The patterns live here, in a file, because a shell can
// collapse their backslashes. Extra args pass through (e.g. --defer-stop, --checkpoint 50, --max N).
//
// EXCLUDE — never requested, counted as counts.excludedByPattern with a sample in discovery:
//   The Events Calendar month/today/day/week/photo/map/summary views and dated views page forward
//   without end; ?ical= / ?outlook-ical= / /feed are calendar and RSS exports, not pages; ?brand= is a
//   measured duplicate (identical text, canonical to the plain brand URL); ?s= is site search;
//   ?replytocom= duplicates a post; /wp-json, xmlrpc.php and wp-login.php are endpoints.
//   normalizeUrl strips trailing slashes, so no pattern may require one.
// DEFER — the 5,857 /products/ pages are served after every other page.
// Tested: scratchpad crawltest/test-patterns.mjs (15 exclude, 18 keep, 5 defer cases).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXCLUDE = '/events-calendar/(month|today|day|week|photo|map|summary)(/|$|\\?)|/events-calendar/\\d{4}-\\d{2}|[?&](ical|outlook-ical|tribe-bar-date|tribe-bar-search|tribe_eventcategory|eventDate|replytocom|s|brand)=|/feed(/|$|\\?)|/wp-json(/|$|\\?)|xmlrpc\\.php|/wp-login\\.php';
export const DEFER = '/products/';

// Spawn ONLY when executed directly. On 2026-10-12 an `import` of this file to read EXCLUDE started
// a live crawl; importing it must stay side-effect free.
const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
// Breakers are ON by default since the 2026-10-12 lockout: stop at the first 403 (and ledger the host), stop on a
// burst of 8 x 404 in 5 minutes, and never re-request a URL already recorded as 404/410. The project ledger
// (audit/scan-blocked-hosts.json) is enforced through SR_BLOCK_LEDGER: a ledgered host is refused before any request.
export const BREAKERS = ['--stop-on-403', '--max-404', '8', '--window-min', '5', '--skip-known-404'];
if (IS_MAIN) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const proj = path.resolve(here, '..');
  const crawler = path.join(here, 'sr-local', 'sr-crawl.mjs');
  const args = [crawler, '--project', proj, '--defer', DEFER, '--exclude', EXCLUDE, ...BREAKERS, ...process.argv.slice(2)];
  const env = { ...process.env, SR_BLOCK_LEDGER: path.join(proj, 'audit', 'scan-blocked-hosts.json') };
  const child = spawn(process.execPath, args, { stdio: 'inherit', env });
  child.on('exit', (code) => process.exit(code ?? 1));
}
