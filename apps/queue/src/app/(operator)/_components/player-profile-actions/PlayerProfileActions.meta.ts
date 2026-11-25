import type { ComponentMeta } from '@rotra/ui/meta'

export const playerProfileActionsMeta = {
  name: 'PlayerProfileActions',
  description:
    "usePlayerProfileActions: the profile sheet's own actions, the same on every operator screen. Edit details and Invite for guests and unclaimed players, Club nickname for registered players, Delete player for anyone (the D-DELETE-PLAYER sheet only when they are in the Active Session). It owns EditPlayerDetails, InviteSheet, ClubNicknameForm and DeletePlayerSheet.",
  usage: [
    'Used by SavedPlayers, the session console PlayerProfile and PreparationRoster. Spread profileProps(profile) onto PlayerProfileSheet and render sheets beside it.',
    'hideProfile hides the profile while another sheet takes its place; showProfile reopens it after Edit details or Club nickname (or opens the player a record was moved into); closeProfile ends the flow after Invite closes or the player is deleted.',
    'PlayerProfileSheet itself hides Delete player and Club nickname when opened from another dialog (backLabel), as the prototype does.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.profile footer (profile(sh))',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-participant-profile--participant-profile-card',
    'docs/screens/product/modules/queue/players-roster.md',
  ],
  related: [
    'PlayerProfileSheet',
    'EditPlayerDetails',
    'InviteSheet',
    'ClubNicknameForm',
    'DeletePlayerSheet',
  ],
} satisfies ComponentMeta
