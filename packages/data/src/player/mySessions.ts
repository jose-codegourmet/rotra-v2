import { getSession } from '../auth/fetchers'
import { JOSE_PLAYER_ID } from '../fixtures/players'
import { requireOnline } from '../mock/bridge'
import { MockError, NotConnectedError } from '../mock/errors'
import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { isRealDataMode } from '../real/mode'
import { playerProjection } from './projection'
/** Matches existing sessionPageUrl fixtures; replace the origin before real-mode rollout. */
export const PLAYER_QUEUE_ORIGIN = 'http://localhost:9000'
export const queueSessionUrl = (slug: string) =>
  `${PLAYER_QUEUE_ORIGIN}/s/${encodeURIComponent(slug)}`
export type MySession = {
  id: string
  title: string
  subtitle: string
  href: string
  status: 'live' | 'confirmed' | 'waitlist' | 'requested'
  waitlistPosition?: number
}
export type MyFinishedSession = { id: string; title: string; subtitle: string; published: boolean }
const date = (at: number | string) =>
  new Date(at).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
  })
export async function getMySessions(signal?: AbortSignal) {
  if (isRealDataMode()) throw new NotConnectedError()
  await delay(200, signal)
  requireOnline()
  const account = (await getSession('player'))?.account
  if (!account) throw new MockError('permission', 'Sign in to see your sessions.')
  const state = readMockState()
  const playerRows = new Set(
    state.clubPlayers.filter((p) => p.playerId === account.id).map((p) => p.id),
  )
  const sessions: MySession[] = state.sessions
    .filter((s) => ['prepared', 'active'].includes(s.state))
    .flatMap((s) => {
      const roster = state.roster.some(
        (p) => p.sessionId === s.id && playerRows.has(p.clubPlayerId),
      )
      const waitlist = state.waitlist
        .filter((p) => p.sessionId === s.id)
        .sort((a, b) => a.addedAt - b.addedAt)
      const index = waitlist.findIndex((p) => playerRows.has(p.clubPlayerId))
      const requested = state.joinRequests.some(
        (r) =>
          r.sessionId === s.id &&
          r.status === 'pending' &&
          !!r.clubPlayerId &&
          playerRows.has(r.clubPlayerId),
      )
      if (!roster && index < 0 && !requested) return []
      const club = state.clubs.find((c) => c.id === s.clubId)
      const time = (at: number) =>
        new Date(at).toLocaleTimeString('en-PH', {
          timeZone: 'Asia/Manila',
          hour: 'numeric',
          minute: '2-digit',
        })
      return [
        {
          id: s.id,
          title: s.title,
          subtitle: `${date(s.scheduledStartAt)} · ${time(s.scheduledStartAt)}–${time(s.scheduledEndAt)} · ${club?.name ?? ''}`,
          href: queueSessionUrl(s.publicSlug),
          status: roster
            ? s.state === 'active'
              ? ('live' as const)
              : ('confirmed' as const)
            : index >= 0
              ? ('waitlist' as const)
              : ('requested' as const),
          waitlistPosition: index >= 0 ? index + 1 : undefined,
        },
      ]
    })
  // The three prototype rows are player-owned samples; Queue fixture state is never changed here.
  if (account.id === JOSE_PLAYER_ID) {
    if (sessions[0]) {
      sessions[0].status = 'live'
      sessions[0].subtitle = `${date(Date.now())} · 6:00–9:00 PM · Lahug Smash Club`
    }
    sessions.push(
      {
        id: 'my-thursday',
        title: 'Thursday Open Play',
        subtitle: `${date(Date.now() + 3 * 86400000)} · 7:00–10:00 PM · Lahug Smash Club`,
        href: queueSessionUrl('s-thu-open'),
        status: 'confirmed',
      },
      {
        id: 'my-friday',
        title: 'Friday Night Smash',
        subtitle: `${date(Date.now() + 5 * 86400000)} · 8:00–11:00 PM · IT Park Badminton Club`,
        href: queueSessionUrl('s-fri-smash'),
        status: 'waitlist',
        waitlistPosition: 2,
      },
    )
  }
  const finished: MyFinishedSession[] = (playerProjection().games[account.id] ?? [])
    .slice(0, 2)
    .map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: `${date(s.finishedAt)} · ${s.clubName}`,
      published: !!state.publications[s.id]?.publishedSlides.includes('standings'),
    }))
  const publication = Object.fromEntries(
    (playerProjection().games[account.id] ?? []).map((s) => [
      s.id,
      !!state.publications[s.id]?.publishedSlides.includes('standings'),
    ]),
  )
  return { sessions, finished, publication }
}
