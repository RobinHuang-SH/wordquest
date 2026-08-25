import type { PrismaClient } from '../generated/prisma/client.js'
import {
  EnglishLevel,
  LearningResult,
  QuizResult,
  SessionStatus,
  SessionWordType,
  UserWordStatus,
} from '../generated/prisma/enums.js'
import type { DailyPlan, VocabularyService, WordReviewInput } from './contracts.js'
import { ApiError } from './api-error.js'
import { reviewPriority, reviewTarget, scheduleReview } from './spaced-repetition.js'
import type { StoryModelClient } from './story-model-client.js'
import { generateVocabularyBatch } from './vocabulary-generator.js'

const levelOrder = [
  EnglishLevel.A1,
  EnglishLevel.A2,
  EnglishLevel.B1,
  EnglishLevel.B2,
  EnglishLevel.C1,
  EnglishLevel.C2,
] as const
const dateKeyInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
const dateAtUtcMidnight = (date: string) => {
  const value = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(value.getTime())) throw new ApiError(400, 'INVALID_DATE', 'Invalid session date')
  return value
}

export class PrismaVocabularyService implements VocabularyService {
  constructor(
    private prisma: PrismaClient,
    private modelClient: StoryModelClient | null = null,
    private generationTimeoutMs = 60_000,
  ) {}

  private async loadUnseenWords(
    userId: string,
    allowedLevels: readonly EnglishLevel[],
    count: number,
  ) {
    let words = await this.prisma.vocabulary.findMany({
      where: { level: { in: [...allowedLevels] }, userStates: { none: { userId } } },
      orderBy: [{ frequencyRank: 'asc' }, { word: 'asc' }],
      take: count,
    })
    for (let attempt = 0; words.length < count && this.modelClient && attempt < 2; attempt += 1) {
      const existing = await this.prisma.vocabulary.findMany({ select: { word: true } })
      const generated = await generateVocabularyBatch(this.modelClient, {
        targetLevel: allowedLevels.at(-1) ?? 'A2',
        count: Math.max(20, count - words.length),
        excludedWords: existing.map((item) => item.word),
        timeoutMs: this.generationTimeoutMs,
      })
      if (!generated.length) break
      await this.prisma.vocabulary.createMany({
        data: generated.map((word) => ({
          ...word,
          sourceName: 'agnes-generated',
          sourceLicense: 'ai-generated',
          collection: 'adaptive-daily',
        })),
        skipDuplicates: true,
      })
      words = await this.prisma.vocabulary.findMany({
        where: { level: { in: [...allowedLevels] }, userStates: { none: { userId } } },
        orderBy: [{ frequencyRank: 'asc' }, { word: 'asc' }],
        take: count,
      })
    }
    if (words.length < count)
      throw new ApiError(
        503,
        'VOCABULARY_POOL_EXHAUSTED',
        `Only ${words.length} unseen words are available; ${count} are required`,
      )
    return words
  }

