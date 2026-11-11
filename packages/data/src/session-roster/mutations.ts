import { phoneField } from '@rotra/schema/phone'
import { flushSessionBatches, flushSessionPresence } from '../batch/flushBatches'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { clubPlayerForProfile, createClubPlayer, directoryLevel } from '../club-player/mutations'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { directoryPlayers, leaderboardPlayers } from '../fixtures/players'
import { countedGames, gamesPlayed } from '../match/match.rules'
import { closeStaleMatchRequests } from '../match-request/matchRequest.rules'
import { requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { required } from '../mock/required'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation, sessionIn } from '../mock/transaction'
import { dispatch } from '../outbox/dispatch'
import { PLAYING_LEVELS, type PlayingLevel } from '../player/player.types'
import { isListedInDirectory } from '../player/visibility.rules'
import { promoteWaiter, recomputeMinimum } from '../queue-session/mutations'
import { slotCapacity } from '../queue-session/queueSession.rules'
import { isRealDataMode } from '../real/mode'
import {
  realAddDirectoryPlayerToSession,
  realPlayerDirectorySearch,
  realSetRosterLevel,
} from '../real/queue'
import {
  realConfirmJoinRequest,
  realDeclineJoinRequest,
  realRemoveRosterPlayer,
  realSetAcceptJoinRequests,
} from '../real/session-live'
import {
  inUnfinishedMatch,
  levelLabel,
  ROSTER_DUPLICATE_ERROR,
  shortName,
  stepDownBlockedText,
} from './sessionRoster.rules'
import type {
  DirectoryPlayer,
  JoinRequestPlacement,
  SessionJoinRequest,
} from './sessionRoster.types'

function fail(text: string): never {
  throw new MockError('permission', text)
}
function levelCheck(level: PlayingLevel) {
  if (!PLAYING_LEVELS.includes(level)) fail('Choose a level for this club before confirming.')
}
export const capacity = (s: MockState, id: string) =>
  slotCapacity(
    s.courts.filter((c) => c.sessionId === id && !c.removedAt).length,
    sessionIn(s, id).playersPerCourt,
  )
async function rosterMutation<T>(
  sessionId: string,
  change: (s: MockState) => { data: T; text: string },
) {
  // Pending roster and presence batches land first, so this command sees what the QM already did.
  await flushSessionBatches(sessionId)
  return queueMutation({ area: 'Roster', sessionId }, (s) => settleRoster(s, sessionId, change(s)))
}
/** What every roster write ends with: the calculated minimum and stale match requests. */
export function settleRoster<T>(s: MockState, sessionId: string, result: T) {
  recomputeMinimum(s, sessionId)
  // D-2026-11-09-05: a match request closes when anyone it names stops being present.
  closeStaleMatchRequests(s, sessionId)
  return result
}
/**
 * Where the Queue Master's add goes when the roster is full (#735, D-OVERFILL): `allowOverfill`
 * is **Add anyway** (a slot beyond the budget), `toWaitlist` is **Add to waitlist**. Neither keeps
 * the old rule: before start a full roster waits.
 */
export type RosterAddPlacement = { allowOverfill?: boolean; toWaitlist?: boolean }
/**
 * Gives a club player a slot, or a waitlist place once a prepared session is full. `toWaitlist`
 * (a Be waitlisted request, D-2026-11-11-02, or Add to waitlist) always gives the waitlist place,
 * even during play; `allowOverfill` (Add anyway, #735) gives the slot even when the roster is full.
 */
export function place(
  s: MockState,
  sessionId: string,
  p: ClubPlayer,
  level: PlayingLevel,
  addedAt = Date.now(),
  toWaitlist = false,
  allowOverfill = false,
) {
  levelCheck(level)
  const session = sessionIn(s, sessionId)
  const linked = s.clubPlayers
    .filter((x) => x.id === p.id || (p.playerId && x.playerId === p.playerId))
    .map((x) => x.id)
  if (
    s.roster.some((r) => r.sessionId === sessionId && linked.includes(r.clubPlayerId)) ||
    s.waitlist.some((w) => w.sessionId === sessionId && linked.includes(w.clubPlayerId))
  )
    // A duplicate is a conflict: the Add player sheet drops the pick and returns to the list.
    throw new MockError('conflict', ROSTER_DUPLICATE_ERROR)
  const full =
      toWaitlist ||
      (!allowOverfill &&
        session.state !== 'active' &&
        s.roster.filter((r) => r.sessionId === sessionId).length >= capacity(s, sessionId)),
    id = crypto.randomUUID()
  s.waitlist.push({ id, sessionId, clubPlayerId: p.id, level, addedAt })
  if (!full) promoteWaiter(s, required(s.waitlist.find((w) => w.id === id)), addedAt)
  const position = full
    ? s.waitlist
        .filter((w) => w.sessionId === sessionId)
        .sort((a, b) => a.addedAt - b.addedAt)
        .findIndex((w) => w.id === id) + 1
    : 0
  return { waitlistPosition: position, locked: session.state === 'active', clubPlayerId: p.id }
}
export type AddSavedPlayerInput = RosterAddPlacement & {
  sessionId: string
  clubPlayerId: string
  level: PlayingLevel
}
/**
 * The mock write of Add player › Saved players; the roster batch (#718) applies it in order. An
 * unclaimed profile is the club's own record, so no identity check applies (D-2026-11-11-03).
 */
