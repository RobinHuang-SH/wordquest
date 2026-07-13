// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { reviewPriority, reviewTarget, scheduleReview } from './spaced-repetition.js'

const current = {
  memoryScore: 50,
  easeFactor: 2.5,
  reviewIntervalDays: 3,
  lapseCount: 0,
  timesSeen: 2,
  timesCorrect: 1,
}

describe('spaced repetition scheduling', () => {
  it('expands the interval after confident recall', () => {
    const next = scheduleReview(current, {
      rating: 'KNOW',
      quizCorrect: true,
      reviewedAt: new Date('2026-07-13T00:00:00Z'),
    })
    expect(next.reviewIntervalDays).toBeGreaterThan(3)
    expect(next.memoryScore).toBeGreaterThan(50)
    expect(next.timesCorrect).toBe(2)
  })
  it('resets forgotten words and records a lapse', () => {
    const next = scheduleReview(current, {
      rating: 'UNKNOWN',
      reviewedAt: new Date('2026-07-13T00:00:00Z'),
    })
    expect(next.reviewIntervalDays).toBe(1)
    expect(next.lapseCount).toBe(1)
    expect(next.status).toBe('REVIEW')
  })
  it('downgrades confident recall when quiz or pronunciation evidence is weak', () => {
    expect(
      scheduleReview(current, { rating: 'KNOW', quizCorrect: false }).reviewIntervalDays,
    ).toBeLessThanOrEqual(3)
    expect(
      scheduleReview(current, { rating: 'KNOW', pronunciationScore: 30 }).reviewIntervalDays,
    ).toBeLessThanOrEqual(3)
  })
  it('prioritizes overdue and pronunciation-weak words', () => {
    const strong = reviewPriority(
      {
        memoryScore: 90,
        pronunciationScore: 90,
        spellingScore: 90,
        listeningScore: 90,
        lapseCount: 0,
        nextReviewAt: new Date('2026-07-13'),
      },
      new Date('2026-07-13'),
    )
    const weak = reviewPriority(
      {
        memoryScore: 45,
        pronunciationScore: 30,
        spellingScore: 70,
        listeningScore: 70,
        lapseCount: 2,
        nextReviewAt: new Date('2026-07-10'),
      },
      new Date('2026-07-13'),
    )
    expect(weak).toBeGreaterThan(strong)
  })
  it('uses adaptive five or ten word review targets', () => {
    expect(reviewTarget('15+5', 20)).toBe(5)
    expect(reviewTarget('10+10', 20)).toBe(10)
    expect(reviewTarget('dynamic', 4)).toBe(4)
    expect(reviewTarget('dynamic', 12)).toBe(10)
  })
})
