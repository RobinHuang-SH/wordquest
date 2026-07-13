// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { mergeAppStates } from './state-merge.js'

describe('sync conflict merge', () => {
  it('preserves strongest word knowledge and newest session history', () => {
    const merged = mergeAppStates(
      {
        displayName: 'Server',
        learned: { apple: 'fuzzy', map: 'know' },
        streak: 4,
        sessions: { '2026-07-12': { completedAt: '2026-07-12T10:00:00Z', quizScore: 60 } },
      },
      {
        displayName: 'Phone',
        learned: { apple: 'know', map: 'new' },
        streak: 2,
        sessions: {
          '2026-07-12': { completedAt: '2026-07-12T12:00:00Z', quizScore: 90 },
          '2026-07-13': { completedAt: '2026-07-13T12:00:00Z' },
        },
      },
      true,
    ) as {
      displayName: string
      learned: Record<string, string>
      streak: number
      sessions: Record<string, { quizScore?: number }>
    }
    expect(merged.displayName).toBe('Phone')
    expect(merged.learned).toEqual({ apple: 'know', map: 'know' })
    expect(merged.streak).toBe(4)
    expect(merged.sessions['2026-07-12'].quizScore).toBe(90)
    expect(merged.sessions).toHaveProperty('2026-07-13')
  })
})
