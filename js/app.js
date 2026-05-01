// ============================================================
// UBG PRO — CORE APP LOGIC
// Navigation, search, game cards, modal, categories
// ============================================================

let currentCat = "all";
let currentSearch = "";

// ============================================================
// PAGE ROUTING
// ============================================================
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.page === pageId);
  });

  // Lazy populate on navigate
  if (pageId === "games") renderAllGamesPage();
  if (pageId === "unity") renderUnityPage();
  if (pageId === "movies") renderMoviesPage();
}

// ============================================================
// GAME CARD BUILDER
// ============================================================
function buildCard(game) {
  const card = document.createElement("div");
  card.className = "game-card";
  
  const thumbHtml = game.thumb 
    ? `<div class="game-thumb"><img src="${game.thumb}" alt="${game.name}" loading="lazy"/>`
    : `<div class="game-thumb-placeholder" style="background: linear-gradient(135deg, ${hashColor(game.id)}, ${hashColor(game.id + 50)})"><span style="font-size:2.8rem">${game.emoji}</span>`;

  card.innerHTML = `
    ${thumbHtml}
      <div class="game-overlay">
        <div class="play-btn"><i class="fas fa-play"></i></div>
      </div>
    </div>
    <div class="game-info">
      <div class="game-name">${game.name}</div>
      <div class="game-meta">
        <span class="game-cat-tag">${game.cat}</span>
        ${game.unity ? '<span class="game-cat-tag" style="background:rgba(6,182,212,0.12);color:#06b6d4">Unity</span>' : ''}
      </div>
    </div>
  `;
  card.addEventListener("click", () => openGame(game));
  return card;
}

function hashColor(id) {
  const colors = [
    "#1e1e40","#1a2a3a","#1e2a20","#2a1a2a","#1a1a3a",
    "#2a1e1e","#1e2a2a","#2a2a1a","#1a2a1a","#2a1e2a"
  ];
  return colors[id % colors.length];
}

// ============================================================
// RENDER HOME PAGE
// ============================================================
function renderHome() {
  // Featured
  const featured = GAMES.filter(g => g.featured);
  const featuredGrid = document.getElementById("featuredGrid");
  if (featuredGrid) {
    featuredGrid.innerHTML = "";
    featured.forEach(g => featuredGrid.appendChild(buildCard(g)));
  }

  // All games grid (home)
  renderGameGrid("gameGrid", GAMES);
  document.getElementById("gameCount").textContent = `${GAMES.length} games`;

  // Clone cat filters to all games page
  cloneCatFilters();
}

// ============================================================
// RENDER GAME GRID WITH FILTER
// ============================================================
function renderGameGrid(containerId, games) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = "";
  let filtered = games;
  if (currentCat !== "all") filtered = filtered.filter(g => g.cat === currentCat);
  if (currentSearch) filtered = filtered.filter(g => g.name.toLowerCase().includes(currentSearch.toLowerCase()));
  filtered.forEach(g => grid.appendChild(buildCard(g)));
}

function renderAllGamesPage() {
  renderGameGrid("gameGrid2", GAMES);
  document.getElementById("gameCount2").textContent = `${GAMES.length} games`;
}

function renderUnityPage() {
  const unityGames = GAMES.filter(g => g.unity || g.cat === "unity");
  const grid = document.getElementById("unityGrid");
  if (!grid) return;
  grid.innerHTML = "";
  unityGames.forEach(g => grid.appendChild(buildCard(g)));
}

// ============================================================
// CATEGORY FILTERS
// ============================================================
function cloneCatFilters() {
  const source = document.getElementById("catFilters");
  const target = document.getElementById("catFilters2");
  if (source && target) {
    target.innerHTML = source.innerHTML;
    setupCatButtons("catFilters2", "gameGrid2");
  }
  setupCatButtons("catFilters", "gameGrid");
}

function setupCatButtons(filterId, gridId) {
  const container = document.getElementById(filterId);
  if (!container) return;
  container.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCat = btn.dataset.cat;
      renderGameGrid(gridId, GAMES);
    });
  });
}

