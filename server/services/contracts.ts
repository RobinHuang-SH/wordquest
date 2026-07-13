export interface AuthUser {
  id: string
  email: string
  displayName: string
}

export interface AuthResult {
  token: string
  expiresAt: string
  user: AuthUser
}

export interface AuthService {
  register(input: {
    email: string
    password: string
    displayName: string
    deviceId: string
    userAgent?: string
  }): Promise<AuthResult>
  login(input: {
    email: string
    password: string
    deviceId: string
    userAgent?: string
  }): Promise<AuthResult>
  authenticate(token: string): Promise<AuthUser>
  logout(token: string): Promise<void>
}

export interface SyncSnapshot {
  revision: number
  state: unknown
  clientUpdatedAt: string
  sourceDeviceId: string
  conflict?: boolean
}

export interface SyncService {
  getState(userId: string): Promise<SyncSnapshot | null>
  updateState(
    userId: string,
    input: { deviceId: string; baseRevision: number; clientUpdatedAt: string; state: unknown },
  ): Promise<SyncSnapshot>
  listConflicts(userId: string): Promise<
    Array<{
      id: string
      deviceId: string
      baseRevision: number
      serverRevision: number
      resolutionStrategy: string
      createdAt: string
    }>
  >
}
