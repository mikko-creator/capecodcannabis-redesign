// seo-repair.mjs — the derived repairs, in one place.
//
// EVERY value written here comes from the page itself, the harvest, or facts the client
// declared. Nothing is invented. That is the whole boundary: a repair whose answer is
// already on the page is a DERIVATION and needs no permission; a repair that needs a new
// sentence is AUTHORING and belongs in the propose/apply worklist instead.
//
// Tenet 3 (preserve before you improve) is respected by only ever filling a field that is
// EMPTY. A field the source filled is never rewritten here, because that would be an
// opinion about the client's wording rather than a repair.
//
// BYLAW 4: every write is returned as a change record. Nothing is written silently.

import path from 'node:path';
import { getHeadings, getMetas, getCanonical, getJsonLd } from './html.mjs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const hasMeta = (head, key, kind) => new RegExp(
  '<meta\\b[^>]*\\b' + kind + '\\s*=\\s*["\']' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']', 'i',
).test(head);

const headOf = (html) => {
  const i = html.search(/<head\b/i);
  const j = html.search(/<\/head>/i);
  return i < 0 || j < 0 ? '' : html.slice(i, j);
};

/** Inject tags immediately before </head>. One pass, order preserved. */
function injectHead(html, tags) {
  if (!tags.length) return html;
  const block = '\n' + tags.join('\n') + '\n';
  return html.replace(/<\/head>/i, block + '</head>');
}

/**
 * A description derived from the page's own words. Cut on a sentence boundary where one
 * falls in range, otherwise on a word boundary — never mid-word, which reads as broken
 * rather than as a summary.
 */
export function deriveDescription(bodyText, max = 155) {
  const t = String(bodyText || '').replace(/\s+/g, ' ').trim();
  if (t.length < 60) return '';
  if (t.length <= max) return t;
  const window = t.slice(0, max + 1);
  const stop = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
  if (stop > 70) return window.slice(0, stop + 1).trim();
  const sp = window.lastIndexOf(' ');
  return (sp > 70 ? window.slice(0, sp) : window.slice(0, max)).trim() + '…';
}

/** Breadcrumbs are a property of the URL, so they can always be derived from one. */
export function deriveBreadcrumbs(pageUrl, siteUrl, siteName) {
  // NO SITE URL, NO BREADCRUMBS. An earlier version fell back to the source origin, which
  // wrote `http://<source-host>/` into every page's JSON-LD — the build naming the site it
  // was cloned from, in a field nobody reads by eye. Caught by the suite's decontamination
  // control. Same rule as sitemap.xml: a schema item needs an absolute URL, and the only
  // honest absolute URL is the one the operator supplied.
  if (!siteUrl) return null;
  // Likewise the crumb LABEL: `u.hostname` is the source's identity, not the client's.
  if (!siteName) return null;
  let u;
  try { u = new URL(pageUrl); } catch { return null; }
  const segs = u.pathname.split('/').filter(Boolean);
  const base = siteUrl.replace(/\/$/, '');
  const items = [{ name: siteName, url: base + '/' }];
  let acc = '';
  for (const s of segs) {
    acc += '/' + s;
    items.push({
      name: decodeURIComponent(s).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      url: base + acc,
    });
  }
  if (items.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: it.url,
    })),
  };
}

/**
 * Repair one built page.
 *
 * ctx: { url, relPath, source, content, siteUrl, siteName, siteLang, pageType,
 *        ogImage, dimsByBasename, noindex, facts, wantBreadcrumbs, wantOrg }
 * Returns { html, changes }.
 */
