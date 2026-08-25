import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Headphones, Trophy } from 'lucide-react'
import type { AppState, Page } from '../domain/models'
import { getNewWords, getQuizQuestions, getQuizScore } from '../domain/learning'
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
  const questions = getQuizQuestions(state)
  const targetWordCount = getNewWords(state).length
  const item = questions[q]
  const selected = state.quizAnswers[q]
  const correct = Object.entries(state.quizAnswers).filter(
    ([i, a]) => questions[+i]?.answer === a,
  ).length
  const score = getQuizScore(state.quizAnswers, questions)
  if (state.quizDone)
    return (
      <div className="page centered-page">
        <div className="result-card">
          <div className="result-ring">
            <Trophy />
            <strong>{score}</strong>
            <span>分</span>
          </div>
          <p className="eyebrow">测试完成</p>
          <h1>做得很好，故事已解锁！</h1>
          <p>
            你已经为今天的 {targetWordCount} 个词建立了第一层记忆。接下来，把它们放进真实语境里。
          </p>
          <div className="result-stats">
            <div>
              <b>
                {correct}/{questions.length}
              </b>
              <span>答对题数</span>
            </div>
            <div>
              <b>{targetWordCount}</b>
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
          <div
            className="progress-track"
            role="progressbar"
            aria-label="小测进度"
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-valuenow={q + 1}
          >
            <i style={{ width: `${((q + 1) / questions.length) * 100}%` }} />
          </div>
          <b>
            {q + 1} / {questions.length}
          </b>
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
        <div className="quiz-options" role="group" aria-label={`第 ${q + 1} 题选项`}>
          {item.options.map((o, i) => (
            <button
              key={o}
              className={selected === o ? 'selected' : ''}
              aria-pressed={selected === o}
              onClick={() => patch({ quizAnswers: { ...state.quizAnswers, [q]: o } })}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              {o}
              {selected === o && <CheckCircle2 />}
            </button>
          ))}
        </div>
        <div className="quiz-next">
          <span aria-live="polite">{selected ? '已选择答案' : '请选择一个答案'}</span>
          <button
            disabled={!selected}
            onClick={() => (q < questions.length - 1 ? setQ(q + 1) : patch({ quizDone: true }))}
          >
            {q < questions.length - 1 ? '下一题' : '查看结果'}
            <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  )
}
