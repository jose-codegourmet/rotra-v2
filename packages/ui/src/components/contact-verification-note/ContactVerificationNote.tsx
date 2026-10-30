import { Card } from '@rotra/ui/card'
import { useId } from 'react'

/**
 * A-CONTACT-REVIEW 'Verification' card. Placeholder copy for an open decision (business
 * open-decisions.md › Contact-change approval: evidence needed): no ID-document upload or required
 * evidence field until that is decided.
 */
export function ContactVerificationNote() {
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Verification</h2>
        <p className="m-0 text-[13px]">
          What proof approval needs hasn't been decided, so ROTRA doesn't ask for ID documents. The
          request itself is the only evidence shown.
        </p>
      </section>
    </Card>
  )
}
