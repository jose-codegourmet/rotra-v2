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
    'Loading: the PageHeader and RankingSettingsSkeleton (also used by loading.tsx), with no weight, threshold or version. A failed first load shows ErrorState "Couldn\'t load the ranking settings." with Retry; a failed refetch keeps the last accepted data, and the draft is kept apart from it. A permission error on the read denies the workspace (useDenyOnPermissionError).',
    'Offline (AdminOfflineBand from the shell): the page stays readable; Save configuration sends nothing and shows ADMIN_OFFLINE_ERROR in D-CONFIG, which stays open with the draft and the version in effect unchanged, and no toast. A connection lost while saving shows the same.',
    'Leaving with an unsaved draft: the container sets Redux ui.unsavedDraft, so the shell\'s rail and brand ask instead of navigating, and the browser shows its own prompt on reload or close (beforeunload). ConfirmSheet "Discard your draft?" (Keep editing / Discard draft, danger); Discard draft clears the draft and continues the navigation. The browser Back button is not guarded.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen:
      'viewConfig (Ranking settings); SHEETS.config / SHEETS.discard; ACT.doConfig / cfgRebase / cfgDiscard / discardGo; go() with cfgDirty; offlineBlock',
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
    'ErrorState',
    'Skeleton',
    'Notice',
    'Toaster',
  ],
} satisfies ComponentMeta
