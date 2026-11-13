import { update, useStore } from '../store'
import { targetLabel } from '../data/signals'
import { PageTitle, TextInput, Button } from '../components/ui'
import { defaultSetTypes } from '../data/signals'

export default function Signals() {
  const state = useStore()
  return (
    <div>
      <PageTitle over="Team-System" title="Zuspiele & Zeichen">
        Name und Zeichen sind editierbar. Jede Empfehlung zeigt das Zeichen an.
      </PageTitle>
      <div className="divide-y divide-line rounded-xl border border-line">
        {state.setTypes.map((st, i) => (
          <div key={st.id} className="grid grid-cols-[72px_1fr_1fr] items-center gap-2 p-2">
            <div className="text-[13px] font-semibold">{targetLabel[st.target]}</div>
            <TextInput aria-label="Zuspiel" value={st.name} onChange={(e) => update((d) => void (d.setTypes[i].name = e.target.value))} />
            <TextInput aria-label="Zeichen" placeholder="kein Zeichen" value={st.signal} onChange={(e) => update((d) => void (d.setTypes[i].signal = e.target.value))} />
            <div className="col-span-3 px-1 text-[12px] text-muted">{st.info}</div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Button onClick={() => confirm('Zeichen auf Standard zurücksetzen?') && update((d) => void (d.setTypes = structuredClone(defaultSetTypes)))}>Auf Standard zurücksetzen</Button>
      </div>
    </div>
  )
}
