import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

export async function hashPassword(password: string) {
  if (password.length < 8) throw new Error('Password must contain at least 8 characters')
  const salt = randomBytes(16).toString('hex')
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return `scrypt$${salt}$${derived.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expectedHex] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false
  const expected = Buffer.from(expectedHex, 'hex')
  if (expected.length !== KEY_LENGTH) return false
  const actual = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return timingSafeEqual(actual, expected)
}
