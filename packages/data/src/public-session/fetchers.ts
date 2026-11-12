import { getConnectivity } from '../connectivity/connectivity'
import { PLAYER_FIXTURE_NOW } from '../fixtures/playerGames'
import portraits from '../fixtures/playerPortraits.json'
import {
  computeStandings,
  countedGames,
  courtNames,
  holdsCourt,
  waitMinutes,
} from '../match/match.rules'
import type { Match } from '../match/match.types'
import { allowedRequestFormats } from '../match-request/matchRequest.rules'
import { requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore } from '../mock/store'
import { recentGameStats } from '../player/player.rules'
import { playerProjection } from '../player/projection'
import { isAlwaysPrivatePlayer, PROFILE_PRIVATE_MESSAGE } from '../player/visibility'
import { resolveMockProfileBanner } from '../profile-banner/fetchers'
import { slotCapacity } from '../queue-session/queueSession.rules'
import { RealRequestError } from '../real/client'
import { isRealDataMode } from '../real/mode'
import {
  realGetMyJoinRequest,
  realGetPublicSession,
  realSendJoinRequest,
} from '../real/public-session'
import { sessionCostIn } from '../session-cost/fetchers'
import { submitJoinRequest } from '../session-roster/mutations'
import { playerOrigin } from './context'
import {
  linkedClubPlayerIds,
  maskPublicName,
  memberClubPlayer,
  myMatchLabel,
  playerSlot,
  publicFirstName,
  publicLevel,
  publicSkillMix,
  selfCheckInMark,
  tonightStatus,
} from './publicSession.rules'
import type {
  MatchRequestOptions,
  MyJoinRequest,
  MyNight,
  MyNightMatch,
  MyNightStage,
  ParticipantProfileKind,
  ParticipantStats,
  ParticipantTonight,
  PlayerSessionAccess,
  PublicCourtNow,
  PublicMatchPlayer,
  PublicQueuedMatch,
  PublicSessionPage,
  PublicSessionParticipant,
  PublicSessionResults,
  SendJoinRequestInput,
  SessionPageAccount,
  SignedInPublicSession,
} from './publicSession.types'

/** Unknown or removed slug: the page reveals nothing about any club, roster or retained data. */
export class PublicSessionNotFoundError extends MockError {
  constructor() {
    super('permission', "This session page isn't available.")
  }
}

const pictures: Record<string, string> = portraits

/**
 * The server's view: the last store state with nothing waiting to sync. While the operator's
 * device holds pending changes (DevMenu offline), the public page keeps showing this snapshot.
 */
let synced = mockStore.getSnapshot()
mockStore.subscribe(() => {
  const next = mockStore.getSnapshot()
  if (next.sync.pendingCount === 0) synced = next
})

/** Visitor memory: this page visit's request id per slug (in memory, resets on reload). */
const myRequests = new Map<string, { generation: number; requestId: string }>()

function serverState(): { state: MockState; hasPendingChanges: boolean; lastSyncedAt: number } {
  const current = mockStore.getSnapshot()
  const hasPendingChanges = current.sync.pendingCount > 0
  return {
    state: (hasPendingChanges ? synced : current) as MockState,
    hasPendingChanges,
    lastSyncedAt: current.sync.lastSyncedAt,
  }
}

function sessionBySlug(state: MockState, slug: string) {
  const session = state.sessions.find((s) => s.publicSlug === slug)
  if (!session) throw new PublicSessionNotFoundError()
  return session
}

/** The signed-in viewer: the authenticated Player profile the version is built for. */
type Viewer = { playerId: string }

