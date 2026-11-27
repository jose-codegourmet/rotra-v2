'use client'

import type { WinChance } from '@rotra/data/match/win-chance'
import type { PlayingLevel } from '@rotra/data/player/types'
import { cn } from '@rotra/ui/cn'
import { MatchPlayerCard, type MatchPlayerCardTeam } from '@rotra/ui/match-player-card'
import { SwapSidesArea, type SwapSlot } from '@rotra/ui/swap-sides-area'
import { SwappablePlayer } from '@rotra/ui/swap-sides-area/swappable-player'
import { WinChanceChip } from '@rotra/ui/win-chance-chip'

/** One player on a lineup: the card's facts plus the short name the dialog copy uses. */
export type TeamLineupPlayer = {
  id: string
  name: string
  /** Nickname or first name, for "Mikee and Dexter switched sides" and the Why this lineup card */
  shortName: string
  /** The player's own nickname and the club nickname: either (null counts) shows the name stack on the card */
  nickname?: string | null
  clubNickname?: string | null
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
  /** Opens the player's profile; with onOpenProfile it is the card's own tap instead (see below) */
  onSelectPlayer: (playerId: string, team: MatchLineupTeam) => void
  /**
   * Open match dialogs (Playing, Getting ready): each card splits into a picture button that opens
   * the profile (this callback) and a card button with a swap icon that fires onSelectPlayer
   * (Change NAME? or Replace player). Omit it and the whole card is one button.
   */
  onOpenProfile?: (playerId: string, team: MatchLineupTeam) => void
  /**
   * Swap mode: the cards sit in a SwapSidesArea, so a player can be dragged onto someone on the
   * other team or moved across with ← / →. Reports the two slots; the owner changes the lineup.
   */
  onSwap?: (from: SwapSlot, to: SwapSlot) => void
  /** What tapping a player does, for the cards' accessible names; "View profile" by default */
  playerActionLabel?: string
  /** Win chance (D-2026-11-27-02): a chip at the right end of each team's label row; none when missing */
  winChance?: WinChance
  /** Makes the chips buttons that open WinChanceDialog */
  onOpenWinChance?: () => void
  className?: string
}

function Team({
  team,
  players,
  minimumGames,
  onSelectPlayer,
  onOpenProfile,
  swappable,
  actionLabel,
  winChance,
  onOpenWinChance,
  teamNames,
}: {
  team: MatchLineupTeam
  players: TeamLineupPlayer[]
  minimumGames: number
  onSelectPlayer: TeamLineupProps['onSelectPlayer']
  onOpenProfile?: TeamLineupProps['onOpenProfile']
  swappable: boolean
  actionLabel?: string
  winChance?: WinChance
  onOpenWinChance?: () => void
  teamNames?: { a: string; b: string }
}) {
  const label = `Team ${team}`
  return (
    <fieldset aria-label={label} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="text-xs font-bold tracking-[0.04em] text-fg2 uppercase">{label}</span>
        {winChance ? (
          <WinChanceChip
            chance={winChance}
            team={team}
            teamNames={teamNames}
            onOpen={onOpenWinChance}
          />
        ) : null}
      </span>
      {players.map((p, index) => {
        const card = (
          <MatchPlayerCard
            key={p.id}
            id={p.id}
            name={p.name}
            nickname={p.nickname}
            clubNickname={p.clubNickname}
            level={p.level}
            photoUrl={p.photoUrl}
            games={p.games}
            minimumGames={minimumGames}
            team={team}
            onClick={() => onSelectPlayer(p.id, team)}
            variant={onOpenProfile ? 'swappable' : 'default'}
            onOpenProfile={onOpenProfile ? () => onOpenProfile(p.id, team) : undefined}
            swappable={swappable}
            actionLabel={actionLabel}
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
  onOpenProfile,
  onSwap,
  playerActionLabel,
  winChance,
  onOpenWinChance,
  className,
}: TeamLineupProps) {
  const teamNames = {
    a: teamA.map((p) => p.shortName).join(' and '),
    b: teamB.map((p) => p.shortName).join(' and '),
  }
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
        onOpenProfile={onOpenProfile}
        swappable={swappable}
        actionLabel={playerActionLabel}
        winChance={winChance}
        onOpenWinChance={onOpenWinChance}
        teamNames={teamNames}
      />
      <span
        data-lineup-vs
        className="text-center text-[11px] font-extrabold tracking-[1px] text-fg3"
      >
        VS
      </span>
      <Team
        team="B"
        players={teamB}
        minimumGames={minimumGames}
        onSelectPlayer={onSelectPlayer}
        onOpenProfile={onOpenProfile}
        swappable={swappable}
        actionLabel={playerActionLabel}
        winChance={winChance}
        onOpenWinChance={onOpenWinChance}
        teamNames={teamNames}
      />
    </div>
  )
  return onSwap ? <SwapSidesArea onSwap={onSwap}>{grid}</SwapSidesArea> : grid
}
