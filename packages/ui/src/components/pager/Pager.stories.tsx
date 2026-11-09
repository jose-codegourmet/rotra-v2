import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Pager } from './Pager'

const meta = {
  title: 'Shared/Pager',
  component: Pager,
  args: { page: 1, pageCount: 3, onPage: () => {}, 'aria-label': 'Character pages' },
} satisfies Meta<typeof Pager>
export default meta
type Story = StoryObj<typeof meta>
function Demo({ initial }: { initial: number }) {
  const [page, setPage] = useState(initial)
  return <Pager page={page} pageCount={3} onPage={setPage} aria-label="Character pages" />
}
export const First: Story = { render: () => <Demo initial={1} /> }
export const Middle: Story = { render: () => <Demo initial={2} /> }
export const Last: Story = { render: () => <Demo initial={3} /> }