export function addSavedPlayerChange(s: MockState, input: AddSavedPlayerInput) {
  const p = s.clubPlayers.find((p) => p.id === input.clubPlayerId && p.clubId === DEMO_CLUB_ID)
  if (!p || (p.playerId && s.adminPlayerRecords[p.playerId]?.archivedAt))
    fail('Player not available.')
  const data = place(
      s,
      input.sessionId,
      p,
      input.level,
      Date.now(),
      input.toWaitlist,
      input.allowOverfill,
    ),
    name = p.nickname || p.fullName.split(' ')[0]
  return {
    data,
    text: data.waitlistPosition
      ? `${name} added to the waitlist as #${data.waitlistPosition} · ${levelLabel(input.level)}`
      : `${name} added · ${levelLabel(input.level)}${data.locked ? ' · level locked' : ''}`,
  }
}
export async function addSavedPlayerToSession(input: AddSavedPlayerInput) {
  await flushSessionBatches(input.sessionId)
  return dispatch('roster.addSaved', input, () =>
    rosterMutation(input.sessionId, (s) => addSavedPlayerChange(s, input)),
  )
}
export async function playerDirectorySearch(q: string): Promise<DirectoryPlayer[]> {
  if (isRealDataMode()) return realPlayerDirectorySearch(q)
  await delay()
  requireOnline()
  const s = readMockState(),
    query = q.trim().toLowerCase()
  // Hide me from Player Information leaves a profile out of this search (name, nickname and RTR ID).
  return directoryPlayers
    .filter(
      (p) =>
        !s.adminPlayerRecords[p.id]?.archivedAt &&
        isListedInDirectory(s.playerProfiles.find((profile) => profile.playerId === p.id)),
    )
    .map((p, _i) => ({
      ...p,
      identity: 'registered' as const,
      picture: s.playerProfiles.find((profile) => profile.playerId === p.id)?.picture ?? null,
      suggestion: directoryLevel(p.id),
      rankLabel: `#${leaderboardPlayers.findIndex((entry) => entry.id === p.id) + 1}`,
    }))
    .filter(
      (p) =>
        !s.clubPlayers.some(
          (saved) =>
            saved.clubId === DEMO_CLUB_ID &&
            s.players.find((x) => x.id === saved.playerId)?.rtrId === p.rtrId,
        ) && [p.fullName, p.nickname, p.rtrId].some((v) => v?.toLowerCase().includes(query)),
    )
}
export type AddDirectoryPlayerInput = RosterAddPlacement & {
  sessionId: string
  playerId: string
  level: PlayingLevel
}
export function addDirectoryPlayerChange(s: MockState, input: AddDirectoryPlayerInput) {
  const p = clubPlayerForProfile(s, input.playerId).player
  const data = place(
    s,
    input.sessionId,
    p,
    input.level,
    Date.now(),
    input.toWaitlist,
    input.allowOverfill,
  )
  return {
    data,
    text: `${p.nickname || p.fullName.split(' ')[0]} added${data.waitlistPosition ? ` to the waitlist as #${data.waitlistPosition}` : ''} · ${levelLabel(input.level)}${!data.waitlistPosition && data.locked ? ' · level locked' : ''}`,
  }
}
export async function addDirectoryPlayerToSession(input: AddDirectoryPlayerInput) {
  if (isRealDataMode()) {
    await flushSessionBatches(input.sessionId)
    return realAddDirectoryPlayerToSession(input)
  }
  return rosterMutation(input.sessionId, (s) => addDirectoryPlayerChange(s, input))
}
export type AddNewPlayerInput = RosterAddPlacement & {
  sessionId: string
  name: string
  nickname?: string
  phone?: string
  level: PlayingLevel
}
export function addNewPlayerChange(s: MockState, input: AddNewPlayerInput) {
  const p = createClubPlayer(s, input),
    data = place(
      s,
      input.sessionId,
      p,
      input.level,
      Date.now(),
      input.toWaitlist,
      input.allowOverfill,
    )
  return {
    data,
    text: data.waitlistPosition
      ? `${p.fullName} added to the waitlist as #${data.waitlistPosition}`
      : p.identity === 'guest'
        ? `${p.fullName} added as a guest`
        : `${p.fullName} added · profile lookup after sync`,
  }
}
export async function addNewPlayerToSession(input: AddNewPlayerInput) {
  await flushSessionBatches(input.sessionId)
  return dispatch('roster.addNew', input, () =>
    rosterMutation(input.sessionId, (s) => addNewPlayerChange(s, input)),
  )
}
function row(s: MockState, id: string, sessionId: string) {
  const p = s.roster.find((p) => p.id === id && p.sessionId === sessionId)
  if (!p) fail('Player not available.')
  return p
}
export async function setRosterLevel(input: {
  sessionId: string
  rosterId: string
  level: PlayingLevel
}) {
  if (isRealDataMode()) {
    await flushSessionBatches(input.sessionId)
    return realSetRosterLevel(input)
  }
  return rosterMutation(input.sessionId, (s) => {
    const p = row(s, input.rosterId, input.sessionId)
    if (sessionIn(s, input.sessionId).state !== 'prepared' || p.levelLockedAt)
      fail('Levels are locked after the session starts.')
    levelCheck(input.level)
    p.level = input.level
    return { data: null, text: `${shortName(p)}: ${levelLabel(input.level)}` }
  })
}
export function removeRosterPlayerChange(
  s: MockState,
  input: { sessionId: string; rosterId: string },
) {
  if (sessionIn(s, input.sessionId).state !== 'prepared')
    fail('Only a prepared roster can remove players.')
  const p = row(s, input.rosterId, input.sessionId)
  s.roster = s.roster.filter((r) => r.id !== p.id)
  return { data: null, text: `${shortName(p)} removed from the roster` }
}
export function removeRosterPlayer(input: { sessionId: string; rosterId: string }) {
  if (isRealDataMode()) return realRemoveRosterPlayer(input)
  return rosterMutation(input.sessionId, (s) => removeRosterPlayerChange(s, input))
}
export type StepDownInput = { sessionId: string; rosterId: string; operationId?: string }
/**
 * Move to waitlist (#735): the admitted player goes to the **front** of the waitlist, before and
 * after Start. Their level rides on the waitlist entry and their paid mark (kept per club player)
 * stays, so both come back with a slot. Refused while they are in any waiting, On court or Playing
 * match. The mock leaderboard is built from the roster, so a stepped-down player's finished games
 * leave tonight's mock standings (the real app keeps them on the record).
 */
