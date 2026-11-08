'use client'

import { useAuditEvents } from '@rotra/data/admin-audit/useAuditEvents'
import { useAuditEventsForTargets } from '@rotra/data/admin-audit/useAuditEventsForTargets'
import { useAdminPlayer } from '@rotra/data/admin-player/useAdminPlayer'
import { useAdminPlayerGames } from '@rotra/data/admin-player/useAdminPlayerGames'
import { useAdminClubs } from '@rotra/data/club/useAdminClubs'
import { useContactRequests } from '@rotra/data/contact-change-request/useContactRequests'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { useRankingSettings } from '@rotra/data/ranking-settings'
import { ActivityLog } from '@rotra/ui/activity-log'
import { AdminPlayerHistory } from '@rotra/ui/admin-player-history'
import { AdminPlayerIdentityCard } from '@rotra/ui/admin-player-identity-card'
import { Avatar } from '@rotra/ui/avatar'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ContactRequestList } from '@rotra/ui/contact-request-list'
import { ContactRequestStatusChip } from '@rotra/ui/contact-request-status-chip'
import { DetailHero } from '@rotra/ui/detail-hero'
import { ErrorState } from '@rotra/ui/error-state'
import { PlayerAccountCard } from '@rotra/ui/player-account-card'
import { PlayerAccountChip } from '@rotra/ui/player-account-chip'
import { PlayerRankCard } from '@rotra/ui/player-rank-card'
import { PrivateContactCard } from '@rotra/ui/private-contact-card'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { RankStatusChip } from '@rotra/ui/rank-status-chip'
import { SameNameNotice } from '@rotra/ui/same-name-notice'
import { Skeleton } from '@rotra/ui/skeleton'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import Link from 'next/link'
import { notFound, useRouter, useSearchParams } from 'next/navigation'
import { useId, useMemo } from 'react'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'
import { PlayerManagementActions } from '../../../_components/player-management-actions/PlayerManagementActions'
import { PlayerDetailSkeleton } from './PlayerDetailSkeleton'

/** Grey bars while a card's read is still out. */
function LinesSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy className="flex flex-col gap-2.5">
      <Skeleton label={label} className="w-3/4" />
      <Skeleton className="w-1/2" />
      <Skeleton className="w-2/3" />
    </div>
  )
}

/**
 * A-PLAYER-DETAIL: one player identity as Admin sees it. Identity, private contacts (the applied
 * values, never a pending request's), account, read-only rank, this player's contact-change requests
 * and the record of actions on them. Approved profile edits require review and a reason. Admin cannot change ranks,
 * winners or scores, rebuild sessions, overwrite contacts or merge players. `from` is the directory's
 * query, so Back restores its search, filter and shown count. Skeleton while the player loads,
 * Player not found (not-found.tsx) for an unknown id, Retry when the load fails; the requests and the
 * record of actions have their own loading and error states. A permission error from any read denies
 * the workspace.
 */
