'use client'

import { formatPeso, moneyField } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { CostEstimateSummary, type CostEstimate } from '@rotra/ui/cost-estimate-summary'
import { Field } from '@rotra/ui/field'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { ShuttlePlanRow, type ShuttlePlanItem } from '@rotra/ui/shuttle-plan-row'
import { TextInput } from '@rotra/ui/text-input'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import type {
  SessionFinancialsInput,
  SessionFinancialsValues,
} from './SessionFinancialsFields.schema'

export type FinancialsContext = {
  courts: number
  durationMinutes: number
  players: number
  inventory: ShuttlePlanItem[]
}
export type SessionFinancialsFieldsProps = {
  courts: number
  durationMinutes: number
  players: number
  shuttleItems: ShuttlePlanItem[]
  venueRate?: { venueName: string; courtFee?: number | null; entranceFee?: number | null }
  clubDefaultEntranceFee?: number | null
  computeEstimate: (values: SessionFinancialsValues, context: FinancialsContext) => CostEstimate
  disabled?: boolean
  onManageInventory: () => void
}

const minor = (value: string | undefined) => {
  const parsed = moneyField.safeParse(value)
  return parsed.success ? parsed.data : null
}
const possessive = (name: string) => (/s$/i.test(name) ? `${name}'` : `${name}'s`)

