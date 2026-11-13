import { useMemo, useState } from 'react'
import { update, useStore } from '../store'
import { recommend, type Ctx, type Scored } from '../logic/engine'
import { rotationWithSlotServing, SLOTS, slotPosition } from '../logic/rotation'
import { roleLabel } from '../logic/opponent'
import { arrowZone, oppMarkers, ourMarkers, playerName, prefText, setInfo } from '../logic/view'
import { Court } from '../components/Court'
import { Card, Chip, Label, Overline, Seg, Toggle } from '../components/ui'
import type { AppState, PassQuality, Situation, Zone } from '../types'

export function zoneFor(ctx: Ctx, s: Scored): number {
  const st = ctx.setType(s.option.setType)
  const o = ctx.opp
  if (o && s.hits.some((h) => h.ruleId === 'davids-regel')) {
    const z = ([1, 5, 6] as Zone[]).find((z) => o.defenders[z]?.id === o.server?.id)
    if (z) return z
  }
  if (o) {
    const list = ([1, 5, 6] as Zone[]).filter((z) => o.defenders[z])
    const weakest = [...list].sort((a, b) => o.defenders[a]!.defense - o.defenders[b]!.defense)[0]
    if (weakest && st.zones.includes(weakest) && s.hits.some((h) => h.ruleId === 'schwaechster-verteidiger')) return weakest
  }
  return st.zones[0]
}

export function zoneText(target: string, zone: number): string {
  if (target === 'aussen') return zone === 5 ? 'diagonal auf Zone 5' : zone === 1 ? 'Linie auf Zone 1' : 'in die Mitte auf Zone 6'
  if (target === 'dia') return zone === 1 ? 'diagonal auf Zone 1' : zone === 5 ? 'Linie auf Zone 5' : 'in die Mitte auf Zone 6'
  if (target === 'zuspieler') return 'kurz hinter den Block'
  return `auf Zone ${zone}`
}

