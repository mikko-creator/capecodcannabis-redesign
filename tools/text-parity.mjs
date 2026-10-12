// text-parity.mjs - INDEPENDENT sentence-level text parity: source HTML (audit/raw) vs page models (or built pages).
// Owner: PIPELINE-CONTENT; built-mode gate rules and controls by lane H1 (2026-10-12, BUILD-CONTRACT 4.16.1-4.16.3).
// Node builtins only. Deliberately shares NO code with src/lib/extract.mjs or
// src/lib/html-util.mjs: it has its own streaming tokenizer, its own visibility rule and its own model-text walk, so a
// bug in the extractor's parser cannot hide itself here.
//
//   node tools/text-parity.mjs                     every page in src/content/pages/_index.json + the chrome
//   node tools/text-parity.mjs --control           also run the positive controls (exit 1 if a control fails)
//   node tools/text-parity.mjs --page <slug>       one page, listing every missing / added sentence
//   node tools/text-parity.mjs --built <dist>      compare the source against <dist><path>index.html <main> instead of the models
//   node tools/text-parity.mjs --control-dir <dir> where --built controls write their planted page copy
//                                                  (default tmp/text-parity-control; never inside <dist>)
//   node tools/text-parity.mjs --json <file>       write the full report as JSON
//   node tools/text-parity.mjs --quiet             totals only
// Exit code: 0 when every page has recall 1.0 (after declared removals), no ADDED string, no hiddenShown, and every
// control passes; 1 otherwise; 2 when src/content/removals.json is malformed (an entry without id, reason, or text/pattern).
//
// ADDED rule in --built mode (BUILD-CONTRACT 4.16.2). A built string is allowed only when
//   - it occurs in the page's raw source (all text and attribute values, hidden copy included), or
//   - it matches an entry of removals.json allowedAdded[] (each entry carries a reason), or
//   - it sits inside an element marked data-catalog AND equals a product title or brand name in
//     src/content/catalog/*.json. Text inside data-catalog is checked ONLY against the catalog: an invented title there
//     fails even if the words occur elsewhere on the page.
// Removal entries may carry kinds: ['aria-label', ...] to apply only to source units of those kinds.
//
// --built --control plants its defects in a COPY of one built page (under --control-dir), so the controls fire on a
// dirty build too. Each control is judged by the difference from that page's own baseline result.
//
// Source units (per page): the text of the page's main region - <main> when present, else <body> minus the Elementor
// header/footer docs, #joint-ecommerce and the skip link - with script, style, noscript, template, svg, iframe,
// inline display:none, [hidden] and every element hidden on all five Elementor views (widescreen, desktop, tablet,
// mobile_extra, mobile; tablet_extra is a 1px band and is ignored) removed. Units are block-level text runs plus the
// attributes alt, aria-label, placeholder and the value of submit/button inputs. Units are split into sentences.
// A sentence is FOUND when its normalised form occurs in the normalised model text with word boundaries, or failing
// that, when it occurs with all whitespace removed (reported separately as spacing-only).
// ADDED = a sentence of the model's visible text that occurs nowhere in the raw source file (all text + all attribute
// values, hidden copy included): the fabrication guard.
// --built also reports hiddenShown: sentences that exist only in copy the source hides on every device (the model's
// hiddenAll content) but are visible in the built <main> (BUILD-CONTRACT 4.5). Built pages may keep hidden copy inside
// an element with the `hidden` attribute or `data-hidden-all`; both are skipped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(HERE, '..');
const PAGES = path.join(WS, 'src/content/pages');
const RAWDIR = path.join(WS, 'audit/raw');
const VIEWS = ['widescreen', 'desktop', 'tablet', 'mobile_extra', 'mobile'];

// ------------------------------------------------------------------ tokenizer (streaming, own implementation)
const VOIDS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAWTEXT = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'noembed', 'noframes']);
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', hellip: '...', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', sbquo: "'", bdquo: '"', copy: '©', reg: '®', trade: '™', deg: '°', middot: '·', bull: '•', times: '×', eacute: 'é', egrave: 'è', ntilde: 'ñ', frac12: '½', frac14: '¼', frac34: '¾', laquo: '«', raquo: '»', shy: '', zwj: '', zwnj: '', thinsp: ' ', ensp: ' ', emsp: ' ', minus: '-', prime: "'", Prime: '"', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', micro: 'µ', cent: '¢', pound: '£', euro: '€', larr: '←', rarr: '→', hearts: '♥' };
function ent(s) {
  return String(s).replace(/&(#\d+|#[xX][\da-fA-F]+|[A-Za-z][A-Za-z\d]*);?/g, (m, g) => {
    if (g[0] === '#') { const n = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
    return Object.prototype.hasOwnProperty.call(NAMED, g) ? NAMED[g] : m;
  });
}
function attrsOf(s) {
  const out = {};
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s))) { const k = m[1].toLowerCase(); if (!(k in out)) out[k] = ent(m[3] ?? m[4] ?? m[5] ?? ''); }
  return out;
}
// yields {type:'text'|'open'|'close', ...}
function* tokens(html) {
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { yield { type: 'text', text: html.slice(i) }; return; }
    if (lt > i) yield { type: 'text', text: html.slice(i, lt) };
    if (html.startsWith('<!--', lt)) { const e = html.indexOf('-->', lt + 4); i = e === -1 ? n : e + 3; continue; }
    const c = html[lt + 1];
    if (c === '!' || c === '?') { const e = html.indexOf('>', lt); i = e === -1 ? n : e + 1; continue; }
    if (c === '/') {
      const m = /^<\/\s*([A-Za-z][\w:-]*)[^>]*>/.exec(html.slice(lt, lt + 256));
      if (!m) { yield { type: 'text', text: '<' }; i = lt + 1; continue; }
      yield { type: 'close', name: m[1].toLowerCase() };
      i = lt + m[0].length;
      continue;
    }
    const m = /^<([A-Za-z][\w:-]*)/.exec(html.slice(lt, lt + 64));
    if (!m) { yield { type: 'text', text: '<' }; i = lt + 1; continue; }
    // scan to the closing '>' outside quotes
    let j = lt + m[0].length, q = '';
    for (; j < n; j++) { const ch = html[j]; if (q) { if (ch === q) q = ''; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '>') break; }
    const name = m[1].toLowerCase();
    const rawAttrs = html.slice(lt + m[0].length, j);
    const self = /\/\s*$/.test(rawAttrs);
    i = j + 1;
    yield { type: 'open', name, attrs: attrsOf(rawAttrs), self };
    if (RAWTEXT.has(name)) {
      const re = new RegExp('<\\/' + name + '\\s*>', 'ig');
      re.lastIndex = i;
      const e = re.exec(html);
      yield { type: 'rawtext', name, text: html.slice(i, e ? e.index : n) };
      yield { type: 'close', name };
      i = e ? e.index + e[0].length : n;
    }
  }
}

