// site.mjs - build constants and the evidence loaders shared by routes, catalog and build (PIPELINE-SITE).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ORIGIN } from './paths.mjs';

/** The build date is a constant so two builds are byte-identical. It is the capture date of the evidence. */
export const BUILD_DATE = '2026-10-12';
/** the date product and price evidence was captured (t1 og:updated_time 2026-10-11T14:07:33-04:00) */
export const SNAPSHOT_DATE = '2026-10-12';
export { ORIGIN };

export const readJSON = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
export const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
export const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** stable JSON (sorted object keys) so generated files never depend on insertion order */
export function stableJSON(v, indent = 1) {
  const norm = (x) => {
    if (Array.isArray(x)) return x.map(norm);
    if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, norm(x[k])]));
    return x;
  };
  return JSON.stringify(norm(v), null, indent) + '\n';
}

/** stable JSON with the top level pretty-printed and each element of the named arrays on one line (diffable, compact) */
export function jsonLines(obj, arrayKeys = []) {
  const norm = (x) => {
    if (Array.isArray(x)) return x.map(norm);
    if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().filter((k) => x[k] !== undefined).map((k) => [k, norm(x[k])]));
    return x;
  };
  const o = norm(obj);
  const parts = Object.keys(o).map((k) => {
    const v = o[k];
    if (arrayKeys.includes(k) && Array.isArray(v)) return ' ' + JSON.stringify(k) + ': [' + (v.length ? '\n' + v.map((e) => '  ' + JSON.stringify(e)).join(',\n') + '\n ' : '') + ']';
    return ' ' + JSON.stringify(k) + ': ' + JSON.stringify(v, null, 1).replace(/\n/g, '\n ');
  });
  return '{\n' + parts.join(',\n') + '\n}\n';
}

/** write only when the bytes differ (keeps mtimes quiet; output is identical either way) */
export function writeIfChanged(abs, data) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (fs.existsSync(abs) && fs.readFileSync(abs).equals(buf)) return false;
  fs.writeFileSync(abs, buf);
  return true;
}

/** HTML entity decoding for captured titles (named entities seen in the crawl + numeric) */
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', reg: '®', trade: '™', copy: '©', frac14: '¼', frac12: '½', frac34: '¾', deg: '°', times: '×' };
export function decodeEntities(s) {
  return String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    const k = e.toLowerCase();
    return Object.prototype.hasOwnProperty.call(NAMED, k) ? NAMED[k] : m;
  });
}

/**
 * ctx.site from facts/client-facts.json ONLY (BUILD-CONTRACT 3.3). Empty facts stay empty: nothing is filled in
 * from memory. Fields the facts file does not carry are null, and the theme must render nothing for them.
 */
export function siteFromFacts() {
  const f = exists('facts/client-facts.json') ? readJSON('facts/client-facts.json') : {};
  const first = (v) => (Array.isArray(v) ? v[0] : v) ?? null;
  const val = (x) => (x && typeof x === 'object' && 'value' in x ? x.value : x);
  const phoneRaw = val(first(f.phone));
  const phone = phoneRaw ? { display: String(phoneRaw), href: 'tel:' + String(phoneRaw).replace(/[^\d+]/g, '').replace(/^(\d{10})$/, '+1$1') } : null;
  /* rating: only when the facts file prints it as "<value> (<count>)" (e.g. the reviews badge "4.9 (967)") */
  let rating = f.rating ?? null;
  if (!rating && Array.isArray(f.statistics)) {
    for (const s of f.statistics) { const m = String(s.text || s.quote || '').match(/^(\d(?:\.\d)?) \((\d[\d,]*)\)$/); if (m) { rating = { value: m[1], count: m[2], source: s.page || null, quote: s.quote || s.text }; break; } }
  }
  const socials = Array.isArray(f.socials) ? f.socials : Array.isArray(f.sameAs) ? f.sameAs.map((u) => ({ href: u, label: ((f.socialProfiles || []).find((p) => p.url === u) || {}).network || null })) : [];
  return {
    name: val(f.brand) || val(f.legalName) || null,
    legalName: val(f.legalName) || null,
    businessNames: (f.businessNames || []).map((b) => b.value),
    origin: ORIGIN,
    phone,
    email: val(first(f.email)),
    address: first(f.addresses) || null,
    hours: f.hours ?? null,
    hoursSpec: f.hoursSpec ?? null,
    socials,
    rating,
    tagline: (f.slogan && f.slogan.value) || f.tagline || null,
    licence: f.licences && f.licences[0] ? f.licences[0].printedAs || f.licences[0].number : null,
    areaServed: f.areaServed || [],
    facts: f,
  };
}
