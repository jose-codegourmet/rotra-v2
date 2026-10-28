import type { ComponentMeta } from '@rotra/ui/meta'

export const finalizeProgressScreenMeta = {
  name: 'FinalizeProgressScreen',
  description:
    'Q-FINALIZE-PROGRESS container: FinalizeProgress with "Finishing TITLE" from useQueueSession and the four stages (Checking session records, Finishing the session, Updating player records, Preparing result slides) marked done / current / pending from useFinalizationStatus, which polls while the finalization runs.',
  usage: [
    'Rendered by /sessions/[sessionId]/finishing, where SessionDoneFlow pushes after Confirm Session done; sessionHref also sends a finalizing session here. The operator shell renders this route bare (no top bar, left nav or dock), the same pathname rule it uses for the license gate, as the prototype hides its shell on the finalizing screen.',
    'Before the status exists every stage is pending; while it runs the stages before the current one are done and the current one shows "…" with the live status line "STAGE…"; a committed finalization announces "Session finished; results are being prepared".',
    'When the status is done the route is replaced with /sessions/[sessionId]/results (Queue › Results sharing) and the toast "Session finished · player records updated" shows once, so browser Back from the results never re-runs the finalization. An unknown or foreign id renders not-found.',
    'The failed stage, its Try again and the lost-response recovery arrive with Queue › Session finalization failure states (Q07.7).',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-finalization.md#q-finalize-progress--finishing',
    'docs/screens/product/modules/queue/access-home.md',
    'docs/business_logic/product/queue/modules/results/flow/finalize-and-publish.md',
  ],
  related: ['FinalizeProgress', 'SessionDoneFlow', 'SessionConsole', 'OperatorShell'],
} satisfies ComponentMeta
