'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { needsConfirmStep } from '@rotra/data/session-roster/sessionRoster.rules'
import { useAddDirectoryPlayerToSession } from '@rotra/data/session-roster/useAddDirectoryPlayerToSession'
import { useAddNewPlayerToSession } from '@rotra/data/session-roster/useAddNewPlayerToSession'
import { useAddSavedPlayerToSession } from '@rotra/data/session-roster/useAddSavedPlayerToSession'
import { usePlayerDirectorySearch } from '@rotra/data/session-roster/usePlayerDirectorySearch'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import {
  type AddPlayerCandidate,
  type AddPlayerConfirmInput,
  AddPlayerSheet,
} from '@rotra/ui/add-player-sheet'
import type { NewPlayerFormValues } from '@rotra/ui/forms/new-player-form/schema'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'

export type AddPlayerProps = {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** "#214" from the mock directory reads "Rank 214" on the sheet; "Not ranked" reads "Not ranked yet". */
const rankLabel = (label: string) =>
  label.startsWith('#') ? `Rank ${Number(label.slice(1)).toLocaleString()}` : 'Not ranked yet'

/**
 * Q-ADD-PLAYER container shared by preparation (Add player) and the console (Add late player):
 * AddPlayerSheet on the saved, Player Information and new-player add mutations. The sheet stays
 * open; every add toasts and bumps addedCount so the tab clears and refocuses.
 */
export function AddPlayer({ sessionId, open, onOpenChange }: AddPlayerProps) {
  const offline = useAppSelector(selectDev).offline
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const clubPlayers = useClubPlayers()
  const [query, setQuery] = useState('')
  const directory = usePlayerDirectorySearch(query)
  const addSaved = useAddSavedPlayerToSession()
  const addDirectory = useAddDirectoryPlayerToSession()
  const addNew = useAddNewPlayerToSession()
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const [addedCount, setAddedCount] = useState(0)
  const [serverError, setServerError] = useState<string | undefined>()

  // A fresh sheet each time it opens: Cancel until someone is added, no stale status line.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setLastAdded(null)
      setAddedCount(0)
      setServerError(undefined)
      setQuery('')
    }
  }

  const s = session.data
  const rosterList = roster.data?.roster ?? []
  const waitlist = roster.data?.waitlist ?? []
  const capacity = s ? slotCapacity(s.courts.length, s.playersPerCourt) : 0
  const inSessionIds = [...rosterList, ...waitlist].map((p) => p.clubPlayerId)

  const savedPlayers: AddPlayerCandidate[] = (clubPlayers.data?.players ?? []).map((p) => ({
    id: p.id,
    name: p.fullName,
    nickname: p.nickname,
    rtrId: p.rtrId,
    identity: p.identity,
    suggestion: p.suggestion,
    phoneHidden: p.phoneHidden,
  }))
  const directoryResults: AddPlayerCandidate[] = (directory.data ?? []).map((p) => ({
    id: p.id,
    name: p.fullName,
    nickname: p.nickname,
    rtrId: p.rtrId,
    identity: p.identity,
    suggestion: p.suggestion,
    rankLabel: rankLabel(p.rankLabel),
  }))

  const isPending = addSaved.isPending || addDirectory.isPending || addNew.isPending
  const options = {
    onSuccess: (result: { message: string }) => {
      setServerError(undefined)
      setLastAdded(result.message)
      setAddedCount((n) => n + 1)
      toast(result.message)
    },
    onError: (error: unknown) => {
      const message = errorMessage(error)
      setServerError(message)
      toast.error(message)
    },
  }

  const confirm = ({ candidate, source, level, identityCheck }: AddPlayerConfirmInput) => {
    setServerError(undefined)
    const identityCheckInput = identityCheck ?? undefined
    if (source === 'saved')
      addSaved.mutate(
        { sessionId, clubPlayerId: candidate.id, level, identityCheck: identityCheckInput },
        options,
      )
    else
      addDirectory.mutate(
        { sessionId, playerId: candidate.id, level, identityCheck: identityCheckInput },
        options,
      )
  }

  const submitNewPlayer = (values: NewPlayerFormValues) => {
    setServerError(undefined)
    addNew.mutate(
      {
        sessionId,
        name: values.name,
        nickname: values.nickname ?? undefined,
        phone: values.phone ?? undefined,
        level: values.level,
      },
      options,
    )
  }

  return (
    <AddPlayerSheet
      open={open}
      onOpenChange={onOpenChange}
      sessionTitle={s?.title ?? '…'}
      live={s?.state === 'active'}
      capacity={capacity}
      openSlots={Math.max(0, capacity - rosterList.length)}
      waitlistCount={waitlist.length}
      savedPlayers={savedPlayers}
      inSessionIds={inSessionIds}
      offline={offline}
      onDirectorySearch={setQuery}
      directoryResults={directoryResults}
      directoryLoading={!offline && directory.isFetching && !directory.data}
      needsConfirmStep={(candidate) => needsConfirmStep(candidate)}
      onConfirm={confirm}
      onSubmitNewPlayer={submitNewPlayer}
      isPending={isPending}
      serverError={serverError}
      lastAdded={lastAdded}
      addedCount={addedCount}
    />
  )
}
