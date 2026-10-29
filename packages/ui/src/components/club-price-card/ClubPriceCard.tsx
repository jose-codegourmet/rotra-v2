import { formatPeso } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { type ValueTile, ValueTiles } from '@rotra/ui/value-tiles'
import { useId } from 'react'

export type ClubPriceCardProps = {
  pricing: 'paid' | 'free'
  /** License prices in centavos; shown in whole pesos */
  monthlyMinor: number
  yearlyMinor: number
  /** How much less the yearly price is than 12 months, rounded; 0 or less reads "No yearly discount" */
  yearlySavingPercent: number
  /** Opens the Change price sheet; the button renders only when it is passed */
  onChangePrice?: () => void
}

const pesos = (minor: number) => formatPeso(Math.round(minor / 100) * 100)

function priceTiles({
  pricing,
  monthlyMinor,
  yearlyMinor,
  yearlySavingPercent,
}: ClubPriceCardProps): ValueTile[] {
  if (pricing === 'free') {
    return [
      {
        id: 'price',
        label: 'Price',
        value: 'Free',
        sub: 'Tester club. Licenses are recorded at ₱0.',
      },
    ]
  }
  return [
    { id: 'monthly', label: 'Monthly', value: pesos(monthlyMinor), mono: true },
    {
      id: 'yearly',
      label: 'Yearly',
      value: pesos(yearlyMinor),
      sub:
        yearlySavingPercent > 0
          ? `${yearlySavingPercent}% less than 12 months`
          : 'No yearly discount',
      mono: true,
    },
  ]
}

/** Club detail › License: this club's own monthly and yearly price, or Free for a tester club. */
export function ClubPriceCard(props: ClubPriceCardProps) {
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={headingId}>Price</h2>
            <p className="m-0 text-[13px] text-fg2">Set for this club. There's no fixed price.</p>
          </div>
          {props.onChangePrice ? (
            <Button size="sm" onClick={props.onChangePrice}>
              Change price
            </Button>
          ) : null}
        </div>
        <ValueTiles tiles={priceTiles(props)} />
        <p className="m-0 text-[13px] text-fg2">
          The License form fills in the amount from this price. Changing it doesn't change payments
          already recorded.
        </p>
      </section>
    </Card>
  )
}
