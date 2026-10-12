/* stub.js - age gate (BUILD-CONTRACT 4.4, 4.15.2), the about-page popup (4.15.9), nav toggles and unwired forms (4.6).
   Lane H1 rework, 2026-10-12. With JS off nothing here runs: the gate and the popup stay closed, the menus stay open,
   and the content is readable. */
(function () {
  'use strict';
  var pageTitle = document.title;
  function show(root, sel, on) { var n = root.querySelector(sel); if (n) { if (on) n.removeAttribute('hidden'); else n.setAttribute('hidden', ''); } }

  /* ---- age gate: consent in localStorage ('ccc-age-21'). "No" keeps the gate up with the plugin's error and lets the
     visitor answer again (rechallenge). While the gate is up, document.title is the plugin's customTitle; the page
     title returns on "Yes". If storage throws, the plugin's cookie warning shows; "Yes" still closes the gate for this
     page view. Escape never dismisses it. */
  var gate = document.getElementById('age-gate');
  var gateOpen = false;
  var afterGate = [];
  function gateDone() { gateOpen = false; var q = afterGate; afterGate = []; for (var i = 0; i < q.length; i++) q[i](); }
  if (gate) {
    var key = gate.getAttribute('data-key') || 'ccc-age-21';
    var gateTitle = gate.getAttribute('data-title');
    var ok = false;
    var storageOk = true;
    try { ok = window.localStorage.getItem(key) === '1'; } catch (err) { storageOk = false; ok = false; }
    var consented = false;
    if (!ok && typeof gate.showModal === 'function') {
      gate.addEventListener('cancel', function (ev) { ev.preventDefault(); });
      /* Chrome lets Escape close a modal dialog when the page has no user activation (the cancel event is then not
         cancelable): a gate closed without "Yes" opens again at once */
      gate.addEventListener('close', function () { if (gateOpen && !consented) { try { gate.showModal(); } catch (err) { /* already open */ } } });
      if (gateTitle) document.title = gateTitle;
      if (!storageOk) show(gate, '.age-cookies', true);
      gateOpen = true;
      gate.showModal();
    }
    gate.addEventListener('click', function (ev) {
      var t = ev.target;
      var b = t && t.closest ? t.closest('[data-age]') : null;
      if (!b) return;
      if (b.getAttribute('data-age') === 'yes') {
        consented = true;
        try { window.localStorage.setItem(key, '1'); } catch (err) { show(gate, '.age-cookies', true); }
        show(gate, '.age-error', false);
        document.title = pageTitle;
        if (gate.open) gate.close();
        gateDone();
      } else {
        show(gate, '.age-error', true);
      }
    });
  }

  /* ---- popup sections as dialogs: the source trigger is page load + 1 s, at most 2 times per session */
  var pops = document.querySelectorAll('dialog[data-popup]');
  for (var p = 0; p < pops.length; p++) (function (d) {
    var close = d.querySelector('[data-close]');
    if (close) close.addEventListener('click', function () { d.close(); });
    if (typeof d.showModal !== 'function') return;
    function open() {
      var times = +(d.getAttribute('data-times') || 0);
      var k = 'ccc-popup-' + (d.id || 'popup');
      var n = 0;
      var counted = true;
      try { n = +(window.sessionStorage.getItem(k) || 0); } catch (err) { counted = false; }
      if (counted && times && n >= times) return;
      try { window.sessionStorage.setItem(k, String(n + 1)); } catch (err) { /* uncounted */ }
      if (!d.open) d.showModal();
    }
    function arm() { window.setTimeout(open, +(d.getAttribute('data-delay') || 0)); }
    if (gateOpen) afterGate.push(arm); else arm();
  })(pops[p]);

  /* ---- nav toggles (the source's "Menu Toggle"): the menu starts open; the button hides and shows it */
  var toggles = document.querySelectorAll('button.nav-toggle[aria-controls]');
  for (var i = 0; i < toggles.length; i++) toggles[i].addEventListener('click', function () {
    var list = document.getElementById(this.getAttribute('aria-controls'));
    var open = this.getAttribute('aria-expanded') !== 'false';
    this.setAttribute('aria-expanded', open ? 'false' : 'true');
    if (list) { if (open) list.setAttribute('hidden', ''); else list.removeAttribute('hidden'); }
  });

  /* ---- unwired forms: no submission */
  var forms = document.querySelectorAll('form[data-sr-unwired]');
  for (var f = 0; f < forms.length; f++) forms[f].addEventListener('submit', function (ev) { ev.preventDefault(); });
})();
