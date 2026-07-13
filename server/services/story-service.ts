import type { Prisma, PrismaClient } from '../generated/prisma/client.js'
import { StoryGenerationStatus, StorySeriesStatus } from '../generated/prisma/enums.js'
import type { StoryDocument, StoryLength, StoryService } from './contracts.js'
import {
  generatedStoryJsonSchema,
  parseGeneratedStory,
  type GeneratedStory,
} from './story-schema.js'
import { StoryModelError, type StoryModelClient } from './story-model-client.js'
import { ApiError } from './api-error.js'

const PROMPT_KEY = 'daily-interactive-story'
const PROMPT_VERSION = 1
const SYSTEM_PROMPT = `You create safe, encouraging bilingual interactive stories for English learners. Return only JSON that matches the supplied schema. Use all target vocabulary naturally, keep language at the requested CEFR level, provide exactly three choices, and never include markdown.`
const USER_PROMPT_TEMPLATE = `Create a {length} {genre} story for a {level} learner. Target words: {targetWords}. Previous choice: {previousChoice}. Continue the existing story state when supplied.`

export class SlidingWindowRateLimiter {
  private events = new Map<string, number[]>()
  constructor(
    private limit: number,
    private windowMs = 60_000,
    private now: () => number = Date.now,
  ) {}
  tryConsume(key: string) {
    const cutoff = this.now() - this.windowMs
    const recent = (this.events.get(key) ?? []).filter((time) => time > cutoff)
    if (recent.length >= this.limit) {
      this.events.set(key, recent)
      return false
    }
    recent.push(this.now())
    this.events.set(key, recent)
    return true
  }
}

