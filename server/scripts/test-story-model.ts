import 'dotenv/config'
import {
  OpenAiCompatibleStoryModelClient,
  type StoryModelApiStyle,
  type StoryModelOutputMode,
} from '../services/story-model-client.js'

function apiStyle(value: string | undefined): StoryModelApiStyle {
  return value === 'responses' ? 'responses' : 'chat-completions'
}

function outputMode(value: string | undefined): StoryModelOutputMode {
  return value === 'json-schema' ? 'json-schema' : 'prompt-only'
}

async function main() {
  const apiKey = process.env.LLM_API_KEY || process.env.AGNES_API_KEY
  if (!apiKey) {
    throw new Error('未找到 AGNES_API_KEY。请先把 Agnes API 密钥写入服务器 .env。')
  }

  const client = new OpenAiCompatibleStoryModelClient({
    apiKey,
    baseUrl: process.env.LLM_BASE_URL || 'https://apihub.agnes-ai.com/v1',
    model: process.env.LLM_MODEL || 'agnes-2.0-flash',
    apiStyle: apiStyle(process.env.LLM_API_STYLE),
    provider: process.env.LLM_PROVIDER || 'agnes',
    outputMode: outputMode(process.env.LLM_OUTPUT_MODE),
  })
  const result = await client.generate({
    systemPrompt: 'You are a JSON API connectivity checker. Return only the requested JSON.',
    userPrompt: 'Return an object confirming that the model connection works.',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['ok', 'message'],
      properties: {
        ok: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 60_000),
  })
  console.log(
    JSON.stringify(
      { connected: true, provider: result.provider, model: result.model, response: result.value },
      null,
      2,
    ),
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Agnes API 连通性检查失败')
  process.exitCode = 1
})