export function repairPage(html, ctx) {
  const changes = [];
  const rec = (field, from, to, from_) => changes.push({
    page: ctx.url, field, from: from || null, to, source: from_,
  });
  let s = html;
  const head = headOf(s);
  const add = [];

  // ---------------------------------------------------------------- phase 2: head
  const curTitle = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(s) || [, ''])[1].trim();
  let title = curTitle;
  if (!title) {
    const h1 = (ctx.content && ctx.content.h1 && ctx.content.h1[0]) || '';
    if (h1) {
      title = ctx.siteName ? h1 + ' | ' + ctx.siteName : h1;
      if (/<title[^>]*>[\s\S]*?<\/title>/i.test(s)) {
        s = s.replace(/<title[^>]*>[\s\S]*?<\/title>/i, '<title>' + esc(title) + '</title>');
      } else {
        add.push('<title>' + esc(title) + '</title>');
      }
      rec('title', '', title, 'derived:h1+site-name');
    }
  }

  const metas = getMetas(head);
  let desc = (metas.name && metas.name.description) || '';
  if (!desc) {
    const d = deriveDescription(ctx.content && ctx.content.bodyText);
    if (d) {
      desc = d;
      add.push('<meta name="description" content="' + esc(d) + '">');
      rec('description', '', d, 'derived:body-text');
    }
  }

  const canonExisting = getCanonical(head);
  let canon = canonExisting;
  if (!canon) {
    canon = (ctx.siteUrl ? ctx.siteUrl.replace(/\/$/, '') : '') + '/' + ctx.relPath;
    add.push('<link rel="canonical" href="' + esc(canon) + '">');
    rec('canonical', '', canon, 'derived:page-url');
  }

  if (!hasMeta(head, 'robots', 'name')) {
    const v = ctx.noindex ? 'noindex, nofollow' : 'index, follow';
    add.push('<meta name="robots" content="' + v + '">');
    rec('robots', '', v, ctx.noindex ? 'flag:--noindex' : 'default:index');
  }

  const htmlTag = (/<html\b[^>]*>/i.exec(s) || [''])[0];
  if (htmlTag && !/\blang\s*=/i.test(htmlTag) && ctx.siteLang) {
    s = s.replace(/<html\b/i, '<html lang="' + esc(ctx.siteLang) + '"');
    rec('lang', '', ctx.siteLang, 'derived:site-majority');
  }

  // ---------------------------------------------------------------- phase 3: social
  const og = metas.property || {};
  const absolute = (u) => {
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    return ctx.siteUrl ? ctx.siteUrl.replace(/\/$/, '') + (u.startsWith('/') ? u : '/' + u) : u;
  };
  const ogImage = og['og:image'] || absolute(ctx.ogImage);

  const social = [
    ['og:title', title, 'property', 'derived:title'],
    ['og:description', desc, 'property', 'derived:description'],
    ['og:url', absolute(canon), 'property', 'derived:canonical'],
    ['og:type', ctx.pageType === 'article' || ctx.pageType === 'blog-post' ? 'article' : 'website', 'property', 'derived:page-type'],
    ['og:site_name', ctx.siteName, 'property', 'derived:site-name'],
    ['og:image', ogImage, 'property', 'derived:first-content-image'],
  ];
  for (const [key, val, kind, src] of social) {
    if (!val) continue;
    if (hasMeta(head, key, kind)) continue;
    add.push('<meta property="' + key + '" content="' + esc(val) + '">');
    rec(key, '', val, src);
  }

  const tw = [
    ['twitter:card', ogImage ? 'summary_large_image' : 'summary', 'derived:og-image-present'],
    ['twitter:title', title, 'derived:title'],
    ['twitter:description', desc, 'derived:description'],
    ['twitter:image', ogImage, 'derived:og-image'],
  ];
  for (const [key, val, src] of tw) {
    if (!val) continue;
    if (hasMeta(head, key, 'name')) continue;
    add.push('<meta name="' + key + '" content="' + esc(val) + '">');
    rec(key, '', val, src);
  }

  // ---------------------------------------------------------------- phase 4: schema
  const existingTypes = new Set(getJsonLd(s).flatMap((o) => {
    const t = o && (o['@type'] || (o['@graph'] || []).map((g) => g && g['@type']));
    return Array.isArray(t) ? t.flat() : t ? [t] : [];
  }).filter(Boolean));

  if (ctx.wantBreadcrumbs && !existingTypes.has('BreadcrumbList')) {
    const bc = deriveBreadcrumbs(ctx.url, ctx.siteUrl, ctx.siteName);
    if (bc) {
      add.push('<script type="application/ld+json">' + JSON.stringify(bc) + '</script>');
      rec('jsonld:BreadcrumbList', '', bc.itemListElement.length + ' levels', 'derived:url-path');
    }
  }
  // Organization and WebSite describe the CLIENT, not the page. They are only written when
  // the client declared themselves in facts/client-facts.json — never guessed from a
  // hostname, which would be inventing an identity (BYLAW 3).
  if (ctx.wantOrg && !existingTypes.has('Organization') && ctx.facts && (ctx.facts.legalName || ctx.facts.brand)) {
    const org = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: ctx.facts.legalName || ctx.facts.brand,
    };
    if (ctx.siteUrl) org.url = ctx.siteUrl;
    if ((ctx.facts.phone || []).length) org.telephone = ctx.facts.phone[0];
    if ((ctx.facts.email || []).length) org.email = ctx.facts.email[0];
    add.push('<script type="application/ld+json">' + JSON.stringify(org) + '</script>');
    rec('jsonld:Organization', '', org.name, 'client-facts');
  }

  // ---------------------------------------------------------------- LocalBusiness
  //
  // Every input here was ALREADY being collected and then discarded. sr-init.mjs writes
  // `addresses` and `hours` into facts/client-facts.json with a note telling the client they
  // are the only permitted source of a claim — and, measured 2026-09-17, the SEO stage read
  // neither. A grep of this file for `addresses`, `hours`, `geo` or `openingHours` returned
  // no code hit. The address sat on disk and no byte of it reached the page.
  //
  // ⚖ A FACT COLLECTED AND NEVER EMITTED IS A FACT THE CLIENT TYPED FOR NOTHING.
  //
  // Placed on the HOME and CONTACT pages only. One LocalBusiness per page is the entity;
  // repeating it on forty pages describes forty businesses. Everything below traces to a
  // declared fact — nothing is inferred from a hostname, a postcode or a page's prose (B3).
  const localPage = ctx.pageType === 'home' || ctx.pageType === 'contact';
  const declaredAddresses = ((ctx.facts && ctx.facts.addresses) || []).filter(Boolean);
  if (ctx.wantLocal !== false && localPage && declaredAddresses.length
      && !existingTypes.has('LocalBusiness') && (ctx.facts.brand || ctx.facts.legalName)) {
    const f = ctx.facts;
    const nodes = declaredAddresses.map((a) => {
      // A v1 facts file may hold a bare string. It is carried as a single-line address
      // rather than parsed — guessing which fragment is the locality is inference, not fact.
      const addr = typeof a === 'string'
        ? { '@type': 'PostalAddress', streetAddress: a }
        : {
          '@type': 'PostalAddress',
          ...(a.street ? { streetAddress: a.street } : {}),
          ...(a.locality ? { addressLocality: a.locality } : {}),
          ...(a.region ? { addressRegion: a.region } : {}),
          ...(a.postalCode ? { postalCode: a.postalCode } : {}),
          ...(a.country ? { addressCountry: a.country } : {}),
        };
      const node = {
        '@context': 'https://schema.org',
        '@type': f.businessType || 'LocalBusiness',
        name: f.brand || f.legalName,
        address: addr,
      };
      if (ctx.siteUrl) node.url = ctx.siteUrl;
      const tel = (typeof a === 'object' && a.phone) || (f.phone || [])[0];
      if (tel) node.telephone = tel;
      if ((f.email || []).length) node.email = f.email[0];
      // hoursSpec is the typed form; `hours` is the v1 free-text field and is carried
      // verbatim, because turning "Mon-Fri 9-6" into a spec is parsing a sentence.
      const spec = (typeof a === 'object' && a.hoursSpec) || f.hoursSpec;
      if (Array.isArray(spec) && spec.length) {
        node.openingHoursSpecification = spec.map((h) => ({
          '@type': 'OpeningHoursSpecification',
          ...(h.days ? { dayOfWeek: h.days } : {}),
          ...(h.opens ? { opens: h.opens } : {}),
          ...(h.closes ? { closes: h.closes } : {}),
        }));
      } else if (typeof f.hours === 'string' && f.hours.trim()) {
        node.openingHours = f.hours.trim();
      }
      const geo = typeof a === 'object' ? a.geo : null;
      if (geo && geo.lat != null && geo.lng != null) {
        node.geo = { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng };
      }
      if ((f.sameAs || []).length) node.sameAs = f.sameAs;
      if ((f.areaServed || []).length) node.areaServed = f.areaServed;
      if (f.priceRange) node.priceRange = f.priceRange;
      return node;
    });
    for (const n of nodes) add.push('<script type="application/ld+json">' + JSON.stringify(n) + '</script>');
    rec('jsonld:LocalBusiness', '', nodes.length + ' × ' + (f.businessType || 'LocalBusiness'), 'client-facts:addresses');
  }

  s = injectHead(s, add);

  // ---------------------------------------------------------------- multiple H1
  //
  // One H1 per document is the rule every crawler assumes. Extra ones are demoted to H2,
  // keeping every attribute and every class, so the outline becomes legal without any text
  // moving. The FIRST H1 is kept — document order, not a judgement about which matters most,
  // because a judgement is exactly what this stage is not allowed to make.
  //
  // ⚠ This changes the element name, so CSS written against `h1` rather than a class will
  // render differently. Declared, and worth a look on a pixel-diff before shipping.
  //
  // OPT-IN (--fix-h1), and off by default. Every other repair on this page ADDS something
  // that was missing; this one CHANGES an element that was there. Measured on
  // tedxnuremberg.com: partners.html went from h1=2,h2=4 to h1=1,h2=5 and parity/structure
  // correctly reported an element removed and another added — a faithful clone had been
  // made slightly less faithful, for an SEO nicety, without anybody asking.
  //
  // So the default is to REPORT a second H1 and leave it alone, and the flag is the typed
  // choice to change the document.
  let h1Demoted = 0;
  if (ctx.fixH1) {
    let seenH1 = 0;
    s = s.replace(/<(\/?)h1(\s[^>]*)?>/gi, (tag, slash, attrs) => {
      if (!slash) {
        seenH1++;
        if (seenH1 === 1) return tag;
        return '<h2' + (attrs || '') + '>';
      }
      return seenH1 > 1 ? '</h2>' : tag;
    });
    if (seenH1 > 1) h1Demoted = seenH1 - 1;
  }
  if (h1Demoted) rec('h1-demoted', '', h1Demoted + ' extra H1 demoted to H2', 'derived:document-order');

  // ---------------------------------------------------------------- phase 5: structure
  // Explicit width/height stop the page reflowing while images load. The numbers are the
  // REAL ones read from the file header at harvest, not the ones the source declared —
  // a declared size that disagrees with the file is the defect, not the measurement.
  // ALT TEXT.
  //
  // An <img> with NO alt attribute is the worst of the three states: a screen reader falls
  // back to reading the file name aloud ("ba2d9d27 gabriel pinto hasagiv dot webp"). An
  // empty alt="" is silence, which is the CORRECT answer for an image that carries no
  // information, and a real alt is better still. So every image ends with one of the two
  // good states and none is left in the bad one.
  //
  // Four sources, best first, and every one of them is the site's OWN words:
  //
  //   1. the same image's alt from ANYWHERE else on the site — one file, one meaning
  //   2. the img's own title= or aria-label=
  //   3. the <figcaption> of the figure it sits in
  //   4. alt="" — declared decorative
  //
  // The FILE NAME is deliberately not a source. `00445027-croco-creative-image-6-retina`
  // is not a description of anything, and reading it aloud is exactly the failure alt=""
  // exists to prevent. An image that needs real words and has none is left decorative and
  // reported, because writing that sentence is authoring, not repair.
  let altFromSite = 0, altFromAttr = 0, altFromCaption = 0, altEmpty = 0;
  let dimAdded = 0, lazyAdded = 0, imgIndex = 0;
  s = s.replace(/<img\b[^>]*>/gi, (tag, offset) => {
    imgIndex++;
    let t = tag;

    if (!/\balt\s*=/i.test(t)) {
      const srcA = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(t);
      const base = srcA ? srcA[1].split(/[?#]/)[0].split('/').pop() : '';
      let alt = null, why = null;

      const fromSite = base && ctx.altByBasename ? ctx.altByBasename.get(base) : '';
      const ownTitle = (/\btitle\s*=\s*["']([^"']*)["']/i.exec(t) || [, ''])[1].trim();
      const ownAria = (/\baria-label\s*=\s*["']([^"']*)["']/i.exec(t) || [, ''])[1].trim();
      const after = s.slice(offset, offset + 1200);
      const cap = (/<figcaption[^>]*>([\s\S]{0,200}?)<\/figcaption>/i.exec(after) || [, ''])[1]
        .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      if (fromSite) { alt = fromSite; why = 'site'; }
      else if (ownTitle) { alt = ownTitle; why = 'attr'; }
      else if (ownAria) { alt = ownAria; why = 'attr'; }
      else if (cap && cap.length <= 160) { alt = cap; why = 'caption'; }
      else { alt = ''; why = 'empty'; }

      t = t.replace(/<img\b/i, '<img alt="' + esc(alt) + '"');
      if (why === 'site') altFromSite++;
      else if (why === 'attr') altFromAttr++;
      else if (why === 'caption') altFromCaption++;
      else altEmpty++;
    }
    const srcM = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(t);
    if (srcM && !/\bwidth\s*=/i.test(t) && !/\bheight\s*=/i.test(t)) {
      const base = srcM[1].split(/[?#]/)[0].split('/').pop();
      const d = ctx.dimsByBasename.get(base);
      if (d && d.w && d.h) {
        t = t.replace(/<img\b/i, '<img width="' + d.w + '" height="' + d.h + '"');
        dimAdded++;
      }
    }
    // The first images are above the fold on almost every layout; lazy-loading those
    // delays the largest paint instead of helping it.
    if (imgIndex > 2 && !/\bloading\s*=/i.test(t)) {
      t = t.replace(/<img\b/i, '<img loading="lazy"');
      lazyAdded++;
    }
    return t;
  });
  // Declared from the FINAL page, not from this run's additions — same reason as the head
  // fields below. parity/attributes only forgives the build having MORE of these than the
  // source, never fewer, so declaring them whenever they are present cannot excuse a loss.
  const altWritten = altFromSite + altFromAttr + altFromCaption + altEmpty;
  if (altWritten) {
    rec('alt', '', altWritten + ' images', 'derived:'
      + [altFromSite && altFromSite + ' from the same image elsewhere',
         altFromAttr && altFromAttr + ' from title/aria-label',
         altFromCaption && altFromCaption + ' from figcaption',
         altEmpty && altEmpty + ' declared decorative (alt="")'].filter(Boolean).join(', '));
  }
  const finalAlt = (s.match(/<img\b[^>]*\balt\s*=/gi) || []).length;
  if (finalAlt && !altWritten) {
    rec('alt', '', finalAlt + ' images', 'present-from-an-earlier-seo-pass');
  }
  const finalLazy = (s.match(/<img\b[^>]*\bloading\s*=/gi) || []).length;
  const finalDims = (s.match(/<img\b[^>]*\bwidth\s*=[^>]*\bheight\s*=/gi) || []).length;
  if (finalDims) {
    rec('img-dimensions', '', finalDims + ' images',
      dimAdded ? 'derived:measured-intrinsic-size' : 'present-from-an-earlier-seo-pass');
  }
  if (finalLazy) {
    rec('img-lazy', '', finalLazy + ' images',
      lazyAdded ? 'derived:below-fold-position' : 'present-from-an-earlier-seo-pass');
  }

  // WHAT THE BUILD CONTAINS, not what this run happened to type.
  //
  // The first version recorded only fields written during THAT invocation. Running the
  // stage a second time correctly found nothing to do, wrote a record of zero changes over
  // the first one, and the gate — reading a now-empty declaration — called every previously
  // repaired field damage. A build that passed its gate failed it after a no-op re-run.
  // Found by probing for idempotence, which the happy path had reported as fine.
  //
  // So the record is re-derived from the finished page every time: every head field the
  // SOURCE left empty and the BUILD now carries is declared, whoever filled it and whenever.
  // That makes the file a description of the artifact rather than a diary of the process,
  // and it is the same answer on the first run and the hundredth.
  const finalHead = headOf(s);
  const finalMetas = getMetas(finalHead);
  const src = ctx.source || {};
  const srcOg = src.openGraph || {};
  const srcTw = src.twitter || {};
  const finalTitle = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(s) || [, ''])[1].trim();
  const declared = [
    ['title', src.title, finalTitle],
    ['description', src.metaDescription, (finalMetas.name || {}).description],
    ['canonical', src.canonical, getCanonical(finalHead)],
    ['lang', src.lang, (/<html\b[^>]*\blang\s*=\s*["']([^"']*)["']/i.exec(s) || [, ''])[1]],
    ['og:title', srcOg['og:title'], (finalMetas.property || {})['og:title']],
    ['og:description', srcOg['og:description'], (finalMetas.property || {})['og:description']],
    ['og:type', srcOg['og:type'], (finalMetas.property || {})['og:type']],
    ['og:image', srcOg['og:image'], (finalMetas.property || {})['og:image']],
    ['og:url', srcOg['og:url'], (finalMetas.property || {})['og:url']],
    ['og:site_name', srcOg['og:site_name'], (finalMetas.property || {})['og:site_name']],
    ['twitter:card', srcTw['twitter:card'], (finalMetas.name || {})['twitter:card']],
    ['twitter:title', srcTw['twitter:title'], (finalMetas.name || {})['twitter:title']],
  ];
  const seen = new Set(changes.map((c) => c.field));
  for (const [field, sourceVal, buildVal] of declared) {
    if (sourceVal || !buildVal) continue;      // only empty-on-source, present-on-build
    if (seen.has(field)) continue;             // already recorded by this run
    changes.push({
      page: ctx.url, field, from: null, to: buildVal,
      source: 'present-from-an-earlier-seo-pass',
    });
  }

  return { html: s, changes };
}
