import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Download,
  RotateCcw,
  Trophy,
  Volume2,
} from 'lucide-react'
import { storyChoices } from '../data'
import type { AppState } from '../domain/models'
import {
  choiceContinuations,
  createWeeklyReport,
  formatSessionDate,
  getWeekDateKeys,
  storyLengthLabels,
} from '../domain/sessions'
import { getReviewCount } from '../domain/learning'
import { makeMarkdown } from '../services/markdown'
import { downloadText } from '../services/download'

function HistoryCalendar({ state }: { state: AppState }) {
  const sessionDates = Object.keys(state.sessions).sort()
  const [selectedDate, setSelectedDate] = useState(sessionDates.at(-1) || state.activeDate)
  const [visibleMonth, setVisibleMonth] = useState(() => state.activeDate.slice(0, 7))
  const [year, month] = visibleMonth.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1),
    daysInMonth = new Date(year, month, 0).getDate()
  const offset = (firstDay.getDay() + 6) % 7
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, '0')),
  ]
  const selectedSession = state.sessions[selectedDate]
  const moveMonth = (amount: number) => {
    const next = new Date(year, month - 1 + amount, 1)
    setVisibleMonth(next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0'))
  }
  return (
    <section className="panel history-calendar-panel">
      <div className="history-head">
        <div>
          <p className="eyebrow">LEARNING HISTORY</p>
          <h3>
            <CalendarDays />
            学习日历
          </h3>
          <span>共保存 {sessionDates.length} 个学习日，同一天完成多次只更新一条记录。</span>
        </div>
        <div className="calendar-nav">
          <button aria-label="上个月" onClick={() => moveMonth(-1)}>
            <ArrowLeft />
          </button>
          <b>
            {year} 年 {month} 月
          </b>
          <button aria-label="下个月" onClick={() => moveMonth(1)}>
            <ArrowRight />
          </button>
        </div>
      </div>
      <div className="calendar-weekdays">
        {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, index) => {
          if (!day) return <span className="calendar-blank" key={'blank-' + index} />
          const dateKey = visibleMonth + '-' + day,
            session = state.sessions[dateKey]
          const className =
            'calendar-day' +
            (session ? ' has-session' : '') +
            (dateKey === state.activeDate ? ' today' : '') +
            (dateKey === selectedDate ? ' selected' : '')
          return (
            <button
              key={dateKey}
              className={className}
              onClick={() => session && setSelectedDate(dateKey)}
              disabled={!session}
              aria-label={formatSessionDate(dateKey) + (session ? '，已完成' : '，无记录')}
            >
              <span>{Number(day)}</span>
              {session && (
                <i>
                  <Check />
                </i>
              )}
            </button>
          )
        })}
      </div>
      {selectedSession ? (
        <div className="session-detail">
          <div>
            <p className="eyebrow">SESSION DETAIL</p>
            <h4>{formatSessionDate(selectedDate)}</h4>
            <span>
              {choiceContinuations[selectedSession.storyChoice]?.title ||
                storyChoices.find((choice) => choice.id === selectedSession.storyChoice)?.title ||
                '故事选择已保存'}
            </span>
          </div>
          <div className="session-detail-grid">
            <span>
              <b>{selectedSession.learnedCount}</b>
              <small>学习词数</small>
            </span>
            <span>
              <b>
                {selectedSession.newCount} + {selectedSession.reviewCount}
              </b>
              <small>新词 / 复习</small>
            </span>
            <span>
              <b>{selectedSession.quizScore}</b>
              <small>小测得分</small>
            </span>
            <span>
              <b>{storyLengthLabels[selectedSession.storyLength].name}</b>
              <small>{selectedSession.dailyMinutes} 分钟计划</small>
            </span>
          </div>
        </div>
      ) : (
        <div className="session-empty">
          <CalendarDays />
          <span>
            <b>还没有历史记录</b>
            <small>完成今日故事选择后，学习记录会出现在这里。</small>
          </span>
        </div>
      )}
    </section>
  )
}

