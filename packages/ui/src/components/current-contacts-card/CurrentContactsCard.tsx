import { formatPhoneForDisplay } from '@rotra/schema/phone'
import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { PlayerIdentityCell } from '@rotra/ui/player-identity-cell'
import type { ElementType } from 'react'

export type CurrentContactsCardProps = {
  fullName: string
  rtrId: string
  /** Player detail URL; the name renders as a link */
  href?: string
  /** Link element for href (e.g. Next's Link); defaults to <a> */
  linkComponent?: ElementType
  /** Used when there is no href; the name renders as a button */
  onOpenPlayer?: () => void
  /** The player finished registering */
  claimed: boolean
  /** The applied phone (E.164), never the requested value */
  phone?: string
  /** The applied email, never the requested value */
  email?: string
}

/**
 * A-CONTACT-REVIEW side card: who the request is for and the contacts in use right now. An approved
 * change shows here only once it's applied.
 */
export function CurrentContactsCard({
  fullName,
  rtrId,
  href,
  linkComponent,
  onOpenPlayer,
  claimed,
  phone,
  email,
}: CurrentContactsCardProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <PlayerIdentityCell
          variant="request"
          fullName={fullName}
          rtrId={rtrId}
          href={href}
          linkComponent={linkComponent}
          onOpen={onOpenPlayer}
        />
        <KeyValueList
          items={[
            { label: 'Account', value: claimed ? 'Registered' : 'Unclaimed' },
            {
              label: 'Phone',
              value: (
                <span className="font-mono">
                  {phone ? formatPhoneForDisplay(phone) : 'Not given'}
                </span>
              ),
            },
            { label: 'Email', value: <span className="font-mono">{email || 'Not given'}</span> },
          ]}
        />
        <p className="m-0 text-[13px] text-fg2">
          These are the contacts in use right now. An approved change shows here only once it's
          applied.
        </p>
      </section>
    </Card>
  )
}
