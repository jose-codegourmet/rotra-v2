'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import {
  AUTO_QUEUE_MODES,
  autoQueueDraftConflict,
  toggleBaggingGame,
} from '@rotra/data/match/auto-queue-rules'
import { gamesPlayedFor, queueMasterName } from '@rotra/data/match/match.rules'
import { matchCategoryFor } from '@rotra/data/match/matchCategory.rules'
import { autoQueueEmptyText, draftWaitStatus } from '@rotra/data/match/plan-ahead-rules'
import { useAutoQueueDrafts } from '@rotra/data/match/useAutoQueueDrafts'
import { useEditAutoQueueDrafts } from '@rotra/data/match/useEditAutoQueueDrafts'
import { useExemptionList } from '@rotra/data/match/useExemptionList'
import { useGenerateAutoQueueDrafts } from '@rotra/data/match/useGenerateAutoQueueDrafts'
import { useSaveExemptionList } from '@rotra/data/match/useSaveExemptionList'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useTransferAutoQueueDrafts } from '@rotra/data/match/useTransferAutoQueueDrafts'
import { sessionScoring } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { levelLabel } from '@rotra/data/session-roster/sessionRoster.rules'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import {
  type AutoQueueBaggingProps,
  type AutoQueueCount,
  type AutoQueueExemptionProps,
  type AutoQueueMode,
  AutoQueueWorkspace,
  type AutoQueueWorkspaceProps,
} from '@rotra/ui/auto-queue-workspace'
import type { BaggingPlayer } from '@rotra/ui/bagging-pairs-card'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { usePlayerGames } from '@/app/(operator)/sessions/[sessionId]/_components/player-games/PlayerGames'

export type AutoQueueProps = {
  sessionId: string
  /** The console clock: finish times and who is free are measured against it */
  now: number
  /** After reviewed drafts join the Main Queue: the console returns to the Main Queue tab */
  onAddedToMainQueue: () => void
}
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'
/** A roster player as the bagging surfaces draw them; a player gone from the roster keeps a name. */
const baggingPlayer = (p: SessionPlayer | undefined, id: string): BaggingPlayer => ({
  id,
  name: p?.nameSnapshot ?? 'Player',
  shortName: p ? queueMasterName(p) : 'Player',
  level: p?.level ?? null,
  levelLabel: p?.level ? levelLabel(p.level) : null,
})

