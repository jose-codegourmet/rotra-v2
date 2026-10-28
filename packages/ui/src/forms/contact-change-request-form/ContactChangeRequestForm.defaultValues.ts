import type { ContactChangeRequestInput } from './ContactChangeRequestForm.schema'

/** The sheet opens on Email with an empty new value, as the prototype's openRequest does. */
export const contactChangeRequestDefaultValues: ContactChangeRequestInput = {
  field: 'email',
  toValue: '',
}
