import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeSession, makeState } from '../test/factories'
import {
  addDays,
  alignStudyDate,
  canStartNextBatch,
  completeDailySession,
  createDailySession,
  createWeeklyReport,
  getDateKey,
  getPreviousSession,
  getWeekDateKeys,
  resetForNewDay,
  startNextBatch,
} from './sessions'

afterEach(() => vi.useRealTimers())

describe('date helpers', () => {
  it('formats a local date key', () => {
    expect(getDateKey(new Date(2026, 6, 2, 23, 30))).toBe('2026-07-02')
  })

  it('adds days across month and year boundaries', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('returns a Monday-first week', () => {
    expect(getWeekDateKeys('2026-07-12')).toEqual([
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
    ])
  })
})

describe('daily sessions', () => {
  it('records counts from the active server plan and ignores stale learned words', () => {
    const words = [
      {
        id: 'word-1',
        word: 'observe',
        phonetic: '/əbˈzɜːrv/',
        pos: 'v.',
        meaning: '观察',
        definition: 'to watch carefully',
        example: 'Mia observed the signal.',
        exampleZh: '米娅观察了信号。',
        collocations: [],
        level: 'A2',
        review: false,
      },
      {
        id: 'word-2',
        word: 'return',
        phonetic: '/rɪˈtɜːrn/',
        pos: 'v.',
        meaning: '返回',
        definition: 'to go back',
        example: 'They returned home.',
        exampleZh: '他们回家了。',
        collocations: [],
        level: 'A2',
        review: true,
      },
    ]
    const state = makeState({
      learned: { observe: 'know', stale: 'fuzzy' },
      dailyWordPlan: {
        sessionId: 'session-1',
        date: '2026-07-12',
        batch: 1,
        mix: 'dynamic',
        words,
        newCount: 1,
        reviewCount: 1,
      },
    })

    expect(createDailySession(state, 'follow-light')).toMatchObject({
      learned: { observe: 'know' },
      learnedCount: 1,
      newCount: 1,
      reviewCount: 1,
    })
  })

  it('updates the same-day session while preserving its completion timestamp', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T14:00:00.000Z'))
    const existing = makeSession({ completedAt: '2026-07-12T08:00:00.000Z' })
    const state = makeState({ sessions: { '2026-07-12': existing } })

    const completed = completeDailySession(state, 'machine')

    expect(Object.keys(completed.sessions)).toEqual(['2026-07-12'])
    expect(completed.sessions['2026-07-12']).toMatchObject({
      storyChoice: 'machine',
      completedAt: existing.completedAt,
    })
  })

  it('resets daily progress on a new day but retains session history', () => {
    const session = makeSession({ date: '2026-07-11' })
    const state = makeState({
      activeDate: '2026-07-11',
      learned: { discover: 'know' },
      currentWord: 8,
      quizAnswers: { 0: '发现' },
      quizDone: true,
      storyChoice: 'underground',
      completed: true,
      sessions: { '2026-07-11': session },
    })

    const reset = resetForNewDay(state, '2026-07-12')

    expect(reset).toMatchObject({
      activeDate: '2026-07-12',
      learned: {},
      currentWord: 0,
      quizAnswers: {},
      quizDone: false,
      storyChoice: '',
      completed: false,
    })
    expect(reset.sessions['2026-07-11']).toEqual(session)
  })

  it('allows a completed learner to start unlimited groups on the same day', () => {
    const state = makeState({ activeDate: '2026-07-12', completed: true })

    expect(canStartNextBatch(state)).toBe(true)
    const second = startNextBatch(state)

    expect(second).toMatchObject({
      activeDate: '2026-07-12',
      activeBatch: 2,
      completed: false,
      learned: {},
      dailyWordPlan: null,
    })
    const third = startNextBatch({ ...second, completed: true })
    expect(third.activeBatch).toBe(3)
    expect(alignStudyDate(third, '2026-07-12')).toEqual(third)
  })

  it('restores the real calendar date and first group when the day changes', () => {
    const previous = makeState({
      activeDate: '2026-07-13',
      activeBatch: 4,
      completed: true,
    })

    expect(alignStudyDate(previous, '2026-07-12')).toMatchObject({
      activeDate: '2026-07-12',
      activeBatch: 1,
      completed: false,
    })
  })

  it('uses only the exact previous calendar day for story inheritance', () => {
    const older = makeSession({ date: '2026-07-10', storyChoice: 'shadow' })
    const yesterday = makeSession({ date: '2026-07-11', storyChoice: 'machine' })
    expect(
      getPreviousSession(makeState({ sessions: { '2026-07-10': older, '2026-07-11': yesterday } })),
    ).toEqual(yesterday)
    expect(getPreviousSession(makeState({ sessions: { '2026-07-10': older } }))).toBeUndefined()
  })

  it('builds weekly totals from real sessions', () => {
    const monday = makeSession({ date: '2026-07-06', learnedCount: 12 })
    const sunday = makeSession({ date: '2026-07-12', learnedCount: 20 })
    const outsideWeek = makeSession({ date: '2026-07-05', learnedCount: 99 })
    const report = createWeeklyReport(
      makeState({
        sessions: {
          '2026-07-05': outsideWeek,
          '2026-07-06': monday,
          '2026-07-12': sunday,
        },
      }),
    )

    expect(report).toMatchObject({
      startDate: '2026-07-06',
      endDate: '2026-07-12',
      learnedWords: 32,
      storyCount: 2,
    })
    expect(report.sessions).toEqual([monday, sunday])
  })
})
