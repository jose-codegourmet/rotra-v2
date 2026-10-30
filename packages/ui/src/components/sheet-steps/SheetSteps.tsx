import { cn } from '@rotra/ui/cn'

export type SheetStepsProps = {
  /** Step names in order, e.g. ['Details', 'Review'] */
  steps: string[]
  /** Index of the step on screen (0 = the first step) */
  current: number
  className?: string
}

/**
 * The prototypes' .steps: "1 Details · 2 Review" at the top of a two-step sheet (Add club, License).
 * Not clickable; the current step is in the accent color and marked aria-current.
 */
export function SheetSteps({ steps, current, className }: SheetStepsProps) {
  return (
    <ol
      aria-label="Steps"
      className={cn(
        'm-0 flex list-none flex-wrap items-center gap-2 p-0 text-xs font-bold tracking-[0.3px] text-fg3 uppercase',
        className,
      )}
    >
      {steps.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className="flex items-center gap-2"
        >
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <span className={cn(index === current && 'text-accent')}>
            {index + 1} {label}
          </span>
        </li>
      ))}
    </ol>
  )
}
