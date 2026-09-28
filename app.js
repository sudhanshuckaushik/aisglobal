(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzfy3kXXQxKHobPHquh3dOnamaJNiLUEH8kdq5c1xWXVL84arGk45I56x82mT-RLcSvgQ/exec';
  var I3 = { US:'USA', AU:'AUS', AT:'AUT', BE:'BEL', CZ:'CZE', CY:'CYP', DK:'DNK', EE:'EST', FI:'FIN', FR:'FRA', DE:'DEU', HU:'HUN', IE:'IRL', IT:'ITA', JP:'JPN', LV:'LVA', LT:'LTU', MY:'MYS', MX:'MEX', NL:'NLD', NZ:'NZL', NO:'NOR', PL:'POL', PT:'PRT', SG:'SGP', KR:'KOR', ES:'ESP', SE:'SWE', CH:'CHE', AE:'ARE' };

  document.documentElement.classList.remove('no-js');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function parseNum(s) {
    s = String(s || '').replace(/[~,+\s]/g, '');
    var n = parseFloat(s);
    if (/k$/i.test(s)) n *= 1000;
    return isNaN(n) ? 0 : n;
  }

  /* normalise chapter records (students figure, stats with optional source urls) */
  var CH = (window.AIS_CHAPTERS || []).map(function (c) {
    var st = c.students || { display: c.stats && c.stats[0] ? c.stats[0][0] : '' };
    c.students = st;
    c.n = st.value != null && parseNum(st.value) ? parseNum(st.value) : parseNum(st.display);
    c.stats = (c.stats || []).map(function (s) { return { v: s[0], l: s[1], url: s[2] || null }; });
    c.fact = typeof c.fact === 'string' ? { text: c.fact } : (c.fact || null);
    return c;
  });
  function find(country) { for (var i = 0; i < CH.length; i++) if (CH[i].country === country) return CH[i]; return null; }
  var MAX = Math.max.apply(null, CH.map(function (c) { return c.n; }));
  var alpha = CH.slice().sort(function (a, b) { return a.country.localeCompare(b.country); });
  var bySize = CH.slice().sort(function (a, b) { return b.n - a.n; });

  /* ---------------- nav ---------------- */
  var menuBtn = document.querySelector('.nav__menu'), mnav = document.getElementById('mnav');
  function setMenu(open) { menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.textContent = open ? 'Close' : 'Menu'; mnav.hidden = !open; }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  mnav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });

  /* ---------------- hero roster + hover card ---------------- */
  var roster = document.getElementById('roster'), rpop = document.getElementById('rpop'), hero = document.querySelector('.hero');
  roster.innerHTML = alpha.map(function (c) {
    return '<li><a href="#chapter-' + esc(c.iso) + '" data-open="' + esc(c.country) + '">' + esc(c.country) + '</a></li>';
  }).join('');

  function rank(c) { return bySize.indexOf(c) + 1; }
  function showPop(a) {
    var c = find(a.dataset.open);
    if (!c) return;
    var extra = c.stats.slice(1, 2).map(function (s) { return '<span class="rpop__x"><b>' + esc(s.v) + '</b> ' + esc(s.l) + '</span>'; }).join('');
    rpop.innerHTML =
      '<span class="rpop__org">' + esc(c.org) + '</span>' +
      '<span class="rpop__n">' + esc(c.students.display) + '</span>' +
      '<span class="rpop__l">Indian students' + (c.students.period ? ', ' + esc(c.students.period) : '') + '</span>' +
      extra +
      '<span class="rpop__foot">#' + rank(c) + ' of 30 chapters by size · Click to open</span>';
    var hr = hero.getBoundingClientRect(), ar = a.getBoundingClientRect();
    rpop.classList.add('is-on');
    var pw = rpop.offsetWidth, ph = rpop.offsetHeight;
    var left = ar.left - hr.left - pw - 18;
    if (left < 8) left = ar.right - hr.left + 18;
    var top = ar.top - hr.top + ar.height / 2 - ph / 2;
    rpop.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
  }
  function hidePop() { rpop.classList.remove('is-on'); }
  if (hoverable) {
    roster.addEventListener('mouseover', function (e) { var a = e.target.closest('a'); if (a) showPop(a); });
    roster.addEventListener('mouseleave', hidePop);
  }
  roster.addEventListener('focusin', function (e) { var a = e.target.closest('a'); if (a) showPop(a); });
  roster.addEventListener('focusout', hidePop);

  /* ---------------- map ---------------- */
  var mapEl = document.getElementById('map'), tip = document.getElementById('tip'), card = document.getElementById('mcard');
  var svg, full, vb, dots = {}, arcs = {}, labels = [], pulses = [], zoomAnim = null, currentRegion = 'all';
  var NS = 'http://www.w3.org/2000/svg';

  (function buildMap() {
    if (!window.WORLD) return;
    var byIso = {};
    WORLD.countries.forEach(function (c) { byIso[c.iso] = c; });
    // chapter points and the India origin come from the map file (projected lon/lat)
    var PT = WORLD.points || {};
    var ind = PT.IN ? { cx: PT.IN[0], cy: PT.IN[1] } : byIso.IND, chSet = {};
    CH.forEach(function (c) { chSet[I3[c.iso]] = c.country; });
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'AIS chapters on a world map');

    var land = '';
    WORLD.countries.forEach(function (c) {
      if (c.iso === 'ATA') return;
      land += '<path class="land' + (c.iso === 'IND' ? ' in' : chSet[c.iso] ? ' ch' : '') + '"' + (chSet[c.iso] ? ' data-c="' + esc(chSet[c.iso]) + '"' : '') + ' d="' + c.d + '"/>';
    });
    var arcHTML = '', dotHTML = '', lblHTML = '', pulseHTML = '';
    bySize.forEach(function (c, i) {
      var i3 = I3[c.iso], w = byIso[i3];
      var p = PT[c.iso] || [w.cx, w.cy], x = p[0], y = p[1];
      c.x = x; c.y = y;
      c.r = 2.6 + Math.sqrt(c.n / MAX) * 22;
      var mx = (ind.cx + x) / 2, my = Math.min(ind.cy, y) - Math.abs(ind.cx - x) * 0.28;
      var len = Math.hypot(x - ind.cx, y - ind.cy) * 1.4;
      var id = 'arc-' + c.iso;
      arcHTML += '<path id="' + id + '" class="arc" data-c="' + esc(c.country) + '" d="M' + ind.cx + ' ' + ind.cy + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x + ' ' + y + '" style="--len:' + len.toFixed(0) + ';animation-delay:' + (i * 35) + 'ms"/>';
      dotHTML += '<circle class="dot" tabindex="0" role="button" aria-label="' + esc(c.country + ': ' + c.students.display + ' Indian students') + '" data-c="' + esc(c.country) + '" cx="' + x + '" cy="' + y + '" r="' + c.r.toFixed(2) + '" style="animation-delay:' + (500 + i * 35) + 'ms"/>';
      var name = c.country === 'United States' ? 'USA' : c.country === 'Czech Republic' ? 'Czechia' : c.country;
      lblHTML += '<text class="lbl" data-c="' + esc(c.country) + '" data-region="' + c.region + '" data-top="' + (i < 7 ? 1 : 0) + '">' + esc(name) + '</text>';
      if (!reduce) {
        var dur = (3.2 + len / 260).toFixed(2), begin = (-(i * 0.37) % parseFloat(dur)).toFixed(2);
        pulseHTML += '<circle class="pulse" r="1.4"><animateMotion dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite" rotate="auto"><mpath href="#' + id + '"/></animateMotion>' +
          '<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.12;.8;1" dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite"/></circle>';
      }
    });
    svg.innerHTML = '<g class="lands">' + land + '</g><g class="arcs">' + arcHTML + '</g><g class="pulses">' + pulseHTML + '</g><g class="dots">' + dotHTML + '</g><g class="lbls">' + lblHTML + '</g><circle class="home" cx="' + ind.cx + '" cy="' + ind.cy + '" r="2.5"/>';
    mapEl.insertBefore(svg, tip);

    var bb = svg.querySelector('.lands').getBBox();
    full = { x: bb.x, y: bb.y - 4, w: bb.width, h: bb.height * 0.86 };
    vb = Object.assign({}, full);
    svg.querySelectorAll('.dot').forEach(function (d) { dots[d.dataset.c] = d; });
    svg.querySelectorAll('.arc').forEach(function (a) { arcs[a.dataset.c] = a; });
    labels = Array.prototype.slice.call(svg.querySelectorAll('.lbl'));
    pulses = Array.prototype.slice.call(svg.querySelectorAll('.pulse'));
    applyView();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutLabels); else layoutLabels();

    /* interactions */
    function dotFrom(e) { return e.target.closest && e.target.closest('.dot, .land.ch'); }
    svg.addEventListener('mousemove', function (e) {
      var d = dotFrom(e);
      if (d) { focusCountry(d.dataset.c); showTip(d.dataset.c, e.clientX, e.clientY); }
      else { focusCountry(null); tip.style.opacity = 0; }
    });
    svg.addEventListener('mouseleave', function () { focusCountry(null); tip.style.opacity = 0; });
    svg.addEventListener('focusin', function (e) { if (e.target.classList.contains('dot')) { focusCountry(e.target.dataset.c); showTip(e.target.dataset.c); } });
    svg.addEventListener('focusout', function () { focusCountry(null); tip.style.opacity = 0; });
    svg.addEventListener('click', function (e) {
      var d = dotFrom(e);
      if (d) pinCountry(d.dataset.c); else closeCard();
    });
    svg.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('dot')) { e.preventDefault(); pinCountry(e.target.dataset.c); }
    });

    if (reduce || !('IntersectionObserver' in window)) mapEl.classList.add('is-on');
    else new IntersectionObserver(function (es, o) {
      if (es[0].isIntersecting) { mapEl.classList.add('is-on'); o.disconnect(); }
    }, { threshold: 0.25 }).observe(mapEl);
    window.addEventListener('resize', function () { if (!card.hidden && card.dataset.c) placeCard(find(card.dataset.c)); });
  })();

  function applyView() {
    if (!svg) return;
    svg.setAttribute('viewBox', [vb.x, vb.y, vb.w, vb.h].map(function (v) { return v.toFixed(2); }).join(' '));
    var k = vb.w / full.w;              // 1 at world view, smaller when zoomed in
    var dk = Math.pow(k, 0.62);          // dots grow on screen a little when zoomed, but not in proportion
    svg.style.setProperty('--k', k.toFixed(4));
    CH.forEach(function (c) {
      var d = dots[c.country];
      if (d) d.setAttribute('r', (c.r * dk).toFixed(2));
    });
    pulses.forEach(function (p) { p.setAttribute('r', (1.5 * Math.pow(k, 0.8)).toFixed(2)); });
  }

  /* place labels without collisions: try right, left, above, below; hide if nothing fits */
  function layoutLabels() {
    if (!svg) return;
    var k = vb.w / full.w, dk = Math.pow(k, 0.62), placed = [];
    var circles = CH.map(function (c) { return { x: c.x, y: c.y, r: c.r * dk }; });
    function hitsBox(b) {
      for (var i = 0; i < placed.length; i++) { var p = placed[i]; if (b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y) return true; }
      for (var j = 0; j < circles.length; j++) {
        var c = circles[j], nx = Math.max(b.x, Math.min(c.x, b.x + b.w)), ny = Math.max(b.y, Math.min(c.y, b.y + b.h));
        if ((nx - c.x) * (nx - c.x) + (ny - c.y) * (ny - c.y) < c.r * c.r * 0.9) return true;
      }
      return b.x < vb.x || b.x + b.w > vb.x + vb.w || b.y < vb.y || b.y + b.h > vb.y + vb.h;
    }
    var order = labels.slice().sort(function (a, b) { return find(b.dataset.c).n - find(a.dataset.c).n; });
    order.forEach(function (t) {
      var c = find(t.dataset.c), r = c.r * dk, g = 3 * k;
      var want = currentRegion === 'all' ? t.dataset.top === '1' : t.dataset.region === currentRegion;
      t.classList.remove('is-shown');
      if (!want) return;
      var opts = [
        { a: 'start', x: c.x + r + g, y: c.y + 3.4 * k },
        { a: 'end', x: c.x - r - g, y: c.y + 3.4 * k },
        { a: 'middle', x: c.x, y: c.y - r - g * 1.2 },
        { a: 'middle', x: c.x, y: c.y + r + g + 7 * k },
        { a: 'start', x: c.x + r * 0.72 + g * 0.5, y: c.y - r * 0.72 - g * 0.5 },
        { a: 'end', x: c.x - r * 0.72 - g * 0.5, y: c.y - r * 0.72 - g * 0.5 },
        { a: 'start', x: c.x + r * 0.72 + g * 0.5, y: c.y + r * 0.72 + 7 * k },
        { a: 'end', x: c.x - r * 0.72 - g * 0.5, y: c.y + r * 0.72 + 7 * k }
      ];
      for (var i = 0; i < opts.length; i++) {
        var o = opts[i];
        t.setAttribute('x', o.x.toFixed(2)); t.setAttribute('y', o.y.toFixed(2)); t.setAttribute('text-anchor', o.a);
        var bb = t.getBBox(), b = { x: bb.x - 1 * k, y: bb.y, w: bb.width + 2 * k, h: bb.height };
        if (!hitsBox(b)) { placed.push(b); t.classList.add('is-shown'); return; }
      }
    });
  }

  function regionBox(region) {
    if (region === 'all') return Object.assign({}, full);
    var pts = CH.filter(function (c) { return c.region === region; });
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(function (c) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y); });
    if (region === 'asia' && WORLD.points && WORLD.points.IN) { x0 = Math.min(x0, WORLD.points.IN[0] - 30); }   // keep India in frame
    var w = x1 - x0, h = y1 - y0, pad = Math.max(w, h) * 0.1 + 14;
    x0 -= pad; y0 -= pad; w += pad * 2; h += pad * 2;
    var ar = full.w / full.h;
    if (w / h > ar) { var nh = w / ar; y0 -= (nh - h) / 2; h = nh; } else { var nw = h * ar; x0 -= (nw - w) / 2; w = nw; }
    return { x: x0, y: y0, w: w, h: h };
  }
  function zoomTo(region) {
    if (!svg) return;
    currentRegion = region;
    closeCard();
    var from = Object.assign({}, vb), to = regionBox(region), t0 = null, dur = reduce ? 0 : 1100;
    cancelAnimationFrame(zoomAnim);
    function ease(t) { return 1 - Math.pow(1 - t, 4); }
    function step(ts) {
      if (t0 === null) t0 = ts;
      var t = dur ? Math.min(1, (ts - t0) / dur) : 1, e = ease(t);
      vb = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
      applyView();
      if (t < 1) zoomAnim = requestAnimationFrame(step);
      else { svg.classList.remove('is-moving'); layoutLabels(); }
    }
    svg.classList.add('is-moving');
    zoomAnim = requestAnimationFrame(step);
    svg.classList.toggle('is-zoomed', region !== 'all');
    CH.forEach(function (c) {
      var off = region !== 'all' && c.region !== region;
      if (dots[c.country]) dots[c.country].classList.toggle('is-off', off);
      if (arcs[c.country]) arcs[c.country].classList.toggle('is-off', off);
    });
  }

  function focusCountry(country) {
    if (!svg) return;
    svg.classList.toggle('is-focus', !!country);
    CH.forEach(function (c) {
      var on = c.country === country;
      if (dots[c.country]) dots[c.country].classList.toggle('is-hot', on);
      if (arcs[c.country]) arcs[c.country].classList.toggle('is-hot', on);
    });
    hotRow(country);
  }
  function showTip(country, cx, cy) {
    var c = find(country), r = mapEl.getBoundingClientRect();
    if (cx == null) { var b = dots[country].getBoundingClientRect(); cx = b.left + b.width / 2; cy = b.top; }
    tip.innerHTML = '<b>' + esc(c.country) + '</b>' + esc(c.students.display) + ' Indian students' + (c.students.period ? ' <span>' + esc(c.students.period) + '</span>' : '');
    var x = Math.max(90, Math.min(r.width - 90, cx - r.left));
    tip.style.left = x + 'px'; tip.style.top = (cy - r.top) + 'px'; tip.style.opacity = 1;
  }

  function pinCountry(country) {
    var c = find(country);
    if (!c) return;
    tip.style.opacity = 0;
    CH.forEach(function (x) { if (dots[x.country]) dots[x.country].classList.toggle('is-sel', x.country === country); });
    var stats = c.stats.slice(0, 3).map(function (s) { return '<div><b>' + esc(s.v) + '</b><span>' + esc(s.l) + '</span></div>'; }).join('');
    card.dataset.c = country;
    card.innerHTML =
      '<button class="map__x" type="button" aria-label="Close">×</button>' +
      '<p class="map__org">' + esc(c.orgLong || c.org) + '</p>' +
      '<h3>' + esc(c.country) + '</h3>' +
      '<div class="map__stats">' + stats + '</div>' +
      (c.students.source ? '<p class="map__srcline">Source: ' + (c.students.url ? '<a href="' + esc(c.students.url) + '" target="_blank" rel="noopener">' + esc(c.students.source) + '</a>' : esc(c.students.source)) + '</p>' : '') +
      '<div class="map__acts"><button class="btn btn--ink" type="button" data-go="' + esc(country) + '">Open chapter</button>' +
      (c.joinUrl ? '<a class="btn btn--line" href="' + esc(c.joinUrl) + '" target="_blank" rel="noopener">Join via NAAIS</a>' : '<button class="btn btn--line" type="button" data-join="' + esc(country) + '">Join</button>') + '</div>';
    card.hidden = false;
    placeCard(c);
    card.querySelector('.map__x').focus({ preventScroll: true });
  }
  function placeCard(c) {
    var mr = mapEl.getBoundingClientRect();
    if (mr.width < 700) { card.style.left = ''; card.style.top = ''; card.classList.add('is-dock'); return; }
    card.classList.remove('is-dock');
    var b = dots[c.country].getBoundingClientRect();
    var cw = card.offsetWidth, chh = card.offsetHeight;
    var x = b.right - mr.left + 14, y = b.top - mr.top + b.height / 2 - chh / 2;
    if (x + cw > mr.width - 8) x = b.left - mr.left - cw - 14;
    y = Math.max(8, Math.min(mr.height - chh - 8, y));
    card.style.left = Math.round(x) + 'px'; card.style.top = Math.round(y) + 'px';
  }
  function closeCard() {
    if (!card) return;
    card.hidden = true; card.dataset.c = '';
    CH.forEach(function (x) { if (dots[x.country]) dots[x.country].classList.remove('is-sel'); });
  }
  card.addEventListener('click', function (e) {
    if (e.target.closest('.map__x')) return closeCard();
    var g = e.target.closest('[data-go]');
    if (g) { closeCard(); openChapter(g.dataset.go, true); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !card.hidden) closeCard(); });

  /* ---------------- chapter index ---------------- */
  var rowsEl = document.getElementById('rows'), emptyEl = document.getElementById('empty');
  var rowByCountry = {};

  function dossier(c) {
    var cmax = Math.max.apply(null, (c.cities || []).map(function (x) { return parseFloat(x[1]) || 0; }).concat([1]));
    var cities = (c.cities || []).map(function (x) {
      return '<div class="city"><span>' + esc(x[0]) + '</span><span class="city__bar"><i style="--w:' + ((parseFloat(x[1]) || 0) / cmax).toFixed(3) + '"></i></span><span class="city__pct">' + esc(x[1]) + '</span></div>';
    }).join('');
    var stats = c.stats.map(function (s) { return '<div><b>' + esc(s.v) + '</b><span>' + esc(s.l) + '</span></div>'; }).join('');
    var unis = (c.universities || []).map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('');
    var tags = (c.tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var srcs = (c.sources || []).map(function (s) { return '<li><a href="' + esc(s[0]) + '" target="_blank" rel="noopener">' + esc(s[1]) + '</a></li>'; }).join('');
    var act = c.joinUrl
      ? '<a class="btn btn--red" href="' + esc(c.joinUrl) + '" target="_blank" rel="noopener">Join via NAAIS</a><a class="btn btn--line" href="https://naais.org" target="_blank" rel="noopener">Visit naais.org</a>'
      : '<button class="btn btn--red" type="button" data-join="' + esc(c.country) + '">Join ' + esc(c.org) + '</button><button class="btn btn--line" type="button" data-msg="' + esc(c.country) + '">Message the chapter</button>';
    var figLine = c.students.source
      ? '<p class="dos__fig">' + esc(c.students.display) + ' Indian students' + (c.students.periodFull || c.students.period ? ', ' + esc(c.students.periodFull || c.students.period) : '') + '. Source: ' + (c.students.url ? '<a href="' + esc(c.students.url) + '" target="_blank" rel="noopener">' + esc(c.students.source) + '</a>' : esc(c.students.source)) + '.</p>'
      : '';
    var page = '/chapters/' + c.country.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '/';
    var nw = (window.AIS_NEWS && window.AIS_NEWS.countries[page.split('/')[2]]) || [];
    var newsHTML = nw.length ? '<h4>In the news this month</h4><ul class="dos__news">' + nw.map(function (n) {
      return '<li><a href="' + esc(n.url) + '" target="_blank" rel="noopener nofollow">' + esc(n.title) + '</a><span>' + esc(n.source) + '</span></li>';
    }).join('') + '</ul>' : '';
    act += '<a class="arrow dos__page" href="' + page + '">Full chapter page</a>';
    return '<div class="dos">' +
      '<div class="dos__main">' +
        '<p class="dos__lead">' + esc(c.desc) + '</p>' +
        (c.community ? '<h4>The community</h4><p>' + esc(c.community) + '</p>' : '') +
        newsHTML +
        (c.fact && c.fact.text ? '<p class="dos__fact">' + esc(c.fact.text) + (c.fact.url ? ' <a href="' + esc(c.fact.url) + '" target="_blank" rel="noopener">Source</a>' : '') + '</p>' : '') +
      '</div>' +
      '<div class="dos__side">' +
        '<div class="dos__stats">' + stats + '</div>' +
        figLine +
        (unis ? '<h4>' + esc(c.universitiesLabel || 'Major universities') + '</h4><ul class="unis">' + unis + '</ul>' : '') +
        (cities ? '<h4>Share by location</h4><div class="cities">' + cities + '</div>' : '') +
        (tags ? '<h4>Key issues</h4><div class="tags">' + tags + '</div>' : '') +
        (srcs ? '<details class="src"><summary>All sources</summary><ul>' + srcs + '</ul></details>' : '') +
      '</div>' +
      '<div class="dos__act">' + act + '</div>' +
    '</div>';
  }

  CH.forEach(function (c) {
    var el = document.createElement('div');
    el.className = 'row';
    el.dataset.region = c.region;
    el.dataset.country = c.country;
    el.dataset.q = [c.country, c.org, c.orgLong, (c.universities || []).join(' '), (c.cities || []).map(function (x) { return x[0]; }).join(' ')].join(' ').toLowerCase();
    var id = 'ch-' + c.iso;
    el.innerHTML =
      '<button class="row__btn" type="button" aria-expanded="false" aria-controls="' + id + '">' +
        '<span class="r-c"><small>' + esc(c.iso) + '</small>' + esc(c.country) + '</span>' +
        '<span class="r-o hide-s">' + esc(c.orgLong || c.org) + '</span>' +
        '<span class="r-bar hide-m" aria-hidden="true"><i style="width:' + (c.n / MAX * 100).toFixed(2) + '%"></i></span>' +
        '<span class="r-n">' + esc(c.students.display) + '</span>' +
        '<span class="r-ic" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="row__panel" id="' + id + '" role="region" aria-label="' + esc(c.org) + '"><div></div></div>';
    rowByCountry[c.country] = el;
    el.addEventListener('mouseenter', function () { focusCountry(c.country); });
    el.addEventListener('mouseleave', function () { focusCountry(null); });
  });

  var sortMode = 'size', showAll = false, LIMIT = 10, region = 'all', query = '';
  var moreBtn = document.getElementById('more');
  moreBtn.addEventListener('click', function () { showAll = true; filter(); });

  function render() {
    (sortMode === 'size' ? bySize : alpha).forEach(function (c) { rowsEl.appendChild(rowByCountry[c.country]); });
    filter();
  }
  function filter() {
    var n = 0, capped = !showAll && region === 'all' && !query;
    Array.prototype.forEach.call(rowsEl.children, function (el) {
      var ok = (region === 'all' || el.dataset.region === region) && (!query || el.dataset.q.indexOf(query) > -1);
      el.hidden = !ok;
      if (ok) n++;
      el.classList.toggle('is-cut', ok && capped && n > LIMIT && !el.classList.contains('is-open'));
    });
    moreBtn.hidden = !capped || n <= LIMIT;
    emptyEl.hidden = n > 0;
  }
  function hotRow(country) {
    Object.keys(rowByCountry).forEach(function (k) { rowByCountry[k].classList.toggle('is-hot', k === country); });
  }
  function setOpen(el, open) {
    el.classList.toggle('is-open', open);
    el.querySelector('.row__btn').setAttribute('aria-expanded', String(open));
  }
  function openChapter(country, scroll) {
    var el = rowByCountry[country];
    if (!el) return;
    var inner = el.querySelector('.row__panel > div');
    if (!inner.firstChild) inner.innerHTML = dossier(find(country));
    Object.keys(rowByCountry).forEach(function (k) { if (k !== country && rowByCountry[k].classList.contains('is-open')) setOpen(rowByCountry[k], false); });
    if (el.hidden) { region = 'all'; query = ''; document.getElementById('q').value = ''; syncSeg(); zoomTo('all'); }
    if (el.classList.contains('is-cut') || el.hidden) { showAll = true; }
    filter();
    void inner.offsetWidth;
    setOpen(el, true);
    if (scroll) setTimeout(function () { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }, 40);
  }

  rowsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.row__btn');
    if (!b) return;
    var el = b.parentNode;
    el.classList.contains('is-open') ? setOpen(el, false) : openChapter(el.dataset.country, false);
  });

  function syncSeg() { document.querySelectorAll('.seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.region === region)); }); }
  document.querySelectorAll('.seg button').forEach(function (b) {
    b.addEventListener('click', function () { region = b.dataset.region; syncSeg(); filter(); zoomTo(region); });
  });
  document.getElementById('q').addEventListener('input', function (e) { query = e.target.value.trim().toLowerCase(); filter(); });
  var sortBtn = document.getElementById('sort');
  sortBtn.addEventListener('click', function () {
    sortMode = sortMode === 'size' ? 'alpha' : 'size';
    sortBtn.textContent = sortMode === 'size' ? 'Sort: largest first' : 'Sort: A to Z';
    render();
  });
  render();

  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-join]'), m = e.target.closest('[data-msg]');
    if (j) { e.preventDefault(); return goForm('join', j.dataset.join); }
    if (m) { e.preventDefault(); return goForm('msg', m.dataset.msg); }
    var a = e.target.closest('[data-open]');
    if (!a) return;
    e.preventDefault();
    hidePop();
    openChapter(a.dataset.open, true);
  });

  /* ---------------- join / message ---------------- */
  var sel = document.getElementById('fChapter');
  var tJoin = document.getElementById('tJoin'), tMsg = document.getElementById('tMsg');
  var fJoin = document.getElementById('fJoin'), fMsg = document.getElementById('fMsg');
  var naais = document.getElementById('naais'), done = document.getElementById('done');
  var mode = 'join';

  sel.innerHTML = '<option value="">Choose a chapter</option><option value="Global">Not sure yet (AIS Global)</option>' +
    alpha.map(function (c) { return '<option value="' + esc(c.country) + '">' + esc(c.country) + ' · ' + esc(c.org) + '</option>'; }).join('');

  function sync() {
    var c = find(sel.value), viaNaais = mode === 'join' && c && c.joinUrl, isDone = !done.hidden;
    naais.hidden = !viaNaais || isDone;
    fJoin.hidden = mode !== 'join' || !!viaNaais || isDone;
    fMsg.hidden = mode !== 'msg' || isDone;
  }
  function setMode(m) {
    mode = m;
    tJoin.setAttribute('aria-selected', String(m === 'join'));
    tMsg.setAttribute('aria-selected', String(m === 'msg'));
    done.hidden = true;
    sync();
  }
  tJoin.addEventListener('click', function () { setMode('join'); });
  tMsg.addEventListener('click', function () { setMode('msg'); });
  sel.addEventListener('change', function () { clear(sel.closest('.fld')); sync(); });

  function goForm(m, country, subject) {
    closeCard();
    setMode(m);
    if (country) sel.value = country;
    if (subject) fMsg.subject.value = subject;
    sync();
    document.getElementById('join').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  document.querySelectorAll('[data-subject]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); goForm('msg', null, a.dataset.subject); });
  });

  function clear(fld) { fld.classList.remove('is-bad'); var x = fld.querySelector('.fld__err'); if (x) x.remove(); }
  function bad(fld, msg) { clear(fld); fld.classList.add('is-bad'); var s = document.createElement('span'); s.className = 'fld__err'; s.textContent = msg; fld.appendChild(s); }
  function validate(form) {
    var ok = true, first = null, cf = sel.closest('.fld');
    clear(cf);
    if (!sel.value) { bad(cf, 'Pick a chapter, or choose "Not sure yet".'); ok = false; first = sel; }
    form.querySelectorAll('input,textarea').forEach(function (inp) {
      var fld = inp.closest('.fld'), v = inp.value.trim();
      clear(fld);
      if (inp.required && !v) { bad(fld, 'Required.'); ok = false; first = first || inp; }
      else if (inp.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { bad(fld, 'That email doesn\'t look right.'); ok = false; first = first || inp; }
    });
    if (first) first.focus();
    return ok;
  }
  function submit(type, form) {
    if (!validate(form)) return;
    var id = 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    var date = new Date().toISOString();
    var chapter = sel.value === 'Global' ? 'AIS Global' : 'AIS ' + sel.value;
    var v = function (n) { return form[n] ? form[n].value.trim() : ''; };
    var rec = type === 'join'
      ? { id: id, type: 'join', chapter: chapter, date: date, firstName: v('firstName'), lastName: v('lastName'), email: v('email'), university: v('university'), field: v('field'), membership: v('membership') || 'Student Member' }
      : { id: id, type: 'msg', chapter: chapter, date: date, name: v('name'), org: v('org'), email: v('email'), subject: v('subject'), message: v('message') };
    try { fetch(SHEET_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(rec) }); } catch (e) {}
    document.getElementById('doneT').textContent = type === 'join' ? 'Welcome to AIS.' : 'Message sent.';
    document.getElementById('doneB').textContent = type === 'join'
      ? 'Your application to ' + chapter + ' is in. A chapter coordinator will be in touch within 48 hours.'
      : 'Thanks for writing to ' + chapter + '. The coordinator will reply within two business days.';
    done.hidden = false; sync(); done.focus();
    form.reset();
  }
  fJoin.addEventListener('submit', function (e) { e.preventDefault(); submit('join', fJoin); });
  fMsg.addEventListener('submit', function (e) { e.preventDefault(); submit('msg', fMsg); });
  document.getElementById('again').addEventListener('click', function () { setMode(mode); });
  sync();

  /* deep link: #chapter-DE opens that chapter */
  function fromHash() {
    var m = /^#chapter-([A-Z]{2})$/i.exec(location.hash);
    if (!m) return;
    for (var i = 0; i < CH.length; i++) if (CH[i].iso === m[1].toUpperCase()) { openChapter(CH[i].country, true); break; }
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
  (function fromQuery() {
    var q = new URLSearchParams(location.search), iso = (q.get('join') || q.get('msg') || '').toUpperCase();
    if (!iso) return;
    for (var i = 0; i < CH.length; i++) if (CH[i].iso === iso) { goForm(q.get('join') ? 'join' : 'msg', CH[i].country); break; }
  })();

  /* ---------------- hero: rotating "rules they live by" ---------------- */
  (function rules() {
    var el = document.getElementById('rulesWord'), sc = document.querySelector('.rules .scribble');
    if (!el) return;
    var words = ['visas', 'work rights', 'study permits', 'safety', 'fair treatment'], i = 0;
    function draw() { if (!sc) return; sc.classList.remove('is-draw'); void sc.getBoundingClientRect(); sc.classList.add('is-draw'); }
    setTimeout(draw, 700);
    if (reduce) return;
    setInterval(function () {
      if (document.hidden) return;
      el.classList.add('is-out');
      setTimeout(function () {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove('is-out'); el.classList.add('is-in');
        void el.offsetWidth;
        el.classList.remove('is-in');
        draw();
      }, 350);
    }, 2600);
  })();

  /* ---------------- hand-drawn circles and underlines ---------------- */
  (function marks() {
    var P = {
      circle: { vb: '0 0 100 40', d: 'M9 23 C 6 10, 30 4, 55 5 C 82 6, 97 13, 95 23 C 93 33, 68 38, 44 37 C 20 36, 4 30, 6 20 C 8 12, 22 7, 42 6' },
      under: { vb: '0 0 100 12', d: 'M2 8 C 25 3, 50 10, 75 5 S 96 6, 98 7' }
    };
    var els = document.querySelectorAll('.hl');
    els.forEach(function (el) {
      var t = el.classList.contains('hl--circle') ? P.circle : P.under;
      el.insertAdjacentHTML('beforeend', '<svg viewBox="' + t.vb + '" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="' + t.d + '"/></svg>');
    });
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-drawn'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-drawn'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -18% 0px' });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------- photo reel: vertical scroll drives the horizontal track ---------------- */
  (function reel() {
    var sec = document.querySelector('.reel'), track = document.getElementById('reelTrack');
    if (!sec || !track) return;
    var items = Array.prototype.slice.call(track.children), count = document.getElementById('reelCount'), bar = document.getElementById('reelBar');
    var prev = document.getElementById('reelPrev'), next = document.getElementById('reelNext');
    var pinned = false, dist = 0, ticking = false, total = track.querySelectorAll('.reel__i').length;
    function gut() { return parseFloat(getComputedStyle(track).paddingLeft) || 16; }
    function setup() {
      pinned = window.innerWidth >= 900 && !reduce;
      sec.classList.toggle('is-pinned', pinned);
      track.style.transform = '';
      if (pinned) {
        dist = Math.max(0, track.scrollWidth - window.innerWidth);
        sec.style.height = (window.innerHeight - 76 + dist) + 'px';
      } else {
        sec.style.height = '';
      }
      update();
    }
    function progress() {
      if (pinned) { var top = sec.getBoundingClientRect().top - 76; return dist ? Math.min(1, Math.max(0, -top / dist)) : 0; }
      var m = track.scrollWidth - track.clientWidth; return m ? track.scrollLeft / m : 0;
    }
    function update() {
      ticking = false;
      var p = progress();
      if (pinned) track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
      if (bar) bar.style.setProperty('--p', p.toFixed(4));
      var vw = window.innerWidth, best = 0, bd = Infinity;
      items.forEach(function (it, i) {
        var r = it.getBoundingClientRect();
        var img = it.querySelector('img');
        if (img && !reduce) img.style.setProperty('--px', (((r.left + r.width / 2) - vw / 2) / vw * -22).toFixed(1) + 'px');
        var d = Math.abs(r.left - gut());
        if (d < bd && i < total) { bd = d; best = i; }
      });
      if (count) count.textContent = String(best + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    function go(dir) {
      var cur = parseInt(count.textContent, 10) - 1, target = Math.max(0, Math.min(items.length - 1, cur + dir));
      var off = items[target].offsetLeft - gut();
      if (pinned) {
        var top = sec.getBoundingClientRect().top + window.scrollY - 76;
        window.scrollTo({ top: top + Math.min(dist, Math.max(0, off)), behavior: reduce ? 'auto' : 'smooth' });
      } else track.scrollTo({ left: off, behavior: reduce ? 'auto' : 'smooth' });
    }
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    window.addEventListener('scroll', onScroll, { passive: true });
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', setup);
    window.addEventListener('load', setup);
    setup();
  })();

  /* ---------------- reveal ---------------- */
  var rv = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) rv.forEach(function (el) { el.classList.add('is-in'); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  }
})();
