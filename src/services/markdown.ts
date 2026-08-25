import { storyChoices, storyVariants } from '../data'
import type { AppState } from '../domain/models'
import { getReviewCount, getSessionWords } from '../domain/learning'
import { storyLengthLabels } from '../domain/sessions'

export function makeMarkdown(state: AppState) {
  const date = state.activeDate
  const generatedStory = state.dailyStory?.date === date ? state.dailyStory : null
  const choice =
    generatedStory?.choices.find((item) => item.id === state.storyChoice)?.title ||
    storyChoices.find((item) => item.id === state.storyChoice)?.title ||
    '尚未选择'
  const sessionWords = getSessionWords(state)
  const reviewCount = sessionWords.length ? getReviewCount(state) : 0
  const activeStory = generatedStory?.paragraphs ?? storyVariants[state.storyLength]
  const storyTitle = generatedStory?.title ?? 'The Signal in the Forest'
  const storyTitleZh = generatedStory?.titleZh ?? '森林里的信号'
  const reviewSuggestions = sessionWords
    .filter((word) => state.learned[word.word] !== 'know')
    .slice(0, 3)
    .map((word) => word.word)
  const lines = [
    '---',
    'date: ' + date,
    'level: ' + state.level,
    'story: ' + JSON.stringify(storyTitle),
    'tags: [英语学习, WordQuest, 每日故事]',
    '---',
    '',
    '# ' + date + ' 英语学习记录',
    '',
    '## 今日学习概览',
    '- 目标词：' +
      sessionWords.length +
      '（' +
      (sessionWords.length - reviewCount) +
      ' 新词 + ' +
      reviewCount +
      ' 复习）',
    '- 计划时长：' + state.dailyMinutes + ' 分钟',
    '- 故事长度：' +
      storyLengthLabels[state.storyLength].name +
      '（' +
      storyLengthLabels[state.storyLength].range +
      '）',
    '- 已学习：' + Object.keys(state.learned).length,
    '- 小测状态：' + (state.quizDone ? '已完成' : '未完成'),
    '- 连续学习：' + state.streak + ' 天',
    '- 学习者：' + (state.displayName || '学习者'),
    '',
    '## 今日 ' + sessionWords.length + ' 词',
    ...sessionWords.map(
      (word) =>
        '- **' +
        word.word +
        '** ' +
        word.phonetic +
        ' — ' +
        word.meaning +
        (word.review ? '（复习）' : '') +
        '\n  - ' +
        word.example,
    ),
    '',
    '## 今日故事：' + storyTitle,
    '',
    '> ' + storyTitleZh,
    '',
    ...activeStory.map((paragraph) => paragraph.en),
    '',
    '> 今日选择：' + choice,
    '',
    '## 明日复习建议',
    reviewSuggestions.length
      ? '重点复习 ' + reviewSuggestions.join('、') + '，并再次朗读故事中的相关段落。'
      : '今天的目标词掌握良好，建议再次朗读全文巩固语境。',
    '',
  ]
  return lines.join('\n')
}
