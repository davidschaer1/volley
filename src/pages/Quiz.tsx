import { useMemo, useState } from 'react'
import { defaultSituation, update, useStore } from '../store'
import { recommend } from '../logic/engine'
import { oppName, roleLabel } from '../logic/opponent'
import { oppMarkers, ourMarkers, playerName, setInfo } from '../logic/view'
import { Court } from '../components/Court'
import { Button, Card, Chip, Overline, PageTitle, SectionTitle } from '../components/ui'
import { zoneFor, zoneText } from './Assistant'
import type { PassQuality, QuizResult, Situation } from '../types'

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

function randomSituation(): Situation {
  const phase = Math.random() < 0.65 ? 'sideout' : 'transition'
  return {
    ...defaultSituation,
    rotation: 1 + Math.floor(Math.random() * 6),
    oppRotation: 1 + Math.floor(Math.random() * 6),
    pass: pick<PassQuality>(['#', '+', '+', '!', '!', '-']),
    phase,
    servingTeam: phase === 'sideout' ? 'them' : pick(['them', 'us']),
    score: pick(['normal', 'normal', 'normal', 'ende', 'satzball']),
    middleFromBlock: phase === 'transition',
  }
}

const passLabel: Record<PassQuality, string> = { '#': '# perfekt', '+': '+ gut', '!': '! mittel', '-': '– schlecht' }

