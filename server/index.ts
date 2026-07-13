import { buildApp } from './app.js'
import type { ApiConfig } from './config.js'

const app = await buildApp()

try {
  await app.ready()
  const config = app.getEnvs<ApiConfig>()
  await app.listen({ host: config.HOST, port: config.PORT })
  app.log.info(
    { docs: config.DOCS_ENABLED ? config.API_BASE_URL + '/docs' : 'disabled' },
    'WordQuest API started',
  )
} catch (error) {
  app.log.fatal({ err: error }, 'WordQuest API failed to start')
  process.exitCode = 1
}
