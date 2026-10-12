// policy.mjs - build-side enforcement of BUILD-CONTRACT 4.7, 4.15 and 4.16 decisions (lane H2, 2026-10-12).
// Pure functions over page data; build.mjs applies them and records every change in the page and the build report.
// Node builtins only, deterministic.
import { safeDecode } from './paths.mjs';

/* ------------------------------------------------------------------ 4.15.4 link hygiene */
/** tracking parameters stripped from INTERNAL links only (contract 4.15.4); every other parameter is kept */
export const TRACKING_PARAM_RE = /^(?:_gl|_ga|utm_[a-z0-9_]*)$/i;
/** '?a=1&_gl=x&utm_source=y' -> '?a=1' ('' when nothing is left); order and encoding of the kept pairs unchanged */
export function stripTracking(search) {
  if (!search || search === '?') return { search: search || '', stripped: [] };
  const pairs = search.replace(/^\?/, '').split('&');
  const kept = [], stripped = [];
  for (const p of pairs) {
    if (!p) continue;
    const k = safeDecode(p.split('=')[0]);
    if (TRACKING_PARAM_RE.test(k)) stripped.push(k); else kept.push(p);
  }
  return { search: kept.length ? '?' + kept.join('&') : '', stripped };
}

/* ------------------------------------------------------------------ 4.7 / 4.16.11 JSON-LD */
export const PRINTED_EMAIL = 'info@capecodcannabis.com';
export const EXCLUDED_ALT_NAMES = ['Medical Marijuana Dispensary'];
/** Rank Math's openingHours "8:00 - 8:00": the printed hours are 8am-8pm daily (contract 4.7) */
export const STALE_HOURS_RE = /(^|\s)8:00\s*-\s*8:00$/;
export const PRINTED_HOURS_VALUE = (days) => (days ? days + ' ' : '') + '08:00-20:00';
/** the stale purchase limit (1 ounce / 28 grams) inside FAQ markup (contract 4.7, FACTS-EVIDENCE C3) */
export const STALE_LIMIT_RE = /up to 1 ounce\b|\b28 grams\b/i;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const typesOf = (n) => [].concat((n && n['@type']) || []);

/**
 * Apply the JSON-LD policy to a page's (already consolidated) list of JSON-LD objects.
 * mapJointImage(url) -> local absolute URL | null (4.16.11). Returns the new list; every change is pushed to `drops`
 * as { rule, what, detail } (declared in page.ldDropped and the build report).
 */
