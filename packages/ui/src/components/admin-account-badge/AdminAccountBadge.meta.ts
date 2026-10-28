import type { ComponentMeta } from '@rotra/ui/meta'
export const adminAccountBadgeMeta = {
  name: "AdminAccountBadge",
  description: "Platform account email chip; icon only at 560 px and narrower.",
  usage: ['Use in the Admin workspace shell.'],
  prototype: { file: 'docs/frames/admin-app/rotra-admin.html', screen: "top bar account chip (topBar .acct)" },
  docs: ['docs/screens/product/modules/admin/access-navigation.md'],
  variants: ["default", "narrow", "long-email"],
} satisfies ComponentMeta
