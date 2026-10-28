/** The signed-in player's private contacts. Only ever returned to that player. */
export type MyAccount = {
  playerId: string
  /** E.164 */
  phone: string
  email: string
  phoneHidden: boolean
}

export type ClaimLinkStatus = 'valid' | 'claimed' | 'expired' | 'processing'
/** What a registration link shows before the recipient confirms: public identity and a masked phone. */
export type ClaimLinkPreview = {
  playerId: string
  fullName: string
  nickname: string | null
  rtrId: string
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
  /** Operator-preset details the form starts from */
  preset: { fullName: string; nickname: string; facebook: string }
}
/** Mock store record; 'claimed' is derived from the account, not stored. */
export type ClaimLinkRecord = {
  playerId: string
  clubName: string
  status: Exclude<ClaimLinkStatus, 'claimed'>
  /** Status checks while processing; the prototype completes on the second */
  checks: number
}
export type CompleteClaimResult = {
  playerId: string
  rtrId: string
  /** Nickname, or the first word of the full name */
  firstName: string
}
