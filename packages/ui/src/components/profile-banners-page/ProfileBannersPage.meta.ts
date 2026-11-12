import type { ComponentMeta } from '@rotra/ui/meta'

export const profileBannersPageMeta = {
  name: 'ProfileBannersPage',
  description:
    'A-BANNERS, Admin › Settings › Profile banners: the header with “N shown · N hidden”, the drop zone (“Drag banners here to upload” · up to 2 MB each · cropped to 5:2), the upload progress, and the 5:2 banner tiles with their names; click a tile to hide or show it, × deletes.',
  usage: [
    'The /admin/settings/profile-banners container wires the profile banner data to it, like ProfileCharacters wires CharacterGrid and ImageDropZone.',
    'onFiles gets the files unchecked; the container checks type and size, crops to 5:2, passes upload {done, total} while adding, and toasts profileBannersAddedToast(n) and “Not added: …”.',
    'onToggle / onDelete only report the id. The container enforces PROFILE_BANNER_MIN_SHOWN (2) with PROFILE_BANNER_HIDE_REFUSAL / PROFILE_BANNER_DELETE_REFUSAL, and shows profileBannerDeletedToast(name) with Undo.',
    'Seeded banners have no image: pass bannerKey and they are drawn from theme tokens; uploads pass imageUrl.',
    'disabled (offline) locks the drop zone and every tile; the container shows the offline error.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Settings › Profile banners (viewBanners, .bn-grid)',
  },
  docs: [
    'docs/mockup-changes/2026-11-11-admin-profile-banners.md',
    'docs/screens/product/modules/admin/configuration.md',
  ],
  variants: ['all-shown', 'some-hidden', 'uploading', 'offline'],
  related: ['CharacterGrid', 'ImageDropZone', 'UploadProgress', 'ProfileBanner'],
} satisfies ComponentMeta
