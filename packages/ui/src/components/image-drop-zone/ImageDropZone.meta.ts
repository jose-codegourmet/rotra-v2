import type { ComponentMeta } from '@rotra/ui/meta'

export const imageDropZoneMeta = {
  name: 'ImageDropZone',
  description:
    'A dashed zone that takes several images at once, by drag or by the file picker, and reports them.',
  usage: [
    'onFiles gets File[] exactly as chosen. It does not crop, check size or type, or store anything; the data layer does (A07.2).',
    'Pass a unique id so the label can reach the file input when more than one zone is on a page.',
    'The border turns accent while files are dragged over; disabled (offline) dims it and ignores drops.',
    'Copy defaults to the characters page: "Drag images here to upload" / "or click to choose · PNG, JPG or WebP, up to 1 MB each". Profile banners passes title and hint ("Drag banners here to upload" / "… up to 2 MB each · cropped to 3:1").',
    'Show UploadProgress right under it while files are added.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Settings › Profile characters (.ch-drop)',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md',
    'docs/mockup-changes/2026-11-09-admin-profile-characters.md',
  ],
  related: ['CharacterGrid', 'UploadProgress', 'ProfileBannersPage', 'Toaster'],
} satisfies ComponentMeta
