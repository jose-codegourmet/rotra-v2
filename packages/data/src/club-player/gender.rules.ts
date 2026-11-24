import type { MockState } from '../mock/store'
import type { Gender } from './clubPlayer.types'

/**
 * The gender of a club's saved player, or null when none was given (D-2026-11-19-01). Optional on
 * every record: a missing field reads as not given.
 */
export function genderOf(state: Pick<MockState, 'clubPlayers'>, clubPlayerId: string): Gender | null {
  return state.clubPlayers.find((p) => p.id === clubPlayerId)?.gender ?? null
}

/** A roster row with its saved player's gender, for match categories. Queue Master reads only. */
export function withGender<T extends { clubPlayerId: string }>(
  state: Pick<MockState, 'clubPlayers'>,
  row: T,
): T & { gender: Gender | null } {
  return { ...row, gender: genderOf(state, row.clubPlayerId) }
}
