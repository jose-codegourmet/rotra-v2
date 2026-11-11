import type { ComponentMeta } from '@rotra/ui/meta'

export const profileCharactersMeta = {
  name: 'ProfileCharacters',
  description:
    'A-CHARACTERS container: useProfileCharacters and its mutations wired to a PageHeader, ImageDropZone and CharacterGrid.',
  usage: [
    'Rendered by /settings/profile-characters (Admin nav › Profile characters, under Settings after Feature flags).',
    'Header "Profile characters" and the helper line "Players see the shown images, 15 per page. Click an image to hide or show it. N shown · M hidden." (the hidden part only when some are hidden), then the drop zone, then the grid in upload order.',
    'Upload: useAddProfileCharacters over the dropped or chosen files; toasts "N images added and shown to players." and "Not added: …" come from the result. Click an image: useSetProfileCharacterShown. Small x: useDeleteProfileCharacter, then a "Character N deleted." toast with Undo for 6 seconds (useRestoreProfileCharacter).',
    'Hiding or deleting below 15 shown, and any change while offline, are refused by the mutation with a message; it shows as an error toast and nothing changes.',
    'Loading: ProfileCharactersSkeleton (also used by loading.tsx). Empty library: the zone stays, with an EmptyState that names the 15-image minimum. A failed first load: ErrorState "Couldn\'t load the profile characters." with Retry. A permission error on the read denies the workspace (useDenyOnPermissionError).',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'viewChars (Profile characters); ACT.charToggle / charDelete; addCharFiles',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md',
    'docs/business_logic/product/admin/modules/configuration/README.md',
    'docs/mockup-changes/2026-11-09-admin-profile-characters.md',
  ],
  related: [
    'PageHeader',
    'ImageDropZone',
    'CharacterGrid',
    'EmptyState',
    'ErrorState',
    'Skeleton',
    'Toaster',
  ],
} satisfies ComponentMeta
