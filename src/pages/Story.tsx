import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Headphones, Languages, LockKeyhole, Pause, RotateCcw, Sparkles, Volume2 } from 'lucide-react'
import { storyChoices, storyVariants, todayWords } from '../data'
import type { AppState, DailySession, Page } from '../domain/models'
import { choiceContinuations, storyLengthLabels } from '../domain/sessions'
import { speak } from '../services/speech'

function HighlightedStory({paragraph}:{paragraph:string}) {
  const words=todayWords.map(w=>w.word); const regex=new RegExp(`\\b((?:${words.join('|')})(?:s|ed)?)\\b`,'gi'); const parts=paragraph.split(regex)
  return <p>{parts.map((p,i)=> words.some(w=>p.toLowerCase().startsWith(w))?<mark key={i}>{p}</mark>:<span key={i}>{p}</span>)}</p>
}
export function Story({state,completeToday,previousSession,setPage,notify}:{state:AppState,completeToday:(choice:string)=>void,previousSession?:DailySession,setPage:(p:Page)=>void,notify:(s:string)=>void}) {
  const [translation,setTranslation]=useState(false), [playing,setPlaying]=useState(false)
  const activeStory=storyVariants[state.storyLength], storyInfo=storyLengthLabels[state.storyLength]
  const continuity=previousSession?choiceContinuations[previousSession.storyChoice]:undefined
  const storyWordCount=activeStory.reduce((total,paragraph)=>total+paragraph.en.trim().split(/\s+/).length,0)
  const playAll=()=>{ if(playing){speechSynthesis.cancel();setPlaying(false)}else{speak(activeStory.map(p=>p.en).join(' '),.72,state.accent);setPlaying(true); setTimeout(()=>setPlaying(false),storyInfo.minutes*18000)} }
  if(!state.quizDone) return <div className="page centered-page"><div className="locked-card"><LockKeyhole/><p className="eyebrow">今日故事尚未解锁</p><h1>先完成单词小测</h1><p>测试会帮助你巩固今天的目标词，再进入故事语境。</p><button className="primary" onClick={()=>setPage('quiz')}>开始测试 <ArrowRight/></button></div></div>
  return <div className="page story-page"><header className="story-header"><button className="back-link" onClick={()=>setPage('home')}><ArrowLeft/>今日首页</button><div><span>雾林中的观测站</span><small>第 4 天 · 第一章</small></div><div><button className={translation?'active':''} onClick={()=>setTranslation(!translation)}><Languages/>中英对照</button><button onClick={playAll}>{playing?<Pause/>:<Headphones/>}{playing?'暂停':'朗读全文'}</button></div></header><article className="story-paper"><div className="chapter-label"><span>CHAPTER 01</span><i>DAY FOUR</i></div><h1>The Signal in the Forest</h1><p className="story-subtitle">森林里的信号</p>{continuity&&<div className="story-continuity"><RotateCcw/><div><span>昨日选择已继承</span><b>{continuity.title}</b><p>{continuity.summary}</p></div></div>}<div className="story-meta"><span><Sparkles/>今日 20 词已全部融入</span><span>{storyInfo.name} · {storyWordCount} 词 · 约 {storyInfo.minutes} 分钟阅读</span></div><div className="story-text">{activeStory.map(p=><div className="story-paragraph" key={p.en}><button onClick={()=>speak(p.en,.72,state.accent)}><Volume2/></button><HighlightedStory paragraph={p.en}/>{translation&&<small>{p.zh}</small>}</div>)}</div><div className="coverage"><div><CheckCircle2/><span><b>词汇覆盖验证通过</b><small>20 / 20 个今日目标词已出现 · 核心词汇覆盖率 96%</small></span></div><button onClick={()=>notify('已显示全部高亮词')}>查看词汇 <ChevronRight/></button></div><section className="choice-section"><div className="choice-title"><p className="eyebrow">YOUR CHOICE</p><h2>接下来，米娅应该怎么做？</h2><p>你的选择将成为明天故事的起点。</p></div><div className="story-choices">{storyChoices.map(c=><button key={c.id} className={state.storyChoice===c.id?'selected':''} onClick={()=>{completeToday(c.id);notify(state.sessions[state.activeDate]?'今日记录已更新，没有重复新增':'今日学习记录已保存')}}><span>{c.icon}</span><div><strong>{c.title}</strong><small>{c.en}</small><p>{c.hint}</p></div>{state.storyChoice===c.id?<CheckCircle2/>:<ArrowRight/>}</button>)}</div>{state.storyChoice&&<div className="choice-confirm"><CheckCircle2/><span><b>选择已保存</b><small>明天的故事将从这里继续。今天的学习记录已完成。</small></span><button onClick={()=>setPage('report')}>查看学习总结</button></div>}</section></article></div>
}

