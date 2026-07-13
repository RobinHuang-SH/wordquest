import type { Prisma, PrismaClient } from '../generated/prisma/client.js'
import type { SyncService, SyncSnapshot } from './contracts.js'
import { mergeAppStates } from './state-merge.js'

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
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

  async updateState(
    userId: string,
    input: { deviceId: string; baseRevision: number; clientUpdatedAt: string; state: unknown },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.userSyncState.findUnique({ where: { userId } })
      const clientUpdatedAt = new Date(input.clientUpdatedAt)
      if (!current) {
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
        ? mergeAppStates(current.stateJson, input.state, clientUpdatedAt >= current.clientUpdatedAt)
        : input.state
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
    })
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
