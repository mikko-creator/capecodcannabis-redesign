// test-removals-d.mjs: positive and negative controls for the per-lane declaration files that tools/text-parity.mjs
// reads (src/content/removals.json PLUS src/content/removals.d/*.json, BUILD-CONTRACT 4.16.2). Owner: lane P0.
// Every plant is made in temp copies (a copied built page, temp removals.d directories passed with --removals-dir),
// never in src/content and never in the dist being checked.
//
//   node tools/tests/test-removals-d.mjs [--built <dist>] [--slug <page slug>] [--work <dir>]
//     --built  the build to copy one page from (default dist)
//     --slug   the page to copy (default home); it must be clean in that build
//     --work   where the temp copies go (default a new directory under the OS temp dir, removed afterwards)
// Exit 0 when every check passes, 1 otherwise.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(here, '..', '..');
const TOOL = path.join(WS, 'tools', 'text-parity.mjs');
const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const built = path.resolve(arg('--built', path.join(WS, 'dist')));
const slug = arg('--slug', 'home');
const ownWork = !arg('--work');
const work = ownWork ? fs.mkdtempSync(path.join(os.tmpdir(), 'sr-removals-d-')) : path.resolve(arg('--work'));
fs.mkdirSync(work, { recursive: true });

let fails = 0;
const check = (label, ok, detail = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  -- ' + detail : '')); if (!ok) fails++; };
const posix = (f) => f.split(path.sep).join('/');
// how text-parity names a file: workspace-relative when inside the workspace, else the absolute path (posix slashes)
const shown = (f) => { const r = path.relative(WS, f); return posix(r && !r.startsWith('..') && !path.isAbsolute(r) ? r : f); };

// an invented sentence that occurs nowhere in any source page
const PLANT = 'Quokka harbor lanterns hum softly at dusk.';
const index = JSON.parse(fs.readFileSync(path.join(WS, 'src/content/pages/_index.json'), 'utf8'));
const entry = index.pages.find((p) => p.slug === slug);
if (!entry) { console.log('FAIL no page with slug ' + slug); process.exit(1); }
const relPath = (() => { try { return decodeURIComponent(entry.path); } catch { return entry.path; } })();
const srcFile = [path.join(built, entry.path, 'index.html'), path.join(built, relPath, 'index.html')].find((f) => fs.existsSync(f));
if (!srcFile) { console.log('FAIL built page not found for ' + entry.path + ' in ' + built); process.exit(1); }
const html = fs.readFileSync(srcFile, 'utf8');
if (!/<main\b[^>]*>/i.test(html)) { console.log('FAIL ' + srcFile + ' has no <main>'); process.exit(1); }

// temp copies: one dist with the page as built, one with the plant inserted at the top of <main>
const writePage = (dist, h) => { const f = path.join(work, dist, relPath, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, h); return path.join(work, dist); };
const cleanDist = writePage('dist-clean', html);
const plantDist = writePage('dist-plant', html.replace(/<main\b[^>]*>/i, (x) => x + '<p>' + PLANT + '</p>'));
const dropDir = (name, files) => {
  const d = path.join(work, name);
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  for (const [f, body] of Object.entries(files)) fs.writeFileSync(path.join(d, f), typeof body === 'string' ? body : JSON.stringify(body, null, 1));
  return d;
};
let runs = 0;
const parity = (dist, dir) => {
  const json = path.join(work, 'report-' + (++runs) + '.json');
  const r = spawnSync(process.execPath, [TOOL, '--built', dist, '--page', slug, '--removals-dir', dir, '--quiet', '--json', json], { encoding: 'utf8', timeout: 300000 });
  return { code: r.status, err: (r.stderr || '').trim(), report: fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, 'utf8')) : null };
};
const baseFile = JSON.parse(fs.readFileSync(path.join(WS, 'src/content/removals.json'), 'utf8'));
const baseId = (baseFile.allowedAdded || [])[0] && baseFile.allowedAdded[0].id;
const reason = 'test plant (tools/tests/test-removals-d.mjs), never shipped';

