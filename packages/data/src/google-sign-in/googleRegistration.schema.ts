import { registrationSchema } from '@rotra/schema/registration'

/**
 * Google registration: the registration form without the email and password fields. The email is
 * Google's and is confirmed at once; there is no password. Phone stays required; `cityCode` is
 * required by the fetcher for the Admin link only (no club).
 */
export const googleRegistrationSchema = registrationSchema.omit({ email: true, password: true })
