'use strict';

// Der Tagesbote – kleiner Server ohne Abhängigkeiten (Node >= 18).
// Holt RSS-Feeds und Kursdaten serverseitig (kein CORS-Problem im Browser),
// bereitet sie zu einer "Ausgabe" auf und liefert die Oberfläche aus.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { SECTIONS, SOURCES, parseFeed, rank } = require('./lib/feeds');
const { loadMarkets } = require('./lib/markets');
const { demoFetcher, demoImage } = require('./lib/demo');

const PORT = Number(process.env.PORT) || 3000;
const DEMO = process.env.DEMO === '1';
const NEWS_TTL = 5 * 60e3;
const MARKET_TTL = 2 * 60e3;
const PUBLIC = path.join(__dirname, 'public');
const UA = 'Mozilla/5.0 (compatible; Tagesbote/1.0; privater Feedreader)';

async function netFetch(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, application/json, text/xml, */*' },
    signal: AbortSignal.timeout(10e3),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const fetchText = DEMO ? demoFetcher(`http://localhost:${PORT}`) : netFetch;

/** Cache mit "stale-while-error": schlägt ein Abruf fehl, bleibt der alte Stand. */
function cached(ttl, load) {
  let value = null, at = 0, pending = null;
  return () => {
    if (value && Date.now() - at < ttl) return Promise.resolve(value);
    if (!pending) {
      pending = load()
        .then((v) => { value = v; at = Date.now(); return v; })
        .catch((e) => { if (value) return value; throw e; })
        .finally(() => { pending = null; });
    }
    return pending;
  };
}

const getNews = cached(NEWS_TTL, async () => {
  const urls = [...new Set(SECTIONS.flatMap((s) => s.feeds.map((f) => f[1])))];
  const byUrl = new Map();
  const status = {};
  await Promise.all(urls.map(async (url) => {
    try { byUrl.set(url, parseFeed(await fetchText(url))); }
    catch (e) { byUrl.set(url, []); status[url] = String(e.message || e); }
  }));
  const sections = SECTIONS.map((s) => ({
    id: s.id,
    name: s.name,
    stories: rank(s.feeds.map(([source, url]) => ({ source, items: byUrl.get(url) || [] }))).slice(0, s.id === 'titel' ? 14 : 16),
  }));
  const total = sections.reduce((n, s) => n + s.stories.length, 0);
  if (!total) throw new Error('Keine Nachrichtenquelle erreichbar');
  const sources = Object.keys(SOURCES).map((id) => {
    const mine = SECTIONS.flatMap((s) => s.feeds.filter((f) => f[0] === id).map((f) => f[1]));
    return { name: SOURCES[id], ok: mine.some((u) => (byUrl.get(u) || []).length > 0) };
  });
  return { generated: Date.now(), demo: DEMO, sections, sources, failedFeeds: Object.keys(status).length };
});

const getMarkets = cached(MARKET_TTL, async () => {
  const m = await loadMarkets(fetchText);
  if (!m.ok) throw new Error('Kursdaten nicht erreichbar');
  return { generated: Date.now(), demo: DEMO, ...m };
});

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function send(res, code, body, type, extra = {}) {
  res.writeHead(code, { 'content-type': type, 'x-content-type-options': 'nosniff', ...extra });
  res.end(body);
}

async function api(res, getter) {
  try { send(res, 200, JSON.stringify(await getter()), TYPES['.json'], { 'cache-control': 'no-store' }); }
  catch (e) { send(res, 502, JSON.stringify({ error: String(e.message || e) }), TYPES['.json']); }
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed', 'text/plain');
  if (pathname === '/api/news') return api(res, getNews);
  if (pathname === '/api/markets') return api(res, getMarkets);
  if (DEMO && pathname.startsWith('/demo-img/')) return send(res, 200, demoImage(pathname), TYPES['.svg'], { 'cache-control': 'max-age=86400' });

  const file = path.normalize(path.join(PUBLIC, pathname === '/' ? 'index.html' : decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Nicht gefunden', 'text/plain; charset=utf-8');
    const ext = path.extname(file);
    send(res, 200, data, TYPES[ext] || 'application/octet-stream', { 'cache-control': ext === '.woff2' ? 'max-age=31536000, immutable' : 'no-cache' });
  });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Der Tagesbote läuft: http://localhost:${PORT}${DEMO ? '  (Demo-Modus mit Beispieldaten)' : ''}`));
}

module.exports = { server };
