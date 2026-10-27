import { clubPlayers } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import {
  DEFAULT_SAVED_PLAYERS_FILTERS,
  SavedPlayersFilterBar,
  type SavedPlayersFilterBarProps,
} from './SavedPlayersFilterBar'

// Cities found in the saved players' RTR IDs (Queue prototype CITY map).
const CITIES = ['Cebu City', 'Davao City', 'Iloilo City', 'Manila']

function Demo(props: Partial<SavedPlayersFilterBarProps> & { width?: number }) {
  const [value, setValue] = useState(props.value ?? DEFAULT_SAVED_PLAYERS_FILTERS)
  return (
    <div style={{ width: props.width }}>
      <SavedPlayersFilterBar
        value={value}
        onChange={setValue}
        cities={CITIES}
        shownCount={clubPlayers.length}
        totalCount={clubPlayers.length}
        liveSessionTitle={
          props.liveSessionTitle === undefined ? 'Sunday Night Queue' : props.liveSessionTitle
        }
      />
    </div>
  )
}

const meta = {
  title: 'Queue/SavedPlayersFilterBar',
  component: SavedPlayersFilterBar,
  parameters: { layout: 'padded' },
  args: {
    value: DEFAULT_SAVED_PLAYERS_FILTERS,
    onChange: () => {},
    cities: CITIES,
    shownCount: 20,
    totalCount: 20,
    liveSessionTitle: null,
  },
} satisfies Meta<typeof SavedPlayersFilterBar>

export default meta
type Story = StoryObj<typeof meta>

export const Wide: Story = { render: () => <Demo width={1100} /> }
export const Medium: Story = { render: () => <Demo width={800} /> }
export const Narrow: Story = { render: () => <Demo width={343} /> }
export const VeryNarrow: Story = { render: () => <Demo width={320} /> }
export const NoLiveSession: Story = { render: () => <Demo width={800} liveSessionTitle={null} /> }
export const WithActiveFilters: Story = {
  render: () => (
    <Demo
      width={800}
      value={{ ...DEFAULT_SAVED_PLAYERS_FILTERS, band: 'advanced', status: 'registered' }}
    />
  ),
}
