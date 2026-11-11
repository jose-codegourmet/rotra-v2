import type { ProfileVisibility } from './player.types'

export const PROFILE_LOGIN_MESSAGE = 'Log in with ROTRA to see this profile.'
/** The always-private profile card (P-PROFILE › Profile states): no sign-in button goes with it. */
export const PROFILE_PRIVATE_MESSAGE = 'This player keeps their profile private.'

/** Who is looking at a name. `queueMaster`: the Queue Master of a session the player joined. */
export type NameViewer = { signedIn: boolean; isSelf: boolean; queueMaster?: boolean }

/**
 * D-2026-11-12-01: whether another person sees this player's name masked. Public: never. Private:
 * only visitors who are not signed in. Always private: everyone except the player themselves and the
 * Queue Master of a session they joined. The picture and banner are never masked by this rule.
 */
export function isNameMasked(visibility: ProfileVisibility, viewer: NameViewer) {
  if (viewer.isSelf) return false
  if (visibility === 'always_private') return !viewer.queueMaster
  if (visibility === 'private') return !viewer.signedIn
  return false
}

/** Hide me from Player Information: left out of Queue's Add player › Player Information and RTR ID search. */
export function isListedInDirectory(profile: { hiddenFromDirectory?: boolean } | undefined) {
  return !profile?.hiddenFromDirectory
}
