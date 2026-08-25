import type { Prisma, PrismaClient } from '../generated/prisma/client.js'
import { EnglishLevel, PreferredAccent } from '../generated/prisma/enums.js'
import type { SyncService, SyncSnapshot } from './contracts.js'
import { mergeAppStates } from './state-merge.js'

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const knowledgeRank: Record<string, number> = { new: 0, fuzzy: 1, know: 2 }

function learnedWordsFromState(value: unknown) {
  if (!isRecord(value)) return new Map<string, string>()
  const result = new Map<string, string>()
  const merge = (learned: unknown) => {
    if (!isRecord(learned)) return
    for (const [word, knowledge] of Object.entries(learned)) {
      if (typeof knowledge !== 'string' || !(knowledge in knowledgeRank)) continue
      const current = result.get(word)
      if (!current || knowledgeRank[knowledge] > knowledgeRank[current]) result.set(word, knowledge)
    }
  }
  merge(value.learned)
  if (isRecord(value.sessions))
    for (const session of Object.values(value.sessions))
      if (isRecord(session)) merge(session.learned)
  return result
}

export function profilePreferencesFromState(value: unknown): Prisma.UserUpdateInput {
  if (!isRecord(value)) return {}
  const data: Prisma.UserUpdateInput = {}
  if (typeof value.displayName === 'string' && value.displayName.trim())
    data.displayName = value.displayName.trim().slice(0, 100)
  if (
    typeof value.level === 'string' &&
    Object.values(EnglishLevel).includes(value.level as EnglishLevel)
  ) {
    data.englishLevel = value.level as EnglishLevel
    data.targetLevel = value.level as EnglishLevel
  }
  if (typeof value.genre === 'string' && value.genre.trim())
    data.storyGenre = value.genre.trim().slice(0, 50)
  if (value.accent === '美式') data.preferredAccent = PreferredAccent.US
  if (value.accent === '英式') data.preferredAccent = PreferredAccent.UK
  if (value.wordMix === '20+0') data.newWordRatio = 1
  if (value.wordMix === '15+5') data.newWordRatio = 0.75
  if (value.wordMix === '10+10') data.newWordRatio = 0.5
  return data
}
const snapshot = (
  row: { revision: number; stateJson: unknown; clientUpdatedAt: Date; sourceDeviceId: string },
  conflict = false,
): SyncSnapshot => ({
  revision: row.revision,
  state: row.stateJson,
  clientUpdatedAt: row.clientUpdatedAt.toISOString(),
  sourceDeviceId: row.sourceDeviceId,
  ...(conflict ? { conflict: true } : {}),
})

export class PrismaSyncService implements SyncService {
  constructor(private prisma: PrismaClient) {}

  async getState(userId: string) {
    const row = await this.prisma.userSyncState.findUnique({ where: { userId } })
    return row ? snapshot(row) : null
  }

  async importState(
    userId: string,
    input: { deviceId: string; baseRevision: number; clientUpdatedAt: string; state: unknown },
  ) {
    const result = await this.updateState(userId, input)
    const learned = learnedWordsFromState(input.state)
    if (!learned.size) return result
    const words = await this.prisma.vocabulary.findMany({
      where: { word: { in: [...learned.keys()] } },
      select: { id: true, word: true },
    })
    const now = new Date()
    const nextReview = (knowledge: string) => {
      const date = new Date(now)
      date.setUTCDate(date.getUTCDate() + (knowledge === 'know' ? 3 : 1))
      return date
    }
    await this.prisma.userWordState.createMany({
      data: words.map((word) => {
        const knowledge = learned.get(word.word) ?? 'new'
        return {
          userId,
          wordId: word.id,
          status: knowledge === 'know' ? 'REVIEW' : 'LEARNING',
          memoryScore: knowledge === 'know' ? 80 : knowledge === 'fuzzy' ? 45 : 20,
          timesSeen: 1,
          timesCorrect: knowledge === 'know' ? 1 : 0,
          lastReviewedAt: now,
          nextReviewAt: nextReview(knowledge),
        }
      }),
      skipDuplicates: true,
    })
    return result
  }

  async updateState(
    userId: string,
    input: { deviceId: string; baseRevision: number; clientUpdatedAt: string; state: unknown },
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const current = await tx.userSyncState.findUnique({ where: { userId } })
            const clientUpdatedAt = new Date(input.clientUpdatedAt)
            if (!current) {
              const profile = profilePreferencesFromState(input.state)
              if (Object.keys(profile).length)
                await tx.user.update({ where: { id: userId }, data: profile })
              const created = await tx.userSyncState.create({
                data: {
                  userId,
                  revision: 1,
                  stateJson: json(input.state),
                  sourceDeviceId: input.deviceId,
                  clientUpdatedAt,
                },
              })
              return snapshot(created)
            }
            const conflict = input.baseRevision !== current.revision
            const resolved = conflict
              ? mergeAppStates(
                  current.stateJson,
                  input.state,
                  clientUpdatedAt >= current.clientUpdatedAt,
                )
              : input.state
            const profile = profilePreferencesFromState(resolved)
            if (Object.keys(profile).length)
              await tx.user.update({ where: { id: userId }, data: profile })
            if (conflict) {
              await tx.syncConflict.create({
                data: {
                  userId,
                  deviceId: input.deviceId,
                  baseRevision: input.baseRevision,
                  serverRevision: current.revision,
                  incomingStateJson: json(input.state),
                  resolvedStateJson: json(resolved),
                },
              })
            }
            const updated = await tx.userSyncState.update({
              where: { userId },
              data: {
                revision: { increment: 1 },
                stateJson: json(resolved),
                sourceDeviceId: input.deviceId,
                clientUpdatedAt,
              },
            })
            return snapshot(updated, conflict)
          },
          { isolationLevel: 'Serializable' },
        )
      } catch (error) {
        const code =
          error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined
        if (attempt < 2 && (code === 'P2034' || code === 'P2002')) continue
        throw error
      }
    }
    throw new Error('Unable to synchronize state after transaction retries')
  }

  async listConflicts(userId: string) {
    const rows = await this.prisma.syncConflict.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return rows.map((row) => ({
      id: row.id,
      deviceId: row.deviceId,
      baseRevision: row.baseRevision,
      serverRevision: row.serverRevision,
      resolutionStrategy: row.resolutionStrategy,
      createdAt: row.createdAt.toISOString(),
    }))
  }
}
