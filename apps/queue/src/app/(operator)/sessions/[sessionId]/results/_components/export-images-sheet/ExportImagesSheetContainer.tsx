'use client'

import { useClub } from '@rotra/data/club'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { buildExportFrames } from '@rotra/data/session-result/sessionResult.rules'
import type { PublishedSlide } from '@rotra/data/session-result/types'
import { useSessionResults } from '@rotra/data/session-result/useSessionResults'
import {
  type ExportImagesFormat,
  type ExportImagesSelection,
  ExportImagesSheet,
} from '@rotra/ui/export-images-sheet'
import { useEffect, useState } from 'react'

export type ExportImagesSheetContainerProps = {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Every open starts here: Story, Standings and Awards on, Off Day off (the prototype's ACT.openExport). */
const DEFAULT_SELECTION: ExportImagesSelection = {
  standings: true,
  awards: true,
  includeOffDay: false,
}

/**
 * Q-EXPORT: the Download images sheet over the private snapshot. Format and selection are local
 * state, reset on every open; the frames come from buildExportFrames, so Standings + Awards never
 * yields an Off Day frame. Downloading stays disabled in the mock phase (no image generation yet).
 */
export function ExportImagesSheetContainer({
  sessionId,
  open,
  onOpenChange,
}: ExportImagesSheetContainerProps) {
  const club = useClub(DEMO_CLUB_ID)
  const results = useSessionResults(sessionId)
  const [format, setFormat] = useState<ExportImagesFormat>('story')
  const [selection, setSelection] = useState<ExportImagesSelection>(DEFAULT_SELECTION)

  useEffect(() => {
    if (open) {
      setFormat('story')
      setSelection(DEFAULT_SELECTION)
    }
  }, [open])

  const snapshot = results.data
  if (!snapshot) return null

  const slides: PublishedSlide[] = [
    ...(selection.standings ? (['standings'] as const) : []),
    ...(selection.awards ? (['awards'] as const) : []),
  ]
  const frames = buildExportFrames(
    snapshot,
    { slides, includeOffDay: selection.includeOffDay },
    format,
  )

  return (
    <ExportImagesSheet
      open={open}
      onOpenChange={onOpenChange}
      format={format}
      selection={selection}
      frames={frames}
      clubName={club.data?.name ?? ''}
      onFormatChange={setFormat}
      onSelectionChange={setSelection}
      onDownload={() => {}}
      downloadEnabled={false}
    />
  )
}
