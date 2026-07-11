import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BarChart3, BookMarked, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronRight, CircleHelp, Cloud, Download, Flame, Headphones, Home, Languages,
  Library, LockKeyhole, Menu, Mic, Moon, MoreHorizontal, Pause, Play, RotateCcw,
  Search, Settings, Sparkles, Star, Trophy, Volume2, WandSparkles, X
} from 'lucide-react'
import { storyChoices, storyVariants, todayWords, type StoryLength, type Word } from './data'
import './styles.css'

type Page = 'home'|'learn'|'quiz'|'story'|'library'|'report'|'settings'
type Knowledge = 'know'|'fuzzy'|'new'
type WordMix = '20+0'|'15+5'|'10+10'|'dynamic'
type DailyMinutes = 15|20|30
type DailySession = {
  date: string; learned: Record<string, Knowledge>; learnedCount: number;
  newCount: number; reviewCount: number; quizScore: number; storyChoice: string;
  storyLength: StoryLength; dailyMinutes: DailyMinutes; completedAt: string;
}
type AppState = {
  onboarded: boolean; displayName: string; level: string; genre: string; accent: string;
  learned: Record<string, Knowledge>; currentWord: number; quizAnswers: Record<number, string>;
  quizDone: boolean; storyChoice: string; completed: boolean; streak: number;
  wordMix: WordMix; storyLength: StoryLength; dailyMinutes: DailyMinutes;
  activeDate: string; sessions: Record<string, DailySession>;
}

const initialState: AppState = {
  onboarded:false, displayName:'Mia', level:'A2', genre:'奇幻冒险', accent:'美式', learned:{}, currentWord:0,
  quizAnswers:{}, quizDone:false, storyChoice:'', completed:false, streak:7,
  wordMix:'15+5', storyLength:'medium', dailyMinutes:20,
  activeDate:'', sessions:{},
}

const getDateKey = (date = new Date()) => {
  const year=date.getFullYear(), month=String(date.getMonth()+1).padStart(2,'0'), day=String(date.getDate()).padStart(2,'0')
  return `${year}-${month}-${day}`
}
const addDays = (dateKey:string, amount:number) => {
  const [year,month,day]=dateKey.split('-').map(Number), date=new Date(year,month-1,day)
  date.setDate(date.getDate()+amount)
  return getDateKey(date)
}

const loadState = (): AppState => {
  const today=getDateKey()
  try {
    const saved=JSON.parse(localStorage.getItem('wordquest-state') || '{}')
    const merged={ ...initialState, ...saved, activeDate:saved.activeDate || today, sessions:saved.sessions || {} } as AppState
    if(merged.completed && merged.storyChoice && !merged.sessions[merged.activeDate]) {
      const reviewCount=getReviewCount(merged)
      const correct=Object.entries(merged.quizAnswers).filter(([index,answer])=>quizQuestions[+index]?.answer===answer).length
      merged.sessions={...merged.sessions,[merged.activeDate]:{
        date:merged.activeDate, learned:{...merged.learned}, learnedCount:Object.keys(merged.learned).length,
        newCount:20-reviewCount, reviewCount, quizScore:correct*20, storyChoice:merged.storyChoice,
        storyLength:merged.storyLength, dailyMinutes:merged.dailyMinutes, completedAt:new Date().toISOString(),
      }}
    }
    if(merged.activeDate!==today) return {...merged,activeDate:today,learned:{},currentWord:0,quizAnswers:{},quizDone:false,storyChoice:'',completed:false}
    return merged
  }
  catch { return {...initialState,activeDate:today} }
}

function getReviewCount(state: AppState) {
  if (state.wordMix === '20+0') return 0
  if (state.wordMix === '10+10') return 10
  if (state.wordMix === 'dynamic') {
    const weakCount = Object.values(state.learned).filter(value => value === 'new' || value === 'fuzzy').length
    return weakCount >= 6 ? 10 : 5
  }
  return 5
}

function getSessionWords(state: AppState): Word[] {
  const reviewCount = getReviewCount(state)
  const priority = [
    ...todayWords.filter(word => word.review),
    ...todayWords.filter(word => !word.review && (state.learned[word.word] === 'new' || state.learned[word.word] === 'fuzzy')),
    ...todayWords.filter(word => !word.review && state.learned[word.word] !== 'new' && state.learned[word.word] !== 'fuzzy'),
  ]
  const reviewWords = new Set(priority.slice(0, reviewCount).map(word => word.word))
  return todayWords.map(word => ({ ...word, review: reviewWords.has(word.word) }))
}

const storyLengthLabels: Record<StoryLength, { range: string; minutes: number; name: string }> = {
  short: { range: '100—180 词', minutes: 1, name: '短篇' },
  medium: { range: '180—300 词', minutes: 2, name: '标准' },
  long: { range: '300—500 词', minutes: 4, name: '长篇' },
}

const choiceContinuations: Record<string, { title:string; summary:string }> = {
  underground: { title:'地下通道仍在延伸', summary:'你昨天选择进入地下通道。蓝色信号沿着石壁闪烁，把米娅带向观测站更深处。' },
  machine: { title:'银色机器再次启动', summary:'你昨天选择返回研究机器。机器保存的第二段录音，成为今天冒险的新线索。' },
  shadow: { title:'森林黑影留下足迹', summary:'你昨天选择追踪森林黑影。清晨的新鲜足迹，一直延伸到旧观测站门前。' },
}

function getPreviousSession(state:AppState) {
  return state.sessions[addDays(state.activeDate,-1)]
}
function getWeekDateKeys(dateKey:string) {
  const [year,month,day]=dateKey.split('-').map(Number), current=new Date(year,month-1,day)
  const mondayOffset=(current.getDay()+6)%7
  return Array.from({length:7},(_,index)=>addDays(dateKey,index-mondayOffset))
}
function formatSessionDate(dateKey:string) {
  const [year,month,day]=dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'short'}).format(new Date(year,month-1,day))
}

