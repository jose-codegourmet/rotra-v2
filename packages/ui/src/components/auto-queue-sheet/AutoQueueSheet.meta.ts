import type { ComponentMeta } from '@rotra/ui/meta'

export const autoQueueSheetMeta = {
  name: 'AutoQueueSheet',
  description:
    'Q-AUTO: the session facts generation uses (mode, formats, present players, priority), the number of matches to add (2, 3, 4 or 6; 3 preselected) and Generate N matches. A failure shows its reason in the sheet.',
  usage: [
    'Open it from Auto queue on the Queue tab. The container owns the count (start it at 3), runs useAutoQueue on Generate, closes on success with the toast "N matches added to the queue", and passes the failure reason back as error.',
    'The count buttons are the prototype\'s placeholder control; the default number per run is an open decision, and the hint under them says so. Keep it until that is decided.',
    'Do not use it to add one match; that is Add match, Make match or Suggest.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-AUTO › SHEETS.auto',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
    'docs/business_logic/product/open-decisions.md',
  ],
  related: ['SuggestedMatchSheet', 'RegenerateQueueSheet', 'KeyValueList', 'Sheet'],
} satisfies ComponentMeta
