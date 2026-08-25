// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { createPrismaClient } from './client.js'

const runDatabaseTests = process.env.RUN_DB_INTEGRATION === 'true'
const prisma = runDatabaseTests ? createPrismaClient() : null

describe.skipIf(!runDatabaseTests)('PostgreSQL migrations and seed data', () => {
  afterAll(async () => prisma?.$disconnect())

  it('loads the idempotent demo learner and vocabulary catalog', async () => {
    const user = await prisma?.user.findUnique({ where: { email: 'demo@wordquest.local' } })
    const vocabularyCount = await prisma?.vocabulary.count()

    expect(user).toMatchObject({ displayName: 'Mia' })
    expect(vocabularyCount).toBeGreaterThanOrEqual(20)
  })
})