export default function Quiz() {
  const state = useStore()
  const [sit, setSit] = useState<Situation>(() => randomSituation())
  const [chosen, setChosen] = useState<string | null>(null)
  const rec = useMemo(() => recommend(state, sit), [state, sit])
  const opp = rec.ctx.opp
  const ranked = rec.top
  const choice = rec.all.find((s) => s.option.key === chosen)
  const rank = choice ? ranked.findIndex((s) => s.option.key === chosen) : -1
  const points = rank === 0 ? 3 : rank === 1 ? 2 : rank === 2 ? 1 : 0

  const answer = (key: string) => {
    if (chosen) return
    setChosen(key)
    const r = ranked.findIndex((s) => s.option.key === key)
    const pts = r === 0 ? 3 : r === 1 ? 2 : r === 2 ? 1 : 0
    const category = `Annahme ${sit.pass === '-' ? '–' : sit.pass} · ${sit.phase === 'sideout' ? 'Side-out' : 'Transition'}`
    const res: QuizResult = { ts: Date.now(), category, pass: sit.pass, phase: sit.phase, rotation: sit.rotation, points: pts, correct: r === 0 }
    update((d) => void d.quiz.push(res))
  }

  const next = () => {
    setSit(randomSituation())
    setChosen(null)
  }

  const stats = useMemo(() => {
    const m = new Map<string, { n: number; correct: number; pts: number }>()
    for (const q of state.quiz) {
      const e = m.get(q.category) ?? { n: 0, correct: 0, pts: 0 }
      e.n++
      e.correct += q.correct ? 1 : 0
      e.pts += q.points
      m.set(q.category, e)
    }
    return [...m.entries()].map(([k, v]) => ({ k, ...v, rate: v.correct / v.n })).sort((a, b) => a.rate - b.rate)
  }, [state.quiz])
  const total = state.quiz.reduce((s, q) => s + q.points, 0)

  // Optionen nach Spieler gruppiert
  const byPlayer = new Map<string, typeof rec.all>()
  for (const s of rec.all) byPlayer.set(s.option.playerId, [...(byPlayer.get(s.option.playerId) ?? []), s])

  return (
    <div>
      <PageTitle over="Training" title="Quiz">
        Was spielst du? 3 Punkte für die beste Wahl, 2 und 1 für Platz 2 und 3.
      </PageTitle>

      <Card>
        <Overline>Situation</Overline>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Chip>R{sit.rotation}</Chip>
          <Chip>Annahme {passLabel[sit.pass]}</Chip>
          <Chip>{sit.phase === 'sideout' ? 'Side-out' : 'Transition'}</Chip>
          {opp?.serving && opp.server && (
            <Chip tone="warn">
              Aufschlag {oppName(opp.server)} ({roleLabel[opp.server.role]})
            </Chip>
          )}
          {sit.phase === 'transition' && sit.servingTeam === 'us' && <Chip>Wir haben serviert</Chip>}
          {sit.score !== 'normal' && <Chip tone="bad">{sit.score === 'ende' ? 'Satzende 20+' : 'Satzball'}</Chip>}
          {sit.phase === 'transition' && sit.middleFromBlock && <Chip>Mitte kommt vom Block</Chip>}
        </div>
        <Court ours={ourMarkers(state, sit.rotation, { serve: false, switched: true })} opp={opp ? oppMarkers(opp) : []} />
      </Card>

      <SectionTitle over="Deine Wahl" title="Zuspiel" />
      <div className="space-y-2">
        {[...byPlayer.entries()].map(([pid, opts]) => (
          <div key={pid}>
            <div className="mb-1 text-[13px] font-semibold text-black">{playerName(state, pid)}</div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {opts.map((s) => {
                const st = setInfo(state, s.option.setType)
                const r = ranked.findIndex((x) => x.option.key === s.option.key)
                const isChosen = chosen === s.option.key
                let cls = 'border-line bg-soft'
                if (chosen) {
                  if (r === 0) cls = 'border-good bg-[#e8f5ef]'
                  else if (isChosen) cls = 'border-bad bg-[#fbecea]'
                  else if (r > 0) cls = 'border-line bg-[#f2f7f4]'
                }
                return (
                  <button key={s.option.key} type="button" onClick={() => answer(s.option.key)} className={`min-h-14 rounded-lg border-2 px-2 text-left ${cls}`}>
                    <div className="font-semibold leading-tight">
                      {st.fullName}
                    </div>
                    <div className="text-[12px] text-muted">
                      {st.signal || 'ohne Zeichen'}
                      {chosen && (r >= 0 ? ` · Platz ${r + 1}` : s.excluded ? ' · raus' : '')}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {chosen && choice && (
        <Card className="mt-4 border-2 border-ink">
          <div className="text-[28px] font-extrabold">{points === 3 ? 'Richtig! 3 Punkte' : points > 0 ? `${points} ${points === 1 ? 'Punkt' : 'Punkte'} – gut, aber …` : '0 Punkte'}</div>
          {ranked[0] && (
            <p className="mt-1 text-[17px]">
              Beste Wahl: <b>{playerName(state, ranked[0].option.playerId)}</b> {setInfo(state, ranked[0].option.setType).fullName}
              {setInfo(state, ranked[0].option.setType).signal && ` (Zeichen ${setInfo(state, ranked[0].option.setType).signal})`} → {zoneText(setInfo(state, ranked[0].option.setType).target, zoneFor(rec.ctx, ranked[0]))}.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ranked[0]?.hits.map((h, i) => (
              <Chip key={i} tone={h.delta > 0 ? 'good' : 'bad'}>
                {h.chip}
              </Chip>
            ))}
          </div>
          {rank !== 0 && (
            <div className="mt-3 text-[14px]">
              <div className="font-semibold">Deine Wahl ({choice.excluded ? 'ausgeschlossen' : `Score ${choice.score}`}):</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {choice.hits.map((h, i) => (
                  <Chip key={i} tone={h.exclude ? 'warn' : h.delta > 0 ? 'good' : 'bad'}>
                    {h.chip}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {rec.hints.map((h) => (
            <p key={h} className="mt-2 text-[14px]">
              💡 {h}
            </p>
          ))}
          <Button variant="primary" className="mt-4 w-full" onClick={next}>
            Nächste Situation
          </Button>
        </Card>
      )}
      {!chosen && (
        <Button variant="ghost" className="mt-3" onClick={next}>
          Überspringen
        </Button>
      )}

      <SectionTitle over="Statistik" title={`${state.quiz.length} Situationen · ${total} Punkte`} />
      {stats.length === 0 ? (
        <p className="text-muted">Noch keine Antworten.</p>
      ) : (
        <div className="divide-y divide-line rounded-xl border border-line">
          {stats.map((s) => (
            <div key={s.k} className="flex items-center justify-between p-3">
              <span>{s.k}</span>
              <span className={`font-semibold tabular-nums ${s.rate < 0.5 ? 'text-bad' : 'text-good'}`}>
                {s.correct}/{s.n} richtig
              </span>
            </div>
          ))}
        </div>
      )}
      {state.quiz.length > 0 && (
        <Button variant="ghost" className="mt-2" onClick={() => confirm('Quiz-Statistik löschen?') && update((d) => void (d.quiz = []))}>
          Statistik zurücksetzen
        </Button>
      )}
    </div>
  )
}
