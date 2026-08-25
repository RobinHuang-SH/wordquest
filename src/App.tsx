import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { AppState, Knowledge, Page, Word } from './domain/models'
import {
  alignStudyDate,
  completeDailySession,
  getDateKey,
  getPreviousSession,
  startNextBatch,
} from './domain/sessions'
import { loadAppState, saveAppState } from './data/appStateRepository'
import { Sidebar, MobileHeader, MobileMenu } from './components/AppShell'
import { AccessibilityHelp } from './components/AccessibilityHelp'
import { AuthGate } from './components/AuthGate'
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
import { useAccountSync } from './services/useAccountSync'
import { loadDailyPlan, submitWordReview } from './services/vocabulary'
import { loadDailyStory } from './services/story'
import { getLearnedNewWordCount, getNewWords } from './domain/learning'
import './styles.css'

function App() {
  const [state, setState] = useState<AppState>(loadAppState)
  const [page, setPage] = useState<Page>('home')
  const [onboarding, setOnboarding] = useState(1)
  const [toast, setToast] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [storyLoading, setStoryLoading] = useState(false)
  const [storyError, setStoryError] = useState('')
  const [storyRetry, setStoryRetry] = useState(0)
  const mainRef = useRef<HTMLElement>(null)
  const pageFocusReady = useRef(false)
  const pwa = usePwaLifecycle()
  const replaceState = useCallback((next: AppState) => setState(next), [])
  const accountSync = useAccountSync(state, replaceState)
  const refreshStudyDate = useCallback(() => {
    setState((current) => alignStudyDate(current, getDateKey()))
  }, [])

  useEffect(() => saveAppState(state), [state])
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshStudyDate()
    }
    window.addEventListener('focus', refreshStudyDate)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    const timer = window.setInterval(refreshStudyDate, 60_000)
    return () => {
      window.removeEventListener('focus', refreshStudyDate)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.clearInterval(timer)
    }
  }, [refreshStudyDate])
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let cancelled = false
    let removeListener: (() => Promise<void>) | undefined
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) refreshStudyDate()
    }).then((listener) => {
      if (cancelled) void listener.remove()
      else removeListener = () => listener.remove()
    })
    return () => {
      cancelled = true
      void removeListener?.()
    }
  }, [refreshStudyDate])
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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    let removeListener: (() => Promise<void>) | undefined
    void CapacitorApp.addListener('backButton', () => {
      if (shortcutHelpOpen) {
        setShortcutHelpOpen(false)
      } else if (menuOpen) {
        setMenuOpen(false)
      } else if (page !== 'home') {
        setPage('home')
      } else {
        void CapacitorApp.exitApp()
      }
    }).then((listener) => {
      if (cancelled) {
        void listener.remove()
      } else {
        removeListener = () => listener.remove()
      }
    })

    return () => {
      cancelled = true
      void removeListener?.()
    }
  }, [menuOpen, page, shortcutHelpOpen])

  const patch = (next: Partial<AppState>) => setState((current) => ({ ...current, ...next }))
  const notify = useCallback((text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(''), 2400)
  }, [])
  useEffect(() => {
    const session = accountSync.session
    if (!session) {
      queueMicrotask(() =>
        setState((current) =>
          current.dailyWordPlan || current.dailyStory
            ? { ...current, dailyWordPlan: null, dailyStory: null }
            : current,
        ),
      )
      return
    }
    if (!state.onboarded) return
    if (
      state.dailyWordPlan?.date === state.activeDate &&
      state.dailyWordPlan.batch === state.activeBatch &&
      state.dailyWordPlan.mix === state.wordMix
    )
      return
    let cancelled = false
    void loadDailyPlan(session, state.activeDate, state.wordMix, state.activeBatch)
      .then((dailyWordPlan) => {
        if (!cancelled)
          setState((current) => ({
            ...current,
            dailyWordPlan,
            dailyStory:
              current.dailyStory?.sessionId === dailyWordPlan.sessionId ? current.dailyStory : null,
            currentWord: 0,
          }))
      })
      .catch(() => {
        if (!cancelled) {
          notify('暂时无法加载这组词汇，请检查网络后重试')
        }
      })
    return () => {
      cancelled = true
    }
  }, [
    accountSync.session,
    notify,
    state.activeBatch,
    state.activeDate,
    state.dailyWordPlan,
    state.onboarded,
    state.wordMix,
  ])
  useEffect(() => {
    const session = accountSync.session
    const plan = state.dailyWordPlan
    const newWords = getNewWords(state)
    const newWordsComplete =
      newWords.length === 20 && newWords.every((word) => Boolean(state.learned[word.word]))
    if (
      !session ||
      !plan ||
      plan.date !== state.activeDate ||
      plan.batch !== state.activeBatch ||
      !state.onboarded ||
      state.completed ||
      !newWordsComplete
    )
      return
    const storyMatchesPlan =
      state.dailyStory?.sessionId === plan.sessionId &&
      newWords.every((word) =>
        state.dailyStory?.vocabularyCoverage.some(
          (covered) => covered.toLowerCase() === word.word.toLowerCase(),
        ),
      )
    if (storyMatchesPlan) {
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setStoryLoading(true)
        setStoryError('')
      }
    })
    void loadDailyStory(session, {
      sessionId: plan.sessionId,
      length: state.storyLength,
      previousChoice: getPreviousSession(state)?.storyChoice,
    })
      .then((dailyStory) => {
        if (!cancelled) {
          setState((current) => ({ ...current, dailyStory }))
          setStoryLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStoryLoading(false)
          setStoryError('故事生成暂时失败，请检查网络后重试')
          notify('故事生成暂时失败，请稍后重试')
        }
      })
    return () => {
      cancelled = true
    }
  }, [accountSync.session, notify, state, storyRetry])
  const reviewWord = useCallback(
    (word: Word, knowledge: Knowledge) => {
      const session = accountSync.session
      if (!session || !word.id) return
      void submitWordReview(session, word, knowledge, state.dailyWordPlan?.sessionId).catch(() =>
        notify('Progress was saved locally; you can keep learning'),
      )
    },
    [accountSync.session, notify, state.dailyWordPlan?.sessionId],
  )
  const completeToday = (storyChoice: string) =>
    setState((current) => completeDailySession(current, storyChoice))
  const beginNextBatch = () => {
    setState((current) => startNextBatch(current))
    setPage('home')
    notify('正在准备下一组 20 个新词')
  }
  const previousSession = getPreviousSession(state)
  const learnedNewWordCount = getLearnedNewWordCount(state)

  if (!accountSync.session)
    return (
      <>
        <AuthGate
          account={accountSync}
          displayName={state.displayName}
          onDisplayNameChange={(displayName) => patch({ displayName })}
          notify={notify}
        />
        {toast && (
          <div className="toast" role="status" aria-live="polite">
            <CheckCircle2 size={18} />
            {toast}
          </div>
        )}
      </>
    )

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
            learnedCount={learnedNewWordCount}
            previousSession={previousSession}
            setPage={setPage}
            notify={notify}
            onStartNextBatch={beginNextBatch}
          />
        )}
        {page === 'learn' && (
          <Learn
            state={state}
            patch={patch}
            setPage={setPage}
            notify={notify}
            onReviewWord={reviewWord}
          />
        )}
        {page === 'quiz' && <Quiz state={state} patch={patch} setPage={setPage} />}
        {page === 'story' && (
          <Story
            state={state}
            completeToday={completeToday}
            previousSession={previousSession}
            setPage={setPage}
            notify={notify}
            storyLoading={storyLoading}
            storyError={storyError}
            retryStory={() => setStoryRetry((value) => value + 1)}
            onStartNextBatch={beginNextBatch}
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
            accountSync={accountSync}
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
