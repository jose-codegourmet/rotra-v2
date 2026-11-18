import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'

export type InviteSignedInState =
  /** Club invite, free to join: "Join <club>" and "Not now" */
  | { kind: 'club'; clubName: string }
  /** Club invite, already a saved player: "You're already in <club>." */
  | { kind: 'club-member'; clubName: string }
  /** Session invite, free to go on: the hand-over sentence, "Continue to request to join" and "Not now" */
  | { kind: 'session'; inviterShortName?: string }
  /** Session invite made by this player */
  | { kind: 'own-invite' }
  /** Session invite: confirmed on the roster */
  | { kind: 'already-in'; sessionTitle: string }
  /** Session invite: on the waitlist */
  | { kind: 'on-waitlist'; sessionTitle: string }

export type InviteSignedInCardProps = {
  /** The signed-in player */
  player: { name: string; pictureUrl?: string }
  state: InviteSignedInState
  /** "Join <club>" is running */
  pending?: boolean
  /** A failed join, shown above the buttons */
  error?: string
  onJoinClub?: () => void
  onContinueToRequest?: () => void
  /** "Not now" and "Go to my profile" both go to the player's profile */
  onOpenProfile: () => void
}

/**
 * The card under the invite card on P-JOIN-CLUB and P-JOIN-SESSION (the prototype's second card):
 * "Signed in as <name>", the state's sentence or notice, and its buttons. Presentational: the app
 * joins the club or opens the Queue session page.
 */
export function InviteSignedInCard({
  player,
  state,
  pending = false,
  error,
  onJoinClub,
  onContinueToRequest,
  onOpenProfile,
}: InviteSignedInCardProps) {
  const settled = state.kind !== 'club' && state.kind !== 'session'
  return (
    <Card asChild className="flex flex-col gap-4">
      <section aria-busy={pending || undefined}>
        <div className="flex items-center gap-3">
          <Avatar name={player.name} src={player.pictureUrl} size={40} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] text-fg2">Signed in as</span>
            <b className="[overflow-wrap:anywhere]">{player.name}</b>
          </div>
        </div>
        {state.kind === 'club-member' ? (
          <Notice>You're already in {state.clubName}.</Notice>
        ) : state.kind === 'own-invite' ? (
          <Notice>This is your own invite. Share it with the person you want to bring.</Notice>
        ) : state.kind === 'already-in' ? (
          <Notice tone="success">You're already in {state.sessionTitle}.</Notice>
        ) : state.kind === 'on-waitlist' ? (
          <Notice tone="success">You're already on the waitlist for {state.sessionTitle}.</Notice>
        ) : state.kind === 'session' ? (
          <p className="m-0 text-fg2">
            Your request to join is ready to send on the session page.{' '}
            {state.inviterShortName
              ? `The Queue Master sees that ${state.inviterShortName} invited you.`
              : ''}
          </p>
        ) : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="flex flex-wrap gap-2">
          {settled ? (
            <Button variant="primary" onClick={onOpenProfile}>
              Go to my profile
            </Button>
          ) : state.kind === 'club' ? (
            <>
              <Button variant="primary" disabled={pending} onClick={onJoinClub}>
                {pending ? 'Joining…' : `Join ${state.clubName}`}
              </Button>
              <Button disabled={pending} onClick={onOpenProfile}>
                Not now
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" onClick={onContinueToRequest}>
                Continue to request to join
              </Button>
              <Button onClick={onOpenProfile}>Not now</Button>
            </>
          )}
        </div>
      </section>
    </Card>
  )
}
