import { useState } from 'react'
import { update, useStore, uid } from '../store'
import { roleLabel } from '../logic/opponent'
import { prefText, setInfo } from '../logic/view'
import { Button, Card, Label, PageTitle, Rating, Seg, Select, Slider, TextInput, Toggle } from '../components/ui'
import type { Form, Player, Role, SetTypeId } from '../types'

const setsForRoles: Record<Role, SetTypeId[]> = {
  Z: ['dump'],
  A: ['aussen-inside', 'aussen-medium', 'aussen-schuss', 'aussen-hoch', 'pipe'],
  D: ['dia-quick', 'dia-medium', 'dia-hoch'],
  M: ['mitte-quick', 'mitte-shoot', 'mitte-kopf'],
  L: [],
}

const sideSet = (id: SetTypeId) => id.startsWith('aussen') || id.startsWith('dia')

function PlayerEditor({ p }: { p: Player }) {
  const state = useStore()
  const edit = (fn: (x: Player) => void) =>
    update((d) => {
      const x = d.players.find((y) => y.id === p.id)
      if (x) fn(x)
    })
  const possible = [...new Set(p.roles.flatMap((r) => setsForRoles[r]))]

  return (
    <div className="space-y-4 bg-soft p-3">
      <div>
        <Label>Name</Label>
        <TextInput value={p.name} onChange={(e) => edit((x) => void (x.name = e.target.value))} />
      </div>
      <div>
        <Label>Positionen (mehrere möglich)</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['Z', 'A', 'D', 'M', 'L'] as Role[]).map((r) => (
            <Toggle
              key={r}
              checked={p.roles.includes(r)}
              label={roleLabel[r]}
              onChange={(v) =>
                edit((x) => {
                  x.roles = v ? [...x.roles, r] : x.roles.filter((y) => y !== r)
                  if (v) for (const s of setsForRoles[r]) if (!x.sets.includes(s) && s !== 'dump') x.sets.push(s)
                })
              }
            />
          ))}
        </div>
      </div>
      {possible.length > 0 && possible[0] !== 'dump' && (
        <>
          <div>
            <Label>Welche Zuspiele kann/will er spielen?</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {possible.map((s) => {
                const st = setInfo(state, s)
                return (
                  <Toggle
                    key={s}
                    checked={p.sets.includes(s)}
                    label={st.fullName}
                    sub={st.signal ? `Zeichen: ${st.signal}` : 'ohne Zeichen'}
                    onChange={(v) =>
                      edit((x) => {
                        x.sets = v ? [...x.sets, s] : x.sets.filter((y) => y !== s)
                        if (v && !x.prefs[s]) x.prefs[s] = { height: 3, netDistance: 0.5, antennaDistance: sideSet(s) ? 0.5 : undefined }
                      })
                    }
                  />
                )
              })}
            </div>
          </div>
          <div>
            <Label>Standard-Zuspiel</Label>
            <Select value={p.defaultSet ?? ''} onChange={(v) => edit((x) => void (x.defaultSet = (v || undefined) as SetTypeId | undefined))}>
              <option value="">–</option>
              {p.sets.map((s) => {
                const st = setInfo(state, s)
                return (
                  <option key={s} value={s}>
                    {st.fullName}
                  </option>
                )
              })}
            </Select>
          </div>
          <div>
            <Label>Tempo / Ball-Präferenz pro Zuspiel</Label>
            <div className="space-y-3">
              {p.sets.map((s) => {
                const st = setInfo(state, s)
                const pref = p.prefs[s] ?? { height: 3, netDistance: 0.5 }
                const set = (k: 'height' | 'netDistance' | 'antennaDistance', v: number) => edit((x) => void (x.prefs[s] = { ...pref, [k]: v }))
                return (
                  <Card key={s} className="space-y-2">
                    <div className="font-semibold">
                      {st.fullName}
                    </div>
                    <div>
                      <div className="text-[13px]">Höhe</div>
                      <Slider value={pref.height} min={1} max={5} onChange={(v) => set('height', v)} left="tief" right="hoch" format={(v) => `${v}/5`} />
                    </div>
                    <div>
                      <div className="text-[13px]">Abstand zum Netz</div>
                      <Slider value={pref.netDistance} min={0} max={s === 'pipe' ? 4 : 2} step={0.1} onChange={(v) => set('netDistance', v)} format={(v) => `${v.toFixed(1)} m`} />
                    </div>
                    {sideSet(s) && (
                      <div>
                        <div className="text-[13px]">Abstand zur Antenne</div>
                        <Slider value={pref.antennaDistance ?? 0.5} min={0} max={3} step={0.1} onChange={(v) => set('antennaDistance', v)} format={(v) => `${v.toFixed(1)} m`} />
                      </div>
                    )}
                    <div className="text-[12px] text-muted">{prefText(pref)}</div>
                  </Card>
                )
              })}
            </div>
          </div>
        </>
      )}
      <div>
        <Label>Wie er seine Bälle möchte</Label>
        <textarea className="min-h-20 w-full rounded-lg border border-line bg-paper p-2" placeholder="z. B. lieber etwas weg vom Netz, nicht zu schnell nach der Annahme" value={p.note} onChange={(e) => edit((x) => void (x.note = e.target.value))} />
      </div>
      <div>
        <Label>Stärken</Label>
        <TextInput placeholder="z. B. Linie, Diagonal, Linkshänder" value={p.strengths} onChange={(e) => edit((x) => void (x.strengths = e.target.value))} />
      </div>
      <div>
        <Label>Form heute</Label>
        <Seg<Form> value={p.form} onChange={(v) => edit((x) => void (x.form = v))} options={[{ value: 'gut', label: 'gut' }, { value: 'normal', label: 'normal' }, { value: 'schlecht', label: 'schlecht' }]} />
      </div>
      <div>
        <Label>Zuverlässigkeit beim hohen Ball</Label>
        <Rating value={p.reliability} onChange={(v) => edit((x) => void (x.reliability = v))} />
      </div>
      <Button variant="danger" onClick={() => confirm(`${p.name} löschen?`) && update((d) => void (d.players = d.players.filter((x) => x.id !== p.id)))}>
        Spieler löschen
      </Button>
    </div>
  )
}

