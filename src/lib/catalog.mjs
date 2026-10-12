// catalog.mjs - the catalog model from evidence only (PIPELINE-SITE).
//   node src/lib/catalog.mjs   -> src/content/catalog/{products,brands,categories,specials,glossary,listings}.json
// Reads src/content/routes.json (run src/lib/routes.mjs first), audit/raw/*.html (breadcrumbs, H1s, Joint data-config)
// and audit/prelock/t1.html (the one full product). Plan B rules (BUILD-CONTRACT 4.5): no invented prices, images,
// offers or Product JSON-LD; listings carry evidenced members only (brand pages: products whose TITLE starts with the
// brand name); everything parsed from a slug is flagged "from the product name".
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, splitInternal } from './paths.mjs';
import { readJSON, readText, jsonLines, writeIfChanged, decodeEntities, BUILD_DATE, SNAPSHOT_DATE } from './site.mjs';

export const CATALOG_DIR = 'src/content/catalog';
const FILES = ['products', 'brands', 'categories', 'specials', 'glossary', 'listings'];

const strip = (h) => decodeEntities(String(h).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const firstH1 = (html) => { const m = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i); return m ? strip(m[1]) : null; };
function breadcrumbOf(html) {
  const m = html.match(/<nav aria-label="breadcrumbs"[^>]*>([\s\S]*?)<\/nav>/i);
  if (!m) return null;
  const items = [];
  for (const x of m[1].matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<span class="last">([\s\S]*?)<\/span>/g)) {
    if (x[1]) items.push({ label: strip(x[2]), href: splitInternal(x[1]) ? splitInternal(x[1]).path : x[1] });
    else items.push({ label: strip(x[3]), href: null });
  }
  return items;
}
/** every Joint listing widget on a page: { widget: menu|slider, raw (non-null keys), filters, sort, limit } */
function jointConfigs(html) {
  const out = [];
  for (const m of html.matchAll(/<div\b([^>]*)\bdata-config="([^"]*)"[^>]*>/g)) {
    const tag = m[1];
    const widget = /id="joint-menu"/.test(tag) ? 'menu' : /joint-slider/.test(m[0]) ? 'slider' : null;
    if (!widget) continue;
    let cfg; try { cfg = JSON.parse(decodeEntities(m[2])); } catch { continue; }
    const raw = Object.fromEntries(Object.entries(cfg.raw || {}).filter(([k, v]) => v !== null && v !== '' && k !== 'post_id').sort((a, b) => (a[0] < b[0] ? -1 : 1)));
    out.push({ widget, raw, filters: cfg.filters || [], sort: cfg.sort || null, limit: cfg.limit ?? raw.limit ?? null });
  }
  return out;
}

/* slug facts (size, strain type). BUILD-CONTRACT 4.16.7 (H2 change): every chip says where its label comes from.
   - from: 'title': the slug token's words appear in the product title (any separator between them); the label is that
     title substring, verbatim ("30pk/15serv", "3.5g", "Hybrid"); source (the caption) 'from the product name'.
   - from: 'slug': the token is not in the title; the label is the token un-slugged only (hyphens to spaces, nothing
     else); source (the caption) "from the product's web address".
   Strain-type abbreviations (sdh, idh, s, i, h) keep label null: their expansion is UNVERIFIED. */
