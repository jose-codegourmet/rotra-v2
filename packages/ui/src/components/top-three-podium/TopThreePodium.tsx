import { Avatar, type AvatarProps } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import {
  LEADERBOARD_PERIOD_COPY,
  type LeaderboardPeriod,
  leaderboardWinsLabel,
} from '@rotra/ui/leaderboard-period-switch'
import { PixelFire } from './pixel-fire/PixelFire'
import './TopThreePodium.css'

export type PodiumEntry = {
  id?: string
  fullName: string
  nickname?: string | null
  levelLabel?: string
  wins?: number
  disabled?: boolean
  picture?: Pick<AvatarProps, 'src' | 'initials'>
  masked?: boolean
  isMe?: boolean
}
export type TopThreePodiumProps = {
  entries: readonly [PodiumEntry, PodiumEntry, PodiumEntry]
  totalPlayers?: number
  period?: LeaderboardPeriod
  dateLabel?: string
  onSelect: (index: number) => void
}
const place = ['First', 'Second', 'Third'] as const
const short = ['1st', '2nd', '3rd'] as const

/** Exact prototype stage; DOM order remains 1–2–3 while CSS places second on the left. */
export function TopThreePodium({
  entries,
  totalPlayers,
  period,
  dateLabel,
  onSelect,
}: TopThreePodiumProps) {
  const caption = period
    ? `${LEADERBOARD_PERIOD_COPY[period].label} · ${dateLabel} · top 50`
    : `Overall ROTRA leaderboard · ${totalPlayers?.toLocaleString('en-PH')} players`
  return (
    <section aria-labelledby="top-three-title" className="rotra-podium">
      <span className="rotra-embers" aria-hidden>
        {Array.from({ length: 14 }, (_, index) => (
          <i
            key={index}
            style={{
              left: `${4 + ((index * 37) % 92)}%`,
              animationDelay: `${((index * 0.73) % 5).toFixed(2)}s`,
              animationDuration: `${4 + (index % 4)}s`,
            }}
          />
        ))}
      </span>
      <div className="rotra-pod-head">
        <h2 id="top-three-title">Top three</h2>
        <span className="text-[13px] text-fg2">{caption}</span>
      </div>
      <div className="rotra-pod-stage">
        {entries.map((entry, index) => {
          const Tile = entry.disabled ? 'div' : 'button'
          const detail = period
            ? entry.wins === undefined
              ? undefined
              : leaderboardWinsLabel(entry.wins)
            : entry.levelLabel
          return (
            <Tile
              key={entry.id ?? entry.fullName}
              id={entry.id}
              type={entry.disabled ? undefined : 'button'}
              onClick={entry.disabled ? undefined : () => onSelect(index)}
              aria-disabled={entry.disabled || undefined}
              aria-label={
                entry.disabled
                  ? undefined
                  : `${place[index]} place, ${entry.fullName}${entry.isMe ? ' (you)' : ''}${detail ? `, ${detail}` : ''}`
              }
              className={cn('rotra-pod', `p${index + 1}`, entry.isMe && 'me')}
            >
              <span className="rotra-pod-who">
                {index === 0 ? <PixelFire /> : null}
                <Avatar
                  name={entry.fullName}
                  src={entry.picture?.src}
                  initials={entry.masked ? undefined : entry.picture?.initials}
                  size={index === 0 ? 88 : 64}
                  className="avatar"
                />
                <b className="rotra-pod-name">{entry.fullName}</b>
                {!entry.masked && entry.nickname ? (
                  <span className="relative z-10 text-[13px] text-fg2">“{entry.nickname}”</span>
                ) : null}
                <span className="rotra-pod-lv">{detail}</span>
              </span>
              <span className="rotra-pod-step" aria-hidden>
                <b>{index + 1}</b>
                <small>{short[index]}</small>
              </span>
            </Tile>
          )
        })}
      </div>
    </section>
  )
}
