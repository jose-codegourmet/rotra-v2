import portraits from '../fixtures/playerPortraits.json'
import { requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore } from '../mock/store'
import { slotCapacity } from '../queue-session/queueSession.rules'
import { submitJoinRequest } from '../session-roster/mutations'
import type {
  MyJoinRequest,
  PublicSessionPage,
  PublicSessionResults,
  SendJoinRequestInput,
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

/** Only the published slides; Off Day only when that publication explicitly included it. */
function publishedResults(state: MockState, sessionId: string): PublicSessionResults | null {
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

function project(
  state: MockState,
  slug: string,
  sync: { hasPendingChanges: boolean; lastSyncedAt: number },
): PublicSessionPage {
  const s = sessionBySlug(state, slug)
  const club = state.clubs.find((c) => c.id === s.clubId)
  if (!club) throw new PublicSessionNotFoundError()
  const courts = state.courts.filter((c) => c.sessionId === s.id && !c.removedAt)
  const roster = state.roster
    .filter((r) => r.sessionId === s.id)
    .sort((a, b) => a.confirmedAt - b.confirmedAt)
  const clubPlayer = (id: string) => state.clubPlayers.find((p) => p.id === id)
  const capacity = slotCapacity(courts.length, s.playersPerCourt)
  const status = s.state === 'finalizing' ? 'active' : s.state
  return {
    slug: s.publicSlug,
    status,
    title: s.title,
    start: s.scheduledStartAt,
    end: s.scheduledEndAt,
    club: { name: club.name, initials: club.initials, logoUrl: club.logoUrl },
    venue: { name: s.venueName, address: s.venueAddress || null },
    courts: courts.map((c) => c.label),
    formats: { singles: s.allowSingles, doubles: s.allowDoubles },
    mode: s.sessionMode,
    minimum: s.minimumGames,
    notes: s.notes || null,
    participants: roster.map((r) => {
      const p = clubPlayer(r.clubPlayerId)
      const hasRotraProfile = p?.identity === 'registered' || p?.identity === 'unclaimed'
      return {
        name: r.nameSnapshot,
        pictureUrl: hasRotraProfile && p?.playerId ? (pictures[p.playerId] ?? null) : null,
        hasRotraProfile,
      }
    }),
    waitlist: state.waitlist
      .filter((w) => w.sessionId === s.id)
      .sort((a, b) => a.addedAt - b.addedAt)
      .map((w) => clubPlayer(w.clubPlayerId)?.fullName ?? ''),
    openSlots: Math.max(0, capacity - roster.length),
    slotBudget: capacity,
    acceptJoinRequests: s.acceptJoinRequests,
    lastSyncedAt: sync.lastSyncedAt,
    hasPendingChanges: sync.hasPendingChanges,
    results: status === 'completed' ? publishedResults(state, s.id) : null,
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
  await delay()
  if (options?.visitor) requireOnline()
  const { state, ...sync } = serverState()
  return project(state, slug, sync)
}

/**
 * Q-PUBLIC-JOIN: a pending SessionJoinRequest in the Q03 join-request domain. Rejected when
 * requests are off, the session is finished or invalid, or the guest is offline (sending needs
 * internet). The request id is remembered for this page visit.
 */
export async function sendJoinRequest(slug: string, input: SendJoinRequestInput) {
  const session = sessionBySlug(mockStore.getSnapshot() as MockState, slug)
  const outcome = await submitJoinRequest({
    sessionId: session.id,
    name: input.name,
    nickname: input.nickname ?? undefined,
    phone: input.phone ?? undefined,
    statedBand: input.statedBand,
  })
  myRequests.set(slug, {
    generation: mockStore.getGeneration(),
    requestId: outcome.data.requestId,
  })
  return outcome
}

/** This visitor's request status: pending, confirmed (slot or waitlist #N) or declined. */
export async function getMyJoinRequest(slug: string): Promise<MyJoinRequest | null> {
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
  }
}
