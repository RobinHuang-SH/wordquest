import type { AppState } from '../domain/models'
import {
  createInitialState,
  createDailySession,
  alignStudyDate,
  getDateKey,
} from '../domain/sessions'

const STORAGE_KEY = 'wordquest-state'
const BACKUP_KEY = 'wordquest-state-backup'
export const APP_STATE_SCHEMA_VERSION = 9

type PersistedEnvelope = { version: number; state: Partial<AppState> }
type Migration = (state: Partial<AppState>) => Partial<AppState>

const migrations: Record<number, Migration> = {
  0: (state) => ({ ...state }),
  1: (state) => ({ ...state, sessions: state.sessions || {} }),
  2: (state) => ({
    ...state,
    highContrast: state.highContrast ?? false,
    reducedMotion: state.reducedMotion ?? false,
  }),
  3: (state) => ({ ...state, dailyWordPlan: state.dailyWordPlan ?? null }),
  4: (state) => ({ ...state, dailyStory: state.dailyStory ?? null }),
  5: (state) => ({ ...state, dailyStory: null }),
  6: (state) => ({ ...state, extraStudyUsedOn: state.extraStudyUsedOn ?? null }),
  7: (state) => ({ ...state, dailyWordPlan: null, dailyStory: null }),
  8: (state) => ({
    ...state,
    activeBatch: 1,
    dailyWordPlan: null,
    dailyStory: null,
    sessions: Object.fromEntries(
      Object.entries(state.sessions ?? {}).map(([key, session]) => [
        key,
        { ...session, batch: session.batch ?? 1 },
      ]),
    ),
  }),
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
  const state = raw as Partial<AppState>
  const embeddedVersion =
    typeof state.schemaVersion === 'number'
      ? state.schemaVersion
      : 'extraStudyUsedOn' in state
        ? 7
        : 0
  return { version: embeddedVersion, state }
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
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    activeDate: candidate.activeDate || today,
    activeBatch: candidate.activeBatch ?? 1,
    extraStudyUsedOn: candidate.extraStudyUsedOn ?? null,
    dailyWordPlan: candidate.dailyWordPlan ?? null,
    dailyStory: candidate.dailyStory ?? null,
    sessions: candidate.sessions || {},
  } as AppState
  const sessionKey =
    merged.activeBatch === 1 ? merged.activeDate : `${merged.activeDate}#${merged.activeBatch}`
  if (merged.completed && merged.storyChoice && !merged.sessions[sessionKey]) {
    merged.sessions = {
      ...merged.sessions,
      [sessionKey]: createDailySession(merged, merged.storyChoice),
    }
  }
  return alignStudyDate(merged, today)
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
