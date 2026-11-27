import { clubNicknameOf } from '../club-player/clubNickname.rules'
import { genderOf } from '../club-player/gender.rules'
import { sampleForm } from '../match/winChance.rules'
import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { sessionIn } from '../mock/transaction'
import { sessionWeekday } from '../player/player.rules'
import { isRealDataMode } from '../real/mode'
import { realGetSessionNoShows, realGetSessionRoster } from '../real/queue'

/** Operator data; join-request contacts never enter saved-player or public directory projections. */
export async function getSessionRoster(sessionId: string) {
  if (isRealDataMode()) {
    // The No show (cancelled) list is its own query (getSessionNoShows); the roster read keeps its shape.
    const { noShows: _noShows, ...read } = await realGetSessionRoster(sessionId)
    return read
  }
  await delay()
  const state = readMockState()
  const session = sessionIn(state, sessionId)
  // Same rule as `ClubSessionPlayerSummary` in projections: a prior finalized session at this club.
  const priorSessionIds = new Set(
    state.sessions
      .filter(
        (other) =>
          other.id !== sessionId &&
          other.clubId === session.clubId &&
          other.state === 'completed' &&
          other.finalizedAt != null,
      )
      .map((other) => other.id),
  )
  const returning = new Set(
    state.roster.filter((row) => priorSessionIds.has(row.sessionId)).map((row) => row.clubPlayerId),
  )
  const guestIds = new Set(
    state.clubPlayers
      .filter((p) => p.identity === 'guest' || p.identity === 'pending')
      .map((p) => p.id),
  )
  return {
    roster: state.roster
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.confirmedAt - b.confirmedAt)
      .map((r) => ({
        ...r,
        hasPlayedAtClubBefore: returning.has(r.clubPlayerId),
        // The Queue Master's own read only: public and player reads never get the club nickname.
        clubNickname: clubNicknameOf(state, r.clubPlayerId),
        gender: genderOf(state, r.clubPlayerId),
        // Win chance inputs (D-2026-11-27-02): sample history; a guest has none.
        form: guestIds.has(r.clubPlayerId)
          ? undefined
          : sampleForm(r.clubPlayerId, sessionWeekday(new Date(session.scheduledStartAt))),
      })),
    waitlist: state.waitlist
      .filter((w) => w.sessionId === sessionId)
      .sort((a, b) => a.addedAt - b.addedAt),
    // The requesting Player's own picture, read live from their profile (as real mode does); guests have none.
    joinRequests: state.joinRequests
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.requestedAt - b.requestedAt)
      .map((r) => {
        const profile = r.playerId
          ? state.playerProfiles.find((p) => p.playerId === r.playerId)
          : undefined
        return { ...r, picture: profile?.picture ?? null, pictureName: profile?.fullName ?? null }
      }),
  }
}

/** No show (cancelled) players of a live session, oldest first (real mode: `no_show_at`, #839). */
export async function getSessionNoShows(sessionId: string) {
  if (isRealDataMode()) return realGetSessionNoShows(sessionId)
  await delay()
  return (readMockState().noShows ?? [])
    .filter((n) => n.sessionId === sessionId)
    .sort((a, b) => a.noShowAt - b.noShowAt)
}
