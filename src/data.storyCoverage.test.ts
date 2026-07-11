import { describe, expect, it } from 'vitest'
import { storyVariants, todayWords } from './data'

describe('story vocabulary coverage', () => {
  it.each(Object.entries(storyVariants))(
    '%s story contains all twenty target words',
    (_length, paragraphs) => {
      const story = paragraphs
        .map((paragraph) => paragraph.en)
        .join(' ')
        .toLowerCase()
      const missing = todayWords
        .map((word) => word.word)
        .filter((word) => !new RegExp('\\b' + word + '(?:s|ed)?\\b', 'i').test(story))

      expect(missing).toEqual([])
    },
  )
})
