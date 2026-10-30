import type { ComponentMeta } from '@rotra/ui/meta'

export const featureFlagsMeta = {
  name: 'FeatureFlags',
  description:
    'A-FEATURE-FLAGS container: useFeatureFlags and useSetFeatureFlagValue; a PageHeader with Add flag, one Card with a FeatureFlagRow per flag separated by a border line, the muted line about confirmed results, AddFlagSheet (A-ADD-FLAG) and the value confirmation (ConfirmSheet).',
  usage: [
    'Rendered by /settings/feature-flags (Admin nav › Feature flags).',
    "A row's switch only opens the confirmation; it keeps a copy of the flag as it was when pressed (with its revision), so the sheet never changes under the Admin and a stale save is refused.",
    'Confirmation (no D- ID exists): "Turn {on|off} {name}?", Now / After saving (KeyValueList), the flag\'s description, the muted note about offline Queue devices, Back / Turn {on|off} (Saving…). While saving the sheet cannot be closed; a ref keeps repeated taps to one request.',
    'Success closes it and toasts "{name} is {on|off}." A ConflictError (changed elsewhere) closes it with an error toast and the list shows the flag as it is now. Any other failure keeps the sheet with the reason; the value is unchanged.',
    'Loading, the empty catalog, a failed load, offline blocking and the discard prompt are A04.8. A permission error on the read denies the workspace (useDenyOnPermissionError). Dev menu › Show a placeholder flag adds a row without adding a flag.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'viewFlags (Feature flags); SHEETS.flag; ACT.openFlag / doFlag',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md',
    'docs/business_logic/product/admin/modules/configuration/README.md',
    'docs/screens/product/open-decisions.md',
  ],
  related: [
    'PageHeader',
    'Card',
    'FeatureFlagRow',
    'AddFlagSheet',
    'ConfirmSheet',
    'KeyValueList',
    'Toaster',
  ],
} satisfies ComponentMeta
