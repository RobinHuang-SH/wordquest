import { todayWords } from '../src/data.js'
import { EnglishLevel } from '../server/generated/prisma/enums.js'

export const demoUser = {
  email: 'demo@wordquest.local',
  displayName: 'Mia',
  nativeLanguage: 'zh-CN',
  englishLevel: EnglishLevel.A2,
  targetLevel: EnglishLevel.B1,
  dailyWordCount: 20,
  newWordRatio: 0.75,
  storyGenre: 'adventure',
  timezone: 'Asia/Shanghai',
} as const

export const vocabularySeed = todayWords.map((item, index) => ({
  word: item.word.toLowerCase(),
  lemma: item.word.toLowerCase(),
  partOfSpeech: item.pos.replace(/\.$/, ''),
  level: EnglishLevel[item.level as keyof typeof EnglishLevel],
  meaningZh: item.meaning,
  definitionEn: item.definition,
  phoneticUs: item.phonetic,
  phoneticUk: item.phonetic,
  frequencyRank: index + 1,
  exampleSentence: item.example,
  isReview: Boolean(item.review),
}))
