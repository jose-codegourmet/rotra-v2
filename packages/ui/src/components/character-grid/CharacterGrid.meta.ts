import type { ComponentMeta } from '@rotra/ui/meta'

export const characterGridMeta = {
  name: 'CharacterGrid',
  description:
    'A plain grid of the uploaded character images (or, as variant banner, the 3:1 Profile banner tiles with their names). Pressing a tile shows or hides it for players; a small × deletes it.',
  usage: [
    'Pass items in the order players see them; there are no names and no ordering controls.',
    'Labels come from position: "Character 3, shown" / "Character 3, hidden". Hidden images are dimmed to opacity .25 and aria-pressed is false.',
    'onToggle and onDelete only report the id. The minimum-shown rule, the 6-second Undo toast and the save live in the page.',
    'disabled (offline) dims and locks every image and ×.',
    'variant="banner" (Profile banners): wide 3:1 tiles in a 210 px-minimum grid; pass each item a label and caption (the banner name, shown under the tile) and either src (upload) or art (a seeded banner drawn by ProfileBanner). Pass aria-label="Banner images".',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Settings › Profile characters (.ch-grid); Settings › Profile banners (.bn-grid)',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md',
    'docs/mockup-changes/2026-11-09-admin-profile-characters.md',
    'docs/mockup-changes/2026-11-11-admin-profile-banners.md',
  ],
  variants: ['character', 'banner'],
  related: ['ImageDropZone', 'Toaster', 'ProfileBannersPage', 'ProfileBanner'],
} satisfies ComponentMeta
