import type { FastifyInstance, FastifyRequest } from 'fastify'
import { errorResponseSchema } from '../schemas.js'
import { ApiError } from '../services/api-error.js'
import type { AuthService } from '../services/contracts.js'

const userSchema = {
  type: 'object',
  required: ['id', 'email', 'displayName'],
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    displayName: { type: 'string' },
  },
} as const
const authResultSchema = {
  type: 'object',
  required: ['token', 'expiresAt', 'user'],
  properties: {
    token: { type: 'string' },
    expiresAt: { type: 'string', format: 'date-time' },
    user: userSchema,
  },
} as const
const credentialsSchema = {
  type: 'object',
  required: ['email', 'password', 'deviceId'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 320 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
    displayName: { type: 'string', minLength: 1, maxLength: 100 },
    deviceId: { type: 'string', minLength: 1, maxLength: 100 },
  },
} as const

export function bearerToken(request: FastifyRequest) {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ') || header.length <= 7)
    throw new ApiError(401, 'AUTH_REQUIRED', '????')
  return header.slice(7)
}

export async function authenticatedUser(request: FastifyRequest, auth: AuthService) {
  return auth.authenticate(bearerToken(request))
}

export function registerAuthRoutes(app: FastifyInstance, auth: AuthService) {
  app.post<{ Body: { email: string; password: string; displayName: string; deviceId: string } }>(
    '/api/v1/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: '??????',
        body: { ...credentialsSchema, required: ['email', 'password', 'displayName', 'deviceId'] },
        response: { 201: authResultSchema, 400: errorResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(await auth.register({ ...request.body, userAgent: request.headers['user-agent'] })),
  )
  app.post<{ Body: { email: string; password: string; deviceId: string } }>(
    '/api/v1/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: '????',
        body: credentialsSchema,
        response: { 200: authResultSchema, 401: errorResponseSchema },
      },
    },
    async (request) => auth.login({ ...request.body, userAgent: request.headers['user-agent'] }),
  )
  app.get(
    '/api/v1/auth/me',
    {
      schema: {
        tags: ['auth'],
        summary: '??????',
        security: [{ bearerAuth: [] }],
        response: { 200: userSchema, 401: errorResponseSchema },
      },
    },
    async (request) => authenticatedUser(request, auth),
  )
  app.post(
    '/api/v1/auth/logout',
    {
      schema: {
        tags: ['auth'],
        summary: '??????',
        security: [{ bearerAuth: [] }],
        response: { 204: { type: 'null' }, 401: errorResponseSchema },
      },
    },
    async (request, reply) => {
      await auth.logout(bearerToken(request))
      return reply.code(204).send()
    },
  )
}
