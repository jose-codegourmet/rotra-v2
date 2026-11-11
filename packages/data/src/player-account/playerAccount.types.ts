import type { ProfileVisibility } from '../player/player.types'

/** The signed-in player's private contacts and privacy settings. Only ever returned to that player. */
export type MyAccount = {
  playerId: string
  /** E.164 */
  phone: string
  email: string
  phoneHidden: boolean
  emailConfirmedAt?: string | null
  /** P-PROFILE-PRIVACY › Profile visibility (D-2026-11-12-01) */
  profileVisibility: ProfileVisibility
  /** P-PROFILE-PRIVACY › Hide me from Player Information */
  hiddenFromDirectory: boolean
  avatarPreviousRef?: string | null
}

export type ClaimLinkStatus = 'valid' | 'claimed' | 'expired' | 'processing'
/**
 * What a registration link shows before the recipient confirms: public identity and a masked phone.
 * A club's own unclaimed record (D-2026-11-11-03) has no global player and no RTR ID yet, so both
 * are null; the RTR ID is given when they register.
 */
export type ClaimLinkPreview = {
  playerId: string | null
  fullName: string
  nickname: string | null
  rtrId: string | null
  picture: string | null
  /** e.g. '+63 918 ••• ••77'; the full number never leaves the mock store in this flow */
  maskedPhone: string
}
/** A club-issued registration (claim) link. Product term: PlayerClaimLink. */
export type ClaimLink = {
  token: string
  status: ClaimLinkStatus
  clubName: string
  preview: ClaimLinkPreview
  /** What the club entered (Queue › Edit details); the form starts from it and the player can change it */
  preset: {
    fullName: string
    nickname: string
    email: string
    playingStyle: string
    experienceYears: string
    experienceMonths: string
    facebook: string
    instagram: string
    youtube: string
    linkedin: string
  }
}
/** Mock store record; 'claimed' is derived from the account, not stored. */
export type ClaimLinkRecord = {
  playerId: string
  clubName: string
  status: Exclude<ClaimLinkStatus, 'claimed'>
  /** Status checks while processing; the prototype completes on the second */
  expiresAt?: string
  checks: number
}
export type CompleteClaimResult = {
  playerId: string
  rtrId: string
  /** Nickname, or the first word of the full name */
  firstName: string
}

/**
 * Private account storage; new registration awaits email confirmation. Visibility settings live on
 * the profile record (`PlayerProfile`), not here.
 */
export type PlayerAccountRecord = Omit<MyAccount, 'profileVisibility' | 'hiddenFromDirectory'> & {
  claimed: boolean
}
