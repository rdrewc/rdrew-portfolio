// rdrew.com/elnino.json: the storm tracker's headline numbers in one small, cached answer, for the
// iOS widget (and anything else that wants them without the dozen requests the page makes).
// Public forecast data only; nothing about the house goes here.
//
// The places mirror assets/storm-map.js (VIEWS targets, REGION_SITES, RAIN_SITES) and the storm
// levels mirror its stormLevel(). Change both together.

const CACHE_SECONDS = 1800; // rebuilt at most every 30 minutes; widgets refresh on iOS's schedule anyway

const ZONES = [
  { key: 'shasta', name: 'Shasta', spot: 'Shastina summit', lat: 41.4092, lon: -122.2233, ft: 12330 },
  { key: 'tahoe', name: 'Tahoe', spot: 'Siberia, Palisades', lat: 39.1828, lon: -120.2722, ft: 8630 },
  { key: 'mammoth', name: 'Mammoth', spot: 'Mammoth Mountain', lat: 37.6308, lon: -119.0326, ft: 11053 },
  { key: 'whitney', name: 'Whitney', spot: 'Whitney summit', lat: 36.5786, lon: -118.2921, ft: 14505 }
];
// The region card's sites: the Cascades, then the mountain zones.
const REGION_SITES = [
  { name: 'Mt. Baker', spot: 'Mt. Baker Ski Area', lat: 48.857, lon: -121.665, ft: 5000 },
  { name: 'Mt. Hood', spot: 'Timberline Lodge', lat: 45.331, lon: -121.711, ft: 6000 },
  { name: 'Bachelor', spot: 'Mt. Bachelor', lat: 43.979, lon: -121.688, ft: 7000 },
  { name: 'Crater Lake', spot: 'Rim Village', lat: 42.911, lon: -122.146, ft: 7100 }
].concat(ZONES);
const RAIN_SITES = [
  ['Forks', 'Washington', 47.950, -124.385], ['Seattle', 'Washington', 47.606, -122.332],
  ['Astoria', 'Oregon', 46.188, -123.831], ['Portland', 'Oregon', 45.515, -122.679],
  ['Brookings', 'Oregon', 42.053, -124.284], ['Crescent City', 'California', 41.756, -124.202],
  ['Eureka', 'California', 40.802, -124.164], ['Santa Cruz Mtns', 'California', 37.090, -122.090],
  ['San Francisco', 'California', 37.775, -122.419], ['Big Sur', 'California', 36.270, -121.807],
  ['Los Angeles', 'California', 34.052, -118.244], ['San Diego', 'California', 32.716, -117.161],
  ['Spokane', 'Washington', 47.659, -117.426], ['Reno', 'Nevada', 39.530, -119.814],
  ['Las Vegas', 'Nevada', 36.170, -115.140], ['Salt Lake City', 'Utah', 40.761, -111.891],
  ['Boise', 'Idaho', 43.615, -116.202], ["Coeur d'Alene", 'Idaho', 47.677, -116.780],
  ['Missoula', 'Montana', 46.872, -113.994], ['Kalispell', 'Montana', 48.196, -114.313],
  ['Jackson', 'Wyoming', 43.480, -110.762], ['Cheyenne', 'Wyoming', 41.140, -104.820],
  ['Denver', 'Colorado', 39.739, -104.990], ['Durango', 'Colorado', 37.275, -107.880],
  ['Albuquerque', 'New Mexico', 35.084, -106.650], ['Flagstaff', 'Arizona', 35.198, -111.651],
  ['Phoenix', 'Arizona', 33.448, -112.074]
].map(([name, where, lat, lon]) => ({ name, where, lat, lon }));

// Inches in the next 24 hours: snow or precip at or above these makes a big or mid storm.
const STORM = { big: { snow: 6, precip: 1 }, mid: { snow: 1, precip: 0.25 } };

const API = 'https://api.open-meteo.com/v1/forecast';
const UNITS = '&precipitation_unit=inch&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles';

