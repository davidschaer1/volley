import { useState } from 'react'
import { update, useStore } from '../store'
import { attackersOf, receiversOf, SLOTS, slotLabel, slotRole, setterFront } from '../logic/rotation'
import { ourMarkers, playerName, setInfo } from '../logic/view'
import { Court } from '../components/Court'
import { Card, Chip, Label, PageTitle, Seg, SectionTitle, Select } from '../components/ui'
import type { AppState, Role } from '../types'

const roleForSlot = (slot: string): Role => (slot === 'L' ? 'L' : slotRole[slot as keyof typeof slotRole])

function rotationCard(state: AppState, r: number) {
  const front = setterFront(r)
  const att = attackersOf(state.lineup, r)
  const frontNames = att.filter((a) => a.front && a.role !== 'Z').map((a) => playerName(state, a.playerId))
  const pipe = att.find((a) => a.sets.includes('pipe'))
  const diaBack = att.find((a) => a.role === 'D' && !a.front)
  const strengths: string[] = []
  const weaknesses: string[] = []
  let plan = ''
  if (!front) {
    strengths.push('3 Angreifer vorne + Pipe: 4 Optionen', 'Block muss 3 Angreifer vorne respektieren')
    weaknesses.push(r === 1 ? 'Zuspieler muss von Pos. 1 weit zum Netz – kein Zweiter Ball' : 'Kein Zweiter Ball möglich')
    plan = `Mitte früh etablieren, dann ${frontNames[0] ?? 'Aussen'} und Dia ${playerName(state, state.lineup.OPP)} isolieren. Pipe ${pipe ? playerName(state, pipe.playerId) : ''} nur mit lebendigem Quick.`
  } else {
    strengths.push('Zweiter Ball (Dump) als Überraschung', `Dia ${diaBack ? playerName(state, diaBack.playerId) : ''} greift von hinten aus Pos. 1 an`)
    weaknesses.push('Nur 2 Angreifer vorne – Block kann sich darauf einstellen', 'Kleiner Block mit Zuspieler vorne')
    plan = `${frontNames.join(' und ')} vorne, Pipe und Dia hinten als Ventile. Bei Annahme ! eher Aussen oder Dia hinten.`
  }
  return { strengths, weaknesses, plan, frontNames }
}

export default function Lineup() {
  const state = useStore()
  const [rot, setRot] = useState(1)
  const [serve, setServe] = useState(false)
  const [switched, setSwitched] = useState(false)
  const card = rotationCard(state, rot)
  const att = attackersOf(state.lineup, rot)
  const receivers = receiversOf(state.lineup, rot)
  const slots = [...SLOTS, 'L'] as const

  return (
    <div>
      <PageTitle over="Aufstellung & Rotationen" title="5-1 Aufstellung">
        Rotationsreihenfolge: Zuspieler → Aussen 1 → Mitte 1 → Dia → Aussen 2 → Mitte 2. R1 = Zuspieler auf Pos. 1.
      </PageTitle>

      <Card>
        <div className="grid grid-cols-2 gap-3">
          {slots.map((slot) => {
            const role = roleForSlot(slot)
            const candidates = state.players.filter((p) => p.roles.includes(role))
            return (
              <div key={slot}>
                <Label>{slot === 'L' ? 'Libero' : slotLabel[slot]}</Label>
                <Select value={state.lineup[slot]} onChange={(v) => update((d) => void (d.lineup[slot] = v))}>
                  {candidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            )
          })}
        </div>
      </Card>

      <SectionTitle over="Rotation" title={`R${rot}: Zuspieler auf Pos. ${rot} (${setterFront(rot) ? 'vorne' : 'hinten'})`} />
      <Seg value={rot} onChange={setRot} options={[1, 2, 3, 4, 5, 6].map((r) => ({ value: r, label: `R${r}` }))} />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Seg value={serve ? 'serve' : 'recv'} onChange={(v) => setServe(v === 'serve')} options={[{ value: 'recv', label: 'Annahme' }, { value: 'serve', label: 'Service' }]} />
        <Seg value={switched ? 'sw' : 'base'} onChange={(v) => setSwitched(v === 'sw')} options={[{ value: 'base', label: 'Grundstellung' }, { value: 'sw', label: 'Nach Wechsel' }]} />
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Card>
          <Court showOpp={false} ours={ourMarkers(state, rot, { serve, switched, highlight: !serve && !switched ? receivers : undefined })} />
          <p className="text-[13px] text-muted">
            {!serve && !switched ? 'Blau = Annehmer (3er-Riegel: Libero + beide Aussen). ' : ''}
            Libero ersetzt die Mitte hinten, ausser beim eigenen Service.
          </p>
        </Card>
        <Card>
          <Overline2>Angreifer</Overline2>
          <div className="mb-2 font-extrabold">
            {setterFront(rot) ? '2 vorne + Pipe + Dia hinten von Pos. 1' : '3 vorne + Pipe'}
          </div>
          <ul className="space-y-1.5">
            {att.map((a) => (
              <li key={a.slot} className="text-[14px]">
                <span className="font-semibold">{playerName(state, a.playerId)}</span>{' '}
                <span className="text-muted">({a.front ? 'vorne' : 'hinten'}, Pos. {a.attackPos})</span>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {a.sets
                    .filter((s) => s === 'dump' || state.players.find((p) => p.id === a.playerId)?.sets.includes(s))
                    .map((s) => {
                      const st = setInfo(state, s)
                      return (
                        <Chip key={s}>
                          {st.name}
                          {st.signal ? ` · ${st.signal}` : ''}
                        </Chip>
                      )
                    })}
                </div>
              </li>
            ))}
          </ul>
          <Overline2>Stärken</Overline2>
          <ul className="list-disc pl-5 text-[14px]">{card.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
          <Overline2>Schwächen</Overline2>
          <ul className="list-disc pl-5 text-[14px]">{card.weaknesses.map((s) => <li key={s}>{s}</li>)}</ul>
          <Overline2>Standard-Plan</Overline2>
          <textarea
            className="min-h-24 w-full rounded-lg border border-line p-2"
            value={state.rotationNotes[rot] ?? card.plan}
            onChange={(e) => update((d) => void (d.rotationNotes[rot] = e.target.value))}
          />
        </Card>
      </div>
    </div>
  )
}

function Overline2({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 text-[13px] font-semibold text-black">{children}</div>
}