/** Only the published slides; Off Day only when that publication explicitly included it. */
function publishedResults(
  state: MockState,
  sessionId: string,
  viewerClubPlayerIds?: ReadonlySet<string>,
): PublicSessionResults | null {
  const publication = state.publications[sessionId],
    snapshot = state.resultSnapshots[sessionId]
  if (!publication || !snapshot) return null
  const results: PublicSessionResults = {}
  if (publication.publishedSlides.includes('standings'))
    results.standings = snapshot.standings.map((r) => ({
      position: r.position,
      name: r.name,
      wins: r.wins,
      losses: r.losses,
      games: r.games,
      ...(viewerClubPlayerIds ? { isViewer: viewerClubPlayerIds.has(r.clubPlayerId) } : {}),
    }))
  if (publication.publishedSlides.includes('awards'))
    results.awards = {
      mvp: snapshot.awards.mvp ? { name: snapshot.awards.mvp.name } : null,
      mostImproved: snapshot.awards.mostImproved
        ? {
            name: snapshot.awards.mostImproved.name,
            priorSessions: snapshot.awards.mostImproved.priorSessions,
          }
        : null,
    }
  if (publication.includeOffDay)
    results.offDay = snapshot.awards.offDay.map((x) => ({
      name: x.name,
      priorSessions: x.priorSessions,
    }))
  return results
}

/**
 * One person as the page shows them. Visitor: every name masked. Signed-in (D-2026-11-09-02):
 * registered players' full name + nickname and their RTR ID for the profile link; guests and
 * unclaimed profiles stay masked and never carry an RTR ID. `isViewer` only on the signed-in side.
 */
function publicPerson(
  state: MockState,
  clubPlayerId: string,
  names: { fullName: string; nickname: string | null },
  viewer: Viewer | null,
) {
  const p = state.clubPlayers.find((x) => x.id === clubPlayerId)
  const hasRotraProfile = p?.identity === 'registered' || p?.identity === 'unclaimed'
  const registered = p?.identity === 'registered' && !!p.playerId
  const isViewer = !!viewer && !!p?.playerId && p.playerId === viewer.playerId
  // D-2026-11-12-01 for #731: always private is masked for everyone but the player themselves (the
  // Queue Master sees the roster name on their own screens); their picture stays public.
  const alwaysPrivate =
    registered &&
    !!p?.playerId &&
    state.playerProfiles.find((x) => x.playerId === p.playerId)?.profileVisibility ===
      'always_private'
  const showFull = !!viewer && registered && (!alwaysPrivate || isViewer)
  const banner =
    registered && p?.playerId
      ? resolveMockProfileBanner(
          state.playerProfiles.find((x) => x.playerId === p.playerId)?.bannerId,
        )
      : null
  const profile: ParticipantProfileKind = showFull
    ? 'registered'
    : registered && alwaysPrivate
      ? 'private'
      : 'guest'
  return {
    name: showFull ? names.fullName : maskPublicName(names.fullName),
    masked: !showFull,
    nickname: showFull ? names.nickname : null,
    rtrId: showFull ? (state.players.find((x) => x.id === p?.playerId)?.rtrId ?? null) : null,
    pictureUrl: hasRotraProfile && p?.playerId ? (pictures[p.playerId] ?? null) : null,
    isViewer,
    profile,
    bannerKey: banner?.bannerKey ?? null,
    bannerImageUrl: banner?.bannerImageUrl ?? null,
  }
}

/** The Tonight line for one roster entry (#731): prepared and live sessions only. */
function tonightOf(
  state: MockState,
  session: MockState['sessions'][number],
  entry: MockState['roster'][number],
): ParticipantTonight | undefined {
  if (session.state !== 'prepared' && session.state !== 'active' && session.state !== 'finalizing')
    return undefined
  return tonightStatus(
    entry,
    state.matches.filter((m) => m.sessionId === session.id),
    state.courts.filter((c) => c.sessionId === session.id),
  )
}

function participantOf(
  person: ReturnType<typeof publicPerson>,
  level: Parameters<typeof publicLevel>[0],
  signedIn: boolean,
  tonight?: ParticipantTonight,
): PublicSessionParticipant {
  const base = { name: person.name, pictureUrl: person.pictureUrl, ...publicLevel(level) }
  return signedIn
    ? {
        ...base,
        masked: person.masked,
        nickname: person.nickname,
        rtrId: person.rtrId,
        isViewer: person.isViewer,
        profile: person.profile,
        bannerKey: person.bannerKey,
        bannerImageUrl: person.bannerImageUrl,
        // Always-private and guest cards show no status; only the full profile card does.
        ...(tonight && person.profile === 'registered' ? { tonight } : {}),
      }
    : base
}

