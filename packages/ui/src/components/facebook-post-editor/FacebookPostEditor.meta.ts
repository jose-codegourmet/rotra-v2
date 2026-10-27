import type { ComponentMeta } from '@rotra/ui/meta'

export const facebookPostEditorMeta = {
  name: 'FacebookPostEditor',
  description:
    'Club settings › Facebook post: the post template with a key list that inserts {{ keys }} at the cursor, plus the club description and court rules, on three tabs saved by one Save post template button.',
  usage: [
    'The draft is controlled: the container keeps { template, description, courtRules }, passes `dirty` (differs from the saved club), `canPreview` (a session exists) and the POST_KEYS list from @rotra/data.',
    'Preview opens PostPreviewSheet with the current draft; Reset asks the container to restore the default template.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-CLUB › viewClub() #club-post (.tpl-edit, .tpl-keys)',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['PostPreviewSheet', 'FacebookPostSheet', 'Tabs', 'Textarea'],
} satisfies ComponentMeta
