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
