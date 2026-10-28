'use client'

import { Button } from '@rotra/ui/button'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { sessionDoneSheetVariants } from './SessionDoneSheet.variants'

export type SessionDoneStep = 'review' | 'minimum' | 'confirm'

export type SessionDoneActiveGame = {
  /** The court label(s) the game is on: "Court 1" or "Court 1 + Court 2" */
  courtLabels: string
}

export type SessionDoneShortfall = {
  clubPlayerId: string
  name: string
  /** Counted games so far, shown as "g of M" */
  completedGames: number
}

export type SessionDoneSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Which of the three bodies to show; the container switches it */
  step: SessionDoneStep
  sessionTitle: string
  /** Start–end text, e.g. "7:00 PM–10:00 PM" */
  timeRange: string
  gamesRecorded: number
  participants: number
  /** Changes saved on this device and not synced yet */
  pendingChanges: number
  recordsIncomplete?: boolean
  authorizationBlocked?: boolean
  /** Games still in play; any one of them blocks the review step */
  activeGames: SessionDoneActiveGame[]
  /** Waiting matches that were never played */
  unplayedWaiting: number
  /** Present players under the session minimum */
  belowMinimum: SessionDoneShortfall[]
  /** The session's minimum games */
  minimum: number
  online: boolean
  /** Finalization is running: Confirm Session done shows a spinner and nothing can fire twice */
  isPending?: boolean
  /** Back to session on the review and minimum steps */
  onBackToSession: () => void
  /** Review → minimum (with shortfalls) or confirm; the container decides which */
  onContinue: () => void
  /** Minimum → confirm */
  onContinueToFinish: () => void
  /** Back on the confirm step */
  onBack: () => void
  onConfirm: () => void
}

const TITLES: Record<SessionDoneStep, string> = {
  review: 'Session done',
  minimum: 'Some players are below the minimum',
  confirm: 'Finish this session?',
}

/** "1 game is" / "2 games are", the way the prototype pluralises its counts. */
function count(n: number, noun: string, plural = `${noun}s`) {
  return `${n} ${n === 1 ? noun : plural}`
}

/**
 * The three-step Session done sheet (Q-SESSION-DONE, D-MINIMUM, D-SESSION-DONE): the review of
 * games, participants and sync with the blocking and advisory notices, the shortfall list, and the
 * final Finish this session? confirmation. The container owns open/close state and the step; this
 * sheet only shows values and reports the buttons. It never finishes or invalidates games itself.
 */
export function SessionDoneSheet({
  open,
  onOpenChange,
  step,
  sessionTitle,
  timeRange,
  gamesRecorded,
  participants,
  pendingChanges,
  recordsIncomplete = false,
  authorizationBlocked = false,
  activeGames,
  unplayedWaiting,
  belowMinimum,
  minimum,
  online,
  isPending = false,
  onBackToSession,
  onContinue,
  onContinueToFinish,
  onBack,
  onConfirm,
}: SessionDoneSheetProps) {
  const inPlay = activeGames.length
  const below = belowMinimum.length
  const blocked = inPlay > 0 || !online || authorizationBlocked
  const cannotConfirm =
    authorizationBlocked || recordsIncomplete || pendingChanges > 0 || !online || isPending

  const body =
    step === 'minimum' ? (
      <>
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {belowMinimum.map((p) => (
            <li key={p.clubPlayerId} className="flex min-w-0 items-center gap-3 py-3">
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{p.name}</span>
              <span className="flex-none tabular-nums">
                {p.completedGames} of {minimum}
              </span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-[13px] text-fg2">
          Late arrivals, early leavers and real-world choices happen. You can still finish.
        </p>
      </>
    ) : step === 'confirm' ? (
      <>
        <p className="m-0">
          <b>{sessionTitle}</b> · {timeRange}
        </p>
        {recordsIncomplete ? (
          <Notice tone="warn">
            Original session records are incomplete. Review recovery before Session done.
          </Notice>
        ) : pendingChanges > 0 ? (
          <Notice tone="warn">
            {count(pendingChanges, 'change')} {pendingChanges === 1 ? 'is' : 'are'} still syncing.
          </Notice>
        ) : (
          <Notice tone="success">All records on this device are synced.</Notice>
        )}
        <p className="m-0 text-[13px]">
          Valid results sync to Player Information automatically, and ranks update. Result slides
          become available to you privately. Nothing is published until you choose to.
        </p>
      </>
    ) : (
      <>
        <KeyValueList
          items={[
            { label: 'Session', value: sessionTitle },
            { label: 'Games recorded', value: gamesRecorded },
            { label: 'Participants', value: participants },
            {
              label: 'Sync',
              value: recordsIncomplete
                ? 'Original records incomplete'
                : pendingChanges > 0
                  ? `${count(pendingChanges, 'change')} waiting`
                  : 'Complete',
            },
          ]}
        />
        {recordsIncomplete ? (
          <Notice tone="warn">
            Original records from another device are missing. Recording can continue; Session done
            requires recovery.
          </Notice>
        ) : null}
        {inPlay > 0 ? (
          <Notice
            tone="error"
            title={`${count(inPlay, 'game')} ${inPlay === 1 ? 'is' : 'are'} still in play`}
          >
            ({activeGames.map((g) => g.courtLabels).join(', ')}). Finish or invalidate them first.
          </Notice>
        ) : null}
        {unplayedWaiting > 0 ? (
          <Notice tone="info">
            {count(unplayedWaiting, 'waiting match', 'waiting matches')}{' '}
            {unplayedWaiting === 1 ? 'was' : 'were'} never played and won't appear in results. What
            happens to unplayed matches is still undecided.
          </Notice>
        ) : null}
        {below > 0 ? (
          <Notice tone="warn">
            {count(below, 'player')} {below === 1 ? 'is' : 'are'} below the minimum of {minimum}{' '}
            games.
          </Notice>
        ) : null}
      </>
    )

  const footer =
    step === 'minimum' ? (
      <>
        <Button onClick={onBackToSession}>Back to session</Button>
        <Button variant="primary" disabled={blocked || isPending} onClick={onContinueToFinish}>
          Continue to finish session
        </Button>
      </>
    ) : step === 'confirm' ? (
      <>
        <Button disabled={isPending} onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" loading={isPending} disabled={cannotConfirm} onClick={onConfirm}>
          Confirm Session done
        </Button>
      </>
    ) : (
      <>
        <Button onClick={onBackToSession}>Back to session</Button>
        <Button variant="primary" disabled={blocked} onClick={onContinue}>
          {below > 0 ? 'Review shortfalls' : 'Continue'}
        </Button>
      </>
    )

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={TITLES[step]}
      dismissible={!isPending}
      hideClose={isPending}
      footer={footer}
    >
      {authorizationBlocked ? (
        <Notice tone="warn">
          Access must be restored before this session can finish and sync. Your local records are
          kept.
        </Notice>
      ) : null}
      <div className={sessionDoneSheetVariants({ step })}>{body}</div>
    </Sheet>
  )
}
