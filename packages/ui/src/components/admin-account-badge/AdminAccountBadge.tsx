import { Icon } from '@rotra/ui/icon'

export type AdminAccountBadgeProps = { email: string }

export function AdminAccountBadge({ email }: AdminAccountBadgeProps) {
  const label = `Signed in as ${email}`
  return (
    <span role="img" title={label} aria-label={label} className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[13px] text-fg2 max-[560px]:p-1.5">
      <Icon name="user" className="shrink-0" />
      <span className="max-w-[30vw] truncate max-[560px]:hidden">{email}</span>
    </span>
  )
}
