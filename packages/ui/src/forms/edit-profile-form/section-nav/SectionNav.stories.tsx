import type { Meta, StoryObj } from '@storybook/react-vite'
import { SectionNav } from './SectionNav'

const meta = {
  title: 'Player/EditProfileForm/SectionNav',
  component: SectionNav,
  args: {
    items: [
      { id: 'name', label: 'Name', errorCount: 0, dirty: false },
      { id: 'playing-style', label: 'Playing style', errorCount: 0, dirty: false },
      { id: 'links', label: 'Links', errorCount: 0, dirty: false },
      { id: 'account', label: 'Account', errorCount: 0, dirty: false },
    ],
    selectedId: 'name',
    onSelect: () => {},
    panelId: 'story-panel',
    tabIdPrefix: 'story-tab',
  },
  decorators: [(Story) => <div className="max-w-[200px] max-[720px]:max-w-none">{Story()}</div>],
} satisfies Meta<typeof SectionNav>
export default meta
type Story = StoryObj<typeof meta>
export const Clean: Story = {}
export const DirtyAndErrors: Story = {
  args: {
    items: [
      { id: 'name', label: 'Name', errorCount: 0, dirty: true },
      { id: 'playing-style', label: 'Playing style', errorCount: 2, dirty: true },
      { id: 'links', label: 'Links', errorCount: 0, dirty: true },
      { id: 'account', label: 'Account', errorCount: 0, dirty: false },
    ],
    selectedId: 'playing-style',
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
