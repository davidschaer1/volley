import type { RuleDef } from '../logic/engine'
import { blockScore, oppName, roleLabel } from '../logic/opponent'
import { predictability, quoteFor } from '../logic/stats'
import type { Target, Zone } from '../types'

/**
 * Start-Regeln des Entscheidungs-Assistenten.
 * Jede Regel: Bedingung, Gewichtung (defaultWeight), Erklärung, Quelle.
 * apply() gibt pro Option einen Faktor zurück; Punkte = Faktor × Gewichtung.
 * Gewichtung und Ein/Aus sind in der App unter «Regeln» einstellbar.
 */

const SIDES: Target[] = ['aussen', 'dia']
const FAST_MIDDLE = ['mitte-quick', 'mitte-shoot', 'mitte-kopf']

export const builtinRules: RuleDef[] = [
  {
    id: 'davids-regel',
    nr: 1,
    name: 'Davids Regel: Gegner-Mitte am Service',
    condition: 'Der Gegner serviert und der Aufschläger ist eine Mitte.',
    explanation: 'Aussen Inside (Zeichen 4), damit der Aussen diagonal auf die Mitte angreifen kann, die hinten schwach verteidigt. Bei Annahme – stattdessen hoher Ball Aussen diagonal.',
    source: 'Davids Erfahrung',
    defaultWeight: 4,
    apply(ctx, opt) {
      const o = ctx.opp
      if (!o?.serving || o.server?.role !== 'M') return null
      const zone = (Object.keys(o.defenders).map(Number) as Zone[]).find((z) => o.defenders[z]?.id === o.server!.id) ?? 5
      // Out-of-System ist Inside nicht realistisch → hoher Ball Aussen diagonal
      if (ctx.sit.pass === '-') {
        return opt.setType === 'aussen-hoch' ? { factor: 0.4, chip: `Mitte ${oppName(o.server)} hinten: hoch Aussen diagonal` } : null
      }
      if (opt.setType !== 'aussen-inside') return null
      return { factor: 1, chip: `Aufschläger = Mitte ${oppName(o.server)}, verteidigt Zone ${zone}` }
    },
  },
  {
    id: 'schwaechster-verteidiger',
    nr: 2,
    name: 'In die Zone des schwächsten Verteidigers',
    condition: 'Ein Verteidiger hinten ist klar schwächer als die anderen.',
    explanation: 'Angriff, der diese Zone natürlich trifft: Zone 5 = Aussen diagonal / Dia Linie, Zone 1 = Aussen Linie / Dia diagonal, Zone 6 = Pipe / Mitte.',
    source: 'Lebedew «Setting Tactics»; Einschätzung',
    defaultWeight: 2,
    apply(ctx, opt) {
      const d = ctx.opp?.defenders
      if (!d) return null
      const list = ([1, 5, 6] as Zone[]).filter((z) => d[z]).map((z) => ({ z, p: d[z]! }))
      if (list.length < 2) return null
      const min = Math.min(...list.map((x) => x.p.defense))
      const max = Math.max(...list.map((x) => x.p.defense))
      if (max - min < 1) return null
      const weakest = list.filter((x) => x.p.defense === min)
      if (weakest.length > 1) return null
      const { z, p } = weakest[0]
      const zones = ctx.setType(opt.setType).zones
      const factor = zones[0] === z ? 1 : zones.includes(z) ? 0.5 : 0
      if (!factor) return null
      return { factor, chip: `Zone ${z}: ${oppName(p)} verteidigt schwach (${p.defense}/5)` }
    },
  },
  {
    id: 'gegner-zuspieler-vorne',
    nr: 3,
    name: 'Gegner-Zuspieler vorne',
    condition: 'Der gegnerische Zuspieler steht vorne (nur 2 grosse Blocker).',
    explanation: 'Aussen gegen den kleinen Zuspieler, eher Inside, damit die Linie aufgeht.',
    source: 'Art of Coaching Volleyball (via David); Einschätzung',
    defaultWeight: 1.5,
    apply(ctx, opt) {
      if (!ctx.opp?.setterFront) return null
      const st = ctx.setType(opt.setType)
      if (st.target !== 'aussen' || opt.setType === 'aussen-hoch') return null
      return { factor: opt.setType === 'aussen-inside' ? 1.3 : 0.8, chip: `Gegner-Zuspieler vorne: kleiner Block gegen Aussen` }
    },
  },
  {
    id: 'schwaechster-blocker',
    nr: 4,
    name: 'Gegen den schwächsten Blocker',
    condition: 'Ein Blocker vorne ist klar schwächer (Blockstärke und Grösse).',
    explanation: 'Den Angreifer wählen, der gegen ihn spielt: deren Pos. 2 blockt unseren Aussen, deren Mitte unsere Mitte, deren Aussen unsere Dia.',
    source: 'Lebedew «Setting Tactics»',
    defaultWeight: 2,
    apply(ctx, opt) {
      const b = ctx.opp?.blockers
      if (!b?.aussen || !b.mitte || !b.dia) return null
      const entries: { t: Target; s: number }[] = [
        { t: 'aussen', s: blockScore(b.aussen) },
        { t: 'mitte', s: blockScore(b.mitte) },
        { t: 'dia', s: blockScore(b.dia) },
      ]
      const list = entries.sort((x, y) => x.s - y.s)
      if (list[1].s - list[0].s < 0.5) return null
      const weakT = list[0].t
      const st = ctx.setType(opt.setType)
      const t = st.target === 'pipe' ? 'mitte' : st.target
      if (t !== weakT || st.tempo === 3) return null
      const who = b[weakT]!
      return { factor: 1, chip: `Schwächster Blocker: ${oppName(who)} (${roleLabel[who.role]})` }
    },
  },
  {
    id: 'gute-annahme',
    nr: 5,
    name: 'Annahme # / +: Mitte etablieren',
    condition: 'Annahme perfekt oder gut.',
    explanation: 'Alle Optionen offen. Mitte früh als Bedrohung etablieren, damit der Mittelblocker gebunden ist. Pipe nur, wenn der Quick glaubwürdig ist. Kein hoher Ball nötig.',
    source: 'Marco Meoni (VolleyBrains #112); Smarter Volley',
    defaultWeight: 1.5,
    apply(ctx, opt) {
      const st = ctx.setType(opt.setType)
      if (opt.setType === 'pipe') {
        const quickAlive = ctx.goodPass && !!ctx.middle
        return quickAlive
          ? { factor: 0.4, chip: 'Quick lebt → Pipe möglich' }
          : { factor: -1.3, chip: 'Pipe ohne lebendigen Quick' }
      }
      if (!ctx.goodPass) return null
      if (st.target === 'mitte') return { factor: 1, chip: 'Gute Annahme: Mitte etablieren' }
      if (st.tempo === 3) return { factor: -1, chip: 'Gute Annahme: kein hoher Ball nötig' }
      return null
    },
  },
  {
    id: 'mittlere-annahme',
    nr: 6,
    name: 'Annahme !: hinter dem Zuspieler',
    condition: 'Annahme mittel (Semi-System).',
    explanation: 'Angriffe hinter dem Zuspieler (Dia) und Aussen bevorzugen. Mitte nur, wenn ich nahe am Netz bin.',
    source: 'Smarter Volley «Sideout by Pass Quality Pt2»',
    defaultWeight: 2,
    apply(ctx, opt) {
      if (ctx.sit.pass !== '!') return null
      const st = ctx.setType(opt.setType)
      if (st.target === 'mitte') {
        return ctx.sit.setterNearNet
          ? { factor: -0.3, chip: 'Annahme !: Mitte nur, weil nahe am Netz' }
          : { factor: -1.5, chip: 'Annahme !: Mitte weg vom Netz ist schwach' }
      }
      if (opt.setType === 'dump') return { factor: -1, chip: 'Annahme !: kein zweiter Ball' }
      if (st.target === 'dia' && st.tempo === 2) return { factor: 1, chip: 'Annahme !: hinter dem Zuspieler stark' }
      if (st.target === 'aussen' && st.tempo === 2) return { factor: 0.5, chip: 'Annahme !: Aussen sicher' }
      return null
    },
  },
  {
    id: 'schlechte-annahme',
    nr: 7,
    name: 'Annahme –: Out-of-System',
    condition: 'Annahme schlecht.',
    explanation: 'Hoher Ball an den zuverlässigsten Angreifer, Fehler vermeiden, kein Quick, keine Pipe.',
    source: 'coachingvb «Setter in Volleyball»; Smarter Volley «Break Points Pt3»',
    defaultWeight: 2.5,
    apply(ctx, opt) {
      if (ctx.sit.pass !== '-') return null
      const st = ctx.setType(opt.setType)
      if (st.tempo === 1 || opt.setType === 'pipe') return { factor: 0, chip: 'Out-of-System: kein Tempo, keine Pipe', exclude: true }
      if (st.tempo === 3) {
        const rel = ctx.player(opt.playerId)?.reliability ?? 3
        return { factor: 1 + (rel - 3) * 0.3, chip: `Out-of-System: hoher Ball (Zuverlässigkeit ${rel}/5)` }
      }
      return { factor: -0.6, chip: 'Out-of-System: kein Tempo erzwingen' }
    },
  },
  {
    id: 'mittelblocker-stil',
    nr: 8,
    name: 'Mittelblocker commit / read',
    condition: 'Der gegnerische Mittelblocker vorne ist als «commit» oder «read» gescoutet.',
    explanation: 'Commit (springt mit dem Quick) → Bälle an die Seiten. Read → Quick/Shoot, bevor er ankommt.',
    source: 'coachingvb Blocking; volleyballxl',
    defaultWeight: 1.5,
    apply(ctx, opt) {
      const mb = ctx.opp?.blockers.mitte
      if (!mb?.mbStyle) return null
      const st = ctx.setType(opt.setType)
      if (mb.mbStyle === 'commit') {
        if (st.target === 'mitte') return { factor: -1, chip: `MB ${oppName(mb)} springt mit (commit)` }
        if (SIDES.includes(st.target) && st.tempo < 3) return { factor: 0.5, chip: `MB commit: Seiten sind offen` }
        return null
      }
      if (opt.setType === 'mitte-quick' || opt.setType === 'mitte-shoot') {
        const slow = mb.block <= 3
        return { factor: slow ? 1 : 0.5, chip: `MB ${oppName(mb)} liest: Quick ist schneller` }
      }
      return null
    },
  },
  {
    id: 'transition-mitte-vom-block',
    nr: 9,
    name: 'Transition: Mitte kommt vom Block',
    condition: 'Transition und die eigene Mitte landet gerade vom Block.',
    explanation: 'Kein Quick – Pipe oder Aussen. Tief bzw. nicht springen, damit die Mitte rechtzeitig kommt.',
    source: 'Marco Meoni (VolleyBrains #112)',
    defaultWeight: 2,
    apply(ctx, opt) {
      if (ctx.sit.phase !== 'transition' || !ctx.sit.middleFromBlock) return null
      if (FAST_MIDDLE.includes(opt.setType)) return { factor: -1, chip: 'Mitte kommt vom Block: kein Quick' }
      if (opt.setType === 'pipe' || ctx.setType(opt.setType).target === 'aussen') return { factor: 0.4, chip: 'Transition: Pipe/Aussen' }
      return null
    },
    hint(ctx) {
      if (ctx.sit.phase !== 'transition' || !ctx.sit.middleFromBlock) return null
      return 'Transition: tief bzw. nicht springen, damit die Mitte rechtzeitig kommt (Meoni).'
    },
  },
  {
    id: 'aussen-hat-angenommen',
    nr: 10,
    name: 'Aussen hat gerade angenommen',
    condition: 'Der Aussen, der angreifen soll, hat gerade angenommen.',
    explanation: 'Er kommt später: eher Medium statt Schuss, oder einen anderen Angreifer.',
    source: 'Einschätzung',
    defaultWeight: 1.5,
    apply(ctx, opt) {
      if (!ctx.sit.receiverId || opt.playerId !== ctx.sit.receiverId) return null
      const name = ctx.player(opt.playerId)?.name ?? ''
      if (opt.setType === 'aussen-schuss') return { factor: -1.2, chip: `${name} hat angenommen: kein Schuss` }
      if (opt.setType === 'aussen-medium' || opt.setType === 'aussen-hoch') return null
      return { factor: -0.4, chip: `${name} hat angenommen: kommt später` }
    },
  },
  {
    id: 'satzende',
    nr: 11,
    name: 'Satzende 20+ / Satzball',
    condition: 'Spielstand 20+ oder Satzball.',
    explanation: 'Option mit der höchsten Erfolgsquote, kein Risiko-Zuspiel.',
    source: 'coachingvb (Risiko der Situation anpassen); Einschätzung',
    defaultWeight: 2,
    apply(ctx, opt) {
      if (ctx.sit.score === 'normal') return null
      const st = ctx.setType(opt.setType)
      if (st.risky) return { factor: -1, chip: 'Satzende: kein Risiko-Zuspiel' }
      const q = quoteFor(ctx.rallies, opt.playerId, opt.setType)
      if (q.n >= 5 && q.rate >= 0.5) return { factor: 1, chip: `Satzende: höchste Quote (${q.points}/${q.n})` }
      const rel = ctx.player(opt.playerId)?.reliability ?? 3
      if (rel >= 4) return { factor: 0.5, chip: 'Satzende: zuverlässigster Angreifer' }
      return null
    },
  },
  {
    id: 'zweiter-ball',
    nr: 12,
    name: 'Zweiter Ball / Dump',
    condition: 'Zuspieler vorne, gute Annahme, Block hängt an der Dia.',
    explanation: 'Option «Zweiter Ball»: Der Block erwartet den Angriff, die Abwehr steht tief.',
    source: 'Einschätzung',
    defaultWeight: 3,
    apply(ctx, opt) {
      if (opt.setType !== 'dump') return null
      if (!ctx.setterFront || !ctx.goodPass) return { factor: 0, chip: 'Zweiter Ball nur vorne und mit guter Annahme', exclude: true }
      if (!ctx.sit.blockOnDia) return null
      return { factor: 1, chip: 'Block hängt an der Dia: zweiter Ball' }
    },
  },
  {
    id: 'vorhersehbarkeit',
    nr: 13,
    name: 'Vorhersehbarkeit',
    condition: 'In dieser Rotation ging ein Zuspiel öfter als die Schwelle (Standard 50 %) an denselben Spieler (ab 6 erfassten Bällen).',
    explanation: 'Abzug für das zu oft gespielte Zuspiel, Warnung anzeigen. Für das eigene Team konstant, für den Gegner unberechenbar.',
    source: 'coachingvb; Meoni',
    defaultWeight: 1.5,
    apply(ctx, opt) {
      const pr = predictability(ctx.rallies, ctx.sit.rotation, ctx.state.predictabilityThreshold)
      if (!pr || pr.playerId !== opt.playerId || pr.setType !== opt.setType) return null
      return { factor: -1, chip: `Vorhersehbar: ${Math.round(pr.share * 100)} % in R${ctx.sit.rotation}` }
    },
  },
  {
    id: 'isolation-k1',
    nr: 14,
    name: 'Quick vor dem Zuspieler bindet den MB',
    condition: 'Gute Annahme und die Mitte läuft vorne den Quick (K1).',
    explanation: 'Der Quick vor dem Zuspieler hält den Mittelblocker zentral – Pos. 4 bekommt eher einen gebrochenen Block. (Quick Richtung Pos. 4 würde Pos. 2 öffnen.)',
    source: 'Mark Lebedew, Setter Call Analysis Olympia 2021',
    defaultWeight: 1,
    apply(ctx, opt) {
      if (!ctx.goodPass || !ctx.middle) return null
      if (ctx.sit.phase === 'transition' && ctx.sit.middleFromBlock) return null
      const st = ctx.setType(opt.setType)
      if (st.target !== 'aussen' || st.tempo === 3) return null
      return { factor: 0.5, chip: 'Quick bindet den MB → Pos. 4' }
    },
  },
  {
    id: 'form',
    nr: 15,
    name: 'Heiss / kalt / Form heute',
    condition: 'Spieler ist heiss oder kalt markiert, oder Form heute gut/schlecht.',
    explanation: 'Heisse Hand nutzen, kalten Spieler entlasten. Schlechte Form wiegt mehr als ein gutes Matchup.',
    source: 'Einschätzung; coachingvb (Verteilung nach Verfügbarkeit)',
    defaultWeight: 1.5,
    apply(ctx, opt) {
      const p = ctx.player(opt.playerId)
      if (!p) return null
      if (ctx.sit.hot.includes(p.id)) return { factor: 1, chip: `${p.name} ist heiss` }
      if (ctx.sit.cold.includes(p.id)) return { factor: -1, chip: `${p.name} ist kalt` }
      if (p.form === 'gut') return { factor: 0.4, chip: `${p.name}: Form gut` }
      if (p.form === 'schlecht') return { factor: -1, chip: `${p.name}: Form schlecht` }
      return null
    },
  },
  {
    id: 'tempo-verbindung',
    nr: 16,
    name: 'Tempo nur mit Verbindung',
    condition: 'Spieler ist kalt oder in schlechter Form.',
    explanation: 'Tempo nur so schnell, wie der Angreifer es konstant verbinden kann – eine Stufe langsamer.',
    source: 'coachingvb; Lebedew «When Attack Efficiency Lies»',
    defaultWeight: 1,
    apply(ctx, opt) {
      const p = ctx.player(opt.playerId)
      if (!p || !(ctx.sit.cold.includes(p.id) || p.form === 'schlecht')) return null
      return ctx.setType(opt.setType).tempo === 1 ? { factor: -0.8, chip: 'Verbindung unsicher: Tempo raus' } : null
    },
  },
  {
    id: 'tracker-quote',
    nr: 17,
    name: 'Erfolgsquote aus dem Match-Tracker',
    condition: 'Mindestens 4 erfasste Bälle für diesen Spieler mit diesem Zuspiel.',
    explanation: 'Gute Effizienz gibt Pluspunkte, schlechte Abzug. Echte Daten statt Annahmen.',
    source: 'Smarter Volley (eigene Daten tracken)',
    defaultWeight: 1.5,
    apply(ctx, opt) {
      const q = quoteFor(ctx.rallies, opt.playerId, opt.setType)
      if (q.n < 4) return null
      const factor = Math.max(-1, Math.min(1, (q.eff - 0.25) * 2.5))
      if (Math.abs(factor) < 0.15) return null
      return { factor, chip: `Quote ${q.points}/${q.n} Punkte, Eff. ${Math.round(q.eff * 100)} %` }
    },
  },
]
