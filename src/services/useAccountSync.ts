import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState } from '../domain/models'
import { migrateAppState } from '../data/appStateRepository'
import {
  authenticate,
  AuthenticationExpiredError,
  enqueueSync,
  flushSyncQueue,
  loadAccountSession,
  logoutAccount,
  pushState,
  saveAccountSession,
} from './sync'
import type { AccountSession } from './sync'

export type AccountSyncController = {
  session: AccountSession | null
  status: 'local' | 'syncing' | 'synced' | 'offline' | 'error'
  lastSyncedAt: string | null
  signIn: (
    mode: 'register' | 'login',
    input: { email: string; password: string; displayName: string },
  ) => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

export function useAccountSync(
  state: AppState,
  replaceState: (state: AppState) => void,
): AccountSyncController {
  const [session, setSession] = useState<AccountSession | null>(loadAccountSession)
  const [status, setStatus] = useState<AccountSyncController['status']>(
    session ? (navigator.onLine ? 'synced' : 'offline') : 'local',
  )
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const stateRef = useRef(state)
  const sessionRef = useRef(session)
  useEffect(() => {
    stateRef.current = state
  }, [state])
  useEffect(() => {
    sessionRef.current = session
  }, [session])
  const userId = session?.user.id

  const applySnapshot = useCallback(
    (current: AccountSession, snapshot: Awaited<ReturnType<typeof pushState>>) => {
      const next = { ...current, revision: snapshot.revision }
      saveAccountSession(next)
      setSession(next)
      if (JSON.stringify(snapshot.state) !== JSON.stringify(stateRef.current))
        replaceState(migrateAppState(snapshot.state))
      setLastSyncedAt(new Date().toISOString())
      setStatus('synced')
    },
    [replaceState],
  )

  const syncNow = useCallback(async () => {
    const current = sessionRef.current
    if (!current) return
    if (!navigator.onLine) {
      enqueueSync(stateRef.current, current.revision)
      setStatus('offline')
      return
    }
    setStatus('syncing')
    try {
      const queued = await flushSyncQueue(current)
      const active = queued.session
      const snapshot = queued.snapshot || (await pushState(active, stateRef.current))
      applySnapshot(active, snapshot)
    } catch (error) {
      if (error instanceof AuthenticationExpiredError) {
        saveAccountSession(null)
        sessionRef.current = null
        setSession(null)
        setStatus('local')
        return
      }
      enqueueSync(stateRef.current, current.revision)
      setStatus('error')
    }
  }, [applySnapshot])

  useEffect(() => {
    if (!userId) return
    const timer = window.setTimeout(() => void syncNow(), 1200)
    return () => window.clearTimeout(timer)
  }, [state, userId, syncNow])
  useEffect(() => {
    const online = () => void syncNow()
    const offline = () => sessionRef.current && setStatus('offline')
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [syncNow])

  return {
    session,
    status,
    lastSyncedAt,
    async signIn(mode, input) {
      setStatus('syncing')
      let next: AccountSession
      try {
        next = await authenticate(mode, input)
      } catch (error) {
        setStatus('error')
        throw error
      }
      sessionRef.current = next
      const stateToImport =
        mode === 'register'
          ? { ...stateRef.current, displayName: input.displayName.trim() || next.user.displayName }
          : stateRef.current
      stateRef.current = stateToImport
      if (stateToImport !== state) replaceState(stateToImport)
      try {
        const snapshot = await pushState(next, stateToImport, true)
        applySnapshot(next, snapshot)
      } catch {
        setSession(next)
        enqueueSync(stateToImport, next.revision)
        setStatus(navigator.onLine ? 'error' : 'offline')
      }
    },
    async signOut() {
      if (sessionRef.current) await logoutAccount(sessionRef.current)
      setSession(null)
      setStatus('local')
      setLastSyncedAt(null)
    },
    syncNow,
  }
}
