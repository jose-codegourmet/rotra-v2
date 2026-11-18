'use client'

import { groupStandings } from '@rotra/data/match/match.rules'
import type { PublicStandingRow } from '@rotra/data/public-session/types'
import { LeaderboardShareCard } from '@rotra/ui/leaderboard-share-card'
import { SessionStandings } from '@rotra/ui/session-standings'
import { ShareDialog } from '@rotra/ui/share-dialog'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

export type SessionLeaderboardProps = {
  rows: PublicStandingRow[]
  /** The signed-in viewer (the Your position card); null for a visitor */
  viewer: { name: string; pictureUrl?: string | null } | null
  sessionTitle: string
  /** “Thu, Oct 23” */
  dateLabel: string
  club: { name: string; initials: string; logoUrl?: string | null }
  /** The visitor link of this session (`/s/<slug>`), for the share text and the Session link */
  link: string
  /** A face was tapped: its index in the signed-in read's participants */
  onOpenParticipant?: (index: number) => void
}

/** The system share sheet, or the clipboard where there is none. */
async function shareText(text: string, link: string) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text, url: link })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${link}`)
    toast('Copied to share')
  } catch {
    toast.error("Couldn't copy. Try again.")
  }
}

/**
 * Finished session page › Leaderboard tab (2026-11-13 finished session and share leaderboard
 * logs): SessionStandings from the published standings grouped into positions (players with the same
 * wins and losses share one row, 1, 1, 3), Your position › Share (the system share
 * sheet with “I finished #N of M at SESSION · CLUB (NW NL). Played on ROTRA.”, or copied), and
 * Share leaderboard (ShareDialog with LeaderboardShareCard, the viewer's row highlighted).
 */
export function SessionLeaderboard({
  rows,
  viewer,
  sessionTitle,
  dateLabel,
  club,
  link,
  onOpenParticipant,
}: SessionLeaderboardProps) {
  const [sharing, setSharing] = useState(false)
  const mine = rows.find((row) => row.isViewer)
  // One row per position (same wins and losses share it); every face opens its own profile.
  const boardRows = groupStandings(
    rows.map((row, i) => ({ ...row, key: String(i) })),
    (row) => ({
      id: row.key,
      name: row.name,
      pictureUrl: row.pictureUrl,
      isViewer: row.isViewer,
      onOpen:
        onOpenParticipant && row.participant !== undefined
          ? () => onOpenParticipant(row.participant as number)
          : undefined,
    }),
  ).map((group) => ({ ...group, id: `position-${group.position}` }))
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast('Link copied')
    } catch {
      toast.error("Couldn't copy the link. Copy it from the field.")
    }
  }
  return (
    <>
      <SessionStandings
        viewer={viewer}
        rows={boardRows}
        onShareFinish={() => {
          if (!mine) return
          void shareText(
            `I finished #${mine.position} of ${rows.length} at ${sessionTitle} · ${club.name} (${mine.wins}W ${mine.losses}L). Played on ROTRA.`,
            link,
          )
        }}
        onShareLeaderboard={() => setSharing(true)}
      />
      <ShareDialog open={sharing} onOpenChange={setSharing} title="Share leaderboard">
        <LeaderboardShareCard
          rows={rows}
          sessionTitle={sessionTitle}
          dateLine={`${dateLabel} · ${club.name}`}
          club={club}
          link={link}
          onCopy={() => void copyLink()}
          onError={(message) => toast.error(message)}
          onDownloaded={(item) => toast(`${item.label} downloaded`)}
        />
      </ShareDialog>
    </>
  )
}
