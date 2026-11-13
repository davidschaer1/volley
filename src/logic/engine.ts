import type { AppState, CustomRule, Player, Rally, SetType, SetTypeId, Situation, Slot } from '../types'
import { builtinRules } from '../data/rules'
import { attackersOf, setterFront, type Attacker } from './rotation'
import { analyzeOpponent, type OppView } from './opponent'
import { predictability } from './stats'

export interface Option {
  key: string
  playerId: string
  setType: SetTypeId
  slot: Slot
  attackPos: number
  front: boolean
}

export interface Ctx {
  sit: Situation
  state: AppState
  player: (id: string) => Player | undefined
  setType: (id: SetTypeId) => SetType
  opp: OppView | null
  attackers: Attacker[]
  setterFront: boolean
  goodPass: boolean
  middle?: Attacker
  rallies: Rally[]
}

export interface Hit {
  factor: number
  chip: string
  exclude?: boolean
}

export interface RuleDef {
  id: string
  nr: number
  name: string
  /** Bedingung in Worten */
  condition: string
  /** Wirkung / Erklärung */
  explanation: string
  source: string
  defaultWeight: number
  apply: (ctx: Ctx, opt: Option) => Hit | null
  /** Optionaler Hinweis für die Situation (z. B. «tief zuspielen») */
  hint?: (ctx: Ctx) => string | null
}

export interface RuleHit {
  ruleId: string
  ruleName: string
  chip: string
  delta: number
  exclude?: boolean
}

export interface Scored {
  option: Option
  score: number
  hits: RuleHit[]
  excluded: boolean
  reason: string
}

export interface Recommendation {
  all: Scored[]
  top: Scored[]
  hints: string[]
  warnings: string[]
  ctx: Ctx
}

export function buildCtx(state: AppState, sit: Situation): Ctx {
  const players = new Map(state.players.map((p) => [p.id, p]))
  const sets = new Map(state.setTypes.map((s) => [s.id, s]))
  const opponent = state.opponents.find((o) => o.id === state.activeOpponentId) ?? state.opponents[0]
  const serving = sit.phase === 'sideout' ? true : sit.servingTeam === 'them'
  const attackers = attackersOf(state.lineup, sit.rotation)
  return {
    sit,
    state,
    player: (id) => players.get(id),
    setType: (id) => sets.get(id)!,
    opp: opponent ? analyzeOpponent(opponent, sit.oppRotation, serving) : null,
    attackers,
    setterFront: setterFront(sit.rotation),
    goodPass: sit.pass === '#' || sit.pass === '+',
    middle: attackers.find((a) => a.role === 'M'),
    rallies: state.rallies,
  }
}

/** Alle möglichen Optionen: Angreifer in dieser Rotation × Zuspiele, die er spielen kann */
export function generateOptions(ctx: Ctx): Option[] {
  const out: Option[] = []
  for (const a of ctx.attackers) {
    const p = ctx.player(a.playerId)
    if (!p) continue
    for (const s of a.sets) {
      // Zuspieler-Dump ist immer möglich, sonst nur, was der Spieler spielen kann/will
      if (s !== 'dump' && !p.sets.includes(s)) continue
      out.push({ key: `${a.playerId}:${s}`, playerId: a.playerId, setType: s, slot: a.slot, attackPos: a.attackPos, front: a.front })
    }
  }
  return out
}

function customMatches(rule: CustomRule, ctx: Ctx, opt: Option): boolean {
  const w = rule.when
  const s = ctx.sit
  if (w.pass?.length && !w.pass.includes(s.pass)) return false
  if (w.phase && w.phase !== s.phase) return false
  if (w.score?.length && !w.score.includes(s.score)) return false
  if (w.rotation?.length && !w.rotation.includes(s.rotation)) return false
  if (w.setterFront !== undefined && w.setterFront !== ctx.setterFront) return false
  if (w.oppServerRole?.length) {
    if (!ctx.opp?.serving || !ctx.opp.server || !w.oppServerRole.includes(ctx.opp.server.role)) return false
  }
  const t = rule.then
  if (t.setType && t.setType !== opt.setType) return false
  if (t.target && ctx.setType(opt.setType).target !== t.target) return false
  if (t.playerId && t.playerId !== opt.playerId) return false
  return true
}

