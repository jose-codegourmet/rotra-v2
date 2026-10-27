import type { ComponentMeta } from '@rotra/ui/meta'

export const buttonMeta = {
  name: 'Button',
  description:
    'The standard action button. Primary for the one main action on a screen or sheet, secondary for the rest, ghost for low-emphasis actions, danger for destructive ones.',
  usage: [
    'Name the action ("Start match", "Confirm result"); never a neutral "Save" or "OK" on a confirmation.',
    'Pass loading while a save is pending so one tap cannot submit twice.',
    'Use size="sm" in cards and toolbars, size="xs" in dense rows; touch screens enlarge them automatically.',
    'Use aria-pressed for toggle buttons (filters, picks); it shows the accent outline.',
    'For an icon-only action use IconButton, which requires a label.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Shared styles › .btn (.primary, .ghost, .danger, .sm, .xs, .block)',
  },
  docs: ['docs/screens/product/experience-contract.md#layout-and-device-behavior'],
  variants: ['secondary', 'primary', 'ghost', 'danger', 'md', 'sm', 'xs', 'block'],
  related: ['IconButton', 'ConfirmSheet'],
} satisfies ComponentMeta
