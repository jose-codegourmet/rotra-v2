import { adminPlayerScenarios, sameNameGroupExamples } from '@rotra/data/fixtures/admin-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SameNameNotice } from './SameNameNotice'

const [, twin] = adminPlayerScenarios.sameName
if (!twin) throw new Error('Same-name fixture missing')

// Annotated, not `satisfies`: with union props, `satisfies` narrows every story's args to the
// meta's 'list' variant, so the 'detail' stories couldn't type-check.
const meta: Meta<typeof SameNameNotice> = {
  title: 'Admin/SameNameNotice',
  component: SameNameNotice,
  args: { variant: 'list', groups: sameNameGroupExamples.one },
  decorators: [
    (Story) => (
      <div className="max-w-[720px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof SameNameNotice>

export const List: Story = {}
export const ListSeveralNames: Story = {
  args: { variant: 'list', groups: sameNameGroupExamples.two },
  globals: { viewport: { value: 'phone' } },
}
export const Detail: Story = {
  args: {
    variant: 'detail',
    twins: [
      { id: twin.id, fullName: twin.fullName, rtrId: twin.rtrId, href: `/players/${twin.id}` },
    ],
  },
}
export const DetailWithButton: Story = {
  args: {
    variant: 'detail',
    twins: [{ id: twin.id, fullName: twin.fullName, rtrId: twin.rtrId }],
    onOpenPlayer: fn(),
  },
}
export const DetailPhone: Story = { args: Detail.args, globals: { viewport: { value: 'phone' } } }
export const DetailDesktop: Story = {
  args: Detail.args,
  globals: { viewport: { value: 'desktop' } },
}
export const ListLight: Story = { globals: { theme: 'light' } }
export const DetailLight: Story = { args: Detail.args, globals: { theme: 'light' } }
