/* shop.js - shop behaviour. Owner: T2b. Markup: src/theme/shop.mjs; data-attribute contract: src/theme/README.md.
   1. "Reserve for pickup" ([data-bag-add], t1 only under Plan B): calls window.CCC.bag.add(item) (the bag API is T1a's,
      site.js); announces "Added to your pickup bag." in the polite live region [data-bag-live]; shows "View bag"
      ([data-bag-view] -> CCC.bag.open). Until site.js provides CCC.bag.add, a minimal local fallback is installed here
      (localStorage 'ccc-bag'; header count; drawer list). Nothing is ever sent (BUILD-CONTRACT 4.5).
   2. The sticky Reserve bar on phones ([data-pdp-sticky]): shown at 700px and below once the pane's button has
      scrolled above the viewport (DESIGN-SPEC 6.14).
   3. Brand-page filters ([data-fbar], DESIGN-SPEC 6.13): facet lists built from the cards' data attributes (catalog
      text, never retyped), disclosures, active chips "Remove <value>", "Clear all", the empty state; on phones
      "Filters" opens the controls as a bottom-sheet dialog (focus trap, Escape, focus returned; R-37).
   Every storage access is wrapped in try/catch; with storage blocked the page still works for the page view. */
(function () {
  'use strict';
  var doc = document, win = window, root = doc.documentElement;
  var FOCUSABLE = 'a[href], button:not([disabled]):not([hidden]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var ADDED = 'Added to your pickup bag.';
  var FROM = { title: 'from the product name', slug: "from the product's web address" };
  function each(list, fn) { for (var i = 0; i < list.length; i++) fn(list[i], i); }
  function mq(q) { try { return win.matchMedia(q).matches; } catch (err) { return false; } }
  function visibleEls(box) { var out = []; each(box.querySelectorAll(FOCUSABLE), function (el) { if (el.offsetParent !== null || el === doc.activeElement) out.push(el); }); return out; }

  /* ---------------------------------------------------------------- 1. the bag */
  win.CCC = win.CCC || {};
  var CCC = win.CCC;
  CCC.bag = CCC.bag || {};
  if (typeof CCC.bag.add !== 'function') {
    /* fallback until site.js (T1a) provides the API: same item shape, same storage key */
    var KEY = 'ccc-bag';
    var read = function () { try { var v = JSON.parse(win.localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (err) { return memo; } };
    var memo = [];
    var write = function (items) { memo = items; try { win.localStorage.setItem(KEY, JSON.stringify(items)); } catch (err) { /* session only */ } };
    var total = function (items) { var n = 0; each(items, function (x) { n += +x.qty || 0; }); return n; };
    var money = function (x) { return (x.currency === 'USD' || !x.currency ? '$' : '') + x.price; };
    var text = function (tag, cls, t) { var el = doc.createElement(tag); if (cls) el.className = cls; el.textContent = t; return el; };
    var render = function () {
      var items = read();
      var n = total(items);
      each(doc.querySelectorAll('[data-bag-count]'), function (c) { c.textContent = String(n); });
      each(doc.querySelectorAll('[data-bag-count-sr]'), function (c) { c.textContent = ', ' + n + (n === 1 ? ' item' : ' items'); });
      var box = doc.querySelector('[data-bag-items]');
      if (!box) return n;
      var empty = box.querySelector('.bag__empty');
      each(box.querySelectorAll('.bag__line'), function (li) { li.parentNode.removeChild(li); });
      if (empty) { if (items.length) empty.setAttribute('hidden', ''); else empty.removeAttribute('hidden'); }
      each(items, function (x) {
        var line = doc.createElement('div');
        line.className = 'bag__line';
        line.appendChild(text('p', 'bag__name', x.name));
        if (x.variant) line.appendChild(text('p', 'bag__variant', x.variant));
        var price = text('p', 'bag__price', money(x));
        line.appendChild(price);
        if (x.asOf) line.appendChild(text('p', 'bag__asof fine', 'as of ' + x.asOf));
        var q = doc.createElement('p');
        q.className = 'bag__qty';
        var minus = text('button', 'tool bag__step', '−'); minus.type = 'button'; minus.setAttribute('aria-label', 'Decrease quantity of ' + x.name);
        var plus = text('button', 'tool bag__step', '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'Increase quantity of ' + x.name);
        var count = text('span', 'bag__n', String(x.qty));
        minus.addEventListener('click', function () { step(x.id, -1); });
        plus.addEventListener('click', function () { step(x.id, 1); });
        q.appendChild(minus); q.appendChild(count); q.appendChild(plus);
        line.appendChild(q);
        box.appendChild(line);
      });
      return n;
    };
    var step = function (id, d) {
      var items = read();
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { items[i].qty = Math.max(0, (+items[i].qty || 0) + d); if (!items[i].qty) items.splice(i, 1); break; }
      write(items);
      render();
    };
    CCC.bag.add = function (item) {
      var items = read();
      var hit = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === item.id && items[i].variant === item.variant) hit = items[i];
      if (hit) hit.qty = (+hit.qty || 0) + 1;
      else items.push({ id: item.id, name: item.name, variant: item.variant, price: item.price, currency: item.currency, asOf: item.asOf, href: item.href, qty: 1 });
      write(items);
      return render();
    };
    CCC.bag.fallback = true;
    render();
  }
  function itemOf(btn) {
    return { id: btn.getAttribute('data-id'), name: btn.getAttribute('data-name'), variant: btn.getAttribute('data-variant'), price: btn.getAttribute('data-price'), currency: btn.getAttribute('data-currency'), asOf: btn.getAttribute('data-asof'), href: btn.getAttribute('data-href') };
  }
  var live = doc.querySelector('[data-bag-live]');
  var viewBtn = doc.querySelector('[data-bag-view]');
  each(doc.querySelectorAll('[data-bag-add]'), function (btn) {
    btn.addEventListener('click', function () {
      /* site.js's add() announces in the chrome's [data-live] unless told not to; the product page announces once, here */
      try { CCC.bag.add(itemOf(btn), { announce: false }); } catch (err) { return; }
      if (live) { live.textContent = ''; win.setTimeout(function () { live.textContent = ADDED; }, 60); }
      btn.classList.add('is-done');
      win.setTimeout(function () { btn.classList.remove('is-done'); }, 1600);
      if (viewBtn) viewBtn.removeAttribute('hidden');
    });
  });
  if (viewBtn) viewBtn.addEventListener('click', function () { if (CCC.bag && typeof CCC.bag.open === 'function') CCC.bag.open(viewBtn); });

  /* ---------------------------------------------------------------- 2. the sticky Reserve bar (phones) */
  var bar = doc.querySelector('[data-pdp-sticky]');
  var main = doc.getElementById('pdp-reserve');
  if (bar && main) {
    var update = function () {
      var past = main.getBoundingClientRect().bottom < 0;
      if (past && mq('(max-width: 700px)')) bar.removeAttribute('hidden'); else bar.setAttribute('hidden', '');
    };
    if ('IntersectionObserver' in win) new IntersectionObserver(update).observe(main);
    win.addEventListener('scroll', update, { passive: true });
    win.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------------------------------------------------------------- 3. filters (brand pages) */
  each(doc.querySelectorAll('[data-fbar]'), function (fbar) {
    var grid = doc.getElementById(fbar.getAttribute('data-grid'));
    if (!grid) return;
    var cards = grid.querySelectorAll('.bcard');
    var empty = grid.parentNode.querySelector('[data-pgrid-empty]');
    var activeBox = fbar.querySelector('[data-fbar-active]');
    var sheet = fbar.querySelector('[data-fbar-sheet]');
    var openBtn = fbar.querySelector('[data-fbar-open]');
    var veil = fbar.querySelector('[data-fbar-close]');
    var sel = {};   /* key -> { value|src: true } */
    /* the facet lists: every distinct (label, source) pair of the cards, in natural order */
    each(fbar.querySelectorAll('[data-facet-list]'), function (ul) {
      var key = ul.getAttribute('data-facet-list');
      var seen = {}, vals = [];
      each(cards, function (c) {
        var v = c.getAttribute('data-' + key);
        if (!v) return;
        var src = c.getAttribute('data-' + key + '-src') || '';
        var id = v + '|' + src;
        if (!seen[id]) { seen[id] = 1; vals.push({ v: v, src: src, id: id }); }
      });
      vals.sort(function (a, b) { return a.v.localeCompare(b.v, 'en', { numeric: true, sensitivity: 'base' }) || a.src.localeCompare(b.src); });
      each(vals, function (x, i) {
        var li = doc.createElement('li');
        var lab = doc.createElement('label');
        var input = doc.createElement('input');
        input.type = 'checkbox';
        input.value = x.id;
        input.setAttribute('data-key', key);
        var name = doc.createElement('span'); name.textContent = x.v;
        lab.appendChild(input); lab.appendChild(doc.createTextNode(' ')); lab.appendChild(name);
        if (FROM[x.src]) { var note = doc.createElement('span'); note.className = 'chip-note'; note.textContent = '(' + FROM[x.src] + ')'; lab.appendChild(doc.createTextNode(' ')); lab.appendChild(note); }
        li.appendChild(lab);
        ul.appendChild(li);
        input.addEventListener('change', function () { sel[key] = sel[key] || {}; if (input.checked) sel[key][x.id] = x; else delete sel[key][x.id]; apply(); });
      });
    });
    function apply() {
      var shown = 0;
      each(cards, function (c) {
        var ok = true;
        for (var key in sel) {
          var want = sel[key], any = false, has = false;
          for (var id in want) { any = true; if (c.getAttribute('data-' + key) + '|' + (c.getAttribute('data-' + key + '-src') || '') === id) has = true; }
          if (any && !has) ok = false;
        }
        if (ok) { c.removeAttribute('hidden'); shown++; } else c.setAttribute('hidden', '');
      });
      if (empty) { if (shown) empty.setAttribute('hidden', ''); else empty.removeAttribute('hidden'); }
      /* active facets as removable chips, each named "Remove <value>" */
      if (activeBox) {
        activeBox.textContent = '';
        for (var key in sel) for (var id in sel[key]) (function (k, x) {
          var li = doc.createElement('li');
          var b = doc.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', 'Remove ' + x.v);
          b.textContent = x.v;
          b.insertAdjacentHTML('beforeend', '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>');
          b.addEventListener('click', function () {
            var input = fbar.querySelector('input[data-key="' + k + '"][value="' + (win.CSS && CSS.escape ? CSS.escape(x.id) : x.id) + '"]');
            if (input) input.checked = false;
            delete sel[k][x.id];
            apply();
            var next = activeBox.querySelector('button') || (openBtn && openBtn.offsetParent !== null ? openBtn : fbar.querySelector('.facet__btn'));
            if (next) next.focus();
          });
          li.appendChild(b);
          activeBox.appendChild(li);
        })(key, sel[key][id]);
      }
    }
    /* facet disclosures */
    function closeFacets(except) {
      each(fbar.querySelectorAll('.facet__btn'), function (b) {
        if (b === except) return;
        b.setAttribute('aria-expanded', 'false');
        var p = doc.getElementById(b.getAttribute('aria-controls'));
        if (p && !fbar.classList.contains('is-open')) p.setAttribute('hidden', '');
      });
    }
    each(fbar.querySelectorAll('.facet__btn'), function (b) {
      var panel = doc.getElementById(b.getAttribute('aria-controls'));
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-expanded') !== 'true';
        closeFacets(b);
        b.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (panel) { if (on) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', ''); }
      });
      var facet = b.parentNode;
      facet.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && b.getAttribute('aria-expanded') === 'true' && !fbar.classList.contains('is-open')) { ev.stopPropagation(); b.setAttribute('aria-expanded', 'false'); if (panel) panel.setAttribute('hidden', ''); b.focus(); }
      });
      facet.addEventListener('focusout', function (ev) { if (!fbar.classList.contains('is-open') && !facet.contains(ev.relatedTarget)) { b.setAttribute('aria-expanded', 'false'); if (panel) panel.setAttribute('hidden', ''); } });
    });
    doc.addEventListener('click', function (ev) { if (!fbar.contains(ev.target)) closeFacets(null); });
    var clear = fbar.querySelector('[data-fbar-clear]');
    if (clear) clear.addEventListener('click', function () { each(fbar.querySelectorAll('.facet__list input'), function (i) { i.checked = false; }); sel = {}; apply(); });
    /* the sort (rendered only when a sort applies to the data; never under Plan B) */
    var sortSel = fbar.querySelector('[data-sort]');
    if (sortSel) sortSel.addEventListener('change', function () {
      var parts = sortSel.value.split(':'), key = parts[0], dir = +parts[1] || 1;
      var list = [].slice.call(cards);
      list.sort(function (a, b) { var x = a.getAttribute('data-' + key) || '', y = b.getAttribute('data-' + key) || ''; var nx = parseFloat(x), ny = parseFloat(y); var c = !isNaN(nx) && !isNaN(ny) ? nx - ny : x.localeCompare(y, 'en', { numeric: true }); return (c || (+a.getAttribute('data-i') - +b.getAttribute('data-i'))) * (c ? dir : 1); });
      each(list, function (c) { grid.appendChild(c); });
    });
    /* phones: "Filters" opens the same controls as a bottom-sheet dialog (R-37) */
    var opener = null;
    function sheetOpen() {
      opener = doc.activeElement;
      fbar.classList.add('is-open');
      if (veil) veil.removeAttribute('hidden');
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
      each(fbar.querySelectorAll('.facet__btn'), function (b) { b.setAttribute('aria-expanded', 'true'); var p = doc.getElementById(b.getAttribute('aria-controls')); if (p) p.removeAttribute('hidden'); });
      root.classList.add('dialog-open');
      var f = visibleEls(sheet);
      if (f.length) f[0].focus();
    }
    function sheetClose() {
      if (!fbar.classList.contains('is-open')) return;
      fbar.classList.remove('is-open');
      if (veil) veil.setAttribute('hidden', '');
      sheet.removeAttribute('role');
      sheet.removeAttribute('aria-modal');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
      closeFacets(null);
      root.classList.remove('dialog-open');
      if (opener && opener.focus) opener.focus();
    }
    if (openBtn && sheet) {
      openBtn.addEventListener('click', sheetOpen);
      if (veil) veil.addEventListener('click', sheetClose);
      var applyBtn = fbar.querySelector('[data-fbar-apply]');
      if (applyBtn) applyBtn.addEventListener('click', sheetClose);
      sheet.addEventListener('keydown', function (ev) {
        if (!fbar.classList.contains('is-open')) return;
        if (ev.key === 'Escape') { ev.preventDefault(); sheetClose(); return; }
        if (ev.key !== 'Tab') return;
        var f = visibleEls(sheet);
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && doc.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && doc.activeElement === last) { ev.preventDefault(); first.focus(); }
      });
      win.addEventListener('resize', function () { if (!mq('(max-width: 700px)')) sheetClose(); }, { passive: true });
    }
    /* the frost shows only while the bar is stuck over the cards (at rest it sits over a flat ground, 4.6) */
    var ticking = false;
    function stuck() {
      ticking = false;
      var top = parseFloat(win.getComputedStyle(fbar).top) || 0;
      var r = fbar.getBoundingClientRect();
      fbar.classList.toggle('is-stuck', win.getComputedStyle(fbar).position === 'sticky' && r.top <= top + 0.5 && (win.scrollY || win.pageYOffset) > 0);
    }
    win.addEventListener('scroll', function () { if (!ticking) { ticking = true; win.requestAnimationFrame(stuck); } }, { passive: true });
  });
})();
