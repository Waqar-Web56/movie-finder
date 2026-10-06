const IMG = 'https://image.tmdb.org/t/p/';
const $ = (s) => document.querySelector(s);
const grid = $('#grid'), statusEl = $('#status'), loadMore = $('#loadMore');
const state = { query: '', page: 1, totalPages: 1 };

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const year = (d) => (d ? d.slice(0, 4) : 'TBA');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown');
const rating = (v) => (v ? v.toFixed(1) : 'NR');

async function api(path, params = {}) {
  const qs = new URLSearchParams({ language: 'en-US', ...params });
  let res;
  try { res = await fetch(`/api/${path}?${qs}`); }
  catch { throw new Error('Network error. Check your internet connection and try again.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.status_message || `Request failed (${res.status}).`);
  return data;
}

/* ---------- Rendering ---------- */
function skeletons(n = 10) {
  grid.innerHTML = Array.from({ length: n }, () => '<div class="skeleton"></div>').join('');
}
function showMessage(title, text, retry) {
  statusEl.innerHTML = `<div class="msg"><h3>${esc(title)}</h3><p>${esc(text)}</p>${retry ? '<button id="retryBtn">Try again</button>' : ''}</div>`;
  if (retry) $('#retryBtn').onclick = retry;
}
function cardHTML(m) {
  const poster = m.poster_path
    ? `<img class="poster" loading="lazy" src="${IMG}w342${m.poster_path}" srcset="${IMG}w185${m.poster_path} 185w, ${IMG}w342${m.poster_path} 342w, ${IMG}w500${m.poster_path} 500w" sizes="(min-width:1024px) 200px, 45vw" alt="Poster for ${esc(m.title)}" />`
    : `<div class="poster-empty">No poster available</div>`;
  return `<button class="card" data-id="${m.id}" aria-label="${esc(m.title)}, ${year(m.release_date)}, rated ${rating(m.vote_average)}">
    ${poster}<span class="badge">★ ${rating(m.vote_average)}</span>
    <div class="card-info"><p class="card-title">${esc(m.title)}</p><p class="text-mist text-sm mt-1">${year(m.release_date)}</p></div></button>`;
}

/* ---------- Loading lists ---------- */
async function load(append = false) {
  statusEl.innerHTML = '';
  if (!append) skeletons();
  loadMore.classList.add('hidden');
  try {
    const data = state.query
      ? await api('search/movie', { query: state.query, page: state.page, include_adult: 'false' })
      : await api('trending/movie/week', { page: state.page });
    state.totalPages = Math.min(data.total_pages, 500);
    if (!append) grid.innerHTML = '';
    if (!data.results.length && !append) {
      $('#resultCount').textContent = '';
      return showMessage('No movies found', `We couldn't find anything for "${state.query}". Check the spelling or try another title.`);
    }
    grid.insertAdjacentHTML('beforeend', data.results.map(cardHTML).join(''));
    if (state.query) $('#resultCount').textContent = `${data.total_results.toLocaleString()} results`;
    loadMore.classList.toggle('hidden', state.page >= state.totalPages);
  } catch (e) {
    if (!append) grid.innerHTML = '';
    showMessage('Something went wrong', e.message, () => load(append));
  }
}

function runSearch(q) {
  state.query = q.trim(); state.page = 1;
  $('#sectionTitle').textContent = state.query ? `Results for "${state.query}"` : 'Trending this week';
  $('#resultCount').textContent = '';
  load();
}

/* ---------- Events ---------- */
$('#searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  runSearch($('#searchInput').value);
  $('#main').scrollIntoView({ behavior: 'smooth' });
});
let timer;
$('#searchInput').addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => { if (e.target.value.trim() !== state.query) runSearch(e.target.value); }, 500);
});
loadMore.addEventListener('click', () => { state.page++; load(true); });
grid.addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) openModal(c.dataset.id); });

/* ---------- Details modal ---------- */
const modal = $('#modal'), body = $('#modalBody');
let lastFocus;
async function openModal(id) {
  lastFocus = document.activeElement;
  modal.classList.remove('hidden'); document.body.style.overflow = 'hidden';
  body.innerHTML = '<div class="p-10 text-center text-mist">Loading details…</div>';
  $('.modal-close').focus();
  try {
    const m = await api(`movie/${id}`);
    const hrs = m.runtime ? `${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m` : 'N/A';
    const money = (n) => (n ? '$' + n.toLocaleString() : 'N/A');
    body.innerHTML = `
      <div class="backdrop-img" style="${m.backdrop_path ? `background-image:url(${IMG}w780${m.backdrop_path})` : 'background:#20254a'}"></div>
      <div class="detail">
        <div>${m.poster_path ? `<img class="poster" src="${IMG}w500${m.poster_path}" alt="Poster for ${esc(m.title)}" />` : '<div class="poster-empty" style="width:130px">No poster</div>'}</div>
        <div>
          <h2 id="mTitle" class="font-display font-extrabold text-3xl leading-tight">${esc(m.title)} <span class="text-mist text-xl font-semibold">(${year(m.release_date)})</span></h2>
          ${m.tagline ? `<p class="text-gold italic mt-1">${esc(m.tagline)}</p>` : ''}
          <div class="flex flex-wrap gap-2 mt-4">${(m.genres || []).map((g) => `<span class="chip">${esc(g.name)}</span>`).join('')}</div>
          <p class="mt-4 text-slate-200 leading-relaxed max-w-prose">${esc(m.overview) || 'No description available.'}</p>
          <div class="facts mt-5">
            <div class="fact"><span>Rating</span><b class="text-gold">★ ${rating(m.vote_average)}</b> <small class="text-mist">(${m.vote_count.toLocaleString()})</small></div>
            <div class="fact"><span>Release date</span><b>${fmtDate(m.release_date)}</b></div>
            <div class="fact"><span>Runtime</span><b>${hrs}</b></div>
            <div class="fact"><span>Language</span><b>${esc((m.spoken_languages?.[0]?.english_name) || 'N/A')}</b></div>
            <div class="fact"><span>Budget</span><b>${money(m.budget)}</b></div>
            <div class="fact"><span>Revenue</span><b>${money(m.revenue)}</b></div>
            <div class="fact"><span>Status</span><b>${esc(m.status)}</b></div>
            <div class="fact"><span>Studio</span><b>${esc(m.production_companies?.[0]?.name || 'N/A')}</b></div>
          </div>
          <a class="inline-block mt-5 text-gold underline" target="_blank" rel="noopener" href="https://www.themoviedb.org/movie/${m.id}">View on TMDB</a>
        </div>
      </div>`;
  } catch (e) {
    body.innerHTML = `<div class="msg m-6"><h3>Couldn't load details</h3><p>${esc(e.message)}</p></div>`;
  }
}
function closeModal() {
  modal.classList.add('hidden'); document.body.style.overflow = '';
  lastFocus && lastFocus.focus();
}
modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });

load();