function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [page, setPage] = useState<Page>('home')
  const [onboarding, setOnboarding] = useState(1)
  const [toast, setToast] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => localStorage.setItem('wordquest-state', JSON.stringify(state)), [state])
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
  }, [])
  const patch = (next: Partial<AppState>) => setState(s => ({...s, ...next}))
  const notify = (text:string) => { setToast(text); window.setTimeout(()=>setToast(''), 2400) }
  const learnedCount = Object.keys(state.learned).length
  const previousSession=getPreviousSession(state)
  const completeToday=(storyChoice:string)=>setState(current=>{
    const reviewCount=getReviewCount(current)
    const correct=Object.entries(current.quizAnswers).filter(([index,answer])=>quizQuestions[+index]?.answer===answer).length
    const existing=current.sessions[current.activeDate]
    const session:DailySession={
      date:current.activeDate, learned:{...current.learned}, learnedCount:Object.keys(current.learned).length,
      newCount:20-reviewCount, reviewCount, quizScore:correct*20, storyChoice,
      storyLength:current.storyLength, dailyMinutes:current.dailyMinutes,
      completedAt:existing?.completedAt || new Date().toISOString(),
    }
    return {...current,storyChoice,completed:true,sessions:{...current.sessions,[current.activeDate]:session}}
  })

  if (!state.onboarded) return <Onboarding step={onboarding} setStep={setOnboarding} state={state} patch={patch} />

  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} state={state} />
    <main className="main">
      <MobileHeader setPage={setPage} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {menuOpen && <MobileMenu page={page} setPage={(p)=>{setPage(p);setMenuOpen(false)}} />}
      {page==='home' && <Dashboard state={state} learnedCount={learnedCount} previousSession={previousSession} setPage={setPage} notify={notify} />}
      {page==='learn' && <Learn state={state} patch={patch} setPage={setPage} notify={notify} />}
      {page==='quiz' && <Quiz state={state} patch={patch} setPage={setPage} />}
      {page==='story' && <Story state={state} completeToday={completeToday} previousSession={previousSession} setPage={setPage} notify={notify} />}
      {page==='library' && <Vocabulary state={state} />}
      {page==='report' && <Report state={state} notify={notify} />}
      {page==='settings' && <SettingsPage state={state} patch={patch} notify={notify} />}
    </main>
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>
}

function Logo() {
  return <div className="logo"><div className="logo-mark"><BookOpen size={22}/><Sparkles size={12}/></div><div><strong>词境英语</strong><span>WORDQUEST</span></div></div>
}

const navItems: {id:Page,label:string,icon:any}[] = [
  {id:'home',label:'今日',icon:Home},{id:'learn',label:'学习',icon:BookOpen},{id:'story',label:'故事',icon:WandSparkles},
  {id:'library',label:'词库',icon:Library},{id:'report',label:'周报',icon:BarChart3}
]

function Sidebar({page,setPage,state}:{page:Page,setPage:(p:Page)=>void,state:AppState}) {
  return <aside className="sidebar">
    <Logo />
    <nav>{navItems.map(({id,label,icon:Icon})=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={20}/><span>{label}</span>{id==='learn'&&<b>{Object.keys(state.learned).length}/20</b>}</button>)}</nav>
    <div className="sidebar-bottom">
      <div className="streak-card"><Flame size={22}/><div><strong>{state.streak} 天</strong><span>连续学习</span></div></div>
      <button className={`settings-link ${page==='settings'?'active':''}`} onClick={()=>setPage('settings')}><Settings size={20}/>设置</button>
      <div className="profile"><div className="avatar">{state.displayName.trim().charAt(0).toUpperCase() || "W"}</div><div><strong>{state.displayName || "学习者"}</strong><span>{state.level} · {state.accent}发音</span></div><MoreHorizontal size={18}/></div>
    </div>
  </aside>
}

function MobileHeader({setPage,menuOpen,setMenuOpen}:{setPage:(p:Page)=>void,menuOpen:boolean,setMenuOpen:(v:boolean)=>void}) {
  return <header className="mobile-header"><button onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button><Logo/><button onClick={()=>setPage('settings')}><Settings/></button></header>
}
function MobileMenu({page,setPage}:{page:Page,setPage:(p:Page)=>void}) {
  return <div className="mobile-menu">{navItems.map(({id,label,icon:Icon})=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={19}/>{label}</button>)}</div>
}

