import type { ComponentMeta } from '@rotra/ui/meta'

export const featureFlagRowMeta = {
  name: 'FeatureFlagRow',
  description:
    "A-FEATURE-FLAGS: one feature flag in the list — bold name, On/Off chip, fixed key, what it does, Last change ('{date time} · {email}' or 'Never changed') and a value switch named '{name}, on' / '{name}, off'.",
  usage: [
    'Stack rows inside one Card, separated by a border line (prototype viewFlags).',
    'The switch never flips the value: onRequestToggle(key) asks the container, which opens the confirmation showing the flag, its description and the new value, and saves deliberately.',
    'Pass disabled while that flag is saving or the Admin is offline; on a failed save the row keeps the accepted value.',
    "There is no key editor: a flag's key can't be changed after it is created.",
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-FEATURE-FLAGS › viewFlags() flag row',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md#a-feature-flags--platform-flags',
    'docs/database_design/product/admin/modules/configuration-requests.md#feature_flags',
  ],
  variants: ['off', 'on', 'never changed', 'long description', 'disabled'],
  related: ['Switch', 'Chip', 'KeyValueList', 'AddFlagForm'],
} satisfies ComponentMeta
