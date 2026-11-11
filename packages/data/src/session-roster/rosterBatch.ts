import type { QueryClient } from '@tanstack/react-query'
import { createDebouncedBatch } from '../batch/debouncedBatch'
import { registerBatchFlusher, rosterScope } from '../batch/flushBatches'
import type { PlayingLevel } from '../player/player.types'
import { applyRosterBatch, type RosterBatchOutcome } from './applyRosterBatch'
import type { getSessionRoster } from './fetchers'
import { sessionRosterKeys } from './queryKeys'
import type {
  RosterBatchOperation,
  RosterBatchResult,
  SessionJoinRequest,
  SessionPlayer,
  SessionWaitlistEntry,
} from './sessionRoster.types'

export type RosterRead = Awaited<ReturnType<typeof getSessionRoster>>

/**
 * What the screens show for an add or an accepted request before the server replies: the row as
 * it will read, under a temporary roster id. `toWaitlist` is the client's own capacity call.
 */
export type RosterPlacementPreview = {
  rosterId: string
  clubPlayerId: string
  nameSnapshot: string
  nicknameSnapshot: string | null
  level: PlayingLevel
  toWaitlist: boolean
  live: boolean
  at: number
}

export type PendingRosterOp = {
  operation: RosterBatchOperation
  /** Set for `add` and `acceptRequest`; a remove or a decline only takes something away. */
  preview?: RosterPlacementPreview
}

export type RosterBatchCallbacks = {
  onSuccess?: (result: RosterBatchOutcome) => void
  /** One toast per failed burst, with the server's reason; the burst's rows are rolled back. */
  onError?: (error: unknown) => void
}

/** The batch key of one operation: one per player added, per row removed, per request decided. */
export function rosterOpKey(op: PendingRosterOp): string {
  const { operation } = op
  switch (operation.op) {
    case 'add':
      return `add:${op.preview?.rosterId ?? operation.operationId}`
    case 'remove':
      return `remove:${operation.rosterId}`
    case 'acceptRequest':
    case 'declineRequest':
      return `request:${operation.requestId}`
  }
}

/**
 * Accepted roster data with the burst's pending operations laid over it, in click order. A row an
 * operation already saved (`resolved`) or that a refetch already carries is not drawn twice, so the
 * overlay survives refetches and settles without a flicker.
 */
export function overlayRoster(
  sessionId: string,
  data: RosterRead,
  ops: PendingRosterOp[],
  resolved: ReadonlyMap<string, RosterBatchResult> = new Map(),
): RosterRead {
  let roster: SessionPlayer[] = data.roster
  let waitlist: SessionWaitlistEntry[] = data.waitlist
  let joinRequests: SessionJoinRequest[] = data.joinRequests
  const has = (clubPlayerId: string) =>
    roster.some((r) => r.clubPlayerId === clubPlayerId) ||
    waitlist.some((w) => w.clubPlayerId === clubPlayerId)
  const settled = (preview: RosterPlacementPreview) => {
    const saved = resolved.get(preview.rosterId)
    if (!saved) return false
    return (
      (saved.rosterId != null && roster.some((r) => r.id === saved.rosterId)) ||
      (saved.waitlistId != null && waitlist.some((w) => w.id === saved.waitlistId)) ||
      (saved.clubPlayerId != null && has(saved.clubPlayerId))
    )
  }
  const draw = (preview: RosterPlacementPreview) => {
    if (settled(preview) || has(preview.clubPlayerId)) return
    if (preview.toWaitlist)
      waitlist = [
        ...waitlist,
        {
          id: preview.rosterId,
          sessionId,
          clubPlayerId: preview.clubPlayerId,
          level: preview.level,
          addedAt: preview.at,
        },
      ]
    else
      roster = [
        ...roster,
        {
          id: preview.rosterId,
          sessionId,
          clubPlayerId: preview.clubPlayerId,
          nameSnapshot: preview.nameSnapshot,
          nicknameSnapshot: preview.nicknameSnapshot,
          present: preview.live,
          presentChangedAt: preview.live ? preview.at : null,
          level: preview.level,
          levelLockedAt: preview.live ? preview.at : null,
          confirmedAt: preview.at,
          hasPlayedAtClubBefore: false,
        },
      ]
  }
  const decide = (requestId: string, status: 'confirmed' | 'declined', at: number) => {
    joinRequests = joinRequests.map((r) =>
      r.id === requestId && r.status === 'pending' ? { ...r, status, decidedAt: at } : r,
    )
  }
  for (const op of ops) {
    const { operation, preview } = op
    switch (operation.op) {
      case 'add':
        if (preview) draw(preview)
        break
      case 'remove':
        roster = roster.filter((r) => r.id !== operation.rosterId)
        break
      case 'acceptRequest': {
        const request = joinRequests.find((r) => r.id === operation.requestId)
        if (preview) {
          // Join from waitlist: the player's own waitlist entry becomes the slot.
          if (request?.placement === 'from_waitlist')
            waitlist = waitlist.filter((w) => w.clubPlayerId !== preview.clubPlayerId)
          draw(preview)
        }
        decide(operation.requestId, 'confirmed', preview?.at ?? Date.now())
        break
      }
      case 'declineRequest':
        decide(operation.requestId, 'declined', Date.now())
        break
    }
  }
  return { ...data, roster, waitlist, joinRequests }
}

