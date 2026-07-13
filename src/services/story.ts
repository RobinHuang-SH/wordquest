import type { DailyStory, StoryLength } from '../domain/models'
import type { AccountSession } from './sync'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')

export async function loadDailyStory(
  session: AccountSession,
  input: { sessionId: string; length: StoryLength; previousChoice?: string },
): Promise<DailyStory> {
  const response = await fetch(`${API_BASE}/api/v1/stories/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    throw new Error(body?.error?.message || `Story request failed (${response.status})`)
  }
  return response.json() as Promise<DailyStory>
}
