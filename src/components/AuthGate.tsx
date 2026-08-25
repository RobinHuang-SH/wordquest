import { Cloud, LockKeyhole, Sparkles } from 'lucide-react'
import type { AccountSyncController } from '../services/useAccountSync'
import { Logo } from './AppShell'
import { AccountSyncPanel } from './AccountSyncPanel'

export function AuthGate({
  account,
  displayName,
  onDisplayNameChange,
  notify,
}: {
  account: AccountSyncController
  displayName: string
  onDisplayNameChange: (displayName: string) => void
  notify: (message: string) => void
}) {
  return (
    <main className="auth-gate">
      <section className="auth-gate-intro">
        <Logo />
        <div className="auth-gate-copy">
          <p className="eyebrow">WORDQUEST ACCOUNT</p>
          <h1>登录后，开始你的每日英语故事</h1>
          <p>每日单词、复习进度和个性化故事都会安全同步，换设备也能继续学习。</p>
        </div>
        <div className="auth-gate-points">
          <span>
            <Cloud /> 学习记录自动同步
          </span>
          <span>
            <Sparkles /> 每天生成新的词汇与故事
          </span>
          <span>
            <LockKeyhole /> 模型密钥只保存在服务器
          </span>
        </div>
      </section>
      <div className="auth-gate-form">
        <AccountSyncPanel
          account={account}
          displayName={displayName}
          onDisplayNameChange={onDisplayNameChange}
          notify={notify}
        />
        <p>首次使用请先注册；已有账号可以直接登录。</p>
      </div>
    </main>
  )
}
