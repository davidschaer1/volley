import { useSyncExternalStore } from 'react'
import type { AppState, Situation } from './types'
import { defaultLineup, defaultOpponent, defaultPlayers } from './data/roster'
import { defaultSetTypes } from './data/signals'
import { builtinRules } from './data/rules'

const KEY = 'zuspieler-coach-v1'

export const defaultSituation: Situation = {
  rotation: 1,
  oppRotation: 1,
  pass: '+',
  phase: 'sideout',
  score: 'normal',
  servingTeam: 'them',
  hot: [],
  cold: [],
  blockOnDia: false,
  middleFromBlock: true,
  setterNearNet: false,
}

export function initialState(): AppState {
  return {
    version: 1,
    players: structuredClone(defaultPlayers),
    setTypes: structuredClone(defaultSetTypes),
    lineup: { ...defaultLineup },
    opponents: [structuredClone(defaultOpponent)],
    activeOpponentId: defaultOpponent.id,
    ruleSettings: Object.fromEntries(builtinRules.map((r) => [r.id, { enabled: true, weight: r.defaultWeight }])),
    customRules: [],
    matches: [],
    activeMatchId: '',
    rallies: [],
    quiz: [],
    rotationNotes: {},
    predictabilityThreshold: 0.5,
    situation: { ...defaultSituation },
  }
}

/** Fehlende Felder (z. B. nach einem Update oder Import) mit Standardwerten auffüllen */
export function normalize(raw: Partial<AppState>): AppState {
  const base = initialState()
  const s = { ...base, ...raw } as AppState
  s.situation = { ...base.situation, ...(raw.situation ?? {}) }
  s.ruleSettings = { ...base.ruleSettings, ...(raw.ruleSettings ?? {}) }
  const known = new Set(s.setTypes.map((t) => t.id))
  for (const t of base.setTypes) if (!known.has(t.id)) s.setTypes.push(t)
  return s
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    /* leer oder kaputt → Standard */
  }
  return initialState()
}

let state: AppState = typeof localStorage !== 'undefined' ? load() : initialState()
const listeners = new Set<() => void>()

export function getState() {
  return state
}

export function setState(next: AppState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* Speicher voll / gesperrt */
  }
  listeners.forEach((l) => l())
}

/** Änderung auf einer Kopie ausführen und speichern */
export function update(fn: (draft: AppState) => void) {
  const draft = structuredClone(state)
  fn(draft)
  setState(draft)
}

export function useStore(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export const uid = () => Math.random().toString(36).slice(2, 10)