// ============================================================
// SEARCH
// ============================================================
function setupSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  input.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderGameGrid("gameGrid", GAMES);
    renderGameGrid("gameGrid2", GAMES);
    if (document.getElementById("page-anime")?.classList.contains("active")) {
      renderAnimePage();
    }
  });

  // Keyboard shortcut ⌘K / Ctrl+K
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      input.focus();
    }
  });
}

// ============================================================
// GAME MODAL
// ============================================================
let activeGame = null;

function openGame(game) {
  const overlay = document.getElementById("modalOverlay");
  const frame = document.getElementById("gameFrame");
  const title = document.getElementById("modalTitle");
  const cat = document.getElementById("modalCat");

  if (!overlay || !frame) return;

  activeGame = game;

  title.textContent = game.name;
  cat.textContent = game.cat + (game.unity ? " · Unity" : "");
  
  frame.src = game.url;
  
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}



function closeGame() {
  const overlay = document.getElementById("modalOverlay");
  const frame = document.getElementById("gameFrame");
  if (overlay) overlay.classList.remove("open");
  if (frame) frame.src = "about:blank";
  document.body.style.overflow = "";
}

function setupModal() {
  const closeBtn = document.getElementById("closeModal");
  const overlay = document.getElementById("modalOverlay");
  const fsBtn = document.getElementById("fullscreenBtn");
  const frame = document.getElementById("gameFrame");

  if (closeBtn) closeBtn.addEventListener("click", closeGame);
  if (overlay) overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeGame();
  });

  if (fsBtn && frame) {
    fsBtn.addEventListener("click", () => {
      if (frame.requestFullscreen) frame.requestFullscreen();
      else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
    });
  }



  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const overlay = document.getElementById("modalOverlay");
      if (overlay && overlay.classList.contains("open")) closeGame();
    }
  });
}

// ============================================================
// SIDEBAR NAVIGATION
// ============================================================
function setupNav() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(item.dataset.page);
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("open");
      }
    });
  });

  const hamburger = document.getElementById("hamburger");
  const sidebar = document.getElementById("sidebar");
  if (hamburger && sidebar) {
    hamburger.addEventListener("click", () => sidebar.classList.toggle("open"));
  }
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

// Make showToast global (used by cloak.js and proxy.js)
window.showToast = showToast;

// ============================================================
// ANIME PAGE
// ============================================================
let currentAnime = null;        // The clicked anime card data
let currentAnimeMeta = null;    // { id, episodes, slug, title } resolved
let currentPlayer = null;       // ANIME_PLAYERS[i]
let currentEp = 1;
let currentSub = true;
const _anilistCache = new Map();

function buildAnimeCard(anime) {
  const card = document.createElement("div");
  card.className = "game-card";
  card.innerHTML = `
    <div class="game-thumb">
      <img src="${anime.thumb}" alt="${anime.name}" loading="lazy"
           onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'game-thumb-placeholder',innerHTML:'<span style=\\'font-size:2.6rem\\'>📺</span>',style:'background:linear-gradient(135deg,#1e1e40,#2a1e2a)'}))"/>
      <div class="game-overlay">
        <div class="play-btn"><i class="fas fa-play"></i></div>
      </div>
    </div>
    <div class="game-info">
      <div class="game-name">${anime.name}</div>
      <div class="game-meta">
        <span class="game-cat-tag">${anime.tag}</span>
        <span class="game-cat-tag" style="background:rgba(168,85,247,0.12);color:#a855f7">${anime.year}</span>
      </div>
    </div>
  `;
  card.addEventListener("click", () => openAnime(anime));
  return card;
}

function renderAnimePage() {
  const grid = document.getElementById("animeGrid");
  const count = document.getElementById("animeCount");
  if (!grid) return;
  let list = ANIME;
  if (currentSearch) {
    list = list.filter(a => a.name.toLowerCase().includes(currentSearch.toLowerCase()));
  }
  grid.innerHTML = "";
  list.forEach(a => grid.appendChild(buildAnimeCard(a)));
  if (count) count.textContent = `${list.length} titles`;
}

