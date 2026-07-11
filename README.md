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
- PWA manifest、Service Worker 与响应式移动布局

## 技术栈

React 19 + TypeScript + Vite + Lucide Icons。当前 MVP 为本地优先前端版本，不需要数据库或 API Key。

## 本地运行

```powershell
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:5173/`。

## 生产构建

```powershell
pnpm build
pnpm preview
```

生产文件输出至 `dist/`。

## 数据说明

- 学习状态保存在浏览器 `localStorage` 的 `wordquest-state` 中。
- 录音只生成浏览器会话内的本地 Blob URL，不上传服务器。
- TTS 使用浏览器 `SpeechSynthesis`，可用声音取决于操作系统和浏览器。
- Obsidian 第一版采用 Markdown 下载；下载后放入 Vault 即可。

## 下一步接入建议

1. 增加后端账户、跨设备同步和 PostgreSQL 数据模型。
2. 接入 LLM 服务端工作流，完成动态选词、故事生成、越界词检测与重写。
3. 接入 Azure Speech 等专业发音评测。
4. 增加 Obsidian URI / Tauri 桌面同步助手。
5. 将本地示例词库替换为可授权的 CET、雅思或高频词库。

## 开发路线与 Git 分支

项目的逐步完善计划见 `ROADMAP.md`。采用“一项优化一个分支”。已完成可编辑名字与学习偏好联动，下一阶段分支为：

```text
feature/session-history
```
