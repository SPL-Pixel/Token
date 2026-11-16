'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseFeed, rank, SECTIONS } = require('../lib/feeds');
const { parseChart, loadMarkets } = require('../lib/markets');
const { demoFetcher } = require('../lib/demo');

test('RSS: CDATA, Entities, Bild aus enclosure und content:encoded', () => {
  const xml = `<rss><channel>
    <item><title><![CDATA[Bund &amp; Länder: „Einigung“]]></title><link>https://a.example/1</link>
      <description>&lt;p&gt;Ein &lt;b&gt;Text&lt;/b&gt; mit &amp;uuml;ml&amp;#228;ut.&lt;/p&gt;</description>
      <pubDate>Mon, 16 Nov 2026 10:00:00 +0100</pubDate><enclosure url="https://a.example/b.jpg" type="image/jpeg"/></item>
    <item><title>Zwei</title><link>https://a.example/2</link>
      <content:encoded><![CDATA[<p><img src="https://a.example/c.png" alt=""> Hallo</p>]]></content:encoded></item>
    <item><title>Böse</title><link>javascript:alert(1)</link></item>
  </channel></rss>`;
  const items = parseFeed(xml);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Bund & Länder: „Einigung“');
  assert.equal(items[0].summary, 'Ein Text mit ümläut.');
  assert.equal(items[0].image, 'https://a.example/b.jpg');
  assert.equal(items[0].time, Date.parse('2026-11-16T09:00:00Z'));
  assert.equal(items[1].image, 'https://a.example/c.png');
});

test('Atom: link href und updated', () => {
  const items = parseFeed(`<feed><entry><title type="html">Chip &amp;amp; Co</title>
    <link rel="alternate" href="https://h.example/x?a=1&amp;b=2"/><updated>2026-11-16T08:00:00Z</updated>
    <summary type="html">&lt;p&gt;Kurz&lt;/p&gt;</summary></entry></feed>`);
  assert.equal(items[0].title, 'Chip & Co');
  assert.equal(items[0].link, 'https://h.example/x?a=1&b=2');
  assert.equal(items[0].summary, 'Kurz');
});

test('Gewichtung: Thema mehrerer Redaktionen steht oben und wird gebündelt', () => {
  const now = Date.now();
  const it = (title, n) => ({ title, link: `https://x.example/${n}`, summary: 's', image: null, time: now - 3600e3 });
  const ranked = rank([
    { source: 'tagesschau', items: [it('Wetter bleibt mild', 1), it('Koalition einigt sich auf Haushalt 2027', 2)] },
    { source: 'spiegel', items: [it('Promi heiratet', 3), it('Haushalt 2027: Koalition erzielt Einigung', 4)] },
    { source: 'zeit', items: [it('Einigung der Koalition beim Haushalt', 5)] },
  ], now);
  assert.match(ranked[0].title, /Haushalt/);
  assert.equal(ranked[0].also.length, 2);
  assert.equal(ranked.length, 3);
});

test('Kurse: Yahoo-Chart wird zu Kurs, Veränderung und Sparkline', () => {
  const q = parseChart({ chart: { result: [{ meta: { regularMarketPrice: 110, chartPreviousClose: 100, currency: 'EUR' }, timestamp: [1, 2, 3], indicators: { quote: [{ close: [101, null, 110] }] } }] } }, 'X', 'Test');
  assert.equal(q.pct, 10);
  assert.equal(q.spark.length, 2);
  assert.equal(parseChart({ chart: { result: null, error: {} } }, 'X', 'T'), null);
});

test('Demo-Pipeline: alle Rubriken und Märkte liefern Daten', async () => {
  const f = demoFetcher('http://localhost:1');
  for (const s of SECTIONS) {
    const res = await Promise.all(s.feeds.map(async ([source, url]) => ({ source, items: parseFeed(await f(url)) })));
    assert.ok(rank(res).length > 0, s.id);
  }
  const m = await loadMarkets(f);
  assert.equal(m.dax.length, 40);
  assert.ok(m.groups.every((g) => g.quotes.length));
});
