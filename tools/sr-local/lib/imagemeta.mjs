// imagemeta.mjs — read real intrinsic dimensions from the file header.
// Declared width/height attributes lie constantly on CMS output; the bytes do not.
// Returns { format, width, height } or { format:'unknown' }.

export function imageMeta(buf) {
  if (!buf || buf.length < 12) return { format: 'unknown', width: 0, height: 0 };

  // PNG
  if (buf[0] === 0x89 && buf.slice(1, 4).toString('latin1') === 'PNG') {
    return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // GIF
  if (buf.slice(0, 3).toString('latin1') === 'GIF') {
    return { format: 'gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  // WebP (RIFF....WEBP)
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') {
    const fourcc = buf.slice(12, 16).toString('latin1');
    if (fourcc === 'VP8 ') {
      return { format: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (fourcc === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { format: 'webp', width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (fourcc === 'VP8X') {
      const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { format: 'webp', width: w, height: h };
    }
    return { format: 'webp', width: 0, height: 0 };
  }
  // AVIF / HEIF (ftyp box) — dimensions live deep in ispe; report format only.
  if (buf.slice(4, 8).toString('latin1') === 'ftyp') {
    const brand = buf.slice(8, 12).toString('latin1');
    if (/avif|avis/i.test(brand)) return { format: 'avif', width: 0, height: 0 };
    if (/heic|heix|mif1/i.test(brand)) return { format: 'heic', width: 0, height: 0 };
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      // SOF0..SOF15 except DHT(c4), JPGA(c8), DAC(cc)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { format: 'jpeg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return { format: 'jpeg', width: 0, height: 0 };
  }
  // SVG
  const head = buf.slice(0, 1024).toString('utf8');
  if (/<svg[\s>]/i.test(head)) {
    const w = /\bwidth\s*=\s*["']?([\d.]+)/i.exec(head);
    const h = /\bheight\s*=\s*["']?([\d.]+)/i.exec(head);
    const vb = /\bviewBox\s*=\s*["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i.exec(head);
    return {
      format: 'svg',
      width: Math.round(w ? Number(w[1]) : vb ? Number(vb[1]) : 0),
      height: Math.round(h ? Number(h[1]) : vb ? Number(vb[2]) : 0),
    };
  }
  // ICO
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) {
    return { format: 'ico', width: buf[6] || 256, height: buf[7] || 256 };
  }
  return { format: 'unknown', width: 0, height: 0 };
}
