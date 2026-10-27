import { cn } from '@rotra/ui/cn'

export type SpinnerProps = {
  className?: string
  /** Read by screen readers when the spinner stands alone; omit inside a labelled button */
  label?: string
}

/** The admin prototype's .spin: a 14 px ring that turns while work is in progress. */
export function Spinner({ className, label }: SpinnerProps) {
  const ring = (
    <span
      aria-hidden
      className={cn(
        'inline-block size-3.5 flex-none animate-spin rounded-full border-2 border-border-strong border-t-accent',
        'motion-reduce:[animation-duration:3s]',
        className,
      )}
    />
  )
  if (!label) return ring
  return (
    <span role="status" className="inline-flex">
      {ring}
      <span className="sr-only">{label}</span>
    </span>
  )
}
