import type { FastifyInstance } from 'fastify'

const availableResources = ['auth', 'sync', 'daily-session', 'words']

const plannedResources = ['pronunciation', 'quiz', 'stories', 'story-series', 'reports', 'obsidian']

export function registerApiRoot(app: FastifyInstance) {
  app.get(
    '/api/v1',
    {
      schema: {
        tags: ['system'],
        summary: 'API 版本信息',
        response: {
          200: {
            type: 'object',
            required: [
              'name',
              'version',
              'status',
              'documentation',
              'availableResources',
              'plannedResources',
            ],
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              status: { type: 'string' },
              documentation: { type: 'string' },
              availableResources: { type: 'array', items: { type: 'string' } },
              plannedResources: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async () => ({
      name: 'WordQuest API',
      version: 'v1',
      status: 'vocabulary-engine-ready',
      documentation: '/docs',
      availableResources,
      plannedResources,
    }),
  )
}
