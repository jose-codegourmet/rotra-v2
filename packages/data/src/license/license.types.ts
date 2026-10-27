export type ClubLicenseTerm = {
  id: string
  clubId: string
  plan: 'Monthly' | 'Yearly'
  startsAt: string
  endsAt: string
  amountMinor: number
  currency: 'PHP'
  paidOn: string | null
  paymentReference: string
}

export type ClubAccess = {
  status: 'active' | 'expired' | 'unverified'
  activeSessionId: string | null
}
