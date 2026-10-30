import { adminClubOverviews } from '@rotra/data/fixtures/admin-clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ActiveSessionCard } from './ActiveSessionCard'

const session = adminClubOverviews.find((row) => row.runningSession)?.runningSession
const exceptionNote = adminClubOverviews.find((row) => row.sessionException)?.sessionException
if (!session || !exceptionNote) throw new Error('Active session fixtures missing')

const meta = {
  title: 'Admin/ActiveSessionCard',
  component: ActiveSessionCard,
  args: { session },
} satisfies Meta<typeof ActiveSessionCard>

export default meta
type Story = StoryObj<typeof meta>

export const Live: Story = {}
export const Exception: Story = { args: { session: undefined, exceptionNote } }
export const None: Story = { args: { session: undefined } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const LiveLight: Story = { globals: { theme: 'light' } }
export const ExceptionLight: Story = { ...Exception, globals: { theme: 'light' } }
export const NoneLight: Story = { ...None, globals: { theme: 'light' } }
