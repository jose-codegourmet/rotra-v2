/** Shared club identity and prototype license prices; all amounts are integer centavos. */
export type Club = {
  logoUrl: string | null
  description: string
  courtRules: string | null
  postTemplate: string | null
  defaultPlayersPerCourt: number
  defaultEntranceFeeMinor: number | null
  cityCode: string
  username: string
  pendingNameChange: { requestedName: string; requestedAt: number } | null
  id: string
  name: string
  initials: string
  foundingAddress: string
  city: string
  locationCode: string
  licensePricing: 'paid' | 'free'
  licenseMonthlyMinor: number
  licenseYearlyMinor: number
  currency: 'PHP'
}
