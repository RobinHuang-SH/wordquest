import type { AppState } from '../domain/models'
import { createInitialState, createDailySession, getDateKey, resetForNewDay } from '../domain/sessions'

const STORAGE_KEY='wordquest-state'
export const APP_STATE_SCHEMA_VERSION=2

type PersistedEnvelope={version:number;state:Partial<AppState>}
type Migration=(state:Partial<AppState>)=>Partial<AppState>

const migrations:Record<number,Migration>={
  0:state=>({...state}),
  1:state=>({...state,sessions:state.sessions||{}}),
}

function unwrapPersistedState(raw:unknown):PersistedEnvelope {
  if(!raw||typeof raw!=='object') return {version:0,state:{}}
  const candidate=raw as {version?:unknown;state?:unknown}
  if(typeof candidate.version==='number'&&candidate.state&&typeof candidate.state==='object') {
    return {version:candidate.version,state:candidate.state as Partial<AppState>}
  }
  return {version:0,state:raw as Partial<AppState>}
}

function runMigrations(snapshot:PersistedEnvelope):Partial<AppState> {
  let version=snapshot.version,state=snapshot.state
  while(version<APP_STATE_SCHEMA_VERSION) {
    state=(migrations[version]||((current)=>current))(state)
    version+=1
  }
  return state
}

function normalizeState(candidate:Partial<AppState>):AppState {
  const initial=createInitialState(),today=getDateKey()
  const merged={...initial,...candidate,activeDate:candidate.activeDate||today,sessions:candidate.sessions||{}} as AppState
  if(merged.completed&&merged.storyChoice&&!merged.sessions[merged.activeDate]) {
    merged.sessions={...merged.sessions,[merged.activeDate]:createDailySession(merged,merged.storyChoice)}
  }
  return resetForNewDay(merged,today)
}

export function migrateAppState(raw:unknown):AppState {
  return normalizeState(runMigrations(unwrapPersistedState(raw)))
}

export function loadAppState():AppState {
  try { return migrateAppState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')) }
  catch { return normalizeState({}) }
}

export function saveAppState(state:AppState) {
  const envelope:PersistedEnvelope={version:APP_STATE_SCHEMA_VERSION,state}
  localStorage.setItem(STORAGE_KEY,JSON.stringify(envelope))
}

export function clearAppState() { localStorage.removeItem(STORAGE_KEY) }
