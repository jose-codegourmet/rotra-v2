import type { ContactChangeField } from '@rotra/data/contact-change-request/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { REQUEST_FIELD_LABEL } from '@rotra/ui/contact-request-status/variants'
import { requestAgo } from '@rotra/ui/name-change-request-card/helpers'
import { type ElementType, type ReactNode, useId } from 'react'

/** The prototype's nextAction(): what opening the request lets Admin do next. */
export type ContactRequestNextAction =
  | 'Review'
  | 'Review · blocked'
  | 'Check status'
  | 'Retry application'
  | 'View'

export type ContactRequestListItem = {
  id: string
  field: ContactChangeField
  /** Current value when sent; '' shows as '—' */
  from: string
  to: string
  /** When the player sent it (epoch ms, ISO or Date) */
  requestedAt: number | string | Date
  /** The status chip (A03.3's ContactRequestStatusChip), or a plain label */
  status: ReactNode
  action: ContactRequestNextAction
  /** Opens the review as a link; otherwise the button calls onOpen(id) */
  href?: string
}

export type ContactRequestListProps = {
  /** Newest first, as the prototype sorts them */
  requests: ContactRequestListItem[]
  onOpen?: (id: string) => void
  /** Link element for href (e.g. Next's Link); defaults to <a> */
  linkComponent?: ElementType
  /** Reference time for "sent 3 days ago"; stories pass the fixture's now */
  now?: Date
}

/** Admin player detail (A-PLAYER-DETAIL): this player's contact-change requests. */
export function ContactRequestList({
  requests,
  onOpen,
  linkComponent: Link = 'a',
  now = new Date(),
}: ContactRequestListProps) {
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Contact-change requests</h2>
        {requests.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 border-border border-b py-2.5"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {request.status}
                    <span className="text-[13px] text-fg2">
                      {REQUEST_FIELD_LABEL[request.field]} · sent{' '}
                      {requestAgo(new Date(request.requestedAt), now)}
                    </span>
                  </div>
                  <span className="font-mono text-[13px] [overflow-wrap:anywhere]">
                    {request.from || '—'} → {request.to}
                  </span>
                </div>
                {request.href ? (
                  <Button asChild size="sm">
                    <Link href={request.href}>{request.action}</Link>
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => onOpen?.(request.id)}>
                    {request.action}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[13px] text-fg2">No requests.</p>
        )}
      </section>
    </Card>
  )
}
