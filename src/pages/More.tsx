import { useRef } from 'react'
import { getState, initialState, normalize, setState, useStore } from '../store'
import { Button, Card, PageTitle, SectionTitle } from '../components/ui'

const links = [
  { to: 'kader', title: 'Kader', sub: 'Spieler, Zuspiele, Tempo, Notizen' },
  { to: 'zeichen', title: 'Zuspiele & Zeichen', sub: 'Unser Team-System' },
  { to: 'regeln', title: 'Regeln', sub: 'Ein/aus, Gewichtung, eigene Regeln' },
  { to: 'tracker', title: 'Match-Tracker', sub: 'Ballwechsel erfassen und auswerten' },
  { to: 'wissen', title: 'Wissensbasis', sub: 'Prinzipien, die Besten, Glossar, Quellen' },
]

export default function More({ go }: { go: (to: string) => void }) {
  const state = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `zuspieler-coach-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      if (data?.version !== 1 || !Array.isArray(data.players)) throw new Error('Keine Zuspieler-Coach-Datei')
      if (confirm('Alle aktuellen Daten durch die Datei ersetzen?')) setState(normalize(data))
    } catch (e) {
      alert(`Import fehlgeschlagen: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <PageTitle over="Mehr" title="Einstellungen & Werkzeuge" />
      <div className="space-y-2">
        {links.map((l) => (
          <button key={l.to} type="button" onClick={() => go(l.to)} className="flex min-h-16 w-full items-center justify-between rounded-xl border border-line px-4 text-left">
            <span>
              <span className="block font-extrabold">{l.title}</span>
              <span className="block text-[13px] text-muted">{l.sub}</span>
            </span>
            <span className="text-xl">›</span>
          </button>
        ))}
      </div>

      <SectionTitle over="Backup" title="Export / Import" />
      <Card className="space-y-2">
        <p className="text-[14px] text-muted">
          Alle Daten liegen nur auf diesem Gerät. Mit Export/Import sicherst du sie oder überträgst sie aufs Handy. ({state.players.length} Spieler, {state.opponents.length} Gegner, {state.rallies.length} Ballwechsel)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={exportJson}>
            Export (JSON)
          </Button>
          <Button onClick={() => fileRef.current?.click()}>Import</Button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        <Button variant="danger" className="w-full" onClick={() => confirm('Wirklich alles auf Standard zurücksetzen? Exportiere vorher ein Backup.') && setState(initialState())}>
          Alles zurücksetzen
        </Button>
      </Card>
    </div>
  )
}
