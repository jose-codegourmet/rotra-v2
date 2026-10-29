import type { ContactChangeRequest } from '../contact-change-request/contactChangeRequest.types'

// Starts empty, as the prototype does: Jose sends a request from Privacy and contact.
export const contactChangeRequests: ContactChangeRequest[] = []

/**
 * Story-only Current → Requested values for the Admin contact review compare, on Jose's account
 * (rotra-admin.html `.change` with `.mono` values). An empty `from` shows as "Not set".
 */
export const contactChangeExamples = {
  email: { from: 'jose@example.com', to: 'jose.lahug.smash.club@example.com' },
  phone: { from: '+63 917 555 0142', to: '+63 917 555 0990' },
  notSet: { from: '', to: 'jose@example.com' },
}
