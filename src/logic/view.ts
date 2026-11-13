import type { CourtMarker } from '../components/Court'
import type { AppState, SetPref, SetTypeId, Target } from '../types'
import { court, slotRole } from './rotation'
import type { OppView } from './opponent'
import { targetLabel } from '../data/signals'

const roleShort: Record<string, string> = { Z: 'Z', A: 'A', M: 'M', D: 'D', L: 'L' }

export function playerName(state: AppState, id?: string) {
  return state.players.find((p) => p.id === id)?.name ?? '–'
}

export function ourMarkers(state: AppState, rotation: number, opts: { serve: boolean; switched: boolean; highlight?: string[] }): CourtMarker[] {
  return court(state.lineup, rotation, opts.serve, opts.switched).map((c) => {
    const role = c.libero ? 'L' : slotRole[c.slot as keyof typeof slotRole]
    const hl = opts.highlight?.includes(c.playerId)
    return {
      pos: c.pos,
      label: roleShort[role],
      name: playerName(state, c.playerId),
      tone: hl ? 'accent' : c.libero ? 'libero' : role === 'Z' ? 'setter' : opts.highlight ? 'muted' : 'normal',
      badge: opts.serve && !opts.switched && c.pos === 1 ? 'Service' : undefined,
    }
  })
}

/** Gegner nach dem Wechsel: Blocker vorne, Verteidiger hinten */
export function oppMarkers(v: OppView): CourtMarker[] {
  const out: CourtMarker[] = []
  const b = v.blockers
  if (b.aussen) out.push({ pos: 2, label: b.aussen.number, name: `${roleShort[b.aussen.role]} · B${b.aussen.block}` })
  if (b.mitte) out.push({ pos: 3, label: b.mitte.number, name: `M · B${b.mitte.block}${b.mitte.mbStyle ? (b.mitte.mbStyle === 'commit' ? ' C' : ' R') : ''}` })
  if (b.dia) out.push({ pos: 4, label: b.dia.number, name: `${roleShort[b.dia.role]} · B${b.dia.block}` })
  for (const z of [1, 6, 5] as const) {
    const p = v.defenders[z]
    if (!p) continue
    const isServer = v.serving && v.server?.id === p.id
    out.push({ pos: z, label: p.number, name: `${roleShort[p.role]} · A${p.defense}`, tone: p.role === 'L' ? 'libero' : 'normal', badge: isServer ? 'Aufschl.' : undefined })
  }
  return out
}

export function setInfo(state: AppState, id: SetTypeId) {
  const st = state.setTypes.find((s) => s.id === id)!
  const targetName = targetLabel[st.target as Target]
  const fullName = st.target === 'pipe' || st.target === 'zuspieler' ? st.name : `${targetName} ${st.name}`
  return { ...st, targetName, fullName }
}

/** «Ball 1 m weg vom Netz, Höhe 3/5, 0.5 m von der Antenne» */
export function prefText(p?: SetPref): string {
  if (!p) return ''
  const h = ['', 'sehr tief', 'tief', 'mittel', 'hoch', 'sehr hoch'][p.height] ?? ''
  const parts = [`Höhe ${h}`, `${fmt(p.netDistance)} m weg vom Netz`]
  if (p.antennaDistance !== undefined) parts.push(`${fmt(p.antennaDistance)} m von der Antenne`)
  return parts.join(', ')
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString()

/** Angriffsziel (gegnerische Zone) für den Pfeil: Hauptzone des Zuspiels */
export function arrowZone(state: AppState, id: SetTypeId): number {
  return setInfo(state, id).zones[0]
}
