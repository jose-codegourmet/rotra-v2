import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'

export type PublicPreviewBannerProps = {
  /** Returns the operator to the Queue app screen they came from */
  onBack: () => void
  /**
   * The shareable visitor link (origin + /s/<slug>). When set, the banner shows it with Copy link
   * so the operator shares it instead of the preview page's own address.
   */
  sessionLink?: string
  /** Copies `sessionLink`; the caller toasts the outcome */
  onCopyLink?: () => void
  className?: string
}

/**
 * The warn-toned strip above the public page in the operator app: "Public page preview. What anyone
 * with the session link sees, no sign-in needed." with Back to Queue app, and (with `sessionLink`)
 * "Share this link, not this page's address:" + the visitor link + Copy link. The real public page
 * has no banner.
 */
export function PublicPreviewBanner({
  onBack,
  sessionLink,
  onCopyLink,
  className,
}: PublicPreviewBannerProps) {
  return (
    <div role="status" className={cn('border-b border-warn bg-warn-subtle text-[13px]', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-page py-2">
        <span className="min-w-0">
          <b>Public page preview.</b> What anyone with the session link sees, no sign-in needed.
        </span>
        <Button size="xs" onClick={onBack}>
          <Icon name="back" />
          Back to Queue app
        </Button>
      </div>
      {sessionLink ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-page pb-2">
          <span>Share this link, not this page's address:</span>
          <span className="min-w-0 font-mono [overflow-wrap:anywhere]">{sessionLink}</span>
          {onCopyLink ? (
            <Button size="xs" onClick={onCopyLink}>
              Copy link
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
