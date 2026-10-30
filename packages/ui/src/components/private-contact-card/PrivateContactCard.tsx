import { formatPhoneForDisplay } from '@rotra/schema/phone'
import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { useId } from 'react'

export type PrivateContactCardProps = {
  /** The applied phone (E.164), never a pending requested value */
  phone?: string
  /** The applied email, never a pending requested value */
  email?: string
  /** The player finished registering */
  claimed: boolean
  /** The player hid their phone from clubs (only meaningful once claimed) */
  phoneHidden: boolean
}

function phoneShownToClubs({ claimed, phoneHidden }: PrivateContactCardProps) {
  if (!claimed) return 'Entered by the club'
  return phoneHidden ? 'No, hidden by the player' : 'Yes'
}

/**
 * Admin player detail (A-PLAYER-DETAIL): the player's private login contacts, how they sign in and
 * whether clubs see the phone. Never shows a password, token or claim link.
 */
export function PrivateContactCard(props: PrivateContactCardProps) {
  const { phone, email, claimed } = props
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={headingId}>Private contact</h2>
          <p className="m-0 text-[13px] text-fg2">
            Only Admin sees these. Players can't change them themselves; they send a request.
          </p>
        </div>
        <KeyValueList
          items={[
            {
              label: 'Phone',
              value: (
                <span className="font-mono">
                  {phone ? formatPhoneForDisplay(phone) : 'Not given'}
                </span>
              ),
            },
            { label: 'Email', value: <span className="font-mono">{email || 'Not given'}</span> },
            {
              label: 'Sign in with',
              value: claimed
                ? 'Phone number or email'
                : "Nothing yet. The player hasn't registered.",
            },
            { label: 'Phone shown to clubs', value: phoneShownToClubs(props) },
          ]}
        />
      </section>
    </Card>
  )
}