const SIZE_TOK = /^\d+(?:g|mg|ml|oz|lb|pk|ct|serv|pc|pcs)$/;
const STRAIN_WORD = new Set(['hybrid', 'indica', 'sativa', 'cbd', 'balanced']);
const STRAIN_ABBR = new Set(['sdh', 'idh', 's', 'i', 'h']);
export const CHIP_CAPTION = { title: 'from the product name', slug: "from the product's web address" };
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** the title substring that spells the slug token (its pieces in order, any short non-alphanumeric run between) */
export function titleSpelling(title, token) {
  if (!title || !token) return null;
  const pieces = token.split('-').filter(Boolean);
  if (!pieces.length) return null;
  const re = new RegExp('(?<![\\p{L}\\p{N}])' + pieces.map(reEsc).join('[^\\p{L}\\p{N}]{1,3}') + '(?![\\p{L}\\p{N}])', 'iu');
  const m = String(title).match(re);
  return m ? m[0] : null;
}
function chip(title, token, extra = {}) {
  const inTitle = titleSpelling(title, token);
  if (inTitle) return { token, label: inTitle, from: 'title', source: CHIP_CAPTION.title, ...extra };
  return { token, label: token.split('-').join(' '), from: 'slug', source: CHIP_CAPTION.slug, ...extra };
}
export function slugFacts(slug, title = null) {
  const m = slug.match(/-for-sale-wellfleet-ma(?:-(\d+))?$/);
  const core = m ? slug.slice(0, m.index) : slug;
  const toks = core.split('-');
  const sizeToks = [];
  while (toks.length > 1 && SIZE_TOK.test(toks[toks.length - 1])) sizeToks.unshift(toks.pop());
  /* a decimal size is two slug tokens ("3-5g" for "3.5g"); the token keeps the slug form, the title supplies the dot */
  if (sizeToks.length && toks.length > 1 && /^(0|1|2|3|7)$/.test(toks[toks.length - 1]) && /^\d+(g|mg|ml|oz)$/.test(sizeToks[0])) sizeToks.unshift(toks.pop());
  let strain = null;
  if (toks.length > 1 && (STRAIN_WORD.has(toks[toks.length - 1]) || STRAIN_ABBR.has(toks[toks.length - 1]))) strain = toks.pop();
  let strainType = null;
  if (strain && STRAIN_WORD.has(strain)) strainType = chip(title, strain);
  else if (strain) strainType = { token: strain, label: null, from: titleSpelling(title, strain) ? 'title' : 'slug', source: null, note: 'abbreviation; expansion UNVERIFIED, so no label' };
  return {
    dup: m && m[1] ? +m[1] : 0,
    size: sizeToks.length ? chip(title, sizeToks.join('-')) : null,
    strainType,
  };
}

/** t1: the one full product (JSON-LD Product, breadcrumb, Joint product id, og:updated_time) */
function t1Full() {
  const html = readText('audit/prelock/t1.html');
  let product = null;
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let j; try { j = JSON.parse(m[1]); } catch { continue; }
    const nodes = Array.isArray(j) ? j : j['@graph'] ? j['@graph'] : [j];
    for (const n of nodes) if (n && n['@type'] === 'Product') product = n;
  }
  if (!product) return null;
  const pd = html.match(/<div class="joint-product-details" data-config="([^"]*)"/);
  let jointId = null; try { jointId = JSON.parse(decodeEntities(pd[1])).raw.product; } catch { /* none */ }
  const upd = html.match(/<meta property="og:updated_time" content="([^"]+)"/);
  const desc = decodeEntities(product.description || '');
  return {
    jsonLd: product,
    name: product.name,
    description: desc,
    descriptionLines: desc.split(/<br\s*\/?>/i).map((s) => s.trim()).filter(Boolean),
    brandName: product.brand && product.brand.name || null,
    imageHash: typeof product.image === 'string' ? product.image.replace(/^https:\/\/images\.dutchie\.com\//, '') : null,
    offers: (product.offers || []).map((o) => ({ name: o.name, price: o.price, priceCurrency: o.priceCurrency, availability: o.availability })),
    jointId, updated: upd ? upd[1] : null, asOf: SNAPSHOT_DATE, evidence: 'audit/prelock/t1.html',
  };
}

