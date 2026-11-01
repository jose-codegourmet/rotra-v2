'use client'

import { useAutoQueueDrafts } from '@rotra/data/match/useAutoQueueDrafts'
import { useEditAutoQueueDrafts } from '@rotra/data/match/useEditAutoQueueDrafts'
import { useGenerateAutoQueueDrafts } from '@rotra/data/match/useGenerateAutoQueueDrafts'
import { useTransferAutoQueueDrafts } from '@rotra/data/match/useTransferAutoQueueDrafts'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import {
  autoQueueDraftConflict,
  autoQueuePlayerCounts,
  AUTO_QUEUE_MODES,
} from '@rotra/data/match/auto-queue-rules'
import { activeMatchFor, allPlayers, FORMAT_LABELS, shortName } from '@rotra/data/match/match.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import {
  AutoQueueWorkspace,
  type AutoQueueCount,
  type AutoQueueMode,
  type AutoQueueWorkspaceProps,
  type QueueWorkspace,
} from '@rotra/ui/auto-queue-workspace'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { type ReactNode, useRef, useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'

export type AutoQueueProps = {
  sessionId: string
  workspace: QueueWorkspace
  onWorkspaceChange: (workspace: QueueWorkspace) => void
  mainQueue: ReactNode
}
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** In-memory draft wiring; accepted matches remain the sole source for dispatch and shared counts. */
export function AutoQueue({ sessionId, workspace, onWorkspaceChange, mainQueue }: AutoQueueProps) {
  const session = useQueueSession(sessionId),
    roster = useSessionRoster(sessionId),
    matches = useSessionMatches(sessionId)
  const drafts = useAutoQueueDrafts(sessionId)
  const edit = useEditAutoQueueDrafts(),
    generate = useGenerateAutoQueueDrafts(),
    transfer = useTransferAutoQueueDrafts()
  const [mode, setMode] = useState<AutoQueueMode>('available')
  const [count, setCount] = useState<AutoQueueCount | null>(null)
  const [target, setTarget] = useState('')
  const [errors, setErrors] = useState<Partial<Record<AutoQueueMode, string>>>({})
  const [transferError, setTransferError] = useState<string>()
  const busy = useRef(false)
  const confirmation = useRef<{ key: string; id: string } | null>(null)
  const failed = [session, roster, matches, drafts].find((query) => query.isError)
  if (failed) return <QueryError query={failed} title="Couldn't load Auto Queue." />
  const s = session.data,
    state = drafts.data
  if (!s || !state || !roster.data || !matches.data) return <Skeleton className="h-56 rounded-lg" />
  const ctx = { roster: roster.data.roster, matches: matches.data, courts: s.courts }
  const batches: AutoQueueWorkspaceProps['batches'] = {}
  for (const current of AUTO_QUEUE_MODES) {
    const batch = state.batches[current]
    const lineups = batch?.drafts ?? []
    const player = (id: string) => {
      const p = ctx.roster.find((p) => p.id === id)
      return { id, name: p ? shortName(p) : 'Player', ...autoQueuePlayerCounts(id, ctx, lineups) }
    }
    batches[current] = {
      stale: lineups.some((d) => d.fingerprint !== state.fingerprint),
      stopReason: batch?.stopReason,
      error: errors[current],
      drafts: lineups.map((draft) => ({
        id: draft.id,
        format: FORMAT_LABELS[draft.format],
        reason: draft.reason,
        teamA: draft.teamA.map(player),
        teamB: draft.teamB.map(player),
        attentionReason: autoQueueDraftConflict(draft, s, ctx) ?? undefined,
        blockedReason:
          draft.mode === 'ahead' && allPlayers(draft).some((id) => activeMatchFor(id, ctx.matches))
            ? 'A player is playing now; this match waits until they are free.'
            : undefined,
      })),
    }
  }
  const onGenerate = async (
    nextMode: AutoQueueMode,
    nextCount: AutoQueueCount,
    nextTarget: string,
    preserveSelected = false,
  ) => {
    if (busy.current) return
    busy.current = true
    setErrors((previous) => ({ ...previous, [nextMode]: undefined }))
    setTransferError(undefined)
    try {
      await generate.mutateAsync({
        sessionId,
        mode: nextMode,
        count: nextCount,
        preserveSelected,
        catchUpTarget: nextMode === 'catchup' ? Number(nextTarget) : undefined,
      })
    } catch (error) {
      setErrors((previous) => ({ ...previous, [nextMode]: errorMessage(error) }))
    } finally {
      busy.current = false
    }
  }
  const onEdit = async (input: Parameters<typeof edit.mutateAsync>[0]) => {
    if (busy.current) return
    busy.current = true
    setTransferError(undefined)
    try {
      await edit.mutateAsync(input)
    } catch (error) {
      setErrors((previous) => ({ ...previous, [mode]: errorMessage(error) }))
    } finally {
      busy.current = false
    }
  }
  const onTransfer = async (draftIds: string[]) => {
    if (busy.current) return false
    busy.current = true
    setTransferError(undefined)
    const key = JSON.stringify(draftIds)
    if (confirmation.current?.key !== key) confirmation.current = { key, id: crypto.randomUUID() }
    try {
      const result = await transfer.mutateAsync({
        sessionId,
        draftIds,
        operationId: confirmation.current.id,
      })
      confirmation.current = null
      toast(result.message)
      onWorkspaceChange('main')
      return true
    } catch (error) {
      setTransferError(errorMessage(error))
      return false
    } finally {
      busy.current = false
    }
  }
  return (
    <AutoQueueWorkspace
      workspace={workspace}
      onWorkspaceChange={onWorkspaceChange}
      mainQueue={mainQueue}
      mode={mode}
      onModeChange={setMode}
      count={count}
      onCountChange={setCount}
      catchUpTarget={target}
      onCatchUpTargetChange={setTarget}
      batches={batches}
      selectedIds={state.selectedIds}
      isPending={edit.isPending || generate.isPending || transfer.isPending}
      transferError={transferError}
      pendingMessage={
        generate.isPending
          ? 'Generating drafts…'
          : transfer.isPending
            ? 'Adding reviewed drafts…'
            : 'Updating drafts…'
      }
      onSelect={(draftId, selected) => {
        void onEdit({ sessionId, action: 'select', draftId, selected })
      }}
      onGenerate={onGenerate}
      onRegenerate={onGenerate}
      onRegenerateUnselected={(nextMode, nextCount, nextTarget) => {
        void onGenerate(nextMode, nextCount, nextTarget, true)
      }}
      onClear={(nextMode) => {
        void onEdit({ sessionId, action: 'clear', mode: nextMode, unselectedOnly: false })
      }}
      onClearUnselected={(nextMode) => {
        void onEdit({ sessionId, action: 'clear', mode: nextMode, unselectedOnly: true })
      }}
      onAddToMainQueue={onTransfer}
    />
  )
}
