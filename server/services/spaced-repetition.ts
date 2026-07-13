export type ReviewRating = 'KNOW' | 'FUZZY' | 'UNKNOWN'
export type WordSchedule = {
  status: 'LEARNING' | 'REVIEW' | 'MASTERED'
  memoryScore: number
  easeFactor: number
  reviewIntervalDays: number
  lapseCount: number
  timesSeen: number
  timesCorrect: number
  nextReviewAt: Date
  lastReviewedAt: Date
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export function scheduleReview(
  current: {
    memoryScore: number
    easeFactor: number
    reviewIntervalDays: number
    lapseCount: number
    timesSeen: number
    timesCorrect: number
  },
  input: {
    rating: ReviewRating
    reviewedAt?: Date
    quizCorrect?: boolean
    pronunciationScore?: number
  },
): WordSchedule {
  const reviewedAt = input.reviewedAt ?? new Date()
  let rating = input.rating
  if (input.quizCorrect === false && rating === 'KNOW') rating = 'FUZZY'
  if (input.pronunciationScore !== undefined && input.pronunciationScore < 55 && rating === 'KNOW')
    rating = 'FUZZY'

  let easeFactor = current.easeFactor || 2.5
  let interval = current.reviewIntervalDays || 0
  let lapseCount = current.lapseCount
  let memoryScore = current.memoryScore

  if (rating === 'KNOW') {
    interval =
      interval <= 0 ? 1 : interval === 1 ? 3 : Math.max(4, Math.round(interval * easeFactor))
    easeFactor = clamp(easeFactor + 0.08, 1.3, 3)
    memoryScore = clamp(memoryScore + (input.quizCorrect === true ? 18 : 14), 0, 100)
  } else if (rating === 'FUZZY') {
    interval = Math.max(1, Math.round(Math.max(interval, 1) * 0.6))
    easeFactor = clamp(easeFactor - 0.15, 1.3, 3)
    memoryScore = clamp(memoryScore - 6, 0, 100)
  } else {
    interval = 1
    easeFactor = clamp(easeFactor - 0.25, 1.3, 3)
    memoryScore = clamp(memoryScore - 20, 0, 100)
    lapseCount += 1
  }

  const pronunciationPenalty =
    input.pronunciationScore === undefined ? 0 : Math.max(0, 60 - input.pronunciationScore) * 0.15
  memoryScore = clamp(Math.round(memoryScore - pronunciationPenalty), 0, 100)
  const nextReviewAt = new Date(reviewedAt)
  nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + interval)

  return {
    status:
      memoryScore >= 85 && interval >= 14 ? 'MASTERED' : rating === 'KNOW' ? 'LEARNING' : 'REVIEW',
    memoryScore,
    easeFactor,
    reviewIntervalDays: interval,
    lapseCount,
    timesSeen: current.timesSeen + 1,
    timesCorrect: current.timesCorrect + (rating === 'KNOW' && input.quizCorrect !== false ? 1 : 0),
    nextReviewAt,
    lastReviewedAt: reviewedAt,
  }
}

export function reviewPriority(
  input: {
    memoryScore: number
    pronunciationScore: number
    spellingScore: number
    listeningScore: number
    lapseCount: number
    nextReviewAt: Date | null
  },
  now = new Date(),
) {
  const overdueDays = input.nextReviewAt
    ? Math.max(0, Math.floor((now.getTime() - input.nextReviewAt.getTime()) / 86_400_000))
    : 0
  const memoryWeakness = 100 - input.memoryScore
  const pronunciationWeakness = 100 - input.pronunciationScore
  const spellingWeakness = 100 - input.spellingScore
  const listeningWeakness = 100 - input.listeningScore
  return (
    overdueDays * 100 +
    memoryWeakness * 2 +
    pronunciationWeakness * 0.8 +
    spellingWeakness * 0.4 +
    listeningWeakness * 0.4 +
    input.lapseCount * 25
  )
}

export function reviewTarget(mix: '20+0' | '15+5' | '10+10' | 'dynamic', dueCount: number) {
  if (mix === '20+0') return 0
  if (mix === '10+10') return 10
  if (mix === 'dynamic') return dueCount >= 8 ? 10 : Math.min(5, dueCount)
  return 5
}