/** A face on a court tile or queue row: first name per the name rule, picture, level. */
function matchPlayerOf(
  state: MockState,
  rosterId: string,
  viewer: Viewer | null,
): PublicMatchPlayer {
  const r = state.roster.find((x) => x.id === rosterId)
  const person = publicPerson(
    state,
    r?.clubPlayerId ?? '',
    { fullName: r?.nameSnapshot ?? '', nickname: r?.nicknameSnapshot ?? null },
    viewer,
  )
  return {
    name: publicFirstName(person.name),
    level: r?.level ?? null,
    pictureUrl: person.pictureUrl,
    masked: person.masked,
    ...(viewer ? { isViewer: person.isViewer } : {}),
  }
}

const waitingMatches = (state: MockState, sessionId: string) =>
  state.matches
    .filter((m) => m.sessionId === sessionId && m.state === 'waiting')
    .sort((a, b) => a.queuePosition - b.queuePosition)

/** Courts now: one entry per court, or per match on merged courts; no score, no running time. */
function projectCourtsNow(
  state: MockState,
  session: MockState['sessions'][number],
  viewer: Viewer,
): PublicCourtNow[] {
  if (session.state !== 'active' && session.state !== 'finalizing') return []
  const courts = state.courts.filter((c) => c.sessionId === session.id && !c.removedAt)
  const held = state.matches.filter((m) => m.sessionId === session.id && holdsCourt(m))
  const seen = new Set<string>()
  const entries: PublicCourtNow[] = []
  for (const court of courts) {
    if (seen.has(court.id)) continue
    const match = held.find((m) => m.courtIds.includes(court.id))
    if (!match) {
      entries.push({
        id: court.id,
        label: court.label,
        courtLabels: [court.label],
        merged: false,
        status: 'free',
        teamA: [],
        teamB: [],
        startedAt: null,
      })
      continue
    }
    for (const id of match.courtIds) seen.add(id)
    const inMatch = courts.filter((c) => match.courtIds.includes(c.id))
    entries.push({
      id: court.id,
      label: courtNames(match, courts),
      courtLabels: inMatch.map((c) => c.label),
      merged: match.courtIds.length > 1,
      status: match.state === 'active' ? 'playing' : 'getting-ready',
      teamA: match.teamA.map((id) => matchPlayerOf(state, id, viewer)),
      teamB: match.teamB.map((id) => matchPlayerOf(state, id, viewer)),
      startedAt: match.state === 'active' ? match.startedAt : null,
    })
  }
  return entries
}

function projectQueue(
  state: MockState,
  session: MockState['sessions'][number],
  viewer: Viewer,
): PublicQueuedMatch[] {
  return waitingMatches(state, session.id).map((m, i) => ({
    matchNo: m.matchNo,
    position: i + 1,
    format: m.format,
    teamA: m.teamA.map((id) => matchPlayerOf(state, id, viewer)),
    teamB: m.teamB.map((id) => matchPlayerOf(state, id, viewer)),
  }))
}

