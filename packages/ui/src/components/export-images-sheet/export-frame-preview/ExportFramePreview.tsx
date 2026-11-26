import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

export type ExportFramePreviewFormat = 'story' | 'feed'

export type ExportFramePreviewProps = {
  /** Story is tall (108 × 192); Feed post is 4:5 (144 × 180) */
  format: ExportFramePreviewFormat
  /** The preview's accessible name, e.g. "Standings · 1 of 3" */
  label: string
  /** The image itself: the result slide this image downloads as (StandingsSlide, AwardsSlide, OffDaySlide) */
  children: ReactNode
  className?: string
}

/** The image is drawn 480 px wide, then scaled into the thumbnail: Story 480 × 853, Feed 480 × 600. */
const ART = {
  story: 'h-[853px] scale-[0.225]',
  feed: 'h-[600px] scale-[0.3]',
} satisfies Record<ExportFramePreviewFormat, string>

/**
 * One thumbnail in the Download images sheet (Q-EXPORT): the image itself, scaled down, at the
 * prototype's story or feed proportions (owner, November 25, 2026: the previews are the images, not a
 * list of names). Purely visual: the slide inside is inert and hidden from assistive tech; the
 * thumbnail is one image named by `label`. The actual image files come from the export (Q08.5).
 */
export function ExportFramePreview({
  format,
  label,
  children,
  className,
}: ExportFramePreviewProps) {
  return (
    <div
      role="img"
      aria-label={`${label} image preview`}
      data-format={format}
      className={cn(
        'relative flex-none overflow-hidden rounded-lg border border-border-strong bg-bg',
        format === 'story' ? 'h-48 w-[108px]' : 'h-[180px] w-36',
        className,
      )}
    >
      <div
        aria-hidden
        inert
        className={cn(
          'pointer-events-none absolute top-0 left-0 w-[480px] origin-top-left',
          '[&>article]:h-full [&>article]:max-w-none [&>article]:overflow-hidden [&>article]:rounded-none [&>article]:border-0',
          '[&>article>footer]:mt-auto',
          ART[format],
        )}
      >
        {children}
      </div>
    </div>
  )
}
