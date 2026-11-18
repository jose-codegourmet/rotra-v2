import type { PlayerNotification } from '../player-notifications/playerNotifications.types'
import { clubs } from './clubs'
import { JOSE_PLAYER_ID } from './players'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** The player behind the prototype's seedNotifs(). */
export function createPlayerNotificationFixtures(now: number): PlayerNotification[] {
  const profile = `/players/${JOSE_PLAYER_ID}`
  const sessions = `${profile}/sessions`
  const club = clubs.find((entry) => entry.name === 'IT Park Badminton Club')

  const rows: (Omit<PlayerNotification, 'createdAt' | 'readAt' | 'pinned'> & {
    age: number
    read: boolean
  })[] = [
    {
      id: 'n1',
      kind: 'session',
      age: 25 * MINUTE_MS,
      title: "You're in Thursday Open Play",
      body: 'Lahug Smash Club confirmed your spot. Thu · 7:00–10:00 PM.',
      target: sessions,
      read: false,
    },
    {
      id: 'n2',
      kind: 'invite',
      age: 3 * HOUR_MS,
      title: 'Kat invited you to play',
      body: 'Saturday Doubles Night at Mandaue Shuttle Society.',
      // The prototype's invited session has no matching fixture. My sessions is the fallback.
      target: sessions,
      read: false,
    },
    {
      id: 'n3',
      kind: 'session',
      age: 20 * HOUR_MS,
      title: 'Results are up for Sunday Night Queue',
      body: 'You played 6 games. See how they counted.',
      target: `${profile}/games`,
      read: false,
    },
    {
      id: 'n4',
      kind: 'session',
      age: 2 * DAY_MS,
      title: "You're on the waitlist for Friday Night Smash",
      body: "You're number 2. We'll tell you if a spot opens.",
      target: sessions,
      read: true,
    },
    {
      id: 'n5',
      kind: 'rank',
      age: 4 * DAY_MS,
      title: 'Your rank was updated',
      body: 'Your new games are in your rank. Tap to see what changed.',
      target: `${profile}/rank`,
      read: true,
    },
    {
      id: 'n6',
      kind: 'club',
      age: 9 * DAY_MS,
      title: 'IT Park Badminton Club added you',
      body: "You're in the club's saved players. You can leave from the club page.",
      target: club ? `/clubs/${club.id}` : profile,
      read: true,
    },
    {
      id: 'n7',
      kind: 'account',
      age: 15 * DAY_MS,
      title: 'Your email change was approved',
      body: 'ROTRA Admin approved the change. Sign in with your new email from now on.',
      target: '/profile/privacy-and-contact',
      read: true,
    },
  ]
  return rows.map(({ age, read, ...row }) => {
    const createdAt = new Date(now - age).toISOString()
    return { ...row, createdAt, readAt: read ? createdAt : null, pinned: false }
  })
}

/** The prototype's eighth event, shown when Admin verifies the account. */
export function createAdminVerifiedNotification(id: string, createdAt: string): PlayerNotification {
  return {
    id,
    kind: 'account',
    title: 'ROTRA Admin verified your account',
    body: "You don't need to finish the verification steps.",
    target: '/profile/verification',
    createdAt,
    readAt: null,
    pinned: false,
  }
}
