# 个性化 AI 故事配置

故事生成由服务器调用大语言模型。API 密钥只保存在服务器端，不能写入 `.env.android`、网页代码或 APK。

## 使用 Agnes AI

在服务器项目的 `.env` 中加入：

```dotenv
AGNES_API_KEY=你的服务器端Agnes密钥
LLM_BASE_URL=https://apihub.agnes-ai.com/v1
LLM_MODEL=agnes-2.0-flash
LLM_API_STYLE=chat-completions
LLM_PROVIDER=agnes
LLM_OUTPUT_MODE=prompt-only
LLM_SYSTEM_PROMPT=故事氛围温暖，主角喜欢探索自然与科技；避免恐怖情节。
LLM_TIMEOUT_MS=60000
LLM_MAX_RETRIES=2
LLM_RATE_LIMIT_PER_MINUTE=5
```

Agnes 的文本接口兼容 OpenAI Chat Completions，但官方参数表没有声明支持 JSON Schema。项目因此把完整结构要求放进提示词，并在服务器上执行严格解析、词汇覆盖检查和自动修复。

保存 `.env` 后，可以先执行一次不依赖数据库的连通性检查：

```powershell
pnpm llm:test
```

成功时会显示 `connected: true`、服务商、模型和一段测试 JSON；不会输出 API 密钥。

## 使用 OpenAI

在服务器项目的 `.env` 中加入：

```dotenv
LLM_API_KEY=你的服务器端API密钥
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4.1-mini
LLM_API_STYLE=responses
LLM_PROVIDER=openai
LLM_OUTPUT_MODE=json-schema
LLM_SYSTEM_PROMPT=故事氛围温暖，主角喜欢探索自然与科技；避免恐怖情节。
LLM_TIMEOUT_MS=60000
LLM_MAX_RETRIES=2
LLM_RATE_LIMIT_PER_MINUTE=5
```

重新启动 API 服务后生效。`LLM_SYSTEM_PROMPT` 是可选的创作偏好，会追加到项目内置的安全、分级阅读和结构化输出规则之后，不会替换这些基础规则。

## 使用 OpenAI 兼容服务

如果服务商提供 `/chat/completions` 兼容接口，可使用：

```dotenv
LLM_API_KEY=你的服务器端API密钥
LLM_BASE_URL=https://服务商地址/v1
LLM_MODEL=服务商提供的模型名称
LLM_API_STYLE=chat-completions
LLM_PROVIDER=服务商名称
LLM_OUTPUT_MODE=json-schema
```

服务商必须支持 JSON Schema 结构化输出，否则生成会自动降级为安全的本地故事。

## 个性化内容

每次生成时，服务器会提供以下上下文：

- 学习者昵称和 CEFR 英语等级
- 当天目标词汇、故事类型和期望长度
- 上一次选择、上一章摘要和故事状态
- 延续中的人物、地点和未解决线索

如果当天已经保存的是“未配置模型”产生的兜底故事，配置 API 后再次打开故事页，服务器会在没有后续章节的前提下自动重新生成，避免破坏已有故事分支。

## Android 连接

Android 应用仍需通过 HTTPS 访问该服务器。按照 `docs/android.md` 配置 `.env.android` 中的 `VITE_API_BASE_URL`，登录账号后即可取得在线个性化故事。未登录或无法连接服务器时，应用会继续显示可离线使用的本地故事。
