'use client'

import type { PaymentShareFilter } from '@rotra/data/session-payment/share-rules'
import { Button } from '@rotra/ui/button'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'

export type PaymentStatusShareSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  filter: PaymentShareFilter
  onFilterChange: (filter: PaymentShareFilter) => void
  /** People per filter, for the labels: All · 18, Paid · 12 */
  counts: Record<PaymentShareFilter, number>
  /** The share text for the current filter (buildPaymentShare); shown as is */
  text: string
  onCopy: () => void
  /** Omitted where the device has no native share sheet */
  onShare?: () => void
}

const FILTERS: [PaymentShareFilter, string][] = [
  ['all', 'All'],
  ['paid', 'Paid'],
  ['partial', 'Partial'],
  ['unpaid', 'Unpaid'],
]

/**
 * The prototype's Share payment status dialog (#1010): a filter row (All, Paid, Partial, Unpaid), a
 * read-only text preview of the numbered lists with amounts paid, balances and collected totals,
 * and Copy / Share. ROTRA only produces the text; it moves no money.
 */
export function PaymentStatusShareSheet({
  open,
  onOpenChange,
  filter,
  onFilterChange,
  counts,
  text,
  onCopy,
  onShare,
}: PaymentStatusShareSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Share payment status"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          {onShare ? <Button onClick={onShare}>Share</Button> : null}
          <Button variant="primary" onClick={onCopy}>
            Copy text
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-3">
        <SegmentedControl
          aria-label="Show in the text"
          value={filter}
          onChange={(value) => onFilterChange(value as PaymentShareFilter)}
          options={FILTERS.map(([value, label]) => ({
            value,
            label: `${label} · ${counts[value]}`,
          }))}
        />
        <figure aria-label="Payment status text" className="m-0">
          <pre className="m-0 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border-strong bg-bg p-3.5 font-mono text-[13px] leading-relaxed text-fg">
            {text}
          </pre>
        </figure>
        <p className="m-0 text-sm text-fg2">
          Collected is the cash received. ROTRA only writes the text; money is collected outside the
          app.
        </p>
      </div>
    </Sheet>
  )
}
