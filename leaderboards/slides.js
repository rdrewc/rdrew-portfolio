/* ==========================================================================
   Friends Leaderboards — slide deck
   Reads slides.json, presents the static exports full-bleed, and exposes a
   small overlay registry so individual slides can grow interactive pieces
   without the deck itself needing to know about them.
   ========================================================================== */
(function () {
  'use strict';

  var MANIFEST = 'slides.json';

  var deck = document.getElementById('deck');
  var frameImg = document.getElementById('frameImg');
  var frameOverlay = document.getElementById('frameOverlay');
  var emptyEl = document.getElementById('empty');
  var deckTitle = document.getElementById('deckTitle');
  var deckSection = document.getElementById('deckSection');
  var slideTitle = document.getElementById('slideTitle');
  var slideIndex = document.getElementById('slideIndex');
  var slideTotal = document.getElementById('slideTotal');
  var progressFill = document.getElementById('progressFill');
  var notes = document.getElementById('notes');
  var notesBody = document.getElementById('notesBody');
  var overview = document.getElementById('overview');
  var overviewGrid = document.getElementById('overviewGrid');
  var helpSheet = document.getElementById('helpSheet');

  var btnPrev = document.getElementById('btnPrev');
  var btnNext = document.getElementById('btnNext');
  var btnOverview = document.getElementById('btnOverview');
  var btnNotes = document.getElementById('btnNotes');
  var btnFull = document.getElementById('btnFull');
  var btnHelp = document.getElementById('btnHelp');
  var btnHelpClose = document.getElementById('btnHelpClose');

  var slides = [];
  var rev = '';
  var current = 0;
  var showNotes = false;
  var teardown = null;

  /* Slides can register an interactive layer keyed by their manifest id. The
     callback receives the overlay element and the slide record, and may return
     a function that runs when the slide is left. */
  var overlays = {};

  window.Deck = {
    registerOverlay: function (id, mount) { overlays[id] = mount; },
    go: function (i) { show(i); },
    next: function () { show(current + 1); },
    prev: function () { show(current - 1); },
    get current() { return slides[current] || null; },
    get slides() { return slides.slice(); }
  };

  /* ============================== Load ============================== */

  fetch(MANIFEST, { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      slides = (data && data.slides) || [];
      /* sync-slides.sh bumps rev, so a re-export never serves a stale image. */
      rev = data && data.rev ? ('?v=' + data.rev) : '';
      if (data && data.title) deckTitle.textContent = data.title;
      if (data && data.section) deckSection.textContent = data.section;
      document.title = (data && data.title ? data.title : 'Deck') + ' — Slides';
      init();
    })
    .catch(function () { init(); });

  function init() {
    slideTotal.textContent = String(slides.length);

    if (!slides.length) {
      emptyEl.hidden = false;
      frameImg.style.display = 'none';
      setNavState();
      return;
    }

    buildOverview();
    show(indexFromHash(), true);
    bindEvents();
  }

  /* ============================ Navigation ============================ */

  function clamp(i) { return Math.max(0, Math.min(slides.length - 1, i)); }

  function indexFromHash() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    if (!raw) return 0;
    var byId = slides.findIndex(function (s) { return s.id === raw; });
    if (byId >= 0) return byId;
    var n = parseInt(raw, 10);
    return isNaN(n) ? 0 : clamp(n - 1);
  }

  function show(i, initial) {
    if (!slides.length) return;
    var next = clamp(i);
    var slide = slides[next];

    /* Clamping at either end, and the hashchange/popstate pair both firing,
       would otherwise re-mount the same slide's overlay. */
    if (!initial && next === current && frameImg.getAttribute('src') === slide.src + rev) return;

    if (typeof teardown === 'function') { teardown(); teardown = null; }
    frameOverlay.innerHTML = '';

    current = next;

    frameImg.setAttribute('data-loading', 'true');
    frameImg.onload = function () { frameImg.removeAttribute('data-loading'); };
    frameImg.src = slide.src + rev;
    frameImg.alt = slide.title || ('Slide ' + (next + 1));

    slideTitle.textContent = slide.title || '';
    slideIndex.textContent = String(next + 1);
    progressFill.style.width = ((next + 1) / slides.length * 100) + '%';
    notesBody.textContent = slide.notes || 'No notes for this slide.';

    var hash = '#' + (slide.id || (next + 1));
    if (location.hash !== hash) {
      if (initial) history.replaceState(null, '', hash);
      else history.pushState(null, '', hash);
    }

    if (slide.id && overlays[slide.id]) {
      var result = overlays[slide.id](frameOverlay, slide);
      if (typeof result === 'function') teardown = result;
    }

    setNavState();
    markOverview();
    preload(next + 1);
    preload(next - 1);
  }

  function setNavState() {
    btnPrev.disabled = current <= 0;
    btnNext.disabled = current >= slides.length - 1;
  }

  var preloaded = {};
  function preload(i) {
    if (i < 0 || i >= slides.length || preloaded[i]) return;
    preloaded[i] = true;
    var img = new Image();
    img.src = slides[i].src + rev;
  }

  /* ============================= Overview ============================= */

  function buildOverview() {
    overviewGrid.innerHTML = '';
    slides.forEach(function (s, i) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'ov-card';
      card.dataset.index = String(i);

      var img = document.createElement('img');
      img.className = 'ov-card__img';
      img.loading = 'lazy';
      img.src = (s.thumb || s.src) + rev;
      img.alt = '';

      var meta = document.createElement('div');
      meta.className = 'ov-card__meta';
      var num = document.createElement('span');
      num.className = 'ov-card__num';
      num.textContent = String(i + 1);
      var title = document.createElement('span');
      title.className = 'ov-card__title';
      title.textContent = s.title || '';
      meta.appendChild(num);
      meta.appendChild(title);

      card.appendChild(img);
      card.appendChild(meta);
      card.addEventListener('click', function () {
        show(i);
        setOverview(false);
      });
      overviewGrid.appendChild(card);
    });
  }

  function markOverview() {
    var cards = overviewGrid.children;
    for (var i = 0; i < cards.length; i++) {
      cards[i].setAttribute('aria-current', i === current ? 'true' : 'false');
    }
  }

  function setOverview(on) {
    overview.hidden = !on;
    btnOverview.setAttribute('aria-pressed', String(on));
    if (on) {
      var active = overviewGrid.children[current];
      if (active) active.scrollIntoView({ block: 'nearest' });
    }
  }

  function setNotes(on) {
    showNotes = on;
    notes.hidden = !on;
    btnNotes.setAttribute('aria-pressed', String(on));
  }

  function setHelp(on) { helpSheet.hidden = !on; }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  function anyPanelOpen() {
    return !overview.hidden || !helpSheet.hidden;
  }

  /* ============================== Events ============================== */

  function bindEvents() {
    btnPrev.addEventListener('click', function () { show(current - 1); });
    btnNext.addEventListener('click', function () { show(current + 1); });

    btnOverview.addEventListener('click', function () { setOverview(overview.hidden); });
    btnNotes.addEventListener('click', function () { setNotes(!showNotes); });
    btnFull.addEventListener('click', toggleFullscreen);
    btnHelp.addEventListener('click', function () { setHelp(helpSheet.hidden); });
    btnHelpClose.addEventListener('click', function () { setHelp(false); });

    document.addEventListener('fullscreenchange', function () {
      btnFull.setAttribute('aria-pressed', String(!!document.fullscreenElement));
    });

    window.addEventListener('popstate', function () { show(indexFromHash(), true); });
    window.addEventListener('hashchange', function () { show(indexFromHash(), true); });

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault(); show(current + 1); break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault(); show(current - 1); break;
        case 'Home':
          e.preventDefault(); show(0); break;
        case 'End':
          e.preventDefault(); show(slides.length - 1); break;
        case 'g': case 'G':
          setOverview(overview.hidden); break;
        case 's': case 'S':
          setNotes(!showNotes); break;
        case 'f': case 'F':
          toggleFullscreen(); break;
        case 'c': case 'C':
          deck.dataset.chrome = deck.dataset.chrome === 'off' ? 'on' : 'off'; break;
        case '?':
          setHelp(helpSheet.hidden); break;
        case 'Escape':
          if (anyPanelOpen()) { setOverview(false); setHelp(false); }
          else if (document.fullscreenElement) document.exitFullscreen();
          break;
        default:
          if (/^[1-9]$/.test(e.key)) show(parseInt(e.key, 10) - 1);
      }
    });

    /* Horizontal swipe on touch, ignoring mostly-vertical drags. */
    var tx = 0, ty = 0;
    deck.addEventListener('touchstart', function (e) {
      tx = e.changedTouches[0].clientX;
      ty = e.changedTouches[0].clientY;
    }, { passive: true });
    deck.addEventListener('touchend', function (e) {
      if (!overview.hidden) return;
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
      show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
})();
