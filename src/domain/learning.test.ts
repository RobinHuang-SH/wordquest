import { describe, expect, it } from 'vitest'
import { todayWords } from '../data'
import { makeState } from '../test/factories'
import { getQuizScore, getReviewCount, getSessionWords, quizQuestions } from './learning'

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

  it('always returns exactly twenty words with the requested review split', () => {
    const words = getSessionWords(makeState({ wordMix: '10+10' }))
    expect(words).toHaveLength(20)
    expect(words.filter((word) => word.review)).toHaveLength(10)
    expect(new Set(words.map((word) => word.word))).toHaveLength(20)
  })
})
