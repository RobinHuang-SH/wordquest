import { Capacitor } from '@capacitor/core'

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim()
const localDevelopmentBase = Capacitor.isNativePlatform() ? '' : 'http://localhost:3001'

export const API_BASE = (configuredBase || localDevelopmentBase).replace(/\/$/, '')

export function apiUrl(path: string) {
  if (!API_BASE) {
    throw new Error('手机端服务器尚未配置，当前可继续使用本地学习功能')
  }
  return `${API_BASE}${path}`
}
