import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Toaster, toast } from './Toaster'

const meta = {
  title: 'Shared/Toast',
  component: Toaster,
  decorators: [
    (Story) => (
      <>
        <Story />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => toast.success('Match 3 started')}>Success toast</Button>
          <Button onClick={() => toast('Light mode')}>Plain toast</Button>
          <Button
            variant="danger"
            onClick={() =>
              toast.error("You're offline, so nothing was saved. Try again once you're connected.")
            }
          >
            Error toast
          </Button>
        </div>
      </>
    ),
  ],
} satisfies Meta<typeof Toaster>

export default meta

export const Default: StoryObj<typeof meta> = {}
export const Phone: StoryObj<typeof meta> = { globals: { viewport: { value: 'phone' } } }
