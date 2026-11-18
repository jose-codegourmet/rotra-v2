import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AnnouncementBand } from './AnnouncementBand'

const meta = {
  title: 'Player/AnnouncementBand',
  component: AnnouncementBand,
  parameters: { layout: 'fullscreen' },
  args: {
    onRemindLater: () => {},
    children: (
      <>
        <b>Verify your ROTRA account by December 31, 2026.</b> Connect Google, have your phone on
        file, and use your Google email as your ROTRA email. <b>1 of 3 done.</b> Your profile,
        games and rank stay the same.
      </>
    ),
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