  async getDailyPlan(
    userId: string,
    input: {
      date: string
      batch?: number
      mix: '20+0' | '15+5' | '10+10' | 'dynamic'
    },
    transactionAttempt = 0,
  ): Promise<DailyPlan> {
    const sessionDate = dateAtUtcMidnight(input.date)
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')
    const today = dateKeyInTimeZone(new Date(), user.timezone)
    const batch = input.batch ?? 1
    if (!Number.isInteger(batch) || batch < 1)
      throw new ApiError(400, 'INVALID_BATCH', 'Batch must be a positive integer')
    if (input.date > today)
      throw new ApiError(400, 'FUTURE_SESSION_NOT_ALLOWED', 'Future study dates are not allowed')
    const reviewCutoff = new Date(sessionDate)
    reviewCutoff.setUTCDate(reviewCutoff.getUTCDate() + 1)
    reviewCutoff.setUTCMilliseconds(-1)
    const existing = await this.prisma.dailySession.findUnique({
      where: { userId_sessionDate_batchNumber: { userId, sessionDate, batchNumber: batch } },
      include: { words: { orderBy: { sequence: 'asc' }, include: { word: true } } },
    })
    const allowedLevels = levelOrder.slice(0, levelOrder.indexOf(user.targetLevel) + 1)
    if (existing) {
      const existingNewCount = existing.words.filter(
        (item) => item.wordType === SessionWordType.NEW,
      ).length
      if (existing.completedAt || existingNewCount >= user.dailyWordCount)
        return this.toPlan(existing, input.date, batch)
      const missing = user.dailyWordCount - existingNewCount
      const additionalWords = await this.loadUnseenWords(userId, allowedLevels, missing)
      try {
        const upgraded = await this.prisma.$transaction(
          async (tx) => {
            const current = await tx.dailySession.findUniqueOrThrow({
              where: { id: existing.id },
              include: { words: { orderBy: { sequence: 'asc' }, include: { word: true } } },
            })
            const currentNewCount = current.words.filter(
              (item) => item.wordType === SessionWordType.NEW,
            ).length
            const needed = Math.max(0, user.dailyWordCount - currentNewCount)
            let sequence = current.words.at(-1)?.sequence ?? 0
            for (const word of additionalWords.slice(0, needed)) {
              sequence += 1
              await tx.dailySessionWord.create({
                data: {
                  sessionId: current.id,
                  wordId: word.id,
                  sequence,
                  wordType: SessionWordType.NEW,
                },
              })
              await tx.userWordState.create({
                data: { userId, wordId: word.id, status: UserWordStatus.LEARNING, timesSeen: 0 },
              })
            }
            await tx.dailySession.update({
              where: { id: current.id },
              data: { newWordCount: currentNewCount + needed },
            })
            return tx.dailySession.findUniqueOrThrow({
              where: { id: current.id },
              include: { words: { orderBy: { sequence: 'asc' }, include: { word: true } } },
            })
          },
          { isolationLevel: 'Serializable' },
        )
        return this.toPlan(upgraded, input.date, batch)
      } catch (error) {
        const code =
          error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined
        if (transactionAttempt < 2 && (code === 'P2002' || code === 'P2034'))
          return this.getDailyPlan(userId, input, transactionAttempt + 1)
        throw error
      }
    }

    const dueStates = await this.prisma.userWordState.findMany({
      where: { userId, nextReviewAt: { lte: reviewCutoff } },
      include: { word: true },
      take: 100,
    })
    dueStates.sort((a, b) => reviewPriority(b, reviewCutoff) - reviewPriority(a, reviewCutoff))
    const desiredReviews = reviewTarget(input.mix, dueStates.length)
    const selectedReviews = dueStates.slice(0, desiredReviews)
    const newWords = await this.loadUnseenWords(userId, allowedLevels, user.dailyWordCount)

    let session
    try {
      session = await this.prisma.$transaction(
        async (tx) => {
          const created = await tx.dailySession.create({
            data: {
              userId,
              sessionDate,
              batchNumber: batch,
              status: SessionStatus.GENERATED,
              newWordCount: newWords.length,
              reviewWordCount: selectedReviews.length,
            },
          })
          const entries = [
            ...newWords.map((word) => ({ word, type: SessionWordType.NEW })),
            ...selectedReviews.map((item) => ({ word: item.word, type: SessionWordType.REVIEW })),
          ]
          for (const [index, entry] of entries.entries()) {
            await tx.dailySessionWord.create({
              data: {
                sessionId: created.id,
                wordId: entry.word.id,
                sequence: index + 1,
                wordType: entry.type,
              },
            })
            if (entry.type === SessionWordType.NEW)
              await tx.userWordState.create({
                data: {
                  userId,
                  wordId: entry.word.id,
                  status: UserWordStatus.LEARNING,
                  timesSeen: 0,
                },
              })
          }
          return tx.dailySession.findUniqueOrThrow({
            where: { id: created.id },
            include: { words: { orderBy: { sequence: 'asc' }, include: { word: true } } },
          })
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined
      if (transactionAttempt < 2 && (code === 'P2002' || code === 'P2034'))
        return this.getDailyPlan(userId, input, transactionAttempt + 1)
      throw error
    }
    return this.toPlan(session, input.date, batch)
  }

  async reviewWord(userId: string, wordId: string, input: WordReviewInput) {
    const current = await this.prisma.userWordState.findUnique({
      where: { userId_wordId: { userId, wordId } },
    })
    if (!current)
      throw new ApiError(404, 'WORD_STATE_NOT_FOUND', 'Word state not found for this user')
    const schedule = scheduleReview(current, {
      rating: input.result,
      quizCorrect: input.quizCorrect,
      pronunciationScore: input.pronunciationScore,
    })
    const updated = await this.prisma.userWordState.update({
      where: { id: current.id },
      data: {
        ...schedule,
        status: UserWordStatus[schedule.status],
        pronunciationScore:
          input.pronunciationScore === undefined
            ? current.pronunciationScore
            : Math.round(current.pronunciationScore * 0.6 + input.pronunciationScore * 0.4),
      },
    })
    if (input.sessionId)
      await this.prisma.dailySessionWord.updateMany({
        where: { sessionId: input.sessionId, wordId, session: { userId } },
        data: {
          learningResult: LearningResult[input.result],
          quizResult:
            input.quizCorrect === undefined
              ? QuizResult.SKIPPED
              : input.quizCorrect
                ? QuizResult.CORRECT
                : QuizResult.INCORRECT,
          pronunciationScore: input.pronunciationScore,
        },
      })
    return {
      wordId,
      status: updated.status,
      memoryScore: updated.memoryScore,
      nextReviewAt: updated.nextReviewAt?.toISOString() ?? null,
      reviewIntervalDays: updated.reviewIntervalDays,
      lapseCount: updated.lapseCount,
    }
  }

  private toPlan(
    session: {
      id: string
      status: string
      newWordCount: number
      reviewWordCount: number
      words: Array<{
        wordType: string
        word: {
          id: string
          word: string
          phoneticUs: string | null
          partOfSpeech: string
          meaningZh: string
          definitionEn: string
          exampleSentence: string
          level: string
          sourceName: string
          sourceLicense: string
        }
      }>
    },
    date: string,
    batch: number,
  ): DailyPlan {
    const orderedWords = [...session.words].sort(
      (left, right) =>
        Number(left.wordType === SessionWordType.REVIEW) -
        Number(right.wordType === SessionWordType.REVIEW),
    )
    return {
      sessionId: session.id,
      date,
      batch,
      status: session.status,
      newCount: session.newWordCount,
      reviewCount: session.reviewWordCount,
      words: orderedWords.map((item) => ({
        id: item.word.id,
        word: item.word.word,
        phonetic: item.word.phoneticUs ?? '',
        pos: item.word.partOfSpeech,
        meaning: item.word.meaningZh,
        definition: item.word.definitionEn,
        example: item.word.exampleSentence,
        level: item.word.level,
        review: item.wordType === SessionWordType.REVIEW,
        sourceName: item.word.sourceName,
        sourceLicense: item.word.sourceLicense,
      })),
    }
  }
}
