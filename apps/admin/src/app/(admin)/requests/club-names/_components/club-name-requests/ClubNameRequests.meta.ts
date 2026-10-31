import type { ComponentMeta } from '@rotra/ui/meta'

export const clubNameRequestsMeta = {
  name: 'ClubNameRequests',
  description:
    'Club names list container: useClubNameRequests, a PageHeader, a Card of ListRow rows (ClubLogo, "{current} → {requested}", "Sent {ago} · {username}", Review) and a Recently decided ActivityLog.',
  usage: [
    'Rendered by /requests/club-names (Admin nav › Requests › Club names). It has no A- screen ID: it is the prototype\'s placeholder placement ("The Club names list sits beside Contact changes under Requests", app/mocksups-app/admin-app/README.md).',
    'Pending requests are newest first. Review opens /clubs/{id}?tab=overview#name-request, where NameChangeRequestCard and ClubNameSheets (D-CLUB-NAME) decide it.',
    'Recently decided shows the last six name-change audit events, and only when there are any.',
    'Loading shows skeleton rows in the card; no requests → EmptyState "No name changes waiting." / "Requests from clubs show up here."; a failed load shows ErrorState with Retry; a permission error replaces the workspace with the access denial.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'viewNames (Club names)',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'app/mocksups-app/admin-app/README.md',
  ],
  related: ['PageHeader', 'Card', 'ListRow', 'ClubLogo', 'ActivityLog', 'NameChangeRequestCard'],
} satisfies ComponentMeta
