// rdrew.com/elnino.json: the storm tracker's headline numbers in one small, cached answer, for the
// iOS widget (and anything else that wants them without the dozen requests the page makes).
// Public forecast data only; nothing about the house goes here.
//
import { readNetCDF, values } from './netcdf.js';

// The places mirror assets/storm-map.js (VIEWS targets, REGION_SITES, RAIN_SITES) and the storm
// levels mirror its stormLevel(). Change both together.

const CACHE_SECONDS = 1800; // rebuilt at most every 30 minutes; widgets refresh on iOS's schedule anyway
const STALE_SECONDS = 86400; // the last good answer, served for a day if a rebuild fails
const FORECAST_CACHE_SECONDS = 3600; // the cards' forecast, so visitors don't each spend Open-Meteo's limit
const FORECAST_STALE_SECONDS = 259200;
const WEATHER_CACHE_SECONDS = 900;   // the top bar's current weather

const ZONES = [
  { key: 'shasta', name: 'Shasta', spot: 'Shastina summit', lat: 41.4092, lon: -122.2233, ft: 12330 },
  { key: 'tahoe', name: 'Tahoe', spot: 'Siberia, Palisades', lat: 39.1828, lon: -120.2722, ft: 8630 },
  { key: 'mammoth', name: 'Mammoth', spot: 'Mammoth Mountain', lat: 37.6308, lon: -119.0326, ft: 11053 },
  { key: 'whitney', name: 'Whitney', spot: 'Whitney summit', lat: 36.5786, lon: -118.2921, ft: 14505 }
];
// Every card on the tracker, in order: the city landmarks, then the mountains.
const CARD_ZONES = [
  { key: 'sf', lat: 37.8183, lon: -122.4784, ft: 220 },  // Golden Gate Bridge
  { key: 'la', lat: 34.1341, lon: -118.3217, ft: 1575 }  // Hollywood Sign
].concat(ZONES);
// The top bar's weather: every card's spot, plus the lake, which the homepage shows (HOME in storm-map.js).
const WEATHER_PLACES = [{ key: 'home', lat: 39.1657, lon: -120.14, ft: 6225 }].concat(CARD_ZONES);
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

// Inches in the next 24 hours: snow or precip at or above these makes an extreme, big or mid storm.
const STORM = { extreme: { snow: 18, precip: 3 }, big: { snow: 6, precip: 1 }, mid: { snow: 1, precip: 0.25 } };

// Most rain: Open-Meteo shortlists the wettest towns, then the National Weather Service forecast
// (its gridded data, forecaster-reviewed) ranks them. Open-Meteo stands in if NWS is down.
const RAIN_SHORTLIST = 6;
const NWS_HEADERS = { 'User-Agent': 'rdrew.com storm tracker', Accept: 'application/geo+json' };
const NWS_TIMEOUT_MS = 6000;
const SNOW_TO_WATER = 10; // NWS gives total water and snow depth; 10" of snow is about 1" of water

// Moisture overlay: GFS water vapor in the whole air column, the usual way to spot an atmospheric
// river, every 6 hours for about 3 days. The full 0.25 degree grid comes from UCAR's free THREDDS
// server, over the Pacific and the West. If that's down, a coarse 2.5 degree grid from Open-Meteo
// stands in. GFS runs every 6 hours, so that's how often it's rebuilt.
const MOISTURE_URL = 'https://thredds.ucar.edu/thredds/ncss/grid/grib/NCEP/GFS/Global_0p25deg/Best' +
  '?var=Precipitable_water_entire_atmosphere_single_layer&north=60&south=12&west=190&east=275' +
  '&horizStride=1&timeStride=2&accept=netcdf3';
const MOISTURE_HOURS = 78;
const MOISTURE_TIMEOUT_MS = 20000;
const MOISTURE_SCALE = 2; // one byte per point: mm of water x 2, so half-mm steps up to 127 mm
const COARSE_GRID = { lat: { from: 16, step: 2.5, count: 18 }, lon: { from: -170, step: 2.5, count: 33 } };
const MOISTURE_CACHE_SECONDS = 21600;
const MOISTURE_STALE_SECONDS = 172800;

const API = 'https://api.open-meteo.com/v1/forecast';
const UNITS = '&precipitation_unit=inch&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles';

export function elninoJSON(request, ctx){
  return cached(request, ctx, '/elnino.json', CACHE_SECONDS, STALE_SECONDS, async () => JSON.stringify(await buildSummary()));
}
export function forecastJSON(request, ctx){
  return cached(request, ctx, '/elnino-forecast.json', FORECAST_CACHE_SECONDS, FORECAST_STALE_SECONDS, async () => JSON.stringify(await buildForecast()));
}
export function weatherJSON(request, ctx){
  return cached(request, ctx, '/elnino-weather.json', WEATHER_CACHE_SECONDS, STALE_SECONDS, async () => JSON.stringify(await buildWeather()));
}
export function moistureJSON(request, ctx){
  // text/plain so Cloudflare compresses it; the page reads it as bytes
  return cached(request, ctx, '/elnino-moisture.bin', MOISTURE_CACHE_SECONDS, MOISTURE_STALE_SECONDS, buildMoisture, 'text/plain; charset=x-user-defined');
}