// ------------------------------------------------------------------ unit extraction from HTML
const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'br', 'button', 'caption', 'dd', 'details', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'label', 'legend', 'li', 'main', 'nav', 'ol', 'option', 'p', 'pre', 'section', 'select', 'summary', 'table', 'td', 'th', 'tr', 'ul']);
const DROP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe', 'object', 'canvas', 'video', 'audio', 'textarea', 'title', 'head']);
const hiddenViewsOf = (cls) => VIEWS.filter((v) => new RegExp('(^|\\s)elementor-hidden-' + v + '(\\s|$)').test(cls || ''));
// mode: 'region' (source page main region), 'chrome' (header+footer+age gate of one page), 'all' (every text and
// attribute, hidden copy included: the ADDED corpus), 'built' (the <main> of a built page), 'fragment' (a model html string)
function extractUnits(html, mode) {
  const units = [];
  const attrUnits = []; // 'all' mode: attribute values go after the text flow, so adjacent text stays adjacent
  const stack = [];
  let buf = '';
  // 'built' mode: text and attributes inside an element marked data-catalog are tagged catalog:true (the ADDED rule
  // checks them against the catalog only); a data-catalog element is a unit boundary, so catalog text never merges
  // with the text around it
  const inCatalog = () => mode === 'built' && stack.some((x) => x.catalog);
  const flush = () => { const t = buf.replace(/\s+/g, ' ').trim(); if (t) units.push(inCatalog() ? { kind: 'text', text: t, catalog: true } : { kind: 'text', text: t }); buf = ''; };
  const hasMain = mode === 'region' && /<main[\s>]/i.test(html);
  const inside = (pred) => stack.some(pred);
  const state = () => {
    // returns 'skip' | 'keep'
    if (mode === 'all') return inside((e) => e.name === 'script' || e.name === 'style') ? 'skip' : 'keep';
    if (inside((e) => e.drop)) return 'skip';
    const hidden = new Set();
    for (const e of stack) for (const v of e.hid) hidden.add(v);
    if (hidden.size === VIEWS.length) return 'skip';
    if (mode === 'region') {
      // Elementor popup docs sit outside <main> but are page content shown on demand
      if (hasMain ? !inside((e) => e.name === 'main' || e.popup) : !inside((e) => e.name === 'body')) return 'skip';
      if (inside((e) => e.chrome)) return 'skip';
    }
    if (mode === 'chrome' && !inside((e) => e.chromeKeep)) return 'skip';
    if (mode === 'built' && !inside((e) => e.name === 'main')) return 'skip';
    // 'built-chrome': a built page's header, footer and dialogs: the <body> outside <main>
    if (mode === 'built-chrome' && (inside((e) => e.name === 'main') || !inside((e) => e.name === 'body'))) return 'skip';
    return 'keep';
  };
  const popTo = (name) => {
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k].name === name) { stack.length = k; return true; }
    return false;
  };
  for (const tk of tokens(html)) {
    if (tk.type === 'text') { if (state() === 'keep') buf += ent(tk.text); continue; }
    if (tk.type === 'rawtext') { if (mode === 'all' && tk.name === 'script' && /ld\+json/i.test(stack.length ? stack[stack.length - 1].type || '' : '')) units.push({ kind: 'jsonld', text: tk.text }); if (mode === 'all' && tk.name === 'title') units.push({ kind: 'title', text: ent(tk.text) }); continue; }
    if (tk.type === 'close') {
      let closing = null;
      for (let k = stack.length - 1; k >= 0; k--) if (stack[k].name === tk.name) { closing = stack[k]; break; }
      if (BLOCK.has(tk.name) || (closing && closing.catalog)) flush();
      popTo(tk.name);
      continue;
    }
    const { name, attrs } = tk;
    if (name === 'p' && stack.length && stack[stack.length - 1].name === 'p') { flush(); stack.pop(); }
    if (name === 'li') { for (let k = stack.length - 1; k >= 0; k--) { const nm = stack[k].name; if (nm === 'li') { flush(); stack.length = k; break; } if (nm === 'ul' || nm === 'ol') break; } }
    if (name === 'option' && stack.length && stack[stack.length - 1].name === 'option') { flush(); stack.pop(); }
    const cls = attrs.class || '';
    const el = {
      name, type: attrs.type,
      hid: hiddenViewsOf(cls),
      drop: DROP.has(name) || /display\s*:\s*none/i.test(attrs.style || '') || ('hidden' in attrs && mode !== 'all') || ((mode === 'built' || mode === 'built-chrome') && 'data-hidden-all' in attrs),
      chrome: attrs['data-elementor-type'] === 'header' || attrs['data-elementor-type'] === 'footer' || attrs.id === 'joint-ecommerce' || /(^|\s)skip-link(\s|$)/.test(cls),
      chromeKeep: attrs['data-elementor-type'] === 'header' || attrs['data-elementor-type'] === 'footer',
      popup: attrs['data-elementor-type'] === 'popup',
      catalog: mode === 'built' && 'data-catalog' in attrs,
    };
    if (mode === 'all') el.drop = false;
    if (BLOCK.has(name) || el.catalog) flush();
    // attribute units are evaluated with the element itself on the stack (its own hidden classes count)
    const voidish = VOIDS.has(name) || (tk.self && (name === 'svg' || name === 'path' || name.includes(':')));
    stack.push(el);
    if (state() === 'keep') {
      if (mode === 'all') {
        for (const [k, v] of Object.entries(attrs)) if (v && !/^(class|style|id|href|src|data-src|srcset|data-srcset|sizes|data-sizes|width|height|type|rel|target|loading|decoding|role|tabindex|data-id|data-element_type|data-widget_type|data-e-type)$/.test(k)) attrUnits.push({ kind: 'attr', text: v });
      } else {
        const cat = inCatalog() ? { catalog: true } : {};
        if (name === 'img' && attrs.alt) units.push({ kind: 'alt', text: attrs.alt, ...cat });
        if (attrs['aria-label']) units.push({ kind: 'aria-label', text: attrs['aria-label'], ...cat });
        if ((name === 'input' || name === 'textarea') && attrs.placeholder) units.push({ kind: 'placeholder', text: attrs.placeholder, ...cat });
        if (name === 'input' && /^(submit|button)$/i.test(attrs.type || '') && attrs.value) units.push({ kind: 'value', text: attrs.value, ...cat });
      }
    }
    if (voidish) { stack.pop(); if (name === 'br' || name === 'hr') flush(); }
    if (RAWTEXT.has(name)) { /* the rawtext + close tokens follow */ }
  }
  flush();
  return attrUnits.length ? units.concat(attrUnits) : units;
}

