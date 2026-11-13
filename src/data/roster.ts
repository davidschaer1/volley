import type { Lineup, Opponent, Player, SetPref, SetTypeId } from '../types'

const AUSSEN: SetTypeId[] = ['aussen-inside', 'aussen-medium', 'aussen-schuss', 'aussen-hoch', 'pipe']
const DIA: SetTypeId[] = ['dia-quick', 'dia-medium', 'dia-hoch']
const MITTE: SetTypeId[] = ['mitte-quick', 'mitte-shoot', 'mitte-kopf']

const sidePref: SetPref = { height: 3, netDistance: 0.5, antennaDistance: 0.5 }
const quickPref: SetPref = { height: 2, netDistance: 0.3 }

function prefsFor(sets: SetTypeId[]): Partial<Record<SetTypeId, SetPref>> {
  const out: Partial<Record<SetTypeId, SetPref>> = {}
  for (const s of sets) {
    if (s.startsWith('mitte')) out[s] = { ...quickPref }
    else if (s === 'pipe') out[s] = { height: 3, netDistance: 3 }
    else if (s.endsWith('hoch')) out[s] = { ...sidePref, height: 5, netDistance: 1 }
    else if (s === 'aussen-inside') out[s] = { ...sidePref, antennaDistance: 1.5 }
    else if (s === 'aussen-schuss' || s === 'dia-quick') out[s] = { ...sidePref, height: 1 }
    else out[s] = { ...sidePref }
  }
  return out
}

function player(id: string, name: string, roles: Player['roles'], sets: SetTypeId[], defaultSet?: SetTypeId, extra: Partial<Player> = {}): Player {
  return { id, name, roles, sets, defaultSet, prefs: prefsFor(sets), note: '', strengths: '', form: 'normal', reliability: 3, ...extra }
}

/** Kader – Standardwerte. In der App unter «Kader» editierbar. */
export const defaultPlayers: Player[] = [
  player('david', 'David', ['Z'], ['dump'], undefined, { note: 'Ich' }),
  player('leon', 'Leon', ['A'], AUSSEN, 'aussen-medium', { reliability: 4 }),
  player('quentin', 'Quentin', ['A'], AUSSEN, 'aussen-medium'),
  player('jann', 'Jann', ['A', 'D'], [...AUSSEN, ...DIA], 'aussen-medium'),
  player('enayat', 'Enayat', ['D'], DIA, 'dia-medium', { reliability: 4 }),
  player('noah', 'Noah', ['M'], MITTE, 'mitte-quick'),
  player('saemi', 'Sämi', ['M'], MITTE, 'mitte-quick'),
  player('joel', 'Joel', ['M'], MITTE, 'mitte-quick'),
  player('julian', 'Julian', ['M'], MITTE, 'mitte-quick'),
  player('finn', 'Finn', ['L'], []),
  player('felix', 'Felix', ['L'], []),
  player('dario', 'Dario', ['L'], []),
]

/** Standard-Aufstellung in Rotationsreihenfolge (R1: Zuspieler auf Pos. 1, Aussen 1 auf Pos. 2). */
export const defaultLineup: Lineup = {
  S: 'david',
  OH1: 'leon',
  MB1: 'noah',
  OPP: 'enayat',
  OH2: 'quentin',
  MB2: 'saemi',
  L: 'finn',
}

/** Muster-Gegner, damit der Assistent sofort funktioniert. */
export const defaultOpponent: Opponent = {
  id: 'muster',
  name: 'Muster-Gegner',
  players: [
    { id: 'o1', number: '1', name: 'Zuspieler', role: 'Z', block: 2, height: 183, defense: 3, notes: '' },
    { id: 'o2', number: '2', name: 'Aussen 1', role: 'A', block: 3, height: 192, defense: 4, notes: '' },
    { id: 'o3', number: '3', name: 'Mitte 1', role: 'M', block: 4, height: 198, defense: 2, mbStyle: 'read', notes: '' },
    { id: 'o4', number: '4', name: 'Dia', role: 'D', block: 3, height: 194, defense: 3, notes: '' },
    { id: 'o5', number: '5', name: 'Aussen 2', role: 'A', block: 3, height: 190, defense: 3, notes: '' },
    { id: 'o6', number: '6', name: 'Mitte 2', role: 'M', block: 3, height: 196, defense: 2, mbStyle: 'commit', notes: '' },
    { id: 'o7', number: '7', name: 'Libero', role: 'L', block: 1, height: 178, defense: 5, notes: '' },
  ],
  lineup: { S: 'o1', OH1: 'o2', MB1: 'o3', OPP: 'o4', OH2: 'o5', MB2: 'o6' },
  libero: 'o7',
  serverZone: { Z: 1, A: 6, D: 1, M: 5 },
  notes: '',
}
