// images.mjs - image resolution and WebP variants (PIPELINE-SITE).
// resolveImage(ref): a captured image URL (CDN or origin), a local file (assets/source|generated|brand/...), or an
// image-plan slot id -> { file, width, height, hash } | { slot } | null.
// Variants are made with cwebp (installed on PATH) at widths 320..2400 capped at the source width, cached in
// assets/optimized (or --cache <dir>) under <sha12>-<w>.webp, and copied into <out>/assets/img/. File names carry the
// content hash only, so no source path (wp-content, elementor, ...) ever reaches the output.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { ROOT, safeDecode } from './paths.mjs';

export const WIDTHS = [320, 480, 640, 960, 1280, 1600, 1920, 2400];
export const CWEBP_ARGS = ['-quiet', '-q', '80', '-alpha_q', '90', '-m', '4', '-metadata', 'none'];
const SETTINGS_TAG = 'q80a90m4';

/* ---------- dimensions from file headers (PNG, JPEG, WebP, GIF) ---------- */
export function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), format: 'png' };
  if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'GIF') return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), format: 'gif' };
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const k = buf.toString('ascii', 12, 16);
    if (k === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), format: 'webp' };
    if (k === 'VP8L') { const b = buf.readUInt32LE(21); return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff), format: 'webp' }; }
    if (k === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, format: 'webp' };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const m = buf[o + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: buf.readUInt16BE(o + 7), height: buf.readUInt16BE(o + 5), format: 'jpeg' };
      o += 2 + buf.readUInt16BE(o + 2);
    }
  }
  return null;
}

