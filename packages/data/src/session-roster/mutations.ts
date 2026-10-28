import { phoneField } from '@rotra/schema/phone'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { clubPlayerView } from '../club-player/fetchers'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { directoryPlayers, leaderboardLevels, leaderboardPlayers } from '../fixtures/players'
import { requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { required } from '../mock/required'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation, sessionIn } from '../mock/transaction'
import { PLAYING_LEVELS, type PlayingLevel } from '../player/player.types'
import { promoteWaiter, recomputeMinimum } from '../queue-session/mutations'
import { slotCapacity } from '../queue-session/queueSession.rules'
import { levelLabel, shortName } from './sessionRoster.rules'
import type { IdentityCheck, SessionJoinRequest } from './sessionRoster.types'

function fail(text: string): never {
  throw new MockError('permission', text)
}
function levelCheck(level: PlayingLevel) {
  if (!PLAYING_LEVELS.includes(level)) fail('Choose a level for this club before confirming.')
}
const capacity = (s: MockState, id: string) =>
  slotCapacity(
    s.courts.filter((c) => c.sessionId === id && !c.removedAt).length,
    sessionIn(s, id).playersPerCourt,
  )
function rosterMutation<T>(sessionId: string, change: (s: MockState) => { data: T; text: string }) {
  return queueMutation({ area: 'Roster', sessionId }, (s) => {
    const result = change(s)
    recomputeMinimum(s, sessionId)
    return result
  })
}
function place(
  s: MockState,
  sessionId: string,
  p: ClubPlayer,
  level: PlayingLevel,
  addedAt = Date.now(),
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
    throw new MockError('conflict', 'This player is already on the roster or waitlist.')
  const full = s.roster.filter((r) => r.sessionId === sessionId).length >= capacity(s, sessionId),
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
function identity(s: MockState, p: ClubPlayer, check?: IdentityCheck) {
  if (
    p.identity === 'unclaimed' &&
    (!check ||
      !['rtr-id', 'qr', 'phone'].includes(check) ||
      (check === 'phone' && clubPlayerView(s, p).phoneHidden))
  )
    fail('Confirm this player’s identity before adding them.')
}
export function addSavedPlayerToSession(input: {
  sessionId: string
  clubPlayerId: string
  level: PlayingLevel
  identityCheck?: IdentityCheck
}) {
  return rosterMutation(input.sessionId, (s) => {
    const p = s.clubPlayers.find((p) => p.id === input.clubPlayerId && p.clubId === DEMO_CLUB_ID)
    if (!p) fail('Player not available.')
    identity(s, p, input.identityCheck)
    const data = place(s, input.sessionId, p, input.level),
      name = p.nickname || p.fullName.split(' ')[0]
    return {
      data,
      text: data.waitlistPosition
        ? `${name} added to the waitlist as #${data.waitlistPosition} · ${levelLabel(input.level)}`
        : `${name} added · ${levelLabel(input.level)}${data.locked ? ' · level locked' : ''}`,
    }
  })
}
/** A directory suggestion's level is its leaderboard level. */
function directoryLevel(playerId: string): PlayingLevel {
  return leaderboardLevels[playerId] ?? 'beginner_low'
}
export async function playerDirectorySearch(q: string) {
  await delay()
  requireOnline()
  const s = readMockState(),
    query = q.trim().toLowerCase()
  return directoryPlayers
    .map((p, i) => ({
      ...p,
      identity: 'registered' as const,
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
export function addDirectoryPlayerToSession(input: {
  sessionId: string
  playerId: string
  level: PlayingLevel
  identityCheck?: IdentityCheck
}) {
  return rosterMutation(input.sessionId, (s) => {
    const profile = directoryPlayers.find((p) => p.id === input.playerId)
    if (!profile) fail('Player not available.')
    let p = s.clubPlayers.find((p) => p.playerId === profile.id && p.clubId === DEMO_CLUB_ID)
    if (!p) {
      p = {
        id: crypto.randomUUID(),
        clubId: DEMO_CLUB_ID,
        playerId: profile.id,
        fullName: profile.fullName,
        nickname: profile.nickname,
        identity: 'registered',
        playingLevel: directoryLevel(profile.id),
        addedAt: Date.now(),
      }
      s.clubPlayers.push(p)
    }
    identity(s, p, input.identityCheck)
    const data = place(s, input.sessionId, p, input.level)
    return {
      data,
      text: `${p.nickname || p.fullName.split(' ')[0]} added${data.waitlistPosition ? ` to the waitlist as #${data.waitlistPosition}` : ''} · ${levelLabel(input.level)}${!data.waitlistPosition && data.locked ? ' · level locked' : ''}`,
    }
  })
}
function newPlayer(s: MockState, input: { name: string; nickname?: string; phone?: string }) {
  if (!input.name.trim()) fail('Enter your name.')
  const parsed = input.phone?.trim() ? phoneField.safeParse(input.phone) : null
  if (parsed && !parsed.success) fail('Enter a full mobile number, or leave it empty.')
  const p: ClubPlayer = {
    id: crypto.randomUUID(),
    clubId: DEMO_CLUB_ID,
    playerId: null,
    fullName: input.name.trim(),
    nickname: input.nickname?.trim() || null,
    identity: parsed ? 'pending' : 'guest',
    playingLevel: null,
    addedAt: Date.now(),
  }
  s.clubPlayers.push(p)
  if (parsed?.success) s.privatePhones[p.id] = parsed.data
  return p
}
export function addNewPlayerToSession(input: {
  sessionId: string
  name: string
  nickname?: string
  phone?: string
  level: PlayingLevel
}) {
  return rosterMutation(input.sessionId, (s) => {
    const p = newPlayer(s, input),
      data = place(s, input.sessionId, p, input.level)
    return {
      data,
      text: data.waitlistPosition
        ? `${p.fullName} added to the waitlist as #${data.waitlistPosition}`
        : p.identity === 'guest'
          ? `${p.fullName} added as a guest`
          : `${p.fullName} added · profile lookup after sync`,
    }
  })
}
function row(s: MockState, id: string, sessionId: string) {
  const p = s.roster.find((p) => p.id === id && p.sessionId === sessionId)
  if (!p) fail('Player not available.')
  return p
}
export function setRosterLevel(input: {
  sessionId: string
  rosterId: string
  level: PlayingLevel
}) {
  return rosterMutation(input.sessionId, (s) => {
    const p = row(s, input.rosterId, input.sessionId)
    if (sessionIn(s, input.sessionId).state !== 'prepared' || p.levelLockedAt)
      fail('Levels are locked after the session starts.')
    levelCheck(input.level)
    p.level = input.level
    return { data: null, text: `${shortName(p)}: ${levelLabel(input.level)}` }
  })
}
export function removeRosterPlayer(input: { sessionId: string; rosterId: string }) {
  return rosterMutation(input.sessionId, (s) => {
    if (sessionIn(s, input.sessionId).state !== 'prepared')
      fail('Only a prepared roster can remove players.')
    const p = row(s, input.rosterId, input.sessionId)
    s.roster = s.roster.filter((r) => r.id !== p.id)
    return { data: null, text: `${shortName(p)} removed from the roster` }
  })
}
export function setPresence(input: { sessionId: string; rosterId: string; present: boolean }) {
  return rosterMutation(input.sessionId, (s) => {
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
  })
}
export function setAllPresence(input: { sessionId: string; present: boolean }) {
  return rosterMutation(input.sessionId, (s) => {
    if (sessionIn(s, input.sessionId).state !== 'prepared')
      fail('Mark players individually after the session starts.')
    for (const p of s.roster.filter((p) => p.sessionId === input.sessionId)) {
      p.present = input.present
      p.presentChangedAt = Date.now()
    }
    return { data: null, text: `Everyone marked ${input.present ? 'present' : 'absent'}` }
  })
}
function waiter(s: MockState, id: string, sessionId: string) {
  const w = s.waitlist.find((w) => w.id === id && w.sessionId === sessionId)
  if (!w) fail('Waitlist entry not available.')
  return w
}
export function giveSlot(input: { sessionId: string; waitlistId: string }) {
  return rosterMutation(input.sessionId, (s) => {
    const w = waiter(s, input.waitlistId, input.sessionId),
      p = required(s.clubPlayers.find((p) => p.id === w.clubPlayerId))
    promoteWaiter(s, w)
    const n = s.roster.filter((r) => r.sessionId === input.sessionId).length,
      budget = capacity(s, input.sessionId)
    return {
      data: null,
      text: `${p.nickname || p.fullName.split(' ')[0]} got a slot${sessionIn(s, input.sessionId).state === 'active' ? ' · level locked' : ''}${n > budget ? ` · now ${n} players for ${budget} slots` : ''}`,
    }
  })
}
export function fillOpenSlots(sessionId: string) {
  return rosterMutation(sessionId, (s) => {
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
  })
}
export function removeFromWaitlist(input: { sessionId: string; waitlistId: string }) {
  return rosterMutation(input.sessionId, (s) => {
    const w = waiter(s, input.waitlistId, input.sessionId),
      p = required(s.clubPlayers.find((p) => p.id === w.clubPlayerId))
    s.waitlist = s.waitlist.filter((x) => x.id !== w.id)
    return {
      data: null,
      text: `${p.nickname || p.fullName.split(' ')[0]} removed from the waitlist`,
    }
  })
}
export type JoinRequestInput = {
  sessionId: string
  name: string
  nickname?: string
  phone?: string
  statedBand: SessionJoinRequest['statedBand']
}
function request(s: MockState, input: JoinRequestInput) {
  const session = sessionIn(s, input.sessionId)
  if (!session.acceptJoinRequests || !['prepared', 'active'].includes(session.state))
    fail('Join requests are off.')
  const fields: Record<string, string> = {}
  if (!input.name.trim()) fields.name = 'Enter your name.'
  const phone = input.phone?.trim() ? phoneField.safeParse(input.phone) : null
  if (phone && !phone.success) fields.phone = 'Enter a full mobile number, or leave it empty.'
  if (!['beginner', 'intermediate', 'advanced', 'unsure'].includes(input.statedBand))
    fields.statedBand = 'Pick your level, or Not sure.'
  if (Object.keys(fields).length)
    throw new MockError('permission', required(Object.values(fields)[0]), fields)
  const r: SessionJoinRequest = {
    id: crypto.randomUUID(),
    sessionId: session.id,
    name: input.name.trim(),
    nickname: input.nickname?.trim() || null,
    phoneE164: phone?.success ? phone.data : null,
    statedBand: input.statedBand,
    status: 'pending',
    requestedAt: Date.now(),
    decidedAt: null,
    clubPlayerId: null,
  }
  s.joinRequests.push(r)
  return r
}
export function submitJoinRequest(input: JoinRequestInput) {
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
export function confirmJoinRequest(input: { requestId: string; level: PlayingLevel }) {
  const r = pending(readMockState(), input.requestId)
  return rosterMutation(r.sessionId, (s) => {
    const request = pending(s, input.requestId),
      p = newPlayer(s, {
        name: request.name,
        nickname: request.nickname ?? undefined,
        phone: request.phoneE164 ?? undefined,
      }),
      data = place(s, request.sessionId, p, input.level, request.requestedAt)
    request.status = 'confirmed'
    request.decidedAt = Date.now()
    request.clubPlayerId = p.id
    return {
      data,
      text: `${p.fullName} confirmed from a join request · ${data.waitlistPosition ? `waitlist #${data.waitlistPosition}` : levelLabel(input.level)}`,
    }
  })
}
export function declineJoinRequest(requestId: string) {
  const r = pending(readMockState(), requestId)
  return rosterMutation(r.sessionId, (s) => {
    const r = pending(s, requestId)
    r.status = 'declined'
    r.decidedAt = Date.now()
    return { data: null, text: `${r.name}'s join request declined` }
  })
}
export function setAcceptJoinRequests(input: { sessionId: string; accept: boolean }) {
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
      r = request(s, { ...sample, sessionId })
    return {
      data: { requestId: r.id },
      text: `${r.name} sent a join request to ${sessionIn(s, sessionId).title}`,
    }
  })
}
