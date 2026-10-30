import { formatPeso } from '@rotra/schema/money'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'

export type ClubPriceTagProps = {
  pricing: 'paid' | 'free'
  /** Monthly license price in centavos; shown in whole pesos */
  monthlyMinor: number
  className?: string
}

/** A club's own license price in the Admin directory: "₱1,500 /mo", or "Free · tester". */
export function ClubPriceTag({ pricing, monthlyMinor, className }: ClubPriceTagProps) {
  if (pricing === 'free') {
    return (
      <Chip tone="accent" className={className}>
        Free · tester
      </Chip>
    )
  }
  return (
    <span className={cn('whitespace-nowrap', className)}>
      {formatPeso(Math.round(monthlyMinor / 100) * 100)}
      <span className="text-[13px] text-fg2"> /mo</span>
    </span>
  )
}
