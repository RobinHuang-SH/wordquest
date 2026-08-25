import type { StoryModelClient } from './story-model-client.js'

export type GeneratedVocabularyWord = {
  word: string
  lemma: string
  partOfSpeech: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  meaningZh: string
  definitionEn: string
  exampleSentence: string
}

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

const vocabularySchema = (count: number) => ({
  type: 'object',
  additionalProperties: false,
  required: ['words'],
  properties: {
    words: {
      type: 'array',
      minItems: count,
      maxItems: count,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'word',
          'lemma',
          'partOfSpeech',
          'level',
          'meaningZh',
          'definitionEn',
          'exampleSentence',
        ],
        properties: {
          word: { type: 'string' },
          lemma: { type: 'string' },
          partOfSpeech: { type: 'string' },
          level: { type: 'string', enum: levels },
          meaningZh: { type: 'string' },
          definitionEn: { type: 'string' },
          exampleSentence: { type: 'string' },
        },
      },
    },
  },
})

function cleanText(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

export async function generateVocabularyBatch(
  client: StoryModelClient,
  input: { targetLevel: string; count: number; excludedWords: string[]; timeoutMs: number },
): Promise<GeneratedVocabularyWord[]> {
  const allowedLevels = levels.slice(0, Math.max(0, levels.indexOf(input.targetLevel as never)) + 1)
  const excluded = new Set(input.excludedWords.map((word) => word.toLowerCase()))
  const result = await client.generate({
    systemPrompt: `You create practical English vocabulary for a Chinese-speaking learner.
Return common, reusable words only. Never use proper nouns, abbreviations, offensive terms, inflected duplicates, or phrases longer than two words.
Definitions and examples must be simple enough for the requested CEFR level. Chinese meanings must be accurate and concise.`,
    userPrompt: `Create exactly ${input.count} distinct English vocabulary entries at CEFR ${input.targetLevel} or easier.
Do not use any of these existing words: ${input.excludedWords.slice(-500).join(', ')}.
Use lowercase dictionary forms. Make every example a complete natural English sentence.`,
    schema: vocabularySchema(input.count),
    timeoutMs: input.timeoutMs,
  })
  const raw =
    result.value &&
    typeof result.value === 'object' &&
    Array.isArray((result.value as { words?: unknown }).words)
      ? ((result.value as { words: unknown[] }).words ?? [])
      : []
  const unique = new Set<string>()
  const output: GeneratedVocabularyWord[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Record<string, unknown>
    const word = cleanText(candidate.word, 100).toLowerCase()
    const lemma = cleanText(candidate.lemma, 100).toLowerCase() || word
    const level = cleanText(candidate.level, 2) as GeneratedVocabularyWord['level']
    const partOfSpeech = cleanText(candidate.partOfSpeech, 30)
    const meaningZh = cleanText(candidate.meaningZh, 200)
    const definitionEn = cleanText(candidate.definitionEn, 500)
    const exampleSentence = cleanText(candidate.exampleSentence, 500)
    if (
      !/^[a-z][a-z -]{1,98}$/.test(word) ||
      !allowedLevels.includes(level as never) ||
      !partOfSpeech ||
      !meaningZh ||
      !definitionEn ||
      !exampleSentence ||
      excluded.has(word) ||
      unique.has(word)
    )
      continue
    unique.add(word)
    output.push({ word, lemma, partOfSpeech, level, meaningZh, definitionEn, exampleSentence })
  }
  return output
}
