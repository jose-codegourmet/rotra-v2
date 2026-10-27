import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { clubPlayers as fixturePlayers } from '../fixtures/players'
import { requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { requireClubAccess } from '../mock/transaction'
import type { ClubPlayer } from './clubPlayer.types'
export type ClubPlayerFilters = {
  search?: string
  band?: string
  city?: string
  added?: 'any' | '7' | '30' | '90' | 'older'
  account?: 'all' | 'registered' | 'unclaimed' | 'guest' | 'pending'
  rightNow?: 'all' | 'playing' | 'waiting' | 'session'
}
export function registeredCity(rtrId: string | null) {
  const code = /^RTR-[A-Z]{2}-([A-Z]{3})-/.exec(rtrId ?? '')?.[1]
  return code
    ? ({ CEB: 'Cebu City', MNL: 'Manila', DVO: 'Davao City', ILO: 'Iloilo City' }[code] ?? code)
    : null
}
function addedAt(player: ClubPlayer) {
  if (player.addedAt) return player.addedAt
  const index = fixturePlayers.findIndex((p) => p.id === player.id)
  let h = 2166136261
  for (const letter of `p${index + 1}`) {
    h ^= letter.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  return date.getTime() - (((h >>> 0) % 300) + 2) * 86400000
}
export function clubPlayerView(state: MockState, player: ClubPlayer) {
  const index = fixturePlayers.findIndex((p) => p.id === player.id),
    profile = state.players.find((p) => p.id === player.playerId)
  return {
    ...player,
    displayName: player.fullName,
    rtrId: profile?.rtrId ?? null,
    suggestion: player.playingLevel,
    phoneHidden: index === 0 || index === 3,
    hasPhone: player.identity !== 'guest',
    sessionsHere: [6, 7, 5, 8, 6, 2, 5, 1, 6, 5, 9, 3, 5, 4, 0, 6, 1, 5, 6, 0][index] ?? 0,
    addedAt: addedAt(player),
  }
}
export async function getClubPlayers(filters: ClubPlayerFilters = {}) {
  await delay()
  requireClubAccess()
  const state = readMockState(),
    live = state.sessions.find((s) => s.clubId === DEMO_CLUB_ID && s.state === 'active'),
    q = filters.search?.trim().toLocaleLowerCase() ?? ''
  const rows = state.clubPlayers
    .filter((p) => p.clubId === DEMO_CLUB_ID)
    .map((p) => clubPlayerView(state, p))
    .filter((p) => {
      const roster = state.roster.find((r) => r.sessionId === live?.id && r.clubPlayerId === p.id)
      const playing =
        roster &&
        state.matches.some(
          (m) =>
            m.state === 'active' &&
            m.sessionId === live?.id &&
            [...m.teamA, ...m.teamB].includes(roster.id),
        )
      const age = Date.now() - p.addedAt
      return (
        (!q || [p.fullName, p.nickname, p.rtrId].some((v) => v?.toLocaleLowerCase().includes(q))) &&
        (!filters.band ||
          filters.band === 'all' ||
          (p.suggestion?.split('_')[0] ?? 'none') === filters.band) &&
        (!filters.city ||
          filters.city === 'all' ||
          (registeredCity(p.rtrId) ?? 'none') === filters.city) &&
        (!filters.account ||
          filters.account === 'all' ||
          (p.identity === 'pending' ? 'guest' : p.identity) === filters.account) &&
        (!filters.added ||
          filters.added === 'any' ||
          (filters.added === 'older'
            ? age > 90 * 86400000
            : age <= Number(filters.added) * 86400000)) &&
        (!filters.rightNow ||
          filters.rightNow === 'all' ||
          (!!roster &&
            (filters.rightNow === 'session' ||
              (filters.rightNow === 'playing' && !!playing) ||
              (filters.rightNow === 'waiting' && roster.present && !playing))))
      )
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
  const groups: Record<string, typeof rows> = {}
  for (const row of rows) {
    const first = row.fullName.trim().charAt(0).toUpperCase(),
      key = /[A-Z]/.test(first) ? first : '#'
    groups[key] ??= []
    groups[key].push(row)
  }
  return { players: rows, groups }
}
export async function getClubPlayer(id: string) {
  await delay()
  requireClubAccess()
  const state = readMockState(),
    player = state.clubPlayers.find((p) => p.id === id && p.clubId === DEMO_CLUB_ID)
  if (!player) throw new MockError('permission', 'Player not available.')
  return clubPlayerView(state, player)
}
export async function createPlayerInvite(clubPlayerId: string) {
  requireOnline()
  const player = await getClubPlayer(clubPlayerId)
  if (!['guest', 'unclaimed'].includes(player.identity))
    throw new MockError('permission', 'This player does not need an invite.')
  let hash = 2166136261
  for (const letter of `${player.id}${player.fullName}`) {
    hash ^= letter.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  const code = (hash >>> 0).toString(36).toUpperCase().padStart(7, 'X').slice(0, 7)
  return {
    url: `https://rotra.example/join/${code}`,
    message: 'Invite link ready',
  }
}
