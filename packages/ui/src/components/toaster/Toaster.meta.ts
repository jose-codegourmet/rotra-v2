import type { ComponentMeta } from '@rotra/ui/meta'

export const toasterMeta = {
  name: 'Toaster',
  description:
    'Short confirmations after a saved action ("Match 3 started", "Light mode"), and failure messages, at the bottom centre.',
  usage: [
    "Mount <Toaster /> once in each app's providers. Call toast() / toast.success() from the container after a mutation succeeds, and toast.error() when it fails.",
    'Never toast success for something that was not saved; failures in a dialog stay in the dialog (ConfirmSheet error).',
    'Keep copy short and from the prototype; toasts disappear after 3.6 s.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Shared styles › .toasts, .toast; toast()',
  },
  docs: ['docs/screens/product/experience-contract.md#accessibility-and-interaction'],
  variants: ['success', 'error'],
  related: ['Notice', 'ConfirmSheet'],
} satisfies ComponentMeta