function project(
  state: MockState,
  slug: string,
  sync: { hasPendingChanges: boolean; lastSyncedAt: number },
  options: { fullRoster?: boolean; viewer?: Viewer | null } = {},
): PublicSessionPage {
  const viewer = options.viewer ?? null
  const signedIn = viewer !== null
  const fullRoster = options.fullRoster ?? false
  const s = sessionBySlug(state, slug)
  const club = state.clubs.find((c) => c.id === s.clubId)
  if (!club) throw new PublicSessionNotFoundError()
  const courts = state.courts.filter((c) => c.sessionId === s.id && !c.removedAt)
  const roster = state.roster
    .filter((r) => r.sessionId === s.id)
    .sort((a, b) => a.confirmedAt - b.confirmedAt)
  const capacity = slotCapacity(courts.length, s.playersPerCourt)
  const status = s.state === 'finalizing' ? 'active' : s.state
  const viewerIds = viewer ? linkedClubPlayerIds(state, s.clubId, viewer.playerId) : undefined
  return {
    audience: signedIn ? 'signed-in' : 'visitor',
    slug: s.publicSlug,
    status,
    title: s.title,
    start: s.scheduledStartAt,
    end: s.scheduledEndAt,
    club: { id: club.id, name: club.name, initials: club.initials, logoUrl: club.logoUrl },
    venue: { name: s.venueName, address: s.venueAddress || null },
    courts: courts.map((c) => c.label),
    formats: { singles: s.allowSingles, doubles: s.allowDoubles },
    mode: s.sessionMode,
    minimum: s.minimumGames,
    notes: s.notes || null,
    participantCount: roster.length,
    participants: (signedIn || fullRoster ? roster : roster.slice(0, 12)).map((r) =>
      participantOf(
        publicPerson(
          state,
          r.clubPlayerId,
          { fullName: r.nameSnapshot, nickname: r.nicknameSnapshot },
          viewer,
        ),
        r.level,
        signedIn,
        signedIn ? tonightOf(state, s, r) : undefined,
      ),
    ),
    skillMix: publicSkillMix(roster.map((r) => r.level)),
    waitlist: state.waitlist
      .filter((w) => w.sessionId === s.id)
      .sort((a, b) => a.addedAt - b.addedAt)
      .map((w) => {
        const p = state.clubPlayers.find((x) => x.id === w.clubPlayerId)
        return participantOf(
          publicPerson(
            state,
            w.clubPlayerId,
            { fullName: p?.fullName ?? '', nickname: p?.nickname ?? null },
            viewer,
          ),
          w.level,
          signedIn,
        )
      }),
    openSlots: Math.max(0, capacity - roster.length),
    slotBudget: capacity,
    acceptJoinRequests: s.acceptJoinRequests,
    alwaysRequireRequest: s.alwaysRequireRequest,
    amountDuePerPlayer: sessionCostIn(state, s.id)?.estimate.perHead ?? null,
    lastSyncedAt: sync.lastSyncedAt,
    hasPendingChanges: sync.hasPendingChanges,
    results: status === 'completed' ? publishedResults(state, s.id, viewerIds) : null,
    ...(status === 'completed' ? { resultsPublished: state.publications[s.id] !== undefined } : {}),
  }
}

/**
 * Q-PUBLIC-DETAILS / PARTICIPANTS / RESULTS: the projection from the LAST SYNCED state, so a
 * disconnected operator's local edits never show. `visitor` reads as the guest's own browser:
 * offline (DevMenu) the request fails and the page keeps any cached copy.
 */
export async function getPublicSession(
  slug: string,
  options?: { visitor?: boolean },
): Promise<PublicSessionPage> {
  if (isRealDataMode())
    return realGetPublicSession(slug).catch((error: unknown) => {
      if (error instanceof RealRequestError && error.status === 404)
        throw new PublicSessionNotFoundError()
      throw error
    })
  await delay()
  if (options?.visitor) requireOnline()
  const { state, ...sync } = serverState()
  return project(state, slug, sync)
}

/** The account bar's Player (#693): profile name, nickname, RTR ID and picture. */
function sessionPageAccountOf(state: MockState, playerId: string): SessionPageAccount {
  const player = state.players.find((p) => p.id === playerId)
  return {
    playerId,
    name: player?.fullName ?? '',
    nickname: player?.nickname ?? null,
    rtrId: player?.rtrId ?? null,
    pictureUrl: pictures[playerId] ?? null,
  }
}

/** The signed-in Player for the session page's account bar (#693). Mock only. */
export async function getSessionPageAccount(playerId: string): Promise<SessionPageAccount> {
  await delay()
  const { state } = serverState()
  requireSignedInPlayer(state, playerId)
  return sessionPageAccountOf(state, playerId)
}

