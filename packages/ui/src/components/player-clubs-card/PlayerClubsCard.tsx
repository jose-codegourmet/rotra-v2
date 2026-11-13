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
  /**
   * Opens the club profile card (D-CLUB-PROFILE, 2026-11-13-club-profile-card): each row becomes a
   * button named “CLUB. View club profile” instead of the club page link.
   */
  onOpenClub?: (clubId: string) => void
}
const via = {
  club_link: 'Joined via club link',
  session_link: 'Joined via session link',
  club_added: 'Added by the club',
}

const ROW =
  'flex w-full min-w-0 items-center gap-3 py-3 text-left text-fg no-underline hover:bg-elev/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent'

/**
 * P-PROFILE clubs card (#766): one row per club, the club logo then the name. A row opens the club
 * profile card (onOpenClub), else the club page. Leave club lives on the club page; there is no
 * Report a problem.
 */
export function PlayerClubsCard({ clubs, isOwn, onOpenClub }: PlayerClubsCardProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h3>{isOwn ? 'Your clubs' : 'Clubs'}</h3>
        {clubs.length ? (
          <div className="divide-y divide-border">
            {clubs.map((club) => {
              const inner = (
                <>
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
                </>
              )
              return onOpenClub ? (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => onOpenClub(club.id)}
                  aria-label={`${club.name}. View club profile`}
                  className={`${ROW} m-0 cursor-pointer border-0 bg-transparent px-0 font-[inherit]`}
                >
                  {inner}
                </button>
              ) : (
                <a key={club.id} href={club.clubPageHref} className={ROW}>
                  {inner}
                </a>
              )
            })}
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
