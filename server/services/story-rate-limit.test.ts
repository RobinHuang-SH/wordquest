// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SlidingWindowRateLimiter } from './story-service.js'

describe('story generation rate limiter', () => {
  it('limits each user independently and resets after the window', () => {
    let now = 1000
    const limiter = new SlidingWindowRateLimiter(2, 60_000, () => now)
    expect(limiter.tryConsume('user-1')).toBe(true)
    expect(limiter.tryConsume('user-1')).toBe(true)
    expect(limiter.tryConsume('user-1')).toBe(false)
    expect(limiter.tryConsume('user-2')).toBe(true)
    now += 60_001
    expect(limiter.tryConsume('user-1')).toBe(true)
  })
})
