import type { ComponentMeta } from '@rotra/ui/meta'

export const postPreviewSheetMeta = {
  name: 'PostPreviewSheet',
  description:
    'The Post preview dialog opened from the Facebook post editor: the template filled in from the current or next session, including unsaved edits, with Back to editing.',
  usage: [
    'Open from FacebookPostEditor.onPreview; the container fills the text with usePostPreview(draft).',
    'Not for copying: the read-only copy dialog is FacebookPostSheet.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-CLUB › SHEETS.postPreview',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['FacebookPostEditor', 'FacebookPostSheet', 'Sheet'],
} satisfies ComponentMeta
