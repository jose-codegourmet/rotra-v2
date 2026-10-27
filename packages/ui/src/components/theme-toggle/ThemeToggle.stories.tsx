import { ThemeProvider } from '@rotra/ui/theme-provider'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useGlobals } from 'storybook/preview-api'
import { ThemeToggle } from './ThemeToggle'

const meta = {
  title: 'Shared/ThemeToggle',
  component: ThemeToggle,
  // Clicking the toggle also moves the Theme toolbar, so the two always agree.
  decorators: [
    (Story) => {
      const [, updateGlobals] = useGlobals()
      return (
        <ThemeProvider
          storageKey="storybook-theme"
          onThemeChange={(theme) => updateGlobals({ theme })}
        >
          <div className="flex items-center gap-3 text-fg">
            <Story />
            <span className="text-[13px] text-fg2">Click to switch theme</span>
          </div>
        </ThemeProvider>
      )
    },
  ],
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Phone: Story = {
  globals: { viewport: { value: 'phone' } },
}
