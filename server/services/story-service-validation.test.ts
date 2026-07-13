// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { PrismaStoryService } from './story-service.js'
import type { StoryModelClient } from './story-model-client.js'

const choices = [
  {
    id: 'open-door',
    title: 'Open door',
    en: 'Open the door',
    hint: 'Look inside',
    continuationSummary: 'Mia enters the map room.',
  },
  {
    id: 'follow-light',
    title: 'Follow light',
    en: 'Follow the light',
    hint: 'Find its source',
    continuationSummary: 'Mia walks toward the river.',
  },
  {
    id: 'ask-leo',
    title: 'Ask Leo',
    en: 'Ask Leo',
    hint: 'Share the clue',
    continuationSummary: 'Leo helps Mia read the clue.',
  },
]

function modelStory(english: string) {
  return {
    title: 'The Blue Door',
    titleZh: 'The Blue Door',
    summary: 'Mia sees a blue door.',
    paragraphs: [{ en: english, zh: 'A translated paragraph.' }],
    choices,
    stateBefore: { previousChoice: 'wait-here' },
    stateAfter: { location: 'blue door' },
    vocabularyCoverage: ['discover'],
  }
}

function setup(modelClient: StoryModelClient, maxRetries = 2) {
  const generationCreate = vi.fn(async () => ({}))
  const tx = {
    storyNode: { create: vi.fn(async () => ({ id: 'node-1' })) },
    storyGeneration: { create: generationCreate },
    dailySession: { update: vi.fn(async () => ({})) },
  }
  const dailySessionFind = vi
    .fn()
    .mockResolvedValueOnce({
      id: 'session-1',
      sessionDate: new Date('2026-07-13T00:00:00.000Z'),
      user: { storyGenre: 'adventure', targetLevel: 'B1' },
      words: [
        {
          sequence: 1,
          word: { word: 'discover', lemma: 'discover', level: 'A2' },
        },
      ],
    })
    .mockResolvedValueOnce(null)
  const prisma = {
    storyGeneration: { findUnique: vi.fn(async () => null) },
    dailySession: { findFirst: dailySessionFind },
    vocabulary: {
      findMany: vi.fn(async () => [{ word: 'discover', lemma: 'discover', level: 'A2' }]),
    },
    storyPromptVersion: { upsert: vi.fn(async () => ({ id: 'prompt-2', version: 2 })) },
    storySeries: {
      findFirst: vi.fn(async () => null),
      upsert: vi.fn(async () => ({ id: 'series-1' })),
    },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  }
  const service = new PrismaStoryService(prisma as never, modelClient, {
    timeoutMs: 1000,
    maxRetries,
    rateLimitPerMinute: 5,
    sleep: async () => undefined,
    now: () => 1000,
  })
  return { service, generationCreate }
}

describe('story validation orchestration', () => {
  it('automatically repairs a deterministic validation failure before persistence', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce({
        value: modelStory('Mia waits by the door.'),
        provider: 'fake',
        model: 'story',
      })
      .mockResolvedValueOnce({
        value: modelStory('Mia discovered a mark by the door.'),
        provider: 'fake',
        model: 'story',
      })
    const { service, generationCreate } = setup({ generate })

    const result = await service.getOrGenerate('user-1', {
      sessionId: 'session-1',
      length: 'medium',
      previousChoice: 'wait-here',
    })

    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[1][0].userPrompt).toContain('MISSING_TARGET_WORDS')
    expect(result.validation.passed).toBe(true)
    expect(result.vocabularyCoverage).toEqual(['discover'])
    expect(result.generation).toMatchObject({ status: 'SUCCESS', promptVersion: 2, repairCount: 1 })
    expect(generationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          repairCount: 1,
          validationJson: expect.objectContaining({ passed: true }),
        }),
      }),
    )
  })

  it('uses a validated deterministic fallback after repair attempts are exhausted', async () => {
    const generate = vi.fn(async () => ({
      value: modelStory('Mia waits by the door.'),
      provider: 'fake',
      model: 'story',
    }))
    const { service, generationCreate } = setup({ generate }, 1)

    const result = await service.getOrGenerate('user-1', {
      sessionId: 'session-1',
      length: 'short',
      previousChoice: 'wait-here',
    })

    expect(generate).toHaveBeenCalledTimes(2)
    expect(result.generation).toMatchObject({ status: 'FALLBACK', repairCount: 1 })
    expect(result.validation).toMatchObject({ passed: true, targetWords: { missing: [] } })
    expect(generationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fallbackReason: 'STORY_VALIDATION_FAILED' }),
      }),
    )
  })
})
