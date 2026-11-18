import type { MockState } from '../mock/store'
import { queueMasterName } from '../session-roster/sessionRoster.rules'
import type { ClubPlayer } from './clubPlayer.types'

/**
 * The club nickname of a saved player (D-2026-11-18-02): only a registered player carries one, and
 * only the club's own record is read, so another club never sees it. Null when empty or none.
 */
export function clubNicknameOf(state: Pick<MockState, 'clubPlayers'>, clubPlayerId: string) {
  const saved = state.clubPlayers.find((p) => p.id === clubPlayerId)
  return saved?.identity === 'registered' ? saved.clubNickname?.trim() || null : null
}

/**
 * A roster row with the club nickname of its saved player, for `queueMasterName`. Used by Queue
 * Master reads and toasts only; public and player reads never call it.
 */
export function withClubNickname<T extends { clubPlayerId: string }>(
  state: Pick<MockState, 'clubPlayers'>,
  row: T,
): T & { clubNickname: string | null } {
  return { ...row, clubNickname: clubNicknameOf(state, row.clubPlayerId) }
}

/** `queueMasterName` for a saved player record: the club nickname, else nickname, else first name. */
export function savedPlayerName(
  player: Pick<ClubPlayer, 'fullName' | 'nickname' | 'identity' | 'clubNickname'>,
) {
  return queueMasterName({
    nameSnapshot: player.fullName,
    nicknameSnapshot: player.nickname,
    clubNickname: player.identity === 'registered' ? player.clubNickname : null,
  })
}
