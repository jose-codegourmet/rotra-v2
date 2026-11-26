import type { ComponentMeta } from '@rotra/ui/meta'

export const courtLabelFormMeta = {
  name: 'CourtLabelForm',
  description:
    'Change court label: a small dialog "Change COURT label?" with one Court label field (prefilled, required, up to 20 characters; another court may have the same label), the hint "Shows on the console, the public page and match history after sync." and Cancel / Save label.',
  usage: [
    'Open it from "Change court label", the first item of a court card\'s ⋯ menu on the live console, for free and busy courts.',
    'Errors are "Enter a court label." and "Use 20 characters or fewer." (@rotra/schema/court-label). Labels may repeat within a session (owner decision, 2026-11-25).',
    'The container saves only the label (matches, start and end stay as they are) and toasts "OLD is now NEW".',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.courtLabel, ACT.openCourtLabel / ACT.saveCourtLabel, courtMenu()',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-13-queue-change-court-label.md',
    'docs/mockup-changes/2026-11-25-queue-settings-courts-arrange.md',
  ],
  variants: ['default', 'empty', 'same as another court', 'saving', 'server error'],
  related: ['CourtCard', 'AddCourtForm', 'Sheet', 'Field'],
} satisfies ComponentMeta
