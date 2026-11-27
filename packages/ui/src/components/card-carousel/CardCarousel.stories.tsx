import { AddCourtTile } from '@rotra/ui/add-court-tile'
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  CardCarousel,
  type CardCarouselItem,
  COURT_SLIDE_CLASS,
  SINGLE_SLIDE_CLASS,
} from './CardCarousel'

/** A stand-in for a court card: a title, a line and a button (a drag that starts on it does not swipe). */
function DemoCourt({ n }: { n: number }) {
  return (
    <div className="flex min-h-[180px] flex-col gap-2.5 rounded-lg border border-border-strong bg-surface p-3.5 shadow-card">
      <b>Court {n}</b>
      <span className="text-[13px] text-fg2">Until 10:00 PM</span>
      <button
        type="button"
        className="mt-auto min-h-9 rounded-lg border border-border-strong bg-surface px-3 font-semibold"
      >
        Start match
      </button>
    </div>
  )
}

const items: CardCarouselItem[] = [
  ...[1, 2, 3].map((n) => ({ id: `court-${n}`, node: <DemoCourt n={n} /> })),
  {
    id: 'add',
    node: <AddCourtTile nextNumber={4} onAdd={() => {}} className="h-full w-full" />,
  },
]

const width =
  (px: number): Decorator =>
  (Story) => (
    <div style={{ width: px, maxWidth: '100%' }}>
      <Story />
    </div>
  )

const meta = {
  title: 'Queue/CardCarousel',
  component: CardCarousel,
  args: {
    items,
    label: 'Courts',
    previousLabel: 'Previous court',
    nextLabel: 'Next court',
    dotLabel: (n: number) => `Go to slide ${n}`,
    slideClassName: COURT_SLIDE_CLASS,
  },
} satisfies Meta<typeof CardCarousel>

export default meta
type Story = StoryObj<typeof meta>

/** Phone: one court with the next peeking; the fade shows on the right only */
export const Phone375: Story = { decorators: [width(375)] }
export const Phone375Light: Story = { decorators: [width(375)], globals: { theme: 'light' } }
/** Two slides from 760 px */
export const Wide760: Story = { decorators: [width(760)] }
/** Three slides from 1200 px: all four courts do not fit, so it still fades on the right */
export const Wide1280: Story = { decorators: [width(1280)] }
export const Wide1280Light: Story = { decorators: [width(1280)], globals: { theme: 'light' } }

/** Both sides fade while there are slides before and after */
export const MaskBothSides: Story = { args: { startIndex: 1 }, decorators: [width(375)] }
/** On the last slide only the left side fades */
export const MaskLeftOnly: Story = { args: { startIndex: 3 }, decorators: [width(375)] }

/** Every slide fits: no fade, both arrows disabled */
export const NoOverflow: Story = {
  args: { items: items.slice(0, 2) },
  decorators: [width(1280)],
}

/** One slide a view, as Put a match on Court N uses it */
export const Matches: Story = {
  args: {
    label: 'Matches',
    previousLabel: 'Previous match',
    nextLabel: 'Next match',
    dotLabel: (n: number) => `Go to match ${n}`,
    slideClassName: SINGLE_SLIDE_CLASS,
  },
  decorators: [width(375)],
}

export const Arrows: Story = {
  decorators: [width(375)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Previous court' })).toBeDisabled()
    await userEvent.click(canvas.getByRole('button', { name: 'Next court' }))
    await expect(canvas.getByRole('button', { name: 'Go to slide 2' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  },
}
