import type { PlayerProfile } from '@rotra/data/player/types'
import type { GettingToKnowValues } from '@rotra/schema/getting-to-know'

export const gettingToKnowDefaultValues: GettingToKnowValues = {
  playStyle: '',
  shots: [],
  shotsOther: [],
  favoritePlayer: '',
  favoritePlayerOther: '',
}

/** A saved profile's answers as form values; nothing answered becomes '' and empty lists. */
export function gettingToKnowFromProfile(
  profile: Pick<
    PlayerProfile,
    'playStyle' | 'shots' | 'shotsOther' | 'favoritePlayer' | 'favoritePlayerOther'
  >,
): GettingToKnowValues {
  return {
    playStyle: profile.playStyle ?? '',
    shots: [...(profile.shots ?? [])],
    shotsOther: [...(profile.shotsOther ?? [])],
    favoritePlayer: profile.favoritePlayer ?? '',
    favoritePlayerOther: profile.favoritePlayerOther ?? '',
  }
}
