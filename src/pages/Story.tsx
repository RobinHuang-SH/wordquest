import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Headphones,
  Languages,
  LockKeyhole,
  LoaderCircle,
  Pause,
  RotateCcw,
  RefreshCw,
  Sparkles,
  WandSparkles,
  Volume2,
} from 'lucide-react'
import { storyChoices, storyVariants } from '../data'
import type { AppState, DailySession, Page, Word } from '../domain/models'
import { choiceContinuations, getSessionKey, storyLengthLabels } from '../domain/sessions'
import { getNewWords } from '../domain/learning'
import { speak } from '../services/speech'

const ui = {
  storyLocked: '\u4eca\u65e5\u6545\u4e8b\u5c1a\u672a\u89e3\u9501',
  finishQuiz: '\u5148\u5b8c\u6210\u5355\u8bcd\u5c0f\u6d4b',
  quizHelp:
    '\u6d4b\u8bd5\u4f1a\u5e2e\u52a9\u4f60\u5de9\u56fa\u4eca\u5929\u7684\u76ee\u6807\u8bcd\uff0c\u518d\u8fdb\u5165\u6545\u4e8b\u8bed\u5883\u3002',
  startQuiz: '\u5f00\u59cb\u6d4b\u8bd5',
  todayHome: '\u4eca\u65e5\u9996\u9875',
  aiStory: 'AI \u6bcf\u65e5\u6545\u4e8b',
  localSeries: '\u96fe\u6797\u4e2d\u7684\u89c2\u6d4b\u7ad9',
  chapter: '\u7b2c 4 \u5929 / \u7b2c\u4e00\u7ae0',
  bilingual: '\u4e2d\u82f1\u5bf9\u7167',
  pause: '\u6682\u505c',
  readAll: '\u6717\u8bfb\u5168\u6587',
  localTitleZh: '\u68ee\u6797\u91cc\u7684\u4fe1\u53f7',
  continuity: '\u6628\u65e5\u9009\u62e9\u5df2\u7eed\u5199',
  today: '\u4eca\u65e5',
  wordsIncluded: '\u4e2a\u76ee\u6807\u8bcd\u5df2\u878d\u5165',
  words: '\u8bcd',
  about: '\u7ea6',
  minutes: '\u5206\u949f\u9605\u8bfb',
  readParagraph: '\u6717\u8bfb\u672c\u6bb5\u82f1\u6587',
  structuredReady: '\u7ed3\u6784\u5316\u6545\u4e8b\u5df2\u5c31\u7eea',
  validationPassed:
    '\u8bcd\u6c47\u3001\u96be\u5ea6\u4e0e\u8fde\u7eed\u6027\u6821\u9a8c\u901a\u8fc7',
  repaired: '\u81ea\u52a8\u4fee\u590d',
  offlineStory: '\u672c\u5730\u79bb\u7ebf\u6545\u4e8b',
  highlighted: '\u5df2\u663e\u793a\u5168\u90e8\u9ad8\u4eae\u8bcd',
  viewWords: '\u67e5\u770b\u8bcd\u6c47',
  nextAction: '\u63a5\u4e0b\u6765\uff0c\u7c73\u5a05\u5e94\u8be5\u600e\u4e48\u505a\uff1f',
  choiceFuture:
    '\u4f60\u7684\u9009\u62e9\u5c06\u6210\u4e3a\u660e\u5929\u6545\u4e8b\u7684\u8d77\u70b9\u3002',
  recordUpdated:
    '\u4eca\u65e5\u8bb0\u5f55\u5df2\u66f4\u65b0\uff0c\u6ca1\u6709\u91cd\u590d\u65b0\u589e',
  recordSaved: '\u4eca\u65e5\u5b66\u4e60\u8bb0\u5f55\u5df2\u4fdd\u5b58',
  choiceSaved: '\u9009\u62e9\u5df2\u4fdd\u5b58',
  tomorrowContinues:
    '\u660e\u5929\u7684\u6545\u4e8b\u5c06\u4ece\u8fd9\u91cc\u7ee7\u7eed\u3002\u4eca\u5929\u7684\u5b66\u4e60\u8bb0\u5f55\u5df2\u5b8c\u6210\u3002',
  viewSummary: '\u67e5\u770b\u5b66\u4e60\u603b\u7ed3',
} as const

