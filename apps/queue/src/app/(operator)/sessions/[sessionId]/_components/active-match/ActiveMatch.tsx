'use client'

import {
  countedGames,
  courtNames,
  shortName,
  substitutionCandidates,
  waitMinutes,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import { useCompleteMatch } from '@rotra/data/match/useCompleteMatch'
import { useInvalidateMatch } from '@rotra/data/match/useInvalidateMatch'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useSubstitutePlayer } from '@rotra/data/match/useSubstitutePlayer'
import { MockError } from '@rotra/data/mock/errors'
import type { QueueSession } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { ActiveMatchSheet } from '@rotra/ui/active-match-sheet'
import { ConfirmResultSheet } from '@rotra/ui/confirm-result-sheet'
import { MatchResultForm } from '@rotra/ui/forms/match-result-form'
import type {
  MatchResultFormInput,
  MatchResultFormValues,
} from '@rotra/ui/forms/match-result-form/schema'
import { InvalidMatchSheet } from '@rotra/ui/invalid-match-sheet'
import { type SubstitutionPlayer, SubstitutionSheet } from '@rotra/ui/substitution-sheet'
import type { TeamLineupPlayer } from '@rotra/ui/team-lineup'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useRef, useState } from 'react'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'

export type ActiveMatchProps = {
  sessionId: string
  /** The console clock: "M min in" and the replacement tiles' rest minutes are measured against it */
  now: number
  /** The active match to open (Open match on an in-game court card); null keeps the sheet closed */
  matchId: string | null
  onClose: () => void
}

/** Where the one sheet is: the active match, the two result steps, the two substitution steps, or the invalid dialog */
type Step =
  | { kind: 'active' }
  | { kind: 'result'; input: Partial<MatchResultFormInput> }
  | { kind: 'review'; values: MatchResultFormValues; operationId: string }
  | { kind: 'substitute'; outId: string | null; inId: string | null }
  | { kind: 'confirm-sub'; outId: string; inId: string; operationId: string }
  | { kind: 'invalid'; operationId: string }

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** The commit could not be made durable on this device ("Changes could not be saved") or offline without a copy */
const isSaveFailure = (error: unknown) =>
  error instanceof MockError && (error.kind === 'retryable' || error.kind === 'offline')

/** The recheck at confirmation found a change (player gone, match already decided): refetch so the sheet shows it */
const isRecheckFailure = (error: unknown) =>
  error instanceof MockError && error.kind === 'conflict'

/** One confirmation ID per review: a retry after a timeout replays the same operation, never a competing outcome */
const newOperationId = () => crypto.randomUUID()

/**
 * Q-ACTIVE-MATCH and its three paths, one sheet whose step lives here. Match done: MatchResultForm
 * (Q-MATCH-DONE) → ConfirmResultSheet (D-WINNER) → useCompleteMatch, then the sheet closes with
 * "Team A wins match N · Court X free". Mark invalid: InvalidMatchSheet (D-INVALID-MATCH) →
 * useInvalidateMatch, "Match N marked invalid · Court X free"; Keep playing returns to the active
 * sheet. Substitute player: SubstitutionSheet pick → Confirm substitution (D-SUBSTITUTE) →
 * useSubstitutePlayer, then back to the active sheet with "Kiko in for Jom" and the substitution
 * line. Back returns to the previous step with what was entered; closing at any step before a
 * confirmation changes nothing and the court stays in use. A failed commit shows inside the sheet
 * and nothing is claimed as saved: a local save failure ("Changes could not be saved") is also an
 * error toast, the match stays active with its court(s) in use and the typed scores kept, and the
 * operation ID is fixed when the review step opens, so a retry replays the same confirmation.
 * "Something changed" refetches so the sheet shows what changed. Offline (with a downloaded copy)
 * each confirmation saves locally, the outcome is permanent at once and its toast ends in " · Saved
 * on this device, waiting to sync". Player cards open the profile with Back to match.
 */
export function ActiveMatch({ sessionId, now, matchId, onClose }: ActiveMatchProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const s = session.data
  const match = matchId ? matches.data?.find((m) => m.id === matchId) : undefined
  // The match ended elsewhere (confirmed on another device, or the session was refetched after a
  // decision): there is nothing to control, so the sheet closes, as the prototype's confirmResult does.
  const gone = Boolean(matchId && matches.data && (!match || match.state !== 'active'))
  useEffect(() => {
    if (gone) onClose()
  }, [gone, onClose])

  if (!match || match.state !== 'active' || !s || !roster.data || !matches.data) return null
  const refresh = () => {
    void session.refetch()
    void roster.refetch()
    void matches.refetch()
  }
  return (
    <OpenActiveMatch
      key={match.id}
      sessionId={sessionId}
      now={now}
      session={s}
      roster={roster.data.roster}
      matches={matches.data}
      match={match}
      onClose={onClose}
      onRefresh={refresh}
    />
  )
}

