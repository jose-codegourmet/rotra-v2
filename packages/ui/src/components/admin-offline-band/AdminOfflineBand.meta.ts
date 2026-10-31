import type { ComponentMeta } from '@rotra/ui/meta'
export const adminOfflineBandMeta = {
  name: 'AdminOfflineBand',
  description: 'Browser-loaded data timestamp and the Admin online-only operation warning.',
  usage: ['Use in the Admin workspace shell.'],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'offline band (topBar .band-off)',
  },
  docs: ['docs/screens/product/modules/admin/access-navigation.md'],
  variants: ['default', 'phone'],
} satisfies ComponentMeta
