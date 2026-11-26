'use client'

import { useClub } from '@rotra/data/club'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { buildExportFrames } from '@rotra/data/session-result/sessionResult.rules'
import type { PublishedSlide } from '@rotra/data/session-result/types'
import { useSessionResults } from '@rotra/data/session-result/useSessionResults'
import { AwardsSlide } from '@rotra/ui/awards-slide'
import {
  type ExportImagesFormat,
  type ExportImagesPreview,
  type ExportImagesSelection,
  ExportImagesSheet,
} from '@rotra/ui/export-images-sheet'
import { OffDaySlide } from '@rotra/ui/off-day-slide'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { StandingsSlide } from '@rotra/ui/standings-slide'
import { useEffect, useState } from 'react'

export type ExportImagesSheetContainerProps = {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The prototype's fmtDate: "Thu, Oct 23" */
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/** Every open starts here: Story, Standings and Awards on, Off Day off (the prototype's ACT.openExport). */
const DEFAULT_SELECTION: ExportImagesSelection = {
  standings: true,
  awards: true,
  includeOffDay: false,
}

/**
 * Q-EXPORT: the Download images sheet over the private snapshot (useSessionResults), drawn with the
 * same club frame and player pictures as the Results tabs; renders nothing until those load. Format and selection are local
 * state, reset on every open; buildExportFrames decides the images (standings pages that never
 * split a position, Awards, and Off Day only when chosen), and each preview is the slide that
 * image downloads as. Downloading stays disabled until image generation exists.
 */
export function ExportImagesSheetContainer({
  sessionId,
  open,
  onOpenChange,
}: ExportImagesSheetContainerProps) {
  const results = useSessionResults(sessionId)
  const session = useQueueSession(sessionId)
  const club = useClub(DEMO_CLUB_ID)
  const clubPlayers = useClubPlayers()
  const [format, setFormat] = useState<ExportImagesFormat>('story')
  const [selection, setSelection] = useState<ExportImagesSelection>(DEFAULT_SELECTION)

  useEffect(() => {
    if (open) {
      setFormat('story')
      setSelection(DEFAULT_SELECTION)
    }
  }, [open])

  const snapshot = results.data
  const s = session.data
  const c = club.data
  if (!snapshot || !s || !c) return null
  const frame = {
    club: { name: c.name, initials: c.initials, logoUrl: c.logoUrl },
    sessionLine: `${s.title} · ${date(s.scheduledStartAt)}`,
    venue: s.venueName,
  }
  /** The saved player's own picture (or character), as the Results tabs draw it */
  const pictureOf = (clubPlayerId: string) => {
    const p = clubPlayers.data?.players.find((x) => x.id === clubPlayerId)
    return p
      ? (profilePictureSrc(p.picture, p.playerId ?? p.id, p.pictureName ?? p.fullName) ?? null)
      : null
  }
  const slides: PublishedSlide[] = [
    ...(selection.standings ? (['standings'] as const) : []),
    ...(selection.awards ? (['awards'] as const) : []),
  ]
  const winner = (row: { name: string; clubPlayerId: string }) => ({
    name: row.name,
    pictureUrl: pictureOf(row.clubPlayerId),
  })
  const { mvp, mostImproved, offDay } = snapshot.awards
  const previews: ExportImagesPreview[] = buildExportFrames(
    snapshot,
    { slides, includeOffDay: selection.includeOffDay },
    format,
  ).map((image) => {
    if (image.kind === 'standings')
      return {
        key: `standings-${image.page}`,
        label: image.title,
        image: (
          <StandingsSlide
            {...frame}
            page={{ n: image.page, of: image.pages }}
            rows={image.rows.map((row) => ({ ...row, pictureUrl: pictureOf(row.clubPlayerId) }))}
          />
        ),
      }
    if (image.kind === 'awards')
      return {
        key: 'awards',
        label: image.title,
        image: (
          <AwardsSlide
            {...frame}
            mvp={mvp ? winner(mvp) : null}
            mostImproved={
              mostImproved
                ? { ...winner(mostImproved), priorSessions: mostImproved.priorSessions }
                : null
            }
            showFormulaNote={snapshot.calculationVersion === 'prototype-reference'}
          />
        ),
      }
    return {
      key: 'off-day',
      label: image.title,
      image: (
        <OffDaySlide
          {...frame}
          variant="public"
          rows={offDay.map((x) => ({ name: x.name, priorSessions: x.priorSessions }))}
        />
      ),
    }
  })

  return (
    <ExportImagesSheet
      open={open}
      onOpenChange={onOpenChange}
      format={format}
      selection={selection}
      previews={previews}
      onFormatChange={setFormat}
      onSelectionChange={setSelection}
      onDownload={() => {}}
      downloadEnabled={false}
    />
  )
}
