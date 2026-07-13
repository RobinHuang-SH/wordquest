// @vitest-environment node
import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app.js'
import type {
  AuthService,
  StoryService,
  SyncService,
  VocabularyService,
} from '../services/contracts.js'

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
  logout: vi.fn(),
  authenticate: vi.fn(async () => ({ id: 'user-1', email: 'mia@example.com', displayName: 'Mia' })),
}
const sync: SyncService = { getState: vi.fn(), updateState: vi.fn(), listConflicts: vi.fn() }
const vocabulary: VocabularyService = { getDailyPlan: vi.fn(), reviewWord: vi.fn() }
const sessionId = '00000000-0000-4000-8000-000000000003'
const story: StoryService = {
  getOrGenerate: vi.fn(async (_userId, input) => ({
    sessionId: input.sessionId,
    storyNodeId: '00000000-0000-4000-8000-000000000004',
    date: '2026-07-13',
    title: 'The Blue Door',
    titleZh: 'The Blue Door',
    summary: 'Mia finds a door.',
    paragraphs: [{ en: 'Mia discovered a door.', zh: 'Mia found a door.' }],
    choices: [
      {
        id: 'open-door',
        title: 'Open',
        en: 'Open it',
        hint: 'Look inside',
        continuationSummary: 'Mia opens it.',
      },
      {
        id: 'read-map',
        title: 'Read map',
        en: 'Read the map',
        hint: 'Find a clue',
        continuationSummary: 'Mia reads it.',
      },
      {
        id: 'call-leo',
        title: 'Call Leo',
        en: 'Call Leo',
        hint: 'Ask for help',
        continuationSummary: 'Leo arrives.',
      },
    ],
    stateBefore: {},
    stateAfter: { location: 'door' },
    vocabularyCoverage: ['discover'],
    validation: {
      passed: true,
      targetWords: { total: 1, covered: ['discover'], missing: [] },
      outOfLevelWords: [],
      difficulty: {
        targetLevel: 'B1',
        sentenceCount: 1,
        averageSentenceLength: 4,
        maxSentenceLength: 4,
        longWordRatio: 0,
        withinRange: true,
      },
      continuity: { required: false, passed: true },
      choices: { passed: true, uniqueChoiceCount: 3 },
      issues: [],
    },
    generation: {
      status: 'SUCCESS',
      provider: 'fake',
      model: 'fake-story',
      promptVersion: 2,
      repairCount: 0,
    },
  })),
}
let app: FastifyInstance | undefined
afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('story routes', () => {
  it('returns an authenticated structured daily story', async () => {
    app = await buildApp({
      env,
      logger: false,
      authService: auth,
      syncService: sync,
      vocabularyService: vocabulary,
      storyService: story,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stories/generate',
      headers: { authorization: 'Bearer token' },
      payload: { sessionId, length: 'short', previousChoice: 'open-door' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      title: 'The Blue Door',
      validation: { passed: true, targetWords: { total: 1, missing: [] } },
      generation: { status: 'SUCCESS', repairCount: 0 },
    })
    expect(story.getOrGenerate).toHaveBeenCalledWith('user-1', {
      sessionId,
      length: 'short',
      previousChoice: 'open-door',
    })
  })
  it('validates the fixed story request body', async () => {
    app = await buildApp({
      env,
      logger: false,
      authService: auth,
      syncService: sync,
      vocabularyService: vocabulary,
      storyService: story,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stories/generate',
      headers: { authorization: 'Bearer token' },
      payload: { sessionId, length: 'novel' },
    })
    expect(response.statusCode).toBe(400)
  })
})
