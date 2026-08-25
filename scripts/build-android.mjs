import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultToolsRoot = resolve(root, '..', 'Android')
const toolsRoot = process.env.WORDQUEST_ANDROID_TOOLS || defaultToolsRoot
const sdkRoot = process.env.ANDROID_HOME || resolve(toolsRoot, 'Sdk')
const bundledJava = resolve(toolsRoot, 'android-studio', 'jbr')
const javaHome = process.env.JAVA_HOME || bundledJava
const gradleHome = process.env.GRADLE_USER_HOME || resolve(toolsRoot, 'Gradle')

if (!existsSync(resolve(sdkRoot, 'platforms', 'android-36'))) {
  throw new Error(`Android SDK 36 was not found at ${sdkRoot}`)
}
if (!existsSync(resolve(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))) {
  throw new Error(`A compatible Java runtime was not found at ${javaHome}`)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: {
      ...process.env,
      JAVA_HOME: javaHome,
      ANDROID_HOME: sdkRoot,
      ANDROID_SDK_ROOT: sdkRoot,
      GRADLE_USER_HOME: gradleHome,
    },
    stdio: 'inherit',
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (process.env.npm_execpath) {
  run(process.execPath, [process.env.npm_execpath, 'android:sync'])
} else {
  run(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['android:sync'], {
    shell: process.platform === 'win32',
  })
}

const gradleWrapper = resolve(
  root,
  'android',
  process.platform === 'win32' ? 'gradlew.bat' : 'gradlew',
)
if (process.platform === 'win32') {
  run(process.env.ComSpec || 'cmd.exe', [
    '/d',
    '/s',
    '/c',
    'android\\gradlew.bat -p android assembleDebug --no-daemon',
  ])
} else {
  run(gradleWrapper, ['-p', 'android', 'assembleDebug', '--no-daemon'])
}

const source = resolve(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const output = resolve(root, 'outputs', 'wordquest-debug.apk')
mkdirSync(dirname(output), { recursive: true })
copyFileSync(source, output)

const hash = createHash('sha256').update(readFileSync(output)).digest('hex')
console.log(`APK: ${output}`)
console.log(`Size: ${(statSync(output).size / 1024 / 1024).toFixed(2)} MB`)
console.log(`SHA-256: ${hash}`)
