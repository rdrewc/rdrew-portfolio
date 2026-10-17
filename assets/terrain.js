// Homepage background: a slowly turning wireframe of a Sierra / Cascade landmark.
// Drag anywhere (outside links and buttons) to turn it; color pulses out along the contour lines
// the further you pull. The footer picker switches between terrains and remembers the choice.
(function(){
  var canvas = document.getElementById('terrain-bg');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- value noise / fbm ----
  function hash(x, y){
    var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function noise2D(x, y){
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function ridged(n){
    return 1 - Math.abs(n * 2 - 1);
  }
  function fbm(x, y){
    var total = 0, amp = 0.55, freq = 1, max = 0;
    for(var i = 0; i < 5; i++){
      total += ridged(noise2D(x * freq, y * freq)) * amp;
      max += amp;
      amp *= 0.52;
      freq *= 2.05;
    }
    return total / max;
  }
  function angDiff(a, b){
    var d = Math.abs(a - b) % (Math.PI * 2);
    return d > Math.PI ? Math.PI * 2 - d : d;
  }
  // A volcanic cone: steep near the top, flaring out at the base, with an optional summit crater.
  function cone(x, z, cx, cz, radius, height, craterR, craterDepth){
    var dx = x - cx, dz = z - cz;
    var d = Math.sqrt(dx * dx + dz * dz);
    var h = height * Math.exp(-Math.pow(d / radius, 1.35));
    if(craterR && d < craterR){
      var t = d / craterR;
      h -= craterDepth * (1 - t * t);
    }
    return h;
  }

  // ---- terrains ----
  // Each returns a height for world (x, z) in -500..500, and can flag points whose occlusion fill
  // should be skipped (only Tahoe's lake basin needs that).
  var TERRAINS = {
    tahoe: (function(){
      var MOUNTAIN_AMP = 210, CRATER_RADIUS = 150, CRATER_DEPTH = 165, RIM_HEIGHT = 40, NOISE_FREQ = 0.0026;
      // Lake Tahoe's outline: elongated N-S, tapered south tip, Emerald Bay notch on the west side.
      var LAKE_AXIS_NS = 1.55, LAKE_AXIS_EW = 0.62, SOUTH_TAPER = 0.32;
      var NOTCH_ANGLE = -1.95, NOTCH_WIDTH = 0.24, NOTCH_DEPTH = 0.24;
      function lakeRadius(theta){
        var a = CRATER_RADIUS * LAKE_AXIS_NS;
        var b = CRATER_RADIUS * LAKE_AXIS_EW;
        var r = (a * b) / Math.sqrt(Math.pow(b * Math.cos(theta), 2) + Math.pow(a * Math.sin(theta), 2));
        r *= 1 - SOUTH_TAPER * Math.exp(-Math.pow(angDiff(theta, Math.PI) / 0.9, 2));
        r *= 1 - NOTCH_DEPTH * Math.exp(-Math.pow(angDiff(theta, NOTCH_ANGLE) / NOTCH_WIDTH, 2));
        return r;
      }
      return {
        label: 'Tahoe',
        coords: '39.0968&deg; N, 120.0324&deg; W',
        lat: 39.1657, lon: -120.1400,
        height: function(x, z){
          var h = fbm(x * NOISE_FREQ, z * NOISE_FREQ) * MOUNTAIN_AMP;
          var d = Math.sqrt(x * x + z * z);
          var r0 = lakeRadius(Math.atan2(x, z));
          if(d < r0 * 1.2){
            var t = Math.min(d / r0, 1);
            var craterShape = Math.pow(1 - t, 1.7);
            var rim = Math.exp(-Math.pow((t - 0.92) / 0.16, 2)) * RIM_HEIGHT;
            h = h * (t * t) - CRATER_DEPTH * craterShape + rim;
          }
          return h;
        },
        skipFill: function(x, z){
          return Math.sqrt(x * x + z * z) < lakeRadius(Math.atan2(x, z)) * 1.2;
        }
      };
    })(),

    // Mount Shasta: a lone stratovolcano rising out of rough lowland, scored by radial gullies,
    // with Shastina on its western flank and smaller cinder cones (Black Butte) around the base.
    shasta: {
      label: 'Shasta',
      coords: '41.4092&deg; N, 122.1949&deg; W',
      lat: 41.4092, lon: -122.1949,
      height: function(x, z){
        var lowland = fbm(x * 0.0045, z * 0.0045) * 95 - 30;
        var dx = x - 30, dz = z;
        var d = Math.sqrt(dx * dx + dz * dz) + 0.001;
        var main = cone(x, z, 30, 0, 150, 235, 16, 18);
        // radial ridges and gullies: noise sampled around the summit so streaks run downhill
        var ux = dx / d, uz = dz / d;
        var streak = ridged(noise2D(ux * 7 + 11, uz * 7 + d * 0.004)) * 0.65 + ridged(noise2D(ux * 17 + 3, uz * 17 + d * 0.009)) * 0.35;
        var slope = Math.exp(-Math.pow((d - 140) / 170, 2));
        main += (streak - 0.5) * 55 * slope;
        var shastina = cone(x, z, -115, -25, 60, 150, 14, 16);
        var blackButte = cone(x, z, 10, -330, 32, 70, 0, 0);
        var southCone = cone(x, z, 110, 320, 34, 50, 11, 10);
        return Math.max(lowland, lowland * 0.35 + main + shastina + blackButte + southCone);
      },
      skipFill: function(){ return false; }
    },

    // Mount Whitney: the Sierra crest as a jagged N-S ridge, a steep eastern escarpment dropping
    // toward the Owens Valley, gentler western slopes with glacial cirques, and Whitney as the high point.
    whitney: {
      label: 'Whitney',
      coords: '36.5785&deg; N, 118.2923&deg; W',
      lat: 36.5785, lon: -118.2923,
      height: function(x, z){
        var crestX = -40 + Math.sin(z * 0.006) * 45 + (noise2D(z * 0.01, 4.2) - 0.5) * 30;
        var off = x - crestX;
        var width = off > 0 ? 115 : 220; // east side (positive x) falls away much faster
        var crest = Math.exp(-Math.pow(off / width, 2));
        var spires = fbm(x * 0.012, z * 0.012);
        var h = crest * (150 + spires * 85);
        h += Math.exp(-(Math.pow((z - 20) / 70, 2) + Math.pow(off / 55, 2))) * 60; // Whitney's summit block
        // cirques scooped out of the west side of the crest
        for(var i = -2; i <= 2; i++){
          var cz = i * 170 + 40, cx = crestX - 120;
          var cd = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(z - cz, 2));
          if(cd < 90) h -= (1 - cd / 90) * (1 - cd / 90) * 45;
        }
        var valley = off > 0 ? -Math.min(off, 360) * 0.18 : 0;
        return h + valley + fbm(x * 0.003, z * 0.003) * 60 - 30;
      },
      skipFill: function(){ return false; }
    }
  };

  // ---- grid ----
  var COLS = 130, ROWS = 110, WORLD = 1000;
  var grid = [];
  var current = null;
  function build(key){
    var t = TERRAINS[key] || TERRAINS.tahoe;
    current = t;
    grid = [];
    for(var j = 0; j < ROWS; j++){
      var row = [];
      for(var i = 0; i < COLS; i++){
        var x0 = (i / (COLS - 1) - 0.5) * WORLD;
        var z0 = (j / (ROWS - 1) - 0.5) * WORLD;
        row.push({ x: x0, z: z0, y: t.height(x0, z0), skip: t.skipFill(x0, z0) });
      }
      grid.push(row);
    }
  }

  // ---- camera ----
  var PITCH = -0.97; // radians, tilt looking down
  var FOCAL = 900;
  var CAM_DIST = 760;
  var cosP = Math.cos(PITCH), sinP = Math.sin(PITCH);

  var W = 0, H = 0, DPR = 1;
  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  var angle = 0.6;
  var ROT_SPEED = 0.008; // radians per second

  // ---- drag to turn ----
  // Dragging adds a persistent offset on top of the ever-advancing auto angle. While a drag is on,
  // the page underneath ignores the pointer (no text selection, no hovers): only the terrain moves.
  var dragAngleOffset = 0;
  var isDragging = false;
  var lastPointerX = 0;
  var mouseX = -9999, mouseY = -9999;
  var DRAG_SENSITIVITY = 0.006;
  var dragTravel = 0;   // how far this drag has pulled, in px; drives how far color runs along the lines
  var energy = 0;       // 0..1, ramps up while dragging and fades after release
  var INTERACTIVE = 'a, button, input, select, textarea, label, video, [data-no-drag]';

  function onPointerDown(e){
    if(e.button !== undefined && e.button !== 0) return;
    if(e.target.closest && e.target.closest(INTERACTIVE)) return;
    e.preventDefault();
    var sel = window.getSelection && window.getSelection();
    if(sel && sel.removeAllRanges) sel.removeAllRanges();
    isDragging = true;
    dragTravel = 0;
    lastPointerX = e.clientX;
    mouseX = e.clientX;
    mouseY = e.clientY;
    document.body.classList.add('bg-dragging');
  }
  function onPointerMove(e){
    if(!isDragging) return;
    mouseX = e.clientX;
    mouseY = e.clientY;
    var dx = e.clientX - lastPointerX;
    dragAngleOffset += dx * DRAG_SENSITIVITY;
    dragTravel += Math.abs(dx);
    lastPointerX = e.clientX;
  }
  function onPointerUp(){
    if(!isDragging) return;
    isDragging = false;
    document.body.classList.remove('bg-dragging');
  }
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('selectstart', function(e){ if(isDragging) e.preventDefault(); });

  function project(pt, cosA, sinA, scale, cx, cy, yOff){
    var x1 = pt.x * cosA - pt.z * sinA;
    var z1 = pt.x * sinA + pt.z * cosA;
    var y2 = pt.y * cosP - z1 * sinP;
    var z2 = pt.y * sinP + z1 * cosP;
    var zc = z2 + CAM_DIST;
    if(zc < 40) zc = 40;
    var persp = (FOCAL / zc) * scale;
    return { sx: cx + x1 * persp, sy: cy + yOff - y2 * persp, z: zc };
  }

  // Drag color: green at the cursor, through cyan, to the site's violet at the far end of the run.
  var PALETTE = [[110, 235, 150], [79, 209, 255], [155, 123, 255]];
  function paletteAt(u){
    var s = Math.min(Math.max(u, 0), 1) * (PALETTE.length - 1);
    var i = Math.min(Math.floor(s), PALETTE.length - 2), f = s - i;
    var a = PALETTE[i], b = PALETTE[i + 1];
    return [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f), Math.round(a[2] + (b[2] - a[2]) * f)];
  }
  var CAPTURE = 230;       // px from the cursor that a contour line has to pass to light up
  var REACH_MIN = 6;       // grid cells lit along a line the moment a drag starts
  var REACH_MAX = 90;      // ...growing to this as you keep pulling

  var lastTime = null;
  function draw(now){
    if(lastTime === null) lastTime = now;
    var dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if(!reduceMotion) angle += ROT_SPEED * dt;
    energy += ((isDragging ? 1 : 0) - energy) * Math.min(1, dt * (isDragging ? 6 : 1.6));

    var cs = getComputedStyle(document.documentElement);
    var lineColor = cs.getPropertyValue('--terrain-line').trim() || 'rgba(255,255,255,0.5)';
    var bgColor = cs.getPropertyValue('--bg').trim() || '#12131c';

    ctx.clearRect(0, 0, W, H);

    var totalAngle = angle + dragAngleOffset;
    var cosA = Math.cos(totalAngle), sinA = Math.sin(totalAngle);
    var scale = Math.max(W, 800) / 1400;
    var cx = W / 2;
    var cy = H * 0.46;
    var yOff = H * 0.06;

    // project all points, compute per-row avg depth
    var projRows = [];
    for(var j = 0; j < ROWS; j++){
      var prow = [];
      var depthSum = 0;
      for(var i = 0; i < COLS; i++){
        var p = project(grid[j][i], cosA, sinA, scale, cx, cy, yOff);
        p.skip = grid[j][i].skip;
        prow.push(p);
        depthSum += p.z;
      }
      projRows.push({ pts: prow, depth: depthSum / COLS });
    }
    projRows.sort(function(a, b){ return b.depth - a.depth; });

    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    var OCCLUDE_MARGIN = 6;
    for(var r = 0; r < projRows.length; r++){
      var pts = projRows[r].pts;

      // Occlusion fill beneath this row before stroking - a bounded ribbon that follows the row's
      // own contour, not a fill to the canvas edge, so a foreground ridge doesn't blank out
      // unrelated terrain below it on screen. Skipped across Tahoe's lake basin, where many rows
      // converge and even a small margin would compound into a solid block over the crater.
      var idx = 0;
      while(idx < pts.length){
        if(pts[idx].skip){ idx++; continue; }
        var end = idx;
        while(end < pts.length && !pts[end].skip) end++;
        if(end - idx >= 2){
          ctx.beginPath();
          ctx.moveTo(pts[idx].sx, pts[idx].sy);
          for(var k = idx + 1; k < end; k++) ctx.lineTo(pts[k].sx, pts[k].sy);
          for(var b = end - 1; b >= idx; b--) ctx.lineTo(pts[b].sx, pts[b].sy + OCCLUDE_MARGIN);
          ctx.closePath();
          ctx.fillStyle = bgColor;
          ctx.fill();
        }
        idx = end;
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      for(var m = 1; m < pts.length; m++) ctx.lineTo(pts[m].sx, pts[m].sy);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Drag color, drawn per row so nearer ridges still cover it. Any contour passing near the
      // cursor lights up there and the color runs outward along that same line, pulsing as it goes.
      if(energy > 0.01){
        var nearest = -1, best = CAPTURE * CAPTURE;
        for(var q = 0; q < pts.length; q++){
          var ex = pts[q].sx - mouseX, ey = pts[q].sy - mouseY;
          var dd = ex * ex + ey * ey;
          if(dd < best){ best = dd; nearest = q; }
        }
        if(nearest >= 0){
          var rowW = 1 - Math.sqrt(best) / CAPTURE;
          var reach = REACH_MIN + Math.min(REACH_MAX - REACH_MIN, dragTravel * 0.12);
          var lo = Math.max(1, Math.floor(nearest - reach)), hi = Math.min(pts.length - 1, Math.ceil(nearest + reach));
          for(var s = lo; s <= hi; s++){
            var steps = Math.abs(s - nearest);
            var along = steps / reach;
            if(along > 1) continue;
            var fall = 1 - along;
            var pulse = 0.5 + 0.5 * Math.sin(now * 0.006 - steps * 0.42);
            var alpha = Math.min(1, energy * (0.25 + 0.75 * rowW) * fall * (0.5 + 0.5 * pulse) * 1.35);
            if(alpha < 0.03) continue;
            var c = paletteAt(along * 1.6); // reach violet by ~60% of the run, while it's still bright
            var rgb = c[0] + ',' + c[1] + ',' + c[2];
            ctx.beginPath();
            ctx.moveTo(pts[s - 1].sx, pts[s - 1].sy);
            ctx.lineTo(pts[s].sx, pts[s].sy);
            // soft glow, then the bright core
            ctx.lineWidth = 6;
            ctx.strokeStyle = 'rgba(' + rgb + ',' + (alpha * 0.22).toFixed(3) + ')';
            ctx.stroke();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
            ctx.stroke();
          }
        }
      }
    }

    requestAnimationFrame(draw);
  }

  // ---- location readout (top bar) ----
  var WEATHER_CODES = {
    0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Fog',
    51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
    56: 'Freezing Drizzle', 57: 'Freezing Drizzle',
    61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
    66: 'Freezing Rain', 67: 'Freezing Rain',
    71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 77: 'Snow Grains',
    80: 'Rain Showers', 81: 'Rain Showers', 82: 'Violent Showers',
    85: 'Snow Showers', 86: 'Snow Showers',
    95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
  };
  var coordsEl = document.querySelector('.geo-coords');
  var weatherLine = document.getElementById('weather-line');
  var elevLine = document.getElementById('elev-line');
  var readoutFor = null;
  function updateReadout(t){
    readoutFor = t;
    if(coordsEl) coordsEl.innerHTML = t.coords;
    if(!weatherLine || !elevLine) return;
    weatherLine.innerHTML = '&hellip;';
    elevLine.innerHTML = '&hellip;';
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + t.lat + '&longitude=' + t.lon + '&current_weather=true&temperature_unit=fahrenheit')
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(readoutFor !== t) return;
        var cw = data.current_weather;
        weatherLine.textContent = Math.round(cw.temperature) + '°F, ' + (WEATHER_CODES[cw.weathercode] || 'Unknown');
      })
      .catch(function(){ if(readoutFor === t) weatherLine.textContent = ''; });
    fetch('https://api.open-meteo.com/v1/elevation?latitude=' + t.lat + '&longitude=' + t.lon)
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(readoutFor !== t) return;
        var meters = data.elevation && data.elevation[0];
        elevLine.textContent = typeof meters === 'number' ? 'ELEV ' + Math.round(meters * 3.28084).toLocaleString() + ' FT' : '';
      })
      .catch(function(){ if(readoutFor === t) elevLine.textContent = ''; });
  }

  // ---- terrain picker (footer) ----
  var buttons = document.querySelectorAll('[data-terrain]');
  function saved(){
    try { return localStorage.getItem('terrain'); } catch(e){ return null; }
  }
  function select(key, persist){
    if(!TERRAINS[key]) key = 'tahoe';
    build(key);
    updateReadout(TERRAINS[key]);
    buttons.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-terrain') === key)); });
    if(persist){ try { localStorage.setItem('terrain', key); } catch(e){} }
  }
  buttons.forEach(function(b){
    b.addEventListener('click', function(){ select(b.getAttribute('data-terrain'), true); });
  });

  select(saved() || 'tahoe', false);
  requestAnimationFrame(draw);
})();
