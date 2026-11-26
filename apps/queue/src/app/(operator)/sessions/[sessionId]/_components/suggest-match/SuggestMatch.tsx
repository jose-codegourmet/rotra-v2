'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import {
  activeMatchFor,
  allPlayers,
  countedGames,
  queueMasterName,
  waitMinutes,
} from '@rotra/data/match/match.rules'
import { generateMatches } from '@rotra/data/match/queue.rules'
import type { Match, MatchLineup } from '@rotra/data/match/types'
import { useAddSuggestedMatch } from '@rotra/data/match/useAddSuggestedMatch'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import type { QueueSession } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { ReplacePlayerSheet } from '@rotra/ui/replace-player-sheet'
import { type SuggestedLineup, SuggestedMatchSheet } from '@rotra/ui/suggested-match-sheet'
import { pickerPlayer, type SwapPickerPlayer } from '@rotra/ui/swap-picker-sheet'
import type { SwapSlot } from '@rotra/ui/swap-sides-area'
import type { TeamLineupPlayer } from '@rotra/ui/team-lineup'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'

export type SuggestMatchProps = {
  sessionId: string
  open: boolean
  /** The console clock, for the rest minutes in the Replace picker */
  now: number
  /** × / Escape / the scrim / ← Back: one level back (the free court sheet) or closed when first */
  onBack: () => void
  /** The suggestion was added: the shell closes the whole stack and shows the Queue tab */
  onAdded: () => void
}

type Suggestion = { lineup: MatchLineup | null; reason: string | undefined }

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** The players of a lineup as a comparable key, ignoring order within teams */
const lineupKey = (m: MatchLineup | null) =>
  m ? `${[...m.teamA].sort().join()}|${[...m.teamB].sort().join()}` : ''

/** One lineup from the reference heuristic, or why none is possible */
function suggest(session: QueueSession, roster: SessionPlayer[], matches: Match[]): Suggestion {
  const result = generateMatches(session, roster, matches, 1, Math.random)
  return result.error
    ? { lineup: null, reason: result.error }
    : { lineup: result.matches[0] ?? null, reason: undefined }
}

/**
 * Q-SUGGEST: SuggestedMatchSheet on one lineup from generateMatches(…, 1). Reshuffle draws a
 * new one (up to 8 draws until the four change; the faces deal back in) and clears the edited flag;
 * switching two players (drag or ← / →) changes only the shown lineup, toasts "Mikee and Dexter
 * switched sides" and marks it edited. A player card opens "Replace a player in the suggested
 * match" (ReplacePlayerSheet) on the shown lineup only: Replace toasts "NAME in for NAME", Swap
 * from match toasts "A and B swapped places", both mark it edited and nothing is written; its ×,
 * Escape, the scrim and Back return here. ← Back (and ×, Escape, the scrim) calls onBack: one
 * level back, or closed when this was the first dialog. Add to queue calls useAddSuggestedMatch
 * (protected when edited) and onAdded closes the whole stack. A player's picture opens the
 * profile with Back to suggestion. The sheet is generated afresh each time it opens.
 */
export function SuggestMatch({ sessionId, open, now, onBack, onAdded }: SuggestMatchProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const s = session.data
  if (!open || !s || !roster.data || !matches.data) return null
  return (
    <OpenSuggestMatch
      sessionId={sessionId}
      session={s}
      roster={roster.data.roster}
      matches={matches.data}
      now={now}
      onBack={onBack}
      onAdded={onAdded}
    />
  )
}

type OpenSuggestMatchProps = Omit<SuggestMatchProps, 'open'> & {
  session: QueueSession
  roster: SessionPlayer[]
  matches: Match[]
}

