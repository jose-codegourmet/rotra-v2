import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'

export type SelectionBarPlayer = {
  id: string
  name: string
  photoUrl?: string
}

export type SelectionBarProps = {
  /** The picked players, in pick order */
  players: SelectionBarPlayer[]
  /**
   * What the pick makes, or why it cannot: the format ("Doubles", "3v3 fun, counts toward session
   * games only") or the reason ("pick 2, 3, 4, 6, 8 or 10 players", "singles is off for this session")
   */
  label: string
  /** The pick can become a match; Make match stays disabled otherwise */
  valid: boolean
  onClear: () => void
  /** Make match is hidden when missing */
  onMakeMatch?: () => void
  className?: string
}

/**
 * The bar under the Players grid once players are picked (the prototype's .selbar): the stacked
 * faces, "N selected · LABEL", Clear and the primary Make match. It sticks above the console footer.
 */
export function SelectionBar({
  players,
  label,
  valid,
  onClear,
  onMakeMatch,
  className,
}: SelectionBarProps) {
  return (
    <section
      aria-label="Selected players"
      className={cn(
        'sticky bottom-[calc(72px+env(safe-area-inset-bottom,0px))] z-10 flex flex-wrap items-center justify-between gap-2.5',
        'rounded-lg border border-accent bg-elev px-3.5 py-2.5 shadow-pop',
        className,
      )}
    >
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
        <span className="flex flex-none">
          {players.map((p, i) => (
            <Avatar
              key={p.id}
              name={p.name}
              src={p.photoUrl}
              size={28}
              className={cn('text-[10px] shadow-[0_0_0_2px_var(--elev)]', i > 0 && '-ml-1.5')}
            />
          ))}
        </span>
        <span className="min-w-0 text-[13px]">
          <b>{players.length} selected</b> · {label}
        </span>
      </div>
      <div className="flex flex-nowrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
        {onMakeMatch ? (
          <Button size="sm" variant="primary" onClick={onMakeMatch} disabled={!valid}>
            Make match
          </Button>
        ) : null}
      </div>
    </section>
  )
}
