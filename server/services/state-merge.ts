type JsonRecord = Record<string, unknown>
const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const knowledgeRank: Record<string, number> = { new: 0, fuzzy: 1, know: 2 }

function mergeLearned(server: unknown, incoming: unknown) {
  const result: Record<string, string> = {}
  for (const source of [server, incoming]) {
    if (!isRecord(source)) continue
    for (const [word, status] of Object.entries(source)) {
      if (typeof status !== 'string') continue
      if (!(word in result) || (knowledgeRank[status] ?? -1) > (knowledgeRank[result[word]] ?? -1))
        result[word] = status
    }
  }
  return result
}

function mergeSessions(server: unknown, incoming: unknown) {
  const result: JsonRecord = { ...(isRecord(server) ? server : {}) }
  if (!isRecord(incoming)) return result
  for (const [date, session] of Object.entries(incoming)) {
    const current = result[date]
    const incomingTime =
      isRecord(session) && typeof session.completedAt === 'string'
        ? Date.parse(session.completedAt)
        : 0
    const currentTime =
      isRecord(current) && typeof current.completedAt === 'string'
        ? Date.parse(current.completedAt)
        : 0
    if (!current || incomingTime >= currentTime) result[date] = session
  }
  return result
}

export function mergeAppStates(
  serverState: unknown,
  incomingState: unknown,
  preferIncoming: boolean,
): unknown {
  if (!isRecord(serverState)) return incomingState
  if (!isRecord(incomingState)) return serverState
  const preferred = preferIncoming ? incomingState : serverState
  const merged: JsonRecord = { ...serverState, ...preferred }
  merged.learned = mergeLearned(serverState.learned, incomingState.learned)
  merged.sessions = mergeSessions(serverState.sessions, incomingState.sessions)
  for (const key of ['streak', 'currentWord']) {
    const a = typeof serverState[key] === 'number' ? serverState[key] : 0
    const b = typeof incomingState[key] === 'number' ? incomingState[key] : 0
    merged[key] = Math.max(a, b)
  }
  merged.completed = Boolean(serverState.completed || incomingState.completed)
  return merged
}
