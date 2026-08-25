import type { DailyStory, StoryLength } from '../domain/models'
import { apiUrl } from './api'
import type { AccountSession } from './sync'

export async function loadDailyStory(
  session: AccountSession,
  input: { sessionId: string; length: StoryLength; previousChoice?: string },
): Promise<DailyStory> {
  const response = await fetch(apiUrl('/api/v1/stories/generate'), {
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
