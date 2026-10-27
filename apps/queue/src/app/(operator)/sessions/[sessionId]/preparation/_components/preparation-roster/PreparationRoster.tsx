'use client'

import { registeredCity } from '@rotra/data/club-player/fetchers'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useFillOpenSlots } from '@rotra/data/session-roster/useFillOpenSlots'
import { useGiveSlot } from '@rotra/data/session-roster/useGiveSlot'
import { useRemoveFromWaitlist } from '@rotra/data/session-roster/useRemoveFromWaitlist'
import { useRemoveRosterPlayer } from '@rotra/data/session-roster/useRemoveRosterPlayer'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { useSetAllPresence } from '@rotra/data/session-roster/useSetAllPresence'
import { useSetPresence } from '@rotra/data/session-roster/useSetPresence'
import { useSetRosterLevel } from '@rotra/data/session-roster/useSetRosterLevel'
import { PlayerProfileSheet } from '@rotra/ui/player-profile-sheet'
import { RosterPanel, type RosterPanelPlayer } from '@rotra/ui/roster-panel'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { WaitlistPanel, type WaitlistPanelEntry } from '@rotra/ui/waitlist-panel'
import { useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { AddPlayer } from '@/app/(operator)/sessions/[sessionId]/_components/add-player/AddPlayer'
import { longDateLabel } from '@/lib/dates'

export type PreparationRosterProps = {
  sessionId: string
  /** Which preparation tab this instance fills */
  tab: 'roster' | 'waitlist'
}

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Q-ROSTER in preparation: the Roster and levels tab (RosterPanel) or the Waitlist tab
 * (WaitlistPanel) on useSessionRoster and the roster mutations. Level changes save immediately;
 * removing is immediate with its toast and no dialog. Pictures open PlayerProfileSheet; Add player
 * opens the shared AddPlayer container.
 */
export function PreparationRoster({ sessionId, tab }: PreparationRosterProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const clubPlayers = useClubPlayers()
  const setLevel = useSetRosterLevel()
  const setPresence = useSetPresence()
  const setAllPresence = useSetAllPresence()
  const remove = useRemoveRosterPlayer()
  const giveSlot = useGiveSlot()
  const fillOpenSlots = useFillOpenSlots()
  const removeFromWaitlist = useRemoveFromWaitlist()
  const [addOpen, setAddOpen] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)

  const options = {
    onSuccess: (result: { message: string }) => toast(result.message),
    onError: (error: unknown) => toast.error(errorMessage(error)),
  }

  const s = session.data
  const byClubPlayer = (id: string) => clubPlayers.data?.players.find((p) => p.id === id)
  const rosterList = roster.data?.roster ?? []
  const waitlist = roster.data?.waitlist ?? []
  const capacity = s ? slotCapacity(s.courts.length, s.playersPerCourt) : 0

  const players: RosterPanelPlayer[] = rosterList.map((r) => {
    const p = byClubPlayer(r.clubPlayerId)
    return {
      id: r.id,
      name: r.nameSnapshot,
      identity: p?.identity ?? 'guest',
      suggestion: p?.suggestion ?? null,
      level: r.level,
      present: r.present,
    }
  })
  const entries: WaitlistPanelEntry[] = waitlist.map((w) => {
    const p = byClubPlayer(w.clubPlayerId)
    return {
      id: w.id,
      name: p?.fullName ?? '…',
      level: w.level,
      waitingSinceLabel: time(w.addedAt),
    }
  })
  const profile = profileId ? byClubPlayer(profileId) : undefined
  const openProfileFromRoster = (rosterId: string) => {
    const r = rosterList.find((r) => r.id === rosterId)
    if (r) setProfileId(r.clubPlayerId)
  }
  const openProfileFromWaitlist = (waitlistId: string) => {
    const w = waitlist.find((w) => w.id === waitlistId)
    if (w) setProfileId(w.clubPlayerId)
  }

  if (session.isError || roster.isError)
    return (
      <QueryError
        query={session.isError ? session : roster}
        title={session.isError ? "Couldn't load this session." : "Couldn't load the roster."}
      />
    )
  if (!s || !roster.data) return <Skeleton className="h-56 rounded-lg" />

  return (
    <>
      {tab === 'roster' ? (
        <RosterPanel
          players={players}
          capacity={capacity}
          waitlistCount={waitlist.length}
          levelsLocked={s.state !== 'prepared'}
          onMarkAllPresent={() => setAllPresence.mutate({ sessionId, present: true }, options)}
          onMarkAllAbsent={() => setAllPresence.mutate({ sessionId, present: false }, options)}
          onAddPlayer={() => setAddOpen(true)}
          onOpenProfile={openProfileFromRoster}
          onLevelChange={(rosterId, level) =>
            setLevel.mutate({ sessionId, rosterId, level }, options)
          }
          onPresentChange={(rosterId, present) =>
            setPresence.mutate({ sessionId, rosterId, present }, options)
          }
          onRemove={(rosterId) => remove.mutate({ sessionId, rosterId }, options)}
        />
      ) : (
        <WaitlistPanel
          entries={entries}
          rosterCount={rosterList.length}
          courtCount={s.courts.length}
          playersPerCourt={s.playersPerCourt}
          onFillOpenSlots={() => fillOpenSlots.mutate(sessionId, options)}
          onGiveSlot={(waitlistId) => giveSlot.mutate({ sessionId, waitlistId }, options)}
          onRemove={(waitlistId) => removeFromWaitlist.mutate({ sessionId, waitlistId }, options)}
          onOpenProfile={openProfileFromWaitlist}
        />
      )}
      <AddPlayer sessionId={sessionId} open={addOpen} onOpenChange={setAddOpen} />
      {profile ? (
        <PlayerProfileSheet
          open={profileId !== null}
          onOpenChange={(open) => {
            if (!open) setProfileId(null)
          }}
          name={profile.fullName}
          identity={profile.identity}
          nickname={profile.nickname}
          level={profile.suggestion}
          registeredCity={registeredCity(profile.rtrId)}
          rtrId={profile.rtrId}
          addedLabel={longDateLabel(profile.addedAt)}
          sessionsHere={profile.sessionsHere}
          phoneHidden={profile.phoneHidden}
        />
      ) : null}
    </>
  )
}
