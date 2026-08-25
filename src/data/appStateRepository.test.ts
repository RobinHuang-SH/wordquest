import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeSession, makeState } from '../test/factories'
import {
  APP_STATE_SCHEMA_VERSION,
  clearAppState,
  loadAppState,
  migrateAppState,
  restoreAppStateBackup,
  saveAppState,
} from './appStateRepository'

const storageKey = 'wordquest-state'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 6, 12, 10, 0, 0))
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('state migrations', () => {
  it('migrates a legacy raw state and fills missing defaults', () => {
    const migrated = migrateAppState({
      onboarded: true,
      displayName: 'Lin',
      activeDate: '2026-07-12',
    })

    expect(migrated).toMatchObject({
      onboarded: true,
      displayName: 'Lin',
      wordMix: '15+5',
      storyLength: 'medium',
      sessions: {},
    })
  })

  it('migrates a versioned envelope', () => {
    const migrated = migrateAppState({
      version: 1,
      state: { displayName: 'Ava', activeDate: '2026-07-12' },
    })
    expect(migrated.displayName).toBe('Ava')
    expect(migrated.sessions).toEqual({})
  })

  it('adds accessibility defaults when migrating a version 2 snapshot', () => {
    const migrated = migrateAppState({
      version: 2,
      state: { displayName: 'Ava', activeDate: '2026-07-12' },
    })

    expect(migrated).toMatchObject({
      displayName: 'Ava',
      highContrast: false,
      reducedMotion: false,
    })
  })

  it('adds the adaptive daily plan default when migrating a version 3 snapshot', () => {
    const migrated = migrateAppState({
      version: 3,
      state: { displayName: 'Ava', activeDate: '2026-07-12' },
    })

    expect(migrated.dailyWordPlan).toBeNull()
  })

  it('adds the generated daily story default when migrating a version 4 snapshot', () => {
    const migrated = migrateAppState({
      version: 4,
      state: { displayName: 'Ava', activeDate: '2026-07-12' },
    })

    expect(migrated.dailyStory).toBeNull()
  })

  it('clears a pre-validation cached story when migrating a version 5 snapshot', () => {
    const migrated = migrateAppState({
      version: 5,
      state: {
        displayName: 'Ava',
        activeDate: '2026-07-12',
        dailyStory: { sessionId: 'legacy-story' } as never,
      },
    })

    expect(migrated.dailyStory).toBeNull()
  })

  it('adds the daily extra-study marker when migrating a version 6 snapshot', () => {
    const migrated = migrateAppState({
      version: 6,
      state: { displayName: 'Ava', activeDate: '2026-07-12' },
    })

    expect(migrated.extraStudyUsedOn).toBeNull()
  })

  it('clears an old daily plan once and preserves current synced stories afterwards', () => {
    const old = migrateAppState({
      version: 7,
      state: {
        displayName: 'Ava',
        activeDate: '2026-07-12',
        dailyWordPlan: { sessionId: 'old-plan' } as never,
        dailyStory: { sessionId: 'old-story' } as never,
      },
    })
    expect(old.dailyWordPlan).toBeNull()
    expect(old.dailyStory).toBeNull()

    const currentStory = { sessionId: 'current-story' } as never
    const current = migrateAppState({
      ...makeState(),
      schemaVersion: APP_STATE_SCHEMA_VERSION,
      dailyStory: currentStory,
    })
    expect(current.dailyStory).toBe(currentStory)
  })

  it('converts a legacy completed day into a session', () => {
    const migrated = migrateAppState({
      onboarded: true,
      activeDate: '2026-07-12',
      completed: true,
      storyChoice: 'shadow',
      quizDone: true,
      learned: { discover: 'know' },
    })

    expect(migrated.sessions['2026-07-12']).toMatchObject({
      date: '2026-07-12',
      storyChoice: 'shadow',
      learnedCount: 1,
    })
  })

  it('resets stale daily fields while keeping historical sessions', () => {
    const session = makeSession({ date: '2026-07-11' })
    const migrated = migrateAppState({
      ...makeState({
        activeDate: '2026-07-11',
        learned: { discover: 'know' },
        quizDone: true,
        completed: true,
        storyChoice: 'machine',
        sessions: { '2026-07-11': session },
      }),
    })

    expect(migrated.activeDate).toBe('2026-07-12')
    expect(migrated.learned).toEqual({})
    expect(migrated.quizDone).toBe(false)
    expect(migrated.dailyWordPlan).toBeNull()
    expect(migrated.sessions['2026-07-11']).toEqual(session)
  })
})

describe('local storage repository', () => {
  it('saves a versioned envelope and loads it again', () => {
    const state = makeState({ displayName: 'Noah' })
    saveAppState(state)

    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}')).toEqual({
      version: APP_STATE_SCHEMA_VERSION,
      state,
    })
    expect(loadAppState().displayName).toBe('Noah')
  })

  it('recovers automatically from a damaged primary snapshot', () => {
    saveAppState(makeState({ displayName: 'Previous' }))
    saveAppState(makeState({ displayName: 'Current' }))
    localStorage.setItem(storageKey, '{damaged')

    expect(loadAppState().displayName).toBe('Previous')
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').state.displayName).toBe('Previous')
  })

  it('can restore the previous valid snapshot manually', () => {
    saveAppState(makeState({ displayName: 'Previous' }))
    saveAppState(makeState({ displayName: 'Current' }))

    expect(restoreAppStateBackup()).toBe(true)
    expect(loadAppState().displayName).toBe('Previous')
  })

  it('clears persisted state', () => {
    saveAppState(makeState())
    clearAppState()
    expect(localStorage.getItem(storageKey)).toBeNull()
  })
})
