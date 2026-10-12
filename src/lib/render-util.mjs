// render-util.mjs - escaping, link resolution, rich-HTML rewriting, relativizing and output scans (PIPELINE-SITE).
import { splitInternal, isInternal, namesOrigin, encodePath, relUrl, withSlash } from './paths.mjs';
import { stripTracking } from './policy.mjs';

/** the CONTENT-MODEL block vocabulary (docs/CONTENT-MODEL.md section 5) plus the build's own derived-page types */
export const KNOWN_BLOCKS = new Set([
  'heading', 'rich', 'image', 'button', 'faq', 'carousel', 'gallery', 'posts', 'cta', 'products', 'reviews', 'hours',
  'embed', 'html', 'form', 'hotspot', 'timeline', 'meta', 'postnav', 'comments', 'event-field', 'anchor', 'icon',
  'divider', 'nav', 'search', 'social', 'chrome-ref', 'app', 'sitemap', 'excluded',
]);

/** platform residue that must never reach the output (BUILD-CONTRACT 3.1 + this role's brief) */
export const RESIDUE = ['wp-content', 'elementor', 'joint-ecommerce', 'litespeed', 'gtranslate', 'googletagmanager', 'rankreallyhigh'];
export const RESIDUE_RE = new RegExp(RESIDUE.map((s) => s.replace(/[-]/g, '\\-')).join('|'), 'gi');

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const escAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** attrs({ a: 1, b: null, c: true }) -> ' a="1" c' (null/false/undefined dropped) */
export function attrs(o) {
  let s = '';
  for (const [k, v] of Object.entries(o || {})) {
    if (v === null || v === undefined || v === false) continue;
    s += v === true ? ' ' + k : ' ' + k + '="' + escAttr(v) + '"';
  }
  return s;
}

/**
 * Link resolution over the route map. resolve(u, fromPath) ->
 *   { href }            internal, root-relative, percent-encoded, trailing slash, query and hash kept
 *   { href, external }  another host (kept as is)
 *   { unlink, reason }  render the text without a link (dead, not built, platform-only, or a live-site URL)
 */
export class Linker {
  constructor(routes) {
    this.paths = new Set(routes.routes.map((r) => r.path));
    this.redirects = new Map(routes.redirects.map((r) => [withSlash(r.from), r.to]));
    this.dead = new Map(routes.deadLinks.map((d) => [d.path, d]));
    this.notBuilt = new Map(routes.notBuilt.map((n) => [withSlash(String(n.path).split('?')[0]), n]));
    this.lower = new Map([...this.paths].map((p) => [p.toLowerCase(), p]));
    this.log = new Map();   // reason|target -> { count, pages:Set }
  }
  note(kind, target, from) {
    const k = kind + '|' + target;
    if (!this.log.has(k)) this.log.set(k, { kind, target, count: 0, pages: new Set() });
    const e = this.log.get(k); e.count++; if (e.pages.size < 5) e.pages.add(from);
  }
  /** follow aliases and redirects to a built path, or null */
  final(p) {
    let cur = p;
    for (let i = 0; i < 4; i++) {
      if (this.paths.has(cur)) return cur;
      const nx = this.redirects.get(cur);
      if (!nx) break;
      cur = nx;
    }
    return null;
  }
  resolve(u, from = '/') {
    if (u === null || u === undefined) return { unlink: true, reason: 'no href' };
    const raw = String(u).trim();
    if (!raw) return { unlink: true, reason: 'empty href' };
    if (raw.startsWith('#')) return { href: raw };
    if (/^(mailto|tel|sms):/i.test(raw)) return { href: raw, external: true };
    if (!isInternal(raw)) {
      if (/^javascript:/i.test(raw)) { this.note('unlinked:javascript', raw, from); return { unlink: true, reason: 'javascript: link' }; }
      if (namesOrigin(raw)) { this.note('unlinked:live-site-url-inside-external-link', raw, from); return { unlink: true, reason: 'external link that carries a live-site URL (feed or export of the old platform)' }; }
      return { href: raw, external: true };
    }
    const sp = splitInternal(raw, from);
    if (!sp) return { unlink: true, reason: 'unparsable' };
    if (/^\/?(wp-admin|wp-json|wp-login\.php|xmlrpc\.php)/.test(sp.path.slice(1)) || /[?&](ical|outlook-ical)=/.test(sp.search)) {
      this.note('unlinked:platform-endpoint', sp.path + sp.search, from);
      return { unlink: true, reason: 'platform endpoint (no static equivalent)' };
    }
    let target = this.final(sp.path);
    if (!target && this.lower.has(sp.path.toLowerCase())) target = this.lower.get(sp.path.toLowerCase());
    if (!target) {
      const d = this.dead.get(sp.path);
      if (d && d.retarget) { this.note('retargeted:dead-link', sp.path + ' -> ' + d.retarget, from); target = d.retarget; }
      else {
        const nb = this.notBuilt.get(sp.path);
        const kind = d ? 'unlinked:dead-on-live-site' : nb ? 'unlinked:not-built' : 'unlinked:unknown-internal-target';
        this.note(kind, sp.path + sp.search, from);
        return { unlink: true, reason: d ? d.why : nb ? nb.why : 'no route for ' + sp.path };
      }
    }
    if (target !== sp.path && !this.dead.has(sp.path)) this.note('followed:redirect', sp.path + ' -> ' + target, from);
    /* BUILD-CONTRACT 4.15.4: _gl, _ga and utm_* are stripped from internal links; any other query is kept */
    const tr = stripTracking(sp.search);
    if (tr.stripped.length) this.note('stripped:tracking-params', sp.path + ' (' + [...new Set(tr.stripped)].sort().join(', ') + ')', from);
    return { href: encodePath(target) + tr.search + sp.hash, path: target };
  }
  report() {
    return [...this.log.values()].map((e) => ({ kind: e.kind, target: e.target, count: e.count, examples: [...e.pages].sort() })).sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.target < b.target ? -1 : 1));
  }
}

