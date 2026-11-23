import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PublicHosts } from './PublicHosts'

const meta = {
  title: 'Queue/PublicSession/PublicHosts',
  component: PublicHosts,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[760px]">
        <Story />
      </div>
    ),
  ],
  args: {
    hosts: [
      { id: 'h1', name: 'M*** S***', skillGroup: 'intermediate', levelLabel: 'Intermediate' },
      { id: 'h2', name: 'G** T*****', skillGroup: null, levelLabel: null },
    ],
  },
} satisfies Meta<typeof PublicHosts>

export default meta
type Story = StoryObj<typeof meta>

/** All stories support both themes through the Theme toolbar. */
export const Visitor: Story = {}
export const OneHost: Story = { args: { hosts: [{ id: 'h1', name: 'M*** S***' }] } }
/** Zero hosts: the section is hidden. */
export const NoHosts: Story = { args: { hosts: [] } }
export const SignedIn: Story = {
  args: {
    hosts: [
      {
        id: 'h1',
        name: 'Miguel Santos',
        nickname: 'Migs',
        masked: false,
        profile: 'registered',
        skillGroup: 'intermediate',
        levelLabel: 'Intermediate',
      },
      { id: 'h2', name: 'G** T*****', profile: 'guest' },
    ],
    onOpenHost: fn(),
  },
}
export const ManyHostsPhone: Story = {
  args: {
    hosts: ['Ana Cruz', 'Ben Reyes', 'Carla Dizon', 'Dan Lim', 'Eli Tan'].map((n, i) => ({
      id: `h${i}`,
      name: n,
      masked: false,
    })),
  },
  globals: { viewport: { value: 'phone' } },
}
/**
 * The session record's Players tab (#1008): the club's own view of a finished session's hosts, full
 * names kept at the finish, with the note that later changes don't touch them.
 */
export const SessionRecord: Story = {
  args: {
    hosts: [{ id: 'h1', name: 'Aaron', masked: false }],
    note: "The hosts this session ended with. Removing a trusted host or a saved player later doesn't change them.",
  },
}
export const SessionRecordLightPhone: Story = {
  args: SessionRecord.args,
  globals: { theme: 'light', viewport: { value: 'phone' } },
}
