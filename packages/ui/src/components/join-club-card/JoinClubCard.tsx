import { Button } from '@rotra/ui/button'
import { ClubLogo } from '@rotra/ui/club-logo'
import { Notice } from '@rotra/ui/notice'
export type JoinClubCardProps = {
  clubName: string
  clubInitials: string
  logoUrl?: string | null
  alreadyIn?: boolean
  pending?: boolean
  error?: string
  onJoin: () => void
  onNotNow: () => void
}
export function JoinClubCard({
  clubName,
  clubInitials,
  logoUrl,
  alreadyIn,
  pending,
  error,
  onJoin,
  onNotNow,
}: JoinClubCardProps) {
  return (
    <section className="flex flex-col gap-4" aria-busy={pending}>
      <div className="flex items-center gap-3">
        <ClubLogo initials={clubInitials} logoUrl={logoUrl} />
        <h1>{alreadyIn ? clubName : `Join ${clubName}?`}</h1>
      </div>
      {alreadyIn ? (
        <Notice>You're already in {clubName}.</Notice>
      ) : (
        <p className="text-fg2">
          You're added to {clubName}'s saved players. The club can put you in its sessions and
          record your games. You can leave any time from your profile.
        </p>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        {alreadyIn ? (
          <Button variant="primary" onClick={onNotNow}>
            Go to my profile
          </Button>
        ) : (
          <>
            <Button variant="primary" disabled={pending} onClick={onJoin}>
              {pending ? 'Joining…' : `Join ${clubName}`}
            </Button>
            <Button disabled={pending} onClick={onNotNow}>
              Not now
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