/** A section of the parent setup FormProvider. It never creates a form or saves data. */
export function SessionFinancialsFields({
  courts,
  durationMinutes,
  players,
  shuttleItems,
  venueRate,
  clubDefaultEntranceFee,
  computeEstimate,
  onManageInventory,
  disabled,
}: SessionFinancialsFieldsProps) {
  const form = useFormContext<SessionFinancialsInput>()
  const values = useWatch({ control: form.control })
  const lines = useFieldArray({ control: form.control, name: 'shuttles' })
  const { errors, isSubmitting } = form.formState
  const fieldsDisabled = isSubmitting || disabled
  // Invalid typing is still displayed in the fields; the preview uses only valid amounts.
  const estimate = computeEstimate(
    {
      courtFeePerCourtHour: minor(values.courtFeePerCourtHour),
      entranceFeePerHead: minor(values.entranceFeePerHead),
      customFeePerHead: minor(values.customFeePerHead),
      paymentMode: values.paymentMode ?? 'break_even',
      shuttles: (values.shuttles ?? []).map((line) => ({
        inventoryItemId: line?.inventoryItemId ?? '',
        tubes:
          typeof line?.tubes === 'number' && Number.isFinite(line.tubes)
            ? Math.max(0, Math.trunc(line.tubes))
            : 0,
      })),
    },
    { courts, durationMinutes, players, inventory: shuttleItems },
  )
  const sourceEntrance = venueRate?.entranceFee ?? clubDefaultEntranceFee
  const entranceLabel =
    venueRate?.entranceFee != null
      ? `${possessive(venueRate.venueName)} entrance fee`
      : "Your club's default entrance fee"
  const sourceHint = (
    name: 'courtFeePerCourtHour' | 'entranceFeePerHead',
    amount: number | null | undefined,
    label: string,
  ) =>
    amount == null ? null : (
      <span className="block">
        {minor(values[name]) === amount ? (
          `${name === 'courtFeePerCourtHour' ? 'Filled in from ' : ''}${label}. Changing it here only affects this session.`
        ) : (
          <>
            {label} is {formatPeso(amount)}.{' '}
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                form.setValue(name, String(amount / 100), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              Use it
            </Button>
          </>
        )}
      </span>
    )
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="m-0 text-sm text-fg2">
        All optional. These are estimates to help you set a fair fee. ROTRA doesn't collect money.
        You can tick who has paid on the session's Payments list.
      </p>
      <div className="grid gap-4 min-[700px]:grid-cols-2">
        <Field
          label="Court fee per hour, per court"
          error={errors.courtFeePerCourtHour?.message}
          hint={
            <>
              {courts} courts × {durationMinutes / 60}h = {formatPeso(estimate.court)}
              {sourceHint(
                'courtFeePerCourtHour',
                venueRate?.courtFee,
                `${possessive(venueRate?.venueName ?? '')} saved rate`,
              )}
            </>
          }
        >
          <Controller
            control={form.control}
            name="courtFeePerCourtHour"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <span aria-hidden>₱</span>
                <TextInput
                  {...field}
                  inputMode="decimal"
                  placeholder="0"
                  disabled={fieldsDisabled}
                />
              </div>
            )}
          />
        </Field>
        <Field
          label="Entrance fee per head"
          optional
          error={errors.entranceFeePerHead?.message}
          hint={
            <>
              A misc fee some venues charge each player. It's listed in the costs for transparency
              and covered by the payment per player.
              {sourceHint('entranceFeePerHead', sourceEntrance, entranceLabel)}
            </>
          }
        >
          <Controller
            control={form.control}
            name="entranceFeePerHead"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <span aria-hidden>₱</span>
                <TextInput
                  {...field}
                  inputMode="decimal"
                  placeholder="0"
                  disabled={fieldsDisabled}
                />
              </div>
            )}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="m-0 text-sm font-semibold text-fg2">Shuttlecocks</h4>
        {shuttleItems.length ? (
          <>
            {lines.fields.map((line, index) => (
              <ShuttlePlanRow
                key={line.id}
                items={shuttleItems}
                inventoryItemId={values.shuttles?.[index]?.inventoryItemId ?? ''}
                tubes={values.shuttles?.[index]?.tubes ?? ''}
                lineCost={
                  (shuttleItems.find(
                    (item) => item.id === values.shuttles?.[index]?.inventoryItemId,
                  )?.unitCostMinor ?? 0) * Number(values.shuttles?.[index]?.tubes || 0)
                }
                onItemChange={(id) =>
                  form.setValue(`shuttles.${index}.inventoryItemId`, id, { shouldDirty: true })
                }
                onTubesChange={(tubes) =>
                  form.setValue(`shuttles.${index}.tubes`, tubes, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                onRemove={() => lines.remove(index)}
                disabled={fieldsDisabled}
                error={errors.shuttles?.[index]?.tubes?.message}
              />
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                size="xs"
                disabled={fieldsDisabled}
                onClick={() =>
                  lines.append({ inventoryItemId: shuttleItems[0]?.id ?? '', tubes: 0 })
                }
              >
                + Add another brand
              </Button>
              <Button size="xs" variant="ghost" onClick={onManageInventory}>
                Manage inventory
              </Button>
            </div>
            <p className="m-0 text-xs text-fg2">
              Tubes you plan to use. Rule of thumb: about 1 tube per court every 1.5 hours. Prices
              come from your inventory.
            </p>
          </>
        ) : (
          <p className="m-0 text-sm text-fg2">
            No shuttlecocks in your inventory yet.{' '}
            <Button size="xs" onClick={onManageInventory}>
              Add some
            </Button>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="m-0 text-sm font-semibold text-fg2">Payment per player</h4>
        <Controller
          control={form.control}
          name="paymentMode"
          render={({ field }) => (
            <SegmentedControl
              aria-label="Payment per player"
              value={field.value}
              disabled={fieldsDisabled}
              options={[
                { value: 'break_even', label: `Break-even · ${formatPeso(estimate.breakEven)}` },
                { value: 'custom', label: 'Custom amount' },
              ]}
              onChange={(value) => {
                field.onChange(value)
                if (value === 'break_even') form.setValue('customFeePerHead', '')
                if (value === 'custom')
                  requestAnimationFrame(() => form.setFocus('customFeePerHead'))
              }}
            />
          )}
        />
        {values.paymentMode === 'custom' ? (
          <Field
            label="Custom payment per player"
            error={errors.customFeePerHead?.message}
            hint={`The full amount each player pays${estimate.entranceFeePerHead ? `, including the ${formatPeso(estimate.entranceFeePerHead)} entrance fee` : ''}. Break-even is ${formatPeso(estimate.breakEven)}. At ${formatPeso(estimate.perHead)} a player: ${estimate.result.kind === 'profit' || estimate.result.kind === 'loss' ? `${formatPeso(estimate.result.amount)} ${estimate.result.kind}` : estimate.result.kind === 'no_costs' ? 'No costs entered' : 'Breaks even'}.`}
          >
            <Controller
              control={form.control}
              name="customFeePerHead"
              render={({ field }) => (
                <div className="flex max-w-60 items-center gap-2">
                  <span aria-hidden>₱</span>
                  <TextInput
                    {...field}
                    inputMode="decimal"
                    placeholder={String(estimate.breakEven / 100)}
                    disabled={fieldsDisabled}
                  />
                </div>
              )}
            />
          </Field>
        ) : (
          <p className="m-0 text-xs text-fg2">
            The full amount each player pays, worked out for you: total cost (entrance fees
            included) ÷ {players} players, rounded up. It updates as you change the costs or
            players.
          </p>
        )}
      </div>
      <CostEstimateSummary estimate={estimate} />
    </div>
  )
}
