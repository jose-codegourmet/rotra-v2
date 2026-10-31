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
    'Loading: FeatureFlagsSkeleton (also used by loading.tsx), no name, key or value. Empty catalog: EmptyState in the Card, "No feature flags yet." + Add flag (sm). A failed first load: ErrorState "Couldn\'t load the feature flags." with Retry in the Card. A permission error on the read denies the workspace (useDenyOnPermissionError). Dev menu › Show a placeholder flag adds a row without adding a flag.',
    'Offline (AdminOfflineBand from the shell): the list stays readable and switches still open the confirmation; Turn on / Turn off sends nothing and shows ADMIN_OFFLINE_ERROR in the sheet (a fresh node per tap so the one-commit guard re-arms); the value is unchanged and no toast shows.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
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
    'EmptyState',
    'ErrorState',
    'Skeleton',
    'Toaster',
  ],
} satisfies ComponentMeta
