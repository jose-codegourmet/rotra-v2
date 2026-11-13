import type { ComponentMeta } from '@rotra/ui/meta'

export const participantProfileMeta = {
  name: 'ParticipantProfile',
  description:
    'The session page’s participant card container (#731, D-PARTICIPANT-PROFILE): ParticipantProfileSheet with useParticipantStats (Stats · YEAR) for a registered participant, with Share profile (PlayerShareSheet + ProfileShareCard, the Profile link), or PrivateProfileCard (private / guest) for a masked one.',
  usage: [
    'Mounted once by PublicSession for a signed-in Player; PublicParticipants onOpenParticipant, the Courts now faces and the Queue faces set the tapped entry. Visitors never mount it.',
    'The entry’s profile kind decides the card: registered (and the viewer’s own tile) the full card, private the always-private card, guest the Not on ROTRA yet card. Stats are read only for the full card.',
    'Real mode: the stats come from the Player app’s /api/rtr-ids/<RTR>/stats with the Player cookie; the status pill is missing because the Player-hosted access read carries no presence or courts.',
  ],
  docs: [
    'docs/screens/product/dialogs.md#d-participant-profile--participant-profile-card',
    'docs/screens/product/modules/queue/public-session.md',
  ],
  related: ['ParticipantProfileSheet', 'PrivateProfileCard', 'PublicSession', 'PublicParticipants'],
} satisfies ComponentMeta
