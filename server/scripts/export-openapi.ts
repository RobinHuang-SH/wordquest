import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import { buildApp } from '../app.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const output = resolve(currentDir, '../../openapi/wordquest-api.json')
const app = await buildApp({
  logger: false,
  env: {
    NODE_ENV: 'development',
    HOST: '127.0.0.1',
    PORT: '3001',
    LOG_LEVEL: 'silent',
    CORS_ORIGIN: 'http://localhost:5173',
    API_BASE_URL: 'http://localhost:3001',
    DOCS_ENABLED: 'false',
  },
})

await app.ready()
await mkdir(dirname(output), { recursive: true })
const prettierConfig = (await resolveConfig(output)) ?? {}
const document = await format(JSON.stringify(app.swagger()), { ...prettierConfig, parser: 'json' })
await writeFile(output, document, 'utf8')
await app.close()
console.log('Generated ' + output)
