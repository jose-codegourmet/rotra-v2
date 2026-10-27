import type { Meta, StoryObj } from '@storybook/react-vite'
import { Icon } from './Icon'
import { ICONS, type IconName } from './Icon.paths'

const meta = {
  title: 'Shared/Icon',
  component: Icon,
  args: { name: 'sun' },
  argTypes: { name: { control: 'select', options: Object.keys(ICONS) } },
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const All: Story = {
  render: () => (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
      {(Object.keys(ICONS) as IconName[]).map((name) => (
        <li
          key={name}
          className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-3 text-fg"
        >
          <Icon name={name} />
          <span className="font-mono text-[12px] text-fg2">{name}</span>
        </li>
      ))}
    </ul>
  ),
}
