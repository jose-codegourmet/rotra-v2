import { formatPeso } from '@rotra/schema/money'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { KeyValueList } from '@rotra/ui/key-value-list'

export type CostEstimate = {
  players: number
  court: number
  shuttle: number
  entrance?: number
  entranceFeePerHead?: number
  total: number
  breakEven: number
  perHead: number
  isCustom: boolean
  collect: number
  result: { kind: 'profit' | 'loss' | 'breaks_even' | 'no_costs'; amount: number }
}

export type CostEstimateSummaryProps = { estimate: CostEstimate; className?: string }

/** The estimate's result includes words as well as its semantic colour. Amounts are centavos. */
export function CostEstimateResult({ result }: Pick<CostEstimate, 'result'>) {
  return (
    <span
      className={cn(
        result.kind === 'profit' && 'text-accent',
        result.kind === 'loss' && 'text-warn',
      )}
    >
      {result.kind === 'no_costs'
        ? 'No costs entered'
        : result.kind === 'profit'
          ? `${formatPeso(result.amount)} profit`
          : result.kind === 'loss'
            ? `${formatPeso(result.amount)} loss`
            : result.amount > 0
              ? `Breaks even · ${formatPeso(result.amount)} extra from rounding up`
              : 'Breaks even'}
    </span>
  )
}

export function CostEstimateSummary({ estimate: e, className }: CostEstimateSummaryProps) {
  return (
    <Card className={cn('flex flex-col gap-3 bg-bg', className)}>
      <h3 className="m-0 text-xs font-semibold tracking-wide text-fg2 uppercase">
        Estimate for {e.players} players
      </h3>
      <KeyValueList
        items={[
          { label: 'Courts', value: formatPeso(e.court) },
          { label: 'Shuttlecocks', value: formatPeso(e.shuttle) },
          ...(e.entrance
            ? [
                {
                  label: 'Entrance fees',
                  value: (
                    <>
                      {formatPeso(e.entrance)}{' '}
                      <span className="text-xs text-fg2">
                        · {formatPeso(e.entranceFeePerHead ?? 0)} × {e.players} · misc
                      </span>
                    </>
                  ),
                },
              ]
            : []),
          { label: <b>Total cost</b>, value: <b>{formatPeso(e.total)}</b> },
          { label: 'Break-even', value: `${formatPeso(e.breakEven)} a player` },
          {
            label: 'Players pay',
            value: `${formatPeso(e.perHead)} each · ${e.isCustom ? 'custom amount' : 'break-even'}`,
          },
          { label: "You'd collect", value: formatPeso(e.collect) },
          {
            label: <b>Result</b>,
            value: (
              <b>
                <CostEstimateResult result={e.result} />
              </b>
            ),
          },
        ]}
      />
    </Card>
  )
}
