#!/usr/bin/env node
// qa-probe.mjs — measured design QA of one page at the operator's review windows (Node builtins + headless Chrome).
//   node tools/qa-probe.mjs --url http://127.0.0.1:8791/ [--sizes 1280x585@1.5,1600x662@1.2,390x844@3,1024x768@1,1366x657@1]
//        [--checks sharp,header,overflow,glass,contrast,protrude,motion,errors] [--init "<js>"] [--json <file>]
//        [--header "<css selector>"] [--hero "<css selector list>"] [--min-sharp 1] [--min-contrast 4.5]
//        [--min-contrast-large 3] [--min-range 0.10] [--max-text 40] [--max-glass 24] [--settle 900]
// Checks (each reports per size; any failure exits 1):
//   sharp     every image painted in the FIRST SCREEN: file px per painted device px >= --min-sharp. object-fit:
//             cover/contain and CSS background-size: cover are modelled (a cover crop paints the source scaled UP), and
//             currentSrc (the srcset pick) is what is measured.
//   header    the sticky/fixed header's bottom edge vs every hero-copy element (--hero): overlap in px must be 0.
//   overflow  documentElement.scrollWidth vs clientWidth, plus every element whose right edge passes the viewport
//             WITHOUT a clipping ancestor (overflow hidden/clip on an ancestor hides it, so it is not a defect).
//   glass     every visible element with a backdrop-filter (or [data-glass]): the panel is hidden, its box is captured,
//             and the backdrop's luminance range (p95 - p05 of relative luminance) must be >= --min-range; a flat field
//             makes frosted glass read as a plain card.
//   contrast  up to --max-text text elements that sit on glass or on an image: the text is made transparent, its box is
//             captured, and the contrast of the text colour against every backdrop pixel is computed; the 5th
//             percentile must reach 4.5 (3 for large text: >= 24px, or >= 18.66px bold).
//   protrude  every [data-protrude] element's box must not intersect any visible text element's box.
//   motion    with prefers-reduced-motion: reduce, after a full scroll-through: no running non-finite animation, and
//             no text element left at opacity < 0.5 (a stranded reveal).
//   errors    uncaught exceptions and console errors during load and scroll.
// Positive controls: tools/tests/test-qa-probe.mjs runs a defective fixture (each check must fail) and a clean one.
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './cdp-realsb.mjs';
import { decodePNG } from './sr-local/lib/png.mjs';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (!k.startsWith('--')) continue;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) args[k.slice(2)] = true; else { args[k.slice(2)] = v; i++; }
}
if (!args.url) { console.error('need --url'); process.exit(2); }
const SIZES = String(args.sizes || '1280x585@1.5,1600x662@1.2,390x844@3,1024x768@1,1366x657@1').split(',').map((s) => {
  const m = s.trim().match(/^(\d+)x(\d+)(?:@([\d.]+))?$/); if (!m) throw new Error('bad size ' + s);
  return { w: +m[1], h: +m[2], dpr: +(m[3] || 1) };
});
const CHECKS = new Set(String(args.checks || 'sharp,header,overflow,glass,contrast,protrude,motion,errors').split(','));
const T = {
  sharp: +(args['min-sharp'] || 1), contrast: +(args['min-contrast'] || 4.5), contrastLarge: +(args['min-contrast-large'] || 3),
  range: +(args['min-range'] || 0.10), maxText: +(args['max-text'] || 40), maxGlass: +(args['max-glass'] || 24), settle: +(args.settle || 900),
};
const HEADER_SEL = args.header || 'header, [data-qa="header"]';
const HERO_SEL = args.hero || '[data-qa="hero-copy"], .hero h1, .hero p, .hero .btn, .hero a';

// --- pixel helpers ------------------------------------------------------------------------------
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); };
const pct = (arr, p) => { if (!arr.length) return NaN; const s = Float64Array.from(arr).sort(); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))]; };
async function capture(pg, rect) {
  const r = await pg.send('Page.captureScreenshot', { format: 'png', clip: { x: rect.x, y: rect.y, width: Math.max(1, rect.w), height: Math.max(1, rect.h), scale: 1 }, captureBeyondViewport: true });
  return decodePNG(Buffer.from(r.data, 'base64'));
}
const parseColor = (s) => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };

