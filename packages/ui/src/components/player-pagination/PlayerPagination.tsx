'use client'
import { Button } from '@rotra/ui/button'
import { Select } from '@rotra/ui/select'
export type PlayerPaginationProps = {
  page: number
  pageCount: number
  pageSize: number
  total: number
  start?: number
  end?: number
  pending?: boolean
  variant?: 'default' | 'directory'
  onPage: (page: number) => void
  onPageSize?: (size: number) => void
}
export function PlayerPagination({
  page,
  pageCount,
  pageSize,
  total,
  start,
  end,
  pending,
  variant = 'default',
  onPage,
  onPageSize,
}: PlayerPaginationProps) {
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((p) => p > 0 && p <= pageCount)
    .sort((a, b) => a - b)
  if (variant === 'directory') {
    return (
      <nav
        aria-label="Players pages"
        className="mt-3 flex flex-col items-center justify-between gap-x-4 gap-y-2.5 rounded-lg border border-border px-3 py-2.5 sm:flex-row sm:flex-wrap"
      >
        <span className="text-sm text-fg2">
          Showing{' '}
          <b>
            {start ?? (total ? (page - 1) * pageSize + 1 : 0)}–
            {end ?? Math.min(page * pageSize, total)}
          </b>{' '}
          of <b>{total}</b>
        </span>
        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
          <Button
            size="sm"
            aria-label="Previous page"
            disabled={pending || page <= 1}
            onClick={() => onPage(page - 1)}
          >
            ‹<span className="hidden min-[481px]:inline"> Prev</span>
          </Button>
          {pages.map((p, i) => (
            <span key={p} className="inline-flex items-center gap-1">
              {i > 0 && p > (pages[i - 1] ?? 0) + 1 ? (
                <span aria-hidden="true" className="px-1 text-fg3">
                  …
                </span>
              ) : null}
              <Button
                size="sm"
                variant={p === page ? 'primary' : 'ghost'}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                disabled={pending}
                className="min-w-9 px-2"
                onClick={() => onPage(p)}
              >
                {p}
              </Button>
            </span>
          ))}
          <Button
            size="sm"
            aria-label="Next page"
            disabled={pending || page >= pageCount}
            onClick={() => onPage(page + 1)}
          >
            <span className="hidden min-[481px]:inline">Next </span>›
          </Button>
        </div>
        {onPageSize ? (
          <div className="flex items-center gap-2 text-sm text-fg2">
            <span>Rows</span>
            <Select
              aria-label="Rows per page"
              className="w-20"
              value={String(pageSize)}
              options={[25, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(n) => onPageSize(Number(n))}
            />
          </div>
        ) : null}
      </nav>
    )
  }
  return (
    <nav
      aria-label="Player pages"
      className="flex flex-wrap items-center justify-center gap-2 py-4"
    >
      <span className="w-full text-center text-sm text-fg2">
        Showing {start ?? (total ? (page - 1) * pageSize + 1 : 0)}–
        {end ?? Math.min(page * pageSize, total)} of {total}
      </span>
      <Button size="sm" disabled={pending || page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      {pages.map((p, i) => (
        <span key={p} className="inline-flex items-center gap-2">
          {i > 0 && p > (pages[i - 1] ?? 0) + 1 ? <span>…</span> : null}
          <Button
            size="sm"
            aria-current={p === page ? 'page' : undefined}
            disabled={pending}
            onClick={() => onPage(p)}
          >
            {p}
          </Button>
        </span>
      ))}
      <Button size="sm" disabled={pending || page >= pageCount} onClick={() => onPage(page + 1)}>
        Next
      </Button>
      {onPageSize ? (
        <Select
          aria-label="Rows per page"
          className="w-28"
          value={String(pageSize)}
          options={[25, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(n) => onPageSize(Number(n))}
        />
      ) : null}
    </nav>
  )
}
