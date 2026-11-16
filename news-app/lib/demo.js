'use strict';

// Beispieldaten für `npm run demo` und die Tests: erzeugt aus erfundenen
// Platzhalter-Schlagzeilen echte RSS-/Chart-Antworten, damit dieselbe
// Verarbeitung wie im Live-Betrieb durchlaufen wird. Keine echten Nachrichten.

const { SECTIONS } = require('./feeds');
const { GROUPS, DAX } = require('./markets');

const HEADLINES = {
  titel: [
    ['Koalition einigt sich nach Nachtsitzung auf Haushalt', 'Nach stundenlangen Verhandlungen steht der Kompromiss: Investitionen in Schiene und Schulen sollen steigen, an anderer Stelle wird gekürzt.', 1],
    ['Zentralbank lässt Leitzins unverändert', 'Die Währungshüter verweisen auf die abflauende Teuerung, wollen sich aber nicht auf einen Zeitpunkt für die nächste Senkung festlegen.', 1],
    ['Gipfeltreffen endet mit gemeinsamer Erklärung zum Klimaschutz', 'Die Staats- und Regierungschefs verständigen sich auf neue Zwischenziele – Umweltverbände sprechen von einem Minimalkonsens.', 1],
    ['Bahn kündigt Generalsanierung weiterer Strecken an', 'Pendler müssen sich auf monatelange Sperrungen einstellen. Der Konzern verspricht danach deutlich pünktlichere Züge.', 0],
    ['Neue Studie: Lesekompetenz von Grundschülern stabilisiert sich', 'Erstmals seit Jahren verzeichnen Bildungsforscher keinen weiteren Rückgang. Entwarnung geben sie trotzdem nicht.', 0],
    ['Sturmtief zieht über den Norden – Fährverkehr eingestellt', 'An der Küste werden orkanartige Böen erwartet. Die Behörden raten, Wälder und Deiche zu meiden.', 0],
  ],
  politik: [
    ['Bundestag debattiert über Reform der Pflegeversicherung', 'Die Opposition hält die Pläne für unterfinanziert, die Regierung spricht von einem notwendigen ersten Schritt.', 1],
    ['Länder fordern mehr Geld für den Nahverkehr', 'Vor der Verkehrsministerkonferenz wächst der Druck auf den Bund.', 1],
    ['Kommunen warnen vor Investitionsstau', 'Marode Brücken, fehlende Kitaplätze: Der Städtetag legt neue Zahlen vor.', 0],
    ['Untersuchungsausschuss lädt weitere Zeugen', 'Die Abgeordneten wollen klären, wer wann von den Vorgängen wusste.', 0],
    ['Wahlrechtskommission legt Abschlussbericht vor', 'Das Gremium empfiehlt mehrere Änderungen am Zuschnitt der Wahlkreise.', 0],
  ],
  ausland: [
    ['Parlamentswahl im Nachbarland: Regierungsbildung dürfte schwierig werden', 'Keines der Lager kommt auf eine eigene Mehrheit. Beobachter rechnen mit wochenlangen Sondierungen.', 1],
    ['Vereinte Nationen rufen zu humanitärer Feuerpause auf', 'Hilfsorganisationen berichten von einer dramatischen Versorgungslage.', 1],
    ['Handelsgespräche zwischen EU und Partnerstaaten vertagt', 'Strittig bleiben vor allem Agrarquoten und Umweltstandards.', 0],
    ['Schweres Erdbeben erschüttert Küstenregion', 'Rettungskräfte suchen nach Verschütteten, das Ausmaß der Schäden ist noch unklar.', 0],
    ['Neuer Premier stellt Kabinett vor', 'Mehrere Schlüsselressorts gehen an parteilose Fachleute.', 0],
  ],
  wirtschaft: [
    ['Industrie meldet überraschend mehr Aufträge', 'Vor allem Großbestellungen aus dem Ausland sorgen für das Plus.', 1],
    ['Tarifrunde im öffentlichen Dienst beginnt mit Warnstreiks', 'Die Gewerkschaft fordert deutlich mehr Lohn, die Arbeitgeber verweisen auf leere Kassen.', 1],
    ['Autobauer investiert Milliarden in Batteriewerk', 'Am neuen Standort sollen mehrere Tausend Arbeitsplätze entstehen.', 0],
    ['Mittelstand klagt über Bürokratie', 'Eine Umfrage zeigt: Berichtspflichten kosten kleine Firmen immer mehr Zeit.', 0],
    ['Strompreise für Haushalte sinken leicht', 'Vergleichsportale sehen den Wettbewerb unter den Versorgern zurückkehren.', 0],
  ],
  finanzen: [
    ['Leitindex schließt nach Zinsentscheid im Plus', 'Anleger werten die Aussagen der Notenbank als Signal der Verlässlichkeit.', 1],
    ['Goldpreis nähert sich Rekordhoch', 'Die Nachfrage nach dem Edelmetall bleibt hoch.', 0],
    ['Was Sparer jetzt über Festgeld wissen sollten', 'Die Zinsen bröckeln – ein Überblick über sinnvolle Laufzeiten.', 0],
    ['Berichtssaison: Diese Zahlen stehen in dieser Woche an', 'Mehrere Schwergewichte öffnen ihre Bücher.', 0],
  ],
  technik: [
    ['Neue Chipfabrik nimmt Produktion auf', 'Das Werk soll die Abhängigkeit von Importen verringern.', 1],
    ['Sicherheitslücke in verbreiteter Bürosoftware entdeckt', 'Der Hersteller hat ein Update bereitgestellt und rät zur zügigen Installation.', 1],
    ['EU-Regeln für künstliche Intelligenz treten in nächste Phase', 'Anbieter müssen nun offenlegen, womit ihre Modelle trainiert wurden.', 0],
    ['Glasfaserausbau kommt auf dem Land schneller voran', 'Die Branche meldet einen Rekord bei Neuanschlüssen.', 0],
  ],
  wissen: [
    ['Raumsonde sendet erste Bilder aus der Umlaufbahn', 'Die Aufnahmen zeigen die Oberfläche in bislang unerreichter Schärfe.', 1],
    ['Forscher entschlüsseln Erbgut einer uralten Getreidesorte', 'Die Erkenntnisse könnten bei der Zucht hitzeresistenter Pflanzen helfen.', 0],
    ['Gletscher in den Alpen verlieren weiter an Masse', 'Der Sommer war zu warm, der Winter zu schneearm.', 0],
    ['Wie Schlaf das Gedächtnis ordnet', 'Eine neue Studie zeigt, was im Gehirn während der Tiefschlafphase passiert.', 0],
  ],
  kultur: [
    ['Filmfestspiele eröffnen mit Familiendrama', 'Der Wettbewerb gilt in diesem Jahr als besonders stark besetzt.', 1],
    ['Literaturpreis geht an Debütroman', 'Die Jury lobt die „unerschrockene, genaue Sprache“.', 0],
    ['Museum zeigt große Retrospektive der Moderne', 'Mehr als zweihundert Leihgaben aus aller Welt sind zu sehen.', 0],
    ['Orchester ernennt neue Chefdirigentin', 'Sie tritt ihr Amt zur kommenden Spielzeit an.', 0],
  ],
  sport: [
    ['Nationalelf gewinnt Qualifikationsspiel in letzter Minute', 'Ein später Kopfballtreffer sichert die Tabellenführung.', 1],
    ['Tabellenführer patzt im Spitzenspiel', 'Nach der Niederlage schmilzt der Vorsprung auf zwei Punkte.', 1],
    ['Biathlon: Staffel läuft aufs Podest', 'Am Schießstand blieb das Quartett nahezu fehlerfrei.', 0],
    ['Handballer ziehen ins Pokalfinale ein', 'Im Halbfinale gelang ein souveräner Sieg.', 0],
  ],
  panorama: [
    ['Schnee und Glätte sorgen für Verkehrschaos im Süden', 'Auf mehreren Autobahnen ging stundenlang nichts mehr.', 1],
    ['Feuerwehr rettet Wanderer aus Bergnot', 'Die Gruppe war vom Weg abgekommen und vom Wetter überrascht worden.', 0],
    ['Stadt führt autofreie Sonntage ein', 'Das Pilotprojekt ist zunächst auf ein halbes Jahr angelegt.', 0],
    ['Seltener Fund: Hobbyarchäologe entdeckt Münzschatz', 'Die Stücke stammen vermutlich aus dem dritten Jahrhundert.', 0],
  ],
  leben: [
    ['Zugreisen durch Europa: Die schönsten Nachtverbindungen', 'Im Schlaf von Metropole zu Metropole – ein Überblick.', 0],
    ['Winterküche: Was jetzt Saison hat', 'Kohl, Rüben, Feldsalat: Ideen für die kalte Jahreszeit.', 0],
    ['Wandern im Mittelgebirge: Fünf Touren für klare Tage', 'Aussicht garantiert, Einkehr auch.', 0],
  ],
};

