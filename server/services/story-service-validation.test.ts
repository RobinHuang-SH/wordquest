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
    titleZh: '蓝色的门',
    summary: 'Mia sees a blue door.',
    paragraphs: [{ en: english, zh: '这是对应的中文翻译。' }],
    choices,
    stateBefore: {
      previousChoice: 'wait-here',
      location: 'old station',
      characters: ['Mia', 'Leo'],
      openThreads: ['the glowing map'],
    },
    stateAfter: {
      previousChoice: 'wait-here',
      location: 'blue door',
      characters: ['Mia', 'Leo'],
      openThreads: ['the hidden bell'],
    },
    vocabularyCoverage: ['discover'],
  }
}

function setup(
  modelClient: StoryModelClient,
  maxRetries = 2,
  systemPrompt?: string,
  previousSession: unknown = null,
) {
  const generationCreate = vi.fn(async () => ({}))
  const tx = {
    storyNode: {
      create: vi.fn(async () => ({ id: 'node-1' })),
      delete: vi.fn(async () => ({})),
    },
    storyGeneration: { create: generationCreate, delete: vi.fn(async () => ({})) },
    dailySession: {
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({})),
    },
    storySeries: { update: vi.fn(async () => ({})) },
  }
  const dailySessionFind = vi
    .fn()
    .mockResolvedValueOnce({
      id: 'session-1',
      sessionDate: new Date('2026-07-13T00:00:00.000Z'),
      batchNumber: 1,
      user: { displayName: 'Mia', storyGenre: 'adventure', targetLevel: 'B1' },
      words: [
        {
          sequence: 1,
          wordType: 'NEW',
          word: { word: 'discover', lemma: 'discover', level: 'A2' },
        },
        {
          sequence: 2,
          wordType: 'REVIEW',
          word: { word: 'remember', lemma: 'remember', level: 'A2' },
        },
      ],
    })
    .mockResolvedValueOnce(previousSession)
  const prisma = {
    storyGeneration: { findUnique: vi.fn(async () => null) },
    dailySession: { findFirst: dailySessionFind },
    vocabulary: {
      findMany: vi.fn(async () => [
        { word: 'discover', lemma: 'discover', level: 'A2' },
        { word: 'remember', lemma: 'remember', level: 'A2' },
      ]),
    },
    storyPromptVersion: { upsert: vi.fn(async () => ({ id: 'prompt-5', version: 5 })) },
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
    systemPrompt,
  })
  return { service, generationCreate, prisma, tx }
}

