import { cn } from '@rotra/ui/cn'

export type ExportFramePreviewFormat = 'story' | 'feed'

export type ExportFramePreviewProps = {
  /** Story is tall (108 × 192); Feed post is 4:5 (144 × 180) */
  format: ExportFramePreviewFormat
  clubName: string
  /** "Standings", "Standings 2", "Awards", "Off Day" */
  title: string
  /** The lines the image lists; rows past the frame are clipped, like the prototype */
  rows: string[]
  className?: string
}

/**
 * One thumbnail in the Download images sheet (Q-EXPORT): club name, slide title, its rows and the
 * "powered by rotra" footer, at the prototype's story or feed proportions. A preview only; the
 * actual image files come from the export (Q08.5).
 */
export function ExportFramePreview({
  format,
  clubName,
  title,
  rows,
  className,
}: ExportFramePreviewProps) {
  return (
    <div
      role="img"
      aria-label={`${title} image preview: ${rows.length} line${rows.length === 1 ? '' : 's'}`}
      data-format={format}
      className={cn(
        'flex flex-none flex-col gap-[3px] overflow-hidden rounded-lg border border-border-strong bg-bg p-2.5 text-[10px] text-fg',
        format === 'story' ? 'h-48 w-[108px]' : 'h-[180px] w-36',
        className,
      )}
    >
      <span className="truncate text-[11px] font-extrabold">{clubName}</span>
      <span className="truncate text-fg2">{title}</span>
      {rows.map((row, index) => (
        <span key={`${index}-${row}`} className="truncate">
          {row}
        </span>
      ))}
      <span className="mt-auto text-[9px] font-bold text-accent">powered by rotra</span>
    </div>
  )
}