export function applyLdPolicy(list, drops, mapJointImage) {
  if (!Array.isArray(list)) return list;
  const out = [];
  const fixNode = (n) => {
    if (!n || typeof n !== 'object') return n;
    const types = typesOf(n);
    /* the stale FAQ markup: a FAQPage node saying 1 ounce / 28 grams is not carried */
    if (types.includes('FAQPage') && STALE_LIMIT_RE.test(JSON.stringify(n))) {
      if (types.length === 1) { drops.push({ rule: '4.7 stale FAQPage', what: 'FAQPage node dropped', detail: (n['@id'] || 'FAQPage') + ' states 1 ounce / 28 grams (visible copy says 2 ounces / 56 grams)' }); return undefined; }
      const k = { ...n, '@type': types.filter((t) => t !== 'FAQPage') };
      delete k.mainEntity;
      drops.push({ rule: '4.7 stale FAQPage', what: 'FAQPage type and mainEntity removed from ' + types.join('+'), detail: (n['@id'] || types.join('+')) + ' states 1 ounce / 28 grams' });
      return fixValues(k, []);
    }
    return fixValues(n, []);
  };
  const fixValues = (n, trail) => {
    if (Array.isArray(n)) return n.map((x) => fixValues(x, trail)).filter((x) => x !== undefined);
    if (!n || typeof n !== 'object') return fixString(n, trail);
    const o = {};
    for (const [k, v] of Object.entries(n)) {
      if (k === 'alternateName') {
        const vals = [].concat(v);
        const kept = vals.filter((x) => !(typeof x === 'string' && EXCLUDED_ALT_NAMES.includes(x.trim())));
        if (kept.length !== vals.length) drops.push({ rule: '4.7 printed facts only', what: 'alternateName value removed', detail: vals.filter((x) => !kept.includes(x)).join(', ') + ' (the store is adult-use only)' });
        if (!kept.length) continue;
        o[k] = Array.isArray(v) ? kept : kept[0];
        continue;
      }
      if (k === 'openingHours') {
        const fix = (s) => {
          if (typeof s !== 'string' || !STALE_HOURS_RE.test(s.trim())) return s;
          const days = s.trim().replace(STALE_HOURS_RE, '').trim();
          const nv = PRINTED_HOURS_VALUE(days);
          drops.push({ rule: '4.7 printed facts only', what: 'openingHours replaced', detail: JSON.stringify(s) + ' -> ' + JSON.stringify(nv) + ' (printed 8:00am - 8:00pm daily)' });
          return nv;
        };
        o[k] = Array.isArray(v) ? v.map(fix) : fix(v);
        continue;
      }
      const nv = fixValues(v, [...trail, k]);
      if (nv !== undefined) o[k] = nv;
    }
    return o;
  };
  const fixString = (s, trail) => {
    if (typeof s !== 'string') return s;
    /* an "x@2x.png" image name is not an e-mail address */
    const emails = (s.match(EMAIL_RE) || []).filter((e) => e.toLowerCase() !== PRINTED_EMAIL && !/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(e));
    if (emails.length) { drops.push({ rule: '4.7 no personal e-mail', what: 'property ' + trail.join('.') + ' dropped', detail: 'an e-mail address other than the printed ' + PRINTED_EMAIL }); return undefined; }
    if (/joint-product-photos\.s3\.amazonaws\.com/i.test(s)) {
      const local = mapJointImage ? mapJointImage(s) : null;
      if (local) { drops.push({ rule: '4.16.11 Joint image', what: 'property ' + trail.join('.') + ' replaced by the local copy', detail: s.split('?')[0] + ' -> ' + local }); return local; }
      drops.push({ rule: '4.16.11 Joint image', what: 'property ' + trail.join('.') + ' dropped', detail: s.split('?')[0] + ' (no local copy)' });
      return undefined;
    }
    return s;
  };
  for (const s of list) {
    if (s && Array.isArray(s['@graph'])) {
      const g = s['@graph'].map(fixNode).filter((x) => x !== undefined);
      out.push({ ...fixValues({ ...s, '@graph': [] }, []), '@graph': g });
      continue;
    }
    const n = fixNode(s);
    if (n !== undefined) out.push(n);
  }
  return out;
}

/* ------------------------------------------------------------------ 4.16.4 contradicting device variants */
/** pages whose conflict:true pairs have a decided policy; any other page with a conflict:true block fails the build */
export const CONFLICT_POLICY = {
  '/daily-purchase-limit-in-ma/': {
    keep: (dev) => Array.isArray(dev) && dev.includes('desktop'),
    reason: 'BUILD-CONTRACT 4.16.4: stale tablet/mobile variant (28 g / 1 ounce) of a contradicting device pair; the desktop variant (56 g / 2 ounces) agrees with the dated statement on 23 pages (OPEN-DECISIONS B3)',
  },
};

/* ------------------------------------------------------------------ 4.16.8 platform identifiers */
export const PLATFORM_ID_RE = /tribe-|post-password-form|elementor|jet-/i;

/* ------------------------------------------------------------------ 4.16.10 build safety */
/** output-path key for the duplicate guard: decoded, NFC, lower case, an index.html suffix and a missing trailing
    slash normalised away */
export function outKey(p) {
  let s = safeDecode(String(p)).normalize('NFC').toLowerCase();
  s = ('/' + s.replace(/^\/+/, '')).replace(/\/{2,}/g, '/');
  s = s.replace(/\/index\.html?\/?$/, '/');
  if (!s.endsWith('/')) s += '/';
  return s;
}

