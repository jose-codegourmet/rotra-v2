import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionResultsMeta = {
  name: 'SessionResults',
  description:
    'Q-RESULTS container: Breadcrumb Home, ResultsHeader ("Session results · private", title, "date · venue · N games", status chips, Match history / View public page / Download images / Publish results or Update publication) and the slide tabs 1. Standings, 2. Awards, 3. Off Day (Foundation Tabs, local state) with StandingsSlide, AwardsSlide and the private OffDaySlide from useSessionResults.',
  usage: [
    'Rendered by /sessions/[sessionId]/results, where the finishing route lands after Session done and where Result slides on a session record links.',
    'Match history → /sessions/[sessionId]/record; View public page → the operator preview route /sessions/[sessionId]/public-page (Q09.5).',
    'Publish results / Update publication opens PublishResultsSheet; Download images opens ExportImagesSheetContainer. Declining to publish changes nothing about the "Player records and ranks updated" chip.',
    'States (Q08.7): only a completed session has results. Active → the console, prepared → preparation, finalizing → the finishing screen, invalid → the session record (sessionHref), so no provisional slide ever shows. A completed session whose slides stage failed shows ErrorState "Session finished; results are being prepared" with Try again, which re-runs the outstanding stages with the same finalization commandId.',
    'Loading shows skeletons for the header, chips, tabs and slide (no fabricated names or counts). Empty and pending-evidence copy is the slides\' own ("No counted games were recorded in this session.", "Not enough counted games to name an MVP.", "Not enough recent club-session history.", "No one had an off day by the recent-history measure."); nothing is zero-filled.',
    'Offline, the Publish sheet reads "Publishing needs internet." with its primary disabled; Update publication stays visible. With the license expired the operator shell shows the license gate instead (no past reports).',
    'Every slide frame carries the club logo or initials and name (useClub), the slide title, "session title · date" and the venue footer. Results are read-only: no MVP choice or Off Day editing.',
  ],
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-results--private-result-review',
    'docs/business_logic/product/queue/modules/results/README.md#finalization-versus-publishing',
    'docs/business_logic/product/queue/modules/results/flow/finalize-and-publish.md',
  ],
  related: [
    'ResultsHeader',
    'StandingsSlide',
    'AwardsSlide',
    'OffDaySlide',
    'PublishResultsSheet',
    'ExportImagesSheetContainer',
    'FinalizeProgressScreen',
  ],
} satisfies ComponentMeta
