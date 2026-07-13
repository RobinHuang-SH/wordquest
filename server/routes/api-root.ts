import type { FastifyInstance } from 'fastify'

const plannedResources = [
  'daily-session',
  'words',
  'pronunciation',
  'quiz',
  'stories',
  'story-series',
  'reports',
  'obsidian',
]

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
            required: ['name', 'version', 'status', 'documentation', 'plannedResources'],
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              status: { type: 'string' },
              documentation: { type: 'string' },
              plannedResources: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async () => ({
      name: 'WordQuest API',
      version: 'v1',
      status: 'foundation-ready',
      documentation: '/docs',
      plannedResources,
    }),
  )
}
