import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RecordTabHeader } from './RecordTabHeader'

const meta = {
  title: 'Queue/RecordTabHeader',
  component: RecordTabHeader,
  args: { title: 'Standings' },
} satisfies Meta<typeof RecordTabHeader>

export default meta
type Story = StoryObj<typeof meta>

/** The Results tab: Result slides and Download images on the right. */
export const WithActions: Story = {
  name: 'With actions',
  args: {
    actions: (
      <>
        <Button size="sm">Result slides</Button>
        <Button size="sm">Download images</Button>
      </>
    ),
  },
}

/** The Players tab: the minimum summary on the right. */
export const WithAside: Story = {
  name: 'With aside',
  args: { title: 'Players', aside: 'Minimum 4 games · 2 below it' },
}

/** The How the night ran tab: the explainer under the title. */
export const WithDescription: Story = {
  name: 'With description',
  args: {
    title: 'How the night ran',
    description:
      'Play or drag the timeline to see the courts at any moment. Every match is listed below by court, in the order it was played; winners are highlighted.',
  },
}
