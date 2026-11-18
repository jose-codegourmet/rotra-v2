/**
 * The RTR ID as text: `RTR-PH-CEB-102926-0001` is the prefix, the founding city code (`PH-CEB`), the
 * day it was given as MMDDYY in Asia/Manila, and a number that restarts for each city on each day.
 * Pure helpers shared by the mock store and the screens; the real allocator is
 * `packages/db/src/player/rtr-id.ts`. An RTR ID is never typed by hand (D-2026-11-16-04).
 */

const RTR_ID_TIMEZONE = 'Asia/Manila'
const RTR_ID_SHAPE = /^RTR-(.+)-(\d{6})-(\d+)$/
const YMD_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/

/** The day ('YYYY-MM-DD', Asia/Manila) an RTR ID given at `at` carries. */
export function rtrIdDay(at: number | Date = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RTR_ID_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

/** 'PH-CEB' + '2026-10-29' → 'RTR-PH-CEB-102926-'; '' when the place or the day is incomplete. */
export function rtrIdPrefix(placeCode: string, ymd: string): string {
  const day = YMD_SHAPE.exec(ymd)
  if (!placeCode || !day) return ''
  return `RTR-${placeCode}-${day[2]}${day[3]}${day[1]?.slice(2)}-`
}

/** What a lookup compares: trimmed and upper case. */
export const normalizeRtrId = (text: string) => text.trim().toUpperCase()

/** Whether the text has the shape of a full RTR ID (any case). */
export const isRtrId = (text: string) => RTR_ID_SHAPE.test(normalizeRtrId(text))

/** 'RTR-PH-CEB-102926-0001' → its counter key 'RTR-PH-CEB-102926-' and number 1; null for another shape. */
export function splitRtrId(rtrId: string | null): { prefix: string; number: number } | null {
  const parts = RTR_ID_SHAPE.exec(rtrId ?? '')
  if (!parts) return null
  return { prefix: `RTR-${parts[1]}-${parts[2]}-`, number: Number(parts[3]) }
}

/**
 * The next RTR ID for a place and day: one more than the highest number already given there that
 * day. `floor` is that place and day's counter, which only goes up, so a number that was retired or
 * moved away by Admin is never given again. Numbers above 9999 are not cut.
 */
export function nextRtrId(
  taken: Iterable<string>,
  placeCode: string,
  ymd: string,
  floor = 0,
): string {
  const prefix = rtrIdPrefix(placeCode, ymd)
  if (!prefix) throw new Error('An RTR ID needs a founding city code and a day.')
  let highest = floor
  for (const id of taken) {
    if (!id.startsWith(prefix)) continue
    const number = Number(id.slice(prefix.length))
    if (Number.isSafeInteger(number) && number > highest) highest = number
  }
  return `${prefix}${String(highest + 1).padStart(4, '0')}`
}

/**
 * The RTR ID after Admin changes the registration place or date (rotra-admin.html rtrWith()): it
 * follows both and keeps its number at the end. An incomplete place or date, or an RTR ID of
 * another shape, leaves the current RTR ID as it is.
 */
export function rtrIdWith(current: string | null, placeCode: string, ymd: string): string {
  const parts = RTR_ID_SHAPE.exec(current ?? '')
  const prefix = rtrIdPrefix(placeCode, ymd)
  if (!parts || !prefix) return current ?? ''
  return `${prefix}${parts[3]}`
}
