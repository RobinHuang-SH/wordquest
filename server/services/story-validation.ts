import type { GeneratedStory } from './story-schema.js'

export type StoryVocabularyEntry = {
  word: string
  lemma: string
  level: string
}

export type StoryValidationIssueCode =
  | 'MISSING_TARGET_WORDS'
  | 'OUT_OF_LEVEL_WORDS'
  | 'DIFFICULTY_TOO_HIGH'
  | 'CONTINUITY_MISMATCH'
  | 'EMPTY_STORY_STATE'
  | 'DUPLICATE_CHOICES'

export type StoryValidationIssue = {
  code: StoryValidationIssueCode
  message: string
  words?: string[]
  paragraphIndexes?: number[]
}

export type StoryValidationReport = {
  passed: boolean
  targetWords: {
    total: number
    covered: string[]
    missing: string[]
  }
  outOfLevelWords: Array<{ word: string; level: string }>
  difficulty: {
    targetLevel: string
    sentenceCount: number
    averageSentenceLength: number
    maxSentenceLength: number
    longWordRatio: number
    withinRange: boolean
  }
  continuity: {
    required: boolean
    passed: boolean
    previousChoice?: string
  }
  choices: {
    passed: boolean
    uniqueChoiceCount: number
  }
  issues: StoryValidationIssue[]
}

const levelRank: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }
const difficultyLimits: Record<
  string,
  { averageSentenceLength: number; maxSentenceLength: number; longWordRatio: number }
> = {
  A1: { averageSentenceLength: 10, maxSentenceLength: 16, longWordRatio: 0.2 },
  A2: { averageSentenceLength: 13, maxSentenceLength: 22, longWordRatio: 0.26 },
  B1: { averageSentenceLength: 17, maxSentenceLength: 28, longWordRatio: 0.34 },
  B2: { averageSentenceLength: 21, maxSentenceLength: 34, longWordRatio: 0.42 },
  C1: { averageSentenceLength: 27, maxSentenceLength: 42, longWordRatio: 0.52 },
  C2: { averageSentenceLength: 35, maxSentenceLength: 55, longWordRatio: 0.65 },
}

const irregularLemmas: Record<string, string> = {
  am: 'be',
  are: 'be',
  been: 'be',
  children: 'child',
  did: 'do',
  done: 'do',
  feet: 'foot',
  found: 'find',
  gave: 'give',
  gone: 'go',
  had: 'have',
  has: 'have',
  knew: 'know',
  known: 'know',
  led: 'lead',
  left: 'leave',
  made: 'make',
  men: 'man',
  mice: 'mouse',
  ran: 'run',
  read: 'read',
  saw: 'see',
  seen: 'see',
  took: 'take',
  was: 'be',
  went: 'go',
  were: 'be',
  women: 'woman',
  wrote: 'write',
  written: 'write',
}

function normalizeWord(value: string) {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/^'+|'+$/g, '')
}

export function tokenizeEnglish(text: string): string[] {
  return (text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? []).map(normalizeWord)
}

export function lemmaCandidates(value: string): string[] {
  const word = normalizeWord(value)
  const candidates = new Set([word])
  if (irregularLemmas[word]) candidates.add(irregularLemmas[word])
  if (word.endsWith("'s")) candidates.add(word.slice(0, -2))
  if (word.length > 4 && word.endsWith('ies')) candidates.add(`${word.slice(0, -3)}y`)
  if (word.length > 4 && word.endsWith('ied')) candidates.add(`${word.slice(0, -3)}y`)
  if (word.length > 5 && word.endsWith('ing')) {
    const stem = word.slice(0, -3)
    candidates.add(stem)
    candidates.add(`${stem}e`)
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) candidates.add(stem.slice(0, -1))
  }
  if (word.length > 4 && word.endsWith('ed')) {
    const stem = word.slice(0, -2)
    candidates.add(stem)
    candidates.add(`${stem}e`)
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) candidates.add(stem.slice(0, -1))
  }
  if (word.length > 4 && /(ches|shes|sses|xes|zes)$/.test(word)) candidates.add(word.slice(0, -2))
  if (word.length > 3 && word.endsWith('es')) candidates.add(word.slice(0, -1))
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss'))
    candidates.add(word.slice(0, -1))
  return [...candidates]
}

