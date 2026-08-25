export type StoryParagraph = { en: string; zh: string }
export type GeneratedStoryChoice = {
  id: string
  title: string
  en: string
  hint: string
  continuationSummary: string
}
export type GeneratedStory = {
  title: string
  titleZh: string
  summary: string
  paragraphs: StoryParagraph[]
  choices: GeneratedStoryChoice[]
  stateBefore: Record<string, unknown>
  stateAfter: Record<string, unknown>
  vocabularyCoverage: string[]
}

const storyStateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['previousChoice', 'location', 'characters', 'openThreads'],
  properties: {
    previousChoice: { type: ['string', 'null'] },
    location: { type: 'string' },
    characters: { type: 'array', items: { type: 'string' } },
    openThreads: { type: 'array', items: { type: 'string' } },
  },
} as const

export const generatedStoryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'titleZh',
    'summary',
    'paragraphs',
    'choices',
    'stateBefore',
    'stateAfter',
    'vocabularyCoverage',
  ],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    titleZh: { type: 'string', minLength: 1, maxLength: 200 },
    summary: { type: 'string', minLength: 1, maxLength: 1000 },
    paragraphs: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['en', 'zh'],
        properties: {
          en: { type: 'string', minLength: 1 },
          zh: { type: 'string', minLength: 1 },
        },
      },
    },
    choices: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'en', 'hint', 'continuationSummary'],
        properties: {
          id: { type: 'string', pattern: '^[a-z0-9-]{1,50}$' },
          title: { type: 'string', minLength: 1, maxLength: 100 },
          en: { type: 'string', minLength: 1, maxLength: 160 },
          hint: { type: 'string', minLength: 1, maxLength: 200 },
          continuationSummary: { type: 'string', minLength: 1, maxLength: 500 },
        },
      },
    },
    stateBefore: storyStateSchema,
    stateAfter: storyStateSchema,
    vocabularyCoverage: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
    },
  },
} as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown, max = Number.POSITIVE_INFINITY) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max

export function parseGeneratedStory(value: unknown): GeneratedStory {
  if (!isRecord(value)) throw new Error('Story output must be an object')
  if (!isText(value.title, 200) || !isText(value.titleZh, 200) || !isText(value.summary, 1000))
    throw new Error('Story title, translated title, or summary is invalid')
  if (
    !Array.isArray(value.paragraphs) ||
    value.paragraphs.length < 1 ||
    value.paragraphs.length > 8
  )
    throw new Error('Story must contain between one and eight paragraphs')
  const paragraphs = value.paragraphs.map((item) => {
    if (!isRecord(item) || !isText(item.en) || !isText(item.zh))
      throw new Error('Each paragraph must contain English and Chinese text')
    return { en: item.en as string, zh: item.zh as string }
  })
  if (!Array.isArray(value.choices) || value.choices.length !== 3)
    throw new Error('Story must contain exactly three choices')
  const choices = value.choices.map((item) => {
    if (
      !isRecord(item) ||
      !isText(item.id, 50) ||
      !/^[a-z0-9-]+$/.test(item.id as string) ||
      !isText(item.title, 100) ||
      !isText(item.en, 160) ||
      !isText(item.hint, 200) ||
      !isText(item.continuationSummary, 500)
    )
      throw new Error('Story choice does not match the fixed schema')
    return {
      id: item.id as string,
      title: item.title as string,
      en: item.en as string,
      hint: item.hint as string,
      continuationSummary: item.continuationSummary as string,
    }
  })
  if (new Set(choices.map((choice) => choice.id)).size !== choices.length)
    throw new Error('Story choice IDs must be unique')
  if (!isRecord(value.stateBefore) || !isRecord(value.stateAfter))
    throw new Error('Story state must be an object')
  if (
    !Array.isArray(value.vocabularyCoverage) ||
    !value.vocabularyCoverage.every((item) => isText(item))
  )
    throw new Error('Vocabulary coverage must be a string array')
  return {
    title: value.title as string,
    titleZh: value.titleZh as string,
    summary: value.summary as string,
    paragraphs,
    choices,
    stateBefore: value.stateBefore,
    stateAfter: value.stateAfter,
    vocabularyCoverage: [...new Set(value.vocabularyCoverage as string[])],
  }
}
