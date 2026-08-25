import type { FastifyInstance, FastifyRequest } from 'fastify'
import { errorResponseSchema } from '../schemas.js'
import type { AuthService, SyncService } from '../services/contracts.js'
import { authenticatedUser } from './auth.js'

const snapshotSchema = {
  type: 'object',
  required: ['revision', 'state', 'clientUpdatedAt', 'sourceDeviceId'],
  properties: {
    revision: { type: 'integer', minimum: 0 },
    state: {},
    clientUpdatedAt: { type: 'string', format: 'date-time' },
    sourceDeviceId: { type: 'string' },
    conflict: { type: 'boolean' },
  },
} as const
const appStateSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    schemaVersion: { type: 'integer', minimum: 1 },
    onboarded: { type: 'boolean' },
    displayName: { type: 'string', minLength: 1, maxLength: 100 },
    level: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
    genre: { type: 'string', minLength: 1, maxLength: 50 },
    accent: { type: 'string', enum: ['美式', '英式'] },
    learned: {
      type: 'object',
      maxProperties: 5000,
      additionalProperties: { type: 'string', enum: ['know', 'fuzzy', 'new'] },
    },
    currentWord: { type: 'integer', minimum: 0 },
    quizAnswers: { type: 'object', maxProperties: 100 },
    quizDone: { type: 'boolean' },
    storyChoice: { type: 'string', maxLength: 100 },
    completed: { type: 'boolean' },
    streak: { type: 'integer', minimum: 0 },
    wordMix: { type: 'string', enum: ['20+0', '15+5', '10+10', 'dynamic'] },
    storyLength: { type: 'string', enum: ['short', 'medium', 'long'] },
    dailyMinutes: { type: 'integer', enum: [15, 20, 30] },
    highContrast: { type: 'boolean' },
    reducedMotion: { type: 'boolean' },
    activeDate: { type: 'string', format: 'date' },
    activeBatch: { type: 'integer', minimum: 1 },
    extraStudyUsedOn: {
      anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }],
    },
    sessions: { type: 'object', maxProperties: 3660 },
    dailyWordPlan: { anyOf: [{ type: 'object' }, { type: 'null' }] },
    dailyStory: { anyOf: [{ type: 'object' }, { type: 'null' }] },
  },
} as const
const updateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['deviceId', 'baseRevision', 'clientUpdatedAt', 'state'],
  properties: {
    deviceId: { type: 'string', minLength: 1, maxLength: 100 },
    baseRevision: { type: 'integer', minimum: 0 },
    clientUpdatedAt: { type: 'string', format: 'date-time' },
    state: appStateSchema,
  },
} as const

export function registerSyncRoutes(app: FastifyInstance, auth: AuthService, sync: SyncService) {
  app.get(
    '/api/v1/sync/state',
    {
      schema: {
        tags: ['sync'],
        summary: '读取云端学习状态',
        security: [{ bearerAuth: [] }],
        response: { 200: { anyOf: [snapshotSchema, { type: 'null' }] }, 401: errorResponseSchema },
      },
    },
    async (request) => {
      const user = await authenticatedUser(request, auth)
      return sync.getState(user.id)
    },
  )
  type UpdateRequest = FastifyRequest<{
    Body: { deviceId: string; baseRevision: number; clientUpdatedAt: string; state: unknown }
  }>
  const update = async (request: UpdateRequest) => {
    const user = await authenticatedUser(request, auth)
    return sync.updateState(user.id, request.body)
  }
  const importState = async (request: UpdateRequest) => {
    const user = await authenticatedUser(request, auth)
    return sync.importState(user.id, request.body)
  }
  app.post<{
    Body: { deviceId: string; baseRevision: number; clientUpdatedAt: string; state: unknown }
  }>(
    '/api/v1/sync/import',
    {
      schema: {
        tags: ['sync'],
        summary: '导入本地学习状态',
        security: [{ bearerAuth: [] }],
        body: updateSchema,
        response: { 200: snapshotSchema, 401: errorResponseSchema },
      },
    },
    importState,
  )
  app.put<{
    Body: { deviceId: string; baseRevision: number; clientUpdatedAt: string; state: unknown }
  }>(
    '/api/v1/sync/state',
    {
      schema: {
        tags: ['sync'],
        summary: '更新并合并学习状态',
        security: [{ bearerAuth: [] }],
        body: updateSchema,
        response: { 200: snapshotSchema, 401: errorResponseSchema },
      },
    },
    update,
  )
  app.get(
    '/api/v1/sync/conflicts',
    {
      schema: {
        tags: ['sync'],
        summary: '列出最近同步冲突',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              required: [
                'id',
                'deviceId',
                'baseRevision',
                'serverRevision',
                'resolutionStrategy',
                'createdAt',
              ],
              properties: {
                id: { type: 'string' },
                deviceId: { type: 'string' },
                baseRevision: { type: 'integer' },
                serverRevision: { type: 'integer' },
                resolutionStrategy: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const user = await authenticatedUser(request, auth)
      return sync.listConflicts(user.id)
    },
  )
}
