import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Check,
  CheckCircle2,
  ChevronRight,
  LockKeyhole,
  Sparkles,
  Volume2,
} from 'lucide-react'
import type { AppState } from '../domain/models'
import { getReviewCount } from '../domain/learning'
import { Logo } from '../components/AppShell'

export function Onboarding({
  step,
  setStep,
  state,
  patch,
}: {
  step: number
  setStep: (n: number) => void
  state: AppState
  patch: (p: Partial<AppState>) => void
}) {
  const levels = [
    { id: 'A1', title: '初学者', desc: '能理解常见词和简单句' },
    { id: 'A2', title: '基础', desc: '能处理日常生活场景' },
    { id: 'B1', title: '中级', desc: '能理解熟悉话题的要点' },
    { id: 'B2', title: '中高级', desc: '能自然交流并阅读长文' },
  ]
  const genres = ['奇幻冒险', '科幻探索', '都市生活', '悬疑推理', '旅行探索', '职场故事']
  return (
    <div className="onboarding">
      <div className="onboard-top">
        <Logo />
        <span>设置你的专属学习旅程</span>
      </div>
      <div className="onboard-card">
        <div
          className="stepper"
          role="progressbar"
          aria-label="首次设置进度"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
        >
          <span className={step >= 1 ? 'done' : ''}>1</span>
          <i className={step >= 2 ? 'done' : ''} />
          <span className={step >= 2 ? 'done' : ''}>2</span>
          <i className={step >= 3 ? 'done' : ''} />
          <span className={step >= 3 ? 'done' : ''}>3</span>
        </div>
        {step === 1 && (
          <>
            <p className="eyebrow">第一步 · 你的水平</p>
            <h1>你现在的英语水平是？</h1>
            <p className="subtext">别担心，之后可以随时调整。我们会据此控制单词和故事难度。</p>
            <div className="choice-grid">
              {levels.map((l) => (
                <button
                  key={l.id}
                  className={state.level === l.id ? 'selected' : ''}
                  aria-pressed={state.level === l.id}
                  onClick={() => patch({ level: l.id })}
                >
                  <b>{l.id}</b>
                  <div>
                    <strong>{l.title}</strong>
                    <span>{l.desc}</span>
                  </div>
                  {state.level === l.id && <CheckCircle2 />}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <p className="eyebrow">第二步 · 故事世界</p>
            <h1>你想走进怎样的故事？</h1>
            <p className="subtext">每天学会的词，会成为推动故事的线索。</p>
            <div className="genre-grid">
              {genres.map((g, i) => (
                <button
                  key={g}
                  className={state.genre === g ? 'selected' : ''}
                  aria-pressed={state.genre === g}
                  onClick={() => patch({ genre: g })}
                >
                  <span>{['🗺️', '🚀', '☕', '🔎', '⛺', '💼'][i]}</span>
                  <strong>{g}</strong>
                  {state.genre === g && <Check />}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <p className="eyebrow">第三步 · 学习偏好</p>
            <h1>最后，调好你的节奏</h1>
            <p className="subtext">默认每天 20 个目标词，学习比例和时长之后也能随时调整。</p>
            <div className="preference-list">
              <div>
                <span>
                  <Volume2 />
                  发音偏好
                </span>
                <div className="segment">
                  <button
                    className={state.accent === '美式' ? 'active' : ''}
                    aria-pressed={state.accent === '美式'}
                    onClick={() => patch({ accent: '美式' })}
                  >
                    美式
                  </button>
                  <button
                    className={state.accent === '英式' ? 'active' : ''}
                    aria-pressed={state.accent === '英式'}
                    onClick={() => patch({ accent: '英式' })}
                  >
                    英式
                  </button>
                </div>
              </div>
              <div>
                <span>
                  <BookMarked />
                  每日目标
                </span>
                <strong>20 个词 · {state.dailyMinutes} 分钟</strong>
              </div>
              <div>
                <span>
                  <Sparkles />
                  智能安排
                </span>
                <strong>
                  {20 - getReviewCount(state)} 新词 + {getReviewCount(state)} 复习
                </strong>
              </div>
            </div>
          </>
        )}
        <div className="onboard-actions">
          {step > 1 ? (
            <button className="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft />
              返回
            </button>
          ) : (
            <span />
          )}
          <button
            className="primary"
            onClick={() => (step < 3 ? setStep(step + 1) : patch({ onboarded: true }))}
          >
            {step < 3 ? '继续' : '开启今天的故事'}
            <ArrowRight />
          </button>
        </div>
      </div>
      <p className="privacy">
        <LockKeyhole size={14} />
        学习数据默认只保存在你的浏览器中
      </p>
    </div>
  )
}
