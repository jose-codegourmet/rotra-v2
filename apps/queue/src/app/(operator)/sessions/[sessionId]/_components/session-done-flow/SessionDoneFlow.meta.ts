import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionDoneFlowMeta = {
  name: 'SessionDoneFlow',
  description:
    'The Session done sheet container (Q-SESSION-DONE, D-MINIMUM, D-SESSION-DONE): SessionDoneSheet over useSessionDoneReview and useQueueSession, with the step as local state, confirmed with useFinalizeSession and a commandId generated once per open sheet, then the finishing route.',
  usage: [
    'Mounted once by SessionConsole and opened by Session done in the ConsoleFooterBar and the dock pill (both disabled offline). The review query only runs while the sheet is open, and the sheet renders once the session and the review are loaded.',
    'Step 1 (review) shows Session, Games recorded, Participants and Sync with the games-in-play (error, Continue disabled), unplayed-waiting (info) and shortfall (warn) notices. Continue becomes Review shortfalls and goes to step 2 only while someone is below the minimum; otherwise it goes straight to Finish this session?. Back to session closes the sheet; Back on the confirmation returns to review. Every open starts again at review.',
    'Confirm Session done is disabled while changes are pending or offline. It calls useFinalizeSession with { sessionId, commandId } where the commandId was generated when the sheet opened, so a double tap replays the same command and the mock never starts a second finalization; the sheet disables its controls while the mutation is pending. The container then pushes /sessions/[sessionId]/finishing, where FinalizeProgressScreen follows the stages from useFinalizationStatus. Browser Back lands on the console with the sheet closed and nothing re-runs.',
    'A refusal before the finalization starts (offline, pending changes, a game still in play) closes the sheet and shows the reason as an error toast. Error and recovery states on the finishing screen arrive with Queue › Session finalization failures (Q07.7); the integrity gate and D-INTERRUPTION arrive with Queue › Offline.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-finalization.md#q-session-done--online-closure-review',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/queue/modules/sessions/README.md#ending',
    'docs/business_logic/product/queue/modules/results/flow/finalize-and-publish.md',
  ],
  related: ['SessionDoneSheet', 'FinalizeProgressScreen', 'ConsoleFooterBar', 'SessionConsole'],
} satisfies ComponentMeta
