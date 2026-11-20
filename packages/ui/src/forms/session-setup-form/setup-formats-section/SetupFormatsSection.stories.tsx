import type { MatchFormat } from '@rotra/data/match/types'
import type { ScoringKey } from '@rotra/schema/scoring'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { fn } from 'storybook/test'
import { sessionSetupDefaultValues } from '../SessionSetupForm.defaultValues'
import type { SetupCardArt } from '../SessionSetupForm.helpers'
import { SetupFormatsSection } from './SetupFormatsSection'

const cardArt: SetupCardArt = {
  chill: '/art/session-setup/chill.webp',
  fair: '/art/session-setup/fair.webp',
  hard: '/art/session-setup/hard.webp',
  p31: '/art/session-setup/p31.webp',
  p21: '/art/session-setup/p21.webp',
  p21x3: '/art/session-setup/p21x3.webp',
}
const all: MatchFormat[] = ['doubles', 'singles', 'fun_1v2', 'fun_3v3', 'fun_4v4', 'fun_5v5']
function Demo({
  initial,
  recordGames = true,
  locked = false,
  scoring = '31',
  scoringLocked = false,
}: {
  initial: MatchFormat[]
  recordGames?: boolean
  locked?: boolean
  scoring?: ScoringKey
  scoringLocked?: boolean
}) {
  const form = useForm({ defaultValues: { ...sessionSetupDefaultValues(), recordGames, scoring } })
  const [formats, setFormats] = useState(initial)
  return (
    <FormProvider {...form}>
      <div className="flex max-w-xl flex-col gap-4">
        <SetupFormatsSection
          recordGamesLocked={locked}
          scoringLocked={scoringLocked}
          cardArt={cardArt}
          allowedRequestFormats={formats}
          onRequestFormatsChange={setFormats}
        />
      </div>
    </FormProvider>
  )
}
const meta = {
  title: 'Queue/SetupFormatsSection',
  component: SetupFormatsSection,
  args: { allowedRequestFormats: [], onRequestFormatsChange: fn() },
} satisfies Meta<typeof SetupFormatsSection>
export default meta
type Story = StoryObj<typeof meta>
export const All: Story = { render: () => <Demo initial={all} /> }
export const Some: Story = { render: () => <Demo initial={['doubles', 'singles']} /> }
export const None: Story = { render: () => <Demo initial={[]} /> }
/** Record games switch off: the hint says no results are kept */
export const RecordGamesOff: Story = { render: () => <Demo initial={all} recordGames={false} /> }
/** After Start: a read-only On chip and "Record games can't change after Start." */
export const RecordGamesLockedOn: Story = { render: () => <Demo initial={all} locked /> }
export const RecordGamesLockedOff: Story = {
  render: () => <Demo initial={all} recordGames={false} locked />,
}
export const RecordGamesOffLight: Story = { ...RecordGamesOff, globals: { theme: 'light' } }
export const RecordGamesLockedOnLight: Story = {
  ...RecordGamesLockedOn,
  globals: { theme: 'light' },
}
export const AllLight: Story = { ...All, globals: { theme: 'light' } }
export const SomeLight: Story = { ...Some, globals: { theme: 'light' } }
export const NoneLight: Story = { ...None, globals: { theme: 'light' } }

/** Scoring: 31 points with Deuce on (the default, 16/31) */
export const Scoring31: Story = { render: () => <Demo initial={all} /> }
/** 31 points with Deuce off: "No deuce: the first to 31 wins." */
export const Scoring31NoDeuce: Story = { render: () => <Demo initial={all} scoring="31nd" /> }
/** 21 points: Deuce is on and disabled, "One game to 21 always plays deuce at 20–20." */
export const Scoring21DeuceLocked: Story = { render: () => <Demo initial={all} scoring="21" /> }
export const Scoring21x3: Story = { render: () => <Demo initial={all} scoring="21x3" /> }
export const Scoring21x3NoDeuce: Story = { render: () => <Demo initial={all} scoring="21x3nd" /> }
/** After Start: Scoring is read-only with "Scoring can't change after Start." */
export const ScoringLockedAfterStart: Story = {
  render: () => <Demo initial={all} locked scoringLocked scoring="21x3" />,
}
export const Scoring31NoDeuceLight: Story = { ...Scoring31NoDeuce, globals: { theme: 'light' } }
export const Scoring21DeuceLockedLight: Story = {
  ...Scoring21DeuceLocked,
  globals: { theme: 'light' },
}
export const ScoringLockedAfterStartLight: Story = {
  ...ScoringLockedAfterStart,
  globals: { theme: 'light' },
}
