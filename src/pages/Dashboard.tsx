import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Cloud,
  Download,
  Flame,
  FastForward,
  Headphones,
  Home,
  Languages,
  Library,
  LockKeyhole,
  Menu,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  WandSparkles,
  X,
} from 'lucide-react'
import type { AppState, DailySession, Page } from '../domain/models'
import {
  canStartNextBatch,
  choiceContinuations,
  formatSessionDate,
  getWeekDateKeys,
  storyLengthLabels,
} from '../domain/sessions'
import { getNewWords } from '../domain/learning'

export function Dashboard({
  state,
  learnedCount,
  previousSession,
  setPage,
  notify,
  onStartNextBatch,
}: {
  state: AppState
  learnedCount: number
  previousSession?: DailySession
  setPage: (p: Page) => void
  notify: (s: string) => void
  onStartNextBatch: () => void
}) {
  const nextBatchAvailable = canStartNextBatch(state)
  const pct = Math.round((learnedCount / 20) * 100)
  const newWords = getNewWords(state),
    reviewCount = state.dailyWordPlan?.reviewCount ?? 0,
    newCount = state.dailyWordPlan?.newCount ?? 0
  const weekKeys = getWeekDateKeys(state.activeDate),
    continuity = previousSession ? choiceContinuations[previousSession.storyChoice] : undefined
  const date = formatSessionDate(state.activeDate)
  return (
    <div className="page dashboard-page">
      <header className="page-title">
        <div>
          <p className="eyebrow">{date}</p>
          <h1>
            早上好，{state.displayName || '学习者'} <span>👋</span>
          </h1>
          <p>今天的森林里，似乎有一道新的光。</p>
        </div>
      </header>
      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-badges">
            <span>
              <Sparkles size={14} />
              今日第 {state.activeBatch} 组
            </span>
            <span>约 {state.dailyMinutes} 分钟</span>
          </div>
          <h2>
            {state.completed
              ? `第 ${state.activeBatch} 组已完成！`
              : state.dailyWordPlan
                ? `20 个新词正在等待被写进故事${reviewCount ? `，另有 ${reviewCount} 个到期复习词` : ''}。`
                : '正在准备你的专属词汇…'}
          </h2>
          <p>
            {state.completed
              ? '可以继续学习下一组，今天不设组数上限。'
              : '先认识它们、读出它们，然后用它们打开古老观测站的门。'}
          </p>
          <div className="hero-progress">
            <div>
              <span>今日进度</span>
              <strong>{learnedCount} / 20</strong>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="今日学习进度"
              aria-valuemin={0}
              aria-valuemax={20}
              aria-valuenow={learnedCount}
            >
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
          {state.completed ? (
            <button
              className="light-button"
              disabled={!nextBatchAvailable}
              onClick={onStartNextBatch}
            >
              <FastForward size={18} />
              下一组词 · 再学 20 个
            </button>
          ) : (
            <button
              className="light-button"
              disabled={!state.dailyWordPlan}
              onClick={() => setPage(learnedCount === 20 ? 'quiz' : 'learn')}
            >
              {state.dailyWordPlan
                ? learnedCount
                  ? '继续当前学习'
                  : `开始第 ${state.activeBatch} 组`
                : '正在加载今日计划…'}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
        <div className="hero-art">
          <div className="moon-orb" />
          <div className="mountains">
            <i />
            <i />
            <i />
          </div>
          <div className="path-line" />
          <div className="hero-book">
            <span>W</span>
          </div>
          <div className="floating-word w1">discover</div>
          <div className="floating-word w2">courage</div>
          <div className="floating-word w3">signal</div>
        </div>
      </section>
      <div className="content-grid">
        <section className="panel today-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">TODAY'S WORDS · GROUP {state.activeBatch}</p>
              <h3>本组目标词</h3>
            </div>
            <button onClick={() => setPage('learn')}>
              查看全部 <ChevronRight size={16} />
            </button>
          </div>
          <div className="word-preview">
            {newWords.slice(0, 6).map((w, i) => (
              <button key={w.word} onClick={() => setPage('learn')}>
                <span className={`word-index ${state.learned[w.word] ? 'done' : ''}`}>
                  {state.learned[w.word] ? <Check size={14} /> : i + 1}
                </span>
                <div>
                  <strong>{w.word}</strong>
                  <small>{w.phonetic}</small>
                </div>
                <span>{w.meaning}</span>
                {w.review && <em>复习</em>}
              </button>
            ))}
          </div>
          <div className="word-foot">
            <div className="mini-avatars">
              <span>{newCount}</span>
              <span>{reviewCount}</span>
            </div>
            <p>
              <b>{newCount}</b> 个新词 · <b>{reviewCount}</b> 个复习词
              {state.wordMix === 'dynamic' && <small> · AI 动态</small>}
            </p>
          </div>
        </section>
        <aside className="right-column">
          <section className="panel story-teaser">
            <div className="teaser-cover">
              <span>CHAPTER 1</span>
              <div className="tower">✦</div>
            </div>
            <div>
              <p className="eyebrow">你的长期故事</p>
              <h3>雾林中的观测站</h3>
              <p>“蓝色信号在地图上闪烁，仿佛在指引一条从未有人走过的路……”</p>
              {continuity && (
                <div className="continuity-note">
                  <RotateCcw />
                  <span>
                    <b>承接昨日：{continuity.title}</b>
                    <small>{continuity.summary}</small>
                  </span>
                </div>
              )}
              <button onClick={() => setPage('story')}>
                {state.quizDone ? '继续故事' : '完成测试后解锁'}{' '}
                {state.quizDone ? <ArrowRight size={15} /> : <LockKeyhole size={14} />}
              </button>
            </div>
          </section>
          <section className="panel week-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">THIS WEEK</p>
                <h3>本周节奏</h3>
              </div>
              <button onClick={() => setPage('report')}>周报</button>
            </div>
            <div className="week-days">
              {weekKeys.map((key, i) => {
                const done = Boolean(state.sessions[key])
                return (
                  <div key={key}>
                    <span>{['一', '二', '三', '四', '五', '六', '日'][i]}</span>
                    <i
                      className={`${done ? 'done ' : ''}${key === state.activeDate ? 'today' : ''}`}
                    >
                      {done ? <Check size={13} /> : key === state.activeDate ? '今' : ''}
                    </i>
                  </div>
                )
              })}
            </div>
            <div className="week-stat">
              <Flame size={21} />
              <span>
                <b>{state.streak} 天连续学习</b>
                <small>再坚持 2 天，刷新本月记录</small>
              </span>
            </div>
          </section>
        </aside>
      </div>
      <button className="sync-bar" onClick={() => notify('Markdown 已准备好，可在周报页导出')}>
        <Cloud size={18} />
        <span>
          <b>Obsidian</b> · 本地导出模式
        </span>
        <i>
          设置同步 <ChevronRight size={15} />
        </i>
      </button>
    </div>
  )
}
