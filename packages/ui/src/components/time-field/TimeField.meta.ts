import type { ComponentMeta } from '@rotra/ui/meta'

export const timeFieldMeta = {
  name: 'TimeField',
  description: 'A time-of-day input that holds "HH:mm", such as when a session starts or ends.',
  usage: [
    'Place inside a Field; put the duration or "Ends the next day" note in the Field hint, as session setup does.',
    'Validate with timeField from @rotra/schema/date.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Session setup › Details › Starts, Ends',
  },
  docs: ['docs/coding-conventions.md#6-forms'],
  related: ['Field', 'DatePicker'],
} satisfies ComponentMeta
