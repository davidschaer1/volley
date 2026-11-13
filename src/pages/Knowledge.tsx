import type { ReactNode } from 'react'
import research from '../../docs/research.md?raw'
import { builtinRules } from '../data/rules'
import { Card, PageTitle, SectionTitle } from '../components/ui'

/** Kleiner Markdown-Renderer für die Wissensbasis (Überschriften, Listen, Tabellen, Links, fett). */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(<a key={i++} href={m[2]} target="_blank" rel="noreferrer" className="text-accent underline">{m[1]}</a>)
    else if (m[3]) out.push(<b key={i++}>{m[3]}</b>)
    else if (m[4]) out.push(<code key={i++} className="rounded bg-soft px-1">{m[4]}</code>)
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function Markdown({ src }: { src: string }) {
  const lines = src.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim() || l.startsWith('---')) {
      i++
      continue
    }
    if (l.startsWith('# ')) {
      i++
      continue // Seitentitel kommt aus PageTitle
    }
    if (l.startsWith('## ')) {
      blocks.push(<h2 key={k++} className="mb-2 mt-7 text-xl font-extrabold">{l.slice(3)}</h2>)
      i++
      continue
    }
    if (l.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|[\s-|]+\|$/.test(lines[i])) rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()))
        i++
      }
      blocks.push(
        <div key={k++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr>{rows[0].map((c, j) => <th key={j} className="border-b-2 border-ink p-2 text-left font-semibold">{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(1).map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j} className="border-b border-line p-2 align-top">{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^(- |\d+\. )/.test(l)) {
      const ordered = /^\d+\. /.test(l)
      const items: string[] = []
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) {
        items.push(lines[i].replace(/^(- |\d+\. )/, ''))
        i++
      }
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={k++} className={`my-2 space-y-1.5 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, j) => <li key={j}>{inline(it)}</li>)}
        </Tag>,
      )
      continue
    }
    blocks.push(<p key={k++} className="my-2">{inline(l)}</p>)
    i++
  }
  return <div className="leading-relaxed">{blocks}</div>
}

export default function Knowledge() {
  return (
    <div>
      <PageTitle over="Wissensbasis" title="Prinzipien & Quellen">
        Recherche-Ergebnisse mit Quellen. [Beleg] = belegt, [Einschätzung] = Ableitung.
      </PageTitle>
      <Card>
        <Markdown src={research} />
      </Card>
      <SectionTitle over="Regel-Engine" title="Wie die Regeln das umsetzen" />
      <div className="space-y-2">
        {builtinRules.map((r) => (
          <Card key={r.id}>
            <div className="font-semibold">
              {r.nr}. {r.name}
            </div>
            <div className="text-[14px]">{r.explanation}</div>
            <div className="text-[13px] text-muted">Quelle: {r.source}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
