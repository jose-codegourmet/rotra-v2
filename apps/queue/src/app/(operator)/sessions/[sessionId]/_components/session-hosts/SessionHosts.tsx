'use client'

import { savedPlayerName } from '@rotra/data/club-player/clubNickname-rules'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { openSlots, slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useAddSessionHost } from '@rotra/data/session-host/useAddSessionHost'
import { useRemoveSessionHost } from '@rotra/data/session-host/useRemoveSessionHost'
import { useSessionHosts } from '@rotra/data/session-host/useSessionHosts'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { useAddTrustedHost } from '@rotra/data/trusted-host/useAddTrustedHost'
import { useTrustedHosts } from '@rotra/data/trusted-host/useTrustedHosts'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { SessionHostsCard } from '@rotra/ui/session-hosts-card'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Session management › Hosts (#1005): wires the Hosts card of Q-PREPARE (before and during the
 * session) to the session's hosts, the club's trusted hosts and saved players. Adding a host
 * registers them as a player unless they are already in; a non-trusted saved player is added to the
 * trusted-host list after the picker's confirmation, then to the session. Removing a host ends the
 * designation only. Club credentials and queue management only: no role, no sign-in.
 */
export function SessionHosts({ sessionId }: { sessionId: string }) {
  const clubId = useAppSelector(selectAccount)?.id ?? DEMO_CLUB_ID
  const session = useQueueSession(sessionId)
  const hosts = useSessionHosts(sessionId)
  const trustedHosts = useTrustedHosts(clubId)
  const clubPlayers = useClubPlayers()
  const roster = useSessionRoster(sessionId)
  const addTrustedHost = useAddTrustedHost()
  const addHost = useAddSessionHost()
  const removeHost = useRemoveSessionHost()

  const failed = [hosts, trustedHosts, clubPlayers, roster].find((q) => q.isError)
  if (failed) return <QueryError query={failed} title="Couldn't load this session's hosts." />
  const s = session.data
  if (!s || !hosts.data || !trustedHosts.data || !clubPlayers.data || !roster.data)
    return <Skeleton className="h-40 rounded-lg" />

  const saved = clubPlayers.data.players
  const hostIds = hosts.data.map((h) => h.clubPlayerId)
  const trustedOrder = trustedHosts.data.map((h) => h.clubPlayerId)
  const rosterIds = new Set(roster.data.roster.map((r) => r.clubPlayerId))
  const waitIds = new Set(roster.data.waitlist.map((w) => w.clubPlayerId))
  const photo = (p: (typeof saved)[number]) =>
    profilePictureSrc(p.picture, p.playerId ?? p.id, p.pictureName ?? p.fullName)
  const rows = hostIds.flatMap((id) => {
    const p = saved.find((x) => x.id === id)
    return p
      ? [
          {
            clubPlayerId: id,
            name: p.fullName,
            photoUrl: photo(p),
            registration: rosterIds.has(id)
              ? ('slot' as const)
              : waitIds.has(id)
                ? ('waitlist' as const)
                : null,
          },
        ]
      : []
  })
  const candidates = saved
    .filter((p) => !hostIds.includes(p.id))
    .map((p) => ({
      clubPlayerId: p.id,
      name: p.fullName,
      nickname: p.nickname,
      clubNickname: p.clubNickname,
      shortName: savedPlayerName(p),
      photoUrl: photo(p),
      identity: p.identity,
      detailsRequired: p.detailsRequired,
      trusted: trustedOrder.includes(p.id),
    }))
    .sort((a, b) =>
      a.trusted && b.trusted
        ? trustedOrder.indexOf(a.clubPlayerId) - trustedOrder.indexOf(b.clubPlayerId)
        : a.trusted !== b.trusted
          ? a.trusted
            ? -1
            : 1
          : a.name.localeCompare(b.name),
    )
  const capacity = slotCapacity(s.courts.length, s.playersPerCourt)

  const add = (clubPlayerId: string) =>
    addHost.mutateAsync({ sessionId, clubPlayerId }).then(
      (result) => toast(result.message),
      (error: unknown) => toast.error(errorMessage(error)),
    )
  // The confirmation said it permanently adds them to the trusted hosts: trust first, then host.
  const addNew = (clubPlayerId: string) =>
    addTrustedHost.mutateAsync({ clubPlayerId }).then(
      () => add(clubPlayerId),
      (error: unknown) => toast.error(errorMessage(error)),
    )

  return (
    <SessionHostsCard
      hosts={rows}
      candidates={candidates}
      openSlots={openSlots(capacity, roster.data.roster.length)}
      live={s.state === 'active'}
      isPending={addHost.isPending || addTrustedHost.isPending || removeHost.isPending}
      onAdd={(clubPlayerId) => void add(clubPlayerId)}
      onAddNew={(clubPlayerId) => void addNew(clubPlayerId)}
      onRemove={(clubPlayerId) =>
        removeHost.mutate(
          { sessionId, clubPlayerId },
          {
            onSuccess: (result) => toast(result.message),
            onError: (error) => toast.error(errorMessage(error)),
          },
        )
      }
    />
  )
}
