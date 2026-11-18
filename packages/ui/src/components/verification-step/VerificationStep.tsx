import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import type { ReactNode } from 'react'

export type VerificationStepProps = {
  number: 1 | 2 | 3
  title: string
  status: string
  done?: boolean
  actions?: ReactNode
  chip?: ReactNode
}

/** One of the three account verification steps on P-VERIFICATION. */
export function VerificationStep({
  number,
  title,
  status,
  done,
  actions,
  chip,
}: VerificationStepProps) {
  return (
    <div className="flex items-start gap-3 border-border border-t py-3 first:border-t-0 first:pt-0">
      <span
        aria-hidden="true"
        className={cn(
          'grid size-7 flex-none place-items-center rounded-full border-2 font-bold text-[13px]',
          done ? 'border-accent bg-accent text-on-accent' : 'border-border-strong text-fg3',
        )}
      >
        {done ? <Icon name="check" /> : number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <b>
          <span className="sr-only">
            Step {number}. {done ? 'Done. ' : null}
          </span>
          {title}
        </b>
        <span className="text-[13px] text-fg2 [overflow-wrap:anywhere]">{status}</span>
        {actions || chip ? (
          <div className="mt-1 flex flex-wrap items-center gap-2 [&>*]:max-w-full [&>*]:[overflow-wrap:anywhere]">
            {actions}
            {chip}
          </div>
        ) : null}
      </div>
    </div>
  )
}
