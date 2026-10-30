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
    'Closing (Cancel, the close button, Escape or the scrim) while the name, key or description holds text (AddFlagForm onDirtyChange) opens a nested ConfirmSheet "Discard this flag?" / "Nothing has been saved." / Keep editing / Discard (danger). Keep editing returns with every value kept.',
    'Offline: Add flag sends nothing and shows ADMIN_OFFLINE_ERROR as serverError, every typed value kept, no toast.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen:
      'SHEETS.addFlag (leave step); ACT.openAddFlag / flagCreate / flagBack / flagDiscard; offlineBlock',
  },
  docs: ['docs/screens/product/modules/admin/configuration.md'],
  related: ['Sheet', 'AddFlagForm', 'ConfirmSheet', 'Toaster'],
} satisfies ComponentMeta
