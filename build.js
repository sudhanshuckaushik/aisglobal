// Generates the static chapter pages, the chapters hub, the sitemap and the footer chapter links.
// Run after editing data.js:  node build.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://globalindianstudents.org';
const TODAY = new Date().toISOString().slice(0, 10);

global.window = {};
eval(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'));
const CH = window.AIS_CHAPTERS;
const readJSON = f => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { return null; } };
const NEWS = readJSON('data/news.json');
const LINKS = readJSON('data/links.json') || {};
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmtDay = d => { const x = new Date(d + 'T00:00:00Z'); return x.getUTCDate() + ' ' + MONTHS[x.getUTCMonth()].slice(0, 3); };
const fmtLong = iso => { const x = new Date(iso); return x.getUTCDate() + ' ' + MONTHS[x.getUTCMonth()] + ' ' + x.getUTCFullYear(); };
// the run on the 1st covers the month before it
const coveredMonth = iso => { const x = new Date(new Date(iso).getTime() - 3 * 864e5); return MONTHS[x.getUTCMonth()] + ' ' + x.getUTCFullYear(); };
const tagClass = t => 'news__tag news__tag--' + String(t || 'news').toLowerCase();
function newsList(items, withCountry) {
  return '<ol class="news">' + items.map(it => `<li class="news__i${it.region ? ' news__i--region' : ''}">` +
    `<time datetime="${esc(it.date)}">${esc(fmtDay(it.date))}</time>` +
    `<span class="news__body">` +
      `<span class="news__meta">${withCountry ? `<a class="news__c" href="/chapters/${esc(it.slug)}/">${esc(it.country)}</a>` : ''}${it.region ? '<span class="news__c news__c--region">Across Europe</span>' : ''}<span class="${tagClass(it.tag)}">${esc(it.tag)}</span></span>` +
      `<a class="news__h" href="${esc(it.url)}" target="_blank" rel="noopener nofollow">${esc(it.title)}</a>` +
      `<span class="news__s">${esc(it.source)}</span>` +
    `</span></li>`).join('') + '</ol>';
}
function officialLinks(c) {
  const L = LINKS[c.country];
  if (!L || !L.length) return '';
  const T = { embassy: 'Indian mission', visa: 'Student visa', work: 'After graduation', study: 'Study portal' };
  return `<section class="cpl"><div class="wrap"><div class="cpl__head"><p class="label">Official links</p><h2 class="h2">Where to check the rules yourself.</h2></div><div class="cpl__grid">` +
    L.map(l => { let host = ''; try { host = new URL(l.url).hostname.replace(/^www\./, ''); } catch (e) {} return `<a class="cpl__i" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="cpl__t">${esc(T[l.type] || 'Official')}</span><b>${esc(l.label)}</b><span class="cpl__u">${esc(host)} &nearr;</span></a>`; }).join('') +
    `</div></div></section>`;
}
function chapterNews(c) {
  if (!NEWS) return '';
  const items = (NEWS.countries || {})[slug(c)] || [];
  const vol = (NEWS.volume || {})[slug(c)] || 0, vmax = Math.max(1, ...Object.values(NEWS.volume || { a: 1 }));
  const own = items.filter(i => !i.region).length;
  const body = items.length ? newsList(items, false) :
    `<p class="news__empty">No major English-language coverage of Indian students in ${esc(place(c))} this month. We check again on the 1st.</p>`;
  return `<section class="cpn" id="news"><div class="wrap cpn__grid">
    <div class="cpn__side">
      <p class="label">This month</p>
      <h2 class="h2">Indian students in the news in ${esc(place(c))}.</h2>
      <p class="cpn__stamp">${esc(coveredMonth(NEWS.updated))}. Updated ${esc(fmtLong(NEWS.updated))}, refreshed automatically on the 1st of every month.</p>
      <div class="cpn__meter" title="Stories found in the last ${NEWS.windowDays} days"><span>Coverage this month</span><i style="--w:${(vol / vmax).toFixed(3)}"></i><b>${vol} ${vol === 1 ? 'story' : 'stories'}</b></div>
      ${own < items.length ? '<p class="cpn__note">Coverage was light, so recent stories from across Europe are included and marked.</p>' : ''}
    </div>
    <div class="cpn__list">${body}<p class="cpn__note">Headlines link to the original reporting. They are selected automatically; AIS does not endorse third-party coverage.</p></div>
  </div></section>`;
}
function homeBrief() {
  if (!NEWS || !NEWS.top || !NEWS.top.length) return '';
  const vol = Object.entries(NEWS.volume || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const vmax = Math.max(1, ...vol.map(v => v[1]));
  const bySlug = Object.fromEntries(CH.map(c => [slug(c), c]));
  const bars = vol.map(([k, v]) => `<a class="brief__bar" href="/chapters/${k}/"><span>${esc(bySlug[k] ? bySlug[k].country : k)}</span><i style="--w:${(v / vmax).toFixed(3)}"></i><b>${v}</b></a>`).join('');
  return `<section class="brief" id="brief">
  <div class="wrap">
    <div class="sec-head grid12">
      <p class="label">03 · The monthly brief</p>
      <h2 class="h2">What happened to Indian students abroad in <span class="hl hl--under">${esc(coveredMonth(NEWS.updated).split(' ')[0])}</span>.</h2>
      <p class="sec-head__p">Headlines from every chapter country, gathered automatically on the 1st of each month. Updated ${esc(fmtLong(NEWS.updated))}.</p>
    </div>
    <div class="brief__grid">
      <div class="brief__list">${newsList(NEWS.top, true)}</div>
      <aside class="brief__side"><h3>Where the news was</h3><p>Stories found per chapter country in the last ${NEWS.windowDays} days.</p>${bars}<a class="arrow" href="/chapters/">Every chapter's news</a></aside>
    </div>
  </div>
</section>`;
}


const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const slug = c => c.country.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const num = c => { let s = String(c.students.value || c.students.display).replace(/[~,+\s]/g, ''); let n = parseFloat(s); if (/k$/i.test(s)) n *= 1000; return n || 0; };
const bySize = CH.slice().sort((a, b) => num(b) - num(a));
const alpha = CH.slice().sort((a, b) => a.country.localeCompare(b.country));
const regionName = { europe: 'Europe', asia: 'Asia-Pacific and Gulf', americas: 'Americas' };
const place = c => (c.country === 'United States' ? 'the United States' : c.country === 'UAE' ? 'the UAE' : c.country === 'Netherlands' ? 'the Netherlands' : c.country === 'Czech Republic' ? 'the Czech Republic' : c.country);

const LOGO = '<span class="logo__word">Association of<br> Indian Students</span>';

function head({ title, desc, url, jsonld }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#c0201f">
<link rel="canonical" href="${url}">
<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Association of Indian Students">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/assets/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400..900;1,400..700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body class="cp-body">
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="wrap nav__in">
    <a class="logo" href="/" aria-label="Association of Indian Students, home">${LOGO}</a>
    <nav class="nav__links" aria-label="Primary">
      <a href="/#mandate">Our mandate</a><a href="/chapters/">Chapters</a><a href="/#brief">News</a><a href="/#positions">Issues</a><a href="/team/">Team</a><a href="/#press">Press</a>
    </nav>
    <a class="btn btn--outline nav__cta" href="/#join">Join a chapter</a>
  </div>
</header>
<main id="main">`;
}

function foot() {
  return `</main>
<footer class="foot">
  <div class="wrap">
    <div class="foot__top">
      <a class="logo logo--foot" href="/" aria-label="AIS home">${LOGO}</a>
      <p>To advocate for, protect and empower Indian students studying abroad through policy engagement, government relations, legal support and community building, in every country where they study.</p>
    </div>
    <nav class="foot__all" aria-label="All chapters"><h3>Chapters</h3>${chapterLinks()}</nav>
    <div class="foot__base">
      <span>© ${new Date().getFullYear()} Association of Indian Students</span>
      <span><a href="mailto:hello@globalindianstudents.org">hello@globalindianstudents.org</a></span>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

function chapterLinks() {
  return alpha.map(c => `<a href="/chapters/${slug(c)}/">${esc(c.country)}</a>`).join('');
}

function link(url, text) { return url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text); }

function chapterPage(c) {
  const s = slug(c), url = `${SITE}/chapters/${s}/`, rank = bySize.indexOf(c) + 1;
  const title = `Indian students in ${c.country} | ${c.org}, Association of Indian Students`;
  const desc = `${c.students.display} Indian students in ${place(c)} (${c.students.period}, ${c.students.source.split(',')[0]}). ${c.org} represents them. Join the chapter or send it a message.`.slice(0, 300);
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': url, url, name: title, description: desc, inLanguage: 'en', isPartOf: { '@id': `${SITE}/#website` }, about: { '@type': 'Country', name: c.country }, dateModified: TODAY },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'AIS', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Chapters', item: `${SITE}/chapters/` },
        { '@type': 'ListItem', position: 3, name: c.country, item: url }
      ] },
      { '@type': 'NGO', name: c.orgLong || c.org, url, parentOrganization: { '@id': `${SITE}/#org` }, areaServed: { '@type': 'Country', name: c.country } }
    ]
  };
  const stats = c.stats.map(x => `<div><b>${esc(x[0])}</b><span>${esc(x[1])}</span>${x[2] ? `<a href="${esc(x[2])}" target="_blank" rel="noopener">Source</a>` : ''}</div>`).join('');
  const unis = (c.universities || []).map(u => `<li>${esc(u)}</li>`).join('');
  const locs = (c.cities || []);
  const lmax = Math.max(1, ...locs.map(x => parseFloat(x[1]) || 0));
  const loc = locs.map(x => `<div class="city"><span>${esc(x[0])}</span><span class="city__bar"><i style="transform:scaleX(${((parseFloat(x[1]) || 0) / lmax).toFixed(3)})"></i></span><span class="city__pct">${esc(x[1])}</span></div>`).join('');
  const tags = (c.tags || []).map(t => `<span>${esc(t)}</span>`).join('');
  const srcs = (c.sources || []).map(x => `<li>${link(x[0], x[1])}</li>`).join('');
  const join = c.joinUrl
    ? `<a class="btn btn--paper" href="${esc(c.joinUrl)}" target="_blank" rel="noopener">Join via NAAIS</a><a class="btn btn--outline" href="https://naais.org" target="_blank" rel="noopener">Visit naais.org</a>`
    : `<a class="btn btn--paper" href="/?join=${c.iso}#join">Join ${esc(c.org)}</a><a class="btn btn--outline" href="/?msg=${c.iso}#join">Message the chapter</a>`;
  const near = bySize.filter(x => x !== c && x.region === c.region).slice(0, 6).map(x => `<a href="/chapters/${slug(x)}/"><b>${esc(x.country)}</b><span>${esc(x.students.display)}</span></a>`).join('');

  return head({ title, desc, url, jsonld }) + `
<section class="cp-hero">
  <div class="wrap">
    <nav class="cp-crumbs" aria-label="Breadcrumb"><a href="/">AIS</a><span>/</span><a href="/chapters/">Chapters</a><span>/</span><span aria-current="page">${esc(c.country)}</span></nav>
    <p class="cp-org">${esc(c.orgLong || c.org)} · ${esc(regionName[c.region] || '')}</p>
    <h1 class="cp-h1">Indian students in ${esc(place(c))}</h1>
    <div class="cp-fig">
      <div class="cp-fig__n">${esc(c.students.display)}</div>
      <p class="cp-fig__l">Indian students, ${esc(c.students.periodFull || c.students.period)}.<br>Source: ${link(c.students.url, c.students.source)}. #${rank} of 30 AIS chapters by size.</p>
    </div>
    <div class="cp-acts">${join}</div>
  </div>
</section>
<section class="cp-body-sec">
  <div class="wrap cp-grid">
    <div class="cp-main">
      <p class="cp-lead">${esc(c.desc)}</p>
      ${c.community ? `<h2>The community</h2><p>${esc(c.community)}</p>` : ''}
      ${c.fact && c.fact.text ? `<p class="dos__fact">${esc(c.fact.text)} ${c.fact.url ? `<a href="${esc(c.fact.url)}" target="_blank" rel="noopener">Source</a>` : ''}</p>` : ''}
    </div>
    <aside class="cp-side">
      <div class="cp-stats">${stats}</div>
      ${unis ? `<h2>${esc(c.universitiesLabel || 'Major universities')}</h2><ul class="unis">${unis}</ul>` : ''}
      ${loc ? `<h2>Share by location</h2><div class="cities">${loc}</div>` : ''}
      ${tags ? `<h2>Key issues</h2><div class="tags">${tags}</div>` : ''}
      ${srcs ? `<h2>Sources</h2><ul class="cp-src">${srcs}</ul>` : ''}
    </aside>
  </div>
</section>
${chapterNews(c)}
${officialLinks(c)}
${near ? `<section class="cp-near"><div class="wrap"><h2 class="h2">More chapters in ${esc(regionName[c.region])}</h2><div class="cp-near__grid">${near}</div><a class="arrow" href="/chapters/">All 30 chapters</a></div></section>` : ''}
` + foot();
}

