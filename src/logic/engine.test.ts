import { describe, expect, it } from 'vitest'
import { recommend } from './engine'
import { analyzeOpponent } from './opponent'
import { rotationWithSlotServing } from './rotation'
import { defaultSituation, initialState } from '../store'
import type { Situation } from '../types'

const sit = (s: Partial<Situation>): Situation => ({ ...defaultSituation, ...s })

describe('Gegner-Analyse', () => {
  const st = initialState()
  const opp = st.opponents[0]

  it('Gegner-Mitte am Service verteidigt danach in Zone 5', () => {
    const v = analyzeOpponent(opp, rotationWithSlotServing('MB1'), true)
    expect(v.server?.role).toBe('M')
    expect(v.defenders[5]?.id).toBe(v.server?.id)
  })

  it('Blocker: deren Zuspieler/Dia gegen unseren Aussen, deren Aussen gegen unsere Dia', () => {
    const v = analyzeOpponent(opp, 1, true) // deren Zuspieler auf Pos. 1, Dia vorne
    expect(v.blockers.aussen?.role).toBe('D')
    expect(v.blockers.dia?.role).toBe('A')
    expect(v.blockers.mitte?.role).toBe('M')
    const v4 = analyzeOpponent(opp, 4, true) // deren Zuspieler vorne
    expect(v4.blockers.aussen?.role).toBe('Z')
    expect(v4.setterFront).toBe(true)
  })

  it('Libero verteidigt statt der Mitte, wenn der Gegner nicht serviert', () => {
    const v = analyzeOpponent(opp, rotationWithSlotServing('MB1'), false)
    expect(v.defenders[5]?.role).toBe('L')
  })
})

describe('Entscheidungs-Assistent', () => {
  it('Gegner-Mitte am Service → Empfehlung 1 = Aussen Inside (Zeichen 4)', () => {
    const st = initialState()
    for (const r of [1, 2, 3, 4, 5, 6]) {
      const rec = recommend(st, sit({ rotation: r, oppRotation: rotationWithSlotServing('MB1'), pass: '+', phase: 'sideout' }))
      expect(rec.top[0].option.setType).toBe('aussen-inside')
      expect(rec.top[0].hits.some((h) => h.ruleId === 'davids-regel')).toBe(true)
    }
  })

  it('Annahme – → kein Quick, keine Pipe, Top 1 ist ein hoher Ball', () => {
    const st = initialState()
    const rec = recommend(st, sit({ pass: '-', oppRotation: 2 }))
    expect(rec.top[0].option.setType).toMatch(/hoch/)
    for (const s of rec.all.filter((x) => !x.excluded)) {
      expect(['mitte-quick', 'mitte-shoot', 'mitte-kopf', 'pipe', 'dia-quick', 'aussen-schuss']).not.toContain(s.option.setType)
    }
  })

  it('Annahme ! → Dia (hinter dem Zuspieler) vor der Mitte', () => {
    const st = initialState()
    const rec = recommend(st, sit({ rotation: 1, pass: '!', oppRotation: 2 }))
    const dia = rec.all.find((s) => s.option.setType === 'dia-medium')!
    const quick = rec.all.find((s) => s.option.setType === 'mitte-quick')!
    expect(dia.score).toBeGreaterThan(quick.score)
  })

  it('Transition, Mitte kommt vom Block → Quick wird abgewertet und Hinweis «tief zuspielen»', () => {
    const st = initialState()
    const so = recommend(st, sit({ rotation: 1, phase: 'sideout', pass: '#', oppRotation: 2 }))
    const tr = recommend(st, sit({ rotation: 1, phase: 'transition', pass: '#', oppRotation: 2, servingTeam: 'us', middleFromBlock: true }))
    const q = (r: typeof so) => r.all.find((s) => s.option.setType === 'mitte-quick')!.score
    expect(q(tr)).toBeLessThan(q(so))
    expect(tr.hints.join(' ')).toMatch(/tief/)
  })

  it('Zweiter Ball nur mit Zuspieler vorne', () => {
    const st = initialState()
    expect(recommend(st, sit({ rotation: 1 })).all.some((s) => s.option.setType === 'dump')).toBe(false)
    const front = recommend(st, sit({ rotation: 3, pass: '#', blockOnDia: true }))
    const dump = front.all.find((s) => s.option.setType === 'dump')!
    expect(dump.excluded).toBe(false)
    expect(dump.hits.some((h) => h.ruleId === 'zweiter-ball' && h.delta > 0)).toBe(true)
  })

  it('Satzende → kein Risiko-Zuspiel unter den Top 3, wenn sichere Optionen da sind', () => {
    const st = initialState()
    const rec = recommend(st, sit({ score: 'satzball', oppRotation: 2 }))
    const risky = new Set(st.setTypes.filter((t) => t.risky).map((t) => t.id))
    expect(risky.has(rec.top[0].option.setType)).toBe(false)
  })

  it('Top 3: Option mit negativem Score kommt nicht vor besseren Optionen, nur wegen eines anderen Spielers', () => {
    const st = initialState()
    const rec = recommend(st, sit({ rotation: 6, oppRotation: 5, pass: '!', phase: 'transition', servingTeam: 'them', score: 'satzball', middleFromBlock: true }))
    const sorted = rec.all.filter((s) => !s.excluded)
    const third = rec.top[2]
    if (third.score <= 0) expect(third).toBe(sorted[2])
    expect(rec.top.some((s) => s.option.setType === 'pipe')).toBe(false)
  })

  it('Ausgeschaltete Regel wirkt nicht', () => {
    const st = initialState()
    st.ruleSettings['davids-regel'].enabled = false
    const rec = recommend(st, sit({ oppRotation: rotationWithSlotServing('MB1') }))
    expect(rec.all.some((s) => s.hits.some((h) => h.ruleId === 'davids-regel'))).toBe(false)
  })

  it('Eigene Regel wirkt', () => {
    const st = initialState()
    st.customRules.push({ id: 'x', name: 'Test', enabled: true, weight: 50, explanation: 'Immer Pipe', when: {}, then: { setType: 'pipe' } })
    const rec = recommend(st, sit({ pass: '#', oppRotation: 2 }))
    expect(rec.top[0].option.setType).toBe('pipe')
  })

  it('Vorhersehbarkeit: Warnung bei > 50 % in einer Rotation', () => {
    const st = initialState()
    for (let i = 0; i < 6; i++) st.rallies.push({ id: String(i), matchId: 'm', ts: i, rotation: 1, pass: '+', phase: 'sideout', playerId: 'leon', setType: 'aussen-medium', result: 'punkt' })
    const rec = recommend(st, sit({ rotation: 1, oppRotation: 2 }))
    expect(rec.warnings.length).toBe(1)
  })
})
