import { useEffect, useRef } from 'react'
import { Keyboard, X } from 'lucide-react'

const shortcuts = [
  ['Alt + 1', '打开今日首页'],
  ['Alt + 2', '打开单词学习'],
  ['Alt + 3', '打开今日故事'],
  ['Alt + 4', '打开个人词库'],
  ['Alt + 5', '打开学习周报'],
  ['Alt + 6', '打开设置'],
  ['?', '打开快捷键帮助'],
  ['Esc', '关闭菜单或帮助窗口'],
]

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function AccessibilityHelp({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    closeButton.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialog}
        className="accessibility-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-dialog-title"
      >
        <header>
          <span className="dialog-icon" aria-hidden="true">
            <Keyboard />
          </span>
          <div>
            <p className="eyebrow">KEYBOARD HELP</p>
            <h2 id="shortcut-dialog-title">键盘快捷键</h2>
          </div>
          <button
            ref={closeButton}
            className="icon-btn"
            aria-label="关闭快捷键帮助"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <p>快捷键不会在输入框、下拉框或文本编辑区域中触发。</p>
        <dl className="shortcut-list">
          {shortcuts.map(([keys, action]) => (
            <div key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
