// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { OpenAiCompatibleStoryModelClient, StoryModelError } from './story-model-client.js'

const request = {
  systemPrompt: 'system',
  userPrompt: 'user',
  schema: { type: 'object' },
  timeoutMs: 1000,
}

describe('OpenAI-compatible story model client', () => {
  it('requests strict JSON schema output without exposing the key in the request body', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '{"title":"Story"}' } }] }), {
          status: 200,
        }),
    )
    const client = new OpenAiCompatibleStoryModelClient(
      { apiKey: 'server-secret', baseUrl: 'https://llm.example/v1/', model: 'story-model' },
      fetcher,
    )
    await expect(client.generate(request)).resolves.toMatchObject({ value: { title: 'Story' } })
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('https://llm.example/v1/chat/completions')
    expect(init.headers.authorization).toBe('Bearer server-secret')
    expect(init.body).not.toContain('server-secret')
    expect(JSON.parse(init.body).response_format.json_schema.strict).toBe(true)
  })
  it('marks rate-limit failures as transient', async () => {
    const client = new OpenAiCompatibleStoryModelClient(
      { apiKey: 'key', baseUrl: 'https://llm.example/v1', model: 'model' },
      vi.fn(async () => new Response('slow down', { status: 429 })),
    )
    await expect(client.generate(request)).rejects.toMatchObject<StoryModelError>({
      transient: true,
      status: 429,
    })
  })
})