function Onboarding({step,setStep,state,patch}:{step:number,setStep:(n:number)=>void,state:AppState,patch:(p:Partial<AppState>)=>void}) {
  const levels = [{id:'A1',title:'初学者',desc:'能理解常见词和简单句'},{id:'A2',title:'基础',desc:'能处理日常生活场景'},{id:'B1',title:'中级',desc:'能理解熟悉话题的要点'},{id:'B2',title:'中高级',desc:'能自然交流并阅读长文'}]
  const genres = ['奇幻冒险','科幻探索','都市生活','悬疑推理','旅行探索','职场故事']
  return <div className="onboarding">
    <div className="onboard-top"><Logo/><span>设置你的专属学习旅程</span></div>
    <div className="onboard-card">
      <div className="stepper"><span className={step>=1?'done':''}>1</span><i className={step>=2?'done':''}/><span className={step>=2?'done':''}>2</span><i className={step>=3?'done':''}/><span className={step>=3?'done':''}>3</span></div>
      {step===1 && <><p className="eyebrow">第一步 · 你的水平</p><h1>你现在的英语水平是？</h1><p className="subtext">别担心，之后可以随时调整。我们会据此控制单词和故事难度。</p><div className="choice-grid">{levels.map(l=><button key={l.id} className={state.level===l.id?'selected':''} onClick={()=>patch({level:l.id})}><b>{l.id}</b><div><strong>{l.title}</strong><span>{l.desc}</span></div>{state.level===l.id&&<CheckCircle2/>}</button>)}</div></>}
      {step===2 && <><p className="eyebrow">第二步 · 故事世界</p><h1>你想走进怎样的故事？</h1><p className="subtext">每天学会的词，会成为推动故事的线索。</p><div className="genre-grid">{genres.map((g,i)=><button key={g} className={state.genre===g?'selected':''} onClick={()=>patch({genre:g})}><span>{['🗺️','🚀','☕','🔎','⛺','💼'][i]}</span><strong>{g}</strong>{state.genre===g&&<Check/>}</button>)}</div></>}
      {step===3 && <><p className="eyebrow">第三步 · 学习偏好</p><h1>最后，调好你的节奏</h1><p className="subtext">默认每天 20 个目标词，学习比例和时长之后也能随时调整。</p><div className="preference-list"><div><span><Volume2/>发音偏好</span><div className="segment"><button className={state.accent==='美式'?'active':''} onClick={()=>patch({accent:'美式'})}>美式</button><button className={state.accent==='英式'?'active':''} onClick={()=>patch({accent:'英式'})}>英式</button></div></div><div><span><BookMarked/>每日目标</span><strong>20 个词 · {state.dailyMinutes} 分钟</strong></div><div><span><Sparkles/>智能安排</span><strong>{20-getReviewCount(state)} 新词 + {getReviewCount(state)} 复习</strong></div></div></>}
      <div className="onboard-actions">{step>1?<button className="ghost" onClick={()=>setStep(step-1)}><ArrowLeft/>返回</button>:<span/>}<button className="primary" onClick={()=> step<3?setStep(step+1):patch({onboarded:true})}>{step<3?'继续':'开启今天的故事'}<ArrowRight/></button></div>
    </div>
    <p className="privacy"><LockKeyhole size={14}/>学习数据默认只保存在你的浏览器中</p>
  </div>
}

function Dashboard({state,learnedCount,previousSession,setPage,notify}:{state:AppState,learnedCount:number,previousSession?:DailySession,setPage:(p:Page)=>void,notify:(s:string)=>void}) {
  const pct = Math.round(learnedCount/20*100)
  const sessionWords = getSessionWords(state), reviewCount = getReviewCount(state), newCount = 20-reviewCount
  const weekKeys=getWeekDateKeys(state.activeDate), continuity=previousSession?choiceContinuations[previousSession.storyChoice]:undefined
  const date = new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date())
  return <div className="page dashboard-page">
    <header className="page-title"><div><p className="eyebrow">{date}</p><h1>早上好，{state.displayName || "学习者"} <span>👋</span></h1><p>今天的森林里，似乎有一道新的光。</p></div><button className="icon-btn" title="切换深色模式"><Moon size={20}/></button></header>
    <section className="hero-card">
      <div className="hero-copy"><div className="hero-badges"><span><Sparkles size={14}/>今日旅程</span><span>约 {state.dailyMinutes} 分钟</span></div><h2>{state.completed?'今日冒险已完成！':'20 个词，正在等待被写进故事。'}</h2><p>{state.completed?'你守住了连续学习记录。明天，故事会继承今天的选择。':'先认识它们、读出它们，然后用它们打开古老观测站的门。'}</p><div className="hero-progress"><div><span>今日进度</span><strong>{learnedCount} / 20</strong></div><div className="progress-track"><i style={{width:`${pct}%`}}/></div></div><button className="light-button" onClick={()=>setPage(learnedCount===20?'quiz':'learn')}>{learnedCount?'继续今日学习':'开始今日学习'}<ArrowRight size={18}/></button></div>
      <div className="hero-art"><div className="moon-orb"/><div className="mountains"><i/><i/><i/></div><div className="path-line"/><div className="hero-book"><span>W</span></div><div className="floating-word w1">discover</div><div className="floating-word w2">courage</div><div className="floating-word w3">signal</div></div>
    </section>
    <div className="content-grid">
      <section className="panel today-panel"><div className="panel-head"><div><p className="eyebrow">TODAY'S WORDS</p><h3>今日目标词</h3></div><button onClick={()=>setPage('learn')}>查看全部 <ChevronRight size={16}/></button></div><div className="word-preview">{sessionWords.slice(0,6).map((w,i)=><button key={w.word} onClick={()=>setPage('learn')}><span className={`word-index ${state.learned[w.word]?'done':''}`}>{state.learned[w.word]?<Check size={14}/>:i+1}</span><div><strong>{w.word}</strong><small>{w.phonetic}</small></div><span>{w.meaning}</span>{w.review&&<em>复习</em>}</button>)}</div><div className="word-foot"><div className="mini-avatars"><span>{newCount}</span><span>{reviewCount}</span></div><p><b>{newCount}</b> 个新词 · <b>{reviewCount}</b> 个复习词{state.wordMix==='dynamic'&&<small> · AI 动态</small>}</p></div></section>
      <aside className="right-column">
        <section className="panel story-teaser"><div className="teaser-cover"><span>CHAPTER 1</span><div className="tower">✦</div></div><div><p className="eyebrow">你的长期故事</p><h3>雾林中的观测站</h3><p>“蓝色信号在地图上闪烁，仿佛在指引一条从未有人走过的路……”</p>{continuity&&<div className="continuity-note"><RotateCcw/><span><b>承接昨日：{continuity.title}</b><small>{continuity.summary}</small></span></div>}<button onClick={()=>setPage('story')}>{state.quizDone?'继续故事':'完成测试后解锁'} {state.quizDone?<ArrowRight size={15}/>:<LockKeyhole size={14}/>}</button></div></section>
        <section className="panel week-panel"><div className="panel-head"><div><p className="eyebrow">THIS WEEK</p><h3>本周节奏</h3></div><button onClick={()=>setPage('report')}>周报</button></div><div className="week-days">{weekKeys.map((key,i)=>{const done=Boolean(state.sessions[key]);return <div key={key}><span>{['一','二','三','四','五','六','日'][i]}</span><i className={`${done?'done ':''}${key===state.activeDate?'today':''}`}>{done?<Check size={13}/>:key===state.activeDate?'今':''}</i></div>})}</div><div className="week-stat"><Flame size={21}/><span><b>{state.streak} 天连续学习</b><small>再坚持 2 天，刷新本月记录</small></span></div></section>
      </aside>
    </div>
    <button className="sync-bar" onClick={()=>notify('Markdown 已准备好，可在周报页导出')}><Cloud size={18}/><span><b>Obsidian</b> · 本地导出模式</span><i>设置同步 <ChevronRight size={15}/></i></button>
  </div>
}
function speak(text:string, rate=0.85, accent='美式') {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text)
  u.lang = accent==='英式'?'en-GB':'en-US'; u.rate=rate; speechSynthesis.speak(u)
}

