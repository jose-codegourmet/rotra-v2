'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import type { ReactNode } from 'react'

/** The predefined profile banners (rotra-player.html .bn-*); tokens only. */
export type ClubMemberBanner = 'court' | 'night' | 'dusk' | 'ember' | 'sun' | 'stripe'

const BANNER: Record<ClubMemberBanner, string> = {
  court: 'bg-[linear-gradient(135deg,var(--accent-dim),var(--accent)_55%,var(--accent-subtle))]',
  night: 'bg-[linear-gradient(135deg,var(--elev),var(--overlay)_60%,var(--border-strong))]',
  dusk: 'bg-[linear-gradient(135deg,var(--overlay),var(--accent-dim))]',
  ember: 'bg-[linear-gradient(135deg,var(--error),var(--warn))]',
  sun: 'bg-[linear-gradient(135deg,var(--warn),var(--accent))]',
  stripe: 'bg-[repeating-linear-gradient(135deg,var(--accent-dim)_0_14px,var(--elev)_14px_28px)]',
}

export type ClubMemberProfile =
  | {
      kind: 'public'
      name: string
      nickname: string | null
      picture?: string | null
      /** The level label, or null when the player has no rank yet ("Not ranked yet") */
      levelLabel: string | null
      /** Overall leaderboard position, or null when not on the leaderboard */
      position: number | null
      isYou: boolean
      /** City the profile was first registered in (from the RTR ID) */
      registeredCity: string | null
      rtrId: string | null
      /** Counted games in the last 90 days; null while unknown */
      stats: { games: number; wins: number; losses: number } | null
      banner?: ClubMemberBanner
    }
  | {
      /** Masked: visitors, or an always-private player for everyone but themself */
      kind: 'private'
      /** The masked name ("J*** D***") */
      name: string
      picture?: string | null
      banner?: ClubMemberBanner
    }

export type ClubMemberProfileSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ClubMemberProfile
  /** The stats are still loading */
  loading?: boolean
  onOpenFullProfile: () => void
  /** Opens the full photo; the picture is a button only when given and a photo is set */
  onViewPhoto?: () => void
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg px-3.5 py-3">
      <span className="text-[11px] font-bold tracking-[0.6px] text-fg2 uppercase">{label}</span>
      {children}
    </div>
  )
}

/**
 * The profile dialog a club member opens (P-CLUB-PAGE grid and P-CLUB-MEMBERS): a banner card with
 * the round picture, name and nickname, level, #N overall and You, then About and Stats · last 90
 * days. A masked member opens the private card instead. The banner header is self-contained here.
 */
export function ClubMemberProfileSheet({
  open,
  onOpenChange,
  profile,
  loading = false,
  onOpenFullProfile,
  onViewPhoto,
}: ClubMemberProfileSheetProps) {
  const isPublic = profile.kind === 'public'
  const banner = isPublic ? (profile.banner ?? 'court') : 'court'
  const avatar = (
    <Avatar
      name={profile.name}
      src={profile.picture ?? undefined}
      size={64}
      className="shadow-[0_0_0_5px_var(--surface)]"
    />
  )
  const head = (
    <>
      <div aria-hidden className={cn('h-[84px]', BANNER[banner])} />
      <div className="absolute top-11 left-5">
        {isPublic && profile.picture && onViewPhoto ? (
          <button
            type="button"
            onClick={onViewPhoto}
            aria-label={`View full photo of ${profile.name}`}
            className="cursor-zoom-in rounded-full border-0 bg-transparent p-0"
          >
            {avatar}
          </button>
        ) : (
          avatar
        )}
      </div>
    </>
  )
  const name = (
    <div className="flex flex-wrap items-baseline gap-2">
      <b className="text-xl font-extrabold tracking-[-0.2px]">{profile.name}</b>
      {isPublic && profile.nickname ? <span className="text-fg2">“{profile.nickname}”</span> : null}
    </div>
  )
  const stats = isPublic ? profile.stats : null
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={profile.name}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          {isPublic ? (
            <Button variant="primary" onClick={onOpenFullProfile}>
              Open full profile
            </Button>
          ) : null}
        </>
      }
    >
      <div className="relative -mx-5 -mt-2.5">
        {head}
        <div className="flex flex-col gap-3 px-5 pt-[52px]">
          {name}
          {isPublic ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Chip tone={profile.levelLabel ? 'accent' : 'neutral'}>
                  {profile.levelLabel ?? 'Not ranked yet'}
                </Chip>
                {profile.position ? (
                  <Chip>#{profile.position.toLocaleString('en-US')} overall</Chip>
                ) : null}
                {profile.isYou ? <Chip tone="accent">You</Chip> : null}
              </div>
              <Section label="About">
                <KeyValueList
                  items={[
                    { label: 'Registered in', value: profile.registeredCity ?? '—' },
                    { label: 'RTR ID', value: <code>{profile.rtrId ?? '—'}</code> },
                  ]}
                />
              </Section>
              <Section label="Stats · last 90 days">
                {loading ? (
                  <Skeleton className="h-[132px]" />
                ) : stats?.games ? (
                  <dl className="m-0 grid grid-cols-2 gap-2">
                    {[
                      ['Games', stats.games],
                      ['Wins', stats.wins],
                      ['Losses', stats.losses],
                      ['Win rate', `${Math.round((stats.wins / stats.games) * 100)}%`],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-border bg-surface px-3 py-2.5"
                      >
                        <dt className="text-xs font-semibold text-fg2">{label}</dt>
                        <dd className="m-0 mt-0.5 text-xl font-extrabold tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="m-0 text-fg2">No games yet</p>
                )}
              </Section>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Chip>Private profile</Chip>
              </div>
              <Section label="Private">
                <p className="m-0 text-fg2">
                  This player has chosen to keep their ROTRA profile private. You can see their
                  picture and banner; their name, level and games stay between them and their clubs.
                </p>
              </Section>
            </>
          )}
        </div>
      </div>
    </Sheet>
  )
}
