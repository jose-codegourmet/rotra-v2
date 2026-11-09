import { formatPhoneForDisplay } from '@rotra/schema/phone'
import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { Switch } from '@rotra/ui/switch'
import { useId } from 'react'

export type PrivateContactCardProps = {
  /** The applied phone (E.164), never a pending requested value */
  phone?: string
  /** The applied email, never a pending requested value */
  email?: string
  /** The player finished registering */
  claimed?: boolean
  /** The player hid their phone from clubs (only meaningful once claimed) */
  phoneHidden?: boolean
  /** Player profile visibility mode; omitted on the Admin private-contact readout. */
  savedPrivate?: boolean
  onToggleProfile?: (next: boolean) => void
  isPending?: boolean
  error?: string
}

function phoneShownToClubs({ claimed, phoneHidden }: PrivateContactCardProps) {
  if (!claimed) return 'Yes, if provided'
  return phoneHidden ? 'No, hidden by the player' : 'Yes'
}

/**
 * Admin player detail (A-PLAYER-DETAIL): the player's private login contacts, how they sign in and
 * whether clubs see the phone. Never shows a password, token or claim link.
 */
export function PrivateContactCard(props: PrivateContactCardProps) {
  const { phone, email, claimed } = props
  const headingId = useId()
  if (props.onToggleProfile)
    return (
      <Card asChild>
        <section className="flex flex-col gap-3">
          <h2>Profile visibility</h2>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={headingId} className="font-bold">
                Private profile
              </label>
              <p className="text-sm text-fg2">
                Private means guests don't see your ROTRA profile. Signed-in ROTRA players still see
                it.
              </p>
            </div>
            <Switch
              id={headingId}
              aria-label="Private profile"
              checked={props.savedPrivate ?? false}
              onChange={props.onToggleProfile}
              disabled={props.isPending}
              aria-busy={props.isPending}
            />
          </div>
          <p className="text-sm" aria-live="polite">
            {props.isPending
              ? 'Saving…'
              : props.savedPrivate
                ? 'Saved: your profile is private.'
                : 'Saved: your profile is public.'}
          </p>
          {props.error ? <Notice tone="error">{props.error}</Notice> : null}
        </section>
      </Card>
    )
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
              value: claimed ? 'Email' : "Nothing yet. The player hasn't registered.",
            },
            { label: 'Phone shown to clubs', value: phoneShownToClubs(props) },
          ]}
        />
      </section>
    </Card>
  )
}
