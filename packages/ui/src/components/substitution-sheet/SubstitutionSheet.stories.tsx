import type { SubstitutionFixture } from '@rotra/data/fixtures/active-matches'
import { activeMatchFixtures } from '@rotra/data/fixtures/active-matches'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import {
  type SubstitutionCredit,
  SubstitutionSheet,
  type SubstitutionSheetProps,
  type SubstitutionStep,
} from './SubstitutionSheet'

const { chosen, doubles } = activeMatchFixtures

const propsFor = (f: SubstitutionFixture): SubstitutionSheetProps => ({
  open: true,
  onOpenChange: fn(),
  matchNo: f.matchNo,
  inMatch: f.inMatch,
  candidates: f.candidates,
  minimumGames: f.minimumGames,
  startedAt: doubles.startedAt,
  now: doubles.now,
  step: 'pick',
  outId: null,
  inId: null,
  creditTo: 'nobody',
  onPickOut: fn(),
  onPickIn: fn(),
  onPickCredit: fn(),
  onReview: fn(),
  onBack: fn(),
  onBackToPick: fn(),
  onConfirm: fn(),
})

const bothChosen = { outId: chosen.outId, inId: chosen.inId }

const meta = {
  title: 'Queue/SubstitutionSheet',
  component: SubstitutionSheet,
  args: propsFor(activeMatchFixtures.substitution),
} satisfies Meta<typeof SubstitutionSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Pick step, nothing chosen yet: person credit cards are disabled; Review substitution is disabled */
export const PickNoneChosen: Story = {}
/** Pick step with both players chosen; Nobody remains the default credit */
export const PickBothChosen: Story = { args: bothChosen }
/** Who gets this game?: the incoming player */
export const PickCreditIncoming: Story = {
  args: { ...bothChosen, creditTo: 'incoming' },
}
/** Who gets this game?: the outgoing player */
export const PickCreditOutgoing: Story = {
  args: { ...bothChosen, creditTo: 'outgoing' },
}
/** Pick step when no present player is free: the Replacement grid gives way to the message */
export const PickNoReplacement: Story = { args: propsFor(activeMatchFixtures.noReplacement) }
/** D-SUBSTITUTE with Nobody: Gets this game Nobody, neither-partial warning */
export const ConfirmNobody: Story = {
  args: { step: 'confirm', ...bothChosen, creditTo: 'nobody' },
}
/** D-SUBSTITUTE with the incoming player credited */
export const ConfirmIncoming: Story = {
  args: { step: 'confirm', ...bothChosen, creditTo: 'incoming' },
}
/** D-SUBSTITUTE with the outgoing player credited */
export const ConfirmOutgoing: Story = {
  args: { step: 'confirm', ...bothChosen, creditTo: 'outgoing' },
}
export const ConfirmPending: Story = {
  args: { step: 'confirm', ...bothChosen, isPending: true },
}
export const ConfirmError: Story = {
  args: {
    step: 'confirm',
    ...bothChosen,
    error: 'Something changed. Review the match again.',
  },
}
/** The local save failed: the match and its lineup are unchanged, the choice stays for the retry */
export const ConfirmSaveFailed: Story = {
  args: {
    step: 'confirm',
    ...bothChosen,
    error: 'Changes could not be saved',
  },
}

function Flow(args: SubstitutionSheetProps) {
  const [step, setStep] = useState<SubstitutionStep>('pick')
  const [outId, setOutId] = useState<string | null>(null)
  const [inId, setInId] = useState<string | null>(null)
  const [creditTo, setCreditTo] = useState<SubstitutionCredit>('nobody')
  return (
    <SubstitutionSheet
      {...args}
      step={step}
      outId={outId}
      inId={inId}
      creditTo={creditTo}
      onPickOut={(id) => {
        args.onPickOut(id)
        setOutId(id)
      }}
      onPickIn={(id) => {
        args.onPickIn(id)
        setInId(id)
      }}
      onPickCredit={(credit) => {
        args.onPickCredit?.(credit)
        setCreditTo(credit)
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

/** Pick both tiles, a credit choice, Review substitution, then Back: the choice is kept */
export const Interactive: Story = { render: (args) => <Flow {...args} /> }

export const Phone: Story = {
  args: { ...bothChosen, creditTo: 'incoming' },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
