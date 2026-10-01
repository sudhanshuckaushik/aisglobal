// Monthly news refresh for every AIS chapter country.
// Pulls recent headlines about Indian and international students from Google News search feeds,
// drops study-abroad marketing and evergreen guides, tags each story, and writes data/news.json.
// Run: node scripts/fetch-news.js   (Node 18+, no dependencies)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'news.json');
const DAYS = 40;          // look-back window; the job runs monthly
const PER_COUNTRY = 5;

global.window = {};
eval(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'));
const CH = window.AIS_CHAPTERS;
const slug = c => c.country.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// how each country is named in headlines
const TERMS = {
  'United States': ['US', 'U.S.', 'USA', 'America', 'American', 'United States'],
  'UAE': ['UAE', 'Dubai', 'Abu Dhabi', 'Emirates'],
  'South Korea': ['South Korea', 'Korea', 'Korean', 'Seoul'],
  'Czech Republic': ['Czech', 'Czechia', 'Prague'],
  'New Zealand': ['New Zealand', 'NZ', 'Kiwi'],
  'Netherlands': ['Netherlands', 'Dutch', 'Holland', 'Amsterdam'],
  'United Kingdom': ['UK', 'Britain'],
};
const DEMONYM = {
  Australia: ['Australian', 'Sydney', 'Melbourne'], Austria: ['Austrian', 'Vienna'], Belgium: ['Belgian', 'Brussels'], Cyprus: ['Cypriot', 'Nicosia'],
  Denmark: ['Danish', 'Copenhagen'], Estonia: ['Estonian', 'Tallinn'], Finland: ['Finnish', 'Helsinki'], France: ['French', 'Paris'],
  Germany: ['German', 'Berlin', 'Munich'], Hungary: ['Hungarian', 'Budapest'], Ireland: ['Irish', 'Dublin'], Italy: ['Italian', 'Milan', 'Rome'],
  Japan: ['Japanese', 'Tokyo'], Latvia: ['Latvian', 'Riga'], Lithuania: ['Lithuanian', 'Vilnius'], Malaysia: ['Malaysian', 'Kuala Lumpur'],
  Mexico: ['Mexican'], Norway: ['Norwegian', 'Oslo'], Poland: ['Polish', 'Warsaw'], Portugal: ['Portuguese', 'Lisbon'],
  Singapore: ['Singaporean'], Spain: ['Spanish', 'Madrid', 'Barcelona'], Sweden: ['Swedish', 'Stockholm'], Switzerland: ['Swiss', 'Zurich', 'Geneva']
};
const termsFor = c => TERMS[c.country] || [c.country].concat(DEMONYM[c.country] || []);

// sources that are study-abroad marketing, lead-gen or press-release wires, not news
const BLOCK_SOURCES = /shiksha|y-axis|leverage ?edu|collegedunia|upgrad|yocket|getmyuni|collegedekho|careers360|jagran ?josh|idp|aecc|si-uk|study\.eu|applyboard|masters ?portal|studyportals|university living|amber|gradright|stoodnt|edvoy|global tree|chopras|ischoolconnect|knowledge musk|leapscholar|leap scholar|prodigy|mpower|idfc first|hdfc credila|avanse|study abroad|overseas education|immigration consult|visa consult|pr newswire|openpr|ein presswire|einpresswire|globenewswire|business wire|medium\.com|linkedin|quora|youtube|facebook|instagram|msn/i;
// evergreen guides and listicles
const EVERGREEN = /\b(\d+ (countries|universities|colleges|cities|ways|jobs|courses|places|destinations)|cheap|cheapest|affordable|study (abroad|globally) in|admissions? open|apply now|webinar|education fair|expo|intake|deadline|courses? (in|for)|top \d+|\d+ (best|reasons|things|tips)|best (universities|colleges|courses|cities)|guide|how to|cost of|list of|requirements|eligibility|step[- ]by[- ]step|checklist|scholarships? (for|to)|tuition fees? (for|in)|updated 20\d\d|everything you need|explained|faqs?|a complete|why study|should you study|pros and cons)\b/i;
const RELEVANT = /\b(student|students|university|universities|campus|studying|graduate|graduates|scholar|scholars|enrol(l)?ment|enrolments?|study visa|study permit|study permits)\b/i;
const ABOUT = /\b(India|Indian|Indians)\b|\b(international|foreign|overseas|non-EU) (student|students|graduates?|enrol(l)?ments?)\b/i;
const NON_LATIN = /[\u0400-\u04FF\u0590-\u06FF\u0900-\u0DFF\u0E00-\u0E7F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;
const POLICY = /\b(visa|visas|permit|work|rule|rules|policy|cap|caps|ban|fee|fees|ministry|government|minister|law|bill|deport|deportation|OPT|H-1B|embassy|consulate)\b/i;

const TAGS = [
  ['Safety', /\b(attack|attacked|assault|safety|safe|death|dead|died|killed|murder|racism|racist|hate|scam|fraud|arrest|arrested|missing|stabbed|shot)\b/i],
  ['Visas', /\b(visa|visas|permit|permits|F-1|study permit|immigration|deport|deportation|SEVIS|embassy|consulate)\b/i],
  ['Work', /\b(work|job|jobs|OPT|H-1B|graduate route|post-study|employment|employers|internship|salary|salaries|career)\b/i],
  ['Money', /\b(fee|fees|cost|costs|loan|loans|tuition|scholarship|scholarships|rent|housing|accommodation|expensive|cheaper)\b/i],
  ['Policy', /\b(government|ministry|minister|policy|cap|caps|rule|rules|law|bill|election|parliament|agreement|MoU|deal)\b/i],
  ['Trends', /\b(record|rise|rises|rising|fall|falls|drop|drops|surge|decline|declines|choose|choice|top destination|numbers|enrolment|enrollment|growth|report|survey|data)\b/i]
];
const tagOf = t => { for (const [name, re] of TAGS) if (re.test(t)) return name; return 'News'; };

const decode = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 70);
// drop a trailing " | Publisher" and mark headlines Google has cut off mid-word
function cleanTitle(t, source) {
  t = t.replace(/\s+[|\u2013-]\s+[^|\u2013-]{2,40}$/, m => (source && m.toLowerCase().includes(source.toLowerCase().slice(0, 6)) ? '' : m)).trim();
  const last = (t.match(/(\S+)$/) || ['', ''])[1];
  const WORDS = /^(a|an|as|at|be|by|do|eu|go|he|if|in|is|it|me|my|no|nz|of|on|or|so|to|uk|up|us|we|ai|and|are|but|can|did|for|get|has|how|its|law|new|not|now|off|one|out|say|see|set|the|top|two|use|war|was|way|who|why|yet|you|job|pay|fee|cap|ban|row|opt|mba|phd|visa)$/i;
  if (t.length >= 95 && /^[A-Za-z]{1,3}$/.test(last) && !WORDS.test(last)) t = t.replace(/\s+\S*$/, '') + '\u2026';
  return t;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function feedUrl(q, loc) {
  const L = { IN: 'hl=en-IN&gl=IN&ceid=IN:en', US: 'hl=en-US&gl=US&ceid=US:en' }[loc];
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${L}`;
}
async function fetchFeed(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIS-news-refresh/1.0; +https://globalindianstudents.org)' } });
      if (r.ok) return await r.text();
    } catch (e) { /* retry */ }
    await sleep(2000 * (i + 1));
  }
  return null;
}
function parse(xml) {
  return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map(it => {
    const g = re => { const m = it.match(re); return m ? decode(m[1]) : ''; };
    const source = g(/<source[^>]*>([\s\S]*?)<\/source>/);
    let title = g(/<title>([\s\S]*?)<\/title>/);
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    title = cleanTitle(title, source);
    return { title, source, url: g(/<link>([\s\S]*?)<\/link>/), date: new Date(g(/<pubDate>([\s\S]*?)<\/pubDate>/)) };
  });
}

function scoreFor(c, item, indianQuery) {
  const terms = termsFor(c);
  const inTitle = terms.some(t => new RegExp('\\b' + t.replace(/[.]/g, '\\.') + '\\b', t.length <= 3 ? '' : 'i').test(item.title));
  if (!inTitle) return -1;                          // the headline itself must name the country
  if (NON_LATIN.test(item.title) || NON_LATIN.test(item.source)) return -1;         // English-language headlines only
  if (!ABOUT.test(item.title)) return -1;            // must be about Indian or international students
  if (!RELEVANT.test(item.title)) return -1;
  if (item.title.split(/\s+/).length < 5) return -1;   // fragments and page titles, not headlines
  if (EVERGREEN.test(item.title)) return -1;
  if (BLOCK_SOURCES.test(item.source) || BLOCK_SOURCES.test(item.title)) return -1;
  let s = 0;
  if (inTitle) s += 3;
  if (/\bindian\b|\bindians\b/i.test(item.title)) s += 2;
  if (POLICY.test(item.title)) s += 1;
  const ageDays = (Date.now() - item.date) / 864e5;
  s += Math.max(0, 1.5 - ageDays / 20);
  return s;
}

(async () => {
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { countries: {} };
  const cutoff = Date.now() - DAYS * 864e5;
  const out = { updated: new Date().toISOString(), windowDays: DAYS, countries: {}, volume: {}, top: [] };
  const all = [];
  // regional backup for chapters with little coverage of their own (Europe hosts 21 of the 30 chapters)
  const REGION_Q = { europe: [[['"Indian students" (Europe OR European OR EU OR Schengen)', 'IN'], ['"international students" (Europe OR European OR EU OR Schengen)', 'US'], ['"Indian students" Europe study', 'IN']], ['Europe', 'European', 'EU', 'Schengen']] };
  const regional = {};
  for (const [reg, [qs, words]] of Object.entries(REGION_Q)) {
    let pool = [];
    for (const [q, loc] of qs) { const xml = await fetchFeed(feedUrl(`${q} when:${DAYS}d`, loc)); await sleep(1200); if (xml) pool = pool.concat(parse(xml)); }
    const seen = new Set();
    regional[reg] = pool.filter(it => {
      const k = norm(it.title);
      if (!it.title || isNaN(it.date) || it.date < cutoff || seen.has(k)) return false;
      seen.add(k);
      return words.some(w => new RegExp('\\b' + w + '\\b', w.length <= 3 ? '' : 'i').test(it.title)) && RELEVANT.test(it.title) && it.title.split(/\s+/).length >= 5 && ABOUT.test(it.title) && !EVERGREEN.test(it.title) && !NON_LATIN.test(it.title) && !BLOCK_SOURCES.test(it.source);
    }).sort((a, b) => b.date - a.date).slice(0, 4)
      .map(it => ({ title: it.title, source: it.source, url: it.url, date: it.date.toISOString().slice(0, 10), tag: tagOf(it.title), score: 0, region: true }));
    out.regional = out.regional || {}; out.regional[reg] = regional[reg];
    console.log('regional', reg, regional[reg].length);
  }
  for (const c of CH) {
    const terms = termsFor(c).slice(0, 4).map(t => (t.includes(' ') ? `"${t}"` : t)).join(' OR ');
    const queries = [
      [`"Indian students" (${terms}) when:${DAYS}d`, 'IN', true],
      [`"Indian student" (${terms}) when:${DAYS}d`, 'IN', true],
      [`"international students" (${terms}) when:${DAYS}d`, 'US', false]
    ];
    const seen = new Set(), picked = [];
    let ok = 0;
    for (const [q, loc, indian] of queries) {
      const xml = await fetchFeed(feedUrl(q, loc));
      await sleep(1200);
      if (!xml) continue;
      ok++;
      for (const it of parse(xml)) {
        if (!it.title || isNaN(it.date) || it.date < cutoff) continue;
        const k = norm(it.title);
        if (seen.has(k)) continue;
        const s = scoreFor(c, it, indian);
        if (s < 0) continue;
        seen.add(k);
        picked.push({ ...it, score: s });
      }
    }
    let items = picked.sort((a, b) => b.score - a.score).slice(0, PER_COUNTRY)
      .sort((a, b) => b.date - a.date)
      .map(it => ({ title: it.title, source: it.source, url: it.url, date: it.date.toISOString().slice(0, 10), tag: tagOf(it.title), score: +it.score.toFixed(2) }));
    const key = slug(c);
    if (!ok && prev.countries[key]) items = prev.countries[key];   // feed failed: keep last month
    const own = items.length;
    if (items.length < 3 && regional[c.region]) items = items.concat(regional[c.region].filter(r => !items.some(i => norm(i.title) === norm(r.title))).slice(0, 3 - items.length));
    out.countries[key] = items;
    out.volume[key] = ok ? picked.length : ((prev.volume || {})[key] || items.length);
    items.filter(it => !it.region).forEach(it => all.push({ ...it, country: c.country, iso: c.iso, slug: key }));
    console.log(`${c.country.padEnd(15)} ${String(own).padStart(2)} own + ${items.length - own} regional${ok ? '' : ' (kept previous)'}`);
  }
  // cross-chapter "monthly brief": best-scoring stories, at most two per country, no repeats
  const used = new Set(), per = {};
  all.sort((a, b) => b.score - a.score).forEach(it => {
    const k = norm(it.title);
    if (used.has(k) || (per[it.iso] || 0) >= 2 || out.top.length >= 8) return;
    used.add(k); per[it.iso] = (per[it.iso] || 0) + 1; out.top.push(it);
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log('wrote', OUT, 'top', out.top.length);
})();
