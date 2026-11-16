'use strict';

const $ = (id) => document.getElementById(id);
const state = { news: null, markets: null, newsError: null, marketsError: null, chartSymbol: '^GDAXI' };

// ---------- Helfer ----------

/** h('a.cls', {href}, kind1, 'text') – Text wird immer als Textknoten gesetzt. */
function h(sel, attrs, ...kids) {
  const [tag, ...cls] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (cls.length) el.className = cls.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) el.setAttribute(k, v);
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k);
  return el;
}
const SVG = 'http://www.w3.org/2000/svg';
function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
  el.append(...kids);
  return el;
}

const nf = (d) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const price = (v, ref = v) => nf(Math.abs(ref) < 10 ? 4 : 2).format(v);
const pct = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + nf(2).format(Math.abs(v)) + ' %';
const signed = (v, ref) => (v > 0 ? '+' : v < 0 ? '−' : '±') + price(Math.abs(v), ref);
const dir = (v) => (v > 0.005 ? 'up' : v < -0.005 ? 'down' : 'flat');
const arrow = (v) => h('span.arrow', { 'aria-hidden': 'true' }, v > 0.005 ? '▲' : v < -0.005 ? '▼' : '■');
const clock = (t) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

function ago(t) {
  if (!t) return '';
  const min = Math.round((Date.now() - t) / 60e3);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  if (min < 24 * 60) return `vor ${Math.round(min / 60)} Std.`;
  return new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
}

// ---------- Artikel ----------

