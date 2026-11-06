'use client'

import type { MatchFormat } from '@rotra/data/match/types'
import { Button } from '@rotra/ui/button'
import { Sheet } from '@rotra/ui/sheet'
import { type MatchLineupTeam, TeamLineup, type TeamLineupPlayer } from '@rotra/ui/team-lineup'

/** Who was credited for the game; Nobody is the default. */
export type ActiveMatchSubstitutionCredit = 'nobody' | 'incoming' | 'outgoing'

/** One mid-game replacement, as the sheet reports it. */
export type ActiveMatchSubstitution = {
  /** The player who came off, full name */
  outName: string
  /** The player who came on, full name */
  inName: string
  /** Who gets this game; omitted or nobody → "Neither gets credit for this game." */
  creditTo?: ActiveMatchSubstitutionCredit
}

export type ActiveMatchSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchNo: number
  /** "Court 1", or "Court 1 + Court 2" for a merged 5v5 */
  courtLabel: string
  format: MatchFormat
  /** When Start match was confirmed (ms since epoch) */
  startedAt: number
  /** The clock "M min in" is computed against; defaults to the time of render */
  now?: number
  teamA: TeamLineupPlayer[]
  teamB: TeamLineupPlayer[]
  /** The session's minimum games */
  minimumGames: number
  /** Every substitution made so far, oldest first */
  substitutions?: ActiveMatchSubstitution[]
  /** Opens the player's profile */
  onSelectPlayer: (playerId: string, team: MatchLineupTeam) => void
  /** Opens Mark match invalid? (Q-INVALID-MATCH) */
  onMarkInvalid: () => void
  /** Opens Substitute in match N (Q-SUBSTITUTE) */
  onSubstitute: () => void
  /** Opens Match N result (Q-MATCH-DONE) */
  onMatchDone: () => void
}

const FORMAT_LABEL: Record<MatchFormat, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}

/** The prototype's fmtTime: "7:42 PM" in the device's locale */
function formatTime(at: number) {
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function substitutionLine(s: ActiveMatchSubstitution) {
  const who = s.creditTo === 'incoming' ? s.inName : s.creditTo === 'outgoing' ? s.outName : null
  return who
    ? `${s.inName} replaced ${s.outName} · ${who} got the game (QM choice)`
    : `${s.inName} replaced ${s.outName} · Neither gets credit for this game`
}

/**
 * Q-ACTIVE-MATCH: the in-game control sheet for a match on court. "Match N · Court X", the format
 * with the start time and minutes in, Team A VS Team B (no swapping once started), one line per
 * substitution (credit or neither), and the reminder that closing the sheet does not end the game.
 * Footer: Mark invalid (destructive), Substitute player, and the primary Match done. No level
 * edits, past-result changes, reset or point-by-point scoring.
 */
export function ActiveMatchSheet({
  open,
  onOpenChange,
  matchNo,
  courtLabel,
  format,
  startedAt,
  now,
  teamA,
  teamB,
  minimumGames,
  substitutions = [],
  onSelectPlayer,
  onMarkInvalid,
  onSubstitute,
  onMatchDone,
}: ActiveMatchSheetProps) {
  const minutesIn = Math.max(0, Math.round(((now ?? Date.now()) - startedAt) / 60000))
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Match ${matchNo} · ${courtLabel}`}
      footer={
        <>
          <Button variant="danger" onClick={onMarkInvalid}>
            Mark invalid
          </Button>
          <Button onClick={onSubstitute}>Substitute player</Button>
          <Button variant="primary" onClick={onMatchDone}>
            Match done
          </Button>
        </>
      }
    >
      <p className="m-0 text-[13px] text-fg2">
        {FORMAT_LABEL[format]} · started {formatTime(startedAt)} · {minutesIn} min in
      </p>
      <TeamLineup
        teamA={teamA}
        teamB={teamB}
        minimumGames={minimumGames}
        onSelectPlayer={onSelectPlayer}
      />
      {substitutions.map((s, index) => (
        <p key={`${s.outName}-${s.inName}-${index}`} className="m-0 text-[13px] text-fg2">
          Substitution: {substitutionLine(s)}.
        </p>
      ))}
      <p className="m-0 text-[13px] text-fg2">
        The court stays in use until you confirm a winner or mark the match invalid. Closing this
        doesn't end the game.
      </p>
    </Sheet>
  )
}
