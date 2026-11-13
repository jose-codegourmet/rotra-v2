import type { ComponentMeta } from '@rotra/ui/meta'

export const courtLabelFormMeta = {
  name: 'CourtLabelForm',
  description:
    'Change court label: a small dialog "Change COURT label?" with one Court label field (prefilled, required, up to 20 characters, unique within the session in any case), the hint "Shows on the console, the public page and match history after sync." and Cancel / Save label.',
  usage: [
    'Open it from "Change court label", the first item of a court card\'s ⋯ menu on the live console, for free and busy courts.',
    'Pass otherLabels with the session\'s other courts\' labels; errors are "Enter a court label.", "Use 20 characters or fewer." and "Another court already has this label." (@rotra/schema/court-label).',
    'The container saves only the label (matches, start and end stay as they are) and toasts "OLD is now NEW".',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.courtLabel, ACT.openCourtLabel / ACT.saveCourtLabel, courtMenu()',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-13-queue-change-court-label.md',
  ],
  variants: ['default', 'empty', 'duplicate', 'saving', 'server error'],
  related: ['CourtCard', 'AddCourtForm', 'Sheet', 'Field'],
} satisfies ComponentMeta
