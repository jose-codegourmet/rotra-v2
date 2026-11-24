import type { ComponentMeta } from '@rotra/ui/meta'

export const exemptionListCardMeta = {
  name: 'ExemptionListCard',
  description:
    'The Exemption list card in the Generate Queue side column: "Exemption list · N", Choose players (primary while empty) or Edit list, a dashed empty button, chips with a level ring and ×, and the help line. Choosing opens the Exemption list sheet (PlayerPickerSheet variant "exemption").',
  usage: [
    'Rendered by AutoQueueWorkspace (below Bagging pairs when that is on) when the container passes `exemption`. Presentational: the container owns the list.',
    'Pass every roster player as `players` and the saved ids as `exemptIds`. `onSave(ids)` fires from the sheet\'s "Save list" and from a chip\'s ×; Cancel in the sheet leaves the list unchanged.',
    'Exempt players stay on the roster and can still be put in a match by hand. Whether Suggest and Auto Queue respect the list, and carry-over to the next session, are open (D-2026-11-19-07); this card does not decide them.',
    'Every picture shows the level ring; hover names the level. No level reads a grey ring.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'autoWorkspace › exemptCard(), sheet exemptPick',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md#exemption-list',
    'docs/mockup-changes/2026-11-19-queue-generate-exemption-list.md',
    'docs/mockup-changes/2026-11-19-queue-exemption-picker.md',
  ],
  variants: ['empty', 'several'],
  related: ['PlayerPickerSheet', 'AutoQueueWorkspace', 'BaggingPairsCard', 'Avatar'],
} satisfies ComponentMeta