export function stepDownChange(s: MockState, input: StepDownInput, blocked?: string) {
  const session = sessionIn(s, input.sessionId)
  if (session.state !== 'prepared' && session.state !== 'active') fail('This session is closed.')
  const p = row(s, input.rosterId, input.sessionId)
  if (
    inUnfinishedMatch(
      p.id,
      s.matches.filter((m) => m.sessionId === input.sessionId),
    )
  )
    throw new MockError('conflict', blocked ?? stepDownBlockedText(shortName(p)))
  const waiting = s.waitlist.filter((w) => w.sessionId === input.sessionId)
  const front = Math.min(Date.now(), ...waiting.map((w) => w.addedAt)) - 1
  s.roster = s.roster.filter((r) => r.id !== p.id)
  s.waitlist.push({
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    clubPlayerId: p.clubPlayerId,
    level: p.level,
    addedAt: front,
  })
  return { data: null, text: `${p.nameSnapshot} moved to the waitlist` }
}
export async function stepDownToWaitlist(input: StepDownInput) {
  await flushSessionBatches(input.sessionId)
  return dispatch('roster.stepDown', input, () =>
    rosterMutation(input.sessionId, (s) => stepDownChange(s, input)),
  )
}
export async function setPresence(input: {
  sessionId: string
  rosterId: string
  present: boolean
}) {
  // Pending batches land first, before the one door: an offline apply never nests another.
  await flushSessionBatches(input.sessionId)
  return dispatch('roster.presence', input, () =>
    rosterMutation(input.sessionId, (s) => {
      const p = row(s, input.rosterId, input.sessionId)
      p.present = input.present
      p.presentChangedAt = Date.now()
      const n = input.present
        ? 0
        : s.matches.filter(
            (m) =>
              m.sessionId === input.sessionId &&
              m.state === 'waiting' &&
              [...m.teamA, ...m.teamB].includes(p.id),
          ).length
      return {
        data: null,
        text: `${shortName(p)} is ${input.present ? '' : 'not '}present${n ? ` · ${n} waiting match${n === 1 ? ' needs' : 'es need'} attention` : ''}`,
      }
    }),
  )
}
/** One atomic Roster command: wanted end states, unique attention count, one sync entry. */
export function setPresenceMany(input: {
  sessionId: string
  changes: { rosterId: string; present: boolean }[]
}) {
  if (!input.changes.length)
    return Promise.resolve({ data: null, savedOffline: false, message: 'No presence changes' })
  // Do not call rosterMutation here: its preflight flush would wait for this same batch.
  return dispatch('roster.presenceMany', input, () =>
    queueMutation({ area: 'Roster', sessionId: input.sessionId }, (s) => {
      const changes = new Map(input.changes.map((change) => [change.rosterId, change.present]))
      const away = new Set<string>()
      let present = 0
      for (const [id, wanted] of changes) {
        if (typeof wanted !== 'boolean') fail('Choose a presence state.')
        const player = row(s, id, input.sessionId)
        player.present = wanted
        player.presentChangedAt = Date.now()
        if (wanted) present++
        else away.add(id)
      }
      const n = s.matches.filter(
        (m) =>
          m.sessionId === input.sessionId &&
          m.state === 'waiting' &&
          [...m.teamA, ...m.teamB].some((id) => away.has(id)),
      ).length
      const absent = changes.size - present
      closeStaleMatchRequests(s, input.sessionId)
      const text =
        present && absent
          ? `${present} player${present === 1 ? '' : 's'} marked present, ${absent} away`
          : `${changes.size} player${changes.size === 1 ? '' : 's'} marked ${present ? 'present' : 'away'}`
      return {
        data: null,
        text: text + (n ? ` · ${n} waiting match${n === 1 ? ' needs' : 'es need'} attention` : ''),
      }
    }),
  )
}
export const GAMES_PLAYED_MAX = 99
export type SetGamesPlayedInput = {
  sessionId: string
  /** One roster entry, or `'all'` for every roster player (Set games for all…) */
  rosterId: string | 'all'
  /** The games played count to show, 0–99 */
  games: number
  operationId?: string
}
/**
 * Set games played (#717, D-SET-GAMES): stores `gamesAdjustment = games − counted` on each target
 * roster row, so the shown count equals `games` now and keeps counting up with later matches.
 * Live sessions only. One Roster sync entry; offline on a downloaded session it saves locally.
 */
