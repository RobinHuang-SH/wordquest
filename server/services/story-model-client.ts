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

export type StoryModelApiStyle = 'responses' | 'chat-completions'
export type StoryModelOutputMode = 'json-schema' | 'prompt-only'

function parseJsonContent(content: string): unknown {
  const trimmed = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    for (let start = trimmed.indexOf('{'); start >= 0; start = trimmed.indexOf('{', start + 1)) {
      let depth = 0
      let inString = false
      let escaped = false
      for (let index = start; index < trimmed.length; index += 1) {
        const character = trimmed[index]
        if (inString) {
          if (escaped) escaped = false
          else if (character === '\\') escaped = true
          else if (character === '"') inString = false
          continue
        }
        if (character === '"') inString = true
        else if (character === '{') depth += 1
        else if (character === '}') {
          depth -= 1
          if (depth === 0) {
            try {
              return JSON.parse(trimmed.slice(start, index + 1))
            } catch {
              break
            }
          }
        }
      }
    }
    throw new SyntaxError('No JSON object found in model response')
  }
}

export class OpenAiCompatibleStoryModelClient implements StoryModelClient {
  constructor(
    private options: {
      apiKey: string
      baseUrl: string
      model: string
      apiStyle?: StoryModelApiStyle
      provider?: string
      outputMode?: StoryModelOutputMode
    },
    private fetcher: typeof fetch = fetch,
  ) {}

  async generate(input: StoryModelRequest): Promise<StoryModelResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), input.timeoutMs)
    const apiStyle = this.options.apiStyle ?? 'chat-completions'
    const outputMode = this.options.outputMode ?? 'json-schema'
    const userPrompt =
      outputMode === 'prompt-only'
        ? `${input.userPrompt}\n\nReturn exactly one JSON object matching this JSON Schema. Do not use markdown fences or add any explanation:\n${JSON.stringify(input.schema)}`
        : input.userPrompt
    try {
      const response = await this.fetcher(
        `${this.options.baseUrl.replace(/\/$/, '')}/${apiStyle === 'responses' ? 'responses' : 'chat/completions'}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            authorization: `Bearer ${this.options.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(
            apiStyle === 'responses'
              ? {
                  model: this.options.model,
                  instructions: input.systemPrompt,
                  input: userPrompt,
                  store: false,
                  text: {
                    format: {
                      type: 'json_schema',
                      name: 'wordquest_story',
                      strict: true,
                      schema: input.schema,
                    },
                  },
                }
              : {
                  model: this.options.model,
                  messages: [
                    { role: 'system', content: input.systemPrompt },
                    { role: 'user', content: userPrompt },
                  ],
                  ...(outputMode === 'json-schema'
                    ? {
                        response_format: {
                          type: 'json_schema',
                          json_schema: {
                            name: 'wordquest_story',
                            strict: true,
                            schema: input.schema,
                          },
                        },
                      }
                    : {}),
                },
          ),
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
        output_text?: string
        output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
        choices?: Array<{ message?: { content?: string } }>
      }
      const content =
        apiStyle === 'responses'
          ? payload.output_text ||
            payload.output
              ?.flatMap((item) => item.content ?? [])
              .find((item) => item.type === 'output_text')?.text
          : payload.choices?.[0]?.message?.content
      if (!content)
        throw new StoryModelError('LLM response did not contain structured content', false)
      return {
        value: parseJsonContent(content),
        provider:
          this.options.provider ?? (apiStyle === 'responses' ? 'openai' : 'openai-compatible'),
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
