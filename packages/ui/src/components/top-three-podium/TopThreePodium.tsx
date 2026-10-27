import { Avatar, type AvatarProps } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { PixelFire } from './pixel-fire/PixelFire'

export type PodiumEntry = {
  id?: string
  fullName: string
  nickname?: string | null
  levelLabel: string
  picture?: Pick<AvatarProps, 'src' | 'initials'>
  isMe?: boolean
}
export type TopThreePodiumProps = {
  entries: readonly [PodiumEntry, PodiumEntry, PodiumEntry]
  totalPlayers: number
  onSelect: (index: number) => void
}
const place = ['First', 'Second', 'Third'] as const
const short = ['1st', '2nd', '3rd'] as const
const stepClass = [
  'order-2 h-[136px] bg-accent text-on-accent max-[560px]:h-[108px]',
  'order-1 h-[100px] max-[560px]:h-20',
  'order-3 h-[76px] max-[560px]:h-[62px]',
] as const

/** Pixel-styled top three stage. DOM order stays 1–2–3 for screen readers. */
export function TopThreePodium({ entries, totalPlayers, onSelect }: TopThreePodiumProps) {
  return (
    <section
      aria-labelledby="top-three-title"
      className="isolate overflow-hidden rounded-2xl border border-accent/40 bg-surface p-[18px] pb-0 max-[560px]:p-2.5 max-[560px]:pb-0"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2
          id="top-three-title"
          className="font-pixel text-lg font-bold tracking-[1px] text-accent uppercase"
        >
          Top three
        </h2>
        <span className="text-sm text-fg2">
          Overall ROTRA leaderboard · {totalPlayers.toLocaleString('en-PH')} players
        </span>
      </div>
      <div className="grid grid-cols-3 items-end gap-2.5 pt-10 max-[560px]:gap-1.5 max-[560px]:pt-8">
        {entries.map((entry, index) => (
          <button
            key={entry.id ?? entry.fullName}
            id={entry.id}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`${place[index]} place, ${entry.fullName}${entry.isMe ? ' (you)' : ''}, ${entry.levelLabel}`}
            className={cn("flex min-w-0 flex-col items-center gap-3 border-0 bg-transparent p-0 text-inherit", index === 0 ? "order-2" : index === 1 ? "order-1" : "order-3")}
          >
            <span className="relative flex min-w-0 flex-col items-center gap-0.5 text-center">
              {index === 0 ? <PixelFire /> : null}
              <Avatar
                name={entry.fullName}
                src={entry.picture?.src}
                initials={entry.picture?.initials}
                size={index === 0 ? 88 : 64}
                shape="square"
                className={cn(
                  'relative z-10 mb-2 ring-3 ring-surface ring-offset-2 ring-offset-border-strong',
                  index === 0 ? 'ring-accent max-[560px]:size-[68px] max-[560px]:text-[26px]' : 'max-[560px]:size-[52px]',
                )}
              />
              <b className={cn('relative z-10 break-words leading-tight', index === 0 ? 'text-lg max-[560px]:text-sm' : 'text-[15px] max-[560px]:text-[13px]')}>
                {entry.fullName}
                {entry.isMe ? <span className="text-accent"> · You</span> : null}
              </b>
              {entry.nickname ? (
                <span className="relative z-10 text-xs text-fg2">“{entry.nickname}”</span>
              ) : null}
              <span className="relative z-10 text-xs font-semibold text-fg2">
                {entry.levelLabel}
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                'flex w-full flex-col items-center bg-elev pt-3 font-pixel leading-none text-fg2',
                stepClass[index],
              )}
            >
              <b className="text-[34px]">{index + 1}</b>
              <small className="text-xs tracking-[1px] uppercase">{short[index]}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
