// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { generateVocabularyBatch } from './vocabulary-generator.js'

describe('adaptive vocabulary generation', () => {
  it('keeps unique level-appropriate words and rejects existing or invalid entries', async () => {
    const entry = (word: string, level = 'A2') => ({
      word,
      lemma: word,
      partOfSpeech: 'verb',
      level,
      meaningZh: '测试',
      definitionEn: 'A simple test definition.',
      exampleSentence: 'This is a simple example.',
    })
    const generate = vi.fn(async () => ({
      provider: 'agnes',
      model: 'test',
      value: {
        words: [entry('explore'), entry('known'), entry('Too!'), entry('advanced', 'C1')],
      },
    }))

    const words = await generateVocabularyBatch(
      { generate },
      { targetLevel: 'A2', count: 4, excludedWords: ['known'], timeoutMs: 1000 },
    )

    expect(words.map((word) => word.word)).toEqual(['explore'])
    expect(generate.mock.calls[0][0].userPrompt).toContain('Create exactly 4')
  })
})
