import { gettingToKnowDefaultValues } from '@rotra/ui/getting-to-know-fields/default-values'
import { personalDetailsDefaultValues } from '@rotra/ui/personal-details-fields/default-values'
import type { EditProfileValues } from './EditProfileForm.schema'
export const editProfileDefaultValues: EditProfileValues = {
  ...personalDetailsDefaultValues,
  ...gettingToKnowDefaultValues,
}
