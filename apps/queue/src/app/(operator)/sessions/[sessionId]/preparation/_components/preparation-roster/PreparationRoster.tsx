'use client'

import { registeredCity } from '@rotra/data/club-player/fetchers'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionPayments } from '@rotra/data/session-payment/useSessionPayments'
import { useFillOpenSlots } from '@rotra/data/session-roster/useFillOpenSlots'
import { useGiveSlot } from '@rotra/data/session-roster/useGiveSlot'
import { useRemoveFromWaitlist } from '@rotra/data/session-roster/useRemoveFromWaitlist'
import { useRemoveRosterPlayer } from '@rotra/data/session-roster/useRemoveRosterPlayer'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { useSetAllPresence } from '@rotra/data/session-roster/useSetAllPresence'
import { useSetPresenceMany } from '@rotra/data/session-roster/useSetPresenceMany'
import { useSetRosterLevel } from '@rotra/data/session-roster/useSetRosterLevel'
import { PlayerProfileSheet } from '@rotra/ui/player-profile-sheet'
import {
  type RosterGroupBy,
  type RosterLevelTab,
  RosterPanel,
  type RosterPanelPlayer,
  type RosterView,
} from '@rotra/ui/roster-panel'
import { toast } from '@rotra/ui/toaster'
import { WaitlistPanel, type WaitlistPanelEntry } from '@rotra/ui/waitlist-panel'
import { useEffect, useRef, useState } from 'react'
import { AddPlayer } from '@/app/(operator)/_components/add-player/AddPlayer'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { longDateLabel } from '@/lib/dates'

export type PreparationRosterProps = {
  sessionId: string
  /** Which preparation tab this instance fills */
  tab: 'roster' | 'waitlist'
}

const VIEWS_STORAGE_KEY = 'rotra-queue-roster-views'
const LEVEL_TABS: RosterLevelTab[] = ['all', 'advanced', 'intermediate', 'beginner', 'none']
const GROUP_BYS: RosterGroupBy[] = ['none', 'skill', 'avail', 'prior', 'profile', 'paid']
const VIEWS: RosterView[] = ['list', 'grid']

type RosterViews = { tab: RosterLevelTab; groupBy: RosterGroupBy; view: RosterView }
const DEFAULT_VIEWS: RosterViews = { tab: 'all', groupBy: 'none', view: 'list' }

/** Level tab, Group by and List | Grid are remembered on this device; storage may be unavailable. */
function readViews(): RosterViews {
  try {
    const saved = JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY) ?? 'null')
    return {
      tab: LEVEL_TABS.includes(saved?.tab) ? saved.tab : DEFAULT_VIEWS.tab,
      groupBy: GROUP_BYS.includes(saved?.groupBy) ? saved.groupBy : DEFAULT_VIEWS.groupBy,
      view: VIEWS.includes(saved?.view) ? saved.view : DEFAULT_VIEWS.view,
    }
  } catch {
    return DEFAULT_VIEWS
  }
}

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Q-ROSTER in preparation: the Roster and levels tab (RosterPanel) or the Waitlist tab
 * (WaitlistPanel) on useSessionRoster and the roster mutations. Level changes save immediately;
 * removing is immediate with its toast and no dialog. Pictures open PlayerProfileSheet; Add player
 * opens the shared AddPlayer container. While the session or roster loads the panels show Skeleton
 * rows; every mutation toasts its result (offline adds say "Saved on this device, waiting to sync")
 * or its error, and a refused change leaves the roster as it was.
 */
export function PreparationRoster({ sessionId, tab }: PreparationRosterProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const clubPlayers = useClubPlayers()
  const setLevel = useSetRosterLevel()
  const setPresence = useSetPresenceMany(sessionId, {
    onSuccess: (result) => toast(result.message),
    onError: (error) => toast.error(errorMessage(error)),
  })
  const setAllPresence = useSetAllPresence()
  const remove = useRemoveRosterPlayer()
  const removing = useRef(new Set<string>())
  const giveSlot = useGiveSlot()
  const fillOpenSlots = useFillOpenSlots()
  const removeFromWaitlist = useRemoveFromWaitlist()
  const payments = useSessionPayments(sessionId)
  const [views, setViews] = useState<RosterViews>(DEFAULT_VIEWS)
  useEffect(() => setViews(readViews()), [])
  const updateViews = (patch: Partial<RosterViews>) => {
    const next = { ...views, ...patch }
    setViews(next)
    try {
      localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }
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

  const paidByClubPlayer = new Map(
    (payments.data?.players ?? []).map((p) => [p.clubPlayerId, p.paid != null] as const),
  )
  const players: RosterPanelPlayer[] = rosterList.map((r) => {
    const p = byClubPlayer(r.clubPlayerId)
    return {
      id: r.id,
      name: r.nameSnapshot,
      identity: p?.identity ?? 'guest',
      suggestion: p?.suggestion ?? null,
      level: r.level,
      present: r.present,
      presencePending: setPresence.pending.has(r.id),
      paid: paidByClubPlayer.get(r.clubPlayerId),
      returning: r.hasPlayedAtClubBefore,
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
  const loading = !s || !roster.data

  return (
    <>
      {tab === 'roster' ? (
        <RosterPanel
          loading={loading}
          players={players}
          capacity={capacity}
          waitlistCount={waitlist.length}
          levelTab={views.tab}
          onLevelTabChange={(tab) => updateViews({ tab })}
          groupBy={views.groupBy}
          onGroupByChange={(groupBy) => updateViews({ groupBy })}
          view={views.view}
          onViewChange={(view) => updateViews({ view })}
          levelsLocked={s ? s.state !== 'prepared' : false}
          readOnly={s?.state === 'active'}
          onMarkAllPresent={() => setAllPresence.mutate({ sessionId, present: true }, options)}
          onMarkAllAbsent={() => setAllPresence.mutate({ sessionId, present: false }, options)}
          onAddPlayer={() => {
            void setPresence.flush().then(() => setAddOpen(true))
          }}
          onOpenProfile={openProfileFromRoster}
          onLevelChange={(rosterId, level) =>
            setLevel.mutate({ sessionId, rosterId, level }, options)
          }
          onPresentChange={setPresence.set}
          onRemove={(rosterId) => {
            if (removing.current.has(rosterId)) return
            removing.current.add(rosterId)
            remove.mutate(
              { sessionId, rosterId },
              { ...options, onSettled: () => removing.current.delete(rosterId) },
            )
          }}
        />
      ) : (
        <WaitlistPanel
          loading={loading}
          isPending={giveSlot.isPending || fillOpenSlots.isPending || removeFromWaitlist.isPending}
          serverError={
            giveSlot.error || fillOpenSlots.error || removeFromWaitlist.error
              ? errorMessage(giveSlot.error ?? fillOpenSlots.error ?? removeFromWaitlist.error)
              : undefined
          }
          entries={entries}
          rosterCount={rosterList.length}
          courtCount={s?.courts.length ?? 0}
          playersPerCourt={s?.playersPerCourt ?? 0}
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
