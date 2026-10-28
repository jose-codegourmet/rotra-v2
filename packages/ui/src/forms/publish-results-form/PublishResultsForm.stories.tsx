import { resultExportFixtures } from '@rotra/data/fixtures/result-exports'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PublishResultsForm } from './PublishResultsForm'
import { publishResultsFormDefaultValues } from './PublishResultsForm.defaultValues'

const { offDayNames, standingsCount } = resultExportFixtures

const meta = {
  title: 'Queue/PublishResultsForm',
  component: PublishResultsForm,
  args: {
    open: true,
    onOpenChange: fn(),
    defaultValues: publishResultsFormDefaultValues(),
    offDayNames,
    standingsCount,
    hasMostImproved: true,
    online: true,
    onSubmit: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof PublishResultsForm>

export default meta
type Story = StoryObj<typeof meta>

/** First publish: Standings and Awards on, Include Off Day off. */
export const FirstPublish: Story = {}

/** Updating: the previous publication had only Standings; Off Day stays off even though it was shared before. */
export const Update: Story = {
  args: {
    defaultValues: publishResultsFormDefaultValues({ standings: true, awards: false }),
  },
}

/** Off Day names it would show publicly. */
export const OffDayNames: Story = { args: { offDayNames } }

/** No one had an off day: "Empty for this session." */
export const OffDayEmpty: Story = { args: { offDayNames: [], hasMostImproved: false } }

/** Nothing chosen: Publish selected results is disabled. */
export const NothingSelected: Story = {
  args: { defaultValues: { standings: false, awards: false, includeOffDay: false } },
}

/** Offline: "Publishing needs internet." and the primary action disabled. */
export const Offline: Story = { args: { online: false } }

export const Pending: Story = { args: { isPending: true } }

export const ServerError: Story = {
  args: {
    serverError:
      "Couldn't publish the results. The previous publication is unchanged; check your connection and try again.",
  },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