export function Report({ state, notify }: { state: AppState; notify: (s: string) => void }) {
  const exportMd = () => {
    downloadText(state.activeDate + '-WordQuest.md', makeMarkdown(state))
    notify('Markdown 已导出，可放入 Obsidian Vault')
  }
  const weeklyReport = createWeeklyReport(state),
    weekKeys = getWeekDateKeys(state.activeDate)
  const weekValues = weekKeys.map((key) => state.sessions[key]?.learnedCount || 0)
  const weekWords = weeklyReport.learnedWords,
    weekStories = weeklyReport.storyCount
  const range =
    formatSessionDate(weekKeys[0]).replace(/星期.*/, '') +
    ' — ' +
    formatSessionDate(weekKeys[6]).replace(/星期.*/, '')
  return (
    <div className="page">
      <header className="page-title report-title">
        <div>
          <p className="eyebrow">WEEKLY REVIEW</p>
          <h1>本周学习周报</h1>
          <p>{range}</p>
        </div>
        <button className="primary small" onClick={exportMd}>
          <Download />
          导出到 Obsidian
        </button>
      </header>
      <section className="report-hero">
        <div>
          <p>本周你已经走了很远</p>
          <h2>
            学会 <b>{weekWords}</b> 个词，读完 <b>{weekStories}</b> 段故事。
          </h2>
          <span>
            {weekStories
              ? '本周已有 ' + weekStories + ' 天留下完整记录，继续保持这样的节奏！'
              : '完成今日故事选择后，这里会生成第一条学习记录。'}
          </span>
        </div>
        <div className="report-medal">
          <Trophy />
          <strong>{state.streak}</strong>
          <span>连续天数</span>
        </div>
      </section>
      <div className="report-grid">
        <HistoryCalendar state={state} />
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">LEARNING ACTIVITY</p>
              <h3>每日学习词数</h3>
            </div>
            <span className="up">本周 {weekWords} 词</span>
          </div>
          <div className="bar-chart">
            {weekValues.map((value, index) => (
              <div key={weekKeys[index]}>
                <span
                  className={weekKeys[index] === state.activeDate ? 'today' : ''}
                  style={{ height: Math.max(4, value * 6) + 'px' }}
                >
                  <b>{value || ''}</b>
                </span>
                <small>
                  {weekKeys[index] === state.activeDate
                    ? '今'
                    : ['一', '二', '三', '四', '五', '六', '日'][index]}
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel mastery-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">MASTERY</p>
              <h3>掌握度分布</h3>
            </div>
          </div>
          <div className="donut">
            <div>
              <strong>68%</strong>
              <span>平均掌握</span>
            </div>
          </div>
          <ul>
            <li>
              <i className="c1" />
              已掌握 <b>42</b>
            </li>
            <li>
              <i className="c2" />
              初步掌握 <b>27</b>
            </li>
            <li>
              <i className="c3" />
              需要复习 <b>7</b>
            </li>
          </ul>
        </section>
        <section className="panel chapter-panel">
          <div className="chapter-cover">
            <span>WEEK 01</span>
            <div>✦</div>
          </div>
          <div>
            <p className="eyebrow">本周故事章节</p>
            <h3>第一章 · 蓝色信号</h3>
            <p>米娅收到祖父的古老地图，穿过雾林，并在废弃观测站发现一台仍在运转的机器……</p>
            <div className="chapter-tags">
              <span>{weekStories} 个故事节点</span>
              <span>{weekWords} 个学习词</span>
            </div>
            <button onClick={() => notify('周故事已根据每日节点整理完成')}>
              阅读完整章节 <ArrowRight />
            </button>
          </div>
        </section>
        <section className="panel focus-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">NEXT FOCUS</p>
              <h3>下周建议</h3>
            </div>
          </div>
          <div className="focus-item">
            <span>
              <Volume2 />
            </span>
            <div>
              <b>加强发音</b>
              <p>courage 和 entrance 的重音还可以更清晰。</p>
            </div>
          </div>
          <div className="focus-item">
            <span>
              <RotateCcw />
            </span>
            <div>
              <b>及时复习 {getReviewCount(state)} 个词</b>
              <p>它们正在进入遗忘区间，建议明天优先安排。</p>
            </div>
          </div>
          <div className="focus-item">
            <span>
              <BookOpen />
            </span>
            <div>
              <b>试试 300 词故事</b>
              <p>你的阅读正确率足以挑战更长的章节。</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
