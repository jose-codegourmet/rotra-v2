import type { HandicapSpot } from '@rotra/data/session-roster/handicap'
import { clubNicknameDefaultValues } from '@rotra/ui/forms/club-nickname-form/default-values'
import type { EditLivePlayerFormInput } from './EditLivePlayerSheet.schema'

/**
 * Prefilled with the full name (left out for a registered player: it is read-only), the club
 * nickname, the shown games played, presence and tonight's handicap spots.
 */
export function editLivePlayerDefaultValues(current: {
  /** Unclaimed and guest: the editable full name; omit for registered */
  fullName?: string
  clubNickname: string | null
  games: number
  present: boolean
  spots?: readonly HandicapSpot[]
}): EditLivePlayerFormInput {
  return {
    ...(current.fullName === undefined ? {} : { fullName: current.fullName }),
    ...clubNicknameDefaultValues(current.clubNickname),
    games: current.games,
    present: current.present,
    spots: [...(current.spots ?? [])],
  }
}
