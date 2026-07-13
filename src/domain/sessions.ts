import type { StoryLength } from '../data'
import type { AppState, DailySession, DailyMinutes, WeeklyReport } from './models'
import { getQuizScore, getReviewCount } from './learning'

export const storyLengthLabels: Record<
  StoryLength,
  { range: string; minutes: number; name: string }
> = {
  short: { range: '100—180 词', minutes: 1, name: '短篇' },
  medium: { range: '180—300 词', minutes: 2, name: '标准' },
  long: { range: '300—500 词', minutes: 4, name: '长篇' },
}

export const choiceContinuations: Record<string, { title: string; summary: string }> = {
  underground: {
    title: '地下通道仍在延伸',
    summary: '你昨天选择进入地下通道。蓝色信号沿着石壁闪烁，把米娅带向观测站更深处。',
  },
  machine: {
    title: '银色机器再次启动',
    summary: '你昨天选择返回研究机器。机器保存的第二段录音，成为今天冒险的新线索。',
  },
  shadow: {
    title: '森林黑影留下足迹',
    summary: '你昨天选择追踪森林黑影。清晨的新鲜足迹，一直延伸到旧观测站门前。',
  },
}

export const createInitialState = (): AppState => ({
  onboarded: false,
  displayName: 'Mia',
  level: 'A2',
  genre: '奇幻冒险',
  accent: '美式',
  learned: {},
  currentWord: 0,
  quizAnswers: {},
  quizDone: false,
  storyChoice: '',
  completed: false,
  streak: 7,
  wordMix: '15+5',
  storyLength: 'medium',
  dailyMinutes: 20,
  highContrast: false,
  reducedMotion: false,
  activeDate: '',
  dailyWordPlan: null,
  dailyStory: null,
  sessions: {},
})

export const getDateKey = (date = new Date()) => {
  const year = date.getFullYear(),
    month = String(date.getMonth() + 1).padStart(2, '0'),
    day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

export const addDays = (dateKey: string, amount: number) => {
  const [year, month, day] = dateKey.split('-').map(Number),
    date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + amount)
  return getDateKey(date)
}

export function getPreviousSession(state: AppState) {
  return state.sessions[addDays(state.activeDate, -1)]
}

export function getWeekDateKeys(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number),
    current = new Date(year, month - 1, day)
  const mondayOffset = (current.getDay() + 6) % 7
  return Array.from({ length: 7 }, (_, index) => addDays(dateKey, index - mondayOffset))
}

export function formatSessionDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(year, month - 1, day))
}

export function resetForNewDay(state: AppState, today = getDateKey()): AppState {
  if (state.activeDate === today) return state
  return {
    ...state,
    activeDate: today,
    learned: {},
    currentWord: 0,
    quizAnswers: {},
    quizDone: false,
    storyChoice: '',
    completed: false,
    dailyWordPlan: state.dailyWordPlan?.date === today ? state.dailyWordPlan : null,
    dailyStory: state.dailyStory?.date === today ? state.dailyStory : null,
  }
}

export function createDailySession(
  state: AppState,
  storyChoice: string,
  completedAt?: string,
): DailySession {
  const reviewCount = getReviewCount(state)
  return {
    date: state.activeDate,
    learned: { ...state.learned },
    learnedCount: Object.keys(state.learned).length,
    newCount: 20 - reviewCount,
    reviewCount,
    quizScore: getQuizScore(state.quizAnswers),
    storyChoice,
    storyLength: state.storyLength,
    dailyMinutes: state.dailyMinutes,
    completedAt: completedAt || new Date().toISOString(),
  }
}

export function completeDailySession(state: AppState, storyChoice: string): AppState {
  const existing = state.sessions[state.activeDate]
  const session = createDailySession(state, storyChoice, existing?.completedAt)
  return {
    ...state,
    storyChoice,
    completed: true,
    sessions: { ...state.sessions, [state.activeDate]: session },
  }
}

export function createWeeklyReport(state: AppState): WeeklyReport {
  const keys = getWeekDateKeys(state.activeDate),
    sessions = keys
      .map((key) => state.sessions[key])
      .filter((session): session is DailySession => Boolean(session))
  return {
    startDate: keys[0],
    endDate: keys[6],
    learnedWords: sessions.reduce((sum, session) => sum + session.learnedCount, 0),
    storyCount: sessions.length,
    sessions,
  }
}

export type { DailyMinutes }
