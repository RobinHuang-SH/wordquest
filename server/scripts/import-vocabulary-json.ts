import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createPrismaClient } from '../database/client.js'
import type { Prisma } from '../generated/prisma/client.js'

type CollectionInput = {
  key: string
  name: string
  description: string
  sourceUrl: string
  sourceLicense: string
}

type WordInput = {
  word: string
  lemma: string
  partOfSpeech: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  meaningZh: string
  definitionEn: string
  phoneticUs?: string | null
  frequencyRank?: number | null
  exampleSentence: string
  sourceName: string
  sourceLicense: string
  collection: string
  memberships: Array<{
    collectionKey: string
    rank?: number | null
    gradeBand?: string | null
    metadata?: Record<string, unknown>
  }>
}

type ImportFile = { collections: CollectionInput[]; words: WordInput[] }

const inputPath = resolve(process.argv[2] || 'server/data/vocabulary-import-v1.json')
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const payload = JSON.parse(await readFile(inputPath, 'utf8')) as ImportFile
if (!Array.isArray(payload.collections) || !Array.isArray(payload.words))
  throw new Error('Invalid vocabulary import file')

const prisma = createPrismaClient(databaseUrl)
try {
  for (const collection of payload.collections)
    await prisma.vocabularyCollection.upsert({
      where: { key: collection.key },
      update: collection,
      create: collection,
    })

  const batchSize = 200
  for (let offset = 0; offset < payload.words.length; offset += batchSize) {
    const batch = payload.words.slice(offset, offset + batchSize)
    await prisma.vocabulary.createMany({
      data: batch.map((word) => ({
        word: word.word,
        lemma: word.lemma,
        partOfSpeech: word.partOfSpeech,
        level: word.level,
        meaningZh: word.meaningZh,
        definitionEn: word.definitionEn,
        phoneticUs: word.phoneticUs,
        phoneticUk: null,
        frequencyRank: word.frequencyRank,
        exampleSentence: word.exampleSentence,
        sourceName: word.sourceName,
        sourceLicense: word.sourceLicense,
        collection: word.collection,
      })),
      skipDuplicates: true,
    })
    const stored = await prisma.vocabulary.findMany({
      where: { word: { in: batch.map((item) => item.word) } },
      select: { id: true, word: true },
    })
    const ids = new Map(stored.map((item) => [item.word, item.id]))
    await prisma.vocabularyCollectionWord.createMany({
      data: batch.flatMap((word) => {
        const vocabularyId = ids.get(word.word)
        if (!vocabularyId) return []
        return word.memberships.map((membership) => ({
          collectionKey: membership.collectionKey,
          vocabularyId,
          rank: membership.rank ?? null,
          gradeBand: membership.gradeBand ?? null,
          metadataJson: (membership.metadata ?? {}) as Prisma.InputJsonValue,
        }))
      }),
      skipDuplicates: true,
    })
    process.stdout.write(
      `\rImported ${Math.min(offset + batch.length, payload.words.length)}/${payload.words.length}`,
    )
  }
  const counts = await prisma.vocabularyCollection.findMany({
    orderBy: { key: 'asc' },
    select: { key: true, _count: { select: { words: true } } },
  })
  process.stdout.write(`\n${JSON.stringify(counts)}\n`)
} finally {
  await prisma.$disconnect()
}
