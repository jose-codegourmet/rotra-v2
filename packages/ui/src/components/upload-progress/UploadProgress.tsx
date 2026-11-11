import { cn } from '@rotra/ui/cn'
import { ProgressBar } from '@rotra/ui/progress-bar'

export type UploadProgressProps = {
  /** Files handled so far; rejected files count too */
  done: number
  /** Files chosen in this batch */
  total: number
  className?: string
}

/**
 * The prototype's .ch-uploading (Admin › Profile characters and Profile banners): “Uploading N of M…”
 * over an accent bar that fills per file. The page removes it when the result toast appears.
 */
export function UploadProgress({ done, total, className }: UploadProgressProps) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm">
        Uploading {done} of {total}…
      </span>
      <ProgressBar
        value={done}
        max={Math.max(1, total)}
        aria-label={`Uploading ${done} of ${total}`}
      />
    </div>
  )
}
