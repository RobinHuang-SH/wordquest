import type { FastifyError, FastifyInstance, FastifyRequest } from 'fastify'

interface ErrorBodyOptions {
  code: string
  message: string
  statusCode: number
  request: FastifyRequest
  details?: unknown
}

function makeErrorBody({ code, message, statusCode, request, details }: ErrorBodyOptions) {
  return {
    error: {
      code,
      message,
      statusCode,
      requestId: request.id,
      ...(details === undefined ? {} : { details }),
    },
    timestamp: new Date().toISOString(),
    path: request.url,
  }
}

export function registerErrorHandlers(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(
      makeErrorBody({
        code: 'ROUTE_NOT_FOUND',
        message: '请求的 API 路由不存在',
        statusCode: 404,
        request,
      }),
    )
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const validation = error.validation
    const statusCode = validation ? 400 : (error.statusCode ?? 500)
    const isServerError = statusCode >= 500
    const code = validation
      ? 'VALIDATION_ERROR'
      : isServerError
        ? 'INTERNAL_SERVER_ERROR'
        : (error.code ?? 'REQUEST_ERROR')
    const message = isServerError ? '服务器暂时无法处理该请求' : error.message

    if (isServerError) request.log.error({ err: error }, 'request failed')
    else request.log.warn({ err: error }, 'request rejected')

    reply.code(statusCode).send(
      makeErrorBody({
        code,
        message,
        statusCode,
        request,
        details: validation,
      }),
    )
  })
}
