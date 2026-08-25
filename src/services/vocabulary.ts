import type { WordMix, Knowledge, DailyWordPlan, Word } from '../domain/models'
import { apiUrl } from './api'
import type { AccountSession } from './sync'

type ApiPlanWord = {
  id: string
  word: string
  phonetic: string
  pos: string
  meaning: string
  definition: string
  example: string
  level: string
  review: boolean
  sourceName: string
  sourceLicense: string
}
type ApiDailyPlan = {
  sessionId: string
  date: string
  batch: number
  newCount: number
  reviewCount: number
  words: ApiPlanWord[]
}

async function request<T>(path: string, session: AccountSession, options: RequestInit = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.token}`,
      ...options.headers,
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    throw new Error(body?.error?.message || `Vocabulary request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

function mapPlanWord(item: ApiPlanWord): Word {
  return {
    id: item.id,
    word: item.word,
    phonetic: item.phonetic,
    pos: item.pos.endsWith('.') ? item.pos : `${item.pos}.`,
    meaning: item.meaning,
    definition: item.definition,
    example: item.example,
    exampleZh: item.meaning,
    collocations: [],
    level: item.level,
    review: item.review,
    sourceName: item.sourceName,
    sourceLicense: item.sourceLicense,
  }
}

export async function loadDailyPlan(
  session: AccountSession,
  date: string,
  mix: WordMix,
  batch = 1,
): Promise<DailyWordPlan> {
  const plan = await request<ApiDailyPlan>(
    `/api/v1/daily-session?date=${encodeURIComponent(date)}&mix=${encodeURIComponent(mix)}&batch=${batch}`,
    session,
  )
  return { ...plan, mix, words: plan.words.map(mapPlanWord) }
}

const resultByKnowledge: Record<Knowledge, 'KNOW' | 'FUZZY' | 'UNKNOWN'> = {
  know: 'KNOW',
  fuzzy: 'FUZZY',
  new: 'UNKNOWN',
}

export async function submitWordReview(
  session: AccountSession,
  word: Word,
  knowledge: Knowledge,
  sessionId?: string,
) {
  if (!word.id) return null
  return request<{
    wordId: string
    status: string
    memoryScore: number
    nextReviewAt: string | null
    reviewIntervalDays: number
    lapseCount: number
  }>(`/api/v1/words/${encodeURIComponent(word.id)}/review`, session, {
    method: 'POST',
    body: JSON.stringify({ result: resultByKnowledge[knowledge], sessionId }),
  })
}
