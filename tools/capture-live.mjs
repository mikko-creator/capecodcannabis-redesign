#!/usr/bin/env node
// capture-live.mjs — run site-reforge's computed-style harvest (sr-capture --emit / --emit-scroll) in headless Chrome
// on live pages, at exact widths, and fold each result in with `sr-capture --merge --side baseline`.
//
//   node tools/capture-live.mjs --urls <file, one URL per line> [--widths 390,768,1024,1440]
//        [--shots tmp/source-shots --shot-widths 1440,390] [--scroll-urls <file>] [--side baseline] [--no-merge]
//
// - Each page is LOADED ONCE; the viewport is then resized per width (media queries re-evaluate), the page is scrolled
//   top to bottom so lazy images load, and the harvest runs. The returned viewport.w must equal the intended width
//   (a resize that did not take is a capture of the wrong page state) or the capture is rejected.
// - The Age Gate plugin overlay is passed the way a visitor passes it: its "Yes" button is clicked once; the plugin's
//   own cookie then carries the session. Nothing about the browser's identity is changed.
// - Analytics, ad pixels and push/loyalty widgets are blocked so the client's statistics do not record our visits.
// Node builtins + tools/cdp.mjs. Writes tmp/capture-raw/*.json, audit/capture/* (via merge), and screenshots.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './cdp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(here, '..');
const SR = path.join(os.homedir(), '.claude', 'skills', 'site-reforge', 'scripts', 'sr-capture.mjs');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (!k.startsWith('--')) continue;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) args[k.slice(2)] = true; else { args[k.slice(2)] = v; i++; }
}
const readList = (f) => (f ? fs.readFileSync(path.resolve(f), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#')) : []);
const urls = readList(args.urls);
const scrollUrls = new Set(readList(args['scroll-urls']));
const widths = String(args.widths || '390,768,1024,1440').split(',').map(Number);
const shotWidths = new Set(String(args['shot-widths'] || '').split(',').filter(Boolean).map(Number));
const shotsDir = args.shots ? path.resolve(PROJ, args.shots) : null;
const side = args.side === 'rebuild' ? 'rebuild' : 'baseline';
const HEIGHT = { 390: 844, 768: 1024, 1024: 768, 1280: 585, 1366: 768, 1440: 900, 1600: 662, 1920: 1080 };
const BLOCK = [
  '*googletagmanager.com*', '*google-analytics.com*', '*analytics.google.com*', '*doubleclick.net*', '*facebook.net*',
  '*facebook.com/tr*', '*connect.facebook*', '*sst.capecodcannabis.com*', '*alpineiq.com*', '*onesignal.com*',
  '*analytics.ahrefs.com*', '*wpmudev.com*', '*wpmucdn.com/analytics*', '*hotjar*', '*clarity.ms*', '*bing.com/bat*',
];
if (!urls.length) { console.error('no URLs (--urls <file>)'); process.exit(2); }
const HARVEST = execFileSync(process.execPath, [SR, '--emit'], { encoding: 'utf8' });
const SCROLLJS = execFileSync(process.execPath, [SR, '--emit-scroll'], { encoding: 'utf8' });
const rawDir = path.join(PROJ, 'tmp', 'capture-raw');
fs.mkdirSync(rawDir, { recursive: true });
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
const slugOf = (u) => { const p = new URL(u).pathname.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); return p || 'index'; };

const report = { generated: new Date().toISOString(), side, widths, pages: [] };
const browser = await launch();
let gatePassed = false;
try {
  const pg = await browser.newPage({ width: widths[0], height: HEIGHT[widths[0]] || 900 });
  await pg.send('Network.setBlockedURLs', { urls: BLOCK });
  for (const url of urls) {
    const rec = { url, captures: [], errors: [] };
    report.pages.push(rec);
    try {
      await pg.viewport(widths[0], HEIGHT[widths[0]] || 900);
      const landed = await pg.goto(url, { settle: 1500 });
      rec.landed = landed;
      // Age gate: click "Yes" once if the overlay is up.
      const gate = await pg.eval(`(() => { const b = document.querySelector('.age-gate-submit-yes, button[data-submit="yes"]'); const vis = b && b.offsetParent !== null; if (vis) { b.click(); return 'clicked'; } return b ? 'present-hidden' : 'absent'; })()`);
      rec.ageGate = gate;
      if (gate === 'clicked') { gatePassed = true; await sleep(1500); }
      rec.title = await pg.eval('document.title');
      for (const w of widths) {
        await pg.viewport(w, HEIGHT[w] || 900);
        await sleep(700);
        // Scroll the whole page in viewport steps so lazy images and reveal-on-scroll content settle, then return.
        await pg.eval(`(async () => { const H = () => document.documentElement.scrollHeight; let y = 0; for (let i = 0; i < 80 && y < H(); i++) { y += innerHeight * 0.8; scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 400)); if (document.fonts && document.fonts.ready) await document.fonts.ready; const imgs = [...document.images].filter(i => !i.complete); await Promise.race([Promise.all(imgs.map(i => new Promise(r => { i.onload = i.onerror = r; }))), new Promise(r => setTimeout(r, 4000))]); return true; })()`, { timeout: 90000 });
        await sleep(500);
        const cap = await pg.eval(HARVEST, { timeout: 90000 });
        if (!cap || !cap.viewport || cap.viewport.w !== w) { rec.errors.push(`w=${w}: viewport mismatch (${cap && cap.viewport && cap.viewport.w})`); continue; }
        const f = path.join(rawDir, `${side}.${slugOf(url)}.${w}.style.json`);
        fs.writeFileSync(f, JSON.stringify(cap));
        rec.captures.push({ w, file: path.relative(PROJ, f), elements: (cap.elements || []).length, truncated: !!(cap.document && cap.document.truncated), keyframes: (cap.keyframes || []).length, animations: (cap.animations || []).length, unreadableSheets: (cap.unreadableSheets || []).length });
        if (shotsDir && shotWidths.has(w)) {
          const shot = path.join(shotsDir, `${slugOf(url)}.${w}.png`);
          await pg.screenshot(shot, { full: true });
          rec.captures[rec.captures.length - 1].shot = path.relative(PROJ, shot);
        }
        if (scrollUrls.has(url) && (w === 1440 || w === 390)) {
          await pg.eval('scrollTo(0,0)'); await sleep(400);
          const sc = await pg.eval(SCROLLJS, { timeout: 120000 });
          if (sc && sc.viewport && sc.viewport.w === w) {
            const sf = path.join(rawDir, `${side}.${slugOf(url)}.${w}.scroll.json`);
            fs.writeFileSync(sf, JSON.stringify(sc));
            rec.captures.push({ w, kind: 'scroll', file: path.relative(PROJ, sf), reveals: (sc.reveals || []).length });
          } else rec.errors.push(`w=${w}: scroll capture viewport mismatch`);
        }
      }
    } catch (e) { rec.errors.push(String(e && e.message || e).slice(0, 300)); }
    const ok = rec.captures.filter((c) => c.kind !== 'scroll').length;
    console.log(`${ok === widths.length ? 'OK  ' : 'PART'} ${url}  title="${(rec.title || '').slice(0, 70)}" gate=${rec.ageGate} caps=${ok}/${widths.length}${rec.errors.length ? ' ERR ' + rec.errors.join(' | ') : ''}`);
  }
} finally { await browser.close(); }

// Fold every capture in through the skill's own merge (it validates the schema and names the file).
if (!args['no-merge']) {
  for (const p of report.pages) for (const c of p.captures) {
    try { execFileSync(process.execPath, [SR, '--project', PROJ, '--merge', path.join(PROJ, c.file), '--side', side], { stdio: 'ignore' }); c.merged = true; }
    catch (e) { c.merged = false; p.errors.push('merge failed: ' + c.file); }
  }
}
report.gatePassed = gatePassed;
fs.writeFileSync(path.join(PROJ, 'tmp', `capture-report.${side}.json`), JSON.stringify(report, null, 1));
const caps = report.pages.flatMap((p) => p.captures);
console.log(`pages ${report.pages.length}, captures ${caps.length} (merged ${caps.filter((c) => c.merged).length}), errors ${report.pages.reduce((n, p) => n + p.errors.length, 0)}`);
