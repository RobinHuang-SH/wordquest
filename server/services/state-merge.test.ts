// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { mergeAppStates } from './state-merge.js'
import { PrismaSyncService, profilePreferencesFromState } from './sync-service.js'

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

describe('synchronized account preferences', () => {
  it('projects validated learner preferences into the user profile', () => {
    expect(
      profilePreferencesFromState({
        displayName: '  Lin  ',
        level: 'A2',
        genre: '科幻探索',
        accent: '英式',
        wordMix: '10+10',
      }),
    ).toMatchObject({
      displayName: 'Lin',
      englishLevel: 'A2',
      targetLevel: 'A2',
      storyGenre: '科幻探索',
      preferredAccent: 'UK',
      newWordRatio: 0.5,
    })
  })

  it('ignores malformed profile fields', () => {
    expect(
      profilePreferencesFromState({ level: 'Z9', genre: '', accent: 'other', wordMix: 'invalid' }),
    ).toEqual({})
  })
})

describe('sync transaction retries', () => {
  it('retries a serialization conflict before saving the snapshot', async () => {
    const row = {
      revision: 1,
      stateJson: { streak: 2 },
      clientUpdatedAt: new Date('2026-07-13T00:00:00Z'),
      sourceDeviceId: 'phone',
    }
    const tx = {
      userSyncState: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => row),
      },
      user: { update: vi.fn(async () => ({})) },
    }
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('serialization conflict'), { code: 'P2034' }))
      .mockImplementationOnce(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      )
    const service = new PrismaSyncService({ $transaction: transaction } as never)

    await expect(
      service.updateState('user-1', {
        deviceId: 'phone',
        baseRevision: 0,
        clientUpdatedAt: '2026-07-13T00:00:00Z',
        state: { streak: 2 },
      }),
    ).resolves.toMatchObject({ revision: 1, state: { streak: 2 } })
    expect(transaction).toHaveBeenCalledTimes(2)
  })
})

describe('first account import', () => {
  it('turns completed local words into server vocabulary state before the first plan', async () => {
    const prisma = {
      vocabulary: {
        findMany: vi.fn(async () => [
          { id: 'word-1', word: 'discover' },
          { id: 'word-2', word: 'ancient' },
        ]),
      },
      userWordState: { createMany: vi.fn(async () => ({ count: 2 })) },
    }
    const service = new PrismaSyncService(prisma as never)
    service.updateState = vi.fn(async (_userId, input) => ({
      revision: 1,
      state: input.state,
      clientUpdatedAt: input.clientUpdatedAt,
      sourceDeviceId: input.deviceId,
    }))

    await service.importState('user-1', {
      deviceId: 'phone',
      baseRevision: 0,
      clientUpdatedAt: '2026-07-16T00:00:00.000Z',
      state: {
        learned: { ancient: 'fuzzy' },
        sessions: { '2026-07-15': { learned: { discover: 'know' } } },
      },
    })

    expect(prisma.userWordState.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: expect.arrayContaining([
          expect.objectContaining({ wordId: 'word-1', status: 'REVIEW', memoryScore: 80 }),
          expect.objectContaining({ wordId: 'word-2', status: 'LEARNING', memoryScore: 45 }),
        ]),
      }),
    )
  })
})
