import type { ReactNode } from 'react'

/** Overline: kleine Zeile über Titeln – Laufweite unverändert, immer Schwarz. */
export function Overline({ children }: { children: ReactNode }) {
  return <div className="text-[13px] font-semibold text-black">{children}</div>
}

export function PageTitle({ over, title, children }: { over?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-4">
      {over && <Overline>{over}</Overline>}
      <h1 className="text-[28px] leading-tight font-extrabold">{title}</h1>
      {children && <p className="mt-1 text-muted">{children}</p>}
    </header>
  )
}

export function SectionTitle({ over, title, right }: { over?: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-end justify-between gap-2">
      <div>
        {over && <Overline>{over}</Overline>}
        <h2 className="text-lg font-extrabold leading-tight">{title}</h2>
      </div>
      {right}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-paper p-4 ${className}`}>{children}</div>
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[13px] font-semibold text-black">{children}</div>
}

/** Grosse Auswahl-Buttons (Segmente), touch-freundlich */
export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  cols,
  size = 'md',
}: {
  value: T | undefined
  options: { value: T; label: ReactNode; sub?: ReactNode }[]
  onChange: (v: T) => void
  cols?: number
  size?: 'md' | 'lg'
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-1 font-semibold ${size === 'lg' ? 'min-h-14 text-xl' : 'min-h-12 text-[15px]'} ${
              active ? 'border-ink bg-ink text-white' : 'border-line bg-soft text-ink active:bg-line'
            }`}
          >
            <div className="leading-tight">{o.label}</div>
            {o.sub && <div className={`text-[11px] font-normal leading-tight ${active ? 'text-white/75' : 'text-muted'}`}>{o.sub}</div>}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; sub?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${checked ? 'border-ink bg-ink text-white' : 'border-line bg-soft'}`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? 'border-white bg-white text-ink' : 'border-muted bg-paper'}`}>
        {checked ? '✓' : ''}
      </span>
      <span>
        <span className="block font-semibold leading-tight">{label}</span>
        {sub && <span className={`block text-[12px] leading-tight ${checked ? 'text-white/75' : 'text-muted'}`}>{sub}</span>}
      </span>
    </button>
  )
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' }) {
  const cls = {
    neutral: 'bg-soft text-ink border-line',
    good: 'bg-[#e8f5ef] text-good border-[#bfe3d2]',
    bad: 'bg-[#fbecea] text-bad border-[#f1c7c0]',
    warn: 'bg-[#fdf3e2] text-warn border-[#f0d9b0]',
  }[tone]
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[12px] leading-snug ${cls}`}>{children}</span>
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  className = '',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  className?: string
  type?: 'button' | 'submit'
}) {
  const cls = {
    primary: 'bg-ink text-white border-ink',
    secondary: 'bg-soft text-ink border-line',
    danger: 'bg-paper text-bad border-[#f1c7c0]',
    ghost: 'bg-transparent text-ink border-transparent underline',
  }[variant]
  return (
    <button type={type} onClick={onClick} className={`min-h-11 rounded-lg border px-4 font-semibold ${cls} ${className}`}>
      {children}
    </button>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`min-h-11 w-full rounded-lg border border-line bg-paper px-3 ${props.className ?? ''}`} />
}

export function Select({ value, onChange, children, className = '' }: { value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`min-h-11 w-full rounded-lg border border-line bg-paper px-2 ${className}`}>
      {children}
    </select>
  )
}

export function Slider({ value, min, max, step = 1, onChange, left, right, format }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; left?: string; right?: string; format?: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-8 flex-1 accent-ink" />
        <span className="w-16 text-right font-semibold tabular-nums">{format ? format(value) : value}</span>
      </div>
      {(left || right) && (
        <div className="flex justify-between pr-19 text-[11px] text-muted">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
    </div>
  )
}

export function Rating({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className={`h-10 w-10 rounded-lg border font-semibold ${n <= value ? 'border-ink bg-ink text-white' : 'border-line bg-soft'}`}>
          {n}
        </button>
      ))}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line p-5 text-center text-muted">{children}</div>
}
