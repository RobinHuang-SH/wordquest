// @vitest-environment node
import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app.js'
import type { AuthService, SyncService } from '../services/contracts.js'

const env = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3001',
  LOG_LEVEL: 'silent',
  CORS_ORIGIN: 'http://localhost:5173',
  API_BASE_URL: 'http://localhost:3001',
  DOCS_ENABLED: 'false',
  DATABASE_URL: 'postgresql://unused',
}
const user = { id: 'user-1', email: 'mia@example.com', displayName: 'Mia' }
const auth: AuthService = {
  register: vi.fn(async () => ({
    token: 'token',
    expiresAt: new Date(Date.now() + 1000).toISOString(),
    user,
  })),
  login: vi.fn(async () => ({
    token: 'token',
    expiresAt: new Date(Date.now() + 1000).toISOString(),
    user,
  })),
  authenticate: vi.fn(async (token) => {
    if (token !== 'token')
      throw Object.assign(new Error('请先登录'), { statusCode: 401, code: 'AUTH_REQUIRED' })
    return user
  }),
  logout: vi.fn(async () => undefined),
}
const sync: SyncService = {
  getState: vi.fn(async () => null),
  importState: vi.fn(async (_id, input) => ({
    revision: input.baseRevision + 1,
    state: input.state,
    clientUpdatedAt: input.clientUpdatedAt,
    sourceDeviceId: input.deviceId,
  })),
  updateState: vi.fn(async (_id, input) => ({
    revision: input.baseRevision + 1,
    state: input.state,
    clientUpdatedAt: input.clientUpdatedAt,
    sourceDeviceId: input.deviceId,
  })),
  listConflicts: vi.fn(async () => []),
}
let app: FastifyInstance | undefined
afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('auth and sync routes', () => {
  it('registers and documents account routes', async () => {
    app = await buildApp({ env, logger: false, authService: auth, syncService: sync })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'mia@example.com',
        password: 'password123',
        displayName: 'Mia',
        deviceId: 'browser',
      },
    })
    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ token: 'token', user })
    await app.ready()
    expect(app.swagger().paths).toHaveProperty('/api/v1/sync/state')
  })
  it('requires bearer auth and forwards sync updates', async () => {
    app = await buildApp({ env, logger: false, authService: auth, syncService: sync })
    const denied = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
    expect(denied.statusCode).toBe(401)
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/sync/state',
      headers: { authorization: 'Bearer token' },
      payload: {
        deviceId: 'phone',
        baseRevision: 2,
        clientUpdatedAt: '2026-07-13T00:00:00.000Z',
        state: { streak: 4 },
      },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ revision: 3, state: { streak: 4 } })
  })
  it('rate limits repeated authentication attempts for one account and address', async () => {
    app = await buildApp({ env, logger: false, authService: auth, syncService: sync })
    const payload = { email: 'mia@example.com', password: 'password123', deviceId: 'browser' }
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload })
      expect(response.statusCode).toBe(200)
    }
    const limited = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload })
    expect(limited.statusCode).toBe(429)
    expect(limited.json()).toMatchObject({ error: { code: 'AUTH_RATE_LIMITED' } })
  })
})
