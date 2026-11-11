import type { QueryClient } from '@tanstack/react-query'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { clubPlayerKeys } from '../club-player/queryKeys'
import { MockError } from '../mock/errors'
import type { PlayingLevel } from '../player/player.types'
import { queueSessionKeys } from '../queue-session/queryKeys'
import { slotCapacity } from '../queue-session/queueSession.rules'
import type { QueueSession } from '../queue-session/queueSession.types'
import { accepted } from '../real/queue'
import type { SaveOutcome } from '../sync/sync.types'
import type {
  AddDirectoryPlayerInput,
  AddNewPlayerInput,
  AddSavedPlayerInput,
  RosterAddPlacement,
} from './mutations'
import { sessionRosterKeys } from './queryKeys'
import {
  getRosterBatch,
  type RosterPlacementPreview,
  type RosterRead,
  readRosterView,
} from './rosterBatch'
import { levelLabel, ROSTER_DUPLICATE_ERROR, shortName } from './sessionRoster.rules'
import type { DirectoryPlayer, SessionJoinRequest } from './sessionRoster.types'

/**
 * Turns one tap into a pending roster operation (#718): checks what the screen already knows,
 * lays the change over the roster at once and answers with the same outcome and toast text the
 * single-op commands used, so the Queue screens need no change. The server's answer comes with the
 * burst; a refused burst rolls these rows back with one error toast.
 */

export type Enqueued<Data> = { sessionId: string; outcome: SaveOutcome & { data: Data } }
export type Placed = { waitlistPosition: number; locked: boolean; clubPlayerId: string }

const EMPTY: RosterRead = { roster: [], waitlist: [], joinRequests: [] }
const DECIDED = 'This join request has already been decided.'

function sessionInfo(client: QueryClient, sessionId: string) {
  const session = client.getQueryData<QueueSession & { courts?: unknown[] }>(
    queueSessionKeys.detail(sessionId),
  )
  return {
    live: session?.state === 'active',
    capacity: session?.courts ? slotCapacity(session.courts.length, session.playersPerCourt) : null,
  }
}

/**
 * Slot or waitlist, as the mock and the server decide it: before start, a full roster waits, unless
 * the Queue Master chose Add anyway (`allowOverfill`, #735); Add to waitlist always waits.
 */
function placement(
  client: QueryClient,
  sessionId: string,
  forceWaitlist = false,
  allowOverfill = false,
) {
  const view = readRosterView(client, sessionId) ?? EMPTY
  const { live, capacity } = sessionInfo(client, sessionId)
  const toWaitlist =
    forceWaitlist || (!allowOverfill && !live && capacity != null && view.roster.length >= capacity)
  return { view, live, toWaitlist, position: toWaitlist ? view.waitlist.length + 1 : 0 }
}

/** Only the flags that are set, so an ordinary add sends exactly what it did before #735. */
const placementFlags = ({ allowOverfill, toWaitlist }: RosterAddPlacement) => ({
  ...(allowOverfill ? { allowOverfill: true } : {}),
  ...(toWaitlist ? { toWaitlist: true } : {}),
})

const firstName = (player: { fullName: string; nickname: string | null }) =>
  player.nickname || player.fullName.split(' ')[0] || player.fullName

function savedPlayer(client: QueryClient, clubPlayerId: string) {
  for (const [, data] of client.getQueriesData<{ players?: ClubPlayer[] }>({
    queryKey: clubPlayerKeys.all,
  })) {
    const player = data?.players?.find((p) => p.id === clubPlayerId)
    if (player) return player
  }
  return undefined
}

function savedPlayerForProfile(client: QueryClient, playerId: string) {
  for (const [, data] of client.getQueriesData<{ players?: ClubPlayer[] }>({
    queryKey: clubPlayerKeys.all,
  })) {
    const player = data?.players?.find((p) => p.playerId === playerId && !p.removedAt)
    if (player) return player
  }
  return undefined
}

function directoryPlayer(client: QueryClient, playerId: string) {
  for (const [, data] of client.getQueriesData<DirectoryPlayer[]>({
    queryKey: sessionRosterKeys.all,
  })) {
    const player = Array.isArray(data) ? data.find((p) => p.id === playerId) : undefined
    if (player) return player
  }
  return undefined
}

