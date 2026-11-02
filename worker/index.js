// rdrew.com runs every request through this Worker before the static files (run_worker_first).
// The site is public except the projects listed in PROTECTED_PATHS (their pages and media),
// which need the site password. Entering it sets a session cookie, so it isn't asked again
// until the browser is closed. Thumbnails in /assets/ stay public.

// SHA-256 of the password, and of the value the session cookie carries. To change the password:
//   printf '%s' 'newpassword' | shasum -a 256
//   printf '%s' 'rdrew-session:newpassword' | shasum -a 256
const PASSWORD_SHA256 = '3ff74a580f8b39f039822455e92c2ef25658229622f16dc0f9918222c0be4900';
const SESSION_TOKEN = '219f22e2cc1c1344d4ea4ba1cdbc59e4a24982bcc1afc1f7cc7e01dd4d756651';
const COOKIE = 'rdrew_access';
const UNLOCK_PATH = '/__unlock';
// rdrew.com/elnino is the homepage opened straight into the storm tracker (assets/storm-map.js
// reads the path). No trailing slash: the homepage's asset paths are relative.
const TRACKER_PATH = '/elnino';
// The tracker's headline numbers as JSON, for the iOS widget (see elnino.js).
const SUMMARY_PATH = '/elnino.json';
// The Moisture overlay's grid (see elnino.js).
const MOISTURE_PATH = '/elnino-moisture.bin';
// The forecast the tracker's cards draw (see elnino.js).
const FORECAST_PATH = '/elnino-forecast.json';
// The top bar's current weather (see elnino.js).
const WEATHER_PATH = '/elnino-weather.json';
// What a shared rdrew.com/elnino link previews as, in place of the homepage's tags. The image is a
// still of the tracker on the California coast (targets and wind), 1200x630.
const TRACKER_SHARE = {
  title: 'El Niño Tracker',
  description: 'Snow, wind and storm risk across the West Coast through the El Niño winter.',
  url: 'https://rdrew.com/elnino',
  image: 'https://rdrew.com/assets/elnino-share.jpg'
};

// Add a project's folder here to put it behind the password, e.g. /^\/spatial-audio(\/|$)/.
// Empty: the whole site is public.
const PROTECTED_PATHS = [];

import { elninoJSON, forecastJSON, moistureJSON, weatherJSON } from './elnino.js';

export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);
    if(url.pathname === UNLOCK_PATH) return unlock(request);
    if(url.pathname === SUMMARY_PATH) return elninoJSON(request, ctx);
    if(url.pathname === MOISTURE_PATH) return moistureJSON(request, ctx);
    if(url.pathname === FORECAST_PATH) return forecastJSON(request, ctx);
    if(url.pathname === WEATHER_PATH) return weatherJSON(request, ctx);
    if(url.pathname === TRACKER_PATH + '/') return Response.redirect(new URL(TRACKER_PATH, url), 301);
    if(url.pathname === TRACKER_PATH) return trackerPage(request, env);
    if(!PROTECTED_PATHS.some((re) => re.test(url.pathname))) return env.ASSETS.fetch(request);
    if(readCookie(request, COOKIE) !== SESSION_TOKEN) return gate(request, env);

    // Unlocked: serve the file, but keep it out of shared caches.
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    out.headers.set('Cache-Control', 'private, no-cache');
    out.headers.set('X-Robots-Tag', 'noindex');
    return out;
  }
};

// The homepage, with its link-preview tags swapped for the tracker's.
async function trackerPage(request, env){
  const page = await env.ASSETS.fetch(new Request(new URL('/', request.url), request));
  const tags = {
    'og:title': TRACKER_SHARE.title, 'twitter:title': TRACKER_SHARE.title,
    'description': TRACKER_SHARE.description, 'og:description': TRACKER_SHARE.description, 'twitter:description': TRACKER_SHARE.description,
    'og:url': TRACKER_SHARE.url,
    'og:image': TRACKER_SHARE.image, 'twitter:image': TRACKER_SHARE.image,
    'twitter:card': 'summary_large_image'
  };
  return new HTMLRewriter()
    .on('meta', { element(meta){
      const key = meta.getAttribute('property') || meta.getAttribute('name');
      if(key in tags) meta.setAttribute('content', tags[key]);
    } })
    .on('meta[property="og:image"]', { element(meta){
      meta.after('<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">', { html: true });
    } })
    .transform(page);
}

// The gate page answers at the locked URL itself, so unlocking just reloads it.
async function gate(request, env){
  const page = await env.ASSETS.fetch(new Request(new URL('/gate', request.url)));
  return new Response(request.method === 'HEAD' ? null : page.body, {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
  });
}

async function unlock(request){
  if(request.method !== 'POST') return new Response(null, { status: 303, headers: { Location: '/' } });
  const form = await request.formData();
  // Case and stray spaces don't matter, so a phone keyboard's "Tahoe " still works.
  const attempt = String(form.get('password') || '').trim().toLowerCase();
  const ok = (await sha256(attempt)) === PASSWORD_SHA256;
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if(ok) headers.append('Set-Cookie', `${COOKIE}=${SESSION_TOKEN}; Path=/; HttpOnly; Secure; SameSite=Lax`);

  // The gate page submits with fetch and handles the answer itself; a plain form post is redirected back.
  if(request.headers.get('X-Requested-With') === 'fetch') return new Response(null, { status: ok ? 204 : 401, headers });
  headers.set('Location', safePath(form.get('next')));
  return new Response(null, { status: 303, headers });
}

function safePath(value){
  const path = String(value || '/');
  return path.startsWith('/') && !path.startsWith('//') ? path : '/';
}

function readCookie(request, name){
  for(const part of (request.headers.get('Cookie') || '').split(';')){
    const [key, ...rest] = part.trim().split('=');
    if(key === name) return rest.join('=');
  }
  return null;
}

async function sha256(text){
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
