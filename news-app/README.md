# Der Tagesbote

Die wichtigsten Nachrichten des Tages, gesetzt wie eine klassische Tageszeitung –
mit Titelseite, allen üblichen Rubriken und einem Börsenteil.

## Starten

```bash
cd news-app
npm start          # http://localhost:3000  (Node 18 oder neuer, keine Abhängigkeiten)
npm run demo       # dasselbe mit erfundenen Beispieldaten, ohne Internet
npm test
```

Anderer Port: `PORT=8080 npm start`.

## Was die App macht

- **Titelseite** – Aufmacher, „Das Wichtigste in Kürze“, Marktüberblick und je ein Block pro Rubrik.
- **Rubriken** – Politik, Ausland, Wirtschaft, Finanzen, Technik, Wissen, Kultur, Sport, Panorama, Leben & Reise.
- **Börse** – Indizes (DAX, MDAX, TecDAX, Euro Stoxx 50, S&P 500, Dow, Nasdaq, Nikkei) mit Tagesverlauf,
  Devisen, Krypto, Rohstoffe, DAX-Gewinner/-Verlierer und alle 40 DAX-Werte.
- **Gewichtung** – Die Feeds mehrerer Redaktionen werden zusammengeführt. Berichten mehrere über dasselbe
  Thema, wird es gebündelt („Auch bei: …“) und rückt nach oben; dazu zählen Platzierung im Feed und Aktualität.
- Aktualisiert sich alle fünf Minuten, funktioniert auf dem Handy, hat einen Dunkelmodus und lässt sich
  als App auf den Startbildschirm legen.

## Quellen

Nachrichten: öffentliche RSS-/Atom-Feeds von tagesschau, DER SPIEGEL, ZEIT ONLINE, F.A.Z., Sportschau und
heise online. Angezeigt werden nur Überschrift, Anriss und Vorschaubild; jeder Klick führt zum Originalartikel.
Kurse: öffentlicher Chart-Endpunkt von Yahoo Finance (inoffiziell, bis zu 15 Minuten verzögert).

Feeds und Rubriken stehen in `lib/feeds.js`, Kurslisten in `lib/markets.js`. Fällt eine Quelle aus,
läuft die Ausgabe mit den übrigen weiter; im Fuß der Seite ist die Quelle dann durchgestrichen.

Schriften (Playfair Display, Libre Franklin, UnifrakturMaguntia) liegen unter der SIL Open Font License
lokal in `public/fonts` – es werden keine Daten an Font-Dienste gesendet.
