import { useState } from 'react'
import { update, useStore, uid } from '../store'
import { builtinRules } from '../data/rules'
import { targetLabel } from '../data/signals'
import { roleLabel } from '../logic/opponent'
import { Button, Card, Label, PageTitle, Seg, SectionTitle, Select, Slider, TextInput, Toggle } from '../components/ui'
import type { CustomRule, PassQuality, Phase, Role, ScoreState, SetTypeId, Target } from '../types'

function MultiSeg<T extends string | number>({ value, options, onChange }: { value: T[]; options: { value: T; label: string }[]; onChange: (v: T[]) => void }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button key={String(o.value)} type="button" onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])} className={`min-h-11 rounded-lg border font-semibold ${on ? 'border-ink bg-ink text-white' : 'border-line bg-soft'}`}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function CustomRuleEditor({ rule }: { rule: CustomRule }) {
  const state = useStore()
  const edit = (fn: (r: CustomRule) => void) =>
    update((d) => {
      const r = d.customRules.find((x) => x.id === rule.id)
      if (r) fn(r)
    })
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <TextInput value={rule.name} onChange={(e) => edit((r) => void (r.name = e.target.value))} />
        <div className="w-28">
          <Toggle checked={rule.enabled} onChange={(v) => edit((r) => void (r.enabled = v))} label={rule.enabled ? 'an' : 'aus'} />
        </div>
      </div>
      <div className="text-[13px] font-semibold text-black">Wenn …</div>
      <div>
        <Label>Annahme (leer = egal)</Label>
        <MultiSeg<PassQuality> value={rule.when.pass ?? []} onChange={(v) => edit((r) => void (r.when.pass = v))} options={[{ value: '#', label: '#' }, { value: '+', label: '+' }, { value: '!', label: '!' }, { value: '-', label: '–' }]} />
      </div>
      <div>
        <Label>Phase</Label>
        <Seg<Phase | ''> value={rule.when.phase ?? ''} onChange={(v) => edit((r) => void (r.when.phase = v || undefined))} options={[{ value: '', label: 'egal' }, { value: 'sideout', label: 'Side-out' }, { value: 'transition', label: 'Transition' }]} />
      </div>
      <div>
        <Label>Spielstand (leer = egal)</Label>
        <MultiSeg<ScoreState> value={rule.when.score ?? []} onChange={(v) => edit((r) => void (r.when.score = v))} options={[{ value: 'normal', label: 'normal' }, { value: 'ende', label: '20+' }, { value: 'satzball', label: 'Satzball' }]} />
      </div>
      <div>
        <Label>Meine Rotation (leer = alle)</Label>
        <MultiSeg<number> value={rule.when.rotation ?? []} onChange={(v) => edit((r) => void (r.when.rotation = v))} options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `R${n}` }))} />
      </div>
      <div>
        <Label>Gegner-Aufschläger ist (leer = egal)</Label>
        <MultiSeg<Role> value={rule.when.oppServerRole ?? []} onChange={(v) => edit((r) => void (r.when.oppServerRole = v))} options={(['Z', 'A', 'M', 'D'] as Role[]).map((x) => ({ value: x, label: roleLabel[x] }))} />
      </div>
      <div className="text-[13px] font-semibold text-black">… dann Punkte für</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Ziel</Label>
          <Select value={rule.then.target ?? ''} onChange={(v) => edit((r) => void (r.then.target = (v || undefined) as Target | undefined))}>
            <option value="">alle</option>
            {Object.entries(targetLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Zuspiel</Label>
          <Select value={rule.then.setType ?? ''} onChange={(v) => edit((r) => void (r.then.setType = (v || undefined) as SetTypeId | undefined))}>
            <option value="">alle</option>
            {state.setTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {targetLabel[s.target]} {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Spieler</Label>
          <Select value={rule.then.playerId ?? ''} onChange={(v) => edit((r) => void (r.then.playerId = v || undefined))}>
            <option value="">alle</option>
            {state.players.filter((p) => !p.roles.every((r) => r === 'L')).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label>Punkte (negativ = Abzug)</Label>
        <Slider value={rule.weight} min={-5} max={5} step={0.5} onChange={(v) => edit((r) => void (r.weight = v))} format={(v) => (v > 0 ? '+' : '') + v} />
      </div>
      <div>
        <Label>Begründung (erscheint als Chip)</Label>
        <TextInput value={rule.explanation} onChange={(e) => edit((r) => void (r.explanation = e.target.value))} />
      </div>
      <Button variant="danger" onClick={() => update((d) => void (d.customRules = d.customRules.filter((x) => x.id !== rule.id)))}>
        Regel löschen
      </Button>
    </Card>
  )
}

export default function Rules() {
  const state = useStore()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div>
      <PageTitle over="Regel-Engine" title="Regeln">
        Jede Regel gibt Punkte = Faktor × Gewichtung. Die Summe ergibt die Rangliste. Kein Blackbox-Score.
      </PageTitle>
      <div className="space-y-2">
        {builtinRules.map((r) => {
          const s = state.ruleSettings[r.id] ?? { enabled: true, weight: r.defaultWeight }
          return (
            <Card key={r.id} className={s.enabled ? '' : 'opacity-60'}>
              <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <span className="w-6 shrink-0 font-extrabold">{r.nr}</span>
                <span className="flex-1">
                  <span className="block font-semibold leading-tight">{r.name}</span>
                  <span className="block text-[13px] text-muted">Gewichtung {s.weight}</span>
                </span>
                <span
                  role="switch"
                  aria-checked={s.enabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    update((d) => void (d.ruleSettings[r.id] = { ...s, enabled: !s.enabled }))
                  }}
                  className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 ${s.enabled ? 'bg-ink' : 'bg-line'}`}
                >
                  <span className={`h-6 w-6 rounded-full bg-white transition-transform ${s.enabled ? 'translate-x-6' : ''}`} />
                </span>
              </button>
              {open === r.id && (
                <div className="mt-3 space-y-2 text-[14px]">
                  <div>
                    <b>Bedingung:</b> {r.condition}
                  </div>
                  <div>
                    <b>Wirkung:</b> {r.explanation}
                  </div>
                  <div className="text-muted">
                    <b>Quelle:</b> {r.source}
                  </div>
                  <div>
                    <Label>Gewichtung</Label>
                    <Slider value={s.weight} min={0} max={6} step={0.5} onChange={(v) => update((d) => void (d.ruleSettings[r.id] = { ...s, weight: v }))} />
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <SectionTitle over="Vorhersehbarkeit" title={`Warnung ab ${Math.round(state.predictabilityThreshold * 100)} %`} />
      <Slider value={state.predictabilityThreshold * 100} min={30} max={80} step={5} onChange={(v) => update((d) => void (d.predictabilityThreshold = v / 100))} format={(v) => `${v} %`} />

      <SectionTitle
        over="Eigene Regeln"
        title="Meine Regeln"
        right={
          <Button
            variant="primary"
            onClick={() => update((d) => void d.customRules.push({ id: uid(), name: 'Neue Regel', enabled: true, weight: 1, explanation: '', when: {}, then: {} }))}
          >
            + Regel
          </Button>
        }
      />
      <div className="space-y-3">
        {state.customRules.length === 0 && <p className="text-muted">Noch keine eigenen Regeln. Beispiel: «Wenn Annahme ! und Transition → Jann Dia Medium +2».</p>}
        {state.customRules.map((r) => (
          <CustomRuleEditor key={r.id} rule={r} />
        ))}
      </div>
    </div>
  )
}
