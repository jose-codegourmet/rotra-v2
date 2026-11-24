import { SHOT_LABELS } from '@rotra/data/player/onboarding-answers'
import type { PlayerProfile } from '@rotra/data/player/types'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { COURT_POSITIONS } from '@rotra/ui/court-position-card'
import { FAVORITE_PLAYERS } from '@rotra/ui/favorite-player-chips'
import { Icon } from '@rotra/ui/icon'
export type PlayerAboutCardProps = { profile: PlayerProfile; isOwn?: boolean }
const PROVIDERS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
}
export function PlayerAboutCard({ profile, isOwn = false }: PlayerAboutCardProps) {
  const years = profile.experienceYears ?? 0,
    months = profile.experienceMonths ?? 0
  const experience = [
    years ? `${years} ${years === 1 ? 'year' : 'years'}` : '',
    months ? `${months} ${months === 1 ? 'month' : 'months'}` : '',
  ]
    .filter(Boolean)
    .join(', ')
  const court = COURT_POSITIONS.find((p) => p.value === profile.playStyle)?.title
  // The listed shots first, in the list's order, then the player's own.
  const shots = [
    ...(profile.shots ?? []).map((id) => SHOT_LABELS[id] ?? id),
    ...(profile.shotsOther ?? []),
  ]
  const favorite =
    profile.favoritePlayer === 'other'
      ? profile.favoritePlayerOther
      : FAVORITE_PLAYERS.find((p) => p.value === profile.favoritePlayer)?.label
  const links = Object.entries(profile.socialLinks).filter(([, url]) => Boolean(url))
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h2>About</h2>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">
            Where they play
          </span>
          <p className={court ? undefined : 'text-fg2'}>
            {court ?? `${isOwn ? "You haven't" : "This player hasn't"} added this yet.`}
          </p>
        </div>
        {shots.length ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">Shots</span>
            <div className="flex flex-wrap gap-1.5">
              {shots.map((shot) => (
                <Chip key={shot}>{shot}</Chip>
              ))}
            </div>
          </div>
        ) : null}
        {favorite ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">
              Favorite player
            </span>
            <p>{favorite}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">
            Experience
          </span>
          <p className={experience ? undefined : 'text-fg2'}>
            {experience ? `${experience} playing` : 'Not added'}
          </p>
          {experience ? (
            <p className="text-xs text-fg2">
              Self-reported. Clubs may use it for a first assessment; it doesn't add rank points.
            </p>
          ) : null}
        </div>
        {links.length ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">Links</span>
            {links.map(([provider, url]) => (
              <a
                key={provider}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2.5 rounded-md border border-border px-2.5 py-2 text-fg no-underline hover:border-accent"
              >
                <Icon name="external" className="shrink-0" />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {url.replace(/^https?:\/\/(www\.)?/, '')}
                </span>
                <small className="ml-auto shrink-0 text-fg2">
                  {PROVIDERS[provider as keyof typeof PROVIDERS]}
                </small>
              </a>
            ))}
          </div>
        ) : null}
      </section>
    </Card>
  )
}
