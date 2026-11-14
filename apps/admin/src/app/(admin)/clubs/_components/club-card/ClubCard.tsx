'use client'

import type { AdminClubListItem } from '@rotra/data/club/types'
import { useAdminClub } from '@rotra/data/club/useAdminClub'
import type { ClubAccessState } from '@rotra/data/license/types'
import { useDefaultProfileBanner } from '@rotra/data/profile-banner/useDefaultProfileBanner'
import { formatPeso } from '@rotra/schema/money'
import { Chip } from '@rotra/ui/chip'
import { ClubProfileCard } from '@rotra/ui/club-profile-card'
import { LicenseAccessChip } from '@rotra/ui/license-access-chip'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'

/** rotra-admin.html clubCardSheet Until row. */
function untilLabel(access: ClubAccessState): string {
  switch (access.state) {
    case 'active':
      return formatYmd(access.until)
    case 'expired':
      return `Ended ${formatYmd(access.ended)}`
    case 'scheduled':
      return `From ${formatYmd(access.starts)}`
    case 'none':
      return '—'
  }
}

/**
 * D-CLUB-PROFILE in Admin (2026-11-13-club-profile-card): a Clubs and licenses row opens the club's
 * profile card in the right-hand panel, like a player's Quick view. The default banner, the round
 * logo, name and username, the access chip with Running now and Free · tester, then Founded in,
 * Address, Set up, Plan, Until and Price, and Running now; Open club goes to the club detail.
 */
export function ClubCard({
  club,
  onClose,
  onOpenClub,
}: {
  club: AdminClubListItem
  onClose: () => void
  onOpenClub: () => void
}) {
  const detail = useAdminClub(club.id)
  const banner = useDefaultProfileBanner()
  const free = club.licensePricing === 'free'
  return (
    <ClubProfileCard
      open
      side
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      name={club.name}
      subline={<span className="font-mono">{club.username}</span>}
      initials={club.initials}
      logoUrl={club.logoUrl}
      bannerKey={banner.bannerKey}
      bannerImageUrl={banner.bannerImageUrl}
      chips={
        <>
          <LicenseAccessChip access={club.access} />
          {club.runningSessionTitle ? <Chip tone="accent">Running now</Chip> : null}
          {free ? <Chip tone="accent">Free · tester</Chip> : null}
        </>
      }
      plainAbout
      about={[
        {
          label: 'Founded in',
          value: (
            <>
              {club.city} <span className="font-mono text-xs text-fg2">{club.cityCode}</span>
            </>
          ),
        },
        { label: 'Address', value: detail.data?.foundingAddress || '—' },
        {
          label: 'Set up',
          value: detail.data ? formatYmd(detail.data.account.setUpOn) : '—',
        },
        { label: 'Plan', value: club.access.state === 'none' ? '—' : club.access.plan },
        { label: 'Until', value: untilLabel(club.access) },
        {
          label: 'Price',
          value: free
            ? 'Free · tester'
            : `${formatPeso(club.licenseMonthlyMinor)} a month · ${formatPeso(club.licenseYearlyMinor)} a year`,
        },
      ]}
      action={{ label: 'Open club', onClick: onOpenClub }}
    >
      {club.runningSessionTitle ? (
        <section aria-labelledby={`club-card-running-${club.id}`} className="flex flex-col gap-1">
          <h3 id={`club-card-running-${club.id}`} className="m-0 text-sm font-semibold">
            Running now
          </h3>
          <p className="m-0">{club.runningSessionTitle}</p>
        </section>
      ) : null}
    </ClubProfileCard>
  )
}
