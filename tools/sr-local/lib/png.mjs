// png.mjs — pure-Node PNG decode/encode for the pixel-diff verifier.
// Supports what browser screenshots actually emit: 8-bit, non-interlaced,
// colour types 0 (grey), 2 (RGB), 3 (palette), 4 (grey+A), 6 (RGBA).
// Anything else THROWS with the exact reason — a diff must never be computed
// against a half-decoded image and reported as "0 differing pixels".

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Returns { width, height, data } where data is RGBA Uint8Array (w*h*4). */
export function decodePNG(buf) {
  if (!buf.slice(0, 8).equals(SIG)) throw new Error('png: bad signature');
  let p = 8;
  let ihdr = null;
  const idat = [];
  let palette = null, trns = null;

  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.slice(p + 4, p + 8).toString('latin1');
    const data = buf.slice(p + 8, p + 8 + len);
    p += 12 + len;
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        depth: data[8], colorType: data[9], compression: data[10],
        filter: data[11], interlace: data[12],
      };
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (!ihdr) throw new Error('png: no IHDR');
  if (ihdr.interlace !== 0) throw new Error('png: interlaced images unsupported');
  if (ihdr.depth !== 8) throw new Error('png: bit depth ' + ihdr.depth + ' unsupported (need 8)');

  const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const ch = CHANNELS[ihdr.colorType];
  if (!ch) throw new Error('png: colour type ' + ihdr.colorType + ' unsupported');
  if (ihdr.colorType === 3 && !palette) throw new Error('png: palette image without PLTE');

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { width: w, height: h } = ihdr;
  const bpp = ch;
  const stride = w * bpp;
  const expected = (stride + 1) * h;
  if (raw.length < expected) {
    throw new Error('png: short IDAT (' + raw.length + ' < ' + expected + ')');
  }

  const lines = Buffer.alloc(stride * h);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const src = raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = lines.slice(y * stride, (y + 1) * stride);
    src.copy(cur);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      switch (ft) {
        case 0: break;
        case 1: cur[x] = (cur[x] + a) & 0xff; break;
        case 2: cur[x] = (cur[x] + b) & 0xff; break;
        case 3: cur[x] = (cur[x] + ((a + b) >> 1)) & 0xff; break;
        case 4: cur[x] = (cur[x] + paeth(a, b, c)) & 0xff; break;
        default: throw new Error('png: bad filter type ' + ft + ' on row ' + y);
      }
    }
    prev = cur;
  }

  const out = new Uint8Array(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    const s = i * bpp, d = i * 4;
    if (ihdr.colorType === 6) { out[d] = lines[s]; out[d + 1] = lines[s + 1]; out[d + 2] = lines[s + 2]; out[d + 3] = lines[s + 3]; }
    else if (ihdr.colorType === 2) { out[d] = lines[s]; out[d + 1] = lines[s + 1]; out[d + 2] = lines[s + 2]; out[d + 3] = 255; }
    else if (ihdr.colorType === 0) { out[d] = out[d + 1] = out[d + 2] = lines[s]; out[d + 3] = 255; }
    else if (ihdr.colorType === 4) { out[d] = out[d + 1] = out[d + 2] = lines[s]; out[d + 3] = lines[s + 1]; }
    else { // palette
      const idx = lines[s] * 3;
      out[d] = palette[idx]; out[d + 1] = palette[idx + 1]; out[d + 2] = palette[idx + 2];
      out[d + 3] = trns && lines[s] < trns.length ? trns[lines[s]] : 255;
    }
  }
  return { width: w, height: h, data: out };
}