describe('story validation orchestration', () => {
  it('loads the immediately previous same-day batch and passes its canonical state to the model', async () => {
    const previous = modelStory('Mia discovered the blue door with Leo.')
    const current = modelStory('Mia and Leo entered the map room and discovered a signal.')
    current.stateBefore = {
      previousChoice: 'open-door',
      location: 'blue door',
      characters: ['Mia', 'Leo'],
      openThreads: ['the hidden bell'],
    }
    current.stateAfter = {
      previousChoice: 'open-door',
      location: 'map room',
      characters: ['Mia', 'Leo'],
      openThreads: ['the hidden bell', 'the signal source'],
    }
    const generate = vi.fn(async () => ({
      value: current,
      provider: 'fake',
      model: 'story',
    }))
    const previousSession = {
      storyId: 'previous-node',
      story: {
        title: previous.title,
        summary: previous.summary,
        stateAfterJson: previous.stateAfter,
        generation: { responseJson: previous },
      },
    }
    const { service, prisma, tx } = setup({ generate }, 0, undefined, previousSession)

    await service.getOrGenerate('user-1', {
      sessionId: 'session-1',
      length: 'medium',
      previousChoice: 'open-door',
    })

    expect(prisma.dailySession.findFirst.mock.calls[1][0]).toMatchObject({
      where: {
        OR: [
          { sessionDate: { lt: new Date('2026-07-13T00:00:00.000Z') } },
          {
            sessionDate: new Date('2026-07-13T00:00:00.000Z'),
            batchNumber: { lt: 1 },
          },
        ],
      },
      orderBy: [{ sessionDate: 'desc' }, { batchNumber: 'desc' }],
    })
    expect(generate.mock.calls[0][0].userPrompt).toContain('"location": "blue door"')
    expect(generate.mock.calls[0][0].userPrompt).toContain(
      '"consequence": "Mia enters the map room."',
    )
    expect(tx.storyNode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parentNodeId: 'previous-node' }),
      }),
    )
  })

  it('adds configurable creator instructions without removing safety requirements', async () => {
    const generate = vi.fn(async () => ({
      value: modelStory('Mia discovered a mark by the door.'),
      provider: 'fake',
      model: 'story',
    }))
    const { service } = setup({ generate }, 0, 'Keep a gentle detective atmosphere.')

    await service.getOrGenerate('user-1', {
      sessionId: 'session-1',
      length: 'medium',
      previousChoice: 'wait-here',
    })

    expect(generate.mock.calls[0][0].systemPrompt).toContain('Safety and output requirements')
    expect(generate.mock.calls[0][0].systemPrompt).toContain(
      'Additional creator instructions:\nKeep a gentle detective atmosphere.',
    )
  })

  it('deduplicates concurrent generation requests for the same session', async () => {
    const generate = vi.fn(async () => ({
      value: modelStory('Mia discovered a mark by the door.'),
      provider: 'fake',
      model: 'story',
    }))
    const { service } = setup({ generate })

    const [first, second] = await Promise.all([
      service.getOrGenerate('user-1', {
        sessionId: 'session-1',
        length: 'medium',
        previousChoice: 'wait-here',
      }),
      service.getOrGenerate('user-1', {
        sessionId: 'session-1',
        length: 'medium',
        previousChoice: 'wait-here',
      }),
    ])

    expect(generate).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('replaces an unconfigured fallback once a model becomes available', async () => {
    const generate = vi.fn(async () => ({
      value: modelStory('Mia discovered a mark by the door.'),
      provider: 'fake',
      model: 'story',
    }))
    const { service, prisma, tx } = setup({ generate }, 0)
    prisma.storyGeneration.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      sessionId: 'session-1',
      storyNodeId: 'fallback-node',
      status: 'FALLBACK',
      fallbackReason: 'LLM_NOT_CONFIGURED',
      provider: 'wordquest',
      model: 'deterministic-fallback-v2',
      repairCount: 0,
      responseJson: modelStory('Mia discovered a mark by the door.'),
      validationJson: {},
      promptVersion: { version: 2 },
      storyNode: { _count: { children: 0 } },
      session: {
        sessionDate: new Date('2026-07-13T00:00:00.000Z'),
        user: { targetLevel: 'B1' },
        words: [{ word: { word: 'discover', lemma: 'discover', level: 'A2' } }],
      },
    })

    const result = await service.getOrGenerate('user-1', {
      sessionId: 'session-1',
      length: 'medium',
    })

    expect(tx.dailySession.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', storyId: 'fallback-node' },
      data: { storyId: null },
    })
    expect(tx.storyGeneration.delete).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
    })
    expect(tx.storyNode.delete).toHaveBeenCalledWith({ where: { id: 'fallback-node' } })
    expect(generate).toHaveBeenCalledTimes(1)
    expect(result.generation.status).toBe('SUCCESS')
  })

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
    expect(generate.mock.calls[0][0].systemPrompt).toContain('fresh, emotionally engaging chapter')
    expect(generate.mock.calls[0][0].userPrompt).toContain('"displayName": "Mia"')
    expect(generate.mock.calls[0][0].userPrompt).toContain('"previousChoice": "wait-here"')
    expect(generate.mock.calls[0][0].userPrompt).toContain('"targetVocabulary"')
    expect(generate.mock.calls[0][0].userPrompt).toContain(
      'Mandatory English paragraph checklist: discover',
    )
    expect(generate.mock.calls[0][0].userPrompt).not.toContain(
      'Mandatory English paragraph checklist: discover, remember',
    )
    expect(generate.mock.calls[1][0].userPrompt).toContain('MISSING_TARGET_WORDS')
    expect(generate.mock.calls[1][0].userPrompt).toContain(
      'Mandatory missing words that must be inserted with this exact spelling into English paragraphs: discover',
    )
    expect(result.validation.passed).toBe(true)
    expect(result.vocabularyCoverage).toEqual(['discover'])
    expect(result.generation).toMatchObject({ status: 'SUCCESS', promptVersion: 5, repairCount: 1 })
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
