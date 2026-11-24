import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, within } from 'storybook/test'
import type { ExemptionPlayer } from '../player-picker-sheet/PlayerPickerSheet'
import { ExemptionListCard, type ExemptionListCardProps } from './ExemptionListCard'

/** Every present roster player from the bagging fixture, with a few games each; one is away. */
const exemptionPlayers: ExemptionPlayer[] = matchLineupFixtures.bagging.players.map((p, i) => ({
  id: p.id,
  name: p.name,
  shortName: p.shortName,
  level: p.level,
  games: i % 5,
  present: i % 7 !== 6,
}))

function Demo(args: ExemptionListCardProps) {
  const [ids, setIds] = useState(args.exemptIds)
  return (
    <div className="max-w-[360px]">
      <ExemptionListCard
        {...args}
        exemptIds={ids}
        onSave={(next) => {
          args.onSave(next)
          setIds(next)
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Queue/ExemptionListCard',
  component: ExemptionListCard,
  args: { players: exemptionPlayers, exemptIds: [], onSave: fn() },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof ExemptionListCard>

export default meta
type Story = StoryObj<typeof meta>

/** No one exempt: Choose players is the primary and the dashed button invites a pick. */
export const Empty: Story = {}

/** Several exempt: Edit list and one chip per player, each picture ringed by level. */
export const Several: Story = {
  args: { exemptIds: exemptionPlayers.slice(0, 5).map((p) => p.id) },
}

/** Choose players opens the Exemption list sheet; Save list stores the picks. */
export const Choosing: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Choose players' }))
    const body = within(canvasElement.ownerDocument.body)
    await expect(await body.findByRole('button', { name: 'Save list' })).toBeVisible()
  },
}

export const Disabled: Story = {
  args: { disabled: true, exemptIds: exemptionPlayers.slice(0, 2).map((p) => p.id) },
}
export const Phone: Story = {
  args: { exemptIds: exemptionPlayers.slice(0, 5).map((p) => p.id) },
  globals: { viewport: { value: 'phone' } },
}
