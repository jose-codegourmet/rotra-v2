import { clubNicknameDefaultValues } from '@rotra/ui/forms/club-nickname-form/default-values'
import type { EditLivePlayerFormInput } from './EditLivePlayerSheet.schema'

/** Prefilled with the player's club nickname, their shown games played and whether they are present. */
export function editLivePlayerDefaultValues(current: {
  clubNickname: string | null
  games: number
  present: boolean
}): EditLivePlayerFormInput {
  return {
    ...clubNicknameDefaultValues(current.clubNickname),
    games: current.games,
    present: current.present,
  }
}
