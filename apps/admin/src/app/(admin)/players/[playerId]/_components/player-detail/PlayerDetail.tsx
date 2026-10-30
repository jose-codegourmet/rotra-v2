'use client'

import { useAuditEventsForTargets } from '@rotra/data/admin-audit/useAuditEventsForTargets'
import { useAdminPlayer } from '@rotra/data/admin-player/useAdminPlayer'
import { useAdminClubs } from '@rotra/data/club/useAdminClubs'
import { useContactRequests } from '@rotra/data/contact-change-request/useContactRequests'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { useRankingSettings } from '@rotra/data/ranking-settings'
import { ActivityLog } from '@rotra/ui/activity-log'
import { AdminPlayerIdentityCard } from '@rotra/ui/admin-player-identity-card'
import { Avatar } from '@rotra/ui/avatar'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Card } from '@rotra/ui/card'
import { ContactRequestList } from '@rotra/ui/contact-request-list'
import { ContactRequestStatusChip } from '@rotra/ui/contact-request-status-chip'
import { DetailHero } from '@rotra/ui/detail-hero'
import { PlayerAccountCard } from '@rotra/ui/player-account-card'
import { PlayerAccountChip } from '@rotra/ui/player-account-chip'
import { PlayerRankCard } from '@rotra/ui/player-rank-card'
import { PrivateContactCard } from '@rotra/ui/private-contact-card'
import { RankStatusChip } from '@rotra/ui/rank-status-chip'
import { SameNameNotice } from '@rotra/ui/same-name-notice'
import Link from 'next/link'
import { useId, useMemo } from 'react'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'

/**
 * A-PLAYER-DETAIL: one player identity as Admin sees it. Identity, private contacts (the applied
 * values, never a pending request's), account, read-only rank, this player's contact-change requests
 * and the record of actions on them. Deliberately no edit controls: Admin can't change ranks,
 * winners or scores, rebuild sessions, overwrite contacts or merge players. `from` is the directory's
 * query, so Back restores its search, filter and shown count. Loading, not-found and error: A03.11.
 */
export function PlayerDetail({ playerId, from }: { playerId: string; from: string }) {
  const playerQuery = useAdminPlayer(playerId)
  const requestsQuery = useContactRequests({ playerId })
  // Same cache as the workspace nav count; names the club that created the identity.
  const clubsQuery = useAdminClubs()
  const settingsQuery = useRankingSettings()
  const requests = requestsQuery.data?.rows
  const requestIds = useMemo(() => (requests ?? []).map((request) => request.requestId), [requests])
  const auditQuery = useAuditEventsForTargets({
    targetType: 'contact_change_request',
    targetIds: requestIds,
  })
  const denied = useDenyOnPermissionError(
    playerQuery.error,
    requestsQuery.error,
    clubsQuery.error,
    auditQuery.error,
  )
  const recordHeadingId = useId()
  const player = playerQuery.data
  // With no requests loaded yet there are no targets, which would read as an empty record.
  const audit = requests ? auditQuery.data : undefined

  const activityEntries = useMemo(
    () =>
      (audit ?? []).map((event) => ({
        id: event.id,
        text: event.summary,
        at: event.at,
        actor: event.actorEmail,
      })),
    [audit],
  )

  const back = (
    <Breadcrumb label="Players" href={from ? `/players?${from}` : '/players'} linkAs={Link} />
  )
  if (denied) return null
  if (!player) return back

  const fromQuery = from ? `?from=${encodeURIComponent(from)}` : ''
  const createdBy =
    (player.createdByClubId === null
      ? undefined
      : clubsQuery.data?.clubs.find((club) => club.id === player.createdByClubId)?.name) ?? '—'
  const level = player.levelIndex === null ? null : (PLAYING_LEVELS[player.levelIndex] ?? null)
  const matchRequirement = settingsQuery.data?.matchRequirement

  return (
    <>
      {back}
      <DetailHero
        media={<Avatar name={player.name} size={52} />}
        title={player.name}
        meta={
          <>
            <PlayerAccountChip claimed={player.claimed} />
            <RankStatusChip status={player.rankStatus} />
            <span className="font-mono text-[13px] text-fg2">{player.rtrId}</span>
          </>
        }
      />
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
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[1040px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <AdminPlayerIdentityCard
            fullName={player.name}
            nickname={player.nickname}
            rtrId={player.rtrId}
            createdOn={player.createdOn}
            createdBy={createdBy}
          />
          <PrivateContactCard
            phone={player.phone}
            email={player.email}
            claimed={player.claimed}
            phoneHidden={player.phoneHidden}
          />
          {requests ? (
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
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <PlayerAccountCard claimed={player.claimed} registeredOn={player.registeredOn} />
          {matchRequirement !== undefined ? (
            <PlayerRankCard
              status={player.rankStatus}
              level={level}
              recentMatches={player.recentStandardMatches}
              matchRequirement={matchRequirement}
            />
          ) : null}
          <Card asChild>
            <section aria-labelledby={recordHeadingId} className="flex flex-col gap-3">
              <h2 id={recordHeadingId}>Record of actions</h2>
              {audit ? (
                <ActivityLog
                  entries={activityEntries}
                  emptyText="No Admin actions recorded for this player."
                />
              ) : null}
            </section>
          </Card>
        </div>
      </div>
    </>
  )
}
