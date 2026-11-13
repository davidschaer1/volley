import { describe, expect, it } from 'vitest'
import { attackersOf, court, positionsOf, receiversOf, rotationWithSlotServing, slotPosition, switchedPosition } from './rotation'
import { defaultLineup } from '../data/roster'

describe('Rotationen 5-1', () => {
  it('R1: Zuspieler Pos. 1, Dia Pos. 4', () => {
    expect(slotPosition('S', 1)).toBe(1)
    expect(slotPosition('OPP', 1)).toBe(4)
    expect(slotPosition('OH1', 1)).toBe(2)
    expect(slotPosition('MB1', 1)).toBe(3)
    expect(slotPosition('OH2', 1)).toBe(5)
    expect(slotPosition('MB2', 1)).toBe(6)
  })

  it('Rotation r = Position des Zuspielers, Dia immer gegenüber', () => {
    for (let r = 1; r <= 6; r++) {
      expect(slotPosition('S', r)).toBe(r)
      expect(slotPosition('OPP', r)).toBe(((r + 2) % 6) + 1)
    }
  })

  it('jede Rotation belegt alle 6 Positionen genau einmal', () => {
    for (let r = 1; r <= 6; r++) expect(Object.keys(positionsOf(r)).sort()).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('Rotieren: R1 → R6, Aussen 1 wandert von Pos. 2 auf Pos. 1 an den Service', () => {
    expect(slotPosition('OH1', 6)).toBe(1)
    expect(rotationWithSlotServing('OH1')).toBe(6)
    expect(rotationWithSlotServing('MB1')).toBe(5)
    expect(rotationWithSlotServing('S')).toBe(1)
  })

  it('Zuspieler hinten (R1, R6, R5): 3 Angreifer vorne + Pipe', () => {
    for (const r of [1, 6, 5]) {
      const a = attackersOf(defaultLineup, r)
      expect(a.filter((x) => x.front).length).toBe(3)
      expect(a.some((x) => x.sets.includes('pipe'))).toBe(true)
      expect(a.some((x) => x.sets.includes('dump'))).toBe(false)
    }
  })

  it('Zuspieler vorne (R4, R3, R2): 2 vorne + Pipe + Dia hinten aus Pos. 1 + Dump', () => {
    for (const r of [4, 3, 2]) {
      const a = attackersOf(defaultLineup, r)
      expect(a.filter((x) => x.front && x.role !== 'Z').length).toBe(2)
      const dia = a.find((x) => x.role === 'D')!
      expect(dia.front).toBe(false)
      expect(dia.attackPos).toBe(1)
      expect(a.some((x) => x.sets.includes('pipe'))).toBe(true)
      expect(a.some((x) => x.sets.includes('dump'))).toBe(true)
    }
  })

  it('Libero ersetzt die Mitte hinten, ausser beim eigenen Service', () => {
    // R4: MB1 (k=2) steht auf Pos. 6 → hinten
    const receive = court(defaultLineup, 4, false, false)
    expect(receive.find((p) => p.libero)?.playerId).toBe('finn')
    // R5: MB1 auf Pos. 1 → serviert selbst
    const serve = court(defaultLineup, 5, true, false)
    expect(serve.find((p) => p.pos === 1)?.playerId).toBe('noah')
    expect(serve.some((p) => p.libero)).toBe(false)
  })

  it('nach dem Wechsel: Aussen 4, Mitte 3, Zuspieler/Dia 2 vorne', () => {
    // R1: Zuspieler hinten → nach dem Wechsel Pos. 1; Dia vorne → Pos. 2
    expect(switchedPosition('S', 1)).toBe(1)
    expect(switchedPosition('OPP', 1)).toBe(2)
    expect(switchedPosition('OH1', 1)).toBe(4)
    expect(switchedPosition('OH2', 1)).toBe(6)
  })

  it('Annahme: Libero + beide Aussen', () => {
    expect(receiversOf(defaultLineup, 1).sort()).toEqual(['finn', 'leon', 'quentin'])
  })
})