export function buildCatalog() {
  const routes = readJSON('src/content/routes.json');
  const R = routes.routes;
  const byKind = (k) => R.filter((r) => r.kind === k);
  const rawOf = (r) => (r.evidence && r.evidence.startsWith('audit/raw/') ? readText(r.evidence) : null);
  const problems = [];

  /* listings: every Joint grid/rail config, per page path */
  const listings = {};
  for (const r of R) {
    if (r.derived || !r.evidence || !r.evidence.startsWith('audit/raw/')) continue;
    const c = jointConfigs(rawOf(r));
    if (c.length) listings[r.path] = c;
  }

  /* brands: the crawled brand pages (H1 = display name; the Joint brandName filter value) */
  const brands = byKind('brand').map((r) => {
    const html = rawOf(r);
    const cfg = (listings[r.path] || []).find((c) => c.widget === 'menu');
    const f = cfg && cfg.filters.find((x) => x.field === 'brandName');
    return { name: firstH1(html) || (r.title || '').replace(/^Buy (.*) Brand Products Online.*$/, '$1'), path: r.path, slug: r.path.split('/')[2], jointBrand: f ? f.values[0] : null, products: [] };
  }).sort((a, b) => (a.path < b.path ? -1 : 1));
  const names = brands.flatMap((b) => [...new Set([b.name, b.jointBrand].filter(Boolean))].map((n) => ({ n: n.toLowerCase(), b }))).sort((a, b) => b.n.length - a.n.length || (a.n < b.n ? -1 : 1));
  const bySlug = brands.slice().sort((a, b) => b.slug.length - a.slug.length || (a.slug < b.slug ? -1 : 1));

  /* products: all 5,857 (title verbatim from /sitemap/), brand by title prefix, else by slug start (flagged) */
  const full = t1Full();
  if (!full) problems.push('t1 Product JSON-LD not found');
  const products = byKind('product').map((r) => {
    const title = r.h1;
    const lt = title.toLowerCase();
    let brand = null;
    const hit = names.find(({ n }) => lt.startsWith(n) && !/[a-z0-9]/i.test(lt.charAt(n.length)));
    if (hit) brand = { name: hit.b.name, path: hit.b.path, match: 'title-prefix' };
    else {
      const s = bySlug.find((b) => r.productSlug.startsWith(b.slug + '-'));
      if (s) brand = { name: s.name, path: s.path, match: 'slug-start', flag: 'brand taken from the URL slug, not the title' };
    }
    const facts = slugFacts(r.productSlug, title);
    const p = { path: r.path, slug: r.productSlug, title, brand, size: facts.size, strainType: facts.strainType, dup: facts.dup || undefined, encodedSlug: r.encodedSlug || undefined, sourceUrl: r.sourceUrl };
    if (!r.derived && full) p.full = full;
    return p;
  });
  /* a brand page lists every product the catalog links to it, the flagged slug-start matches included (BUILD-CONTRACT
     4.16.7); each product's brand.match / brand.flag says how it was linked */
  for (const p of products) if (p.brand) brands.find((b) => b.path === p.brand.path).products.push(p.path);
  for (const b of brands) b.products.sort();

  /* categories and subcategories */
  const cats = [...byKind('category'), ...byKind('subcategory')].map((r) => {
    const html = rawOf(r);
    const bc = breadcrumbOf(html) || [];
    const menu = (listings[r.path] || []).find((c) => c.widget === 'menu');
    const segs = r.path.split('/').filter(Boolean);
    return { name: bc.length ? bc[bc.length - 1].label : null, h1: firstH1(html), path: r.path, kind: r.kind, parent: segs.length === 3 ? '/' + segs.slice(0, 2).join('/') + '/' : null,
      jointCategory: menu && menu.raw.category || null, jointSubcategory: menu && menu.raw.subcategory || null, children: [] };
  }).sort((a, b) => (a.path < b.path ? -1 : 1));
  for (const c of cats) if (c.parent) { const p = cats.find((x) => x.path === c.parent); if (p) p.children.push(c.path); else problems.push('subcategory without a crawled parent: ' + c.path); }

  /* specials */
  const specials = byKind('special').map((r) => {
    const html = rawOf(r);
    const menu = (listings[r.path] || []).find((c) => c.widget === 'menu');
    const f = menu && menu.filters.find((x) => x.field === 'applicableSpecials.specialId');
    return { name: firstH1(html), path: r.path, specialId: f ? f.values[0] : null };
  }).sort((a, b) => (a.path < b.path ? -1 : 1));

  /* glossary: terpenes, cannabinoids, effects, strains (name = the breadcrumb's last item) */
  const FIELD = { terpene: 'terpenes.name', cannabinoid: 'cannabinoids.name', effect: 'effects', strain: 'strainType' };
  const glossary = {};
  for (const k of ['terpene', 'cannabinoid', 'effect', 'strain']) {
    glossary[k + 's'] = byKind(k).map((r) => {
      const html = rawOf(r);
      const bc = breadcrumbOf(html) || [];
      const menu = (listings[r.path] || []).find((c) => c.widget === 'menu');
      const f = menu && menu.filters.find((x) => x.field === FIELD[k]);
      return { name: bc.length ? bc[bc.length - 1].label : firstH1(html), h1: firstH1(html), path: r.path, filterField: FIELD[k], filterValues: f ? f.values : [] };
    }).sort((a, b) => (a.path < b.path ? -1 : 1));
  }

  const stats = {
    products: products.length,
    brandByTitlePrefix: products.filter((p) => p.brand && p.brand.match === 'title-prefix').length,
    brandBySlugStart: products.filter((p) => p.brand && p.brand.match === 'slug-start').length,
    brandNone: products.filter((p) => !p.brand).length,
    size: products.filter((p) => p.size).length,
    strainTypeLabelled: products.filter((p) => p.strainType && p.strainType.label).length,
    strainTypeAbbrevOnly: products.filter((p) => p.strainType && !p.strainType.label).length,
    chipsFromTitle: products.reduce((a, p) => a + [p.size, p.strainType].filter((c) => c && c.label && c.from === 'title').length, 0),
    chipsFromSlug: products.reduce((a, p) => a + [p.size, p.strainType].filter((c) => c && c.label && c.from === 'slug').length, 0),
    brandMembersSlugStart: products.filter((p) => p.brand && p.brand.match === 'slug-start').length,
    full: products.filter((p) => p.full).length,
    brands: brands.length, brandsWithMembers: brands.filter((b) => b.products.length).length,
    categories: cats.filter((c) => c.kind === 'category').length, subcategories: cats.filter((c) => c.kind === 'subcategory').length,
    specials: specials.length, listingPages: Object.keys(listings).length, listingWidgets: Object.values(listings).reduce((a, l) => a + l.length, 0),
    glossary: Object.fromEntries(Object.entries(glossary).map(([k, v]) => [k, v.length])),
  };
  const meta = { schema: 'ccc/catalog@1', generated: BUILD_DATE, snapshot: SNAPSHOT_DATE, rules: 'Plan B (BUILD-CONTRACT 4.5): no invented prices, images, offers or Product JSON-LD; size and strain-type chips carry from (title | slug) and a caption that follows it (BUILD-CONTRACT 4.16.7); brand by title prefix (else slug start, flagged); brand pages list both kinds of match; only t1 has full data.' };
  return {
    problems, stats,
    files: {
      products: { ...meta, stats, products },
      brands: { ...meta, brands },
      categories: { ...meta, categories: cats },
      specials: { ...meta, specials },
      glossary: { ...meta, ...glossary },
      listings: { ...meta, note: 'Each page\'s own Joint widget configs (data-config), verbatim minus null keys and post_id.', listings },
    },
  };
}

export function loadCatalog() {
  const read = (n) => readJSON(CATALOG_DIR + '/' + n + '.json');
  const p = read('products'), b = read('brands'), c = read('categories'), s = read('specials'), g = read('glossary'), l = read('listings');
  return { products: p.products, stats: p.stats, brands: b.brands, categories: c.categories, specials: s.specials,
    glossary: { terpenes: g.terpenes, cannabinoids: g.cannabinoids, effects: g.effects, strains: g.strains }, listings: l.listings, snapshot: p.snapshot };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const c = buildCatalog();
  for (const n of FILES) {
    const arrays = ['products', 'brands', 'categories', 'specials', 'terpenes', 'cannabinoids', 'effects', 'strains'];
    const changed = writeIfChanged(path.join(ROOT, CATALOG_DIR, n + '.json'), jsonLines(c.files[n], arrays));
    console.log((changed ? 'wrote ' : 'unchanged ') + CATALOG_DIR + '/' + n + '.json');
  }
  console.log('catalog ' + JSON.stringify(c.stats));
  if (c.problems.length) console.log('PROBLEMS:\n  ' + c.problems.join('\n  '));
  process.exitCode = c.problems.length ? 1 : 0;
}
