import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ConsoleFooterBar } from './ConsoleFooterBar'

const { matches } = consoleSessionFixture
const count = (state: (typeof matches)[number]['state']) =>
  matches.filter((m) => m.state === state).length

const meta = {
  title: 'Queue/ConsoleFooterBar',
  component: ConsoleFooterBar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="min-h-[200px]">
        <Story />
      </div>
    ),
  ],
  args: {
    gamesRecorded: count('completed'),
    inPlay: count('active'),
    waiting: count('waiting'),
    online: true,
    onSessionDone: fn(),
  },
} satisfies Meta<typeof ConsoleFooterBar>

export default meta
type Story = StoryObj<typeof meta>

export const Online: Story = {}

/** Session done needs internet: disabled with the connect hint. */
export const Offline: Story = { args: { online: false } }

/** No handler yet: Session done stays disabled. */
export const WithoutHandler: Story = { args: { onSessionDone: undefined } }

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

/** Hidden at 900 px and below: the dock carries Session done. */
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
