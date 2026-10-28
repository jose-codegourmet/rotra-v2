import { Card } from '@rotra/ui/card'
import type { ReactNode } from 'react'
import { rtrIdParts } from './PlayerIdBreakdown.helpers'

export type PlayerIdBreakdownProps = {
  rtrId: string
  /** P04.7 places the offline 'Saved on this device' notice here */
  offlineNotice?: ReactNode
}

/** 'What the ID means': the five parts of the RTR ID, each with its meaning. */
export function PlayerIdBreakdown({ rtrId, offlineNotice }: PlayerIdBreakdownProps) {
  const parts = rtrIdParts(rtrId)
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h2>What the ID means</h2>
        {parts ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,96px),1fr))] gap-2">
            {parts.map((part) => (
              <div
                key={part.label}
                className="flex min-w-0 flex-col gap-0.5 rounded-md border border-border px-2.5 py-2"
              >
                <code className="font-mono font-semibold text-accent [overflow-wrap:anywhere]">
                  {part.code}
                </code>
                <span className="text-fg2 text-xs">{part.label}</span>
              </div>
            ))}
          </div>
        ) : null}
        <p className="m-0 text-fg2 text-sm">
          Your ID never changes, even if you move, play for another club, or change your phone or
          email.
        </p>
        {offlineNotice}
      </section>
    </Card>
  )
}
