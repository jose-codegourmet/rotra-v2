'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { Skeleton } from '@rotra/ui/skeleton'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type RowData,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { type KeyboardEvent, type MouseEvent, type ReactNode, useState } from 'react'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Right-aligned numbers (.tbl .n) */
    align?: 'right'
    /** Keep on one line (.tbl .nw) */
    nowrap?: boolean
    /** The row's main cell: unlabelled at the top of each phone card (.tbl.cards td.lead) */
    lead?: boolean
    /** Label in phone cards when the header is not plain text */
    cardLabel?: string
  }
}

export type DataTableProps<TData> = {
  // biome-ignore lint/suspicious/noExplicitAny: TanStack's column helper yields ColumnDef<T, string | number | …>; any is the library's own pattern for mixed columns
  columns: ColumnDef<TData, any>[]
  data: TData[]
  /** Names the table, e.g. "Clubs" */
  'aria-label': string
  getRowId?: (row: TData) => string
  /** Makes rows clickable (.tbl tr.click); Enter and Space work too. Links and buttons inside a row
   * keep their own action instead of also firing this one. */
  onRowClick?: (row: TData) => void
  /** Extra classes for one row, e.g. the live leaderboard's highlighted top three (.lb tr.top) */
  rowClassName?: (row: TData, index: number) => string | undefined
  /** Search and filters above the table (.toolbar) */
  toolbar?: ReactNode
  /** Shows skeleton rows instead of data */
  loading?: boolean
  /** Shown when there are no rows, usually an EmptyState */
  empty?: ReactNode
  /** Shown instead of rows when loading failed, usually an ErrorState */
  error?: ReactNode
  initialSorting?: SortingState
}

/**
 * The admin prototype's .tbl: a sortable table that becomes one labelled card per row at 760 px and
 * below, so nothing scrolls sideways on phones.
 */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  onRowClick,
  rowClassName,
  toolbar,
  loading,
  empty,
  error,
  initialSorting = [],
  ...aria
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  })
  const leafColumns = table.getVisibleLeafColumns()
  const rows = table.getRowModel().rows

  const cardLabel = (columnId: string) => {
    const column = table.getColumn(columnId)
    const header = column?.columnDef.header
    return column?.columnDef.meta?.cardLabel ?? (typeof header === 'string' ? header : columnId)
  }

  const fullRow = (content: ReactNode) => (
    <tr>
      <td colSpan={leafColumns.length} className="border-0 p-0">
        {content}
      </td>
    </tr>
  )

  // A link or button inside the row (the club name in A-CLUBS) already acts; don't act twice.
  const fromControl = (event: MouseEvent | KeyboardEvent) =>
    event.target !== event.currentTarget &&
    (event.target as Element).closest('a, button, input, select, textarea, label') !== null

  const onRowKey = (event: KeyboardEvent<HTMLTableRowElement>, row: TData) => {
    if (fromControl(event)) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick?.(row)
    }
  }

  const cardCell =
    'max-[760px]:flex max-[760px]:items-center max-[760px]:justify-between max-[760px]:gap-3 max-[760px]:border-0 max-[760px]:px-0 max-[760px]:py-[3px] max-[760px]:text-right'

  return (
    <div className="flex flex-col gap-3">
      {toolbar ? <div className="flex flex-wrap items-center gap-2.5">{toolbar}</div> : null}
      <div className="-mx-4 overflow-x-auto px-4 max-[760px]:m-0 max-[760px]:overflow-visible max-[760px]:p-0">
        <table
          aria-label={aria['aria-label']}
          aria-busy={loading || undefined}
          className="w-full border-collapse text-sm tabular-nums max-[760px]:block"
        >
          <thead className="max-[760px]:hidden">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta
                  const sort = header.column.getIsSorted()
                  const canSort = header.column.getCanSort()
                  const label = header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined
                      }
                      className={cn(
                        'border-b border-border-strong px-2.5 py-2 text-left text-[11px] font-semibold tracking-[0.6px] whitespace-nowrap text-fg2 uppercase',
                        meta?.align === 'right' && 'text-right',
                      )}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 border-0 bg-transparent p-0 font-semibold tracking-[0.6px] text-fg2 uppercase hover:text-fg"
                        >
                          {label}
                          {sort ? <Icon name={sort === 'asc' ? 'up' : 'down'} size={12} /> : null}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="max-[760px]:block">
            {error
              ? fullRow(error)
              : loading
                ? Array.from({ length: 5 }, (_, i) => (
                    <tr
                      key={`skeleton-${i}`}
                      className="max-[760px]:block max-[760px]:border-b max-[760px]:border-border max-[760px]:py-2.5"
                    >
                      {leafColumns.map((column) => (
                        <td
                          key={column.id}
                          className="border-b border-border px-2.5 py-[11px] max-[760px]:block max-[760px]:border-0 max-[760px]:px-0 max-[760px]:py-1"
                        >
                          <Skeleton className={column.columnDef.meta?.lead ? 'w-40' : 'w-16'} />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.length === 0
                  ? fullRow(empty)
                  : rows.map((row, index) => (
                      <tr
                        key={row.id}
                        tabIndex={onRowClick ? 0 : undefined}
                        onClick={
                          onRowClick
                            ? (event) => {
                                if (!fromControl(event)) onRowClick(row.original)
                              }
                            : undefined
                        }
                        onKeyDown={
                          onRowClick ? (event) => onRowKey(event, row.original) : undefined
                        }
                        className={cn(
                          'group/row max-[760px]:block max-[760px]:border-b max-[760px]:border-border max-[760px]:py-2.5 max-[760px]:last:border-b-0',
                          onRowClick && 'cursor-pointer',
                          rowClassName?.(row.original, index),
                        )}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef.meta
                          return (
                            <td
                              key={cell.id}
                              data-label={meta?.lead ? undefined : cardLabel(cell.column.id)}
                              className={cn(
                                'border-b border-border px-2.5 py-[11px] align-middle group-last/row:border-b-0',
                                onRowClick && 'group-hover/row:bg-elev',
                                meta?.align === 'right' && 'text-right',
                                meta?.nowrap && 'whitespace-nowrap',
                                meta?.lead
                                  ? 'max-[760px]:block max-[760px]:border-0 max-[760px]:px-0 max-[760px]:pt-0 max-[760px]:pb-1.5 max-[760px]:text-left'
                                  : cn(
                                      cardCell,
                                      'max-[760px]:before:flex-none max-[760px]:before:text-left max-[760px]:before:text-[13px] max-[760px]:before:text-fg2 max-[760px]:before:content-[attr(data-label)]',
                                      'max-[760px]:empty:hidden',
                                    ),
                                onRowClick && 'max-[760px]:group-hover/row:bg-transparent',
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
