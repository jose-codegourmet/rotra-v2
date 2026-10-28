import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'

export type PublicPreviewBannerProps = {
  /** Returns the operator to the Queue app screen they came from */
  onBack: () => void
  className?: string
}

/**
 * The warn-toned strip above the public page in the operator app: "Public page preview. What anyone
 * with the session link sees, no sign-in needed." with Back to Queue app. The real public page has no
 * banner.
 */
export function PublicPreviewBanner({ onBack, className }: PublicPreviewBannerProps) {
  return (
    <div role="status" className={cn('border-b border-warn bg-warn-subtle text-[13px]', className)}>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-2">
        <span className="min-w-0">
          <b>Public page preview.</b> What anyone with the session link sees, no sign-in needed.
        </span>
        <Button size="xs" onClick={onBack}>
          <Icon name="back" />
          Back to Queue app
        </Button>
      </div>
    </div>
  )
}
