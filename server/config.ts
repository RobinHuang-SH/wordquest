export type ApiEnvironment = 'development' | 'test' | 'production'
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'

export interface ApiConfig {
  NODE_ENV: ApiEnvironment
  HOST: string
  PORT: number
  LOG_LEVEL: LogLevel
  CORS_ORIGIN: string
  API_BASE_URL: string
  DOCS_ENABLED: boolean
  DATABASE_URL: string
}

export const configSchema = {
  type: 'object',
  properties: {
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'test', 'production'],
      default: 'development',
    },
    HOST: { type: 'string', default: '0.0.0.0' },
    PORT: { type: 'integer', minimum: 1, maximum: 65535, default: 3001 },
    LOG_LEVEL: {
      type: 'string',
      enum: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
    },
    CORS_ORIGIN: { type: 'string', default: 'http://localhost:5173' },
    API_BASE_URL: { type: 'string', default: 'http://localhost:3001' },
    DOCS_ENABLED: { type: 'boolean', default: true },
    DATABASE_URL: {
      type: 'string',
      default: 'postgresql://wordquest:wordquest@localhost:5432/wordquest?schema=public',
    },
  },
} as const

export function parseCorsOrigin(value: string): string | string[] {
  if (value === '*') return '*'
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  return origins.length === 1 ? origins[0] : origins
}
