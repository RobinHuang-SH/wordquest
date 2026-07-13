import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeState } from '../test/factories'
import { Story } from './Story'

const dailyStory = {
  sessionId: 'session-1',
  storyNodeId: 'node-1',
  date: '2026-07-12',
  title: 'The Clockwork Garden',
  titleZh: 'Clockwork Garden',
  summary: 'Mia enters a garden.',
  paragraphs: [{ en: 'Mia discovered a signal.', zh: 'Mia found a signal.' }],
  choices: [
    {
      id: 'open-gate',
      title: 'Open the gate',
      en: 'Open the gate',
      hint: 'Enter',
      continuationSummary: 'Mia enters.',
    },
    {
      id: 'follow-bird',
      title: 'Follow the bird',
      en: 'Follow the bird',
      hint: 'Listen',
      continuationSummary: 'Mia follows.',
    },
    {
      id: 'study-clock',
      title: 'Study the clock',
      en: 'Study the clock',
      hint: 'Decode',
      continuationSummary: 'Mia studies.',
    },
  ],
  stateBefore: {},
  stateAfter: {},
  vocabularyCoverage: ['discover', 'signal'],
  validation: {
    passed: true,
    targetWords: { total: 2, covered: ['discover', 'signal'], missing: [] },
    outOfLevelWords: [],
    difficulty: {
      targetLevel: 'B1',
      sentenceCount: 1,
      averageSentenceLength: 4,
      maxSentenceLength: 4,
      longWordRatio: 0,
      withinRange: true,
    },
    continuity: { required: false, passed: true },
    choices: { passed: true, uniqueChoiceCount: 3 },
    issues: [],
  },
  generation: {
    status: 'SUCCESS' as const,
    provider: 'fake',
    model: 'story-model',
    promptVersion: 2,
    repairCount: 0,
  },
}

describe('Story', () => {
  it('renders and completes a server-generated structured story', async () => {
    const completeToday = vi.fn()
    render(
      <Story
        state={makeState({ quizDone: true, dailyStory })}
        completeToday={completeToday}
        setPage={vi.fn()}
        notify={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: 'The Clockwork Garden' })).toBeVisible()
    expect(screen.getByText(/story-model/)).toBeVisible()
    expect(
      screen.getByText(
        '\u8bcd\u6c47\u3001\u96be\u5ea6\u4e0e\u8fde\u7eed\u6027\u6821\u9a8c\u901a\u8fc7',
      ),
    ).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: /Open the gate/ }))
    expect(completeToday).toHaveBeenCalledWith('open-gate')
  })
})
