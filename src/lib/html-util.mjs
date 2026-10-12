// html-util.mjs - shared HTML helpers for the content pipeline (Node builtins only).
// Owner: PIPELINE-CONTENT. PIPELINE-SITE may import this module; it must not edit it.
//
// A tolerant tokenizer + tree builder. Every element node keeps source offsets
// (s = start of its start tag, e = end of its end tag) so callers can slice outerHTML.
// Node shape: { tag, attrs, children, parent, s, e }   text: { tag:'#text', text, raw? }
// Derived from the UNDERSTAND prototype (tmp/understand/content/lib-html.mjs), with a linear-time
// raw-text scan, a wider entity table and a rich-text sanitizer that takes href/img mappers.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'noembed', 'noframes']);
// Start tags that implicitly close an open <p>.
const CLOSES_P = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);

const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ',
  zwnj: '‌', zwj: '‍', shy: '­', ndash: '–', mdash: '—', hellip: '…', rsquo: '’',
  lsquo: '‘', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„', prime: '′', Prime: '″',
  middot: '·', bull: '•', copy: '©', reg: '®', trade: '™', deg: '°', times: '×',
  divide: '÷', plusmn: '±', micro: 'µ', para: '¶', sect: '§', cent: '¢', pound: '£',
  euro: '€', yen: '¥', laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›', frac12: '½',
  frac14: '¼', frac34: '¾', sup1: '¹', sup2: '²', sup3: '³', ordf: 'ª', ordm: 'º',
  iexcl: '¡', iquest: '¿', acute: '´', cedil: '¸', uml: '¨', macr: '¯', not: '¬',
  larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔', hearts: '♥', star: '☆',
  check: '✓', aacute: 'á', agrave: 'à', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å',
  aelig: 'æ', ccedil: 'ç', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', iacute: 'í',
  igrave: 'ì', icirc: 'î', iuml: 'ï', ntilde: 'ñ', oacute: 'ó', ograve: 'ò', ocirc: 'ô',
  otilde: 'õ', ouml: 'ö', oslash: 'ø', uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü',
  yacute: 'ý', yuml: 'ÿ', szlig: 'ß', Aacute: 'Á', Eacute: 'É', Ntilde: 'Ñ', Ouml: 'Ö',
  Uuml: 'Ü', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε',
  theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', omega: 'ω', infin: '∞',
  le: '≤', ge: '≥', ne: '≠', minus: '−', lowast: '∗', dagger: '†', Dagger: '‡',
};
export function decode(s) {
  return String(s == null ? '' : s).replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);?/g, (m, g) => {
    if (g[0] === '#') {
      const c = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(c) && c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : m;
    }
    const v = ENT[g] ?? ENT[g.toLowerCase()];
    return v === undefined ? m : v;
  });
}

