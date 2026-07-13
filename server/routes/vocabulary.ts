import type { FastifyInstance } from 'fastify'
import { errorResponseSchema } from '../schemas.js'
import type { AuthService, VocabularyService, WordReviewInput } from '../services/contracts.js'
import { authenticatedUser } from './auth.js'

const planWordSchema = {
  type: 'object',
  required: [
    'id',
    'word',
    'phonetic',
    'pos',
    'meaning',
    'definition',
    'example',
    'level',
    'review',
    'sourceName',
    'sourceLicense',
  ],
  properties: {
    id: { type: 'string' },
    word: { type: 'string' },
    phonetic: { type: 'string' },
    pos: { type: 'string' },
    meaning: { type: 'string' },
    definition: { type: 'string' },
    example: { type: 'string' },
    level: { type: 'string' },
    review: { type: 'boolean' },
    sourceName: { type: 'string' },
    sourceLicense: { type: 'string' },
  },
} as const
const planSchema = {
  type: 'object',
  required: ['sessionId', 'date', 'status', 'newCount', 'reviewCount', 'words'],
  properties: {
    sessionId: { type: 'string' },
    date: { type: 'string', format: 'date' },
    status: { type: 'string' },
    newCount: { type: 'integer' },
    reviewCount: { type: 'integer' },
    words: { type: 'array', items: planWordSchema },
  },
} as const

export function registerVocabularyRoutes(
  app: FastifyInstance,
  auth: AuthService,
  vocabulary: VocabularyService,
) {
  app.get<{
    Querystring: { date: string; mix?: '20+0' | '15+5' | '10+10' | 'dynamic' }
  }>(
    '/api/v1/daily-session',
    {
      schema: {
        tags: ['daily-session', 'words'],
        summary: 'Generate or read the adaptive daily vocabulary plan',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['date'],
          properties: {
            date: { type: 'string', format: 'date' },
            mix: { type: 'string', enum: ['20+0', '15+5', '10+10', 'dynamic'], default: '15+5' },
          },
        },
        response: { 200: planSchema, 401: errorResponseSchema },
      },
    },
    async (request) => {
      const user = await authenticatedUser(request, auth)
      return vocabulary.getDailyPlan(user.id, {
        date: request.query.date,
        mix: request.query.mix ?? '15+5',
      })
    },
  )

  app.post<{ Params: { wordId: string }; Body: WordReviewInput }>(
    '/api/v1/words/:wordId/review',
    {
      schema: {
        tags: ['words'],
        summary: 'Submit learning feedback and schedule the next review',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['wordId'],
          properties: { wordId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          required: ['result'],
          properties: {
            result: { type: 'string', enum: ['KNOW', 'FUZZY', 'UNKNOWN'] },
            quizCorrect: { type: 'boolean' },
            pronunciationScore: { type: 'number', minimum: 0, maximum: 100 },
            sessionId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            required: [
              'wordId',
              'status',
              'memoryScore',
              'nextReviewAt',
              'reviewIntervalDays',
              'lapseCount',
            ],
            properties: {
              wordId: { type: 'string' },
              status: { type: 'string' },
              memoryScore: { type: 'number' },
              nextReviewAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
              reviewIntervalDays: { type: 'integer' },
              lapseCount: { type: 'integer' },
            },
          },
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const user = await authenticatedUser(request, auth)
      return vocabulary.reviewWord(user.id, request.params.wordId, request.body)
    },
  )
}
