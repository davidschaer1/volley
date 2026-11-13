import { useState } from 'react'
import { update, useStore, uid } from '../store'
import { analyzeOpponent, oppName, roleLabel } from '../logic/opponent'
import { SLOTS, slotLabel } from '../logic/rotation'
import { oppMarkers } from '../logic/view'
import { Court } from '../components/Court'
import { Button, Card, Label, PageTitle, Rating, Seg, SectionTitle, Select, TextInput } from '../components/ui'
import type { Opponent, OppPlayer, Role, Zone } from '../types'

function newOpponent(): Opponent {
  const roles: Role[] = ['Z', 'A', 'M', 'D', 'A', 'M', 'L']
  const players: OppPlayer[] = roles.map((role, i) => ({ id: uid(), number: String(i + 1), name: '', role, block: 3, height: 0, defense: role === 'L' ? 4 : 3, mbStyle: role === 'M' ? 'read' : undefined, notes: '' }))
  return {
    id: uid(),
    name: 'Neuer Gegner',
    players,
    lineup: { S: players[0].id, OH1: players[1].id, MB1: players[2].id, OPP: players[3].id, OH2: players[4].id, MB2: players[5].id },
    libero: players[6].id,
    serverZone: { Z: 1, A: 6, D: 1, M: 5 },
    notes: '',
  }
}

