import type { Opponent, OppPlayer, Target, Zone } from '../types'
import { SLOTS, isFront, slotPosition, slotRole } from './rotation'

export interface OppView {
  opponent: Opponent
  rotation: number
  /** Spieler auf Pos. 1 (Aufschläger, wenn der Gegner serviert) */
  server: OppPlayer | undefined
  serving: boolean
  setterFront: boolean
  /** Wer blockt gegen unser Ziel */
  blockers: Partial<Record<Target, OppPlayer>>
  /** Wer verteidigt welche Zone */
  defenders: Partial<Record<Zone, OppPlayer>>
  /** Spieler auf den Grund-Positionen (vor dem Wechsel) */
  positions: Record<number, OppPlayer | undefined>
}

/** Blockwert: Blockstärke, korrigiert um die Grösse (±1.5) */
export function blockScore(p: OppPlayer): number {
  const h = p.height ? Math.max(-1.5, Math.min(1.5, (p.height - 192) / 8)) : 0
  return p.block + h
}

/**
 * Analysiert die Gegner-Rotation.
 * Gegner im Block nach dem Wechsel: Zuspieler/Dia auf 2 (gegen unseren Aussen),
 * Mitte auf 3 (gegen unsere Mitte und Pipe), Aussen auf 4 (gegen unsere Dia).
 * Abwehr: Zuspieler/Dia Zone 1, Aussen Zone 6, Libero (statt Mitte) Zone 5.
 * Wenn der Gegner serviert hat, bleibt der Aufschläger auf dem Feld und verteidigt in seiner Zone
 * (pro Gegner einstellbar, Standard: Mitte → Zone 5).
 */
export function analyzeOpponent(opp: Opponent, rotation: number, serving: boolean): OppView {
  const byId = new Map(opp.players.map((p) => [p.id, p]))
  const positions: Record<number, OppPlayer | undefined> = {}
  const blockers: OppView['blockers'] = {}
  const defenders: OppView['defenders'] = {}
  let server: OppPlayer | undefined
  const libero = byId.get(opp.libero)

  for (const slot of SLOTS) {
    const p = byId.get(opp.lineup[slot])
    const pos = slotPosition(slot, rotation)
    positions[pos] = p
    if (pos === 1) server = p
    const role = slotRole[slot]
    if (isFront(pos)) {
      if (role === 'A') blockers.dia = p
      else if (role === 'M') {
        blockers.mitte = p
        blockers.pipe = p
      } else blockers.aussen = p
    } else {
      if (role === 'A') defenders[6] = p
      else if (role === 'M') defenders[5] = serving && pos === 1 ? p : (libero ?? p)
      else defenders[1] = p
    }
  }

  if (serving && server && server.role !== 'L') {
    const role = server.role as 'Z' | 'A' | 'D' | 'M'
    const want = opp.serverZone[role]
    const cur = (Object.keys(defenders).map(Number) as Zone[]).find((z) => defenders[z]?.id === server!.id)
    if (want && cur && want !== cur) {
      const other = defenders[want]
      defenders[want] = server
      defenders[cur] = other
    }
  }

  return {
    opponent: opp,
    rotation,
    server,
    serving,
    setterFront: isFront(slotPosition('S', rotation)),
    blockers,
    defenders,
    positions,
  }
}

export const roleLabel: Record<string, string> = { Z: 'Zuspieler', A: 'Aussen', D: 'Dia', M: 'Mitte', L: 'Libero' }

export function oppName(p?: OppPlayer): string {
  if (!p) return '?'
  return `#${p.number}${p.name ? ' ' + p.name : ''}`
}
