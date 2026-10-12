// layout-signature.mjs — one measurement of "what shape is this block", used on BOTH sides
// of a preset match.
//
// ONE function, deliberately. A matcher that measures the source with one extractor and the
// preset library with another is two implementations of the same contract, and the failure
// mode is silent: the two disagree by a constant and every match rate is wrong in the same
// direction, so the numbers stay plausible and nothing looks broken. This file exists so
// that cannot happen — sr-match calls `signature()` twice and compares the results.
//
// LAYOUT ONLY. Every field below is a count or a ratio of the markup: how many images, how
// deep the tree goes, how many siblings sit in the widest row. Nothing here reads a class
// name, a heading's words, or a description. Names are text and text is not shape — a block
// called "hero" whose markup is a three-column card grid is a three-column card grid.
//
// Text LENGTH is measured; text CONTENT is not. Length is layout: a 40-character heading and
// a 900-character paragraph occupy different amounts of a page.

const VOID = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
const RAW = /^(?:script|style)$/i;

/** Strip script and style CONTENT. Markup spelled inside a JS string is not markup. */
export function stripRawText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

/** Visible text length, entities collapsed to one char each so &amp; is not five. */
export function textLength(html) {
  return stripRawText(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, 'x')
    .replace(/\s+/g, ' ')
    .trim().length;
}

/**
 * Depth of the element tree, and the largest number of ELEMENT children any single element
 * holds. The second is the column count of a grid or a row when there is one, and is the
 * single most discriminating layout feature measured here: a two-up split and a four-card
 * grid differ in almost nothing else.
 */