function preview(
  input: {
    clubPlayerId: string
    nameSnapshot: string
    nicknameSnapshot: string | null
    level: PlayingLevel
  },
  place: { live: boolean; toWaitlist: boolean },
): RosterPlacementPreview {
  return {
    rosterId: crypto.randomUUID(),
    ...input,
    toWaitlist: place.toWaitlist,
    live: place.live,
    at: Date.now(),
  }
}

const placed = (
  place: { live: boolean; toWaitlist: boolean; position: number },
  clubPlayerId: string,
): Placed => ({ waitlistPosition: place.position, locked: place.live, clubPlayerId })

function inSession(view: RosterRead, clubPlayerId: string) {
  return (
    view.roster.some((r) => r.clubPlayerId === clubPlayerId) ||
    view.waitlist.some((w) => w.clubPlayerId === clubPlayerId)
  )
}

export function enqueueAddSavedPlayer(
  client: QueryClient,
  input: AddSavedPlayerInput,
): Enqueued<Placed> {
  const place = placement(client, input.sessionId, input.toWaitlist, input.allowOverfill)
  // A duplicate is a conflict: the Add player sheet drops the pick and returns to the list.
  if (inSession(place.view, input.clubPlayerId))
    throw new MockError('conflict', ROSTER_DUPLICATE_ERROR)
  const player = savedPlayer(client, input.clubPlayerId)
  const name = player ? firstName(player) : 'Player'
  const shared = getRosterBatch(client, input.sessionId)
  shared.enqueue({
    operation: {
      op: 'add',
      operationId: crypto.randomUUID(),
      source: 'saved',
      ...placementFlags(input),
      clubPlayerId: input.clubPlayerId,
      level: input.level,
      identityCheck: input.identityCheck,
    },
    preview: preview(
      {
        clubPlayerId: input.clubPlayerId,
        nameSnapshot: player?.fullName ?? name,
        nicknameSnapshot: player?.nickname ?? null,
        level: input.level,
      },
      place,
    ),
  })
  return {
    sessionId: input.sessionId,
    outcome: accepted(
      placed(place, input.clubPlayerId),
      place.toWaitlist
        ? `${name} added to the waitlist as #${place.position} · ${levelLabel(input.level)}`
        : `${name} added · ${levelLabel(input.level)}${place.live ? ' · level locked' : ''}`,
    ),
  }
}

export function enqueueAddDirectoryPlayer(
  client: QueryClient,
  input: AddDirectoryPlayerInput,
): Enqueued<Placed> {
  const place = placement(client, input.sessionId, input.toWaitlist, input.allowOverfill)
  const shared = getRosterBatch(client, input.sessionId)
  const saved = savedPlayerForProfile(client, input.playerId)
  if (
    (saved && inSession(place.view, saved.id)) ||
    shared
      .pendingOps()
      .some(
        ({ operation }) =>
          operation.op === 'add' &&
          operation.source === 'directory' &&
          operation.playerId === input.playerId,
      )
  )
    throw new MockError('conflict', ROSTER_DUPLICATE_ERROR)
  const profile = directoryPlayer(client, input.playerId)
  const fullName = saved?.fullName ?? profile?.fullName ?? 'Player'
  const nickname = saved?.nickname ?? profile?.nickname ?? null
  // The club's saved player is only known once the server saves them; a temporary id until then.
  const clubPlayerId = saved?.id ?? crypto.randomUUID()
  shared.enqueue({
    operation: {
      op: 'add',
      operationId: crypto.randomUUID(),
      source: 'directory',
      ...placementFlags(input),
      playerId: input.playerId,
      level: input.level,
      identityCheck: input.identityCheck,
    },
    preview: preview(
      { clubPlayerId, nameSnapshot: fullName, nicknameSnapshot: nickname, level: input.level },
      place,
    ),
  })
  const name = firstName({ fullName, nickname })
  return {
    sessionId: input.sessionId,
    outcome: accepted(
      placed(place, clubPlayerId),
      `${name} added${place.toWaitlist ? ` to the waitlist as #${place.position}` : ''} · ${levelLabel(input.level)}${!place.toWaitlist && place.live ? ' · level locked' : ''}`,
    ),
  }
}

