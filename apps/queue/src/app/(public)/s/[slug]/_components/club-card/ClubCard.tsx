'use client'

import { appOrigin } from '@rotra/data/app-origins'
import { useClubPage } from '@rotra/data/club-page/useClubPage'
import { statsYear } from '@rotra/data/player/rules'
import { useDefaultProfileBanner } from '@rotra/data/profile-banner/useDefaultProfileBanner'
import { Chip } from '@rotra/ui/chip'
import { ClubProfileCard } from '@rotra/ui/club-profile-card'

export type ClubCardProps = {
  open: boolean
  onClose: () => void
  club: { id: string; name: string; initials: string; logoUrl: string | null }
}

const dayLabel = (at: number) =>
  new Date(at).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

/**
 * D-CLUB-PROFILE on the session page (2026-11-13-club-profile-card): the organizer line opens the
 * club's profile card. The default banner, the logo, ROTRA club and Happening now, About (Members,
 * Sessions in YEAR, Next up); Open club page opens the Player app's club page in a new tab. The
 * counts come from the public club page read; until it loads they read “—”.
 */
export function ClubCard({ open, onClose, club }: ClubCardProps) {
  const page = useClubPage(open ? club.id : '')
  const year = statsYear(Date.now())
  const data = page.data
  const live = data?.sessions.find((s) => s.status === 'live')
  const next = data?.sessions
    .filter((s) => s.status === 'scheduled' && s.startsAt > Date.now())
    .sort((a, b) => a.startsAt - b.startsAt)[0]
  const ran = data?.sessions.filter(
    (s) => s.status === 'done' && statsYear(s.startsAt) === year,
  ).length
  const banner = useDefaultProfileBanner()
  return (
    <ClubProfileCard
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      name={club.name}
      subline={data?.club.city}
      initials={club.initials}
      logoUrl={club.logoUrl}
      bannerKey={banner.bannerKey}
      bannerImageUrl={banner.bannerImageUrl}
      chips={
        <>
          <Chip tone="accent">ROTRA club</Chip>
          {live ? <Chip tone="accent">Happening now</Chip> : null}
        </>
      }
      about={[
        { label: 'Members', value: data ? data.members.length : '—' },
        { label: `Sessions in ${year}`, value: ran ?? '—' },
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
        href: `${appOrigin('player')}/clubs/${encodeURIComponent(club.id)}`,
        newTab: true,
      }}
    />
  )
}
