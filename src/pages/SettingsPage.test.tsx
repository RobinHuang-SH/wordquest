import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AppState } from '../domain/models'
import { makeState } from '../test/factories'
import { SettingsPage } from './SettingsPage'

describe('SettingsPage', () => {
  it('updates and normalizes the learner display name', async () => {
    const user = userEvent.setup()
    const patchSpy = vi.fn()

    function Harness() {
      const [state, setState] = useState<AppState>(makeState({ displayName: 'Mia' }))
      const patch = (next: Partial<AppState>) => {
        patchSpy(next)
        setState((current) => ({ ...current, ...next }))
      }
      return (
        <SettingsPage
          state={state}
          patch={patch}
          notify={vi.fn()}
          pwa={{
            online: true,
            installed: false,
            installAvailable: false,
            updateReady: false,
            requestInstall: vi.fn(),
            applyUpdate: vi.fn(),
          }}
        />
      )
    }

    render(<Harness />)
    const input = screen.getByRole('textbox', { name: '你的名字' })
    await user.clear(input)
    await user.type(input, '  Lin  ')
    expect(input).toHaveValue('  Lin  ')

    await user.tab()
    expect(patchSpy).toHaveBeenLastCalledWith({ displayName: 'Lin' })
    expect(input).toHaveValue('Lin')
  })
})
