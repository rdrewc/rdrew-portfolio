// Homepage background: a top-down topo map of the West Coast with the HRRR forecast radar on top.
// Contour lines are drawn in the browser from AWS terrain tiles (maplibre-contour); the coast, lakes
// and borders come from assets/storm/west-outlines.geojson (Natural Earth, clipped to the West Coast).
// The snowflake in the footer opens Tracker mode: the page slides away, location tabs expand out of
// the snowflake (whole coast, Shasta, Tahoe, Mammoth, Whitney), the map can be dragged and zoomed,
// the radar scrubbed through the next 18 hours, and a card per zone shows its forecast totals.
// Tahoe is the default view.
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
  // Each zone forecasts for one named target: the top bar's weather, elevation and coordinates (in
  // Tracker mode), the totals card and the map's target marker all use it. Positions are OpenStreetMap's
  // for each named place; `ft` is the published elevation, or read off the z13 terrain tiles where none
  // is published. `cams` is a fallback list of nearby ALERTCalifornia mountain cameras, used only if
  // the live camera feed (see "mountain cams" below) doesn't load.
  var VIEWS = {
    west: { label: 'West Coast' },
    shasta: {
      label: 'Shasta', center: [-122.208, 41.405], zoom: 10.6,
      target: { name: 'Shastina summit', lat: 41.4092, lon: -122.2233, ft: 12330, cams: [ // Shasta's west-side peak
        { id: 'weed-cam02', name: 'Weed 2', mi: 9.2 },
        { id: 'hammondranch-cam01', name: 'Hammond Ranch 1', mi: 12.1 },
        { id: 'shastaskipark-cam01', name: 'Shasta Ski Park', mi: 6.0 }
      ] }
    },
    tahoe: {
      // framed to the lake plus Granite Chief, so both fit on any screen
      label: 'Tahoe', bounds: [[-120.31, 38.92], [-119.92, 39.26]],
      target: { name: 'Granite Chief, Palisades', lat: 39.1983, lon: -120.2870, ft: 9006, cams: [ // top of Palisades
        { id: 'duncanpeaklookout-cam01', name: 'Duncan Peak Lookout 1', mi: 12.5 },
        { id: 'duncanpeaklookout-cam02', name: 'Duncan Peak Lookout 2', mi: 12.5 },
        { id: 'martispeak-cam01', name: 'Martis Peak 1', mi: 15.0 }
      ] }
    },
    mammoth: {
      label: 'Mammoth', center: [-119.0, 37.63], zoom: 10.5,
      target: { name: 'Mammoth Mountain', lat: 37.6308, lon: -119.0326, ft: 11053, cams: [ // summit
        { id: 'mammothmtn-cam01', name: 'Mammoth Mtn. 1', mi: 0 },
        { id: 'mammothmtn-cam02', name: 'Mammoth Mtn. 2', mi: 0 }
      ] }
    },
    whitney: {
      label: 'Whitney', center: [-118.29, 36.58], zoom: 10.3,
      target: { name: 'Whitney summit', lat: 36.5786, lon: -118.2921, ft: 14505, cams: [
        { id: 'whitneyportal-cam01', name: 'Whitney Portal 1', mi: 8.3 },
        { id: 'lonepine-cam02', name: 'Lone Pine 2', mi: 13.1 }
      ] }
    }
  };
  // Outside Tracker mode the top bar always reports on home: Lake Tahoe at lake level.
  var HOME = { label: 'Tahoe', coords: '39.0968° N, 120.0324° W', target: { lat: 39.1657, lon: -120.1400, ft: 6225 } };
  function formatCoords(t){
    return Math.abs(t.lat).toFixed(4) + '° ' + (t.lat >= 0 ? 'N' : 'S') + ', ' +
      Math.abs(t.lon).toFixed(4) + '° ' + (t.lon >= 0 ? 'E' : 'W');
  }
  var ZONES = ['shasta', 'tahoe', 'mammoth', 'whitney']; // north to south
  var DEFAULT_VIEW = 'tahoe';

  // ---- map ----
  var demSource = new mlcontour.DemSource({ url: DEM_TILES, encoding: 'terrarium', maxzoom: 12, worker: true });
  demSource.setupMaplibre(maplibregl);

  function cssVar(name, fallback){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  var map = new maplibregl.Map({
    container: el,
    bounds: WEST_BOUNDS,
    fitBoundsOptions: { padding: framePadding() },
    attributionControl: false,
    // Straight down only. (3D terrain was tried: stray spikes in the elevation tiles stand up as needles.)
    maxPitch: 0,
    dragRotate: false,
    touchPitch: false,
    style: {
      version: 8,
      transition: { duration: 600, delay: 0 }, // contrast eases up and down with Tracker mode
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
          paint: { 'line-width': 0.6 }
        },
        {
          id: 'contour-major', type: 'line', source: 'contours', 'source-layer': 'contours',
          filter: ['all', ['>', ['get', 'ele'], 0], ['>', ['get', 'level'], 0]],
          paint: { 'line-width': 1.1 }
        },
        {
          id: 'outline-coast', type: 'line', source: 'outlines',
          filter: ['in', ['get', 'kind'], ['literal', ['coast', 'lake']]],
          paint: { 'line-width': 1 }
        },
        {
          id: 'outline-borders', type: 'line', source: 'outlines',
          filter: ['in', ['get', 'kind'], ['literal', ['state', 'country']]],
          paint: { 'line-width': 0.8, 'line-dasharray': [3, 3] }
        }
      ]
    }
  });

  // Every line shares the terrain color; the coast and lake shores are only a touch stronger than the
  // contours, so they read as defined edges rather than outlines. Tracker mode raises all of it.
  var LINE_OPACITY = {
    page:    { 'contour-minor': 0.4, 'contour-major': 0.75, 'outline-coast': 1, 'outline-borders': 0.6 },
    tracker: { 'contour-minor': 0.7, 'contour-major': 1, 'outline-coast': 1, 'outline-borders': 0.9 }
  };
  function applyColors(){
    var line = cssVar(tracking ? '--terrain-line-strong' : '--terrain-line', 'rgba(255,255,255,0.35)');
    var opacity = LINE_OPACITY[tracking ? 'tracker' : 'page'];
    map.setPaintProperty('bg', 'background-color', cssVar('--bg', '#12131c'));
    Object.keys(opacity).forEach(function(id){
      map.setPaintProperty(id, 'line-color', line);
      map.setPaintProperty(id, 'line-opacity', opacity[id]);
    });
    map.setPaintProperty('outline-coast', 'line-width', tracking ? 1.2 : 1);
  }
  map.on('load', function(){
    map.resize(); // a page opened in a background tab can start the map at the wrong size
    applyColors();
  });
  new MutationObserver(function(){ if(map.isStyleLoaded()) applyColors(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---- target markers (tracker mode) ----
  // A target over each zone's forecast point, labeled with its name, GPS position and elevation.
  // They're pinned to the map, so they move with it; labels hide when zoomed out to the whole coast.
  var LABEL_MIN_ZOOM = 7;
  // The marker element itself is positioned by MapLibre's transform, so the enter animation goes on
  // an inner .target-body; each target arrives after the cards and timeline (--i from 2).
  var markers = ZONES.map(function(k, i){
    var t = VIEWS[k].target;
    var node = document.createElement('button');
    node.type = 'button';
    node.className = 'target-marker';
    node.setAttribute('data-zone', k);
    node.setAttribute('aria-label', VIEWS[k].label + ' forecast point: ' + t.name);
    node.innerHTML = '<span class="target-body enter" style="--i:' + (2 + i) + '">' +
      '<svg class="target-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>' +
      '<span class="target-label"><span class="target-name">' + t.name + '</span>' +
      formatCoords(t) + ' &middot; ' + t.ft.toLocaleString() + ' ft</span></span>';
    node.addEventListener('click', function(){ select(k, true); });
    return new maplibregl.Marker({ element: node, anchor: 'center' }).setLngLat([t.lon, t.lat]).addTo(map);
  });
  function updateMarkers(){
    el.classList.toggle('show-target-labels', map.getZoom() >= LABEL_MIN_ZOOM);
    markers.forEach(function(m){
      var node = m.getElement();
      node.classList.toggle('is-current', node.getAttribute('data-zone') === currentView);
    });
  }
  map.on('zoom', updateMarkers);

  // ---- tracker mode ----
  // Outside tracker mode the map is a still background: the page scrolls over it and nothing on it
  // responds to the pointer. Tracker mode hides the page and hands the pointer to the map.
  var HANDLERS = ['dragPan', 'scrollZoom', 'boxZoom', 'keyboard', 'doubleClickZoom', 'touchZoomRotate'];
  var trackerBtn = document.querySelector('[data-tracker]');
  var tracking = false;
  function setTracking(on){
    tracking = on;
    document.body.classList.toggle('is-tracking', on);
    document.body.classList.toggle('is-entered', on); // .enter items wait out the page's exit (--enter-wait)
    if(trackerBtn) trackerBtn.setAttribute('aria-pressed', String(on));
    HANDLERS.forEach(function(h){ if(map[h]) map[h][on ? 'enable' : 'disable'](); });
    if(map.isStyleLoaded()){ showFrame(frame); applyColors(); }
    refreshReadout();
    if(on){ loadStats(); refreshCams(); }
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
    if(tracking && currentView === 'west') updateReadout(VIEWS.west);
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
  // One Open-Meteo request covers every zone: hourly snow and liquid precip for the next 7 days from
  // the current hour (summed into 24 h / 3 day / 7 day totals), plus daily sums for the bar charts.
  // The cards sit in a carousel, one at a time; its back / next carets step through the zones and
  // fly the map there.
  var statsRail = document.getElementById('stats-rail');
  var statsCount = document.getElementById('stats-count');
  var statsPrev = document.querySelector('[data-stats-step="-1"]');
  var statsNext = document.querySelector('[data-stats-step="1"]');
  var statsState = 'idle'; // idle, loading, done
  var statIndex = ZONES.indexOf(DEFAULT_VIEW);
  var STAT_WINDOWS = [[24, 'Next 24h'], [72, '3 days'], [168, '7 days']];
  // Bar scales are shared by every card so they compare as you flip through, and never drop
  // below these, so a dusting stays a short bar.
  var SNOW_FLOOR = 4, PRECIP_FLOOR = 0.4;
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
  function dayName(date){
    return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Los_Angeles' });
  }
  // One bar per day. Each slot is the full chart height so the hover target is bigger than the bar.
  function barChart(cls, title, values, max, days, fmt){
    return '<span class="stat-chart ' + cls + '">' +
      '<span class="stat-chart-head"><span class="stat-swatch"></span>' + title + '<span class="stat-chart-max">' + fmt(max) + '</span></span>' +
      '<span class="stat-bars">' + values.map(function(v, i){
        var pct = v > 0 ? Math.max(6, v / max * 100) : 0;
        return '<span class="stat-bar" data-label="' + days[i] + ' ' + fmt(v) + '"><span style="height:' + pct.toFixed(1) + '%"></span></span>';
      }).join('') + '</span></span>';
  }
  function loadStats(){
    if(!statsRail || statsState !== 'idle') return;
    statsState = 'loading';
    statsRail.innerHTML = '<p class="stat-note">Loading forecast&hellip;</p>';
    var pts = ZONES.map(function(k){ return VIEWS[k].target; });
    var url = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + pts.map(function(p){ return p.lat; }).join(',') +
      '&longitude=' + pts.map(function(p){ return p.lon; }).join(',') +
      '&elevation=' + pts.map(function(p){ return Math.round(p.ft / 3.28084); }).join(',') +
      '&hourly=precipitation,snowfall&forecast_hours=168' +
      '&daily=snowfall_sum,precipitation_sum&forecast_days=7' +
      '&precipitation_unit=inch&timezone=America%2FLos_Angeles';
    fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(data){
        var list = Array.isArray(data) ? data : [data];
        var snowMax = SNOW_FLOOR, precipMax = PRECIP_FLOOR;
        list.forEach(function(z){
          snowMax = Math.max.apply(null, [snowMax].concat(z.daily.snowfall_sum.map(Number)));
          precipMax = Math.max.apply(null, [precipMax].concat(z.daily.precipitation_sum.map(Number)));
        });
        statsRail.innerHTML = ZONES.map(function(k, i){
          var v = VIEWS[k], h = list[i].hourly, d = list[i].daily;
          var days = d.time.map(dayName);
          var rows = STAT_WINDOWS.map(function(w){
            return '<span>' + w[1] + '</span>' +
              '<span class="stat-val">' + formatSnow(sum(h.snowfall, w[0])) + '</span>' +
              '<span class="stat-val">' + formatPrecip(sum(h.precipitation, w[0])) + '</span>';
          }).join('');
          return '<button type="button" class="stat-card" data-stat-view="' + k + '">' +
            '<span class="stat-head"><span class="stat-name">' + v.label + '</span>' +
            '<span class="stat-elev">' + v.target.ft.toLocaleString() + ' ft</span></span>' +
            '<span class="stat-target">' + v.target.name + ' &middot; ' + formatCoords(v.target) + '</span>' +
            '<span class="stat-grid"><span></span>' +
            '<span class="stat-col snow"><span class="stat-swatch"></span>Snow</span>' +
            '<span class="stat-col precip"><span class="stat-swatch"></span>Precip</span>' + rows + '</span>' +
            '<span class="stat-charts"><span class="stat-charts-inner">' +
            '<span class="stat-cam"><span class="stat-cam-frame"><img alt="" decoding="async"></span>' +
            '<span class="stat-cam-caption"><span class="stat-cam-name"></span><span class="stat-cam-dist"></span></span></span>' +
            barChart('snow', 'Snow by day', d.snowfall_sum.map(Number), snowMax, days, function(x){ return x.toFixed(1) + '"'; }) +
            barChart('precip', 'Precip by day', d.precipitation_sum.map(Number), precipMax, days, formatPrecip) +
            '<span class="stat-days">' + days.map(function(n){ return '<span>' + n + '</span>'; }).join('') + '</span>' +
            '</span></span>' +
            '</button>';
        }).join('');
        statsRail.querySelectorAll('[data-stat-view]').forEach(function(card){
          card.addEventListener('click', function(){ select(card.getAttribute('data-stat-view'), true); });
        });
        statsState = 'done';
        updateCarousel();
        refreshCams();
      })
      .catch(function(){
        statsRail.innerHTML = '<p class="stat-note">Forecast unavailable</p>';
        statsState = 'idle'; // try again next time the tracker opens
      });
  }
  // ---- mountain cams ----
  // ALERTCalifornia (UC San Diego) runs pan-tilt cameras on peaks and lookouts and publishes each
  // one's latest frame, time stamped. Their feed lists every camera's position and current heading, so
  // each card picks the nearest camera within 25 miles that is pointed at its target (or sits on it),
  // then the nearest of the rest. Thumbnails are 480 x 270.
  var CAM_FEED = 'https://cameras.alertcalifornia.org/public-camera-data/all_cameras-v3.json';
  var CAM_IMG = 'https://cameras.alertcalifornia.org/public-camera-data/{id}/latest-thumb.jpg';
  var CAM_RANGE_MI = 25;
  var camPicks = {};  // zone -> cameras to try, best first
  var camFeed = null; // promise, fetched once
  function miles(lat1, lon1, lat2, lon2){
    var r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    var h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.pow(Math.sin(dLon / 2), 2);
    return 7917.6 * Math.asin(Math.sqrt(h));
  }
  function bearing(lat1, lon1, lat2, lon2){
    var r = Math.PI / 180, dLon = (lon2 - lon1) * r;
    var y = Math.sin(dLon) * Math.cos(lat2 * r);
    var x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos(dLon);
    return (Math.atan2(y, x) / r + 360) % 360;
  }
  function pickCams(feed){
    ZONES.forEach(function(k){
      var t = VIEWS[k].target;
      camPicks[k] = feed.features.map(function(f){
        var c = f.geometry.coordinates, p = f.properties;
        var mi = miles(c[1], c[0], t.lat, t.lon);
        var off = p.az_current == null ? 180 : Math.abs(((bearing(c[1], c[0], t.lat, t.lon) - p.az_current + 540) % 360) - 180);
        return { id: p.id, name: p.name, mi: Math.round(mi * 10) / 10, facing: mi < 1 || off <= (p.fov || 60) / 2 };
      }).filter(function(c){ return c.mi <= CAM_RANGE_MI; })
        .sort(function(a, b){ return (b.facing - a.facing) || (a.mi - b.mi); })
        .slice(0, 3);
    });
  }
  function loadCamFeed(){
    if(!camFeed) camFeed = fetch(CAM_FEED).then(function(r){ return r.json(); }).then(pickCams).catch(function(){});
    return camFeed;
  }

  // Latest frame from the best camera that answers; the query changes once a minute so a fresh
  // frame is fetched without hammering the server.
  function showCam(card, k, n){
    var cams = (camPicks[k] && camPicks[k].length) ? camPicks[k] : VIEWS[k].target.cams;
    var box = card.querySelector('.stat-cam');
    var img = box && box.querySelector('img');
    if(!img) return;
    if(n >= cams.length){
      box.classList.add('is-offline');
      box.querySelector('.stat-cam-name').textContent = 'Cams offline';
      box.querySelector('.stat-cam-dist').textContent = '';
      return;
    }
    var cam = cams[n];
    box.classList.remove('is-offline');
    img.onerror = function(){ showCam(card, k, n + 1); };
    img.alt = 'Latest still from the ' + cam.name + ' camera';
    img.src = CAM_IMG.replace('{id}', cam.id) + '?t=' + Math.floor(Date.now() / 60000);
    box.querySelector('.stat-cam-name').textContent = cam.name;
    box.querySelector('.stat-cam-dist').textContent = (cam.mi < 1 ? 'on the mountain' : cam.mi + ' mi away') + ' · ALERTCalifornia';
  }
  function refreshCams(){
    if(!statsRail || statsState !== 'done') return;
    loadCamFeed().then(function(){
      statsRail.querySelectorAll('[data-stat-view]').forEach(function(card){
        showCam(card, card.getAttribute('data-stat-view'), 0);
      });
    });
  }
  setInterval(function(){ if(tracking) refreshCams(); }, 60000);

  function updateCarousel(){
    if(!statsRail) return;
    if(ZONES.indexOf(currentView) >= 0) statIndex = ZONES.indexOf(currentView);
    if(statsState === 'done') statsRail.style.transform = 'translateX(' + (-100 * statIndex) + '%)';
    statsRail.querySelectorAll('[data-stat-view]').forEach(function(card, i){
      card.classList.toggle('is-current', card.getAttribute('data-stat-view') === currentView);
      card.tabIndex = i === statIndex ? 0 : -1; // only the card in view takes focus
    });
    if(statsCount) statsCount.textContent = (statIndex + 1) + ' / ' + ZONES.length;
    if(statsPrev) statsPrev.disabled = statIndex <= 0;
    if(statsNext) statsNext.disabled = statIndex >= ZONES.length - 1;
  }
  // On phones the cards start collapsed to the name and totals; the chart button opens the bars.
  var statsEl = document.getElementById('site-stats');
  var statsExpand = document.querySelector('[data-stats-expand]');
  if(statsEl && statsExpand) statsExpand.addEventListener('click', function(){
    var open = statsExpand.getAttribute('aria-expanded') !== 'true';
    statsEl.classList.toggle('is-expanded', open);
    statsExpand.setAttribute('aria-expanded', String(open));
    statsExpand.setAttribute('aria-label', open ? 'Hide daily charts' : 'Show daily charts');
  });
  [statsPrev, statsNext].forEach(function(btn){
    if(!btn) return;
    btn.addEventListener('click', function(){
      var i = Math.max(0, Math.min(ZONES.length - 1, statIndex + parseInt(btn.getAttribute('data-stats-step'), 10)));
      select(ZONES[i], true);
    });
  });

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
  function refreshReadout(){
    updateReadout(tracking && currentView ? VIEWS[currentView] : HOME);
  }
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
    var t = v.target;
    if(coordsEl) coordsEl.textContent = v.coords || formatCoords(t);
    weatherLine.innerHTML = '&hellip;';
    // Published elevation, not a lookup: elevation services smooth summits down by 30-200 ft.
    elevLine.textContent = 'ELEV ' + t.ft.toLocaleString() + ' FT';
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + t.lat + '&longitude=' + t.lon +
      '&elevation=' + Math.round(t.ft / 3.28084) + '&current_weather=true&temperature_unit=fahrenheit')
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(readoutFor !== v) return;
        var cw = data.current_weather;
        weatherLine.textContent = Math.round(cw.temperature) + '°F, ' + (WEATHER_CODES[cw.weathercode] || 'Unknown');
      })
      .catch(function(){ if(readoutFor === v) weatherLine.textContent = ''; });
  }

  // ---- view picker (footer) ----
  // Framed views (the whole coast, Tahoe) keep clear of the top bar, the radar timeline and footer,
  // and the totals card (left column on desktop, a band across the top on phones).
  function framePadding(){
    return window.innerWidth <= 860
      ? { top: 230, bottom: 170, left: 24, right: 24 }
      : { top: 90, bottom: 150, left: 340, right: 60 };
  }
  var currentView = null;
  var buttons = document.querySelectorAll('[data-view]');
  function saved(){
    try { return localStorage.getItem('map-view'); } catch(e){ return null; }
  }
  function select(key, animate){
    if(!VIEWS[key]) key = DEFAULT_VIEW;
    currentView = key;
    var v = VIEWS[key];
    var instant = !animate || reduceMotion;
    if(key === 'west' || v.bounds){
      map.fitBounds(v.bounds || WEST_BOUNDS, { padding: framePadding(), duration: instant ? 0 : 2400 });
    } else {
      var cam = { center: v.center, zoom: v.zoom };
      instant ? map.jumpTo(cam) : map.flyTo(Object.assign(cam, { duration: 3000, essential: true }));
    }
    refreshReadout();
    buttons.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === key)); });
    updateCarousel();
    updateMarkers();
    if(animate){ try { localStorage.setItem('map-view', key); } catch(e){} }
  }
  buttons.forEach(function(b){
    b.addEventListener('click', function(){ select(b.getAttribute('data-view'), true); });
  });
  map.on('load', function(){ select(saved() || DEFAULT_VIEW, false); });
  // Keep framed views (the whole coast, Tahoe) in frame when the window changes shape, unless you're
  // steering the map.
  map.on('resize', function(){
    if(tracking || !currentView) return;
    if(currentView === 'west' || VIEWS[currentView].bounds){
      map.fitBounds(VIEWS[currentView].bounds || WEST_BOUNDS, { padding: framePadding(), duration: 0 });
    }
  });
})();
