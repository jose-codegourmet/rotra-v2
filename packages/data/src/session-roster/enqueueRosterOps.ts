import { socialLinkAlreadySaved } from '@rotra/schema/social-link'
import type { QueryClient } from '@tanstack/react-query'
import { savedPlayerName } from '../club-player/clubNickname.rules'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { clubEmailWords, emailAlreadySaved, planClubEmail } from '../club-player/email'
import { OWN_NAME_ERROR } from '../club-player/mutations'
import { clubPlayerKeys } from '../club-player/queryKeys'
import { clubSocialWords, planClubSocial, savedRecordForSocial } from '../club-player/socialLink'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { MockError } from '../mock/errors'
import { readMockState } from '../mock/store'
import type { PlayingLevel } from '../player/player.types'
import { peekMockRtrId, savedDisplayName, savedRecordByEmail } from '../player/unclaimed'
import { queueSessionKeys } from '../queue-session/queryKeys'
import { slotCapacity } from '../queue-session/queueSession.rules'
import type { QueueSession } from '../queue-session/queueSession.types'
import { isRealDataMode } from '../real/mode'
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
import { levelLabel, queueMasterName, ROSTER_DUPLICATE_ERROR } from './sessionRoster.rules'
import type { DirectoryPlayer, PlayerLookup, SessionJoinRequest } from './sessionRoster.types'

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

/** The Player lookup result on screen: the list form (`usePlayerDirectorySearch`) or `usePlayerLookup`'s. */
function directoryPlayer(client: QueryClient, playerId: string) {
  for (const [, data] of client.getQueriesData<DirectoryPlayer[] | PlayerLookup>({
    queryKey: sessionRosterKeys.all,
  })) {
    const player = Array.isArray(data)
      ? data.find((p) => p.id === playerId)
      : data && 'savedName' in data && data.player?.id === playerId
        ? data.player
        : undefined
    if (player) return player
  }
  return undefined
}

/**
 * New player with an email, checked as the tap happens (the burst is saved later): a malformed
 * email and an email that is already one of the club's saved players are refused on the form, and
 * the words for the toast say what the email will do. Mock mode reads the mock store; real mode
 * does not look emails up yet (D-2026-11-16-04 is not built there), so the player is added as the
 * server saves them today: a guest.
 */
function newPlayerEmailWords(email: string | undefined, socialLink?: string): string | null {
  if ((!email?.trim() && !socialLink?.trim()) || isRealDataMode()) return null
  const s = readMockState()
  // #1019: a social link is checked first and decides who they are.
  const social = planClubSocial(s, socialLink)
  if (social.kind !== 'none') {
    const sameLink = savedRecordForSocial(s, DEMO_CLUB_ID, social)
    if (sameLink) {
      const text = socialLinkAlreadySaved(savedDisplayName(s, sameLink))
      throw new MockError('permission', text, { socialLink: text })
    }
    planClubEmail(s, email)
    if (social.kind !== 'new') return clubSocialWords(social)
    const place = s.clubs.find((c) => c.id === DEMO_CLUB_ID)?.locationCode
    return clubSocialWords(social, place ? peekMockRtrId(s, place) : undefined)
  }
  const plan = planClubEmail(s, email)
  if (plan.kind === 'guest') return null
  const same = savedRecordByEmail(s, DEMO_CLUB_ID, plan.email)
  if (same) {
    const text = emailAlreadySaved(savedDisplayName(s, same))
    throw new MockError('permission', text, { email: text })
  }
  if (plan.kind !== 'new') return clubEmailWords(plan)
  // The RTR ID the save will give, read ahead: the club's founding city and today. Two new emails
  // in one burst would read the same one here; the saved players then show the ones really given.
  const place = s.clubs.find((c) => c.id === DEMO_CLUB_ID)?.locationCode
  return clubEmailWords(plan, place ? peekMockRtrId(s, place) : undefined)
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
  const name = player ? savedPlayerName(player) : 'Player'
  const shared = getRosterBatch(client, input.sessionId)
  shared.enqueue({
    operation: {
      op: 'add',
      operationId: crypto.randomUUID(),
      source: 'saved',
      ...placementFlags(input),
      clubPlayerId: input.clubPlayerId,
      level: input.level,
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
  // Another club's unclaimed player is saved under this club's own name for them.
  const ownName = input.name?.trim()
  if (!saved && profile?.ownNameRequired && !ownName)
    throw new MockError('permission', OWN_NAME_ERROR, { name: OWN_NAME_ERROR })
  const fullName = saved?.fullName ?? (profile?.fullName || ownName || 'Player')
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
      ...(ownName ? { name: ownName } : {}),
      level: input.level,
    },
    preview: preview(
      { clubPlayerId, nameSnapshot: fullName, nicknameSnapshot: nickname, level: input.level },
      place,
    ),
  })
  const name = saved
    ? savedPlayerName(saved)
    : queueMasterName({ nameSnapshot: fullName, nicknameSnapshot: nickname })
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
  const email = input.email?.trim() || undefined
  const socialLink = input.socialLink?.trim() || undefined
  const emailWords = newPlayerEmailWords(email, socialLink)
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
      ...(email ? { email } : {}),
      ...(socialLink ? { socialLink } : {}),
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
        : emailWords
          ? `${name} added · ${emailWords}`
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
    outcome: accepted(null, `${queueMasterName(row)} removed from the roster`),
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
  const clubPlayerId = request.clubPlayerId ?? crypto.randomUUID()
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
