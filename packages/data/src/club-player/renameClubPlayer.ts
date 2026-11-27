import { FULL_NAME_TOO_SHORT_MESSAGE, fullNameSchema } from '@rotra/schema/name'
import { MockError } from '../mock/errors'
import { isRealDataMode } from '../real/mode'
import { accepted, realRenameClubPlayer } from '../real/queue'

export type RenameClubPlayerInput = {
  clubPlayerId: string
  /** The full name as typed in Edit player; the save collapses spaces and needs 2–60 characters */
  fullName: string
  /** The nickname as typed; an empty string removes it and the full name shows */
  nickname: string
}

/**
 * Edit player › Save changes for a guest or unclaimed player (D-2026-11-26-07, rotra-queue.html
 * saveEditLive()): the club renames a profile it made and sets its one nickname. An online command,
 * like Edit details. A name under 2 characters is refused with the field error on `fullName`.
 *
 * Real mode renames the saved player (`club_players.display_name`, `nickname`) and their live
 * roster entries in prepared and active sessions; a registered player is refused by the server.
 * Mock mode keeps the contract only: the same check and message, the mock store is not updated
 * (owner decision), so the mock screens keep the old name.
 */
export async function renameClubPlayer(input: RenameClubPlayerInput) {
  if (isRealDataMode()) return realRenameClubPlayer(input)
  const parsed = fullNameSchema.safeParse(input.fullName)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? FULL_NAME_TOO_SHORT_MESSAGE
    throw new MockError('permission', message, { fullName: message })
  }
  const nickname = input.nickname.replace(/\s+/g, ' ').trim() || null
  return accepted(
    { clubPlayerId: input.clubPlayerId, fullName: parsed.data, nickname },
    `Details saved · ${parsed.data}`,
  )
}
