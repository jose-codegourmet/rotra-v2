import type { ComponentMeta } from '@rotra/ui/meta'

export const playerProfileSheetMeta = {
  name: 'PlayerProfileSheet',
  description:
    "A player's profile on operator screens as the banner profile card (ProfileBannerCard, D-PARTICIPANT-PROFILE): banner, overlapping picture, name and nickname, identity chip and level badge, the identity line, the Tonight · line, then boxed About (Registered in, RTR ID, Joined) and In your club (Added to club, Sessions here, Phone). Guests with an inviteUrl also get an Invite to ROTRA section (Copy invite link, Share); the levels note stays last.",
  usage: [
    'Open it from any player picture on operator screens (queue cards, match dialogs, roster, payments, leaderboard). Never on public pages.',
    'Opened from inside a dialog, pass backLabel ("suggestion", "match" or "payments") and onBack to return to that dialog in the same state; otherwise the footer says Close.',
    'The phone number is never a prop: pass only phoneHidden. Invite shows for guests and unclaimed profiles.',
    'An unclaimed player is the club\'s own record (D-2026-11-11-03): the identity line reads "Saved by your club with a phone. Not registered with ROTRA yet" and, with rtrId null, RTR ID reads "Given when they register" (others with no RTR ID read "None yet").',
    'The level badge reads “LEVEL tonight” from tonightLevel (the player is on tonight’s roster), else “LEVEL · suggestion” from level, else “No level yet”. Pass tonight (ParticipantTonight) for the Tonight · line; leave it out when the player is not on tonight’s roster.',
    'onPhotoClick makes the big picture the Avatar view button (“View full photo of NAME”, zoom-in cursor, focus ring); open PhotoViewer from it (#716). Initials never open anything.',
    'joinedVia ("club", "session" or null) sets the Joined row: "Joined via club link", "Joined via session link" or "Added by the club".',
    "Link to saved player…: pass onLinkToSavedPlayer only for a guest's record; it is ignored for other identities and when backLabel is set (opened from inside another dialog). The container opens LinkSavedPlayerSheet.",
    'Pass inviteUrl (the absolute ROTRA Player registration link) to show Invite to ROTRA for guests only: Copy invite link (toast; on clipboard failure the toast shows the link) and Share when the browser supports it. No auto-send, no identity linking.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Player profile sheet (profile(sh), .pp-card)',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-participant-profile--participant-profile-card',
    'docs/screens/product/modules/queue/access-home.md',
    'docs/screens/product/experience-contract.md#sensitive-and-optional-information',
  ],
  related: [
    'ProfileBannerCard',
    'LinkSavedPlayerSheet',
    'InviteSheet',
    'Avatar',
    'IdentityChip',
    'Sheet',
  ],
} satisfies ComponentMeta
