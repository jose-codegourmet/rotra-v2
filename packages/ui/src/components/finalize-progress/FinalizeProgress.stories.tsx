import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FinalizeProgress, type FinalizeStage } from './FinalizeProgress'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')

// The four UI stages from session-finalization.md, in order.
const LABELS = [
  'Checking session records',
  'Finishing the session',
  'Updating player records',
  'Preparing result slides',
]

/** Stages with the first `done` finished, the next current, the rest pending. */
function stagesAt(done: number): FinalizeStage[] {
  return LABELS.map((label, index) => ({
    label,
    status: index < done ? 'done' : index === done ? 'current' : 'pending',
  }))
}

const meta = {
  title: 'Queue/FinalizeProgress',
  component: FinalizeProgress,
  args: { sessionTitle: tonight.title, stages: stagesAt(0) },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-[760px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FinalizeProgress>

export default meta
type Story = StoryObj<typeof meta>

export const Stage1: Story = { name: 'Stage 1', args: { stages: stagesAt(0) } }
export const Stage2: Story = { name: 'Stage 2', args: { stages: stagesAt(1) } }
export const Stage3: Story = { name: 'Stage 3', args: { stages: stagesAt(2) } }
export const Stage4: Story = { name: 'Stage 4', args: { stages: stagesAt(3) } }
export const Done: Story = { args: { stages: stagesAt(4) } }

export const SlidesStillProcessing: Story = {
  name: 'Slides still processing',
  args: {
    stages: stagesAt(3),
    statusLine: 'Session finished; results are being prepared',
  },
}

export const RetryableError: Story = {
  name: 'Retryable error',
  args: {
    stages: stagesAt(3),
    statusLine: 'Session finished; results are being prepared',
    error: {
      message:
        "Result slides couldn't be prepared. Your session is finished and player records are updated.",
      onRetry: fn(),
    },
  },
}

export const Phone: Story = {
  args: { stages: stagesAt(2) },
  globals: { viewport: { value: 'phone' } },
}

export const Desktop: Story = {
  args: { stages: stagesAt(2) },
  globals: { viewport: { value: 'desktop' } },
}
