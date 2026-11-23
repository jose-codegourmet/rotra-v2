import 'server-only'
import { PLAYER_GOOGLE_SIGN_IN_FLAG } from '@rotra/data/feature-flag/keys'
import {
  NOTIFICATION_VISIBILITY_MS,
  VERIFICATION_REMINDER_ID,
  verificationReminder,
} from '@rotra/data/player-notifications/rules'
import type { PlayerNotification } from '@rotra/data/player-notifications/types'
import type { PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { toIsoOrNull } from '../service/serialize'
import { readVerification } from './account-verification'
import { readPlayerFeatureFlag } from './feature-flags'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function visibleTo(playerId: string, now: Date) {
  return { playerId, createdAt: { gt: new Date(now.getTime() - NOTIFICATION_VISIBILITY_MS) } }
}

async function reminderFor(tx: Prisma.TransactionClient, playerId: string, now: Date) {
  // D-2026-11-18-01: no verification reminder while Google sign-in for players is off.
  if (!(await readPlayerFeatureFlag(PLAYER_GOOGLE_SIGN_IN_FLAG, tx))) return null
  const current = await readVerification(tx, playerId)
  return current && !current.verification.verified
    ? verificationReminder(
        current.verification.completedSteps,
        toIsoOrNull(current.reminderReadAt),
        now.getTime(),
      )
    : null
}

export function listPlayerNotifications({
  playerId,
}: PlayerContext): Promise<PlayerNotification[]> {
  const now = new Date()
  return prisma.$transaction(async (tx) => {
    const rows = await tx.playerNotification.findMany({
      where: visibleTo(playerId, now),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        target: true,
        createdAt: true,
        readAt: true,
      },
    })
    const clubIds = rows
      .filter((row) => row.kind === 'club')
      .map((row) => row.target.slice('/clubs/'.length))
      .filter((id) => UUID.test(id))
    const memberships = clubIds.length
      ? await tx.clubPlayer.findMany({
          where: { playerId, clubId: { in: clubIds }, removedAt: null },
          select: { clubId: true },
        })
      : []
    const clubTargets = new Set(memberships.map(({ clubId }) => `/clubs/${clubId}`))
    const notifications = rows.map((row) => ({
      ...row,
      target:
        row.kind === 'club' && !clubTargets.has(row.target) ? `/players/${playerId}` : row.target,
      createdAt: row.createdAt.toISOString(),
      readAt: toIsoOrNull(row.readAt),
      pinned: false,
    }))
    const reminder = await reminderFor(tx, playerId, now)
    if (reminder) notifications.unshift(reminder)
    return notifications
  })
}

export function countUnreadPlayerNotifications({ playerId }: PlayerContext) {
  const now = new Date()
  return prisma.$transaction(async (tx) => {
    const count = await tx.playerNotification.count({
      where: { ...visibleTo(playerId, now), readAt: null },
    })
    const reminder = await reminderFor(tx, playerId, now)
    return count + Number(reminder?.readAt === null)
  })
}

/** A player's first mark wins across retries, including the state-derived reminder. */
export function markPlayerNotificationsRead({ playerId }: PlayerContext, notificationId?: string) {
  const now = new Date()
  return prisma.$transaction(async (tx) => {
    if (notificationId !== VERIFICATION_REMINDER_ID) {
      if (notificationId !== undefined && !UUID.test(notificationId))
        throw new ServiceError('not_found')
      const where = { ...visibleTo(playerId, now), id: notificationId }
      const changed = await tx.playerNotification.updateMany({
        where: { ...where, readAt: null },
        data: { readAt: now },
      })
      if (notificationId !== undefined) {
        if (
          !changed.count &&
          !(await tx.playerNotification.findFirst({ where, select: { id: true } }))
        )
          throw new ServiceError('not_found')
        return
      }
    }
    const reminder = await reminderFor(tx, playerId, now)
    if (reminder?.readAt === null)
      await tx.playerAccount.updateMany({
        where: { playerId, verificationReminderReadAt: null },
        data: { verificationReminderReadAt: now },
      })
  })
}