function requireSignedInPlayer(state: MockState, playerId: string) {
  if (!state.players.some((p) => p.id === playerId))
    throw new MockError('permission', 'Sign in with ROTRA Player to see this.')
}

/**
 * The signed-in version of the shared snapshot (D-2026-11-09-09): registered players' full name,
 * nickname and RTR ID, guests masked, no cap, the viewer's rows flagged `isViewer`, plus Courts
 * now and the Queue. Built from the last synced state like the visitor version. Mock only: real
 * mode has no route yet (NotConnectedError); the Player-hosted read stays `usePlayerSessionAccess`.
 * Works offline (owner, 2026-11-10): it shows the last-loaded data, like the operator's reads.
 */
export async function getSignedInSession(
  slug: string,
  playerId: string,
): Promise<SignedInPublicSession> {
  await delay()
  const { state, ...sync } = serverState()
  requireSignedInPlayer(state, playerId)
  const viewer = { playerId }
  const session = sessionBySlug(state, slug)
  return {
    ...project(state, slug, sync, { viewer }),
    audience: 'signed-in',
    courtsNow: projectCourtsNow(state, session, viewer),
    queue: projectQueue(state, session, viewer),
  }
}

function myMatchOf(state: MockState, match: Match, rosterId: string, viewer: Viewer): MyNightMatch {
  const mineA = match.teamA.includes(rosterId)
  const mates = (mineA ? match.teamA : match.teamB).filter((id) => id !== rosterId)
  const others = mineA ? match.teamB : match.teamA
  const partners = mates.map((id) => matchPlayerOf(state, id, viewer))
  const opponents = others.map((id) => matchPlayerOf(state, id, viewer))
  return {
    partners,
    opponents,
    matchLabel: myMatchLabel(
      partners.map((p) => p.name),
      opponents.map((p) => p.name),
    ),
  }
}

/**
 * The small personal part (D-2026-11-09-09): this Player's own night. Matches, queue and standing
 * come from the last synced state; the Player's own writes (check-in marks, notices, requests, invite
 * code) are server-side facts, so they read straight from the store. Only the viewer's own
 * standing: never another player's results or positions. Mock only (NotConnectedError in real mode).
 * Works offline (owner, 2026-11-10): `offline` is true, so a check-in shows the sync line.
 */
