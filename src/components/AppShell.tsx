import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Flame,
  Home,
  Library,
  Menu,
  MoreHorizontal,
  Settings,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react'
import type { AppState, Page } from '../domain/models'

export function Logo() {
  return (
    <div className="logo" aria-label="词境英语 WordQuest">
      <div className="logo-mark" aria-hidden="true">
        <BookOpen size={22} />
        <Sparkles size={12} />
      </div>
      <div>
        <strong>词境英语</strong>
        <span>WORDQUEST</span>
      </div>
    </div>
  )
}

const navItems: { id: Page; label: string; icon: LucideIcon; shortcut: string }[] = [
  { id: 'home', label: '今日', icon: Home, shortcut: 'Alt+1' },
  { id: 'learn', label: '学习', icon: BookOpen, shortcut: 'Alt+2' },
  { id: 'story', label: '故事', icon: WandSparkles, shortcut: 'Alt+3' },
  { id: 'library', label: '词库', icon: Library, shortcut: 'Alt+4' },
  { id: 'report', label: '周报', icon: BarChart3, shortcut: 'Alt+5' },
]

export function Sidebar({
  page,
  setPage,
  state,
}: {
  page: Page
  setPage: (p: Page) => void
  state: AppState
}) {
  return (
    <aside className="sidebar" aria-label="应用侧边栏">
      <Logo />
      <nav aria-label="主要导航">
        {navItems.map(({ id, label, icon: Icon, shortcut }) => (
          <button
            key={id}
            className={page === id ? 'active' : ''}
            aria-current={page === id ? 'page' : undefined}
            aria-keyshortcuts={shortcut}
            onClick={() => setPage(id)}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
            {id === 'learn' && (
              <b aria-label={`已学习 ${Object.keys(state.learned).length} 个，共 20 个`}>
                {Object.keys(state.learned).length}/20
              </b>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="streak-card" aria-label={`连续学习 ${state.streak} 天`}>
          <Flame size={22} aria-hidden="true" />
          <div>
            <strong>{state.streak} 天</strong>
            <span>连续学习</span>
          </div>
        </div>
        <button
          className={`settings-link ${page === 'settings' ? 'active' : ''}`}
          aria-current={page === 'settings' ? 'page' : undefined}
          aria-keyshortcuts="Alt+6"
          onClick={() => setPage('settings')}
        >
          <Settings size={20} aria-hidden="true" />
          设置
        </button>
        <div className="profile">
          <div className="avatar" aria-hidden="true">
            {state.displayName.trim().charAt(0).toUpperCase() || 'W'}
          </div>
          <div>
            <strong>{state.displayName || '学习者'}</strong>
            <span>
              {state.level} · {state.accent}发音
            </span>
          </div>
          <MoreHorizontal size={18} aria-hidden="true" />
        </div>
      </div>
    </aside>
  )
}

export function MobileHeader({
  setPage,
  menuOpen,
  setMenuOpen,
}: {
  setPage: (p: Page) => void
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
}) {
  return (
    <header className="mobile-header">
      <button
        aria-label={menuOpen ? '关闭导航菜单' : '打开导航菜单'}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      <Logo />
      <button aria-label="打开设置" onClick={() => setPage('settings')}>
        <Settings aria-hidden="true" />
      </button>
    </header>
  )
}

export function MobileMenu({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  return (
    <nav id="mobile-navigation" className="mobile-menu" aria-label="移动端主要导航">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={page === id ? 'active' : ''}
          aria-current={page === id ? 'page' : undefined}
          onClick={() => setPage(id)}
        >
          <Icon size={19} aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  )
}
