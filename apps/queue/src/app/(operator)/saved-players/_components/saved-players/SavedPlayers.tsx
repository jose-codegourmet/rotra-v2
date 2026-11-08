'use client'

import { registeredCity } from '@rotra/data/club-player/fetchers'
import type { DeleteImpact } from '@rotra/data/club-player/types'
import { useClubPlayerDetails } from '@rotra/data/club-player/useClubPlayerDetails'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { useCreatePlayerInvite } from '@rotra/data/club-player/useCreatePlayerInvite'
import { useDeleteClubPlayer } from '@rotra/data/club-player/useDeleteClubPlayer'
import { useSavedPlayerStats } from '@rotra/data/club-player/useSavedPlayerStats'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useNowCard } from '@rotra/data/queue-session/useNowCard'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { AlphabetIndex } from '@rotra/ui/alphabet-index'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { DeletePlayerSheet } from '@rotra/ui/delete-player-sheet'
import { EmptyState } from '@rotra/ui/empty-state'
import { InviteSheet } from '@rotra/ui/invite-sheet'
import { LetterGroup, letterHeadingId } from '@rotra/ui/letter-group'
import { PageHeader } from '@rotra/ui/page-header'
import { PlayerProfileSheet } from '@rotra/ui/player-profile-sheet'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { SavedPlayerCard } from '@rotra/ui/saved-player-card'
import { SavedPlayerStatsCarousel } from '@rotra/ui/saved-player-stats-carousel'
import {
  DEFAULT_SAVED_PLAYERS_FILTERS,
  SavedPlayersFilterBar,
  type SavedPlayersFilters,
} from '@rotra/ui/saved-players-filter-bar'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { longDateLabel, shortDateLabel } from '@/lib/dates'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'
import { AddPlayer } from '../../../_components/add-player/AddPlayer'
import { QueryError } from '../../../_components/query-error/QueryError'
import { EditPlayerDetails } from '../edit-player-details/EditPlayerDetails'

type LiveState = { kind: 'playing' | 'waiting'; text: string }
type LiveStates = Record<string, LiveState>

const FILTER_KEYS = ['band', 'city', 'added', 'status', 'live'] as const

function readFilters(params: URLSearchParams): SavedPlayersFilters {
  const read = <K extends keyof SavedPlayersFilters>(key: K) =>
    (params.get(key) ?? DEFAULT_SAVED_PLAYERS_FILTERS[key]) as SavedPlayersFilters[K]
  return {
    search: params.get('q') ?? '',
    band: read('band'),
    city: read('city'),
    added: read('added'),
    status: read('status'),
    live: read('live'),
  }
}

