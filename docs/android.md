# 词境英语 Android 构建

Android 应用使用 Capacitor 8，应用 ID 为 `com.wordquest.english`。网页端与 Android 端共用同一套 React 代码。

## 本机要求

- Node.js 22 或更高版本
- Android Studio 2025.2.1 或更高版本
- Android SDK Platform 36

首次打开 Android Studio 时，按提示安装推荐的 SDK 和 Java 环境即可。

## 构建调试 APK

```powershell
pnpm install
pnpm android:sync
pnpm android:open
```

在 Android Studio 中点击 **Build > Build APK(s)**。生成文件通常位于：

`android/app/build/outputs/apk/debug/app-debug.apk`

也可以在环境配置完成后运行：

```powershell
pnpm android:apk
```

命令会优先使用项目相邻 `Android` 目录中的 Android Studio、SDK 和 Gradle，并把结果复制到 `outputs/wordquest-debug.apk`。如果工具安装在其他位置，可通过 `WORDQUEST_ANDROID_TOOLS` 指定工具根目录。

## 连接服务器

不配置服务器时，Android 应用仍可使用本地学习、测试、故事和进度保存。账号同步、自适应词表和在线故事需要服务器。

部署服务器并启用 HTTPS 后，把 `.env.android.example` 复制为 `.env.android`，将 `VITE_API_BASE_URL` 改为实际的 HTTPS 地址（当前部署为 `https://123.56.18.77/wordquest`），然后重新运行 `pnpm android:sync`。

不要把密码、私钥或访问令牌写进 `.env.android`。

服务器端的大语言模型与个性化故事配置见 `docs/llm-story.md`。模型 API 密钥只放服务器的 `.env`，不能放进 Android 配置。
