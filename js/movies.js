// ============================================================
// UBG PRO — MOVIES & TV
// Browses TMDB for popular / search results, then opens a
// dedicated player modal with many alternate embed sources.
// ============================================================

const TMDB_KEY  = "fb7bb23f03b6994dafc674c074d01761";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG  = "https://image.tmdb.org/t/p/w500";
const TMDB_STILL= "https://image.tmdb.org/t/p/w300";

// Each source: m = movie URL template, t = tv URL template.
// {id} = TMDB id, {s} = season, {e} = episode.
const MEDIA_SOURCES = [
  { id:"vidlink",     name:"VidLink",
    m:"https://vidlink.pro/movie/{id}",
    t:"https://vidlink.pro/tv/{id}/{s}/{e}" },

  { id:"vidsrcCc",    name:"VidSrc CC",
    m:"https://vidsrc.cc/v2/embed/movie/{id}?autoPlay=true",
    t:"https://vidsrc.cc/v2/embed/tv/{id}/{s}/{e}?autoPlay=true" },

  { id:"vidsrcXyz",   name:"VidSrc XYZ",
    m:"https://vidsrc.xyz/embed/movie/{id}",
    t:"https://vidsrc.xyz/embed/tv/{id}/{s}/{e}" },

  { id:"vidsrcSu",    name:"VidSrc SU",
    m:"https://vidsrc.su/embed/movie/{id}",
    t:"https://vidsrc.su/embed/tv/{id}/{s}/{e}" },

  { id:"vidsrcRip",   name:"VidSrc RIP",
    m:"https://vidsrc.rip/embed/movie/{id}",
    t:"https://vidsrc.rip/embed/tv/{id}/{s}/{e}" },

  { id:"vidsrcVip",   name:"VidSrc VIP",
    m:"https://vidsrc.vip/embed/movie/{id}",
    t:"https://vidsrc.vip/embed/tv/{id}/{s}/{e}" },

  { id:"twoembed",    name:"2Embed",
    m:"https://www.2embed.cc/embed/{id}",
    t:"https://www.2embed.cc/embedtv/{id}&s={s}&e={e}" },

  { id:"embedsu",     name:"EmbedSU",
    m:"https://embed.su/embed/movie/{id}",
    t:"https://embed.su/embed/tv/{id}/{s}/{e}" },

  { id:"multiembed",  name:"MultiEmbed",
    m:"https://multiembed.mov/?video_id={id}&tmdb=1",
    t:"https://multiembed.mov/?video_id={id}&tmdb=1&s={s}&e={e}" },

  { id:"moviesapi",   name:"MoviesAPI",
    m:"https://moviesapi.club/movie/{id}",
    t:"https://moviesapi.club/tv/{id}-{s}-{e}" },

  { id:"autoembed",   name:"AutoEmbed",
    m:"https://player.autoembed.cc/embed/movie/{id}",
    t:"https://player.autoembed.cc/embed/tv/{id}/{s}/{e}" },

  { id:"videasy",     name:"VidEasy 4K",
    m:"https://player.videasy.net/movie/{id}?color=8b5cf6",
    t:"https://player.videasy.net/tv/{id}/{s}/{e}?color=8b5cf6" },

  { id:"vidfast",     name:"VidFast 4K",
    m:"https://vidfast.pro/movie/{id}",
    t:"https://vidfast.pro/tv/{id}/{s}/{e}" },

  { id:"smashy",      name:"SmashyStream",
    m:"https://player.smashy.stream/movie/{id}",
    t:"https://player.smashy.stream/tv/{id}?s={s}&e={e}" },

  { id:"rive",        name:"RiveStream",
    m:"https://rivestream.org/embed?type=movie&id={id}",
    t:"https://rivestream.org/embed?type=tv&id={id}&season={s}&episode={e}" },

  { id:"pstream",     name:"P-Stream",
    m:"https://iframe.pstream.mov/media/tmdb-movie-{id}",
    t:"https://iframe.pstream.mov/media/tmdb-tv-{id}/{s}/{e}" },

  { id:"mapple",      name:"MappleTv",
    m:"https://mappletv.uk/watch/movie/{id}",
    t:"https://mappletv.uk/watch/tv/{id}-{s}-{e}" },

  { id:"hexa",        name:"Hexa",
    m:"https://hexa.watch/watch/movie/{id}",
    t:"https://hexa.watch/watch/tv/{id}/{s}/{e}" },

  { id:"vidora",      name:"Vidora",
    m:"https://vidora.su/movie/{id}",
    t:"https://vidora.su/tv/{id}/{s}/{e}" },

  { id:"vidify",      name:"Vidify",
    m:"https://vidify.top/embed/movie/{id}",
    t:"https://vidify.top/embed/tv/{id}/{s}/{e}" },

  { id:"vidjoy",      name:"VidJoy",
    m:"https://vidjoy.pro/embed/movie/{id}",
    t:"https://vidjoy.pro/embed/tv/{id}/{s}/{e}" },

  { id:"flicky",      name:"Flicky",
    m:"https://flicky.host/embed/movie/?id={id}",
    t:"https://flicky.host/embed/tv/{id}/{s}/{e}" },

  { id:"oneoneone",   name:"111Movies",
    m:"https://111movies.com/movie/{id}",
    t:"https://111movies.com/tv/{id}/{s}/{e}" },

  { id:"oneTwoThree", name:"123Embed",
    m:"https://play2.123embed.net/movie/{id}",
    t:"https://play2.123embed.net/tv/{id}/{s}/{e}" },
];

function buildMediaUrl(src, type, id, season, episode) {
  const tmpl = type === "tv" ? src.t : src.m;
  return tmpl
    .replace(/\{id\}/g, id)
    .replace(/\{s\}/g, season || 1)
    .replace(/\{e\}/g, episode || 1);
}

async function tmdbFetch(path, params = {}) {
  const qs = new URLSearchParams({ api_key: TMDB_KEY, ...params }).toString();
  const res = await fetch(`${TMDB_BASE}${path}?${qs}`, {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}
