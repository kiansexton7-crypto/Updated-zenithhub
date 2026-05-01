// ============================================================
// UBG PRO — ANIME LIBRARY
// Click an anime → looks it up on AniList → opens a video CDN
// player with episode buttons + sub/dub + alternate player tabs.
// No website navigation: only the player.
// ============================================================

// Embed providers. Each takes (anilistId, episode, isSub) → URL.
// Multiple are included so the user can switch if one is broken.
const ANIME_PLAYERS = [
  { id: "vidsrccc", name: "Player 1",
    build: (id, ep, sub) =>
      `https://vidsrc.cc/v2/embed/anime/ani${id}/${ep}/${sub ? "sub" : "dub"}?autoPlay=true` },

  { id: "vidsrcicu", name: "Player 2",
    build: (id, ep, sub) =>
      `https://vidsrc.icu/embed/anime/${id}/${ep}/${sub ? 0 : 1}` },

  { id: "vidlink", name: "Player 3",
    build: (id, ep, sub) =>
      `https://vidlink.pro/anime/${id}/${ep}/${sub ? "sub" : "dub"}?autoplay=true` },

  { id: "megaplay", name: "Player 4",
    build: (id, ep, sub) =>
      `https://megaplay.buzz/stream/s-2/${id}/${ep}` },

  { id: "twoanime", name: "Player 5",
    build: (id, ep, sub, slug) =>
      `https://2anime.xyz/embed/${slug}-episode-${ep}` },
];

const _animeThumb = (name) =>
  "https://tse2.mm.bing.net/th?q=" +
  encodeURIComponent(name + " anime poster") +
  "&w=320&h=440&c=7";

