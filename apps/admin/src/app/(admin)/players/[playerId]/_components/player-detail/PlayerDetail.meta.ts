import type { ComponentMeta } from '@rotra/ui/meta'

export const playerDetailMeta = {
  name: 'PlayerDetail',
  description:
    'A-PLAYER-DETAIL container: useAdminPlayer, useContactRequests({playerId}) and the audit events of those requests for one player identity; a DetailHero, the same-name notice, and a two-column layout (main + 340 px side at 1040 px and wider) of Identity, Private contact, Contact-change requests, Account, Rank and games and Record of actions. Read-only: no edit controls.',
  usage: [
    'Rendered by /players/[playerId], which awaits params and searchParams from (the directory query) and passes them in. Back goes to /players plus from, restoring the search, account filter and shown count.',
    'Private contact shows the applied phone and email only, never a pending request; Phone shown to clubs comes from the player’s own preference.',
    'Each contact-change request row opens /requests/contact-changes/{requestId} with its next action (Review, Check status, Retry application, View).',
    'Same-name twins link to their own detail, keeping from. Admin never merges players.',
    'Created by is the club whose roster first lists the player (useAdminClubs); "—" when no club record exists in the mock data. The rank card waits for the ranking settings (leaderboard requirement).',
    'There is deliberately no Edit winner, Manually reconstruct session, rank override or contact overwrite action.',
    'While the player loads only the back link shows; the requests and record of actions appear once their reads answer. A permission error from any read denies the workspace (useDenyOnPermissionError). Loading, not-found and error states: A03.11.',
  ],
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
  related: [
    'Breadcrumb',
    'DetailHero',
    'Avatar',
    'PlayerAccountChip',
    'RankStatusChip',
    'SameNameNotice',
    'AdminPlayerIdentityCard',
    'PrivateContactCard',
    'ContactRequestList',
    'ContactRequestStatusChip',
    'PlayerAccountCard',
    'PlayerRankCard',
    'ActivityLog',
  ],
} satisfies ComponentMeta
