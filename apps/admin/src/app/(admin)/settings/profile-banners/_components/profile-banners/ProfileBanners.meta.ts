import type { ComponentMeta } from '@rotra/ui/meta'

export const profileBannersMeta = {
  name: 'ProfileBanners',
  description:
    'A-BANNERS container: useProfileBanners and its mutations wired to ProfileBannersPage (header, ImageDropZone, UploadProgress, 3:1 banner tiles).',
  usage: [
    'Rendered by /settings/profile-banners (Admin nav › Profile banners, under Settings after Profile characters; the badge is the shown count).',
    'Upload: useAddProfileBanners over the dropped or chosen files, with the Uploading N of M bar from onProgress; toasts "N banners added and shown to players." and "Not added: …" come from the result. Click a banner: useSetProfileBannerShown. ×: useDeleteProfileBanner, then a "NAME deleted." toast with Undo for 6 seconds (useRestoreProfileBanner).',
    'Hiding or deleting below 2 shown, and any change while offline, are refused by the mutation with a message; it shows as an error toast and nothing changes.',
    'Loading: ProfileBannersSkeleton (also used by loading.tsx). A failed first load: ErrorState "Couldn\'t load the profile banners." with Retry. A permission error on the read denies the workspace (useDenyOnPermissionError).',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'viewBanners (Profile banners); ACT.bannerToggle / bannerDelete; addBannerFiles',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md',
    'docs/business_logic/product/admin/modules/configuration/README.md',
    'docs/mockup-changes/2026-11-11-admin-profile-banners.md',
  ],
  related: ['ProfileBannersPage', 'ErrorState', 'Skeleton', 'Toaster'],
} satisfies ComponentMeta
