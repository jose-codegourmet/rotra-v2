import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ClubLogo } from '@rotra/ui/club-logo'
import { EmptyState } from '@rotra/ui/empty-state'
import { ListRow } from '@rotra/ui/list-row'
export type PlayerClubRow = {
  id: string
  name: string
  initials: string
  logoUrl?: string | null
  joinedVia: 'club_link' | 'session_link' | 'club_added'
  reportHref: string
}
export type PlayerClubsCardProps = { clubs: PlayerClubRow[]; onLeave: (id: string) => void }
const via = {
  club_link: 'Joined via club link',
  session_link: 'Joined via session link',
  club_added: 'Added by the club',
}
export function PlayerClubsCard({ clubs, onLeave }: PlayerClubsCardProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h3>Your clubs</h3>
        {clubs.length ? (
          <>
            <div>
              {clubs.map((club) => (
                <ListRow
                  key={club.id}
                  leading={<ClubLogo initials={club.initials} logoUrl={club.logoUrl} />}
                  title={club.name}
                  subtitle={
                    <>
                      <span>{via[club.joinedVia]}</span>
                      <span className="mt-2 flex flex-wrap gap-2">
                        <Button size="xs" onClick={() => onLeave(club.id)}>
                          Leave club
                        </Button>
                        <Button size="xs" asChild>
                          <a href={club.reportHref}>Report a problem</a>
                        </Button>
                      </span>
                    </>
                  }
                />
              ))}
            </div>
            <span className="text-xs text-fg2">Report a problem opens your email app.</span>
          </>
        ) : (
          <EmptyState>You're not in any club's saved players yet.</EmptyState>
        )}
      </section>
    </Card>
  )
}
