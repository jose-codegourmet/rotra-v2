'use client'
import { useClubPage } from '@rotra/data/club-page/useClubPage'
import { defaultProfileBanner } from '@rotra/data/profile-banner/fetchers'
import { Chip } from '@rotra/ui/chip'
import { ClubProfileCard } from '@rotra/ui/club-profile-card'
import { useRouter } from 'next/navigation'

const dayLabel = (at: number) =>
  new Date(at).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

/**
 * D-CLUB-PROFILE in ROTRA Player (2026-11-13-club-profile-card): a row of the profile's Clubs card
 * opens the club's profile card. The default banner, the logo, N members / Your club / Happening
 * now, About (Based in, Members, Next up); Open club page goes to the club page in the same tab.
 */
export function ClubCard({ clubId, onClose }: { clubId: string | null; onClose: () => void }) {
  const router = useRouter()
  const page = useClubPage(clubId ?? '')
  if (!clubId) return null
  const data = page.data
  const members = data?.members.length ?? 0
  const live = data?.sessions.find((s) => s.status === 'live')
  const next = data?.sessions
    .filter((s) => s.status === 'scheduled' && s.startsAt > Date.now())
    .sort((a, b) => a.startsAt - b.startsAt)[0]
  const banner = defaultProfileBanner()
  const href = `/clubs/${encodeURIComponent(clubId)}`
  return (
    <ClubProfileCard
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      name={data?.club.name ?? 'Club'}
      subline={data?.club.city}
      initials={data?.club.initials ?? ''}
      logoUrl={data?.club.logoUrl}
      bannerKey={banner.bannerKey}
      bannerImageUrl={banner.bannerImageUrl}
      chips={
        data ? (
          <>
            <Chip>{`${members.toLocaleString('en-US')} member${members === 1 ? '' : 's'}`}</Chip>
            {data.viewerIsMember ? <Chip tone="accent">Your club</Chip> : null}
            {live ? <Chip tone="accent">Happening now</Chip> : null}
          </>
        ) : null
      }
      about={[
        { label: 'Based in', value: data?.club.city || '—' },
        { label: 'Members', value: data ? members.toLocaleString('en-US') : '—' },
        {
          label: 'Next up',
          value: !data
            ? '—'
            : live
              ? `${live.title} · happening now`
              : next
                ? `${next.title} · ${dayLabel(next.startsAt)}`
                : 'Nothing scheduled',
        },
      ]}
      action={{
        label: 'Open club page',
        onClick: () => {
          onClose()
          router.push(href)
        },
      }}
    />
  )
}
