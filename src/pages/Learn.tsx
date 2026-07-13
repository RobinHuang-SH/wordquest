import { useRef, useState } from 'react'
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
  Headphones,
  Home,
  Languages,
  Library,
  LockKeyhole,
  Menu,
  Mic,
  Moon,
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
import type { AppState, Knowledge, Page } from '../domain/models'
import { getReviewCount, getSessionWords } from '../domain/learning'
import { speak } from '../services/speech'

export function Learn({
  state,
  patch,
  setPage,
  notify,
}: {
  state: AppState
  patch: (p: Partial<AppState>) => void
  setPage: (p: Page) => void
  notify: (s: string) => void
}) {
  const sessionWords = getSessionWords(state)
  const index = Math.min(state.currentWord, 19),
    word = sessionWords[index]
  const [showMeaning, setShowMeaning] = useState(true),
    [recording, setRecording] = useState(false),
    [audioUrl, setAudioUrl] = useState('')
  const recorder = useRef<MediaRecorder | null>(null),
    chunks = useRef<Blob[]>([])
  const choose = (v: Knowledge) => {
    const learned = { ...state.learned, [word.word]: v }
    const next = Math.min(19, index + 1)
    patch({ learned, currentWord: next })
    if (index === 19) notify('20 个目标词已完成，测试已解锁！')
  }
  const startRecord = async () => {
    if (recording) {
      recorder.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      recorder.current = r
      chunks.current = []
      r.ondataavailable = (e) => chunks.current.push(e.data)
      r.onstop = () => {
        setAudioUrl(URL.createObjectURL(new Blob(chunks.current, { type: 'audio/webm' })))
        stream.getTracks().forEach((t) => t.stop())
      }
      r.start()
      setRecording(true)
    } catch {
      notify('请允许浏览器使用麦克风')
    }
  }
  return (
    <div className="page learn-page">
      <header className="learn-top">
        <button className="back-link" onClick={() => setPage('home')}>
          <ArrowLeft />
          返回今日
        </button>
        <div className="lesson-progress">
          <span>单词学习</span>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="单词学习进度"
            aria-valuemin={1}
            aria-valuemax={20}
            aria-valuenow={index + 1}
          >
            <i style={{ width: `${((index + 1) / 20) * 100}%` }} />
          </div>
          <b>{index + 1} / 20</b>
        </div>
        <button className="icon-btn" aria-label="更多学习选项">
          <MoreHorizontal aria-hidden="true" />
        </button>
      </header>
      <div className="learn-layout">
        <aside className="word-rail">
          <p>今日目标</p>
          {sessionWords.map((w, i) => (
            <button
              key={w.word}
              className={`${i === index ? 'current' : ''} ${state.learned[w.word] ? 'done' : ''}`}
              aria-current={i === index ? 'step' : undefined}
              aria-label={`${i + 1}. ${w.word}${w.review ? '，复习词' : ''}${state.learned[w.word] ? '，已学习' : ''}`}
              onClick={() => patch({ currentWord: i })}
            >
              <span>{state.learned[w.word] ? <Check /> : i + 1}</span>
              <b>{w.word}</b>
              {w.review && <em>复习</em>}
            </button>
          ))}
        </aside>
        <section className="flashcard-wrap">
          <div className="flashcard">
            <div className="card-top">
              <span className="level-pill">{word.level}</span>
              {word.review && (
                <span className="review-pill">
                  <RotateCcw />
                  复习词
                </span>
              )}
              <button aria-label={`收藏单词 ${word.word}`} onClick={() => notify('已加入收藏')}>
                <Star />
              </button>
            </div>
            <p className="word-count">WORD {String(index + 1).padStart(2, '0')}</p>
            <h1>{word.word}</h1>
            <div className="pronunciation">
              <span>{word.phonetic}</span>
              <i>{word.pos}</i>
              <button onClick={() => speak(word.word, 0.85, state.accent)}>
                <Volume2 /> {state.accent}
              </button>
              <button onClick={() => speak(word.word, 0.58, state.accent)}>
                <Play /> 慢速
              </button>
            </div>
            <button
              className="meaning-toggle"
              aria-expanded={showMeaning}
              aria-controls="word-meaning"
              onClick={() => setShowMeaning(!showMeaning)}
            >
              <Languages /> {showMeaning ? '隐藏释义' : '显示释义'}
            </button>
            {showMeaning && (
              <div id="word-meaning" className="meaning-block">
                <h2>{word.meaning}</h2>
                <p>{word.definition}</p>
              </div>
            )}
            <div className="example-block">
              <span>EXAMPLE</span>
              <p>
                “{word.example}”{' '}
                <button
                  aria-label={`朗读例句：${word.example}`}
                  onClick={() => speak(word.example, 0.78, state.accent)}
                >
                  <Volume2 aria-hidden="true" />
                </button>
              </p>
              <small>{word.exampleZh}</small>
            </div>
            <div className="collocations">
              <span>常见搭配</span>
              {word.collocations.map((c) => (
                <button key={c} onClick={() => speak(c, 0.8, state.accent)}>
                  {c}
                  <Volume2 />
                </button>
              ))}
            </div>
            <div className="record-block">
              <div>
                <span className={recording ? 'record-dot pulse' : 'record-dot'} />
                <div>
                  <strong>{recording ? '正在录音…' : '轮到你了'}</strong>
                  <small>朗读单词，然后听听自己的发音</small>
                </div>
              </div>
              <div>
                <button className={recording ? 'recording' : ''} onClick={startRecord}>
                  {recording ? <Pause /> : <Mic />}
                  {recording ? '停止' : '录音'}
                </button>
                {audioUrl && (
                  <button onClick={() => new Audio(audioUrl).play()}>
                    <Play />
                    回放
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="knowledge-actions">
            <p>你对这个词的感觉是？</p>
            <div>
              <button onClick={() => choose('new')}>
                <CircleHelp />
                不认识
              </button>
              <button onClick={() => choose('fuzzy')}>
                <Moon />
                有点模糊
              </button>
              <button className="know" onClick={() => choose('know')}>
                <CheckCircle2 />
                认识
              </button>
            </div>
          </div>
          <div className="card-nav">
            <button disabled={index === 0} onClick={() => patch({ currentWord: index - 1 })}>
              <ArrowLeft />
              上一个
            </button>
            <span>键盘提示：按 1 / 2 / 3 选择掌握度</span>
            {index < 19 ? (
              <button onClick={() => patch({ currentWord: index + 1 })}>
                下一个
                <ArrowRight />
              </button>
            ) : (
              <button className="finish" onClick={() => setPage('quiz')}>
                开始测试
                <ArrowRight />
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
