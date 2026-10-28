import { clubs } from './clubs'
import { playerAccounts } from './playerAccounts'
import { players } from './players'

/** Fictional platform owner from rotra-admin.html; no password is persisted. */
export const adminAccount = { id: 'platform-owner', email: 'owner@rotra.example' }

export const nonAdminAccounts = [
  ...clubs.filter((club) => ['lahug.smash', 'itpark.badminton'].includes(club.username)).map((club) => ({
    id: club.id,
    identifier: club.username,
    accountDescription: `the club account for ${club.name}`,
  })),
  ...playerAccounts.filter((account) => account.claimed).map((account) => ({
    id: account.playerId,
    identifier: account.email,
    accountDescription: `the player account for ${players.find((player) => player.id === account.playerId)?.fullName}`,
  })),
]

export const adminAccessExamples = {
  deniedDescription: nonAdminAccounts[0]?.accountDescription ?? '',
  longEmail: 'platform.owner.with.a.long.email.address@rotra.example',
  longAccountDescription: `${nonAdminAccounts[0]?.accountDescription} (${clubs[0]?.foundingAddress})`,
  credentialError: 'Email or password is incorrect.',
}

/** Prototype record counts for stories only; workspace counts are wired by A02–A04. */
export const adminNavExamples = {
  hrefs: { clubs: '/clubs', players: '/players', 'contact-changes': '/requests/contact-changes', 'club-names': '/requests/club-names', ranking: '/settings/ranking', 'feature-flags': '/settings/feature-flags' },
  counts: { clubs: clubs.length, players: 185, 'contact-changes': 3, 'club-names': 2, 'feature-flags': 0 },
  zeroCounts: { clubs: 0, players: 0, 'contact-changes': 0, 'club-names': 0, 'feature-flags': 0 },
  loadedAt: new Date('2026-10-27T21:41:00'),
}