export async function getMyNight(slug: string, playerId: string): Promise<MyNight> {
  await delay()
  const { state } = serverState()
  requireSignedInPlayer(state, playerId)
  const live = mockStore.getSnapshot() as MockState
  const viewer = { playerId }
  const session = sessionBySlug(state, slug)
  const slot = playerSlot(state, session, playerId)
  const row = slot.roster
    ? (live.roster.find((r) => r.id === slot.roster?.id) ?? slot.roster)
    : null
  const waitlist = state.waitlist
    .filter((w) => w.sessionId === session.id)
    .sort((a, b) => a.addedAt - b.addedAt)
  const waitIndex = slot.waitlist ? waitlist.findIndex((w) => w.id === slot.waitlist?.id) : -1
  const takesPart =
    session.state === 'prepared' || session.state === 'active' || session.state === 'finalizing'
  const isLive = session.state === 'active' || session.state === 'finalizing'
  const status: MyNight['status'] = row ? 'confirmed' : slot.waitlist ? 'waitlisted' : 'none'
  let stage: MyNightStage | null = null
  if (status === 'waitlisted') stage = takesPart ? 'waitlisted' : null
  else if (row) {
    if (session.state === 'prepared') stage = 'before-start'
    else if (isLive) stage = row.present ? 'live-present' : 'live-not-present'
    else if (session.state === 'completed') stage = 'finished'
  }
  const mark = row ? selfCheckInMark(row) : null
  const matches = state.matches.filter((m) => m.sessionId === session.id)
  const standing = row
    ? computeStandings(
        state.roster.filter((r) => r.sessionId === session.id),
        matches,
      ).find((r) => r.playerId === row.id)
    : undefined
  const queued = row ? waitingMatches(state, session.id) : []
  const queueIndex = row ? queued.findIndex((m) => [...m.teamA, ...m.teamB].includes(row.id)) : -1
  const queuedMatch = queued[queueIndex]
  const sessionCourts = state.courts.filter((c) => c.sessionId === session.id && !c.removedAt)
  const heldMatch =
    row && isLive
      ? matches.find((m) => holdsCourt(m) && [...m.teamA, ...m.teamB].includes(row.id))
      : undefined
  const request = live.joinRequests
    .filter((r) => r.sessionId === session.id && r.playerId === playerId)
    .sort((a, b) => b.requestedAt - a.requestedAt)[0]
  const openMatchRequest = row
    ? live.matchRequests.find(
        (m) => m.sessionId === session.id && m.pid === row.id && m.status === 'open',
      )
    : undefined
  return {
    playerId,
    status,
    stage,
    waitlistPosition: waitIndex >= 0 ? waitIndex + 1 : null,
    startsAt: session.scheduledStartAt,
    present: row?.present ?? false,
    checkedIn: mark?.kind === 'checked-in',
    hasLeft: mark?.kind === 'left',
    cantMakeItSent: row
      ? live.dropOutNotices.some(
          (d) => d.sessionId === session.id && d.pid === row.id && d.status === 'open',
        )
      : false,
    offline: getConnectivity() === 'offline',
    games: standing?.games ?? 0,
    won: standing?.wins ?? 0,
    lost: standing?.losses ?? 0,
    minimum: session.minimumGames,
    inQueue:
      row && queuedMatch
        ? { position: queueIndex + 1, ...myMatchOf(state, queuedMatch, row.id, viewer) }
        : null,
    onCourt:
      row && heldMatch
        ? {
            courtLabel: courtNames(heldMatch, sessionCourts),
            started: heldMatch.state === 'active',
            ...myMatchOf(state, heldMatch, row.id, viewer),
          }
        : null,
    joinRequest: request
      ? {
          requestId: request.id,
          name: request.name,
          status: request.status,
          waitlistPosition: request.status === 'confirmed' && waitIndex >= 0 ? waitIndex + 1 : null,
          placement: request.placement,
        }
      : null,
    matchRequest: openMatchRequest
      ? {
          id: openMatchRequest.id,
          format: openMatchRequest.format,
          at: openMatchRequest.at,
          partners: openMatchRequest.partners.map((id) =>
            id ? matchPlayerOf(state, id, viewer) : null,
          ),
          opponents: openMatchRequest.opponents.map((id) =>
            id ? matchPlayerOf(state, id, viewer) : null,
          ),
        }
      : null,
    isClubMember: !!memberClubPlayer(state, session.clubId, playerId),
    canInvite:
      session.state === 'prepared' && session.acceptJoinRequests && (!!row || !!slot.waitlist),
    inviteCode:
      live.sessionInviteCodes.find((c) => c.sessionId === session.id && c.playerId === playerId)
        ?.code ?? null,
  }
}

/**
 * What Request a match needs (Q17.14): the session's allowed request formats, the minimum, and the
 * present players other than the viewer with games, level, court and waiting time, for the sheet
 * and its picker. Present players only; the viewer's own roster id is `viewerRosterId`. Names follow
 * the signed-in rule. Presence is a server fact (live store); matches come from the last synced
 * state like the rest of the projection. Mock only (NotConnectedError in real mode).
 */
