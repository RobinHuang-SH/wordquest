export const errorResponseSchema = {
  type: 'object',
  required: ['error', 'timestamp', 'path'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message', 'statusCode', 'requestId'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        statusCode: { type: 'integer' },
        requestId: { type: 'string' },
        details: {},
      },
    },
    timestamp: { type: 'string', format: 'date-time' },
    path: { type: 'string' },
  },
} as const

export const healthResponseSchema = {
  type: 'object',
  required: ['status', 'service', 'version', 'environment', 'timestamp', 'uptimeSeconds'],
  properties: {
    status: { type: 'string', enum: ['ok'] },
    service: { type: 'string' },
    version: { type: 'string' },
    environment: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    uptimeSeconds: { type: 'number', minimum: 0 },
  },
} as const