// Serves the cached copy, or rebuilds it. If a rebuild fails, serves the last good copy.
async function cached(request, ctx, path, seconds, staleSeconds, build, type = 'application/json; charset=utf-8'){
  const cache = caches.default;
  const key = new Request(new URL(path, request.url).toString());
  const staleKey = new Request(new URL(path + '?stale', request.url).toString());
  const hit = await cache.match(key);
  if(hit) return hit;
  let body;
  try {
    body = await build();
  } catch(err){
    const stale = await cache.match(staleKey);
    if(stale) return respond(await stale.arrayBuffer(), 200, 'no-store', type);
    return respond(JSON.stringify({ error: 'forecast unavailable' }), 502, 'no-store');
  }
  const res = respond(body, 200, 'public, max-age=' + seconds, type);
  ctx.waitUntil(Promise.all([
    cache.put(key, res.clone()),
    cache.put(staleKey, respond(body, 200, 'public, max-age=' + staleSeconds, type))
  ]));
  return res;
}

function respond(body, status, cacheControl, type = 'application/json; charset=utf-8'){
  return new Response(body, { status, headers: {
    'Content-Type': type,
    'Cache-Control': cacheControl,
    'Access-Control-Allow-Origin': '*'
  } });
}

// Everything the tracker's cards draw, as Open-Meteo returns it. Same requests as loadStats() in
// assets/storm-map.js, which makes them itself if this can't be reached.
export async function buildForecast(){
  const [zones, region, ensemble] = await Promise.all([
    getJSON(API + where(CARD_ZONES, true) + '&hourly=precipitation,snowfall,wind_gusts_10m,wind_direction_10m&forecast_hours=240' +
      '&daily=snowfall_sum,precipitation_sum&forecast_days=10&precipitation_unit=inch&wind_speed_unit=mph&timezone=America%2FLos_Angeles'),
    getJSON(API + where(REGION_SITES, true) + '&daily=snowfall_sum,precipitation_sum,temperature_2m_mean&past_days=7&forecast_days=7' + UNITS),
    getJSON('https://ensemble-api.open-meteo.com/v1/ensemble' + where(CARD_ZONES, true) +
      '&models=ecmwf_ifs025&daily=snowfall_sum&forecast_days=10&precipitation_unit=inch&timezone=America%2FLos_Angeles').catch(() => null)
  ]);
  return { updated: new Date().toISOString(), zones, region, ensemble };
}

export async function buildWeather(){
  const points = await getJSON(API + where(WEATHER_PLACES, true) + '&current_weather=true' + UNITS);
  const places = {};
  WEATHER_PLACES.forEach((place, i) => {
    places[place.key] = { temperature: points[i].current_weather.temperature, code: points[i].current_weather.weathercode };
  });
  return { updated: new Date().toISOString(), places };
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

  const towns = RAIN_SITES.map((s, i) => ({ s, ft: rain[i].elevation * 3.28084, rain: sum(rain[i].daily.rain_sum) }))
    .sort((a, b) => b.rain - a.rain);
  const wettest = await mostRain(towns);

  const levels = zoneList.map((z) => z.storm);
  return {
    updated: new Date().toISOString(),
    storm: ['extreme', 'big', 'mid'].find((level) => levels.includes(level)) || 'none', // the worst zone
    zones: zoneList,
    mostSnow: { name: top.s.name, spot: top.s.spot, ft: top.s.ft, inches: round(top.snow) },
    mostRain: wettest,
    week: {
      mood: nextP > pastP * 1.25 + 0.05 ? 'Wetter week ahead' : nextP < pastP * 0.8 - 0.05 ? 'Drier week ahead' : 'A similar week ahead',
      tempChange: Math.round(dT), // °F, next week's mean minus the past week's
      nextPrecip: round(nextP, 2), nextSnow: round(nextS), pastPrecip: round(pastP, 2), pastSnow: round(pastS)
    }
  };
}

// The moisture file: a 4-byte length, a JSON header (grid, start time, frames) of that length, then one
// byte per point: frame by frame, each running south to north, then west to east.
export async function buildMoisture(){
  const { header, bytes } = await fineMoisture().catch(coarseMoisture);
  const head = new TextEncoder().encode(JSON.stringify({ updated: new Date().toISOString(), scale: MOISTURE_SCALE, ...header }));
  const out = new Uint8Array(4 + head.length + bytes.length);
  new DataView(out.buffer).setUint32(0, head.length);
  out.set(head, 4);
  out.set(bytes, 4 + head.length);
  return out;
}

