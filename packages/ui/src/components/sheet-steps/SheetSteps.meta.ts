import type { ComponentMeta } from '@rotra/ui/meta'

export const sheetStepsMeta = {
  name: 'SheetSteps',
  description:
    'The small "1 Details · 2 Review" step line at the top of a two-step Admin sheet, with the current step in the accent color.',
  usage: [
    'Put it first in the sheet body of Add club (A-ADD-CLUB) and the License sheet (A-LICENSE); `current` is the 0-based index of the step on screen.',
    'It only shows where you are; Back and Review buttons move between steps. For the clickable Queue session setup steps use SetupStepBar.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'SHEETS.addClub / SHEETS.license › .steps',
  },
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  variants: ['first step', 'second step'],
  related: ['AddClubForm', 'AddClubReview', 'Sheet', 'SetupStepBar'],
} satisfies ComponentMeta
