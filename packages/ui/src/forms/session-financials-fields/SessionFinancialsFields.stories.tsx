import { financialEstimateVariants, shuttlePlanItems } from '@rotra/data/fixtures/financials'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { fn } from 'storybook/test'
import { SessionFinancialsFields, type SessionFinancialsFieldsProps } from './SessionFinancialsFields'
import { sessionFinancialsDefaultValues } from './SessionFinancialsFields.defaultValues'
import { type SessionFinancialsInput, type SessionFinancialsValues, sessionFinancialsSchema } from './SessionFinancialsFields.schema'

function Example({ values, validate, ...args }: SessionFinancialsFieldsProps & { values?: Partial<SessionFinancialsInput>; validate?: boolean }) {
  const form = useForm<SessionFinancialsInput, unknown, SessionFinancialsValues>({ resolver: zodResolver(sessionFinancialsSchema), defaultValues: { ...sessionFinancialsDefaultValues, ...values } })
  useEffect(() => { if (validate) void form.trigger() }, [validate, form])
  return <FormProvider {...form}><form className="flex flex-col gap-4" onSubmit={form.handleSubmit(fn())}><SessionFinancialsFields {...args} /><Button type="submit">Check fields</Button></form></FormProvider>
}
const meta = { title: 'Queue/SessionFinancialsFields', component: Example, args: { courts: 3, durationMinutes: 180, players: 18, shuttleItems: shuttlePlanItems, computeEstimate: () => financialEstimateVariants.profit, onManageInventory: fn() } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = { args: { computeEstimate: () => financialEstimateVariants.noCosts } }
export const PrefilledFromVenue: Story = { args: { venueRate: { venueName: 'Talamban Shuttle Courts', courtFee: 35000, entranceFee: 6000 }, values: { courtFeePerCourtHour: '350', entranceFeePerHead: '60', shuttles: [{ inventoryItemId: 'inv1', tubes: 4 }, { inventoryItemId: 'inv2', tubes: 2 }] } } }
export const CustomProfit: Story = { args: { values: { ...PrefilledFromVenue.args?.values, paymentMode: 'custom', customFeePerHead: '700' } } }
export const CustomLoss: Story = { args: { computeEstimate: () => financialEstimateVariants.loss, values: { ...CustomProfit.args?.values, customFeePerHead: '600' } } }
export const OverStock: Story = { args: { values: { shuttles: [{ inventoryItemId: 'inv3', tubes: 4 }] } } }
export const NoShuttlecocks: Story = { args: { shuttleItems: [] } }
export const ValidationErrors: Story = { args: { values: { courtFeePerCourtHour: '-1', paymentMode: 'custom' }, validate: true } }
