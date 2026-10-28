import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { Notice } from '@rotra/ui/notice'

export type FinalizeStageStatus = 'done' | 'current' | 'pending'

export type FinalizeStage = {
  /** Supplied by the container: Checking session records, Finishing the session, … */
  label: string
  status: FinalizeStageStatus
}

export type FinalizeProgressProps = {
  sessionTitle: string
  stages: FinalizeStage[]
  /** Replaces the announced stage, e.g. "Session finished; results are being prepared" */
  statusLine?: string
  /** The failed step and its retry; nothing is claimed as finished */
  error?: { message: string; onRetry: () => void; retrying?: boolean }
  className?: string
}

/**
 * Q-FINALIZE-PROGRESS: "Finishing TITLE" with the four UI stages marked done (✓), current (…) or
 * pending (·), and a polite live region naming the current stage. No percentages: these are not
 * separate APIs and no progress is measurable.
 */
export function FinalizeProgress({
  sessionTitle,
  stages,
  statusLine,
  error,
  className,
}: FinalizeProgressProps) {
  const current = stages.find((stage) => stage.status === 'current')
  const allDone = stages.length > 0 && stages.every((stage) => stage.status === 'done')
  const announced = statusLine ?? (current ? `${current.label}…` : allDone ? 'Done.' : '')

  return (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section>
        <h1 className="[overflow-wrap:anywhere]">Finishing {sessionTitle}</h1>
        <ol className="m-0 flex list-none flex-col p-0 [&>li+li]:border-t [&>li+li]:border-border">
          {stages.map((stage) => (
            <li key={stage.label} className="flex min-w-0 items-center gap-3 py-3">
              <span
                aria-hidden
                className={cn(
                  'inline-flex w-[18px] flex-none justify-center',
                  stage.status === 'done' ? 'text-accent' : 'text-fg2',
                )}
              >
                {stage.status === 'done' ? (
                  <Icon name="check" />
                ) : stage.status === 'current' ? (
                  '…'
                ) : (
                  '·'
                )}
              </span>
              <span className={cn('min-w-0 flex-1', stage.status === 'pending' && 'text-fg2')}>
                {stage.label}
              </span>
              <span className="sr-only">
                {stage.status === 'done'
                  ? ', done'
                  : stage.status === 'current'
                    ? ', in progress'
                    : ', pending'}
              </span>
            </li>
          ))}
        </ol>
        {/* Announced without moving focus; the operator can keep reading the list. */}
        <p aria-live="polite" aria-atomic className="m-0 text-[13px] text-fg2">
          {announced}
        </p>
        {error ? (
          <div>
            <Notice tone="error">{error.message}</Notice>
            <div className="mt-3 flex">
              <Button size="sm" onClick={error.onRetry} loading={error.retrying}>
                Try again
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </Card>
  )
}
