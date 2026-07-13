import { useState } from 'react'
import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, UserPlus } from 'lucide-react'
import type { AccountSyncController } from '../services/useAccountSync'

export function AccountSyncPanel({
  account,
  displayName,
  notify,
}: {
  account: AccountSyncController
  displayName: string
  notify: (message: string) => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await account.signIn(mode, { email, password, displayName })
      setPassword('')
      notify(mode === 'register' ? '?????????????' : '????????????')
    } catch (error) {
      notify(error instanceof Error ? error.message : '????')
    } finally {
      setBusy(false)
    }
  }
  if (account.session)
    return (
      <section className="panel settings-section account-settings">
        <h3>
          <Cloud />
          ?????
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
                  syncing: '???',
                  synced: '???',
                  offline: '????',
                  error: '????',
                  local: '???',
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
            ????
          </button>
          <button className="outline" onClick={() => void account.signOut()}>
            <LogOut />
            ????
          </button>
        </div>
      </section>
    )
  return (
    <section className="panel settings-section account-settings">
      <h3>
        <Cloud />
        ?????
      </h3>
      <p className="settings-copy">?????????????????????????????????????????</p>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          <LogIn />
          ??
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
        >
          <UserPlus />
          ??
        </button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          <span>
            <b>??</b>
          </span>
          <input
            aria-label="????"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          <span>
            <b>??</b>
            <small>?? 8 ???</small>
          </span>
          <input
            aria-label="????"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? '????' : mode === 'register' ? '???????' : '?????'}
        </button>
      </form>
    </section>
  )
}
