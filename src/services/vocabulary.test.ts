import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AccountSession } from './sync'
import { loadDailyPlan, submitWordReview } from './vocabulary'

const session: AccountSession = {
  token: 'token-1',
  expiresAt: '2026-08-01T00:00:00.000Z',
  revision: 1,
  user: { id: 'user-1', email: 'learner@example.com', displayName: 'Lin' },
}

afterEach(() => vi.unstubAllGlobals())

describe('vocabulary API', () => {
  it('maps the authenticated daily plan to frontend words', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        date: '2026-07-13',
        newCount: 15,
        reviewCount: 5,
        words: [
          {
            id: 'word-1',
            word: 'observe',
            phonetic: '/?b?z??rv/',
            pos: 'v',
            meaning: '??',
            definition: 'to watch carefully',
            example: 'Observe the light.',
            level: 'B1',
            review: true,
            sourceName: 'wordquest-curated',
            sourceLicense: 'internal-curated',
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const plan = await loadDailyPlan(session, '2026-07-13', '15+5')

    expect(plan).toMatchObject({ sessionId: 'session-1', mix: '15+5', reviewCount: 5 })
    expect(plan.words[0]).toMatchObject({ id: 'word-1', pos: 'v.', exampleZh: '??' })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/daily-session?date=2026-07-13&mix=15%2B5',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer token-1' }),
      }),
    )
  })

  it('submits the matching spaced-repetition rating without blocking local flow', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ wordId: 'word-1' }) })
    vi.stubGlobal('fetch', fetchMock)

    await submitWordReview(
      session,
      {
        id: 'word-1',
        word: 'observe',
        phonetic: '',
        pos: 'v.',
        meaning: '??',
        definition: '',
        example: '',
        exampleZh: '',
        collocations: [],
        level: 'B1',
      },
      'fuzzy',
      'session-1',
    )

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      result: 'FUZZY',
      sessionId: 'session-1',
    })
  })
})