function HighlightedStory({ paragraph, words }: { paragraph: string; words: Word[] }) {
  const targets = words.map((word) => word.word)
  if (!targets.length) return <p>{paragraph}</p>
  const escaped = targets.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`\\b((?:${escaped.join('|')})(?:s|ed)?)\\b`, 'gi')
  const parts = paragraph.split(regex)
  return (
    <p>
      {parts.map((part, index) =>
        targets.some((word) => part.toLowerCase().startsWith(word.toLowerCase())) ? (
          <mark key={index}>{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  )
}

export function Story({
  state,
  completeToday,
  previousSession,
  setPage,
  notify,
  storyLoading = false,
  storyError = '',
  retryStory = () => undefined,
  onStartNextBatch = () => undefined,
}: {
  state: AppState
  completeToday: (choice: string) => void
  previousSession?: DailySession
  setPage: (p: Page) => void
  notify: (s: string) => void
  storyLoading?: boolean
  storyError?: string
  retryStory?: () => void
  onStartNextBatch?: () => void
}) {
  const [translation, setTranslation] = useState(false)
  const [playing, setPlaying] = useState(false)
  const generated = state.dailyStory?.date === state.activeDate ? state.dailyStory : null
  const activeStory = generated?.paragraphs ?? storyVariants[state.storyLength]
  const activeChoices = generated?.choices ?? storyChoices
  const targetWords = getNewWords(state)
  const storyInfo = storyLengthLabels[state.storyLength]
  const continuity = previousSession ? choiceContinuations[previousSession.storyChoice] : undefined
  const storyWordCount = activeStory.reduce(
    (total, paragraph) => total + paragraph.en.trim().split(/\s+/).length,
    0,
  )
  const coverageCount =
    generated?.validation.targetWords.covered.length ??
    generated?.vocabularyCoverage.length ??
    targetWords.length
  const coverageTotal = generated?.validation.targetWords.total ?? targetWords.length
  const playAll = () => {
    if (playing) {
      speechSynthesis.cancel()
      setPlaying(false)
    } else {
      speak(activeStory.map((paragraph) => paragraph.en).join(' '), 0.72, state.accent)
      setPlaying(true)
      setTimeout(() => setPlaying(false), storyInfo.minutes * 18000)
    }
  }
  if (!state.quizDone)
    return (
      <div className="page centered-page">
        <div className="locked-card">
          <LockKeyhole />
          <p className="eyebrow">{ui.storyLocked}</p>
          <h1>{ui.finishQuiz}</h1>
          <p>{ui.quizHelp}</p>
          <button className="primary" onClick={() => setPage('quiz')}>
            {ui.startQuiz} <ArrowRight />
          </button>
        </div>
      </div>
    )
  if (!generated)
    return (
      <div className="page centered-page">
        <div className="locked-card">
          {storyLoading ? <LoaderCircle className="spin" /> : <WandSparkles />}
          <p className="eyebrow">专属故事</p>
          <h1>{storyLoading ? '正在把 20 个新词写进故事…' : '故事还没有准备好'}</h1>
          <p>
            {storyError ||
              (targetWords.length === 20 &&
              targetWords.every((word) => Boolean(state.learned[word.word]))
                ? '通常需要几十秒，请稍候。'
                : '完成本组 20 个新词后，故事会自动重新生成。')}
          </p>
          {storyError ? (
            <button className="primary" onClick={retryStory}>
              <RefreshCw /> 重新生成
            </button>
          ) : !storyLoading ? (
            <button className="primary" onClick={() => setPage('learn')}>
              继续学习新词 <ArrowRight />
            </button>
          ) : null}
        </div>
      </div>
    )
  return (
    <div className="page story-page">
      <header className="story-header">
        <button className="back-link" onClick={() => setPage('home')}>
          <ArrowLeft />
          {ui.todayHome}
        </button>
        <div>
          <span>{generated ? ui.aiStory : ui.localSeries}</span>
          <small>{generated ? `Prompt v${generated.generation.promptVersion}` : ui.chapter}</small>
        </div>
        <div>
          <button
            className={translation ? 'active' : ''}
            aria-pressed={translation}
            onClick={() => setTranslation(!translation)}
          >
            <Languages />
            {ui.bilingual}
          </button>
          <button onClick={playAll}>
            {playing ? <Pause /> : <Headphones />}
            {playing ? ui.pause : ui.readAll}
          </button>
        </div>
      </header>
      <article className="story-paper">
        <div className="chapter-label">
          <span>CHAPTER 01</span>
          <i>
            {generated?.generation.status === 'FALLBACK'
              ? 'SAFE FALLBACK'
              : generated?.validation.passed
                ? 'VALIDATED STORY'
                : 'DAILY STORY'}
          </i>
        </div>
        <h1>{generated?.title ?? 'The Signal in the Forest'}</h1>
        <p className="story-subtitle">{generated?.titleZh ?? ui.localTitleZh}</p>
        {continuity && (
          <div className="story-continuity">
            <RotateCcw />
            <div>
              <span>{ui.continuity}</span>
              <b>{continuity.title}</b>
              <p>{continuity.summary}</p>
            </div>
          </div>
        )}
        <div className="story-meta">
          <span>
            <Sparkles />
            {ui.today} {coverageCount} {ui.wordsIncluded}
          </span>
          <span>
            {storyInfo.name} / {storyWordCount} {ui.words} / {ui.about} {storyInfo.minutes}{' '}
            {ui.minutes}
          </span>
        </div>
        <div className="story-text">
          {activeStory.map((paragraph, index) => (
            <div className="story-paragraph" key={`${index}-${paragraph.en}`}>
              <button
                aria-label={ui.readParagraph}
                onClick={() => speak(paragraph.en, 0.72, state.accent)}
              >
                <Volume2 />
              </button>
              <HighlightedStory paragraph={paragraph.en} words={targetWords} />
              {translation && <small>{paragraph.zh}</small>}
            </div>
          ))}
        </div>
        <div className="coverage">
          <div>
            <CheckCircle2 />
            <span>
              <b>{generated?.validation.passed ? ui.validationPassed : ui.structuredReady}</b>
              <small>
                {coverageCount} / {coverageTotal} {ui.wordsIncluded} /{' '}
                {generated ? generated.generation.model : ui.offlineStory}
                {generated?.generation.repairCount
                  ? ` / ${ui.repaired} ${generated.generation.repairCount}`
                  : ''}
              </small>
            </span>
          </div>
          <button onClick={() => notify(ui.highlighted)}>
            {ui.viewWords} <ChevronRight />
          </button>
        </div>
        <section className="choice-section">
          <div className="choice-title">
            <p className="eyebrow">YOUR CHOICE</p>
            <h2>{ui.nextAction}</h2>
            <p>{ui.choiceFuture}</p>
          </div>
          <div className="story-choices">
            {activeChoices.map((choice, index) => (
              <button
                key={choice.id}
                className={state.storyChoice === choice.id ? 'selected' : ''}
                aria-pressed={state.storyChoice === choice.id}
                onClick={() => {
                  completeToday(choice.id)
                  notify(
                    state.sessions[getSessionKey(state.activeDate, state.activeBatch)]
                      ? ui.recordUpdated
                      : ui.recordSaved,
                  )
                }}
              >
                <span>{['1', '2', '3'][index]}</span>
                <div>
                  <strong>{choice.title}</strong>
                  <small>{choice.en}</small>
                  <p>{choice.hint}</p>
                </div>
                {state.storyChoice === choice.id ? <CheckCircle2 /> : <ArrowRight />}
              </button>
            ))}
          </div>
          {state.storyChoice && (
            <div className="choice-confirm">
              <CheckCircle2 />
              <span>
                <b>{ui.choiceSaved}</b>
                <small>{ui.tomorrowContinues}</small>
              </span>
              <button onClick={onStartNextBatch}>学习下一组</button>
            </div>
          )}
        </section>
      </article>
    </div>
  )
}