export function PlayerDetail({ playerId, from }: { playerId: string; from: string }) {
  const router = useRouter()
  const search = useSearchParams()
  const requestedTab = search.get('tab')
  const tab =
    requestedTab === 'contact' || requestedTab === 'history' || requestedTab === 'activity'
      ? requestedTab
      : 'overview'
  const setTab = (next: string) => {
    const params = new URLSearchParams(search.toString())
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    router.replace(`?${params}`, { scroll: false })
  }
  const playerQuery = useAdminPlayer(playerId)
  const gamesQuery = useAdminPlayerGames(playerId)
  const requestsQuery = useContactRequests({ playerId })
  // Same cache as the workspace nav count; names the club that created the identity.
  const clubsQuery = useAdminClubs()
  const settingsQuery = useRankingSettings()
  const requests = requestsQuery.data?.rows
  const openRequests =
    requests?.filter((request) => ['pending', 'applying', 'failed'].includes(request.status))
      .length ?? 0
  const requestIds = useMemo(() => (requests ?? []).map((request) => request.requestId), [requests])
  const auditQuery = useAuditEventsForTargets({
    targetType: 'contact_change_request',
    targetIds: requestIds,
  })
  const playerAuditQuery = useAuditEvents({ targetType: 'player', targetId: playerId })
  const denied = useDenyOnPermissionError(
    playerQuery.error,
    requestsQuery.error,
    clubsQuery.error,
    auditQuery.error,
    playerAuditQuery.error,
    gamesQuery.error,
  )
  const requestsHeadingId = useId()
  const recordHeadingId = useId()
  const player = playerQuery.data
  // With no requests loaded yet there are no targets, which would read as an empty record.
  const audit = requests ? auditQuery.data : undefined

  const activityEntries = useMemo(
    () =>
      [...(audit ?? []), ...(playerAuditQuery.data ?? [])]
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((event) => ({
          id: event.id,
          text: event.summary,
          at: event.at,
          actor: event.actorEmail,
        })),
    [audit, playerAuditQuery.data],
  )

  const back = (
    <Breadcrumb label="Players" href={from ? `/players?${from}` : '/players'} linkAs={Link} />
  )
  if (denied) return null
  if (player === null) notFound()
  if (!player) {
    return (
      <>
        {back}
        {playerQuery.isError ? (
          <ErrorState
            title="Couldn't load this player."
            onRetry={() => void playerQuery.refetch()}
            retrying={playerQuery.isFetching}
            retryLabel="Retry"
          >
            Check your connection, then try again.
          </ErrorState>
        ) : (
          <PlayerDetailSkeleton />
        )}
      </>
    )
  }

  const fromQuery = from ? `?from=${encodeURIComponent(from)}` : ''
  const createdBy =
    (player.createdByClubId === null
      ? undefined
      : clubsQuery.data?.clubs.find((club) => club.id === player.createdByClubId)?.name) ?? 'Admin'
  const level = player.levelIndex === null ? null : (PLAYING_LEVELS[player.levelIndex] ?? null)
  const matchRequirement = settingsQuery.data?.matchRequirement
  // The record is read per request, so a failed requests read fails it too; Retry asks again for both.
  const recordError = requestsQuery.isError
    ? requestsQuery
    : auditQuery.isError
      ? auditQuery
      : playerAuditQuery.isError
        ? playerAuditQuery
        : null

  return (
    <>
      {back}
      <DetailHero
        media={
          <Avatar
            name={player.name}
            src={profilePictureSrc(player.picture, player.id, player.name)}
            size={52}
          />
        }
        title={player.name}
        meta={
          <>
            <PlayerAccountChip claimed={player.claimed} />
            <RankStatusChip status={player.rankStatus} />
            <span className="font-mono text-[13px] text-fg2">{player.rtrId}</span>
          </>
        }
      />
      <PlayerManagementActions player={player} />
      <SameNameNotice
        variant="detail"
        twins={player.samePlayers.map((twin) => ({
          id: twin.id,
          fullName: twin.name,
          rtrId: twin.rtrId,
          href: `/players/${twin.id}${fromQuery}`,
        }))}
        linkComponent={Link}
      />
      <Tabs
        aria-label="Player details"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: 'Overview' },
          {
            value: 'contact',
            label: 'Contact',
            badges: openRequests ? [{ text: `${openRequests} open`, tone: 'warn' }] : undefined,
          },
          { value: 'history', label: 'Game history', shortLabel: 'History' },
          {
            value: 'activity',
            label: 'Activity',
            badges:
              audit && playerAuditQuery.data
                ? [{ text: String(activityEntries.length) }]
                : undefined,
          },
        ]}
      >
        <TabsContent value="overview">
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[1040px]:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-5">
              <AdminPlayerIdentityCard
                fullName={player.name}
                nickname={player.nickname}
                rtrId={player.rtrId}
                createdOn={player.createdOn}
                createdBy={createdBy}
              />
              <PlayerAccountCard claimed={player.claimed} registeredOn={player.registeredOn} />
            </div>
            <div className="flex min-w-0 flex-col gap-5">
              {matchRequirement !== undefined ? (
                <PlayerRankCard
                  linkComponent={Link}
                  historyHref={`/players/${playerId}/games?from=${encodeURIComponent(from)}`}
                  status={player.rankStatus}
                  level={level}
                  recentMatches={player.recentStandardMatches}
                  matchRequirement={matchRequirement}
                />
              ) : null}
              <Card className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2>Recent games</h2>
                  <Button size="xs" onClick={() => setTab('history')}>
                    View all
                  </Button>
                </div>
                <div className="[&>section]:border-0 [&>section]:pt-0 [&_h3]:hidden">
                  <AdminPlayerHistory
                    variant="compact"
                    limit={3}
                    name={player.name}
                    backHref=""
                    sessions={gamesQuery.data}
                    error={gamesQuery.isError}
                    onRetry={() => void gamesQuery.refetch()}
                    tab="all"
                    club=""
                    from=""
                    to=""
                    page={1}
                    onChange={() => {}}
                  />
                </div>
                <p className="text-sm text-fg2">
                  Wins–losses in each of the latest sessions. Read-only.
                </p>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="contact">
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[1040px]:grid-cols-2">
            <PrivateContactCard
              phone={player.phone}
              email={player.email}
              claimed={player.claimed}
              phoneHidden={player.phoneHidden}
            />
            {requestsQuery.isError || !requests ? (
              <Card asChild>
                <section aria-labelledby={requestsHeadingId} className="flex flex-col gap-3">
                  <h2 id={requestsHeadingId}>Contact-change requests</h2>
                  {requestsQuery.isError ? (
                    <ErrorState
                      title="Couldn't load the contact-change requests."
                      onRetry={() => void requestsQuery.refetch()}
                      retrying={requestsQuery.isFetching}
                      retryLabel="Retry"
                    >
                      Check your connection, then try again.
                    </ErrorState>
                  ) : (
                    <LinesSkeleton label="Loading the contact-change requests" />
                  )}
                </section>
              </Card>
            ) : (
              <ContactRequestList
                requests={requests.map((request) => ({
                  id: request.requestId,
                  field: request.field,
                  from: request.fromValue,
                  to: request.toValue,
                  requestedAt: request.requestedAt,
                  status: <ContactRequestStatusChip status={request.status} />,
                  action: request.nextAction,
                  href: `/requests/contact-changes/${request.requestId}`,
                }))}
                linkComponent={Link}
              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="history">
          <Card className="flex flex-col gap-3">
            <h2>Game history</h2>
            <div className="[&>section]:border-0 [&>section]:pt-0 [&_h3]:hidden">
              <AdminPlayerHistory
                variant="compact"
                limit={gamesQuery.data?.length ?? 0}
                name={player.name}
                backHref=""
                sessions={gamesQuery.data}
                error={gamesQuery.isError}
                onRetry={() => void gamesQuery.refetch()}
                tab="all"
                club=""
                from=""
                to=""
                page={1}
                onChange={() => {}}
              />
            </div>
            <p className="text-sm text-fg2">
              Wins–losses in each session, newest first. Read-only: Admin can't change winners or
              scores.
            </p>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <Card asChild>
            <section aria-labelledby={recordHeadingId} className="flex flex-col gap-3">
              <h2 id={recordHeadingId}>Record of actions</h2>
              {recordError ? (
                <ErrorState
                  title="Couldn't load the record of actions."
                  onRetry={() => void recordError.refetch()}
                  retrying={recordError.isFetching}
                  retryLabel="Retry"
                >
                  Check your connection, then try again.
                </ErrorState>
              ) : audit && playerAuditQuery.data ? (
                <ActivityLog
                  entries={activityEntries}
                  emptyText="No Admin actions recorded for this player."
                />
              ) : (
                <LinesSkeleton label="Loading the record of actions" />
              )}
            </section>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
