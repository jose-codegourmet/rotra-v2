import type { ClaimDetails } from '@rotra/db/player/account-access'
import { ServiceError } from '@rotra/db/service/errors'
import type { RegistrationValues } from '@rotra/schema/registration'

/** A form that failed its schema: each field's message, under the field's own name. */
export function invalidRegistration(issues: { path: PropertyKey[]; message: string }[]) {
  return new ServiceError(
    'invalid',
    Object.fromEntries(issues.map((issue) => [String(issue.path.at(-1)), issue.message])),
  )
}

/** The personal details a registration form sends, as the registration services take them. */
export function registrationDetails(
  values: Omit<RegistrationValues, 'email' | 'password' | 'phone' | 'cityCode'>,
): ClaimDetails {
  return {
    fullName: values.fullName,
    nickname: values.nickname || null,
    playingStyle: values.playingStyle,
    experienceYears: values.experienceYears ? Number(values.experienceYears) : null,
    experienceMonths: values.experienceMonths ? Number(values.experienceMonths) : null,
    socialLinks: {
      facebook: values.facebook,
      instagram: values.instagram,
      youtube: values.youtube,
      linkedin: values.linkedin,
    },
  }
}