/** In-memory draft wiring; accepted matches remain the sole source for dispatch and shared counts. */
export function AutoQueue({ sessionId, now, onAddedToMainQueue }: AutoQueueProps) {
  const session = useQueueSession(sessionId),
    roster = useSessionRoster(sessionId),
    matches = useSessionMatches(sessionId)
  const clubPlayers = useClubPlayers()
  /** The face is the saved player's own picture (or character), like the Queue tab */
  const photoOf = (p: SessionPlayer | undefined) => {
    const clubPlayer = p && clubPlayers.data?.players.find((item) => item.id === p.clubPlayerId)
    return clubPlayer
      ? profilePictureSrc(
          clubPlayer.picture,
          clubPlayer.playerId ?? clubPlayer.id,
          clubPlayer.pictureName ?? clubPlayer.fullName,
        )
      : undefined
  }
  const face = (p: SessionPlayer | undefined, id: string): BaggingPlayer => ({
    ...baggingPlayer(p, id),
    photoUrl: photoOf(p),
  })
  const drafts = useAutoQueueDrafts(sessionId)
  const exemptionList = useExemptionList(sessionId),
    saveExemption = useSaveExemptionList()
  const playerGames = usePlayerGames()
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
  const failed = [session, roster, matches, drafts, exemptionList].find((query) => query.isError)
  if (failed) return <QueryError query={failed} title="Couldn't load Generate Queue." />
  const s = session.data,
    state = drafts.data
  if (!s || !state || !roster.data || !matches.data || !exemptionList.data)
    return <Skeleton className="h-56 rounded-lg" />
  const ctx = { roster: roster.data.roster, matches: matches.data, courts: s.courts, now }
  const scoring = sessionScoring(s)
  const batches: AutoQueueWorkspaceProps['batches'] = {}
  for (const current of AUTO_QUEUE_MODES) {
    const batch = state.batches[current]
    const lineups = batch?.drafts ?? []
    const player = (id: string) => {
      const p = ctx.roster.find((p) => p.id === id)
      return {
        id,
        name: p ? queueMasterName(p) : 'Player',
        fullName: p?.nameSnapshot,
        level: p?.level ?? null,
        photoUrl: photoOf(p),
        games: gamesPlayedFor(id, ctx),
      }
    }
    batches[current] = {
      stale: lineups.some((d) => d.fingerprint !== state.fingerprint),
      stopReason: batch?.stopReason,
      error: errors[current],
      drafts: lineups.map((draft) => {
        // A draft with someone on a court waits for the match that finishes last (Plan Ahead).
        const wait = draftWaitStatus(draft, ctx, scoring, now)
        return {
          id: draft.id,
          format: draft.format,
          categoryPrefix: matchCategoryFor(draft, ctx.roster),
          reason: wait?.text ?? draft.reason,
          statusTone: wait?.phase === 'long' ? ('warn' as const) : ('muted' as const),
          teamA: draft.teamA.map(player),
          teamB: draft.teamB.map(player),
          attentionReason: autoQueueDraftConflict(draft, s, ctx) ?? undefined,
        }
      }),
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
    if (busy.current) return false
    busy.current = true
    setTransferError(undefined)
    try {
      await edit.mutateAsync(input)
      return true
    } catch (error) {
      setErrors((previous) => ({ ...previous, [mode]: errorMessage(error) }))
      return false
    } finally {
      busy.current = false
    }
  }
  // Bagging mode (#739): doubles only, kept with the drafts on this device. Names in the toasts are
  // the roster's short names, like the pair rows.
  const rosterPlayer = (id: string) => ctx.roster.find((p) => p.id === id)
  const pairNames = (a: string, b: string) =>
    `${baggingPlayer(rosterPlayer(a), a).shortName} and ${baggingPlayer(rosterPlayer(b), b).shortName}`
  const bagging: AutoQueueBaggingProps | undefined = s.allowDoubles
    ? {
        enabled: state.bagging.enabled,
        players: ctx.roster.filter((p) => p.present).map((p) => face(p, p.id)),
        pairs: state.bagging.pairs.map((pair) => ({
          id: pair.id,
          a: face(rosterPlayer(pair.a), pair.a),
          b: face(rosterPlayer(pair.b), pair.b),
          games: pair.games,
        })),
        onEnabledChange: async (enabled) => {
          if (await onEdit({ sessionId, action: 'bagging-enabled', enabled }))
            toast(enabled ? 'Bagging mode on' : 'Bagging mode off')
        },
        onAddPair: async (pair) => {
          const ok = await onEdit({ sessionId, action: 'bagging-add', ...pair })
          if (ok) toast(`Bagging pair added · ${pairNames(pair.a, pair.b)}`)
          return ok
        },
        onToggleGame: (pairId, value) => {
          const pair = state.bagging.pairs.find((current) => current.id === pairId)
          if (!pair) return
          void onEdit({
            sessionId,
            action: 'bagging-games',
            pairId,
            games: toggleBaggingGame(pair.games, value, s.minimumGames),
          })
        },
        onRemovePair: async (pairId) => {
          const pair = state.bagging.pairs.find((current) => current.id === pairId)
          if (!pair) return
          if (await onEdit({ sessionId, action: 'bagging-remove', pairId }))
            toast(`Pair removed · ${pairNames(pair.a, pair.b)}`)
        },
      }
    : undefined
  const exemption: AutoQueueExemptionProps = {
    players: ctx.roster.map((p) => ({
      id: p.id,
      name: p.nameSnapshot,
      shortName: queueMasterName(p),
      level: p.level ?? null,
      photoUrl: photoOf(p),
      games: gamesPlayedFor(p.id, ctx),
      present: p.present,
    })),
    exemptIds: exemptionList.data,
    onSave: (ids) => {
      if (saveExemption.isPending) return
      saveExemption.mutate(
        { sessionId, ids },
        {
          onSuccess: (result) => toast(result.message),
          onError: (error) => toast.error(errorMessage(error)),
        },
      )
    },
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
      onAddedToMainQueue()
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
      mode={mode}
      onModeChange={setMode}
      count={count}
      onCountChange={setCount}
      minimumGames={s.minimumGames}
      noEligibleText={autoQueueEmptyText(mode, s, ctx, now)}
      catchUpTarget={target}
      onCatchUpTargetChange={setTarget}
      batches={batches}
      selectedIds={state.selectedIds}
      isPending={
        edit.isPending || generate.isPending || transfer.isPending || saveExemption.isPending
      }
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
      onUnselectAll={() => {
        void onEdit({ sessionId, action: 'unselect-all' })
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
      bagging={bagging}
      exemption={exemption}
      onOpenGames={playerGames.open}
    />
  )
}
