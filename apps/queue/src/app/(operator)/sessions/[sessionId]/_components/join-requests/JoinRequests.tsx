'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { matchRequestFormatLabel } from '@rotra/data/match/matchRequestDecisions'
import { useAddMatchRequestToQueue } from '@rotra/data/match/useAddMatchRequestToQueue'
import { useDeclineMatchRequest } from '@rotra/data/match/useDeclineMatchRequest'
import type { MatchRequestSpot as RequestSpot } from '@rotra/data/match-request/types'
import { useSessionRequests } from '@rotra/data/match-request/useSessionRequests'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { isRealDataMode } from '@rotra/data/real/mode'
import { useConfirmRequest } from '@rotra/data/session-roster/useConfirmRequest'
import { useDeclineJoinRequest } from '@rotra/data/session-roster/useDeclineJoinRequest'
import { useDismissJoinRequestLink } from '@rotra/data/session-roster/useDismissJoinRequestLink'
import { useJoinRequestHints } from '@rotra/data/session-roster/useJoinRequestHints'
import { useKeepDropOut } from '@rotra/data/session-roster/useKeepDropOut'
import { useLinkJoinRequest } from '@rotra/data/session-roster/useLinkJoinRequest'
import { useRemoveDropOut } from '@rotra/data/session-roster/useRemoveDropOut'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { type JoinRequestDetails, JoinRequestsPanel } from '@rotra/ui/join-requests-panel'
import { levelLabel } from '@rotra/ui/level-pill'
import type { MatchRequestSpot } from '@rotra/ui/match-request-card'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { toast } from '@rotra/ui/toaster'
import { useRef } from 'react'