function story(st, { level = 'h3', image = false, summary = true, cls = '' } = {}) {
  const out = (href, ...kids) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, ...kids);
  const img = image && st.image ? h('img', { src: st.image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null;
  if (img) img.addEventListener('error', () => img.remove());
  return h('article.story' + (cls ? '.' + cls : ''), null,
    out(st.link, img, h(level, null, st.title)),
    summary && st.summary ? h('p', null, st.summary) : null,
    h('div.meta', null, h('b', null, st.source), st.time ? ' · ' + ago(st.time) : ''),
    st.also.length ? h('div.also', null, 'Auch bei: ', st.also.flatMap((a, i) => [i ? ', ' : '', out(a.link, a.source)])) : null,
  );
}

// ---------- Kurse ----------

function quotes() { return state.markets ? state.markets.groups.flatMap((g) => g.quotes) : []; }

function sparkline(q, w = 72, hgt = 22) {
  const pts = q.spark;
  if (!pts || pts.length < 2) return null;
  const vals = pts.map((p) => p[1]).concat(q.prev);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const x = (i) => (i / (pts.length - 1)) * (w - 2) + 1;
  const y = (v) => hgt - 2 - ((v - min) / span) * (hgt - 4);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`).join('');
  return s('svg', { viewBox: `0 0 ${w} ${hgt}`, width: w, height: hgt, preserveAspectRatio: 'none', 'aria-hidden': 'true' },
    s('line', { x1: 0, x2: w, y1: y(q.prev), y2: y(q.prev), stroke: 'var(--rule)', 'stroke-dasharray': '2 2', 'vector-effect': 'non-scaling-stroke' }),
    s('path', { d, fill: 'none', stroke: `var(--${q.pct >= 0 ? 'up' : 'down'})`, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }));
}

function renderTicker() {
  const el = $('ticker');
  const want = ['^GDAXI', '^MDAXI', '^STOXX50E', '^GSPC', '^IXIC', 'EURUSD=X', 'GC=F', 'BZ=F', 'BTC-EUR'];
  const qs = want.map((sym) => quotes().find((q) => q.symbol === sym)).filter(Boolean);
  el.replaceChildren(...(qs.length
    ? qs.map((q) => h('a.' + dir(q.pct), { href: '#/boerse' }, h('b', null, q.name), h('span.v', null, price(q.price)), arrow(q.pct), h('span.v', null, pct(q.pct))))
    : [h('span', { style: 'color:var(--muted)' }, state.marketsError ? 'Kursdaten derzeit nicht erreichbar.' : 'Kurse werden geladen …')]));
}

function marketBox() {
  const want = ['^GDAXI', '^STOXX50E', '^GSPC', 'EURUSD=X', 'GC=F', 'BTC-EUR'];
  const qs = want.map((sym) => quotes().find((q) => q.symbol === sym)).filter(Boolean);
  return h('section.box', null,
    h('h2.box-title', null, 'Märkte', h('a', { href: '#/boerse' }, 'Zur Börse →')),
    qs.length
      ? h('table.mini', null, h('tbody', null, qs.map((q) => h('tr.' + dir(q.pct), null,
          h('td', null, q.name), h('td', null, sparkline(q)), h('td', null, price(q.price)), h('td', null, arrow(q.pct), pct(q.pct))))))
      : h('p.note', null, state.marketsError ? 'Kursdaten derzeit nicht erreichbar.' : 'Kurse werden geladen …'),
    qs.length ? h('p.note', null, 'Kurse verzögert. Linie: Tagesverlauf, gestrichelt: Vortagesschluss.') : null);
}

function bigChart(q) {
  const W = 960, H = 320, m = { l: 8, r: 64, t: 14, b: 26 };
  const pts = q.spark || [];
  if (pts.length < 2) return h('p.note', null, 'Für diesen Wert liegt heute noch kein Tagesverlauf vor.');
  const vals = pts.map((p) => p[1]).concat(q.prev);
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min || max * 0.001) * 0.12; min -= pad; max += pad;
  const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
  const x = (t) => m.l + ((t - t0) / (t1 - t0 || 1)) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - (v - min) / (max - min)) * (H - m.t - m.b);
  const color = `var(--${q.pct >= 0 ? 'up' : 'down'})`;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Tagesverlauf ${q.name}: ${price(q.price)}, ${pct(q.pct)} zum Vortag` });
  for (let i = 0; i <= 3; i++) {
    const v = min + ((max - min) * i) / 3;
    svg.append(s('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: 'var(--rule)', 'stroke-width': 1 }),
      s('text', { x: W - m.r + 8, y: y(v) + 4 }, price(v)));
  }
  for (let i = 0; i <= 4; i++) {
    const t = t0 + ((t1 - t0) * i) / 4;
    svg.append(s('text', { x: x(t), y: H - 6, 'text-anchor': i === 0 ? 'start' : i === 4 ? 'end' : 'middle' }, clock(t)));
  }
  svg.append(
    s('line', { x1: m.l, x2: W - m.r, y1: y(q.prev), y2: y(q.prev), stroke: 'var(--muted)', 'stroke-dasharray': '4 4', 'stroke-width': 1 }),
    s('text', { x: m.l + 4, y: y(q.prev) - 5 }, `Vortag ${price(q.prev)}`),
    s('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(''), fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
    s('circle', { cx: x(t1), cy: y(pts[pts.length - 1][1]), r: 4, fill: color, stroke: 'var(--paper)', 'stroke-width': 2 }));
  const cross = s('line', { y1: m.t, y2: H - m.b, stroke: 'var(--ink)', 'stroke-width': 1, visibility: 'hidden' });
  const dot = s('circle', { r: 4.5, fill: color, stroke: 'var(--paper)', 'stroke-width': 2, visibility: 'hidden' });
  svg.append(cross, dot);
  const tip = $('tip');
  const hide = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const t = t0 + (((e.clientX - r.left) / r.width) * W - m.l) / (W - m.l - m.r) * (t1 - t0);
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[0] - t) < Math.abs(best[0] - t)) best = p;
    cross.setAttribute('x1', x(best[0])); cross.setAttribute('x2', x(best[0])); cross.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', x(best[0])); dot.setAttribute('cy', y(best[1])); dot.setAttribute('visibility', 'visible');
    tip.replaceChildren(h('b', null, price(best[1])), ` · ${clock(best[0])} Uhr · ${pct(((best[1] - q.prev) / q.prev) * 100)}`);
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, e.clientX - tw / 2)) + 'px';
    tip.style.top = Math.max(8, r.top + (y(best[1]) / H) * r.height - 40) + 'px';
  });
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('pointercancel', hide);
  return h('div.chart', null, svg);
}

function quoteTable(list, { bars = false } = {}) {
  const maxAbs = Math.max(...list.map((q) => Math.abs(q.pct)), 0.01);
  return h('div.tbl-scroll', null, h('table.tbl', null,
    h('thead', null, h('tr', null, h('th', null, 'Wert'), h('th', null, 'Kurs'), h('th', null, '+/−'), h('th', null, 'Veränderung'))),
    h('tbody', null, list.map((q) => h('tr.' + dir(q.pct), null,
      h('td', null, q.name), h('td', null, price(q.price)), h('td', null, signed(q.change, q.price)),
      h('td', null, bars ? h('span.bar', { style: `width:${Math.max(2, (Math.abs(q.pct) / maxAbs) * 56)}px` }) : arrow(q.pct), pct(q.pct)))))));
}

// ---------- Ansichten ----------

function section(id) { return state.news && state.news.sections.find((x) => x.id === id); }

