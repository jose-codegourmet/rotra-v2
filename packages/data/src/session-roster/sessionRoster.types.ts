import type { PlayingLevel } from '../player/player.types'
export type SessionPlayer = {
  id: string
  sessionId: string
  clubPlayerId: string
  nameSnapshot: string
  nicknameSnapshot: string | null
  present: boolean
  presentChangedAt: number | null
  level: PlayingLevel | null
  levelLockedAt: number | null
  confirmedAt: number
}
export type SessionWaitlistEntry = {
  id: string
  sessionId: string
  clubPlayerId: string
  level: PlayingLevel | null
  addedAt: number
}
export type SessionJoinRequest = {
  id: string
  sessionId: string
  name: string
  nickname: string | null
  phoneE164: string | null
  statedBand: 'beginner' | 'intermediate' | 'advanced' | 'unsure'
  status: 'pending' | 'confirmed' | 'declined'
  requestedAt: number
  decidedAt: number | null
  clubPlayerId: string | null
}
export type IdentityCheck = 'rtr-id' | 'qr' | 'phone'

/** A Player Information result the Add player sheet can save or add. Never carries a phone. */
export type DirectoryPlayer = {
  id: string
  fullName: string
  nickname: string | null
  rtrId: string
  identity: 'registered' | 'unclaimed'
  /** Their Player Information level, or null when they have none yet */
  suggestion: PlayingLevel | null
  /** "#214", or "Not ranked" */
  rankLabel: string
  phoneHidden?: boolean
}
