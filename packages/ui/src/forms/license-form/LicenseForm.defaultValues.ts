import type { LicenseFormInput } from './LicenseForm.schema'

/**
 * Nothing chosen yet. The container passes the prototype's licStart() values instead: the plan of the
 * club's latest term, the day after the current term ends when active (else today), paid on today, and
 * that plan's price as the amount (rotra-admin.html; D-2026-11-11-06: renewals stack after the
 * current term). startsOn has no field; LicenseForm shows it read-only as Covers.
 */
export const licenseDefaultValues: LicenseFormInput = {
  plan: '',
  startsOn: '',
  paidOn: '',
  amount: '',
  reference: '',
}
