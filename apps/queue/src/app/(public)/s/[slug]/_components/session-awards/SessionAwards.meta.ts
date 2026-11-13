import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionAwardsMeta = {
  name: 'SessionAwards',
  description:
    'Finished session page container for the Awards section: PublicAwards from the publication, with Share per award, Share awards and Share Off Day in the standard share dialog.',
  usage: [
    'Rendered by PublicSession on the Details tab of a finished session when the club shared Awards or Off Day.',
    'Names and faces come masked from the read; faces open the profile card for a signed-in viewer only.',
    'Every share uses ShareDialog with AwardShareCard (Story, Facebook post, Square; OR; Session link).',
  ],
  docs: ['docs/mockup-changes/2026-11-13-queue-awards-faces-share.md'],
  related: ['PublicAwards', 'AwardCard', 'AwardShareCard', 'PublicSession'],
} satisfies ComponentMeta
