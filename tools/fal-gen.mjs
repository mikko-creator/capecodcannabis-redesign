// fal-gen.mjs — generate the redesign's industry imagery with fal, optionally cut out the subject
// (transparent PNG) so it can break out of its frame. Node builtins only.
//
//   node tools/fal-gen.mjs --plan src/content/image-plan.json --key-file <path> [--only id1,id2] [--dry]
//
// The key is NEVER read from, or written into, the project tree: pass --key-file (outside the
// project) or set FAL_KEY. Every result is recorded in audit/generated-images.json with its prompt,
// model, seed and request id, and the raw fal output is kept beside the processed file.
// A plan entry already present on disk is skipped (resumable; generated images cost money).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PROJ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]]) : a), []));
const KEY = (process.env.FAL_KEY || (args['key-file'] ? fs.readFileSync(args['key-file'], 'utf8') : '')).trim();
if (!KEY) { console.error('no fal key: set FAL_KEY or pass --key-file'); process.exit(2); }
if (args['key-file'] && path.resolve(args['key-file']).startsWith(PROJ)) { console.error('refusing a key file inside the project tree'); process.exit(2); }

const plan = JSON.parse(fs.readFileSync(path.resolve(PROJ, args.plan || 'src/content/image-plan.json'), 'utf8'));
const OUT = path.join(PROJ, 'assets/generated');
const RAWDIR = path.join(OUT, 'raw');
fs.mkdirSync(RAWDIR, { recursive: true });
const RECORD = path.join(PROJ, 'audit/generated-images.json');
const rec = fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8'))
  : { schema: 'site-reforge/generated-images@2', provider: 'fal.ai', note: 'Illustrative industry imagery ADDED by the redesign. None stands in for a real person, place, product, brand or result of Cape Cod Cannabis; every alt describes what is depicted.', images: [], failures: [] };
