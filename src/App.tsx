import { useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { AppState, Page } from './domain/models'
import { completeDailySession, getPreviousSession } from './domain/sessions'
import { loadAppState, saveAppState } from './data/appStateRepository'
import { Sidebar, MobileHeader, MobileMenu } from './components/AppShell'
import { AccessibilityHelp } from './components/AccessibilityHelp'
import { PwaStatus } from './components/PwaStatus'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Learn } from './pages/Learn'
import { Quiz } from './pages/Quiz'
import { Story } from './pages/Story'
import { Vocabulary } from './pages/Vocabulary'
import { Report } from './pages/Report'
import { SettingsPage } from './pages/SettingsPage'
import { usePwaLifecycle } from './services/pwa'
import './styles.css'

function App() {
  const [state, setState] = useState<AppState>(loadAppState)
  const [page, setPage] = useState<Page>('home')
  const [onboarding, setOnboarding] = useState(1)
  const [toast, setToast] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const pageFocusReady = useRef(false)
  const pwa = usePwaLifecycle()

  useEffect(() => saveAppState(state), [state])
  useEffect(() => {
    if (!pageFocusReady.current) {
      pageFocusReady.current = true
      return
    }
    if (state.onboarded) mainRef.current?.focus()
  }, [page, state.onboarded])
  useEffect(() => {
    const shortcutPages: Record<string, Page> = {
      '1': 'home',
      '2': 'learn',
      '3': 'story',
      '4': 'library',
      '5': 'report',
      '6': 'settings',
    }
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const editing = target?.matches('input, select, textarea, [contenteditable="true"]') ?? false
      if (editing) return
      if (event.key === '?') {
        event.preventDefault()
        setShortcutHelpOpen(true)
        return
      }
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setShortcutHelpOpen(false)
        return
      }
      const nextPage = event.altKey ? shortcutPages[event.key] : undefined
      if (!nextPage) return
      event.preventDefault()
      setPage(nextPage)
      setMenuOpen(false)
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

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
    <div
      className={`app-shell ${state.highContrast ? 'high-contrast' : ''} ${state.reducedMotion ? 'reduced-motion' : ''}`}
    >
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <Sidebar page={page} setPage={setPage} state={state} />
      <main ref={mainRef} id="main-content" className="main" tabIndex={-1} aria-label="主要内容">
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
          <SettingsPage
            state={state}
            patch={patch}
            notify={notify}
            pwa={pwa}
            onShowShortcuts={() => setShortcutHelpOpen(true)}
          />
        )}
      </main>
      <PwaStatus pwa={pwa} />
      {shortcutHelpOpen && <AccessibilityHelp onClose={() => setShortcutHelpOpen(false)} />}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
