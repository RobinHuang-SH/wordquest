import { useState } from 'react'
import { Download, RefreshCw, WifiOff, X } from 'lucide-react'
import type { PwaLifecycle } from '../services/pwa'

export function PwaStatus({ pwa }: { pwa: PwaLifecycle }) {
  const [installDismissed, setInstallDismissed] = useState(false)

  return (
    <div className="pwa-status" aria-live="polite">
      {!pwa.online && (
        <div className="offline-banner" role="status">
          <WifiOff />
          <span>当前处于离线模式，已缓存的学习内容仍可使用，进度会保存在本机。</span>
        </div>
      )}
      {pwa.updateReady && (
        <div className="pwa-action-card update-card">
          <RefreshCw />
          <div>
            <b>新版本已准备好</b>
            <small>刷新应用即可启用最新功能，本地学习记录不会被清除。</small>
          </div>
          <button onClick={pwa.applyUpdate}>立即更新</button>
        </div>
      )}
      {pwa.installAvailable && !installDismissed && !pwa.updateReady && (
        <div className="pwa-action-card install-card">
          <Download />
          <div>
            <b>安装词境英语</b>
            <small>添加到桌面或主屏幕，获得更快启动和完整离线体验。</small>
          </div>
          <button onClick={() => void pwa.requestInstall()}>安装应用</button>
          <button
            className="pwa-dismiss"
            aria-label="暂不安装"
            onClick={() => setInstallDismissed(true)}
          >
            <X />
          </button>
        </div>
      )}
    </div>
  )
}