export function SignalBox({ signal, big }: { signal: string; big?: boolean }) {
  const text = signal || '–'
  const long = text.length > 3
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center rounded-xl bg-ink text-white ${big ? 'h-24 w-24' : 'h-16 w-16'}`}>
      <div className={`text-center font-extrabold leading-none ${long ? (big ? 'px-1 text-[15px]' : 'px-1 text-[11px]') : big ? 'text-[52px]' : 'text-[32px]'}`}>{text}</div>
      {!signal && <div className="mt-1 text-[10px] text-white/70">kein Zeichen</div>}
    </div>
  )
}

function RecCard({ s, rank, state, ctx }: { s: Scored; rank: number; state: AppState; ctx: Ctx }) {
  const st = setInfo(state, s.option.setType)
  const p = state.players.find((x) => x.id === s.option.playerId)
  const zone = zoneFor(ctx, s)
  const big = rank === 1
  const pref = p?.prefs[s.option.setType]
  return (
    <Card className={big ? 'border-ink border-2' : ''}>
      <div className="flex gap-4">
        <SignalBox signal={st.signal} big={big} />
        <div className="min-w-0 flex-1">
          <Overline>
            {rank}. Wahl · {st.targetName}
            {!s.option.front && s.option.setType !== 'pipe' ? ' hinten' : ''} · {s.score > 0 ? '+' : ''}
            {s.score}
          </Overline>
          <div className={`font-extrabold leading-tight ${big ? 'text-[30px]' : 'text-xl'}`}>{p?.name}</div>
          <div className={`${big ? 'text-lg' : ''} font-semibold`}>
            {st.name} <span className="font-normal text-muted">→ {zoneText(st.target, zone)}</span>
          </div>
        </div>
      </div>
      <p className={`mt-3 ${big ? 'text-[17px]' : ''}`}>{s.reason}.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {s.hits.map((h, i) => (
          <Chip key={i} tone={h.delta > 0 ? 'good' : 'bad'}>
            {h.chip} {h.delta > 0 ? '+' : ''}
            {h.delta}
          </Chip>
        ))}
      </div>
      {(p?.note || pref) && (
        <div className="mt-3 rounded-lg bg-soft p-3 text-[14px]">
          {p?.note && (
            <div>
              <span className="font-semibold">{p.name}:</span> {p.note}
            </div>
          )}
          {pref && (
            <div className="text-muted">
              {st.name}: {prefText(pref)}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export function SituationInputs({ sit, setSit, state, compact }: { sit: Situation; setSit: (p: Partial<Situation>) => void; state: AppState; compact?: boolean }) {
  const [more, setMore] = useState(false)
  const opp = state.opponents.find((o) => o.id === state.activeOpponentId) ?? state.opponents[0]
  const oppById = new Map(opp?.players.map((p) => [p.id, p]))
  const serverSlot = SLOTS.find((s) => slotPosition(s, sit.oppRotation) === 1)
  const ourAttackers = useMemo(() => {
    const ids = new Set<string>()
    for (const s of SLOTS) if (s !== 'S') ids.add(state.lineup[s])
    return [...ids]
  }, [state.lineup])
  const theyServe = sit.phase === 'sideout' || sit.servingTeam === 'them'

  return (
    <div className="space-y-3">
      <div>
        <Label>Meine Rotation</Label>
        <Seg value={sit.rotation} onChange={(v) => setSit({ rotation: v })} options={[1, 2, 3, 4, 5, 6].map((r) => ({ value: r, label: `R${r}` }))} />
      </div>
      <div>
        <Label>{theyServe ? 'Gegner-Aufschläger' : 'Gegner auf Pos. 1'}</Label>
        <Seg
          value={serverSlot}
          onChange={(slot) => setSit({ oppRotation: rotationWithSlotServing(slot) })}
          options={SLOTS.map((slot) => {
            const p = oppById.get(opp?.lineup[slot] ?? '')
            return { value: slot, label: p ? `#${p.number}` : slot, sub: roleLabel[p?.role ?? 'A'] }
          })}
        />
      </div>
      <div>
        <Label>Annahme / Abwehr</Label>
        <Seg<PassQuality>
          size="lg"
          value={sit.pass}
          onChange={(v) => setSit({ pass: v })}
          options={[
            { value: '#', label: '#', sub: 'perfekt' },
            { value: '+', label: '+', sub: 'gut' },
            { value: '!', label: '!', sub: 'mittel' },
            { value: '-', label: '–', sub: 'schlecht' },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Phase</Label>
          <Seg
            value={sit.phase}
            onChange={(v) => setSit({ phase: v, servingTeam: v === 'sideout' ? 'them' : sit.servingTeam })}
            options={[
              { value: 'sideout', label: 'Side-out' },
              { value: 'transition', label: 'Transition' },
            ]}
          />
        </div>
        <div>
          <Label>Spielstand</Label>
          <Seg
            value={sit.score}
            onChange={(v) => setSit({ score: v })}
            options={[
              { value: 'normal', label: '–' },
              { value: 'ende', label: '20+' },
              { value: 'satzball', label: 'SB' },
            ]}
          />
        </div>
      </div>
      {!compact && (
        <>
          <button type="button" className="min-h-11 w-full rounded-lg border border-line text-[15px] font-semibold" onClick={() => setMore(!more)}>
            {more ? 'Weniger' : 'Mehr: Annahme, heiss/kalt, Block …'}
          </button>
          {more && (
            <div className="space-y-3">
              {sit.phase === 'transition' && (
                <div>
                  <Label>Wer hat in diesem Ballwechsel serviert?</Label>
                  <Seg
                    value={sit.servingTeam}
                    onChange={(v) => setSit({ servingTeam: v })}
                    options={[
                      { value: 'them', label: 'Gegner' },
                      { value: 'us', label: 'Wir' },
                    ]}
                  />
                </div>
              )}
              <div>
                <Label>Wer hat angenommen?</Label>
                <Seg
                  value={sit.receiverId ?? ''}
                  onChange={(v) => setSit({ receiverId: v || undefined })}
                  cols={4}
                  options={[{ value: '', label: '–' }, ...[state.lineup.OH1, state.lineup.OH2, state.lineup.L].map((id) => ({ value: id, label: playerName(state, id) }))]}
                />
              </div>
              <div>
                <Label>Heiss / kalt (tippen wechselt: – → heiss → kalt)</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ourAttackers.map((id) => {
                    const hot = sit.hot.includes(id)
                    const cold = sit.cold.includes(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          const h = sit.hot.filter((x) => x !== id)
                          const c = sit.cold.filter((x) => x !== id)
                          if (!hot && !cold) setSit({ hot: [...h, id], cold: c })
                          else if (hot) setSit({ hot: h, cold: [...c, id] })
                          else setSit({ hot: h, cold: c })
                        }}
                        className={`min-h-12 rounded-lg border font-semibold ${hot ? 'border-bad bg-[#fbecea] text-bad' : cold ? 'border-accent bg-[#e8eeff] text-accent' : 'border-line bg-soft'}`}
                      >
                        {playerName(state, id)}
                        <div className="text-[11px] font-normal">{hot ? 'heiss' : cold ? 'kalt' : '–'}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <Toggle checked={sit.setterNearNet} onChange={(v) => setSit({ setterNearNet: v })} label="Ich bin nahe am Netz" sub="Bei Annahme ! ist die Mitte dann noch möglich" />
              <Toggle checked={sit.blockOnDia} onChange={(v) => setSit({ blockOnDia: v })} label="Block hängt an der Dia" sub="Zweiter Ball wird interessant (nur Zuspieler vorne)" />
              {sit.phase === 'transition' && <Toggle checked={sit.middleFromBlock} onChange={(v) => setSit({ middleFromBlock: v })} label="Mitte kommt gerade vom Block" />}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Assistant() {
  const state = useStore()
  const sit = state.situation
  const [showAll, setShowAll] = useState(false)
  const rec = useMemo(() => recommend(state, sit), [state, sit])
  const setSit = (p: Partial<Situation>) => update((d) => void Object.assign(d.situation, p))
  const top = rec.top[0]
  const opp = rec.ctx.opp

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-8">
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <Overline>Entscheidungs-Assistent</Overline>
            <h1 className="text-[26px] font-extrabold leading-tight">Was jetzt?</h1>
          </div>
          <div className="text-right text-[13px] text-muted">Gegner: {opp?.opponent.name ?? '–'}</div>
        </div>
        <SituationInputs sit={sit} setSit={setSit} state={state} />
      </div>

      <div className="mt-6 space-y-3 lg:mt-0">
        {rec.warnings.map((w) => (
          <div key={w} className="rounded-lg border border-[#f0d9b0] bg-[#fdf3e2] p-3 font-semibold text-warn">
            ⚠ {w}
          </div>
        ))}
        {rec.top.map((s, i) => (
          <RecCard key={s.option.key} s={s} rank={i + 1} state={state} ctx={rec.ctx} />
        ))}
        {rec.hints.map((h) => (
          <div key={h} className="rounded-lg bg-soft p-3 text-[14px]">
            💡 {h}
          </div>
        ))}

        {top && (
          <Card>
            <Overline>
              R{sit.rotation} nach dem Wechsel · Gegner {opp?.serving ? 'hat serviert' : 'nimmt an'}
            </Overline>
            <Court
              ours={ourMarkers(state, sit.rotation, { serve: false, switched: true, highlight: [top.option.playerId] })}
              opp={opp ? oppMarkers(opp) : []}
              arrows={[
                { from: top.option.attackPos, toZone: zoneFor(rec.ctx, top) },
                ...rec.top.slice(1).map((s) => ({ from: s.option.attackPos, toZone: arrowZone(state, s.option.setType), tone: 'secondary' as const })),
              ]}
              highlightZone={zoneFor(rec.ctx, top)}
            />
            <p className="mt-1 text-[12px] text-muted">Gegner: B = Blockstärke, A = Abwehrstärke, C/R = Mittelblocker commit/read.</p>
          </Card>
        )}

        <button type="button" onClick={() => setShowAll(!showAll)} className="min-h-11 w-full rounded-lg border border-line font-semibold">
          {showAll ? 'Alle Optionen ausblenden' : `Alle ${rec.all.length} Optionen mit Punkten`}
        </button>
        {showAll && (
          <div className="divide-y divide-line rounded-xl border border-line">
            {rec.all.map((s) => {
              const st = setInfo(state, s.option.setType)
              return (
                <div key={s.option.key} className={`p-3 ${s.excluded ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between font-semibold">
                    <span>
                      {playerName(state, s.option.playerId)} · {st.fullName} {st.signal && <span className="text-muted">({st.signal})</span>}
                    </span>
                    <span className="tabular-nums">{s.excluded ? 'raus' : s.score}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.hits.map((h, i) => (
                      <Chip key={i} tone={h.exclude ? 'warn' : h.delta > 0 ? 'good' : 'bad'}>
                        {h.chip} {h.exclude ? '' : (h.delta > 0 ? '+' : '') + h.delta}
                      </Chip>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
