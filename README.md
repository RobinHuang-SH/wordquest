# 词境英语 · WordQuest MVP

基于《AI 故事英语学习软件 PRD》实现的移动端优先 PWA 原型。

## 已实现

- 首次使用引导：英语等级、故事类型、发音偏好
- 每日恰好 20 个目标词（15 新词 + 5 复习词）
- 单词卡、例句、搭配、美/英式浏览器 TTS、慢速朗读
- 浏览器麦克风录音与本地回放
- “认识 / 模糊 / 不认识”学习状态及 localStorage 持久化
- 5 题单词小测与得分反馈
- 连续互动故事，20 个目标词全部出现并高亮
- 中英对照、逐段朗读、全文朗读、3 个剧情走向选择
- 个人词库、掌握度与复习状态
- 学习周报、周故事和下周建议
- 每日学习记录导出为 Obsidian Markdown
- 可安装 PWA、完整应用壳预缓存、离线提示与版本更新引导
- localStorage 有效快照备份、损坏自动恢复与设置页手动恢复
- 响应式移动布局
- 键盘快捷键、跳转主内容、清晰焦点、高对比度与减少动态效果
- 语义化导航、进度条、弹窗和状态播报，覆盖屏幕阅读器关键流程
- Vitest 单元/组件测试、Playwright 关键流程测试、ESLint、Prettier 与 CI
- Fastify + TypeScript API foundation with validated environment configuration
- OpenAPI 3.1, Swagger UI, health checks, structured logs, and unified errors
- PostgreSQL 17 + Prisma 7 schema, migrations, generated client, and idempotent seed data
- Server-side structured AI story generation with prompt versioning, retries, timeout, per-user rate limiting, persistence, and deterministic fallback

## 技术栈

Frontend: React 19 + TypeScript + Vite + Lucide Icons. API: Fastify + TypeScript. Data layer: PostgreSQL 17 + Prisma 7 with the node-postgres driver adapter. Accounts, cross-device synchronization, the adaptive vocabulary engine, and dynamic structured story generation are implemented; deeper vocabulary and continuity validation is the next roadmap stage.

## 本地运行

Install dependencies and start the frontend:

```powershell
pnpm install
pnpm dev:web
```

Start the API in a second terminal:

```powershell
Copy-Item .env.example .env
pnpm dev:api
```

浏览器访问 `http://localhost:5173/`。

## API Foundation

The API defaults to `http://localhost:3001` and provides:

- `GET /health`: service version, environment, uptime, and health status.
- `GET /api/v1`: API version and planned PRD resource groups.
- `GET /docs`: interactive Swagger UI.
- `GET /docs/json`: runtime OpenAPI JSON.
- `pnpm api:openapi`: generate `openapi/wordquest-api.json`.
- `.env.example`: validated API configuration template.

Fastify writes structured request logs and redacts authorization and cookie headers. Unified error responses include a code, message, HTTP status, request ID, timestamp, and request path.

## Structured AI stories

Authenticated learners can call `POST /api/v1/stories/generate` with a daily session ID and a story length. The server supplies that session's vocabulary to a versioned prompt and requires a fixed bilingual JSON story shape with exactly three choices. Repeated requests for the same session return the same persisted story.

Provider credentials are server-only (`LLM_API_KEY`) and never use a `VITE_` prefix. `LLM_BASE_URL` supports an OpenAI-compatible structured-output endpoint; `LLM_MODEL`, `LLM_TIMEOUT_MS`, `LLM_MAX_RETRIES`, and `LLM_RATE_LIMIT_PER_MINUTE` control generation. Without a key, after transient failures, or when the user limit is reached, the API persists and returns a deterministic fallback story instead of blocking learning. Prompt versions and every generation outcome are stored in `story_prompt_versions` and `story_generations`.

Before persistence, the server tokenizes and lemmatizes the English paragraphs and verifies measured target-word coverage instead of trusting the model-reported list. It also detects catalog words above the learner CEFR level, excessive sentence complexity, broken `previousChoice` continuity, empty story state, and duplicate plot continuations. Failed drafts receive a focused repair prompt that asks the model to rewrite only affected sentences or choices; exhausted repairs switch to a deterministic story that is validated by the same pipeline. The API returns the validation report and repair count, and both are persisted in `story_generations`.

## PostgreSQL and Prisma

Start the local PostgreSQL service, apply migrations, and load the idempotent demo dataset:

```powershell
docker compose up -d postgres
pnpm db:migrate:deploy
pnpm db:seed
```

The seed creates one demo learner, the 20-word daily set, word states, a completed session, an interactive story node with three choices, and a weekly report. Running `pnpm db:seed` repeatedly does not duplicate records.

Core commands:

```powershell
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:studio
pnpm db:down
```

The Prisma schema implements the PRD entities `users`, `vocabulary`, `user_word_state`, `daily_sessions`, `daily_session_words`, `story_series`, `story_nodes`, `story_choices`, `pronunciation_attempts`, and `weekly_reports`. Generated Prisma Client files are build artifacts and are not committed.

## 质量检查

```powershell
pnpm lint
pnpm format:check
pnpm db:validate
pnpm test
pnpm test:api
pnpm test:e2e
pnpm build
pnpm api:openapi
```

单元测试覆盖选词、计分、Session、数据迁移与备份恢复、故事词汇覆盖、PWA 状态组件和 Markdown 导出；Playwright 覆盖改名持久化、同日故事记录更新、移动端横向溢出、生产应用离线重载、安装引导，以及键盘导航和无障碍偏好。

## 无障碍操作