async function fineMoisture(){
  const hour = (t) => new Date(t).toISOString().slice(0, 13) + ':00:00Z';
  const now = Date.now();
  const res = await fetch(MOISTURE_URL + '&time_start=' + hour(now) + '&time_end=' + hour(now + MOISTURE_HOURS * 3600000),
    { signal: AbortSignal.timeout(MOISTURE_TIMEOUT_MS) });
  if(!res.ok) throw new Error('THREDDS ' + res.status);
  const file = readNetCDF(await res.arrayBuffer());
  const find = (test) => file.variables.find(test);
  const lats = values(file, find((v) => v.name === 'latitude'));
  const lons = values(file, find((v) => v.name === 'longitude'));
  const timeVar = find((v) => v.name === 'time');
  const data = find((v) => v.name.startsWith('Precipitable_water'));
  const hours = values(file, timeVar);
  const since = Date.parse(timeVar.attributes.units.replace(/^Hour since /, ''));

  const rows = lats.length, cols = lons.length, count = hours.length, north = lats[0] > lats[rows - 1];
  const bytes = new Uint8Array(count * rows * cols);
  const view = file.view;
  for(let f = 0, i = 0; f < count; f++){
    for(let r = 0; r < rows; r++){
      let from = data.begin + (f * rows + (north ? rows - 1 - r : r)) * cols * 4;
      for(let c = 0; c < cols; c++, i++, from += 4){
        bytes[i] = Math.min(255, Math.round(view.getFloat32(from) * MOISTURE_SCALE));
      }
    }
  }
  return { bytes, header: {
    start: new Date(since + hours[0] * 3600000).toISOString(),
    stepHours: hours[1] - hours[0],
    frames: count,
    lat: { from: Math.min(lats[0], lats[rows - 1]), step: Math.abs(lats[1] - lats[0]), count: rows },
    lon: { from: lons[0] - 360, step: lons[1] - lons[0], count: cols }
  } };
}

async function coarseMoisture(){
  const { lat, lon } = COARSE_GRID;
  const lats = [], lons = [];
  for(let r = 0; r < lat.count; r++){
    for(let c = 0; c < lon.count; c++){
      lats.push(lat.from + r * lat.step);
      lons.push(lon.from + c * lon.step);
    }
  }
  const points = await getJSON('https://api.open-meteo.com/v1/gfs?latitude=' + lats.join(',') + '&longitude=' + lons.join(',') +
    '&hourly=total_column_integrated_water_vapour&forecast_hours=84&temporal_resolution=hourly_6&timezone=GMT');
  const times = points[0].hourly.time;
  const bytes = new Uint8Array(times.length * points.length);
  times.forEach((_, f) => points.forEach((p, i) => {
    bytes[f * points.length + i] = Math.min(255, Math.round((p.hourly.total_column_integrated_water_vapour[f] || 0) * MOISTURE_SCALE));
  }));
  return { bytes, header: { start: times[0] + ':00Z', stepHours: 6, frames: times.length, lat, lon } };
}

async function mostRain(towns){
  const shortlist = towns.slice(0, RAIN_SHORTLIST);
  const results = await Promise.allSettled(shortlist.map((t) => nwsRain(t.s.lat, t.s.lon)));
  const checked = shortlist.flatMap((t, i) => results[i].status === 'fulfilled' ? [{ ...t, rain: results[i].value }] : []);
  const top = checked.length ? checked.sort((a, b) => b.rain - a.rain)[0] : towns[0];
  return { name: top.s.name, where: top.s.where, ft: Math.round(top.ft), inches: round(top.rain), source: checked.length ? 'NWS' : 'Open-Meteo' };
}

// Inches of rain in the next 7 days at a point: total water, less the water in any snow.
async function nwsRain(lat, lon){
  const point = await getNWS('https://api.weather.gov/points/' + lat + ',' + lon);
  const grid = (await getNWS(point.properties.forecastGridData)).properties;
  const start = Date.now(), end = start + 7 * 86400000;
  const water = inWindow(grid.quantitativePrecipitation.values, start, end);
  const snow = inWindow(grid.snowfallAmount.values, start, end);
  return Math.max(0, water - snow / SNOW_TO_WATER) / 25.4; // mm to inches
}

// Sums NWS grid values ("2026-11-01T04:00:00+00:00/PT6H"), counting the part of each period in the window.
function inWindow(values, start, end){
  return values.reduce((total, v) => {
    const [from, length] = v.validTime.split('/');
    const m = length.match(/P(?:(\d+)D)?T?(?:(\d+)H)?/);
    const t0 = Date.parse(from), t1 = t0 + ((Number(m[1]) || 0) * 24 + (Number(m[2]) || 0)) * 3600000;
    const overlap = Math.min(t1, end) - Math.max(t0, start);
    return overlap > 0 ? total + (v.value || 0) * overlap / (t1 - t0) : total;
  }, 0);
}

async function getNWS(url){
  const res = await fetch(url, { headers: NWS_HEADERS, signal: AbortSignal.timeout(NWS_TIMEOUT_MS) });
  if(!res.ok) throw new Error('NWS ' + res.status);
  return res.json();
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
  if(snow24 >= STORM.extreme.snow || precip24 >= STORM.extreme.precip) return 'extreme';
  if(snow24 >= STORM.big.snow || precip24 >= STORM.big.precip) return 'big';
  if(snow24 >= STORM.mid.snow || precip24 >= STORM.mid.precip) return 'mid';
  return 'none';
}
function sum(list){ return list.reduce((t, v) => t + (Number(v) || 0), 0); }
function round(v, places = 1){ const f = 10 ** places; return Math.round(v * f) / f; }
