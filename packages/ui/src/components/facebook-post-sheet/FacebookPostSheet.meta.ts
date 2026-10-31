import type { ComponentMeta } from '@rotra/ui/meta'

export const facebookPostSheetMeta = {
  name: 'FacebookPostSheet',
  description:
    'The Facebook post dialog from preparation and the live console: the club template filled in from the session, read-only, with Copy post and Edit template.',
  usage: [
    'Open from "Copy Facebook post"; the container fills the text with useFacebookPost(sessionId), copies to the clipboard in onCopy and, when copying is blocked, selects the textarea through textareaRef and says so in a toast.',
    'Edit template goes to Club settings › Facebook post.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE / Q-CONSOLE › SHEETS.post',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/screens/product/modules/queue/access-home.md',
  ],
  related: ['FacebookPostEditor', 'PostPreviewSheet', 'Sheet'],
} satisfies ComponentMeta
