// The live crawl's --exclude and --defer patterns, tested on normalized URLs (no trailing slash).
// Imported from the launcher itself, so the test covers exactly what runs (and proves the import
// is side-effect free: it must not start a crawl).
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { EXCLUDE, DEFER } = await import(pathToFileURL(path.join(os.homedir(), 'capecodcannabis-reforge', 'tools', 'crawl-live.mjs')).href);
const B = 'https://capecodcannabis.com';
const mustExclude = [
  '/events-calendar/month', '/events-calendar/month/2026-11', '/events-calendar/today', '/events-calendar/day/2026-11-05',
  '/events-calendar/2026-11-05', '/events-calendar?ical=1', '/events-calendar/list?outlook-ical=1', '/events-calendar/feed',
  '/brands/boutiq?brand=Boutiq', '/?s=moonrocks', '/wp-json/tribe/events/v1', '/xmlrpc.php',
  '/what-is-a-cannabis-moonrock?replytocom=12', '/event/boutiq-pop-up?ical=1', '/events-calendar/list?tribe-bar-date=2026-11-01',
];
const mustKeep = [
  '/', '/events-calendar', '/events-calendar/list', '/events-calendar/page/2', '/events-calendar/list?eventDisplay=past',
  '/event/boutiq-pop-up', '/brands/boutiq', '/brands', '/specials/wana-gummies-2-for-55', '/feedback-page', '/monthly-specials',
  '/products', '/products/flower-popcorn-half-ounce-claravita-maui-waui-sdh-14g-for-sale-wellfleet-ma',
  '/categories/flower/infused-buds', '/terpenes/%ce%b1-phellandrene', '/cannabis-101?sort=x', '/our-blog/page/2', '/menu',
];
const ex = new RegExp(EXCLUDE), de = new RegExp(DEFER);
let fails = 0;
for (const p of mustExclude) if (!ex.test(B + p)) { console.log('FAIL not excluded: ' + p); fails++; }
for (const p of mustKeep) if (ex.test(B + p)) { console.log('FAIL wrongly excluded: ' + p); fails++; }
const deferYes = ['/products/flower-popcorn-half-ounce-claravita-maui-waui-sdh-14g-for-sale-wellfleet-ma'];
const deferNo = ['/products', '/brands/boutiq', '/categories/concentrates', '/specials/wana-gummies-2-for-55'];
for (const p of deferYes) if (!de.test(B + p)) { console.log('FAIL not deferred: ' + p); fails++; }
for (const p of deferNo) if (de.test(B + p)) { console.log('FAIL wrongly deferred: ' + p); fails++; }
console.log(`${mustExclude.length} exclude, ${mustKeep.length} keep, ${deferYes.length + deferNo.length} defer cases: ${fails ? fails + ' FAILED' : 'ALL PASS'}`);
console.log('EXCLUDE=' + EXCLUDE);
process.exit(fails ? 1 : 0);
