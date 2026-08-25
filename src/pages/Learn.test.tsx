import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { todayWords } from '../data'
import { makeState } from '../test/factories'
import { Learn } from './Learn'

describe('Learn', () => {
  it('keeps local progress immediate and forwards server review feedback', async () => {
    const user = userEvent.setup()
    const patch = vi.fn()
    const onReviewWord = vi.fn()
    const word = { ...todayWords[0], id: 'word-1' }
    const state = makeState({
      dailyWordPlan: {
        sessionId: 'session-1',
        date: '2026-07-12',
        batch: 1,
        mix: '15+5',
        words: [word],
        newCount: 1,
        reviewCount: 0,
      },
    })

    const { container } = render(
      <Learn
        state={state}
        patch={patch}
        setPage={vi.fn()}
        notify={vi.fn()}
        onReviewWord={onReviewWord}
      />,
    )
    const fuzzyButton = container.querySelectorAll<HTMLButtonElement>(
      '.knowledge-actions button',
    )[1]
    await user.click(fuzzyButton)

    expect(patch).toHaveBeenCalledWith({ learned: { discover: 'fuzzy' }, currentWord: 0 })
    expect(onReviewWord).toHaveBeenCalledWith(word, 'fuzzy')
  })
})
