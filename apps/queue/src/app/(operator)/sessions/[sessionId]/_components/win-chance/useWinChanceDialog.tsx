'use client'

import { queueMasterName } from '@rotra/data/match/match.rules'
import type { Match, MatchLineup } from '@rotra/data/match/types'
import { winChanceBreakdown } from '@rotra/data/match/win-chance'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { WinChanceDialog, type WinChanceDialogPlayer } from '@rotra/ui/win-chance-dialog'
import { type ReactNode, useState } from 'react'
import { useClubPlayerPictures } from '@/lib/useClubPlayerPictures'

/** One lineup to explain: a match, a draft or the lineup shown in a sheet */
export type WinChanceLineup = MatchLineup & Partial<Pick<Match, 'state' | 'decision'>>

/** A lineup, or a getter read again on every render with the current matches, so the dialog follows live data */
export type WinChanceSource =
  | WinChanceLineup
  | ((matches: readonly Match[]) => WinChanceLineup | null | undefined)

export type UseWinChanceDialog = {
  /** Opens the dialog on this lineup (a getter keeps it current while open) */
  open: (source: WinChanceSource) => void
  /** Render once, after any sheet: it stacks over whatever is open and closing leaves that as is */
  dialog: ReactNode
}

/**
 * The win chance explanation dialog for the Queue console (Queue Master only). `open` takes the
 * lineup; the breakdown is recomputed from the current roster and matches on every render while
 * open, and the dialog closes itself if a getter source stops returning a lineup. Faces use the
 * same name (nameSnapshot), short name (queueMasterName unless `shortNameOf` says otherwise) and
 * picture as the cards.
 */
export function useWinChanceDialog(
  roster: readonly SessionPlayer[] | undefined,
  matches: readonly Match[] | undefined,
  /** The short name the surrounding cards use; defaults to queueMasterName */
  shortNameOf: (player: SessionPlayer) => string = queueMasterName,
): UseWinChanceDialog {
  const [source, setSource] = useState<{ read: WinChanceSource } | null>(null)
  const { pictureOf } = useClubPlayerPictures()

  const lineup =
    source && matches
      ? typeof source.read === 'function'
        ? source.read(matches)
        : source.read
      : null
  const breakdown = lineup && roster && matches ? winChanceBreakdown(lineup, roster, matches) : null

  const players: Record<string, WinChanceDialogPlayer> = {}
  for (const id of lineup ? [...lineup.teamA, ...lineup.teamB] : []) {
    const p = roster?.find((x) => x.id === id)
    if (p)
      players[id] = {
        name: p.nameSnapshot,
        shortName: shortNameOf(p),
        photoUrl: pictureOf(p.clubPlayerId),
      }
  }

  return {
    // Wrapped so a getter is stored, not called, by the state setter
    open: (next) => setSource({ read: next }),
    dialog: (
      <WinChanceDialog
        open={source !== null}
        onClose={() => setSource(null)}
        breakdown={breakdown}
        players={players}
      />
    ),
  }
}
