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
  // is published. `base` is the bottom of the terrain below it, for comparing against the snow level.
  // `cams` is a fallback list of nearby ALERTCalifornia mountain cameras, used only if
  // the live camera feed (see "mountain cams" below) doesn't load.
  var VIEWS = {
    west: { label: 'West Coast' },
    shasta: {
      label: 'Shasta', center: [-122.208, 41.405], zoom: 10.6,
      target: { name: 'Shastina summit', lat: 41.4092, lon: -122.2233, ft: 12330, base: { name: 'Bunny Flat', ft: 6930 }, cams: [ // Shasta's west-side peak
        { id: 'weed-cam02', name: 'Weed 2', mi: 9.2 },
        { id: 'hammondranch-cam01', name: 'Hammond Ranch 1', mi: 12.1 },
        { id: 'shastaskipark-cam01', name: 'Shasta Ski Park', mi: 6.0 }
      ] }
    },
    tahoe: {
      // framed to the lake plus Granite Chief, so both fit on any screen
      label: 'Tahoe', bounds: [[-120.31, 38.92], [-119.92, 39.26]],
      target: { name: 'Siberia, Palisades', lat: 39.1828, lon: -120.2722, ft: 8630, base: { name: 'Base', ft: 6200 }, // top of Siberia Express
        // Palisades' own Scope cam at High Camp, 8,200 ft, next to Siberia. Its live player only plays
        // on Palisades' site, but the player's poster is a public still (refreshed about every 15 min).
        cams: [{ name: 'Palisades Scope 8,200′', credit: 'Palisades Tahoe', url: 'https://relay.ozolio.com/pub.api?cmd=poster&oid=EMB_EIFC0000015B' }],
        fixedCams: true } // always this cam, not the nearest ALERTCalifornia pick
    },
    mammoth: {
      label: 'Mammoth', center: [-119.0, 37.63], zoom: 10.5,
      target: { name: 'Mammoth Mountain', lat: 37.6308, lon: -119.0326, ft: 11053, base: { name: 'Main Lodge', ft: 8790 }, cams: [ // summit
        { id: 'mammothmtn-cam01', name: 'Mammoth Mtn. 1', mi: 0 },
        { id: 'mammothmtn-cam02', name: 'Mammoth Mtn. 2', mi: 0 }
      ] }
    },
    whitney: {
      label: 'Whitney', center: [-118.29, 36.58], zoom: 10.3,
      target: { name: 'Whitney summit', lat: 36.5786, lon: -118.2921, ft: 14505, base: { name: 'Portal', ft: 8360 }, cams: [
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
  var CARDS = ['west'].concat(ZONES); // the carousel: the region card first, then the zones

  // Region card (West view): the Pacific maritime snowpack, Cascades to Sierra. Its trend and charts
  // average these sites; the four zone targets are added after them.
  var REGION_SITES = [
    { name: 'Mt. Baker', lat: 48.857, lon: -121.665, ft: 5000 },  // ski area
    { name: 'Mt. Hood', lat: 45.331, lon: -121.711, ft: 6000 },   // Timberline
    { name: 'Bachelor', lat: 43.979, lon: -121.688, ft: 7000 },
    { name: 'Crater Lake', lat: 42.911, lon: -122.146, ft: 7100 } // Rim Village
  ];
  // El Niño summary. NOAA's ENSO data doesn't allow cross-origin requests, so this is written by hand
  // until the Worker can fetch it. Sources: CPC ENSO discussion (Oct 8, 2026), CPC weekly Niño-3.4
  // (week of Oct 21, 2026), NOAA winter outlook (Oct 15, 2026).
  var ENSO = {
    headline: 'El Niño Advisory · Niño-3.4 +3.4°C',
    text: 'NOAA puts a strong-to-very-strong El Niño above an 83% chance through Jan–Mar, possibly the strongest since 1950. ' +
      'Its winter outlook leans warm across the Pacific Northwest and northern California and wet along the southern storm track. ' +
      'For the Cascades that usually means a milder, thinner snowpack; for the Sierra, the wettest odds come mid to late winter, with higher snow levels and rain-on-snow risk at lake level.',
    source: 'NOAA CPC · updated Oct 28, 2026'
  };
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
      // leader, in a box that starts 18px above the target: from the ring at 45 degrees, then flat into the label
      '<svg class="target-leader" viewBox="0 0 44 30" aria-hidden="true"><path d="M17 25 30 12h14"/></svg>' +
      '<span class="target-label"><span class="target-name">' + t.name + '</span>' +
      formatCoords(t) + ' &middot; ' + t.ft.toLocaleString() + ' ft' +
      '<span class="target-cam"><span class="target-cam-frame"><img alt="" decoding="async"></span>' +
      '<span class="target-cam-caption"><span class="target-cam-name"></span><span class="target-cam-dist"></span></span></span>' +
      '</span></span>';
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
  var statsState = 'idle'; // idle, loading, done
  var statIndex = CARDS.indexOf(DEFAULT_VIEW);
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
  // Bars before `split` (past days, on the region card) are drawn faded.
  function barChart(cls, title, values, max, days, fmt, split){
    return '<span class="stat-chart ' + cls + '">' +
      '<span class="stat-chart-head"><span class="stat-swatch"></span>' + title + '<span class="stat-chart-max">' + fmt(max) + '</span></span>' +
      '<span class="stat-bars">' + values.map(function(v, i){
        var pct = v > 0 ? Math.max(6, v / max * 100) : 0;
        return '<span class="stat-bar' + (i < (split || 0) ? ' is-past' : '') + (i === split ? ' is-today' : '') + '" data-label="' + days[i] + ' ' + fmt(v) + '">' +
          '<span style="height:' + pct.toFixed(1) + '%"></span></span>';
      }).join('') + '</span></span>';
  }
  // A daily line for a measure that isn't a total (temperature). It gets its own chart rather than a
  // second axis, and uses the bars' day columns so it lines up with the precip bars under it. Past
  // days are dashed and today gets a dot; hovering a column shows its value, like the bars.
  function lineChart(cls, title, values, days, fmt, split){
    var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
    var pad = Math.max(2, (hi - lo) * 0.2), top = hi + pad, bottom = lo - pad;
    var pts = values.map(function(v, i){
      return [((i + 0.5) / values.length * 100).toFixed(2), ((top - v) / (top - bottom) * 100).toFixed(2)];
    });
    function path(from, to){
      return 'M' + pts.slice(from, to).map(function(p){ return p.join(' '); }).join('L');
    }
    return '<span class="stat-chart ' + cls + '">' +
      '<span class="stat-chart-head"><span class="stat-swatch"></span>' + title +
      '<span class="stat-chart-max">' + fmt(lo) + '–' + fmt(hi) + '</span></span>' +
      '<span class="stat-line">' +
      '<svg class="stat-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="is-past" d="' + path(0, split + 1) + '"/><path d="' + path(split, values.length) + '"/></svg>' +
      '<span class="stat-line-dot" style="left:' + pts[split][0] + '%;top:' + pts[split][1] + '%"></span>' +
      '<span class="stat-bars">' + values.map(function(v, i){
        return '<span class="stat-bar" data-label="' + days[i] + ' ' + fmt(v) + '"></span>';
      }).join('') + '</span>' +
      '</span></span>';
  }
  function average(lists){
    return lists[0].map(function(_, i){
      return lists.reduce(function(s, l){ return s + (Number(l[i]) || 0); }, 0) / lists.length;
    });
  }
  function total(list, from, to){
    return list.slice(from, to).reduce(function(s, v){ return s + v; }, 0);
  }
  // The region card: past 7 days and next 7 averaged over the Cascade and Sierra sites, a plain
  // sentence on how the coming week compares, next week by site, and the El Niño summary.
  function regionCard(sites, list){
    var d = list.map(function(z){ return z.daily; });
    var snow = average(d.map(function(x){ return x.snowfall_sum; }));
    var precip = average(d.map(function(x){ return x.precipitation_sum; }));
    var temp = average(d.map(function(x){ return x.temperature_2m_mean; }));
    var TODAY = 7; // past_days=7, so index 7 is today
    var pastP = total(precip, 0, TODAY), nextP = total(precip, TODAY, 14);
    var pastS = total(snow, 0, TODAY), nextS = total(snow, TODAY, 14);
    var dT = total(temp, TODAY, 14) / 7 - total(temp, 0, TODAY) / 7;
    var mood = nextP > pastP * 1.25 + 0.05 ? 'Wetter week ahead' : nextP < pastP * 0.8 - 0.05 ? 'Drier week ahead' : 'A similar week ahead';
    var tempNote = dT <= -3 ? ', about ' + Math.round(-dT) + '°F colder' : dT >= 3 ? ', about ' + Math.round(dT) + '°F warmer' : '';
    var bySite = sites.map(function(s, i){
      return { name: s.name, ft: s.ft, snow: total(d[i].snowfall_sum.map(Number), TODAY, 14), precip: total(d[i].precipitation_sum.map(Number), TODAY, 14) };
    });
    var top = bySite.slice().sort(function(a, b){ return b.snow - a.snow; })[0];
    var trend = mood + tempNote + ': ' + formatPrecip(nextP) + ' of precip and ' + formatSnow(nextS) + ' of snow per site on average, ' +
      'after ' + formatPrecip(pastP) + ' and ' + formatSnow(pastS) + ' this past week.';
    // The snowiest site gets its own callout, a big number apart from the sentence.
    var hero = top.snow >= 0.5
      ? '<span class="stat-hero-num">' + formatSnow(top.snow) + '</span>' +
        '<span class="stat-hero-site"><span class="stat-hero-name">' + top.name + '</span>' +
        formatPrecip(top.precip) + ' precip &middot; ' + top.ft.toLocaleString() + ' ft</span>'
      : '<span class="stat-hero-num">0"</span><span class="stat-hero-site"><span class="stat-hero-name">No snow ahead</span>at any of the ' + sites.length + ' sites</span>';
    var dates = d[0].time;
    var days = dates.map(function(t, i){ return i === TODAY ? 'Today' : dayName(t); });
    var label = function(t){ return new Date(t + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    var snowMax = Math.max.apply(null, [2].concat(snow)), precipMax = Math.max.apply(null, [0.2].concat(precip));
    return '<div class="stat-card stat-card-region" data-stat-view="west">' +
      '<span class="stat-head"><span class="stat-name">Pacific Maritime Snowpack</span></span>' +
      '<span class="stat-target">Cascades to Sierra &middot; ' + sites.length + ' sites</span>' +
      '<span class="stat-hero snow"><span class="stat-hero-label"><span class="stat-swatch"></span>Most snow, next 7 days</span>' +
      '<span class="stat-hero-row">' + hero + '</span></span>' +
      '<span class="stat-trend">' + trend + '</span>' +
      '<span class="stat-charts"><span class="stat-charts-inner">' +
      '<span class="stat-chart-head stat-section-head">Past week &middot; next week</span>' +
      lineChart('temp', 'Avg temp', temp, days, function(x){ return Math.round(x) + '°'; }, TODAY) +
      barChart('precip', 'Precip', precip, precipMax, days, formatPrecip, TODAY) +
      barChart('snow', 'Snow', snow, snowMax, days, function(x){ return x.toFixed(1) + '"'; }, TODAY) +
      '<span class="stat-days stat-days-range"><span>' + label(dates[0]) + '</span><span>Today</span><span>' + label(dates[13]) + '</span></span>' +
      '<span class="stat-chart-head stat-sites-head">Next 7 days by site</span>' +
      '<span class="stat-grid stat-sites"><span></span>' +
      '<span class="stat-col snow"><span class="stat-swatch"></span>Snow</span>' +
      '<span class="stat-col precip"><span class="stat-swatch"></span>Precip</span>' +
      bySite.map(function(s){
        return '<span>' + s.name + '</span><span class="stat-val">' + formatSnow(s.snow) + '</span><span class="stat-val">' + formatPrecip(s.precip) + '</span>';
      }).join('') + '</span>' +
      '<span class="stat-enso">' +
      '<span class="stat-chart-head">El Ni&ntilde;o 2026&ndash;27</span>' +
      '<span class="stat-enso-headline">' + ENSO.headline + '</span>' +
      '<span class="stat-enso-text">' + ENSO.text + '</span>' +
      '<span class="stat-enso-source">' + ENSO.source + '</span>' +
      '</span>' +
      '</span></span>' +
      cardFooter(0) +
      '</div>';
  }
  // ---- zone panels: Snow / Wind / Odds ----
  // Each zone card has three tabs, modeled on OpenSnow's feature set (not its look): snow first, then
  // wind, then likelihood. The tab choice is shared by every card so paging keeps it.
  var TABS = [['snow', 'Snow'], ['wind', 'Wind'], ['odds', 'Odds']];
  var LIFT_HOLD_MPH = 40;    // gusts around here start holding exposed lifts
  var SNOW_LEVEL_DROP = 1000; // snow usually falls about this far below the freezing level, in ft
  // NOAA WPC winter odds, days 1-3: map layer -> [day index, inches]
  var WPC_LAYERS = { 1: [0, 4], 2: [0, 8], 3: [0, 12], 6: [1, 4], 7: [1, 8], 8: [1, 12], 11: [2, 4], 12: [2, 8], 13: [2, 12] };
  var WPC_URL = 'https://mapservices.weather.noaa.gov/vector/rest/services/precip/wpc_prob_winter_precip/MapServer/identify' +
    '?geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=1&mapExtent=-125,32,-114,50&imageDisplay=400,400,96&returnGeometry=false&f=json&geometry=';

  // Hourly values grouped onto the daily dates (local time), reduced with fn.
  function byDay(dates, h, key, fn){
    var groups = {};
    h.time.forEach(function(t, i){
      var d = t.slice(0, 10);
      if(h[key][i] == null) return;
      (groups[d] = groups[d] || []).push(h[key][i]);
    });
    return dates.map(function(d){ return groups[d] ? fn(groups[d], d) : null; });
  }
  function maxOf(list){ return Math.max.apply(null, list); }
  function minOf(list){ return Math.min.apply(null, list); }
  // Mean wind direction for a day: average the hourly vectors so 350 and 10 make 0, not 180.
  function meanDirection(dirs){
    var x = 0, y = 0;
    dirs.forEach(function(d){ x += Math.sin(d * Math.PI / 180); y += Math.cos(d * Math.PI / 180); });
    return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
  }
  function compass(deg){
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
  }
  function percentile(sorted, p){
    var i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }
  // ECMWF ensemble (control + 50 members): per day, the 10th-90th percentile snowfall and the share
  // of runs with 6" or more.
  function ensembleDays(z){
    if(!z || !z.daily) return null;
    var keys = Object.keys(z.daily).filter(function(k){ return k.indexOf('snowfall_sum') === 0; });
    return z.daily.time.map(function(_, i){
      var v = keys.map(function(k){ return Number(z.daily[k][i]) || 0; }).sort(function(a, b){ return a - b; });
      return { p10: percentile(v, 0.1), p90: percentile(v, 0.9), chance6: v.filter(function(x){ return x >= 6; }).length / v.length };
    });
  }
  // WPC identify result -> grid[day][inches] = "10–39%" etc. No polygon at the point means under 10%.
  function wpcGrid(res){
    var grid = [0, 1, 2].map(function(){ return { 4: '<10%', 8: '<10%', 12: '<10%' }; });
    ((res && res.results) || []).forEach(function(r){
      var m = WPC_LAYERS[r.layerId];
      if(!m) return;
      var cat = (r.attributes && r.attributes['Outlook Category']) || '';
      grid[m[0]][m[1]] = ((cat.match(/\(([^)]+)\)/) || [])[1] || cat).replace('-', '–');
    });
    return grid;
  }

  // Snow tab: 10-day bars with the ensemble's likely range drawn through each, totals for days 1-5
  // and 6-10, and the snow level against the base and the target.
  function snowPanel(t, days, snow, ens, snowMax, levels){
    var first5 = total(snow, 0, 5), next5 = total(snow, 5, 10);
    var bars = '<span class="stat-bars stat-bars-10">' + snow.map(function(v, i){
      var pct = v > 0 ? Math.max(6, v / snowMax * 100) : 0;
      var r = ens && ens[i];
      var range = r && r.p90 > 0.2
        ? '<span class="stat-range" style="bottom:' + (r.p10 / snowMax * 100).toFixed(1) + '%;height:' + (Math.max(r.p90 - r.p10, 0.05) / snowMax * 100).toFixed(1) + '%"></span>'
        : '';
      var label = days[i] + ' ' + v.toFixed(1) + '"' + (r ? ' (likely ' + Math.round(r.p10) + '–' + Math.round(r.p90) + '")' : '');
      return '<span class="stat-bar" data-label="' + label + '"><span style="height:' + pct.toFixed(1) + '%"></span>' + range + '</span>';
    }).join('') + '</span>';
    return '<span class="stat-panel" data-panel="snow">' +
      '<span class="stat-split"><span><b>' + formatSnow(first5) + '</b> days 1–5</span><span><b>' + formatSnow(next5) + '</b> days 6–10</span></span>' +
      '<span class="stat-chart snow"><span class="stat-chart-head"><span class="stat-swatch"></span>Snow by day' +
      (ens ? '<span class="stat-chart-key"><span class="stat-range-key"></span>likely range</span>' : '') +
      '<span class="stat-chart-max">' + snowMax.toFixed(1) + '"</span></span>' + bars + '</span>' +
      '<span class="stat-days">' + days.map(function(n){ return '<span>' + n.charAt(0) + '</span>'; }).join('') + '</span>' +
      levelChart(levels, days, [t.base, { name: t.name.split(',')[0], ft: t.ft }]) +
      '</span>';
  }
  // Daily lowest snow level as a line, with dashed reference lines for the base and the target.
  // Under the target line it snows up top; above it, it rains there too.
  function levelChart(levels, days, refs){
    var vals = levels.filter(function(v){ return v != null; });
    if(!vals.length) return '';
    var lo = refs[0].ft, hi = refs[refs.length - 1].ft;
    // Frame the base and target with room around them; levels far outside are pinned to the edges
    // (way above the summit reads the same as a little above it here).
    var top = Math.min(maxOf(vals) + 600, hi + 4000), bottom = Math.max(minOf(vals) - 600, lo - 3000);
    top = Math.max(top, hi + 800); bottom = Math.min(bottom, lo - 800);
    var y = function(ft){ return ((top - Math.max(bottom, Math.min(top, ft))) / (top - bottom) * 100).toFixed(2); };
    var pts = levels.map(function(v, i){ return v == null ? null : [((i + 0.5) / levels.length * 100).toFixed(2), y(v)]; }).filter(Boolean);
    return '<span class="stat-chart level"><span class="stat-chart-head"><span class="stat-swatch"></span>Snow level, lowest each day</span>' +
      '<span class="stat-line stat-level">' +
      refs.map(function(r){
        return '<span class="stat-ref" style="top:' + y(r.ft) + '%"><span>' + r.name + ' ' + r.ft.toLocaleString() + '</span></span>';
      }).join('') +
      '<svg class="stat-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M' +
      pts.map(function(p){ return p.join(' '); }).join('L') + '"/></svg>' +
      '<span class="stat-bars">' + levels.map(function(v, i){
        return '<span class="stat-bar" data-label="' + days[i] + (v == null ? '' : ' ' + Math.round(v / 100) * 100 + ' ft') + '"></span>';
      }).join('') + '</span>' +
      '</span><span class="stat-note-inline">Line under a dashed level: snow there; over it: rain. Set about ' + SNOW_LEVEL_DROP.toLocaleString() + ' ft below the freezing level.</span></span>';
  }
  // Wind tab: the next 24 hours in words, then each day's peak gust with its direction, and a line
  // where lifts start to hold.
  function windPanel(days, gusts, dirs, nextGust, nextDir){
    var max = Math.max(60, maxOf(gusts.filter(function(v){ return v != null; }).concat([0])) + 5);
    var held = gusts.filter(function(g){ return g >= LIFT_HOLD_MPH; }).length;
    return '<span class="stat-panel" data-panel="wind">' +
      '<span class="stat-split"><span><b>' + Math.round(nextGust) + ' mph</b> gusts next 24h, from the ' + compass(nextDir) + '</span></span>' +
      '<span class="stat-chart wind"><span class="stat-chart-head"><span class="stat-swatch"></span>Peak gust by day<span class="stat-chart-max">' + max + ' mph</span></span>' +
      '<span class="stat-bars stat-bars-10">' +
      '<span class="stat-ref stat-ref-hold" style="bottom:' + (LIFT_HOLD_MPH / max * 100).toFixed(1) + '%"><span>lift holds ' + LIFT_HOLD_MPH + '</span></span>' +
      gusts.map(function(g, i){
        var pct = g ? Math.max(4, g / max * 100) : 0;
        return '<span class="stat-bar' + (g >= LIFT_HOLD_MPH ? ' is-high' : '') + '" data-label="' + days[i] + ' ' + Math.round(g || 0) + ' mph ' + compass(dirs[i] || 0) + '">' +
          '<span style="height:' + pct.toFixed(1) + '%"></span></span>';
      }).join('') + '</span></span>' +
      // arrows point where the wind is blowing to
      '<span class="stat-arrows">' + dirs.map(function(d){
        return '<span><svg viewBox="0 0 12 12" style="transform:rotate(' + Math.round(((d || 0) + 180) % 360) + 'deg)" aria-hidden="true"><path d="M6 1v10M2.5 4.5 6 1l3.5 3.5"/></svg></span>';
      }).join('') + '</span>' +
      '<span class="stat-days">' + days.map(function(n){ return '<span>' + n.charAt(0) + '</span>'; }).join('') + '</span>' +
      '<span class="stat-note-inline">' + (held ? held + (held === 1 ? ' day' : ' days') + ' with gusts over ' + LIFT_HOLD_MPH + ' mph' : 'No days with gusts over ' + LIFT_HOLD_MPH + ' mph') + '</span>' +
      '</span>';
  }
  // Odds tab: NOAA's days 1-3 chances of 4, 8 and 12 inches, then the share of ensemble runs with 6"+
  // for each of the 10 days.
  function oddsPanel(days, wpc, ens){
    var wpcDays = days.slice(0, 3);
    var table = wpc
      ? '<span class="stat-chart-head">NOAA chance of snow</span>' +
        '<span class="stat-odds"><span></span>' + wpcDays.map(function(d){ return '<span class="stat-col">' + d + '</span>'; }).join('') +
        [4, 8, 12].map(function(inch){
          return '<span>' + inch + '"+</span>' + [0, 1, 2].map(function(day){
            var v = wpc[day][inch];
            return '<span class="stat-val' + (v === '<10%' ? ' is-low' : '') + '">' + v + '</span>';
          }).join('');
        }).join('') + '</span>'
      : '<span class="stat-note-inline">NOAA odds unavailable</span>';
    var chance = ens
      ? '<span class="stat-chart odds"><span class="stat-chart-head"><span class="stat-swatch"></span>Chance of 6"+ by day<span class="stat-chart-max">100%</span></span>' +
        '<span class="stat-bars stat-bars-10">' + ens.map(function(r, i){
          var pct = r.chance6 * 100;
          return '<span class="stat-bar" data-label="' + days[i] + ' ' + Math.round(pct) + '%"><span style="height:' + (pct ? Math.max(4, pct) : 0).toFixed(1) + '%"></span></span>';
        }).join('') + '</span></span>' +
        '<span class="stat-days">' + days.map(function(n){ return '<span>' + n.charAt(0) + '</span>'; }).join('') + '</span>' +
        '<span class="stat-note-inline">Share of 51 ECMWF ensemble runs</span>'
      : '<span class="stat-note-inline">Ensemble odds unavailable</span>';
    return '<span class="stat-panel" data-panel="odds">' + table + chance + '</span>';
  }
  function tabBar(){
    return '<span class="stat-tabs" role="tablist">' + TABS.map(function(t){
      return '<button type="button" role="tab" data-stat-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</span>';
  }

  function loadStats(){
    if(!statsRail || statsState !== 'idle') return;
    statsState = 'loading';
    statsRail.innerHTML = '<p class="stat-note">Loading forecast&hellip;</p>';
    var pts = ZONES.map(function(k){ return VIEWS[k].target; });
    var where = '?latitude=' + pts.map(function(p){ return p.lat; }).join(',') +
      '&longitude=' + pts.map(function(p){ return p.lon; }).join(',') +
      '&elevation=' + pts.map(function(p){ return Math.round(p.ft / 3.28084); }).join(',');
    var url = 'https://api.open-meteo.com/v1/forecast' + where +
      '&hourly=precipitation,snowfall,freezing_level_height,wind_gusts_10m,wind_direction_10m&forecast_hours=240' +
      '&daily=snowfall_sum,precipitation_sum&forecast_days=10' +
      '&precipitation_unit=inch&wind_speed_unit=mph&timezone=America%2FLos_Angeles';
    var ensembleUrl = 'https://ensemble-api.open-meteo.com/v1/ensemble' + where +
      '&models=ecmwf_ifs025&daily=snowfall_sum&forecast_days=10&precipitation_unit=inch&timezone=America%2FLos_Angeles';
    var sites = REGION_SITES.concat(ZONES.map(function(k){
      var t = VIEWS[k].target;
      return { name: VIEWS[k].label, lat: t.lat, lon: t.lon, ft: t.ft };
    }));
    var regionUrl = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + sites.map(function(p){ return p.lat; }).join(',') +
      '&longitude=' + sites.map(function(p){ return p.lon; }).join(',') +
      '&elevation=' + sites.map(function(p){ return Math.round(p.ft / 3.28084); }).join(',') +
      '&daily=snowfall_sum,precipitation_sum,temperature_2m_mean&past_days=7&forecast_days=7' +
      '&precipitation_unit=inch&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles';
    function getJSON(u){ return fetch(u).then(function(r){ return r.json(); }); }
    function optional(promise){ return promise.catch(function(){ return null; }); } // odds can fail alone
    Promise.all([
      getJSON(url), getJSON(regionUrl),
      optional(getJSON(ensembleUrl)),
      Promise.all(pts.map(function(p){ return optional(getJSON(WPC_URL + p.lon + ',' + p.lat)); }))
    ])
      .then(function(all){
        var list = Array.isArray(all[0]) ? all[0] : [all[0]];
        var ensList = all[2] ? (Array.isArray(all[2]) ? all[2] : [all[2]]) : [];
        var ens = ZONES.map(function(_, i){ return ensembleDays(ensList[i]); });
        // one snow scale for every zone card (deterministic and the top of the likely range)
        var snowMax = SNOW_FLOOR;
        list.forEach(function(z, i){
          snowMax = Math.max.apply(null, [snowMax].concat(z.daily.snowfall_sum.map(Number), (ens[i] || []).map(function(r){ return r.p90; })));
        });
        statsRail.innerHTML = regionCard(sites, all[1]) + ZONES.map(function(k, i){
          var v = VIEWS[k], t = v.target, h = list[i].hourly, d = list[i].daily;
          var days = d.time.map(dayName);
          var snow = d.snowfall_sum.map(Number);
          // freezing level comes back in feet when inch units are asked for, meters otherwise
          var toFt = list[i].hourly_units && list[i].hourly_units.freezing_level_height === 'm' ? 3.28084 : 1;
          var levels = byDay(d.time, h, 'freezing_level_height', function(m){ return minOf(m) * toFt - SNOW_LEVEL_DROP; });
          var gusts = byDay(d.time, h, 'wind_gusts_10m', maxOf);
          var dirs = byDay(d.time, h, 'wind_direction_10m', meanDirection);
          var next24 = h.wind_gusts_10m.slice(0, 24).map(Number);
          var nextGust = maxOf(next24);
          var nextDir = meanDirection(h.wind_direction_10m.slice(0, 24).map(Number));
          var rows = STAT_WINDOWS.map(function(w){
            return '<span>' + w[1] + '</span>' +
              '<span class="stat-val">' + formatSnow(sum(h.snowfall, w[0])) + '</span>' +
              '<span class="stat-val">' + formatPrecip(sum(h.precipitation, w[0])) + '</span>';
          }).join('');
          return '<div class="stat-card" data-stat-view="' + k + '">' +
            '<span class="stat-head"><span class="stat-name">' + v.label + '</span>' +
            '<span class="stat-elev">' + t.ft.toLocaleString() + ' ft</span></span>' +
            '<span class="stat-target">' + t.name + ' &middot; ' + formatCoords(t) + '</span>' +
            '<span class="stat-grid"><span></span>' +
            '<span class="stat-col snow"><span class="stat-swatch"></span>Snow</span>' +
            '<span class="stat-col precip"><span class="stat-swatch"></span>Precip</span>' + rows + '</span>' +
            '<span class="stat-charts"><span class="stat-charts-inner">' +
            tabBar() +
            snowPanel(t, days, snow, ens[i], snowMax, levels) +
            windPanel(days, gusts, dirs, nextGust, nextDir) +
            oddsPanel(days, all[3][i] ? wpcGrid(all[3][i]) : null, ens[i]) +
            '</span></span>' +
            cardFooter(i + 1) +
            '</div>';
        }).join('');
        statsState = 'done';
        showTab(currentTab);
        updateCarousel();
      })
      .catch(function(){
        statsRail.innerHTML = '<p class="stat-note">Forecast unavailable</p>';
        statsState = 'idle'; // try again next time the tracker opens
      });
  }
  var currentTab = 'snow';
  function showTab(tab){
    currentTab = tab;
    if(!statsRail) return;
    statsRail.setAttribute('data-tab', tab);
    statsRail.querySelectorAll('[data-stat-tab]').forEach(function(b){
      b.setAttribute('aria-selected', String(b.getAttribute('data-stat-tab') === tab));
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

  // The still sits in the target's map label (shown on the selected target only). Latest frame from
  // the best camera that answers; the query changes once a minute so a fresh frame is fetched without
  // hammering the server.
  function showCam(node, k, n){
    var t = VIEWS[k].target;
    var cams = (!t.fixedCams && camPicks[k] && camPicks[k].length) ? camPicks[k] : t.cams;
    var box = node.querySelector('.target-cam');
    var img = box && box.querySelector('img');
    if(!img) return;
    if(n >= cams.length){
      box.classList.add('is-offline');
      box.querySelector('.target-cam-name').textContent = 'Cams offline';
      box.querySelector('.target-cam-dist').textContent = '';
      return;
    }
    var cam = cams[n];
    box.classList.remove('is-offline');
    img.onerror = function(){ showCam(node, k, n + 1); };
    img.alt = 'Latest still from the ' + cam.name + ' camera';
    var src = cam.url || CAM_IMG.replace('{id}', cam.id);
    img.src = src + (src.indexOf('?') < 0 ? '?' : '&') + 't=' + Math.floor(Date.now() / 60000);
    box.querySelector('.target-cam-name').textContent = cam.name;
    box.querySelector('.target-cam-dist').textContent = cam.credit ||
      (cam.mi < 1 ? 'on the mountain' : cam.mi + ' mi away') + ' · ALERTCalifornia';
  }
  function refreshCams(){
    loadCamFeed().then(function(){
      markers.forEach(function(m){
        var node = m.getElement();
        showCam(node, node.getAttribute('data-zone'), 0);
      });
    });
  }
  setInterval(function(){ if(tracking) refreshCams(); }, 60000);

  // Each card carries its own footer (back / next in the corners, the count, and on phones the expand
  // arrow), so a card and its footer slide as one piece. Cards keep their own heights; nothing
  // animates vertically while paging.
  function cardFooter(i){
    return '<span class="stats-nav">' +
      '<button type="button" data-stats-step="-1" aria-label="Previous location"' + (i === 0 ? ' disabled' : '') + '>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>' +
      '<span class="stats-nav-mid"><span>' + (i + 1) + ' / ' + CARDS.length + '</span>' +
      '<button type="button" class="stats-expand" data-stats-expand aria-expanded="false" aria-label="Show daily charts">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></span>' +
      '<button type="button" data-stats-step="1" aria-label="Next location"' + (i === CARDS.length - 1 ? ' disabled' : '') + '>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '</span>';
  }

  function updateCarousel(){
    if(!statsRail) return;
    if(CARDS.indexOf(currentView) >= 0) statIndex = CARDS.indexOf(currentView);
    if(statsState === 'done') statsRail.style.transform = 'translateX(' + (-100 * statIndex) + '%)';
    statsRail.querySelectorAll('[data-stat-view]').forEach(function(card, i){
      card.classList.toggle('is-current', card.getAttribute('data-stat-view') === currentView);
      card.inert = i !== statIndex; // off-screen cards (and their footers) stay out of tab order
    });
  }
  // One listener for every card: tabs switch Snow / Wind / Odds (on every card at once), footer arrows
  // page, the expand arrow opens the panels on phones (all cards together), and a click anywhere else
  // on a card flies the map there.
  var statsEl = document.getElementById('site-stats');
  if(statsRail) statsRail.addEventListener('click', function(e){
    var tab = e.target.closest('[data-stat-tab]');
    var step = e.target.closest('[data-stats-step]');
    var expand = e.target.closest('[data-stats-expand]');
    var card = e.target.closest('[data-stat-view]');
    if(tab){
      showTab(tab.getAttribute('data-stat-tab'));
    } else if(step){
      var i = Math.max(0, Math.min(CARDS.length - 1, statIndex + parseInt(step.getAttribute('data-stats-step'), 10)));
      select(CARDS[i], true);
    } else if(expand){
      var open = !statsEl.classList.contains('is-expanded');
      statsEl.classList.toggle('is-expanded', open);
      statsRail.querySelectorAll('[data-stats-expand]').forEach(function(b){
        b.setAttribute('aria-expanded', String(open));
        b.setAttribute('aria-label', open ? 'Hide daily charts' : 'Show daily charts');
      });
    } else if(card){
      select(card.getAttribute('data-stat-view'), true);
    }
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