/** structural problems of a page model, as strings (empty = valid) */
export function modelProblems(model) {
  const probs = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) return ['model is not an object'];
  if (!Array.isArray(model.sections)) return ['sections missing or not an array'];
  const checkBlocks = (blocks, where) => {
    if (!Array.isArray(blocks)) { probs.push(where + ': blocks missing or not an array'); return; }
    blocks.forEach((b, i) => {
      const w = where + '.blocks[' + i + ']';
      if (!b || typeof b !== 'object' || Array.isArray(b)) { probs.push(w + ': block is ' + (b === null ? 'null' : Array.isArray(b) ? 'an array' : typeof b)); return; }
      if (typeof b.t !== 'string' || !b.t) probs.push(w + ': block without a type (t)');
      for (const k of ['slides', 'items']) {
        if (b[k] === undefined) continue;
        if (!Array.isArray(b[k])) { probs.push(w + '.' + k + ': not an array'); continue; }
        b[k].forEach((it, j) => {
          if (it === null || typeof it !== 'object') { probs.push(w + '.' + k + '[' + j + ']: item is ' + (it === null ? 'null' : typeof it)); return; }
          if (it.blocks !== undefined) checkBlocks(it.blocks, w + '.' + k + '[' + j + ']');
        });
      }
      if (b.blocks !== undefined) checkBlocks(b.blocks, w);
    });
  };
  model.sections.forEach((s, i) => {
    if (!s || typeof s !== 'object' || Array.isArray(s)) { probs.push('sections[' + i + ']: section is ' + (s === null ? 'null' : typeof s)); return; }
    checkBlocks(s.blocks, 'sections[' + i + ']');
  });
  return probs;
}

/** ctx.rich sanitiser (4.16.10; attribute-aware since 4.18.2, P1). A small tokenizer that follows the HTML tokenizer
    for tags and attributes: a quoted value may hold ">" and "/", an attribute may follow a quoted value with no space,
    "/" between attributes acts as a space, names are case-insensitive, and only the first of two same-named attributes
    counts. It removes:
    - with their content: script, style, noscript, template, textarea, title, xmp, noembed, noframes, object, applet,
      svg, math, frameset, and every iframe except the Google Maps embed form; plaintext and everything after it;
    - the tags base, meta, link, embed, frame, param, keygen, basefont, bgsound; comments and <!...> / <?...> markup;
    - every on* attribute however it is delimited, srcdoc, duplicate attributes, and a URL attribute whose value (all
      character references decoded, every space and control character removed) has a javascript:, vbscript: or
      livescript: scheme, or a scheme that is not a valid scheme name (a leftover reference such as "javascript&x;");
    - on an allowed map iframe, every attribute except src, width, height, style, loading, allowfullscreen,
      referrerpolicy and title, and the iframe's content.
    A tag from which nothing is removed is copied byte for byte, so clean model HTML passes unchanged. A tag that is
    still open at the end of the input is dropped, as a browser drops it. Returns { html, removed: [kind] }. */
export const MAP_EMBED_RE = /^https:\/\/www\.google\.com\/maps\/embed\?/i;
const SAN_DROP_WITH_CONTENT = new Set(['script', 'style', 'noscript', 'template', 'textarea', 'title', 'xmp', 'noembed', 'noframes', 'object', 'applet', 'svg', 'math', 'frameset', 'iframe']);
const SAN_DROP_TAG = new Set(['base', 'meta', 'link', 'embed', 'frame', 'param', 'keygen', 'basefont', 'bgsound']);
const SAN_URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster', 'background', 'cite', 'longdesc', 'lowsrc', 'dynsrc', 'ping', 'codebase', 'archive', 'manifest', 'icon', 'usemap', 'profile', 'classid', 'srcset', 'imagesrcset']);
const SAN_MAP_KEEP = new Set(['src', 'width', 'height', 'style', 'loading', 'allowfullscreen', 'referrerpolicy', 'title']);
const SAN_NAMED = { colon: ':', tab: '\t', newline: '\n', lpar: '(', rpar: ')', sol: '/', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: String.fromCharCode(0xa0), period: '.', excl: '!', num: '#', semi: ';', comma: ',', equals: '=', bsol: '\\', percnt: '%', plus: '+', dollar: '$', lowbar: '_', hyphen: '-', dash: '-' };
const SAN_WS = /[\t\n\f\r ]/;
/* every space, control and invisible separator, removed before the scheme test (built from code points) */
const SAN_IGNORABLE = new RegExp('[' + [[0x00, 0x20], [0x7f, 0xa0], [0x1680, 0x1680], [0x180e, 0x180e], [0x2000, 0x200f], [0x2028, 0x2029], [0x202f, 0x202f], [0x205f, 0x205f], [0x3000, 0x3000], [0xfeff, 0xfeff]]
  .map(([a, b]) => (a === b ? hx(a) : hx(a) + '-' + hx(b))).join('') + ']+', 'g');