function Learn({state,patch,setPage,notify}:{state:AppState,patch:(p:Partial<AppState>)=>void,setPage:(p:Page)=>void,notify:(s:string)=>void}) {
  const sessionWords = getSessionWords(state)
  const index = Math.min(state.currentWord,19), word=sessionWords[index]
  const [showMeaning,setShowMeaning]=useState(true), [recording,setRecording]=useState(false), [audioUrl,setAudioUrl]=useState('')
  const recorder=useRef<MediaRecorder|null>(null), chunks=useRef<Blob[]>([])
  const choose=(v:Knowledge)=>{
    const learned={...state.learned,[word.word]:v}; const next=Math.min(19,index+1); patch({learned,currentWord:next})
    if(index===19) notify('20 个目标词已完成，测试已解锁！')
  }
  const startRecord=async()=>{
    if(recording){ recorder.current?.stop(); setRecording(false); return }
    try { const stream=await navigator.mediaDevices.getUserMedia({audio:true}); const r=new MediaRecorder(stream); recorder.current=r; chunks.current=[]; r.ondataavailable=e=>chunks.current.push(e.data); r.onstop=()=>{setAudioUrl(URL.createObjectURL(new Blob(chunks.current,{type:'audio/webm'})));stream.getTracks().forEach(t=>t.stop())}; r.start(); setRecording(true) }
    catch { notify('请允许浏览器使用麦克风') }
  }
  return <div className="page learn-page">
    <header className="learn-top"><button className="back-link" onClick={()=>setPage('home')}><ArrowLeft/>返回今日</button><div className="lesson-progress"><span>单词学习</span><div className="progress-track"><i style={{width:`${((index+1)/20)*100}%`}}/></div><b>{index+1} / 20</b></div><button className="icon-btn"><MoreHorizontal/></button></header>
    <div className="learn-layout">
      <aside className="word-rail"><p>今日目标</p>{sessionWords.map((w,i)=><button key={w.word} className={`${i===index?'current':''} ${state.learned[w.word]?'done':''}`} onClick={()=>patch({currentWord:i})}><span>{state.learned[w.word]?<Check/>:i+1}</span><b>{w.word}</b>{w.review&&<em>复习</em>}</button>)}</aside>
      <section className="flashcard-wrap">
        <div className="flashcard">
          <div className="card-top"><span className="level-pill">{word.level}</span>{word.review&&<span className="review-pill"><RotateCcw/>复习词</span>}<button onClick={()=>notify('已加入收藏')}><Star/></button></div>
          <p className="word-count">WORD {String(index+1).padStart(2,'0')}</p>
          <h1>{word.word}</h1><div className="pronunciation"><span>{word.phonetic}</span><i>{word.pos}</i><button onClick={()=>speak(word.word,0.85,state.accent)}><Volume2/> {state.accent}</button><button onClick={()=>speak(word.word,0.58,state.accent)}><Play/> 慢速</button></div>
          <button className="meaning-toggle" onClick={()=>setShowMeaning(!showMeaning)}><Languages/> {showMeaning?'隐藏释义':'显示释义'}</button>
          {showMeaning&&<div className="meaning-block"><h2>{word.meaning}</h2><p>{word.definition}</p></div>}
          <div className="example-block"><span>EXAMPLE</span><p>“{word.example}” <button onClick={()=>speak(word.example,0.78,state.accent)}><Volume2/></button></p><small>{word.exampleZh}</small></div>
          <div className="collocations"><span>常见搭配</span>{word.collocations.map(c=><button key={c} onClick={()=>speak(c,0.8,state.accent)}>{c}<Volume2/></button>)}</div>
          <div className="record-block"><div><span className={recording?'record-dot pulse':'record-dot'}/><div><strong>{recording?'正在录音…':'轮到你了'}</strong><small>朗读单词，然后听听自己的发音</small></div></div><div><button className={recording?'recording':''} onClick={startRecord}>{recording?<Pause/>:<Mic/>}{recording?'停止':'录音'}</button>{audioUrl&&<button onClick={()=>new Audio(audioUrl).play()}><Play/>回放</button>}</div></div>
        </div>
        <div className="knowledge-actions"><p>你对这个词的感觉是？</p><div><button onClick={()=>choose('new')}><CircleHelp/>不认识</button><button onClick={()=>choose('fuzzy')}><Moon/>有点模糊</button><button className="know" onClick={()=>choose('know')}><CheckCircle2/>认识</button></div></div>
        <div className="card-nav"><button disabled={index===0} onClick={()=>patch({currentWord:index-1})}><ArrowLeft/>上一个</button><span>键盘提示：按 1 / 2 / 3 选择掌握度</span>{index<19?<button onClick={()=>patch({currentWord:index+1})}>下一个<ArrowRight/></button>:<button className="finish" onClick={()=>setPage('quiz')}>开始测试<ArrowRight/></button>}</div>
      </section>
    </div>
  </div>
}

