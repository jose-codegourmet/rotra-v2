import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionRecordMeta = {
  name: 'SessionRecord',
  description:
    'Q-HISTORY / Q-INVALID-SESSION container: Breadcrumb Home, SessionRecordHeader from useSessionRecord (Games "—" on an invalid session) and the Foundation Tabs Public page, Results (default; chip "N games" on valid sessions), How the night ran, Players (chip "N") and Financials. Tab selection is local state.',
  usage: [
    'Rendered by /sessions/[sessionId]/record. Prepared, active and finalizing sessions are sent to sessionHref() (preparation or the console); an unknown or foreign id calls notFound(); other record errors show QueryError.',
    'Each tab body is its own container next to this one: record-public-tab, record-results-tab, record-night-tab, record-players-tab and record-financials-tab, all taking { sessionId, record }. Q08.6 fills Results, How the night ran and Players, Q09.6 Public page and Q10.8 Financials by editing only their tab file; this container stays as is.',
    'An invalid session renders InvalidSessionNotice (results variant with the stored reason) in Results and the night variant in How the night ran, and offers no Result slides, Publish, Download, edit-winner or reconstruct controls. Results, How the night ran and Players are filled by Q08.6; Public page by Q09.6; Financials by Q10.8.',
    'The Completed chip\'s "Results published" / "Results private" companion follows useSessionPublication.',
    'States (Q07.7): while the record loads, the header and totals are skeletons (no fabricated numbers); an unknown or other club\'s session id renders the shared not-found state with no private data; with the license expired (DevMenu) the operator shell shows the license gate instead of the record (no past reports), before any record query runs.',
  ],
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/screens/product/modules/queue/session-finalization.md#q-invalid-session--no-official-result',
    'docs/business_logic/product/queue/modules/results/README.md#session-record',
  ],
  related: [
    'SessionRecordHeader',
    'InvalidSessionNotice',
    'Tabs',
    'Breadcrumb',
    'RecordResultsTab',
    'RecordNightTab',
    'RecordPlayersTab',
    'RecordPublicTab',
    'RecordFinancialsTab',
  ],
} satisfies ComponentMeta
