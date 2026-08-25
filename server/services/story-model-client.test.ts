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
  it('uses the Responses API with instructions and strict structured output', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            output: [{ content: [{ type: 'output_text', text: '{"title":"Personal story"}' }] }],
          }),
          { status: 200 },
        ),
    )
    const client = new OpenAiCompatibleStoryModelClient(
      {
        apiKey: 'server-secret',
        baseUrl: 'https://api.openai.com/v1/',
        model: 'story-model',
        apiStyle: 'responses',
        provider: 'openai',
      },
      fetcher,
    )
    await expect(client.generate(request)).resolves.toMatchObject({
      value: { title: 'Personal story' },
      provider: 'openai',
    })
    const [url, init] = fetcher.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect(body.instructions).toBe('system')
    expect(body.input).toBe('user')
    expect(body.store).toBe(false)
    expect(body.text.format).toMatchObject({ type: 'json_schema', strict: true })
    expect(init.body).not.toContain('server-secret')
  })
  it('uses Agnes prompt-only JSON mode without an unsupported response_format field', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: 'Here is the result:\n```json\n{"title":"Agnes story"}\n```',
                },
              },
            ],
          }),
          { status: 200 },
        ),
    )
    const client = new OpenAiCompatibleStoryModelClient(
      {
        apiKey: 'agnes-secret',
        baseUrl: 'https://apihub.agnes-ai.com/v1',
        model: 'agnes-2.0-flash',
        apiStyle: 'chat-completions',
        provider: 'agnes',
        outputMode: 'prompt-only',
      },
      fetcher,
    )

    await expect(client.generate(request)).resolves.toEqual({
      value: { title: 'Agnes story' },
      provider: 'agnes',
      model: 'agnes-2.0-flash',
    })
    const [url, init] = fetcher.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(url).toBe('https://apihub.agnes-ai.com/v1/chat/completions')
    expect(body).not.toHaveProperty('response_format')
    expect(body.messages[1].content).toContain('Return exactly one JSON object')
    expect(body.messages[1].content).toContain('{"type":"object"}')
    expect(init.headers.authorization).toBe('Bearer agnes-secret')
    expect(init.body).not.toContain('agnes-secret')
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
