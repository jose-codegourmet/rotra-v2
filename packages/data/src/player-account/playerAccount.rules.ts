/** 'jose@example.com' → 'j•••••@example.com': enough for the recipient to recognise, not to reuse. */
export function maskEmail(email: string) {
  return email.replace(/^(.)[^@]*(@.*)$/, '$1•••••$2')
}
