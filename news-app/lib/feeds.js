'use strict';

// Quellen und Rubriken. Jede Rubrik bündelt mehrere Redaktionen, damit die
// Gewichtung ("worüber berichten alle?") funktioniert.
const SOURCES = {
  tagesschau: 'tagesschau',
  spiegel: 'DER SPIEGEL',
  zeit: 'ZEIT ONLINE',
  faz: 'F.A.Z.',
  sportschau: 'Sportschau',
  heise: 'heise online',
};

const ts = (p) => `https://www.tagesschau.de/${p}index~rss2.xml`;
const sp = (p) => `https://www.spiegel.de/${p}/index.rss`;
const zt = (p) => `https://newsfeed.zeit.de/${p}`;
const fz = (p) => `https://www.faz.net/rss/aktuell/${p}`;

const SECTIONS = [
  {
    id: 'titel', name: 'Titelseite',
    feeds: [['tagesschau', ts('')], ['spiegel', sp('schlagzeilen')], ['zeit', zt('index')], ['faz', fz('')]],
  },
  {
    id: 'politik', name: 'Politik',
    feeds: [['tagesschau', ts('inland/')], ['spiegel', sp('politik/deutschland')], ['zeit', zt('politik/deutschland/index')], ['faz', fz('politik/inland/')]],
  },
  {
    id: 'ausland', name: 'Ausland',
    feeds: [['tagesschau', ts('ausland/')], ['spiegel', sp('ausland')], ['zeit', zt('politik/ausland/index')], ['faz', fz('politik/ausland/')]],
  },
  {
    id: 'wirtschaft', name: 'Wirtschaft',
    feeds: [['tagesschau', ts('wirtschaft/')], ['spiegel', sp('wirtschaft')], ['zeit', zt('wirtschaft/index')], ['faz', fz('wirtschaft/')]],
  },
  {
    id: 'finanzen', name: 'Finanzen',
    feeds: [['faz', fz('finanzen/')], ['tagesschau', ts('wirtschaft/finanzen/')], ['zeit', zt('geld/index')]],
  },
  {
    id: 'technik', name: 'Technik',
    feeds: [['heise', 'https://www.heise.de/rss/heise-atom.xml'], ['spiegel', sp('netzwelt')], ['zeit', zt('digital/index')]],
  },
  {
    id: 'wissen', name: 'Wissen',
    feeds: [['tagesschau', ts('wissen/')], ['spiegel', sp('wissenschaft')], ['zeit', zt('wissen/index')], ['faz', fz('wissen/')]],
  },
  {
    id: 'kultur', name: 'Kultur',
    feeds: [['spiegel', sp('kultur')], ['zeit', zt('kultur/index')], ['faz', fz('feuilleton/')]],
  },
  {
    id: 'sport', name: 'Sport',
    feeds: [['sportschau', 'https://www.sportschau.de/index~rss2.xml'], ['spiegel', sp('sport')], ['zeit', zt('sport/index')], ['faz', fz('sport/')]],
  },
  {
    id: 'panorama', name: 'Panorama',
    feeds: [['spiegel', sp('panorama')], ['zeit', zt('gesellschaft/index')], ['faz', fz('gesellschaft/')]],
  },
  {
    id: 'leben', name: 'Leben & Reise',
    feeds: [['spiegel', sp('reise')], ['faz', fz('reise/')], ['faz', fz('stil/')], ['zeit', zt('entdecken/index')]],
  },
];

// ---------- RSS / Atom ----------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', euro: '€' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    }
    return e in ENTITIES ? ENTITIES[e] : m;
  });
}

const unCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

/** Roh-XML eines Feldes -> reiner Text. */
function toText(raw) {
  if (!raw) return '';
  let s = unCdata(raw);
  s = decodeEntities(s);          // Feeds kodieren HTML oft doppelt
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  return s.replace(/\s+/g, ' ').trim();
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : '';
}

function attr(xml, name, attribute) {
  const re = new RegExp(`<${name}\\s[^>]*>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    const a = m[0].match(new RegExp(`\\s${attribute}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
    if (a) out.push({ value: decodeEntities(a[2] ?? a[3]), tag: m[0] });
  }
  return out;
}

