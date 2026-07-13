// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { demoSessionVocabularySeed, demoUser, vocabularySeed } from './seed-data.js'

describe('database seed data', () => {
  it('contains the complete 20-word demo session without duplicates', () => {
    expect(demoSessionVocabularySeed).toHaveLength(20)
    expect(new Set(vocabularySeed.map((item) => item.word)).size).toBe(vocabularySeed.length)
    expect(vocabularySeed.length).toBeGreaterThanOrEqual(50)
  })

  it('matches the default 15 new and 5 review word mix', () => {
    expect(demoSessionVocabularySeed.filter((item) => item.isReview)).toHaveLength(5)
    expect(demoSessionVocabularySeed.filter((item) => !item.isReview)).toHaveLength(15)
  })

  it('provides an idempotent demo account identity', () => {
    expect(demoUser.email).toBe('demo@wordquest.local')
    expect(demoUser.dailyWordCount).toBe(20)
  })
})
