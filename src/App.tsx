import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { AppState, Page } from './domain/models'
import { completeDailySession, getPreviousSession } from './domain/sessions'
import { loadAppState, saveAppState } from './data/appStateRepository'
import { Sidebar, MobileHeader, MobileMenu } from './components/AppShell'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Learn } from './pages/Learn'
import { Quiz } from './pages/Quiz'
import { Story } from './pages/Story'
import { Vocabulary } from './pages/Vocabulary'
import { Report } from './pages/Report'
import { SettingsPage } from './pages/SettingsPage'
import { PwaStatus } from './components/PwaStatus'
import { usePwaLifecycle } from './services/pwa'
import './styles.css'

function App() {
  const [state, setState] = useState<AppState>(loadAppState)
  const [page, setPage] = useState<Page>('home')
  const [onboarding, setOnboarding] = useState(1)
  const [toast, setToast] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const pwa = usePwaLifecycle()

  useEffect(() => saveAppState(state), [state])

  const patch = (next: Partial<AppState>) => setState((current) => ({ ...current, ...next }))
  const notify = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(''), 2400)
  }
  const completeToday = (storyChoice: string) =>
    setState((current) => completeDailySession(current, storyChoice))
  const previousSession = getPreviousSession(state)

  if (!state.onboarded)
    return <Onboarding step={onboarding} setStep={setOnboarding} state={state} patch={patch} />

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} state={state} />
      <main className="main">
        <MobileHeader setPage={setPage} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        {menuOpen && (
          <MobileMenu
            page={page}
            setPage={(next) => {
              setPage(next)
              setMenuOpen(false)
            }}
          />
        )}
        {page === 'home' && (
          <Dashboard
            state={state}
            learnedCount={Object.keys(state.learned).length}
            previousSession={previousSession}
            setPage={setPage}
            notify={notify}
          />
        )}
        {page === 'learn' && (
          <Learn state={state} patch={patch} setPage={setPage} notify={notify} />
        )}
        {page === 'quiz' && <Quiz state={state} patch={patch} setPage={setPage} />}
        {page === 'story' && (
          <Story
            state={state}
            completeToday={completeToday}
            previousSession={previousSession}
            setPage={setPage}
            notify={notify}
          />
        )}
        {page === 'library' && <Vocabulary state={state} />}
        {page === 'report' && <Report state={state} notify={notify} />}
        {page === 'settings' && (
          <SettingsPage state={state} patch={patch} notify={notify} pwa={pwa} />
        )}
      </main>
      <PwaStatus pwa={pwa} />
      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
