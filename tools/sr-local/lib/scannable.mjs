// scannable.mjs — what counts as a LIVE platform trace, in one place.
//
// Two gates scan a build for the source platform's name: sr-decontaminate and
// sr-clone-verify's check 3. They held separate ideas of what a trace is, and the moment one
// learned an exemption the other did not, they disagreed about the same build — clone-verify
// reported PASS while decontaminate reported 109 blockers on the identical directory.
//
// A disagreement between two checks is worse than either verdict, because whichever is read
// first becomes the answer. So the rule lives here and both call it.
//
// FOUR exemptions, each narrow, each with a reason that is about the WEB and not about
// wanting a green light:
//
//   1. HTML COMMENTS. A comment renders nothing and fetches nothing. One page carries five
//      commented-out <img> tags; the extractor never collected them, so they were never
//      downloaded and never rewritten, and their paths sat in a comment naming the platform.
//
//   2. THE BUILDER'S OWN data-clone-unwired STAMP. It records where a disconnected form or
//      anchor used to point. The element points at #top; the attribute is the receipt. The
//      dead-form rule's own stated reason is "a form POINTING here is a dead form".
//
//   3. A URL THE SOURCE ANSWERS 404. It cannot be localised — there is nothing to fetch.
//      Reproducing a dead reference is faithful; pointing it at some other file would be
//      inventing content the source does not have. Confirmed live for every path passed in.
//
//   4. AN ICON GLYPH NAMED AFTER A BRAND. Font Awesome declares one class per brand it
//      draws, so any site shipping it ships `.fa-shopify:before{content:"\e057"}` between
//      fa-shoe-prints and fa-shopping-bag. That is a picture of a logo, not a CMS.
//
// Every exemption replaces the text with a marker rather than deleting it, so offsets stay
// close and a line number still points where a reader expects.

/**
 * @param {string} text        the file's contents
 * @param {Set<string>} [sourceMissing]  root-relative paths the crawl recorded as 404
 */
export function scannableText(text, sourceMissing) {
  let t = String(text || '');
  // 1 — comments
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  // 2 — the builder's stamp, value only
  t = t.replace(/\sdata-clone-(?:unwired|submitted)=(["'])[^"']*\1/gi, ' data-clone-unwired=""');
  // 4 — icon glyphs, in exactly that shape
  t = t.replace(/\.fa-[a-z0-9-]+:before\{content:"\\[0-9a-f]+"\}/gi, '.fa-icon{}');
  // 3 — 404 paths, longest first so a shorter prefix never claims a longer path
  if (sourceMissing && sourceMissing.size) {
    const paths = [...sourceMissing].filter((p) => typeof p === 'string' && p.length > 8)
      .sort((a, b) => b.length - a.length);
    for (const p of paths) t = t.split(p).join('(source-404)');
  }
  return t;
}

/** Root-relative 404 paths from a crawl's failures.json, both slash spellings. */
export function sourceMissingFrom(failuresJson) {
  const out = new Set();
  for (const it of (failuresJson && failuresJson.items) || []) {
    if (!/404/.test(it.reason || '')) continue;
    const p = String(it.target || '').replace(/^https?:\/\/[^/]+/, '');
    if (!p) continue;
    out.add(p);
    out.add(p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p + '/');
  }
  return out;
}
