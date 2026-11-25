import type { HandicapSpot } from '@rotra/data/session-roster/handicap'
import { clubNicknameDefaultValues } from '@rotra/ui/forms/club-nickname-form/default-values'
import type { EditLivePlayerFormInput } from './EditLivePlayerSheet.schema'

/** Prefilled with the club nickname, the shown games played, presence and tonight's handicap spots. */
export function editLivePlayerDefaultValues(current: {
  clubNickname: string | null
  games: number
  present: boolean
  spots?: readonly HandicapSpot[]
}): EditLivePlayerFormInput {
  return {
    ...clubNicknameDefaultValues(current.clubNickname),
    games: current.games,
    present: current.present,
    spots: [...(current.spots ?? [])],
  }
}
