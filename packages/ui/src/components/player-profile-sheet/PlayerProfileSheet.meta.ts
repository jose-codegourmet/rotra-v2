import type { ComponentMeta } from '@rotra/ui/meta'

export const playerProfileSheetMeta = {
  name: 'PlayerProfileSheet',
  description:
    "A player's profile on operator screens as the header-less banner profile card (ProfileBannerCard, D-PARTICIPANT-PROFILE): the player's banner strip, overlapping picture with the status pill while live, the name block (display name, new-tab icon, full name, Copy RTR ID), identity chip and level badge, the identity line, then boxed About (Registered in, Joined), Latest stats and In your club (Added to club, Sessions here, Phone, and Email for guests and unclaimed players). Guests with getInviteLink also get an Invite to ROTRA section (Copy invite link, Share); the levels note stays last.",
  usage: [
    'Open it from any player picture on operator screens (queue cards, match dialogs, roster, payments, leaderboard). Never on public pages.',
    'Opened from inside a dialog, pass backLabel ("suggestion", "match", "payments", "games" or "place", the Podium place dialog) and onBack to return to that dialog in the same state; otherwise the footer says Close.',
    'The phone number is never a prop: pass only phoneHidden. Invite shows for guests and unclaimed profiles.',
    'An unclaimed player has an email and an RTR ID (D-2026-11-16-04): the identity line reads "Saved by your club with their email. Not registered with ROTRA yet". With rtrId null there is no Copy RTR ID button and no profile icon.',
    'detailsRequired (an older unclaimed record with a phone and no email) shows the warn "Details required" chip, the notice "An unclaimed player needs an email. Add their email in Edit details, or delete the player." and the line "Saved by your club with a phone and no email. Not registered with ROTRA yet".',
    'The Email row (guests and unclaimed players; none for registered) reads "On file and kept private" when emailOnFile, else "None on file"; the address is never a prop. phoneOnFile false reads "None on file" for the Phone row.',
    'Latest stats: pass year, stats (null is “No games yet this year”) and statsLoading; showStats false (the player turned off Show my profile stats) leaves Latest stats out. No Share profile here (the Queue Master’s own player card gets only the name icon, from profileHref).',
    'The level badge reads “LEVEL tonight” from tonightLevel (the player is on tonight’s roster), else “LEVEL · suggestion” from level, else “No level yet”. Pass tonight (ParticipantTonight) for the status pill only while the session is live; leave it out otherwise.',
    'onPhotoClick makes the big picture the Avatar view button (“View full photo of NAME”, zoom-in cursor, focus ring); open PhotoViewer from it (#716). Initials never open anything.',
    'joinedVia ("club", "session" or null) sets the Joined row: "Joined via club link", "Joined via session link" or "Added by the club".',
    "Pass getInviteLink (an async getter for the guest's own invite link, the absolute ROTRA Player /claim/<token> URL) to show Invite to ROTRA for guests only: Copy invite link (toast; on clipboard failure the toast shows the link) and Share when the browser supports it. Each tap calls it and the button shows loading; a rejection shows its message as an error toast. Return the same link while the profile stays open: making a new link cancels the earlier one. No auto-send. The text reads 'Send this link so they can register for ROTRA Player. This record becomes theirs when they register: their games here stay with them. The link works once and lasts 7 days.' (D-2026-11-18-07). Link to saved player… no longer exists (D-2026-11-16-04).",
    'Registered players only: pass clubNickname (null for none) for the Club nickname row under In your club (“NICK” · only your club sees it, or "None") and onClubNickname for the Club nickname button (not shown when opened from another dialog). Guests and unclaimed players get neither.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Player profile sheet (profile(sh), .pp-card)',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-participant-profile--participant-profile-card',
    'docs/screens/product/modules/queue/access-home.md',
    'docs/mockup-changes/2026-11-16-queue-unclaimed-email-lookup.md',
    'docs/mockup-changes/2026-11-18-queue-club-nickname.md',
    'docs/mockup-changes/2026-11-18-queue-guest-invite-claims-record.md',
    'docs/screens/product/experience-contract.md#sensitive-and-optional-information',
  ],
  related: [
    'ProfileBannerCard',
    'InviteSheet',
    'ClubNicknameForm',
    'Avatar',
    'IdentityChip',
    'Sheet',
  ],
} satisfies ComponentMeta
