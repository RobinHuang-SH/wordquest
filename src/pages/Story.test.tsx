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
  generation: {
    status: 'SUCCESS' as const,
    provider: 'fake',
    model: 'story-model',
    promptVersion: 1,
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
    await userEvent.click(screen.getByRole('button', { name: /Open the gate/ }))
    expect(completeToday).toHaveBeenCalledWith('open-gate')
  })
})
