// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { GeneratedStory } from './story-schema.js'
import {
  buildStoryRepairPrompt,
  lemmaCandidates,
  tokenizeEnglish,
  validateGeneratedStory,
  type StoryVocabularyEntry,
} from './story-validation.js'

const choices = [
  {
    id: 'open-door',
    title: 'Open the door',
    en: 'Open the blue door',
    hint: 'Look for a room',
    continuationSummary: 'Mia enters a quiet map room.',
  },
  {
    id: 'follow-river',
    title: 'Follow the river',
    en: 'Walk beside the river',
    hint: 'Listen for a bell',
    continuationSummary: 'Mia follows the river toward a bell.',
  },
  {
    id: 'ask-leo',
    title: 'Ask Leo',
    en: 'Ask Leo for help',
    hint: 'Share the clue',
    continuationSummary: 'Mia and Leo compare their clues.',
  },
]

function story(paragraphs: string[], previousChoice = 'wait-here'): GeneratedStory {
  return {
    title: 'The Blue Door',
    titleZh: '蓝色的门',
    summary: 'Mia finds a door.',
    paragraphs: paragraphs.map((en) => ({ en, zh: '这是对应的中文翻译。' })),
    choices,
    stateBefore: {
      previousChoice: previousChoice || null,
      location: 'old station',
      characters: ['Mia', 'Leo'],
      openThreads: ['the glowing map'],
    },
    stateAfter: {
      previousChoice: previousChoice || null,
      location: 'blue door',
      characters: ['Mia', 'Leo'],
      openThreads: ['the hidden bell'],
    },
    vocabularyCoverage: [],
  }
}

function entry(word: string, level = 'A2', lemma = word): StoryVocabularyEntry {
  return { word, lemma, level }
}

