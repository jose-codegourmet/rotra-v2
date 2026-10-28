import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from './Skeleton'

const meta = {
  title: 'Shared/States/Skeleton',
  component: Skeleton,
  args: { className: 'w-40' },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Line: Story = {}

// The player prototype's leaderboard while loading: rank, picture, name and level bars.
export const LeaderboardRows: Story = {
  render: () => (
    <section
      aria-busy="true"
      aria-label="Loading the leaderboard"
      className="flex flex-col divide-y divide-border"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[28px_36px_minmax(0,1fr)_110px] items-center gap-3 py-2.5"
        >
          <Skeleton className="w-7 justify-self-end" />
          <span className="size-9 rounded-full bg-elev" />
          <Skeleton className="max-w-full" />
          <Skeleton className="w-[110px]" />
        </div>
      ))}
    </section>
  ),
}

export const NamedLoadingRegion: Story = { args: { label: 'Loading Admin page', className: 'h-8 w-52' } }
