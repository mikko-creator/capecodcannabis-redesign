// html.mjs — tolerant HTML/CSS extraction. Regex-based on purpose: zero deps,
// and real-world CMS output is too malformed for a strict parser anyway.
// Every function is total: malformed input returns an empty result, never throws.

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–',
  mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“',
  rdquo: '”', middot: '·', copy: '©', reg: '®', trade: '™',
  eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', deg: '°',
  euro: '€', pound: '£', laquo: '«', raquo: '»', times: '×',
};

export function decodeEntities(s) {
  return String(s == null ? '' : s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, g) => {
    if (g[0] === '#') {
      const code = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    const v = ENTITIES[g.toLowerCase()];
    return v === undefined ? m : v;
  });
}

export function stripComments(html) {
  return String(html || '').replace(/<!--[\s\S]*?-->/g, ' ');
}

/**
 * Remove the CONTENT of script and style elements, keeping the elements themselves.
 *
 * A JavaScript string may spell out markup, and an extractor that walks the raw document
 * cannot tell the difference. Measured on a live page: an Elementor theme builds a link with
 *
 *   _this.find('...').append('<a href="'+_l+'" class="learn-more">Learn More</a>');
 *
 * and getAnchors returned an anchor whose href was the literal `'+_l+'`. The crawler resolved
 * it against every page it appeared on, queued each one, fetched it, and recorded 8 of the
 * run's 404s against URLs that exist nowhere but inside that string.
 */
export function stripRawText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
}

export function stripNonContent(html) {
  return stripComments(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, ' ');
}

export function textOf(html) {
  return decodeEntities(
    stripNonContent(html)
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/^[ \n]+|[ \n]+$/g, '');
}

export function inlineText(html) {
  return textOf(html).replace(/\s+/g, ' ').trim();
}

// --- attribute reading -------------------------------------------------------
const ATTR_RE = /([:a-zA-Z_][-:.\w]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>=]+))/g;

export function attrs(tagString) {
  const out = {};
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(tagString))) {
    const val = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
    out[m[1].toLowerCase()] = decodeEntities(val);
  }
  for (const b of ['required', 'disabled', 'checked', 'multiple', 'async', 'defer']) {
    if (new RegExp('(^|\\s)' + b + '(\\s|>|$)', 'i').test(tagString)) out[b] = out[b] ?? '';
  }
  return out;
}

export function tags(html, tagName) {
  const out = [];
  const re = new RegExp('<' + tagName + '\\b[^>]*>', 'gi');
  let m;
  const src = stripComments(html);
  while ((m = re.exec(src))) out.push({ raw: m[0], index: m.index, attrs: attrs(m[0]) });
  return out;
}

// Balanced-element extractor. `startIdx` must point at the "<" of an opening tag.
// Handles self-closing and void elements; returns the outerHTML slice.
export function balancedSlice(html, startIdx) {
  const nameM = /^<\s*([a-zA-Z][\w:-]*)/.exec(html.slice(startIdx, startIdx + 64));
  if (!nameM) return '';
  const name = nameM[1];
  const re = new RegExp('<\\/?' + name + '\\b[^>]*>', 'gi');
  re.lastIndex = startIdx;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    const isClose = m[0][1] === '/';
    const selfClosing = /\/\s*>$/.test(m[0]);
    if (isClose) {
      depth--;
      if (depth <= 0) return html.slice(startIdx, m.index + m[0].length);
    } else if (!selfClosing) {
      depth++;
    } else if (depth === 0) {
      return m[0];
    }
  }
  return html.slice(startIdx);
}

// --- page-level fields -------------------------------------------------------
export function getTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(stripComments(html));
  return m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : '';
}

export function getLang(html) {
  const m = /<html\b[^>]*>/i.exec(stripComments(html));
  return m ? (attrs(m[0]).lang || '') : '';
}

export function getMetas(html) {
  const out = { name: {}, property: {}, httpEquiv: {}, charset: '' };
  for (const t of tags(html, 'meta')) {
    const a = t.attrs;
    if (a.charset) out.charset = a.charset;
    if (a.name) out.name[a.name.toLowerCase()] = a.content ?? '';
    if (a.property) out.property[a.property.toLowerCase()] = a.content ?? '';
    if (a['http-equiv']) out.httpEquiv[a['http-equiv'].toLowerCase()] = a.content ?? '';
  }
  return out;
}

export function getLinkRels(html) {
  const out = [];
  for (const t of tags(html, 'link')) {
    const a = t.attrs;
    out.push({
      rel: (a.rel || '').toLowerCase(), href: a.href || '',
      hreflang: a.hreflang || '', type: a.type || '', as: a.as || '',
    });
  }
  return out;
}

export function getCanonical(html) {
  const l = getLinkRels(html).find((x) => x.rel.split(/\s+/).includes('canonical'));
  return l ? l.href : '';
}

export function getHeadings(html) {
  const src = stripNonContent(html);
  const out = [];
  const re = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(src))) {
    const text = decodeEntities(m[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (text) out.push({ level: Number(m[1]), text, id: attrs('<x' + m[2] + '>').id || '' });
  }
  return out;
}

export function getAnchors(html) {
  const out = [];
  const src = stripRawText(stripComments(html));
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(src))) {
    const a = attrs('<a' + m[1] + '>');
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (a.href !== undefined) {
      out.push({
        href: a.href, text, rel: a.rel || '', target: a.target || '',
        title: a.title || '', ariaLabel: a['aria-label'] || '',
      });
    }
  }
  return out;
}

