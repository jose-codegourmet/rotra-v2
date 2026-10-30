import { adminPlayerScenarios } from '@rotra/data/fixtures/admin-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PlayerIdentityCell } from './PlayerIdentityCell'

const { jose, nicknamed, longNames } = adminPlayerScenarios

const meta = {
  title: 'Admin/PlayerIdentityCell',
  component: PlayerIdentityCell,
  args: {
    variant: 'directory',
    fullName: nicknamed.fullName,
    nickname: nicknamed.nickname,
    rtrId: nicknamed.rtrId,
    href: `/players/${nicknamed.id}`,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[320px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlayerIdentityCell>

export default meta
type Story = StoryObj<typeof meta>

export const Directory: Story = {}
export const DirectoryNoNickname: Story = {
  args: { fullName: jose.fullName, nickname: jose.nickname, href: `/players/${jose.id}` },
}
export const Request: Story = {
  args: {
    variant: 'request',
    fullName: jose.fullName,
    nickname: jose.nickname,
    rtrId: jose.rtrId,
    href: undefined,
  },
}
export const LongName: Story = {
  args: {
    fullName: longNames.fullName,
    nickname: longNames.nickname,
    rtrId: longNames.rtrId,
    href: `/players/${longNames.id}`,
  },
  globals: { viewport: { value: 'phone' } },
}
export const LongNameRequest: Story = {
  args: { ...LongName.args, variant: 'request', href: undefined },
  globals: { viewport: { value: 'phone' } },
}
export const AsButton: Story = { args: { href: undefined, onOpen: fn() } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