const quizQuestions = [
  {word:'discover',q:'discover 的正确含义是？', options:['隐藏','发现','承诺','保护'],answer:'发现'},
  {word:'courage',q:'“勇气” 对应哪个单词？', options:['courage','careful','journey','entrance'],answer:'courage'},
  {word:'signal',q:'A blue light sent a _____.', options:['shadow','promise','signal','path'],answer:'signal'},
  {word:'whisper',q:'选择最符合 “speak very quietly” 的单词', options:['escape','decide','glow','whisper'],answer:'whisper'},
  {word:'ancient',q:'An _____ map lay on the table.', options:['ancient','careful','hidden','strange'],answer:'ancient'},
]
function Quiz({state,patch,setPage}:{state:AppState,patch:(p:Partial<AppState>)=>void,setPage:(p:Page)=>void}) {
  const [q,setQ]=useState(0); const item=quizQuestions[q]; const selected=state.quizAnswers[q];
  const correct=Object.entries(state.quizAnswers).filter(([i,a])=>quizQuestions[+i]?.answer===a).length
  if(state.quizDone) return <div className="page centered-page"><div className="result-card"><div className="result-ring"><Trophy/><strong>{correct*20}</strong><span>分</span></div><p className="eyebrow">测试完成</p><h1>做得很好，故事已解锁！</h1><p>你已经为今天的 20 个词建立了第一层记忆。接下来，把它们放进真实语境里。</p><div className="result-stats"><div><b>{correct}/5</b><span>答对题数</span></div><div><b>20</b><span>故事目标词</span></div><div><b>+12</b><span>获得星光</span></div></div><button className="primary" onClick={()=>setPage('story')}>进入今日故事 <ArrowRight/></button><button className="text-button" onClick={()=>{patch({quizDone:false,quizAnswers:{}});setQ(0)}}>重新测试</button></div></div>
  return <div className="page quiz-page"><header className="learn-top"><button className="back-link" onClick={()=>setPage('learn')}><ArrowLeft/>返回学习</button><div className="lesson-progress"><span>单词小测</span><div className="progress-track"><i style={{width:`${((q+1)/5)*100}%`}}/></div><b>{q+1} / 5</b></div><button className="text-button" onClick={()=>patch({quizDone:true})}>暂时跳过</button></header><div className="quiz-card"><p className="eyebrow">QUESTION {q+1}</p><h1>{item.q}</h1>{item.word==='signal'&&<button className="listen-question" onClick={()=>speak('A blue light sent a signal.',.72,state.accent)}><Headphones/>听例句</button>}<div className="quiz-options">{item.options.map((o,i)=><button key={o} className={selected===o?'selected':''} onClick={()=>patch({quizAnswers:{...state.quizAnswers,[q]:o}})}><span>{String.fromCharCode(65+i)}</span>{o}{selected===o&&<CheckCircle2/>}</button>)}</div><div className="quiz-next"><span>{selected?'已选择答案':'请选择一个答案'}</span><button disabled={!selected} onClick={()=>q<4?setQ(q+1):patch({quizDone:true})}>{q<4?'下一题':'查看结果'}<ArrowRight/></button></div></div></div>
}

