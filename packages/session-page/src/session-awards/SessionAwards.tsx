'use client'

import type { PublicAwardWinner, PublicSessionResults } from '@rotra/data/public-session/types'
import { AwardShareCard, type AwardShareEntry } from '@rotra/ui/award-share-card'
import { type PublicAwardEntry, PublicAwards } from '@rotra/ui/public-awards'
import { ShareDialog } from '@rotra/ui/share-dialog'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

export type SessionAwardsProps = {
  results: PublicSessionResults
  sessionTitle: string
  /** “Thu, Oct 23” */
  dateLabel: string
  club: { name: string; initials: string; logoUrl?: string | null }
  /** The visitor link of this session (`/s/<slug>`), the Session link in every share */
  link: string
  /** A face was tapped: its index in the signed-in read's participants */
  onOpenParticipant?: (index: number) => void
}

const MVP_WHY = 'Won more than expected for their level, partners and opponents.'
const improvedWhy = (n: number) => `Played above their last ${n} sessions at this club.`
const offDayWhy = (n: number) => `Below their usual results across their last ${n} club sessions.`

type Sharing =
  | { kind: 'award'; entry: AwardShareEntry; reason: string }
  | { kind: 'set'; set: 'awards' | 'off-day' }

/**
 * Finished session page › Details › Awards (2026-11-13-queue-awards-faces-share): PublicAwards from
 * the publication (names and faces already masked by the page rule), each card's Share, Share
 * awards and Share Off Day, all in the standard ShareDialog (AwardShareCard) with the Session link.
 */
export function SessionAwards({
  results,
  sessionTitle,
  dateLabel,
  club,
  link,
  onOpenParticipant,
}: SessionAwardsProps) {
  const [sharing, setSharing] = useState<Sharing | null>(null)
  const awards = results.awards
  const shareEntry = (award: string, winner: PublicAwardWinner): AwardShareEntry => ({
    award,
    name: winner.name,
    pictureUrl: winner.pictureUrl,
    standing: winner.standing,
  })
  const card = (
    id: string,
    award: string,
    winner: PublicAwardWinner,
    reason: string,
  ): PublicAwardEntry => ({
    id,
    name: winner.name,
    pictureUrl: winner.pictureUrl,
    standing: winner.standing,
    reason,
    onOpenFace:
      onOpenParticipant && winner.participant !== undefined
        ? () => onOpenParticipant(winner.participant as number)
        : undefined,
    onShare: () => setSharing({ kind: 'award', entry: shareEntry(award, winner), reason }),
  })
  const offDay = results.offDay ?? null
  const setEntries =
    sharing?.kind === 'set'
      ? sharing.set === 'off-day'
        ? (offDay ?? []).map((x) => shareEntry('Off Day', x))
        : [
            awards?.mvp ? shareEntry('MVP', awards.mvp) : null,
            awards?.mostImproved ? shareEntry('Most Improved', awards.mostImproved) : null,
          ].filter((x): x is AwardShareEntry => x !== null)
      : []
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast('Link copied')
    } catch {
      toast.error("Couldn't copy the link. Copy it from the field.")
    }
  }
  const common = {
    sessionTitle,
    dateLabel,
    club,
    link,
    onCopy: () => void copyLink(),
    onError: (message: string) => toast.error(message),
    onDownloaded: (item: { label: string }) => toast(`${item.label} image downloaded`),
  }
  return (
    <>
      <PublicAwards
        awardsShared={!!awards}
        mvp={awards?.mvp ? card('mvp', 'MVP', awards.mvp, MVP_WHY) : null}
        mostImproved={
          awards?.mostImproved
            ? card(
                'most-improved',
                'Most Improved',
                awards.mostImproved,
                improvedWhy(awards.mostImproved.priorSessions),
              )
            : null
        }
        offDay={
          offDay
            ? offDay.map((x, i) => card(`off-${i}`, 'Off Day', x, offDayWhy(x.priorSessions)))
            : null
        }
        onShareAwards={() => setSharing({ kind: 'set', set: 'awards' })}
        onShareOffDay={() => setSharing({ kind: 'set', set: 'off-day' })}
      />
      <ShareDialog
        open={sharing !== null}
        onOpenChange={(open) => {
          if (!open) setSharing(null)
        }}
        title={
          sharing?.kind === 'award'
            ? `Share ${sharing.entry.award}`
            : sharing?.set === 'off-day'
              ? 'Share Off Day'
              : 'Share awards'
        }
      >
        {sharing?.kind === 'award' ? (
          <AwardShareCard {...common} kind="award" entry={sharing.entry} reason={sharing.reason} />
        ) : sharing ? (
          <AwardShareCard {...common} kind="set" set={sharing.set} entries={setEntries} />
        ) : null}
      </ShareDialog>
    </>
  )
}
