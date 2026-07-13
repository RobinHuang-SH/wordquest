import type { FastifyInstance } from 'fastify'
import type { ApiConfig } from '../config.js'
import { healthResponseSchema } from '../schemas.js'

export function registerHealthRoutes(app: FastifyInstance, config: ApiConfig, version: string) {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: '服务健康检查',
        description: '返回 API 进程、环境和运行时状态。',
        response: { 200: healthResponseSchema },
      },
    },
    async () => ({
      status: 'ok' as const,
      service: 'wordquest-api',
      version,
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(3)),
    }),
  )
}
