import type { StoryLength, Word } from '../data'

export type Page = 'home'|'learn'|'quiz'|'story'|'library'|'report'|'settings'
export type Knowledge = 'know'|'fuzzy'|'new'
export type WordMix = '20+0'|'15+5'|'10+10'|'dynamic'
export type DailyMinutes = 15|20|30

export type User = {
  displayName: string
  level: string
  accent: string
  genre: string
}

export type DailySession = {
  date: string
  learned: Record<string, Knowledge>
  learnedCount: number
  newCount: number
  reviewCount: number
  quizScore: number
  storyChoice: string
  storyLength: StoryLength
  dailyMinutes: DailyMinutes
  completedAt: string
}

export type StoryNode = {
  date: string
  choiceId: string
  title: string
  summary: string
}

export type WeeklyReport = {
  startDate: string
  endDate: string
  learnedWords: number
  storyCount: number
  sessions: DailySession[]
}

export type AppState = User & {
  onboarded: boolean
  learned: Record<string, Knowledge>
  currentWord: number
  quizAnswers: Record<number, string>
  quizDone: boolean
  storyChoice: string
  completed: boolean
  streak: number
  wordMix: WordMix
  storyLength: StoryLength
  dailyMinutes: DailyMinutes
  activeDate: string
  sessions: Record<string, DailySession>
}

export type { StoryLength, Word }