function HighlightedStory({paragraph}:{paragraph:string}) {
  const words=todayWords.map(w=>w.word); const regex=new RegExp(`\\b((?:${words.join('|')})(?:s|ed)?)\\b`,'gi'); const parts=paragraph.split(regex)
  return <p>{parts.map((p,i)=> words.some(w=>p.toLowerCase().startsWith(w))?<mark key={i}>{p}</mark>:<span key={i}>{p}</span>)}</p>
}
function Story({state,completeToday,previousSession,setPage,notify}:{state:AppState,completeToday:(choice:string)=>void,previousSession?:DailySession,setPage:(p:Page)=>void,notify:(s:string)=>void}) {
  const [translation,setTranslation]=useState(false), [playing,setPlaying]=useState(false)
  const activeStory=storyVariants[state.storyLength], storyInfo=storyLengthLabels[state.storyLength]
  const continuity=previousSession?choiceContinuations[previousSession.storyChoice]:undefined
  const storyWordCount=activeStory.reduce((total,paragraph)=>total+paragraph.en.trim().split(/\s+/).length,0)
  const playAll=()=>{ if(playing){speechSynthesis.cancel();setPlaying(false)}else{speak(activeStory.map(p=>p.en).join(' '),.72,state.accent);setPlaying(true); setTimeout(()=>setPlaying(false),storyInfo.minutes*18000)} }
  if(!state.quizDone) return <div className="page centered-page"><div className="locked-card"><LockKeyhole/><p className="eyebrow">今日故事尚未解锁</p><h1>先完成单词小测</h1><p>测试会帮助你巩固今天的目标词，再进入故事语境。</p><button className="primary" onClick={()=>setPage('quiz')}>开始测试 <ArrowRight/></button></div></div>
  return <div className="page story-page"><header className="story-header"><button className="back-link" onClick={()=>setPage('home')}><ArrowLeft/>今日首页</button><div><span>雾林中的观测站</span><small>第 4 天 · 第一章</small></div><div><button className={translation?'active':''} onClick={()=>setTranslation(!translation)}><Languages/>中英对照</button><button onClick={playAll}>{playing?<Pause/>:<Headphones/>}{playing?'暂停':'朗读全文'}</button></div></header><article className="story-paper"><div className="chapter-label"><span>CHAPTER 01</span><i>DAY FOUR</i></div><h1>The Signal in the Forest</h1><p className="story-subtitle">森林里的信号</p>{continuity&&<div className="story-continuity"><RotateCcw/><div><span>昨日选择已继承</span><b>{continuity.title}</b><p>{continuity.summary}</p></div></div>}<div className="story-meta"><span><Sparkles/>今日 20 词已全部融入</span><span>{storyInfo.name} · {storyWordCount} 词 · 约 {storyInfo.minutes} 分钟阅读</span></div><div className="story-text">{activeStory.map(p=><div className="story-paragraph" key={p.en}><button onClick={()=>speak(p.en,.72,state.accent)}><Volume2/></button><HighlightedStory paragraph={p.en}/>{translation&&<small>{p.zh}</small>}</div>)}</div><div className="coverage"><div><CheckCircle2/><span><b>词汇覆盖验证通过</b><small>20 / 20 个今日目标词已出现 · 核心词汇覆盖率 96%</small></span></div><button onClick={()=>notify('已显示全部高亮词')}>查看词汇 <ChevronRight/></button></div><section className="choice-section"><div className="choice-title"><p className="eyebrow">YOUR CHOICE</p><h2>接下来，米娅应该怎么做？</h2><p>你的选择将成为明天故事的起点。</p></div><div className="story-choices">{storyChoices.map(c=><button key={c.id} className={state.storyChoice===c.id?'selected':''} onClick={()=>{completeToday(c.id);notify(state.sessions[state.activeDate]?'今日记录已更新，没有重复新增':'今日学习记录已保存')}}><span>{c.icon}</span><div><strong>{c.title}</strong><small>{c.en}</small><p>{c.hint}</p></div>{state.storyChoice===c.id?<CheckCircle2/>:<ArrowRight/>}</button>)}</div>{state.storyChoice&&<div className="choice-confirm"><CheckCircle2/><span><b>选择已保存</b><small>明天的故事将从这里继续。今天的学习记录已完成。</small></span><button onClick={()=>setPage('report')}>查看学习总结</button></div>}</section></article></div>
}
function Vocabulary({state}:{state:AppState}) {
  const [search,setSearch]=useState(''); const [filter,setFilter]=useState('全部')
  const sessionWords=getSessionWords(state)
  const rows=useMemo(()=>sessionWords.filter(w=>w.word.includes(search.toLowerCase())||w.meaning.includes(search)).filter(w=>filter==='全部'||(filter==='已学习'&&state.learned[w.word])||(filter==='待复习'&&w.review)),[search,filter,state.learned,state.wordMix])
  return <div className="page"><header className="page-title"><div><p className="eyebrow">MY VOCABULARY</p><h1>我的词库</h1><p>每一个学会的词，都在拓宽你的故事世界。</p></div><button className="primary small"><Download/>导入词表</button></header><div className="library-stats"><div><span className="stat-icon green"><BookOpen/></span><b>{Object.keys(state.learned).length}</b><p>今日已学习</p></div><div><span className="stat-icon amber"><RotateCcw/></span><b>{getReviewCount(state)}</b><p>等待复习</p></div><div><span className="stat-icon blue"><Volume2/></span><b>2</b><p>发音需加强</p></div><div><span className="stat-icon purple"><Trophy/></span><b>68%</b><p>平均掌握度</p></div></div><section className="panel library-panel"><div className="library-toolbar"><div className="search-box"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索单词或释义…"/></div><div className="filters">{['全部','已学习','待复习'].map(f=><button className={filter===f?'active':''} onClick={()=>setFilter(f)} key={f}>{f}</button>)}</div></div><div className="word-table"><div className="table-head"><span>单词</span><span>释义</span><span>状态</span><span>掌握度</span><span>最近学习</span><span/></div>{rows.map((w,i)=><div className="table-row" key={w.word}><span><button onClick={()=>speak(w.word)}><Volume2/></button><b>{w.word}</b><small>{w.phonetic} · {w.pos}</small></span><span>{w.meaning}</span><span><em className={state.learned[w.word]?'mastered':w.review?'review':'learning'}>{state.learned[w.word]?'今日已学':w.review?'待复习':'学习中'}</em></span><span><i className="score-bar"><i style={{width:`${state.learned[w.word]?75+(i%3)*7:30}%`}}/></i>{state.learned[w.word]?75+(i%3)*7:30}%</span><span>今天</span><span><ChevronRight/></span></div>)}</div></section></div>
}

