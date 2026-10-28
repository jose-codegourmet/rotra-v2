'use client'

import type { MatchContext } from '@rotra/data/match/match.rules'
import { regenerateScope } from '@rotra/data/match/queue.rules'
import { useRegenerateQueue } from '@rotra/data/match/useRegenerateQueue'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { RegenerateQueueSheet } from '@rotra/ui/regenerate-queue-sheet'
import { toast } from '@rotra/ui/toaster'

export type RegenerateQueueProps = {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Q-REGENERATE / D-REGENERATE: RegenerateQueueSheet with the live counts from regenerateScope
 * (automatic rebuilt, healthy manual kept, manual needing attention rebuilt, games in play
 * untouched) on useRegenerateQueue. Regenerate waiting queue toasts "Queue regenerated · N rebuilt"
 * and closes; Keep current queue closes; the primary is disabled when nothing would be rebuilt. On
 * any failure (generation refused, save failed, offline without a download) the previous queue
 * stays exactly as it was, the sheet closes and the reason shows as an error toast, as in the
 * prototype's confirmRegen.
 */
export function RegenerateQueue({ sessionId, open, onOpenChange }: RegenerateQueueProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const regenerate = useRegenerateQueue()

  const s = session.data
  if (!s || !roster.data || !matches.data) return null

  const ctx: MatchContext = { roster: roster.data.roster, matches: matches.data, courts: s.courts }
  const scope = regenerateScope(matches.data, ctx)

  const onConfirm = () => {
    if (regenerate.isPending) return
    regenerate.mutate(sessionId, {
      onSuccess: (result) => {
        toast(result.message)
        onOpenChange(false)
      },
      onError: (error) => {
        onOpenChange(false)
        toast.error(errorMessage(error))
      },
    })
  }

  return (
    <RegenerateQueueSheet
      open={open}
      onOpenChange={onOpenChange}
      scope={scope}
      onConfirm={onConfirm}
      isPending={regenerate.isPending}
    />
  )
}
