import { describe, expect, it } from 'vitest'
import { storyVariants, todayWords } from '../data'
import { makeState } from '../test/factories'
import { makeMarkdown } from './markdown'

describe('Markdown export', () => {
  const plan = (reviewCount: number) => ({
    sessionId: `session-${reviewCount}`,
    date: '2026-07-12',
    batch: 1,
    mix: reviewCount === 0 ? ('20+0' as const) : ('10+10' as const),
    words: todayWords.map((word, index) => ({ ...word, review: index < reviewCount })),
    newCount: 20 - reviewCount,
    reviewCount,
  })

  it('contains learner, plan, words, choice and active story content', () => {
    const markdown = makeMarkdown(
      makeState({
        displayName: 'Mia Chen',
        activeDate: '2026-07-12',
        dailyMinutes: 30,
        storyLength: 'short',
        storyChoice: 'machine',
        dailyWordPlan: plan(5),
      }),
    )

    expect(markdown).toContain('date: 2026-07-12')
    expect(markdown).toContain('学习者：Mia Chen')
    expect(markdown).toContain('计划时长：30 分钟')
    expect(markdown).toContain('故事长度：短篇（100—180 词）')
    expect(markdown).toContain('今日选择：返回研究机器')
    expect(markdown).toContain(storyVariants.short[0].en)
    for (const word of todayWords) expect(markdown).toContain('**' + word.word + '**')
  })

  it('reflects the configured new and review word mix', () => {
    expect(makeMarkdown(makeState({ wordMix: '20+0', dailyWordPlan: plan(0) }))).toContain(
      '20 新词 + 0 复习',
    )
    expect(makeMarkdown(makeState({ wordMix: '10+10', dailyWordPlan: plan(10) }))).toContain(
      '10 新词 + 10 复习',
    )
  })

  it('exports the generated daily story and its selected choice', () => {
    const generatedStory = {
      sessionId: 'session-1',
      storyNodeId: 'node-1',
      date: '2026-07-12',
      title: 'A Dynamic Story',
      titleZh: '动态故事',
      summary: 'A generated story.',
      paragraphs: [{ en: 'This paragraph came from the server.', zh: '这一段来自服务器。' }],
      choices: [
        {
          id: 'dynamic-choice',
          title: 'Follow the river',
          en: 'Follow the river',
          hint: 'Look for a clue',
          continuationSummary: 'Mia follows the river.',
        },
      ],
      stateBefore: {},
      stateAfter: { location: 'river' },
      vocabularyCoverage: ['river'],
      validation: {
        passed: true,
        targetWords: { total: 1, covered: ['river'], missing: [] },
        outOfLevelWords: [],
        difficulty: {
          targetLevel: 'A2',
          sentenceCount: 1,
          averageSentenceLength: 7,
          maxSentenceLength: 7,
          longWordRatio: 0,
          withinRange: true,
        },
        continuity: { required: false, passed: true },
        choices: { passed: true, uniqueChoiceCount: 3 },
        issues: [],
      },
      generation: {
        status: 'SUCCESS' as const,
        provider: 'test',
        model: 'test',
        promptVersion: 2,
        repairCount: 0,
      },
    }
    const markdown = makeMarkdown(
      makeState({ dailyStory: generatedStory, storyChoice: 'dynamic-choice' }),
    )

    expect(markdown).toContain('## 今日故事：A Dynamic Story')
    expect(markdown).toContain('This paragraph came from the server.')
    expect(markdown).toContain('今日选择：Follow the river')
    expect(markdown).not.toContain(storyVariants.medium[0].en)
  })
})
