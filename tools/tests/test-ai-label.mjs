#!/usr/bin/env node
// test-ai-label.mjs - the AI label ships in the WebP variants (BUILD-CONTRACT 4.17.12, DESIGN-SPEC R-40). P1, 2026-10-12.
//   node tools/tests/test-ai-label.mjs [--keep]
// Runs src/lib/images.mjs's ImagePipeline (cwebp, then webpmux for AI files) on one file from assets/generated/ and one
// from assets/source/, twice, each run with its own empty cache, into tmp/p1/test-ai-label/ (removed unless --keep):
//   1. every variant of the generated file is named <sha12>-<w>-ai.webp, its cache name carries -xmp<sha8>, and it holds
//      the bytes "trainedAlgorithmicMedia"; publish() lists it in aiVariants;
//   2. the source photo's variants carry no "-ai" marker and no label (control: the check can tell the two apart);
//   3. the two runs give byte-identical files (cwebp and webpmux are deterministic);
//   4. an unlabelled variant planted in the cache under the pre-label cache name is never reused.
// Exit 0 when every check passes, 1 otherwise. Node builtins + cwebp/webpmux on PATH. No network.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { ImagePipeline, AI_NEEDLE } = await import(pathToFileURL(path.join(ROOT, 'src/lib/images.mjs')).href);
const WORK = path.join(ROOT, 'tmp', 'p1', 'test-ai-label');
const GEN = fs.readdirSync(path.join(ROOT, 'assets/generated')).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort()[0];
const SRC = fs.readdirSync(path.join(ROOT, 'assets/source')).filter((f) => /\.jpe?g$/i.test(f)).sort()[0];
if (!GEN || !SRC) { console.error('no input files'); process.exit(1); }
const genRel = 'assets/generated/' + GEN, srcRel = 'assets/source/' + SRC;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const checks = [];
const check = (name, pass, detail) => { checks.push({ name, pass: !!pass, detail }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 220) : '')); };

fs.rmSync(WORK, { recursive: true, force: true });
async function runOnce(tag, plant) {
  const cacheDir = path.join(WORK, 'cache-' + tag), outDir = path.join(WORK, 'out-' + tag);
  fs.mkdirSync(cacheDir, { recursive: true });
  const P = new ImagePipeline({ cacheDir, outDir });
  const gv = P.variants(genRel, [320]);
  const sv = P.variants(srcRel, [320]);
  if (plant) {   // an unlabelled variant under the cache name used before the label existed
    const h12 = gv[0].url.split('/').pop().split('-')[0];
    fs.writeFileSync(path.join(cacheDir, h12 + '-' + gv[0].w + '-q80a90m4.webp'), fs.readFileSync(path.join(ROOT, 'tools/ai-label.xmp')).subarray(0, 0));
  }
  const stats = await P.run(2);
  const pub = P.publish();
  return { P, gv, sv, stats, pub, cacheDir, outDir };
}
const a = await runOnce('a', false);
const b = await runOnce('b', true);
check('both runs made every variant, none failed', a.stats.failed.length === 0 && b.stats.failed.length === 0 && a.stats.made === a.stats.planned && b.stats.made === b.stats.planned, { a: a.stats, b: b.stats });
const out = (r, v) => fs.readFileSync(path.join(r.outDir, v.url.replace(/^\//, '')));
check('generated file: every variant is named -ai.webp', a.gv.every((v) => /-ai\.webp$/.test(v.url)), a.gv.map((v) => v.url));
check('generated file: every cache name carries the label marker -xmp<sha8>', a.gv.every((v) => /-q80a90m4-xmp[0-9a-f]{8}\.webp$/.test(v.cache)), a.gv.map((v) => v.cache));
check('generated file: every variant holds "' + AI_NEEDLE + '"', a.gv.every((v) => out(a, v).includes(AI_NEEDLE)));
check('publish() lists exactly the generated variants in aiVariants', JSON.stringify(a.pub.aiVariants) === JSON.stringify(a.gv.map((v) => v.url.replace(/^\//, '')).sort()), a.pub.aiVariants);
check('control: the source photo\'s variants have no -ai marker and no label', a.sv.every((v) => !/-ai\.webp$/.test(v.url) && !out(a, v).includes(AI_NEEDLE)), a.sv.map((v) => v.url));
check('two runs, two empty caches: byte-identical outputs', [...a.gv, ...a.sv].every((v, i) => sha(out(a, v)) === sha(out(b, [...b.gv, ...b.sv][i]))));
check('an unlabelled variant planted under the pre-label cache name is not reused (run b still labelled)', b.gv.every((v) => out(b, v).includes(AI_NEEDLE)));
const ok = checks.every((c) => c.pass);
console.log((ok ? 'RESULT PASS ' : 'RESULT FAIL ') + checks.filter((c) => c.pass).length + '/' + checks.length + ' (generated: ' + genRel + ', source: ' + srcRel + ')');
if (!process.argv.includes('--keep')) fs.rmSync(WORK, { recursive: true, force: true });
process.exit(ok ? 0 : 1);
