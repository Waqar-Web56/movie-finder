# ReelFind – Movie Search

HTML + CSS + JavaScript + Tailwind (CDN) frontend with a tiny zero-dependency Node server.

## Run
1. Install Node.js 18+ (https://nodejs.org)
2. In this folder run: `npm start`
3. Open http://localhost:3000

## Env file
Credentials live in `.env` (TMDB_API_KEY, TMDB_READ_TOKEN, PORT). The server reads them and
proxies requests to TMDB, so your token is never exposed in browser code.
Do not commit `.env` (already in `.gitignore`).

## Structure
- server.js – static server + TMDB proxy
- public/index.html, css/style.css, js/app.js – the website

## Deploy on Vercel
1. Push/upload the project (the `.env` file is NOT uploaded – that is normal).
2. Vercel > Project > Settings > Environment Variables: add TMDB_API_KEY and TMDB_READ_TOKEN (all environments).
3. Redeploy. `api/tmdb.js` + `vercel.json` handle the API proxy.
