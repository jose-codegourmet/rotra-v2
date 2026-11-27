import { normalizeSocialLink } from '@rotra/schema/social-link'
import { flushSessionBatches, flushSessionPresence } from '../batch/flushBatches'
import { savedPlayerName, withClubNickname } from '../club-player/clubNickname.rules'
import type { ClubPlayer, Gender } from '../club-player/clubPlayer.types'
import { clubPictureState } from '../club-player/clubPlayerPicture.rules'
import { clubPlayerForProfile, createClubPlayer } from '../club-player/mutations'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { leaderboardLevels, leaderboardPlayers } from '../fixtures/players'
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
import { isRtrId, normalizeRtrId } from '../player/rtrId'
import {
  accountByEmail,
  accountBySocialKey,
  clubRecordsOf,
  isCurrentRecord,
  isUnclaimedPerson,
  savedDisplayName,
  savedRecordByEmail,
  savedRecordBySocialKey,
} from '../player/unclaimed'
import { isListedInDirectory } from '../player/visibility.rules'
import { promoteWaiter, recomputeMinimum } from '../queue-session/mutations'
import { slotCapacity } from '../queue-session/queueSession.rules'
import { isRealDataMode } from '../real/mode'
import {
  realAddDirectoryPlayerToSession,
  realLookupPlayer,
  realMarkNoShow,
  realPlayerDirectorySearch,
  realSetRosterLevel,
  realUndoNoShow,
} from '../real/queue'
import {
  realConfirmJoinRequest,
  realDeclineJoinRequest,
  realRemoveRosterPlayer,
  realSetAcceptJoinRequests,
  realSetAlwaysRequireRequest,
} from '../real/session-live'
import { type HandicapSpot, handicapSpotsOf, isHandicapSpot } from './handicap.rules'
import { levelRestrictionBlockFor } from './levelRestriction.rules'
import {
  inUnfinishedMatch,
  levelLabel,
  queueMasterName,
  ROSTER_DUPLICATE_ERROR,
  stepDownBlockedText,
} from './sessionRoster.rules'
import type {
  DirectoryPlayer,
  JoinRequestPlacement,
  PlayerLookup,
  SessionJoinRequest,
  SessionPlayer,
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
export type RosterAddPlacement = {
  allowOverfill?: boolean
  toWaitlist?: boolean
  /**
   * Level restrictions (D-2026-11-19-12): the Queue Master's second press, after the warning, adds
   * a player outside the session's restriction (or into a full band). Without it the add is
   * refused with the reason. Add to waitlist is never checked.
   */
  allowOutsideLevels?: boolean
}
/** A join request confirmed with the level the Queue Master chose; `allowOutsideLevels` as above. */
export type ConfirmRequestInput = {
  requestId: string
  level: PlayingLevel
  allowOutsideLevels?: boolean
}
/**
 * Level restrictions on slots (D-2026-11-19-12) for the Queue Master's add and confirm: refused
 * with the reason when the level is outside the session's restriction or its band is full, unless
 * they pressed again (`allowOutsideLevels`). The waitlist isn't checked.
 */
export function requireLevelAllowed(
  s: MockState,
  sessionId: string,
  level: PlayingLevel,
  { toWaitlist, allowOutsideLevels }: Pick<RosterAddPlacement, 'toWaitlist' | 'allowOutsideLevels'>,
) {
  if (toWaitlist || allowOutsideLevels) return
  const reason = levelRestrictionBlockFor(
    sessionIn(s, sessionId).levelRestriction,
    level,
    s.roster.filter((r) => r.sessionId === sessionId).map((r) => r.level),
  )
  if (reason) fail(reason)
}
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
 * unclaimed player already in the club's saved players needs no identity check.
 */
export function addSavedPlayerChange(s: MockState, input: AddSavedPlayerInput) {
  const p = s.clubPlayers.find((p) => p.id === input.clubPlayerId && p.clubId === DEMO_CLUB_ID)
  if (!p || (p.playerId && s.adminPlayerRecords[p.playerId]?.archivedAt))
    fail('Player not available.')
  requireLevelAllowed(s, input.sessionId, input.level, input)
  const data = place(
      s,
      input.sessionId,
      p,
      input.level,
      Date.now(),
      input.toWaitlist,
      input.allowOverfill,
    ),
    name = savedPlayerName(p)
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
const NO_MATCH: PlayerLookup = { player: null, savedName: null }

/**
 * An unclaimed player as Player lookup shows them (D-2026-11-23-01): the name and picture of the
 * club that saved them first. This club still enters its own name when it adds them.
 */
function unclaimedResult(s: MockState, player: { id: string; rtrId: string }): DirectoryPlayer {
  const first = clubRecordsOf(s, player.id)[0]
  const profile = s.playerProfiles.find((entry) => entry.playerId === player.id)
  return {
    id: player.id,
    fullName: first?.fullName ?? profile?.fullName ?? '',
    nickname: null,
    rtrId: player.rtrId,
    identity: 'unclaimed',
    picture: first ? clubPictureState(first, profile?.picture ?? null).reference : null,
    suggestion: null,
    rankLabel: 'Not ranked',
    ownNameRequired: true,
  }
}

/** D-2026-11-23-01: unclaimed players whose name (any club's) contains the query, not saved here. */
function unclaimedByName(s: MockState, query: string): DirectoryPlayer[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const mine = new Set(
    s.clubPlayers
      .filter((c) => c.clubId === DEMO_CLUB_ID && isCurrentRecord(c) && c.playerId)
      .map((c) => c.playerId),
  )
  return s.players
    .filter(
      (p) =>
        isUnclaimedPerson(s, p.id) &&
        !mine.has(p.id) &&
        !s.adminPlayerRecords[p.id]?.archivedAt &&
        clubRecordsOf(s, p.id).some((r) => r.fullName.toLowerCase().includes(q)),
    )
    .slice(0, 20)
    .map((p) => unclaimedResult(s, p))
}

/**
 * Player lookup (D-2026-11-16-04): the one ROTRA player, registered or unclaimed, whose RTR ID or
 * email is exactly what was typed. No name search (names are searched in the club's own saved
 * players only) and a guest is never found. Another club's unclaimed player comes back with the RTR
 * ID and status only (`ownNameRequired`): no club is shown another club's name, picture or level.
 * Someone already in this club's saved players is not repeated: `savedName` says who they are here.
 * Hide me from Player Information keeps a registered player out. Online only.
 *
 * Real mode still runs its registered-only search until D-2026-11-16-04 is built there: the match
 * is the result whose RTR ID is exactly what was typed; an email finds nobody yet.
 */
export async function lookupPlayer(q: string): Promise<PlayerLookup> {
  // Real mode (P15.8): the server looks up the exact RTR ID or email over registered and
  // unclaimed people and says when this club already saved them.
  if (isRealDataMode()) return q.trim() ? realLookupPlayer(q.trim()) : NO_MATCH
  await delay()
  requireOnline()
  const s = readMockState(),
    query = q.trim()
  if (!query) return NO_MATCH
  const byRtrId = isRtrId(query)
    ? s.players.find((p) => p.rtrId === normalizeRtrId(query))
    : undefined
  // #1019: an exact social link finds an unclaimed player only, never a registered one.
  const link = isRtrId(query) || query.includes('@') ? null : normalizeSocialLink(query)
  const account = isRtrId(query)
    ? undefined
    : link
      ? accountBySocialKey(s, link.key)
      : accountByEmail(s, query)
  const player = byRtrId ?? (account ? s.players.find((p) => p.id === account.playerId) : undefined)
  const saved = player
    ? s.clubPlayers.find(
        (c) => c.clubId === DEMO_CLUB_ID && c.playerId === player.id && isCurrentRecord(c),
      )
    : link
      ? savedRecordBySocialKey(s, DEMO_CLUB_ID, link.key)
      : savedRecordByEmail(s, DEMO_CLUB_ID, query)
  if (saved) return { player: null, savedName: savedDisplayName(s, saved) }
  if (!player) return { ...NO_MATCH, matches: unclaimedByName(s, query) }
  if (s.adminPlayerRecords[player.id]?.archivedAt) return NO_MATCH
  if (isUnclaimedPerson(s, player.id))
    return { player: unclaimedResult(s, player), savedName: null }
  const profile = s.playerProfiles.find((entry) => entry.playerId === player.id)
  if (!isListedInDirectory(profile)) return NO_MATCH
  const listed = leaderboardPlayers.findIndex((entry) => entry.id === player.id)
  const rankIndex = s.playerRanks[player.id]?.levelIndex
  return {
    player: {
      id: player.id,
      fullName: player.fullName,
      nickname: player.nickname,
      rtrId: player.rtrId,
      identity: 'registered',
      picture: profile?.picture ?? null,
      suggestion:
        leaderboardLevels[player.id] ??
        (rankIndex == null ? null : (PLAYING_LEVELS[rankIndex] ?? null)),
      rankLabel: listed >= 0 ? `#${listed + 1}` : 'Not ranked',
    },
    savedName: null,
  }
}

/**
 * Player lookup as the list the Add player sheet draws: the one match, or nothing. Kept for the
 * existing screens; `lookupPlayer` also says when the match is already a saved player.
 */
export async function playerDirectorySearch(q: string): Promise<DirectoryPlayer[]> {
  if (isRealDataMode()) return realPlayerDirectorySearch(q)
  const { player } = await lookupPlayer(q)
  return player ? [player] : []
}
export type AddDirectoryPlayerInput = RosterAddPlacement & {
  sessionId: string
  playerId: string
  /** This club's own name for another club's unclaimed player; required for one ("Enter a name.") */
  name?: string
  level: PlayingLevel
}
export function addDirectoryPlayerChange(s: MockState, input: AddDirectoryPlayerInput) {
  requireLevelAllowed(s, input.sessionId, input.level, input)
  const p = clubPlayerForProfile(s, input.playerId, undefined, 'added', input.name).player
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
    text: `${savedPlayerName(p)} added${data.waitlistPosition ? ` to the waitlist as #${data.waitlistPosition}` : ''} · ${levelLabel(input.level)}${!data.waitlistPosition && data.locked ? ' · level locked' : ''}`,
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
  /** Optional gender (D-2026-11-19-01); missing = not given */
  gender?: Gender | null
  /** No email adds a guest; an email adds an unclaimed player or links a ROTRA player */
  email?: string
  /** #1019: a social link is an entry key too, and wins over the email */
  socialLink?: string
  /** Optional, private to the club; kept for an unclaimed player only */
  phone?: string
  /** The new saved player's id, chosen on the device (see `RosterBatchOperation`) */
  clubPlayerId?: string
  level: PlayingLevel
}
export function addNewPlayerChange(s: MockState, input: AddNewPlayerInput) {
  requireLevelAllowed(s, input.sessionId, input.level, input)
  const { player: p, how } = createClubPlayer(s, { ...input, id: input.clubPlayerId }),
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
      : `${p.fullName} added${how}`,
  }
}
export async function addNewPlayerToSession(input: AddNewPlayerInput) {
  await flushSessionBatches(input.sessionId)
  return dispatch('roster.addNew', input, () =>
    rosterMutation(input.sessionId, (s) => addNewPlayerChange(s, input)),
  )
}
/** The name the Queue Master sees for a roster row, for toasts and messages. */
function nameIn(s: MockState, p: SessionPlayer) {
  return queueMasterName(withClubNickname(s, p))
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
    return { data: null, text: `${nameIn(s, p)}: ${levelLabel(input.level)}` }
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
  return { data: null, text: `${nameIn(s, p)} removed from the roster` }
}
export function removeRosterPlayer(input: { sessionId: string; rosterId: string }) {
  if (isRealDataMode()) return realRemoveRosterPlayer(input)
  return rosterMutation(input.sessionId, (s) => removeRosterPlayerChange(s, input))
}
export type StepDownInput = { sessionId: string; rosterId: string; operationId?: string }
/**
 * Move to waitlist (#735): the admitted player goes to the **back** of the waitlist (strict first
 * come, first served by waitlist time, D-2026-11-23-06), before and
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
    throw new MockError('conflict', blocked ?? stepDownBlockedText(nameIn(s, p)))
  s.roster = s.roster.filter((r) => r.id !== p.id)
  s.waitlist.push({
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    clubPlayerId: p.clubPlayerId,
    level: p.level,
    addedAt: Date.now(),
  })
  return { data: null, text: `${p.nameSnapshot} moved to the waitlist` }
}
export async function stepDownToWaitlist(input: StepDownInput) {
  await flushSessionBatches(input.sessionId)
  return dispatch('roster.stepDown', input, () =>
    rosterMutation(input.sessionId, (s) => stepDownChange(s, input)),
  )
}
/**
 * No show (cancelled) on the live Players view: an away player with no games and in no match comes
 * off tonight's roster and their slot opens. Refused with "Remove NAME from their match first." when
 * they were put in a match meanwhile. After Start only; a no show owes nothing and stays off the
 * player's history and the public page (D-2026-11-14-02). Real mode sets `no_show_at` (#839).
 */
export async function markNoShow(input: { sessionId: string; rosterId: string }) {
  if (isRealDataMode()) return realMarkNoShow(input)
  return rosterMutation(input.sessionId, (s) => {
    if (sessionIn(s, input.sessionId).state !== 'active') fail('This session is not live.')
    const p = row(s, input.rosterId, input.sessionId)
    const matches = s.matches.filter((m) => m.sessionId === input.sessionId)
    if (inUnfinishedMatch(p.id, matches))
      throw new MockError('conflict', `Remove ${nameIn(s, p)} from their match first.`)
    if (p.present || gamesPlayed(p, matches) > 0)
      fail(`${nameIn(s, p)} is here or has played tonight.`)
    s.roster = s.roster.filter((r) => r.id !== p.id)
    s.noShows = [...(s.noShows ?? []), { ...p, noShowAt: Date.now() }]
    const count = s.roster.filter((r) => r.sessionId === input.sessionId).length
    return {
      data: null,
      text: `${p.nameSnapshot} marked No show (cancelled) · ${count}/${capacity(s, input.sessionId)}`,
    }
  })
}
/** Back to roster: a No show (cancelled) player takes a free slot again; refused while the roster is full. */
export async function undoNoShow(input: { sessionId: string; rosterId: string }) {
  if (isRealDataMode()) return realUndoNoShow(input)
  return rosterMutation(input.sessionId, (s) => {
    const x = (s.noShows ?? []).find(
      (n) => n.id === input.rosterId && n.sessionId === input.sessionId,
    )
    if (!x) fail('Player not available.')
    const count = s.roster.filter((r) => r.sessionId === input.sessionId).length
    if (count >= capacity(s, input.sessionId))
      throw new MockError('conflict', 'The roster is full. Free a slot to bring someone back.')
    const { noShowAt: _noShowAt, ...back } = x
    s.noShows = (s.noShows ?? []).filter((n) => n !== x)
    s.roster.push(back)
    return {
      data: null,
      text: `${x.nameSnapshot} back on the roster · ${count + 1}/${capacity(s, input.sessionId)}`,
    }
  })
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
        text: `${nameIn(s, p)} is ${input.present ? '' : 'not '}present${n ? ` · ${n} waiting match${n === 1 ? ' needs' : 'es need'} attention` : ''}`,
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
            ? `Games played set · ${nameIn(s, one)}`
            : `Games played set for ${rows.length} player${rows.length === 1 ? '' : 's'}`,
        }
      },
    ),
  )
}
export type SetHandicapInput = {
  sessionId: string
  rosterId: string
  /** Every marked spot (the whole set, not a change); empty clears the handicap */
  spots: HandicapSpot[]
  operationId?: string
}
/**
 * Handicap · tonight (D-2026-11-25-03): saves the marked spots on one live roster entry, from the
 * live Edit player sheet's Save changes. Live sessions only; an ordinary Roster write offline, like
 * presence. Session done clears it.
 */