function hx(c) { return String.fromCharCode(92) + 'u' + c.toString(16).padStart(4, '0'); }
/** an attribute value as the browser reads it: numeric references (with or without ";") and the named ones above */
export function decodeAttrValue(v) {
  return String(v).replace(/&#x([0-9a-f]+);?|&#(\d+);?|&([a-z][a-z0-9]*);?/gi, (m, hex, dec, name) => {
    if (hex !== undefined || dec !== undefined) { const n = parseInt(hex !== undefined ? hex : dec, hex !== undefined ? 16 : 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; }
    const k = name.toLowerCase();
    return Object.prototype.hasOwnProperty.call(SAN_NAMED, k) ? SAN_NAMED[k] : m;
  });
}
/** true when a URL attribute value would run script (or hides its scheme behind an undecoded reference) */
export function unsafeUrl(v) {
  /* the browser decodes once; the second decode is defence in depth against a later pass that decodes again */
  const once = decodeAttrValue(v);
  return [once, decodeAttrValue(once)].some((x) => {
    const u = x.replace(SAN_IGNORABLE, '');
    const m = /^([^:/?#]*):/.exec(u);
    if (!m) return false;
    const sch = m[1].toLowerCase();
    return /^(javascript|vbscript|livescript)$/.test(sch) || !/^[a-z][a-z0-9+.-]*$/.test(sch);
  });
}
const escRawAttr = (v) => String(v).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** the index just past the end tag </name ...> (case-insensitive), or -1 */
function endOfElement(s, from, name) {
  const re = new RegExp('</' + name.replace(/[^a-z0-9-]/gi, '') + '(?=[\\t\\n\\f\\r />])', 'gi');
  re.lastIndex = from;
  const m = re.exec(s);
  if (!m) return -1;
  const gt = s.indexOf('>', m.index);
  return gt < 0 ? s.length : gt + 1;
}
export function sanitizeHtml(html) {
  const removed = [];
  const s = String(html ?? '');
  const n = s.length;
  let out = '';
  let i = 0;
  while (i < n) {
    const lt = s.indexOf('<', i);
    if (lt < 0) { out += s.slice(i); break; }
    out += s.slice(i, lt);
    const c1 = s[lt + 1] || '';
    // comments, <!doctype>, <![CDATA[...]]>, <?...>, and "</" not followed by a letter (bogus comments)
    if (c1 === '!' || c1 === '?' || (c1 === '/' && !/[a-zA-Z]/.test(s[lt + 2] || ''))) {
      if (s.startsWith('<!--', lt)) {
        let end;
        if (s.startsWith('<!-->', lt)) end = lt + 5;
        else if (s.startsWith('<!--->', lt)) end = lt + 6;
        else {
          const a = s.indexOf('-->', lt + 4);
          const b = s.indexOf('--!>', lt + 4);
          end = Math.min(a < 0 ? Infinity : a + 3, b < 0 ? Infinity : b + 4);
          if (end === Infinity) end = n;
        }
        removed.push('comment');
        i = end;
        continue;
      }
      if (c1 === '/' && s[lt + 2] === '>') { i = lt + 3; continue; }
      const gt = s.indexOf('>', lt + 1);
      removed.push('markup');
      i = gt < 0 ? n : gt + 1;
      continue;
    }
    const isEnd = c1 === '/';
    const ns = lt + (isEnd ? 2 : 1);
    if (!/[a-zA-Z]/.test(s[ns] || '')) { out += '&lt;'; i = lt + 1; continue; }   // a lone "<" is text
    let j = ns;
    while (j < n && !/[\t\n\f\r />]/.test(s[j])) j++;
    const rawName = s.slice(ns, j);
    const name = rawName.toLowerCase();
    const attrs = [];
    let selfClose = false;
    let closed = false;
    while (j < n) {
      const ch = s[j];
      if (SAN_WS.test(ch)) { j++; continue; }
      if (ch === '/') { if (s[j + 1] === '>') { selfClose = true; j += 2; closed = true; break; } j++; continue; }
      if (ch === '>') { j++; closed = true; break; }
      const as = j;
      j++;   // the first character of a name may be "="
      while (j < n && !/[\t\n\f\r />=]/.test(s[j])) j++;
      const an = s.slice(as, j).toLowerCase();
      let k = j;
      while (k < n && SAN_WS.test(s[k])) k++;
      let value = '';
      let hasValue = false;
      if (s[k] === '=') {
        k++;
        while (k < n && SAN_WS.test(s[k])) k++;
        hasValue = true;
        if (s[k] === '"' || s[k] === "'") {
          const e = s.indexOf(s[k], k + 1);
          if (e < 0) { j = n; break; }   // end of input inside a quoted value
          value = s.slice(k + 1, e);
          k = e + 1;
        } else {
          const vs = k;
          while (k < n && !/[\t\n\f\r >]/.test(s[k])) k++;
          value = s.slice(vs, k);
        }
        j = k;
      }
      attrs.push({ name: an, raw: s.slice(as, j), value, hasValue });
    }
    if (!closed) { removed.push('unclosed-tag'); break; }   // the browser drops a tag cut off by the end of input
    i = j;
    const original = s.slice(lt, i);
    if (isEnd) {
      if (SAN_DROP_WITH_CONTENT.has(name) || SAN_DROP_TAG.has(name)) continue;   // a stray end tag
      out += attrs.length ? '</' + rawName + '>' : original;
      continue;
    }
    if (name === 'plaintext') { removed.push('plaintext'); i = n; break; }
    if (SAN_DROP_TAG.has(name)) { removed.push(name); continue; }
    // attributes: the first of each name counts; on*, srcdoc and unsafe URLs go
    const seen = new Set();
    const kept = [];
    let dropped = false;
    for (const a of attrs) {
      if (seen.has(a.name)) { removed.push('duplicate-attr'); dropped = true; continue; }
      seen.add(a.name);
      if (/^on/.test(a.name)) { removed.push('on*'); dropped = true; continue; }
      if (a.name === 'srcdoc') { removed.push('srcdoc'); dropped = true; continue; }
      if (SAN_URL_ATTRS.has(a.name) && a.hasValue && unsafeUrl(a.value)) { removed.push('javascript:'); dropped = true; continue; }
      kept.push(a);
    }
    const rebuild = (list) => '<' + rawName + list.map((a) => ' ' + a.name + (a.hasValue ? '="' + escRawAttr(a.value) + '"' : '')).join('') + (selfClose ? ' /' : '') + '>';
    if (name === 'iframe') {
      const src = kept.find((a) => a.name === 'src');
      const end = endOfElement(s, i, 'iframe');
      if (src && MAP_EMBED_RE.test(decodeAttrValue(src.value).trim())) {
        const mapKept = kept.filter((a) => SAN_MAP_KEEP.has(a.name));
        if (mapKept.length !== kept.length) { removed.push('iframe-attr'); dropped = true; }
        out += (dropped ? rebuild(mapKept) : original) + '</iframe>';
        if (end >= 0) { if (s.slice(i, end).replace(/<\/iframe[^>]*>$/i, '').trim()) removed.push('iframe-content'); i = end; }
        continue;
      }
      removed.push('iframe');
      if (end >= 0) i = end;
      continue;
    }
    if (SAN_DROP_WITH_CONTENT.has(name)) {
      removed.push(name);
      if (selfClose && (name === 'svg' || name === 'math')) continue;   // <svg/> holds nothing
      const end = endOfElement(s, i, name);
      i = end < 0 ? n : end;
      continue;
    }
    out += dropped ? rebuild(kept) : original;
  }
  return { html: out, removed };
}
