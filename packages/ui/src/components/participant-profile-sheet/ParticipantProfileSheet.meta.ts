import type { ComponentMeta } from '@rotra/ui/meta'

export const participantProfileSheetMeta = {
  name: 'ParticipantProfileSheet',
  description:
    'The session page’s participant profile card for a signed-in ROTRA Player (D-PARTICIPANT-PROFILE, #731): ProfileBannerCard with the Registered chip and a level badge, the Tonight · line, boxed About (Registered in, RTR ID) and Stats · last 90 days as four tiles (Games, Wins, Losses, Win rate) or “No games yet”. Footer Close and Open ROTRA profile.',
  usage: [
    'Opened from a registered participant’s or waitlist tile on the public session page (PublicParticipants onOpenParticipant), and from the viewer’s own tile whatever their visibility. Never for visitors.',
    'Public fields only: no phone, contacts or club-private rows (those belong to PlayerProfileSheet on operator screens).',
    'stats comes from useParticipantStats (the rank window, 90 days); pass statsLoading while it loads and statsError when it failed. null is “No games yet”.',
    'profileHref is the Player app’s /find/<RTR> profile, opened in a new tab; Open ROTRA profile hides without it.',
    'onPhotoClick makes the big picture the Avatar view button (“View full photo of NAME”, zoom-in cursor, focus ring); open PhotoViewer from it (#716, usePhotoViewer keeps the state). Initials never open anything.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › Participants › Participant profile sheet (pubProfile(sh))',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-participant-profile--participant-profile-card',
    'docs/screens/product/modules/queue/public-session.md',
  ],
  related: ['ProfileBannerCard', 'PrivateProfileCard', 'PublicParticipants', 'Sheet'],
} satisfies ComponentMeta