/** The open sheet: mounted while open, so its first suggestion is drawn in the state initializer */
function OpenSuggestMatch({
  sessionId,
  session,
  roster,
  matches,
  now,
  onBack,
  onAdded,
}: OpenSuggestMatchProps) {
  const addSuggested = useAddSuggestedMatch()
  const [suggestion, setSuggestion] = useState<Suggestion>(() => suggest(session, roster, matches))
  /** Edited: switched sides or replaced a player, so Add to queue adds it protected */
  const [switched, setSwitched] = useState(false)
  /** The open Replace a player picker: who is coming out, the replacement or the opponent swapped with */
  const [replace, setReplace] = useState<{
    out: string
    in: string | null
    swap: string | null
  } | null>(null)
  /** Counts the Reshuffle draws: the sheet deals the faces in again when it changes */
  const [dealKey, setDealKey] = useState(0)
  const [profileId, setProfileId] = useState<string | null>(null)
  // One add per attempt: a second tap can land before isPending reaches this render.
  const adding = useRef(false)

  const byId = (id: string) => roster.find((p) => p.id === id)
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
  const player = (id: string): TeamLineupPlayer => {
    const p = byId(id)
    return {
      id,
      name: p?.nameSnapshot ?? 'Player',
      shortName: p ? queueMasterName(p) : 'Player',
      level: p?.level ?? null,
      games: countedGames(id, matches),
      photoUrl: photoOf(p),
    }
  }
  const lineup = suggestion.lineup
  const shown: SuggestedLineup | null = lineup
    ? { format: lineup.format, teamA: lineup.teamA.map(player), teamB: lineup.teamB.map(player) }
    : null

  const onReshuffle = () => {
    // Up to 8 draws until the four change, as the prototype's reshuffleSuggest does.
    const before = lineupKey(suggestion.lineup)
    let next = suggest(session, roster, matches)
    for (let i = 1; i < 8 && next.lineup && lineupKey(next.lineup) === before; i++)
      next = suggest(session, roster, matches)
    setSuggestion(next)
    setSwitched(false)
    setDealKey((key) => key + 1)
  }

  // Switching sides changes only the shown lineup; the match is protected only once added.
  const onSwap = (from: SwapSlot, to: SwapSlot) => {
    if (!lineup || from.team === to.team) return
    const a = (from.team === 'A' ? lineup.teamA : lineup.teamB)[from.index]
    const b = (to.team === 'A' ? lineup.teamA : lineup.teamB)[to.index]
    if (!a || !b) return
    const exchange = (id: string) => (id === a ? b : id === b ? a : id)
    setSuggestion({
      lineup: {
        format: lineup.format,
        teamA: lineup.teamA.map(exchange),
        teamB: lineup.teamB.map(exchange),
      },
      reason: undefined,
    })
    setSwitched(true)
    toast(`${player(a).shortName} and ${player(b).shortName} switched sides`)
  }

  const onAdd = () => {
    if (!lineup || adding.current || addSuggested.isPending) return
    adding.current = true
    addSuggested.mutate(
      { sessionId, lineup, switched },
      {
        onSuccess: (result) => {
          toast(result.message)
          onAdded()
        },
        onError: (error) => toast.error(errorMessage(error)),
        onSettled: () => {
          adding.current = false
        },
      },
    )
  }

  const fullName = (id: string) => byId(id)?.nameSnapshot ?? 'Player'
  const replaceTile = (id: string) => {
    const p = byId(id)
    return {
      id,
      name: fullName(id),
      level: p?.level ?? null,
      games: countedGames(id, matches),
      restMinutes: p ? waitMinutes(p, matches, session.startedAt, now) : 0,
      shortName: p ? queueMasterName(p) : 'Player',
      photoUrl: photoOf(p),
    }
  }
  const inLineup = lineup ? allPlayers(lineup) : []
  const freeToReplace = roster.filter(
    (p) =>
      p.sessionId === session.id &&
      p.present &&
      !inLineup.includes(p.id) &&
      !activeMatchFor(p.id, matches),
  )
  /** Everyone else on tonight's roster for All players: away, on court or playing */
  const replaceOthers = (): SwapPickerPlayer[] =>
    roster
      .filter(
        (p) =>
          p.sessionId === session.id &&
          !inLineup.includes(p.id) &&
          !freeToReplace.some((f) => f.id === p.id),
      )
      .map((p) => {
        const busy = activeMatchFor(p.id, matches)
        return pickerPlayer(
          replaceTile(p.id),
          busy ? (busy.state === 'on_court' ? 'on-court' : 'playing') : 'away',
        )
      })
  // The suggested lineup is edited in place: nothing is written until Add to queue.
  const changeLineup = (swap: (ids: string[]) => string[], message: string) => {
    if (!lineup) return
    setSuggestion({
      lineup: { format: lineup.format, teamA: swap(lineup.teamA), teamB: swap(lineup.teamB) },
      reason: undefined,
    })
    setSwitched(true)
    setReplace(null)
    toast(message)
  }
  const onConfirmReplace = () => {
    if (!replace?.in) return
    const { out, in: inn } = replace
    changeLineup(
      (ids) => ids.map((id) => (id === out ? inn : id)),
      `${fullName(inn)} in for ${fullName(out)}`,
    )
  }
  const onSwapFromMatch = (out: string, opponent: string) =>
    changeLineup(
      (ids) => ids.map((id) => (id === out ? opponent : id === opponent ? out : id)),
      `${player(out).shortName} and ${player(opponent).shortName} swapped places`,
    )

  const openProfile = (rosterId: string) => {
    const clubPlayerId = byId(rosterId)?.clubPlayerId
    if (clubPlayerId) setProfileId(clubPlayerId)
  }

  return (
    <>
      <SuggestedMatchSheet
        open
        onOpenChange={(next) => {
          if (!next) onBack()
        }}
        lineup={shown}
        reason={suggestion.reason}
        sessionMode={session.sessionMode}
        minimumGames={session.minimumGames}
        onSelectPlayer={openProfile}
        onSwap={onSwap}
        onReshuffle={onReshuffle}
        onReplace={(playerId) => setReplace({ out: playerId, in: null, swap: null })}
        onBack={onBack}
        dealKey={dealKey}
        onAdd={onAdd}
        isPending={addSuggested.isPending}
      />
      {lineup && replace ? (
        <ReplacePlayerSheet
          open
          title="Replace a player in the suggested match"
          backLabel="Back to the suggested match"
          note="This only changes the suggested lineup. Nothing is recorded until you add it to the queue."
          inMatch={[
            ...lineup.teamA.map((id) => ({
              ...replaceTile(id),
              team: 'A' as const,
              present: byId(id)?.present ?? false,
            })),
            ...lineup.teamB.map((id) => ({
              ...replaceTile(id),
              team: 'B' as const,
              present: byId(id)?.present ?? false,
            })),
          ]}
          candidates={freeToReplace.map((p) => replaceTile(p.id))}
          others={replaceOthers()}
          minimumGames={session.minimumGames}
          outId={replace.out}
          inId={replace.in}
          onPickOut={(id) => setReplace({ out: id, in: null, swap: null })}
          onPickIn={(id) => setReplace({ ...replace, in: id, swap: null })}
          onPickSwap={(opponentId) => setReplace({ ...replace, in: null, swap: opponentId })}
          swapId={replace.swap}
          onSwapFromMatch={onSwapFromMatch}
          onBack={() => setReplace(null)}
          onConfirm={onConfirmReplace}
        />
      ) : null}
      {/* Back to suggestion closes the profile; focus returns to the card that opened it */}
      <PlayerProfile
        clubPlayerId={profileId}
        onClose={() => setProfileId(null)}
        backLabel="suggestion"
        onBack={() => setProfileId(null)}
      />
    </>
  )
}
