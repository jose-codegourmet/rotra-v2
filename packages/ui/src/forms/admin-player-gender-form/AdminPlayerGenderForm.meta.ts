import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerGenderFormMeta = {
  name: 'AdminPlayerGenderForm',
  description:
    'Admin Players › Set gender: choose Male, Female or Not given for the selected players, confirm, then see each player result.',
  usage: ['Open from the Admin Players selection dock (Set gender).'],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/mockup-changes/2026-11-25-admin-bulk-set-gender.md',
  ],
} satisfies ComponentMeta
