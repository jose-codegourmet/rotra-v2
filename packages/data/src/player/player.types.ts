/** The nine playing levels, ordered from Beginner Low to Advanced High. */
export const PLAYING_LEVELS = [
  'beginner_low',
  'beginner_mid',
  'beginner_high',
  'intermediate_low',
  'intermediate_mid',
  'intermediate_high',
  'advanced_low',
  'advanced_mid',
  'advanced_high',
] as const

export type PlayingLevel = (typeof PLAYING_LEVELS)[number]

/** Public identity only. Contacts, account credentials and ranking calculations are separate. */
export type Player = {
  id: string
  fullName: string
  nickname: string | null
  rtrId: string
}