function normalizedChoiceText(value: string) {
  return tokenizeEnglish(value).join(' ')
}

function sentenceWordCounts(story: GeneratedStory) {
  return story.paragraphs.flatMap((paragraph, paragraphIndex) =>
    paragraph.en
      .split(/(?<=[.!?])\s+|\n+/)
      .map((sentence) => ({ paragraphIndex, count: tokenizeEnglish(sentence).length }))
      .filter((sentence) => sentence.count > 0),
  )
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

export function validateGeneratedStory(input: {
  story: GeneratedStory
  targetWords: StoryVocabularyEntry[]
  vocabularyCatalog: StoryVocabularyEntry[]
  targetLevel: string
  previousChoice?: string
}): StoryValidationReport {
  const { story, targetWords, vocabularyCatalog, targetLevel, previousChoice } = input
  const storyTokens = story.paragraphs.flatMap((paragraph) => tokenizeEnglish(paragraph.en))
  const tokenCandidates = storyTokens.map((token) => ({
    token,
    candidates: lemmaCandidates(token),
  }))
  const targetAliases = targetWords.map((entry) => ({
    entry,
    aliases: new Set([
      normalizeWord(entry.word),
      normalizeWord(entry.lemma),
      ...lemmaCandidates(entry.word),
      ...lemmaCandidates(entry.lemma),
    ]),
  }))
  const covered = targetAliases
    .filter(({ aliases }) =>
      tokenCandidates.some(({ candidates }) => candidates.some((item) => aliases.has(item))),
    )
    .map(({ entry }) => entry.word)
  const coveredSet = new Set(covered.map(normalizeWord))
  const missing = targetWords
    .map((entry) => entry.word)
    .filter((word) => !coveredSet.has(normalizeWord(word)))

  const targetAliasSet = new Set(targetAliases.flatMap(({ aliases }) => [...aliases]))
  const catalogByAlias = new Map<string, StoryVocabularyEntry>()
  for (const entry of vocabularyCatalog) {
    catalogByAlias.set(normalizeWord(entry.word), entry)
    catalogByAlias.set(normalizeWord(entry.lemma), entry)
  }
  const outOfLevel = new Map<string, { word: string; level: string }>()
  for (const { token, candidates } of tokenCandidates) {
    if (candidates.some((candidate) => targetAliasSet.has(candidate))) continue
    const entry = candidates.map((candidate) => catalogByAlias.get(candidate)).find(Boolean)
    if (entry && (levelRank[entry.level] ?? 0) > (levelRank[targetLevel] ?? 0))
      outOfLevel.set(entry.lemma, { word: token, level: entry.level })
  }
  const outOfLevelWords = [...outOfLevel.values()].sort((a, b) => a.word.localeCompare(b.word))

  const sentences = sentenceWordCounts(story)
  const totalSentenceWords = sentences.reduce((sum, sentence) => sum + sentence.count, 0)
  const averageSentenceLength = sentences.length ? totalSentenceWords / sentences.length : 0
  const maxSentenceLength = Math.max(0, ...sentences.map((sentence) => sentence.count))
  const nonTargetTokens = tokenCandidates.filter(
    ({ candidates }) => !candidates.some((candidate) => targetAliasSet.has(candidate)),
  )
  const longWordCount = nonTargetTokens.filter(
    ({ token }) => token.replace(/[^a-z]/g, '').length >= 9,
  ).length
  const longWordRatio = nonTargetTokens.length ? longWordCount / nonTargetTokens.length : 0
  const limits = difficultyLimits[targetLevel] ?? difficultyLimits.B1
  const longParagraphIndexes = [
    ...new Set(
      sentences
        .filter((sentence) => sentence.count > limits.maxSentenceLength)
        .map((sentence) => sentence.paragraphIndex),
    ),
  ]
  const difficultyWithinRange =
    averageSentenceLength <= limits.averageSentenceLength &&
    maxSentenceLength <= limits.maxSentenceLength &&
    longWordRatio <= limits.longWordRatio

  const continuityRequired = Boolean(previousChoice)
  const continuityPassed =
    !continuityRequired || story.stateBefore.previousChoice === previousChoice
  const statePassed = Object.keys(story.stateAfter).length > 0
  const normalizedChoices = story.choices.map((choice) =>
    normalizedChoiceText(`${choice.title} ${choice.en} ${choice.continuationSummary}`),
  )
  const uniqueChoiceCount = new Set(normalizedChoices).size
  const summariesUnique =
    new Set(story.choices.map((choice) => normalizedChoiceText(choice.continuationSummary)))
      .size === story.choices.length
  const choicesPassed = uniqueChoiceCount === story.choices.length && summariesUnique

  const issues: StoryValidationIssue[] = []
  if (missing.length)
    issues.push({
      code: 'MISSING_TARGET_WORDS',
      message: `Story text is missing ${missing.length} target word(s).`,
      words: missing,
    })
  if (outOfLevelWords.length)
    issues.push({
      code: 'OUT_OF_LEVEL_WORDS',
      message: `Story uses ${outOfLevelWords.length} catalog word(s) above ${targetLevel}.`,
      words: outOfLevelWords.map((item) => item.word),
    })
  if (!difficultyWithinRange)
    issues.push({
      code: 'DIFFICULTY_TOO_HIGH',
      message: `Story sentence or word complexity is above the ${targetLevel} limit.`,
      paragraphIndexes: longParagraphIndexes,
    })
  if (!continuityPassed)
    issues.push({
      code: 'CONTINUITY_MISMATCH',
      message: 'stateBefore.previousChoice does not match the selected previous choice.',
    })
  if (!statePassed)
    issues.push({
      code: 'EMPTY_STORY_STATE',
      message: 'stateAfter must preserve story continuity.',
    })
  if (!choicesPassed)
    issues.push({
      code: 'DUPLICATE_CHOICES',
      message: 'The three plot choices must lead to distinct continuations.',
    })

  return {
    passed: issues.length === 0,
    targetWords: { total: targetWords.length, covered, missing },
    outOfLevelWords,
    difficulty: {
      targetLevel,
      sentenceCount: sentences.length,
      averageSentenceLength: round(averageSentenceLength),
      maxSentenceLength,
      longWordRatio: round(longWordRatio),
      withinRange: difficultyWithinRange,
    },
    continuity: { required: continuityRequired, passed: continuityPassed, previousChoice },
    choices: { passed: choicesPassed, uniqueChoiceCount },
    issues,
  }
}

export function buildStoryRepairPrompt(input: {
  originalPrompt: string
  story: GeneratedStory
  report: StoryValidationReport
}) {
  const affectedParagraphs = [
    ...new Set(input.report.issues.flatMap((issue) => issue.paragraphIndexes ?? [])),
  ]
  return `${input.originalPrompt}\n\nThe draft failed deterministic validation. Rewrite only the affected English sentences or choices when possible, but return the complete bilingual story JSON. Preserve valid plot details and choice IDs. Ensure every target word appears naturally in paragraphs, remove words above the requested CEFR level unless they are target words, keep sentences short, copy previousChoice exactly into stateBefore.previousChoice, and keep three genuinely different choices.\nValidation issues: ${JSON.stringify(input.report.issues)}\nAffected paragraph indexes (zero based): ${JSON.stringify(affectedParagraphs)}\nDraft JSON: ${JSON.stringify(input.story)}`
}

export function parseStoredValidationReport(value: unknown): StoryValidationReport | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const report = value as Partial<StoryValidationReport>
  if (
    typeof report.passed !== 'boolean' ||
    !report.targetWords ||
    !Array.isArray(report.targetWords.covered) ||
    !Array.isArray(report.targetWords.missing) ||
    !report.difficulty ||
    !report.continuity ||
    !report.choices ||
    !Array.isArray(report.issues)
  )
    return null
  return report as StoryValidationReport
}
