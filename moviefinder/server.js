// Zero-dependency server: serves /public and proxies TMDB so your keys stay in .env (never sent to the browser).
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach((l) => {
    const m = l.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !l.trim().startsWith('#') && !(m[1] in process.env)) process.env[m[1]] = m[2];
  });
} catch { console.warn('No .env file found.'); }

const { TMDB_API_KEY, TMDB_READ_TOKEN, PORT = 3000 } = process.env;
const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
// Only these TMDB endpoints are allowed through the proxy
const ALLOWED = [/^search\/movie$/, /^trending\/movie\/(day|week)$/, /^movie\/(popular|top_rated|now_playing)$/, /^movie\/\d+$/, /^genre\/movie\/list$/];

const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

async function proxy(req, res, url) {
  const endpoint = url.pathname.replace(/^\/api\//, '');
  if (!ALLOWED.some((r) => r.test(endpoint))) return json(res, 404, { status_message: 'Endpoint not allowed' });
  if (!TMDB_READ_TOKEN && !TMDB_API_KEY) return json(res, 500, { status_message: 'Missing TMDB credentials in .env' });
  const target = new URL('https://api.themoviedb.org/3/' + endpoint);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  const headers = { accept: 'application/json' };
  if (TMDB_READ_TOKEN) headers.Authorization = `Bearer ${TMDB_READ_TOKEN}`;
  else target.searchParams.set('api_key', TMDB_API_KEY);
  try {
    const r = await fetch(target, { headers });
    json(res, r.status, await r.json());
  } catch (e) { json(res, 502, { status_message: 'Could not reach TMDB' }); }
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return proxy(req, res, url);
  let file = path.normalize(path.join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`ReelFind running → http://localhost:${PORT}`));
