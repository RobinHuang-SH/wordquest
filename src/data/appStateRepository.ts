import type { AppState } from '../domain/models'
import {
  createInitialState,
  createDailySession,
  getDateKey,
  resetForNewDay,
} from '../domain/sessions'

const STORAGE_KEY = 'wordquest-state'
const BACKUP_KEY = 'wordquest-state-backup'
export const APP_STATE_SCHEMA_VERSION = 2

type PersistedEnvelope = { version: number; state: Partial<AppState> }
type Migration = (state: Partial<AppState>) => Partial<AppState>

const migrations: Record<number, Migration> = {
  0: (state) => ({ ...state }),
  1: (state) => ({ ...state, sessions: state.sessions || {} }),
}

function unwrapPersistedState(raw: unknown): PersistedEnvelope {
  if (!raw || typeof raw !== 'object') return { version: 0, state: {} }
  const candidate = raw as { version?: unknown; state?: unknown }
  if (
    typeof candidate.version === 'number' &&
    candidate.state &&
    typeof candidate.state === 'object'
  ) {
    return { version: candidate.version, state: candidate.state as Partial<AppState> }
  }
  return { version: 0, state: raw as Partial<AppState> }
}

function runMigrations(snapshot: PersistedEnvelope): Partial<AppState> {
  let version = snapshot.version
  let state = snapshot.state
  while (version < APP_STATE_SCHEMA_VERSION) {
    state = (migrations[version] || ((current) => current))(state)
    version += 1
  }
  return state
}

function normalizeState(candidate: Partial<AppState>): AppState {
  const initial = createInitialState()
  const today = getDateKey()
  const merged = {
    ...initial,
    ...candidate,
    activeDate: candidate.activeDate || today,
    sessions: candidate.sessions || {},
  } as AppState
  if (merged.completed && merged.storyChoice && !merged.sessions[merged.activeDate]) {
    merged.sessions = {
      ...merged.sessions,
      [merged.activeDate]: createDailySession(merged, merged.storyChoice),
    }
  }
  return resetForNewDay(merged, today)
}

function parseState(raw: string) {
  return migrateAppState(JSON.parse(raw))
}

export function migrateAppState(raw: unknown): AppState {
  return normalizeState(runMigrations(unwrapPersistedState(raw)))
}

export function loadAppState(): AppState {
  const current = localStorage.getItem(STORAGE_KEY)
  if (!current) return normalizeState({})
  try {
    return parseState(current)
  } catch {
    const backup = localStorage.getItem(BACKUP_KEY)
    if (!backup) return normalizeState({})
    try {
      const recovered = parseState(backup)
      localStorage.setItem(STORAGE_KEY, backup)
      return recovered
    } catch {
      return normalizeState({})
    }
  }
}

export function saveAppState(state: AppState) {
  const envelope: PersistedEnvelope = { version: APP_STATE_SCHEMA_VERSION, state }
  const next = JSON.stringify(envelope)
  const current = localStorage.getItem(STORAGE_KEY)
  if (current && current !== next) {
    try {
      JSON.parse(current)
      localStorage.setItem(BACKUP_KEY, current)
    } catch {
      // Keep the last valid backup when the primary snapshot is damaged.
    }
  }
  localStorage.setItem(STORAGE_KEY, next)
}

export function restoreAppStateBackup() {
  const backup = localStorage.getItem(BACKUP_KEY)
  if (!backup) return false
  try {
    JSON.parse(backup)
    localStorage.setItem(STORAGE_KEY, backup)
    return true
  } catch {
    return false
  }
}

export function clearAppState() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(BACKUP_KEY)
}