export async function getMatchRequestOptions(
  slug: string,
  playerId: string,
): Promise<MatchRequestOptions> {
  await delay()
  requireOnline()
  const { state } = serverState()
  requireSignedInPlayer(state, playerId)
  const live = mockStore.getSnapshot() as MockState
  const viewer = { playerId }
  const session = sessionBySlug(state, slug)
  const own = playerSlot(state, session, playerId).roster
  const matches = state.matches.filter((m) => m.sessionId === session.id)
  const courts = state.courts.filter((c) => c.sessionId === session.id && !c.removedAt)
  const players = live.roster
    .filter((r) => r.sessionId === session.id && r.present && r.id !== own?.id)
    .map((r) => {
      const person = publicPerson(
        state,
        r.clubPlayerId,
        { fullName: r.nameSnapshot, nickname: r.nicknameSnapshot ?? null },
        viewer,
      )
      const busy = matches.find((m) => holdsCourt(m) && [...m.teamA, ...m.teamB].includes(r.id))
      return {
        id: r.id,
        name: person.name,
        shortName: person.nickname || publicFirstName(person.name),
        pictureUrl: person.pictureUrl,
        level: r.level ?? null,
        games: countedGames(r.id, matches),
        playingOn: busy ? courtNames(busy, courts) : null,
        restMinutes: waitMinutes(r, matches, session.startedAt),
      }
    })
  return {
    viewerRosterId: own?.id ?? null,
    viewerPictureUrl: own
      ? publicPerson(
          state,
          own.clubPlayerId,
          { fullName: own.nameSnapshot, nickname: own.nicknameSnapshot ?? null },
          viewer,
        ).pictureUrl
      : null,
    minimum: session.minimumGames,
    allowedFormats: allowedRequestFormats(session),
    players,
  }
}

/**
 * Q-PUBLIC-JOIN: a pending SessionJoinRequest in the Q03 join-request domain. Rejected when
 * requests are off, the session is finished or invalid, or the guest is offline (sending needs
 * internet). The mock remembers the request id for this page visit; real mode keeps the
 * visitor's receipt in an httpOnly cookie, so a reload keeps it.
 */
export async function sendJoinRequest(slug: string, input: SendJoinRequestInput) {
  if (isRealDataMode()) return realSendJoinRequest(slug, input)
  const session = sessionBySlug(mockStore.getSnapshot() as MockState, slug)
  const outcome = await submitJoinRequest({
    sessionId: session.id,
    name: input.name,
    nickname: input.nickname ?? undefined,
    phone: input.phone ?? undefined,
    statedBand: input.statedBand,
    placement: input.placement,
  })
  myRequests.set(slug, {
    generation: mockStore.getGeneration(),
    requestId: outcome.data.requestId,
  })
  return outcome
}

/** This visitor's request status: pending, confirmed (slot or waitlist #N) or declined. */
export async function getMyJoinRequest(slug: string): Promise<MyJoinRequest | null> {
  if (isRealDataMode()) return realGetMyJoinRequest(slug)
  await delay()
  const mine = myRequests.get(slug)
  if (!mine || mine.generation !== mockStore.getGeneration()) return null
  const { state } = serverState()
  const r = state.joinRequests.find((x) => x.id === mine.requestId)
  if (!r) return null
  const waitlist = state.waitlist
    .filter((w) => w.sessionId === r.sessionId)
    .sort((a, b) => a.addedAt - b.addedAt)
  const index =
    r.status === 'confirmed' && r.clubPlayerId
      ? waitlist.findIndex((w) => w.clubPlayerId === r.clubPlayerId)
      : -1
  return {
    requestId: r.id,
    name: r.name,
    status: r.status,
    waitlistPosition: index >= 0 ? index + 1 : null,
    placement: r.placement,
  }
}

/**
 * Stats · last 90 days for the participant profile card (#731), by the RTR ID the signed-in read
 * gave: games, wins, losses and win rate over the rank window, or null ("No games yet"). Signed-in
 * Players only. An always-private player's stats are refused to everyone but themselves. Real mode
 * reads the Player app's `/api/rtr-ids/<RTR>/stats` with the Player cookie (same-site, #687).
 */
