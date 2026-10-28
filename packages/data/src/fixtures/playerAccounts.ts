import { maskPhone } from '../player-account/playerAccount.rules'
import type { ClaimLinkRecord } from '../player-account/playerAccount.types'
import { playerProfiles } from './playerProfiles'

// Fictional private account fixtures from rotra-player.html seedAccounts().
// Public profile and leaderboard projections must never return these records.
export const playerAccounts = [
  {
    playerId: '2c7f6a7b-eed9-5051-9426-6dbce5133fbc',
    phone: '+639175550142',
    email: 'migs.santos@example.com',
    phoneHidden: true,
    claimed: true,
  },
  {
    playerId: 'bc4c3446-0131-591b-ab03-af19225dbe8a',
    phone: '+639185550377',
    email: '',
    phoneHidden: false,
    claimed: false,
  },
]
export const signInExamples = {
  phone: '09175550142',
  international: '+63 917 555 0142',
  email: 'migs.santos@example.com',
  unknownEmail: 'unknown@example.com',
  password: 'prototype',
}

export const playerAccessScenarios = {
  credentialError: "That phone number or email and password don't match. Check them and try again.",
  successNote: 'Password saved. Sign in with your new password.',
  invalidEmail: 'not-an-email',
  requestError: "Couldn't send because you're offline. Try again when you're connected.",
  resetError: "Couldn't save because you're offline. Try again when you're connected.",
}

const JOMAR_ID = 'bc4c3446-0131-591b-ab03-af19225dbe8a'
/** The prototype's one registration link: Lahug Smash Club's link for Jomar dela Cruz. */
export const CLAIM_TOKEN = 'claim-jomar'
export const claimLinks: Record<string, ClaimLinkRecord> = {
  [CLAIM_TOKEN]: { playerId: JOMAR_ID, clubName: 'Lahug Smash Club', status: 'valid', checks: 0 },
}

const jomar = playerProfiles.find((profile) => profile.playerId === JOMAR_ID)
const jomarAccount = playerAccounts.find((account) => account.playerId === JOMAR_ID)
if (!jomar || !jomarAccount) throw new Error('Missing Jomar claim fixture.')
/** Story data for the registration-link screens, matching what the claim fetchers return. */
export const claimLinkScenarios = {
  clubName: 'Lahug Smash Club',
  longClubName: 'Mandaue City Shuttle Smashers Social Badminton Club',
  firstName: jomar.nickname ?? jomar.fullName,
  rtrId: jomar.rtrId,
  preview: {
    playerId: jomar.playerId,
    fullName: jomar.fullName,
    nickname: jomar.nickname,
    rtrId: jomar.rtrId,
    picture: jomar.picture,
    maskedPhone: maskPhone(jomarAccount.phone),
  },
  preset: {
    fullName: jomar.fullName,
    nickname: jomar.nickname ?? '',
    facebook: jomar.socialLinks.facebook,
  },
  /** Used by Migs's account, so a claim with it is an email conflict */
  takenEmail: 'migs.santos@example.com',
  emailConflict:
    'This email belongs to another ROTRA account. Use a different email, or ask ROTRA for help.',
  offline:
    "You're offline, so registration wasn't sent. Your details are still here; try again when you're connected.",
  /** Prototype default when a processing registration completes without a typed email */
  processingEmail: 'jomar.delacruz@example.com',
}
