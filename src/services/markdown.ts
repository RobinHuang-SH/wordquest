import { storyChoices, storyVariants } from '../data'
import type { AppState } from '../domain/models'
import { getReviewCount, getSessionWords } from '../domain/learning'
import { storyLengthLabels } from '../domain/sessions'

export function makeMarkdown(state: AppState) {
  const date = state.activeDate
  const choice = storyChoices.find((item) => item.id === state.storyChoice)?.title || '尚未选择'
  const sessionWords = getSessionWords(state)
  const reviewCount = getReviewCount(state)
  const activeStory = storyVariants[state.storyLength]
  const lines = [
    '---',
    'date: ' + date,
    'level: ' + state.level,
    'story: 雾林中的观测站',
    'tags: [英语学习, WordQuest, 每日故事]',
    '---',
    '',
    '# ' + date + ' 英语学习记录',
    '',
    '## 今日学习概览',
    '- 目标词：20（' + (20 - reviewCount) + ' 新词 + ' + reviewCount + ' 复习）',
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
    '## 今日 20 词',
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
    '## 今日故事：The Signal in the Forest',
    '',
    ...activeStory.map((paragraph) => paragraph.en),
    '',
    '> 今日选择：' + choice,
    '',
    '## 明日复习建议',
    '重点复习 courage、whisper、ancient，并再次朗读故事第二段。',
    '',
  ]
  return lines.join('\n')
}
