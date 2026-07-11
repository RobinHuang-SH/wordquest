import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Headphones, Trophy } from 'lucide-react'
import type { AppState, Page } from '../domain/models'
import { quizQuestions } from '../domain/learning'
import { speak } from '../services/speech'

export function Quiz({
  state,
  patch,
  setPage,
}: {
  state: AppState
  patch: (p: Partial<AppState>) => void
  setPage: (p: Page) => void
}) {
  const [q, setQ] = useState(0)
  const item = quizQuestions[q]
  const selected = state.quizAnswers[q]
  const correct = Object.entries(state.quizAnswers).filter(
    ([i, a]) => quizQuestions[+i]?.answer === a,
  ).length
  if (state.quizDone)
    return (
      <div className="page centered-page">
        <div className="result-card">
          <div className="result-ring">
            <Trophy />
            <strong>{correct * 20}</strong>
            <span>分</span>
          </div>
          <p className="eyebrow">测试完成</p>
          <h1>做得很好，故事已解锁！</h1>
          <p>你已经为今天的 20 个词建立了第一层记忆。接下来，把它们放进真实语境里。</p>
          <div className="result-stats">
            <div>
              <b>{correct}/5</b>
              <span>答对题数</span>
            </div>
            <div>
              <b>20</b>
              <span>故事目标词</span>
            </div>
            <div>
              <b>+12</b>
              <span>获得星光</span>
            </div>
          </div>
          <button className="primary" onClick={() => setPage('story')}>
            进入今日故事 <ArrowRight />
          </button>
          <button
            className="text-button"
            onClick={() => {
              patch({ quizDone: false, quizAnswers: {} })
              setQ(0)
            }}
          >
            重新测试
          </button>
        </div>
      </div>
    )
  return (
    <div className="page quiz-page">
      <header className="learn-top">
        <button className="back-link" onClick={() => setPage('learn')}>
          <ArrowLeft />
          返回学习
        </button>
        <div className="lesson-progress">
          <span>单词小测</span>
          <div className="progress-track">
            <i style={{ width: `${((q + 1) / 5) * 100}%` }} />
          </div>
          <b>{q + 1} / 5</b>
        </div>
        <button className="text-button" onClick={() => patch({ quizDone: true })}>
          暂时跳过
        </button>
      </header>
      <div className="quiz-card">
        <p className="eyebrow">QUESTION {q + 1}</p>
        <h1>{item.q}</h1>
        {item.word === 'signal' && (
          <button
            className="listen-question"
            onClick={() => speak('A blue light sent a signal.', 0.72, state.accent)}
          >
            <Headphones />
            听例句
          </button>
        )}
        <div className="quiz-options">
          {item.options.map((o, i) => (
            <button
              key={o}
              className={selected === o ? 'selected' : ''}
              onClick={() => patch({ quizAnswers: { ...state.quizAnswers, [q]: o } })}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              {o}
              {selected === o && <CheckCircle2 />}
            </button>
          ))}
        </div>
        <div className="quiz-next">
          <span>{selected ? '已选择答案' : '请选择一个答案'}</span>
          <button
            disabled={!selected}
            onClick={() => (q < 4 ? setQ(q + 1) : patch({ quizDone: true }))}
          >
            {q < 4 ? '下一题' : '查看结果'}
            <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  )
}
