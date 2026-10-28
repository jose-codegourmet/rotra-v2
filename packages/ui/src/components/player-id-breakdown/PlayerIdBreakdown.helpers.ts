export type RtrIdPart = { code: string; label: string }

/**
 * Splits RTR-CC-CITY-MMDDYY-SEQ into the five labelled parts of 'What the ID means'. Returns null
 * when the ID doesn't have that shape.
 */
export function rtrIdParts(rtrId: string): RtrIdPart[] | null {
  const [prefix, country, city, date, sequence] = rtrId.split('-')
  if (!prefix || !country || !city || !date || !sequence || !/^\d{6}$/.test(date)) return null
  const synced = new Date(2000 + Number(date.slice(4)), Number(date.slice(0, 2)) - 1, Number(date.slice(2, 4)))
  const syncedText = synced.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  return [
    { code: prefix, label: 'ROTRA' },
    { code: country, label: 'Country' },
    { code: city, label: 'City of the club that added you' },
    { code: date, label: `First synced ${syncedText}` },
    { code: sequence, label: 'Order that day in that city' },
  ]
}
