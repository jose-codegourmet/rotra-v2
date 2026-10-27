import type { ComponentMeta } from '@rotra/ui/meta'

export const facebookPostMeta = {
  name: 'FacebookPost',
  description:
    'The Copy Facebook post dialog container (FacebookPostSheet on useFacebookPost): copies to the clipboard, or selects the text when the browser blocks copying; Edit template opens Club settings.',
  usage: ['Opened from preparation and the live console; keep one instance per page.'],
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['FacebookPostSheet'],
} satisfies ComponentMeta
