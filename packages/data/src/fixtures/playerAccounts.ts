// Fictional private account fixtures from rotra-player.html seedAccounts().
// Public profile and leaderboard projections must never return these records.
export const playerAccounts = [
  { playerId: '2c7f6a7b-eed9-5051-9426-6dbce5133fbc', phone: '+639175550142', email: 'migs.santos@example.com', phoneHidden: true, claimed: true },
  { playerId: 'bc4c3446-0131-591b-ab03-af19225dbe8a', phone: '+639185550377', email: '', phoneHidden: false, claimed: false },
]
export const signInExamples = {
  phone: '09175550142', international: '+63 917 555 0142', email: 'migs.santos@example.com',
  unknownEmail: 'unknown@example.com', password: 'prototype',
}

export const playerAccessScenarios = {
  credentialError: "That phone number or email and password don't match. Check them and try again.",
  successNote: 'Password saved. Sign in with your new password.',
  invalidEmail: 'not-an-email',
  requestError: "Couldn't send because you're offline. Try again when you're connected.",
  resetError: "Couldn't save because you're offline. Try again when you're connected.",
}
