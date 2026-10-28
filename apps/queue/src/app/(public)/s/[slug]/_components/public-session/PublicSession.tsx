'use client'

import type { MyJoinRequest, PublicSessionPage } from '@rotra/data/public-session/types'
import { useMyJoinRequest } from '@rotra/data/public-session/useMyJoinRequest'
import { usePublicSession } from '@rotra/data/public-session/usePublicSession'
import { JoinRequestCard, type JoinRequestCardProps } from '@rotra/ui/join-request-card'
import { PublicParticipants } from '@rotra/ui/public-participants'
import {
  PublicResultsSection,
  type PublicResultsSectionPublished,
} from '@rotra/ui/public-results-section'
import { PublicSessionDetails } from '@rotra/ui/public-session-details'
import { PublicSessionHero } from '@rotra/ui/public-session-hero'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { useState } from 'react'
import { JoinRequestSheet } from '@/app/(public)/s/[slug]/_components/join-request-sheet/JoinRequestSheet'

export type PublicSessionProps = {
  slug: string
  /**
   * visitor: the guest's own browser (/s/[slug]); operator: the preview inside the Queue app.
   * Only the visitor's reads depend on the visitor's connection.
   */
  viewer: 'visitor' | 'operator'
}

const MODES = {
  chill: { label: 'Chill', text: 'Aims for roughly 30% easy games per player.' },
  fair: { label: 'Fair', text: 'Mainly level-matched games, roughly 10% easy games.' },
  hard: { label: 'Hard', text: 'Demanding runs, including 2–3 consecutive games.' },
} as const

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
/** The prototype's fmtDate: "Sun, Oct 26" */
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
/** The prototype's fmtDur: "3 h" or "2 h 30 min" */
const duration = (start: number, end: number) => {
  let m = Math.round((end - start) / 60_000)
  if (m <= 0) m += 1440
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`
}

const HERO_STATE = {
  prepared: 'upcoming',
  active: 'live',
  completed: 'finished',
  // An invalid session's hero carries no status chip.
  invalid: 'upcoming',
} as const

/** The join card variant: this visitor's own request first, then requests off, open or full. */
function joinCardProps(
  page: PublicSessionPage,
  mine: MyJoinRequest | null | undefined,
  onRequestToJoin: () => void,
): JoinRequestCardProps | null {
  if (page.status !== 'prepared' && page.status !== 'active') return null
  if (mine) {
    if (mine.status === 'pending') return { variant: 'sent', name: mine.name }
    if (mine.status === 'declined') return { variant: 'declined' }
    return mine.waitlistPosition
      ? { variant: 'confirmed-waitlist', waitlistPosition: mine.waitlistPosition }
      : { variant: 'confirmed-slot' }
  }
  if (!page.acceptJoinRequests) return { variant: 'off' }
  return page.openSlots > 0
    ? { variant: 'open', openSlots: page.openSlots, capacity: page.slotBudget, onRequestToJoin }
    : { variant: 'full', onRequestToJoin }
}

/** The published slides as slide props; Off Day only when the publication included it. */
function publishedSlides(page: PublicSessionPage): PublicResultsSectionPublished | null {
  if (!page.results) return null
  const frame = {
    club: page.club,
    sessionLine: `${page.title} · ${date(page.start)}`,
    venue: page.venue.name,
  }
  const { standings, awards, offDay } = page.results
  return {
    standings: standings ? { ...frame, rows: standings } : undefined,
    awards: awards
      ? {
          ...frame,
          mvp: awards.mvp,
          mostImproved: awards.mostImproved,
          showFormulaNote: true,
        }
      : undefined,
    offDay: offDay ? { ...frame, rows: offDay } : undefined,
  }
}

/**
 * Q-PUBLIC-DETAILS / PARTICIPANTS / RESULTS / JOIN: the public session page from
 * usePublicSession. PublicSessionHero; the JoinRequestCard on prepared and active sessions (its
 * variant from the page and useMyJoinRequest); Details and "Participants · N" tabs; and, for
 * completed sessions only, the Results section with the published slides. No operator controls.
 */
export function PublicSession({ slug, viewer }: PublicSessionProps) {
  const page = usePublicSession(slug, { visitor: viewer === 'visitor' })
  const mine = useMyJoinRequest(slug)
  const [tab, setTab] = useState('details')
  const [joinOpen, setJoinOpen] = useState(false)

  const p = page.data
  if (!p) return null

  const mode = MODES[p.mode]
  const card = joinCardProps(p, mine.data, () => setJoinOpen(true))
  const participants = p.participants.map((x, i) => ({
    id: String(i),
    name: x.name,
    pictureUrl: x.pictureUrl,
    hasProfile: x.hasRotraProfile,
  }))

  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
      <PublicSessionHero
        dateLine={`${date(p.start)} · ${time(p.start)}–${time(p.end)}`}
        title={p.title}
        clubName={p.club.name}
        clubInitials={p.club.initials}
        clubLogoUrl={p.club.logoUrl}
        state={HERO_STATE[p.status]}
      />
      {card ? <JoinRequestCard {...card} /> : null}
      <Tabs
        aria-label="Session page"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'details', label: 'Details' },
          { value: 'participants', label: `Participants · ${p.participants.length}` },
        ]}
      >
        <TabsContent value="details">
          <PublicSessionDetails
            when={`${date(p.start)}, ${time(p.start)}–${time(p.end)} (${duration(p.start, p.end)})`}
            venueName={p.venue.name}
            venueAddress={p.venue.address}
            courtLabels={p.courts}
            formats={p.formats}
            modeLabel={mode.label}
            modeDescription={mode.text}
            minimumGames={p.minimum}
            notes={p.notes}
            lastUpdatedLabel={time(p.lastSyncedAt)}
            hasPendingChanges={p.hasPendingChanges}
          />
        </TabsContent>
        <TabsContent value="participants">
          <PublicParticipants
            participants={participants}
            waitlist={p.waitlist.map((name, i) => ({ id: String(i), name }))}
          />
        </TabsContent>
      </Tabs>
      {p.status === 'completed' ? <PublicResultsSection published={publishedSlides(p)} /> : null}
      <JoinRequestSheet
        slug={slug}
        sessionLine={`${p.title} · ${date(p.start)}, ${time(p.start)} · ${p.venue.name}`}
        open={joinOpen}
        onOpenChange={setJoinOpen}
      />
    </main>
  )
}