export function setGamesPlayed(input: SetGamesPlayedInput) {
  return dispatch('roster.gamesPlayed', input, () =>
    queueMutation(
      {
        area: 'Roster',
        sessionId: input.sessionId,
        operationId: input.operationId,
        fingerprint: input.operationId ? JSON.stringify([input.rosterId, input.games]) : undefined,
      },
      (s) => {
        if (sessionIn(s, input.sessionId).state !== 'active') fail('Start the session first.')
        if (!Number.isSafeInteger(input.games) || input.games < 0 || input.games > GAMES_PLAYED_MAX)
          fail(`Enter a whole number of games, 0 to ${GAMES_PLAYED_MAX}.`)
        const matches = s.matches.filter((m) => m.sessionId === input.sessionId)
        const rows =
          input.rosterId === 'all'
            ? s.roster.filter((p) => p.sessionId === input.sessionId)
            : [row(s, input.rosterId, input.sessionId)]
        if (!rows.length) fail('No players on the roster yet.')
        for (const p of rows) p.gamesAdjustment = input.games - countedGames(p.id, matches)
        const one = input.rosterId === 'all' ? null : rows[0]
        return {
          data: rows.map((p) => ({ rosterId: p.id, games: gamesPlayed(p, matches) })),
          text: one
            ? `Games played set · ${shortName(one)}`
            : `Games played set for ${rows.length} player${rows.length === 1 ? '' : 's'}`,
        }
      },
    ),
  )
}
export function setAllPresence(input: { sessionId: string; present: boolean }) {
  return dispatch('roster.presenceAll', input, () =>
    rosterMutation(input.sessionId, (s) => {
      if (sessionIn(s, input.sessionId).state !== 'prepared')
        fail('Mark players individually after the session starts.')
      for (const p of s.roster.filter((p) => p.sessionId === input.sessionId)) {
        p.present = input.present
        p.presentChangedAt = Date.now()
      }
      return { data: null, text: `Everyone marked ${input.present ? 'present' : 'absent'}` }
    }),
  )
}
function waiter(s: MockState, id: string, sessionId: string) {
  const w = s.waitlist.find((w) => w.id === id && w.sessionId === sessionId)
  if (!w) fail('Waitlist entry not available.')
  return w
}
export async function giveSlot(input: { sessionId: string; waitlistId: string }) {
  await flushSessionBatches(input.sessionId)
  return dispatch('roster.giveSlot', input, () =>
    rosterMutation(input.sessionId, (s) => {
      const w = waiter(s, input.waitlistId, input.sessionId),
        p = required(s.clubPlayers.find((p) => p.id === w.clubPlayerId))
      promoteWaiter(s, w)
      const n = s.roster.filter((r) => r.sessionId === input.sessionId).length,
        budget = capacity(s, input.sessionId)
      return {
        data: null,
        text: `${p.nickname || p.fullName.split(' ')[0]} got a slot${sessionIn(s, input.sessionId).state === 'active' ? ' · level locked' : ''}${n > budget ? ` · now ${n} players for ${budget} slots` : ''}`,
      }
    }),
  )
}
export async function fillOpenSlots(sessionId: string) {
  await flushSessionBatches(sessionId)
  return dispatch('roster.fillOpenSlots', sessionId, () =>
    rosterMutation(sessionId, (s) => {
      const open = Math.max(
          0,
          capacity(s, sessionId) - s.roster.filter((r) => r.sessionId === sessionId).length,
        ),
        waiting = s.waitlist
          .filter((w) => w.sessionId === sessionId)
          .sort((a, b) => a.addedAt - b.addedAt)
          .slice(0, open)
      for (const w of waiting) promoteWaiter(s, w)
      return { data: null, text: `${waiting.length} players moved from the waitlist` }
    }),
  )
}
export async function removeFromWaitlist(input: { sessionId: string; waitlistId: string }) {
  await flushSessionBatches(input.sessionId)
  return dispatch('roster.removeFromWaitlist', input, () =>
    rosterMutation(input.sessionId, (s) => {
      const w = waiter(s, input.waitlistId, input.sessionId),
        p = required(s.clubPlayers.find((p) => p.id === w.clubPlayerId))
      s.waitlist = s.waitlist.filter((x) => x.id !== w.id)
      return {
        data: null,
        text: `${p.nickname || p.fullName.split(' ')[0]} removed from the waitlist`,
      }
    }),
  )
}
export type JoinRequestInput = {
  sessionId: string
  name: string
  nickname?: string
  phone?: string
  statedBand: SessionJoinRequest['statedBand']
  /** Join a slot (default) or Be waitlisted (D-2026-11-11-02) */
  placement?: Extract<JoinRequestPlacement, 'slot' | 'waitlist'>
}
export const SLOTS_FULL_ERROR = 'All slots are taken. Join the waitlist instead.'
/** Join requests end at Start (D-2026-11-11-11): none is created once the session is live. */
export const JOIN_REQUESTS_STARTED_ERROR =
  'The session has started, so online join requests are closed.'
