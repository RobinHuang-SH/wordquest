// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { createPrismaClient, requireDatabaseUrl } from './client.js'

describe('database client configuration', () => {
  it('requires a PostgreSQL connection string', () => {
    expect(() => requireDatabaseUrl({})).toThrow('DATABASE_URL is required')
  })

  it('trims and returns the configured connection string', () => {
    expect(requireDatabaseUrl({ DATABASE_URL: '  postgresql://localhost/wordquest  ' })).toBe(
      'postgresql://localhost/wordquest',
    )
  })

  it('creates a Prisma client without opening a connection eagerly', async () => {
    const client = createPrismaClient('postgresql://wordquest:wordquest@localhost:5432/wordquest')
    await expect(client.$disconnect()).resolves.toBeUndefined()
  })
})
