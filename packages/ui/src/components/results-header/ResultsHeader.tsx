import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'

export type ResultsHeaderProps = {
  title: string
  /** Already formatted, e.g. "Thu, Oct 23" */
  date: string
  venue: string
  /** Counted games in the session */
  gameCount: number
  /** Club results are on the public session page: "Update publication" and "Club results published" */
  published: boolean
  /** Off Day was explicitly included in the publication: "Off Day shared" */
  offDayShared?: boolean
  onMatchHistory: () => void
  onViewPublicPage: () => void
  onDownloadImages: () => void
  onPublish: () => void
  className?: string
}

const LABEL = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'

/**
 * Head of the private result review (Q-RESULTS): "Session results · private", the title, date ·
 * venue · N games, the four actions (primary Publish results or Update publication) and the three
 * separate status chips: player records and ranks updated, club results private or published,
 * Off Day private or shared. Results are read-only; nothing here edits them.
 */
export function ResultsHeader({
  title,
  date,
  venue,
  gameCount,
  published,
  offDayShared = false,
  onMatchHistory,
  onViewPublicPage,
  onDownloadImages,
  onPublish,
  className,
}: ResultsHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={LABEL}>Session results · private</span>
          <h1 className="[overflow-wrap:anywhere]">{title}</h1>
          <p className="m-0 text-[13px] text-fg2 [overflow-wrap:anywhere]">
            {date} · {venue} · {gameCount} game{gameCount === 1 ? '' : 's'}
          </p>
        </div>
        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            'max-[640px]:grid max-[640px]:w-full max-[640px]:grid-cols-2 max-[640px]:[&>*]:w-full',
          )}
        >
          <Button size="sm" onClick={onMatchHistory}>
            Match history
          </Button>
          <Button size="sm" onClick={onViewPublicPage}>
            View public page
          </Button>
          <Button size="sm" onClick={onDownloadImages}>
            Download images
          </Button>
          <Button size="sm" variant="primary" onClick={onPublish}>
            {published ? 'Update publication' : 'Publish results'}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="accent">
          <Icon name="check" size={12} />
          Player records and ranks updated
        </Chip>
        <Chip tone={published ? 'accent' : 'neutral'}>
          {published ? 'Club results published' : 'Club results private'}
        </Chip>
        <Chip tone="warn">{published && offDayShared ? 'Off Day shared' : 'Off Day private'}</Chip>
      </div>
      <p className="m-0 text-[13px] text-fg2">
        Player profiles and ranks updated when the session finished. Publishing is separate and only
        affects the session page. Results are read-only.
      </p>
    </header>
  )
}
