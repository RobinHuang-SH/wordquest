// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseGeneratedStory } from './story-schema.js'

const valid = {
  title: 'A Door in the Rain',
  titleZh: 'A Door in the Rain',
  summary: 'Mia finds a door.',
  paragraphs: [{ en: 'Mia discovered a door.', zh: 'Mia found a door.' }],
  choices: [
    {
      id: 'open-door',
      title: 'Open',
      en: 'Open the door',
      hint: 'Look inside',
      continuationSummary: 'Mia opens it.',
    },
    {
      id: 'read-sign',
      title: 'Read sign',
      en: 'Read the sign',
      hint: 'Study the clue',
      continuationSummary: 'Mia reads it.',
    },
    {
      id: 'call-leo',
      title: 'Call Leo',
      en: 'Call Leo',
      hint: 'Ask for help',
      continuationSummary: 'Leo arrives.',
    },
  ],
  stateBefore: {},
  stateAfter: { location: 'door' },
  vocabularyCoverage: ['discover'],
}

describe('generated story schema', () => {
  it('accepts the fixed bilingual story shape', () => {
    expect(parseGeneratedStory(valid)).toMatchObject({ title: valid.title, choices: valid.choices })
  })
  it('rejects output without exactly three choices', () => {
    expect(() => parseGeneratedStory({ ...valid, choices: valid.choices.slice(0, 2) })).toThrow(
      'exactly three choices',
    )
  })
  it('rejects unsafe choice identifiers', () => {
    expect(() =>
      parseGeneratedStory({
        ...valid,
        choices: [{ ...valid.choices[0], id: 'Open Door' }, ...valid.choices.slice(1)],
      }),
    ).toThrow('fixed schema')
  })
})