export function getImages(html) {
  const out = [];
  // Same rule as getAnchors: an <img> written inside a JavaScript string is a string.
  html = stripRawText(html);
  for (const t of tags(html, 'img')) {
    const a = t.attrs;
    out.push({
      src: a.src || a['data-src'] || a['data-lazy-src'] || '',
      alt: a.alt === undefined ? null : a.alt,
      width: a.width || '', height: a.height || '',
      srcset: a.srcset || a['data-srcset'] || '',
      sizes: a.sizes || '', loading: a.loading || '', className: a.class || '',
      decoding: a.decoding || '',
    });
  }
  for (const t of tags(html, 'source')) {
    const a = t.attrs;
    if (a.srcset) {
      out.push({
        src: '', alt: null, srcset: a.srcset, type: a.type || '', media: a.media || '',
        width: '', height: '', className: '', fromPicture: true,
      });
    }
  }
  return out;
}

export function getCssUrls(css) {
  const out = new Set();
  const re = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  let m;
  while ((m = re.exec(String(css || '')))) {
    const v = m[1].trim();
    if (v && !v.startsWith('data:')) out.add(v);
  }
  return [...out];
}

export function getScripts(html) {
  return tags(html, 'script').map((t) => ({
    src: t.attrs.src || '', type: t.attrs.type || '', id: t.attrs.id || '',
  }));
}

export function getJsonLd(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse(m[1].trim())); }
    catch { out.push({ __parseError: true, raw: m[1].trim().slice(0, 400) }); }
  }
  return out;
}

export function getForms(html) {
  const out = [];
  const src = stripComments(html);
  const lower = src.toLowerCase();
  let idx = 0;
  for (;;) {
    const i = lower.indexOf('<form', idx);
    if (i < 0) break;
    const slice = balancedSlice(src, i);
    idx = i + Math.max(slice.length, 5);
    const openTag = /^<form\b[^>]*>/i.exec(slice);
    const a = openTag ? attrs(openTag[0]) : {};
    const fields = [];
    const controls = tags(slice, 'input').concat(tags(slice, 'textarea'), tags(slice, 'select'));
    for (const t of controls) {
      const fa = t.attrs;
      const type = (fa.type
        || (/^<textarea/i.test(t.raw) ? 'textarea' : /^<select/i.test(t.raw) ? 'select' : 'text')).toLowerCase();
      if (type === 'hidden') continue;
      fields.push({
        name: fa.name || '', type, required: fa.required !== undefined,
        placeholder: fa.placeholder || '', id: fa.id || '',
      });
    }
    const labels = [];
    const lre = /<label\b[^>]*>([\s\S]*?)<\/label>/gi;
    let lm;
    while ((lm = lre.exec(slice))) {
      labels.push(decodeEntities(lm[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim());
    }
    const submit = /<button\b[^>]*>([\s\S]*?)<\/button>/i.exec(slice);
    out.push({
      action: a.action || '', method: (a.method || 'get').toLowerCase(),
      id: a.id || '', className: a.class || '', fields, labels,
      submitLabel: submit ? decodeEntities(submit[1].replace(/<[^>]+>/g, ' ')).trim() : '',
    });
  }
  return out;
}

export function getRegion(html, tagName) {
  const src = stripComments(html);
  const i = src.toLowerCase().indexOf('<' + tagName);
  if (i < 0) return '';
  return balancedSlice(src, i);
}

// --- CSS ---------------------------------------------------------------------
export function getStyleBlocks(html) {
  const out = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) out.push(m[1]);
  return out;
}

export function getCustomProperties(css) {
  const out = {};
  const re = /(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+)[;}]/g;
  let m;
  while ((m = re.exec(String(css || '')))) {
    const k = m[1], v = m[2].trim();
    if (!(k in out)) out[k] = v;
  }
  return out;
}

function tally(s, re, stripRe) {
  const set = new Map();
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(s))) {
    let k = m[0].trim();
    if (stripRe) k = k.replace(stripRe, '').trim();
    if (!k) continue;
    set.set(k, (set.get(k) || 0) + 1);
  }
  return [...set.entries()].sort((a, b) => b[1] - a[1]);
}

export function getDeclaredValues(css) {
  const s = String(css || '');
  return {
    colors: tally(s, /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)/g),
    fontFamilies: tally(s, /font-family\s*:\s*[^;}]+/gi, /font-family\s*:\s*/i),
    fontSizes: tally(s, /font-size\s*:\s*[^;}]+/gi, /font-size\s*:\s*/i),
    fontWeights: tally(s, /font-weight\s*:\s*[^;}]+/gi, /font-weight\s*:\s*/i),
    radii: tally(s, /border-radius\s*:\s*[^;}]+/gi, /border-radius\s*:\s*/i),
    shadows: tally(s, /box-shadow\s*:\s*[^;}]+/gi, /box-shadow\s*:\s*/i),
    breakpoints: tally(s, /@media[^{]*\((?:min|max)-width\s*:\s*[^)]+\)/gi),
    containers: tally(s, /max-width\s*:\s*[^;}]+/gi, /max-width\s*:\s*/i),
  };
}