try {
  // 0. preconditions: the page as built is clean, and the plant fires when nothing declares it
  const empty = dropDir('d-empty', {});
  const c0 = parity(cleanDist, empty);
  check('precondition: the copied page as built is clean (exit 0, added 0)', c0.code === 0 && c0.report && c0.report.totals.added === 0, 'exit ' + c0.code + (c0.report ? ', added ' + c0.report.totals.added + ', recall ' + c0.report.totals.recall : ' ' + c0.err.slice(0, 300)));
  const c1 = parity(plantDist, empty);
  const added1 = c1.report ? c1.report.pages[0].added : [];
  check('control: the planted string is reported ADDED with no removals.d entry (exit 1)', c1.code === 1 && added1.length === 1 && added1[0] === PLANT, 'exit ' + c1.code + ', added ' + JSON.stringify(added1));

  // 1. a removals.d file excuses it, and the report names that file
  const good = dropDir('d-good', {
    'aa-other.json': { schema: 'ccc-reforge/removals@1', allowedAdded: [{ id: 'test-unrelated-label', text: 'Walrus button label never rendered', reason }] },
    'zz-plant.json': { schema: 'ccc-reforge/removals@1', removals: [], allowedAdded: [{ id: 'test-plant', text: PLANT, reason, pages: [entry.path] }] },
  });
  const c2 = parity(plantDist, good);
  const t2 = c2.report && c2.report.totals;
  const files2 = c2.report ? c2.report.declarationFiles.map((x) => x.file) : [];
  const want = shown(path.join(good, 'zz-plant.json'));
  const fromFile = t2 && Object.keys(t2.addedDeclaredByFile).find((f) => t2.addedDeclaredByFile[f]['test-plant']);
  check('declared: a removals.d entry excuses the planted string (exit 0, added 0)', c2.code === 0 && t2 && t2.added === 0 && t2.addedDeclaredBy['test-plant'] === 1, 'exit ' + c2.code + (t2 ? ', added ' + t2.added + ', addedDeclaredBy.test-plant ' + t2.addedDeclaredBy['test-plant'] : ' ' + c2.err.slice(0, 300)));
  check('declared: the report names the file the entry came from', fromFile === want, 'test-plant <- ' + fromFile);
  check('declared: every file is read, base first, then removals.d in name order', files2.length === 3 && files2[0] === 'src/content/removals.json' && files2[1].endsWith('/aa-other.json') && files2[2].endsWith('/zz-plant.json'), JSON.stringify(files2));

  // 2. malformed declaration files exit 2 and name the file
  const bad = {
    'not valid JSON': { 'bad.json': '{ "allowedAdded": [ { "id": "x", ' },
    'an empty file': { 'empty.json': '' },
    'an entry without a reason': { 'bad.json': { allowedAdded: [{ id: 'test-no-reason', text: PLANT }] } },
    'an entry without text or pattern': { 'bad.json': { removals: [{ id: 'test-no-text', reason }] } },
    'a list that is not an array': { 'bad.json': { allowedAdded: { id: 'test-obj', text: PLANT, reason } } },
    'a bad pattern': { 'bad.json': { allowedAdded: [{ id: 'test-bad-re', pattern: '([a-z', reason }] } },
    'a wrong schema': { 'bad.json': { schema: 'ccc-reforge/removals@2', allowedAdded: [] } },
    'an id repeated across two removals.d files': { 'a.json': { allowedAdded: [{ id: 'test-dup', text: PLANT, reason }] }, 'b.json': { removals: [{ id: 'test-dup', text: 'Other words here.', reason }] } },
    'an id repeated within one list': { 'bad.json': { allowedAdded: [{ id: 'test-dup2', text: PLANT, reason }, { id: 'test-dup2', text: 'Other words here.', reason }] } },
    ['an id already declared in the base file (' + baseId + ')']: { 'bad.json': { allowedAdded: [{ id: baseId, text: PLANT, reason }] } },
  };
  let k = 0;
  for (const [what, files] of Object.entries(bad)) {
    const d = dropDir('d-bad-' + (++k), files);
    const r = parity(plantDist, d);
    const named = Object.keys(files).some((f) => r.err.includes(shown(path.join(d, f)) + ':'));
    check('malformed: ' + what + ' -> exit 2 naming the file', r.code === 2 && named, 'exit ' + r.code + ', ' + (r.err.split('\n').find((l) => l.startsWith('  - ')) || r.err).trim().slice(0, 240));
  }
} finally {
  if (ownWork) fs.rmSync(work, { recursive: true, force: true });
}
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASS');
process.exit(fails ? 1 : 0);
