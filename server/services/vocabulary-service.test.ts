// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PrismaVocabularyService } from './vocabulary-service.js'

afterEach(() => {
  vi.useRealTimers()
})

function serviceForEmptyBatch() {
  const session = {
    id: 'session-extra',
    status: 'GENERATED',
    newWordCount: 0,
    reviewWordCount: 0,
    words: [],
  }
  const tx = {
    dailySession: {
      create: vi.fn(async () => session),
      findUniqueOrThrow: vi.fn(async () => session),
    },
    dailySessionWord: { create: vi.fn() },
    userWordState: { create: vi.fn() },
  }
  const prisma = {
    user: {
      findUnique: vi.fn(async () => ({
        id: 'user-1',
        timezone: 'Asia/Shanghai',
        targetLevel: 'A2',
        dailyWordCount: 0,
      })),
    },
    dailySession: { findUnique: vi.fn(async () => null) },
    userWordState: { findMany: vi.fn(async () => []) },
    vocabulary: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  }
  return { service: new PrismaVocabularyService(prisma as never), tx }
}

describe('continuous study batches', () => {
  it('rejects a future date', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-16T02:00:00.000Z'))
    const { service } = serviceForEmptyBatch()

    await expect(
      service.getDailyPlan('user-1', { date: '2026-07-17', mix: '20+0' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'FUTURE_SESSION_NOT_ALLOWED' })
  })

  it('creates any positive batch number on the current day', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-16T02:00:00.000Z'))
    const current = serviceForEmptyBatch()
    await expect(
      current.service.getDailyPlan('user-1', {
        date: '2026-07-16',
        batch: 12,
        mix: '20+0',
      }),
    ).resolves.toMatchObject({ sessionId: 'session-extra', batch: 12, words: [] })
    expect(current.tx.dailySession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ batchNumber: 12 }) }),
    )
  })
})

describe('daily new and review word composition', () => {
  it('keeps twenty new words while appending due reviews separately', async () => {
    const newWords = Array.from({ length: 20 }, (_, index) => ({
      id: `new-${index}`,
      word: `newword${index}`,
      phoneticUs: null,
      partOfSpeech: 'n',
      meaningZh: `新词${index}`,
      definitionEn: 'A new test word.',
      exampleSentence: 'This is a new test word.',
      level: 'A2',
      sourceName: 'test',
      sourceLicense: 'test',
    }))
    const reviews = Array.from({ length: 3 }, (_, index) => ({
      wordId: `review-${index}`,
      memoryScore: 20,
      pronunciationScore: 20,
      spellingScore: 20,
      listeningScore: 20,
      lapseCount: 0,
      nextReviewAt: new Date('2026-07-15T00:00:00.000Z'),
      word: { ...newWords[index], id: `review-${index}`, word: `reviewword${index}` },
    }))
    const createdEntries: Array<{ data: { wordType: string } }> = []
    const finalSession = {
      id: 'session-1',
      status: 'GENERATED',
      newWordCount: 20,
      reviewWordCount: 3,
      words: [
        ...newWords.map((word, index) => ({ wordType: 'NEW', sequence: index + 1, word })),
        ...reviews.map((item, index) => ({
          wordType: 'REVIEW',
          sequence: 21 + index,
          word: item.word,
        })),
      ],
    }
    const tx = {
      dailySession: {
        create: vi.fn(async () => ({ id: 'session-1' })),
        findUniqueOrThrow: vi.fn(async () => finalSession),
      },
      dailySessionWord: {
        create: vi.fn(async (input) => {
          createdEntries.push(input as never)
          return input
        }),
      },
      userWordState: { create: vi.fn(async () => ({})) },
    }
    const prisma = {
      user: {
        findUnique: vi.fn(async () => ({
          id: 'user-1',
          timezone: 'Asia/Shanghai',
          targetLevel: 'A2',
          dailyWordCount: 20,
        })),
      },
      dailySession: { findUnique: vi.fn(async () => null) },
      userWordState: { findMany: vi.fn(async () => reviews) },
      vocabulary: {
        findMany: vi.fn(async () => newWords),
        createMany: vi.fn(),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    }

    const plan = await new PrismaVocabularyService(prisma as never).getDailyPlan('user-1', {
      date: '2026-07-16',
      mix: 'dynamic',
    })

    expect(plan).toMatchObject({ newCount: 20, reviewCount: 3 })
    expect(plan.words).toHaveLength(23)
    expect(plan.words.slice(0, 20).every((word) => !word.review)).toBe(true)
    expect(plan.words.slice(20).every((word) => word.review)).toBe(true)
    expect(createdEntries.filter((entry) => entry.data.wordType === 'NEW')).toHaveLength(20)
    expect(createdEntries.filter((entry) => entry.data.wordType === 'REVIEW')).toHaveLength(3)
  })
})