// `slug` is the gogoanime-style slug used by Player 5 (2anime.xyz).
// `id` (when provided) skips the AniList lookup for known titles.
const _ANIME_RAW = [
  { name: "Jujutsu Kaisen",                year: 2020, tag: "Action",    id: 113415, slug: "jujutsu-kaisen-tv" },
  { name: "Demon Slayer",                  year: 2019, tag: "Action",    id: 101922, slug: "kimetsu-no-yaiba" },
  { name: "Attack on Titan",               year: 2013, tag: "Drama",     id: 16498,  slug: "shingeki-no-kyojin" },
  { name: "One Piece",                     year: 1999, tag: "Adventure", id: 21,     slug: "one-piece" },
  { name: "Naruto",                        year: 2002, tag: "Action",    id: 20,     slug: "naruto" },
  { name: "Naruto Shippuden",              year: 2007, tag: "Action",    id: 1735,   slug: "naruto-shippuuden" },
  { name: "Boruto Naruto Next Generations",year: 2017, tag: "Action",    id: 97938,  slug: "boruto-naruto-next-generations" },
  { name: "My Hero Academia",              year: 2016, tag: "Action",    id: 21459,  slug: "boku-no-hero-academia" },
  { name: "Chainsaw Man",                  year: 2022, tag: "Action",    id: 127230, slug: "chainsaw-man" },
  { name: "Solo Leveling",                 year: 2024, tag: "Action",    id: 153406, slug: "solo-leveling" },
  { name: "Spy x Family",                  year: 2022, tag: "Comedy",    id: 140960, slug: "spy-x-family" },
  { name: "Bleach",                        year: 2004, tag: "Action",    id: 269,    slug: "bleach" },
  { name: "Bleach Thousand Year Blood War",year: 2022, tag: "Action",    id: 116674, slug: "bleach-sennen-kessen-hen" },
  { name: "Dragon Ball Z",                 year: 1989, tag: "Action",    id: 813,    slug: "dragon-ball-z" },
  { name: "Dragon Ball Super",             year: 2015, tag: "Action",    id: 21087,  slug: "dragon-ball-super" },
  { name: "Hunter x Hunter",               year: 2011, tag: "Adventure", id: 11061,  slug: "hunter-x-hunter-2011" },
  { name: "Death Note",                    year: 2006, tag: "Thriller",  id: 1535,   slug: "death-note" },
  { name: "Tokyo Revengers",               year: 2021, tag: "Action",    id: 120120, slug: "tokyo-revengers" },
  { name: "Tokyo Ghoul",                   year: 2014, tag: "Horror",    id: 20605,  slug: "tokyo-ghoul" },
  { name: "Black Clover",                  year: 2017, tag: "Action",    id: 97940,  slug: "black-clover" },
  { name: "Fairy Tail",                    year: 2009, tag: "Adventure", id: 6702,   slug: "fairy-tail" },
  { name: "Fullmetal Alchemist Brotherhood",year: 2009, tag: "Adventure",id: 5114,   slug: "fullmetal-alchemist-brotherhood" },
  { name: "Cowboy Bebop",                  year: 1998, tag: "Sci-Fi",    id: 1,      slug: "cowboy-bebop" },
  { name: "Steins Gate",                   year: 2011, tag: "Sci-Fi",    id: 9253,   slug: "steins-gate" },
  { name: "Re Zero",                       year: 2016, tag: "Drama",     id: 21355,  slug: "re-zero-kara-hajimeru-isekai-seikatsu" },
  { name: "Mushoku Tensei",                year: 2021, tag: "Fantasy",   id: 108465, slug: "mushoku-tensei-isekai-ittara-honki-dasu" },
  { name: "That Time I Got Reincarnated as a Slime", year: 2018, tag: "Fantasy", id: 101280, slug: "tensei-shitara-slime-datta-ken" },
  { name: "Overlord",                      year: 2015, tag: "Fantasy",   id: 20832,  slug: "overlord" },
  { name: "Sword Art Online",              year: 2012, tag: "Sci-Fi",    id: 11757,  slug: "sword-art-online" },
  { name: "No Game No Life",               year: 2014, tag: "Fantasy",   id: 19815,  slug: "no-game-no-life" },
  { name: "Konosuba",                      year: 2016, tag: "Comedy",    id: 21202,  slug: "kono-subarashii-sekai-ni-shukufuku-wo" },
  { name: "Mob Psycho 100",                year: 2016, tag: "Action",    id: 21507,  slug: "mob-psycho-100" },
  { name: "One Punch Man",                 year: 2015, tag: "Action",    id: 21087,  slug: "one-punch-man" },
  { name: "Frieren Beyond Journey's End",  year: 2023, tag: "Fantasy",   id: 154587, slug: "sousou-no-frieren" },
  { name: "Vinland Saga",                  year: 2019, tag: "Drama",     id: 101348, slug: "vinland-saga" },
  { name: "Made in Abyss",                 year: 2017, tag: "Adventure", id: 97986,  slug: "made-in-abyss" },
  { name: "Kaguya sama Love is War",       year: 2019, tag: "Romance",   id: 101921, slug: "kaguya-sama-wa-kokurasetai-tensai-tachi-no-renai-zunousen" },
  { name: "Horimiya",                      year: 2021, tag: "Romance",   id: 124080, slug: "horimiya" },
  { name: "Toradora",                      year: 2008, tag: "Romance",   id: 4224,   slug: "toradora" },
  { name: "Your Lie in April",             year: 2014, tag: "Drama",     id: 20665,  slug: "shigatsu-wa-kimi-no-uso" },
  { name: "Clannad After Story",           year: 2008, tag: "Drama",     id: 4181,   slug: "clannad-after-story" },
  { name: "Anohana",                       year: 2011, tag: "Drama",     id: 9989,   slug: "anohana-the-flower-we-saw-that-day" },
  { name: "Violet Evergarden",             year: 2018, tag: "Drama",     id: 21827,  slug: "violet-evergarden" },
  { name: "Code Geass",                    year: 2006, tag: "Sci-Fi",    id: 1575,   slug: "code-geass-hangyaku-no-lelouch" },
  { name: "Neon Genesis Evangelion",       year: 1995, tag: "Sci-Fi",    id: 30,     slug: "neon-genesis-evangelion" },
  { name: "Monster",                       year: 2004, tag: "Thriller",  id: 19,     slug: "monster" },
  { name: "Erased",                        year: 2016, tag: "Thriller",  id: 21234,  slug: "boku-dake-ga-inai-machi" },
  { name: "Psycho Pass",                   year: 2012, tag: "Sci-Fi",    id: 13601,  slug: "psycho-pass" },
  { name: "Dr Stone",                      year: 2019, tag: "Adventure", id: 105333, slug: "dr-stone" },
  { name: "Fire Force",                    year: 2019, tag: "Action",    id: 105310, slug: "enen-no-shouboutai" },
  { name: "Assassination Classroom",       year: 2015, tag: "Action",    id: 20755, slug: "ansatsu-kyoushitsu-tv" },
  { name: "Haikyuu",                       year: 2014, tag: "Sports",    id: 20583, slug: "haikyuu" },
  { name: "Kuroko no Basket",              year: 2012, tag: "Sports",    id: 11771, slug: "kuroko-no-basket" },
  { name: "Blue Lock",                     year: 2022, tag: "Sports",    id: 137822,slug: "blue-lock" },
  { name: "Bocchi the Rock",               year: 2022, tag: "Comedy",    id: 130003,slug: "bocchi-the-rock" },
  { name: "JoJo's Bizarre Adventure",      year: 2012, tag: "Action",    id: 14719, slug: "jojo-no-kimyou-na-bouken-tv" },
  { name: "Stone Ocean",                   year: 2021, tag: "Action",    id: 100422,slug: "jojo-no-kimyou-na-bouken-stone-ocean" },
  { name: "Hellsing Ultimate",             year: 2006, tag: "Horror",    id: 1721,  slug: "hellsing-ultimate" },
  { name: "Devilman Crybaby",              year: 2018, tag: "Horror",    id: 98460, slug: "devilman-crybaby" },
  { name: "Parasyte",                      year: 2014, tag: "Horror",    id: 20623, slug: "kiseijuu-sei-no-kakuritsu" },
  { name: "Another",                       year: 2012, tag: "Horror",    id: 11111, slug: "another" },
  { name: "Wind Breaker",                  year: 2024, tag: "Action",    id: 166873,slug: "wind-breaker" },
  { name: "Kaiju No 8",                    year: 2024, tag: "Action",    id: 153288,slug: "kaijuu-8-gou" },
  { name: "Mashle Magic and Muscles",      year: 2023, tag: "Comedy",    id: 158927,slug: "mashle" },
  { name: "Hells Paradise",                year: 2023, tag: "Action",    id: 145064,slug: "jigokuraku" },
  { name: "Heavenly Delusion",             year: 2023, tag: "Sci-Fi",    id: 145139,slug: "tengoku-daimakyou" },
  { name: "Oshi no Ko",                    year: 2023, tag: "Drama",     id: 150672,slug: "oshi-no-ko" },
  { name: "Apothecary Diaries",            year: 2023, tag: "Drama",     id: 161645,slug: "kusuriya-no-hitorigoto" },
  { name: "Dandadan",                      year: 2024, tag: "Action",    id: 171018,slug: "dandadan" },
  { name: "Dungeon Meshi",                 year: 2024, tag: "Fantasy",   id: 153518,slug: "delicious-in-dungeon" },
  { name: "Sakamoto Days",                 year: 2025, tag: "Action",    id: 175498,slug: "sakamoto-days" },
];

const ANIME = _ANIME_RAW.map((a, i) => ({
  id: i + 1,
  anilistId: a.id || null,
  slug: a.slug || null,
  name: a.name,
  year: a.year,
  tag: a.tag,
  thumb: _animeThumb(a.name),
}));
