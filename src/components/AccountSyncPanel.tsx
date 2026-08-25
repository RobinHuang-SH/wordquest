import { useState } from 'react'
import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, UserPlus } from 'lucide-react'
import type { AccountSyncController } from '../services/useAccountSync'

export function AccountSyncPanel({
  account,
  displayName,
  notify,
  onDisplayNameChange,
}: {
  account: AccountSyncController
  displayName: string
  notify: (message: string) => void
  onDisplayNameChange?: (displayName: string) => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registrationName, setRegistrationName] = useState(displayName)
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const nextDisplayName = registrationName.trim() || displayName || '学习者'
      if (mode === 'register') onDisplayNameChange?.(nextDisplayName)
      await account.signIn(mode, { email, password, displayName: nextDisplayName })
      setPassword('')
      notify(mode === 'register' ? '账户已创建，学习进度已同步' : '登录成功，学习进度已同步')
    } catch (error) {
      notify(error instanceof Error ? error.message : '账户操作失败')
    } finally {
      setBusy(false)
    }
  }
  if (account.session)
    return (
      <section className="panel settings-section account-settings">
        <h3>
          <Cloud />
          账户与同步
        </h3>
        <div className="account-summary">
          <div>
            <b>{account.session.user.displayName}</b>
            <small>{account.session.user.email}</small>
          </div>
          <span className={`sync-badge ${account.status}`}>
            {account.status === 'offline' ? <CloudOff /> : <Cloud />}
            {
              (
                {
                  syncing: '同步中',
                  synced: '已同步',
                  offline: '离线待同步',
                  error: '同步失败',
                  local: '仅本地',
                } as const
              )[account.status]
            }
          </span>
        </div>
        <div className="account-actions">
          <button
            className="outline"
            disabled={busy || account.status === 'syncing'}
            onClick={() => void account.syncNow()}
          >
            <RefreshCw />
            立即同步
          </button>
          <button className="outline" onClick={() => void account.signOut()}>
            <LogOut />
            退出登录
          </button>
        </div>
      </section>
    )
  return (
    <section className="panel settings-section account-settings">
      <h3>
        <Cloud />
        账户与同步
      </h3>
      <p className="settings-copy">
        登录后可在不同设备之间同步学习记录；离线时的修改会在恢复网络后自动上传。
      </p>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          <LogIn />
          登录
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
        >
          <UserPlus />
          注册
        </button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && (
          <label>
            <span>
              <b>你的名字</b>
            </span>
            <input
              aria-label="注册昵称"
              required
              maxLength={20}
              value={registrationName}
              onChange={(event) => setRegistrationName(event.target.value)}
            />
          </label>
        )}
        <label>
          <span>
            <b>邮箱</b>
          </span>
          <input
            aria-label="邮箱地址"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          <span>
            <b>密码</b>
            <small>至少 8 个字符</small>
          </span>
          <input
            aria-label="账户密码"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? '处理中…' : mode === 'register' ? '创建账户并同步' : '登录并同步'}
        </button>
      </form>
    </section>
  )
}