describe('story validation', () => {
  it('tokenizes English and resolves common inflected and irregular forms', () => {
    expect(tokenizeEnglish("Mia's well-lit map wasn't lost.")).toEqual([
      "mia's",
      'well-lit',
      'map',
      "wasn't",
      'lost',
    ])
    expect(lemmaCandidates('discovered')).toContain('discover')
    expect(lemmaCandidates('studied')).toContain('study')
    expect(lemmaCandidates('running')).toContain('run')
    expect(lemmaCandidates('found')).toContain('find')
  })

  it('verifies exact 20/20 coverage from story paragraphs rather than claimed metadata', () => {
    const words = [
      'apple',
      'bridge',
      'candle',
      'door',
      'echo',
      'forest',
      'garden',
      'harbor',
      'island',
      'jacket',
      'key',
      'lantern',
      'map',
      'notice',
      'ocean',
      'path',
      'quiet',
      'river',
      'signal',
      'tower',
    ]
    const draft = story([
      'Mia saw an apple, bridge, candle, door, and echo.',
      'The forest, garden, harbor, island, and jacket were near.',
      'A key, lantern, map, notice, and ocean gave clues.',
      'The path, quiet river, signal, and tower led home.',
    ])
    draft.vocabularyCoverage = ['not-really-covered']
    const report = validateGeneratedStory({
      story: draft,
      targetWords: words.map((word) => entry(word)),
      vocabularyCatalog: words.map((word) => entry(word)),
      targetLevel: 'B1',
      previousChoice: 'wait-here',
    })
    expect(report.passed).toBe(true)
    expect(report.targetWords).toMatchObject({ total: 20, covered: words, missing: [] })
  })

  it('accepts natural inflected forms for target coverage', () => {
    const targets = [entry('discover'), entry('study'), entry('run'), entry('find')]
    const report = validateGeneratedStory({
      story: story([
        'Mia discovered a mark. Leo studied it. They were running when they found a key.',
      ]),
      targetWords: targets,
      vocabularyCatalog: targets,
      targetLevel: 'B1',
      previousChoice: 'wait-here',
    })
    expect(report.targetWords.missing).toEqual([])
    expect(report.passed).toBe(true)
  })

  it('detects missing targets and catalog words above the learner level', () => {
    const report = validateGeneratedStory({
      story: story(['Mia saw a metamorphosis near the door.']),
      targetWords: [entry('signal')],
      vocabularyCatalog: [entry('signal'), entry('metamorphosis', 'C1')],
      targetLevel: 'A2',
      previousChoice: 'wait-here',
    })
    expect(report.targetWords.missing).toEqual(['signal'])
    expect(report.outOfLevelWords).toEqual([{ word: 'metamorphosis', level: 'C1' }])
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['MISSING_TARGET_WORDS', 'OUT_OF_LEVEL_WORDS']),
    )
  })

  it('rejects stories whose translated fields contain no Chinese text', () => {
    const draft = story(['Mia found a signal.'])
    draft.titleZh = 'The Signal'
    draft.paragraphs[0].zh = 'Mia found a signal.'
    const report = validateGeneratedStory({
      story: draft,
      targetWords: [entry('signal')],
      vocabularyCatalog: [entry('signal')],
      targetLevel: 'A2',
      previousChoice: 'wait-here',
    })

    expect(report.passed).toBe(false)
    expect(report.issues.map((issue) => issue.code)).toContain('MISSING_CHINESE_TRANSLATION')
  })

  it('detects excessive sentence length, broken continuity, and duplicate plot choices', () => {
    const draft = story([`Mia ${Array.from({ length: 25 }, () => 'walked').join(' ')} home.`])
    draft.stateBefore.previousChoice = 'wrong-choice'
    draft.choices = choices.map((choice, index) => ({
      ...choice,
      id: `choice-${index}`,
      continuationSummary: 'Mia waits in the same room.',
    }))
    const report = validateGeneratedStory({
      story: draft,
      targetWords: [entry('walk')],
      vocabularyCatalog: [entry('walk')],
      targetLevel: 'A2',
      previousChoice: 'wait-here',
    })
    expect(report.difficulty.withinRange).toBe(false)
    expect(report.continuity.passed).toBe(false)
    expect(report.choices.passed).toBe(false)
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['DIFFICULTY_TOO_HIGH', 'CONTINUITY_MISMATCH', 'DUPLICATE_CHOICES']),
    )
  })

  it('rejects renamed characters, changed starting locations, and dropped open threads', () => {
    const draft = story(['Mia discovered a signal beside the door.'])
    draft.stateBefore = {
      previousChoice: 'wait-here',
      location: 'new city',
      characters: ['Mia', 'Leon'],
      openThreads: [],
    }
    draft.stateAfter = {
      previousChoice: 'wait-here',
      location: 'new city',
      characters: ['Mia', 'Leon'],
      openThreads: [],
    }
    const report = validateGeneratedStory({
      story: draft,
      targetWords: [entry('signal')],
      vocabularyCatalog: [entry('signal')],
      targetLevel: 'B1',
      previousChoice: 'wait-here',
      previousState: {
        location: 'old station',
        characters: ['Mia', 'Leo'],
        openThreads: ['the glowing map'],
      },
      protagonist: 'Mia',
    })

    expect(report.passed).toBe(false)
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'CHARACTER_CONTINUITY_MISMATCH',
        'LOCATION_CONTINUITY_MISMATCH',
        'OPEN_THREADS_CONTINUITY_MISMATCH',
      ]),
    )
  })

  it('builds a focused full-document repair prompt from deterministic issues', () => {
    const draft = story(['Mia waits by the door.'])
    const report = validateGeneratedStory({
      story: draft,
      targetWords: [entry('signal')],
      vocabularyCatalog: [entry('signal')],
      targetLevel: 'A2',
      previousChoice: 'wait-here',
    })
    const prompt = buildStoryRepairPrompt({
      originalPrompt: 'Create a story.',
      story: draft,
      report,
    })
    expect(prompt).toContain('Rewrite only the affected English sentences')
    expect(prompt).toContain('MISSING_TARGET_WORDS')
    expect(prompt).toContain('Draft JSON')
  })
})
