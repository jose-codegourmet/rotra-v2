import { z } from 'zod'

/** The choice in Set gender: `none` is Not given. Nothing is chosen until the owner picks one. */
export const adminPlayerGenderSchema = z.object({
  gender: z.enum(['male', 'female', 'none']),
})