function makeMarkdown(state:AppState) {
  const date=new Date().toISOString().slice(0,10), choice=storyChoices.find(c=>c.id===state.storyChoice)?.title||'尚未选择'
  const sessionWords=getSessionWords(state), reviewCount=getReviewCount(state), activeStory=storyVariants[state.storyLength]
  return `---\ndate: ${date}\nlevel: ${state.level}\nstory: 雾林中的观测站\ntags: [英语学习, WordQuest, 每日故事]\n---\n\n# ${date} 英语学习记录\n\n## 今日学习概览\n- 目标词：20（${20-reviewCount} 新词 + ${reviewCount} 复习）\n- 计划时长：${state.dailyMinutes} 分钟\n- 故事长度：${storyLengthLabels[state.storyLength].name}（${storyLengthLabels[state.storyLength].range}）\n- 已学习：${Object.keys(state.learned).length}\n- 小测状态：${state.quizDone?'已完成':'未完成'}\n- 连续学习：${state.streak} 天\n- 学习者：${state.displayName || '学习者'}\n\n## 今日 20 词\n${sessionWords.map(w=>`- **${w.word}** ${w.phonetic} — ${w.meaning}${w.review?'（复习）':''}\n  - ${w.example}`).join('\n')}\n\n## 今日故事：The Signal in the Forest\n\n${activeStory.map(p=>p.en).join('\n\n')}\n\n> 今日选择：${choice}\n\n## 明日复习建议\n重点复习 courage、whisper、ancient，并再次朗读故事第二段。\n`
}
function downloadText(name:string,text:string) { const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));a.download=name;a.click();URL.revokeObjectURL(a.href) }
function HistoryCalendar({state}:{state:AppState}) {
  const sessionDates=Object.keys(state.sessions).sort()
  const [selectedDate,setSelectedDate]=useState(sessionDates.at(-1) || state.activeDate)
  const [visibleMonth,setVisibleMonth]=useState(()=>state.activeDate.slice(0,7))
  const [year,month]=visibleMonth.split('-').map(Number)
  const firstDay=new Date(year,month-1,1), daysInMonth=new Date(year,month,0).getDate()
  const offset=(firstDay.getDay()+6)%7
  const cells=[...Array(offset).fill(null),...Array.from({length:daysInMonth},(_,index)=>String(index+1).padStart(2,'0'))]
  const selectedSession=state.sessions[selectedDate]
  const moveMonth=(amount:number)=>{
    const next=new Date(year,month-1+amount,1)
    setVisibleMonth(next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0'))
  }
  return <section className="panel history-calendar-panel">
    <div className="history-head">
      <div><p className="eyebrow">LEARNING HISTORY</p><h3><CalendarDays/>学习日历</h3><span>共保存 {sessionDates.length} 个学习日，同一天完成多次只更新一条记录。</span></div>
      <div className="calendar-nav"><button aria-label="上个月" onClick={()=>moveMonth(-1)}><ArrowLeft/></button><b>{year} 年 {month} 月</b><button aria-label="下个月" onClick={()=>moveMonth(1)}><ArrowRight/></button></div>
    </div>
    <div className="calendar-weekdays">{['一','二','三','四','五','六','日'].map(day=><span key={day}>{day}</span>)}</div>
    <div className="calendar-grid">
      {cells.map((day,index)=>{
        if(!day) return <span className="calendar-blank" key={'blank-'+index}/>
        const dateKey=visibleMonth+'-'+day, session=state.sessions[dateKey]
        const className='calendar-day'+(session?' has-session':'')+(dateKey===state.activeDate?' today':'')+(dateKey===selectedDate?' selected':'')
        return <button key={dateKey} className={className} onClick={()=>session&&setSelectedDate(dateKey)} disabled={!session} aria-label={formatSessionDate(dateKey)+(session?'，已完成':'，无记录')}>
          <span>{Number(day)}</span>{session&&<i><Check/></i>}
        </button>
      })}
    </div>
    {selectedSession?<div className="session-detail">
      <div><p className="eyebrow">SESSION DETAIL</p><h4>{formatSessionDate(selectedDate)}</h4><span>{choiceContinuations[selectedSession.storyChoice]?.title || storyChoices.find(choice=>choice.id===selectedSession.storyChoice)?.title || '故事选择已保存'}</span></div>
      <div className="session-detail-grid">
        <span><b>{selectedSession.learnedCount}</b><small>学习词数</small></span>
        <span><b>{selectedSession.newCount} + {selectedSession.reviewCount}</b><small>新词 / 复习</small></span>
        <span><b>{selectedSession.quizScore}</b><small>小测得分</small></span>
        <span><b>{storyLengthLabels[selectedSession.storyLength].name}</b><small>{selectedSession.dailyMinutes} 分钟计划</small></span>
      </div>
    </div>:<div className="session-empty"><CalendarDays/><span><b>还没有历史记录</b><small>完成今日故事选择后，学习记录会出现在这里。</small></span></div>}
  </section>
}

function Report({state,notify}:{state:AppState,notify:(s:string)=>void}) {
  const exportMd=()=>{downloadText(state.activeDate+'-WordQuest.md',makeMarkdown(state));notify('Markdown 已导出，可放入 Obsidian Vault')}
  const weekKeys=getWeekDateKeys(state.activeDate), weekSessions=weekKeys.map(key=>state.sessions[key])
  const weekValues=weekSessions.map(session=>session?.learnedCount || 0)
  const weekWords=weekValues.reduce((total,value)=>total+value,0), weekStories=weekSessions.filter(Boolean).length
  const range=formatSessionDate(weekKeys[0]).replace(/星期.*/,'')+' — '+formatSessionDate(weekKeys[6]).replace(/星期.*/,'')
  return <div className="page">
    <header className="page-title report-title"><div><p className="eyebrow">WEEKLY REVIEW</p><h1>本周学习周报</h1><p>{range}</p></div><button className="primary small" onClick={exportMd}><Download/>导出到 Obsidian</button></header>
    <section className="report-hero"><div><p>本周你已经走了很远</p><h2>学会 <b>{weekWords}</b> 个词，读完 <b>{weekStories}</b> 段故事。</h2><span>{weekStories?'本周已有 '+weekStories+' 天留下完整记录，继续保持这样的节奏！':'完成今日故事选择后，这里会生成第一条学习记录。'}</span></div><div className="report-medal"><Trophy/><strong>{state.streak}</strong><span>连续天数</span></div></section>
    <div className="report-grid">
      <HistoryCalendar state={state}/>
      <section className="panel chart-panel"><div className="panel-head"><div><p className="eyebrow">LEARNING ACTIVITY</p><h3>每日学习词数</h3></div><span className="up">本周 {weekWords} 词</span></div><div className="bar-chart">{weekValues.map((value,index)=><div key={weekKeys[index]}><span className={weekKeys[index]===state.activeDate?'today':''} style={{height:Math.max(4,value*6)+'px'}}><b>{value||''}</b></span><small>{weekKeys[index]===state.activeDate?'今':['一','二','三','四','五','六','日'][index]}</small></div>)}</div></section>
      <section className="panel mastery-panel"><div className="panel-head"><div><p className="eyebrow">MASTERY</p><h3>掌握度分布</h3></div></div><div className="donut"><div><strong>68%</strong><span>平均掌握</span></div></div><ul><li><i className="c1"/>已掌握 <b>42</b></li><li><i className="c2"/>初步掌握 <b>27</b></li><li><i className="c3"/>需要复习 <b>7</b></li></ul></section>
      <section className="panel chapter-panel"><div className="chapter-cover"><span>WEEK 01</span><div>✦</div></div><div><p className="eyebrow">本周故事章节</p><h3>第一章 · 蓝色信号</h3><p>米娅收到祖父的古老地图，穿过雾林，并在废弃观测站发现一台仍在运转的机器……</p><div className="chapter-tags"><span>{weekStories} 个故事节点</span><span>{weekWords} 个学习词</span></div><button onClick={()=>notify('周故事已根据每日节点整理完成')}>阅读完整章节 <ArrowRight/></button></div></section>
      <section className="panel focus-panel"><div className="panel-head"><div><p className="eyebrow">NEXT FOCUS</p><h3>下周建议</h3></div></div><div className="focus-item"><span><Volume2/></span><div><b>加强发音</b><p>courage 和 entrance 的重音还可以更清晰。</p></div></div><div className="focus-item"><span><RotateCcw/></span><div><b>及时复习 {getReviewCount(state)} 个词</b><p>它们正在进入遗忘区间，建议明天优先安排。</p></div></div><div className="focus-item"><span><BookOpen/></span><div><b>试试 300 词故事</b><p>你的阅读正确率足以挑战更长的章节。</p></div></div></section>
    </div>
  </div>
}

function SettingsPage({state,patch,notify}:{state:AppState,patch:(p:Partial<AppState>)=>void,notify:(s:string)=>void}) {
  return <div className="page settings-page"><header className="page-title"><div><p className="eyebrow">PREFERENCES</p><h1>设置</h1><p>调整你的学习节奏、故事与数据方式。</p></div></header><div className="settings-grid"><section className="panel settings-section profile-settings"><h3><Settings/>个人资料</h3><label><span><b>你的名字</b><small>用于首页问候、侧边栏与学习笔记</small></span><div className="name-editor"><input aria-label="你的名字" value={state.displayName} maxLength={20} placeholder="输入你的名字" onChange={e=>patch({displayName:e.target.value})} onBlur={()=>patch({displayName:state.displayName.trim() || "学习者"})}/><span>{state.displayName.length}/20</span></div></label><div className="profile-preview"><div className="avatar">{state.displayName.trim().charAt(0).toUpperCase() || "W"}</div><div><b>{state.displayName || "学习者"}</b><small>你的个性化问候会立即更新</small></div></div></section><section className="panel settings-section"><h3><BookOpen/>学习设置</h3><label><span><b>英语等级</b><small>控制单词和故事难度</small></span><select value={state.level} onChange={e=>patch({level:e.target.value})}><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></label><label><span><b>每日目标</b><small>固定 20 词，调整新词与复习比例</small></span><select value={state.wordMix} onChange={e=>patch({wordMix:e.target.value as WordMix})}><option value="15+5">15 新词 + 5 复习</option><option value="20+0">20 个新词</option><option value="10+10">10 新词 + 10 复习</option><option value="dynamic">AI 动态安排</option></select></label><label><span><b>每日学习时间</b><small>用于首页计划时长与学习节奏</small></span><select value={state.dailyMinutes} onChange={e=>patch({dailyMinutes:Number(e.target.value) as DailyMinutes})}><option value={15}>15 分钟</option><option value={20}>20 分钟</option><option value={30}>30 分钟</option></select></label><label><span><b>发音偏好</b><small>用于单词与故事朗读</small></span><div className="segment"><button className={state.accent==='美式'?'active':''} onClick={()=>patch({accent:'美式'})}>美式</button><button className={state.accent==='英式'?'active':''} onClick={()=>patch({accent:'英式'})}>英式</button></div></label></section><section className="panel settings-section"><h3><WandSparkles/>故事设置</h3><label><span><b>长期故事类型</b><small>每天的剧情会持续推进</small></span><select value={state.genre} onChange={e=>patch({genre:e.target.value})}><option>奇幻冒险</option><option>科幻探索</option><option>都市生活</option><option>悬疑推理</option></select></label><label><span><b>故事长度</b><small>适合 {state.level} 水平</small></span><select value={state.storyLength} onChange={e=>patch({storyLength:e.target.value as StoryLength})}><option value="short">短 · 100—180 词</option><option value="medium">标准 · 180—300 词</option><option value="long">长 · 300—500 词</option></select></label></section><section className="panel settings-section"><h3><Cloud/>Obsidian 与数据</h3><label><span><b>导出模式</b><small>第一版使用安全的本地 Markdown 下载</small></span><button className="outline" onClick={()=>{downloadText('WordQuest-今日学习.md',makeMarkdown(state));notify('今日笔记已导出')}}><Download/>导出今日笔记</button></label><label><span><b>本地数据</b><small>学习记录保存在当前浏览器</small></span><button className="outline danger" onClick={()=>{if(confirm('确定重置所有演示数据？')){localStorage.removeItem('wordquest-state');location.reload()}}}>重置数据</button></label></section><section className="panel settings-section about"><Logo/><p>每天学 20 个词，把它们变成属于你的英语故事。</p><span>WordQuest MVP · 本地优先版本</span></section></div></div>
}

export default App

