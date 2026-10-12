// routes.mjs - the route map: every output path, its kind, its evidence and why it exists (PIPELINE-SITE).
//   node src/lib/routes.mjs            -> writes src/content/routes.json (deterministic) and prints the counts
// Inputs (read-only evidence): audit/understand/ia-map.json (templates, routes, dead links, 403s),
// audit/site-inventory.json (savedAs, aliases, redirect chains), audit/seo-inventory.json (dates, robots, titles),
// audit/raw/*.html (tag and event-category links), audit/raw/sitemap.html (all 5,857 product URLs + titles),
// audit/prelock/t1.html (the one captured product page).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, ORIGIN, splitInternal, withSlash, safeDecode } from './paths.mjs';
import { readJSON, readText, jsonLines, writeIfChanged, decodeEntities, BUILD_DATE } from './site.mjs';

export const ROUTES_FILE = 'src/content/routes.json';
const SUFFIX = ' | Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA';

const pathOf = (u) => { const s = splitInternal(u); return s ? s.path : null; };
const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

/** datePublished (first occurrence) from a page's captured JSON-LD string, else null */
function publishedOf(seoRow) {
  const m = seoRow && typeof seoRow.jsonLd === 'string' && seoRow.jsonLd.match(/"datePublished":"([^"]+)"/);
  return m ? m[1] : null;
}