/* ---------- the captured-image index (audit/image-inventory.json) ---------- */
const keyOf = (u) => safeDecode(String(u).split('#')[0].split('?')[0]).replace(/^https?:\/\//i, '').toLowerCase();
const tailOf = (u) => { const k = keyOf(u); const i = k.indexOf('/wp-content/'); return i >= 0 ? k.slice(i + '/wp-content/'.length).replace(/^smush-webp\//, '').replace(/(\.(png|jpe?g))\.webp$/, '$1') : null; };

export function createImageIndex() {
  const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/image-inventory.json'), 'utf8'));
  const bySrc = new Map(), byTail = new Map(), byBase = new Map(), info = new Map();
  const firstPass = [];
  for (const im of inv.images) {
    if (im.localFile) {
      const rec = { file: im.localFile, width: im.intrinsicWidth || null, height: im.intrinsicHeight || null, hash: im.sha256 || null };
      info.set(im.src, rec);
      firstPass.push([im.src, rec]);
    }
  }
  /* duplicates resolve to their kept twin */
  for (const im of inv.images) if (!im.localFile && im.duplicateOf && info.has(im.duplicateOf)) info.set(im.src, info.get(im.duplicateOf));
  for (const [src, rec] of [...info].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const k = keyOf(src); if (!bySrc.has(k)) bySrc.set(k, rec);
    const t = tailOf(src); if (t && !byTail.has(t)) byTail.set(t, rec);
  }
  /* local files are named <8hex>-<basename>: a unique basename is a last-resort key */
  const baseCount = new Map();
  for (const [, rec] of firstPass) { const b = path.basename(rec.file).replace(/^[0-9a-f]{8}-/, '').toLowerCase(); baseCount.set(b, (baseCount.get(b) || 0) + 1); if (!byBase.has(b)) byBase.set(b, rec); }
  for (const [b, n] of baseCount) if (n > 1) byBase.delete(b);
  /* BUILD-CONTRACT 4.15.5 (H2 change): the images fetched after the harvest (audit/late-images.json: 26 Dutchie event
     images, 2 home banners) resolve to their files in assets/source/late/ by source URL (query ignored) */
  const late = new Map();
  const lf = path.join(ROOT, 'audit/late-images.json');
  if (fs.existsSync(lf)) {
    const lj = JSON.parse(fs.readFileSync(lf, 'utf8'));
    for (const [u, e] of Object.entries(lj.entries || {}).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      if (!e || !e.file || e.status !== 200 || !fs.existsSync(path.join(ROOT, e.file))) continue;
      const rec = { file: e.file, width: e.width || null, height: e.height || null, hash: e.sha256 || null, late: true };
      const k = keyOf(e.url || u);
      if (!bySrc.has(k)) bySrc.set(k, rec);
      late.set(k, rec);
      const t = tailOf(e.url || u); if (t && !byTail.has(t)) byTail.set(t, rec);
    }
  }
  return { bySrc, byTail, byBase, late, failed: new Set(inv.images.filter((i) => i.downloadError).map((i) => keyOf(i.src))) };
}

/**
 * resolve any image reference to a local source file
 * returns { file (workspace-relative), width, height, hash, via } or { missing: reason }
 */
export function resolveImage(ref, index, imagePlan) {
  if (!ref || typeof ref !== 'string') return { missing: 'empty reference' };
  const s = ref.trim();
  if (/^(assets|audit)\//.test(s)) {
    const abs = path.join(ROOT, s);
    if (!fs.existsSync(abs)) return { missing: 'local file not found: ' + s };
    return { file: s, via: 'local' };
  }
  if (imagePlan && imagePlan[s]) {
    const slot = imagePlan[s];
    const f = slot.file || slot.path || slot.output;
    if (f && fs.existsSync(path.join(ROOT, f))) return { file: f, via: 'slot', slot: s, alt: slot.alt };
    return { missing: 'image-plan slot not generated yet', slot: s };
  }
  if (/^[a-z0-9][a-z0-9_-]*$/i.test(s) && !s.includes('.')) return { missing: 'unknown image slot', slot: s };
  const k = keyOf(s);
  let rec = index.bySrc.get(k);
  let via = 'src';
  if (!rec) { const t = tailOf(s); if (t) { rec = index.byTail.get(t); via = 'wp-path'; } }
  if (!rec) {
    /* WordPress size suffix (-300x200) and scaled copies point at the same master: try the bare name */
    const t = tailOf(s);
    if (t) { const bare = t.replace(/-\d+x\d+(\.[a-z]+)$/, '$1').replace(/-scaled(\.[a-z]+)$/, '$1'); if (bare !== t) { rec = index.byTail.get(bare); via = 'wp-path-unsized'; } }
  }
  if (!rec) { const b = path.basename(k); rec = index.byBase.get(b); via = 'basename'; }
  if (!rec) return { missing: index.failed.has(k) ? 'download failed in the harvest (audit/image-inventory.json)' : 'not in the harvest (origin-hosted or never downloaded)' };
  return { ...rec, via };
}

/* ---------- variants ---------- */
export class ImagePipeline {
  constructor({ cacheDir, outDir, log = () => {} }) {
    this.cacheDir = cacheDir; this.outDir = outDir; this.log = log;
    this.meta = new Map();     // file -> { width, height, hash, format }
    this.jobs = new Map();     // cacheName -> { src, width }
    this.used = new Set();     // cacheName used by the output
  }
  /** width/height/hash of a source file (header read + sha256), memoised */
  info(file, known = {}) {
    if (this.meta.has(file)) return this.meta.get(file);
    const buf = fs.readFileSync(path.join(ROOT, file));
    const dim = imageSize(buf) || {};
    const m = { width: dim.width || known.width || null, height: dim.height || known.height || null, format: dim.format || null, hash: crypto.createHash('sha256').update(buf).digest('hex') };
    this.meta.set(file, m);
    return m;
  }
  /** plan the variants of one source: [{ w, url (root-relative), cache }] (largest last) */
  variants(file, widths) {
    const m = this.info(file);
    if (!m.width || m.format === 'gif') return null;
    const cap = Math.min(m.width, 2400);
    let ws = (widths && widths.length ? widths : WIDTHS).filter((w) => w < cap);
    if (!ws.includes(cap)) ws.push(cap);
    ws = [...new Set(ws)].sort((a, b) => a - b);
    return ws.map((w) => {
      const name = m.hash.slice(0, 12) + '-' + w + '.webp';
      const cache = m.hash.slice(0, 12) + '-' + w + '-' + SETTINGS_TAG + '.webp';
      this.jobs.set(cache, { src: file, width: w, full: w >= m.width });
      this.used.add(cache + '|' + name);
      return { w, h: Math.round((m.height * w) / m.width), url: '/assets/img/' + name, cache };
    });
  }
  /** run every planned cwebp job that is not cached yet; resolves to { made, cached, failed } */
  async run(concurrency = Math.max(1, Math.min(10, os.cpus().length - 2))) {
    fs.mkdirSync(this.cacheDir, { recursive: true });
    const todo = [...this.jobs].filter(([cache]) => !fs.existsSync(path.join(this.cacheDir, cache))).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const stats = { planned: this.jobs.size, cached: this.jobs.size - todo.length, made: 0, failed: [] };
    let i = 0;
    const worker = async () => {
      while (i < todo.length) {
        const [cache, job] = todo[i++];
        const tmp = path.join(this.cacheDir, cache + '.part');
        const args = [...CWEBP_ARGS, ...(job.full ? [] : ['-resize', String(job.width), '0']), path.join(ROOT, job.src), '-o', tmp];
        const code = await new Promise((res) => { const p = spawn('cwebp', args, { stdio: ['ignore', 'ignore', 'pipe'] }); let err = ''; p.stderr.on('data', (d) => { err += d; }); p.on('error', (e) => res({ code: -1, err: String(e) })); p.on('close', (c) => res({ code: c, err })); });
        if (code.code === 0 && fs.existsSync(tmp)) { fs.renameSync(tmp, path.join(this.cacheDir, cache)); stats.made++; }
        else { try { fs.unlinkSync(tmp); } catch { /* none */ } stats.failed.push({ src: job.src, width: job.width, err: (code.err || '').slice(0, 200) }); }
        if ((stats.made + stats.failed.length) % 250 === 0) this.log('  cwebp ' + (stats.made + stats.failed.length) + '/' + todo.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, todo.length || 1) }, worker));
    return stats;
  }
  /** copy the used variants from the cache into <out>/assets/img/ */
  publish() {
    const dir = path.join(this.outDir, 'assets', 'img');
    fs.mkdirSync(dir, { recursive: true });
    let n = 0;
    const missing = [];
    for (const pair of [...this.used].sort()) {
      const [cache, name] = pair.split('|');
      const src = path.join(this.cacheDir, cache);
      if (!fs.existsSync(src)) { missing.push(name); continue; }
      fs.copyFileSync(src, path.join(dir, name)); n++;
    }
    return { copied: n, missing };
  }
}
