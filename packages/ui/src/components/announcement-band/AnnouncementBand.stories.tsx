import { GOOGLE_SIGN_IN_DEADLINE } from '@rotra/data/google-sign-in/config'
import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AnnouncementBand } from './AnnouncementBand'

const meta = {
  title: 'Player/AnnouncementBand',
  component: AnnouncementBand,
  parameters: { layout: 'fullscreen' },
  args: {
    onRemindLater: () => {},
    verification: { deadline: GOOGLE_SIGN_IN_DEADLINE.label, completedSteps: 1 },
    actions: (
      <Button size="xs" variant="primary">
        Connect Google
      </Button>
    ),
  },
} satisfies Meta<typeof AnnouncementBand>
export default meta
type Story = StoryObj<typeof meta>

const twoActions = (
  <>
    <Button size="xs" variant="primary">
      Connect Google
    </Button>
    <Button size="xs">Use another Google account</Button>
    <Button size="xs" variant="ghost">
      I don't have a Google account
    </Button>
  </>
)

export const BeforeDeadlineOneAction: Story = {}
export const BeforeDeadlineTwoActions: Story = { args: { actions: twoActions } }
export const AfterDeadlineOneAction: Story = { args: { afterDeadline: true } }
export const AfterDeadlineTwoActions: Story = {
  args: { afterDeadline: true, actions: twoActions },
}
export const BeforeDeadlineLight: Story = { globals: { theme: 'light' } }
export const BeforeDeadlineTwoActionsLight: Story = {
  args: { actions: twoActions },
  globals: { theme: 'light' },
}
export const AfterDeadlineLight: Story = {
  args: { afterDeadline: true },
  globals: { theme: 'light' },
}
export const Phone: Story = {
  args: { actions: twoActions },
  globals: { viewport: { value: 'phone' } },
}

export const FinishVerification: Story = {
  args: {
    verification: { deadline: GOOGLE_SIGN_IN_DEADLINE.label, completedSteps: 2 },
    actions: (
      <>
        <Button size="xs" variant="primary">
          Finish verification
        </Button>
        <Button size="xs" variant="ghost">
          See what's left
        </Button>
      </>
    ),
  },
}