// ============================================================
// ANIME PLAYER — AniList lookup + multi-CDN embed
// ============================================================
async function lookupAniList(anime) {
  // Use the hardcoded ID if we have one; only fetch episodes count
  const cacheKey = anime.anilistId || `name:${anime.name}`;
  if (_anilistCache.has(cacheKey)) return _anilistCache.get(cacheKey);

  const query = anime.anilistId
    ? `query($id:Int){Media(id:$id,type:ANIME){id episodes title{romaji english}}}`
    : `query($s:String){Media(search:$s,type:ANIME){id episodes title{romaji english}}}`;
  const variables = anime.anilistId ? { id: anime.anilistId } : { s: anime.name };

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = await res.json();
  const m = json?.data?.Media;
  if (!m) throw new Error("Not found");
  const result = {
    id: m.id,
    episodes: m.episodes || 12,
    title: m.title?.english || m.title?.romaji || anime.name,
    slug: anime.slug || (anime.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
  };
  _anilistCache.set(cacheKey, result);
  return result;
}

async function openAnime(anime) {
  const overlay  = document.getElementById("animeModalOverlay");
  const title    = document.getElementById("animeModalTitle");
  const meta     = document.getElementById("animeModalMeta");
  const frame    = document.getElementById("animeFrame");
  const epsList  = document.getElementById("animeEpsList");
  if (!overlay || !title || !frame) return;

  currentAnime = anime;
  currentEp = 1;
  currentSub = true;
  currentPlayer = ANIME_PLAYERS[0];

  title.textContent = anime.name;
  meta.textContent = `${anime.tag} · ${anime.year} · loading…`;
  frame.src = "about:blank";
  epsList.innerHTML = `<span class="anime-loading"><i class="fas fa-spinner fa-spin"></i> Loading episodes…</span>`;
  document.body.style.overflow = "hidden";
  overlay.classList.add("open");

  buildPlayerTabs();
  buildSubDubTabs();

  try {
    currentAnimeMeta = await lookupAniList(anime);
    meta.textContent = `${anime.tag} · ${anime.year} · ${currentAnimeMeta.episodes} episodes`;
    buildEpisodeList(currentAnimeMeta.episodes);
    loadCurrentEp();
  } catch (e) {
    console.warn("AniList lookup failed:", e);
    // Fallback: try with whatever data we have, using the anilistId on the card
    if (anime.anilistId) {
      currentAnimeMeta = { id: anime.anilistId, episodes: 24, slug: anime.slug, title: anime.name };
      meta.textContent = `${anime.tag} · ${anime.year} · 24 eps (estimate)`;
      buildEpisodeList(24);
      loadCurrentEp();
    } else {
      meta.textContent = "Could not look this up — try another title.";
      epsList.innerHTML = `<span class="anime-loading">Lookup failed.</span>`;
    }
  }
}

function buildPlayerTabs() {
  const tabs = document.getElementById("animePlayerTabs");
  if (!tabs) return;
  tabs.innerHTML = ANIME_PLAYERS.map(p =>
    `<button class="anime-tab ${p.id === currentPlayer.id ? "active" : ""}" data-pid="${p.id}">${p.name}</button>`
  ).join("");
  tabs.querySelectorAll(".anime-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      currentPlayer = ANIME_PLAYERS.find(p => p.id === btn.dataset.pid);
      tabs.querySelectorAll(".anime-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadCurrentEp();
    });
  });
}

