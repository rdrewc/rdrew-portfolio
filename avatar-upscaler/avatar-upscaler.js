/* ==========================================================================
   Avatar Upscaler
   Loads the cut-out avatar library and composites a selected avatar onto the
   TV screen and the portrait phone shell. Placement is per-surface and
   persisted locally so a session survives a reload.
   ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'avatar-upscaler:v1';
  var LIB = 'assets/avatars/';

  var app = document.getElementById('app');
  var grid = document.getElementById('avatarGrid');
  var selShow = document.getElementById('selShow');
  var search = document.getElementById('avatarSearch');
  var gridCount = document.getElementById('gridCount');
  var resHint = document.getElementById('resHint');

  // The reference screen's native size; the card overlay is authored in these
  // pixels and scaled by --s.
  var REF_W = 2560;

  var state = {
    file: null,
    surface: 'both',
    flip: false, shadow: true, glow: false, pixel: false,
    stats: true, online: true,
    handle: 'Zoeooo049',
    game: 'Kpop Demon Hunters Karaoke',
    prog: 65, ach: 44,
    blur: 24, scrim: 12,
    placement: {
      tvHero:    { scale: 100, x: 0, y: 0 },
      phoneHero: { scale: 100, x: 0, y: 0 }
    }
  };

  var library = [];
  var current = null;
  var activeSlot = 'tvHero';   // which placement the sliders drive

  /* ------------------------------ persistence ----------------------------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        Object.keys(state).forEach(function (k) {
          if (k === 'placement') return;
          if (saved[k] !== undefined) state[k] = saved[k];
        });
        if (saved.placement) {
          Object.keys(state.placement).forEach(function (k) {
            if (saved.placement[k]) state.placement[k] = saved.placement[k];
          });
        }
      }
    } catch (e) { /* private mode, blocked storage — fall back to defaults */ }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* -------------------------------- helpers ------------------------------- */
  function $(id) { return document.getElementById(id); }

  function applyPlacement(slotId) {
    var p = state.placement[slotId];
    var t = 'translate(' + p.x + '%, ' + p.y + '%) scale(' + (p.scale / 100) + ')';
    // tvHero has a blurred twin inside the card's band; it must match exactly.
    [slotId, slotId === 'tvHero' ? 'tvHeroBlur' : null].forEach(function (id) {
      var el = id && $(id);
      if (el) el.style.transform = t;
    });
  }

  function syncSliders() {
    var p = state.placement[activeSlot];
    $('rngScale').value = p.scale;  $('outScale').textContent = p.scale + '%';
    $('rngX').value = p.x;          $('outX').textContent = p.x;
    $('rngY').value = p.y;          $('outY').textContent = p.y;
  }

  function setAvatar(entry) {
    current = entry;
    state.file = entry.file;

    var src = LIB + encodeURIComponent(entry.file);
    ['tvHero', 'tvHeroBlur', 'tvChip', 'phoneHero', 'phoneChip'].forEach(function (id) {
      var img = $(id) && $(id).querySelector('.slot__img');
      if (img) { img.src = src; img.alt = entry.title; }
    });

    $('selectedAvatar').src = src;
    $('selectedTitle').textContent = entry.title;
    $('phoneHandle').textContent = entry.title;
    $('phoneSub').textContent = entry.show;

    var s = entry.source_size, o = entry.output_size;
    resHint.textContent =
      'Source ' + s[0] + '×' + s[1] + ' → ' + o[0] + '×' + o[1] +
      ' (' + entry.upscale + '× Lanczos)';

    grid.querySelectorAll('.avatar-grid__item').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.file === entry.file));
    });

    save();
  }

  /* --------------------------------- grid --------------------------------- */
  function renderGrid() {
    var showVal = selShow.value;
    var q = search.value.trim().toLowerCase();

    var items = library.filter(function (e) {
      if (showVal !== '*' && e.show !== showVal) return false;
      if (q && (e.title + ' ' + e.show).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    grid.textContent = '';
    items.forEach(function (e) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-grid__item';
      b.dataset.file = e.file;
      b.title = e.title + ' — ' + e.show;
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(current && current.file === e.file));

      var img = document.createElement('img');
      img.src = LIB + encodeURIComponent(e.file);
      img.alt = e.title;
      img.loading = 'lazy';
      img.decoding = 'async';
      b.appendChild(img);

      b.addEventListener('click', function () { setAvatar(e); });
      grid.appendChild(b);
    });

    gridCount.textContent = items.length + ' of ' + library.length + ' avatars';
  }

  /* -------------------------------- dragging ------------------------------ */
  function makeDraggable(slotId) {
    var el = $(slotId);
    if (!el) return;
    var start = null;

    el.addEventListener('pointerdown', function (ev) {
      var host = el.parentElement.getBoundingClientRect();
      start = {
        px: ev.clientX, py: ev.clientY,
        x: state.placement[slotId].x, y: state.placement[slotId].y,
        w: el.offsetWidth || host.width, h: el.offsetHeight || host.height
      };
      activeSlot = slotId;
      syncSliders();
      el.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });

    el.addEventListener('pointermove', function (ev) {
      if (!start) return;
      // Translate percentages are relative to the slot's own box.
      var p = state.placement[slotId];
      p.x = Math.round((start.x + ((ev.clientX - start.px) / start.w) * 100) * 2) / 2;
      p.y = Math.round((start.y + ((ev.clientY - start.py) / start.h) * 100) * 2) / 2;
      p.x = Math.max(-200, Math.min(200, p.x));
      p.y = Math.max(-200, Math.min(200, p.y));
      applyPlacement(slotId);
      syncSliders();
    });

    function end(ev) {
      if (!start) return;
      start = null;
      try { el.releasePointerCapture(ev.pointerId); } catch (e) {}
      save();
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /* -------------------------------- controls ------------------------------ */
  function wireControls() {
    // Sliders drive whichever hero was last touched.
    [['rngScale', 'scale', 'outScale', '%'], ['rngX', 'x', 'outX', ''], ['rngY', 'y', 'outY', '']]
      .forEach(function (cfg) {
        $(cfg[0]).addEventListener('input', function () {
          var v = parseFloat(this.value);
          state.placement[activeSlot][cfg[1]] = v;
          $(cfg[2]).textContent = v + cfg[3];
          applyPlacement(activeSlot);
          save();
        });
      });

    $('btnReset').addEventListener('click', function () {
      state.placement[activeSlot] = { scale: 100, x: 0, y: 0 };
      applyPlacement(activeSlot);
      syncSliders();
      save();
    });

    // Surface segmented control
    document.querySelectorAll('.seg__opt').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.seg__opt').forEach(function (o) { o.classList.remove('is-active'); });
        b.classList.add('is-active');
        state.surface = b.dataset.surface;
        app.dataset.surface = state.surface;
        activeSlot = state.surface === 'phone' ? 'phoneHero' : 'tvHero';
        syncSliders();
        save();
      });
    });

    // Render toggles
    [['chkFlip', 'flip'], ['chkShadow', 'shadow'], ['chkGlow', 'glow'], ['chkPixel', 'pixel']]
      .forEach(function (cfg) {
        $(cfg[0]).addEventListener('change', function () {
          state[cfg[1]] = this.checked;
          app.dataset[cfg[1]] = this.checked ? 'on' : 'off';
          save();
        });
      });

    selShow.addEventListener('change', renderGrid);
    search.addEventListener('input', renderGrid);

    // --- profile card ---
    [['chkStats', 'stats'], ['chkOnline', 'online']].forEach(function (cfg) {
      $(cfg[0]).addEventListener('change', function () {
        state[cfg[1]] = this.checked;
        app.dataset[cfg[1]] = this.checked ? 'on' : 'off';
        if (cfg[1] === 'online') $('csStatus').textContent = this.checked ? 'Online' : 'Offline';
        save();
      });
    });

    $('inpHandle').addEventListener('input', function () {
      state.handle = this.value;
      $('csHandle').textContent = this.value;
      save();
    });
    $('inpGame').addEventListener('input', function () {
      state.game = this.value;
      $('csTitle').textContent = this.value;
      save();
    });

    [['rngProg', 'prog', 'outProg', 'csProgFill', 'csProgVal', '%'],
     ['rngAch', 'ach', 'outAch', 'csAchFill', 'csAchVal', '']]
      .forEach(function (c) {
        $(c[0]).addEventListener('input', function () {
          var v = parseInt(this.value, 10);
          state[c[1]] = v;
          $(c[2]).textContent = v + c[5];
          $(c[3]).style.width = v + '%';
          $(c[4]).textContent = v;
          save();
        });
      });

    // --- scrim ---
    $('rngBlur').addEventListener('input', function () {
      state.blur = parseInt(this.value, 10);
      $('outBlur').textContent = state.blur;
      applyScrim();
      save();
    });
    $('rngScrim').addEventListener('input', function () {
      state.scrim = parseInt(this.value, 10);
      $('outScrim').textContent = (state.scrim / 100).toFixed(2);
      applyScrim();
      save();
    });

    // Sidebar dock buttons
    [['sidebarBtnMini', 'mini'], ['sidebarBtnLeft', 'left'], ['sidebarBtnBottom', 'bottom']]
      .forEach(function (cfg) {
        $(cfg[0]).addEventListener('click', function () {
          app.dataset.sidebarPos = cfg[1];
          ['sidebarBtnMini', 'sidebarBtnLeft', 'sidebarBtnBottom'].forEach(function (id) {
            $(id).setAttribute('aria-pressed', String(id === cfg[0]));
          });
        });
      });
  }

  // The card layer lives inside a `scale(--s)` box, so a blur authored in
  // reference pixels already renders at the right size — no conversion needed.
  // Set on #tvScreen so both the scaled .card-layer and the unscaled
  // .card-blur (which sits outside it) read the same values.
  function applyScrim() {
    var screen = $('tvScreen');
    screen.style.setProperty('--card-blur', state.blur + 'px');
    screen.style.setProperty('--scrim', (state.scrim / 100).toFixed(3));
  }

  // Keep --s locked to the rendered screen width so every measured pixel in
  // the card overlay maps 1:1 onto the TV image at any size.
  function trackScale() {
    var screen = $('tvScreen');
    function update() {
      var w = screen.getBoundingClientRect().width;
      if (w) screen.style.setProperty('--s', w / REF_W);
    }
    update();
    if (window.ResizeObserver) new ResizeObserver(update).observe(screen);
    else window.addEventListener('resize', update);
  }

  function applyStateToDom() {
    app.dataset.surface = state.surface;
    app.dataset.stats = state.stats ? 'on' : 'off';
    app.dataset.online = state.online ? 'on' : 'off';

    $('chkStats').checked = state.stats;
    $('chkOnline').checked = state.online;
    $('csStatus').textContent = state.online ? 'Online' : 'Offline';

    $('inpHandle').value = state.handle;
    $('csHandle').textContent = state.handle;
    $('inpGame').value = state.game;
    $('csTitle').textContent = state.game;

    $('rngProg').value = state.prog;
    $('outProg').textContent = state.prog + '%';
    $('csProgFill').style.width = state.prog + '%';
    $('csProgVal').textContent = state.prog;

    $('rngAch').value = state.ach;
    $('outAch').textContent = state.ach;
    $('csAchFill').style.width = state.ach + '%';
    $('csAchVal').textContent = state.ach;

    $('rngBlur').value = state.blur;
    $('outBlur').textContent = state.blur;
    $('rngScrim').value = state.scrim;
    $('outScrim').textContent = (state.scrim / 100).toFixed(2);
    applyScrim();

    app.dataset.flip = state.flip ? 'on' : 'off';
    app.dataset.shadow = state.shadow ? 'on' : 'off';
    app.dataset.glow = state.glow ? 'on' : 'off';
    app.dataset.pixel = state.pixel ? 'on' : 'off';

    $('chkFlip').checked = state.flip;
    $('chkShadow').checked = state.shadow;
    $('chkGlow').checked = state.glow;
    $('chkPixel').checked = state.pixel;

    document.querySelectorAll('.seg__opt').forEach(function (o) {
      o.classList.toggle('is-active', o.dataset.surface === state.surface);
    });

    applyPlacement('tvHero');
    applyPlacement('phoneHero');
    syncSliders();
  }

  /* ---------------------------------- boot -------------------------------- */
  // The TV screenshot is dropped in by hand; show instructions if it's absent.
  var tvBg = $('tvBg');
  tvBg.addEventListener('error', function () {
    tvBg.hidden = true;
    $('tvMissing').hidden = false;
  });

  load();

  fetch(LIB + 'index.json')
    .then(function (r) {
      if (!r.ok) throw new Error('index.json ' + r.status);
      return r.json();
    })
    .then(function (data) {
      library = data.slice().sort(function (a, b) {
        return a.show.localeCompare(b.show) || a.title.localeCompare(b.title);
      });

      var shows = library.map(function (e) { return e.show; })
        .filter(function (v, i, arr) { return arr.indexOf(v) === i; })
        .sort();
      selShow.appendChild(new Option('All shows (' + library.length + ')', '*'));
      shows.forEach(function (s) {
        var n = library.filter(function (e) { return e.show === s; }).length;
        selShow.appendChild(new Option(s + ' (' + n + ')', s));
      });

      wireControls();
      applyStateToDom();
      trackScale();
      makeDraggable('tvHero');
      makeDraggable('phoneHero');

      var start = library.filter(function (e) { return e.file === state.file; })[0] || library[0];
      setAvatar(start);
      renderGrid();
    })
    .catch(function (err) {
      gridCount.textContent = 'Could not load the avatar library: ' + err.message;
      console.error(err);
    });
})();
