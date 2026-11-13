/**
 * Spielfeld als SVG. Gegner oben (Netz in der Mitte), wir unten.
 * Unsere Positionen aus unserer Sicht: vorne 4 – 3 – 2, hinten 5 – 6 – 1.
 * Gegner gespiegelt: vorne 2 – 3 – 4, hinten 1 – 6 – 5 (aus unserer Sicht).
 * → Aussen (unsere 4) Linie = deren Zone 1, diagonal = deren Zone 5.
 */

export interface CourtMarker {
  pos: number
  label: string
  name: string
  tone?: 'normal' | 'muted' | 'accent' | 'libero' | 'setter'
  badge?: string
}

export interface CourtArrow {
  from: number
  /** gegnerische Zone 1–6 */
  toZone: number
  tone?: 'primary' | 'secondary'
}

const X = [55, 150, 245]
const OUR: Record<number, [number, number]> = { 4: [X[0], 262], 3: [X[1], 262], 2: [X[2], 262], 5: [X[0], 362], 6: [X[1], 362], 1: [X[2], 362] }
const OPP: Record<number, [number, number]> = { 2: [X[0], 148], 3: [X[1], 148], 4: [X[2], 148], 1: [X[0], 48], 6: [X[1], 48], 5: [X[2], 48] }

const toneFill: Record<string, string> = {
  normal: '#111111',
  muted: '#9a9a9a',
  accent: '#1f5eff',
  libero: '#a86200',
  setter: '#12805c',
}

const badgeX = (x: number, badge: string) => (x > 200 ? x - 12 - badge.length * 6.5 : x + 10)

/** Punkt auf der Strecke a→b, um d vor b */
function shorten(a: [number, number], b: [number, number], d: number): [number, number] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  return [b[0] - (dx / len) * d, b[1] - (dy / len) * d]
}

function Marker({ m, at, opp }: { m: CourtMarker; at: [number, number]; opp?: boolean }) {
  const fill = toneFill[m.tone ?? 'normal']
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r={17} fill={opp ? '#fff' : fill} stroke={fill} strokeWidth={2.5} />
      <text x={at[0]} y={at[1] + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill={opp ? fill : '#fff'}>
        {m.label}
      </text>
      <text x={at[0]} y={at[1] + 34} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="#111">
        {m.name}
      </text>
      {m.badge && (
        <g>
          <rect x={badgeX(at[0], m.badge)} y={at[1] - 30} width={m.badge.length * 6.5 + 10} height={17} rx={8.5} fill="#111" />
          <text x={badgeX(at[0], m.badge) + 5} y={at[1] - 18} fontSize={11} fontWeight={600} fill="#fff">
            {m.badge}
          </text>
        </g>
      )}
    </g>
  )
}

export function Court({
  ours,
  opp,
  arrows = [],
  highlightZone,
  showOpp = true,
}: {
  ours: CourtMarker[]
  opp?: CourtMarker[]
  arrows?: CourtArrow[]
  highlightZone?: number
  showOpp?: boolean
}) {
  const top = showOpp ? 0 : 200
  const zoneRect = (z: number) => {
    const [cx, cy] = OPP[z]
    return <rect x={cx - 48} y={cy - 48} width={96} height={98} fill="#1f5eff" opacity={0.09} />
  }
  return (
    <svg viewBox={`0 ${top} 300 ${410 - top}`} className="w-full select-none" role="img" aria-label="Spielfeld">
      <defs>
        <marker id="arrow-primary" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#1f5eff" />
        </marker>
        <marker id="arrow-secondary" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#9a9a9a" />
        </marker>
      </defs>
      {showOpp && (
        <>
          <rect x={6} y={2} width={288} height={198} fill="#f5f5f3" stroke="#111" strokeWidth={1.5} />
          <line x1={6} y1={134} x2={294} y2={134} stroke="#bbb" strokeDasharray="4 4" />
          {highlightZone && zoneRect(highlightZone)}
          <text x={290} y={196} textAnchor="end" fontSize={10} fill="#5b5b5b">
            Gegner
          </text>
        </>
      )}
      <rect x={6} y={208} width={288} height={198} fill="#fff" stroke="#111" strokeWidth={1.5} />
      <line x1={6} y1={274} x2={294} y2={274} stroke="#bbb" strokeDasharray="4 4" />
      <line x1={0} y1={204} x2={300} y2={204} stroke="#111" strokeWidth={4} />
      <text x={10} y={402} fontSize={10} fill="#5b5b5b">
        Wir
      </text>
      {showOpp && opp?.map((m) => <Marker key={'o' + m.pos} m={m} at={OPP[m.pos]} opp />)}
      {ours.map((m) => (
        <Marker key={'u' + m.pos + m.name} m={m} at={OUR[m.pos]} />
      ))}
      {showOpp &&
        arrows.map((a, i) => {
          const from = OUR[a.from] ?? OUR[2]
          const to = OPP[a.toZone]
          const ctrl: [number, number] = [(from[0] + to[0]) / 2 + (to[0] > from[0] ? -18 : 18), (from[1] + to[1]) / 2]
          const [x1, y1] = shorten(ctrl, from, 22)
          const [x2, y2] = shorten(ctrl, to, 24)
          const [mx, my] = ctrl
          const tone = a.tone ?? 'primary'
          return (
            <path
              key={i}
              d={`M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
              fill="none"
              stroke={tone === 'primary' ? '#1f5eff' : '#9a9a9a'}
              strokeWidth={tone === 'primary' ? 4 : 2.5}
              strokeDasharray={tone === 'primary' ? undefined : '6 5'}
              markerEnd={`url(#arrow-${tone})`}
            />
          )
        })}
    </svg>
  )
}