type OpenActiveMatchProps = Omit<ActiveMatchProps, 'matchId'> & {
  session: QueueSession
  roster: SessionPlayer[]
  matches: Match[]
  match: Match
  /** The recheck refused the commit: refetch so the sheet shows the current players and match */
  onRefresh: () => void
}

/** The open sheet: mounted per match, so its step and choices start fresh for each Open match */
function OpenActiveMatch({
  sessionId,
  now,
  session,
  roster,
  matches,
  match,
  onClose,
  onRefresh,
}: OpenActiveMatchProps) {
  const completeMatch = useCompleteMatch()
  const invalidateMatch = useInvalidateMatch()
  const substitutePlayer = useSubstitutePlayer()
  const [step, setStep] = useState<Step>({ kind: 'active' })
  const [error, setError] = useState<string | undefined>()
  const [profileId, setProfileId] = useState<string | null>(null)
  // One commit per attempt: a second tap can land before isPending reaches this render.
  const committing = useRef(false)

  const byId = (id: string) => roster.find((p) => p.id === id)
  const player = (id: string): TeamLineupPlayer => {
    const p = byId(id)
    return {
      id,
      name: p?.nameSnapshot ?? 'Player',
      shortName: p ? shortName(p) : 'Player',
      level: p?.level ?? null,
      games: countedGames(id, matches),
    }
  }
  const substitutionPlayer = (p: SessionPlayer): SubstitutionPlayer => ({
    id: p.id,
    name: p.nameSnapshot,
    level: p.level,
    games: countedGames(p.id, matches),
    restMinutes: waitMinutes(p, matches, session.startedAt, now),
  })
  const teamA = match.teamA.map(player)
  const teamB = match.teamB.map(player)
  const courtLabel = courtNames(match, session.courts)
  const courtLabels = match.courtIds.map(
    (id) => session.courts.find((c) => c.id === id)?.label ?? 'Court',
  )
  const names = (ids: string[]) => ids.map((id) => player(id).shortName)
  const substitutions = match.substitutions.map((sub) => ({
    outName: byId(sub.outId)?.nameSnapshot ?? 'Player',
    inName: byId(sub.inId)?.nameSnapshot ?? 'Player',
  }))

  const go = (next: Step) => {
    setError(undefined)
    setStep(next)
  }
  const close = () => {
    setError(undefined)
    setProfileId(null)
    onClose()
  }
  /** Closing at any step before a confirmation changes nothing; blocked while a commit runs */
  const onOpenChange = (open: boolean) => {
    if (!open && !committing.current) close()
  }
  const openProfile = (rosterId: string) => {
    const clubPlayerId = byId(rosterId)?.clubPlayerId
    if (clubPlayerId) setProfileId(clubPlayerId)
  }

  const pending = completeMatch.isPending || invalidateMatch.isPending || substitutePlayer.isPending
  const begin = () => {
    if (committing.current || pending) return false
    committing.current = true
    setError(undefined)
    return true
  }
  /**
   * Nothing was written: the step, its operationId and what was entered stay for the retry. A save
   * failure is also an error toast ("Changes could not be saved"); a recheck refusal refetches.
   */
  const onFailure = (err: unknown) => {
    setError(errorMessage(err))
    if (isSaveFailure(err)) toast.error(errorMessage(err))
    if (isRecheckFailure(err)) onRefresh()
  }
  const onSettled = () => {
    committing.current = false
  }

  const onConfirmResult = () => {
    if (step.kind !== 'review' || !begin()) return
    const { values, operationId } = step
    completeMatch.mutate(
      {
        matchId: match.id,
        winningTeam: values.winningTeam,
        teamAScore: values.teamAScore,
        teamBScore: values.teamBScore,
        operationId,
      },
      {
        onSuccess: (result) => {
          toast(result.message)
          close()
        },
        onError: onFailure,
        onSettled,
      },
    )
  }

  const onConfirmInvalid = () => {
    if (step.kind !== 'invalid' || !begin()) return
    invalidateMatch.mutate(
      { matchId: match.id, operationId: step.operationId },
      {
        onSuccess: (result) => {
          toast(result.message)
          close()
        },
        onError: onFailure,
        onSettled,
      },
    )
  }

  const onConfirmSubstitution = () => {
    if (step.kind !== 'confirm-sub' || !begin()) return
    const { outId, inId, operationId } = step
    substitutePlayer.mutate(
      { matchId: match.id, outId, inId, operationId },
      {
        onSuccess: (result) => {
          toast(result.message)
          go({ kind: 'active' })
        },
        onError: onFailure,
        onSettled,
      },
    )
  }

  /** Review result passed validation: the confirm step, with what was entered kept for Back to result */
  const onReviewResult = (values: MatchResultFormValues) =>
    go({ kind: 'review', values, operationId: newOperationId() })
  const resultInputOf = (values: MatchResultFormValues): Partial<MatchResultFormInput> => ({
    winner: values.winningTeam,
    scoreA: values.teamAScore === null ? '' : String(values.teamAScore),
    scoreB: values.teamBScore === null ? '' : String(values.teamBScore),
  })

  const profile = (
    // Back to match closes the profile; the sheet underneath is unchanged
    <PlayerProfile
      clubPlayerId={profileId}
      onClose={() => setProfileId(null)}
      backLabel="match"
      onBack={() => setProfileId(null)}
    />
  )

  if (step.kind === 'result')
    return (
      <>
        <MatchResultForm
          open
          onOpenChange={onOpenChange}
          matchNo={match.matchNo}
          teamANames={names(match.teamA)}
          teamBNames={names(match.teamB)}
          onSubmit={onReviewResult}
          onBack={() => go({ kind: 'active' })}
          defaultValues={step.input}
        />
        {profile}
      </>
    )

  if (step.kind === 'review')
    return (
      <>
        <ConfirmResultSheet
          open
          onOpenChange={onOpenChange}
          winningTeam={step.values.winningTeam}
          teamANames={names(match.teamA)}
          teamBNames={names(match.teamB)}
          teamAScore={step.values.teamAScore}
          teamBScore={step.values.teamBScore}
          courtLabels={courtLabels}
          onConfirm={onConfirmResult}
          onBack={() => go({ kind: 'result', input: resultInputOf(step.values) })}
          isPending={completeMatch.isPending}
          error={error}
        />
        {profile}
      </>
    )

  if (step.kind === 'substitute' || step.kind === 'confirm-sub') {
    const inMatch: (SubstitutionPlayer & { team: 'A' | 'B' })[] = [
      ...match.teamA.map((id) => ({ id, team: 'A' as const })),
      ...match.teamB.map((id) => ({ id, team: 'B' as const })),
    ].map(({ id, team }) => {
      const p = byId(id)
      return p
        ? { ...substitutionPlayer(p), team }
        : { id, name: 'Player', level: null, games: countedGames(id, matches), team }
    })
    const candidates = substitutionCandidates(match, roster, matches).map(substitutionPlayer)
    const picked = step.kind === 'substitute' ? step : { outId: step.outId, inId: step.inId }
    return (
      <>
        <SubstitutionSheet
          open
          onOpenChange={onOpenChange}
          matchNo={match.matchNo}
          inMatch={inMatch}
          candidates={candidates}
          minimumGames={session.minimumGames}
          step={step.kind === 'confirm-sub' ? 'confirm' : 'pick'}
          outId={picked.outId}
          inId={picked.inId}
          onPickOut={(outId) => go({ kind: 'substitute', outId, inId: picked.inId })}
          onPickIn={(inId) => go({ kind: 'substitute', outId: picked.outId, inId })}
          onReview={() => {
            if (picked.outId && picked.inId)
              go({
                kind: 'confirm-sub',
                outId: picked.outId,
                inId: picked.inId,
                operationId: newOperationId(),
              })
          }}
          onBack={() => go({ kind: 'active' })}
          onBackToPick={() => {
            if (!committing.current)
              go({ kind: 'substitute', outId: picked.outId, inId: picked.inId })
          }}
          onConfirm={onConfirmSubstitution}
          isPending={substitutePlayer.isPending}
          error={error}
        />
        {profile}
      </>
    )
  }

  if (step.kind === 'invalid')
    return (
      <>
        <InvalidMatchSheet
          open
          onOpenChange={onOpenChange}
          matchNo={match.matchNo}
          courtLabels={courtLabels}
          teamA={teamA}
          teamB={teamB}
          minimumGames={session.minimumGames}
          onSelectPlayer={openProfile}
          onConfirm={onConfirmInvalid}
          onKeepPlaying={() => {
            if (!committing.current) go({ kind: 'active' })
          }}
          isPending={invalidateMatch.isPending}
          error={error}
        />
        {profile}
      </>
    )

  return (
    <>
      <ActiveMatchSheet
        open
        onOpenChange={onOpenChange}
        matchNo={match.matchNo}
        courtLabel={courtLabel}
        format={match.format}
        startedAt={match.startedAt ?? now}
        now={now}
        teamA={teamA}
        teamB={teamB}
        minimumGames={session.minimumGames}
        substitutions={substitutions}
        onSelectPlayer={openProfile}
        onMarkInvalid={() => go({ kind: 'invalid', operationId: newOperationId() })}
        onSubstitute={() => go({ kind: 'substitute', outId: null, inId: null })}
        onMatchDone={() => go({ kind: 'result', input: {} })}
      />
      {profile}
    </>
  )
}