const only = args.only ? new Set(String(args.only).split(',')) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function falRun(model, input) {
  // queue API: submit, poll status, fetch result — survives long generations
  const sub = await fetch('https://queue.fal.run/' + model, {
    method: 'POST', headers: { Authorization: 'Key ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!sub.ok) throw new Error(model + ' submit HTTP ' + sub.status + ' ' + (await sub.text()).slice(0, 300));
  const s = await sub.json();
  const t0 = Date.now();
  for (;;) {
    await sleep(1500);
    const st = await fetch(s.status_url, { headers: { Authorization: 'Key ' + KEY } });
    const sj = await st.json();
    if (sj.status === 'COMPLETED') break;
    if (sj.status === 'FAILED' || sj.error) throw new Error(model + ' failed: ' + JSON.stringify(sj).slice(0, 300));
    if (Date.now() - t0 > 240000) throw new Error(model + ' timed out');
  }
  const r = await fetch(s.response_url, { headers: { Authorization: 'Key ' + KEY } });
  if (!r.ok) throw new Error(model + ' result HTTP ' + r.status + ' ' + (await r.text()).slice(0, 300));
  return { requestId: s.request_id, result: await r.json() };
}

async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('download HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(file, buf);
  return buf.length;
}

const byId = new Map(rec.images.map((i) => [i.id, i]));
let made = 0, skipped = 0;
for (const item of plan.images) {
  if (only && !only.has(item.id)) continue;
  if (item.reuse) continue;   // a stand-in that reuses an already generated image: nothing to generate
  const ext = item.cutout ? 'png' : 'jpg';
  const finalRel = 'assets/generated/' + item.id + '.' + ext;
  const force = args.force && (args.force === true || String(args.force).split(',').includes(item.id));
  if (byId.has(item.id) && fs.existsSync(path.join(PROJ, finalRel)) && !force) { skipped++; continue; }
  const model = item.model || plan.defaults.model;
  // An EDIT (item.editFrom) keeps the style suffix off: the instruction must describe only the change.
  const prompt = item.prompt + (plan.defaults.style && !item.editFrom ? ', ' + plan.defaults.style : '');
  const input = item.editFrom
    ? { prompt, ...(item.input || {}) }
    : { prompt, ...(plan.defaults.input || {}), ...(item.input || {}) };
  if (item.editFrom) {
    const src = path.resolve(PROJ, item.editFrom);
    const mime = /\.png$/i.test(src) ? 'image/png' : 'image/jpeg';
    input.image_url = 'data:' + mime + ';base64,' + fs.readFileSync(src).toString('base64');
  }
  if (args.dry) { console.log('[dry]', item.id, model, JSON.stringify({ ...input, image_url: input.image_url ? '(data uri)' : undefined }).slice(0, 240)); continue; }
  try {
    const gen = await falRun(model, input);
    const img = (gen.result.images || [])[0];
    if (!img || !img.url) throw new Error('no image in result: ' + JSON.stringify(gen.result).slice(0, 200));
    const rawExt = /png/i.test(img.content_type || img.url) ? 'png' : 'jpg';
    const rawFile = path.join(RAWDIR, item.id + (item.editFrom ? '.edit' : '') + '.' + rawExt);
    const rawBytes = await download(img.url, rawFile);
    // Produce the new file under a temp name; the old one is archived only once this succeeded,
    // so a failed regeneration can never leave the slot empty.
    const tmpFinal = path.join(PROJ, finalRel + '.new');
    let cut = null;
    if (item.cutout) {
      const bg = await falRun(plan.defaults.cutoutModel, { image_url: img.url, ...(plan.defaults.cutoutInput || {}) });
      const bimg = bg.result.image || (bg.result.images || [])[0];
      if (!bimg || !bimg.url) throw new Error('no cutout in result: ' + JSON.stringify(bg.result).slice(0, 200));
      await download(bimg.url, tmpFinal);
      cut = { model: plan.defaults.cutoutModel, requestId: bg.requestId };
    } else {
      fs.copyFileSync(rawFile, tmpFinal);
    }
    if (fs.existsSync(path.join(PROJ, finalRel))) {
      // A rejected image is ARCHIVED, never deleted: it was paid for, and the rejection is evidence.
      const rej = path.join(OUT, 'rejected');
      fs.mkdirSync(rej, { recursive: true });
      const stamp = Date.now();
      fs.renameSync(path.join(PROJ, finalRel), path.join(rej, item.id + '.' + stamp + '.' + ext));
      rec.rejected = (rec.rejected || []).concat({ ...(byId.get(item.id) || { id: item.id }), archivedAs: 'assets/generated/rejected/' + item.id + '.' + stamp + '.' + ext, reason: item.rejectReason || 'regenerated on review', at: new Date().toISOString() });
    }
    fs.renameSync(tmpFinal, path.join(PROJ, finalRel));
    const entry = {
      id: item.id, file: finalRel, raw: path.relative(PROJ, rawFile).split(path.sep).join('/'), rawBytes,
      role: item.role, alt: item.alt, usedFor: item.usedFor || [], prompt, model, input: { ...input, prompt: undefined, image_url: item.editFrom ? '(data uri of ' + item.editFrom + ')' : undefined },
      editOf: item.editFrom || null,
      seed: gen.result.seed ?? null, requestId: gen.requestId, width: img.width || null, height: img.height || null,
      cutout: cut, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(PROJ, finalRel))).digest('hex'),
      generatedAt: new Date().toISOString(),
    };
    rec.images = rec.images.filter((i) => i.id !== item.id).concat(entry);
    rec.failures = (rec.failures || []).filter((f) => f.id !== item.id);
    made++;
    console.log('ok  ', item.id, (rawBytes / 1024).toFixed(0) + 'KB', cut ? '+cutout' : '', gen.requestId);
  } catch (e) {
    rec.failures = (rec.failures || []).filter((f) => f.id !== item.id).concat({ id: item.id, reason: String(e.message || e), at: new Date().toISOString() });
    console.log('FAIL', item.id, String(e.message || e).slice(0, 240));
  }
  rec.generated = new Date().toISOString();
  fs.writeFileSync(RECORD, JSON.stringify(rec, null, 2));   // incremental: a crash loses nothing paid for
}
console.log('made', made, 'skipped (on disk)', skipped, 'failures', (rec.failures || []).length);
process.exit(0);
