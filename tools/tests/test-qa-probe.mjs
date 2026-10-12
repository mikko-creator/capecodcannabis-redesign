// Positive and negative controls for tools/qa-probe.mjs: the defective fixture must fail EVERY check, the clean
// fixture must pass every check. Serves tools/tests/qa-fixture/ on a loopback port with tools/serve.mjs.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tools = path.resolve(here, '..');
const fixture = path.join(here, 'qa-fixture');
const port = 8797;
const server = spawn(process.execPath, [path.join(tools, 'serve.mjs'), '--root', fixture, '--port', String(port), '--no-open'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));
const CHECKS = ['sharp', 'header', 'overflow', 'glass', 'contrast', 'protrude', 'motion', 'errors'];
let fails = 0;
const check = (label, ok, detail = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  — ' + detail : '')); if (!ok) fails++; };
const runProbe = (page) => {
  const out = path.join(here, 'qa-fixture', `report-${page}.json`);
  const r = spawnSync(process.execPath, [path.join(tools, 'qa-probe.mjs'), '--url', `http://127.0.0.1:${port}/${page}.html`, '--sizes', '1280x585@1.5,390x844@3', '--json', out, '--settle', '500'], { encoding: 'utf8', timeout: 300000 });
  return { code: r.status, out: r.stdout + r.stderr, report: fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null };
};
try {
  const bad = runProbe('bad');
  check('bad: probe exits 1', bad.code === 1, String(bad.code));
  for (const c of CHECKS) {
    const hit = bad.report && bad.report.sizes.every((s) => s.failures.some((f) => f.startsWith(c + ':')));
    check(`bad: "${c}" fires at every size`, !!hit, bad.report ? bad.report.sizes.map((s) => s.size + ' ' + s.failures.filter((f) => f.startsWith(c + ':')).length).join(', ') : 'no report');
  }
  const good = runProbe('good');
  check('good: probe exits 0', good.code === 0, String(good.code) + (good.code ? ' ' + good.out.slice(0, 600) : ''));
  for (const c of CHECKS) {
    const quiet = good.report && good.report.sizes.every((s) => !s.failures.some((f) => f.startsWith(c + ':')));
    check(`good: "${c}" stays quiet`, !!quiet, good.report ? good.report.sizes.map((s) => s.failures.filter((f) => f.startsWith(c + ':')).join(' | ')).join(' || ') : 'no report');
  }
  // The clean fixture really measured something (a probe that returns nothing passes everything).
  const g = good.report && good.report.sizes[0];
  check('good: measured >= 1 image, >= 1 glass panel, >= 1 text on glass, >= 1 protrusion', !!g && g.sharp.length >= 1 && g.glass.length >= 1 && g.contrast.length >= 1 && g.protrude.length >= 1, g ? `img ${g.sharp.length}, glass ${g.glass.length}, text ${g.contrast.length}, protrude ${g.protrude.length}` : 'no report');
} finally { server.kill(); }
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
