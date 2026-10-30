import type { ContactChangeStatus } from '@rotra/data/contact-change-request/types'
import { requestAgo } from '@rotra/ui/name-change-request-card/helpers'
import { Notice } from '@rotra/ui/notice'
import { Spinner } from '@rotra/ui/spinner'

export type ContactRequestStatusNoticeProps = {
  status: ContactChangeStatus
  /** The player's nickname or first name, as the prototype's firstName() */
  firstName: string
  /** The contact in use when the request was sent */
  from: string
  to: string
  /** Epoch ms; each time is left out of the sentence when missing */
  approvedAt?: number
  appliedAt?: number
  /** When a rejected request was declined */
  decidedAt?: number
  /** Why the approved change couldn't be applied */
  error?: string
  /** Reference time for "12 min ago"; stories pass the fixture's now */
  now?: Date
}

const mono = (value: string) => <span className="font-mono [overflow-wrap:anywhere]">{value}</span>

/**
 * The status banner under the A-CONTACT-REVIEW page head. Approved-but-unapplied, applied, failed and
 * not approved each read differently, so an approval is never mistaken for a changed contact.
 * Nothing shows while the request waits for review.
 */
export function ContactRequestStatusNotice({
  status,
  firstName,
  from,
  to,
  approvedAt,
  appliedAt,
  decidedAt,
  error,
  now = new Date(),
}: ContactRequestStatusNoticeProps) {
  const ago = (at?: number) => (at ? requestAgo(new Date(at), now) : null)
  switch (status) {
    case 'pending':
      return null
    case 'approved':
    case 'applying': {
      const approved = ago(approvedAt)
      return (
        <Notice tone="warn">
          <span className="flex items-center gap-2">
            <Spinner className="motion-reduce:animate-none" />
            <b>Approved{approved ? ` ${approved}` : ''}. Applying the change.</b>
          </span>
          <span className="mt-1.5 block">
            {firstName} keeps signing in with {mono(from)} until this finishes.
          </span>
        </Notice>
      )
    }
    case 'applied': {
      const applied = ago(appliedAt)
      return (
        <Notice tone="success" title={`Applied${applied ? ` ${applied}` : ''}.`}>
          {firstName} now signs in with {mono(to)}. RTR ID and match history are unchanged.
        </Notice>
      )
    }
    case 'failed':
      return (
        <Notice tone="error" title="Approved, but not applied.">
          {error || 'The change could not be applied.'} {firstName} still signs in with {mono(from)}
          . Retrying applies this same approved change; it doesn't create anything new.
        </Notice>
      )
    case 'rejected': {
      const decided = ago(decidedAt)
      return (
        <Notice tone="info" title={`Not approved${decided ? ` · ${decided}` : ''}.`}>
          {firstName} keeps {mono(from)}. They can send a new request.
        </Notice>
      )
    }
  }
}