function buildSubDubTabs() {
  const tabs = document.getElementById("animeSubDubTabs");
  if (!tabs) return;
  tabs.querySelectorAll(".anime-tab").forEach(btn => {
    btn.classList.toggle("active", (btn.dataset.mode === "sub") === currentSub);
    btn.onclick = () => {
      currentSub = btn.dataset.mode === "sub";
      tabs.querySelectorAll(".anime-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadCurrentEp();
    };
  });
}

function buildEpisodeList(count) {
  const list = document.getElementById("animeEpsList");
  if (!list) return;
  list.innerHTML = "";
  const safeCount = Math.max(1, Math.min(count || 12, 2000));
  for (let i = 1; i <= safeCount; i++) {
    const b = document.createElement("button");
    b.className = "ep-btn" + (i === currentEp ? " active" : "");
    b.textContent = i;
    b.title = `Episode ${i}`;
    b.addEventListener("click", () => {
      currentEp = i;
      list.querySelectorAll(".ep-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      loadCurrentEp();
    });
    list.appendChild(b);
  }
}

function loadCurrentEp() {
  const frame = document.getElementById("animeFrame");
  if (!frame || !currentAnimeMeta || !currentPlayer) return;
  const url = currentPlayer.build(
    currentAnimeMeta.id,
    currentEp,
    currentSub,
    currentAnimeMeta.slug
  );
  frame.src = url;
}

function closeAnime() {
  const overlay = document.getElementById("animeModalOverlay");
  const frame   = document.getElementById("animeFrame");
  if (overlay) overlay.classList.remove("open");
  if (frame) frame.src = "about:blank";
  document.body.style.overflow = "";
}

function setupAnimeModal() {
  const closeBtn = document.getElementById("closeAnimeModal");
  const overlay  = document.getElementById("animeModalOverlay");
  const fsBtn    = document.getElementById("animeFullscreenBtn");
  const frame    = document.getElementById("animeFrame");

  if (closeBtn) closeBtn.addEventListener("click", closeAnime);
  if (overlay) overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeAnime();
  });
  if (fsBtn && frame) fsBtn.addEventListener("click", () => {
    if (frame.requestFullscreen) frame.requestFullscreen();
    else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && overlay.classList.contains("open")) closeAnime();
  });
}

// ============================================================
// MOVIES & TV PAGE
// ============================================================
let mediaType = "movie";        // "movie" | "tv"
let mediaPage = 1;
let mediaSearch = "";
let mediaItems = [];
let mediaSearchTimer = null;
let _mediaPageInit = false;

let currentMedia = null;        // { id, type, title, ... }
let currentMediaSource = MEDIA_SOURCES[0];
let currentSeason = 1;
let currentEpisode = 1;
let currentSeasonsData = [];    // [{ season_number, episode_count }, ...]
const _seasonCache = new Map(); // key `${tvId}-${season}` -> episodes[]

function buildMediaCard(item) {
  const card = document.createElement("div");
  card.className = "game-card";
  const title = item.title || item.name || "Untitled";
  const year  = (item.release_date || item.first_air_date || "").slice(0, 4) || "—";
  const poster = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : "";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

  const thumbHtml = poster
    ? `<div class="game-thumb"><img src="${poster}" alt="${title}" loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=\\'game-thumb-placeholder\\' style=\\'background:linear-gradient(135deg,#1e1e40,#2a1e2a)\\'><span style=\\'font-size:2.6rem\\'>🎬</span></div>'"/>`
    : `<div class="game-thumb-placeholder" style="background:linear-gradient(135deg,#1e1e40,#2a1e2a)"><span style="font-size:2.6rem">🎬</span>`;

  card.innerHTML = `
    ${thumbHtml}
      <div class="game-overlay">
        <div class="play-btn"><i class="fas fa-play"></i></div>
      </div>
    </div>
    <div class="game-info">
      <div class="game-name">${title}</div>
      <div class="game-meta">
        <span class="game-cat-tag">${year}</span>
        ${rating ? `<span class="game-cat-tag" style="background:rgba(245,158,11,0.12);color:#f59e0b"><i class="fas fa-star"></i> ${rating}</span>` : ""}
      </div>
    </div>
  `;
  card.addEventListener("click", () => openMedia(item, mediaType));
  return card;
}

