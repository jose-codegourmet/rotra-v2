import type { ComponentMeta } from '@rotra/ui/meta'

export const adminPlayerIdentityCardMeta = {
  name: 'AdminPlayerIdentityCard',
  description:
    'The Identity card on the Admin player detail: name, nickname, permanent RTR ID (or “Not registered yet” for a club’s unclaimed record) and when and by which club the profile was created.',
  usage: [
    'Admin only and read-only. The public profile header in the Player app is PlayerIdentityCard (photo, copyable Player ID, owner actions), hence the Admin prefix.',
    'The note under the card says a contact change does not change the RTR ID and that Admin can change it from Edit profile (registration place or date).',
    'Pass savedBy (savedByClubs(player) from AdminPlayerClubs.helpers) for an unclaimed player saved by more than one club: Created lists each club "saved as" its own name and the not-on-the-leaderboard line.',
    "Nickname shows '—' when the player has none.",
    'Pass the creation date as YYYY-MM-DD; it formats like the prototype (Mar 15, 2026).',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'A-PLAYER-DETAIL › viewPlayer() › Identity',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/admin/modules/player-management/README.md',
  ],
  related: ['KeyValueList', 'Card', 'PlayerIdentityCard', 'PrivateContactCard'],
} satisfies ComponentMeta
