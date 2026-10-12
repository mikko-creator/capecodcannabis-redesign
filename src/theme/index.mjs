// src/theme/index.mjs - the theme module (BUILD-CONTRACT 3.2; docs/PIPELINE-SITE.md section 3).
// Owner: T1a (chrome + design system). Skeleton by T0, 2026-10-12. Change requests: tmp/t1a/INBOX.md.
// renderPage dispatches by page.kind: home -> home.mjs; the shop kinds -> shop.mjs; every other kind -> templates.mjs.
// Template modules return the <main> inner html; chrome.mjs wraps it into the document. Module map: src/theme/README.md.
import { KNOWN_BLOCKS } from '../lib/render-util.mjs';
import { renderDocument } from './chrome.mjs';
import { resetIds } from './blocks.mjs';
import { renderHome } from './home.mjs';
import { renderShop, SHOP_KINDS } from './shop.mjs';
import { renderTemplate, render404Main } from './templates.mjs';

/** src/styles files, concatenated in this order into dist/assets/site.<hash>.css */
export const styles = ['tokens.css', 'base.css', 'glass.css', 'depth.css', 'motion.css', 'chrome.css', 'home.css', 'interior.css', 'blocks.css', 'forms.css', 'shop.css'];
/** src/scripts files, concatenated in this order into dist/assets/site.<hash>.js */
export const scripts = ['site.js', 'features.js', 'shop.js'];
/** every block type the theme renders: the whole KNOWN_BLOCKS vocabulary (src/lib/render-util.mjs) */
export const blockTypes = [...KNOWN_BLOCKS];
export const stylesDir = 'src/styles';
export const scriptsDir = 'src/scripts';

/** page -> complete HTML document */
export function renderPage(page, ctx) {
  resetIds();
  let main;
  if (page.kind === 'home') main = renderHome(page, ctx);
  else if (SHOP_KINDS.has(page.kind)) main = renderShop(page, ctx);
  else main = renderTemplate(page, ctx);
  return renderDocument(page, ctx, main);
}
/** the 404 document (served at any depth) */
export function render404(ctx) {
  resetIds();
  const page = { kind: '404', path: null, title: '404', h1: '404', og: {}, twitter: {}, jsonLd: [], robots: 'noindex, follow' };
  return renderDocument(page, ctx, render404Main(ctx));
}
