import type { ComponentMeta } from '@rotra/ui/meta'
export const playerProfileMeta = {
  name: 'PlayerProfile',
  description:
    'P-PUBLIC-PROFILE and P-OWN-PROFILE: identity card (the profile dialog’s banner top, actions one per row), Leaderboard ranking (once qualified with a position) or Leaderboard eligibility, each carrying the shared rank; the read-only Weekly Performance; My sessions (own); Recent sessions with the session matches dialog; Recent games; About. The owner also gets Edit profile, My player ID, the private account panel, Add details and Sign out.',
  usage: [
    'Ownership is checked before anything private renders: visitors never mount AccountPanel or request useMyAccount.',
    'The owner can change their picture immediately; visitors do not get the editor.',
    'The owner gets the banner pencil on the identity card banner (useBannerSheet, BannerSheet); Done saves and toasts Banner updated. Visitors never see it.',
    "The identity card's Profile banner is the profile's resolved bannerKey / bannerImageUrl (the default banner when none is chosen), the same for own and public profiles.",
    'Share profile shows on every readable profile (someone else’s under Compare with me); Share rank, result, performance and game stay on your own.',
    'The Overall box of Leaderboard ranking opens the leaderboard at /?player=<id>, which scrolls to the row and flashes it.',
    'Weekly Performance is hidden from others when the player turned off Show my weekly performance; the owner’s chip (Public, Signed-in players, Only you, Hidden) opens Privacy and contact with that switch highlighted.',
    'Recent sessions rows open SessionMatchesSheet; All sessions (N) goes to /players/<id>/sessions. Faces on game courts open GamePlayerProfile.',
    'Sign out has no confirmation dialog; D-SIGN-OUT belongs to the club account.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen:
      'Profile (viewProfile, eligibility, rankingCard, weeklyPerf, latestSessionsCard, recentGamesCard, SHEETS.sessionGames, privatePanel, ACT.copyId, ACT.signOut)',
  },
  docs: [
    'docs/screens/product/modules/player-information/profile.md',
    'docs/screens/product/modules/player-information/ranking-history.md',
    'docs/mockup-changes/2026-11-13-player-profile-hero-like-card.md',
    'docs/mockup-changes/2026-11-13-player-ranking-card.md',
    'docs/mockup-changes/2026-11-13-player-recent-sessions-games.md',
    'docs/mockup-changes/2026-11-13-player-stats-visibility.md',
  ],
  variants: ['public', 'own', 'loading', 'not-found', 'error', 'cached', 'updating', 'ranked'],
} satisfies ComponentMeta