type StoryServiceOptions = {
  timeoutMs: number
  maxRetries: number
  rateLimitPerMinute: number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

function renderPrompt(input: {
  length: StoryLength
  genre: string
  level: string
  targetWords: string[]
  previousChoice?: string
}) {
  return USER_PROMPT_TEMPLATE.replace('{length}', input.length)
    .replace('{genre}', input.genre)
    .replace('{level}', input.level)
    .replace('{targetWords}', input.targetWords.join(', '))
    .replace('{previousChoice}', input.previousChoice || 'none')
}

function fallbackStory(targetWords: string[], previousChoice?: string): GeneratedStory {
  const words = targetWords.length ? targetWords : ['discover', 'path', 'courage']
  const chunks = Array.from(
    { length: Math.min(4, Math.max(1, Math.ceil(words.length / 5))) },
    (_, i) => words.slice(i * 5, i * 5 + 5),
  ).filter((chunk) => chunk.length)
  return {
    title: 'The Lantern Map',
    titleZh: 'Lantern Map',
    summary: 'Mia follows a glowing map and reaches a chamber with three possible paths.',
    paragraphs: chunks.map((chunk, index) => ({
      en: `${index === 0 ? 'At sunrise, Mia opened a glowing map.' : 'The map led Mia deeper into the old station.'} The clues marked ${chunk.join(', ')}. She read every clue carefully and moved forward with her friend Leo.`,
      zh: `${index === 0 ? 'Mia opens a glowing map at sunrise. ' : 'The map leads Mia deeper into the station. '}She reads every clue and continues with Leo.`,
    })),
    choices: [
      {
        id: 'follow-light',
        title: 'Follow the light',
        en: 'Follow the blue light',
        hint: 'Find where the map receives its signal',
        continuationSummary: 'Mia follows the blue light into a hidden chamber.',
      },
      {
        id: 'study-map',
        title: 'Study the map',
        en: 'Study the map',
        hint: 'Decode the symbols before moving on',
        continuationSummary: 'Mia pauses to decode the map and discovers a warning.',
      },
      {
        id: 'ask-keeper',
        title: 'Find the keeper',
        en: 'Find the station keeper',
        hint: 'Ask who created the glowing route',
        continuationSummary: 'Mia searches for the keeper who knows the station history.',
      },
    ],
    stateBefore: previousChoice ? { previousChoice } : {},
    stateAfter: { location: 'map chamber', openThreads: ['the glowing map', 'the station keeper'] },
    vocabularyCoverage: words,
  }
}

export class PrismaStoryService implements StoryService {
  private limiter: SlidingWindowRateLimiter
  private sleep: (ms: number) => Promise<void>
  private now: () => number

  constructor(
    private prisma: PrismaClient,
    private modelClient: StoryModelClient | null,
    private options: StoryServiceOptions,
  ) {
    this.now = options.now ?? Date.now
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.limiter = new SlidingWindowRateLimiter(options.rateLimitPerMinute, 60_000, this.now)
  }

  async getOrGenerate(
    userId: string,
    input: { sessionId: string; length: StoryLength; previousChoice?: string },
  ): Promise<StoryDocument> {
    const existing = await this.prisma.storyGeneration.findUnique({
      where: { sessionId: input.sessionId },
      include: { promptVersion: true, session: { select: { sessionDate: true } } },
    })
    if (existing) {
      if (existing.userId !== userId)
        throw new ApiError(404, 'SESSION_NOT_FOUND', 'Daily session not found')
      return this.toDocument(
        parseGeneratedStory(existing.responseJson),
        existing.sessionId,
        existing.storyNodeId ?? '',
        existing.session.sessionDate.toISOString().slice(0, 10),
        existing.status,
        existing.provider,
        existing.model,
        existing.promptVersion.version,
      )
    }

    const session = await this.prisma.dailySession.findFirst({
      where: { id: input.sessionId, userId },
      include: {
        user: true,
        words: { orderBy: { sequence: 'asc' }, include: { word: true } },
      },
    })
    if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Daily session not found')
    if (!session.words.length)
      throw new ApiError(409, 'SESSION_WORDS_REQUIRED', 'Generate the daily vocabulary plan first')

    const targetWords = session.words.map((item) => item.word.word)
    const request = {
      sessionId: session.id,
      date: session.sessionDate.toISOString().slice(0, 10),
      length: input.length,
      genre: session.user.storyGenre,
      level: session.user.targetLevel,
      targetWords,
      previousChoice: input.previousChoice,
    }
    const promptVersion = await this.prisma.storyPromptVersion.upsert({
      where: { promptKey_version: { promptKey: PROMPT_KEY, version: PROMPT_VERSION } },
      update: { isActive: true },
      create: {
        promptKey: PROMPT_KEY,
        version: PROMPT_VERSION,
        systemPrompt: SYSTEM_PROMPT,
        userPromptTemplate: USER_PROMPT_TEMPLATE,
        schemaJson: generatedStoryJsonSchema as Prisma.InputJsonValue,
      },
    })

    const started = this.now()
    let story: GeneratedStory | undefined
    let provider = 'wordquest'
    let model = 'deterministic-fallback-v1'
    let status: StoryGenerationStatus = StoryGenerationStatus.FALLBACK
    let fallbackReason: string | undefined
    let errorMessage: string | undefined
    let attemptCount = 0

    if (!this.modelClient) fallbackReason = 'LLM_NOT_CONFIGURED'
    else if (!this.limiter.tryConsume(userId)) fallbackReason = 'RATE_LIMITED'
    else {
      for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
        attemptCount += 1
        try {
          const result = await this.modelClient.generate({
            systemPrompt: SYSTEM_PROMPT,
            userPrompt: renderPrompt(request),
            schema: generatedStoryJsonSchema,
            timeoutMs: this.options.timeoutMs,
          })
          story = parseGeneratedStory(result.value)
          provider = result.provider
          model = result.model
          status = StoryGenerationStatus.SUCCESS
          break
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : 'Unknown model error'
          const transient = error instanceof StoryModelError ? error.transient : false
          const retrySchemaOnce = !(error instanceof StoryModelError) && attempt === 0
          if (attempt >= this.options.maxRetries || (!transient && !retrySchemaOnce)) break
          await this.sleep(Math.min(1000, 100 * 2 ** attempt))
        }
      }
      if (!story) fallbackReason = 'MODEL_GENERATION_FAILED'
    }
    story ??= fallbackStory(targetWords, input.previousChoice)
    const validated = parseGeneratedStory(story)

    let series = await this.prisma.storySeries.findFirst({
      where: { userId, status: StorySeriesStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    })
    series ??= await this.prisma.storySeries.upsert({
      where: { userId_title: { userId, title: 'The Lantern Map' } },
      update: { status: StorySeriesStatus.ACTIVE },
      create: {
        userId,
        title: 'The Lantern Map',
        genre: session.user.storyGenre,
        level: session.user.targetLevel,
        storyBibleJson: validated.stateAfter as Prisma.InputJsonValue,
      },
    })
    const previousSession = await this.prisma.dailySession.findFirst({
      where: { userId, sessionDate: { lt: session.sessionDate }, storyId: { not: null } },
      orderBy: { sessionDate: 'desc' },
      select: { storyId: true },
    })
    const latencyMs = Math.max(0, this.now() - started)
    const saved = await this.prisma.$transaction(async (tx) => {
      const node = await tx.storyNode.create({
        data: {
          storySeriesId: series.id,
          sessionId: session.id,
          parentNodeId: previousSession?.storyId,
          title: validated.title,
          content: JSON.stringify(validated.paragraphs),
          summary: validated.summary,
          vocabularyCoverage: { covered: validated.vocabularyCoverage, total: targetWords.length },
          stateBeforeJson: validated.stateBefore as Prisma.InputJsonValue,
          stateAfterJson: validated.stateAfter as Prisma.InputJsonValue,
          choices: {
            create: validated.choices.map((choice, index) => ({
              sequence: index + 1,
              choiceText: choice.title,
              choiceSummary: choice.continuationSummary,
            })),
          },
        },
      })
      await tx.storyGeneration.create({
        data: {
          userId,
          sessionId: session.id,
          storyNodeId: node.id,
          promptVersionId: promptVersion.id,
          provider,
          model,
          status,
          attemptCount,
          latencyMs,
          fallbackReason,
          errorMessage,
          requestJson: request as Prisma.InputJsonValue,
          responseJson: validated as Prisma.InputJsonValue,
        },
      })
      await tx.dailySession.update({ where: { id: session.id }, data: { storyId: node.id } })
      return node
    })

    return this.toDocument(
      validated,
      session.id,
      saved.id,
      request.date,
      status,
      provider,
      model,
      promptVersion.version,
    )
  }

  private toDocument(
    story: GeneratedStory,
    sessionId: string,
    storyNodeId: string,
    date: string,
    status: 'SUCCESS' | 'FALLBACK',
    provider: string,
    model: string,
    promptVersion: number,
  ): StoryDocument {
    return {
      sessionId,
      storyNodeId,
      date,
      ...story,
      generation: { status, provider, model, promptVersion },
    }
  }
}
