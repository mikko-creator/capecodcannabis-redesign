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

/** ctx.rich sanitiser (4.16.10): no <script>, no on* attributes, no javascript: URLs, no <iframe> other than the
    Google Maps embed form. Returns { html, removed: [kind] }. */
export const MAP_EMBED_RE = /^https:\/\/www\.google\.com\/maps\/embed\?/i;
export function sanitizeHtml(html) {
  const removed = [];
  let s = String(html ?? '');
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, () => { removed.push('script'); return ''; });
  s = s.replace(/<\/?script\b[^>]*>/gi, () => { removed.push('script'); return ''; });
  s = s.replace(/<iframe\b([^>]*)>([\s\S]*?)<\/iframe\s*>|<iframe\b([^>]*)\/?>/gi, (m, a1, inner, a2) => {
    const a = a1 ?? a2 ?? '';
    const src = (a.match(/\ssrc\s*=\s*"([^"]*)"|\ssrc\s*=\s*'([^']*)'/i) || []).slice(1).find((x) => x !== undefined) || '';
    if (MAP_EMBED_RE.test(src.replace(/&amp;/g, '&'))) return m;
    removed.push('iframe');
    return '';
  });
  /* inside tags only: on* handlers and javascript: URLs */
  s = s.replace(/<([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*?)?(\/?)>/g, (m, tag, attrsTxt, slash) => {
    if (!attrsTxt) return m;
    let a = attrsTxt.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, () => { removed.push('on*'); return ''; });
    a = a.replace(/\s+(href|src|action|formaction|xlink:href|data|poster)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (mm, k, v) => {
      const val = v.replace(/^["']|["']$/g, '').replace(/&#0*106;|&#x0*6a;/gi, 'j').replace(/[\s\u0000-\u001f]+/g, '');
      if (/^javascript:/i.test(val)) { removed.push('javascript:'); return ''; }
      return mm;
    });
    return '<' + tag + a + slash + '>';
  });
  return { html: s, removed };
}