const ATTR_RE = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
function parseAttrs(str) {
  const out = {};
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(str))) {
    const k = m[1].toLowerCase();
    if (k in out) continue;
    out[k] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

export function parse(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null, s: 0, e: html.length };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const len = html.length;
  let i = 0;
  const pushText = (a, b) => {
    if (b > a) top().children.push({ tag: '#text', text: html.slice(a, b), s: a, e: b, parent: top() });
  };
  const closeTo = (name, at) => {
    for (let k = stack.length - 1; k > 0; k--) {
      if (stack[k].tag === name) {
        for (let j = stack.length - 1; j >= k; j--) stack[j].e = at;
        stack.length = k;
        return true;
      }
    }
    return false;
  };
  while (i < len) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { pushText(i, len); break; }
    pushText(i, lt);
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      const e = end < 0 ? len : end + 3;
      top().children.push({ tag: '#comment', text: html.slice(lt + 4, end < 0 ? len : end), s: lt, e, parent: top() });
      i = e;
      continue;
    }
    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      const end = html.indexOf('>', lt);
      i = end < 0 ? len : end + 1;
      continue;
    }
    if (html[lt + 1] === '/') {
      const m = /^<\/([a-zA-Z][\w:-]*)[^>]*>/.exec(html.slice(lt, lt + 200));
      if (!m) { pushText(lt, lt + 1); i = lt + 1; continue; }
      closeTo(m[1].toLowerCase(), lt + m[0].length);
      i = lt + m[0].length;
      continue;
    }
    const nm = /^<([a-zA-Z][\w:-]*)/.exec(html.slice(lt, lt + 100));
    if (!nm) { pushText(lt, lt + 1); i = lt + 1; continue; }
    let j = lt + nm[0].length;
    let q = null;
    while (j < len) {
      const c = html[j];
      if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') break;
      j++;
    }
    const tagEnd = Math.min(j + 1, len);
    const name = nm[1].toLowerCase();
    const attrStr = html.slice(lt + nm[0].length, j);
    const selfClosing = /\/\s*$/.test(attrStr);
    if (CLOSES_P.has(name) && top().tag === 'p') { top().e = lt; stack.pop(); }
    if (name === 'li') {
      for (let k = stack.length - 1; k > 0; k--) {
        const t = stack[k].tag;
        if (t === 'li') { closeTo('li', lt); break; }
        if (t === 'ul' || t === 'ol' || t === 'div' || t === 'nav') break;
      }
    }
    if (name === 'option' && top().tag === 'option') { top().e = lt; stack.pop(); }
    const node = { tag: name, attrs: parseAttrs(attrStr), children: [], parent: top(), s: lt, e: tagEnd };
    top().children.push(node);
    if (RAW.has(name)) {
      const re = new RegExp('</' + name + '\\s*>', 'gi');
      re.lastIndex = tagEnd;
      const m = re.exec(html);
      const ce = m ? m.index : len;
      node.children.push({ tag: '#text', text: html.slice(tagEnd, ce), s: tagEnd, e: ce, parent: node, raw: true });
      node.e = m ? m.index + m[0].length : len;
      i = node.e;
      continue;
    }
    if (VOID.has(name) || (selfClosing && (name === 'svg' || name === 'path' || name.includes(':') || stack.some((n) => n.tag === 'svg')))) {
      i = tagEnd;
      continue;
    }
    stack.push(node);
    i = tagEnd;
  }
  for (let k = stack.length - 1; k > 0; k--) stack[k].e = len;
  return root;
}

export const isEl = (n) => !!n && typeof n.tag === 'string' && n.tag[0] !== '#';
export const cls = (n) => (n && n.attrs && n.attrs.class ? n.attrs.class.split(/\s+/).filter(Boolean) : []);
export const hasCls = (n, c) => cls(n).includes(c);
export const elChildren = (n) => (n && n.children ? n.children.filter(isEl) : []);

export function walk(n, fn, depth = 0) {
  if (fn(n, depth) === false) return;
  if (n.children) for (const c of n.children) walk(c, fn, depth + 1);
}
export function findAll(n, pred) {
  const out = [];
  walk(n, (x) => { if (isEl(x) && pred(x)) out.push(x); });
  return out;
}
export function findFirst(n, pred) {
  let hit = null;
  walk(n, (x) => {
    if (hit) return false;
    if (isEl(x) && pred(x)) { hit = x; return false; }
    return undefined;
  });
  return hit;
}
export function isAncestor(a, b) {
  for (let x = b && b.parent; x; x = x.parent) if (x === a) return true;
  return false;
}