export default function Opponents() {
  const state = useStore()
  const opp = state.opponents.find((o) => o.id === state.activeOpponentId) ?? state.opponents[0]
  const [rot, setRot] = useState(1)
  const [serving, setServing] = useState(true)
  const [open, setOpen] = useState<string | null>(null)

  const edit = (fn: (o: Opponent) => void) =>
    update((d) => {
      const o = d.opponents.find((x) => x.id === opp.id)
      if (o) fn(o)
    })
  const editPlayer = (id: string, fn: (p: OppPlayer) => void) =>
    edit((o) => {
      const p = o.players.find((x) => x.id === id)
      if (p) fn(p)
    })

  if (!opp)
    return (
      <div>
        <PageTitle over="Gegner-Scouting" title="Kein Gegner" />
        <Button variant="primary" onClick={() => update((d) => { const o = newOpponent(); d.opponents.push(o); d.activeOpponentId = o.id })}>
          Gegner anlegen
        </Button>
      </div>
    )

  const view = analyzeOpponent(opp, rot, serving)

  return (
    <div>
      <PageTitle over="Gegner-Scouting" title={opp.name} />
      <div className="flex gap-2">
        <Select value={opp.id} onChange={(v) => update((d) => void (d.activeOpponentId = v))}>
          {state.opponents.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <Button onClick={() => update((d) => { const o = newOpponent(); d.opponents.push(o); d.activeOpponentId = o.id })}>Neu</Button>
      </div>

      <Card className="mt-3 space-y-3">
        <div>
          <Label>Name</Label>
          <TextInput value={opp.name} onChange={(e) => edit((o) => void (o.name = e.target.value))} />
        </div>
        <div>
          <Label>Notizen</Label>
          <textarea className="min-h-16 w-full rounded-lg border border-line p-2" value={opp.notes} onChange={(e) => edit((o) => void (o.notes = e.target.value))} />
        </div>
      </Card>

      <SectionTitle over="Kader" title="Spieler" right={<Button onClick={() => edit((o) => void o.players.push({ id: uid(), number: '', name: '', role: 'A', block: 3, height: 0, defense: 3, notes: '' }))}>+ Spieler</Button>} />
      <div className="divide-y divide-line rounded-xl border border-line">
        {opp.players.map((p) => (
          <div key={p.id}>
            <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3 text-left" onClick={() => setOpen(open === p.id ? null : p.id)}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink font-extrabold">{p.number || '?'}</span>
              <span className="flex-1">
                <span className="font-semibold">{p.name || roleLabel[p.role]}</span>
                <span className="block text-[13px] text-muted">
                  {roleLabel[p.role]} · Block {p.block} · Abwehr {p.defense}
                  {p.height ? ` · ${p.height} cm` : ''}
                  {p.mbStyle ? ` · ${p.mbStyle}` : ''}
                </span>
              </span>
              <span className="text-muted">{open === p.id ? '▲' : '▼'}</span>
            </button>
            {open === p.id && (
              <div className="space-y-3 bg-soft p-3">
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <div>
                    <Label>Nummer</Label>
                    <TextInput inputMode="numeric" value={p.number} onChange={(e) => editPlayer(p.id, (x) => void (x.number = e.target.value))} />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <TextInput value={p.name} onChange={(e) => editPlayer(p.id, (x) => void (x.name = e.target.value))} />
                  </div>
                </div>
                <div>
                  <Label>Position</Label>
                  <Seg value={p.role} onChange={(v) => editPlayer(p.id, (x) => { x.role = v; x.mbStyle = v === 'M' ? x.mbStyle ?? 'read' : undefined })} options={(['Z', 'A', 'M', 'D', 'L'] as Role[]).map((r) => ({ value: r, label: roleLabel[r] }))} />
                </div>
                <div>
                  <Label>Blockstärke</Label>
                  <Rating value={p.block} onChange={(v) => editPlayer(p.id, (x) => void (x.block = v))} />
                </div>
                <div>
                  <Label>Abwehrstärke</Label>
                  <Rating value={p.defense} onChange={(v) => editPlayer(p.id, (x) => void (x.defense = v))} />
                </div>
                <div>
                  <Label>Grösse / Reichweite (cm, 0 = unbekannt)</Label>
                  <TextInput type="number" inputMode="numeric" value={p.height} onChange={(e) => editPlayer(p.id, (x) => void (x.height = Number(e.target.value) || 0))} />
                </div>
                {p.role === 'M' && (
                  <div>
                    <Label>Mittelblocker</Label>
                    <Seg value={p.mbStyle ?? 'read'} onChange={(v) => editPlayer(p.id, (x) => void (x.mbStyle = v))} options={[{ value: 'commit', label: 'springt mit (commit)' }, { value: 'read', label: 'liest (read)' }]} />
                  </div>
                )}
                <div>
                  <Label>Notizen</Label>
                  <textarea className="min-h-16 w-full rounded-lg border border-line p-2" value={p.notes} onChange={(e) => editPlayer(p.id, (x) => void (x.notes = e.target.value))} />
                </div>
                <Button variant="danger" onClick={() => edit((o) => void (o.players = o.players.filter((x) => x.id !== p.id)))}>
                  Spieler löschen
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionTitle over="5-1" title="Aufstellung des Gegners" />
      <Card>
        <div className="grid grid-cols-2 gap-3">
          {SLOTS.map((slot) => (
            <div key={slot}>
              <Label>{slotLabel[slot]}</Label>
              <Select value={opp.lineup[slot]} onChange={(v) => edit((o) => void (o.lineup[slot] = v))}>
                {opp.players.filter((p) => p.role !== 'L').map((p) => (
                  <option key={p.id} value={p.id}>
                    {oppName(p)} ({roleLabel[p.role]})
                  </option>
                ))}
              </Select>
            </div>
          ))}
          <div>
            <Label>Libero</Label>
            <Select value={opp.libero} onChange={(v) => edit((o) => void (o.libero = v))}>
              <option value="">kein Libero</option>
              {opp.players.filter((p) => p.role === 'L').map((p) => (
                <option key={p.id} value={p.id}>
                  {oppName(p)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <SectionTitle over="Nach dem Service" title="Wo verteidigt der Aufschläger?" />
      <Card className="space-y-3">
        {(['M', 'A', 'D', 'Z'] as const).map((r) => (
          <div key={r}>
            <Label>{roleLabel[r]} am Service → Zone</Label>
            <Seg<Zone> value={opp.serverZone[r]} onChange={(v) => edit((o) => void (o.serverZone[r] = v))} options={[5, 6, 1].map((z) => ({ value: z as Zone, label: `Zone ${z}` }))} />
          </div>
        ))}
      </Card>

      <SectionTitle over="Automatisch abgeleitet" title="Matchups pro Rotation" />
      <Seg value={rot} onChange={setRot} options={[1, 2, 3, 4, 5, 6].map((r) => ({ value: r, label: `R${r}` }))} />
      <div className="mt-2">
        <Seg value={serving ? 'y' : 'n'} onChange={(v) => setServing(v === 'y')} options={[{ value: 'y', label: 'Gegner serviert' }, { value: 'n', label: 'Gegner nimmt an' }]} />
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Card>
          <Court ours={[]} opp={oppMarkers(view)} />
        </Card>
        <Card className="space-y-2 text-[15px]">
          <div>
            Aufschläger (Pos. 1): <b>{oppName(view.server)}</b> ({roleLabel[view.server?.role ?? 'A']})
          </div>
          <div>Zuspieler {view.setterFront ? 'vorne – nur 2 grosse Blocker' : 'hinten'}</div>
          <hr className="border-line" />
          <div>
            Gegen unseren <b>Aussen</b> blockt: {oppName(view.blockers.aussen)} ({roleLabel[view.blockers.aussen?.role ?? 'Z']}, Block {view.blockers.aussen?.block})
          </div>
          <div>
            Gegen unsere <b>Mitte</b> blockt: {oppName(view.blockers.mitte)} (Block {view.blockers.mitte?.block}, {view.blockers.mitte?.mbStyle ?? '–'})
          </div>
          <div>
            Gegen unsere <b>Dia</b> blockt: {oppName(view.blockers.dia)} (Block {view.blockers.dia?.block})
          </div>
          <hr className="border-line" />
          {([5, 6, 1] as Zone[]).map((z) => (
            <div key={z}>
              Zone {z}: {oppName(view.defenders[z])} ({roleLabel[view.defenders[z]?.role ?? 'A']}, Abwehr {view.defenders[z]?.defense})
            </div>
          ))}
        </Card>
      </div>

      {state.opponents.length > 1 && (
        <div className="mt-6">
          <Button variant="danger" onClick={() => confirm(`«${opp.name}» löschen?`) && update((d) => { d.opponents = d.opponents.filter((o) => o.id !== opp.id); d.activeOpponentId = d.opponents[0].id })}>
            Gegner löschen
          </Button>
        </div>
      )}
    </div>
  )
}
