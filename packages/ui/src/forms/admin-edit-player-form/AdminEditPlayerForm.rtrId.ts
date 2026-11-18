/**
 * The RTR ID after the registration place and date change (rotra-admin.html rtrWith()):
 * `RTR-<place code>-<MMDDYY>-<number>`, keeping the number at the end. Admin never types it. An
 * incomplete place or date, or an RTR ID of another shape, leaves the current RTR ID as it is.
 */
export function previewRtrId(current: string | null, place: string, date: string): string {
  const parts = /^RTR-(.+)-(\d{6})-(\d+)$/.exec(current ?? '')
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!parts || !ymd || !place) return current ?? ''
  return `RTR-${place}-${ymd[2]}${ymd[3]}${ymd[1]?.slice(2)}-${parts[3]}`
}
