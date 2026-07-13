// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password.js'

describe('password security', () => {
  it('hashes with a random salt and verifies without storing plaintext', async () => {
    const first = await hashPassword('correct horse')
    const second = await hashPassword('correct horse')
    expect(first).not.toBe(second)
    expect(first).not.toContain('correct horse')
    await expect(verifyPassword('correct horse', first)).resolves.toBe(true)
    await expect(verifyPassword('wrong password', first)).resolves.toBe(false)
  })
  it('rejects short passwords', async () => {
    await expect(hashPassword('short')).rejects.toThrow(/8/)
  })
})
