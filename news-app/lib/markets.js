'use strict';

// Kursdaten über den öffentlichen Chart-Endpunkt von Yahoo Finance
// (inoffiziell, ohne API-Schlüssel, je nach Börse ca. 15 Minuten verzögert).

const GROUPS = [
  {
    id: 'indizes', name: 'Indizes',
    symbols: [['^GDAXI', 'DAX'], ['^MDAXI', 'MDAX'], ['^TECDAX', 'TecDAX'], ['^STOXX50E', 'Euro Stoxx 50'], ['^GSPC', 'S&P 500'], ['^DJI', 'Dow Jones'], ['^IXIC', 'Nasdaq Comp.'], ['^N225', 'Nikkei 225']],
  },
  {
    id: 'devisen', name: 'Devisen & Krypto',
    symbols: [['EURUSD=X', 'Euro / Dollar'], ['EURCHF=X', 'Euro / Franken'], ['EURGBP=X', 'Euro / Pfund'], ['BTC-EUR', 'Bitcoin (EUR)']],
  },
  {
    id: 'rohstoffe', name: 'Rohstoffe',
    symbols: [['GC=F', 'Gold (USD/oz)'], ['BZ=F', 'Öl Brent (USD)'], ['NG=F', 'Erdgas (USD)'], ['HG=F', 'Kupfer (USD/lb)']],
  },
];

const DAX = { 'ADS.DE': 'Adidas', 'AIR.DE': 'Airbus', 'ALV.DE': 'Allianz', 'BAS.DE': 'BASF', 'BAYN.DE': 'Bayer', 'BEI.DE': 'Beiersdorf', 'BMW.DE': 'BMW', 'BNR.DE': 'Brenntag', 'CBK.DE': 'Commerzbank', 'CON.DE': 'Continental', 'DTG.DE': 'Daimler Truck', 'DBK.DE': 'Deutsche Bank', 'DB1.DE': 'Deutsche Börse', 'DHL.DE': 'DHL Group', 'DTE.DE': 'Deutsche Telekom', 'EOAN.DE': 'E.ON', 'FRE.DE': 'Fresenius', 'FME.DE': 'Fresenius Medical Care', 'G1A.DE': 'GEA Group', 'HNR1.DE': 'Hannover Rück', 'HEI.DE': 'Heidelberg Materials', 'HEN3.DE': 'Henkel', 'IFX.DE': 'Infineon', 'MBG.DE': 'Mercedes-Benz', 'MRK.DE': 'Merck', 'MTX.DE': 'MTU Aero Engines', 'MUV2.DE': 'Münchener Rück', 'PAH3.DE': 'Porsche SE', 'QIA.DE': 'Qiagen', 'RHM.DE': 'Rheinmetall', 'RWE.DE': 'RWE', 'SAP.DE': 'SAP', 'G24.DE': 'Scout24', 'SIE.DE': 'Siemens', 'ENR.DE': 'Siemens Energy', 'SHL.DE': 'Siemens Healthineers', 'SY1.DE': 'Symrise', 'VOW3.DE': 'Volkswagen', 'VNA.DE': 'Vonovia', 'ZAL.DE': 'Zalando' };

const chartUrl = (symbol, host = 'query1') =>
  `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m&includePrePost=false`;

/** Yahoo-Chart-Antwort -> kompaktes Kursobjekt (oder null). */
function parseChart(json, symbol, name) {
  const r = json && json.chart && json.chart.result && json.chart.result[0];
  if (!r || !r.meta) return null;
  const m = r.meta;
  const closes = ((r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || []);
  const stamps = r.timestamp || [];
  const points = [];
  closes.forEach((c, i) => { if (typeof c === 'number' && stamps[i]) points.push([stamps[i] * 1000, c]); });
  const price = typeof m.regularMarketPrice === 'number' ? m.regularMarketPrice : points.length ? points[points.length - 1][1] : null;
  const prev = typeof m.previousClose === 'number' ? m.previousClose : m.chartPreviousClose;
  if (typeof price !== 'number' || typeof prev !== 'number' || !prev) return null;
  // Sparkline auf max. ~60 Punkte ausdünnen
  const step = Math.max(1, Math.ceil(points.length / 60));
  const spark = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  return {
    symbol, name,
    price, prev,
    change: price - prev,
    pct: ((price - prev) / prev) * 100,
    currency: m.currency || null,
    time: m.regularMarketTime ? m.regularMarketTime * 1000 : null,
    spark,
  };
}

async function pool(tasks, size) {
  const out = new Array(tasks.length);
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < tasks.length) { const n = i++; out[n] = await tasks[n](); }
  }));
  return out;
}

async function loadMarkets(fetchText) {
  const quote = async (symbol, name) => {
    for (const host of ['query1', 'query2']) {
      try {
        const q = parseChart(JSON.parse(await fetchText(chartUrl(symbol, host))), symbol, name);
        if (q) return q;
      } catch { /* nächster Host */ }
    }
    return null;
  };
  const jobs = [];
  for (const g of GROUPS) for (const [s, n] of g.symbols) jobs.push(() => quote(s, n));
  for (const [s, n] of Object.entries(DAX)) jobs.push(() => quote(s, n));
  const res = await pool(jobs, 8);
  let k = 0;
  const groups = GROUPS.map((g) => ({ id: g.id, name: g.name, quotes: g.symbols.map(() => res[k++]).filter(Boolean) }));
  const dax = res.slice(k).filter(Boolean).map(({ spark, ...q }) => q).sort((a, b) => b.pct - a.pct);
  return { groups, dax, ok: groups.some((g) => g.quotes.length) };
}

module.exports = { GROUPS, DAX, parseChart, loadMarkets, chartUrl };
