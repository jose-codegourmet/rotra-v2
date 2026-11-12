import { Card } from '@rotra/ui/card'
import { ClubLogo } from '@rotra/ui/club-logo'
import { EmptyState } from '@rotra/ui/empty-state'
import { Icon } from '@rotra/ui/icon'

export type PlayerClubRow = {
  id: string
  name: string
  initials: string
  logoUrl?: string | null
  /** How the player joined; shown on the own profile only (another player's rows never carry it) */
  joinedVia?: 'club_link' | 'session_link' | 'club_added'
  /** The club's public page (/clubs/[clubId], P-CLUB-PAGE); the whole row links there */
  clubPageHref: string
}
export type PlayerClubsCardProps = {
  clubs: PlayerClubRow[]
  /** The viewer's own profile: "Your clubs" and the joined-via line; otherwise "Clubs" */
  isOwn: boolean
}
const via = {
  club_link: 'Joined via club link',
  session_link: 'Joined via session link',
  club_added: 'Added by the club',
}

/**
 * P-PROFILE clubs card (#766): one row per club that opens the club page, the club logo then the
 * name. Leave club lives on the club page; there is no Report a problem.
 */
export function PlayerClubsCard({ clubs, isOwn }: PlayerClubsCardProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h3>{isOwn ? 'Your clubs' : 'Clubs'}</h3>
        {clubs.length ? (
          <div className="divide-y divide-border">
            {clubs.map((club) => (
              <a
                key={club.id}
                href={club.clubPageHref}
                className="flex w-full min-w-0 items-center gap-3 py-3 text-left text-fg no-underline hover:bg-elev/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                <ClubLogo size="md" initials={club.initials} logoUrl={club.logoUrl} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="font-semibold [overflow-wrap:anywhere]">{club.name}</b>
                  {isOwn && club.joinedVia ? (
                    <span className="text-[13px] text-fg2">{via[club.joinedVia]}</span>
                  ) : null}
                </span>
                <span aria-hidden className="flex flex-none text-fg2">
                  <Icon name="forward" />
                </span>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState>
            {isOwn ? "You're not in any club's saved players yet." : 'No clubs yet.'}
          </EmptyState>
        )}
      </section>
    </Card>
  )
}