export function treeShape(html) {
  const src = stripRawText(html);
  // One forward walk over opening AND closing tags. Each open pushes an id, each close pops
  // one; a child is attributed to whatever id is on top of the stack when it opens. Void and
  // self-closed elements are counted as children and never pushed, or every <img> would
  // deepen the tree by one and a media-heavy block would read as a deeply nested one.
  //
  // Unbalanced markup does not throw: a stray close on an empty stack is ignored, and a tag
  // left open at the end simply never pops. The same approximation is applied to both sides
  // of every comparison, which is what makes it usable.
  let depth = 0, maxDepth = 0, maxSiblings = 0, nextId = 0;
  const openStack = [];
  const kids = new Map();
  for (const m of src.matchAll(/<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
    const raw = m[0];
    const tag = m[1].toLowerCase();
    if (RAW.test(tag)) continue;
    if (raw.startsWith('</')) {
      if (openStack.length) { openStack.pop(); depth--; }
      continue;
    }
    const parent = openStack[openStack.length - 1];
    if (parent !== undefined) kids.set(parent, (kids.get(parent) || 0) + 1);
    if (VOID.test(tag) || /\/>$/.test(raw)) continue;
    openStack.push(nextId++);
    depth++;
    if (depth > maxDepth) maxDepth = depth;
  }
  for (const n of kids.values()) if (n > maxSiblings) maxSiblings = n;
  return { maxDepth, maxSiblings };
}

const COUNTERS = [
  ['media', /<(?:img|picture|svg|video|iframe)\b/gi],
  ['headings', /<h[1-6]\b/gi],
  ['paragraphs', /<p\b/gi],
  ['lists', /<(?:ul|ol|dl)\b/gi],
  ['listItems', /<li\b/gi],
  ['links', /<a\b/gi],
  ['buttons', /<button\b|class=["'][^"']*\b(?:btn|button|cta)\b/gi],
  ['inputs', /<(?:input|textarea|select)\b/gi],
  ['forms', /<form\b/gi],
  ['tables', /<table\b/gi],
  ['blockquotes', /<blockquote\b/gi],
];

/**
 * The signature of one block. Every value is a non-negative number.
 *
 * `columns` is `maxSiblings` clamped: a row of 40 <li> is a list, not a 40-column layout,
 * and letting it through would make every long list look like every other long list and
 * nothing else. 12 is the largest column count any grid in the wild uses.
 */
export function signature(html) {
  const src = stripRawText(html);
  const out = {};
  for (const [name, re] of COUNTERS) {
    re.lastIndex = 0;
    out[name] = (src.match(re) || []).length;
  }
  const { maxDepth, maxSiblings } = treeShape(src);
  out.depth = maxDepth;
  out.columns = Math.min(maxSiblings, 12);
  out.textLength = textLength(src);
  // Ratios, so a block scaled up in content still matches a block of the same shape. Guarded
  // against divide-by-zero rather than special-cased at the call site.
  out.mediaPerHeading = out.headings ? out.media / out.headings : out.media;
  out.textPerBlock = (out.paragraphs + out.headings)
    ? out.textLength / (out.paragraphs + out.headings) : out.textLength;
  return out;
}

// --- the same shape, read out of an SGB component tree ---------------------------------
//
// The SGEN preset library is Markdown carrying a JSON skeleton of a builder component tree,
// not HTML. `signature()` counts tags and would score every one of them as an empty block.
//
// So the tree is measured DIRECTLY into the same field set. Rendering it to HTML first and
// running the tag counter would be worse, not better: the renderer would be inventing the
// markup it then measures, and every wrong guess in it would land as a real difference in a
// match rate. One declared mapping from component type to the feature it contributes is
// smaller, and it is auditable at a glance.
//
// Every field `signature()` produces is produced here. A missing field would read as 0 on
// one side of a comparison and as a real count on the other, which is a similarity score
// that means nothing — the same two-implementations failure this file exists to avoid.
const SGB_KIND = [
  ['media', /^sgb-component-(?:image|gallery|video|slider|site-logo|icons?)$/],
  ['headings', /^sgb-component-heading$/],
  ['paragraphs', /^sgb-component-(?:text|paragraph)$/],
  ['lists', /^sgb-component-(?:iconlists|list)$/],
  ['buttons', /^sgb-component-(?:cta|button)$/],
  ['forms', /^sgb-component-form$/],
  ['inputs', /^sgb-component-(?:input|field|textarea|select)$/],
  ['tables', /^sgb-component-(?:table|pricing-cards|pricing-table)$/],
  ['blockquotes', /^sgb-component-(?:testimonials?|quote)$/],
  ['links', /^sgb-component-(?:navigation|menu)$/],
];

export function signatureFromSgbTree(root) {
  const out = { media: 0, headings: 0, paragraphs: 0, lists: 0, listItems: 0, links: 0,
    buttons: 0, inputs: 0, forms: 0, tables: 0, blockquotes: 0 };
  let maxDepth = 0, maxSiblings = 0, textLen = 0;
  const walk = (node, depth) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const n of node) walk(n, depth); return; }
    if (depth > maxDepth) maxDepth = depth;
    const type = String(node.type || node.tagName || '');
    for (const [field, re] of SGB_KIND) if (re.test(type)) { out[field]++; break; }
    // An items array is a repeated child inside one component — the iconlist's bullets, the
    // gallery's images. They are list items by shape whatever the component is called.
    if (Array.isArray(node.items)) out.listItems += node.items.length;
    const attrs = node.attributes || {};
    for (const v of Object.values(attrs)) {
      if (typeof v === 'string') textLen += textLength(v);
    }
    const kids = Array.isArray(node.components) ? node.components : [];
    if (kids.length > maxSiblings) maxSiblings = kids.length;
    for (const k of kids) walk(k, depth + 1);
  };
  walk(root, 1);
  out.depth = maxDepth;
  out.columns = Math.min(maxSiblings, 12);
  out.textLength = textLen;
  out.mediaPerHeading = out.headings ? out.media / out.headings : out.media;
  out.textPerBlock = (out.paragraphs + out.headings)
    ? out.textLength / (out.paragraphs + out.headings) : out.textLength;
  return out;
}

// Weights. `columns` and `media` carry the most because they are what visibly separates one
// section layout from another; `links` and `listItems` carry the least because a nav and a
// footer differ by hundreds of them without differing in shape.
export const WEIGHTS = {
  columns: 3, media: 3, headings: 2, forms: 2, inputs: 2,
  paragraphs: 1.5, depth: 1.5, mediaPerHeading: 1.5, textPerBlock: 1,
  lists: 1, tables: 1, blockquotes: 1, buttons: 1, listItems: 0.5, links: 0.5,
  textLength: 0.5,
};

/**
 * Similarity of two signatures, 0..1.
 *
 * Per feature: 1 - |a-b| / max(a, b, 1). Two zeros score 1 (both absent IS agreement — a
 * section with no form and a preset with no form agree about forms), and the max() guard
 * keeps a 0-vs-8 comparison at 0 rather than dividing by zero.
 */
export function similarity(a, b) {
  let num = 0, den = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    const x = Number(a[k] || 0), y = Number(b[k] || 0);
    const d = Math.abs(x - y) / Math.max(x, y, 1);
    num += w * (1 - Math.min(d, 1));
    den += w;
  }
  return den ? num / den : 0;
}
