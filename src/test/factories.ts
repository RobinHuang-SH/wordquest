import type { AppState, DailySession } from '../domain/models'
import { createInitialState } from '../domain/sessions'

export function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...createInitialState(),
    onboarded: true,
    activeDate: '2026-07-12',
    ...overrides,
  }
}

export function makeSession(overrides: Partial<DailySession> = {}): DailySession {
  return {
    date: '2026-07-12',
    batch: 1,
    learned: {},
    learnedCount: 20,
    newCount: 15,
    reviewCount: 5,
    quizScore: 100,
    storyChoice: 'underground',
    storyLength: 'medium',
    dailyMinutes: 20,
    completedAt: '2026-07-12T12:00:00.000Z',
    ...overrides,
  }
}
