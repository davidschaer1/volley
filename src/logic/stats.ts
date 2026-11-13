import type { Rally, SetTypeId } from '../types'

export interface Quote {
  n: number
  points: number
  errors: number
  /** Punkte / Versuche */
  rate: number
  /** (Punkte − Fehler − Blocks) / Versuche */
  eff: number
}

export function quote(rallies: Rally[]): Quote {
  const n = rallies.length
  const points = rallies.filter((r) => r.result === 'punkt').length
  const errors = rallies.filter((r) => r.result === 'fehler' || r.result === 'block').length
  return { n, points, errors, rate: n ? points / n : 0, eff: n ? (points - errors) / n : 0 }
}

export function quoteFor(rallies: Rally[], playerId: string, setType?: SetTypeId): Quote {
  return quote(rallies.filter((r) => r.playerId === playerId && (!setType || r.setType === setType)))
}

/** Verteilung der Zuspiele in einer Rotation: setType → Anteil */
export function distribution(rallies: Rally[], rotation: number): { setType: SetTypeId; playerId: string; share: number; n: number }[] {
  const inRot = rallies.filter((r) => r.rotation === rotation)
  const counts = new Map<string, number>()
  for (const r of inRot) counts.set(`${r.playerId}:${r.setType}`, (counts.get(`${r.playerId}:${r.setType}`) ?? 0) + 1)
  return [...counts.entries()]
    .map(([k, n]) => {
      const [playerId, setType] = k.split(':') as [string, SetTypeId]
      return { playerId, setType, n, share: n / inRot.length }
    })
    .sort((a, b) => b.n - a.n)
}

export interface Predictability {
  rotation: number
  setType: SetTypeId
  playerId: string
  share: number
  total: number
}

/** Warnung, wenn in einer Rotation ein Zuspiel mehr als `threshold` aller Bälle ausmacht (ab 6 Bällen). */
export function predictability(rallies: Rally[], rotation: number, threshold: number, minRallies = 6): Predictability | null {
  const total = rallies.filter((r) => r.rotation === rotation).length
  if (total < minRallies) return null
  const top = distribution(rallies, rotation)[0]
  if (!top || top.share <= threshold) return null
  return { rotation, setType: top.setType, playerId: top.playerId, share: top.share, total }
}

/** «Heisse Hand»: Punkte in den letzten k Angriffen des Spielers */
export function recentForm(rallies: Rally[], playerId: string, k = 5): Quote {
  const mine = rallies.filter((r) => r.playerId === playerId).sort((a, b) => b.ts - a.ts).slice(0, k)
  return quote(mine)
}
