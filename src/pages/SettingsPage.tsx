import { useState } from 'react'
import {
  Accessibility,
  BookOpen,
  Cloud,
  Download,
  Eye,
  Keyboard,
  RefreshCw,
  Settings,
  Smartphone,
  WandSparkles,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { AppState, DailyMinutes, StoryLength, WordMix } from '../domain/models'
import { clearAppState, restoreAppStateBackup } from '../data/appStateRepository'
import { makeMarkdown } from '../services/markdown'
import { downloadText } from '../services/download'
import { Logo } from '../components/AppShell'
import type { PwaLifecycle } from '../services/pwa'
import type { AccountSyncController } from '../services/useAccountSync'
import { AccountSyncPanel } from '../components/AccountSyncPanel'

export function SettingsPage({
  state,
  patch,
  notify,
  pwa,
  onShowShortcuts,
  accountSync,
}: {
  state: AppState
  patch: (p: Partial<AppState>) => void
  notify: (s: string) => void
  pwa: PwaLifecycle
  onShowShortcuts: () => void
  accountSync: AccountSyncController
}) {
  const [installHelp, setInstallHelp] = useState(false)

  return (
    <div className="page settings-page">
      <header className="page-title">
        <div>
          <p className="eyebrow">PREFERENCES</p>
          <h1>设置</h1>
          <p>调整你的学习节奏、故事与数据方式。</p>
        </div>
      </header>
      <div className="settings-grid">
        <AccountSyncPanel account={accountSync} displayName={state.displayName} notify={notify} />
        <section className="panel settings-section profile-settings">
          <h3>
            <Settings />
            个人资料
          </h3>
          <label>
            <span>
              <b>你的名字</b>
              <small>用于首页问候、侧边栏与学习笔记</small>
            </span>
            <div className="name-editor">
              <input
                aria-label="你的名字"
                value={state.displayName}
                maxLength={20}
                placeholder="输入你的名字"
                onChange={(e) => patch({ displayName: e.target.value })}
                onBlur={() => patch({ displayName: state.displayName.trim() || '学习者' })}
              />
              <span>{state.displayName.length}/20</span>
            </div>
          </label>
          <div className="profile-preview">
            <div className="avatar">{state.displayName.trim().charAt(0).toUpperCase() || 'W'}</div>
            <div>
              <b>{state.displayName || '学习者'}</b>
              <small>你的个性化问候会立即更新</small>
            </div>
          </div>
        </section>
        <section className="panel settings-section accessibility-settings">
          <h3>
            <Accessibility />
            无障碍与显示
          </h3>
          <label>
            <span>
              <b>高对比度</b>
              <small>加强文字、边框、按钮和焦点指示的视觉区分</small>
            </span>
            <input
              className="setting-switch"
              type="checkbox"
              checked={state.highContrast}
              onChange={(event) => patch({ highContrast: event.target.checked })}
            />
          </label>
          <label>
            <span>
              <b>减少动态效果</b>
              <small>关闭浮动、过渡和提示动画，减少视觉干扰</small>
            </span>
            <input
              className="setting-switch"
              type="checkbox"
              checked={state.reducedMotion}
              onChange={(event) => patch({ reducedMotion: event.target.checked })}
            />
          </label>
          <label>
            <span>
              <b>键盘快捷键</b>
              <small>使用 Alt + 1—6 切换页面，按 ? 随时查看帮助</small>
            </span>
            <button aria-label="查看快捷键" className="outline" onClick={onShowShortcuts}>
              <Keyboard aria-hidden="true" />
              查看快捷键
            </button>
          </label>
          <div className="accessibility-note">
            <Eye />
            <span>系统启用“减少动态效果”时，应用也会自动遵循。</span>
          </div>
        </section>{' '}
        <section className="panel settings-section">
          <h3>
            <BookOpen />
            学习设置
          </h3>
          <label>
            <span>
              <b>英语等级</b>
              <small>控制单词和故事难度</small>
            </span>
            <select value={state.level} onChange={(e) => patch({ level: e.target.value })}>
              <option>A1</option>
              <option>A2</option>
              <option>B1</option>
              <option>B2</option>
            </select>
          </label>
          <label>
            <span>
              <b>每日目标</b>
              <small>固定 20 词，调整新词与复习比例</small>
            </span>
            <select
              value={state.wordMix}
              onChange={(e) => patch({ wordMix: e.target.value as WordMix })}
            >
              <option value="15+5">15 新词 + 5 复习</option>
              <option value="20+0">20 个新词</option>
              <option value="10+10">10 新词 + 10 复习</option>
              <option value="dynamic">AI 动态安排</option>
            </select>
          </label>
          <label>
            <span>
              <b>每日学习时间</b>
              <small>用于首页计划时长与学习节奏</small>
            </span>
            <select
              value={state.dailyMinutes}
              onChange={(e) => patch({ dailyMinutes: Number(e.target.value) as DailyMinutes })}
            >
              <option value={15}>15 分钟</option>
              <option value={20}>20 分钟</option>
              <option value={30}>30 分钟</option>
            </select>
          </label>
          <label>
            <span>
              <b>发音偏好</b>
              <small>用于单词与故事朗读</small>
            </span>
            <div className="segment">
              <button
                className={state.accent === '美式' ? 'active' : ''}
                onClick={() => patch({ accent: '美式' })}
              >
                美式
              </button>
              <button
                className={state.accent === '英式' ? 'active' : ''}
                onClick={() => patch({ accent: '英式' })}
              >
                英式
              </button>
            </div>
          </label>
        </section>
        <section className="panel settings-section">
          <h3>
            <WandSparkles />
            故事设置
          </h3>
          <label>
            <span>
              <b>长期故事类型</b>
              <small>每天的剧情会持续推进</small>
            </span>
            <select value={state.genre} onChange={(e) => patch({ genre: e.target.value })}>
              <option>奇幻冒险</option>
              <option>科幻探索</option>
              <option>都市生活</option>
              <option>悬疑推理</option>
            </select>
          </label>
          <label>
            <span>
              <b>故事长度</b>
              <small>适合 {state.level} 水平</small>
            </span>
            <select
              value={state.storyLength}
              onChange={(e) => patch({ storyLength: e.target.value as StoryLength })}
            >
              <option value="short">短 · 100—180 词</option>
              <option value="medium">标准 · 180—300 词</option>
              <option value="long">长 · 300—500 词</option>
            </select>
          </label>
        </section>
        <section className="panel settings-section pwa-settings">
          <h3>
            <Smartphone />
            应用与离线
          </h3>
          <div className={`pwa-health ${pwa.online ? 'online' : 'offline'}`}>
            {pwa.online ? <Wifi /> : <WifiOff />}
            <span>
              <b>{pwa.online ? '当前在线' : '当前离线'}</b>
              <small>
                {pwa.online
                  ? '应用壳和学习内容会自动更新缓存。'
                  : '可以继续使用已缓存内容，学习进度仍保存在本机。'}
              </small>
            </span>
          </div>
          <label>
            <span>
              <b>安装状态</b>
              <small>{pwa.installed ? '已作为独立应用运行' : '安装后可从桌面或主屏幕启动'}</small>
            </span>
            {pwa.installAvailable ? (
              <button
                aria-label="安装应用"
                className="outline"
                onClick={() => void pwa.requestInstall()}
              >
                <Download />
                安装应用
              </button>
            ) : (
              <button
                aria-label={installHelp ? '收起安装方法' : '查看安装方法'}
                className="outline"
                onClick={() => setInstallHelp((shown) => !shown)}
              >
                <Smartphone />
                {installHelp ? '收起方法' : '查看安装方法'}
              </button>
            )}
          </label>
          {pwa.updateReady && (
            <label>
              <span>
                <b>应用更新</b>
                <small>新版本已缓存，本地学习记录不会被清除</small>
              </span>
              <button className="outline" onClick={pwa.applyUpdate}>
                <RefreshCw />
                立即更新
              </button>
            </label>
          )}
          {installHelp && (
            <div className="install-guide">
              <b>安装方法</b>
              <ol>
                <li>Chrome / Edge：打开浏览器菜单，选择“安装词境英语”。</li>
                <li>iPhone / iPad Safari：点击“分享”，再选择“添加到主屏幕”。</li>
              </ol>
            </div>
          )}
        </section>
        <section className="panel settings-section">
          <h3>
            <Cloud />
            Obsidian 与数据
          </h3>
          <label>
            <span>
              <b>导出模式</b>
              <small>第一版使用安全的本地 Markdown 下载</small>
            </span>
            <button
              className="outline"
              onClick={() => {
                downloadText('WordQuest-今日学习.md', makeMarkdown(state))
                notify('今日笔记已导出')
              }}
            >
              <Download />
              导出今日笔记
            </button>
          </label>
          <label>
            <span>
              <b>数据恢复</b>
              <small>应用会保留上一份有效快照，用于缓存升级或数据损坏后的恢复</small>
            </span>
            <button
              className="outline"
              onClick={() => {
                if (!restoreAppStateBackup()) {
                  notify('暂时没有可恢复的本地备份')
                  return
                }
                notify('已恢复上一份有效备份，正在重新加载')
                window.setTimeout(() => location.reload(), 400)
              }}
            >
              <RefreshCw />
              恢复备份
            </button>
          </label>
          <label>
            <span>
              <b>本地数据</b>
              <small>学习记录保存在当前浏览器</small>
            </span>
            <button
              className="outline danger"
              onClick={() => {
                if (confirm('确定重置所有演示数据？')) {
                  clearAppState()
                  location.reload()
                }
              }}
            >
              重置数据
            </button>
          </label>
        </section>
        <section className="panel settings-section about">
          <Logo />
          <p>每天学 20 个词，把它们变成属于你的英语故事。</p>
          <span>WordQuest MVP · 本地优先版本</span>
        </section>
      </div>
    </div>
  )
}