function createRosterBatch(client: QueryClient, sessionId: string) {
  const owner = { callbacks: {} as RosterBatchCallbacks }
  /** Temporary roster id → what the server saved for it, for removes of a row still settling. */
  const resolved = new Map<string, RosterBatchResult>()
  /**
   * An add whose value became null after it was sent is a remove tapped while the add was in
   * flight: the controller keeps it as "undo" intent, which goes to the saved row once known.
   */
  const undoOf = (key: string): PendingRosterOp | undefined => {
    if (!key.startsWith('add:')) return undefined
    const saved = resolved.get(key.slice('add:'.length))
    if (!saved?.rosterId) return undefined
    return {
      operation: {
        op: 'remove',
        operationId: `${saved.operationId}:undo`,
        rosterId: saved.rosterId,
      },
    }
  }
  const opsOf = (changes: { key: string; value: PendingRosterOp | null }[]) => {
    const ops: PendingRosterOp[] = []
    for (const { key, value } of changes) {
      const op = value ?? undoOf(key)
      if (op) ops.push(op)
    }
    return ops
  }
  const batch = createDebouncedBatch<string, PendingRosterOp | null>({
    delayMs: 800,
    async send(changes) {
      const callbacks = owner.callbacks
      try {
        const pending = opsOf(changes)
        const operations: RosterBatchOperation[] = []
        for (const { operation } of pending) {
          if (operation.op === 'remove') {
            // A remove of a row an earlier burst added goes to the saved row, or nowhere.
            const saved = resolved.get(operation.rosterId)
            if (saved) {
              if (saved.rosterId) operations.push({ ...operation, rosterId: saved.rosterId })
              continue
            }
          }
          operations.push(operation)
        }
        const result = await applyRosterBatch({ sessionId, operations })
        for (const op of pending) {
          const saved = result.data.results.find((r) => r.operationId === op.operation.operationId)
          if (op.preview && saved) resolved.set(op.preview.rosterId, saved)
        }
        if (result.data.roster)
          client.setQueryData(sessionRosterKeys.list(sessionId), result.data.roster)
        // Keep the overlay through refetches; accepted reads must be current before releasing it.
        await client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
        callbacks.onSuccess?.(result)
      } catch (error) {
        callbacks.onError?.(error)
        throw error
      }
    },
  })
  let unregister: (() => void) | undefined
  batch.subscribe(() => {
    if (batch.pendingKeys().size)
      unregister ??= registerBatchFlusher(rosterScope(sessionId), batch.flush)
    else {
      unregister?.()
      unregister = undefined
    }
  })
  /**
   * Pending operations in the order they will be sent: the burst in flight first, then the next.
   * Every pending key has an entry (the controller keeps entries through the flight), so a null
   * value is a cancelled add, never a missing key.
   */
  const pendingOps = () =>
    opsOf([...batch.pendingKeys()].map((key) => ({ key, value: batch.value(key, null) })))
  const enqueue = (op: PendingRosterOp) => {
    batch.set(rosterOpKey(op), op, null)
  }
  /**
   * Remove by roster id. A row this burst added and has not sent yet cancels out (nothing is sent
   * for that player); one already in flight is undone against the saved row; a saved row is
   * removed by the server.
   */
  const remove = (op: PendingRosterOp & { operation: { op: 'remove' } }) => {
    const addKey = `add:${op.operation.rosterId}`
    if (batch.pendingKeys().has(addKey)) {
      batch.set(addKey, null, null)
      return
    }
    enqueue(op)
  }
  return { batch, owner, resolved, pendingOps, enqueue, remove, sessionId }
}
export type RosterBatch = ReturnType<typeof createRosterBatch>

const byClient = new WeakMap<QueryClient, Map<string, RosterBatch>>()
/** Each QueryClient/session shares one burst batch between the roster, Add player and Requests. */
export function getRosterBatch(client: QueryClient, sessionId: string) {
  let sessions = byClient.get(client)
  if (!sessions) {
    sessions = new Map()
    byClient.set(client, sessions)
  }
  let shared = sessions.get(sessionId)
  if (!shared) {
    shared = createRosterBatch(client, sessionId)
    sessions.set(sessionId, shared)
  }
  return shared
}

/** The roster as the screens see it now: accepted data plus this session's pending burst. */
export function readRosterView(client: QueryClient, sessionId: string) {
  const data = client.getQueryData<RosterRead>(sessionRosterKeys.list(sessionId))
  if (!data) return undefined
  const shared = getRosterBatch(client, sessionId)
  return overlayRoster(sessionId, data, shared.pendingOps(), shared.resolved)
}
