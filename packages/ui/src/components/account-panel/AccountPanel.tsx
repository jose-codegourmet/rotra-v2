import { formatPhoneForDisplay } from '@rotra/schema/phone'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Icon } from '@rotra/ui/icon'
import { KeyValueList } from '@rotra/ui/key-value-list'
import type { ReactNode } from 'react'
export type AccountPanelProps = {
  /** E.164, e.g. +639175550142; shown grouped */
  phone: string
  email: string
  phoneHidden: boolean
  /** P04 places the open contact-change request chip here */
  requestSlot?: ReactNode
  onOpenPrivacy: () => void
  onSignOut: () => void
}
/** The owner's private account summary. Only ever rendered on P-OWN-PROFILE. */
export function AccountPanel({
  phone,
  email,
  phoneHidden,
  requestSlot,
  onOpenPrivacy,
  onSignOut,
}: AccountPanelProps) {
  return (
    <Card asChild className="border-dashed border-border-strong bg-transparent shadow-none">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3>Your account</h3>
          <span className="inline-flex items-center gap-1 text-sm text-fg2">
            <Icon name="lock" /> Only you see this
          </span>
        </div>
        <KeyValueList
          items={[
            {
              label: 'Phone',
              value: <span className="font-mono">{formatPhoneForDisplay(phone)}</span>,
            },
            { label: 'Email', value: email || <span className="text-fg2">Not added</span> },
            {
              label: 'Clubs',
              value: phoneHidden ? 'Phone hidden from clubs' : 'Clubs can see your phone',
            },
          ]}
        />
        {requestSlot ? <div className="text-sm">{requestSlot}</div> : null}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-2">
          <Button size="sm" onClick={onOpenPrivacy}>
            Privacy and contact
          </Button>
          <Button size="sm" variant="ghost" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </section>
    </Card>
  )
}
