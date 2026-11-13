import type { ComponentMeta } from '@rotra/ui/meta'

export const participantProfileSheetMeta = {
  name: 'ParticipantProfileSheet',
  description:
    'The session page’s participant profile card for a signed-in ROTRA Player (D-PARTICIPANT-PROFILE, #731): a header-less ProfileBannerCard with the name block (display name, new-tab icon, full name, Copy RTR ID), the Registered chip and a level badge, the status pill while live, boxed About (Registered in) and Stats · YEAR as four tiles or “No games yet this year”. Footer Close, Share profile and Open ROTRA profile (new tab).',
  usage: [
    'Opened from a registered participant’s or waitlist tile on the public session page (PublicParticipants onOpenParticipant), and from the viewer’s own tile whatever their visibility. Never for visitors.',
    'Public fields only: no phone, contacts or club-private rows (those belong to PlayerProfileSheet on operator screens).',
    'stats comes from useParticipantStats (the calendar year, reset on January 1); pass statsLoading while it loads and statsError when it failed. null is “No games yet this year”.',
    'profileHref is the Player app’s /find/<RTR> profile, opened in a new tab from the name icon and Open ROTRA profile; both hide without it. onShare opens the share dialog (Share profile).',
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
