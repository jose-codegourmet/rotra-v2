'use client'

import type { MatchFormat } from '@rotra/data/match/types'
import { SCORING } from '@rotra/schema/scoring'
import { Button } from '@rotra/ui/button'
import {
  AlmostDoneRow,
  type CourtCardStatus,
  CourtMatchLine,
  CourtStatusPill,
} from '@rotra/ui/court-card'
import { Icon } from '@rotra/ui/icon'
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
  /** The format pill with its category, as on the court card ("Genderless Doubles"); defaults to the format's name */
  formatLabel?: string
  /** The status pill after the time pill: the same Playing / Ending / Ending soon as the court card; omitted reads Playing */
  status?: CourtCardStatus
  /** Almost done is on: the switch is checked */
  almostDone?: boolean
  /** The Almost done switch row under the head; the row renders only with this callback */
  onAlmostDoneChange?: (on: boolean) => void
  /** When Start match was confirmed (ms since epoch) */
  startedAt: number
  /** The clock "M min in" is computed against; defaults to the time of render */
  now?: number
  teamA: TeamLineupPlayer[]
  teamB: TeamLineupPlayer[]
  /** The session's minimum games */
  minimumGames: number
  /** The session's scoring mode label ("16/31"); shows "· Scoring · 16/31" on the line. Omitted reads as 16/31. */
  scoringLabel?: string
  /** Every substitution made so far, oldest first */
  substitutions?: ActiveMatchSubstitution[]
  /** A player's card was tapped: opens "Change NAME?" (Substitute or Replace, PlayerActionSheet) */
  onSelectPlayer: (playerId: string, team: MatchLineupTeam) => void
  /** A player's picture was tapped: opens their profile (its footer returns to this sheet) */
  onOpenProfile: (playerId: string, team: MatchLineupTeam) => void
  /**
   * Two players in different pairs were swapped by dragging one onto the other (or ← / →): they
   * swap partners. Reports the two session player ids; the owner changes the pairs. Omit to turn
   * the drag off. Not recorded as a substitution.
   */
  onSwapPartners?: (aId: string, bId: string) => void
  /** How many courts are free right now; Move to a free court is disabled when fewer than the match needs */
  freeCourtCount?: number
  /** Opens Move match (the playing variant) to pick a free court; omit to hide the button */
  onMoveToFree?: () => void
  /**
   * Pause match: first in the footer; takes the match back to Getting ready at once, no
   * confirmation. Omit to hide the button.
   */
  onPause?: () => void
  /** Pause match is saving: the button shows its spinner and cannot fire twice */
  pausePending?: boolean
  /** Opens Mark match invalid? (Q-INVALID-MATCH) */
  onMarkInvalid: () => void
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
 * Q-ACTIVE-MATCH: the in-game control sheet for a match on court. "Match N · Court X", the head row as
 * on the court card (#N, format pill, time pill, status pill), "Started TIME · Scoring · LABEL", the
 * Almost done switch row, Team A VS Team B (drag a player onto someone in the other pair to
 * swap partners; a player's card opens Substitute or Replace, the picture opens the profile), one line per substitution (credit or neither), and the reminder that
 * closing the sheet does not end the game. Footer: Pause match (when offered), Mark invalid (destructive) and the primary Match
 * done. No level
 * edits, past-result changes, reset or point-by-point scoring.
 */
export function ActiveMatchSheet({
  open,
  onOpenChange,
  matchNo,
  courtLabel,
  format,
  formatLabel,
  status = { label: 'Playing', tone: 'accent' },
  almostDone = false,
  onAlmostDoneChange,
  startedAt,
  now,
  teamA,
  teamB,
  minimumGames,
  scoringLabel = SCORING['31'].label,
  substitutions = [],
  freeCourtCount = 0,
  onMoveToFree,
  onPause,
  pausePending = false,
  onSelectPlayer,
  onOpenProfile,
  onSwapPartners,
  onMarkInvalid,
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
          {onPause ? (
            <Button loading={pausePending} onClick={onPause}>
              <Icon name="pause" size={14} />
              Pause match
            </Button>
          ) : null}
          <Button variant="danger" onClick={onMarkInvalid}>
            Mark invalid
          </Button>
          <Button variant="primary" onClick={onMatchDone}>
            Match done
          </Button>
        </>
      }
    >
      <CourtMatchLine
        matchNo={matchNo}
        formatLabel={formatLabel ?? FORMAT_LABEL[format]}
        minutes={minutesIn}
        trailing={<CourtStatusPill status={status} />}
      />
      <p className="m-0 text-[13px] text-fg2">
        Started {formatTime(startedAt)} · Scoring · {scoringLabel}
      </p>
      {onAlmostDoneChange ? (
        <AlmostDoneRow courtLabel={courtLabel} checked={almostDone} onChange={onAlmostDoneChange} />
      ) : null}
      <TeamLineup
        teamA={teamA}
        teamB={teamB}
        minimumGames={minimumGames}
        onSelectPlayer={onSelectPlayer}
        onOpenProfile={onOpenProfile}
        onSwap={
          onSwapPartners
            ? (from, to) => {
                const a = (from.team === 'A' ? teamA : teamB)[from.index]
                const b = (to.team === 'A' ? teamA : teamB)[to.index]
                if (a && b) onSwapPartners(a.id, b.id)
              }
            : undefined
        }
        playerActionLabel="Substitute or replace"
      />
      <p className="m-0 text-[13px] text-fg2">
        Drag a player onto someone in the other pair to swap partners. Tap a player's card to bring
        in someone from outside (substitute or replace), or their picture to see their profile.
      </p>
      {substitutions.map((s, index) => (
        <p key={`${s.outName}-${s.inName}-${index}`} className="m-0 text-[13px] text-fg2">
          Substitution: {substitutionLine(s)}.
        </p>
      ))}
      {onMoveToFree ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={freeCourtCount < (format === 'fun_5v5' ? 2 : 1)}
            onClick={onMoveToFree}
          >
            Move to a free court
          </Button>
          {freeCourtCount < (format === 'fun_5v5' ? 2 : 1) ? (
            <span className="text-[13px] text-fg2">No court is free</span>
          ) : null}
        </div>
      ) : null}
      <p className="m-0 text-[13px] text-fg2">
        The court stays in use until you confirm a winner or mark the match invalid. Closing this
        doesn't end the game.
      </p>
    </Sheet>
  )
}