export async function getParticipantStats(
  rtrId: string,
  viewerPlayerId: string | null,
  signal?: AbortSignal,
): Promise<ParticipantStats | null> {
  if (isRealDataMode()) {
    const origin = playerOrigin(location.origin)
    if (!origin) throw new MockError('retryable', "Couldn't load these stats. Try again.")
    const response = await fetch(`${origin}/api/rtr-ids/${encodeURIComponent(rtrId)}/stats`, {
      credentials: 'include',
      cache: 'no-store',
      signal,
    })
    if (response.status === 404) return null
    if (response.status === 401 || response.status === 403)
      throw new MockError('permission', 'Sign in with ROTRA Player to see this.')
    if (!response.ok) throw new MockError('retryable', "Couldn't load these stats. Try again.")
    return ((await response.json()) as { stats: ParticipantStats | null }).stats
  }
  await delay()
  const { state } = serverState()
  if (!viewerPlayerId) throw new MockError('permission', 'Sign in with ROTRA Player to see this.')
  requireSignedInPlayer(state, viewerPlayerId)
  const player = state.players.find((p) => p.rtrId === rtrId.trim().toUpperCase())
  if (!player) return null
  if (player.id !== viewerPlayerId && isAlwaysPrivatePlayer(player.id))
    throw new MockError('permission', PROFILE_PRIVATE_MESSAGE)
  // Mock histories are dated from the fixture clock, like rank.
  return recentGameStats(playerProjection().games[player.id] ?? [], PLAYER_FIXTURE_NOW)
}

/** Mock server projection, identity supplied only by the Player-hosted mock session route. */
export function mockPlayerSessionAccess(slug: string, playerId: string): PlayerSessionAccess {
  const { state, ...sync } = serverState()
  const session = sessionBySlug(state, slug)
  const roster = state.roster.filter((entry) => entry.sessionId === session.id)
  const linked = new Set(
    state.clubPlayers.filter((entry) => entry.playerId === playerId).map((entry) => entry.id),
  )
  const fullRoster = roster.some((entry) => linked.has(entry.clubPlayerId))
  const page = project(state, slug, sync, { fullRoster })
  const byId = new Map(roster.map((entry) => [entry.id, entry]))
  const team = (ids: string[]) =>
    ids.map((id) => {
      const entry = byId.get(id)
      return { name: maskPublicName(entry?.nameSnapshot ?? ''), level: entry?.level ?? null }
    })
  const slot = playerSlot(state, session, playerId)
  const waitlist = state.waitlist
    .filter((w) => w.sessionId === session.id)
    .sort((a, b) => a.addedAt - b.addedAt)
  const latest = state.joinRequests
    .filter((r) => r.sessionId === session.id && r.playerId === playerId)
    .sort((a, b) => b.requestedAt - a.requestedAt)[0]
  // As on the server: a confirmed request whose place was removed is history, not a status.
  const request =
    latest?.status === 'confirmed' && !slot.roster && !slot.waitlist ? undefined : latest
  const waitIndex =
    request?.status === 'confirmed' && request.clubPlayerId
      ? waitlist.findIndex((w) => w.clubPlayerId === request.clubPlayerId)
      : -1
  return {
    ...sessionPageAccountOf(state, playerId),
    inSession: !!slot.roster || !!slot.waitlist,
    isClubMember: !!memberClubPlayer(state, session.clubId, playerId),
    waitlistPosition: slot.waitlist
      ? waitlist.findIndex((w) => w.id === slot.waitlist?.id) + 1 || null
      : null,
    joinRequest: request
      ? {
          requestId: request.id,
          name: request.name,
          status: request.status,
          waitlistPosition: waitIndex >= 0 ? waitIndex + 1 : null,
          placement: request.placement,
        }
      : null,
    fullRoster,
    participants: page.participants,
    queue: state.matches
      .filter((match) => match.sessionId === session.id && match.state === 'waiting')
      .sort((a, b) => a.queuePosition - b.queuePosition)
      .map((match) => ({
        matchNo: match.matchNo,
        format: match.format,
        teamA: team(match.teamA),
        teamB: team(match.teamB),
      })),
  }
}
