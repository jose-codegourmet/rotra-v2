import { parsePlayerPicture } from '../player/picture'
import type { ClubPlayer, ClubPlayerPictureState, JoinedVia } from './clubPlayer.types'

/** Saved players card line and profile dialog **Joined** row (D-2026-11-09-06). */
export const JOINED_VIA_TEXT: Record<JoinedVia, string> = {
  club: 'Joined via club link',
  session: 'Joined via session link',
  added: 'Added by the club',
}

/** Missing (older rows, or real data that does not send it yet) reads as Added by the club. */
export const joinedViaOf = (player: { joinedVia?: JoinedVia }): JoinedVia =>
  player.joinedVia ?? 'added'

/** Only the club's own guests, pending guests and unclaimed profiles take a club-set picture. */
export const takesClubPicture = (player: Pick<ClubPlayer, 'identity'>) =>
  player.identity !== 'registered'

/**
 * The picture that shows for a saved player. A registered player always shows their own profile
 * picture. A guest or unclaimed player shows the club-set picture once the club chose one
 * (initials included), else the profile picture (an unclaimed profile's sample) or initials.
 */
export function clubPictureState(
  player: Pick<ClubPlayer, 'identity' | 'picture'>,
  profilePicture: string | null,
): ClubPlayerPictureState {
  const own = takesClubPicture(player) ? player.picture : undefined
  if (!own) {
    const parsed = parsePlayerPicture(profilePicture)
    return {
      kind: parsed.kind,
      reference: parsed.kind === 'initials' ? null : profilePicture,
      characterId: parsed.kind === 'character' ? parsed.id : null,
      previousSrc: null,
    }
  }
  const previousSrc = own.previousSrc ?? null
  if (own.kind === 'photo' && own.src)
    return { kind: 'photo', reference: own.src, characterId: null, previousSrc }
  if (own.kind === 'character' && own.characterId !== undefined)
    return {
      kind: 'character',
      reference: `character:${own.characterId}`,
      characterId: own.characterId,
      previousSrc,
    }
  return { kind: 'initials', reference: null, characterId: null, previousSrc }
}
