export interface StoryModelRequest {
  systemPrompt: string
  userPrompt: string
  schema: unknown
  timeoutMs: number
}
export interface StoryModelResult {
  value: unknown
  provider: string
  model: string
}
export interface StoryModelClient {
  generate(input: StoryModelRequest): Promise<StoryModelResult>
}

export class StoryModelError extends Error {
  constructor(
    message: string,
    public transient: boolean,
    public status?: number,
  ) {
    super(message)
    this.name = 'StoryModelError'
  }
}

export class OpenAiCompatibleStoryModelClient implements StoryModelClient {
  constructor(
    private options: { apiKey: string; baseUrl: string; model: string },
    private fetcher: typeof fetch = fetch,
  ) {}

  async generate(input: StoryModelRequest): Promise<StoryModelResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), input.timeoutMs)
    try {
      const response = await this.fetcher(
        `${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            authorization: `Bearer ${this.options.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: this.options.model,
            messages: [
              { role: 'system', content: input.systemPrompt },
              { role: 'user', content: input.userPrompt },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'wordquest_story', strict: true, schema: input.schema },
            },
          }),
        },
      )
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new StoryModelError(
          `LLM request failed (${response.status})${text ? `: ${text.slice(0, 300)}` : ''}`,
          response.status === 429 || response.status >= 500,
          response.status,
        )
      }
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = payload.choices?.[0]?.message?.content
      if (!content)
        throw new StoryModelError('LLM response did not contain structured content', false)
      return {
        value: JSON.parse(content),
        provider: 'openai-compatible',
        model: this.options.model,
      }
    } catch (error) {
      if (error instanceof StoryModelError) throw error
      if (error instanceof SyntaxError)
        throw new StoryModelError('LLM returned invalid JSON', false)
      if (controller.signal.aborted) throw new StoryModelError('LLM request timed out', true)
      throw new StoryModelError(error instanceof Error ? error.message : 'LLM request failed', true)
    } finally {
      clearTimeout(timer)
    }
  }
}
