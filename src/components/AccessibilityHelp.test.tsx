import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccessibilityHelp } from './AccessibilityHelp'

describe('AccessibilityHelp', () => {
  it('exposes a labelled modal and focuses its close button', () => {
    render(<AccessibilityHelp onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: '键盘快捷键' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '关闭快捷键帮助' })).toHaveFocus()
    expect(screen.getByText('Alt + 6')).toBeInTheDocument()
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AccessibilityHelp onClose={onClose} />)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('restores focus to the opener after closing', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>打开帮助</button>
          {open && <AccessibilityHelp onClose={() => setOpen(false)} />}
        </>
      )
    }

    render(<Harness />)
    const opener = screen.getByRole('button', { name: '打开帮助' })
    await user.click(opener)
    await user.click(screen.getByRole('button', { name: '关闭快捷键帮助' }))
    expect(opener).toHaveFocus()
  })
})
