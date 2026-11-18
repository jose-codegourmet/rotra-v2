import { accountVerificationIn } from '../account-verification/mockVerification'
import { getSession } from '../auth/fetchers'
import { checkMockSave, requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import { isRealDataMode } from '../real/mode'
import {
  realMarkNotificationsRead,
  realNotificationUnreadCount,
  realPlayerNotifications,
} from '../real/player-notifications'
import {
  isPlayerNotificationVisible,
  playerNotificationUnreadCount,
  VERIFICATION_REMINDER_ID,
  verificationReminder,
} from './playerNotifications.rules'
import type { PlayerNotification } from './playerNotifications.types'

function mockReminder(state: MockState, playerId: string, now: number): PlayerNotification | null {
  const verification = accountVerificationIn(state, playerId)
  if (!verification || verification.verified) return null

  return verificationReminder(
    verification.completedSteps,
    state.verificationReminderReads[playerId] ?? null,
    now,
  )
}

function resolveClubTarget(
  notification: PlayerNotification,
  state: MockState,
  playerId: string,
): PlayerNotification {
  const clubId = notification.kind === 'club' && /^\/clubs\/([^/]+)$/.exec(notification.target)?.[1]
  if (!clubId) return notification
  const clubExists = state.clubs.some((club) => club.id === clubId)
  const memberships = state.clubPlayers.filter(
    (player) => player.clubId === clubId && player.playerId === playerId,
  )
  const leftClub = memberships.length > 0 && memberships.every((player) => player.removedAt)
  return clubExists && !leftClub
    ? notification
    : { ...notification, target: `/players/${encodeURIComponent(playerId)}` }
}

/** The expected player ID scopes the cache; the Player session authorizes reads. */
export async function getPlayerNotifications(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerNotification[]> {
  if (isRealDataMode()) return realPlayerNotifications(playerId, signal)
  await delay(200, signal)
  if ((await getSession('player'))?.account.id !== playerId) return []
  requireOnline()

  const state = readMockState()
  const now = Date.now()
  const rows = (state.playerNotifications[playerId] ?? [])
    .filter((notification) => isPlayerNotificationVisible(notification, now))
    .map((notification) => resolveClubTarget(notification, state, playerId))
  const reminder = mockReminder(state, playerId, now)
  if (reminder) rows.unshift(reminder)
  return rows
}

export async function getPlayerNotificationUnreadCount(playerId: string, signal?: AbortSignal) {
  if (isRealDataMode()) return realNotificationUnreadCount(playerId, signal)
  return playerNotificationUnreadCount(await getPlayerNotifications(playerId, signal))
}

async function markRead(playerId: string, notificationId?: string): Promise<void> {
  if (isRealDataMode()) return realMarkNotificationsRead(playerId, notificationId)
  await delay(200)
  if ((await getSession('player'))?.account.id !== playerId)
    throw new MockError('permission', 'Sign in to mark your notifications as read.')
  requireOnline()

  mockStore.update((draft) => {
    const now = Date.now()
    const readAt = new Date(now).toISOString()
    const unread = (draft.playerNotifications[playerId] ?? []).filter(
      (notification) =>
        notification.readAt === null &&
        (notificationId === undefined || notification.id === notificationId) &&
        isPlayerNotificationVisible(notification, now),
    )
    const reminder =
      notificationId === undefined || notificationId === VERIFICATION_REMINDER_ID
        ? mockReminder(draft, playerId, now)
        : null
    const markReminder = reminder?.readAt === null
    if (!unread.length && !markReminder) return

    checkMockSave()
    for (const notification of unread) notification.readAt = readAt
    if (markReminder) draft.verificationReminderReads[playerId] = readAt
  })
}

export function markPlayerNotificationRead(playerId: string, notificationId: string) {
  return markRead(playerId, notificationId)
}

export function markAllPlayerNotificationsRead(playerId: string) {
  return markRead(playerId)
}
