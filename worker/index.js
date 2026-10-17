// rdrew.com runs every request through this Worker before the static files (run_worker_first).
// The homepage and the shared /assets/ folder (styles, scripts, project thumbnails) stay public.
// Everything else, project pages and their media, needs the site password. Entering it sets a
// session cookie, so it isn't asked again until the browser is closed.

// SHA-256 of the password, and of the value the session cookie carries. To change the password:
//   printf '%s' 'newpassword' | shasum -a 256
//   printf '%s' 'rdrew-session:newpassword' | shasum -a 256
const PASSWORD_SHA256 = '3ff74a580f8b39f039822455e92c2ef25658229622f16dc0f9918222c0be4900';
const SESSION_TOKEN = '219f22e2cc1c1344d4ea4ba1cdbc59e4a24982bcc1afc1f7cc7e01dd4d756651';
const COOKIE = 'rdrew_access';
const UNLOCK_PATH = '/__unlock';

const PUBLIC_PATHS = [/^\/$/, /^\/index\.html$/, /^\/assets\//, /^\/gate(\.html)?$/, /^\/favicon\.ico$/, /^\/robots\.txt$/];

export default {
  async fetch(request, env){
    const url = new URL(request.url);
    if(url.pathname === UNLOCK_PATH) return unlock(request);
    if(PUBLIC_PATHS.some((re) => re.test(url.pathname))) return env.ASSETS.fetch(request);
    if(readCookie(request, COOKIE) !== SESSION_TOKEN) return gate(request, env);

    // Unlocked: serve the file, but keep it out of shared caches.
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    out.headers.set('Cache-Control', 'private, no-cache');
    out.headers.set('X-Robots-Tag', 'noindex');
    return out;
  }
};

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
