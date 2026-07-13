import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AppState } from '../domain/models'
import { makeState } from '../test/factories'
import { SettingsPage } from './SettingsPage'

const accountSync = {
  session: null,
  status: 'local' as const,
  lastSyncedAt: null,
  signIn: vi.fn(),
  signOut: vi.fn(),
  syncNow: vi.fn(),
}

const pwa = {
  online: true,
  installed: false,
  installAvailable: false,
  updateReady: false,
  requestInstall: vi.fn(),
  applyUpdate: vi.fn(),
}

function renderSettings(initialState: Partial<AppState> = {}, onShowShortcuts = vi.fn()) {
  const patchSpy = vi.fn()

  function Harness() {
    const [state, setState] = useState<AppState>(makeState(initialState))
    const patch = (next: Partial<AppState>) => {
      patchSpy(next)
      setState((current) => ({ ...current, ...next }))
    }
    return (
      <SettingsPage
        state={state}
        patch={patch}
        notify={vi.fn()}
        onShowShortcuts={onShowShortcuts}
        pwa={pwa}
        accountSync={accountSync}
      />
    )
  }

  render(<Harness />)
  return { patchSpy, onShowShortcuts }
}

describe('SettingsPage', () => {
  it('updates and normalizes the learner display name', async () => {
    const user = userEvent.setup()
    const { patchSpy } = renderSettings({ displayName: 'Mia' })

    const input = screen.getByRole('textbox', { name: '你的名字' })
    await user.clear(input)
    await user.type(input, '  Lin  ')
    expect(input).toHaveValue('  Lin  ')

    await user.tab()
    expect(patchSpy).toHaveBeenLastCalledWith({ displayName: 'Lin' })
    expect(input).toHaveValue('Lin')
  })

  it('updates accessibility preferences and opens shortcut help', async () => {
    const user = userEvent.setup()
    const onShowShortcuts = vi.fn()
    const { patchSpy } = renderSettings({}, onShowShortcuts)

    await user.click(screen.getByRole('checkbox', { name: /高对比度/ }))
    expect(patchSpy).toHaveBeenCalledWith({ highContrast: true })

    await user.click(screen.getByRole('checkbox', { name: /减少动态效果/ }))
    expect(patchSpy).toHaveBeenCalledWith({ reducedMotion: true })

    await user.click(screen.getByRole('button', { name: '查看快捷键' }))
    expect(onShowShortcuts).toHaveBeenCalledOnce()
  })
})
