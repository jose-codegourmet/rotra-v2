import type { ComponentMeta } from '@rotra/ui/meta'

export const uploadProgressMeta = {
  name: 'UploadProgress',
  description:
    'The progress block under an image drop zone while files are added: “Uploading N of M…” over an accent bar that fills per file.',
  usage: [
    'Render right under ImageDropZone while a batch is being added; rejected files count towards done and total.',
    'Remove it when the result toast (“N … added and shown to players.” / “Not added: …”) appears.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Settings › Profile characters and Profile banners (.ch-uploading, uploadProgress)',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md',
    'docs/mockup-changes/2026-11-11-admin-profile-banners.md',
  ],
  related: ['ImageDropZone', 'ProgressBar', 'ProfileBannersPage'],
} satisfies ComponentMeta
