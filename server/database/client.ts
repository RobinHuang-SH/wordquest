import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

export function requireDatabaseUrl(
  environment: Record<string, string | undefined> = process.env,
): string {
  const databaseUrl = environment.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to connect to PostgreSQL')
  }
  return databaseUrl
}

export function createPrismaClient(databaseUrl = requireDatabaseUrl()) {
  const adapter = new PrismaPg({ connectionString: databaseUrl })
  return new PrismaClient({ adapter })
}
