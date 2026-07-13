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
    generation: {
      type: 'object',
      required: ['status', 'provider', 'model', 'promptVersion'],
      properties: {
        status: { type: 'string', enum: ['SUCCESS', 'FALLBACK'] },
        provider: { type: 'string' },
        model: { type: 'string' },
        promptVersion: { type: 'integer' },
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
