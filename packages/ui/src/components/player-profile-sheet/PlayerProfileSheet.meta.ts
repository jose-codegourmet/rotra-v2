import type { ComponentMeta } from '@rotra/ui/meta'

export const playerProfileSheetMeta = {
  name: 'PlayerProfileSheet',
  description:
    "A player's profile on operator screens: picture, identity, nickname, level suggestion, registered city, RTR ID, when they were added, sessions here and whether their phone is hidden, and how they joined (Joined row). Guests with an inviteUrl also get an Invite to ROTRA section (Copy invite link, Share).",
  usage: [
    'Open it from any player picture on operator screens (queue cards, match dialogs, roster, payments, leaderboard). Never on public pages.',
    'Opened from inside a dialog, pass backLabel ("suggestion", "match" or "payments") and onBack to return to that dialog in the same state; otherwise the footer says Close.',
    'The phone number is never a prop: pass only phoneHidden. Invite shows for guests and unclaimed profiles.',
    'joinedVia ("club", "session" or null) sets the Joined row: "Joined via club link", "Joined via session link" or "Added by the club".',
    "Link to saved player…: pass onLinkToSavedPlayer only for a guest's record; it is ignored for other identities and when backLabel is set (opened from inside another dialog). The container opens LinkSavedPlayerSheet.",
    'Pass inviteUrl (the absolute ROTRA Player registration link) to show Invite to ROTRA for guests only: Copy invite link (toast; on clipboard failure the toast shows the link) and Share when the browser supports it. No auto-send, no identity linking.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Player profile sheet (profile(sh))',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/screens/product/experience-contract.md#sensitive-and-optional-information',
  ],
  related: ['LinkSavedPlayerSheet', 'InviteSheet', 'Avatar', 'IdentityChip', 'Sheet'],
} satisfies ComponentMeta
