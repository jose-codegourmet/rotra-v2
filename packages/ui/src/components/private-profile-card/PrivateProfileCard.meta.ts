import type { ComponentMeta } from '@rotra/ui/meta'

export const privateProfileCardMeta = {
  name: 'PrivateProfileCard',
  description:
    'The limited participant cards on the session page (D-PARTICIPANT-PROFILE, #731), on ProfileBannerCard. private: an always-private player’s real picture and banner, the masked name, a Private profile chip and one Private section. guest: a guest or unclaimed player, a Not on ROTRA yet chip and one Guest section. No level, status, About or stats; Close only.',
  usage: [
    'Opened from a masked tile by a signed-in ROTRA Player (PublicParticipants onOpenParticipant with profile "private" or "guest"). The player themselves never sees it: their own tile opens ParticipantProfileSheet.',
    'name is always the masked name (“J*** A***”); the full name, level and games never reach this card.',
    'private: pass the real photoUrl (picture and banner stay public, owner comment of November 11, 2026) and onPhotoClick for the full photo (#716, “View full photo”). guest: initials or the public picture; no photo button.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › Participants › Private profile card (pubProfile(sh), limited)',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-participant-profile--participant-profile-card',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['ProfileBannerCard', 'ParticipantProfileSheet', 'PublicParticipants', 'Sheet'],
} satisfies ComponentMeta
