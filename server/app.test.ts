// @vitest-environment node

import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

const testEnv = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3001',
  LOG_LEVEL: 'silent',
  CORS_ORIGIN: 'http://localhost:5173',
  API_BASE_URL: 'http://localhost:3001',
  DOCS_ENABLED: 'true',
}

let app: FastifyInstance | undefined

afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('WordQuest API foundation', () => {
  it('returns health metadata', async () => {
    app = await buildApp({ env: testEnv, logger: false })
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'wordquest-api',
      version: '0.1.0',
      environment: 'test',
    })
  })

  it('publishes an OpenAPI document with the foundation routes', async () => {
    app = await buildApp({ env: testEnv, logger: false })
    await app.ready()
    const document = app.swagger()

    expect(document.openapi).toBe('3.1.0')
    expect(document.paths).toHaveProperty('/health')
    expect(document.paths).toHaveProperty('/api/v1')
  })

  it('serves interactive API documentation', async () => {
    app = await buildApp({ env: testEnv, logger: false })
    const response = await app.inject({ method: 'GET', url: '/docs/json' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      openapi: '3.1.0',
      info: { title: 'WordQuest API', version: '0.1.0' },
    })
  })

  it('uses the unified error response for missing routes', async () => {
    app = await buildApp({ env: testEnv, logger: false })
    const response = await app.inject({ method: 'GET', url: '/missing' })
    const body = response.json()

    expect(response.statusCode).toBe(404)
    expect(body).toMatchObject({
      error: {
        code: 'ROUTE_NOT_FOUND',
        statusCode: 404,
      },
      path: '/missing',
    })
    expect(body.error.requestId).toEqual(expect.any(String))
  })

  it('returns structured validation errors', async () => {
    app = await buildApp({ env: testEnv, logger: false })
    app.post(
      '/test/validation',
      {
        schema: {
          body: {
            type: 'object',
            required: ['name'],
            properties: { name: { type: 'string', minLength: 1 } },
          },
        },
      },
      async () => ({ ok: true }),
    )

    const response = await app.inject({
      method: 'POST',
      url: '/test/validation',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: expect.any(Array),
      },
    })
  })

  it('allows the configured frontend origin', async () => {
    app = await buildApp({ env: testEnv, logger: false })
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:5173' },
    })

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('rejects invalid environment configuration', async () => {
    await expect(buildApp({ env: { ...testEnv, PORT: '70000' }, logger: false })).rejects.toThrow()
  })
})
