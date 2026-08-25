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

class AuthAttemptLimiter {
  private attempts = new Map<string, { count: number; resetAt: number }>()

  consume(key: string, now = Date.now()) {
    const current = this.attempts.get(key)
    if (!current || current.resetAt <= now) {
      if (!current && this.attempts.size >= 10_000) {
        for (const [storedKey, attempt] of this.attempts)
          if (attempt.resetAt <= now) this.attempts.delete(storedKey)
        if (this.attempts.size >= 10_000) return false
      }
      this.attempts.set(key, { count: 1, resetAt: now + 60_000 })
      return true
    }
    if (current.count >= 10) return false
    current.count += 1
    return true
  }
}

export function bearerToken(request: FastifyRequest) {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ') || header.length <= 7)
    throw new ApiError(401, 'AUTH_REQUIRED', '请先登录')
  return header.slice(7)
}

export async function authenticatedUser(request: FastifyRequest, auth: AuthService) {
  return auth.authenticate(bearerToken(request))
}

export function registerAuthRoutes(app: FastifyInstance, auth: AuthService) {
  const attempts = new AuthAttemptLimiter()
  const limitAttempts = (request: FastifyRequest, email: string) => {
    const key = `${request.ip}:${email.trim().toLowerCase()}`
    if (!attempts.consume(key))
      throw new ApiError(429, 'AUTH_RATE_LIMITED', '尝试次数过多，请稍后再试')
  }
  app.post<{ Body: { email: string; password: string; displayName: string; deviceId: string } }>(
    '/api/v1/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: '注册学习账户',
        body: { ...credentialsSchema, required: ['email', 'password', 'displayName', 'deviceId'] },
        response: {
          201: authResultSchema,
          400: errorResponseSchema,
          409: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      limitAttempts(request, request.body.email)
      return reply
        .code(201)
        .send(await auth.register({ ...request.body, userAgent: request.headers['user-agent'] }))
    },
  )
  app.post<{ Body: { email: string; password: string; deviceId: string } }>(
    '/api/v1/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: '登录账户',
        body: credentialsSchema,
        response: { 200: authResultSchema, 401: errorResponseSchema, 429: errorResponseSchema },
      },
    },
    async (request) => {
      limitAttempts(request, request.body.email)
      return auth.login({ ...request.body, userAgent: request.headers['user-agent'] })
    },
  )
  app.get(
    '/api/v1/auth/me',
    {
      schema: {
        tags: ['auth'],
        summary: '获取当前账户',
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
        summary: '退出当前账户',
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
