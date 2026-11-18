import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { GoogleMark } from '@rotra/ui/google-mark'
import { Icon } from '@rotra/ui/icon'

export type GoogleIdentityRowProps = {
  /** The Google account's name */
  name: string
  email: string
  /**
   * "confirmed": the "Email confirmed" chip (registration, P-INVITE form).
   * "same-email": the "Same email" chip (P-GOOGLE-LINK).
   * Leave out for no chip.
   */
  chip?: 'confirmed' | 'same-email'
  /** Optional helper line under the email */
  helper?: string
  className?: string
}

const CHIP_LABEL = { confirmed: 'Email confirmed', 'same-email': 'Same email' } as const

/** The prototype's .gid for a Google account: the mark, the account's name and email, and a chip. */
export function GoogleIdentityRow({
  name,
  email,
  chip,
  helper,
  className,
}: GoogleIdentityRowProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-border bg-elev p-3',
        className,
      )}
    >
      <GoogleMark />
      <div className="flex min-w-0 flex-1 flex-col">
        <b className="[overflow-wrap:anywhere]">{name}</b>
        <span className="text-[13px] text-fg2 [overflow-wrap:anywhere]">{email}</span>
        {helper ? <span className="text-[13px] text-fg2">{helper}</span> : null}
      </div>
      {chip ? (
        <Chip tone="accent">
          <Icon name="check" size={12} />
          {CHIP_LABEL[chip]}
        </Chip>
      ) : null}
    </div>
  )
}
