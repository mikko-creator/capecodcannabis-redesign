// make-preview.mjs — turn dist/ into a GitHub Pages review copy.
//   node tools/make-preview.mjs [--out preview]
// The build's links are relative, so it works under https://<user>.github.io/<repo>/ as-is. This copies
// dist/ into --out (everything in --out except .git/ is replaced), marks EVERY page
// `noindex, nofollow` (the preview must never compete with the live site in search), adds .nojekyll
// (Pages would otherwise run Jekyll over the files), and fails if any root-absolute reference is left -
// under a Pages subpath those 404. The preview is derived: re-run this after every rebuild.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
// --dist dist-neo: preview another theme's build (default dist/, the glass design)
const DIST = path.resolve(ROOT, arg('dist', 'dist'));
const OUT = path.resolve(ROOT, arg('out', 'preview'));
// --keep a,b: entries of --out that survive the wipe besides .git (e.g. the glass preview keeps its neoclassical/ subfolder)
const KEEP = new Set(['.git', ...String(arg('keep', '') || '').split(',').map((s) => s.trim()).filter(Boolean)]);
if (OUT === ROOT || OUT === DIST || DIST.startsWith(OUT + path.sep) || OUT.startsWith(DIST + path.sep)) throw new Error('--out must not be the project, dist/ or contain/sit inside dist/: ' + OUT);
if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('no dist/index.html - run node src/build.mjs first');

fs.mkdirSync(OUT, { recursive: true });
for (const e of fs.readdirSync(OUT)) if (!KEEP.has(e)) fs.rmSync(path.join(OUT, e), { recursive: true, force: true });

const ROBOTS = '<meta name="robots" content="noindex, nofollow">';
// --prefix /<repo>: a Pages PROJECT site lives under /<repo>/. The pages are page-relative and need nothing, but
// 404.html is root-relative by design (the host serves it at any missing path), so its "/x" becomes "/<repo>/x".
// The BAD check below then runs on the rewritten text: only references outside the prefix count.
const PREFIX = (arg('prefix', '') || '').replace(/\/+$/, '');
if (PREFIX && !/^(\/[A-Za-z0-9._-]+)+$/.test(PREFIX)) throw new Error('--prefix must look like /repo-name or /repo-name/sub: ' + PREFIX);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const prefixed = (t) => !PREFIX ? t : t
  .replace(/(\b(?:href|src|action|poster|data-[a-z-]+)\s*=\s*")\/(?!\/)/gi, (m, a) => a + PREFIX + '/')
  .replace(/(\bsrcset\s*=\s*")([^"]*)"/gi, (m, a, v) => a + v.replace(/(^|,\s*)\/(?!\/)/g, '$1' + PREFIX + '/') + '"')
  .replace(/url\(\s*(['"]?)\/(?!\/)/gi, 'url($1' + PREFIX + '/');
const BAD = PREFIX
  ? new RegExp('\\b(?:href|src|action|poster|srcset|data-[a-z-]+)\\s*=\\s*"\\/(?!\\/)(?!' + esc(PREFIX.slice(1)) + '\\/)[^"]*"|url\\(\\s*[\'"]?\\/(?!\\/)(?!' + esc(PREFIX.slice(1)) + '\\/)', 'gi')
  : /\b(?:href|src|action|poster|srcset|data-[a-z-]+)\s*=\s*"\/(?!\/)[^"]*"|url\(\s*['"]?\/(?!\/)/gi;
// never index the preview: a disallow-all robots.txt replaces the live one (it only binds at a domain root, so the
// per-page meta robots above is what actually protects a project site). sitemap.xml is KEPT: it lists only the LIVE
// site's absolute URLs (never a preview URL), and the footer "Sitemap" link on every page points at it (dropping it
// left a 404 on all 350 pages - live crawl 2026-09-29).
const SKIP = new Set(['robots.txt']);
let files = 0, pages = 0, replaced = 0, inserted = 0;
const bad = [];
(function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) { copy(a, b); continue; }
    if (from === DIST && SKIP.has(e.name)) continue;
    files++;
    if (/\.html?$/i.test(e.name)) {
      pages++;
      let html = prefixed(fs.readFileSync(a, 'utf8'));
      if (/<meta\s+name="robots"[^>]*>/i.test(html)) { html = html.replace(/<meta\s+name="robots"[^>]*>/gi, ROBOTS); replaced++; }
      else { html = html.replace(/<head([^>]*)>/i, '<head$1>' + ROBOTS); inserted++; }
      for (const m of html.match(BAD) || []) bad.push(path.relative(DIST, a) + ': ' + m.slice(0, 80));
      fs.writeFileSync(b, html);
    } else {
      if (/\.(css|js)$/i.test(e.name)) for (const m of fs.readFileSync(a, 'utf8').match(BAD) || []) bad.push(path.relative(DIST, a) + ': ' + m.slice(0, 80));
      fs.copyFileSync(a, b);
    }
  }
})(DIST, OUT);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
// count only what THIS run wrote: a --keep folder (e.g. neoclassical/) is another build's preview with its own pages
const noindex = (function count(dir) { let n = 0; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.name === '.git' || (dir === OUT && KEEP.has(e.name))) continue; const p = path.join(dir, e.name); if (e.isDirectory()) n += count(p); else if (/\.html?$/i.test(e.name) && fs.readFileSync(p, 'utf8').includes(ROBOTS)) n++; } return n; })(OUT);
console.log('preview        ', OUT);
console.log('files          ', files, '| pages', pages, '| noindex', noindex, '(replaced', replaced, '/ inserted', inserted + ')');
console.log('root-absolute  ', bad.length);
if (bad.length) { for (const b of bad.slice(0, 20)) console.log('   ', b); process.exit(1); }
if (noindex !== pages) { console.log('NOT every page carries noindex'); process.exit(1); }