export function setHandicap(input: SetHandicapInput) {
  return dispatch('roster.handicap', input, () =>
    queueMutation(
      {
        area: 'Roster',
        sessionId: input.sessionId,
        operationId: input.operationId,
        fingerprint: input.operationId
          ? JSON.stringify([input.rosterId, handicapSpotsOf(input.spots)])
          : undefined,
      },
      (s) => {
        // Mockup change 2026-11-27: the handicap can be set while preparing too; it clears when the session ends.
        const state = sessionIn(s, input.sessionId).state
        if (state !== 'active' && state !== 'prepared') fail('This session has ended.')
        if (!input.spots.every(isHandicapSpot)) fail('Choose spots on the figure.')
        const p = row(s, input.rosterId, input.sessionId)
        p.handicapSpots = handicapSpotsOf(input.spots)
        return {
          data: { rosterId: p.id, spots: p.handicapSpots },
          text: `Handicap saved · ${nameIn(s, p)}`,
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
        text: `${savedPlayerName(p)} got a slot${sessionIn(s, input.sessionId).state === 'active' ? ' · level locked' : ''}${n > budget ? ` · now ${n} players for ${budget} slots` : ''}`,
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
        // Entries without a level (a host with no saved level) are skipped, as the real service does.
        waiting = s.waitlist
          .filter((w) => w.sessionId === sessionId && w.level)
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
        text: `${savedPlayerName(p)} removed from the waitlist`,
      }
    }),
  )
}
export type JoinRequestInput = {
  sessionId: string
  name: string
  nickname?: string
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
/**
 * Confirm a guest's join request: a new guest record (a name only), then a slot or the waitlist
 * place. Nothing links a returning guest's request to an earlier record, so it makes a second one
 * (D-2026-11-16-04).
 */
export function confirmJoinRequestChange(s: MockState, input: ConfirmRequestInput) {
  const request = pending(s, input.requestId)
  requireLevelAllowed(s, request.sessionId, input.level, {
    toWaitlist: request.placement === 'waitlist',
    allowOutsideLevels: input.allowOutsideLevels,
  })
  const { player: p } = createClubPlayer(s, {
      name: request.name,
      nickname: request.nickname ?? undefined,
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
export function confirmJoinRequest(input: ConfirmRequestInput) {
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
/** The toasts of the Always require a request switch (D-2026-11-12-02). */
export const alwaysRequireRequestToast = (always: boolean) =>
  always ? 'Members must request now' : 'Members can join right away'
/**
 * **Always require a request** (D-2026-11-12-02, #764): on, club members send a join request like
 * everyone else; off (the default), a member joins an upcoming session right away. Same path as
 * `setAcceptJoinRequests`: a roster command that works offline on a downloaded session and syncs.
 */
export function setAlwaysRequireRequest(input: { sessionId: string; always: boolean }) {
  if (isRealDataMode()) return realSetAlwaysRequireRequest(input)
  return rosterMutation(input.sessionId, (s) => {
    sessionIn(s, input.sessionId).alwaysRequireRequest = input.always
    return { data: null, text: alwaysRequireRequestToast(input.always) }
  })
}
const samples = [
  { name: 'Tracy', nickname: 'Trace', statedBand: 'intermediate' },
  { name: 'Gretchen', statedBand: 'beginner' },
  { name: 'PJ Perez', nickname: 'PJ', statedBand: 'advanced' },
  { name: 'Jess', statedBand: 'unsure' },
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
