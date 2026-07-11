import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PwaLifecycle } from '../services/pwa'
import { PwaStatus } from './PwaStatus'

function makePwa(overrides: Partial<PwaLifecycle> = {}): PwaLifecycle {
  return {
    online: true,
    installed: false,
    installAvailable: false,
    updateReady: false,
    requestInstall: vi.fn(async () => true),
    applyUpdate: vi.fn(),
    ...overrides,
  }
}

describe('PwaStatus', () => {
  it('shows a persistent offline status', () => {
    render(<PwaStatus pwa={makePwa({ online: false })} />)
    expect(screen.getByRole('status')).toHaveTextContent('当前处于离线模式')
  })

  it('runs the captured browser install prompt', async () => {
    const user = userEvent.setup()
    const requestInstall = vi.fn(async () => true)
    render(<PwaStatus pwa={makePwa({ installAvailable: true, requestInstall })} />)

    await user.click(screen.getByRole('button', { name: '安装应用' }))
    expect(requestInstall).toHaveBeenCalledOnce()
  })

  it('prioritizes an available update over the install prompt', async () => {
    const user = userEvent.setup()
    const applyUpdate = vi.fn()
    render(<PwaStatus pwa={makePwa({ installAvailable: true, updateReady: true, applyUpdate })} />)

    expect(screen.queryByText('安装词境英语')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '立即更新' }))
    expect(applyUpdate).toHaveBeenCalledOnce()
  })
})
