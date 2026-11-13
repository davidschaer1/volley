import type { Lineup, SetTypeId, Slot } from '../types'

/** Rotationsreihenfolge im 5-1: Zuspieler, Aussen 1, Mitte 1, Dia, Aussen 2, Mitte 2 */
export const SLOTS: Slot[] = ['S', 'OH1', 'MB1', 'OPP', 'OH2', 'MB2']

export const slotRole: Record<Slot, 'Z' | 'A' | 'M' | 'D'> = {
  S: 'Z',
  OH1: 'A',
  MB1: 'M',
  OPP: 'D',
  OH2: 'A',
  MB2: 'M',
}

export const slotLabel: Record<Slot, string> = {
  S: 'Zuspieler',
  OH1: 'Aussen 1',
  MB1: 'Mitte 1',
  OPP: 'Dia',
  OH2: 'Aussen 2',
  MB2: 'Mitte 2',
}

export const isFront = (pos: number) => pos >= 2 && pos <= 4

/**
 * Position (1–6) eines Slots in Rotation r.
 * Rotation r = Position des Zuspielers (R1 = Zuspieler auf Pos. 1).
 * Beim Rotieren wandert jeder Spieler von Pos. p auf p−1 (2 → 1, 1 → 6).
 */
export function slotPosition(slot: Slot, rotation: number): number {
  const k = SLOTS.indexOf(slot)
  return ((k + rotation - 1) % 6) + 1
}

/** Alle Positionen der Rotation: Position → Slot */
export function positionsOf(rotation: number): Record<number, Slot> {
  const out: Record<number, Slot> = {}
  for (const s of SLOTS) out[slotPosition(s, rotation)] = s
  return out
}

/** Rotation, in der ein bestimmter Slot auf Pos. 1 (am Service) steht */
export function rotationWithSlotServing(slot: Slot): number {
  const k = SLOTS.indexOf(slot)
  return ((6 - k) % 6) + 1
}

export const setterFront = (rotation: number) => isFront(rotation)

/**
 * Positionen nach dem Wechsel (Grundposition im Angriff/Abwehr):
 * vorne Aussen 4, Mitte 3, Zuspieler/Dia 2; hinten Zuspieler/Dia 1, Aussen 6 (Pipe), Mitte/Libero 5.
 */
export function switchedPosition(slot: Slot, rotation: number): number {
  const front = isFront(slotPosition(slot, rotation))
  const role = slotRole[slot]
  if (role === 'A') return front ? 4 : 6
  if (role === 'M') return front ? 3 : 5
  return front ? 2 : 1
}

export interface CourtPlayer {
  slot: Slot | 'L'
  playerId: string
  pos: number
  front: boolean
  libero: boolean
}

/**
 * Wer steht wo. Libero ersetzt die Mitte hinten – ausser die Mitte steht am eigenen Service (Pos. 1).
 * @param ourServe true, wenn wir servieren
 * @param switched true = Positionen nach dem Wechsel
 */
export function court(lineup: Lineup, rotation: number, ourServe: boolean, switched: boolean): CourtPlayer[] {
  return SLOTS.map((slot) => {
    const base = slotPosition(slot, rotation)
    const front = isFront(base)
    const pos = switched ? switchedPosition(slot, rotation) : base
    const isServer = ourServe && base === 1
    const libero = slotRole[slot] === 'M' && !front && !isServer && !!lineup.L
    return { slot: libero ? 'L' : slot, playerId: libero ? lineup.L : lineup[slot], pos, front, libero }
  })
}

export interface Attacker {
  slot: Slot
  playerId: string
  role: 'Z' | 'A' | 'M' | 'D'
  front: boolean
  /** Angriffsposition: 4, 3, 2 vorne; 1 (Dia hinten) oder 6 (Pipe) hinten */
  attackPos: number
  sets: SetTypeId[]
}

/** Mögliche Zuspiele pro Slot in dieser Rotation */
export function attackersOf(lineup: Lineup, rotation: number): Attacker[] {
  const out: Attacker[] = []
  for (const slot of SLOTS) {
    const front = isFront(slotPosition(slot, rotation))
    const role = slotRole[slot]
    const playerId = lineup[slot]
    if (role === 'A') {
      out.push(front
        ? { slot, playerId, role, front, attackPos: 4, sets: ['aussen-inside', 'aussen-medium', 'aussen-schuss', 'aussen-hoch'] }
        : { slot, playerId, role, front, attackPos: 6, sets: ['pipe'] })
    } else if (role === 'M') {
      if (front) out.push({ slot, playerId, role, front, attackPos: 3, sets: ['mitte-quick', 'mitte-shoot', 'mitte-kopf'] })
    } else if (role === 'D') {
      out.push(front
        ? { slot, playerId, role, front, attackPos: 2, sets: ['dia-quick', 'dia-medium', 'dia-hoch'] }
        : { slot, playerId, role, front, attackPos: 1, sets: ['dia-medium', 'dia-hoch'] })
    } else if (role === 'Z' && front) {
      out.push({ slot, playerId, role, front, attackPos: 2, sets: ['dump'] })
    }
  }
  return out
}

/** Annehmer im 3er-Riegel: Libero + beide Aussen */
export function receiversOf(lineup: Lineup, rotation: number): string[] {
  return court(lineup, rotation, false, false)
    .filter((p) => p.libero || p.slot === 'OH1' || p.slot === 'OH2')
    .map((p) => p.playerId)
}

export function frontAttackerCount(rotation: number): number {
  return setterFront(rotation) ? 2 : 3
}
