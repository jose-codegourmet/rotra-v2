import { personalDetailsDefaultValues } from '@rotra/ui/personal-details-fields/default-values'
import type { ClaimValues } from './ClaimForm.schema'
export const claimDefaultValues: ClaimValues = {
  email: '',
  password: '',
  confirmPassword: '',
  ...personalDetailsDefaultValues,
}
