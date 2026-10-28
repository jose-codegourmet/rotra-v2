import { type PersonalProfileValues, personalProfileSchema } from '@rotra/schema/personal-details'
/** Every personal field plus the four social links, as typed in the form (experience stays text). */
export const personalDetailsFieldsSchema = personalProfileSchema
export type PersonalDetailsValues = PersonalProfileValues
