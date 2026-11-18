import type { ClubNicknameFormInput } from './ClubNicknameForm.schema'

/** Prefilled with the player's current club nickname, or empty when there is none. */
export function clubNicknameDefaultValues(current: string | null): ClubNicknameFormInput {
  return { nickname: current ?? '' }
}