function hubPage() {
  const url = `${SITE}/chapters/`;
  const title = 'AIS chapters: Indian students in 30 countries | Association of Indian Students';
  const desc = 'Every AIS country chapter, with the latest verified number of Indian students in each country, its source, and how to join.';
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollectionPage', url, name: title, description: desc, isPartOf: { '@id': `${SITE}/#website` },
    mainEntity: { '@type': 'ItemList', itemListElement: bySize.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/chapters/${slug(c)}/`, name: `Indian students in ${c.country}` })) } };
  const max = num(bySize[0]);
  const rows = bySize.map(c => `<a class="hub__row" href="/chapters/${slug(c)}/"><span class="r-c"><small>${c.iso}</small>${esc(c.country)}</span><span class="r-o hide-s">${esc(c.orgLong || c.org)}</span><span class="r-bar hide-m"><i style="width:${(num(c) / max * 100).toFixed(2)}%"></i></span><span class="r-n">${esc(c.students.display)}</span><span class="hub__p hide-s">${esc(c.students.period)}</span></a>`).join('');
  return head({ title, desc, url, jsonld }) + `
<section class="cp-hero cp-hero--hub">
  <div class="wrap">
    <nav class="cp-crumbs" aria-label="Breadcrumb"><a href="/">AIS</a><span>/</span><span aria-current="page">Chapters</span></nav>
    <h1 class="cp-h1">Indian students in 30 countries</h1>
    <p class="cp-fig__l">The latest verified count of Indian students in each AIS chapter country. Figures come from different years and sources; each chapter page lists its own.</p>
  </div>
</section>
<section class="cp-body-sec"><div class="wrap"><div class="hub">${rows}</div></div></section>
` + foot();
}

// team page
function teamPage() {
  const url = `${SITE}/team/`;
  const title = 'Leadership | Association of Indian Students';
  const desc = 'The board of the Association of Indian Students, including Chair of the Board Divy Trivedi.';
  const jsonld = { '@context': 'https://schema.org', '@type': 'AboutPage', url, name: title, description: desc, isPartOf: { '@id': `${SITE}/#website` },
    mainEntity: { '@type': 'Person', name: 'Divy Trivedi', jobTitle: 'Chair of the Board', worksFor: { '@id': `${SITE}/#org` } } };
  return head({ title, desc, url, jsonld }) + fs.readFileSync(path.join(ROOT, 'partials', 'team.html'), 'utf8') + foot();
}
fs.mkdirSync(path.join(ROOT, 'team'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'team', 'index.html'), teamPage());

