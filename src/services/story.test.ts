import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadDailyStory } from './story'
import type { AccountSession } from './sync'

const session: AccountSession = {
  token: 'token-1',
  expiresAt: '2026-08-01T00:00:00.000Z',
  revision: 1,
  user: { id: 'user-1', email: 'learner@example.com', displayName: 'Lin' },
}
afterEach(() => vi.unstubAllGlobals())

describe('story API', () => {
  it('loads the server-generated story with authenticated session context', async () => {
    const payload = {
      sessionId: 'session-1',
      storyNodeId: 'node-1',
      date: '2026-07-13',
      title: 'Story',
      titleZh: 'Story',
      summary: 'Summary',
      paragraphs: [{ en: 'A story.', zh: 'A story.' }],
      choices: [],
      stateBefore: {},
      stateAfter: {},
      vocabularyCoverage: ['story'],
      generation: {
        status: 'FALLBACK',
        provider: 'wordquest',
        model: 'fallback',
        promptVersion: 1,
      },
    }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload })
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      loadDailyStory(session, { sessionId: 'session-1', length: 'medium' }),
    ).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/stories/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer token-1' }),
        body: JSON.stringify({ sessionId: 'session-1', length: 'medium' }),
      }),
    )
  })
})
