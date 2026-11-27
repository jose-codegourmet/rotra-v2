'use client'

import type {
  WinChanceBreakdown,
  WinChancePlayerBreakdown,
  WinChanceRow,
  WinChanceTeamBreakdown,
} from '@rotra/data/match/win-chance'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Sheet } from '@rotra/ui/sheet'

export type WinChanceDialogPlayer = { name: string; shortName: string; photoUrl?: string }

export type WinChanceDialogProps = {
  open: boolean
  onClose: () => void
  breakdown: WinChanceBreakdown | null
  /** Faces by player id; a missing id reads "Player" */
  players: Record<string, WinChanceDialogPlayer>
}

const UNKNOWN: WinChanceDialogPlayer = { name: 'Player', shortName: 'Player' }

/** A real minus sign and two decimals; zero has no sign ("0.00"). */
function signed(value: number) {
  const rounded = Math.round(value * 100) / 100
  if (rounded === 0) return '0.00'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(2)}`
}

function rowValue(row: WinChanceRow) {
  return row.key === 'level' ? String(row.value) : signed(row.value)
}

function PlayerBlock({
  player,
  face,
}: {
  player: WinChancePlayerBreakdown
  face: WinChanceDialogPlayer
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Avatar name={face.name} src={face.photoUrl} size={36} />
        <div className="flex min-w-0 flex-col">
          <b className="truncate">{face.name}</b>
          <span className="text-[13px] text-fg2 tabular-nums">
            Form rating {player.rating.toFixed(1)}
          </span>
        </div>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {player.rows.map((row) => (
          <li key={row.key} className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0">
              <span>{row.label}</span>
              {row.detail ? <span className="text-fg2"> · {row.detail}</span> : null}
            </span>
            <span className="flex-none text-right tabular-nums">{rowValue(row)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TeamBlock({
  label,
  team,
  percent,
  lead,
  strong,
  players,
}: {
  label: string
  team: WinChanceTeamBreakdown
  percent: number
  lead: boolean
  strong: boolean
  players: WinChanceDialogProps['players']
}) {
  const accent = lead && strong
  const faces = team.players.map((p) => players[p.id] ?? UNKNOWN)
  return (
    <section
      aria-label={label}
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border-strong p-3"
    >
      <header className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-semibold text-fg2">
          {faces.map((f) => f.shortName).join(' & ')}
        </span>
        <span className="flex flex-none items-center gap-1.5">
          {accent ? <Chip tone="accent">Favored</Chip> : null}
          <b
            className={cn('text-2xl leading-none tabular-nums', accent ? 'text-accent' : 'text-fg')}
          >
            {percent}%
          </b>
        </span>
      </header>
      {team.players.map((p, i) => (
        <PlayerBlock key={p.id} player={p} face={faces[i] ?? UNKNOWN} />
      ))}
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2 text-[13px] font-semibold">
        <span>Team average</span>
        <span className="tabular-nums">{team.average.toFixed(1)}</span>
      </div>
    </section>
  )
}

/**
 * Win chance explained (D-2026-11-27-02): both pairs side by side (stacked on phones) with each
 * player's form rating and the rows it adds up from, the team average, and how the percent follows
 * from the gap. Opened from every win chance chip or pill. Queue Master only. Stacks over an open sheet.
 */
export function WinChanceDialog({ open, onClose, breakdown, players }: WinChanceDialogProps) {
  const { chance } = breakdown ?? {}
  return (
    <Sheet
      open={open && !!breakdown}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={
        <span className="flex flex-wrap items-center gap-2">
          Win chance
          {breakdown?.upset ? <Chip tone="warn">Upset</Chip> : null}
        </span>
      }
      wide
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {breakdown && chance ? (
        <>
          <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2">
            <TeamBlock
              label="Team A"
              team={breakdown.teamA}
              percent={chance.a}
              lead={chance.favored === 'A'}
              strong={chance.strong}
              players={players}
            />
            <TeamBlock
              label="Team B"
              team={breakdown.teamB}
              percent={chance.b}
              lead={chance.favored === 'B'}
              strong={chance.strong}
              players={players}
            />
          </div>
          <p className="m-0 text-xs text-fg2">
            Each pair's chance comes from the gap between the two team averages: one level apart is
            about 76%. Favored means 65% or more. An Upset is a match the Favored pair lost.
            {breakdown.lasting
              ? ' A finished match is read from the lasting signals only: level, club win rate, best day and leaderboard.'
              : ''}
          </p>
        </>
      ) : null}
    </Sheet>
  )
}
