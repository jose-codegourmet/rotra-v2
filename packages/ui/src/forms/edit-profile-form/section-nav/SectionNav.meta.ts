import type { ComponentMeta } from '@rotra/ui/meta'
export const sectionNavMeta = {
  name: 'SectionNav',
  description:
    "Edit profile's section tabs with a count of fields to fix or a dot for unsaved edits per section.",
  usage: [
    'Use only inside EditProfileForm; arrow keys move between sections.',
    'Wider than 720 px it is a sticky 200 px column; at phone width it becomes horizontal tabs with an accent underline.',
  ],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'Edit profile › .edit-nav',
  },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['clean', 'dirty', 'errors'],
  related: ['EditProfileForm'],
} satisfies ComponentMeta
