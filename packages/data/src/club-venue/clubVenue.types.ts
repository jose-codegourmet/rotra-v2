/** A saved venue belongs to one club; fees are optional integer centavos. */
export type ClubVenue = {
  id: string
  clubId: string
  name: string
  address: string
  courtFeeMinor: number | null
  entranceFeeMinor: number | null
  currency: 'PHP'
}