/**
 * Rewrite a model's rich HTML fragment: <a href> through the linker (unresolvable -> text kept, link dropped),
 * <img> through ctx.img (responsive WebP, or a styled empty frame). The fragment is already allowlisted by
 * the content lane; this only touches URLs.
 */
export function rewriteRich(html, ctx, from) {
  let out = String(html ?? '');
  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, a, inner) => {
    const hm = a.match(/\shref\s*=\s*"([^"]*)"|\shref\s*=\s*'([^']*)'/i);
    const href = hm ? (hm[1] ?? hm[2]).replace(/&amp;/g, '&') : null;
    const r = ctx.link(href, from);
    if (r.unlink) return inner;
    const rest = a.replace(/\shref\s*=\s*("[^"]*"|'[^']*')/i, '').replace(/\s(class|id|style|data-[\w-]+)\s*=\s*("[^"]*"|'[^']*')/gi, '');
    const ext = r.external && /^https?:/i.test(r.href) && !/\srel=/i.test(rest) ? ' rel="noopener"' : '';
    return '<a href="' + escAttr(r.href) + '"' + rest + ext + '>' + inner + '</a>';
  });
  out = out.replace(/<img\b([^>]*?)\/?>/gi, (m, a) => {
    const get = (n) => { const x = a.match(new RegExp('\\s' + n + '\\s*=\\s*"([^"]*)"', 'i')); return x ? x[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"') : null; };
    /* a model image without a local file keeps its source URL in data-source-url (late images resolve through it) */
    const src = get('data-src') || get('src') || get('data-source-url');
    return ctx.img(src, { alt: get('alt') ?? '', title: get('title') || undefined, width: get('width'), height: get('height'), sizes: '(max-width: 800px) 100vw, 800px' });
  });
  return out;
}

/** split html into [outside, scriptBody, outside, ...]: the <script ...> tags themselves (src=) stay outside, only
    the bodies (JSON-LD, inline code) are protected from URL passes */
function splitScripts(html) {
  const parts = [];
  let last = 0;
  for (const m of html.matchAll(/(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)/gi)) {
    const bodyStart = m.index + m[1].length;
    parts.push([false, html.slice(last, bodyStart)]);
    parts.push([true, m[2]]);
    last = bodyStart + m[2].length;
  }
  parts.push([false, html.slice(last)]);
  return parts;
}
/** root-absolute URLs left in URL attributes outside script bodies (a page must have none after relativizing) */
export function rootAbsoluteLeft(html) {
  const left = [];
  for (const [isScript, s] of splitScripts(html)) {
    if (isScript) continue;
    for (const m of s.matchAll(/\s(?:href|src|poster|action|data-src|data-href)\s*=\s*(?:"(\/(?!\/)[^"]*)"|'(\/(?!\/)[^']*)')/gi)) { left.push(m[1] ?? m[2]); if (left.length > 3) return left; }
    for (const m of s.matchAll(/url\(\s*["']?(\/(?!\/)[^"')]*)/gi)) { left.push(m[1]); if (left.length > 3) return left; }
  }
  return left;
}

const URL_ATTR_RE = /(\s(?:href|src|poster|action|data-src|data-href)\s*=\s*")(\/(?!\/)[^"]*)(")/gi;
const URL_ATTR_SQ_RE = /(\s(?:href|src|poster|action|data-src|data-href)\s*=\s*')(\/(?!\/)[^']*)(')/gi;
const SRCSET_RE = /(\s(?:srcset|imagesrcset|data-srcset)\s*=\s*")([^"]*)(")/gi;
const SRCSET_SQ_RE = /(\s(?:srcset|imagesrcset|data-srcset)\s*=\s*')([^']*)(')/gi;
const CSS_URL_RE = /(url\(\s*["']?)(\/(?!\/)[^"')]*)(["']?\s*\))/gi;
/**
 * Make every root-relative URL in a page page-relative (dist/ then works from any directory and under a Pages
 * subpath). collect(rootRelativeUrl) is called for each one, for the build's dead-link check. 404.html is
 * written with root-relative URLs instead (served at any depth): pass relativize=false.
 */
export function relativizeHtml(html, pagePath, collect, relativize = true) {
  const fix = (u) => { collect(u); return relativize ? relUrl(pagePath, u) : u; };
  const srcset = (m, a, v, z) => a + v.split(',').map((c) => { const t = c.trim(); if (!t) return t; const [u, ...d] = t.split(/\s+/); return (u.startsWith('/') && !u.startsWith('//') ? fix(u) : u) + (d.length ? ' ' + d.join(' ') : ''); }).join(', ') + z;
  return splitScripts(html).map(([isScript, s]) => {
    if (isScript) return s;
    return s
      .replace(URL_ATTR_RE, (m, a, u, z) => a + fix(u) + z)
      .replace(URL_ATTR_SQ_RE, (m, a, u, z) => a + fix(u) + z)
      .replace(SRCSET_RE, srcset)
      .replace(SRCSET_SQ_RE, srcset)
      .replace(/(\sstyle\s*=\s*")([^"]*)(")/gi, (m, a, v, z) => a + v.replace(CSS_URL_RE, (mm, p, u, q) => p + fix(u) + q) + z)
      .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (m, a, v, z) => a + v.replace(CSS_URL_RE, (mm, p, u, q) => p + fix(u) + q) + z);
  }).join('');
}

/** count <h1> elements outside comments and scripts */
export function countH1(html) {
  const body = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  return (body.match(/<h1[\s>]/gi) || []).length;
}

/** residue hits in a text, each with a little context */
export function residueHits(text) {
  const hits = [];
  for (const m of String(text).matchAll(RESIDUE_RE)) { hits.push({ term: m[0].toLowerCase(), at: m.index, context: text.slice(Math.max(0, m.index - 60), m.index + 60) }); if (hits.length > 5) break; }
  return hits;
}

/** walk every block (nested slides, faq items, ...) and call fn(block, parentArray, index) */
export function walkBlocks(blocks, fn) {
  if (!Array.isArray(blocks)) return;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b || typeof b !== 'object') continue;
    fn(b, blocks, i);
    if (Array.isArray(b.blocks)) walkBlocks(b.blocks, fn);
    for (const k of ['slides', 'items']) if (Array.isArray(b[k])) for (const it of b[k]) if (it && Array.isArray(it.blocks)) walkBlocks(it.blocks, fn);
  }
}
