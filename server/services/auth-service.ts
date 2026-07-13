import type { PrismaClient } from '../generated/prisma/client.js'
import { hashPassword, verifyPassword } from '../security/password.js'
import { createSessionToken, hashSessionToken } from '../security/tokens.js'
import { ApiError } from './api-error.js'
import type { AuthResult, AuthService, AuthUser } from './contracts.js'

const SESSION_DAYS = 30
const normalizeEmail = (email: string) => email.trim().toLowerCase()
const publicUser = (user: { id: string; email: string; displayName: string }): AuthUser => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
})

export class PrismaAuthService implements AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(input: {
    email: string
    password: string
    displayName: string
    deviceId: string
    userAgent?: string
  }): Promise<AuthResult> {
    const email = normalizeEmail(input.email)
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', '??????')
    const passwordHash = await hashPassword(input.password)
    const user = await this.prisma.user.create({
      data: { email, passwordHash, displayName: input.displayName.trim() || '???' },
    })
    return this.createSession(user, input.deviceId, input.userAgent)
  }

  async login(input: {
    email: string
    password: string
    deviceId: string
    userAgent?: string
  }): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(input.email) },
    })
    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', '???????')
    }
    return this.createSession(user, input.deviceId, input.userAgent)
  }

  async authenticate(token: string) {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    })
    if (!session || session.revokedAt || session.expiresAt <= new Date())
      throw new ApiError(401, 'AUTH_REQUIRED', '???????????')
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })
    return publicUser(session.user)
  }

  async logout(token: string) {
    await this.prisma.authSession.updateMany({
      where: { tokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  private async createSession(
    user: { id: string; email: string; displayName: string },
    deviceId: string,
    userAgent?: string,
  ) {
    const token = createSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
    await this.prisma.authSession.create({
      data: { userId: user.id, tokenHash: hashSessionToken(token), deviceId, userAgent, expiresAt },
    })
    return { token, expiresAt: expiresAt.toISOString(), user: publicUser(user) }
  }
}