// --- in-page measurement sources (strings evaluated by CDP) ----------------------------------------
const MARK = `(() => { let n = 0; window.__qa = { el: (i) => document.querySelector('[data-qa-id="' + i + '"]'), id: (e) => { if (!e.dataset.qaId) e.dataset.qaId = 'q' + (n++); return e.dataset.qaId; } }; return true; })()`;
const SHARP_JS = `(() => {
  const out = [], vw = innerWidth, vh = innerHeight, dpr = devicePixelRatio;
  const vis = (r) => r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  for (const img of document.images) {
    const r = img.getBoundingClientRect(); if (!vis(r) || !img.naturalWidth) continue;
    const cs = getComputedStyle(img); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const fit = cs.objectFit; let s;
    if (fit === 'cover') s = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
    else if (fit === 'contain' || fit === 'scale-down') s = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
    else s = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
    if (fit === 'scale-down') s = Math.min(s, 1);
    out.push({ kind: 'img', id: __qa.id(img), src: (img.currentSrc || img.src).slice(-90), nat: img.naturalWidth + 'x' + img.naturalHeight, box: Math.round(r.width) + 'x' + Math.round(r.height), fit, ratio: +(1 / (s * dpr)).toFixed(3) });
  }
  return out;
})()`;
const BG_LIST_JS = `(() => {
  const out = [], vw = innerWidth, vh = innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const bg = getComputedStyle(el).backgroundImage; if (!bg || bg === 'none' || !/url\\(/.test(bg)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 40 || r.height < 40 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
    const url = (bg.match(/url\\(["']?([^"')]+)["']?\\)/) || [])[1]; if (!url || url.startsWith('data:image/svg')) continue;
    out.push({ id: __qa.id(el), url, w: r.width, h: r.height, size: getComputedStyle(el).backgroundSize });
  }
  return out;
})()`;
const HEADER_JS = `((hs, ss) => {
  const h = [...document.querySelectorAll(hs)].find((e) => { const p = getComputedStyle(e).position; const r = e.getBoundingClientRect(); return (p === 'fixed' || p === 'sticky') && r.height > 0 && r.top <= 1; });
  if (!h) return { header: null, overlaps: [] };
  const hb = h.getBoundingClientRect().bottom, out = [];
  for (const el of document.querySelectorAll(ss)) {
    if (h.contains(el)) continue; const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.top > innerHeight) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (r.top < hb - 0.5) out.push({ id: __qa.id(el), tag: el.tagName.toLowerCase(), text: (el.innerText || '').trim().slice(0, 50), overlapPx: +(hb - r.top).toFixed(1) });
  }
  return { header: Math.round(hb), overlaps: out };
})(${JSON.stringify(HEADER_SEL)}, ${JSON.stringify(HERO_SEL)})`;
const OVERFLOW_JS = `(() => {
  const cw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth, off = [];
  const clipped = (el) => { for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (/(hidden|clip|auto|scroll)/.test(cs.overflowX) || /(hidden|clip)/.test(cs.overflow)) { const r = a.getBoundingClientRect(); if (r.right <= cw + 0.5) return true; } } return false; };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.right <= cw + 0.5) continue;
    if (getComputedStyle(el).position === 'fixed' && r.left >= cw) continue;
    if (!clipped(el)) off.push({ id: __qa.id(el), tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), right: Math.round(r.right) });
  }
  return { clientWidth: cw, scrollWidth: sw, offenders: off.slice(0, 20), count: off.length };
})()`;
const GLASS_LIST_JS = `((max) => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); const bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (!(el.hasAttribute('data-glass') || (bf && bf !== 'none'))) continue;
    const r = el.getBoundingClientRect(); if (r.width < 24 || r.height < 24 || cs.visibility === 'hidden' || cs.display === 'none') continue;
    out.push({ id: __qa.id(el), cls: String(el.className).slice(0, 60), w: Math.round(r.width), h: Math.round(r.height) });
    if (out.length >= max) break;
  }
  return out;
})(${T.maxGlass})`;
const TEXT_LIST_JS = `((max) => {
  const out = [];
  const onGlassOrImage = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); const bf = cs.backdropFilter || cs.webkitBackdropFilter; if ((bf && bf !== 'none') || a.hasAttribute('data-glass') || (cs.backgroundImage && cs.backgroundImage !== 'none')) return true; } return false; };
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 1).map((n) => n.textContent.trim()).join(' ');
    if (!own) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < 0.5 || cs.display === 'none') continue;
    const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) continue;
    if (!onGlassOrImage(el)) continue;
    const fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight, 10) || 400;
    out.push({ id: __qa.id(el), text: own.slice(0, 50), color: cs.color, large: fs >= 24 || (fs >= 18.66 && fw >= 700) });
    if (out.length >= max) break;
  }
  return out;
})(${T.maxText})`;
const PROTRUDE_JS = `(() => {
  const texts = [...document.querySelectorAll('body *')].filter((el) => { if (el.closest('[data-protrude]')) return false; const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1); if (!own) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && +cs.opacity > 0.05; });
  const out = [];
  for (const p of document.querySelectorAll('[data-protrude]')) {
    const pr = p.getBoundingClientRect(); if (!pr.width) continue; const hits = [];
    for (const t of texts) {
      if (p.contains(t)) continue;
      const rects = [...t.getClientRects()];
      for (const tr of rects) { const ix = Math.max(0, Math.min(pr.right, tr.right) - Math.max(pr.left, tr.left)), iy = Math.max(0, Math.min(pr.bottom, tr.bottom) - Math.max(pr.top, tr.top)); if (ix * iy > 4) { hits.push({ text: t.innerText.trim().slice(0, 40), area: Math.round(ix * iy) }); break; } }
    }
    out.push({ id: __qa.id(p), cls: String(p.className).slice(0, 60), hits: hits.slice(0, 5), count: hits.length });
  }
  return out;
})()`;
const SCROLL_THROUGH = `(async () => { const H = () => document.documentElement.scrollHeight; let y = 0; for (let i = 0; i < 120 && y < H(); i++) { y += innerHeight * 0.7; scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)); } await new Promise((r) => setTimeout(r, 700)); scrollTo(0, 0); await new Promise((r) => setTimeout(r, 600)); return true; })()`;
const MOTION_JS = `(() => {
  const running = document.getAnimations().filter((a) => a.playState === 'running').map((a) => ({ name: a.animationName || a.transitionProperty || a.constructor.name, target: a.effect && a.effect.target ? (a.effect.target.className || a.effect.target.tagName) + '' : '?' })).slice(0, 10);
  const stranded = [...document.querySelectorAll('main *, body > section *')].filter((el) => { const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1); if (!own) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity < 0.5 && !el.closest('[aria-hidden="true"],[hidden],dialog:not([open])'); }).map((el) => ({ text: el.innerText.trim().slice(0, 40), opacity: getComputedStyle(el).opacity })).slice(0, 10);
  return { running, stranded };
})()`;

