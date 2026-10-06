// Vercel serverless proxy. Reads keys from Vercel Environment Variables.
const ALLOWED = [/^search\/movie$/, /^trending\/movie\/(day|week)$/, /^movie\/(popular|top_rated|now_playing)$/, /^movie\/\d+$/, /^genre\/movie\/list$/];

module.exports = async (req, res) => {
  const { path: p = '', ...rest } = req.query;
  const endpoint = String(Array.isArray(p) ? p.join('/') : p).replace(/^\/+/, '');
  if (!ALLOWED.some((r) => r.test(endpoint))) return res.status(404).json({ status_message: 'Endpoint not allowed' });
  const { TMDB_API_KEY, TMDB_READ_TOKEN } = process.env;
  if (!TMDB_API_KEY && !TMDB_READ_TOKEN) return res.status(500).json({ status_message: 'Missing TMDB credentials. Add them in Vercel > Settings > Environment Variables.' });
  const target = new URL('https://api.themoviedb.org/3/' + endpoint);
  Object.entries(rest).forEach(([k, v]) => target.searchParams.set(k, v));
  const headers = { accept: 'application/json' };
  if (TMDB_READ_TOKEN) headers.Authorization = `Bearer ${TMDB_READ_TOKEN}`;
  else target.searchParams.set('api_key', TMDB_API_KEY);
  try {
    const r = await fetch(target, { headers });
    res.status(r.status).json(await r.json());
  } catch {
    res.status(502).json({ status_message: 'Could not reach TMDB' });
  }
};
