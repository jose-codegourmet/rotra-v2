import { formatPhoneForDisplay } from '@rotra/schema/phone'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import type { ReactNode, Ref } from 'react'

export type ContactDetailsCardProps = {
  /** E.164; shown grouped */
  phone: string
  email: string
  /** ContactRequestStatus (full) when there is a request */
  statusSlot?: ReactNode
  /** Hides 'Request a change' while a request is open */
  hasOpenRequest?: boolean
  onRequestChange: () => void
  /** The sheet returns focus here */
  requestButtonRef?: Ref<HTMLButtonElement>
}

/** P-PHONE-PRIVACY's 'Contact details': the owner's login phone and email and the change request. */
export function ContactDetailsCard({
  phone,
  email,
  statusSlot,
  hasOpenRequest,
  onRequestChange,
  requestButtonRef,
}: ContactDetailsCardProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h2>Contact details</h2>
        <KeyValueList
          items={[
            {
              label: 'Phone',
              value: <span className="font-mono">{formatPhoneForDisplay(phone)}</span>,
            },
            {
              label: 'Email',
              value: email ? (
                <span className="[overflow-wrap:anywhere]">{email}</span>
              ) : (
                <span className="text-fg2">Not added</span>
              ),
            },
          ]}
        />
        <p className="m-0 text-fg2 text-sm">
          You sign in with either one. To change them, ask the ROTRA platform owner. Changes take
          effect only after Admin approval.
        </p>
        {statusSlot}
        {hasOpenRequest ? null : (
          <div className="flex flex-wrap gap-2">
            <Button ref={requestButtonRef} size="sm" onClick={onRequestChange}>
              Request a change
            </Button>
          </div>
        )}
      </section>
    </Card>
  )
}
