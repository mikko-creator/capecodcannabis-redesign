/* site.js - the chrome's behaviour. Owner: T1a. Skeleton by T0, 2026-10-12; finished by T1a 2026-10-12.
   Age gate (BUILD-CONTRACT 4.4 / 4.15.2 / 4.17.1, fail closed), about-page popup (4.15.9), disclosure nav (DESIGN-SPEC
   6.2-6.3), search (6.5, 4.17.7), the phone sheet (6.4), the Pickup bag drawer (6.6), dialogs with a shared focus trap,
   reveal and its fail-safes, parallax, seam sweep, rails, video loops, to-top, maps (4.17.14), unwired forms (4.6).
   Shared API on window.CCC (the only global; contract in src/theme/README.md):
     CCC.dialog.create(rootEl, { panel, closeSel, onOpen, onClose, initial }) -> { open(opener), close(), isOpen() }
     CCC.dialog.trap(panel, keydownEvent)        Tab / Shift+Tab stay inside panel
     CCC.dialog.focusables(panel) -> Element[]   the visible focusable elements, in order
     CCC.bag.add({ id, name, variant, price, asOf }) -> count; CCC.bag.open(opener?); CCC.bag.close(); CCC.bag.items();
     CCC.bag.count(); CCC.announce(text)          polite live region [data-live]
     CCC.search.open(value?); CCC.search.close()
   With JS off: the gate stays up until "Yes" (#age-ok, CSS :target), menus are plain links, content is visible. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, win = window;
  var CCC = win.CCC = win.CCC || {};
  var pageTitle = doc.title;
  var reduce = false;
  try { reduce = win.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) { reduce = false; }
  var saveData = !!(win.navigator && win.navigator.connection && win.navigator.connection.saveData);
  function show(rootEl, sel, on) { var n = rootEl.querySelector(sel); if (n) { if (on) n.removeAttribute('hidden'); else n.setAttribute('hidden', ''); } }
  function each(sel, fn, ctx) { var list = (ctx || doc).querySelectorAll(sel); for (var i = 0; i < list.length; i++) fn(list[i], i); }
  function focus(el) { if (el) try { el.focus(); } catch (err) { /* ignore */ } }
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* ---- shared dialog helper: focus trap, Escape, focus return ---- */
  function focusables(panel) {
    var out = [], list = panel.querySelectorAll(FOCUSABLE);
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.getAttribute('tabindex') === '-1' || el.closest('[inert]')) continue;
      if (!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)) continue;
      if (win.getComputedStyle(el).visibility === 'hidden') continue;
      out.push(el);
    }
    return out;
  }
  function trap(panel, ev) {
    if (ev.key !== 'Tab') return;
    var f = focusables(panel);
    if (!f.length) { ev.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1], a = doc.activeElement;
    if (ev.shiftKey && (a === first || !panel.contains(a))) { ev.preventDefault(); focus(last); }
    else if (!ev.shiftKey && (a === last || !panel.contains(a))) { ev.preventDefault(); focus(first); }
  }
  function createDialog(box, opts) {
    opts = opts || {};
    var panel = opts.panel || box.querySelector('[data-dialog]') || box;
    var opener = null, isOpen = false;
    function close() {
      if (!isOpen) return;
      isOpen = false;
      box.setAttribute('hidden', '');
      box.classList.remove('is-open');
      root.classList.remove('dialog-open');
      if (opener && opener.hasAttribute && opener.hasAttribute('aria-expanded')) opener.setAttribute('aria-expanded', 'false');
      if (opts.onClose) opts.onClose();
      focus(opener);
    }
    function open(from) {
      opener = from || doc.activeElement;
      isOpen = true;
      box.removeAttribute('hidden');
      box.classList.add('is-open');
      root.classList.add('dialog-open');
      if (opener && opener.hasAttribute && opener.hasAttribute('aria-expanded')) opener.setAttribute('aria-expanded', 'true');
      if (opts.onOpen) opts.onOpen();
      var first = (opts.initial && panel.querySelector(opts.initial)) || (opts.closeSel && panel.querySelector(opts.closeSel + ':not(div)')) || focusables(panel)[0];
      focus(first);
    }
    if (opts.closeSel) box.addEventListener('click', function (ev) { var t = ev.target && ev.target.closest ? ev.target.closest(opts.closeSel) : null; if (t && box.contains(t)) close(); });
    box.addEventListener('keydown', function (ev) {
      if (!isOpen) return;
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(); return; }
      trap(panel, ev);
    });
    return { open: open, close: close, isOpen: function () { return isOpen; } };
  }
  CCC.dialog = { create: createDialog, trap: trap, focusables: focusables };

  /* ---- polite live region ---- */
  var live = doc.querySelector('[data-live]');
  CCC.announce = function (text) {
    if (!live) return;
    live.textContent = '';
    win.setTimeout(function () { live.textContent = text; }, 60);
  };

  /* ---- age gate: consent in localStorage ('ccc-age-21'). "No" keeps the gate up with the plugin's error and lets the
     visitor answer again (rechallenge). While the gate is up, document.title is the plugin's customTitle and main,
     header and footer are inert; the page title returns on "Yes" and focus moves to the skip link. If storage throws,
     the plugin's cookie warning shows; "Yes" still closes the gate for this page view. Escape never dismisses it.
     The markup ships it open (fail closed); with consent stored, the head script has already hidden it. */
  var gate = doc.getElementById('age-gate');
  var gateOpen = false;
  var afterGate = [];
  var INERT = 'body > header, body > main, body > footer, body > .totop';
  function setInert(on) { each(INERT, function (el) { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); }); }
  function gateDone() { gateOpen = false; root.classList.remove('gate-open'); setInert(false); var q = afterGate; afterGate = []; for (var i = 0; i < q.length; i++) q[i](); }
  if (gate) {
    var key = gate.getAttribute('data-key') || 'ccc-age-21';
    var gateTitle = gate.getAttribute('data-title');
    var ok = false;
    var storageOk = true;
    try { ok = win.localStorage.getItem(key) === '1'; } catch (err) { storageOk = false; ok = false; }
    var consented = false;
    if (ok) {
      root.classList.add('age-ok');
      if (gate.open) gate.close();
    } else {
      root.classList.remove('age-ok');
      gate.addEventListener('cancel', function (ev) { ev.preventDefault(); });
      /* Chrome lets Escape close a modal dialog when the page has no user activation (the cancel event is then not
         cancelable): a gate closed without "Yes" opens again at once */
      gate.addEventListener('close', function () { if (gateOpen && !consented) { try { gate.showModal(); } catch (err) { gate.setAttribute('open', ''); } } });
      if (gateTitle) doc.title = gateTitle;
      if (!storageOk) show(gate, '.age-cookies', true);
      gateOpen = true;
      root.classList.add('gate-open');
      setInert(true);
      if (typeof gate.showModal === 'function') {
        /* the markup ships <dialog open> (non-modal, for no-JS); reopen it modal so everything behind is inert */
        try { if (gate.open) gate.close(); gate.showModal(); } catch (err) { gate.setAttribute('open', ''); }
      }
      focus(gate.querySelector('[data-age="yes"]'));
    }
    gate.addEventListener('click', function (ev) {
      var t = ev.target;
      var b = t && t.closest ? t.closest('[data-age]') : null;
      if (!b) return;
      ev.preventDefault();   /* JS answers; the #age-ok / #age-no targets are the no-JS path */
      if (b.getAttribute('data-age') === 'yes') {
        consented = true;
        try { win.localStorage.setItem(key, '1'); } catch (err) { show(gate, '.age-cookies', true); }
        show(gate, '.age-error', false);
        doc.title = pageTitle;
        root.classList.add('age-ok');
        if (gate.open) gate.close();
        gateDone();
        focus(doc.querySelector('.skip'));
      } else {
        show(gate, '.age-error', true);
      }
    });
    /* role="button" links: Space activates them, as a button */
    gate.addEventListener('keydown', function (ev) {
      var t = ev.target;
      if ((ev.key === ' ' || ev.key === 'Spacebar') && t && t.getAttribute && t.getAttribute('data-age')) { ev.preventDefault(); t.click(); }
      if (ev.key === 'Escape') ev.preventDefault();
    });
  }

  /* ---- popup sections as dialogs: the source trigger is page load + 1 s, at most 2 times per session */
  each('dialog[data-popup]', function (d) {
    var close = d.querySelector('[data-close]');
    if (close) close.addEventListener('click', function () { d.close(); });
    if (typeof d.showModal !== 'function') return;
    function open() {
      var times = +(d.getAttribute('data-times') || 0);
      var k = 'ccc-popup-' + (d.id || 'popup');
      var n = 0;
      var counted = true;
      try { n = +(win.sessionStorage.getItem(k) || 0); } catch (err) { counted = false; }
      if (counted && times && n >= times) return;
      try { win.sessionStorage.setItem(k, String(n + 1)); } catch (err) { /* uncounted */ }
      if (!d.open) d.showModal();
    }
    function arm() { win.setTimeout(open, +(d.getAttribute('data-delay') || 0)); }
    if (gateOpen) afterGate.push(arm); else arm();
  });

  /* ---- header: compact after 24px of scroll */
  var hdr = doc.querySelector('[data-header]');

  /* ---- disclosure nav (DESIGN-SPEC 6.2): the caret toggles; hover opens after 120ms and closes 250ms after
     leaving (pointer devices only); Down Arrow opens and focuses the first item; Escape closes and returns focus to
     the caret; focus leaving the item (Tab past the last panel item) closes it. Never opens on :focus-within (R-30). */
  var items = doc.querySelectorAll('[data-nav-item]');
  function setOpen(li, on) {
    var c = li.querySelector('[data-caret]');
    li.classList.toggle('is-open', !!on);
    if (c) c.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  function closeAll(except) { for (var i = 0; i < items.length; i++) if (items[i] !== except) setOpen(items[i], false); }
  var hoverOK = false;
  try { hoverOK = win.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (err) { hoverOK = false; }
  for (var n = 0; n < items.length; n++) (function (li) {
    var caret = li.querySelector('[data-caret]');
    var timer = 0;
    if (caret) {
      caret.addEventListener('click', function () { var on = !li.classList.contains('is-open'); closeAll(li); setOpen(li, on); });
      caret.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowDown') {
          ev.preventDefault(); closeAll(li); setOpen(li, true);
          var panel = doc.getElementById(caret.getAttribute('aria-controls'));
          if (panel) focus(focusables(panel)[0] || panel.querySelector('a'));
        }
      });
    }
    li.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && li.classList.contains('is-open')) { ev.preventDefault(); setOpen(li, false); focus(caret); } });
    li.addEventListener('focusout', function (ev) { if (ev.relatedTarget && !li.contains(ev.relatedTarget)) setOpen(li, false); });
    if (hoverOK) {
      li.addEventListener('mouseenter', function () { clearTimeout(timer); timer = setTimeout(function () { closeAll(li); setOpen(li, true); }, 120); });
      li.addEventListener('mouseleave', function () { clearTimeout(timer); timer = setTimeout(function () { setOpen(li, false); }, 250); });
    }
  })(items[n]);
  doc.addEventListener('click', function (ev) { for (var i = 0; i < items.length; i++) if (!items[i].contains(ev.target)) setOpen(items[i], false); });

  /* ---- search (6.5): a disclosure under the bar on desktop, a dialog on phones (role, aria-modal, focus trap,
     Close). The index (form[data-src], the build's search-index JSON) is fetched on first use; results from 2
     characters, grouped products (title + brand), brands, categories, pages; ArrowDown/ArrowUp move through them.
     "?s=" on any page opens it pre-filled, hyphens read as spaces (BUILD-CONTRACT 4.17.7). */
  var sBtn = doc.querySelector('[data-search-open]');
  var sPanel = doc.querySelector('[data-search]');
  var sForm = sPanel && sPanel.querySelector('form');
  var sInput = sPanel && sPanel.querySelector('input[type="search"]');
  var sOut = sPanel && sPanel.querySelector('[data-search-results]');
  var phoneMQ = null;
  try { phoneMQ = win.matchMedia('(max-width: 700px)'); } catch (err) { phoneMQ = null; }
  var sOpen = false;
  var INDEX = null, INDEX_BASE = null, indexState = 0, pendingQuery = null;
  function norm(s) { return String(s || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function loadIndex(then) {
    if (indexState === 2) { then(); return; }
    if (indexState === 1 || !sForm || !sForm.getAttribute('data-src') || !win.fetch) return;
    indexState = 1;
    var url;
    try { url = new URL(sForm.getAttribute('data-src'), win.location.href); } catch (err) { indexState = 0; return; }
    win.fetch(url.href).then(function (r) { return r.json(); }).then(function (j) {
      INDEX = (j && j.items) || [];
      for (var i = 0; i < INDEX.length; i++) INDEX[i].n = norm(INDEX[i].t) + (INDEX[i].b ? ' ' + norm(INDEX[i].b) : '');
      INDEX_BASE = new URL('../', url);   /* the index sits at <site root>/assets/ */
      indexState = 2; then();
    }).catch(function () { indexState = 0; });
  }
  function hrefOf(u) { try { return new URL(String(u).replace(/^\//, ''), INDEX_BASE).href; } catch (err) { return u; } }
  function el(tag, cls, text) { var x = doc.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
  var EMPTY = 'No products match your search.';   /* declared: theme-shop.json shop-search-empty */
  function runSearch() {
    if (!sOut || !sInput) return;
    var q = norm(sInput.value);
    sOut.textContent = '';
    if (q.length < 2) { sInput.setAttribute('aria-expanded', 'false'); return; }
    if (indexState !== 2) { pendingQuery = q; loadIndex(runSearch); return; }
    var words = q.split(' ');
    var groups = { product: [], brand: [], category: [], page: [] };
    var caps = { product: 8, brand: 4, category: 4, page: 5 };
    for (var i = 0; i < INDEX.length; i++) {
      var it = INDEX[i], g = it.k === 'post' || it.k === 'event' ? 'page' : it.k;
      if (!groups[g] || groups[g].length >= caps[g]) continue;
      var hit = true;
      for (var w = 0; w < words.length; w++) if (it.n.indexOf(words[w]) === -1) { hit = false; break; }
      if (hit) groups[g].push(it);
    }
    var total = 0;
    ['product', 'brand', 'category', 'page'].forEach(function (g) {
      if (!groups[g].length) return;
      total += groups[g].length;
      var ul = el('ul', 'search-results__group search-results__group--' + g);
      groups[g].forEach(function (it) {
        var li = el('li'), a = el('a', 'search-hit');
        a.href = hrefOf(it.u);
        if (g === 'product' && it.b) a.appendChild(el('span', 'search-hit__brand', it.b));
        a.appendChild(el('span', 'search-hit__t', it.t));
        li.appendChild(a); ul.appendChild(li);
      });
      sOut.appendChild(ul);
    });
    if (!total) sOut.appendChild(el('p', 'search-results__empty', EMPTY));
    sInput.setAttribute('aria-expanded', total ? 'true' : 'false');
  }
  var sDialog = null;
  function searchOpen(on, value) {
    if (!sPanel) return;
    var phone = !!(phoneMQ && phoneMQ.matches);
    sOpen = !!on;
    sPanel.classList.toggle('is-open', sOpen);
    if (sOpen && phone) { sPanel.setAttribute('role', 'dialog'); sPanel.setAttribute('aria-modal', 'true'); root.classList.add('dialog-open'); }
    else { sPanel.removeAttribute('role'); sPanel.removeAttribute('aria-modal'); if (!sOpen) root.classList.remove('dialog-open'); }
    if (sBtn) sBtn.setAttribute('aria-expanded', sOpen ? 'true' : 'false');
    if (sOpen) {
      loadIndex(function () { if (sInput && norm(sInput.value).length >= 2) runSearch(); });
      if (sInput) { if (value != null) sInput.value = value; focus(sInput); if (value != null) runSearch(); }
    }
  }
  function searchClose() { if (!sOpen) return; searchOpen(false); focus(sBtn); }
  CCC.search = { open: function (v) { searchOpen(true, v); }, close: searchClose };
  if (sBtn) sBtn.addEventListener('click', function () { if (sOpen) searchClose(); else searchOpen(true); });
  if (sPanel) {
    sPanel.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); searchClose(); return; }
      if (sPanel.getAttribute('role') === 'dialog') trap(sPanel, ev);
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        var hits = sOut ? sOut.querySelectorAll('a') : [];
        if (!hits.length) return;
        var arr = Array.prototype.slice.call(hits), i = arr.indexOf(doc.activeElement);
        ev.preventDefault();
        if (ev.key === 'ArrowDown') focus(arr[Math.min(arr.length - 1, i + 1)]);
        else if (i <= 0) focus(sInput); else focus(arr[i - 1]);
      }
    });
    each('[data-search-close]', function (b) { b.addEventListener('click', searchClose); }, sPanel);
  }
  if (sInput) { sInput.addEventListener('input', runSearch); sInput.addEventListener('focus', function () { loadIndex(function () {}); }); }
  doc.addEventListener('click', function (ev) { if (sOpen && hdr && !hdr.contains(ev.target)) searchOpen(false); });
  try {
    var q = new URLSearchParams(win.location.search).get('s');
    if (q) { var fill = function () { searchOpen(true, q.replace(/-/g, ' ')); }; if (gateOpen) afterGate.push(fill); else fill(); }
  } catch (err) { /* no URLSearchParams */ }

  /* ---- the phone menu sheet (6.4): a dialog; its accordions are buttons with aria-expanded */
  var sheetBox = doc.querySelector('[data-sheet]');
  var sheet = sheetBox ? createDialog(sheetBox, { closeSel: '[data-sheet-close]' }) : null;
  each('[data-sheet-open]', function (b) { b.addEventListener('click', function () { if (sheet) sheet.open(b); }); });
  each('[data-acc]', function (b) {
    b.addEventListener('click', function () {
      var p = doc.getElementById(b.getAttribute('aria-controls'));
      var on = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (p) { if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', ''); }
    });
  });

  /* ---- the Pickup bag (6.6; preview only, BUILD-CONTRACT 4.5): items in localStorage 'ccc-bag'; no totals, no
     savings, no badges (R-39) */
  var BAG_KEY = 'ccc-bag';
  var bagMem = [];
  var bagBox = doc.querySelector('[data-bag]');
  var bagDialog = bagBox ? createDialog(bagBox, { closeSel: '[data-bag-close]' }) : null;
  function bagLoad() { try { var v = JSON.parse(win.localStorage.getItem(BAG_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (err) { return bagMem.slice(); } }
  function bagSave(list) { bagMem = list.slice(); try { win.localStorage.setItem(BAG_KEY, JSON.stringify(list)); } catch (err) { /* memory only */ } }
  function bagCount(list) { var c = 0; for (var i = 0; i < list.length; i++) c += +list[i].qty || 0; return c; }
  function bagRender() {
    var list = bagLoad(), c = bagCount(list);
    each('[data-bag-count]', function (x) { x.textContent = String(c); });
    each('[data-bag-count-sr]', function (x) { x.textContent = c + ' items'; });
    if (!bagBox) return c;
    var ul = bagBox.querySelector('[data-bag-items]');
    var empty = bagBox.querySelector('[data-bag-empty]');
    if (empty) { if (list.length) empty.setAttribute('hidden', ''); else empty.removeAttribute('hidden'); }
    if (!ul) return c;
    ul.textContent = '';
    list.forEach(function (it, i) {
      var li = el('li', 'bag__item');
      li.appendChild(el('p', 'bag__name', it.name || ''));
      var meta = el('p', 'bag__meta');
      if (it.variant) meta.appendChild(el('span', 'bag__variant', it.variant));
      if (it.variant && it.price) meta.appendChild(doc.createTextNode(' '));
      if (it.price) meta.appendChild(el('span', 'bag__price', (it.currency === 'USD' && /^[0-9]/.test(it.price) ? '$' : '') + it.price));
      li.appendChild(meta);
      if (it.asOf) li.appendChild(el('p', 'bag__asof', 'as of ' + it.asOf));
      var qty = el('p', 'bag__qty');
      var minus = el('button', 'bag__step', '−'); minus.type = 'button'; minus.setAttribute('data-bag-step', '-1'); minus.setAttribute('data-i', String(i)); minus.setAttribute('aria-label', 'Decrease quantity of ' + (it.name || ''));
      var plus = el('button', 'bag__step', '+'); plus.type = 'button'; plus.setAttribute('data-bag-step', '1'); plus.setAttribute('data-i', String(i)); plus.setAttribute('aria-label', 'Increase quantity of ' + (it.name || ''));
      qty.appendChild(minus); qty.appendChild(el('span', 'bag__n', String(it.qty || 1))); qty.appendChild(plus);
      li.appendChild(qty);
      ul.appendChild(li);
    });
    return c;
  }
  if (bagBox) bagBox.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('[data-bag-step]') : null;
    if (!b) return;
    var list = bagLoad(), i = +b.getAttribute('data-i'), d = +b.getAttribute('data-bag-step');
    if (!list[i]) return;
    list[i].qty = (+list[i].qty || 1) + d;
    var name = list[i].name;
    if (list[i].qty <= 0) list.splice(i, 1);
    bagSave(list); bagRender();
    /* keep focus on the same control, or on the drawer's Close when the item left */
    var again = bagBox.querySelector('[data-bag-step="' + d + '"][data-i="' + i + '"]');
    if (again && list[i] && list[i].name === name) focus(again); else focus(bagBox.querySelector('[data-bag-close]:not(div)'));
  });
  each('[data-bag-place]', function (b) { b.addEventListener('click', function (ev) { ev.preventDefault(); }); });
  CCC.bag = {
    open: function (from) { if (bagDialog) { bagRender(); bagDialog.open(from); } },
    close: function () { if (bagDialog) bagDialog.close(); },
    items: function () { return bagLoad(); },
    count: function () { return bagCount(bagLoad()); },
    add: function (item, opts) {
      if (!item) return bagCount(bagLoad());
      var list = bagLoad(), id = String(item.id || item.name || ''), found = null;
      for (var i = 0; i < list.length; i++) if (String(list[i].id) === id) found = list[i];
      if (found) found.qty = (+found.qty || 1) + 1;
      else list.push({ id: id, name: String(item.name || ''), variant: item.variant ? String(item.variant) : '', price: item.price ? String(item.price) : '', currency: item.currency ? String(item.currency) : '', asOf: item.asOf ? String(item.asOf) : '', href: item.href ? String(item.href) : '', qty: 1 });
      bagSave(list);
      var c = bagRender();
      if (!(opts && opts.announce === false)) CCC.announce('Added to your pickup bag.');   /* declared: theme-shop.json shop-added-live */
      return c;
    },
  };
  each('[data-bag-open]', function (b) { b.addEventListener('click', function () { CCC.bag.open(b); }); });
  bagRender();

  /* ---- block navs with the source's "Menu Toggle": the menu starts open; the button hides and shows it */
  each('button.nav-toggle[aria-controls]', function (t) {
    t.addEventListener('click', function () {
      var list = doc.getElementById(this.getAttribute('aria-controls'));
      var isOpen = this.getAttribute('aria-expanded') !== 'false';
      this.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      if (list) { if (isOpen) list.setAttribute('hidden', ''); else list.removeAttribute('hidden'); }
    });
  });

  /* ---- unwired forms: no submission (BUILD-CONTRACT 4.6) */
  each('form[data-sr-unwired]', function (f) { f.addEventListener('submit', function (ev) { ev.preventDefault(); }); });

  /* ---- click-to-load maps (4.17.14): the iframe src is set only on press */
  doc.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('[data-map-load]') : null;
    if (!b) return;
    var box = b.closest('[data-map]');
    if (!box) return;
    var f = doc.createElement('iframe');
    f.src = box.getAttribute('data-map-src');
    f.title = box.getAttribute('data-map-title') || '';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.setAttribute('allowfullscreen', '');
    box.replaceChild(f, b);
  });

  /* ---- rails (R-47): [data-rail] with a [data-rail-track] scroller and optional [data-rail-prev] / [data-rail-next]
     buttons; one card per press, ArrowLeft/ArrowRight on the focused track; never advances on its own.
     data-rail="manual" opts out. */
  each('[data-rail]', function (rail) {
    if (rail.getAttribute('data-rail') === 'manual') return;
    var track = rail.querySelector('[data-rail-track]') || rail;
    var prev = rail.querySelector('[data-rail-prev]'), next = rail.querySelector('[data-rail-next]');
    /* one card: the first descendant narrower than the track (a list wrapper is skipped), plus its row gap */
    function step() {
      var c = track.firstElementChild;
      while (c && c.firstElementChild && c.getBoundingClientRect().width >= track.clientWidth * 0.95) c = c.firstElementChild;
      if (!c) return track.clientWidth * 0.8;
      var w = c.getBoundingClientRect().width;
      if (!w || w >= track.clientWidth * 0.95) return track.clientWidth * 0.8;
      return w + (parseFloat(win.getComputedStyle(c.parentElement).columnGap) || 0);
    }
    function go(dir) { track.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' }); }
    function ends() {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.setAttribute('aria-disabled', track.scrollLeft <= 2 ? 'true' : 'false');
      if (next) next.setAttribute('aria-disabled', track.scrollLeft >= max ? 'true' : 'false');
    }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    track.addEventListener('keydown', function (ev) {
      if (ev.target !== track) return;
      if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); } else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(-1); }
    });
    track.addEventListener('scroll', ends, { passive: true });
    ends();
  });

  /* ---- reveal (7.1-7.5): only under html.js-reveal; IntersectionObserver plus a per-scroll catch-up, so a jump
     scroll never leaves a gap; the CSS reveal-failsafe keyframe shows everything after 5 s regardless */
  var revealSel = '.reveal, [data-reveal], [data-breach]';
  function revealAll() { each(revealSel, function (x) { x.classList.add('is-in'); }); }
  var hasIO = 'IntersectionObserver' in win;
  if (root.classList.contains('js-reveal') && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) if (entries[i].isIntersecting) { entries[i].target.classList.add('is-in'); io.unobserve(entries[i].target); }
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    each(revealSel, function (x) { io.observe(x); });
    var catchUp = function () {
      var vh = win.innerHeight;
      each(revealSel, function (x) { if (!x.classList.contains('is-in') && x.getBoundingClientRect().top < vh) x.classList.add('is-in'); });
    };
    win.addEventListener('scroll', catchUp, { passive: true });
    catchUp();
  } else revealAll();
  win.addEventListener('beforeprint', function () { revealAll(); closeAll(); if (sheet) sheet.close(); if (bagDialog) bagDialog.close(); });

  /* ---- seam light sweep (6.10, graft 18): once per band, when its top edge enters; not under reduced motion */
  if (!reduce && hasIO && root.classList.contains('js-reveal')) {
    var sw = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var en = entries[i];
        if (en.isIntersecting && en.boundingClientRect.top > 0) { en.target.classList.add('is-swept'); sw.unobserve(en.target); }
      }
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    each('.band', function (b) { if (b.querySelector(':scope > .band__sweep')) sw.observe(b); });
  }

  /* ---- video loops (BUILD-CONTRACT 4.17.11): [data-loop] (a <video> or its wrapper), muted playsinline loop
     preload="none" with the poster first; loads within one viewport of view, plays in view, pauses off-screen; never
     under reduced motion or Save-Data (the poster stays) */
  each('[data-loop]', function (box) {
    var v = box.tagName === 'VIDEO' ? box : box.querySelector('video');
    if (!v) return;
    v.muted = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.loop = true;
    v.removeAttribute('autoplay');
    if (reduce || saveData || !hasIO) { v.preload = 'none'; try { v.pause(); } catch (err) { /* ignore */ } return; }
    var loaded = false, inView = false;
    function play() { if (!loaded || !inView || stopped) return; var p = v.play(); if (p && p.then) p.then(function () { v.classList.add('is-playing'); }, function () { /* stays on the poster */ }); }
    var stopped = false;
    try { var rmq = win.matchMedia('(prefers-reduced-motion: reduce)'); if (rmq.addEventListener) rmq.addEventListener('change', function (ev) { if (ev.matches) { stopped = true; try { v.pause(); } catch (err) { /* ignore */ } v.classList.remove('is-playing'); } }); } catch (err) { /* ignore */ }
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !loaded) { loaded = true; v.preload = 'auto'; try { v.load(); } catch (err) { /* ignore */ } play(); }
    }, { rootMargin: '100% 0px 100% 0px' }).observe(v);
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) play(); else try { v.pause(); } catch (err) { /* ignore */ }
    }, { threshold: 0.01 }).observe(v);
  });

  /* ---- parallax (7): rAF on scroll; offset = (element centre - viewport centre) x speed, clamped to +-40px, written
     to the `translate` property; off under reduced motion and for the hero at 700px and below */
  var px = doc.querySelectorAll('[data-parallax]');
  var ticking = false;
  function parallax() {
    ticking = false;
    var vh = win.innerHeight, narrow = win.innerWidth <= 700;
    for (var i = 0; i < px.length; i++) {
      var p = px[i];
      if (narrow && p.closest('.hero')) { p.style.translate = ''; continue; }
      var speed = parseFloat(p.getAttribute('data-parallax')) || 0.1;
      var r = p.getBoundingClientRect();
      var y = ((r.top + r.height / 2) - vh / 2) * -speed;
      if (y > 40) y = 40; else if (y < -40) y = -40;
      p.style.translate = '0 ' + y.toFixed(1) + 'px';
    }
  }
  /* ---- to-top (6.22): shown after one viewport of scroll */
  var toTop = doc.querySelector('[data-totop]');
  function onScroll() {
    var y = win.scrollY || win.pageYOffset;
    if (hdr) hdr.classList.toggle('is-compact', y > 24);
    if (toTop) toTop.classList.toggle('is-shown', y > win.innerHeight);
    if (!reduce && px.length && !ticking) { ticking = true; win.requestAnimationFrame(parallax); }
  }
  win.addEventListener('scroll', onScroll, { passive: true });
  win.addEventListener('resize', onScroll, { passive: true });
  onScroll();
})();
