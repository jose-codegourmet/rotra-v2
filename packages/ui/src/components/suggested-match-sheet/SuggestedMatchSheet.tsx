'use client'

import type { MatchFormat } from '@rotra/data/match/types'
import type { SessionMode } from '@rotra/data/queue-session/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import type { SwapSlot } from '@rotra/ui/swap-sides-area'
import { type MatchLineupTeam, TeamLineup, type TeamLineupPlayer } from '@rotra/ui/team-lineup'

/** The one lineup the sheet shows, with each player's games so the reason can be explained. */
export type SuggestedLineup = {
  format: MatchFormat
  teamA: TeamLineupPlayer[]
  teamB: TeamLineupPlayer[]
}

export type SuggestedMatchSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null when no lineup is possible; `reason` then explains why, with only Close */
  lineup: SuggestedLineup | null
  /** Why no lineup could be built (both formats off, too few present) */
  reason?: string
  sessionMode: SessionMode
  /** The session's minimum games */
  minimumGames: number
  /** Opens the player's profile; its footer is Back to suggestion */
  onSelectPlayer: (playerId: string, team: MatchLineupTeam) => void
  /** Switch the players at the two slots (drag or ← / →); only the shown lineup changes */
  onSwap: (from: SwapSlot, to: SwapSlot) => void
  /** Shows a new suggestion */
  onSkip: () => void
  /** Opens the manual editor with this lineup; saving protects it */
  onEditThenAdd: () => void
  /** Adds it as Suggested, unprotected unless players were switched */
  onAdd: () => void
  /** The add is running: Add to queue cannot fire twice */
  isPending?: boolean
}

const FORMAT_LABEL: Record<MatchFormat, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}

const MODE_LABEL: Record<SessionMode, string> = { chill: 'Chill', fair: 'Fair', hard: 'Hard' }

/** "Kat", "Kat and Jo", "Kat, Jo and Mia" */
function listNames(names: string[]) {
  return names.length < 3
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

/**
 * Q-SUGGEST: one suggested lineup with the format and mode chips, Team A VS Team B (switch sides by
 * dragging or with the arrow keys), and the Why this lineup card. No win probabilities or fatigue
 * scores. When nothing can be suggested, the reason is shown with Close.
 */
export function SuggestedMatchSheet({
  open,
  onOpenChange,
  lineup,
  reason,
  sessionMode,
  minimumGames,
  onSelectPlayer,
  onSwap,
  onSkip,
  onEditThenAdd,
  onAdd,
  isPending = false,
}: SuggestedMatchSheetProps) {
  const mode = MODE_LABEL[sessionMode]
  if (!lineup) {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="Suggested match"
        footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
      >
        <Notice tone="warn">{reason ?? 'No valid match right now.'}</Notice>
      </Sheet>
    )
  }
  const below = [...lineup.teamA, ...lineup.teamB].filter((p) => p.games < minimumGames)
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title="Suggested match"
      dismissible={!isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onSkip}>
            Skip suggestion
          </Button>
          <Button disabled={isPending} onClick={onEditThenAdd}>
            Edit then add
          </Button>
          <Button variant="primary" loading={isPending} onClick={onAdd}>
            Add to queue
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="solid">{FORMAT_LABEL[lineup.format]}</Chip>
        <Chip>{mode} mode</Chip>
      </div>
      <TeamLineup
        teamA={lineup.teamA}
        teamB={lineup.teamB}
        minimumGames={minimumGames}
        onSelectPlayer={onSelectPlayer}
        onSwap={onSwap}
      />
      <p className="m-0 text-[13px] text-fg2">
        Drag a player onto someone on the other team to switch sides.
      </p>
      <Card className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          Why this lineup
        </span>
        <p className="m-0 text-[13px]">
          {below.length
            ? `${listNames(below.map((p) => p.shortName))} ${below.length > 1 ? 'are' : 'is'} below the minimum (${below
                .map((p) => `${p.shortName} ${p.games}/${minimumGames}`)
                .join(', ')}).`
            : 'Everyone here has met the minimum; they have the fewest games among present players.'}
        </p>
        <p className="m-0 text-[13px] text-fg2">
          Teams are split by assigned levels to suit {mode} mode.
        </p>
      </Card>
    </Sheet>
  )
}