export function encodePNG({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const chunk = (type, payload) => {
    const b = Buffer.alloc(8 + payload.length + 4);
    b.writeUInt32BE(payload.length, 0);
    b.write(type, 4, 'latin1');
    payload.copy(b, 8);
    b.writeUInt32BE(crc32(b.slice(4, 8 + payload.length)), 8 + payload.length);
    return b;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function readPNG(file) { return decodePNG(fs.readFileSync(file)); }

export function writePNG(file, img) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodePNG(img));
  return file;
}

/**
 * Compare two RGBA images. `threshold` is per-channel tolerance 0-255.
 * Different sizes are NOT an error — they are the single most important
 * finding a reconstruction diff can produce, so they are reported as such.
 */
// A PIXEL THAT MATCHES ONE OF ITS NEIGHBOURS HAS MOVED, NOT CHANGED.
//
// Two independent renders of the same page place a photograph a fraction of a pixel apart, and
// every edge inside it then differs. Measured 2026-09-18 on a stable capture of both sides: mean
// |Δ| 6.7 per channel, mean SIGNED Δ -0.09 (no colour shift), a tail to 110 concentrated on edges,
// and a shift search minimising exactly at dx=0,dy=0 — one picture, drawn sub-pixel differently.
// ⚖ A COMPARISON THAT COUNTS ANTI-ALIASING AS DRIFT MEASURES THE RENDERER, NOT THE BUILD.
//
// So with `antialias`, a pixel counts only when it differs from EVERY pixel in the 3x3
// neighbourhood of the same place in the other image. A moved edge finds its match one pixel over;
// a repainted region finds no match anywhere near it and is still counted — which the suite's
// negative controls (a repainted block, a blanked half) exist to keep true.
function matchesNeighbour(a, b, x, y, w, h, threshold, ignoreAlpha) {
  for (let dy = -1; dy <= 1; dy++) {
    const yy = y + dy;
    if (yy < 0 || yy >= h) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx;
      if (xx < 0 || xx >= w) continue;
      const ia = (y * a.width + x) * 4;
      const ib = (yy * b.width + xx) * 4;
      const dr = Math.abs(a.data[ia] - b.data[ib]);
      const dg = Math.abs(a.data[ia + 1] - b.data[ib + 1]);
      const db = Math.abs(a.data[ia + 2] - b.data[ib + 2]);
      const da = ignoreAlpha ? 0 : Math.abs(a.data[ia + 3] - b.data[ib + 3]);
      if (dr <= threshold && dg <= threshold && db <= threshold && da <= threshold) return true;
    }
  }
  return false;
}

export function diffImages(a, b, { threshold = 8, ignoreAlpha = true, antialias = false } = {}) {
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const sizeMismatch = a.width !== b.width || a.height !== b.height;
  const out = new Uint8Array(w * h * 4);
  let differing = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ia = (y * a.width + x) * 4;
      const ib = (y * b.width + x) * 4;
      const io = (y * w + x) * 4;
      const dr = Math.abs(a.data[ia] - b.data[ib]);
      const dg = Math.abs(a.data[ia + 1] - b.data[ib + 1]);
      const db = Math.abs(a.data[ia + 2] - b.data[ib + 2]);
      const da = ignoreAlpha ? 0 : Math.abs(a.data[ia + 3] - b.data[ib + 3]);
      let bad = dr > threshold || dg > threshold || db > threshold || da > threshold;
      // Only a pixel that already failed is worth the neighbourhood walk, so the cost falls on the
      // differing minority rather than on every pixel of every page.
      if (bad && antialias && matchesNeighbour(a, b, x, y, w, h, threshold, ignoreAlpha)) bad = false;
      if (bad) {
        differing++;
        out[io] = 255; out[io + 1] = 0; out[io + 2] = 90; out[io + 3] = 255;
      } else {
        const g = 255 - Math.round((255 - (a.data[ia] * 0.299 + a.data[ia + 1] * 0.587 + a.data[ia + 2] * 0.114)) * 0.15);
        out[io] = out[io + 1] = out[io + 2] = g; out[io + 3] = 255;
      }
    }
  }
  const compared = w * h;
  return {
    width: w, height: h, compared, differing,
    ratio: compared ? differing / compared : 1,
    sizeMismatch,
    aSize: [a.width, a.height], bSize: [b.width, b.height],
    diff: { width: w, height: h, data: out },
  };
}
