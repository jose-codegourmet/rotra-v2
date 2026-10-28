import {
  type PersonalDetailsValues,
  personalDetailsFieldsSchema,
} from '@rotra/ui/personal-details-fields/schema'
/** Personal fields and links only; strict, so phone, email and the RTR ID can never be submitted. */
export const editProfileSchema = personalDetailsFieldsSchema
export type EditProfileValues = PersonalDetailsValues
