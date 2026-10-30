import type { LicenseFormInput } from './LicenseForm.schema'

/**
 * Nothing chosen yet. The container passes the prototype's licStart() values instead: the plan of the
 * club's latest term, the day after the current term ends when active (else today), paid on today, and
 * that plan's price as the amount (rotra-admin.html; renewal stacking is an open decision).
 */
export const licenseDefaultValues: LicenseFormInput = {
  plan: '',
  startsOn: '',
  paidOn: '',
  amount: '',
  reference: '',
}
