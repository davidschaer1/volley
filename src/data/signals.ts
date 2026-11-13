import type { SetType } from '../types'

/**
 * Unser Team-System: Zuspiele und Handzeichen.
 * Name und Zeichen sind in der App unter «Zeichen» editierbar.
 * zones = gegnerische Abwehrzonen, die der Angriff natürlich trifft:
 *   Zone 5 = Aussen diagonal / Dia Linie
 *   Zone 1 = Aussen Linie / Dia diagonal
 *   Zone 6 = Pipe / Mitte
 */
export const defaultSetTypes: SetType[] = [
  { id: 'aussen-inside', target: 'aussen', name: 'Inside', signal: '4', tempo: 2, risky: false, zones: [5, 6], info: 'Aussen-Ball weiter weg von der Antenne – öffnet die Diagonale und die Linie gegen einen kleinen Blocker.' },
  { id: 'aussen-medium', target: 'aussen', name: 'Medium', signal: '5', tempo: 2, risky: false, zones: [5, 1], info: 'Standard-Ball Aussen.' },
  { id: 'aussen-schuss', target: 'aussen', name: 'Schuss', signal: 'Wischen', tempo: 1, risky: true, zones: [1, 5], info: 'Schneller, flacher Ball an die Antenne.' },
  { id: 'aussen-hoch', target: 'aussen', name: 'Hoher Ball', signal: '', tempo: 3, risky: false, zones: [5, 1], info: 'Sicherer hoher Ball Aussen (Out-of-System).' },
  { id: 'mitte-quick', target: 'mitte', name: 'Quick', signal: '1', tempo: 1, risky: false, zones: [6, 5], info: 'Erstes Tempo vor dem Zuspieler (K1) – hält den Mittelblocker zentral.' },
  { id: 'mitte-shoot', target: 'mitte', name: 'Shoot', signal: 'Pistole', tempo: 1, risky: true, zones: [6, 1], info: 'Schneller, flacher Ball weiter weg vom Zuspieler.' },
  { id: 'mitte-kopf', target: 'mitte', name: 'Kopf', signal: 'Kleiner Finger', tempo: 1, risky: true, zones: [6, 5], info: 'Quick über den Kopf / hinter den Zuspieler.' },
  { id: 'dia-quick', target: 'dia', name: 'Quick', signal: '1', tempo: 1, risky: true, zones: [1, 5], info: 'Schneller Ball an die Dia (nur vorne).' },
  { id: 'dia-medium', target: 'dia', name: 'Medium', signal: '2', tempo: 2, risky: false, zones: [1, 5], info: 'Standard-Ball an die Dia, vorne oder hinten aus Zone 1.' },
  { id: 'dia-hoch', target: 'dia', name: 'Hoher Ball', signal: '', tempo: 3, risky: false, zones: [1, 5], info: 'Sicherer hoher Ball an die Dia (Out-of-System).' },
  { id: 'pipe', target: 'pipe', name: 'Pipe', signal: 'Flache Hand', tempo: 2, risky: true, zones: [6, 1], info: 'Hinten-Angriff aus Zone 6 – funktioniert nur, wenn der Quick «lebt».' },
  { id: 'dump', target: 'zuspieler', name: 'Zweiter Ball', signal: '', tempo: 1, risky: true, zones: [6], info: 'Dump: Zuspieler spielt den zweiten Ball direkt rüber (nur vorne).' },
]

export const targetLabel: Record<string, string> = {
  aussen: 'Aussen',
  mitte: 'Mitte',
  dia: 'Dia',
  pipe: 'Pipe',
  zuspieler: 'Zuspieler',
}