function viewFront() {
  const top = section('titel').stories;
  if (!top.length) return viewSection(state.news.sections.find((x) => x.stories.length).id);
  const [lead, ...rest] = top;
  const left = rest.slice(0, 3), sub = rest.slice(3, 5), more = rest.slice(5, 9);
  const brief = top.slice(0, 5);
  const out = [h('div.front', null,
    h('div.side-left.stack', null, left.map((st, i) => story(st, { image: i === 0 }))),
    h('div.lead', null, story(lead, { level: 'h2', image: true }),
      sub.length ? h('div.lead-sub', null, sub.map((st) => h('div', null, story(st)))) : null),
    h('aside.rail', null,
      h('section.box', null, h('h2.box-title', null, 'Das Wichtigste in Kürze'),
        h('ol.brief', null, brief.map((st) => h('li', null, h('div', null,
          h('a.hl', { href: st.link, target: '_blank', rel: 'noopener noreferrer' }, st.title),
          h('span.meta', null, st.also.length ? `${st.also.length + 1} Redaktionen berichten` : st.source)))))),
      marketBox()))];
  if (more.length) out.push(h('section.band', null, h('div.band-title', null, h('h2', null, 'Weitere Meldungen')),
    h('div.cols', null, more.map((st) => h('div', null, story(st, { cls: 'small', summary: false }))))));
  for (const sec of state.news.sections) {
    if (sec.id === 'titel' || !sec.stories.length) continue;
    out.push(h('section.band', null,
      h('div.band-title', null, h('h2', null, sec.name), h('a', { href: sec.id === 'finanzen' ? '#/boerse' : `#/rubrik/${sec.id}` }, sec.id === 'finanzen' ? 'Zur Börse →' : `Mehr ${sec.name} →`)),
      h('div.cols', null, sec.stories.slice(0, 4).map((st, i) => h('div', null, story(st, { image: i === 0, summary: i < 2, cls: i ? 'small' : '' }))))));
  }
  return out;
}

