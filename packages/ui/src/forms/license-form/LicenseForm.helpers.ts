import type { ClubAccessState } from '@rotra/data/license/types'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'

/** The License sheet's line under the club name (rotra-admin.html SHEETS.license .who). */
export function licenseStatusLine(access: ClubAccessState) {
  switch (access.state) {
    case 'active':
      return `Active until ${formatYmd(access.until)}`
    case 'expired':
      return `Expired since ${formatYmd(access.since)}`
    case 'scheduled':
      return `Starts ${formatYmd(access.starts)}`
    case 'none':
      return 'Never licensed'
  }
}
