import type { ComponentMeta } from '@rotra/ui/meta'

export const characterGridMeta = {
  name: 'CharacterGrid',
  description:
    'A plain grid of the uploaded character images. Pressing an image shows or hides it for players; a small × deletes it.',
  usage: [
    'Pass items in the order players see them; there are no names and no ordering controls.',
    'Labels come from position: "Character 3, shown" / "Character 3, hidden". Hidden images are dimmed to opacity .25 and aria-pressed is false.',
    'onToggle and onDelete only report the id. The minimum-shown rule, the 6-second Undo toast and the save live in the page.',
    'disabled (offline) dims and locks every image and ×.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Settings › Profile characters (.ch-grid)',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md',
    'docs/mockup-changes/2026-11-09-admin-profile-characters.md',
  ],
  related: ['ImageDropZone', 'Toaster'],
} satisfies ComponentMeta
