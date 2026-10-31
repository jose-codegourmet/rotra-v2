import 'server-only'
import type { Prisma } from '../generated/prisma/client'

/** Server timezone for the RTR ID sync day. Proposal pending #244. */
export const RTR_SYNC_TIMEZONE = 'Asia/Manila'

/** The sync day (YYYY-MM-DD) of an instant in `RTR_SYNC_TIMEZONE`. */
export function rtrSyncDate(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RTR_SYNC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

/**
 * RTR-PH-CEB-102926-0001: country, founding city, MMDDYY sync day, sequence padded to four digits.
 * Sequences above 9999 are not truncated (overflow presentation is open, #244).
 */
export function formatRtrId(
  countryCode: string,
  cityCode: string,
  syncDate: string,
  sequence: number,
) {
  const [year, month, day] = syncDate.split('-')
  return `RTR-${countryCode}-${cityCode}-${month}${day}${year?.slice(2)}-${String(sequence).padStart(4, '0')}`
}

/**
 * Advances the founding city's counter for the sync day with one atomic upsert and returns the new
 * sequence. Call only inside the allocation transaction, after the phone identity is resolved.
 */
export async function nextPlayerSequence(
  tx: Prisma.TransactionClient,
  locationCodeId: string,
  syncDate: string,
): Promise<number> {
  const rows = await tx.$queryRaw<{ seq: number }[]>`
    SELECT "rotra_next_player_sequence"(${locationCodeId}::uuid, ${syncDate}::date) AS seq`
  const seq = rows[0]?.seq
  if (seq == null) throw new Error('Player ID counter did not return a sequence')
  return seq
}
