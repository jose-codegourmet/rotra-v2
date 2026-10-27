'use client'

import { countedGames, shortName } from '@rotra/data/match/match.rules'
import { generateMatches } from '@rotra/data/match/queue.rules'
import type { Match, MatchLineup } from '@rotra/data/match/types'
import { useAddSuggestedMatch } from '@rotra/data/match/useAddSuggestedMatch'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import type { QueueSession } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { type SuggestedLineup, SuggestedMatchSheet } from '@rotra/ui/suggested-match-sheet'
import type { SwapSlot } from '@rotra/ui/swap-sides-area'
import type { TeamLineupPlayer } from '@rotra/ui/team-lineup'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'

export type SuggestMatchProps = {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit then add: the shell opens the Add match sheet pre-filled with this lineup */
  onEditThenAdd: (lineup: MatchLineup) => void
  /** The suggestion was added: the shell switches the console to the Queue tab */
  onAdded: () => void
}

type Suggestion = { lineup: MatchLineup | null; reason: string | undefined }

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** One lineup from the reference heuristic, or why none is possible */
function suggest(session: QueueSession, roster: SessionPlayer[], matches: Match[]): Suggestion {
  const result = generateMatches(session, roster, matches, 1, Math.random)
  return result.error
    ? { lineup: null, reason: result.error }
    : { lineup: result.matches[0] ?? null, reason: undefined }
}

/**
 * Q-SUGGEST: SuggestedMatchSheet on one lineup from generateMatches(…, 1). Skip suggestion draws a
 * new one; switching two players (drag or ← / →) changes only the shown lineup, toasts "Kat and Jo
 * switched sides" and marks it switched; Edit then add hands the lineup to the Add match sheet
 * (saving there protects it); Add to queue calls useAddSuggestedMatch, unprotected unless players
 * were switched. A player card opens the profile with Back to suggestion, which returns to the same
 * lineup. The sheet is generated afresh each time it opens.
 */
export function SuggestMatch({
  sessionId,
  open,
  onOpenChange,
  onEditThenAdd,
  onAdded,
}: SuggestMatchProps) {
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
      onOpenChange={onOpenChange}
      onEditThenAdd={onEditThenAdd}
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
  onOpenChange,
  onEditThenAdd,
  onAdded,
}: OpenSuggestMatchProps) {
  const addSuggested = useAddSuggestedMatch()
  const [suggestion, setSuggestion] = useState<Suggestion>(() =>
    suggest(session, roster, matches),
  )
  const [switched, setSwitched] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  // One add per attempt: a second tap can land before isPending reaches this render.
  const adding = useRef(false)

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
  const lineup = suggestion.lineup
  const shown: SuggestedLineup | null = lineup
    ? { format: lineup.format, teamA: lineup.teamA.map(player), teamB: lineup.teamB.map(player) }
    : null

  const onSkip = () => {
    setSuggestion(suggest(session, roster, matches))
    setSwitched(false)
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
          onOpenChange(false)
          onAdded()
        },
        onError: (error) => toast.error(errorMessage(error)),
        onSettled: () => {
          adding.current = false
        },
      },
    )
  }

  const openProfile = (rosterId: string) => {
    const clubPlayerId = byId(rosterId)?.clubPlayerId
    if (clubPlayerId) setProfileId(clubPlayerId)
  }

  return (
    <>
      <SuggestedMatchSheet
        open
        onOpenChange={onOpenChange}
        lineup={shown}
        reason={suggestion.reason}
        sessionMode={session.sessionMode}
        minimumGames={session.minimumGames}
        onSelectPlayer={openProfile}
        onSwap={onSwap}
        onSkip={onSkip}
        onEditThenAdd={() => {
          if (lineup) onEditThenAdd(lineup)
        }}
        onAdd={onAdd}
        isPending={addSuggested.isPending}
      />
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
