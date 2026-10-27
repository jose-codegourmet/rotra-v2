'use client'

import {
  activeMatchFor,
  countedGames,
  courtNames,
  waitMinutes,
} from '@rotra/data/match/match.rules'
import { pickerOrder } from '@rotra/data/match/queue.rules'
import type { MatchLineup as Lineup } from '@rotra/data/match/types'
import { useAddMatch } from '@rotra/data/match/useAddMatch'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useUpdateMatchLineup } from '@rotra/data/match/useUpdateMatchLineup'
import { MockError } from '@rotra/data/mock/errors'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { MatchLineupForm } from '@rotra/ui/forms/match-lineup-form'
import type { MatchLineupFormValues } from '@rotra/ui/forms/match-lineup-form/schema'
import type { PlayerPickerCandidate } from '@rotra/ui/player-picker-sheet'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

/** What opened the sheet: Add match (optionally pre-filled by Edit then add) or Edit on a waiting match */
export type MatchLineupRequest =
  | { mode: 'add'; lineup?: Lineup }
  | { mode: 'edit'; matchId: string }

export type MatchLineupProps = {
  sessionId: string
  /** The console clock: rest minutes in the picker are measured against it */
  now: number
  /** The open request; null keeps the sheet closed */
  request: MatchLineupRequest | null
  onClose: () => void
  /** The add or save succeeded: the shell switches the console to the Queue tab */
  onSaved: () => void
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** A save that could not be made durable on this device ("Changes could not be saved") or offline */
const isSaveFailure = (error: unknown) =>
  error instanceof MockError && (error.kind === 'retryable' || error.kind === 'offline')

/**
 * Q-MANUAL and Q-PICK-PLAYER: MatchLineupForm (with its slot picker) on useAddMatch for Add match
 * ("Match added to the queue") and useUpdateMatchLineup for Edit lineup ("Lineup saved · protected
 * from regeneration"). The picker candidates come from the roster in pickerOrder (off-court first,
 * present first, fewest games, longest rest) with games, court and rest minutes from the match
 * rules; the enabled formats follow the session, so Singles never appears while it is off. Edit then
 * add from a suggestion arrives as an add request with the lineup pre-filled, and saving it makes
 * the match manual and protected. A save failure is an error toast with the sheet kept as it was;
 * any other refusal shows inside the sheet.
 */
export function MatchLineup({ sessionId, now, request, onClose, onSaved }: MatchLineupProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const addMatch = useAddMatch()
  const updateLineup = useUpdateMatchLineup()
  const [serverError, setServerError] = useState<string | undefined>()

  const s = session.data
  if (!request || !s || !roster.data || !matches.data) return null

  const all = matches.data
  const editing =
    request.mode === 'edit'
      ? all.find((m) => m.id === request.matchId && m.state === 'waiting')
      : undefined
  // The match being edited is no longer waiting (started or removed elsewhere): nothing to edit.
  if (request.mode === 'edit' && !editing) return null

  const lineup: Lineup | undefined = editing
    ? { format: editing.format, teamA: editing.teamA, teamB: editing.teamB }
    : request.mode === 'add'
      ? request.lineup
      : undefined

  const players: PlayerPickerCandidate[] = pickerOrder(
    roster.data.roster,
    all,
    s.startedAt,
    now,
  ).map((p) => {
    const active = activeMatchFor(p.id, all)
    return {
      id: p.id,
      name: p.nameSnapshot,
      nickname: p.nicknameSnapshot,
      level: p.level,
      games: countedGames(p.id, all),
      present: p.present,
      playingOn: active ? courtNames(active, s.courts) : null,
      restMinutes: waitMinutes(p, all, s.startedAt, now),
    }
  })

  const close = () => {
    setServerError(undefined)
    onClose()
  }

  const onSubmit = (values: MatchLineupFormValues) => {
    setServerError(undefined)
    const handlers = {
      onSuccess: (result: { message: string }) => {
        toast(result.message)
        close()
        onSaved()
      },
      onError: (error: unknown) => {
        if (isSaveFailure(error)) toast.error(errorMessage(error))
        else setServerError(errorMessage(error))
      },
    }
    if (editing) updateLineup.mutate({ sessionId, matchId: editing.id, lineup: values }, handlers)
    else addMatch.mutate({ sessionId, ...values }, handlers)
  }

  return (
    // Remounted per request so the format and slots start from that request, never a previous one
    <MatchLineupForm
      key={editing ? `edit:${editing.id}` : 'add'}
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      mode={editing ? 'edit' : 'add'}
      enabledFormats={{ singles: s.allowSingles, doubles: s.allowDoubles }}
      players={players}
      minimumGames={s.minimumGames}
      lineup={lineup}
      onSubmit={onSubmit}
      isPending={addMatch.isPending || updateLineup.isPending}
      serverError={serverError}
      onCancel={close}
    />
  )
}
