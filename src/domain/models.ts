import type { StoryLength, Word } from '../data'

export type Page = 'home' | 'learn' | 'quiz' | 'story' | 'library' | 'report' | 'settings'
export type Knowledge = 'know' | 'fuzzy' | 'new'
export type WordMix = '20+0' | '15+5' | '10+10' | 'dynamic'
export type DailyMinutes = 15 | 20 | 30

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

export type DailyWordPlan = {
  sessionId: string
  date: string
  mix: WordMix
  words: Word[]
  newCount: number
  reviewCount: number
}

export type DailyStory = {
  sessionId: string
  storyNodeId: string
  date: string
  title: string
  titleZh: string
  summary: string
  paragraphs: Array<{ en: string; zh: string }>
  choices: Array<{
    id: string
    title: string
    en: string
    hint: string
    continuationSummary: string
  }>
  stateBefore: Record<string, unknown>
  stateAfter: Record<string, unknown>
  vocabularyCoverage: string[]
  validation: {
    passed: boolean
    targetWords: { total: number; covered: string[]; missing: string[] }
    outOfLevelWords: Array<{ word: string; level: string }>
    difficulty: {
      targetLevel: string
      sentenceCount: number
      averageSentenceLength: number
      maxSentenceLength: number
      longWordRatio: number
      withinRange: boolean
    }
    continuity: { required: boolean; passed: boolean; previousChoice?: string }
    choices: { passed: boolean; uniqueChoiceCount: number }
    issues: Array<{
      code: string
      message: string
      words?: string[]
      paragraphIndexes?: number[]
    }>
  }
  generation: {
    status: 'SUCCESS' | 'FALLBACK'
    provider: string
    model: string
    promptVersion: number
    repairCount: number
  }
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
  highContrast: boolean
  reducedMotion: boolean
  activeDate: string
  dailyWordPlan: DailyWordPlan | null
  dailyStory: DailyStory | null
  sessions: Record<string, DailySession>
}

export type { StoryLength, Word }
