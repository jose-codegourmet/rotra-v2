'use client'

import { cn } from '@rotra/ui/cn'
import { type DragEvent, type ReactNode, useState } from 'react'

export type ImageDropZoneProps = {
  /** Called with the dropped or chosen files, unchecked. Crop, size and type checks belong to the caller. */
  onFiles: (files: File[]) => void
  /** Offline: nothing can be added */
  disabled?: boolean
  /** Forces the drag-over look (stories); normally the zone tracks the drag itself */
  dragOver?: boolean
  id?: string
  /** Bold line; defaults to the characters copy "Drag images here to upload" */
  title?: ReactNode
  /** Muted line; defaults to "or click to choose · PNG, JPG or WebP, up to 1 MB each" */
  hint?: ReactNode
  className?: string
}

/**
 * The prototype's .ch-drop (Admin › Settings › Profile characters): a dashed zone that takes several
 * images by drag or by the file picker. It neither crops nor stores; it only reports the files.
 */
export function ImageDropZone({
  onFiles,
  disabled,
  dragOver,
  id,
  title = 'Drag images here to upload',
  hint = 'or click to choose · PNG, JPG or WebP, up to 1 MB each',
  className,
}: ImageDropZoneProps) {
  const [over, setOver] = useState(false)
  const active = !disabled && (dragOver || over)

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setOver(false)
    if (disabled) return
    const files = Array.from(event.dataTransfer.files)
    if (files.length) onFiles(files)
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-strong p-[18px] text-center text-fg2',
        'hover:not-has-disabled:border-accent hover:not-has-disabled:bg-accent-subtle',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
        active && 'border-accent bg-accent-subtle',
        disabled && 'cursor-not-allowed opacity-45',
        className,
      )}
    >
      <input
        id={id}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length) onFiles(files)
        }}
        className="pointer-events-none absolute size-px opacity-0"
      />
      <b className="text-fg">{title}</b>
      <span className="text-[13px]">{hint}</span>
    </label>
  )
}
