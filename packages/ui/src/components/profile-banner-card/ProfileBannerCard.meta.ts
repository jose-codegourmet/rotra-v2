import type { ComponentMeta } from '@rotra/ui/meta'

export const profileBannerCardMeta = {
  name: 'ProfileBannerCard',
  description:
    'The one profile card of all three apps (D-PARTICIPANT-PROFILE, D-CLUB-PROFILE, Admin Quick view): no title bar; the top half of the player’s banner as a 5:1 strip from the top edge; the round picture (64 px, Admin 72 px) centred on its bottom edge with a surface ring, the eye on hover when it opens the full photo, and the status pill while live; the name block (display name with the profile icon, the full name under it when there is a nickname, the tiny Copy RTR ID button); a chip row, an optional identity line, then boxed sections. Exports ProfileCardSection, ProfileLevelBadge, ProfileLatestStats, ProfileStatsSection (Latest stats: the win rate with its pixel fire, Games, Wins, Losses on the podium grid; the year chip), ProfileIdCopyButton, profileStats, tonightText and tonightPillLabel.',
  usage: [
    'Put it in a Sheet with `headerless` (the × floats on the banner; the visually hidden title is the display name). Shared by ParticipantProfileSheet, PrivateProfileCard, PlayerProfileSheet, ClubMemberProfileSheet, ClubProfileCard and AdminPlayerQuickView.',
    'Display name: nickname, else full name. With a nickname the full name sits under it in muted 14 px; `subline` fills that line otherwise (the club card).',
    'rtrId draws the tiny Copy button: idLabel "RTR ID" (Queue, Admin: “RTR ID copied”) or "player ID" (Player: “Player ID copied”). A refused clipboard selects the ID: “ID selected. Copy it from your device menu.”',
    'profileLink: newTab true (Queue, Admin) is the new-tab icon; false (inside Player) is a forward arrow that calls onNavigate.',
    'tonight draws the pill only while the session is live: Playing in Court N (accent), Waiting in Court N (warn), Queued #N, Free · N min (accent under 10, warn from 10, error from 16) and Away, with the full “Tonight · …” line as tooltip and accessible name.',
    'bannerKey / bannerImageUrl: the resolved banner (the Admin default for no pick, guests and unclaimed). Colours are tokens only.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'SHEETS.profile and SHEETS.pubProfile (.pp-card, .pp-banner, .pp-name, .pp-rtr, .pp-pill)',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-participant-profile--participant-profile-card',
    'docs/mockup-changes/2026-11-13-profile-stats-redesign.md',
  ],
  related: [
    'ParticipantProfileSheet',
    'PrivateProfileCard',
    'PlayerProfileSheet',
    'ClubMemberProfileSheet',
    'ClubProfileCard',
    'AdminPlayerQuickView',
    'Sheet',
  ],
} satisfies ComponentMeta