function writeFilters(filters: SavedPlayersFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('q', filters.search)
  for (const key of FILTER_KEYS) {
    if (filters[key] !== DEFAULT_SAVED_PLAYERS_FILTERS[key]) params.set(key, filters[key])
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** Where each saved player is in the live session, from its roster, matches and courts. */
function LiveStates({
  sessionId,
  children,
}: {
  sessionId: string
  children: (states: LiveStates) => React.ReactNode
}) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const states: LiveStates = {}
  const courtLabel = (id: string) => session.data?.courts.find((c) => c.id === id)?.label ?? ''
  for (const entry of roster.data?.roster ?? []) {
    const match = matches.data?.find(
      (m) => m.state === 'active' && [...m.teamA, ...m.teamB].includes(entry.id),
    )
    if (match) {
      states[entry.clubPlayerId] = {
        kind: 'playing',
        text: `Playing · ${match.courtIds.map(courtLabel).filter(Boolean).join(' + ')}`,
      }
    } else if (entry.present) {
      states[entry.clubPlayerId] = { kind: 'waiting', text: 'At the session' }
    }
  }
  return children(states)
}

/** Q-SAVED-PLAYERS: search and filters in the URL, A–Z groups with an index rail, profile and invite dialogs. */
export function SavedPlayers() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const filters = readFilters(params)
  const offline = useAppSelector(selectDev).offline
  const nowCard = useNowCard()
  const live = nowCard.data?.live ?? null

  const stats = useSavedPlayerStats()
  const all = useClubPlayers()
  const list = useClubPlayers({
    search: filters.search || undefined,
    band: filters.band,
    city: filters.city,
    added: filters.added,
    account: filters.status,
    rightNow: filters.live,
  })

  const [profileId, setProfileId] = useState<string | null>(null)
  const [inviteId, setInviteId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  // D-DELETE-PLAYER, only when the player is in the Active Session
  const [deleting, setDeleting] = useState<{
    id: string
    name: string
    shortName: string
    impact: DeleteImpact
  } | null>(null)
  const del = useDeleteClubPlayer()
  const [adding, setAdding] = useState(false)
  const invite = useCreatePlayerInvite()

  const setFilters = (next: SavedPlayersFilters) =>
    router.replace(`${pathname}${writeFilters(next)}`, { scroll: false })
  const activeFilters = FILTER_KEYS.filter(
    (key) => filters[key] !== DEFAULT_SAVED_PLAYERS_FILTERS[key],
  ).length

  const players = list.data?.players ?? []
  const groups = list.data?.groups ?? {}
  const letters = Object.keys(groups).sort(
    (a, b) => Number(a === '#') - Number(b === '#') || a.localeCompare(b),
  )
  const cities = [
    ...new Set((all.data?.players ?? []).map((p) => registeredCity(p.rtrId)).filter(Boolean)),
  ].sort() as string[]
  const byId = (id: string | null) =>
    players.find((p) => p.id === id) ?? all.data?.players.find((p) => p.id === id)
  const profile = byId(profileId)
  const invitee = byId(inviteId)
  // Load Edit details while the profile is open, so choosing it swaps sheets with no blank gap.
  useClubPlayerDetails(
    profile && (profile.identity === 'guest' || profile.identity === 'unclaimed')
      ? profile.id
      : null,
  )

  const jump = (letter: string) => {
    const heading = document.getElementById(letterHeadingId(letter))
    if (!heading) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    heading.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    heading.focus({ preventScroll: true })
  }

  const openInvite = (id: string) => {
    setProfileId(null)
    setInviteId(id)
    if (!offline)
      invite.mutate(id, {
        onError: (error) => {
          setInviteId(null)
          toast.error(error.message)
        },
      })
  }
  const removePlayer = (id: string) =>
    del.remove.mutate(id, {
      onSuccess: (result) => {
        toast(`${result.name} deleted`)
        setDeleting(null)
        setProfileId(null)
      },
      onError: (error) => {
        if (!deleting) toast.error(error.message)
      },
    })
  /** Delete player: acts at once unless they're in the Active Session, which asks first. */
  const startDelete = (p: { id: string; fullName: string; nickname: string | null }) =>
    del.check.mutate(p.id, {
      onSuccess: (impact) => {
        if (!impact.activeSession) {
          removePlayer(p.id)
          return
        }
        del.remove.reset()
        setProfileId(null)
        setDeleting({
          id: p.id,
          name: p.fullName,
          shortName: p.nickname || p.fullName.split(' ')[0] || p.fullName,
          impact,
        })
      },
      onError: (error) => toast.error(error.message),
    })
  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      toast('Invite link copied')
    } catch {
      toast('Select the link and copy it')
    }
  }

  const render = (liveStates: LiveStates) => (
    <main className="flex flex-col gap-5 px-page pt-5 pb-[120px]">
      <Breadcrumb label="Home" href="/" linkAs={Link} />
      <PageHeader
        title="Saved players"
        description={
          all.data ? `${all.data.players.length} players this club has played with` : undefined
        }
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            Add player
          </Button>
        }
      />
      {stats.isError ? (
        <QueryError query={stats} title="Couldn't load saved player statistics." />
      ) : (
        <SavedPlayerStatsCarousel stats={stats.data} />
      )}
      <SavedPlayersFilterBar
        value={filters}
        onChange={setFilters}
        cities={cities}
        shownCount={players.length}
        totalCount={all.data?.players.length ?? 0}
        liveSessionTitle={live?.title ?? null}
      />
      {list.isError ? (
        <QueryError query={list} title="Couldn't load saved players." />
      ) : list.isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-[14px]" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <EmptyState
          title="No saved players match these filters."
          action={
            activeFilters || filters.search ? (
              <Button size="xs" onClick={() => setFilters(DEFAULT_SAVED_PLAYERS_FILTERS)}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="flex min-w-0 flex-col gap-5">
            {letters.map((letter) => (
              <LetterGroup key={letter} letter={letter} count={groups[letter]?.length ?? 0}>
                {(groups[letter] ?? []).map((p) => (
                  <SavedPlayerCard
                    key={p.id}
                    name={p.fullName}
                    photoUrl={profilePictureSrc(
                      p.picture,
                      p.playerId ?? p.id,
                      p.pictureName ?? p.fullName,
                    )}
                    nickname={p.nickname}
                    identity={p.identity}
                    level={p.suggestion}
                    live={liveStates[p.id]}
                    registeredCity={
                      registeredCity(p.rtrId) ??
                      (p.identity === 'pending' ? 'Lookup after sync' : null)
                    }
                    sessionsHere={p.sessionsHere}
                    addedLabel={shortDateLabel(p.addedAt)}
                    onOpenProfile={() => setProfileId(p.id)}
                    onInvite={
                      p.identity === 'guest' || p.identity === 'unclaimed'
                        ? () => openInvite(p.id)
                        : undefined
                    }
                  />
                ))}
              </LetterGroup>
            ))}
          </div>
          <AlphabetIndex available={letters} onJump={jump} />
        </div>
      )}
      {profile ? (
        <PlayerProfileSheet
          open={profileId !== null}
          onOpenChange={(open) => {
            if (!open) setProfileId(null)
          }}
          name={profile.fullName}
          photoUrl={profilePictureSrc(
            profile.picture,
            profile.playerId ?? profile.id,
            profile.pictureName ?? profile.fullName,
          )}
          identity={profile.identity}
          nickname={profile.nickname}
          level={profile.suggestion}
          registeredCity={registeredCity(profile.rtrId)}
          rtrId={profile.rtrId}
          addedLabel={longDateLabel(profile.addedAt)}
          sessionsHere={profile.sessionsHere}
          phoneHidden={profile.phoneHidden}
          onInvite={
            profile.identity === 'guest' || profile.identity === 'unclaimed'
              ? () => openInvite(profile.id)
              : undefined
          }
          onDelete={() => startDelete(profile)}
          deleting={del.check.isPending || (del.remove.isPending && !deleting)}
          onEdit={
            profile.identity === 'guest' || profile.identity === 'unclaimed'
              ? () => {
                  setProfileId(null)
                  setEditId(profile.id)
                }
              : undefined
          }
        />
      ) : null}
      {deleting?.impact.activeSession ? (
        <DeletePlayerSheet
          open
          onOpenChange={(open) => {
            if (!open && !del.remove.isPending) setDeleting(null)
          }}
          name={deleting.name}
          shortName={deleting.shortName}
          sessionTitle={deleting.impact.activeSession.title}
          waitingMatches={deleting.impact.activeSession.waitingMatches}
          busy={deleting.impact.busy}
          isPending={del.remove.isPending}
          error={del.remove.error?.message}
          onConfirm={() => removePlayer(deleting.id)}
        />
      ) : null}
      {editId ? (
        <EditPlayerDetails
          key={editId}
          clubPlayerId={editId}
          onClose={() => {
            setProfileId(editId)
            setEditId(null)
          }}
        />
      ) : null}
      {invitee && (invitee.identity === 'guest' || invitee.identity === 'unclaimed') ? (
        <InviteSheet
          open={inviteId !== null}
          onOpenChange={(open) => {
            if (!open) setInviteId(null)
          }}
          name={invitee.fullName}
          identity={invitee.identity}
          link={invite.data?.url}
          offline={offline}
          onCopy={copyLink}
        />
      ) : null}
      <AddPlayer open={adding} onOpenChange={setAdding} />
    </main>
  )

  return live ? <LiveStates sessionId={live.id}>{render}</LiveStates> : render({})
}
