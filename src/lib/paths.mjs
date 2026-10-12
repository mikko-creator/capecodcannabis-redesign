// paths.mjs - workspace locations and URL <-> output-path helpers (PIPELINE-SITE).
// Output paths are DECODED (UTF-8) with a leading and a trailing slash ('/' = home, '/terpenes/α-pinene/'),
// except file-like paths (/llms.txt), which keep their name. Hrefs are written percent-encoded (encodePath).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ORIGIN = 'https://capecodcannabis.com';
const HOST_RE = /^(?:https?:)?\/\/(?:www\.)?capecodcannabis\.com(?=[/?#:]|$)(?::\d+)?/i;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

export const rootPath = (...p) => path.join(ROOT, ...p);
export const posix = (p) => p.split(path.sep).join('/');

/** true for a URL on the client's origin (absolute, protocol-relative) or a root/page-relative path */
export function isInternal(u) {
  if (typeof u !== 'string') return false;
  const s = u.trim();
  if (!s || s.startsWith('#')) return false;
  if (HOST_RE.test(s)) return true;
  if (s.startsWith('//')) return false;
  return !SCHEME_RE.test(s);
}

/** true for a URL that EMBEDS a URL on the client's origin ("//capecodcannabis.com", also percent-encoded inside
    another URL's query: webcal:, calendar-subscribe links). A bare domain mention is not a site URL: a referral tag
    (?utm_source=capecodcannabis.com) or a mailto: address is kept. */
export const namesOrigin = (u) => !/^mailto:/i.test(String(u)) && /\/\/(?:www\.)?capecodcannabis\.com(?![a-z0-9.-])/i.test(safeDecode(safeDecode(String(u))));

export function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

const FILE_LIKE = /\.[a-z0-9]{2,5}$/i;
export const isFileLike = (p) => FILE_LIKE.test(p.replace(/\/+$/, ''));

/** '/a/b' -> '/a/b/' (directories), keeps '/llms.txt'; collapses '//' */
export function withSlash(p) {
  let s = ('/' + String(p || '').replace(/^\/+/, '')).replace(/\/{2,}/g, '/');
  if (isFileLike(s)) return s.replace(/\/+$/, '');
  if (!s.endsWith('/')) s += '/';
  return s;
}

/**
 * Split an internal URL into { path, search, hash }. path is decoded and normalised (trailing slash).
 * base (an output path) resolves page-relative input. Returns null for an external URL or a pure fragment.
 */
export function splitInternal(u, base = '/') {
  if (!isInternal(u)) return null;
  let s = String(u).trim().replace(HOST_RE, '');
  if (!s) s = '/';
  let hash = '', search = '';
  const h = s.indexOf('#'); if (h >= 0) { hash = s.slice(h); s = s.slice(0, h); }
  const q = s.indexOf('?'); if (q >= 0) { search = s.slice(q); s = s.slice(0, q); }
  if (!s.startsWith('/')) s = path.posix.join(base.endsWith('/') ? base : path.posix.dirname(base) + '/', s || '.');
  const decoded = s.split('/').map(safeDecode).join('/');
  const norm = path.posix.normalize(decoded);
  return { path: withSlash(norm), search, hash };
}

/** decoded output path -> percent-encoded URL path (each segment encoded, slashes kept) */
export function encodePath(p) {
  return p.split('/').map((seg) => encodeURIComponent(seg).replace(/%2C/gi, ',').replace(/%40/gi, '@').replace(/%3A/gi, ':')).join('/');
}

/** output path -> file inside the output dir: '/a/' -> 'a/index.html', '/llms.txt' -> 'llms.txt' */
export function outFileOf(p) {
  if (isFileLike(p)) return p.replace(/^\/+/, '');
  return (p.replace(/^\/+/, '') + 'index.html');
}

/** relative URL from page `from` (an output path, a directory) to root-relative `to` (may carry ?query#hash) */
export function relUrl(from, to) {
  if (!to.startsWith('/')) return to;
  let target = to, tail = '';
  const cut = to.search(/[?#]/); if (cut >= 0) { target = to.slice(0, cut); tail = to.slice(cut); }
  const fromDir = from.endsWith('/') ? from : path.posix.dirname(from) + '/';
  let rel = path.posix.relative(fromDir, target);
  if (target.endsWith('/') && rel && !rel.endsWith('/')) rel += '/';
  if (!rel) rel = './';
  else if (!rel.startsWith('.')) rel = './' + rel;
  return rel + tail;
}

/** the live URL of an output path (canonical form, percent-encoded with the origin's lowercase hex) */
export const liveUrl = (p) => ORIGIN + encodePath(p).replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase());
