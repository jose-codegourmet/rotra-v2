import { formatPeso } from '@rotra/schema/money'
import { Card } from '@rotra/ui/card'
import { type CostEstimate, CostEstimateResult } from '@rotra/ui/cost-estimate-summary'
import { KeyValueList } from '@rotra/ui/key-value-list'

export type SessionFinancialsSummaryProps = {
  estimate: CostEstimate | null
  courts: number
  durationLabel: string
  courtFeePerCourtHour: number
  shuttleLines: { id: string; name: string; tubes: number }[]
}

export function SessionFinancialsSummary({
  estimate: e,
  courts,
  durationLabel,
  courtFeePerCourtHour,
  shuttleLines,
}: SessionFinancialsSummaryProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div>
        <h2 className="m-0 text-xl font-bold">Financials</h2>
        {e ? (
          <p className="mt-1 text-sm text-fg2">
            The estimate saved for this session, for {e.players} players. ROTRA doesn't collect
            money; tick who has paid in Payments below.
          </p>
        ) : null}
      </div>
      {e ? (
        <div className="grid gap-4 min-[700px]:grid-cols-2">
          <Card className="flex flex-col gap-3">
            <h3 className="m-0 font-bold">Costs</h3>
            <KeyValueList
              items={[
                {
                  label: 'Courts',
                  value: (
                    <>
                      {formatPeso(e.court)}
                      <br />
                      <span className="text-xs text-fg2">
                        {courts} courts × {durationLabel} at {formatPeso(courtFeePerCourtHour)}/h
                      </span>
                    </>
                  ),
                },
                {
                  label: 'Shuttlecocks',
                  value: (
                    <>
                      {formatPeso(e.shuttle)}
                      {shuttleLines.map((line) => (
                        <span key={line.id} className="block text-xs text-fg2">
                          {line.tubes} × {line.name}
                        </span>
                      ))}
                    </>
                  ),
                },
                ...(e.entrance
                  ? [
                      {
                        label: 'Entrance fees',
                        value: (
                          <>
                            {formatPeso(e.entrance)}
                            <br />
                            <span className="text-xs text-fg2">
                              {formatPeso(e.entranceFeePerHead ?? 0)} × {e.players} players · misc
                            </span>
                          </>
                        ),
                      },
                    ]
                  : []),
                { label: <b>Total cost</b>, value: <b>{formatPeso(e.total)}</b> },
              ]}
            />
          </Card>
          <Card className="flex flex-col gap-3">
            <h3 className="m-0 font-bold">Per player</h3>
            <KeyValueList
              items={[
                { label: 'Break-even', value: `${formatPeso(e.breakEven)} a player` },
                {
                  label: 'Players paid',
                  value: `${formatPeso(e.perHead)} each · ${e.isCustom ? 'custom amount' : 'break-even'}`,
                },
                {
                  label: 'Expected',
                  value: (
                    <>
                      {formatPeso(e.collect)} · <CostEstimateResult result={e.result} />
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      ) : (
        <Card className="py-8 text-center text-sm text-fg2">
          No cost estimate was saved for this session.
        </Card>
      )}
    </section>
  )
}