/**
 * "Slots are full" for a player's request (D-2026-11-11-02): before start, with the roster at the
 * slot budget. During play the Queue Master can admit additional players (#284–#287), so a slot
 * request stays possible.
 */
export const slotsFull = (s: MockState, sessionId: string) =>
  sessionIn(s, sessionId).state !== 'active' &&
  s.roster.filter((r) => r.sessionId === sessionId).length >= capacity(s, sessionId)
function request(s: MockState, input: JoinRequestInput) {
  const session = sessionIn(s, input.sessionId)
  if (session.state === 'active') fail(JOIN_REQUESTS_STARTED_ERROR)
  if (!session.acceptJoinRequests || session.state !== 'prepared') fail('Join requests are off.')
  const fields: Record<string, string> = {}
  const placement = input.placement ?? 'slot'
  if (!input.name.trim()) fields.name = 'Enter your name.'
  const phone = input.phone?.trim() ? phoneField.safeParse(input.phone) : null
  if (phone && !phone.success) fields.phone = 'Enter a full mobile number, or leave it empty.'
  if (!['beginner', 'intermediate', 'advanced', 'unsure'].includes(input.statedBand))
    fields.statedBand = 'Pick your level, or Not sure.'
  if (placement !== 'slot' && placement !== 'waitlist')
    fields.placement = 'Pick Join a slot or Be waitlisted.'
  // D-2026-11-11-02: players cannot join a slot while every slot is taken; the waitlist remains.
  else if (placement === 'slot' && slotsFull(s, session.id)) fields.placement = SLOTS_FULL_ERROR
  if (Object.keys(fields).length)
    throw new MockError('permission', required(Object.values(fields)[0]), fields)
  const r: SessionJoinRequest = {
    id: crypto.randomUUID(),
    sessionId: session.id,
    name: input.name.trim(),
    nickname: input.nickname?.trim() || null,
    phoneE164: phone?.success ? phone.data : null,
    statedBand: input.statedBand,
    placement,
    status: 'pending',
    requestedAt: Date.now(),
    decidedAt: null,
    clubPlayerId: null,
  }
  s.joinRequests.push(r)
  return r
}
export async function submitJoinRequest(input: JoinRequestInput) {
  await flushSessionPresence(input.sessionId)
  return queueMutation({ area: 'Roster', onlineOnly: true }, (s) => {
    const r = request(s, input)
    return { data: { requestId: r.id }, text: 'Request sent' }
  })
}
function pending(s: MockState, id: string) {
  const r = s.joinRequests.find((r) => r.id === id)
  if (!r || r.status !== 'pending') fail('This join request has already been decided.')
  return r
}
/** Confirm a guest's join request: a new guest record, then a slot or the waitlist place. */
export function confirmJoinRequestChange(
  s: MockState,
  input: { requestId: string; level: PlayingLevel },
) {
  const request = pending(s, input.requestId),
    p = createClubPlayer(s, {
      name: request.name,
      nickname: request.nickname ?? undefined,
      phone: request.phoneE164 ?? undefined,
    }),
    data = place(
      s,
      request.sessionId,
      p,
      input.level,
      request.requestedAt,
      request.placement === 'waitlist',
    )
  request.status = 'confirmed'
  request.decidedAt = Date.now()
  request.clubPlayerId = p.id
  return {
    data,
    text: `${p.fullName} confirmed from a join request · ${data.waitlistPosition ? `waitlist #${data.waitlistPosition}` : levelLabel(input.level)}`,
  }
}
export function confirmJoinRequest(input: { requestId: string; level: PlayingLevel }) {
  if (isRealDataMode()) return realConfirmJoinRequest(input)
  const r = pending(readMockState(), input.requestId)
  return rosterMutation(r.sessionId, (s) => confirmJoinRequestChange(s, input))
}
export function declineJoinRequestChange(s: MockState, requestId: string) {
  const r = pending(s, requestId)
  r.status = 'declined'
  r.decidedAt = Date.now()
  return { data: null, text: `${r.name}'s join request declined` }
}
export function declineJoinRequest(requestId: string) {
  if (isRealDataMode()) return realDeclineJoinRequest(requestId)
  const r = pending(readMockState(), requestId)
  return rosterMutation(r.sessionId, (s) => declineJoinRequestChange(s, requestId))
}
export function setAcceptJoinRequests(input: { sessionId: string; accept: boolean }) {
  if (isRealDataMode()) return realSetAcceptJoinRequests(input)
  return rosterMutation(input.sessionId, (s) => {
    sessionIn(s, input.sessionId).acceptJoinRequests = input.accept
    return { data: null, text: `Join requests are ${input.accept ? 'on' : 'off'}` }
  })
}
const samples = [
  { name: 'Tracy', nickname: 'Trace', phone: '0917 555 0142', statedBand: 'intermediate' },
  { name: 'Gretchen', statedBand: 'beginner' },
  { name: 'PJ Perez', nickname: 'PJ', phone: '0928 555 0199', statedBand: 'advanced' },
  { name: 'Jess', phone: '0905 555 0110', statedBand: 'unsure' },
] as const
export function addSampleJoinRequest(sessionId: string) {
  return rosterMutation(sessionId, (s) => {
    const sample = required(samples[s.sampleRequestIndex++ % samples.length]),
      r = request(s, {
        ...sample,
        sessionId,
        placement: slotsFull(s, sessionId) ? 'waitlist' : 'slot',
      })
    return {
      data: { requestId: r.id },
      text: `${r.name} sent a join request to ${sessionIn(s, sessionId).title}`,
    }
  })
}