// Zweite Formulierung desselben Themas, damit die Themenbündelung sichtbar wird.
const reword = (t) => t.replace(/^(\S+) (\S+)/, '$2: $1').replace('::', ':');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function feedXml(sectionId, feedIndex, origin, now) {
  const rows = HEADLINES[sectionId] || [];
  const items = rows
    .filter(([, , shared], i) => feedIndex === 0 || shared || (i + feedIndex) % 3 === 0)
    .map(([title, desc], i) => {
      const t = feedIndex === 0 ? title : reword(title);
      const date = new Date(now - (i * 47 + feedIndex * 13 + 9) * 60e3).toUTCString();
      const img = feedIndex === 0 ? `<enclosure url="${origin}/demo-img/${sectionId}-${i}.svg" type="image/svg+xml"/>` : '';
      return `<item><title><![CDATA[${t}]]></title><link>https://example.org/${sectionId}/${feedIndex}/${i}</link><description>${esc(desc)}</description><pubDate>${date}</pubDate>${img}</item>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Demo</title>${items.join('')}</channel></rss>`;
}

function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function chartJson(symbol, now) {
  const r = rng(hash(symbol));
  const base = symbol.startsWith('^') ? 4000 + r() * 30000 : symbol.includes('=X') ? 0.8 + r() * 0.4 : symbol === 'BTC-EUR' ? 80000 + r() * 10000 : 20 + r() * 400;
  const drift = (r() - 0.47) * 0.0006;
  let v = base;
  const close = [], timestamp = [];
  const start = Math.floor(now / 1000) - 100 * 300;
  for (let i = 0; i < 100; i++) { v *= 1 + drift + (r() - 0.5) * 0.002; close.push(v); timestamp.push(start + i * 300); }
  return JSON.stringify({ chart: { result: [{ meta: { currency: 'EUR', regularMarketPrice: v, previousClose: base, regularMarketTime: timestamp[99] }, timestamp, indicators: { quote: [{ close }] } }] } });
}

/** Ersetzt den Netzabruf: liefert für jede bekannte URL eine Beispielantwort. */
function demoFetcher(origin) {
  const byUrl = new Map();
  for (const s of SECTIONS) s.feeds.forEach(([, url], i) => byUrl.set(url, [s.id, i]));
  return async (url) => {
    const now = Date.now();
    if (byUrl.has(url)) { const [id, i] = byUrl.get(url); return feedXml(id, i, origin, now); }
    const m = url.match(/finance\/chart\/([^?]+)/);
    if (m) return chartJson(decodeURIComponent(m[1]), now);
    throw new Error('unbekannte Demo-URL');
  };
}

function demoImage(name) {
  const r = rng(hash(name));
  const h = Math.floor(r() * 360);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h} 18% 62%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360} 22% 34%)"/></linearGradient></defs><rect width="640" height="400" fill="url(#g)"/><circle cx="${120 + r() * 400}" cy="${80 + r() * 200}" r="${60 + r() * 90}" fill="#fff" opacity=".13"/><path d="M0 ${300 + r() * 40} L${180 + r() * 100} ${200 + r() * 60} L${380 + r() * 80} ${290 + r() * 40} L640 ${220 + r() * 60} V400 H0Z" fill="#000" opacity=".22"/><text x="20" y="384" font-family="sans-serif" font-size="15" fill="#fff" opacity=".7">Beispielbild</text></svg>`;
}

module.exports = { demoFetcher, demoImage, GROUPS, DAX };
