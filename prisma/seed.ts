import 'dotenv/config'
import { createPrismaClient } from '../server/database/client.js'
import {
  LearningResult,
  ObsidianSyncStatus,
  QuizResult,
  SessionStatus,
  SessionWordType,
  StorySeriesStatus,
  UserWordStatus,
} from '../server/generated/prisma/enums.js'
import { demoSessionVocabularySeed, demoUser, vocabularySeed } from './seed-data.js'

const prisma = createPrismaClient()
const sessionDate = new Date('2026-07-13T00:00:00.000Z')
const weekStart = new Date('2026-07-13T00:00:00.000Z')
const weekEnd = new Date('2026-07-19T00:00:00.000Z')
const storyNodeId = '00000000-0000-4000-8000-000000000001'

async function seed() {
  const user = await prisma.user.upsert({
    where: { email: demoUser.email },
    update: demoUser,
    create: demoUser,
  })

  const seededWords = new Map()
  for (const item of vocabularySeed) {
    const { isReview, ...wordData } = item
    void isReview
    const word = await prisma.vocabulary.upsert({
      where: { word: item.word },
      update: wordData,
      create: wordData,
    })
    seededWords.set(item.word, word)
  }

  const words = []
  for (const item of demoSessionVocabularySeed) {
    const word = seededWords.get(item.word)!
    const isReview = item.isReview
    words.push({ word, isReview })

    await prisma.userWordState.upsert({
      where: { userId_wordId: { userId: user.id, wordId: word.id } },
      update: {
        status: isReview ? UserWordStatus.REVIEW : UserWordStatus.LEARNING,
        nextReviewAt: isReview ? sessionDate : null,
      },
      create: {
        userId: user.id,
        wordId: word.id,
        status: isReview ? UserWordStatus.REVIEW : UserWordStatus.LEARNING,
        memoryScore: isReview ? 58 : 15,
        timesSeen: isReview ? 3 : 1,
        timesCorrect: isReview ? 2 : 0,
        nextReviewAt: isReview ? sessionDate : null,
      },
    })
  }

  const session = await prisma.dailySession.upsert({
    where: { userId_sessionDate: { userId: user.id, sessionDate } },
    update: {
      status: SessionStatus.COMPLETED,
      newWordCount: 15,
      reviewWordCount: 5,
      quizScore: 80,
      pronunciationScore: 82,
      completedAt: new Date('2026-07-13T12:30:00.000Z'),
    },
    create: {
      userId: user.id,
      sessionDate,
      status: SessionStatus.COMPLETED,
      newWordCount: 15,
      reviewWordCount: 5,
      quizScore: 80,
      pronunciationScore: 82,
      completedAt: new Date('2026-07-13T12:30:00.000Z'),
    },
  })

  for (const [index, item] of words.entries()) {
    await prisma.dailySessionWord.upsert({
      where: { sessionId_wordId: { sessionId: session.id, wordId: item.word.id } },
      update: {
        sequence: index + 1,
        wordType: item.isReview ? SessionWordType.REVIEW : SessionWordType.NEW,
      },
      create: {
        sessionId: session.id,
        wordId: item.word.id,
        sequence: index + 1,
        wordType: item.isReview ? SessionWordType.REVIEW : SessionWordType.NEW,
        learningResult: index % 4 === 0 ? LearningResult.FUZZY : LearningResult.KNOW,
        quizResult: index < 16 ? QuizResult.CORRECT : QuizResult.INCORRECT,
        pronunciationScore: 72 + (index % 6) * 4,
      },
    })
  }

  const series = await prisma.storySeries.upsert({
    where: { userId_title: { userId: user.id, title: 'The Hidden City' } },
    update: { currentChapter: 1, currentWeek: 1, status: StorySeriesStatus.ACTIVE },
    create: {
      userId: user.id,
      title: 'The Hidden City',
      genre: 'adventure',
      level: demoUser.englishLevel,
      storyBibleJson: {
        protagonist: 'Mia',
        location: 'an ancient city beneath the forest',
        openThreads: ['the blue signal', 'the hidden door'],
      },
      status: StorySeriesStatus.ACTIVE,
    },
  })

  const storyNode = await prisma.storyNode.upsert({
    where: { id: storyNodeId },
    update: { sessionId: session.id, storySeriesId: series.id },
    create: {
      id: storyNodeId,
      storySeriesId: series.id,
      sessionId: session.id,
      title: 'The Blue Signal',
      content:
        'Mia discovered an ancient map and followed a hidden path. A blue signal began to glow beyond the entrance.',
      summary: 'Mia follows a mysterious signal toward the hidden city.',
      vocabularyCoverage: {
        covered: demoSessionVocabularySeed.map((item) => item.word),
        total: demoSessionVocabularySeed.length,
      },
      stateBeforeJson: { location: 'forest edge' },
      stateAfterJson: { location: 'hidden entrance', clue: 'blue signal' },
    },
  })

  const choices = [
    ['Follow the blue signal', 'Mia enters the hidden passage.'],
    ['Study the ancient map', 'Mia searches for a safer path.'],
    ['Return to the village', 'Mia asks the village keeper for help.'],
  ] as const

  let selectedChoiceId = ''
  for (const [index, [choiceText, choiceSummary]] of choices.entries()) {
    const choice = await prisma.storyChoice.upsert({
      where: { storyNodeId_sequence: { storyNodeId: storyNode.id, sequence: index + 1 } },
      update: { choiceText, choiceSummary, isSelected: index === 0 },
      create: {
        storyNodeId: storyNode.id,
        choiceText,
        choiceSummary,
        sequence: index + 1,
        isSelected: index === 0,
      },
    })
    if (index === 0) selectedChoiceId = choice.id
  }

  await prisma.storyNode.update({
    where: { id: storyNode.id },
    data: { selectedChoiceId },
  })
  await prisma.dailySession.update({
    where: { id: session.id },
    data: { storyId: storyNode.id },
  })

  await prisma.weeklyReport.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    update: {
      weekEnd,
      statisticsJson: { learnedWords: 20, quizAverage: 80, pronunciationAverage: 82 },
      obsidianSyncStatus: ObsidianSyncStatus.PENDING,
    },
    create: {
      userId: user.id,
      weekStart,
      weekEnd,
      statisticsJson: { learnedWords: 20, quizAverage: 80, pronunciationAverage: 82 },
      weeklyStory: 'Mia discovered the first entrance to the Hidden City.',
      reviewSuggestions: 'Review the five due words and practise the /th/ sound.',
      obsidianSyncStatus: ObsidianSyncStatus.PENDING,
    },
  })

  console.log(
    `Seeded WordQuest demo data for ${user.email}: ${words.length} session words, ${vocabularySeed.length} catalog words`,
  )
}

seed()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