function findImage(item) {
  for (const t of ['media:content', 'media:thumbnail', 'enclosure']) {
    for (const c of attr(item, t, 'url')) {
      if (t === 'media:thumbnail' || /type\s*=\s*["']image|medium\s*=\s*["']image/i.test(c.tag) || /\.(jpe?g|png|webp|avif)(\?|$)/i.test(c.value)) return c.value;
    }
  }
  const html = decodeEntities(unCdata(tag(item, 'content:encoded') + tag(item, 'description') + tag(item, 'content')));
  const img = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  return img ? decodeEntities(img[1]) : null;
}

function safeUrl(u) {
  try {
    const url = new URL(u.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}

function parseFeed(xml) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  const items = [];
  for (const b of blocks) {
    const title = toText(tag(b, 'title'));
    let link = toText(tag(b, 'link'));
    if (!link) {
      const links = attr(b, 'link', 'href');
      link = (links.find((l) => /rel\s*=\s*["']alternate/i.test(l.tag)) || links[0] || {}).value || '';
    }
    link = safeUrl(link);
    if (!title || !link) continue;
    const dateRaw = toText(tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated'));
    const time = Date.parse(dateRaw);
    let summary = toText(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded') || tag(b, 'content'));
    if (summary.length > 320) summary = summary.slice(0, 317).replace(/\s+\S*$/, '') + ' …';
    const image = findImage(b);
    items.push({ title, link, summary, image: image && safeUrl(image), time: Number.isFinite(time) ? time : null });
  }
  return items;
}

// ---------- Gewichtung ----------

const STOP = new Set('aber alle allem allen aller alles also andere anderen auch beim bereits bisher damit dann dass denn deren diese diesem diesen dieser dieses doch dort durch eine einem einen einer eines erst etwa euch gegen geht gibt habe haben hatte heute hier immer jetzt kann kein keine können laut mehr muss nach neue neuen neuer neues nicht noch oder ohne schon sehr seien sein seine seinem seinen seiner seit sich sind soll sollen über unter viele viel vom von vor warum wegen weil weiter welche wenn werden wieder wird wurde wurden zwischen zwei drei jahr jahre jahren will wollen macht machen sagt wäre'.split(' '));

function tokens(title) {
  return new Set(
    title.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/[\s-]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w))
      .map((w) => w.slice(0, 7)),   // grobe Stammform: "Regierung" ~ "Regierungen"
  );
}

function similar(a, b) {
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  if (shared < 2) return false;
  return shared / Math.min(a.size, b.size) >= 0.4;
}

/**
 * Fasst gleiche Themen verschiedener Redaktionen zusammen und sortiert nach
 * Wichtigkeit: Anzahl der berichtenden Quellen, Platzierung im Feed, Aktualität.
 */
function rank(feedResults, now = Date.now()) {
  const stories = [];
  const seen = new Set();
  for (const { source, items } of feedResults) {
    items.slice(0, 25).forEach((it, pos) => {
      if (seen.has(it.link)) return;
      seen.add(it.link);
      const tk = tokens(it.title);
      const entry = { ...it, source, sourceName: SOURCES[source] || source, pos };
      const hit = stories.find((s) => !s.items.some((x) => x.source === source) && similar(s.tk, tk));
      if (hit) {
        hit.items.push(entry);
        for (const t of tk) hit.tk.add(t);
      } else stories.push({ tk, items: [entry] });
    });
  }
  return stories.map((s) => {
    const lead = s.items.find((x) => x.summary && x.image) || s.items.find((x) => x.summary) || s.items[0];
    const bestPos = Math.min(...s.items.map((x) => x.pos));
    const newest = Math.max(...s.items.map((x) => x.time || 0));
    const ageH = newest ? Math.max(0, (now - newest) / 36e5) : 12;
    const score = (s.items.length - 1) * 4 + Math.max(0, 3 - bestPos * 0.3) + Math.max(0, 3 - ageH / 4);
    return {
      title: lead.title,
      summary: lead.summary,
      link: lead.link,
      image: lead.image || (s.items.find((x) => x.image) || {}).image || null,
      source: lead.sourceName,
      time: newest || null,
      score: Math.round(score * 100) / 100,
      also: s.items.filter((x) => x !== lead).map((x) => ({ source: x.sourceName, title: x.title, link: x.link })),
    };
  }).sort((a, b) => b.score - a.score || (b.time || 0) - (a.time || 0));
}

module.exports = { SECTIONS, SOURCES, parseFeed, rank, toText };
