# Zuspieler-Coach

Taktik-Assistent für Zuspieler im 5-1-System. Vite + React + TypeScript + Tailwind, ohne Server, Daten im `localStorage` (Export/Import als JSON).

## Starten

```bash
npm install
npm run dev      # http://localhost:5173 und im WLAN unter http://<IP-des-Macs>:5173
npm test         # Unit-Tests (Rotationen, Regel-Engine)
npm run build    # Produktions-Build in dist/ (inkl. PWA / Offline)
```

## Anpassen

- `src/data/roster.ts` – Kader, Standard-Aufstellung, Muster-Gegner
- `src/data/signals.ts` – Zuspiele und Handzeichen
- `src/data/rules.ts` – Regeln der Engine (Bedingung, Gewichtung, Erklärung, Quelle)
- `docs/research.md` – Recherche, wird in der App als Wissensbasis angezeigt

Änderungen in der App (Kader, Zeichen, Regeln) werden lokal gespeichert und überschreiben die Standardwerte. «Mehr → Alles zurücksetzen» lädt die Standardwerte aus diesen Dateien neu.

## Aufbau

- `src/logic/rotation.ts` – Rotationen, Positionen nach dem Wechsel, Libero, Angreifer pro Rotation
- `src/logic/opponent.ts` – Gegner-Analyse: Blocker gegen unsere Angreifer, Verteidiger pro Zone, Aufschläger
- `src/logic/engine.ts` – Optionen erzeugen, Regeln anwenden, Top 3 bilden
- `src/logic/stats.ts` – Match-Tracker-Auswertung (Quoten, Verteilung, Vorhersehbarkeit)
