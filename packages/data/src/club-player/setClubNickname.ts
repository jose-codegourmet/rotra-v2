import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { MockError } from '../mock/errors'
import { queueMutation } from '../mock/transaction'
import { isCurrentRecord } from '../player/unclaimed'
import { isRealDataMode } from '../real/mode'
import { realSetClubNickname } from '../real/queue'

export type SetClubNicknameInput = {
  clubPlayerId: string
  /** The trimmed nickname as typed in the Club nickname sheet; an empty string removes it */
  clubNickname: string
}

const NOT_REGISTERED = 'Only a registered player has a club nickname.'

/**
 * Club nickname sheet › Save nickname (D-2026-11-18-02, rotra-queue.html saveClubNick()): sets,
 * changes or clears the club's own nickname for a registered saved player. Queued like the other
 * Saved players edits, so it works offline. The toast tells which happened: "Club nickname saved ·
 * NAME", "Club nickname removed · NAME" (it had one, the field is now empty) or "No club nickname ·
 * NAME" (it had none and still has none). NAME is the player's full name, as in the mockup.
 *
 * Real mode (P15.8) stores it on the club's saved-player record (`club_players.nickname`) and the
 * server returns the same text.
 */
export function setClubNickname(input: SetClubNicknameInput) {
  if (isRealDataMode()) return realSetClubNickname(input)
  return queueMutation({ area: 'Roster', clubAccess: true }, (s) => {
    const row = s.clubPlayers.find(
      (p) => p.id === input.clubPlayerId && p.clubId === DEMO_CLUB_ID && isCurrentRecord(p),
    )
    if (!row || (row.playerId && s.adminPlayerRecords[row.playerId]?.archivedAt))
      throw new MockError('permission', 'Player not available.')
    if (row.identity !== 'registered') throw new MockError('permission', NOT_REGISTERED)
    const next = input.clubNickname.trim(),
      had = Boolean(row.clubNickname?.trim()),
      name = s.playerProfiles.find((p) => p.playerId === row.playerId)?.fullName || row.fullName
    row.clubNickname = next || null
    return {
      data: { clubPlayerId: row.id, clubNickname: next || null },
      text: next
        ? `Club nickname saved · ${name}`
        : had
          ? `Club nickname removed · ${name}`
          : `No club nickname · ${name}`,
    }
  })
}
