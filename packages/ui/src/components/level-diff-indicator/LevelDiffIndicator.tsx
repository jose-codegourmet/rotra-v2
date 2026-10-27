import { PLAYING_LEVELS, type PlayingLevel } from '@rotra/data/player/types'
import { Icon } from '@rotra/ui/icon'
import { levelDiffVariants } from './LevelDiffIndicator.variants'

export type LevelDiffIndicatorProps = {
  /** The club's level for this session */
  level: PlayingLevel | null
  /** The Player Information suggestion */
  suggestion: PlayingLevel | null
  /** So a LevelSelect can point at it with aria-describedby */
  id?: string
  className?: string
}

/** "▲ May be too high · N levels above suggestion", "▼ May be too low · …", or "✓ Matches suggestion". */
export function LevelDiffIndicator({ level, suggestion, id, className }: LevelDiffIndicatorProps) {
  if (!level || !suggestion) return null
  const diff = PLAYING_LEVELS.indexOf(level) - PLAYING_LEVELS.indexOf(suggestion)
  const n = Math.abs(diff)
  if (diff === 0) {
    return (
      <span id={id} className={levelDiffVariants({ direction: 'same', className })}>
        <Icon name="check" size={13} /> Matches suggestion
      </span>
    )
  }
  const higher = diff > 0
  return (
    <span
      id={id}
      className={levelDiffVariants({ direction: higher ? 'higher' : 'lower', className })}
    >
      <b aria-hidden className="text-[10px]">
        {higher ? '▲' : '▼'}
      </b>
      {higher ? 'May be too high' : 'May be too low'} · {n} level{n > 1 ? 's' : ''}{' '}
      {higher ? 'above' : 'below'} suggestion
    </span>
  )
}
