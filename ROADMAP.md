# WordQuest 迭代路线图

本项目采用“小步迭代、一项优化一个 Git 分支”的方式持续完善。每个分支必须通过 `pnpm build`，完成浏览器主流程验证后再合并到 `main`。

## 分支工作流

```text
main（稳定可运行）
  └─ feature/具体功能
       ├─ 实现
       ├─ 构建与验收
       ├─ 提交
       └─ 用户确认后合并回 main
```

命名规范：

- 新功能：`feature/<name>`
- 修复：`fix/<name>`
- 重构：`refactor/<name>`
- 工程化：`chore/<name>`

## 阶段 0：产品体验补全

### 0.1 `feature/edit-profile-name` — 可编辑用户名字（已完成）

- 设置页修改名字
- 首页问候实时更新
- 侧边栏头像与名字更新
- Obsidian Markdown 写入学习者名字
- localStorage 持久化

验收：刷新页面后名字保留，所有展示位置一致。

### 0.2 `feature/learning-preferences` — 学习偏好真正生效（已完成）

- 每日新词/复习词比例进入状态模型
- 故事长度设置进入状态模型
- 学习时间与每日目标持久化
- 设置项不再使用仅展示的默认值

### 0.3 `feature/session-history` — 多日学习记录（下一阶段）

- 按日期保存每日 Session
- 历史学习日历
- 昨日故事结尾和选择继承
- 防止同一天重复生成记录

### 0.4 `refactor/domain-data-layer` — 领域模型与数据层拆分

- 从单一 `App.tsx` 拆分页面、组件、类型和服务
- 建立 User、Word、DailySession、StoryNode、WeeklyReport 模型
- localStorage Repository 封装
- 数据版本迁移机制

## 阶段 1：质量与可维护性

### 1.1 `chore/test-foundation`

- Vitest + React Testing Library
- 单词选择、测试计分、故事覆盖、Markdown 导出单元测试
- Playwright 关键用户流程测试
- ESLint、格式化和 CI 构建脚本

### 1.2 `feature/offline-pwa`

- 完整应用壳与静态资源缓存
- 离线状态提示
- 安装引导
- 缓存升级和数据恢复策略

### 1.3 `feature/accessibility`

- 键盘操作与快捷键
- 焦点状态、ARIA 标签、对比度优化
- 减少动态效果选项
- 屏幕阅读器流程验证

## 阶段 2：后端账户与跨设备同步

### 2.1 `feature/api-foundation`

- 建立 Node/NestJS 或 Fastify API
- 环境变量与配置管理
- OpenAPI 接口文档
- 健康检查、日志和统一错误结构

### 2.2 `feature/postgres-schema`

- PostgreSQL + Prisma
- 落地 PRD 中 users、vocabulary、user_word_state、daily_sessions、story_series 等表
- Migration 与种子数据

### 2.3 `feature/auth-sync`

- 邮箱登录或第三方登录
- 本地数据迁移到用户账户
- 多设备学习进度同步
- 冲突解决与离线队列

## 阶段 3：真正的 AI 学习闭环

### 3.1 `feature/vocabulary-engine`

- 可授权高频词库/CET/雅思词库
- 间隔重复算法
- 动态生成 15 新词 + 5 复习词
- 根据错误率与发音弱项安排复习

### 3.2 `feature/llm-story-service`

- 服务端 LLM 接入，API Key 不进入前端
- 固定 JSON Schema 输出
- 重试、超时、限流和降级故事
- 保存 Prompt 版本与生成记录

### 3.3 `feature/story-validation`

- 目标词 20/20 覆盖检查
- 分词、词形还原和越界词检测
- 自动重写不合格句子
- 难度、连续性与剧情选择验证

### 3.4 `feature/story-bible`

- 人物、地点、物品和未解决线索状态
- 每日选择影响第二天故事
- 每周章节合并
- 多故事世界管理

## 阶段 4：语音能力

### 4.1 `feature/speech-recognition`

- 浏览器语音识别作为可选辅助
- 读词正确/错误基础判断
- 不支持浏览器的降级提示

### 4.2 `feature/pronunciation-assessment`

- Azure Speech 或其他专业评测服务
- 准确度、流利度、完整度和韵律评分
- 单词/音节/音素反馈
- 低分词自动进入复习队列

## 阶段 5：Obsidian 与桌面体验

### 5.1 `feature/obsidian-templates`

- 可配置每日笔记、周报和周故事模板
- 文件名与目录规则
- 重复笔记检测

### 5.2 `feature/obsidian-uri`

- Obsidian URI 打开或创建笔记
- 同步状态和失败重试
- 手动导出保留为降级方案

### 5.3 `feature/tauri-desktop`

- Tauri Windows 桌面应用
- 用户授权 Vault 路径
- 安全本地写入、备份和恢复

## 版本里程碑

- **v0.2 本地完善版**：完成阶段 0—1
- **v0.5 云端 AI 版**：完成阶段 2—3
- **v0.8 语音增强版**：完成阶段 4
- **v1.0 正式版**：完成阶段 5，并完成性能、安全和稳定性验收
