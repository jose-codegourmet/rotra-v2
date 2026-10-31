import type { ComponentMeta } from '@rotra/ui/meta'

export const addFlagFormMeta = {
  name: 'AddFlagForm',
  description:
    'A-ADD-FLAG: the Add feature flag sheet body — Name, Key (suggested from the name, fixed once saved), What it does and Turn on right away (off by default), with the note that a flag only changes something once the apps read its key.',
  usage: [
    'Render it in the Add feature flag Sheet without a footer; the Cancel and Add flag buttons are part of the form. Add flag saves, returns to the list and shows a toast.',
    'Pass every flag name as takenNames (compared ignoring case and accents) and every key as takenKeys.',
    'The key follows the name (rotra-admin.html flagKeyOf) until it is edited by hand.',
    'Errors show after the first Add flag press and then update as you type.',
    'isPending shows "Adding…" and disables every field and button; serverError shows below the notice and keeps the typed values.',
    'onDirtyChange reports whether the name, key or description holds text; the container asks "Discard this flag?" before closing.',
    'No field for which apps or behaviors a flag affects, and no targeting, schedule or audience (open decisions).',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-ADD-FLAG › SHEETS.addFlag (form step), flagErrors(), flagKeyOf()',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md#a-add-flag--add-a-flag',
    'docs/database_design/product/admin/modules/configuration-requests.md#feature_flags',
  ],
  variants: ['empty', 'key suggested', 'key edited', 'errors', 'pending', 'server error'],
  related: ['Field', 'TextInput', 'Textarea', 'Switch', 'Notice', 'Sheet', 'FeatureFlagRow'],
} satisfies ComponentMeta