export function scoreOption(ctx: Ctx, opt: Option): Scored {
  const hits: RuleHit[] = []
  const p = ctx.player(opt.playerId)
  if (p?.defaultSet === opt.setType) hits.push({ ruleId: 'base', ruleName: 'Standard-Zuspiel', chip: `Standard-Zuspiel von ${p.name}`, delta: 1 })
  if (opt.setType === 'dump') hits.push({ ruleId: 'base', ruleName: 'Überraschung', chip: 'Zweiter Ball nur als Überraschung', delta: -1.5 })

  for (const rule of builtinRules) {
    const setting = ctx.state.ruleSettings[rule.id] ?? { enabled: true, weight: rule.defaultWeight }
    if (!setting.enabled) continue
    const hit = rule.apply(ctx, opt)
    if (!hit) continue
    hits.push({ ruleId: rule.id, ruleName: rule.name, chip: hit.chip, delta: hit.exclude ? 0 : round(hit.factor * setting.weight), exclude: hit.exclude })
  }
  for (const rule of ctx.state.customRules) {
    if (!rule.enabled || !customMatches(rule, ctx, opt)) continue
    hits.push({ ruleId: rule.id, ruleName: rule.name, chip: rule.explanation || rule.name, delta: rule.weight })
  }

  const excluded = hits.some((h) => h.exclude)
  const score = round(hits.reduce((s, h) => s + h.delta, 0))
  const best = [...hits].filter((h) => h.delta > 0).sort((a, b) => b.delta - a.delta)[0]
  const reason = excluded ? hits.find((h) => h.exclude)!.chip : best?.chip ?? 'Keine besondere Regel – solide Option'
  return { option: opt, score, hits: hits.filter((h) => h.delta !== 0 || h.exclude), excluded, reason }
}

const round = (n: number) => Math.round(n * 100) / 100

export function recommend(state: AppState, sit: Situation): Recommendation {
  const ctx = buildCtx(state, sit)
  const all = generateOptions(ctx)
    .map((o) => scoreOption(ctx, o))
    .sort((a, b) => (a.excluded === b.excluded ? b.score - a.score : a.excluded ? 1 : -1))

  // Top 3: zuerst die beste Option pro Spieler, dann auffüllen
  const top: Scored[] = []
  const seen = new Set<string>()
  for (const s of all) {
    // Vielfalt nur bei Optionen mit positivem Score – sonst nicht schlechte Optionen nach oben ziehen
    if (s.excluded || s.score <= 0 || seen.has(s.option.playerId)) continue
    seen.add(s.option.playerId)
    top.push(s)
    if (top.length === 3) break
  }
  for (const s of all) {
    if (top.length >= 3) break
    if (!s.excluded && !top.includes(s)) top.push(s)
  }

  const hints: string[] = []
  for (const rule of builtinRules) {
    const setting = state.ruleSettings[rule.id] ?? { enabled: true, weight: rule.defaultWeight }
    if (!setting.enabled || !rule.hint) continue
    const h = rule.hint(ctx)
    if (h) hints.push(h)
  }

  const warnings: string[] = []
  const pr = predictability(state.rallies, sit.rotation, state.predictabilityThreshold)
  if (pr) {
    const p = ctx.player(pr.playerId)
    const st = ctx.setType(pr.setType)
    warnings.push(`Vorhersehbar: In R${sit.rotation} gingen ${Math.round(pr.share * 100)} % der Bälle an ${p?.name ?? '?'} (${st.name}).`)
  }

  return { all, top, hints, warnings, ctx }
}
