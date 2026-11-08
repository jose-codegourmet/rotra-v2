'use client'

import { Button } from '@rotra/ui/button'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { Sheet } from '@rotra/ui/sheet'

export type DeletePlayerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The player's full name; `shortName` (nickname or first name) is used in sentences */
  name: string
  shortName: string
  /** The running session they're in */
  sessionTitle: string
  /** Waiting matches with them that will need attention */
  waitingMatches: number
  /** On court or playing: the blocked form, with only Back */
  busy: boolean
  isPending?: boolean
  /** The delete was refused (they went on court meanwhile, offline, a save failure) */
  error?: string
  onConfirm: () => void
}

/**
 * D-DELETE-PLAYER: only for a saved player in the Active Session. Confirms the delete, or explains
 * that a player on court can't be deleted until that match is finished or substituted.
 */
export function DeletePlayerSheet({
  open,
  onOpenChange,
  name,
  shortName,
  sessionTitle,
  waitingMatches,
  busy,
  isPending,
  error,
  onConfirm,
}: DeletePlayerSheetProps) {
  if (busy)
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={`Can't delete ${name} yet`}
        footer={<Button onClick={() => onOpenChange(false)}>Back</Button>}
      >
        <p className="m-0">
          {shortName} is on court in {sessionTitle}. Finish or substitute that match first, then
          delete them.
        </p>
      </Sheet>
    )
  const matches =
    waitingMatches > 0
      ? `, and ${waitingMatches} waiting ${waitingMatches === 1 ? 'match' : 'matches'} with them will need attention`
      : ''
  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${name}?`}
      consequence={`${shortName} is in ${sessionTitle}, which is running now. They'll be marked not present${matches}.`}
      note="They're also taken out of any prepared or upcoming session. Their finished games and results stay."
      confirmLabel="Delete player"
      backLabel="Keep player"
      destructive
      isPending={isPending}
      error={error}
      onConfirm={onConfirm}
    />
  )
}
