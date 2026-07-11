import { ArrowLeft, ArrowRight, BarChart3, BookMarked, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, Cloud, Download, Flame, Headphones, Home, Languages, Library, LockKeyhole, Menu, Mic, Moon, MoreHorizontal, Pause, Play, RotateCcw, Search, Settings, Sparkles, Star, Trophy, Volume2, WandSparkles, X } from 'lucide-react'
import type { AppState, Page } from '../domain/models'

export function Logo() {
  return <div className="logo"><div className="logo-mark"><BookOpen size={22}/><Sparkles size={12}/></div><div><strong>词境英语</strong><span>WORDQUEST</span></div></div>
}

const navItems: {id:Page,label:string,icon:any}[] = [
  {id:'home',label:'今日',icon:Home},{id:'learn',label:'学习',icon:BookOpen},{id:'story',label:'故事',icon:WandSparkles},
  {id:'library',label:'词库',icon:Library},{id:'report',label:'周报',icon:BarChart3}
]

export function Sidebar({page,setPage,state}:{page:Page,setPage:(p:Page)=>void,state:AppState}) {
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

export function MobileHeader({setPage,menuOpen,setMenuOpen}:{setPage:(p:Page)=>void,menuOpen:boolean,setMenuOpen:(v:boolean)=>void}) {
  return <header className="mobile-header"><button onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button><Logo/><button onClick={()=>setPage('settings')}><Settings/></button></header>
}
export function MobileMenu({page,setPage}:{page:Page,setPage:(p:Page)=>void}) {
  return <div className="mobile-menu">{navItems.map(({id,label,icon:Icon})=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={19}/>{label}</button>)}</div>
}
