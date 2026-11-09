import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'
export type EmailConfirmBannerProps = {
  email: string
  onResend: () => void
  onConfirm?: () => void
  pending?: boolean
  resent?: boolean
  error?: string
}
export function EmailConfirmBanner({
  email,
  onResend,
  onConfirm,
  pending,
  resent,
  error,
}: EmailConfirmBannerProps) {
  return (
    <div role="status" className="border-b border-border bg-elev px-5 py-3 text-sm">
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <Icon name="alert" />
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <p>
            <b>Confirm your email.</b> We sent a link to {email}. Some actions wait until it's
            confirmed.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="xs" disabled={pending} onClick={onResend}>
              {pending ? 'Sending…' : 'Resend email'}
            </Button>
            {onConfirm ? (
              <>
                <Button size="xs" variant="ghost" onClick={onConfirm}>
                  Mark confirmed
                </Button>
                <span className="text-fg2">Prototype only</span>
              </>
            ) : null}
            <span aria-live="polite" className="text-fg2">
              {error || (resent ? 'Email sent again' : '')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
