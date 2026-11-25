import type { ComponentMeta } from '@rotra/ui/meta'

export const handicapPickerMeta = {
  name: 'HandicapPicker',
  description:
    'Handicap · tonight (D-2026-11-25-03): a front-facing figure (Higgsfield still, 220 px tall in a 220 × 226 px area) with eleven 44 px spot buttons (aria-pressed, the spot name as accessible name and title), "Right" and "Left" labels, chips for marked spots ("Left knee" with "Clear left knee") or "No handicap", and the hint.',
  usage: [
    'Used by EditLivePlayerSheet in its Handicap · tonight section; saved with Save changes like the rest of the sheet.',
    'Spots are the codes in @rotra/data/session-roster/handicap (HANDICAP_SPOTS), in figure order.',
    'Known difference from the mockup: no Rive breathing loop (the Rive runtime is a new dependency that needs a decision); the still shows, as the mockup does when Rive cannot load.',
    "The art is /art/handicap/handicap-figure.png in the Queue app's public folder (Storybook serves the same folder).",
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'hcFigure() / HC_SPOTS (.hc-fig, .hc-zone, .hc-dot, .hc-chip) in SHEETS.editLive',
  },
  docs: [
    'docs/mockup-changes/2026-11-25-queue-handicap-tonight.md',
    'docs/mvp/decisions/2026-11-25.md#d-2026-11-25-03',
    'docs/screens/product/dialogs.md#d-edit-live-player--edit-player-during-a-session',
  ],
  variants: ['none marked', 'one spot', 'several spots', 'disabled'],
  related: ['EditLivePlayerSheet', 'PlayerPoolCard', 'Chip'],
} satisfies ComponentMeta
