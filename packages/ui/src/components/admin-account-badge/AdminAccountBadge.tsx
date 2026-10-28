import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'

export type AdminAccountBadgeProps = {
  email: string
  onSignOut?: () => void
  isSigningOut?: boolean
}

export function AdminAccountBadge({
  email,
  onSignOut,
  isSigningOut = false,
}: AdminAccountBadgeProps) {
  const label = `Signed in as ${email}`
  const badge = (
    <span
      role="img"
      title={label}
      aria-label={label}
      className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[13px] text-fg2 max-[560px]:p-1.5"
    >
      <Icon name="user" className="shrink-0" />
      <span className="max-w-[30vw] truncate max-[560px]:hidden">{email}</span>
    </span>
  )

  if (!onSignOut) return badge

  return (
    <div className="flex min-w-0 items-center gap-2">
      {badge}
      <Button
        size="xs"
        variant="ghost"
        disabled={isSigningOut}
        aria-busy={isSigningOut || undefined}
        aria-label={isSigningOut ? 'Signing out…' : 'Sign out'}
        onClick={onSignOut}
        className="shrink-0 max-[560px]:min-w-11 max-[560px]:px-0"
      >
        <Icon name="nav-out" />
        <span className="max-[560px]:sr-only">{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
      </Button>
    </div>
  )
}