- 首次按下 Tab 可聚焦“跳到主要内容”，回车后直接进入主内容区。
- 使用 Alt + 1—6 切换“今日、学习、故事、词库、周报、设置”。
- 按 ? 打开快捷键帮助，按 Escape 关闭帮助窗口或移动端菜单。
- 快捷键在输入框、下拉框、文本区域和可编辑区域中不会触发。
- 设置页可开启“高对比度”和“减少动态效果”；操作系统的减少动态效果偏好也会自动生效。
- 页面切换后焦点移入主内容，当前导航项、进度、选择状态和提示消息提供对应语义。

## 生产构建

```powershell
pnpm build
pnpm preview
```

生产文件输出至 `dist/`。构建末尾会扫描全部产物、计算内容版本，并生成 `dist/sw.js`；新版本会使用独立的预缓存与运行时缓存，激活后清理旧版 WordQuest 缓存。

首次在线打开并完成 Service Worker 安装后，应用壳、脚本、样式、manifest 和图标可离线使用。设置页的“应用与离线”区域提供安装方法、更新入口和连接状态说明。

## 数据说明

- 当前学习状态保存在浏览器 `localStorage` 的 `wordquest-state` 中。
- 上一份有效状态保存在 `wordquest-state-backup` 中；主状态损坏时会自动恢复，也可在设置页手动恢复。
- 更新 Service Worker 或清理旧缓存不会删除以上学习数据；“重置数据”会同时清除主状态与备份。
- 录音只生成浏览器会话内的本地 Blob URL，不上传服务器。
- TTS 使用浏览器 `SpeechSynthesis`，可用声音取决于操作系统和浏览器。
- Obsidian 第一版采用 Markdown 下载；下载后放入 Vault 即可。

## 项目结构

- `src/domain`：领域模型、学习规则、Session 与周报计算
- `src/data`：版本化 localStorage Repository 和旧数据迁移
- `src/services`：语音、Markdown 与文件下载等浏览器服务
- `src/components`：应用外壳和共享导航组件
- `src/pages`：按功能拆分的页面组件
- `src/App.tsx`：只负责状态装配、页面切换和应用级交互
- `server`: Fastify application, configuration, system routes, errors, and API tests
- `openapi`: generated OpenAPI 3.1 document tracked in version control
- `prisma`: data model, migrations, seed dataset, and schema tests
- `compose.yaml`: local PostgreSQL 17 development service

localStorage 当前使用带 `version` 的数据信封；旧版直接保存的状态会在加载时自动迁移。

## 下一步接入建议

1. 增加后端账户、跨设备同步和 PostgreSQL 数据模型。
2. 接入 LLM 服务端工作流，完成动态选词、故事生成、越界词检测与重写。
3. 接入 Azure Speech 等专业发音评测。
4. 增加 Obsidian URI / Tauri 桌面同步助手。
5. 将本地示例词库替换为可授权的 CET、雅思或高频词库。

## 开发路线与 Git 分支

项目的逐步完善计划见 `ROADMAP.md`。采用“一项优化一个分支”。已完成可编辑名字、学习偏好联动、多日学习记录、领域数据层拆分、自动化质量基础、离线 PWA 和无障碍优化，下一阶段分支为：

```text
feature/story-bible
```

## Account authentication and cross-device sync

The `feature/auth-sync` stage adds an end-to-end account path without requiring a third-party identity provider:

- Email/password registration and login using Node.js `scrypt` password hashing.
- Opaque 30-day bearer sessions; only SHA-256 token hashes are stored in PostgreSQL.
- The Settings page can create an account, sign in, sign out, and manually synchronize.
- The first sign-in imports the existing local learning snapshot into the account.
- Later changes are synchronized automatically after a short debounce. Offline changes are coalesced into a persistent queue and flushed when connectivity returns.
- Server snapshots use monotonically increasing revisions. Stale updates are deterministically merged, preserving stronger vocabulary knowledge and the newest daily-session record, and are audited in `sync_conflicts`.

API endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
GET  /api/v1/sync/state
POST /api/v1/sync/import
PUT  /api/v1/sync/state
GET  /api/v1/sync/conflicts
POST /api/v1/stories/generate
```

Set `VITE_API_BASE_URL` when the frontend cannot reach the API at its default `http://localhost:3001`. The next roadmap branch is `feature/story-bible`.

## Adaptive vocabulary engine

The `feature/vocabulary-engine` stage adds a server-backed daily learning plan while preserving the original 20-word local flow as an anonymous/offline fallback.

- The seed catalog contains 56 unique curated starter words with `sourceName`, `sourceLicense`, and collection metadata. These fields are ready for future licensed high-frequency, CET, or IELTS imports.
- Authenticated learners receive an idempotent 20-word plan for each calendar date.
- Supported mixes are `20+0`, `15+5`, `10+10`, and `dynamic`. When too few reviews are due, remaining slots are filled with unseen words rather than mislabeling new words as reviews.
- Review scheduling uses a simplified SM-2 model with ease factor, interval, lapse count, memory score, and next-review time.
- Review priority combines overdue time, memory weakness, pronunciation weakness, spelling weakness, listening weakness, and lapse count.
- The React app loads the authenticated plan automatically, stores it in the versioned local snapshot, and submits `KNOW`, `FUZZY`, or `UNKNOWN` feedback without blocking card navigation.

Vocabulary endpoints:

```text
GET  /api/v1/daily-session?date=YYYY-MM-DD&mix=dynamic
POST /api/v1/words/:wordId/review
```

Both endpoints require the bearer token returned by the account API. The daily-session endpoint returns word source/license metadata and reuses an existing session for the same user and date.
