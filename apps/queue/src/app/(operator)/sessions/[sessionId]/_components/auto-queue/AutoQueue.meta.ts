import type { ComponentMeta } from '@rotra/ui/meta'

export const autoQueueMeta = {
  name: 'AutoQueue',
  description:
    'The Auto queue sheet container (Q-AUTO): AutoQueueSheet on useAutoQueue, with the session\'s mode, formats, present count and minimum from useQueueSession and useSessionRoster, 3 matches preselected.',
  usage: [
    'Mounted once by SessionConsole and opened by Auto queue in the Queue view. The count lives here and resets to 3 whenever the sheet closes.',
    'Generate N matches toasts the mutation message ("N matches added to the queue"), closes and calls onAdded so the shell switches to the Queue tab.',
    'A generation refusal ("Only N players are present. Doubles needs 4. Mark arrivals present in Players.", both formats off) stays in the sheet and the queue is unchanged; a save failure (retryable, offline) is an error toast.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-queue.md#q-auto--generate-several-waiting-matches',
    'docs/business_logic/product/queue/modules/queueing/README.md#auto-queue',
  ],
  related: ['AutoQueueSheet', 'SuggestMatch', 'MatchLineup', 'QueueView', 'SessionConsole'],
} satisfies ComponentMeta