// Text of a subtree, with line breaks at block boundaries. opts.skip(node) => true prunes a subtree.
const BLOCKISH = new Set(['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'section', 'br', 'article', 'header', 'footer', 'ul', 'ol', 'figcaption', 'blockquote', 'td', 'th', 'dt', 'dd', 'nav', 'main', 'aside', 'form', 'table', 'button', 'label', 'option', 'details', 'summary', 'figure', 'pre', 'hr', 'caption']);
const NONTEXT = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe', 'object', 'video', 'audio', 'canvas', 'textarea', 'title', '#comment']);
export function textOf(n, opts = {}) {
  const parts = [];
  const rec = (x) => {
    if (!x) return;
    if (x.tag === '#text') { if (!x.raw) parts.push(decode(x.text)); return; }
    if (NONTEXT.has(x.tag)) return;
    if (opts.skip && opts.skip(x)) return;
    const blk = BLOCKISH.has(x.tag);
    if (blk) parts.push('\n');
    if (x.children) for (const c of x.children) rec(c);
    if (blk) parts.push('\n');
  };
  rec(n);
  return parts.join('').replace(/[ \t \r\f\v]+/g, ' ').replace(/ *\n[ \n]*/g, '\n').trim();
}
export const squash = (s) => String(s == null ? '' : s).replace(/[\s ]+/g, ' ').trim();
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
export const outer = (html, n) => html.slice(n.s, n.e);

// ---------- rich-text sanitizer ----------
// Allowlist from docs/CONTENT-MODEL.md section 5 (center -> p). Every other tag is unwrapped; style/class/id dropped.
export const RICH_ALLOW = {
  p: [], br: [], strong: [], b: [], em: [], i: [], u: [], s: [], sup: [], sub: [], small: [], mark: [], code: [], pre: [],
  blockquote: [], hr: [], a: ['href', 'target', 'rel', 'title'], ul: [], ol: ['start', 'type'], li: [], dl: [], dt: [], dd: [],
  h2: [], h3: [], h4: [], h5: [], h6: [], table: [], thead: [], tbody: [], tfoot: [], tr: [], th: ['colspan', 'rowspan', 'scope'],
  td: ['colspan', 'rowspan'], caption: [], img: ['src', 'alt', 'width', 'height', 'title'], figure: [], figcaption: [], center: [],
};
const RICH_DROP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe', 'form', 'input', 'select', 'textarea', 'object', 'video', 'audio', 'canvas', 'link', 'meta', 'title', '#comment']);
const VOID_OUT = new Set(['br', 'hr', 'img']);

// opts.link(attrs) -> {href, extra: {attr: value}} | null      (rewrites <a>)
// opts.img(node)   -> {src, alt, width, height, title, extra: {...}} | null  (rewrites <img>; null drops it)
// opts.skip(node)  -> true drops a subtree (e.g. hidden honeypots)
export function sanitizeRich(nodes, opts = {}) {
  let out = '';
  const attrStr = (pairs) => pairs.filter(([, v]) => v != null && v !== '').map(([k, v]) => ' ' + k + '="' + escAttr(v) + '"').join('');
  const rec = (x) => {
    if (x.tag === '#text') { if (!x.raw) out += esc(decode(x.text)); return; }
    if (RICH_DROP.has(x.tag)) return;
    if (opts.skip && opts.skip(x)) return;
    const allow = RICH_ALLOW[x.tag];
    if (!allow) { for (const c of x.children || []) rec(c); return; }
    const tag = x.tag === 'center' ? 'p' : x.tag;
    let at = '';
    if (tag === 'img') {
      const r = opts.img ? opts.img(x) : { src: x.attrs.src, alt: x.attrs.alt, width: x.attrs.width, height: x.attrs.height, title: x.attrs.title };
      if (!r) return;
      at = attrStr([['src', r.src], ['alt', r.alt == null ? null : r.alt], ['width', r.width], ['height', r.height], ['title', r.title], ...Object.entries(r.extra || {})]);
      if (r.alt === '') at += ' alt=""';
    } else if (tag === 'a') {
      const r = opts.link ? opts.link(x.attrs) : { href: x.attrs.href };
      const pairs = [['href', r ? r.href : null], ['target', x.attrs.target], ['rel', x.attrs.rel], ['title', x.attrs.title], ...Object.entries((r && r.extra) || {})];
      at = attrStr(pairs);
    } else {
      at = attrStr(allow.map((k) => [k, x.attrs[k]]));
    }
    out += '<' + tag + at + '>';
    if (!VOID_OUT.has(tag)) { for (const c of x.children || []) rec(c); out += '</' + tag + '>'; }
  };
  for (const n of nodes) rec(n);
  // an empty inline wrapper that only holds whitespace (e.g. "and<b> </b><a>apparel</a>") keeps that space
  return out.replace(/\s+/g, ' ').replace(/<p>\s*<\/p>/g, '').replace(/<(strong|b|em|i|u|span|small)>(\s*)<\/\1>/g, (m, t, ws) => (ws ? ' ' : '')).replace(/ {2,}/g, ' ').trim();
}

// Plain text of a sanitized rich-html string (block tags become line breaks).
export function richText(html) {
  return decode(String(html || '')
    .replace(/<br\s*\/?>|<\/?(p|li|ul|ol|h[1-6]|tr|td|th|table|thead|tbody|tfoot|caption|div|blockquote|dt|dd|dl|figure|figcaption|pre|hr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .split('\n').map(squash).filter(Boolean).join('\n');
}

// Deterministic JSON: drops undefined, keeps insertion order (callers build objects in a fixed order).
export function stableJson(obj, indent = 1) {
  return JSON.stringify(obj, (k, v) => (v === undefined ? undefined : v), indent) + '\n';
}
