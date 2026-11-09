import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'

export type PagerProps = {
  page: number
  pageCount: number
  onPage: (page: number) => void
  'aria-label': string
  disabled?: boolean
}

export function Pager({ page, pageCount, onPage, disabled, 'aria-label': label }: PagerProps) {
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-2 pt-1.5">
      <Button size="sm" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
        <Icon name="back" /> Previous
      </Button>
      <span className="text-sm text-fg2" aria-live="polite">
        Page {page} of {pageCount}
      </span>
      <Button size="sm" disabled={disabled || page >= pageCount} onClick={() => onPage(page + 1)}>
        Next <Icon name="back" className="rotate-180" />
      </Button>
    </nav>
  )
}
