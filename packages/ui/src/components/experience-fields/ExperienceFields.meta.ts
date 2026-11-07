import type { ComponentMeta } from '@rotra/ui/meta'

export const experienceFieldsMeta = {
  name: 'ExperienceFields',
  description:
    'Playing experience as Years + months and as Playing since (month, year), linked: typing either fills the other.',
  usage: [
    'Controlled: value holds years and months as typed strings; Playing since is derived and never a form value.',
    'Used by PersonalDetailsFields (registration, Edit profile) and the Queue Edit details form.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'fieldsGame › Experience (linkExperience)',
  },
  docs: ['docs/mockup-changes/2026-11-08-player-claim-prefill-and-experience.md'],
  related: ['PersonalDetailsFields', 'Select', 'TextInput'],
} satisfies ComponentMeta
