import type { ComponentMeta } from '@rotra/ui/meta'

export const profileBannerCardMeta = {
  name: 'ProfileBannerCard',
  description:
    'The profile card (D-PARTICIPANT-PROFILE): a banner strip (the player’s Profile banner, else the accent gradient), the big picture overlapping its bottom edge with a surface-coloured ring, the name in bold with the nickname in quotes, a chip row, an optional identity line, the Tonight · status line with a coloured dot, then boxed sections. Exports ProfileCardSection (boxed uppercase label), ProfileLevelBadge (accent chip) and ProfileStatTiles (Games, Wins, Losses, Win rate).',
  usage: [
    'Shared by ParticipantProfileSheet and PrivateProfileCard (session page) and PlayerProfileSheet (Queue Master). Put it in a Sheet with bodyClassName="p-0" so the banner runs edge to edge.',
    'tonight (ParticipantTonight) draws “Tonight · Playing · Court N” (accent dot and text), “On court · getting ready · Court N” (warn dot), “Queued · #N” or “Free” (muted dot) and “Away” (border dot). Leave it out when the player is not on tonight’s roster.',
    'onPhotoClick with a photoUrl makes the picture the Avatar view button (onView: “View full photo of NAME” or photoLabel, zoom-in cursor, focus ring) that opens PhotoViewer (#716); initials never open anything.',
    'bannerKey / bannerImageUrl draw the player’s Profile banner with ProfileBanner (an uploaded image wins); without either the strip is the accent gradient, linear-gradient(135deg, --accent-dim, --accent 55%, --accent-subtle). Colours are tokens only.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Participant profile and player profile sheets (.pp-card, .pp-banner, .pp-sec, .pp-stats)',
  },
  docs: ['docs/screens/product/dialogs.md#d-participant-profile--participant-profile-card'],
  related: [
    'ParticipantProfileSheet',
    'PrivateProfileCard',
    'PlayerProfileSheet',
    'Avatar',
    'Chip',
  ],
} satisfies ComponentMeta
