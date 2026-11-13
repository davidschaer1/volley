import { useMemo, useState } from 'react'
import { update, useStore, uid } from '../store'
import { attackersOf } from '../logic/rotation'
import { distribution, predictability, quote, quoteFor, recentForm } from '../logic/stats'
import { playerName, setInfo } from '../logic/view'
import { Button, Card, Label, PageTitle, Seg, SectionTitle, Select, TextInput } from '../components/ui'
import type { PassQuality, Phase, RallyResult, SetTypeId } from '../types'

const pct = (n: number) => `${Math.round(n * 100)} %`

export default function Tracker() {
  const state = useStore()
  const [rotation, setRotation] = useState(state.situation.rotation)
  const [pass, setPass] = useState<PassQuality>('+')
  const [phase, setPhase] = useState<Phase>('sideout')
  const [option, setOption] = useState<string>('')
  const [scope, setScope] = useState<'match' | 'all'>('match')
  const [newName, setNewName] = useState('')

  const match = state.matches.find((m) => m.id === state.activeMatchId)
  const rallies = useMemo(() => (scope === 'match' && match ? state.rallies.filter((r) => r.matchId === match.id) : state.rallies), [state.rallies, scope, match])

  const options = attackersOf(state.lineup, rotation).flatMap((a) => {
    const p = state.players.find((x) => x.id === a.playerId)
    return a.sets.filter((s) => s === 'dump' || p?.sets.includes(s)).map((s) => ({ key: `${a.playerId}:${s}`, playerId: a.playerId, setType: s }))
  })

  const save = (result: RallyResult) => {
    const o = options.find((x) => x.key === option)
    if (!o || !match) return
    update((d) => {
      d.rallies.push({ id: uid(), matchId: match.id, ts: Date.now(), rotation, pass, phase, playerId: o.playerId, setType: o.setType as SetTypeId, result })
    })
    setOption('')
  }

  const lastRallies = [...rallies].sort((a, b) => b.ts - a.ts).slice(0, 8)
  const playerIds = [...new Set(rallies.map((r) => r.playerId))]
  const combos = [...new Set(rallies.map((r) => `${r.playerId}:${r.setType}`))]
    .map((k) => {
      const [pid, st] = k.split(':') as [string, SetTypeId]
      return { pid, st, q: quoteFor(rallies, pid, st) }
    })
    .sort((a, b) => b.q.n - a.q.n)

  return (
    <div>
      <PageTitle over="Match-Tracker" title={match ? match.name : 'Kein Match aktiv'}>
        Pro Ballwechsel: Rotation, Annahme, Zuspiel, Ergebnis. Die Daten fliessen in die Empfehlungen ein (Regeln 11, 13, 17).
      </PageTitle>

      <Card className="space-y-2">
        {state.matches.length > 0 && (
          <Select value={state.activeMatchId} onChange={(v) => update((d) => void (d.activeMatchId = v))}>
            {state.matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.date} · {m.name}
              </option>
            ))}
          </Select>
        )}
        <div className="flex gap-2">
          <TextInput placeholder="Neues Match, z. B. vs. Muster" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button
            variant="primary"
            onClick={() => {
              const id = uid()
              update((d) => {
                d.matches.push({ id, name: newName || 'Match', date: new Date().toISOString().slice(0, 10), opponentId: d.activeOpponentId })
                d.activeMatchId = id
              })
              setNewName('')
            }}
          >
            Starten
          </Button>
        </div>
      </Card>

      {match && (
        <>
          <SectionTitle over="Erfassen" title="Ballwechsel" />
          <div className="space-y-3">
            <Seg value={rotation} onChange={(v) => { setRotation(v); setOption('') }} options={[1, 2, 3, 4, 5, 6].map((r) => ({ value: r, label: `R${r}` }))} />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Seg<PassQuality> value={pass} onChange={setPass} options={[{ value: '#', label: '#' }, { value: '+', label: '+' }, { value: '!', label: '!' }, { value: '-', label: '–' }]} />
              <Seg value={phase} onChange={setPhase} options={[{ value: 'sideout', label: 'SO' }, { value: 'transition', label: 'TR' }]} />
            </div>
            <div>
              <Label>Zuspiel an</Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {options.map((o) => {
                  const st = setInfo(state, o.setType as SetTypeId)
                  const on = option === o.key
                  return (
                    <button key={o.key} type="button" onClick={() => setOption(o.key)} className={`min-h-12 rounded-lg border px-2 text-left ${on ? 'border-ink bg-ink text-white' : 'border-line bg-soft'}`}>
                      <div className="font-semibold leading-tight">{playerName(state, o.playerId)}</div>
                      <div className={`text-[12px] ${on ? 'text-white/75' : 'text-muted'}`}>
                        {st.fullName}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                ['punkt', 'Punkt', 'bg-good text-white border-good'],
                ['fehler', 'Fehler', 'bg-bad text-white border-bad'],
                ['block', 'Block', 'bg-paper text-bad border-bad'],
                ['weiter', 'Weiter', 'bg-soft border-line'],
              ] as const).map(([r, label, cls]) => (
                <button key={r} type="button" disabled={!option} onClick={() => save(r)} className={`min-h-14 rounded-lg border-2 font-semibold disabled:opacity-40 ${cls}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {lastRallies.length > 0 && (
            <div className="mt-4 divide-y divide-line rounded-xl border border-line text-[14px]">
              {lastRallies.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2">
                  <span>
                    R{r.rotation} · {r.pass === '-' ? '–' : r.pass} · {playerName(state, r.playerId)} {setInfo(state, r.setType).name}
                  </span>
                  <span className="flex items-center gap-2">
                    <b className={r.result === 'punkt' ? 'text-good' : r.result === 'weiter' ? '' : 'text-bad'}>{r.result}</b>
                    <button type="button" aria-label="Löschen" className="h-9 w-9 rounded border border-line" onClick={() => update((d) => void (d.rallies = d.rallies.filter((x) => x.id !== r.id)))}>
                      ×
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <SectionTitle over="Auswertung" title={`${rallies.length} Ballwechsel (Punkt-Quote ${pct(quote(rallies).rate)})`} />
      <Seg value={scope} onChange={setScope} options={[{ value: 'match', label: 'Dieses Match' }, { value: 'all', label: 'Alle Matches' }]} />

      {[1, 2, 3, 4, 5, 6].map((r) => {
        const pr = predictability(rallies, r, state.predictabilityThreshold)
        if (!pr) return null
        return (
          <div key={r} className="mt-2 rounded-lg border border-[#f0d9b0] bg-[#fdf3e2] p-3 font-semibold text-warn">
            ⚠ R{r}: {pct(pr.share)} an {playerName(state, pr.playerId)} ({setInfo(state, pr.setType).name}) – vorhersehbar
          </div>
        )
      })}

      <SectionTitle over="Verteilung" title="Pro Rotation" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((r) => {
          const dist = distribution(rallies, r)
          const n = rallies.filter((x) => x.rotation === r).length
          return (
            <div key={r}>
              <div className="mb-1 text-[13px] font-semibold text-black">
                R{r} · {n} Bälle
              </div>
              {n === 0 ? (
                <div className="h-6 rounded bg-soft" />
              ) : (
                <div className="flex h-8 overflow-hidden rounded">
                  {dist.map((d, i) => (
                    <div key={i} title={`${playerName(state, d.playerId)} ${setInfo(state, d.setType).name}`} className="flex items-center justify-center overflow-hidden border-r border-white text-[11px] text-white" style={{ width: pct(d.share), background: ['#111', '#1f5eff', '#12805c', '#a86200', '#7a3cc2', '#c2321f', '#5b5b5b'][i % 7] }}>
                      {d.share > 0.12 ? `${playerName(state, d.playerId)} ${setInfo(state, d.setType).name}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <SectionTitle over="Erfolg" title="Pro Spieler und Zuspiel" />
      <div className="divide-y divide-line rounded-xl border border-line text-[14px]">
        {combos.length === 0 && <div className="p-3 text-muted">Noch keine Daten.</div>}
        {combos.map(({ pid, st, q }) => (
          <div key={pid + st} className="grid grid-cols-[1fr_auto_auto] gap-3 p-2">
            <span>
              {playerName(state, pid)} · {setInfo(state, st).fullName}
            </span>
            <span className="tabular-nums">
              {q.points}/{q.n}
            </span>
            <span className={`w-16 text-right font-semibold tabular-nums ${q.eff >= 0.3 ? 'text-good' : q.eff < 0.1 ? 'text-bad' : ''}`}>Eff {pct(q.eff)}</span>
          </div>
        ))}
      </div>

      <SectionTitle over="Heisse Hand" title="Letzte 5 Angriffe" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {playerIds.map((pid) => {
          const f = recentForm(rallies, pid)
          const hot = f.n >= 3 && f.rate >= 0.6
          const cold = f.n >= 3 && f.eff <= 0
          return (
            <Card key={pid} className={hot ? 'border-bad' : cold ? 'border-accent' : ''}>
              <div className="font-semibold">{playerName(state, pid)}</div>
              <div className="text-[14px]">
                {f.points}/{f.n} Punkte {hot ? '🔥 heiss' : cold ? '❄ kalt' : ''}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
