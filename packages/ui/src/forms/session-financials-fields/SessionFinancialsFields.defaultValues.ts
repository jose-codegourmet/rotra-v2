import type { SessionFinancialsInput } from './SessionFinancialsFields.schema'

export const sessionFinancialsDefaultValues: SessionFinancialsInput = {
  courtFeePerCourtHour: '',
  entranceFeePerHead: '',
  shuttles: [],
  paymentMode: 'break_even',
  customFeePerHead: '',
}
