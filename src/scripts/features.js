/* features.js - interior and content features. Owner: T2a. 2026-10-12. Concatenated after site.js into the one bundle
   (src/theme/index.mjs scripts), so window.CCC from site.js is available here. Rails ([data-rail]) are wired by
   site.js (lane T1a), not here, so one press never scrolls twice.
   1. FAQ accordion (DESIGN-SPEC 6.18): .faq__btn toggles its item (.is-open) and aria-expanded.
   2. Review "Read more" (6.15): on phones a review longer than 6 lines clamps behind a "Read more" button (declared,
      theme-interior.json interior-review-read-more) that expands it in place.
   3. The purchase-limit calculator (BUILD-CONTRACT 4.18.5): "Open Calculator" opens a modal <dialog>; its "X" (named
      "Close") closes it and focus returns to the opener; TOTAL and Clear run the source page's own calculation
      (audit/raw/daily-purchase-limit-in-ma.html: validatePurchase, clearForm, updateMoonrockValues), with its
      constants and its three result messages verbatim. */
(function () {
  'use strict';
  var doc = document, win = window;
  function each(sel, fn, ctx) { var list = (ctx || doc).querySelectorAll(sel); for (var i = 0; i < list.length; i++) fn(list[i], i); }

  /* ---- 1. FAQ accordion */
  doc.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('.faq__btn') : null;
    if (!b) return;
    var item = b.closest('.faq__item');
    if (!item) return;
    var open = !item.classList.contains('is-open');
    item.classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ---- 2. review "Read more" (phones only; expands in place, then the button goes and focus moves to the text) */
  var phone = false;
  try { phone = win.matchMedia('(max-width: 700px)').matches; } catch (err) { phone = false; }
  if (phone) {
    each('.review__body[data-clamp]', function (body, i) {
      body.classList.add('is-clamped');
      if (body.scrollHeight <= body.clientHeight + 2) { body.classList.remove('is-clamped'); return; }
      if (!body.id) body.id = 'review-body-' + (i + 1);
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'review__more';
      btn.textContent = 'Read more';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', body.id);
      btn.addEventListener('click', function () {
        body.classList.remove('is-clamped');
        body.setAttribute('tabindex', '-1');
        btn.parentNode.removeChild(btn);
        try { body.focus(); } catch (err) { /* ignore */ }
      });
      body.parentNode.insertBefore(btn, body.nextSibling);
    });
  }

  /* ---- 3. the purchase-limit calculator */
  each('[data-calc-open]', function (opener) {
    var dlg = doc.getElementById(opener.getAttribute('aria-controls') || '');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    var num = function (name) { var el = dlg.querySelector('[name="' + name + '"]'); return el ? parseFloat(el.value) || 0 : 0; };
    var out = function (k, text) { var el = dlg.querySelector('[data-calc-out="' + k + '"]'); if (el) el.textContent = text; };
    opener.addEventListener('click', function () { if (!dlg.open) dlg.showModal(); });
    each('[data-calc-close]', function (x) { x.addEventListener('click', function () { dlg.close(); }); }, dlg);
    dlg.addEventListener('close', function () { try { opener.focus(); } catch (err) { /* ignore */ } });
    /* a click on the backdrop (outside the panel) closes it, as Escape does */
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
    function total() {
      /* the source's validatePurchase(), constants and messages verbatim */
      var dailyLimit = 56.70, concentrateMultiplier = 5.6, vapeMultiplier = 5.6, tincturePer100mg = 0.55999, ediblePer5mg = 0.27999;
      var sel = dlg.querySelector('[name="moonrocksSelect"]');
      var vals = sel ? String(sel.value || '0,0').split(',') : ['0', '0'];
      var moonrockConcentrate = parseFloat(vals[0]) || 0, moonrockFlower = parseFloat(vals[1]) || 0;
      var flower = num('flower'), concentrate = num('concentrate'), vape = num('vape'), tincture = num('tincture'), edibles = num('edibles'), moonrocksQty = num('moonrocksQty');
      var moonrockConcentrateTotal = moonrocksQty * moonrockConcentrate;
      var moonrockFlowerTotal = moonrocksQty * moonrockFlower;
      var tinctureEquivalent = (tincture / 100) * tincturePer100mg;
      var ediblesEquivalent = (edibles / 5) * ediblePer5mg;
      var concentrateEquivalent = (concentrate + moonrockConcentrateTotal) * concentrateMultiplier;
      var vapeEquivalent = vape * vapeMultiplier;
      var t = flower + moonrockFlowerTotal + concentrateEquivalent + vapeEquivalent + tinctureEquivalent + ediblesEquivalent;
      out('error', ''); out('total', ''); out('remaining', '');
      if (t > dailyLimit) out('error', 'Sorry, your total purchase exceeds the daily limit by ' + (t - dailyLimit).toFixed(2) + 'g.');
      else { out('total', 'Total Purchase: ' + t.toFixed(2) + 'g is within the legal limit.'); out('remaining', 'You have ' + (dailyLimit - t).toFixed(2) + 'g remaining.'); }
    }
    function clear() {
      each('input', function (i) { i.value = ''; }, dlg);
      each('select', function (s) { s.selectedIndex = 0; }, dlg);
      out('error', ''); out('total', ''); out('remaining', '');
    }
    each('[data-calc]', function (b) {
      var k = b.getAttribute('data-calc');
      if (k === 'total') b.addEventListener('click', total);
      else if (k === 'clear') b.addEventListener('click', clear);
    }, dlg);
  });
})();
