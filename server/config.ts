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
  AGNES_API_KEY: string
  LLM_API_KEY: string
  LLM_BASE_URL: string
  LLM_MODEL: string
  LLM_API_STYLE: 'responses' | 'chat-completions'
  LLM_PROVIDER: string
  LLM_OUTPUT_MODE: 'json-schema' | 'prompt-only'
  LLM_SYSTEM_PROMPT: string
  LLM_TIMEOUT_MS: number
  LLM_MAX_RETRIES: number
  LLM_RATE_LIMIT_PER_MINUTE: number
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
    AGNES_API_KEY: { type: 'string', default: '' },
    LLM_API_KEY: { type: 'string', default: '' },
    LLM_BASE_URL: { type: 'string', default: 'https://apihub.agnes-ai.com/v1' },
    LLM_MODEL: { type: 'string', default: 'agnes-2.0-flash' },
    LLM_API_STYLE: {
      type: 'string',
      enum: ['responses', 'chat-completions'],
      default: 'chat-completions',
    },
    LLM_PROVIDER: { type: 'string', default: 'agnes' },
    LLM_OUTPUT_MODE: {
      type: 'string',
      enum: ['json-schema', 'prompt-only'],
      default: 'prompt-only',
    },
    LLM_SYSTEM_PROMPT: { type: 'string', default: '' },
    LLM_TIMEOUT_MS: { type: 'integer', minimum: 1000, default: 60000 },
    LLM_MAX_RETRIES: { type: 'integer', minimum: 0, maximum: 5, default: 2 },
    LLM_RATE_LIMIT_PER_MINUTE: { type: 'integer', minimum: 1, default: 5 },
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
