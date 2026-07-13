import type { PrismaClient } from '../generated/prisma/client.js'
import {
  LearningResult,
  QuizResult,
  SessionStatus,
  SessionWordType,
  UserWordStatus,
} from '../generated/prisma/enums.js'
import type { DailyPlan, VocabularyService, WordReviewInput } from './contracts.js'
import { ApiError } from './api-error.js'
import { reviewPriority, reviewTarget, scheduleReview } from './spaced-repetition.js'

const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
const dateAtUtcMidnight = (date: string) => {
  const value = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(value.getTime())) throw new ApiError(400, 'INVALID_DATE', 'Invalid session date')
  return value
}

export class PrismaVocabularyService implements VocabularyService {
  constructor(private prisma: PrismaClient) {}

  async getDailyPlan(
    userId: string,
    input: { date: string; mix: '20+0' | '15+5' | '10+10' | 'dynamic' },
  ): Promise<DailyPlan> {
    const sessionDate = dateAtUtcMidnight(input.date)
    const reviewCutoff = new Date(sessionDate)
    reviewCutoff.setUTCDate(reviewCutoff.getUTCDate() + 1)
    reviewCutoff.setUTCMilliseconds(-1)
    const existing = await this.prisma.dailySession.findUnique({
      where: { userId_sessionDate: { userId, sessionDate } },
      include: { words: { orderBy: { sequence: 'asc' }, include: { word: true } } },
    })
    if (existing) return this.toPlan(existing, input.date)

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')
    const allowedLevels = levelOrder.slice(0, levelOrder.indexOf(user.targetLevel) + 1)
    const dueStates = await this.prisma.userWordState.findMany({
      where: { userId, nextReviewAt: { lte: reviewCutoff } },
      include: { word: true },
      take: 100,
    })
    dueStates.sort((a, b) => reviewPriority(b, reviewCutoff) - reviewPriority(a, reviewCutoff))
    const desiredReviews = Math.min(reviewTarget(input.mix, dueStates.length), user.dailyWordCount)
    const selectedReviews = dueStates.slice(0, desiredReviews)
    const newNeeded = user.dailyWordCount - selectedReviews.length
    const newWords = await this.prisma.vocabulary.findMany({
      where: { level: { in: allowedLevels }, userStates: { none: { userId } } },
      orderBy: [{ frequencyRank: 'asc' }, { word: 'asc' }],
      take: newNeeded,
    })
    const selectedIds = new Set([
      ...selectedReviews.map((item) => item.wordId),
      ...newWords.map((item) => item.id),
    ])
    const fallbackReviews =
      newWords.length < newNeeded
        ? (
            await this.prisma.userWordState.findMany({
              where: { userId, wordId: { notIn: [...selectedIds] } },
              include: { word: true },
              take: 100,
            })
          )
            .sort((a, b) => reviewPriority(b, reviewCutoff) - reviewPriority(a, reviewCutoff))
            .slice(0, newNeeded - newWords.length)
        : []

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dailySession.create({
        data: {
          userId,
          sessionDate,
          status: SessionStatus.GENERATED,
          newWordCount: newWords.length,
          reviewWordCount: selectedReviews.length + fallbackReviews.length,
        },
      })
      const entries = [
        ...selectedReviews.map((item) => ({ word: item.word, type: SessionWordType.REVIEW })),
        ...fallbackReviews.map((item) => ({ word: item.word, type: SessionWordType.REVIEW })),
        ...newWords.map((word) => ({ word, type: SessionWordType.NEW })),
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
            data: { userId, wordId: entry.word.id, status: UserWordStatus.LEARNING, timesSeen: 0 },
          })
      }
      return tx.dailySession.findUniqueOrThrow({
        where: { id: created.id },
        include: { words: { orderBy: { sequence: 'asc' }, include: { word: true } } },
      })
    })
    return this.toPlan(session, input.date)
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
  ): DailyPlan {
    return {
      sessionId: session.id,
      date,
      status: session.status,
      newCount: session.newWordCount,
      reviewCount: session.reviewWordCount,
      words: session.words.map((item) => ({
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