// --- run -------------------------------------------------------------------------------------------
const report = { url: args.url, generated: new Date().toISOString(), thresholds: T, sizes: [] };
let failures = 0;
const fail = (rec, check, msg) => { rec.failures.push(check + ': ' + msg); failures++; };
const b = await launch({ port: 0 });
try {
  for (const s of SIZES) {
    const mobile = s.w < 1024;
    const rec = { size: `${s.w}x${s.h}@${s.dpr}`, failures: [] };
    const pg = await b.newPage({ width: s.w, height: s.h, mobile });
    await pg.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: s.dpr, mobile });
    if (mobile) await pg.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    if (args.init) await pg.send('Page.addScriptToEvaluateOnNewDocument', { source: String(args.init) });
    const errors = [];
    b.on((m) => { if (m.sessionId !== pg.sessionId) return; if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 160)); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 160)); });
    await pg.goto(args.url, { settle: T.settle, timeout: 60000 });
    const iw = await pg.eval('innerWidth');
    if (iw !== s.w) {
      // On an emulated phone, content wider than the viewport makes Chrome zoom the page out (innerWidth grows to the
      // content width), as a real phone does. That is an overflow defect, not a broken probe: report it and measure on.
      const sw = await pg.eval('document.documentElement.scrollWidth');
      if (mobile && sw > s.w) fail(rec, 'overflow', `the page zooms out on a phone: innerWidth ${iw} for a ${s.w}px viewport (content ${sw}px wide)`);
      else { fail(rec, 'setup', `viewport not applied: wanted ${s.w} got ${iw}`); report.sizes.push(rec); continue; }
    }
    await pg.eval('document.fonts.ready.then(() => true)');
    await pg.eval(MARK);

    if (CHECKS.has('sharp')) {
      const imgs = await pg.eval(SHARP_JS);
      const bgs = await pg.eval(BG_LIST_JS);
      for (const g of bgs) {
        const nat = await pg.eval(`new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res(null); i.src = ${JSON.stringify(g.url)}; setTimeout(() => res(null), 6000); })`);
        if (!nat) continue;
        const sc = /contain/.test(g.size) ? Math.min(g.w / nat[0], g.h / nat[1]) : Math.max(g.w / nat[0], g.h / nat[1]);
        imgs.push({ kind: 'bg', id: g.id, src: g.url.slice(-90), nat: nat.join('x'), box: Math.round(g.w) + 'x' + Math.round(g.h), fit: g.size, ratio: +(1 / (sc * s.dpr)).toFixed(3) });
      }
      rec.sharp = imgs;
      for (const i of imgs) if (i.ratio < T.sharp) fail(rec, 'sharp', `${i.kind} ${i.src} file px per device px ${i.ratio} < ${T.sharp} (nat ${i.nat}, box ${i.box}, fit ${i.fit})`);
    }
    if (CHECKS.has('header')) {
      rec.header = await pg.eval(HEADER_JS);
      for (const o of rec.header.overlaps) fail(rec, 'header', `"${o.text}" (${o.tag}) starts ${o.overlapPx}px under the header (bottom ${rec.header.header})`);
    }
    if (CHECKS.has('overflow')) {
      rec.overflow = await pg.eval(OVERFLOW_JS);
      if (rec.overflow.scrollWidth > rec.overflow.clientWidth) fail(rec, 'overflow', `scrollWidth ${rec.overflow.scrollWidth} > clientWidth ${rec.overflow.clientWidth}`);
      for (const o of rec.overflow.offenders.slice(0, 5)) fail(rec, 'overflow', `${o.tag}.${o.cls} right edge ${o.right} > ${rec.overflow.clientWidth} (no clipping ancestor)`);
    }
    if (CHECKS.has('protrude')) {
      rec.protrude = await pg.eval(PROTRUDE_JS);
      for (const p of rec.protrude) if (p.count) fail(rec, 'protrude', `${p.cls} overlaps text: ${p.hits.map((h) => `"${h.text}" ${h.area}px²`).join('; ')}`);
    }
    if (CHECKS.has('glass')) {
      const list = await pg.eval(GLASS_LIST_JS); rec.glass = [];
      for (const g of list) {
        const box = await pg.eval(`(() => { const e = __qa.el(${JSON.stringify(g.id)}); e.scrollIntoView({ block: 'center' }); return true; })()`);
        await sleep(450);
        const rect = await pg.eval(`(() => { const e = __qa.el(${JSON.stringify(g.id)}); const r = e.getBoundingClientRect(); e.dataset.qaPrevVis = e.style.visibility; e.style.visibility = 'hidden'; return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })()`);
        await sleep(120);
        const img = await capture(pg, rect);
        await pg.eval(`(() => { const e = __qa.el(${JSON.stringify(g.id)}); e.style.visibility = e.dataset.qaPrevVis || ''; return true; })()`);
        const L = []; for (let i = 0; i < img.data.length; i += 16) L.push(lum(img.data[i], img.data[i + 1], img.data[i + 2]));
        const range = +(pct(L, 0.95) - pct(L, 0.05)).toFixed(3);
        rec.glass.push({ cls: g.cls, box: g.w + 'x' + g.h, range });
        if (range < T.range) fail(rec, 'glass', `${g.cls} (${g.w}x${g.h}) backdrop luminance range ${range} < ${T.range}`);
      }
      await pg.eval('scrollTo(0,0)'); await sleep(300);
    }
    if (CHECKS.has('contrast')) {
      const list = await pg.eval(TEXT_LIST_JS); rec.contrast = [];
      for (const t of list) {
        const fg = parseColor(t.color); if (!fg) continue;
        await pg.eval(`(() => { __qa.el(${JSON.stringify(t.id)}).scrollIntoView({ block: 'center' }); return true; })()`);
        await sleep(350);
        const rect = await pg.eval(`(() => { const e = __qa.el(${JSON.stringify(t.id)}); const r = e.getBoundingClientRect(); e.dataset.qaPrev = e.getAttribute('style') || ''; e.style.setProperty('color', 'transparent', 'important'); e.style.setProperty('-webkit-text-fill-color', 'transparent', 'important'); e.style.setProperty('text-shadow', 'none', 'important'); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })()`);
        await sleep(80);
        const img = await capture(pg, rect);
        await pg.eval(`(() => { const e = __qa.el(${JSON.stringify(t.id)}); e.setAttribute('style', e.dataset.qaPrev); if (!e.dataset.qaPrev) e.removeAttribute('style'); return true; })()`);
        const R = [];
        for (let i = 0; i < img.data.length; i += 8) {
          const br = img.data[i], bgc = img.data[i + 1], bb = img.data[i + 2];
          const fr = fg.r * fg.a + br * (1 - fg.a), fgg = fg.g * fg.a + bgc * (1 - fg.a), fb = fg.b * fg.a + bb * (1 - fg.a);
          R.push(ratio(lum(fr, fgg, fb), lum(br, bgc, bb)));
        }
        const p05 = +pct(R, 0.05).toFixed(2), need = t.large ? T.contrastLarge : T.contrast;
        rec.contrast.push({ text: t.text, large: t.large, p05, min: +pct(R, 0).toFixed(2) });
        if (p05 < need) fail(rec, 'contrast', `"${t.text}" p05 ${p05} < ${need}${t.large ? ' (large)' : ''}`);
      }
      await pg.eval('scrollTo(0,0)'); await sleep(300);
    }
    if (CHECKS.has('errors')) {
      await pg.eval(SCROLL_THROUGH, { timeout: 120000 });
      rec.errors = errors.slice(0, 10);
      for (const e of rec.errors) fail(rec, 'errors', e);
    }
    try { await b.send('Target.closeTarget', { targetId: pg.targetId }); } catch {}

    if (CHECKS.has('motion')) {
      const pm = await b.newPage({ width: s.w, height: s.h, mobile });
      await pm.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile });
      await pm.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      if (args.init) await pm.send('Page.addScriptToEvaluateOnNewDocument', { source: String(args.init) });
      await pm.goto(args.url, { settle: T.settle, timeout: 60000 });
      await pm.eval(SCROLL_THROUGH, { timeout: 120000 });
      rec.motion = await pm.eval(MOTION_JS);
      for (const a of rec.motion.running) fail(rec, 'motion', `animation still running under reduced motion: ${a.name} on ${a.target}`);
      for (const x of rec.motion.stranded) fail(rec, 'motion', `text left at opacity ${x.opacity}: "${x.text}"`);
      try { await b.send('Target.closeTarget', { targetId: pm.targetId }); } catch {}
    }
    report.sizes.push(rec);
    console.log(`${rec.size.padEnd(14)} ${rec.failures.length ? 'FAIL ' + rec.failures.length : 'PASS'}`);
    for (const f of rec.failures.slice(0, 12)) console.log('   - ' + f);
  }
} finally { await b.close(); }
report.failures = failures;
if (args.json) { fs.mkdirSync(path.dirname(path.resolve(args.json)), { recursive: true }); fs.writeFileSync(path.resolve(args.json), JSON.stringify(report, null, 1)); }
process.exit(failures ? 1 : 0);
