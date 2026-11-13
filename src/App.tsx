import { useEffect, useState, type ReactNode } from 'react'
import Assistant from './pages/Assistant'
import Lineup from './pages/Lineup'
import Opponents from './pages/Opponents'
import Quiz from './pages/Quiz'
import More from './pages/More'
import Roster from './pages/Roster'
import Signals from './pages/Signals'
import Rules from './pages/Rules'
import Tracker from './pages/Tracker'
import Knowledge from './pages/Knowledge'

const tabs = [
  { to: '', label: 'Assistent', icon: '◎' },
  { to: 'aufstellung', label: 'Aufstellung', icon: '▦' },
  { to: 'gegner', label: 'Gegner', icon: '⚑' },
  { to: 'quiz', label: 'Training', icon: '?' },
  { to: 'mehr', label: 'Mehr', icon: '≡' },
]
const subPages = ['kader', 'zeichen', 'regeln', 'tracker', 'wissen']

const getRoute = () => location.hash.replace(/^#\/?/, '')

export default function App() {
  const [route, setRoute] = useState(getRoute)
  useEffect(() => {
    const on = () => {
      setRoute(getRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (to: string) => (location.hash = '/' + to)

  let page: ReactNode
  switch (route) {
    case 'aufstellung': page = <Lineup />; break
    case 'gegner': page = <Opponents />; break
    case 'quiz': page = <Quiz />; break
    case 'mehr': page = <More go={go} />; break
    case 'kader': page = <Roster />; break
    case 'zeichen': page = <Signals />; break
    case 'regeln': page = <Rules />; break
    case 'tracker': page = <Tracker />; break
    case 'wissen': page = <Knowledge />; break
    default: page = <Assistant />
  }
  const activeTab = subPages.includes(route) ? 'mehr' : route

  return (
    <div className="min-h-dvh bg-paper pb-[calc(76px+env(safe-area-inset-bottom))]">
      <main className="mx-auto max-w-5xl px-4 pt-[calc(16px+env(safe-area-inset-top))]">
        {subPages.includes(route) && (
          <button type="button" onClick={() => go('mehr')} className="mb-2 min-h-10 font-semibold">
            ‹ Mehr
          </button>
        )}
        {page}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-5">
          {tabs.map((t) => {
            const active = activeTab === t.to
            return (
              <button key={t.to} type="button" onClick={() => go(t.to)} className={`flex min-h-16 flex-col items-center justify-center gap-0.5 ${active ? 'text-ink' : 'text-muted'}`}>
                <span className="text-xl leading-none">{t.icon}</span>
                <span className={`text-[12px] ${active ? 'font-extrabold' : 'font-semibold'}`}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
