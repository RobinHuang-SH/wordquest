import type { Word } from '../data'
import type { AppState } from './models'

export const quizQuestions = [
  {
    word: 'discover',
    q: 'discover 的正确含义是？',
    options: ['隐藏', '发现', '承诺', '保护'],
    answer: '发现',
  },
  {
    word: 'courage',
    q: '“勇气” 对应哪个单词？',
    options: ['courage', 'careful', 'journey', 'entrance'],
    answer: 'courage',
  },
  {
    word: 'signal',
    q: 'A blue light sent a _____.',
    options: ['shadow', 'promise', 'signal', 'path'],
    answer: 'signal',
  },
  {
    word: 'whisper',
    q: '选择最符合 “speak very quietly” 的单词',
    options: ['escape', 'decide', 'glow', 'whisper'],
    answer: 'whisper',
  },
  {
    word: 'ancient',
    q: 'An _____ map lay on the table.',
    options: ['ancient', 'careful', 'hidden', 'strange'],
    answer: 'ancient',
  },
]

export type QuizQuestion = (typeof quizQuestions)[number]

export function getQuizQuestions(state: LearningState): QuizQuestion[] {
  const words = getNewWords(state)
  if (!isActivePlan(state) || !words.length) return quizQuestions

  const fallbackOptions = ['其他含义', '尚未学习', '以上都不是']
  return words.slice(0, 5).map((word, index) => {
    const choices = [
      word.meaning,
      ...words
        .filter((candidate) => candidate.word !== word.word)
        .map((candidate) => candidate.meaning),
      ...fallbackOptions,
    ].filter((value, optionIndex, values) => values.indexOf(value) === optionIndex)
    const options = choices.slice(0, 4)
    const shift = index % options.length
    return {
      word: word.word,
      q: `${word.word} 的正确含义是？`,
      options: [...options.slice(shift), ...options.slice(0, shift)],
      answer: word.meaning,
    }
  })
}

export function getQuizScore(
  answers: Record<number, string>,
  questions: QuizQuestion[] = quizQuestions,
) {
  const correct = Object.entries(answers).filter(
    ([index, answer]) => questions[+index]?.answer === answer,
  ).length
  return questions.length ? Math.round((correct / questions.length) * 100) : 0
}

type LearningState = Pick<
  AppState,
  'wordMix' | 'learned' | 'activeDate' | 'activeBatch' | 'dailyWordPlan'
>

const isActivePlan = (state: LearningState) =>
  state.dailyWordPlan?.date === state.activeDate && state.dailyWordPlan.batch === state.activeBatch

export function getReviewCount(state: LearningState) {
  if (isActivePlan(state)) return state.dailyWordPlan!.reviewCount
  if (state.wordMix === '20+0') return 0
  if (state.wordMix === '10+10') return 10
  if (state.wordMix === 'dynamic') {
    const weakCount = Object.values(state.learned).filter(
      (value) => value === 'new' || value === 'fuzzy',
    ).length
    return weakCount >= 6 ? 10 : 5
  }
  return 5
}

export function getSessionWords(state: LearningState): Word[] {
  if (isActivePlan(state)) return state.dailyWordPlan!.words
  return []
}

export function getNewWords(state: LearningState): Word[] {
  return getSessionWords(state).filter((word) => !word.review)
}

export function getReviewWords(state: LearningState): Word[] {
  return getSessionWords(state).filter((word) => word.review)
}

export function getLearnedNewWordCount(state: LearningState) {
  return getNewWords(state).filter((word) => Boolean(state.learned[word.word])).length
}
