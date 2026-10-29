import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'

export type ChangeCompareProps = {
  /** Label over the current value */
  fromLabel?: string
  /** The value in effect now; the screen passes "Not set" when there is none */
  from: string
  /** Label over the requested value ("New" in the approve sheet) */
  toLabel?: string
  to: string
  /** bold for names, mono for phone numbers and emails */
  emphasis?: 'bold' | 'mono'
  className?: string
}

const LABEL = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'
const BOX = 'flex min-w-0 flex-col gap-0.5 rounded-md border px-3 py-2.5 [overflow-wrap:anywhere]'

/**
 * Current → Requested: two boxes with an arrow between them; the requested box is accented. At
 * 520 px and narrower the boxes stack and the arrow points down.
 */
export function ChangeCompare({
  fromLabel = 'Current',
  from,
  toLabel = 'Requested',
  to,
  emphasis = 'bold',
  className,
}: ChangeCompareProps) {
  const value = emphasis === 'mono' ? 'font-mono text-[0.92em]' : 'font-bold'
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5',
        'max-[520px]:grid-cols-[minmax(0,1fr)]',
        className,
      )}
    >
      <div className={cn(BOX, 'border-border-strong')}>
        <span className={LABEL}>{fromLabel}</span>
        <span className={value}>{from}</span>
      </div>
      <Icon
        name="arrow"
        className="text-fg2 max-[520px]:rotate-90 max-[520px]:justify-self-center"
      />
      <div className={cn(BOX, 'border-accent bg-accent-subtle')}>
        <span className={LABEL}>{toLabel}</span>
        <span className={value}>{to}</span>
      </div>
    </div>
  )
}
