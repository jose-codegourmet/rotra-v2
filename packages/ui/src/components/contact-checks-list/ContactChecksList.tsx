import type { ContactChangeField, ContactCheck } from '@rotra/data/contact-change-request/types'
import { Card } from '@rotra/ui/card'
import { REQUEST_FIELD_WORD } from '@rotra/ui/contact-request-status/variants'
import { Icon } from '@rotra/ui/icon'
import { requestAgo } from '@rotra/ui/name-change-request-card/helpers'
import { type ReactNode, useId } from 'react'

export type ContactChecksListProps = {
  field: ContactChangeField
  /** The computed checks, in the prototype's order (linked, newer, original, in progress) */
  checks: ContactCheck[]
  /** Opens the other player's detail; without it their name is plain text */
  onOpenPlayer?: (playerId: string) => void
  /** Opens the newer request's review; without it the link text is plain */
  onOpenRequest?: (requestId: string) => void
  /** Reference time for "2 hours ago"; stories pass the fixture's now */
  now?: Date
}

const linkClass =
  'border-0 bg-transparent p-0 text-left font-semibold text-accent [overflow-wrap:anywhere] hover:underline hover:underline-offset-3'

function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[0.92em] [overflow-wrap:anywhere]">{children}</span>
}

function checkText(
  check: ContactCheck,
  f: string,
  {
    onOpenPlayer,
    onOpenRequest,
    now,
  }: Pick<ContactChecksListProps, 'onOpenPlayer' | 'onOpenRequest' | 'now'>,
): ReactNode {
  switch (check.kind) {
    case 'linked-elsewhere': {
      const other = check.otherPlayer
      if (check.ok || !other) return 'Not linked to any other player'
      return (
        <>
          This {f} is already linked to{' '}
          {onOpenPlayer ? (
            <button type="button" onClick={() => onOpenPlayer(other.id)} className={linkClass}>
              {other.fullName}
            </button>
          ) : (
            <b className="[overflow-wrap:anywhere]">{other.fullName}</b>
          )}{' '}
          (<Mono>{other.rtrId}</Mono>). Approving would put two players on one {f}, and Admin never
          merges players.
        </>
      )
    }
    case 'newer-request': {
      if (check.ok) return `No newer request for this ${f}`
      const { newerRequestId, sentAt } = check
      return (
        <>
          A newer request for this {f} was sent
          {sentAt !== undefined ? ` ${requestAgo(new Date(sentAt), now)}` : ''}.{' '}
          {onOpenRequest && newerRequestId ? (
            <button
              type="button"
              onClick={() => onOpenRequest(newerRequestId)}
              className={linkClass}
            >
              Review that one instead
            </button>
          ) : (
            'Review that one instead'
          )}
          .
        </>
      )
    }
    case 'original-changed':
      if (check.ok) return `Their current ${f} still matches the request`
      return (
        <>
          Their {f} has changed since this was sent. It's now{' '}
          <Mono>{check.currentValue || 'not set'}</Mono>.
        </>
      )
    case 'in-progress':
      return check.ok
        ? 'No other change is being applied for this player'
        : 'Another contact change for this player is still being applied.'
  }
}

/**
 * A-CONTACT-REVIEW 'Checks before approving' (rotra-admin.html checks()): one line per conflict
 * check, a check icon when it passes and an × when it fails. Another player is named by name and RTR
 * ID only. When any check fails, the footer says Approve stays off. The checks are computed upstream.
 */
export function ContactChecksList({
  field,
  checks,
  onOpenPlayer,
  onOpenRequest,
  now = new Date(),
}: ContactChecksListProps) {
  const headingId = useId()
  const f = REQUEST_FIELD_WORD[field]
  const blocked = checks.some((check) => !check.ok)
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Checks before approving</h2>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {checks.map((check) => (
            <li key={check.kind} className="flex items-start gap-2.5 text-sm">
              <Icon
                name={check.ok ? 'check' : 'x-small'}
                className={`mt-[3px] flex-none ${check.ok ? 'text-accent' : 'text-error'}`}
              />
              <span className="min-w-0">
                {checkText(check, f, { onOpenPlayer, onOpenRequest, now })}
              </span>
            </li>
          ))}
        </ul>
        {blocked ? (
          <p className="m-0 text-[13px] text-fg2">
            Approve stays off until every check passes. You can still decline.
          </p>
        ) : null}
      </section>
    </Card>
  )
}
