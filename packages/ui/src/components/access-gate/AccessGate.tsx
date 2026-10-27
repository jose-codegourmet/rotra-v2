import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'

export type AccessGateSession = {
  title: string
  /** ISO date-time */
  startsAt: string
  /** ISO date-time */
  endsAt: string
  venueName: string
}

export type AccessGateProps = {
  clubName: string
  clubLogoUrl?: string
  clubInitials: string
  /**
   * expired: the license has ended. unverified: the license could not be checked (offline or
   * unknown); it must never be called expired.
   */
  status: 'expired' | 'unverified'
  /** The club's live session, which it may still finish and sync */
  activeSession?: AccessGateSession
  onContinueActiveSession?: () => void
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })

/**
 * Q-ACCESS: what a club sees instead of the dashboard when its license has ended, or when ROTRA could
 * not verify it. A live session can still be finished.
 */
export function AccessGate({
  clubName,
  clubLogoUrl,
  clubInitials,
  status,
  activeSession,
  onContinueActiveSession,
}: AccessGateProps) {
  return (
    <Card asChild>
      <section aria-label="Club access" className="flex flex-col gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {clubLogoUrl ? (
            <Avatar name={clubName} src={clubLogoUrl} size={52} shape="square" />
          ) : (
            <span
              aria-hidden
              className="grid size-[52px] flex-none place-items-center rounded-[14px] bg-accent text-lg font-extrabold text-on-accent"
            >
              {clubInitials}
            </span>
          )}
          <h1 className="min-w-0 flex-1 [overflow-wrap:anywhere]">{clubName}</h1>
          {status === 'expired' ? <Chip tone="error">License expired</Chip> : null}
        </div>
        {status === 'expired' ? (
          <>
            <p className="m-0">
              Your club's license has ended. New sessions, saved players and past reports are
              unavailable until it's renewed.
            </p>
            <p className="m-0 text-[13px] text-fg2">
              Licenses are monthly or yearly and are activated manually by the ROTRA platform owner.
              Contact them to renew.
            </p>
          </>
        ) : (
          <>
            <h2>Unable to verify access</h2>
            {/* Placeholder copy: the offline entitlement mechanism is an open decision (business open-decisions › Licensing). */}
            <p className="m-0">ROTRA couldn't check your club's license right now.</p>
          </>
        )}
        {activeSession ? (
          <Card tone="highlight" className={cn('flex flex-col gap-3')}>
            <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
              You can still finish this session
            </span>
            <h3 className="[overflow-wrap:anywhere]">{activeSession.title}</h3>
            <p className="m-0 text-[13px] text-fg2">
              {timeOf(activeSession.startsAt)}–{timeOf(activeSession.endsAt)} ·{' '}
              {activeSession.venueName}
            </p>
            <p className="m-0 text-[13px]">
              This lets you finish and sync it. It doesn't let you start another session.
            </p>
            <div>
              <Button variant="primary" onClick={onContinueActiveSession}>
                Continue active session
              </Button>
            </div>
          </Card>
        ) : null}
      </section>
    </Card>
  )
}
