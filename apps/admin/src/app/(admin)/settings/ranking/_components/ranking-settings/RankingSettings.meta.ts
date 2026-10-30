import type { ComponentMeta } from '@rotra/ui/meta'

export const rankingSettingsMeta = {
  name: 'RankingSettings',
  description:
    'A-RANK-CONFIG container: useRankingPolicy and useSaveRankingSettings; a PageHeader, a two-column layout (main + 340 px side at 1040 px and wider) of RankingSettingsForm and FixedRulesCard beside RankingInEffectCard (In effect + Versions), and D-CONFIG (ConfirmSheet "Save configuration?" with ConfigDiff).',
  usage: [
    'Rendered by /settings/ranking (Admin nav › Ranking).',
    'The draft (text values + the version it was based on) lives in container state, apart from the effective version, so In effect and player pages never show unsaved values. No draft = the effective values; "Unsaved draft" compares with the base version (prototype cfgDirty).',
    'Discard draft resets to the effective values with no prompt, and clears a conflict or failure notice.',
    'Review changes opens D-CONFIG: ConfigDiff (effective → draft), "This saves version {v + 1}…", the warn notice about the undecided recalculation policy, Keep editing / Save configuration (Saving…). While saving the sheet cannot be closed; a ref keeps repeated taps to one request.',
    'Success closes the sheet, clears the draft and toasts "Saved. Version {v} is in effect." A ConflictError closes the sheet and shows ConfigConflictNotice above the form (Review changes disabled): Use my draft on version {v} rebases, Start over from version {v} discards. Any other failure closes the sheet and shows an error Notice ("Couldn\'t save." in bold); the draft and the version in effect are kept.',
    'Loading, failed load, offline and the leave-with-unsaved-draft prompt are A04.8. A permission error on the read denies the workspace (useDenyOnPermissionError).',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'viewConfig (Ranking settings); SHEETS.config; ACT.doConfig / cfgRebase / cfgDiscard',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/admin/modules/configuration/README.md',
  ],
  related: [
    'PageHeader',
    'RankingSettingsForm',
    'FixedRulesCard',
    'RankingInEffectCard',
    'ConfigConflictNotice',
    'ConfirmSheet',
    'ConfigDiff',
    'Notice',
    'Toaster',
  ],
} satisfies ComponentMeta
