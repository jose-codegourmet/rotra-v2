import { genderRequiredInput } from '@rotra/schema/gender'
import { personalDetailsShape } from '@rotra/schema/personal-details'
import { socialLinksShape } from '@rotra/schema/social-link'
import { z } from 'zod'

/** The profile fields the Back to details step can change: name, required gender, nickname, experience, links. */
export const yourDetailsSchema = z.object({
  gender: genderRequiredInput,
  ...personalDetailsShape,
  ...socialLinksShape,
})
export type YourDetailsValues = z.infer<typeof yourDetailsSchema>