export function enqueueAddNewPlayer(
  client: QueryClient,
  input: AddNewPlayerInput,
): Enqueued<Placed> {
  const name = input.name.trim()
  if (!name) throw new MockError('permission', 'Enter your name.')
  const place = placement(client, input.sessionId, input.toWaitlist, input.allowOverfill)
  const clubPlayerId = crypto.randomUUID()
  getRosterBatch(client, input.sessionId).enqueue({
    operation: {
      op: 'add',
      operationId: crypto.randomUUID(),
      source: 'new',
      ...placementFlags(input),
      name,
      nickname: input.nickname?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      level: input.level,
    },
    preview: preview(
      {
        clubPlayerId,
        nameSnapshot: name,
        nicknameSnapshot: input.nickname?.trim() || null,
        level: input.level,
      },
      place,
    ),
  })
  return {
    sessionId: input.sessionId,
    outcome: accepted(
      placed(place, clubPlayerId),
      place.toWaitlist
        ? `${name} added to the waitlist as #${place.position}`
        : input.phone?.trim()
          ? `${name} added · profile lookup after sync`
          : `${name} added as a guest`,
    ),
  }
}

export function enqueueRemoveRosterPlayer(
  client: QueryClient,
  input: { sessionId: string; rosterId: string },
): Enqueued<null> {
  const view = readRosterView(client, input.sessionId) ?? EMPTY
  const row = view.roster.find((r) => r.id === input.rosterId)
  if (!row) throw new MockError('permission', 'Player not available.')
  getRosterBatch(client, input.sessionId).remove({
    operation: { op: 'remove', operationId: crypto.randomUUID(), rosterId: input.rosterId },
  })
  return {
    sessionId: input.sessionId,
    outcome: accepted(null, `${shortName(row)} removed from the roster`),
  }
}

/** The pending request as the screens see it now, across every roster read in the cache. */
function pendingRequest(client: QueryClient, requestId: string): SessionJoinRequest {
  for (const [key] of client.getQueriesData<RosterRead>({ queryKey: sessionRosterKeys.all })) {
    const sessionId = key[1] === 'list' ? key[2] : undefined
    if (typeof sessionId !== 'string') continue
    const request = readRosterView(client, sessionId)?.joinRequests.find((r) => r.id === requestId)
    if (request) {
      if (request.status !== 'pending') throw new MockError('conflict', DECIDED)
      return request
    }
  }
  throw new MockError('conflict', DECIDED)
}

export function enqueueAcceptRequest(
  client: QueryClient,
  input: { requestId: string; level: PlayingLevel },
): Enqueued<Placed> {
  const request = pendingRequest(client, input.requestId)
  const fromWaitlist = request.placement === 'from_waitlist'
  const place = placement(client, request.sessionId, request.placement === 'waitlist')
  // Join from waitlist gives the slot (or is refused by the server); it never re-waitlists.
  if (fromWaitlist) Object.assign(place, { toWaitlist: false, position: 0 })
  const clubPlayerId = request.clubPlayerId ?? request.linkedClubPlayerId ?? crypto.randomUUID()
  getRosterBatch(client, request.sessionId).enqueue({
    operation: {
      op: 'acceptRequest',
      operationId: crypto.randomUUID(),
      requestId: request.id,
      level: input.level,
    },
    preview: preview(
      {
        clubPlayerId,
        nameSnapshot: request.name,
        nicknameSnapshot: request.nickname,
        level: input.level,
      },
      place,
    ),
  })
  return {
    sessionId: request.sessionId,
    outcome: accepted(
      placed(place, clubPlayerId),
      fromWaitlist
        ? `${request.name} got a slot from the waitlist · ${levelLabel(input.level)}`
        : `${request.name} confirmed from a join request · ${place.toWaitlist ? `waitlist #${place.position}` : levelLabel(input.level)}`,
    ),
  }
}

export function enqueueDeclineRequest(client: QueryClient, requestId: string): Enqueued<null> {
  const request = pendingRequest(client, requestId)
  getRosterBatch(client, request.sessionId).enqueue({
    operation: { op: 'declineRequest', operationId: crypto.randomUUID(), requestId: request.id },
  })
  return {
    sessionId: request.sessionId,
    outcome: accepted(null, `${request.name}'s join request declined`),
  }
}