export default function Roster() {
  const state = useStore()
  const [open, setOpen] = useState<string | null>(null)
  const groups: Role[] = ['Z', 'A', 'D', 'M', 'L']
  return (
    <div>
      <PageTitle over="Kader" title="Unser Team">
        Tippe auf einen Spieler für Zuspiele, Tempo und Notizen.
      </PageTitle>
      <Button
        variant="primary"
        onClick={() => {
          const id = uid()
          update((d) => void d.players.push({ id, name: 'Neuer Spieler', roles: ['A'], sets: [...setsForRoles.A], defaultSet: 'aussen-medium', prefs: {}, note: '', strengths: '', form: 'normal', reliability: 3 }))
          setOpen('A' + id)
        }}
      >
        + Spieler
      </Button>
      {groups.map((g) => {
        const list = state.players.filter((p) => p.roles.includes(g))
        if (!list.length) return null
        return (
          <div key={g} className="mt-5">
            <div className="mb-1.5 text-[13px] font-semibold text-black">{roleLabel[g]}</div>
            <div className="divide-y divide-line rounded-xl border border-line">
              {list.map((p) => {
                const key = g + p.id
                return (
                  <div key={key}>
                    <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3 text-left" onClick={() => setOpen(open === key ? null : key)}>
                      <span className="flex-1">
                        <span className="font-semibold">{p.name}</span>
                        {p.roles.length > 1 && <span className="text-muted"> · {p.roles.map((r) => roleLabel[r]).join(' / ')}</span>}
                        <span className="block text-[13px] text-muted">
                          {p.defaultSet ? `Standard: ${setInfo(state, p.defaultSet).name}` : ''}
                          {p.form !== 'normal' ? ` · Form ${p.form}` : ''}
                          {p.note ? ` · ${p.note}` : ''}
                        </span>
                      </span>
                      <span className="text-muted">{open === key ? '▲' : '▼'}</span>
                    </button>
                    {open === key && <PlayerEditor p={p} />}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
