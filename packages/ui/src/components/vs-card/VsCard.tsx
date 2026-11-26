import type { MatchPagePlayer } from '@rotra/data/match-page/types'
import type { PlayerGame } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { MATCH_FORMAT_LABELS } from '@rotra/ui/game-row'
import { MATCH_COURT_SKILL_RINGS } from '@rotra/ui/match-court'

export type VsCardPlayer = {
  /** Unique button id, also used to restore focus when the player's stats card closes. */
  id: string
  /** The full name, “You”, or the masked name already provided for this viewer. */
  name: string
  picture: string | null
  skillGroup: MatchPagePlayer['skillGroup']
  guest: boolean
}

export type VsCardProps = {
  format: PlayerGame['format']
  score: string | null
  left: readonly VsCardPlayer[]
  right: readonly VsCardPlayer[]
  /** The winning side from the drawn court's perspective, or null for a partial game. */
  winner: 'left' | 'right' | null
  picked: readonly string[]
  onPickPlayer: (id: string) => void
  onPickTeam: (ids: string[]) => void
}

const TEAM_LABEL = 'text-[11px] font-bold tracking-[0.6px] uppercase'
const SKILL_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

function Team({
  players,
  side,
  winner,
  picked,
  onPickPlayer,
  onPickTeam,
}: Pick<VsCardProps, 'winner' | 'picked' | 'onPickPlayer' | 'onPickTeam'> & {
  players: readonly VsCardPlayer[]
  side: 'left' | 'right'
}) {
  const won = winner === side
  const label = winner === null ? 'Not counted' : won ? 'Won' : 'Lost'
  const hasTeamButton = players.length > 1
  const teamPicked = hasTeamButton && players.every((player) => picked.includes(player.id))
  const seeTeam = players.length === 2 ? 'See both' : `See all ${players.length}`
  const teamNames = players.map((player) => player.name).join(' and ')

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col justify-center gap-2 self-stretch rounded-lg bg-elev p-2.5',
        side === 'right' && 'text-right @max-[440px]:text-left',
        won && 'bg-accent-subtle shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_45%,transparent)]',
        teamPicked && 'shadow-[inset_0_0_0_2px_var(--accent)]',
      )}
    >
      {hasTeamButton ? (
        <button
          type="button"
          aria-pressed={teamPicked}
          aria-label={`${label} team: ${teamPicked ? 'hide' : 'show'} stats for ${teamNames}`}
          onClick={() => onPickTeam(players.map((player) => player.id))}
          className="-mt-1 flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border-0 bg-transparent px-1.5 py-1 text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent touch:min-h-11"
        >
          <span className={cn(TEAM_LABEL, 'text-fg2')}>{label}</span>
          <span className="text-xs font-bold text-accent">{teamPicked ? 'Showing both' : seeTeam}</span>
        </button>
      ) : (
        <span className={cn(TEAM_LABEL, won ? 'text-accent' : 'text-fg2')}>{label}</span>
      )}
      {players.map((player) => {
        const selected = picked.includes(player.id)
        const skill = player.skillGroup
          ? SKILL_LABELS[player.skillGroup]
          : player.guest
            ? 'Guest'
            : 'No skill group shown'

        return (
          <button
            key={player.id}
            id={player.id}
            type="button"
            aria-pressed={selected}
            aria-label={`${player.name}, ${skill}. Show stats`}
            onClick={() => onPickPlayer(player.id)}
            className={cn(
              'flex min-h-12 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-transparent bg-transparent p-1.5 text-inherit hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent',
              side === 'right'
                ? 'flex-row-reverse text-right @max-[440px]:flex-row @max-[440px]:text-left'
                : 'text-left',
              selected && 'border-accent bg-surface',
            )}
          >
            <Avatar
              name={player.name}
              src={player.picture ?? undefined}
              size={40}
              className={cn(
                'm-[3px] shadow-[0_0_0_3px_var(--ring)]',
                MATCH_COURT_SKILL_RINGS[player.skillGroup ?? 'none'],
              )}
            />
            <b className="min-w-0 truncate">{player.name}</b>
          </button>
        )
      })}
    </div>
  )
}

/** The Game page's team and player picker, in the same order as the court. */
export function VsCard({
  format,
  score,
  left,
  right,
  winner,
  picked,
  onPickPlayer,
  onPickTeam,
}: VsCardProps) {
  const team = { winner, picked, onPickPlayer, onPickTeam }
  return (
    <Card asChild>
      <section aria-label="Players" className="@container flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Chip tone="solid">{MATCH_FORMAT_LABELS[format]}</Chip>
          <span className="text-[13px] text-fg2">Tap a player or a team for stats</span>
        </div>
        <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 @max-[440px]:grid-cols-1">
          <Team {...team} players={left} side="left" />
          <div className="flex flex-col items-center gap-1.5 @max-[440px]:flex-row @max-[440px]:justify-center">
            <span className="grid size-11 place-items-center rounded-full bg-fg font-extrabold tracking-[0.5px] text-bg">
              VS
            </span>
            {score ? (
              <span className="font-mono text-lg font-bold whitespace-nowrap tabular-nums">
                <span className="sr-only">Score </span>
                {score}
              </span>
            ) : (
              <span className="text-[13px] text-fg2">No score</span>
            )}
          </div>
          <Team {...team} players={right} side="right" />
        </div>
      </section>
    </Card>
  )
}