async function loadMediaList() {
  const grid = document.getElementById("mediaGrid");
  const label = document.getElementById("mediaPageLabel");
  if (!grid) return;
  grid.innerHTML = `<div class="anime-loading" style="grid-column:1/-1"><i class="fas fa-spinner fa-spin"></i> Loading…</div>`;
  if (label) label.textContent = `Page ${mediaPage}`;

  try {
    let data;
    if (mediaSearch.trim()) {
      data = await tmdbFetch(`/search/${mediaType}`, { query: mediaSearch.trim(), page: mediaPage });
    } else {
      data = await tmdbFetch(`/${mediaType}/popular`, { page: mediaPage });
    }
    mediaItems = (data.results || []).filter(x => x.poster_path);
    grid.innerHTML = "";
    if (mediaItems.length === 0) {
      grid.innerHTML = `<div class="anime-loading" style="grid-column:1/-1">No results.</div>`;
      return;
    }
    mediaItems.forEach(it => grid.appendChild(buildMediaCard(it)));
  } catch (e) {
    console.warn("TMDB fetch failed:", e);
    grid.innerHTML = `<div class="anime-loading" style="grid-column:1/-1">Could not reach TMDB. Check your connection.</div>`;
  }
}

function setupMediaPageOnce() {
  if (_mediaPageInit) return;
  _mediaPageInit = true;

  document.querySelectorAll("#mediaTypeTabs .cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#mediaTypeTabs .cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mediaType = btn.dataset.mtype;
      mediaPage = 1;
      mediaSearch = "";
      const inp = document.getElementById("mediaSearchInput");
      if (inp) inp.value = "";
      loadMediaList();
    });
  });

  const inp = document.getElementById("mediaSearchInput");
  if (inp) {
    inp.addEventListener("input", (e) => {
      mediaSearch = e.target.value;
      mediaPage = 1;
      clearTimeout(mediaSearchTimer);
      mediaSearchTimer = setTimeout(loadMediaList, 350);
    });
  }

  const prev = document.getElementById("mediaPrev");
  const next = document.getElementById("mediaNext");
  if (prev) prev.addEventListener("click", () => {
    if (mediaPage > 1) { mediaPage--; loadMediaList(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });
  if (next) next.addEventListener("click", () => {
    mediaPage++; loadMediaList(); window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function renderMoviesPage() {
  setupMediaPageOnce();
  if (mediaItems.length === 0) loadMediaList();
}

// ---------- Watch modal ----------
async function openMedia(item, type) {
  const overlay = document.getElementById("mediaModalOverlay");
  const title   = document.getElementById("mediaModalTitle");
  const meta    = document.getElementById("mediaModalMeta");
  const frame   = document.getElementById("mediaFrame");
  if (!overlay || !frame) return;

  currentMedia = { id: item.id, type, title: item.title || item.name, raw: item };
  currentMediaSource = MEDIA_SOURCES[0];
  currentSeason = 1;
  currentEpisode = 1;

  title.textContent = currentMedia.title;
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  meta.textContent = `${type === "tv" ? "TV Show" : "Movie"}${year ? " · " + year : ""}${item.vote_average ? " · ★ " + item.vote_average.toFixed(1) : ""}`;
  frame.src = "about:blank";

  buildMediaSourceTabs();
  document.getElementById("mediaSeasonRow").style.display   = type === "tv" ? "" : "none";
  document.getElementById("mediaEpisodeRow").style.display  = type === "tv" ? "" : "none";

  document.body.style.overflow = "hidden";
  overlay.classList.add("open");

  if (type === "tv") {
    await loadTvSeasons(item.id);
    buildSeasonTabs();
    await loadSeasonEpisodes(currentSeason);
  }
  loadCurrentMedia();
}

async function loadTvSeasons(tvId) {
  try {
    const data = await tmdbFetch(`/tv/${tvId}`);
    currentSeasonsData = (data.seasons || []).filter(s => s.season_number >= 1);
    if (currentSeasonsData.length === 0) currentSeasonsData = [{ season_number: 1, episode_count: 12 }];
    currentSeason = currentSeasonsData[0].season_number;
  } catch (e) {
    currentSeasonsData = [{ season_number: 1, episode_count: 12 }];
    currentSeason = 1;
  }
}

async function loadSeasonEpisodes(season) {
  const list = document.getElementById("mediaEpisodeList");
  list.innerHTML = `<span class="anime-loading"><i class="fas fa-spinner fa-spin"></i> Loading…</span>`;
  const cacheKey = `${currentMedia.id}-${season}`;
  let episodes;
  if (_seasonCache.has(cacheKey)) {
    episodes = _seasonCache.get(cacheKey);
  } else {
    try {
      const data = await tmdbFetch(`/tv/${currentMedia.id}/season/${season}`);
      episodes = data.episodes || [];
      _seasonCache.set(cacheKey, episodes);
    } catch (e) {
      const sd = currentSeasonsData.find(s => s.season_number === season);
      episodes = Array.from({ length: sd?.episode_count || 12 }, (_, i) => ({ episode_number: i + 1 }));
    }
  }
  buildEpisodeButtons(episodes);
}

function buildMediaSourceTabs() {
  const tabs = document.getElementById("mediaSourceTabs");
  if (!tabs) return;
  tabs.innerHTML = MEDIA_SOURCES.map(s =>
    `<button class="anime-tab ${s.id === currentMediaSource.id ? "active" : ""}" data-sid="${s.id}">${s.name}</button>`
  ).join("");
  tabs.querySelectorAll(".anime-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      currentMediaSource = MEDIA_SOURCES.find(s => s.id === btn.dataset.sid);
      tabs.querySelectorAll(".anime-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadCurrentMedia();
    });
  });
}

function buildSeasonTabs() {
  const tabs = document.getElementById("mediaSeasonTabs");
  if (!tabs) return;
  tabs.innerHTML = currentSeasonsData.map(s =>
    `<button class="anime-tab ${s.season_number === currentSeason ? "active" : ""}" data-snum="${s.season_number}">S${s.season_number}</button>`
  ).join("");
  tabs.querySelectorAll(".anime-tab").forEach(btn => {
    btn.addEventListener("click", async () => {
      currentSeason = parseInt(btn.dataset.snum, 10);
      currentEpisode = 1;
      tabs.querySelectorAll(".anime-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      await loadSeasonEpisodes(currentSeason);
      loadCurrentMedia();
    });
  });
}

function buildEpisodeButtons(episodes) {
  const list = document.getElementById("mediaEpisodeList");
  if (!list) return;
  list.innerHTML = "";
  episodes.forEach(ep => {
    const b = document.createElement("button");
    b.className = "ep-btn" + (ep.episode_number === currentEpisode ? " active" : "");
    b.textContent = ep.episode_number;
    b.title = ep.name ? `Episode ${ep.episode_number}: ${ep.name}` : `Episode ${ep.episode_number}`;
    b.addEventListener("click", () => {
      currentEpisode = ep.episode_number;
      list.querySelectorAll(".ep-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      loadCurrentMedia();
    });
    list.appendChild(b);
  });
}

function loadCurrentMedia() {
  const frame = document.getElementById("mediaFrame");
  if (!frame || !currentMedia) return;
  frame.src = buildMediaUrl(currentMediaSource, currentMedia.type, currentMedia.id, currentSeason, currentEpisode);
}

function closeMedia() {
  const overlay = document.getElementById("mediaModalOverlay");
  const frame   = document.getElementById("mediaFrame");
  if (overlay) overlay.classList.remove("open");
  if (frame) frame.src = "about:blank";
  document.body.style.overflow = "";
}

function setupMediaModal() {
  const closeBtn = document.getElementById("closeMediaModal");
  const overlay  = document.getElementById("mediaModalOverlay");
  const fsBtn    = document.getElementById("mediaFullscreenBtn");
  const frame    = document.getElementById("mediaFrame");

  if (closeBtn) closeBtn.addEventListener("click", closeMedia);
  if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay) closeMedia(); });
  if (fsBtn && frame) fsBtn.addEventListener("click", () => {
    if (frame.requestFullscreen) frame.requestFullscreen();
    else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && overlay.classList.contains("open")) closeMedia();
  });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  renderHome();
  setupSearch();
  setupModal();
  setupAnimeModal();
  setupMediaModal();
  setupNav();
  showPage("home");
});
