import { GOOGLE_SIGN_IN_DEADLINE } from '../google-sign-in/googleSignIn.config'
import type { PlayerNotification, PlayerNotificationFilter } from './playerNotifications.types'

const DAY_MS = 24 * 60 * 60 * 1000
export const NOTIFICATION_VISIBILITY_MS = 90 * DAY_MS
export const VERIFICATION_REMINDER_ID = 'ann-google'

export function verificationReminder(
  completedSteps: number,
  readAt: string | null,
  now: number,
): PlayerNotification {
  return {
    id: VERIFICATION_REMINDER_ID,
    kind: 'announce',
    title: 'Verify your ROTRA account',
    body: `Connect Google, have your phone on file and use your Google email, by ${GOOGLE_SIGN_IN_DEADLINE.label}. ${completedSteps} of 3 done.`,
    target: '/profile/verification',
    createdAt: new Date(now - 60_000).toISOString(),
    readAt,
    pinned: true,
  }
}

export const isPlayerNotificationVisible = (notification: PlayerNotification, now: number) =>
  notification.pinned || now - Date.parse(notification.createdAt) < NOTIFICATION_VISIBILITY_MS

export const playerNotificationUnreadCount = (notifications: readonly PlayerNotification[]) =>
  notifications.filter((notification) => notification.readAt === null).length

export function groupPlayerNotifications(
  notifications: readonly PlayerNotification[],
  filter: PlayerNotificationFilter,
  now = Date.now(),
) {
  const visible = notifications.filter((notification) =>
    isPlayerNotificationVisible(notification, now),
  )
  const unreadCount = playerNotificationUnreadCount(visible)
  const list =
    filter === 'unread' ? visible.filter((notification) => notification.readAt === null) : visible
  const sorted = list.sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) || Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )
  const newNotifications: PlayerNotification[] = []
  const earlierNotifications: PlayerNotification[] = []
  for (const notification of sorted) {
    const isNew = notification.pinned || now - Date.parse(notification.createdAt) < DAY_MS
    const group = isNew ? newNotifications : earlierNotifications
    group.push(notification)
  }
  return { unreadCount, newNotifications, earlierNotifications }
}

export const GENDER_REMINDER_ID = 'add-gender'

/**
 * D-2026-11-19-01: an unread Account notification while the player's own gender is not added. It
 * opens Edit profile, Name. Derived like the verification reminder, so it disappears once a gender
 * is set; its read state is kept apart.
 */
export function genderReminder(readAt: string | null, now: number): PlayerNotification {
  return {
    id: GENDER_REMINDER_ID,
    kind: 'account',
    title: 'Add your gender',
    body: "Clubs use it to name your matches: Men's, Women's or Mixed Doubles. Until you add it, your matches count as Genderless.",
    // The Name section is chosen by the Edit profile screen ticket; this opens Edit profile.
    target: '/profile/edit',
    createdAt: new Date(now - 5 * 60_000).toISOString(),
    readAt,
    pinned: false,
  }
}
