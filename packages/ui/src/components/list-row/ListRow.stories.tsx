import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ListRow } from './ListRow'

const meta = {
  title: 'Shared/ListRow',
  component: ListRow,
  args: {
    leading: <Avatar name="Miguel Santos" />,
    title: 'Miguel Santos',
    subtitle: 'RTR-PH-CEB-031526-0001',
    trailing: <Chip tone="accent">Registered</Chip>,
  },
} satisfies Meta<typeof ListRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Clickable: Story = { args: { onClick: () => {} } }

export const InList: Story = {
  render: () => (
    <Card padding="none" className="px-4">
      <div className="divide-y divide-border">
        <ListRow
          leading={<Avatar name="Miguel Santos" />}
          title="Miguel Santos"
          subtitle="Intermediate Mid"
          trailing={<Chip tone="accent">Registered</Chip>}
        />
        <ListRow
          leading={<Avatar name="Jomar dela Cruz" />}
          title="Jomar dela Cruz"
          subtitle="Intermediate Low"
          trailing={<Chip>Unclaimed</Chip>}
        />
        <ListRow
          leading={<Avatar name="Lia Bautista" />}
          title="Lia Bautista"
          subtitle="Guest"
          trailing={<Chip tone="warn">Lookup pending</Chip>}
        />
      </div>
    </Card>
  ),
}

export const LongNameWraps: Story = {
  args: {
    title: 'Jomar dela Cruz Bautista Villareal Fernandez',
    subtitle: 'RTR-PH-CEB-040226-0007',
  },
  globals: { viewport: { value: 'phone' } },
}

export const LongNameTruncates: Story = {
  args: {
    title: 'Jomar dela Cruz Bautista Villareal Fernandez',
    subtitle: 'RTR-PH-CEB-040226-0007',
    truncate: true,
  },
  globals: { viewport: { value: 'phone' } },
}
