import type { ComponentMeta } from '@rotra/ui/meta'
export const adminNavMeta = {
  name: 'AdminNav',
  description:
    'Admin navigation composed from the Foundation SideRail. Club names sits beside Contact changes under Requests as a prototype placeholder placement.',
  usage: [
    'Use in the Admin workspace shell.',
    'Pass onNavigate while a page has an unsaved draft: items become buttons that report the chosen href (no navigation), so the shell can ask "Discard your draft?" first.',
  ],
  prototype: { file: 'app/mocksups-app/admin-app/rotra-admin.html', screen: 'left rail (rail)' },
  docs: ['docs/screens/product/modules/admin/access-navigation.md'],
  variants: [
    'clubs',
    'players',
    'contact-changes',
    'club-names',
    'ranking',
    'feature-flags',
    'no-counts',
    'zero-counts',
    'ask-before-leaving',
  ],
} satisfies ComponentMeta
