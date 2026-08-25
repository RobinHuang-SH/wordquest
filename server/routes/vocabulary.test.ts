// @vitest-environment node
import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app.js'
import type { AuthService, SyncService, VocabularyService } from '../services/contracts.js'

const env = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3001',
  LOG_LEVEL: 'silent',
  CORS_ORIGIN: 'http://localhost:5173',
  API_BASE_URL: 'http://localhost:3001',
  DOCS_ENABLED: 'false',
  DATABASE_URL: 'postgresql://unused',
}
const auth: AuthService = {
  register: vi.fn(),
  login: vi.fn(),
  authenticate: vi.fn(async () => ({ id: 'user-1', email: 'mia@example.com', displayName: 'Mia' })),
  logout: vi.fn(),
}
const sync: SyncService = {
  getState: vi.fn(),
  importState: vi.fn(),
  updateState: vi.fn(),
  listConflicts: vi.fn(),
}
const wordId = '00000000-0000-4000-8000-000000000002'
const vocabulary: VocabularyService = {
  getDailyPlan: vi.fn(async (_userId, input) => ({
    sessionId: 'session-1',
    date: input.date,
    batch: input.batch ?? 1,
    status: 'GENERATED',
    newCount: 15,
    reviewCount: 5,
    words: [
      {
        id: wordId,
        word: 'discover',
        phonetic: '/discover/',
        pos: 'v',
        meaning: 'find',
        definition: 'to find something',
        example: 'Mia discovered a door.',
        level: 'A2',
        review: false,
        sourceName: 'wordquest-curated',
        sourceLicense: 'internal-curated',
      },
    ],
  })),
  reviewWord: vi.fn(async () => ({
    wordId,
    status: 'LEARNING',
    memoryScore: 68,
    nextReviewAt: '2026-07-14T00:00:00.000Z',
    reviewIntervalDays: 1,
    lapseCount: 0,
  })),
}
let app: FastifyInstance | undefined
afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('vocabulary routes', () => {
  it('returns an authenticated adaptive daily plan', async () => {
    app = await buildApp({
      env,
      logger: false,
      authService: auth,
      syncService: sync,
      vocabularyService: vocabulary,
    })
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/daily-session?date=2026-07-13&mix=dynamic',
      headers: { authorization: 'Bearer token' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      newCount: 15,
      reviewCount: 5,
      words: [{ word: 'discover' }],
    })
  })
  it('accepts learning feedback', async () => {
    app = await buildApp({
      env,
      logger: false,
      authService: auth,
      syncService: sync,
      vocabularyService: vocabulary,
    })
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/words/${wordId}/review`,
      headers: { authorization: 'Bearer token' },
      payload: {
        result: 'KNOW',
        quizCorrect: true,
        sessionId: '00000000-0000-4000-8000-000000000003',
      },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ memoryScore: 68, reviewIntervalDays: 1 })
  })

  it('forwards an explicit study batch', async () => {
    app = await buildApp({
      env,
      logger: false,
      authService: auth,
      syncService: sync,
      vocabularyService: vocabulary,
    })
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/daily-session?date=2026-07-14&mix=20%2B0&batch=7',
      headers: { authorization: 'Bearer token' },
    })
    expect(response.statusCode).toBe(200)
    expect(vocabulary.getDailyPlan).toHaveBeenLastCalledWith('user-1', {
      date: '2026-07-14',
      batch: 7,
      mix: '20+0',
    })
  })
})
