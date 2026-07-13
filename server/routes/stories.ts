import type { FastifyInstance } from 'fastify'
import { errorResponseSchema } from '../schemas.js'
import type { AuthService, StoryLength, StoryService } from '../services/contracts.js'
import { authenticatedUser } from './auth.js'

const paragraphSchema = {
  type: 'object',
  required: ['en', 'zh'],
  properties: { en: { type: 'string' }, zh: { type: 'string' } },
} as const
const choiceSchema = {
  type: 'object',
  required: ['id', 'title', 'en', 'hint', 'continuationSummary'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    en: { type: 'string' },
    hint: { type: 'string' },
    continuationSummary: { type: 'string' },
  },
} as const
const storySchema = {
  type: 'object',
  required: [
    'sessionId',
    'storyNodeId',
    'date',
    'title',
    'titleZh',
    'summary',
    'paragraphs',
    'choices',
    'stateBefore',
    'stateAfter',
    'vocabularyCoverage',
    'validation',
    'generation',
  ],
  properties: {
    sessionId: { type: 'string' },
    storyNodeId: { type: 'string' },
    date: { type: 'string', format: 'date' },
    title: { type: 'string' },
    titleZh: { type: 'string' },
    summary: { type: 'string' },
    paragraphs: { type: 'array', items: paragraphSchema },
    choices: { type: 'array', minItems: 3, maxItems: 3, items: choiceSchema },
    stateBefore: { type: 'object', additionalProperties: true },
    stateAfter: { type: 'object', additionalProperties: true },
    vocabularyCoverage: { type: 'array', items: { type: 'string' } },
    validation: {
      type: 'object',
      required: [
        'passed',
        'targetWords',
        'outOfLevelWords',
        'difficulty',
        'continuity',
        'choices',
        'issues',
      ],
      properties: {
        passed: { type: 'boolean' },
        targetWords: {
          type: 'object',
          required: ['total', 'covered', 'missing'],
          properties: {
            total: { type: 'integer' },
            covered: { type: 'array', items: { type: 'string' } },
            missing: { type: 'array', items: { type: 'string' } },
          },
        },
        outOfLevelWords: {
          type: 'array',
          items: {
            type: 'object',
            required: ['word', 'level'],
            properties: { word: { type: 'string' }, level: { type: 'string' } },
          },
        },
        difficulty: {
          type: 'object',
          required: [
            'targetLevel',
            'sentenceCount',
            'averageSentenceLength',
            'maxSentenceLength',
            'longWordRatio',
            'withinRange',
          ],
          properties: {
            targetLevel: { type: 'string' },
            sentenceCount: { type: 'integer' },
            averageSentenceLength: { type: 'number' },
            maxSentenceLength: { type: 'integer' },
            longWordRatio: { type: 'number' },
            withinRange: { type: 'boolean' },
          },
        },
        continuity: {
          type: 'object',
          required: ['required', 'passed'],
          properties: {
            required: { type: 'boolean' },
            passed: { type: 'boolean' },
            previousChoice: { type: 'string' },
          },
        },
        choices: {
          type: 'object',
          required: ['passed', 'uniqueChoiceCount'],
          properties: {
            passed: { type: 'boolean' },
            uniqueChoiceCount: { type: 'integer' },
          },
        },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              words: { type: 'array', items: { type: 'string' } },
              paragraphIndexes: { type: 'array', items: { type: 'integer' } },
            },
          },
        },
      },
    },
    generation: {
      type: 'object',
      required: ['status', 'provider', 'model', 'promptVersion', 'repairCount'],
      properties: {
        status: { type: 'string', enum: ['SUCCESS', 'FALLBACK'] },
        provider: { type: 'string' },
        model: { type: 'string' },
        promptVersion: { type: 'integer' },
        repairCount: { type: 'integer' },
      },
    },
  },
} as const

export function registerStoryRoutes(
  app: FastifyInstance,
  auth: AuthService,
  stories: StoryService,
) {
  app.post<{
    Body: { sessionId: string; length?: StoryLength; previousChoice?: string }
  }>(
    '/api/v1/stories/generate',
    {
      schema: {
        tags: ['stories'],
        summary: 'Generate or read the structured story for a daily session',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            length: { type: 'string', enum: ['short', 'medium', 'long'], default: 'medium' },
            previousChoice: { type: 'string', maxLength: 100 },
          },
        },
        response: {
          200: storySchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const user = await authenticatedUser(request, auth)
      return stories.getOrGenerate(user.id, {
        sessionId: request.body.sessionId,
        length: request.body.length ?? 'medium',
        previousChoice: request.body.previousChoice,
      })
    },
  )
}
