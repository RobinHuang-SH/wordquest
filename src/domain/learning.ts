import { todayWords, type Word } from '../data'
import type { AppState } from './models'

export const quizQuestions = [
  {word:'discover',q:'discover 的正确含义是？',options:['隐藏','发现','承诺','保护'],answer:'发现'},
  {word:'courage',q:'“勇气” 对应哪个单词？',options:['courage','careful','journey','entrance'],answer:'courage'},
  {word:'signal',q:'A blue light sent a _____.',options:['shadow','promise','signal','path'],answer:'signal'},
  {word:'whisper',q:'选择最符合 “speak very quietly” 的单词',options:['escape','decide','glow','whisper'],answer:'whisper'},
  {word:'ancient',q:'An _____ map lay on the table.',options:['ancient','careful','hidden','strange'],answer:'ancient'},
]

export function getQuizScore(answers: Record<number,string>) {
  const correct=Object.entries(answers).filter(([index,answer])=>quizQuestions[+index]?.answer===answer).length
  return correct*20
}

export function getReviewCount(state: Pick<AppState,'wordMix'|'learned'>) {
  if (state.wordMix === '20+0') return 0
  if (state.wordMix === '10+10') return 10
  if (state.wordMix === 'dynamic') {
    const weakCount=Object.values(state.learned).filter(value=>value==='new'||value==='fuzzy').length
    return weakCount>=6?10:5
  }
  return 5
}

export function getSessionWords(state: Pick<AppState,'wordMix'|'learned'>): Word[] {
  const reviewCount=getReviewCount(state)
  const priority=[
    ...todayWords.filter(word=>word.review),
    ...todayWords.filter(word=>!word.review&&(state.learned[word.word]==='new'||state.learned[word.word]==='fuzzy')),
    ...todayWords.filter(word=>!word.review&&state.learned[word.word]!=='new'&&state.learned[word.word]!=='fuzzy'),
  ]
  const reviewWords=new Set(priority.slice(0,reviewCount).map(word=>word.word))
  return todayWords.map(word=>({...word,review:reviewWords.has(word.word)}))
}
