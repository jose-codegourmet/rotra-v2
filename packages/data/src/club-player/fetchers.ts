import { appOrigin } from '../app-origins'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { clubPlayers as fixturePlayers } from '../fixtures/players'
import { requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { requireClubAccess } from '../mock/transaction'
import { isCurrentRecord, isDetailsRequired } from '../player/unclaimed'
import { resolveMockProfileBanner } from '../profile-banner/fetchers'
import { isRealDataMode } from '../real/mode'
import { realCreatePlayerInvite, realGetClubPlayers } from '../real/queue'
import type { ClubPlayer } from './clubPlayer.types'
import { clubPictureState, joinedViaOf } from './clubPlayerPicture.rules'
import { deriveSavedPlayerStats } from './savedPlayerStats.rules'
export type ClubPlayerFilters = {
  search?: string
  band?: string
  city?: string
  added?: 'any' | '7' | '30' | '90' | 'older'
  /** `details` = Details required: an older unclaimed record with a phone and no email */
  account?: 'all' | 'registered' | 'unclaimed' | 'details' | 'guest' | 'pending'
  rightNow?: 'all' | 'playing' | 'waiting' | 'session'
}
export function registeredCity(rtrId: string | null) {
  const code = /^RTR-[A-Z]{2}-([A-Z]{3})-/.exec(rtrId ?? '')?.[1]
  return code
    ? ({ CEB: 'Cebu City', MNL: 'Manila', DVO: 'Davao City', ILO: 'Iloilo City' }[code] ?? code)
    : null
}
function addedAt(player: ClubPlayer) {
  if (player.addedAt !== undefined) return player.addedAt
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
    // The shared entry: a registered player's, or an unclaimed player's (the RTR ID only).
    profile = state.players.find((p) => p.id === player.playerId),
    registered = player.identity === 'registered',
    // A registered player's own name wins over the club's saved copy, so a claim or profile edit
    // shows on every card (#705). Guests and unclaimed players keep what this club entered: an
    // unclaimed player's shared entry may carry another club's version (D-2026-11-16-04).
    own =
      registered && player.playerId
        ? state.playerProfiles.find((p) => p.playerId === player.playerId)
        : undefined,
    fullName = own?.fullName || player.fullName,
    // The banner is public, like the picture; only a registered player has chosen one. Everyone else
    // (and a player with no pick) draws the default Admin sets (D-2026-11-13-03).
    banner = resolveMockProfileBanner(own ? own.bannerId : null),
    account = player.playerId
      ? state.playerAccounts.find((a) => a.playerId === player.playerId)
      : undefined
  return {
    ...player,
    fullName,
    nickname: own ? own.nickname : player.nickname,
    /** The club's own nickname for a registered player (D-2026-11-18-03); null when none */
    clubNickname: registered ? player.clubNickname?.trim() || null : null,
    /** Avatar reference: the club-set picture for a guest or unclaimed player, else their own. */
    picture: clubPictureState(player, own?.picture ?? null).reference,
    joinedVia: joinedViaOf(player),
    pictureName: own ? (profile?.fullName ?? null) : null,
    /** The resolved Profile banner the card draws (the default for guests, unclaimed and no pick) */
    bannerKey: banner.bannerKey as string | null,
    bannerImageUrl: banner.bannerImageUrl,
    displayName: fullName,
    rtrId: profile?.rtrId ?? null,
    suggestion: player.playingLevel,
    phoneHidden: index === 0 || index === 3,
    /** A registered player's phone, or the club's own phone for an unclaimed player */
    hasPhone: registered || Boolean(state.privatePhones[player.id]),
    /** The club has an email for a guest-made-unclaimed or Lookup pending player; never the email itself */
    emailOnFile: !registered && Boolean(account?.email.trim() || state.pendingEmails?.[player.id]),
    /** An older unclaimed record with a phone and no email (D-2026-11-16-04) */
    detailsRequired: isDetailsRequired(player),
    sessionsHere: [6, 7, 5, 8, 6, 2, 5, 1, 6, 5, 9, 3, 5, 4, 0, 6, 1, 5, 6, 0][index] ?? 0,
    addedAt: addedAt(player),
  }
}
export type ClubPlayerView = ReturnType<typeof clubPlayerView>
/** Where a saved player is in the live session, for the "Right now" filter; null when not in it. */
type RightNow = { present: boolean; playing: boolean } | null

/** Applies the Saved players filters and groups by first letter (A–Z, then #). */
function filterAndGroup(
  views: ClubPlayerView[],
  filters: ClubPlayerFilters,
  rightNowOf: (p: ClubPlayerView) => RightNow,
) {
  const q = filters.search?.trim().toLocaleLowerCase() ?? ''
  const rows = views
    .filter((p) => {
      const now = rightNowOf(p)
      const age = Date.now() - p.addedAt
      return (
        (!q ||
          [p.fullName, p.nickname, p.clubNickname, p.rtrId].some((v) =>
            v?.toLocaleLowerCase().includes(q),
          )) &&
        (!filters.band ||
          filters.band === 'all' ||
          (p.suggestion?.split('_')[0] ?? 'none') === filters.band) &&
        (!filters.city ||
          filters.city === 'all' ||
          (registeredCity(p.rtrId) ?? 'none') === filters.city) &&
        (!filters.account ||
          filters.account === 'all' ||
          (filters.account === 'details'
            ? p.detailsRequired
            : (p.identity === 'pending' ? 'guest' : p.identity) === filters.account)) &&
        (!filters.added ||
          filters.added === 'any' ||
          (filters.added === 'older'
            ? age > 90 * 86400000
            : age <= Number(filters.added) * 86400000)) &&
        (!filters.rightNow ||
          filters.rightNow === 'all' ||
          (!!now &&
            (filters.rightNow === 'session' ||
              (filters.rightNow === 'playing' && now.playing) ||
              (filters.rightNow === 'waiting' && now.present && !now.playing))))
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
export async function getClubPlayers(filters: ClubPlayerFilters = {}) {
  // Real data has no live-session view here yet, so "Right now" matches nobody but "All".
  if (isRealDataMode()) return filterAndGroup(await realGetClubPlayers(), filters, () => null)
  await delay()
  requireClubAccess()
  const state = readMockState(),
    live = state.sessions.find((s) => s.clubId === DEMO_CLUB_ID && s.state === 'active')
  const views = state.clubPlayers
    .filter(
      (p) =>
        p.clubId === DEMO_CLUB_ID &&
        isCurrentRecord(p) &&
        (!p.playerId || !state.adminPlayerRecords[p.playerId]?.archivedAt),
    )
    .map((p) => clubPlayerView(state, p))
  return filterAndGroup(views, filters, (p) => {
    const roster = state.roster.find((r) => r.sessionId === live?.id && r.clubPlayerId === p.id)
    if (!roster) return null
    const playing = state.matches.some(
      (m) =>
        m.state === 'active' &&
        m.sessionId === live?.id &&
        [...m.teamA, ...m.teamB].includes(roster.id),
    )
    return { present: roster.present, playing }
  })
}
export async function getClubPlayer(id: string) {
  if (isRealDataMode()) {
    const player = (await realGetClubPlayers()).find((p) => p.id === id)
    if (!player) throw new MockError('permission', 'Player not available.')
    return player
  }
  await delay()
  requireClubAccess()
  const state = readMockState(),
    player = state.clubPlayers.find((p) => p.id === id && p.clubId === DEMO_CLUB_ID)
  if (!player || (player.playerId && state.adminPlayerRecords[player.playerId]?.archivedAt))
    throw new MockError('permission', 'Player not available.')
  return clubPlayerView(state, player)
}

/** The entire club roster, never the page's filtered list. */
export async function getSavedPlayerStats() {
  if (isRealDataMode()) {
    const players = await realGetClubPlayers()
    return deriveSavedPlayerStats(players, players[0]?.clubId ?? '', Date.now())
  }
  await delay()
  requireClubAccess()
  const state = readMockState()
  return deriveSavedPlayerStats(
    state.clubPlayers.filter(
      (p) =>
        isCurrentRecord(p) && (!p.playerId || !state.adminPlayerRecords[p.playerId]?.archivedAt),
    ),
    DEMO_CLUB_ID,
    Date.now(),
  )
}
export async function createPlayerInvite(clubPlayerId: string) {
  requireOnline()
  const player = await getClubPlayer(clubPlayerId)
  if (!['guest', 'unclaimed'].includes(player.identity))
    throw new MockError('permission', 'This player does not need an invite.')
  if (isRealDataMode()) return realCreatePlayerInvite(player)
  // A guest's link is their own, like an unclaimed player's (D-2026-11-18-07). Sample link in mocks.
  let hash = 2166136261
  for (const letter of `${player.id}${player.fullName}`) {
    hash ^= letter.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  const code = (hash >>> 0).toString(36).toUpperCase().padStart(7, 'X').slice(0, 7)
  return {
    url: `${appOrigin('player')}/claim/${code}`,
    message: 'Invite link ready',
  }
}
