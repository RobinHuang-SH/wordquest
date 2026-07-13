import cors from '@fastify/cors'
import fastifyEnv from '@fastify/env'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify from 'fastify'
import type { FastifyServerOptions } from 'fastify'
import { configSchema, parseCorsOrigin } from './config.js'
import type { ApiConfig } from './config.js'
import { registerErrorHandlers } from './errors.js'
import { registerApiRoot } from './routes/api-root.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerSyncRoutes } from './routes/sync.js'
import { registerVocabularyRoutes } from './routes/vocabulary.js'
import { registerStoryRoutes } from './routes/stories.js'
import { createPrismaClient } from './database/client.js'
import { PrismaAuthService } from './services/auth-service.js'
import { PrismaSyncService } from './services/sync-service.js'
import { PrismaVocabularyService } from './services/vocabulary-service.js'
import { PrismaStoryService } from './services/story-service.js'
import { OpenAiCompatibleStoryModelClient } from './services/story-model-client.js'
import type {
  AuthService,
  StoryService,
  SyncService,
  VocabularyService,
} from './services/contracts.js'

export interface BuildAppOptions {
  env?: Record<string, string | undefined>
  logger?: FastifyServerOptions['logger']
  authService?: AuthService
  syncService?: SyncService
  vocabularyService?: VocabularyService
  storyService?: StoryService
}

const serviceVersion = '0.1.0'

export async function buildApp(options: BuildAppOptions = {}) {
  const requestedLogLevel = options.env?.LOG_LEVEL ?? process.env.LOG_LEVEL ?? 'info'
  const app = Fastify({
    logger:
      options.logger ??
      ({
        level: requestedLogLevel,
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
      } satisfies FastifyServerOptions['logger']),
  })

  await app.register(fastifyEnv, {
    confKey: 'config',
    schema: configSchema,
    data: options.env ?? process.env,
    dotenv: options.env ? false : true,
  })
  const config = app.getEnvs<ApiConfig>()

  await app.register(cors, {
    origin: parseCorsOrigin(config.CORS_ORIGIN),
    credentials: false,
  })

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'WordQuest API',
        description: '词境英语的服务端 API。当前阶段提供基础设施与系统接口。',
        version: serviceVersion,
      },
      servers: [{ url: config.API_BASE_URL, description: config.NODE_ENV }],
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
      tags: [
        { name: 'auth', description: '???????' },
        { name: 'sync', description: '????????????' },
        { name: 'system', description: '服务状态与 API 元信息' },
        { name: 'daily-session', description: '每日学习任务' },
        { name: 'words', description: '词汇与学习结果' },
        { name: 'pronunciation', description: '发音评测与语音' },
        { name: 'quiz', description: '单词测试' },
        { name: 'stories', description: '每日故事与故事线' },
        { name: 'reports', description: '学习周报' },
        { name: 'obsidian', description: 'Obsidian 导出与同步' },
      ],
    },
  })

  if (config.DOCS_ENABLED) {
    await app.register(swaggerUi, {
      routePrefix: '/docs',
      staticCSP: true,
      uiConfig: { docExpansion: 'list', deepLinking: true },
    })
  }

  registerErrorHandlers(app)
  registerHealthRoutes(app, config, serviceVersion)
  registerApiRoot(app)

  let prisma: ReturnType<typeof createPrismaClient> | undefined
  const getPrisma = () => (prisma ??= createPrismaClient(config.DATABASE_URL))
  const authService = options.authService ?? new PrismaAuthService(getPrisma())
  const syncService = options.syncService ?? new PrismaSyncService(getPrisma())
  const vocabularyService = options.vocabularyService ?? new PrismaVocabularyService(getPrisma())
  const modelClient = config.LLM_API_KEY
    ? new OpenAiCompatibleStoryModelClient({
        apiKey: config.LLM_API_KEY,
        baseUrl: config.LLM_BASE_URL,
        model: config.LLM_MODEL,
      })
    : null
  const storyService =
    options.storyService ??
    new PrismaStoryService(getPrisma(), modelClient, {
      timeoutMs: config.LLM_TIMEOUT_MS,
      maxRetries: config.LLM_MAX_RETRIES,
      rateLimitPerMinute: config.LLM_RATE_LIMIT_PER_MINUTE,
    })
  registerAuthRoutes(app, authService)
  registerSyncRoutes(app, authService, syncService)
  registerVocabularyRoutes(app, authService, vocabularyService)
  registerStoryRoutes(app, authService, storyService)
  if (prisma) app.addHook('onClose', async () => prisma?.$disconnect())

  return app
}
