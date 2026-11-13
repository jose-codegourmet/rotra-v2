import type { PlayingLevel } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn, within } from 'storybook/test'
import { LevelSelectMenu, type LevelSelectMenuProps } from './LevelSelectMenu'

function Stateful(args: LevelSelectMenuProps) {
  const [value, setValue] = useState<PlayingLevel | null>(args.value)
  return (
    <LevelSelectMenu
      {...args}
      value={value}
      onChange={(level) => {
        setValue(level)
        args.onChange(level)
      }}
    />
  )
}

const meta = {
  title: 'Queue/LevelSelectMenu',
  component: LevelSelectMenu,
  render: (args) => <Stateful {...args} />,
  args: {
    value: 'intermediate_mid',
    onChange: fn(),
    'aria-label': 'Level for Jose Buctuanon at this club',
  },
  decorators: [
    (Story) => (
      <div className="max-w-[280px] pb-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LevelSelectMenu>

export default meta
type Story = StoryObj<typeof meta>

const openMenu: Story['play'] = async ({ canvasElement, userEvent }) => {
  await userEvent.click(await within(canvasElement).findByRole('button', { name: /^Level for/ }))
}

export const Intermediate: Story = {}
export const Beginner: Story = { args: { value: 'beginner_low' } }
export const Advanced: Story = { args: { value: 'advanced_high' } }
/** No level: dashed and muted, "Choose a level…" */
export const NoLevel: Story = { args: { value: null } }
export const Open: Story = { play: openMenu }
export const OpenLight: Story = { play: openMenu, globals: { theme: 'light' } }
export const OpenNoLevel: Story = { args: { value: null }, play: openMenu }
export const Phone: Story = { play: openMenu, globals: { viewport: { value: 'phone' } } }
