import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSyncQueue,
  enqueueSync,
  getDeviceId,
  loadAccountSession,
  readSyncQueue,
  saveAccountSession,
} from './sync'
import { makeState } from '../test/factories'

describe('client sync persistence', () => {
  beforeEach(() => localStorage.clear())
  it('keeps a stable device id and account session', () => {
    expect(getDeviceId()).toBe(getDeviceId())
    const session = {
      token: 'token',
      expiresAt: '2026-08-01T00:00:00Z',
      revision: 3,
      user: { id: '1', email: 'mia@example.com', displayName: 'Mia' },
    }
    saveAccountSession(session)
    expect(loadAccountSession()).toEqual(session)
    saveAccountSession(null)
    expect(loadAccountSession()).toBeNull()
  })
  it('coalesces offline changes into the latest queue item', () => {
    enqueueSync(makeState({ streak: 2 }), 1, '2026-07-13T01:00:00Z')
    enqueueSync(makeState({ streak: 3 }), 1, '2026-07-13T02:00:00Z')
    expect(readSyncQueue()).toHaveLength(1)
    expect(readSyncQueue()[0].state.streak).toBe(3)
    clearSyncQueue()
    expect(readSyncQueue()).toEqual([])
  })
})
