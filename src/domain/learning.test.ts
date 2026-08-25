import { describe, expect, it } from 'vitest'
import { todayWords } from '../data'
import { makeState } from '../test/factories'
import {
  getQuizQuestions,
  getQuizScore,
  getNewWords,
  getReviewWords,
  getReviewCount,
  getSessionWords,
  quizQuestions,
} from './learning'

describe('quiz scoring', () => {
  it('scores five correct answers as 100', () => {
    const answers = Object.fromEntries(
      quizQuestions.map((question, index) => [index, question.answer]),
    )
    expect(getQuizScore(answers)).toBe(100)
  })

  it('scores partial answers in twenty-point increments', () => {
    expect(getQuizScore({ 0: quizQuestions[0].answer, 2: quizQuestions[2].answer })).toBe(40)
  })

  it('ignores wrong and out-of-range answers', () => {
    expect(getQuizScore({ 0: 'wrong', 99: 'anything' })).toBe(0)
  })

  it('builds the quiz from an active server-generated word plan', () => {
    const words = todayWords.slice(0, 5).map((word, index) => ({
      ...word,
      id: `word-${index}`,
      word: `adaptive-${index}`,
      meaning: `动态释义 ${index}`,
    }))
    const state = makeState({
      dailyWordPlan: {
        sessionId: 'session-1',
        date: '2026-07-12',
        batch: 1,
        mix: 'dynamic',
        words,
        newCount: 5,
        reviewCount: 0,
      },
    })

    const questions = getQuizQuestions(state)
    expect(questions).toHaveLength(5)
    expect(questions.map((question) => question.word)).toEqual(words.map((word) => word.word))
    expect(getQuizScore({ 0: questions[0].answer }, questions)).toBe(20)
  })
})

describe('session word selection', () => {
  it.each([
    ['20+0', 0],
    ['15+5', 5],
    ['10+10', 10],
  ] as const)('uses the configured %s review count', (wordMix, expected) => {
    expect(getReviewCount(makeState({ wordMix }))).toBe(expected)
  })

  it('uses five or ten dynamic review words based on weak vocabulary', () => {
    expect(getReviewCount(makeState({ wordMix: 'dynamic', learned: { discover: 'new' } }))).toBe(5)
    expect(
      getReviewCount(
        makeState({
          wordMix: 'dynamic',
          learned: Object.fromEntries(todayWords.slice(0, 6).map((word) => [word.word, 'fuzzy'])),
        }),
      ),
    ).toBe(10)
  })

  it('does not reuse the fixed demo list before an authenticated plan arrives', () => {
    const words = getSessionWords(makeState({ wordMix: '10+10' }))
    expect(words).toEqual([])
  })

  it('prefers a server-generated plan for the active date', () => {
    const serverWord = { ...todayWords[0], id: 'word-1', word: 'observe', review: true }
    const state = makeState({
      dailyWordPlan: {
        sessionId: 'session-1',
        date: '2026-07-12',
        batch: 1,
        mix: 'dynamic',
        words: [serverWord],
        newCount: 0,
        reviewCount: 1,
      },
    })

    expect(getSessionWords(state)).toEqual([serverWord])
    expect(getReviewCount(state)).toBe(1)
    expect(getNewWords(state)).toEqual([])
    expect(getReviewWords(state)).toEqual([serverWord])
  })

  it('ignores a stale server plan after the active date changes', () => {
    const state = makeState({
      activeDate: '2026-07-13',
      dailyWordPlan: {
        sessionId: 'session-1',
        date: '2026-07-12',
        batch: 1,
        mix: '15+5',
        words: [{ ...todayWords[0], word: 'stale' }],
        newCount: 15,
        reviewCount: 5,
      },
    })

    expect(getSessionWords(state)).toEqual([])
  })
})
