// Homepage background: a top-down topo map of the West Coast with the HRRR forecast radar on top.
// Contour lines are drawn in the browser from AWS terrain tiles (maplibre-contour); the coast, lakes
// and borders come from assets/storm/west-outlines.geojson (Natural Earth, clipped to the West Coast).
// The footer picker flies to Tahoe / Shasta / Whitney or back out to the whole coast. The snowflake
// opens Tracker mode: the page slides away, the map can be dragged and zoomed, the radar scrubbed
// through the next 18 hours, and a card per zone shows its forecast snow and precip totals.
(function(){
  var el = document.getElementById('storm-map');
  if(!el || !window.maplibregl || !window.mlcontour) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DEM_TILES = 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png';
  // HRRR simulated radar from the Iowa Environmental Mesonet. Each layer is one forecast minute of the
  // latest run; the JSON beside it says which run that is and when the frame is valid.
  var RADAR_TILES = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F{m}-0/{z}/{x}/{y}.png';
  var RADAR_META = 'https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_{m}.json';
  var FRAME_STEP = 60;    // minutes between frames
  var FRAME_LAST = 1080;  // HRRR runs out 18 hours
  var RADAR_OPACITY = { page: 0.45, tracker: 0.85 };

  var WEST_BOUNDS = [[-125.6, 31.8], [-114.2, 49.1]];
  // lat / lon is the spot the top bar reports on. `forecast` is a mid-mountain point for the
  // totals cards, so snow totals mean something (lake level at Tahoe mostly sees rain).
  var VIEWS = {
    west: { label: 'West Coast' },
    tahoe: {
      label: 'Tahoe', center: [-120.04, 39.09], zoom: 9.7,
      coords: '39.0968&deg; N, 120.0324&deg; W', lat: 39.1657, lon: -120.1400,
      forecast: { lat: 39.17, lon: -120.24, ft: 8000 }    // west-shore crest, Ward Peak
    },
    shasta: {
      label: 'Shasta', center: [-122.195, 41.409], zoom: 10.3,
      coords: '41.4092&deg; N, 122.1949&deg; W', lat: 41.4092, lon: -122.1949,
      forecast: { lat: 41.354, lon: -122.233, ft: 7000 }  // Bunny Flat
    },
    whitney: {
      label: 'Whitney', center: [-118.29, 36.58], zoom: 10.3,
      coords: '36.5785&deg; N, 118.2923&deg; W', lat: 36.5785, lon: -118.2923,
      forecast: { lat: 36.578, lon: -118.27, ft: 10000 }  // Outpost Camp
    }
  };
  var ZONES = ['tahoe', 'shasta', 'whitney'];

  // ---- map ----
  var demSource = new mlcontour.DemSource({ url: DEM_TILES, encoding: 'terrarium', maxzoom: 12, worker: true });
  demSource.setupMaplibre(maplibregl);

  function cssVar(name, fallback){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  var map = new maplibregl.Map({
    container: el,
    bounds: WEST_BOUNDS,
    fitBoundsOptions: { padding: 40 },
    attributionControl: false,
    // Straight down only. (3D terrain was tried: stray spikes in the elevation tiles stand up as needles.)
    maxPitch: 0,
    dragRotate: false,
    touchPitch: false,
    style: {
      version: 8,
      sources: {
        contours: {
          type: 'vector',
          maxzoom: 15,
          tiles: [demSource.contourProtocolUrl({
            multiplier: 3.28084, // feet
            // zoom: [minor, major] contour interval in feet
            thresholds: { 3: [1500, 6000], 5: [1000, 5000], 6: [1000, 5000], 8: [500, 2500], 10: [200, 1000], 12: [100, 500], 14: [40, 200] },
            elevationKey: 'ele',
            levelKey: 'level',
            contourLayer: 'contours'
          })]
        },
        outlines: { type: 'geojson', data: 'assets/storm/west-outlines.geojson' }
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': cssVar('--bg', '#12131c') } },
        {
          id: 'contour-minor', type: 'line', source: 'contours', 'source-layer': 'contours',
          filter: ['all', ['>', ['get', 'ele'], 0], ['==', ['get', 'level'], 0]],
          paint: { 'line-width': 0.6, 'line-opacity': 0.45 }
        },
        {
          id: 'contour-major', type: 'line', source: 'contours', 'source-layer': 'contours',
          filter: ['all', ['>', ['get', 'ele'], 0], ['>', ['get', 'level'], 0]],
          paint: { 'line-width': 1.1, 'line-opacity': 0.9 }
        },
        {
          id: 'outline-coast', type: 'line', source: 'outlines',
          filter: ['in', ['get', 'kind'], ['literal', ['coast', 'lake']]],
          paint: { 'line-width': 1.4 }
        },
        {
          id: 'outline-borders', type: 'line', source: 'outlines',
          filter: ['in', ['get', 'kind'], ['literal', ['state', 'country']]],
          paint: { 'line-width': 0.8, 'line-opacity': 0.55, 'line-dasharray': [3, 3] }
        }
      ]
    }
  });

  function applyColors(){
    var line = cssVar('--terrain-line', 'rgba(255,255,255,0.35)');
    var strong = cssVar('--muted', '#7d8399');
    map.setPaintProperty('bg', 'background-color', cssVar('--bg', '#12131c'));
    map.setPaintProperty('contour-minor', 'line-color', line);
    map.setPaintProperty('contour-major', 'line-color', line);
    map.setPaintProperty('outline-coast', 'line-color', strong);
    map.setPaintProperty('outline-borders', 'line-color', strong);
  }
  map.on('load', function(){
    map.resize(); // a page opened in a background tab can start the map at the wrong size
    applyColors();
  });
  new MutationObserver(function(){ if(map.isStyleLoaded()) applyColors(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---- tracker mode ----
  // Outside tracker mode the map is a still background: the page scrolls over it and nothing on it
  // responds to the pointer. Tracker mode hides the page and hands the pointer to the map.
  var HANDLERS = ['dragPan', 'scrollZoom', 'boxZoom', 'keyboard', 'doubleClickZoom', 'touchZoomRotate'];
  var trackerBtn = document.querySelector('[data-tracker]');
  var tracking = false;
  function setTracking(on){
    tracking = on;
    document.body.classList.toggle('is-tracking', on);
    if(trackerBtn) trackerBtn.setAttribute('aria-pressed', String(on));
    HANDLERS.forEach(function(h){ if(map[h]) map[h][on ? 'enable' : 'disable'](); });
    if(map.isStyleLoaded()) showFrame(frame);
    if(on) loadStats();
    else stop();
  }
  setTracking(false);
  if(trackerBtn) trackerBtn.addEventListener('click', function(){ setTracking(!tracking); });
  var homeBtn = document.querySelector('[data-tracker-home]');
  if(homeBtn) homeBtn.addEventListener('click', function(){ setTracking(false); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && tracking) setTracking(false); });

  // ---- forecast radar ----
  var frames = [];   // forecast minutes, 0..FRAME_LAST
  for(var m = 0; m <= FRAME_LAST; m += FRAME_STEP) frames.push(m);
  var run = null;    // Date of the model run, once known
  var frame = 0;     // index into frames
  var slider = document.getElementById('radar-slider');
  var playBtn = document.getElementById('radar-play');
  var timeLabel = document.getElementById('radar-time');

  function pad(m){ return ('000' + m).slice(-4); }
  function layerId(i){ return 'radar-' + frames[i]; }
  function ensureLayer(i){
    if(i < 0 || i >= frames.length || map.getLayer(layerId(i))) return;
    var key = run ? run.toISOString().slice(0, 13) : 'latest'; // new run, new URLs: no stale tiles
    map.addSource(layerId(i), {
      type: 'raster', tileSize: 256, maxzoom: 9,
      tiles: [RADAR_TILES.replace('{m}', pad(frames[i])) + '?run=' + key]
    });
    map.addLayer({
      id: layerId(i), type: 'raster', source: layerId(i),
      paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 }
    });
  }
  function showFrame(i){
    frame = Math.max(0, Math.min(frames.length - 1, i));
    ensureLayer(frame);
    ensureLayer(frame + 1); // load the next frame early so playback doesn't flash
    var opacity = tracking ? RADAR_OPACITY.tracker : RADAR_OPACITY.page;
    frames.forEach(function(_, k){
      if(map.getLayer(layerId(k))) map.setPaintProperty(layerId(k), 'raster-opacity', k === frame ? opacity : 0);
    });
    if(slider) slider.value = String(frame);
    updateTimeLabel();
    if(currentView === 'west') updateReadout(VIEWS.west);
  }

  function validAt(i){
    return run ? new Date(run.getTime() + frames[i] * 60000) : null;
  }
  function formatTime(d){
    return d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', timeZone: 'America/Los_Angeles', timeZoneName: 'short' });
  }
  function updateTimeLabel(){
    if(!timeLabel) return;
    var d = validAt(frame);
    if(!d){ timeLabel.textContent = 'Loading radar…'; return; }
    timeLabel.innerHTML = formatTime(d) + '<span class="radar-run"> · HRRR ' + run.toISOString().slice(11, 13) + 'Z +' + (frames[frame] / 60) + 'h</span>';
  }

  if(slider){
    slider.max = String(frames.length - 1);
    slider.addEventListener('input', function(){ stop(); showFrame(parseInt(slider.value, 10)); });
  }
  var timer = null;
  var startFrame = 0; // the frame nearest now; playback loops from here to the end of the run
  function stop(){
    if(timer){ clearInterval(timer); timer = null; }
    if(playBtn){ playBtn.setAttribute('aria-pressed', 'false'); playBtn.setAttribute('aria-label', 'Play radar'); }
  }
  function play(){
    stop();
    timer = setInterval(function(){
      showFrame(frame >= frames.length - 1 ? startFrame : frame + 1);
    }, 700);
    if(playBtn){ playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', 'Pause radar'); }
  }
  if(playBtn) playBtn.addEventListener('click', function(){ timer ? stop() : play(); });

  map.on('load', function(){
    showFrame(0);
    fetch(RADAR_META.replace('{m}', pad(0)))
      .then(function(r){ return r.json(); })
      .then(function(meta){
        run = new Date(meta.model_init_utc);
        // Drop layers made before the run was known, then open on the frame nearest now.
        frames.forEach(function(_, k){
          if(map.getLayer(layerId(k))){ map.removeLayer(layerId(k)); map.removeSource(layerId(k)); }
        });
        startFrame = Math.max(0, Math.min(frames.length - 1, Math.round((Date.now() - run.getTime()) / 60000 / FRAME_STEP)));
        showFrame(startFrame);
      })
      .catch(function(){ if(timeLabel) timeLabel.textContent = 'Radar unavailable'; });
  });

  // ---- forecast totals (tracker mode) ----
  // One Open-Meteo request covers all three zones: hourly snow and liquid precip for the next
  // 7 days from the current hour, summed into 24 h / 3 day / 7 day totals.
  var statsEl = document.getElementById('site-stats');
  var statsState = 'idle'; // idle, loading, done
  var STAT_WINDOWS = [[24, 'Next 24h'], [72, '3 days'], [168, '7 days']];
  function sum(list, hours){
    var t = 0;
    for(var i = 0; i < hours && i < list.length; i++) t += list[i] || 0;
    return t;
  }
  function formatSnow(inches){
    if(inches <= 0) return '0"';
    return inches < 0.5 ? '<1"' : Math.round(inches) + '"';
  }
  function formatPrecip(inches){
    return inches.toFixed(2) + '"';
  }
  function loadStats(){
    if(!statsEl || statsState !== 'idle') return;
    statsState = 'loading';
    statsEl.innerHTML = '<p class="stat-note">Loading forecast&hellip;</p>';
    var pts = ZONES.map(function(k){ return VIEWS[k].forecast; });
    var url = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + pts.map(function(p){ return p.lat; }).join(',') +
      '&longitude=' + pts.map(function(p){ return p.lon; }).join(',') +
      '&elevation=' + pts.map(function(p){ return Math.round(p.ft / 3.28084); }).join(',') +
      '&hourly=precipitation,snowfall&forecast_hours=168&precipitation_unit=inch&timezone=America%2FLos_Angeles';
    fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(data){
        var list = Array.isArray(data) ? data : [data];
        statsEl.innerHTML = ZONES.map(function(k, i){
          var v = VIEWS[k], h = list[i].hourly;
          var rows = STAT_WINDOWS.map(function(w){
            return '<span>' + w[1] + '</span>' +
              '<span class="stat-val">' + formatSnow(sum(h.snowfall, w[0])) + '</span>' +
              '<span class="stat-val">' + formatPrecip(sum(h.precipitation, w[0])) + '</span>';
          }).join('');
          return '<button type="button" class="stat-card" data-stat-view="' + k + '">' +
            '<span class="stat-head"><span class="stat-name">' + v.label + '</span>' +
            '<span class="stat-elev">' + v.forecast.ft.toLocaleString() + ' ft</span></span>' +
            '<span class="stat-grid"><span></span><span class="stat-col">Snow</span><span class="stat-col">Precip</span>' + rows + '</span>' +
            '</button>';
        }).join('');
        statsEl.querySelectorAll('[data-stat-view]').forEach(function(card){
          card.addEventListener('click', function(){ select(card.getAttribute('data-stat-view'), true); });
        });
        markCurrentCard();
        statsState = 'done';
      })
      .catch(function(){
        statsEl.innerHTML = '<p class="stat-note">Forecast unavailable</p>';
        statsState = 'idle'; // try again next time the tracker opens
      });
  }
  function markCurrentCard(){
    if(!statsEl) return;
    statsEl.querySelectorAll('[data-stat-view]').forEach(function(card){
      card.classList.toggle('is-current', card.getAttribute('data-stat-view') === currentView);
    });
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
  function updateReadout(v){
    if(!weatherLine || !elevLine) return;
    if(v === VIEWS.west){
      // Whole-coast view: the readout follows the radar instead of one spot.
      readoutFor = v;
      if(coordsEl) coordsEl.textContent = 'WEST COAST';
      var d = validAt(frame);
      weatherLine.textContent = 'Forecast radar';
      elevLine.textContent = d ? formatTime(d) : '…';
      return;
    }
    if(readoutFor === v) return;
    readoutFor = v;
    if(coordsEl) coordsEl.innerHTML = v.coords;
    weatherLine.innerHTML = '&hellip;';
    elevLine.innerHTML = '&hellip;';
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + v.lat + '&longitude=' + v.lon + '&current_weather=true&temperature_unit=fahrenheit')
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(readoutFor !== v) return;
        var cw = data.current_weather;
        weatherLine.textContent = Math.round(cw.temperature) + '°F, ' + (WEATHER_CODES[cw.weathercode] || 'Unknown');
      })
      .catch(function(){ if(readoutFor === v) weatherLine.textContent = ''; });
    fetch('https://api.open-meteo.com/v1/elevation?latitude=' + v.lat + '&longitude=' + v.lon)
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(readoutFor !== v) return;
        var meters = data.elevation && data.elevation[0];
        elevLine.textContent = typeof meters === 'number' ? 'ELEV ' + Math.round(meters * 3.28084).toLocaleString() + ' FT' : '';
      })
      .catch(function(){ if(readoutFor === v) elevLine.textContent = ''; });
  }

  // ---- view picker (footer) ----
  var currentView = null;
  var buttons = document.querySelectorAll('[data-view]');
  function saved(){
    try { return localStorage.getItem('map-view'); } catch(e){ return null; }
  }
  function select(key, animate){
    if(!VIEWS[key]) key = 'west';
    currentView = key;
    var v = VIEWS[key];
    var instant = !animate || reduceMotion;
    if(key === 'west'){
      map.fitBounds(WEST_BOUNDS, { padding: 40, duration: instant ? 0 : 2400 });
    } else {
      var cam = { center: v.center, zoom: v.zoom };
      instant ? map.jumpTo(cam) : map.flyTo(Object.assign(cam, { duration: 3000, essential: true }));
    }
    updateReadout(v);
    buttons.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === key)); });
    markCurrentCard();
    if(animate){ try { localStorage.setItem('map-view', key); } catch(e){} }
  }
  buttons.forEach(function(b){
    b.addEventListener('click', function(){ select(b.getAttribute('data-view'), true); });
  });
  map.on('load', function(){ select(saved() || 'west', false); });
  // Keep the whole coast in frame when the window changes shape, unless you're steering the map.
  map.on('resize', function(){
    if(currentView === 'west' && !tracking) map.fitBounds(WEST_BOUNDS, { padding: 40, duration: 0 });
  });
})();
