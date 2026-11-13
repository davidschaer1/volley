export type Role = 'Z' | 'A' | 'D' | 'M' | 'L'
export type PassQuality = '#' | '+' | '!' | '-'
export type Phase = 'sideout' | 'transition'
export type ScoreState = 'normal' | 'ende' | 'satzball'
export type Form = 'gut' | 'normal' | 'schlecht'
export type Target = 'aussen' | 'mitte' | 'dia' | 'pipe' | 'zuspieler'
export type Slot = 'S' | 'OH1' | 'MB1' | 'OPP' | 'OH2' | 'MB2'
export type Zone = 1 | 5 | 6

export type SetTypeId =
  | 'aussen-inside'
  | 'aussen-medium'
  | 'aussen-schuss'
  | 'aussen-hoch'
  | 'mitte-quick'
  | 'mitte-shoot'
  | 'mitte-kopf'
  | 'dia-quick'
  | 'dia-medium'
  | 'dia-hoch'
  | 'pipe'
  | 'dump'

export interface SetType {
  id: SetTypeId
  target: Target
  /** Name des Zuspiels, z. B. «Inside» */
  name: string
  /** Handzeichen, leer = ohne Zeichen */
  signal: string
  /** 1 = schnell, 2 = mittel, 3 = hoch */
  tempo: 1 | 2 | 3
  /** Risiko-Zuspiel (bei Satzende meiden) */
  risky: boolean
  /** Gegnerische Abwehrzonen, die der Angriff natürlich trifft (erste = Hauptzone) */
  zones: Zone[]
  /** Kurzbeschreibung für Laien */
  info: string
}

export interface SetPref {
  /** 1 = tief … 5 = hoch */
  height: number
  /** Abstand zum Netz in m */
  netDistance: number
  /** Abstand zur Antenne in m (nur Aussen/Dia) */
  antennaDistance?: number
}

export interface Player {
  id: string
  name: string
  roles: Role[]
  sets: SetTypeId[]
  defaultSet?: SetTypeId
  prefs: Partial<Record<SetTypeId, SetPref>>
  note: string
  strengths: string
  form: Form
  /** Zuverlässigkeit beim hohen Ball 1–5 */
  reliability: number
}

export type Lineup = Record<Slot, string> & { L: string }

export interface OppPlayer {
  id: string
  number: string
  name: string
  role: Role
  /** 1–5 */
  block: number
  /** cm, 0 = unbekannt */
  height: number
  /** 1–5 */
  defense: number
  mbStyle?: 'commit' | 'read'
  notes: string
}

export interface Opponent {
  id: string
  name: string
  players: OppPlayer[]
  lineup: Record<Slot, string>
  libero: string
  /** Wo der Aufschläger nach dem Service verteidigt, pro Rolle */
  serverZone: Record<'Z' | 'A' | 'D' | 'M', Zone>
  notes: string
}

export interface Situation {
  rotation: number
  /** Gegner-Rotation = Position des gegnerischen Zuspielers */
  oppRotation: number
  pass: PassQuality
  phase: Phase
  score: ScoreState
  /** Wer hat in diesem Ballwechsel serviert */
  servingTeam: 'them' | 'us'
  receiverId?: string
  hot: string[]
  cold: string[]
  blockOnDia: boolean
  middleFromBlock: boolean
  setterNearNet: boolean
}

export interface RuleSetting {
  enabled: boolean
  weight: number
}

export interface CustomRule {
  id: string
  name: string
  enabled: boolean
  weight: number
  explanation: string
  when: {
    pass?: PassQuality[]
    phase?: Phase
    score?: ScoreState[]
    rotation?: number[]
    oppServerRole?: Role[]
    setterFront?: boolean
  }
  then: {
    target?: Target
    setType?: SetTypeId
    playerId?: string
  }
}

export type RallyResult = 'punkt' | 'fehler' | 'block' | 'weiter'

export interface Rally {
  id: string
  matchId: string
  ts: number
  rotation: number
  pass: PassQuality
  phase: Phase
  playerId: string
  setType: SetTypeId
  result: RallyResult
}

export interface Match {
  id: string
  name: string
  date: string
  opponentId?: string
}

export interface QuizResult {
  ts: number
  category: string
  pass: PassQuality
  phase: Phase
  rotation: number
  points: number
  correct: boolean
}

export interface AppState {
  version: 1
  players: Player[]
  setTypes: SetType[]
  lineup: Lineup
  opponents: Opponent[]
  activeOpponentId: string
  ruleSettings: Record<string, RuleSetting>
  customRules: CustomRule[]
  matches: Match[]
  activeMatchId: string
  rallies: Rally[]
  quiz: QuizResult[]
  rotationNotes: Record<number, string>
  predictabilityThreshold: number
  situation: Situation
}
