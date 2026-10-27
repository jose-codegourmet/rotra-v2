/** Shared club identity and prototype license prices; all amounts are integer centavos. */
export type Club = {
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
