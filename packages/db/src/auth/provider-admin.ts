import 'server-only'

/**
 * The external Auth calls a staged operation needs, kept outside every database transaction
 * (transactions.md §9). The concrete adapter (Supabase admin API or a username adapter) is chosen
 * under #243/#244 and injected by the Route Handler; nothing here holds a secret key.
 *
 * Every call carries the operation's stable `operationRef`, so a lost response or duplicate
 * delivery resumes the same provider change instead of creating a second one.
 */
export type ProviderAdmin = {
  /** Creates (or returns the already-created) login for a stable operation. */
  createLogin(input: {
    operationRef: string
    username?: string
    email?: string
    phoneE164?: string
    initialPassword?: string
  }): Promise<{ subject: string }>
  /** The provider's current login identifiers for a subject; null when the subject is gone. */
  readLogin(subject: string): Promise<{ email: string | null; phoneE164: string | null } | null>
  /** Sets one login identifier. Must be repeat-safe for the same `operationRef`. */
  updateLogin(input: {
    operationRef: string
    subject: string
    email?: string
    phoneE164?: string
  }): Promise<void>
}

/** A provider failure is resumable: the caller keeps the staged row and retries the same ref. */
export class ProviderError extends Error {
  readonly code: 'provider_unavailable' | 'provider_conflict' | 'provider_rejected'
  constructor(code: ProviderError['code']) {
    super(code)
    this.name = 'ProviderError'
    this.code = code
  }
}
