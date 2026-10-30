import type { ComponentMeta } from '@rotra/ui/meta'

export const addFlagSheetMeta = {
  name: 'AddFlagSheet',
  description:
    'A-ADD-FLAG container: a Sheet titled "Add feature flag" with AddFlagForm (takenNames/takenKeys from useFeatureFlags) and Add flag over useAddFeatureFlag.',
  usage: [
    'Mounted by FeatureFlags; the Add flag button in its PageHeader actions opens it. Pass open and onOpenChange.',
    'AddFlagForm renders its own fields, notice and Cancel / Add flag buttons, so the Sheet has no footer. The key follows the name until edited and the flag starts off unless Turn on right away is set.',
    'Success closes the sheet and toasts "{name} added. It\'s {on|off}." Failure keeps the sheet and the typed values, shows the reason as serverError and an error toast.',
    'While adding the sheet has no close button and ignores Escape and the scrim. A ref keeps repeated taps to one request. Each opening clears the previous error.',
    'The "Discard this flag?" step and offline blocking are A04.8 (AddFlagForm onDirtyChange is ready for it).',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'SHEETS.addFlag; ACT.openAddFlag / flagCreate',
  },
  docs: ['docs/screens/product/modules/admin/configuration.md'],
  related: ['Sheet', 'AddFlagForm', 'Toaster'],
} satisfies ComponentMeta