export type JoinRequestsProps = {
  sessionId: string
  /**
   * `card` (Preparation, between the header and the tabs) renders nothing while nothing waits;
   * `sheet` (the "Requests" sheet behind Requests · N) always renders the panel body.
   */
  variant?: 'card' | 'sheet'
  className?: string
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

const formatTime = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** “· On Court 2” / “· In queue #1” on a named spot, or nothing. */
function whereLabel(where: RequestSpot['where']) {
  if (!where) return undefined
  return where.kind === 'court' ? `On ${where.courtLabels}` : `In queue #${where.position}`
}

/**
 * Requests from the session page (Q18.12): JoinRequestsPanel with the Join tab (drop-out notices,
 * then join requests) and the Match tab. Join requests come from useSessionRoster; the ROTRA-player
 * hints, drop-out notices and match requests from useSessionRequests, and the shared rank and
 * phone-match prompt from useJoinRequestHints. Every decision toasts its result or its error; a
 * refused decision leaves the request waiting.
 */
export function JoinRequests({ sessionId, variant = 'card', className }: JoinRequestsProps) {
  const submitting = useRef(false)
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const requests = useSessionRequests(sessionId)
  const hints = useJoinRequestHints(sessionId)
  const clubPlayers = useClubPlayers()
  const confirm = useConfirmRequest()
  const decline = useDeclineJoinRequest()
  const link = useLinkJoinRequest()
  const notThem = useDismissJoinRequestLink()
  const keep = useKeepDropOut()
  const remove = useRemoveDropOut()
  const addMatch = useAddMatchRequestToQueue()
  const declineMatch = useDeclineMatchRequest()

  const run = <T,>(mutate: (input: T, options: object) => void, input: T, quiet = false) => {
    if (submitting.current) return
    submitting.current = true
    mutate(input, {
      onSettled: () => {
        submitting.current = false
      },
      onSuccess: (result: { message: string }) => {
        if (!quiet) toast(result.message)
      },
      onError: (error: unknown) => toast.error(errorMessage(error)),
    })
  }

  const s = session.data
  const joinRequests = roster.data?.joinRequests ?? []
  const pending = joinRequests.filter((r) => r.status === 'pending').length
  const view = requests.data
  const dropOuts = view?.dropOuts ?? []
  const matchRequests = view?.match ?? []
  const waiting = pending + dropOuts.length + matchRequests.length
  // The card only appears once something is waiting, so it stays hidden while loading; the sheet
  // always has a body and shows Skeleton rows until the roster arrives.
  const real = isRealDataMode()
  const loading = session.isPending || roster.isPending || (!real && requests.isPending)
  if (variant === 'card' && (loading || waiting === 0)) return null

  const capacity = s ? slotCapacity(s.courts.length, s.playersPerCourt) : 0
  const slotsFull = (roster.data?.roster.length ?? 0) >= capacity
  // Real mode has no Requests read yet; its refusal must not hide the guest requests that do work.
  const requestsError = real ? null : requests.error

  // D-2026-11-11-02: a Join from waitlist request names the player's current place.
  const waitlistOrder = (roster.data?.waitlist ?? []).slice().sort((a, b) => a.addedAt - b.addedAt)
  const waitlistPositionOf = (clubPlayerId: string | null | undefined) => {
    const index = clubPlayerId
      ? waitlistOrder.findIndex((w) => w.clubPlayerId === clubPlayerId)
      : -1
    return index < 0 ? null : index + 1
  }
  const requestDetails: Record<string, JoinRequestDetails> = {}
  for (const r of joinRequests)
    if (r.placement === 'from_waitlist')
      requestDetails[r.id] = { waitlistPosition: waitlistPositionOf(r.clubPlayerId) }
  for (const r of view?.join ?? []) {
    const hint = hints.data?.[r.id]
    const match = hint?.linked ?? hint?.phoneMatch
    requestDetails[r.id] = {
      ...requestDetails[r.id],
      account: r.account ? (r.account.inClub ? 'in-club' : 'new-to-club') : undefined,
      sharedRank: hint?.sharedRank ? levelLabel(hint.sharedRank) : null,
      invitedBy: r.invitedByName ?? undefined,
      phoneMatch: match
        ? {
            name: match.name,
            linked: Boolean(hint?.linked),
            onLink: () => run(link.mutate, { requestId: r.id, clubPlayerId: match.clubPlayerId }),
            onNotThem: () => run(notThem.mutate, r.id, true),
          }
        : undefined,
    }
  }

  // Real mode has no Requests read yet: a signed-in Player's request carries their account on the
  // roster read (#687), and Saved players says whether they're already in the club (#694).
  if (real)
    for (const r of joinRequests)
      if (r.playerId && !requestDetails[r.id]?.account)
        requestDetails[r.id] = {
          ...requestDetails[r.id],
          account: clubPlayers.data?.players.some((p) => p.playerId === r.playerId)
            ? 'in-club'
            : 'new-to-club',
        }

  // The prototype's avatar(): the saved player's picture on drop-out rows and named match spots.
  const photoFor = (rosterId: string) => {
    const row = roster.data?.roster.find((r) => r.id === rosterId)
    const p = row && clubPlayers.data?.players.find((item) => item.id === row.clubPlayerId)
    return p
      ? profilePictureSrc(p.picture, p.playerId ?? p.id, p.pictureName ?? p.fullName)
      : undefined
  }

  const minimum = view?.minimum ?? 0
  const spotOf = (role: MatchRequestSpot['role'], spot: RequestSpot | null): MatchRequestSpot => ({
    role,
    player: spot
      ? {
          name: spot.name,
          photoUrl: photoFor(spot.rosterId),
          games: spot.games,
          minimumGames: minimum,
          level: spot.level,
          where: whereLabel(spot.where),
        }
      : null,
  })

  const isPending =
    confirm.isPending ||
    decline.isPending ||
    link.isPending ||
    notThem.isPending ||
    keep.isPending ||
    remove.isPending ||
    addMatch.isPending ||
    declineMatch.isPending

  return (
    <JoinRequestsPanel
      loading={loading}
      isPending={isPending}
      serverError={
        confirm.error || decline.error || session.error || roster.error || requestsError
          ? errorMessage(
              confirm.error ?? decline.error ?? session.error ?? roster.error ?? requestsError,
            )
          : undefined
      }
      requests={joinRequests}
      requestDetails={requestDetails}
      dropOuts={dropOuts.map((d) => ({
        id: d.id,
        name: d.name,
        photoUrl: photoFor(d.pid),
        timeLabel: formatTime(d.at),
        isPending,
        onRemove: () => run(remove.mutate, { sessionId, noticeId: d.id }),
        onKeep: () => run(keep.mutate, { sessionId, noticeId: d.id }),
      }))}
      matchRequests={matchRequests.map((m) => ({
        id: m.id,
        requesterName: m.requester.name,
        formatLabel: matchRequestFormatLabel(m.format),
        requestedLabel: formatTime(m.at),
        spots: [
          spotOf('Requester', m.requester),
          ...m.partners.map((p) => spotOf('Partner', p)),
          ...m.opponents.map((p) => spotOf('Opponent', p)),
        ],
        isPending,
        onAddToQueue: () => run(addMatch.mutate, { sessionId, requestId: m.id }),
        onDecline: () => run(declineMatch.mutate, { sessionId, requestId: m.id }),
      }))}
      live={s?.state === 'active'}
      slotsFull={slotsFull}
      variant={variant}
      className={className}
      onConfirm={(requestId, level) => run(confirm.mutate, { requestId, level })}
      onDecline={(requestId) => run(decline.mutate, requestId)}
    />
  )
}
