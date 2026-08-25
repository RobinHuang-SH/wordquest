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
  const position = (state: JsonRecord) =>
    `${typeof state.activeDate === 'string' ? state.activeDate : ''}#${String(
      typeof state.activeBatch === 'number' ? state.activeBatch : 1,
    ).padStart(6, '0')}`
  const serverPosition = position(serverState)
  const incomingPosition = position(incomingState)
  const sameBatch = serverPosition === incomingPosition
  const activeState = incomingPosition > serverPosition ? incomingState : serverState
  merged.learned = sameBatch
    ? mergeLearned(serverState.learned, incomingState.learned)
    : activeState.learned
  merged.sessions = mergeSessions(serverState.sessions, incomingState.sessions)
  for (const key of ['streak']) {
    const a = typeof serverState[key] === 'number' ? serverState[key] : 0
    const b = typeof incomingState[key] === 'number' ? incomingState[key] : 0
    merged[key] = Math.max(a, b)
  }
  if (!sameBatch) {
    for (const key of [
      'activeDate',
      'activeBatch',
      'currentWord',
      'quizAnswers',
      'quizDone',
      'storyChoice',
      'completed',
      'dailyWordPlan',
      'dailyStory',
    ])
      merged[key] = activeState[key]
  } else {
    const a = typeof serverState.currentWord === 'number' ? serverState.currentWord : 0
    const b = typeof incomingState.currentWord === 'number' ? incomingState.currentWord : 0
    merged.currentWord = Math.max(a, b)
    merged.completed = Boolean(serverState.completed || incomingState.completed)
  }
  merged.schemaVersion = Math.max(
    typeof serverState.schemaVersion === 'number' ? serverState.schemaVersion : 0,
    typeof incomingState.schemaVersion === 'number' ? incomingState.schemaVersion : 0,
  )
  const extraDates = [serverState.extraStudyUsedOn, incomingState.extraStudyUsedOn].filter(
    (value): value is string => typeof value === 'string',
  )
  merged.extraStudyUsedOn = extraDates.sort().at(-1) ?? null
  return merged
}
