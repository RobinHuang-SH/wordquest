// @vitest-environment node

import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

type ImportWord = {
  word: string
  meaningZh: string
  definitionEn: string
  exampleSentence: string
  memberships: Array<{ collectionKey: string }>
}

describe('licensed vocabulary import artifact', () => {
  it('contains the expected deduplicated learning collections', async () => {
    const payload = JSON.parse(
      await readFile(new URL('../server/data/vocabulary-import-v1.json', import.meta.url), 'utf8'),
    ) as {
      collections: Array<{ key: string; sourceLicense: string }>
      words: ImportWord[]
    }
    const collectionCounts = new Map<string, number>()
    for (const word of payload.words)
      for (const membership of word.memberships)
        collectionCounts.set(
          membership.collectionKey,
          (collectionCounts.get(membership.collectionKey) ?? 0) + 1,
        )

    expect(new Set(payload.words.map((word) => word.word)).size).toBe(payload.words.length)
    expect(payload.words).toHaveLength(3812)
    expect(collectionCounts.get('us-k12-core')).toBe(3000)
    expect(collectionCounts.get('ielts-academic')).toBe(998)
    expect(collectionCounts.get('toefl-academic')).toBe(998)
    expect(payload.collections.every((collection) => collection.sourceLicense === 'MIT')).toBe(true)
    expect(
      payload.words.every(
        (word) =>
          word.meaningZh && word.definitionEn && word.exampleSentence && word.memberships.length,
      ),
    ).toBe(true)
  })
})
