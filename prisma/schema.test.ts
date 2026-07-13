// @vitest-environment node

import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const expectedModels = [
  'User',
  'Vocabulary',
  'UserWordState',
  'DailySession',
  'DailySessionWord',
  'StorySeries',
  'StoryNode',
  'StoryChoice',
  'PronunciationAttempt',
  'WeeklyReport',
]

describe('Prisma data model', () => {
  it('implements every core table from the PRD', async () => {
    const schema = await readFile(new URL('./schema.prisma', import.meta.url), 'utf8')

    for (const model of expectedModels) {
      expect(schema).toContain(`model ${model} {`)
    }
  })

  it('ships a PostgreSQL migration with constraints and indexes', async () => {
    const migration = await readFile(
      new URL('./migrations/20260713020000_init_wordquest_schema/migration.sql', import.meta.url),
      'utf8',
    )

    expect(migration).toContain('CREATE TABLE "users"')
    expect(migration).toContain('CREATE TABLE "weekly_reports"')
    expect(migration).toContain('FOREIGN KEY')
    expect(migration).toContain('CREATE UNIQUE INDEX')
  })
})