export async function elninoJSON(request, ctx){
  const cache = caches.default;
  const key = new Request(new URL('/elnino.json', request.url).toString());
  const hit = await cache.match(key);
  if(hit) return hit;
  let body;
  try {
    body = JSON.stringify(await buildSummary());
  } catch(err){
    return json(JSON.stringify({ error: 'forecast unavailable' }), 502, 'no-store');
  }
  const res = json(body, 200, 'public, max-age=' + CACHE_SECONDS);
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

function json(body, status, cacheControl){
  return new Response(body, { status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
    'Access-Control-Allow-Origin': '*'
  } });
}

export async function buildSummary(){
  const [zones, region, rain] = await Promise.all([
    getJSON(API + where(ZONES, true) + '&hourly=snowfall,precipitation&forecast_hours=24&daily=snowfall_sum&forecast_days=7' + UNITS),
    getJSON(API + where(REGION_SITES, true) + '&daily=snowfall_sum,precipitation_sum,temperature_2m_mean&past_days=7&forecast_days=7' + UNITS),
    getJSON(API + where(RAIN_SITES, false) + '&daily=rain_sum&forecast_days=7' + UNITS)
  ]);

  const zoneList = ZONES.map((z, i) => {
    const snow24 = sum(zones[i].hourly.snowfall), precip24 = sum(zones[i].hourly.precipitation);
    return { key: z.key, name: z.name, spot: z.spot, ft: z.ft, storm: stormLevel(snow24, precip24),
      snow24: round(snow24), precip24: round(precip24, 2), snow7: round(sum(zones[i].daily.snowfall_sum)) };
  });

  // Region: the snowiest site next week, and how next week compares with the past one (averages).
  const TODAY = 7; // past_days=7, so index 7 is today
  const sites = REGION_SITES.map((s, i) => ({ s, d: region[i].daily }));
  const top = sites.map(({ s, d }) => ({ s, snow: sum(d.snowfall_sum.slice(TODAY)) }))
    .sort((a, b) => b.snow - a.snow)[0];
  const avg = (field, from, to) => sites.reduce((t, { d }) => t + sum(d[field].slice(from, to)), 0) / sites.length;
  const nextP = avg('precipitation_sum', TODAY), pastP = avg('precipitation_sum', 0, TODAY);
  const nextS = avg('snowfall_sum', TODAY), pastS = avg('snowfall_sum', 0, TODAY);
  const dT = (avg('temperature_2m_mean', TODAY) - avg('temperature_2m_mean', 0, TODAY)) / 7;

  const wet = RAIN_SITES.map((s, i) => ({ s, ft: rain[i].elevation * 3.28084, rain: sum(rain[i].daily.rain_sum) }))
    .sort((a, b) => b.rain - a.rain)[0];

  const levels = zoneList.map((z) => z.storm);
  return {
    updated: new Date().toISOString(),
    storm: levels.includes('big') ? 'big' : levels.includes('mid') ? 'mid' : 'none', // the worst zone
    zones: zoneList,
    mostSnow: { name: top.s.name, spot: top.s.spot, ft: top.s.ft, inches: round(top.snow) },
    mostRain: { name: wet.s.name, where: wet.s.where, ft: Math.round(wet.ft), inches: round(wet.rain) },
    week: {
      mood: nextP > pastP * 1.25 + 0.05 ? 'Wetter week ahead' : nextP < pastP * 0.8 - 0.05 ? 'Drier week ahead' : 'A similar week ahead',
      tempChange: Math.round(dT), // °F, next week's mean minus the past week's
      nextPrecip: round(nextP, 2), nextSnow: round(nextS), pastPrecip: round(pastP, 2), pastSnow: round(pastS)
    }
  };
}

function where(list, withElevation){
  return '?latitude=' + list.map((p) => p.lat).join(',') + '&longitude=' + list.map((p) => p.lon).join(',') +
    (withElevation ? '&elevation=' + list.map((p) => Math.round(p.ft / 3.28084)).join(',') : '');
}

async function getJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error('Open-Meteo ' + res.status);
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

function stormLevel(snow24, precip24){
  if(snow24 >= STORM.big.snow || precip24 >= STORM.big.precip) return 'big';
  if(snow24 >= STORM.mid.snow || precip24 >= STORM.mid.precip) return 'mid';
  return 'none';
}
function sum(list){ return list.reduce((t, v) => t + (Number(v) || 0), 0); }
function round(v, places = 1){ const f = 10 ** places; return Math.round(v * f) / f; }
