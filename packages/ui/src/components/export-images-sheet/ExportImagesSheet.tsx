'use client'

import { Button } from '@rotra/ui/button'
import { Checkbox } from '@rotra/ui/checkbox'
import { ExportFramePreview } from '@rotra/ui/export-images-sheet/export-frame-preview'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'

export type ExportImagesFormat = 'story' | 'feed'

export type ExportImagesSelection = {
  standings: boolean
  awards: boolean
  /** Explicit Off Day inclusion (D-OFF-DAY); off by default for every download */
  includeOffDay: boolean
}

export type ExportImagesFrame = {
  /** "Standings", "Standings 2", "Awards", "Off Day" */
  title: string
  rows: string[]
}

export type ExportImagesSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  format: ExportImagesFormat
  selection: ExportImagesSelection
  /**
   * One entry per image, computed by the container from the result snapshot, the selection and the
   * format (14 standings rows per Story image, 10 per Feed image)
   */
  frames: ExportImagesFrame[]
  clubName: string
  onFormatChange: (format: ExportImagesFormat) => void
  onSelectionChange: (selection: ExportImagesSelection) => void
  onDownload: () => void
  /** Downloading is turned off in the prototype; the container enables it once the export exists */
  downloadEnabled: boolean
  /** Why the download cannot run right now, shown under the previews when downloadEnabled is false */
  disabledReason?: string
}

const FORMAT_OPTIONS = [
  { value: 'story', label: 'Story · tall' },
  { value: 'feed', label: 'Feed post · 4:5' },
]

/**
 * Q-EXPORT: the Download images sheet. Story or Feed post format, the Standings / Awards / Include
 * Off Day choices (Off Day with the warn border and off by default), "N images…" with a preview of
 * every image in a row that scrolls inside its own box, and the primary "Download N images".
 * Downloading never publishes and never re-finalizes the session.
 */
export function ExportImagesSheet({
  open,
  onOpenChange,
  format,
  selection,
  frames,
  clubName,
  onFormatChange,
  onSelectionChange,
  onDownload,
  downloadEnabled,
  disabledReason,
}: ExportImagesSheetProps) {
  const count = frames.length
  const images = `${count} image${count === 1 ? '' : 's'}`
  const setSelection = (patch: Partial<ExportImagesSelection>) =>
    onSelectionChange({ ...selection, ...patch })

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Download images"
      wide
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="primary" disabled={!downloadEnabled || count === 0} onClick={onDownload}>
            Download {images}
          </Button>
        </>
      }
    >
      <SegmentedControl
        aria-label="Image format"
        options={FORMAT_OPTIONS}
        value={format}
        onChange={(value) => onFormatChange(value as ExportImagesFormat)}
      />
      <fieldset aria-label="What to include" className="m-0 flex flex-wrap gap-2 border-0 p-0">
        <Checkbox
          label="Standings"
          checked={selection.standings}
          onChange={(standings) => setSelection({ standings })}
        />
        <Checkbox
          label="Awards"
          checked={selection.awards}
          onChange={(awards) => setSelection({ awards })}
        />
        <Checkbox
          label="Include Off Day"
          checked={selection.includeOffDay}
          onChange={(includeOffDay) => setSelection({ includeOffDay })}
          className="border-warn"
        />
      </fieldset>
      <p className="m-0 text-[13px] text-fg2" aria-live="polite">
        {images}. Long standings continue onto extra images so every name stays readable.
      </p>
      <section aria-label="Image previews" className="flex max-w-full gap-2.5 overflow-x-auto pb-1">
        {frames.map((frame, index) => (
          <ExportFramePreview
            key={`${index}-${frame.title}`}
            format={format}
            clubName={clubName}
            title={frame.title}
            rows={frame.rows}
          />
        ))}
      </section>
      {!downloadEnabled && disabledReason ? (
        <p className="m-0 text-[13px] text-fg2">{disabledReason}</p>
      ) : null}
    </Sheet>
  )
}
