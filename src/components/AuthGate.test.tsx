import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthGate } from './AuthGate'

describe('AuthGate', () => {
  it('requires account authentication and sends the chosen registration name', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn(async () => undefined)
    const onDisplayNameChange = vi.fn()
    render(
      <AuthGate
        account={{
          session: null,
          status: 'local',
          lastSyncedAt: null,
          signIn,
          signOut: vi.fn(),
          syncNow: vi.fn(),
        }}
        displayName="Mia"
        onDisplayNameChange={onDisplayNameChange}
        notify={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: '登录后，开始你的每日英语故事' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '注册' }))
    await user.clear(screen.getByRole('textbox', { name: '注册昵称' }))
    await user.type(screen.getByRole('textbox', { name: '注册昵称' }), 'Lin')
    await user.type(screen.getByRole('textbox', { name: '邮箱地址' }), 'lin@example.com')
    await user.type(screen.getByLabelText('账户密码'), 'password123')
    await user.click(screen.getByRole('button', { name: '创建账户并同步' }))

    expect(onDisplayNameChange).toHaveBeenCalledWith('Lin')
    expect(signIn).toHaveBeenCalledWith('register', {
      email: 'lin@example.com',
      password: 'password123',
      displayName: 'Lin',
    })
  })
})
