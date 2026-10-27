import type { SubstitutionFixture } from '@rotra/data/fixtures/active-matches'
import { activeMatchFixtures } from '@rotra/data/fixtures/active-matches'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import {
  SubstitutionSheet,
  type SubstitutionSheetProps,
  type SubstitutionStep,
} from './SubstitutionSheet'

const propsFor = (f: SubstitutionFixture): SubstitutionSheetProps => ({
  open: true,
  onOpenChange: fn(),
  matchNo: f.matchNo,
  inMatch: f.inMatch,
  candidates: f.candidates,
  minimumGames: f.minimumGames,
  step: 'pick',
  outId: null,
  inId: null,
  onPickOut: fn(),
  onPickIn: fn(),
  onReview: fn(),
  onBack: fn(),
  onBackToPick: fn(),
  onConfirm: fn(),
})

const { chosen } = activeMatchFixtures

const meta = {
  title: 'Queue/SubstitutionSheet',
  component: SubstitutionSheet,
  args: propsFor(activeMatchFixtures.substitution),
} satisfies Meta<typeof SubstitutionSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Pick step, nothing chosen yet: Review substitution is disabled */
export const PickNoneChosen: Story = {}
/** Pick step with both the outgoing player and the replacement chosen */
export const PickBothChosen: Story = { args: { outId: chosen.outId, inId: chosen.inId } }
/** Pick step when no present player is free: the Replacement grid gives way to the message */
export const PickNoReplacement: Story = { args: propsFor(activeMatchFixtures.noReplacement) }
/** D-SUBSTITUTE: Out, In with level, Team and the partial-game warning */
export const Confirm: Story = { args: { step: 'confirm', outId: chosen.outId, inId: chosen.inId } }
export const ConfirmPending: Story = {
  args: { step: 'confirm', outId: chosen.outId, inId: chosen.inId, isPending: true },
}
export const ConfirmError: Story = {
  args: {
    step: 'confirm',
    outId: chosen.outId,
    inId: chosen.inId,
    error: 'Something changed. Review the match again.',
  },
}

function Flow(args: SubstitutionSheetProps) {
  const [step, setStep] = useState<SubstitutionStep>('pick')
  const [outId, setOutId] = useState<string | null>(null)
  const [inId, setInId] = useState<string | null>(null)
  return (
    <SubstitutionSheet
      {...args}
      step={step}
      outId={outId}
      inId={inId}
      onPickOut={(id) => {
        args.onPickOut(id)
        setOutId(id)
      }}
      onPickIn={(id) => {
        args.onPickIn(id)
        setInId(id)
      }}
      onReview={() => {
        args.onReview()
        setStep('confirm')
      }}
      onBackToPick={() => {
        args.onBackToPick()
        setStep('pick')
      }}
    />
  )
}

/** Pick both tiles, Review substitution, then Back: the choice is kept */
export const Interactive: Story = { render: (args) => <Flow {...args} /> }

export const Phone: Story = {
  args: { outId: chosen.outId, inId: chosen.inId },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
