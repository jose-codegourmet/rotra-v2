import { phoneField } from '@rotra/schema/phone'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { directoryPlayers, leaderboardLevels } from '../fixtures/players'
import { MockError } from '../mock/errors'
import type { MockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import { PLAYING_LEVELS, type PlayingLevel } from '../player/player.types'
import { isRealDataMode } from '../real/mode'
import { realAddDirectoryPlayerToClub, realAddNewSavedPlayer } from '../real/queue'
import { levelLabel } from '../session-roster/sessionRoster.rules'
import type { ClubPlayer, JoinedVia } from './clubPlayer.types'

function fail(text: string): never {
  throw new MockError('permission', text)
}

/** A directory suggestion's level is its leaderboard level. */
export function directoryLevel(playerId: string): PlayingLevel {
  return leaderboardLevels[playerId] ?? 'beginner_low'
}

/**
 * Creates the saved club player for a new player: a guest without a phone, pending with one (the
 * phone is kept private). Shared by the session Add player and Saved players › Add player.
 */
export function createClubPlayer(
  s: MockState,
  input: { name: string; nickname?: string | null; phone?: string | null },
  playingLevel: PlayingLevel | null = null,
): ClubPlayer {
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
    playingLevel,
    addedAt: Date.now(),
    joinedVia: 'added',
  }
  s.clubPlayers.push(p)
  if (parsed?.success) s.privatePhones[p.id] = parsed.data
  return p
}

/**
 * The saved club player for a Player Information profile, created (registered) when missing.
 * `joinedVia` marks a new row only: the join-request confirm path (Q17/Q18) passes `session`.
 */
export function clubPlayerForProfile(
  s: MockState,
  profileId: string,
  playingLevel: PlayingLevel | null = directoryLevel(profileId),
  joinedVia: JoinedVia = 'added',
) {
  const profile = directoryPlayers.find((p) => p.id === profileId)
  if (!profile || s.adminPlayerRecords[profile.id]?.archivedAt) fail('Player not available.')
  const saved = s.clubPlayers.find((p) => p.playerId === profile.id && p.clubId === DEMO_CLUB_ID)
  if (saved) return { player: saved, created: false }
  const player: ClubPlayer = {
    id: crypto.randomUUID(),
    clubId: DEMO_CLUB_ID,
    playerId: profile.id,
    fullName: profile.fullName,
    nickname: profile.nickname,
    identity: 'registered',
    playingLevel,
    addedAt: Date.now(),
    joinedVia,
  }
  s.clubPlayers.push(player)
  return { player, created: true }
}

const alreadySaved = (name: string) =>
  new MockError('conflict', `${name} is already in your saved players.`)

function savedLevel(level: PlayingLevel | null | undefined) {
  if (level != null && !PLAYING_LEVELS.includes(level)) fail('Choose a level for this club.')
  return level ?? null
}

/**
 * Saved players › Add player › New player: saves a guest (no phone) or pending player (phone) to the
 * club's saved players with the level, if one was chosen. Never touches a session. A phone that
 * matches a saved player's private phone is refused; same-name guests are never merged.
 */
export function addNewSavedPlayer(input: {
  name: string
  nickname?: string | null
  phone?: string | null
  level?: PlayingLevel | null
}) {
  // Real data: a level is only recorded with a session, so the player is saved without one.
  if (isRealDataMode()) return realAddNewSavedPlayer(input)
  return queueMutation({ area: 'Roster', clubAccess: true }, (s) => {
    const level = savedLevel(input.level)
    const phone = input.phone?.trim() ? phoneField.safeParse(input.phone) : null
    if (phone?.success) {
      const match = s.clubPlayers.find(
        (p) => p.clubId === DEMO_CLUB_ID && s.privatePhones[p.id] === phone.data,
      )
      if (match) throw alreadySaved(match.fullName)
    }
    const p = createClubPlayer(s, input, level)
    return {
      data: { clubPlayerId: p.id },
      text:
        p.identity === 'guest'
          ? `${p.fullName} saved as a guest`
          : `${p.fullName} saved · profile lookup after sync`,
    }
  })
}

/**
 * Saved players › Add player › Player Information: saves a registered profile to the club's saved
 * players. A profile that is already saved is refused. The level defaults to the Player Information
 * suggestion; null saves no level yet.
 */
export function addDirectoryPlayerToClub(input: { playerId: string; level?: PlayingLevel | null }) {
  if (isRealDataMode()) return realAddDirectoryPlayerToClub(input)
  return queueMutation({ area: 'Roster', onlineOnly: true, clubAccess: true }, (s) => {
    const level =
      input.level === undefined ? directoryLevel(input.playerId) : savedLevel(input.level)
    const { player, created } = clubPlayerForProfile(s, input.playerId, level)
    if (!created) throw alreadySaved(player.fullName)
    const name = player.nickname || player.fullName.split(' ')[0]
    return {
      data: { clubPlayerId: player.id },
      text: `${name} saved${level ? ` · ${levelLabel(level)}` : ''}`,
    }
  })
}
