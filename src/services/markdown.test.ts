import { describe, expect, it } from 'vitest'
import { storyVariants, todayWords } from '../data'
import { makeState } from '../test/factories'
import { makeMarkdown } from './markdown'

describe('Markdown export', () => {
  it('contains learner, plan, words, choice and active story content', () => {
    const markdown = makeMarkdown(
      makeState({
        displayName: 'Mia Chen',
        activeDate: '2026-07-12',
        dailyMinutes: 30,
        storyLength: 'short',
        storyChoice: 'machine',
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
    expect(makeMarkdown(makeState({ wordMix: '20+0' }))).toContain('20 新词 + 0 复习')
    expect(makeMarkdown(makeState({ wordMix: '10+10' }))).toContain('10 新词 + 10 复习')
  })
})