function viewSection(id) {
  const sec = section(id);
  if (!sec) return viewFront();
  if (!sec.stories.length) return [h('div.sec-head', null, h('h1', null, sec.name)), h('p.error', null, 'Für diese Rubrik liegen gerade keine Meldungen vor.')];
  const [lead, ...rest] = sec.stories;
  return [
    h('div.sec-head', null, h('h1', null, sec.name), h('p', null, `${sec.stories.length} Themen, nach Gewicht geordnet`)),
    h('div.sec-grid', null,
      h('div.lead', null, story(lead, { level: 'h2', image: true })),
      h('div.stack', null, rest.slice(0, 3).map((st) => story(st)))),
    rest.length > 3 ? h('div.rows', null, rest.slice(3).map((st) => {
      const a = story(st);
      const img = st.image ? h('img', { src: st.image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : h('span');
      if (st.image) img.addEventListener('error', () => img.replaceWith(h('span')));
      a.prepend(img);
      const body = h('div', null, ...[...a.children].slice(1));
      a.append(body, h('div.when', null, st.time ? new Date(st.time).toLocaleString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' Uhr' : ''));
      return a;
    })) : null,
  ];
}

function viewMarkets() {
  const head = h('div.sec-head', null, h('h1', null, 'Börse'), h('p', null, 'Indizes, Devisen, Rohstoffe und der DAX im Überblick'));
  const m = state.markets;
  const fin = section('finanzen');
  const news = fin && fin.stories.length ? h('section.band', null, h('div.band-title', null, h('h2', null, 'Finanznachrichten')),
    h('div.cols', null, fin.stories.slice(0, 8).map((st, i) => h('div', { style: i > 3 ? 'margin-top:18px' : null }, story(st, { cls: 'small', summary: i < 4 }))))) : null;
  if (!m) return [head, h('p.error', null, state.marketsError ? 'Die Kursdaten sind derzeit nicht erreichbar.' : 'Kurse werden geladen …', state.marketsError ? h('small', null, state.marketsError) : null), news];

  const indices = m.groups.find((g) => g.id === 'indizes');
  const all = quotes();
  const sel = all.find((q) => q.symbol === state.chartSymbol) || all[0];
  const tiles = indices && indices.quotes.length ? h('div.tiles', null, indices.quotes.map((q) => {
    const b = h('button.tile.' + dir(q.pct), { type: 'button', 'aria-pressed': String(q.symbol === sel.symbol) },
      h('div.n', null, q.name), h('div.p', null, price(q.price)),
      h('div.c', null, arrow(q.pct), pct(q.pct), ' · ', signed(q.change, q.price)), sparkline(q, 200, 34));
    b.addEventListener('click', () => { state.chartSymbol = q.symbol; render(); });
    return b;
  })) : null;
  const chart = sel ? h('section.chart-wrap', null,
    h('div.chart-head', null, h('h2', null, sel.name + ' – Tagesverlauf'),
      h('span.' + dir(sel.pct), null, price(sel.price), arrow(sel.pct), pct(sel.pct), sel.time ? ` · Stand ${clock(sel.time)} Uhr` : '')),
    bigChart(sel)) : null;

  const others = m.groups.filter((g) => g.id !== 'indizes' && g.quotes.length);
  const win = m.dax.slice(0, 5), lose = m.dax.slice(-5).reverse();
  return [head, tiles, chart,
    m.dax.length >= 10 ? h('section.band', null, h('div.band-title', null, h('h2', null, 'DAX: Gewinner und Verlierer')),
      h('div.cols.three', null,
        h('div', null, h('p.kicker', null, 'Tagesgewinner'), quoteTable(win, { bars: true })),
        h('div', null, h('p.kicker', null, 'Tagesverlierer'), quoteTable(lose, { bars: true })),
        h('div', null, others.map((g) => h('div', { style: 'margin-bottom:18px' }, h('p.kicker', null, g.name), quoteTable(g.quotes)))))) :
      h('section.band', null, h('div.cols.three', null, others.map((g) => h('div', null, h('p.kicker', null, g.name), quoteTable(g.quotes))))),
    news,
    m.dax.length ? h('section.band', null, h('div.band-title', null, h('h2', null, 'Alle DAX-Werte')), quoteTable(m.dax)) : null,
    h('p.note', null, 'Kursdaten: Yahoo Finance, je nach Börsenplatz bis zu 15 Minuten verzögert. Keine Anlageberatung.'),
  ];
}

// ---------- Rahmen ----------

function route() {
  const [, kind, id] = location.hash.split('/');
  if (kind === 'boerse') return { kind };
  if (kind === 'rubrik' && id) return { kind, id };
  return { kind: 'front' };
}

function renderChrome() {
  const now = new Date();
  $('date').textContent = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hr = now.getHours();
  $('edition').textContent = hr < 5 ? 'Nachtausgabe' : hr < 11 ? 'Morgenausgabe' : hr < 15 ? 'Mittagsausgabe' : hr < 22 ? 'Abendausgabe' : 'Nachtausgabe';
  const r = route();
  const items = [['#/', 'Titelseite', r.kind === 'front']];
  for (const sec of state.news ? state.news.sections : []) {
    if (sec.id === 'titel' || sec.id === 'finanzen') continue;
    items.push([`#/rubrik/${sec.id}`, sec.name, r.kind === 'rubrik' && r.id === sec.id]);
  }
  items.push(['#/boerse', 'Börse', r.kind === 'boerse']);
  $('nav').replaceChildren(...items.map(([href, name, cur]) => h('a', { href, 'aria-current': cur ? 'page' : null }, name)));
  if (state.news) $('updated').textContent = `Stand ${clock(state.news.generated)} Uhr`;
  renderTicker();
  const n = state.news;
  $('foot').replaceChildren(
    n ? h('div.src', null, 'Quellen: ', n.sources.flatMap((x) => [h('span' + (x.ok ? '' : '.off'), { title: x.ok ? null : 'derzeit nicht erreichbar' }, x.name), ' '])) : '',
    h('div', null, 'Der Tagesbote bündelt öffentlich zugängliche Feeds, zeigt Überschrift und Anriss und verlinkt auf die Originalartikel. Alle Rechte an den Inhalten liegen bei den jeweiligen Redaktionen.'));
  document.title = (r.kind === 'boerse' ? 'Börse – ' : r.kind === 'rubrik' && section(r.id) ? section(r.id).name + ' – ' : '') + 'Der Tagesbote';
}

function render() {
  renderChrome();
  $('tip').hidden = true;
  const r = route();
  let nodes;
  if (r.kind === 'boerse') nodes = viewMarkets();
  else if (!state.news) nodes = [h('p.' + (state.newsError ? 'error' : 'loading'), null,
    state.newsError ? 'Die Ausgabe konnte nicht geladen werden.' : 'Die Ausgabe wird gesetzt …', state.newsError ? h('small', null, state.newsError) : null)];
  else nodes = r.kind === 'rubrik' ? viewSection(r.id) : viewFront();
  const demo = (state.news && state.news.demo) || (state.markets && state.markets.demo);
  $('main').replaceChildren(...[demo ? h('p.demo-note', { style: 'margin:0 0 18px' }, 'Demo-Modus: Alle Meldungen und Kurse sind erfundene Beispieldaten.') : null, ...nodes].flat().filter(Boolean));
}

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
  return data;
}

async function load() {
  $('reload').classList.add('spin');
  await Promise.all([
    getJson('api/news').then((d) => { state.news = d; state.newsError = null; }, (e) => { state.newsError = e.message; }).then(render),
    getJson('api/markets').then((d) => { state.markets = d; state.marketsError = null; }, (e) => { state.marketsError = e.message; }).then(render),
  ]);
  $('reload').classList.remove('spin');
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
$('reload').addEventListener('click', load);
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.news && Date.now() - state.news.generated > 5 * 60e3) load(); });
setInterval(() => { if (!document.hidden) load(); }, 5 * 60e3);
render();
load();
