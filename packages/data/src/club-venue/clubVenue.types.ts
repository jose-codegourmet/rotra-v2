/** A saved venue belongs to one club; fees are optional integer centavos. */
export type ClubVenue = {
  /** Expected revision for a saved-venue edit; absent only before the first save. */
  revision: string
  id: string
  clubId: string
  name: string
  address: string
  courtFeeMinor: number | null
  entranceFeeMinor: number | null
  currency: 'PHP'
}
