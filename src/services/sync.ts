import type { AppState } from '../domain/models'

const AUTH_KEY = 'wordquest-auth'
const QUEUE_KEY = 'wordquest-sync-queue'
const DEVICE_KEY = 'wordquest-device-id'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')

export type AccountSession = {
  token: string
  expiresAt: string
  revision: number
  user: { id: string; email: string; displayName: string }
}
export type SyncSnapshot = {
  revision: number
  state: AppState
  clientUpdatedAt: string
  sourceDeviceId: string
  conflict?: boolean
}
type QueuedSync = { state: AppState; baseRevision: number; clientUpdatedAt: string }

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id =
      globalThis.crypto?.randomUUID?.() ||
      `device-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export function loadAccountSession(): AccountSession | null {
  try {
    const value = localStorage.getItem(AUTH_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}
export function saveAccountSession(session: AccountSession | null) {
  if (session) localStorage.setItem(AUTH_KEY, JSON.stringify(session))
  else localStorage.removeItem(AUTH_KEY)
}
export function enqueueSync(
  state: AppState,
  baseRevision: number,
  clientUpdatedAt = new Date().toISOString(),
) {
  const item: QueuedSync = { state, baseRevision, clientUpdatedAt }
  localStorage.setItem(QUEUE_KEY, JSON.stringify([item]))
}
export function readSyncQueue(): QueuedSync[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}
export function clearSyncQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    throw new Error(body?.error?.message || `???? (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function authenticate(
  mode: 'register' | 'login',
  input: { email: string; password: string; displayName: string },
) {
  const result = await request<Omit<AccountSession, 'revision'>>(`/api/v1/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify({ ...input, deviceId: getDeviceId() }),
  })
  const session: AccountSession = { ...result, revision: 0 }
  saveAccountSession(session)
  return session
}
export async function logoutAccount(session: AccountSession) {
  await request('/api/v1/auth/logout', { method: 'POST' }, session.token).catch(() => undefined)
  saveAccountSession(null)
  clearSyncQueue()
}
export async function pushState(
  session: AccountSession,
  state: AppState,
  importLocal = false,
  clientUpdatedAt = new Date().toISOString(),
) {
  return request<SyncSnapshot>(
    importLocal ? '/api/v1/sync/import' : '/api/v1/sync/state',
    {
      method: importLocal ? 'POST' : 'PUT',
      body: JSON.stringify({
        deviceId: getDeviceId(),
        baseRevision: session.revision,
        clientUpdatedAt,
        state,
      }),
    },
    session.token,
  )
}
export async function flushSyncQueue(session: AccountSession) {
  let current = session
  let latest: SyncSnapshot | null = null
  for (const item of readSyncQueue()) {
    latest = await pushState(
      { ...current, revision: item.baseRevision },
      item.state,
      false,
      item.clientUpdatedAt,
    )
    current = { ...current, revision: latest.revision }
  }
  clearSyncQueue()
  saveAccountSession(current)
  return { session: current, snapshot: latest }
}
