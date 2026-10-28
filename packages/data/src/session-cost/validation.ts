import { moneyField } from '@rotra/schema/money'
import type { InventoryItem } from '../inventory/inventory.types'
import { MockError } from '../mock/errors'
import type { SessionCostInput } from './sessionCost.types'

/** Validate the mock command at its boundary too; UI validation is not a data constraint. */
export function validateSessionCost(
  values: SessionCostInput | null | undefined,
  inventory: InventoryItem[],
) {
  if (!values) return
  for (const amount of [
    values.courtFeePerCourtHour,
    values.entranceFeePerHead,
    values.customFeePerHead,
  ]) {
    if (amount !== null && !moneyField.safeParse(amount).success)
      throw new MockError('permission', 'Use 0 or more, or leave it empty.')
  }
  if (
    !['break_even', 'custom'].includes(values.paymentMode) ||
    (values.paymentMode === 'custom' && values.customFeePerHead === null)
  )
    throw new MockError('permission', 'Enter the amount per player, or switch to break-even.')
  for (const line of values.shuttles) {
    if (!Number.isSafeInteger(line.tubes) || line.tubes < 0)
      throw new MockError('permission', 'Use a whole number, 0 or more.')
    if (
      line.inventoryItemId &&
      line.tubes > 0 &&
      !inventory.some((i) => i.id === line.inventoryItemId && i.category === 'shuttlecocks')
    )
      throw new MockError('permission', 'Choose a shuttlecock item from inventory.')
  }
}
