import { useMemo, useState } from 'react'
import { BookOpen, ChevronRight, Download, RotateCcw, Search, Trophy, Volume2 } from 'lucide-react'
import type { AppState } from '../domain/models'
import { getReviewCount, getSessionWords } from '../domain/learning'
import { speak } from '../services/speech'

export function Vocabulary({ state }: { state: AppState }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部')
  const rows = useMemo(
    () =>
      getSessionWords(state)
        .filter((w) => w.word.includes(search.toLowerCase()) || w.meaning.includes(search))
        .filter(
          (w) =>
            filter === '全部' ||
            (filter === '已学习' && state.learned[w.word]) ||
            (filter === '待复习' && w.review),
        ),
    [search, filter, state],
  )
  return (
    <div className="page">
      <header className="page-title">
        <div>
          <p className="eyebrow">MY VOCABULARY</p>
          <h1>我的词库</h1>
          <p>每一个学会的词，都在拓宽你的故事世界。</p>
        </div>
        <button className="primary small">
          <Download />
          导入词表
        </button>
      </header>
      <div className="library-stats">
        <div>
          <span className="stat-icon green">
            <BookOpen />
          </span>
          <b>{Object.keys(state.learned).length}</b>
          <p>今日已学习</p>
        </div>
        <div>
          <span className="stat-icon amber">
            <RotateCcw />
          </span>
          <b>{getReviewCount(state)}</b>
          <p>等待复习</p>
        </div>
        <div>
          <span className="stat-icon blue">
            <Volume2 />
          </span>
          <b>2</b>
          <p>发音需加强</p>
        </div>
        <div>
          <span className="stat-icon purple">
            <Trophy />
          </span>
          <b>68%</b>
          <p>平均掌握度</p>
        </div>
      </div>
      <section className="panel library-panel">
        <div className="library-toolbar">
          <div className="search-box">
            <Search />
            <input
              aria-label="搜索单词或释义"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索单词或释义…"
            />
          </div>
          <div className="filters">
            {['全部', '已学习', '待复习'].map((f) => (
              <button
                className={filter === f ? 'active' : ''}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                key={f}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="word-table" role="table" aria-label="个人词库">
          <div className="table-head" role="row">
            <span role="columnheader">单词</span>
            <span role="columnheader">释义</span>
            <span role="columnheader">状态</span>
            <span role="columnheader">掌握度</span>
            <span role="columnheader">最近学习</span>
            <span role="columnheader" aria-label="操作" />
          </div>
          {rows.map((w, i) => (
            <div className="table-row" role="row" key={w.word}>
              <span role="cell">
                <button aria-label={`朗读 ${w.word}`} onClick={() => speak(w.word)}>
                  <Volume2 />
                </button>
                <b>{w.word}</b>
                <small>
                  {w.phonetic} · {w.pos}
                </small>
              </span>
              <span role="cell">{w.meaning}</span>
              <span role="cell">
                <em
                  className={state.learned[w.word] ? 'mastered' : w.review ? 'review' : 'learning'}
                >
                  {state.learned[w.word] ? '今日已学' : w.review ? '待复习' : '学习中'}
                </em>
              </span>
              <span role="cell">
                <i className="score-bar">
                  <i style={{ width: `${state.learned[w.word] ? 75 + (i % 3) * 7 : 30}%` }} />
                </i>
                {state.learned[w.word] ? 75 + (i % 3) * 7 : 30}%
              </span>
              <span role="cell">今天</span>
              <span role="cell">
                <ChevronRight aria-hidden="true" />
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
