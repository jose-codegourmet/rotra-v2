import { ErrorState } from '@rotra/ui/error-state'
import { Skeleton } from '@rotra/ui/skeleton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShareDialog } from './ShareDialog'

const meta = {
  title: 'Shared/ShareDialog',
  component: ShareDialog,
  args: {
    open: true,
    onOpenChange: () => {},
    title: 'Share profile',
    children: <Skeleton className="h-80" />,
  },
} satisfies Meta<typeof ShareDialog>
export default meta
type Story = StoryObj<typeof meta>

/** The images are in Shared/ShareImagePicker; these are the dialog's own states. */
export const Loading: Story = { globals: { theme: 'dark' } }
export const LoadingLight: Story = { globals: { theme: 'light' } }
export const LoadError: Story = {
  args: {
    children: (
      <ErrorState title="Couldn't load the share card." onRetry={() => {}}>
        Check your connection and try again.
      </ErrorState>
    ),
  },
  globals: { theme: 'dark' },
}
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
