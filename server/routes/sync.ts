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
const updateSchema = {
  type: 'object',
  required: ['deviceId', 'baseRevision', 'clientUpdatedAt', 'state'],
  properties: {
    deviceId: { type: 'string', minLength: 1, maxLength: 100 },
    baseRevision: { type: 'integer', minimum: 0 },
    clientUpdatedAt: { type: 'string', format: 'date-time' },
    state: { type: 'object' },
  },
} as const

export function registerSyncRoutes(app: FastifyInstance, auth: AuthService, sync: SyncService) {
  app.get(
    '/api/v1/sync/state',
    {
      schema: {
        tags: ['sync'],
        summary: '????????',
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
  app.post<{
    Body: { deviceId: string; baseRevision: number; clientUpdatedAt: string; state: unknown }
  }>(
    '/api/v1/sync/import',
    {
      schema: {
        tags: ['sync'],
        summary: '????????',
        security: [{ bearerAuth: [] }],
        body: updateSchema,
        response: { 200: snapshotSchema, 401: errorResponseSchema },
      },
    },
    update,
  )
  app.put<{
    Body: { deviceId: string; baseRevision: number; clientUpdatedAt: string; state: unknown }
  }>(
    '/api/v1/sync/state',
    {
      schema: {
        tags: ['sync'],
        summary: '?????????????',
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
        summary: '????????',
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