export function buildRoutes() {
  const ia = readJSON('audit/understand/ia-map.json');
  const inv = readJSON('audit/site-inventory.json');
  const seo = readJSON('audit/seo-inventory.json');
  const invByUrl = new Map(inv.pages.map((p) => [p.url, p]));
  const seoByUrl = new Map(seo.pages.map((p) => [p.url, p]));
  const routes = new Map();          // path -> route
  const redirects = new Map();       // from -> rule
  const variants = [];
  const notBuilt = [];
  const problems = [];
  const add = (r) => {
    if (routes.has(r.path)) { problems.push('duplicate route ' + r.path); return; }
    routes.set(r.path, r);
  };

  /* 1. every ok crawled HTML page */
  for (const r of ia.routes) {
    if (r.status !== 200 || r.template === 'non-html' || r.template === 'redirect') continue;
    const rec = invByUrl.get(r.url);
    const sp = splitInternal(r.url);
    if (/case variant/.test(r.note || '')) {
      redirects.set(sp.path.replace(/\/$/, ''), { from: sp.path.replace(/\/$/, ''), to: sp.path.toLowerCase(), status: 301, why: 'case variant of a crawled page; the live canonical is the lowercase path (a case-insensitive disk cannot hold both)' });
      continue;
    }
    if (sp.search) { variants.push({ url: r.url, path: sp.path, why: 'query variant: the static page is the base path and the query is client-side state' }); continue; }
    const s = seoByUrl.get(r.url);
    add({
      path: sp.path, kind: r.template, sourceUrl: (rec && rec.finalUrl) || ORIGIN + sp.path, derived: false,
      model: rec && rec.savedAs ? rec.savedAs.replace(/\.html$/, '') : null, evidence: rec && rec.savedAs ? 'audit/raw/' + rec.savedAs : null,
      sitemap: r.sitemap || null, robots: s ? s.metaRobots || null : null, published: publishedOf(s),
      title: s ? decodeEntities(s.title || '') : null,
    });
  }

  /* 2. the 12 aliases folded by the crawler, and their redirect chains */
  for (const r of ia.routes) {
    if (r.template !== 'redirect') continue;
    const from = pathOf(r.url).replace(/\/$/, '');
    redirects.set(from, { from, to: withSlash(r.redirectTo), status: 301, why: 'alias observed in the crawl: ' + (r.note || 'redirect') });
  }
  for (const p of inv.pages) {
    for (const hop of p.redirectChain || []) {
      const f = pathOf(hop.from), t = pathOf(hop.to);
      if (!f || !t) continue;
      const fromBare = f.replace(/\/$/, '');
      if (withSlash(fromBare) === t) continue;                       // the plain trailing-slash 301: host behaviour
      if (!redirects.has(fromBare)) redirects.set(fromBare, { from: fromBare, to: t, status: hop.status || 301, why: 'redirect chain hop in audit/site-inventory.json' });
    }
  }

  /* 3. derived: tag archives and event-category archives, rebuilt from the captured pages that carry their links */
  const fileToPath = new Map();
  for (const rt of routes.values()) if (rt.model) fileToPath.set(rt.model + '.html', rt.path);
  const tagLinks = new Map(), evCats = new Map();
  for (const f of fs.readdirSync(path.join(ROOT, 'audit/raw')).sort()) {
    if (!f.endsWith('.html') || !fileToPath.has(f)) continue;
    const html = fs.readFileSync(path.join(ROOT, 'audit/raw', f), 'utf8');
    const member = fileToPath.get(f);
    for (const m of html.matchAll(/<a\s+[^>]*class="[^"]*tags-link[^"]*"[^>]*href="https:\/\/capecodcannabis\.com\/tag\/([^"/]+)\/?"[^>]*>([\s\S]*?)<\/a>/g)) {
      const slug = safeDecode(m[1]); const label = decodeEntities(m[2].replace(/<[^>]+>/g, '')).trim();
      if (!tagLinks.has(slug)) tagLinks.set(slug, { labels: new Map(), members: new Set() });
      const t = tagLinks.get(slug); t.members.add(member); t.labels.set(label, (t.labels.get(label) || 0) + 1);
    }
    for (const m of html.matchAll(/<a\s+href="https:\/\/capecodcannabis\.com\/events-calendar\/category\/([^"/]+)\/?"\s+rel="tag">([\s\S]*?)<\/a>/g)) {
      const slug = safeDecode(m[1]); const label = decodeEntities(m[2]).trim();
      if (!evCats.has(slug)) evCats.set(slug, { labels: new Map(), members: new Set() });
      const t = evCats.get(slug); t.members.add(member); t.labels.set(label, (t.labels.get(label) || 0) + 1);
    }
  }
  const topLabel = (labels) => [...labels].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
  const newestFirst = (paths) => [...paths].sort((a, b) => {
    const da = routes.get(a).published || '', db = routes.get(b).published || '';
    return da < db ? 1 : da > db ? -1 : (a < b ? -1 : 1);
  });
  const blockedTags = ia.blocked403.urls.filter((u) => /\/tag\//.test(u)).map(pathOf);
  for (const p of blockedTags.sort()) {
    const slug = p.split('/')[2];
    const t = tagLinks.get(slug);
    if (!t) { notBuilt.push({ path: p, status: 403, why: 'tag archive refused by the lockout and no captured page carries its link' }); continue; }
    const label = topLabel(t.labels);
    add({ path: p, kind: 'blog-archive-tag', sourceUrl: null, derived: true, derivedType: 'tag-archive',
      why: 'tag archive refused by the lockout (403); rebuilt as the listing of the ' + t.members.size + ' captured page(s) whose tag widget links it (BUILD-CONTRACT 4.3)',
      h1: label, title: label + ' Archives' + SUFFIX, titleDerived: 'pattern of the blog category archives ("<name> Archives | ...")',
      robots: 'follow, noindex', robotsWhy: 'the live robots of tag archives is UNVERIFIED (403); kept out of the index like the day archives until the operator decides',
      members: newestFirst(t.members), memberOrder: 'datePublished desc (WordPress archive order), from the captured JSON-LD' });
  }
  for (const [slug, t] of [...evCats].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const p = '/events-calendar/category/' + slug + '/';
    const label = topLabel(t.labels);
    add({ path: p, kind: 'events-calendar', sourceUrl: null, derived: true, derivedType: 'event-category-archive',
      why: 'event-category view refused by the lockout (403); rebuilt as the listing of the ' + t.members.size + ' captured event(s) tagged with it (BUILD-CONTRACT 4.3)',
      h1: label, title: label + SUFFIX, titleDerived: 'category label plus the site suffix (the live view title is UNVERIFIED)',
      robots: 'follow, noindex', robotsWhy: 'live robots UNVERIFIED (403)',
      members: newestFirst(t.members), memberOrder: 'datePublished desc, from the captured JSON-LD' });
  }
  /* the TEC list view is the calendar's default view (the crawled /events-calendar/ renders "List") */
  redirects.set('/events-calendar/list', { from: '/events-calendar/list', to: '/events-calendar/', status: 301, why: 'TEC list view (403 in the crawl) = the default list view of the crawled /events-calendar/ page' });

  /* 4. derived: terpene index pagination (/terpenes/page/2-5/ refused by the lockout) */
  {
    const raw = readText('audit/raw/terpenes.html');
    const page1 = [];
    /* the archive grid only (card titles), not the accordion images that also link terpenes */
    for (const m of raw.matchAll(/class="elementor-post__title"[^>]*>\s*<a href="(https:\/\/capecodcannabis\.com\/terpenes\/[^"/]+\/)"/g)) { const p = pathOf(m[1]); if (routes.has(p) && !page1.includes(p)) page1.push(p); }
    const smXml = readText('audit/prelock/sm-joint_terpenes-sitemap.xml');
    const smOrder = [...smXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => pathOf(m[1].trim())).filter((p) => p && p !== '/terpenes/' && routes.has(p));
    const all = [...routes.values()].filter((r) => r.kind === 'terpene').map((r) => r.path).sort();
    const pageSizeRaw = raw.match(/data-max-page="(\d+)"/);
    const rest = all.filter((p) => !page1.includes(p));
    /* order of the remaining terpenes: the sitemap order reversed (newest first) when page 1 agrees with it, else path order */
    const rev = [...smOrder].reverse();
    const agrees = page1.length && rev.slice(0, page1.length).every((p, i) => p === page1[i]);
    const ordered = agrees ? rev.filter((p) => rest.includes(p)).concat(rest.filter((p) => !rev.includes(p))) : rest;
    const size = page1.length || 1;
    const blockedPag = ia.blocked403.urls.filter((u) => /\/terpenes\/page\//.test(u)).map(pathOf).sort();
    for (const p of blockedPag) {
      const n = +p.split('/')[3];
      const members = ordered.slice((n - 2) * size, (n - 1) * size);
      add({ path: p, kind: 'taxonomy-index-pagination', sourceUrl: null, derived: true, derivedType: 'terpene-pagination',
        why: 'terpene index page ' + n + ' refused by the lockout (403); rebuilt from the terpene pages not listed on the captured page 1 (' + page1.length + ' per page' + (pageSizeRaw ? ', data-max-page ' + pageSizeRaw[1] : '') + ')',
        h1: null, title: null, titleDerived: 'the page-1 head is reused with "Page N"', page: n, parent: '/terpenes/',
        robots: 'follow, index', members, memberOrder: agrees ? 'terpene sitemap order reversed (page 1 matches it)' : 'path order (archive order UNVERIFIED)' });
    }
    if (!agrees) problems.push('terpene pagination order UNVERIFIED: page 1 does not follow the reversed sitemap order');
  }

  /* 5. products: all 5,857 from the HTML sitemap page; t1 is the one captured page */
  {
    const hs = readText('audit/raw/sitemap.html');
    const t1 = '/products/flower-popcorn-half-ounce-claravita-maui-waui-sdh-14g-for-sale-wellfleet-ma/';
    const xml1 = new Set([...readText('audit/prelock/sm-joint_products-sitemap1.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => pathOf(m[1].trim())));
    for (const m of hs.matchAll(/<a href="(https:\/\/capecodcannabis\.com\/products\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const sp = splitInternal(m[1]);
      const encoded = /%[0-9a-f]{2}/i.test(m[1]);
      const title = decodeEntities(m[2]).trim();
      const slug = sp.path.split('/')[2];
      const isT1 = sp.path === t1;
      add({ path: sp.path, kind: 'product', sourceUrl: m[1], derived: !isT1, derivedType: isT1 ? undefined : 'product',
        why: isT1 ? 'the one captured product page (audit/prelock/t1.html)' : undefined,
        evidence: isT1 ? 'audit/prelock/t1.html' : undefined, productSlug: slug, h1: title,
        encodedSlug: encoded || undefined, inXmlSitemap1: xml1.has(sp.path) || undefined });
    }
  }

  /* 6. offers -> specials, and what is not built */
  for (const r of ia.routes) {
    if (r.template === 'offers-redirect') {
      const p = pathOf(r.url);
      const slug = p.split('/')[2];
      const target = slug ? '/specials/' + slug + '/' : '/specials/';
      if (routes.has(target)) redirects.set(p.replace(/\/$/, ''), { from: p.replace(/\/$/, ''), to: target, status: 301, why: '/offers/<slug> 301s to /specials/<slug> on the live site; the special exists in the rebuild' });
      else notBuilt.push({ path: p, status: r.status, why: r.status === 404 ? 'dead on the live site: /offers/<slug> 301s to an expired /specials/<slug> (404)' : 'refused by the lockout (403) and no captured /specials/' + slug + '/ exists' });
      continue;
    }
    if (r.status === 404) { notBuilt.push({ path: pathOf(r.url), status: 404, why: 'dead internal link on the live site (audit/failures.json)' }); continue; }
    if (r.status === 403 && !/\/tag\/|\/terpenes\/page\//.test(r.url)) {
      const sp = splitInternal(r.url);
      if (sp.search && routes.has(sp.path)) { variants.push({ url: r.url, path: sp.path, why: 'query variant (403 in the crawl): the base path is built and the query is client-side state' }); continue; }
      if (routes.has(sp.path)) continue;
      if (redirects.has(sp.path.replace(/\/$/, ''))) continue;
      notBuilt.push({ path: sp.path + sp.search, status: 403, why: 'refused by the lockout (403); no captured content' });
      continue;
    }
    if (r.status === 'not-crawled' && r.template === 'archive-pagination') { notBuilt.push({ path: r.path, status: 'not-crawled', why: 'archive pagination never crawled; the listing members are in ctx.collections / ctx.catalog for page 1' }); continue; }
    if (r.status === 'not-crawled' && r.template === 'special') { notBuilt.push({ path: r.path, status: 'not-crawled', why: 'in the specials sitemap but never requested (UNVERIFIED why); no content' }); continue; }
    if (r.template === 'non-html') { notBuilt.push({ path: pathOf(r.url), status: r.status, why: 'non-HTML file whose body the crawl did not save (UNVERIFIED content)' }); continue; }
    if (r.template === 'search-results') { notBuilt.push({ path: r.url.replace(ORIGIN, ''), status: r.status, why: 'search results (?s=) are client-side state on the base path' }); continue; }
  }

  /* 7. dead links: retarget only where one existing page is the unambiguous target (BUILD-CONTRACT 4.13) */
  const RETARGET = { '/blog/': '/our-blog/' };          // the contract's own example; every other dead link is unlinked
  const deadLinks = ia.deadLinks.map((d) => {
    const p = pathOf(d.url);
    const to = RETARGET[p] && routes.has(RETARGET[p]) ? RETARGET[p] : null;
    return { path: p, retarget: to, linkedFromCount: d.linkedFromCount, why: to ? 'retargeted: one existing page is the unambiguous target (BUILD-CONTRACT 4.13 example)' : 'unlinked, anchor text kept: no unambiguous target (BUILD-CONTRACT 4.13)' };
  }).sort(byPath);

  /* a redirect must land on a built page; one that lands on a dead or unbuilt page is listed as not built */
  for (const [k, r] of [...redirects]) {
    if (!routes.has(r.to)) {
      redirects.delete(k);
      const dead = ia.routes.some((x) => x.status === 404 && pathOf(x.url) === r.to);
      notBuilt.push({ path: r.from, status: r.status, why: 'redirect to ' + r.to + ', which is not built (' + (dead ? 'dead on the live site' : 'no captured content') + ')' });
    }
  }
  /* checks: duplicate and case-insensitive collisions (Windows and macOS disks fold case) */
  const folded = new Map();
  for (const p of routes.keys()) { const k = p.normalize('NFC').toLowerCase(); if (folded.has(k)) problems.push('case-insensitive collision: ' + folded.get(k) + ' vs ' + p); folded.set(k, p); }
  for (const r of redirects.values()) if (routes.has(withSlash(r.from)) && withSlash(r.from) !== r.to) problems.push('redirect source is also a route: ' + r.from);

  const list = [...routes.values()].sort(byPath);
  const counts = { routes: list.length, crawled: list.filter((r) => !r.derived).length, derived: list.filter((r) => r.derived).length, byKind: {}, byDerivedType: {}, redirects: redirects.size, variants: variants.length, notBuilt: notBuilt.length, deadLinks: deadLinks.length };
  for (const r of list) { counts.byKind[r.kind] = (counts.byKind[r.kind] || 0) + 1; if (r.derivedType) counts.byDerivedType[r.derivedType] = (counts.byDerivedType[r.derivedType] || 0) + 1; }
  return {
    schema: 'ccc/routes@1', generated: BUILD_DATE, origin: ORIGIN,
    note: 'Output paths are decoded UTF-8 with a trailing slash; hrefs are percent-encoded at build. kind = the ia-map template name. derived pages say why they exist (route.why, else whyByType[derivedType]).',
    whyByType: {
      product: 'listed on the HTML sitemap page /sitemap/ (audit/raw/sitemap.html, 5,857 links with titles); the product page itself was never crawled (lockout), so it is a Plan B stub: H1 = the sitemap title, no price, image, offers or Product JSON-LD (BUILD-CONTRACT 4.5)',
    },
    titlePatterns: { product: '<h1>' + SUFFIX + ' (t1 <title>: "<post title> | Cape Cod Cannabis Recreational Dispensary in Wellfleet, MA")' },
    counts, problems, routes: list,
    redirects: [...redirects.values()].sort((a, b) => (a.from < b.from ? -1 : 1)),
    variants: variants.sort((a, b) => (a.url < b.url ? -1 : 1)),
    deadLinks,
    notBuilt: notBuilt.sort((a, b) => (String(a.path) < String(b.path) ? -1 : 1)),
  };
}

export function loadRoutes() { return readJSON(ROUTES_FILE); }

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const r = buildRoutes();
  const changed = writeIfChanged(path.join(ROOT, ROUTES_FILE), jsonLines(r, ['routes', 'redirects', 'variants', 'deadLinks', 'notBuilt']));
  console.log('routes ' + JSON.stringify(r.counts));
  if (r.problems.length) { console.log('PROBLEMS:\n  ' + r.problems.join('\n  ')); }
  console.log((changed ? 'wrote ' : 'unchanged ') + ROUTES_FILE);
  process.exitCode = r.problems.some((p) => /duplicate|collision|also a route/.test(p)) ? 1 : 0;
}
