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
      <a href="/#mandate">Our mandate</a><a href="/chapters/">Chapters</a><a href="/#positions">Issues</a><a href="/#press">Press</a>
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
fs.writeFileSync(path.join(ROOT, 'index.html'), home);

// sitemap + robots
const urls = [`${SITE}/`, `${SITE}/chapters/`, ...alpha.map(c => `${SITE}/chapters/${slug(c)}/`)];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log('built', CH.length, 'chapter pages, hub, sitemap (' + urls.length + ' urls)');