// write pages
fs.mkdirSync(path.join(ROOT, 'chapters'), { recursive: true });
CH.forEach(c => {
  const dir = path.join(ROOT, 'chapters', slug(c));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), chapterPage(c));
});
fs.writeFileSync(path.join(ROOT, 'chapters', 'index.html'), hubPage());

// footer links on the home page
let home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
home = home.replace(/<!--ALL-CHAPTERS-->[\s\S]*?<!--\/ALL-CHAPTERS-->/, `<!--ALL-CHAPTERS-->${chapterLinks()}<!--/ALL-CHAPTERS-->`);
home = home.replace(/<!--TOP-CHAPTERS-->[\s\S]*?<!--\/TOP-CHAPTERS-->/, `<!--TOP-CHAPTERS-->${bySize.slice(0, 4).map(c => `<a href="/chapters/${slug(c)}/">${esc(c.country)}</a>`).join('')}<!--/TOP-CHAPTERS-->`);
home = home.replace(/<!--BRIEF-->[\s\S]*?<!--\/BRIEF-->/, `<!--BRIEF-->${homeBrief()}<!--/BRIEF-->`);
fs.writeFileSync(path.join(ROOT, 'index.html'), home);
// compact news for the home-page chapter panels
if (NEWS) fs.writeFileSync(path.join(ROOT, 'data', 'news.js'), '// generated by build.js from data/news.json\nwindow.AIS_NEWS = ' + JSON.stringify({ updated: NEWS.updated, countries: Object.fromEntries(Object.entries(NEWS.countries).map(([k, v]) => [k, v.filter(i => !i.region).slice(0, 3)])) }) + ';\n');

// sitemap + robots
const urls = [`${SITE}/`, `${SITE}/chapters/`, `${SITE}/team/`, ...alpha.map(c => `${SITE}/chapters/${slug(c)}/`)];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log('built', CH.length, 'chapter pages, hub, sitemap (' + urls.length + ' urls)');
