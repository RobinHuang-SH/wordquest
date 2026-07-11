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
