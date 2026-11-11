type Flusher = () => Promise<void>
const pending = new Map<string, Set<Flusher>>()

/** Register only while work is pending; idle controllers/QueryClients are not retained globally. */
export function registerBatchFlusher(scope: string, flush: Flusher) {
  let group = pending.get(scope)
  if (!group) {
    group = new Set()
    pending.set(scope, group)
  }
  group.add(flush)
  return () => {
    group.delete(flush)
    if (!group.size) pending.delete(scope)
  }
}
export async function flushBatches(scope: string) {
  await Promise.all([...(pending.get(scope) ?? [])].map((flush) => flush()))
}
export const presenceScope = (sessionId: string) => `presence:${sessionId}`
export const flushSessionPresence = (sessionId: string) => flushBatches(presenceScope(sessionId))
/** The roster burst batch (#718): adds, removes and join-request decisions waiting to be sent. */
export const rosterScope = (sessionId: string) => `roster:${sessionId}`
export const flushSessionRoster = (sessionId: string) => flushBatches(rosterScope(sessionId))
/** Every pending batch of a session, in the order they must land: roster changes, then presence. */
export async function flushSessionBatches(sessionId: string) {
  await flushSessionRoster(sessionId)
  await flushSessionPresence(sessionId)
}
