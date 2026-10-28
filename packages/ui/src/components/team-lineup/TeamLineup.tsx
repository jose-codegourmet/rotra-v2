'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { cn } from '@rotra/ui/cn'
import { MatchPlayerCard, type MatchPlayerCardTeam } from '@rotra/ui/match-player-card'
import { SwapSidesArea, type SwapSlot } from '@rotra/ui/swap-sides-area'
import { SwappablePlayer } from '@rotra/ui/swap-sides-area/swappable-player'

/** One player on a lineup: the card's facts plus the short name the dialog copy uses. */
export type TeamLineupPlayer = {
  id: string
  name: string
  /** Nickname or first name, for "Kat and Jo switched sides" and the Why this lineup card */
  shortName: string
  level: PlayingLevel | null
  photoUrl?: string
  /** Counted games so far this session */
  games: number
}

export type MatchLineupTeam = MatchPlayerCardTeam

export type TeamLineupProps = {
  teamA: TeamLineupPlayer[]
  teamB: TeamLineupPlayer[]
  /** The session's minimum games */
  minimumGames: number
  /** Opens the player's profile */
  onSelectPlayer: (playerId: string, team: MatchLineupTeam) => void
  /**
   * Swap mode: the cards sit in a SwapSidesArea, so a player can be dragged onto someone on the
   * other team or moved across with ← / →. Reports the two slots; the owner changes the lineup.
   */
  onSwap?: (from: SwapSlot, to: SwapSlot) => void
  className?: string
}

function Team({
  team,
  players,
  minimumGames,
  onSelectPlayer,
  swappable,
}: {
  team: MatchLineupTeam
  players: TeamLineupPlayer[]
  minimumGames: number
  onSelectPlayer: TeamLineupProps['onSelectPlayer']
  swappable: boolean
}) {
  const label = `Team ${team}`
  return (
    <fieldset aria-label={label} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <span className="text-xs font-bold tracking-[0.04em] text-fg2 uppercase">{label}</span>
      {players.map((p, index) => {
        const card = (
          <MatchPlayerCard
            key={p.id}
            id={p.id}
            name={p.name}
            level={p.level}
            photoUrl={p.photoUrl}
            games={p.games}
            minimumGames={minimumGames}
            team={team}
            onClick={() => onSelectPlayer(p.id, team)}
            swappable={swappable}
          />
        )
        return swappable ? (
          <SwappablePlayer key={p.id} team={team} index={index}>
            {card}
          </SwappablePlayer>
        ) : (
          <div key={p.id} className="flex min-w-0">
            {card}
          </div>
        )
      })}
    </fieldset>
  )
}

/**
 * The prototype's .qteams with faceTeam(): Team A, VS, Team B, each team a labelled group of
 * MatchPlayerCards. Reused by Suggested match, Start match, Active match and Invalid match. With
 * onSwap the cards are SwappablePlayers inside a SwapSidesArea: drag onto the other team, or ← / →.
 */
export function TeamLineup({
  teamA,
  teamB,
  minimumGames,
  onSelectPlayer,
  onSwap,
  className,
}: TeamLineupProps) {
  const swappable = !!onSwap
  const grid = (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5',
        className,
      )}
    >
      <Team
        team="A"
        players={teamA}
        minimumGames={minimumGames}
        onSelectPlayer={onSelectPlayer}
        swappable={swappable}
      />
      <span className="text-center text-[11px] font-extrabold tracking-[1px] text-fg3">VS</span>
      <Team
        team="B"
        players={teamB}
        minimumGames={minimumGames}
        onSelectPlayer={onSelectPlayer}
        swappable={swappable}
      />
    </div>
  )
  return onSwap ? <SwapSidesArea onSwap={onSwap}>{grid}</SwapSidesArea> : grid
}