// ------------------------------------------------------------------ normalisation and sentences
export function norm(s) {
  return ent(String(s))
    .normalize('NFKC')
    .replace(/[­​-‍⁠﻿]/g, '')
    .replace(/[‘’‚‛′ʼ`´]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[\s ]+/g, ' ')
    .trim();
}
function sentences(text) {
  const t = norm(text);
  if (!t) return [];
  return t.split(/(?<=[.!?])\s+(?=["'(\[]?[A-Z0-9À-ɏ*•#$🔥⭐])|\s+(?=•)/u).map((x) => x.trim()).filter((x) => /[\p{L}\p{N}]/u.test(x));
}
const squeeze = (s) => s.replace(/\s+/g, '');
function containsWord(hay, needle) {
  let from = 0;
  for (;;) {
    const i = hay.indexOf(needle, from);
    if (i < 0) return false;
    const a = hay[i - 1], b = hay[i + needle.length];
    const edgeOk = (ch, inner) => !ch || !/[\p{L}\p{N}]/u.test(ch) || !/[\p{L}\p{N}]/u.test(inner);
    if (edgeOk(a, needle[0]) && edgeOk(b, needle[needle.length - 1])) return true;
    from = i + 1;
  }
}

// ------------------------------------------------------------------ model text (own walk of the JSON)
// Keys whose values are not visible copy. Everything else that is a string is copy.
const NOT_COPY = new Set(['schema', 't', 'kind', 'href', 'sourceHref', 'matchesContractCopy', 'hrefStatus', 'ref', 'srcUrl', 'master', 'missing', 'src', 'id', 'n', 'dev', 'doc', 'docType', 'docId', 'cssId', 'params', 'filters', 'sort', 'settings', 'source', 'widget', 'via', 'el', 'what', 'note', 'reason', 'field', 'tag', 'type', 'name', 'level', 'as', 'w', 'h', 'target', 'limit', 'action', 'method', 'poster', 'config', 'avatarUrl', 'value', 'editorTitles', 'clientRendered', 'review', 'snapshot', 'overflow', 'open', 'required', 'hiddenAll', 'demote', 'conflict', 'partialDuplicate', 'labelFrom', 'section', 'maxPage', 'cont', 'rel', 'removed', 'iw', 'from']);
const HTML_KEYS = new Set(['html', 'tipHtml']);
function modelTexts(model, { includeHidden }) {
  const out = [];
  const rec = (v, key, hidden) => {
    if (v == null) return;
    if (typeof v === 'string') {
      if (hidden && !includeHidden) return;
      if (HTML_KEYS.has(key)) { for (const u of extractUnits(v, 'fragment')) out.push(u.text); } else out.push(v);
      return;
    }
    if (Array.isArray(v)) { for (const x of v) rec(x, key, hidden); return; }
    if (typeof v === 'object') {
      const h = hidden || v.hiddenAll === true;
      for (const [k, x] of Object.entries(v)) { if (NOT_COPY.has(k)) continue; rec(x, k, h); }
    }
  };
  rec(model.sections, 'sections', false);
  if (model.h1) out.push(model.h1);
  // the breadcrumb is one visible line: labels joined by the source separator
  const crumbs = (model.breadcrumbs || []).map((b) => b.label).filter(Boolean);
  if (crumbs.length && model.breadcrumbsSource === 'visible') out.push(crumbs.join(model.breadcrumbsSeparator || ' / '));
  else out.push(...crumbs);
  if (model.breadcrumbsLabel) out.push(model.breadcrumbsLabel);
  for (const a of model.ariaLabels || []) out.push(a);
  return out;
}
function chromeTexts(chrome, { includeHidden }) {
  const out = [];
  const rec = (v, key, hidden) => {
    if (v == null) return;
    if (typeof v === 'string') { if (hidden && !includeHidden) return; if (HTML_KEYS.has(key)) { for (const u of extractUnits(v, 'fragment')) out.push(u.text); } else out.push(v); return; }
    if (Array.isArray(v)) { for (const x of v) rec(x, key, hidden); return; }
    if (typeof v === 'object') {
      if (v.removed === true) return;
      const h = hidden || v.hiddenAll === true;
      for (const [k, x] of Object.entries(v)) { if (NOT_COPY.has(k) || k === 'ledger' || k === 'contractCopy' || k === 'ariaLabelNote' || k === 'categories') continue; rec(x, k, h); }
    }
  };
  for (const k of ['skipLink', 'announcement', 'logo', 'nav', 'mobileMenu', 'mega', 'megaHint', 'search', 'ajaxSearch', 'footer', 'backToTop', 'ageGate']) rec(chrome[k], k, false);
  return out;
}

// ------------------------------------------------------------------ removals
// Every entry needs an id, a reason, and text or pattern (BUILD-CONTRACT 4.16.2: "each with a reason"). A malformed
// file is not silently half-applied: main() exits 2 and names each problem.
function loadRemovals() {
  const f = path.join(WS, 'src/content/removals.json');
  if (!fs.existsSync(f)) return { items: [], allowedAdded: [], problems: [] };
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  const problems = [];
  const ids = new Set();
  const prep = (x, list) => {
    if (!x || typeof x !== 'object') { problems.push(list + ': an entry is not an object'); return null; }
    const id = x.id || '(no id)';
    if (!x.id) problems.push(list + ': an entry has no id: ' + JSON.stringify(x).slice(0, 100));
    else if (ids.has(list + '|' + x.id)) problems.push(list + ': duplicate id ' + x.id);
    ids.add(list + '|' + x.id);
    if (!x.reason || !String(x.reason).trim()) problems.push(list + ': ' + id + ' has no reason');
    if (!x.text && !x.pattern) problems.push(list + ': ' + id + ' has neither text nor pattern');
    if (x.kinds !== undefined && !(Array.isArray(x.kinds) && x.kinds.length && x.kinds.every((k) => /^(text|alt|aria-label|placeholder|value)$/.test(k)))) problems.push(list + ': ' + id + ' has bad kinds');
    let re = null;
    if (x.pattern) { try { re = new RegExp(x.pattern, (x.flags || '').replace(/g/g, '')); } catch (err) { problems.push(list + ': ' + id + ' has a bad pattern: ' + err.message); } }
    return { ...x, re, n: x.text ? norm(x.text) : null, kinds: Array.isArray(x.kinds) ? x.kinds : null };
  };
  const items = (r.removals || []).map((x) => prep(x, 'removals')).filter(Boolean);
  const allowedAdded = (r.allowedAdded || []).map((x) => prep(x, 'allowedAdded')).filter(Boolean);
  return { items, allowedAdded, problems };
}
const appliesTo = (rm, pagePath) => !rm.pages || rm.pages === '*' || (Array.isArray(rm.pages) && rm.pages.includes(pagePath));
const matchRemoval = (list, s, pagePath, kind) => list.find((rm) => appliesTo(rm, pagePath) && (!rm.kinds || !kind || rm.kinds.includes(kind)) && (rm.re ? rm.re.test(s) : rm.n === s || (rm.contains && s.includes(rm.n))));

// the catalog's product titles and brand names (src/content/catalog/*.json, from the site's own HTML sitemap and brand
// pages): the only strings allowed inside a data-catalog element of a built page
let CATALOG = null;
function catalogNames() {
  if (CATALOG) return CATALOG;
  CATALOG = new Set();
  const rd = (f) => { try { return JSON.parse(fs.readFileSync(path.join(WS, 'src/content/catalog', f), 'utf8')); } catch { return null; } };
  const p = rd('products.json');
  for (const x of (p && (Array.isArray(p) ? p : p.products)) || []) { if (x && x.title) CATALOG.add(norm(x.title)); if (x && x.brand && x.brand.name) CATALOG.add(norm(x.brand.name)); }
  const b = rd('brands.json');
  for (const x of (b && (Array.isArray(b) ? b : b.brands)) || []) { if (x && x.name) CATALOG.add(norm(x.name)); if (x && x.jointBrand) CATALOG.add(norm(x.jointBrand)); }
  return CATALOG;
}

// ------------------------------------------------------------------ compare
// addedUnits (--built): [{ text, kind, catalog? }]; without it the ADDED guard reads modelStrings (model mode)
function compare({ srcUnits, modelStrings, addedUnits, allCorpus, pagePath, removals }) {
  const M = ' ' + modelStrings.map(norm).join(' \u2029 ') + ' ';
  const Mz = squeeze(M.replace(/\u2029/g, ''));
  const seen = new Set();
  const res = { spacing: [], units: srcUnits.length, unitKinds: {}, sentences: 0, found: 0, spacingOnly: 0, declared: 0, declaredBy: {}, missing: [], added: [], addedDeclared: 0, addedDeclaredBy: {}, catalogUnits: 0, catalogRejected: [] };
  for (const u of srcUnits) res.unitKinds[u.kind] = (res.unitKinds[u.kind] || 0) + 1;
  for (const u of srcUnits) {
    for (const s of sentences(u.text)) {
      const key = u.kind + '|' + s;
      if (seen.has(key)) continue; // presence check: a repeated sentence counts once
      seen.add(key);
      res.sentences++;
      if (containsWord(M, s)) { res.found++; continue; }
      if (Mz.includes(squeeze(s))) { res.found++; res.spacingOnly++; res.spacing.push(s); continue; }
      const rm = matchRemoval(removals.items, s, pagePath, u.kind);
      if (rm) { res.declared++; res.declaredBy[rm.id] = (res.declaredBy[rm.id] || 0) + 1; continue; }
      res.missing.push({ kind: u.kind, text: s });
    }
  }
  res.recall = res.sentences ? (res.found + res.declared) / res.sentences : 1;
  if (allCorpus) {
    const F = ' ' + allCorpus.map(norm).join(' \u2029 ') + ' ';
    const Fz = squeeze(F.replace(/\u2029/g, ''));
    const seenA = new Set();
    const units = addedUnits || modelStrings.map((t) => ({ text: t }));
    const cat = units.some((u) => u.catalog) ? catalogNames() : null;
    for (const u of units) {
      if (u.catalog) {
        // inside data-catalog: the whole unit must equal a catalog title or brand name, nothing else counts
        const n = norm(u.text);
        if (!/[\p{L}\p{N}]/u.test(n)) continue;
        res.catalogUnits++;
        if (cat.has(n)) continue;
        if (seenA.has('#catalog|' + n)) continue;
        seenA.add('#catalog|' + n);
        res.added.push(n);
        res.catalogRejected.push(n);
        continue;
      }
      for (const s of sentences(u.text)) {
        if (seenA.has(s)) continue;
        seenA.add(s);
        if (containsWord(F, s) || Fz.includes(squeeze(s))) continue;
        const al = matchRemoval(removals.allowedAdded, s, pagePath, u.kind);
        if (al) { res.addedDeclared++; res.addedDeclaredBy[al.id] = (res.addedDeclaredBy[al.id] || 0) + 1; continue; }
        res.added.push(s);
      }
    }
  }
  return res;
}

// ------------------------------------------------------------------ per page
function readModel(slug) { return JSON.parse(fs.readFileSync(path.join(PAGES, slug + '.json'), 'utf8')); }
function rawOf(model) { return fs.readFileSync(path.join(WS, model.rawFile), 'utf8'); }
function builtFile(dist, p) {
  const cands = [path.join(dist, p, 'index.html')];
  try { cands.push(path.join(dist, decodeURIComponent(p), 'index.html')); } catch { /* ignore */ }
  return cands.find((f) => fs.existsSync(f)) || null;
}
function checkPage(model, opts, raw) {
  const html = raw ?? rawOf(model);
  const srcUnits = extractUnits(html, 'region');
  const allCorpus = extractUnits(html, 'all').map((u) => u.text);
  let modelStrings;
  let builtUnits = null;
  if (opts.built) {
    const f = builtFile(opts.built, model.path);
    if (!f) return { slug: model.slug, path: model.path, error: 'built page not found' };
    builtUnits = extractUnits(fs.readFileSync(f, 'utf8'), 'built');
    modelStrings = builtUnits.map((u) => u.text);
  } else modelStrings = modelTexts(model, { includeHidden: false });
  const addedStrings = opts.built ? modelStrings : modelTexts(model, { includeHidden: true });
  const r = compare({ srcUnits, modelStrings, allCorpus: null, pagePath: model.path, removals: opts.removals });
  const a = compare({ srcUnits: [], modelStrings: addedStrings, addedUnits: builtUnits, allCorpus, pagePath: model.path, removals: opts.removals });
  // --built only: copy that the source hides on every device (the model's hiddenAll content) must not be visible in the
  // built <main> (BUILD-CONTRACT 4.5). A sentence counts only if it exists solely in hidden source copy.
  let hiddenShown = [];
  if (opts.built) {
    const visibleSrc = ' ' + srcUnits.map((u) => norm(u.text)).join('   ') + ' ';
    const hiddenOnly = hiddenOnlySentences(model, srcUnits, visibleSrc);
    if (hiddenOnly.size) {
      const B = ' ' + modelStrings.map(norm).join('   ') + ' ';
      hiddenShown = [...hiddenOnly].filter((s) => containsWord(B, s));
    }
  }
  return { slug: model.slug, path: model.path, units: r.units, unitKinds: r.unitKinds, sentences: r.sentences, found: r.found, spacingOnly: r.spacingOnly, spacing: r.spacing, declared: r.declared, declaredBy: r.declaredBy, recall: r.recall, missing: r.missing, added: a.added, addedDeclared: opts.built ? a.addedDeclared : undefined, addedDeclaredBy: a.addedDeclaredBy, catalogUnits: opts.built ? a.catalogUnits : undefined, catalogRejected: opts.built ? a.catalogRejected : undefined, hiddenShown: opts.built ? hiddenShown : undefined };
}
// sentences that exist only in copy the source hides on every device (the model's hiddenAll content); visibleSrc is
// the page's visible source text, joined
function hiddenOnlySentences(model, srcUnits, visibleSrc) {
  const hiddenOnly = new Set();
  const vis = new Set(modelTexts(model, { includeHidden: false }).flatMap(sentences));
  for (const s of modelTexts(model, { includeHidden: true }).flatMap(sentences)) if (!vis.has(s) && !containsWord(visibleSrc, s) && s.split(' ').length >= 3) hiddenOnly.add(s);
  return hiddenOnly;
}
function checkChrome(opts) {
  const chrome = JSON.parse(fs.readFileSync(path.join(WS, 'src/content/chrome.json'), 'utf8'));
  const html = fs.readFileSync(path.join(WS, chrome.source.file), 'utf8');
  let srcUnits = extractUnits(html, 'chrome');
  // the age gate lives in a <template>; its copy is chrome too: read the template body as a fragment
  const tm = /<template[^>]*id=["']tmpl-age-gate["'][^>]*>([\s\S]*?)<\/template>/i.exec(html);
  if (tm) srcUnits = srcUnits.concat(extractUnits(tm[1], 'fragment'));
  const modelStrings = chromeTexts(chrome, { includeHidden: false });
  const allCorpus = extractUnits(html, 'all').map((u) => u.text);
  const r = compare({ srcUnits, modelStrings, allCorpus: null, pagePath: '#chrome', removals: opts.removals });
  const a = compare({ srcUnits: [], modelStrings: chromeTexts(chrome, { includeHidden: true }), allCorpus, pagePath: '#chrome', removals: opts.removals });
  return { slug: '#chrome', path: '#chrome', units: r.units, unitKinds: r.unitKinds, sentences: r.sentences, found: r.found, spacingOnly: r.spacingOnly, declared: r.declared, declaredBy: r.declaredBy, recall: r.recall, missing: r.missing, added: a.added, addedDeclaredBy: a.addedDeclaredBy };
}

// --built: the chrome of the built pages (header, footer, dialogs: <body> outside <main>) against the source chrome
// (the header and footer docs and the age-gate template of chrome.source.file). Recall, ADDED and hiddenShown as for
// pages (the Sunday-first hours lists are hidden everywhere on the source, BUILD-CONTRACT 4.15.3). Built chromes are
// grouped by their text, so identical chromes are compared once; `files` limits the check (controls).
function chromeSource() {
  const chrome = JSON.parse(fs.readFileSync(path.join(WS, 'src/content/chrome.json'), 'utf8'));
  const html = fs.readFileSync(path.join(WS, chrome.source.file), 'utf8');
  let srcUnits = extractUnits(html, 'chrome');
  const tm = /<template[^>]*id=["']tmpl-age-gate["'][^>]*>([\s\S]*?)<\/template>/i.exec(html);
  if (tm) srcUnits = srcUnits.concat(extractUnits(tm[1], 'fragment'));
  const allCorpus = extractUnits(html, 'all').map((u) => u.text);
  const visibleSrc = ' ' + srcUnits.map((u) => norm(u.text)).join('   ') + ' ';
  const vis = new Set(chromeTexts(chrome, { includeHidden: false }).flatMap(sentences));
  const hiddenOnly = [...new Set(chromeTexts(chrome, { includeHidden: true }).flatMap(sentences))].filter((s) => !vis.has(s) && !containsWord(visibleSrc, s) && s.split(' ').length >= 3);
  return { srcUnits, allCorpus, hiddenOnly, file: chrome.source.file };
}
function checkBuiltChrome(opts, files) {
  const S = chromeSource();
  const groups = new Map();
  for (const f of files) {
    const units = extractUnits(fs.readFileSync(f, 'utf8'), 'built-chrome');
    const key = units.map((u) => u.kind + '|' + u.text).join('\n');
    if (!groups.has(key)) groups.set(key, { units, pages: [] });
    groups.get(key).pages.push(path.relative(opts.built, f).split(path.sep).join('/'));
  }
  const row = { slug: '#chrome', path: '#chrome', builtPages: files.length, chromeVariants: groups.size, units: S.srcUnits.length, sentences: 0, found: 0, spacingOnly: 0, declared: 0, recall: 1, missing: [], added: [], addedDeclared: 0, catalogUnits: 0, catalogRejected: [], hiddenShown: [], variants: [] };
  let worst = 1;
  for (const g of groups.values()) {
    const strings = g.units.map((u) => u.text);
    const r = compare({ srcUnits: S.srcUnits, modelStrings: strings, allCorpus: null, pagePath: '#chrome', removals: opts.removals });
    const a = compare({ srcUnits: [], modelStrings: strings, addedUnits: g.units, allCorpus: S.allCorpus, pagePath: '#chrome', removals: opts.removals });
    const B = ' ' + strings.map(norm).join('   ') + ' ';
    const hs = S.hiddenOnly.filter((s) => containsWord(B, s));
    row.variants.push({ pages: g.pages.length, example: g.pages[0], recall: +r.recall.toFixed(6), missing: r.missing.length, added: a.added.length, hiddenShown: hs.length });
    if (r.recall <= worst) { worst = r.recall; Object.assign(row, { sentences: r.sentences, found: r.found, spacingOnly: r.spacingOnly, declared: r.declared, declaredBy: r.declaredBy, addedDeclaredBy: a.addedDeclaredBy, recall: r.recall }); }
    for (const m of r.missing) if (!row.missing.some((x) => x.text === m.text && x.kind === m.kind)) row.missing.push(m);
    for (const x of a.added) if (!row.added.includes(x)) row.added.push(x);
    for (const x of hs) if (!row.hiddenShown.includes(x)) row.hiddenShown.push(x);
    row.addedDeclared = Math.max(row.addedDeclared, a.addedDeclared);
  }
  return row;
}
function builtChromeControls(index, opts, controlDir) {
  const out = [];
  const home = index.pages.find((e) => e.path === '/') || index.pages[0];
  const f = builtFile(opts.built, home.path);
  if (!f) return [{ name: 'built-chrome controls', pass: false, why: 'no built home page' }];
  const html = fs.readFileSync(f, 'utf8');
  const base = checkBuiltChrome(opts, [f]);
  const copy = path.join(controlDir, '_chrome', 'index.html');
  const run = (h) => { fs.mkdirSync(path.dirname(copy), { recursive: true }); fs.writeFileSync(copy, h); return checkBuiltChrome({ ...opts, built: controlDir }, [copy]); };
  const diff = (a, b) => { const B = new Set(b); return a.filter((x) => !B.has(x)); };
  const SAFE = /^[A-Za-z0-9 ,.;:!?()%$-]+$/;
  const S = chromeSource();
  const src = [...new Set(S.srcUnits.filter((u) => u.kind === 'text').flatMap((u) => sentences(u.text)))];
  const fEnd = html.indexOf('</footer>'), mEnd = html.indexOf('</main>');
  const target = src.find((x) => x.split(' ').length >= 6 && SAFE.test(x) && html.split(x).length === 2 && html.indexOf(x) > mEnd && html.indexOf(x) < fEnd && !src.some((y) => y !== x && y.includes(x)) && !base.missing.some((m) => m.text === x));
  if (!target) out.push({ name: 'built-chrome-a: delete a footer sentence -> reported missing', pass: false, why: 'no unique ASCII footer sentence of 6+ words found' });
  else {
    const r = run(html.replace(target, ''));
    const got = diff(r.missing.map((x) => x.text), base.missing.map((x) => x.text));
    out.push({ name: 'built-chrome-a: delete a footer sentence from a copy -> reported missing', deleted: target, got, pass: got.length === 1 && got[0] === target && !diff(r.added, base.added).length });
  }
  const inFooter = (snippet) => html.replace(/<footer\b[^>]*>/i, (x) => x + snippet);
  {
    const invented = 'Zebra lanterns orbit the quiet harbor every 4417 seconds.';
    const r = run(inFooter('<p>' + invented + '</p>'));
    const got = diff(r.added, base.added);
    out.push({ name: 'built-chrome-b: an invented footer sentence -> reported ADDED', inserted: invented, got, pass: got.length === 1 && got[0] === invented });
  }
  const hid = S.hiddenOnly.find((x) => !base.hiddenShown.includes(x));
  if (!hid) out.push({ name: 'built-chrome-c: hidden chrome copy shown -> reported hiddenShown', pass: false, why: 'no hidden-only chrome sentence' });
  else {
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const r = run(inFooter('<p>' + esc(hid) + '</p>'));
    const got = diff(r.hiddenShown, base.hiddenShown);
    out.push({ name: 'built-chrome-c: hidden-everywhere chrome copy shown in the footer -> reported hiddenShown', inserted: hid, got, pass: got.length === 1 && got[0] === hid && !diff(r.added, base.added).length });
  }
  return out;
}

// ------------------------------------------------------------------ positive controls
function controls(index, opts) {
  const out = [];
  // pick deterministically: the first page (index order) with a rich block holding a >= 8-word sentence that occurs
  // exactly once in the model's visible text and is found in the source
  let target = null;
  for (const e of index.pages) {
    const m = readModel(e.slug);
    const base = checkPage(m, opts);
    if (base.missing.length || base.added.length) continue;
    // candidate sentences come from the SOURCE's own sentence list, so the expected report is exact
    const srcSentences = [...new Set(extractUnits(rawOf(m), 'region').filter((u) => u.kind === 'text').flatMap((u) => sentences(u.text)))];
    const all = modelTexts(m, { includeHidden: true }).map(norm).join(' \u2029 ');
    for (const s of m.sections) {
      if (s.hiddenAll) continue;
      for (const b of s.blocks) {
        if (b.t !== 'rich' || b.hiddenAll || !b.html) continue;
        const txt = extractUnits(b.html, 'fragment').map((u) => norm(u.text)).join(' \u2029 ');
        const cand = srcSentences.find((x) => x.split(' ').length >= 8 && txt.includes(x) && all.split(x).length === 2 && srcSentences.filter((y) => y !== x && y.includes(x)).length === 0);
        if (!cand) continue;
        target = { slug: e.slug, sentence: cand };
        break;
      }
      if (target) break;
    }
    if (target) break;
  }
  if (!target) return [{ name: 'controls', pass: false, why: 'no control target found' }];
  const raw = rawOf(readModel(target.slug));
  // (a) delete the sentence from the model in memory -> exactly that sentence is reported missing
  {
    const m = readModel(target.slug);
    let removed = 0;
    const escHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    for (const s of m.sections) for (const b of s.blocks) {
      if (b.t !== 'rich' || !b.html || removed) continue;
      const txt = extractUnits(b.html, 'fragment').map((u) => norm(u.text)).join(' \u2029 ');
      if (!txt.includes(target.sentence)) continue;
      // rebuild the block as plain paragraphs (one per unit) without the target sentence: every other word stays
      b.html = txt.split(' \u2029 ').map((u) => u.split(target.sentence).join(' ').trim()).filter(Boolean).map((u) => '<p>' + escHtml(u) + '</p>').join('');
      removed++;
    }
    const r = checkPage(m, opts, raw);
    const pass = removed === 1 && r.missing.length === 1 && r.missing[0].text === target.sentence && r.added.length === 0;
    out.push({ name: 'control-a: delete one sentence -> reported missing', page: target.slug, sentence: target.sentence, removedFromModel: removed, reportedMissing: r.missing.map((x) => x.text), pass });
  }
  // (b) insert an invented sentence -> reported as ADDED
  {
    const m = readModel(target.slug);
    const invented = 'Zebra lanterns orbit the quiet harbor every 4417 seconds.';
    let done = false;
    for (const s of m.sections) { if (done || s.hiddenAll) continue; for (const b of s.blocks) if (!done && b.t === 'rich' && !b.hiddenAll) { b.html = b.html + '<p>' + invented + '</p>'; done = true; } }
    const r = checkPage(m, opts, raw);
    const pass = done && r.added.length === 1 && r.added[0] === invented && r.missing.length === 0;
    out.push({ name: 'control-b: insert an invented sentence -> reported ADDED', page: target.slug, inserted: invented, reportedAdded: r.added, pass });
  }
  return out;
}

// --built controls (BUILD-CONTRACT 4.16.1): every defect is planted in a COPY of one built page, written under
// controlDir, and judged by the difference from that page's own baseline. So they fire on a dirty build too: the page
// does not need to be clean, only to hold one unique source sentence.
function builtControls(index, opts, controlDir) {
  const out = [];
  const escHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escAttr = (t) => escHtml(t).replace(/"/g, '&quot;');
  const diff = (a, b) => { const B = new Set(b); return a.filter((x) => !B.has(x)); };
  const SAFE = /^[A-Za-z0-9 ,.;:!?()%$-]+$/;   // identical in text and in escaped HTML
  // target: the first page (index order) whose built <main> holds a source sentence of 8+ words exactly once in the file
  let T = null;
  for (const e of index.pages) {
    const m = readModel(e.slug);
    const f = builtFile(opts.built, m.path);
    if (!f) continue;
    const html = fs.readFileSync(f, 'utf8');
    const a = html.search(/<main[\s>]/i), z = html.indexOf('</main>');
    if (a < 0 || z < 0) continue;
    const base = checkPage(m, opts);
    if (base.error) continue;
    const missing = new Set(base.missing.map((x) => x.text));
    const src = [...new Set(extractUnits(rawOf(m), 'region').filter((u) => u.kind === 'text').flatMap((u) => sentences(u.text)))];
    const s = src.find((x) => x.split(' ').length >= 8 && SAFE.test(x) && !missing.has(x) && html.split(x).length === 2 && html.indexOf(x) > a && html.indexOf(x) < z && !src.some((y) => y !== x && y.includes(x)));
    if (s) { T = { m, html, base, sentence: s }; break; }
  }
  if (!T) return [{ name: 'built-controls', pass: false, why: 'no control target found: no built page holds a unique ASCII source sentence of 8+ words inside <main>' }];
  const rel = (() => { try { return decodeURIComponent(T.m.path); } catch { return T.m.path; } })();
  const copyFile = path.join(controlDir, rel, 'index.html');
  const run = (html) => { fs.mkdirSync(path.dirname(copyFile), { recursive: true }); fs.writeFileSync(copyFile, html); return checkPage(T.m, { ...opts, built: controlDir }); };
  const inMain = (snippet) => T.html.replace(/<main\b[^>]*>/i, (x) => x + snippet);
  const judge = (name, r, want, extra = {}) => {
    const got = { missing: diff(r.missing.map((x) => x.text), T.base.missing.map((x) => x.text)), added: diff(r.added, T.base.added), hiddenShown: diff(r.hiddenShown || [], T.base.hiddenShown || []) };
    const lost = { missing: diff(T.base.missing.map((x) => x.text), r.missing.map((x) => x.text)), added: diff(T.base.added, r.added) };
    const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
    const pass = !r.error && same(got.missing, want.missing || []) && same(got.added, want.added || []) && same(got.hiddenShown, want.hiddenShown || []) && !lost.missing.length && !lost.added.length;
    out.push({ name, page: T.m.path, ...extra, expected: { missing: want.missing || [], added: want.added || [], hiddenShown: want.hiddenShown || [] }, got, pass });
  };
  // (a) a source sentence deleted from the copy -> exactly that sentence is newly missing
  judge('built-a: delete one source sentence from a copy of a built page -> reported missing', run(T.html.replace(T.sentence, '')), { missing: [T.sentence] }, { deleted: T.sentence });
  // (b) an invented sentence -> exactly that sentence is ADDED
  const invented = 'Zebra lanterns orbit the quiet harbor every 4417 seconds.';
  judge('built-b: insert an invented sentence -> reported ADDED', run(inMain('<p>' + invented + '</p>')), { added: [invented] }, { inserted: invented });
  // (c) an undeclared accessible name -> ADDED (attributes count, and short labels too)
  const label = 'Quokka lanterns glow twice';
  judge('built-c: insert an undeclared aria-label -> reported ADDED', run(inMain('<span role="img" aria-label="' + label + '"></span>')), { added: [label] }, { inserted: label });
  // (d) data-catalog text that is not a catalog title or brand -> ADDED
  const fake = 'Zebra Lantern Kush | 3.5g | Harbor Cut';
  judge('built-d: data-catalog text not in the catalog -> reported ADDED', run(inMain('<ul data-catalog="products"><li>' + escHtml(fake) + '</li></ul>')), { added: [norm(fake)] }, { inserted: fake });
  // (e) a declared allowedAdded string and a real catalog title inside data-catalog -> nothing ADDED; and (f) the same
  // title outside data-catalog -> ADDED, so the exemption is scoped to data-catalog
  const F = ' ' + extractUnits(rawOf(T.m), 'all').map((u) => norm(u.text)).join('   ') + ' ';
  const declared = opts.removals.allowedAdded.find((x) => x.n && (!x.pages || x.pages === '*') && !x.kinds && sentences(x.n).length === 1 && !containsWord(F, x.n));
  const cat = catalogNames();
  let title = null;
  try {
    const p = JSON.parse(fs.readFileSync(path.join(WS, 'src/content/catalog/products.json'), 'utf8'));
    const list = Array.isArray(p) ? p : p.products || [];
    const t = list.map((x) => x && x.title).find((x) => x && SAFE.test(x.replace(/[|&'"]/g, '')) && sentences(x).length === 1 && cat.has(norm(x)) && !containsWord(F, norm(x)) && !matchRemoval(opts.removals.allowedAdded, norm(x), T.m.path));
    title = t || null;
  } catch { title = null; }
  if (!declared) out.push({ name: 'built-e: declared and catalog strings pass', pass: false, why: 'removals.json allowedAdded[] has no page-wide text entry to test with' });
  else if (!title) out.push({ name: 'built-e: declared and catalog strings pass', pass: false, why: 'no catalog product title to test with' });
  else {
    judge('built-e: a declared allowedAdded string and a catalog title inside data-catalog -> nothing reported', run(inMain('<p>' + escHtml(declared.text) + '</p><ul data-catalog="products"><li>' + escHtml(title) + '</li></ul>')), {}, { inserted: [declared.text, title], declaredId: declared.id });
    judge('built-f: the same catalog title outside data-catalog -> reported ADDED', run(inMain('<p>' + escHtml(title) + '</p>')), { added: [norm(title)] }, { inserted: title });
  }
  // (g) hidden-everywhere copy shown -> hiddenShown. Target: the first page (index order) with hidden-only copy.
  let H = null;
  for (const e of index.pages) {
    const m = readModel(e.slug);
    const f = builtFile(opts.built, m.path);
    if (!f) continue;
    const srcUnits = extractUnits(rawOf(m), 'region');
    const visibleSrc = ' ' + srcUnits.map((u) => norm(u.text)).join('   ') + ' ';
    const hid = [...hiddenOnlySentences(m, srcUnits, visibleSrc)];
    if (!hid.length) continue;
    const base = checkPage(m, opts);
    const s = hid.find((x) => !(base.hiddenShown || []).includes(x));
    if (s) { H = { m, html: fs.readFileSync(f, 'utf8'), base, sentence: s }; break; }
  }
  if (!H) out.push({ name: 'built-g: hidden copy shown -> reported hiddenShown', pass: false, why: 'no page with hidden-only copy found' });
  else {
    const relH = (() => { try { return decodeURIComponent(H.m.path); } catch { return H.m.path; } })();
    const fH = path.join(controlDir, relH, 'index.html');
    fs.mkdirSync(path.dirname(fH), { recursive: true });
    fs.writeFileSync(fH, H.html.replace(/<main\b[^>]*>/i, (x) => x + '<p>' + escHtml(H.sentence) + '</p>'));
    const r = checkPage(H.m, { ...opts, built: controlDir });
    const got = diff(r.hiddenShown || [], H.base.hiddenShown || []);
    const addedNew = diff(r.added, H.base.added), missingNew = diff(r.missing.map((x) => x.text), H.base.missing.map((x) => x.text));
    out.push({ name: 'built-g: hidden-everywhere copy shown -> reported hiddenShown', page: H.m.path, inserted: H.sentence, got: { hiddenShown: got, added: addedNew, missing: missingNew }, pass: !r.error && got.length === 1 && got[0] === H.sentence && !addedNew.length && !missingNew.length });
  }
  out.push({ name: 'built-controls: planted copies', dir: path.relative(WS, controlDir).split(path.sep).join('/'), files: [path.relative(WS, copyFile).split(path.sep).join('/')].concat(H ? [path.relative(WS, path.join(controlDir, (() => { try { return decodeURIComponent(H.m.path); } catch { return H.m.path; } })(), 'index.html')).split(path.sep).join('/')] : []), pass: true, note: 'the built pages themselves are never modified' });
  return out;
}

// ------------------------------------------------------------------ main
function main() {
  const args = process.argv.slice(2);
  const arg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
  const opts = { built: arg('--built') ? path.resolve(arg('--built')) : null, removals: loadRemovals() };
  if (opts.removals.problems.length) {
    console.error('src/content/removals.json is malformed (every entry needs an id, a reason, and text or pattern):');
    for (const p of opts.removals.problems) console.error('  - ' + p);
    process.exit(2);
  }
  const controlDir = path.resolve(arg('--control-dir') || path.join(WS, 'tmp', 'text-parity-control'));
  if (opts.built && (controlDir === opts.built || controlDir.startsWith(opts.built + path.sep))) { console.error('--control-dir must not be inside the --built dist'); process.exit(2); }
  const index = JSON.parse(fs.readFileSync(path.join(PAGES, '_index.json'), 'utf8'));
  const only = arg('--page');
  const rows = [];
  for (const e of index.pages) {
    if (only && e.slug !== only) continue;
    rows.push(checkPage(readModel(e.slug), opts));
  }
  if (!only && !opts.built) rows.push(checkChrome(opts));
  if (!only && opts.built) rows.push(checkBuiltChrome(opts, index.pages.map((e) => builtFile(opts.built, e.path)).filter(Boolean)));
  const tot = { pages: rows.length, units: 0, sentences: 0, found: 0, spacingOnly: 0, declared: 0, missing: 0, added: 0, hiddenShown: opts.built ? 0 : undefined, addedDeclared: opts.built ? 0 : undefined, catalogUnits: opts.built ? 0 : undefined, catalogRejected: opts.built ? 0 : undefined, pagesBelow1: 0, pagesWithAdded: 0, errors: 0, declaredBy: {}, addedDeclaredBy: {} };
  for (const r of rows) {
    if (r.error) { tot.errors++; continue; }
    tot.units += r.units; tot.sentences += r.sentences; tot.found += r.found; tot.spacingOnly += r.spacingOnly; tot.declared += r.declared; tot.missing += r.missing.length; tot.added += r.added.length;
    if (opts.built) { tot.addedDeclared += r.addedDeclared || 0; tot.catalogUnits += r.catalogUnits || 0; tot.catalogRejected += (r.catalogRejected || []).length; }
    for (const [k, v] of Object.entries(r.declaredBy || {})) tot.declaredBy[k] = (tot.declaredBy[k] || 0) + v;
    for (const [k, v] of Object.entries(r.addedDeclaredBy || {})) tot.addedDeclaredBy[k] = (tot.addedDeclaredBy[k] || 0) + v;
    if (r.hiddenShown) tot.hiddenShown += r.hiddenShown.length;
    if (r.missing.length) tot.pagesBelow1++;
    if (r.added.length) tot.pagesWithAdded++;
  }
  tot.recall = tot.sentences ? +((tot.found + tot.declared) / tot.sentences).toFixed(6) : 1;
  // entries that matched nothing in this run (informational: a stale declaration, or one for the other mode)
  if (!only) tot.unusedEntries = { removals: opts.removals.items.map((x) => x.id).filter((id) => !tot.declaredBy[id]), allowedAdded: opts.removals.allowedAdded.map((x) => x.id).filter((id) => !tot.addedDeclaredBy[id]) };
  const wantControls = args.includes('--control') && !only;
  const report = { mode: opts.built ? 'built:' + path.relative(WS, opts.built) : 'models', totals: tot, controls: wantControls ? (opts.built ? builtControls(index, opts, controlDir).concat(builtChromeControls(index, opts, controlDir)) : controls(index, opts)) : undefined, pages: rows.map((r) => ({ ...r, recall: r.recall != null ? +r.recall.toFixed(6) : r.recall })) };
  if (arg('--json')) fs.writeFileSync(path.resolve(arg('--json')), JSON.stringify(report, null, 1) + '\n');
  if (!args.includes('--quiet')) {
    for (const r of rows) {
      if (r.error) { console.log('ERR ', r.path, r.error); continue; }
      if (r.hiddenShown && r.hiddenShown.length) {
        console.log('HIDE ' + r.path + '  hidden-everywhere copy rendered visibly: ' + r.hiddenShown.length);
        for (const x of r.hiddenShown.slice(0, only ? 999 : 4)) console.log('    ! ' + x.slice(0, 220));
      }
      if (only || r.missing.length || r.added.length) {
        console.log((r.missing.length ? 'MISS' : 'ADD ') + ' ' + r.path + '  recall ' + r.recall.toFixed(4) + ' (' + (r.found + r.declared) + '/' + r.sentences + ')  missing ' + r.missing.length + '  added ' + r.added.length);
        for (const x of r.missing.slice(0, only ? 999 : 6)) console.log('    - [' + x.kind + '] ' + x.text.slice(0, 220));
        for (const x of r.added.slice(0, only ? 999 : 4)) console.log('    + ' + x.slice(0, 220));
      }
    }
  }
  console.log(JSON.stringify({ totals: tot, controls: report.controls }, null, 1));
  const controlsOk = !report.controls || report.controls.every((c) => c.pass);
  process.exit(tot.missing === 0 && tot.added === 0 && !tot.hiddenShown && tot.errors === 0 && controlsOk ? 0 : 1);
}
const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) main();
export { extractUnits, sentences, compare, modelTexts, catalogNames, loadRemovals };
