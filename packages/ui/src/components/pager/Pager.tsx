import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'

export type PagerProps = {
  page: number
  pageCount: number
  onPage: (page: number) => void
  'aria-label': string
  disabled?: boolean
  /** Back button text; Games page: “Newer” */
  previousLabel?: string
  /** Forward button text; Games page: “Older” */
  nextLabel?: string
  /** Added after “Page N of M”, e.g. “7 sessions” */
  summary?: string
}

export function Pager({
  page,
  pageCount,
  onPage,
  disabled,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  summary,
  'aria-label': label,
}: PagerProps) {
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-2 pt-1.5">
      <Button size="sm" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
        <Icon name="back" /> {previousLabel}
      </Button>
      <span className="text-center text-sm text-fg2" aria-live="polite">
        Page {page} of {pageCount}
        {summary ? ` · ${summary}` : ''}
      </span>
      <Button size="sm" disabled={disabled || page >= pageCount} onClick={() => onPage(page + 1)}>
        {nextLabel} <Icon name="back" className="rotate-180" />
      </Button>
    </nav>
  )
}
